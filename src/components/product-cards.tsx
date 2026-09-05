import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, measureTextUnits, truncateToUnits } from "../lib/svg-text-layout"
import { accessibleInk, emphasisFill, readableOn } from "../render/ink"
import { mixHex } from "./color-mix"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"

type ProductCardsComponent = Extract<Component, { type: "product_cards" }>
type ProductItem = ProductCardsComponent["items"][number]

/**
 * 商品卡。一行 2-4 张等高卡片，每张从上到下是：图、名字、一行说明、一条
 * 细线、价格。
 *
 * 图片是必填的，所以这里没有「没图怎么办」的构图分支——只有资产管线没把
 * 图交上来时的诚实路径：那一格画成空的 surface 并打上 `data-dropped`，
 * 不画任何假的产品插画来填坑。编不出来的东西不画。
 *
 * `featured` 全集最多一个：被选中的那张整卡填 primary、卡内文字改用
 * `readableOn(primary)` 那一支墨。整块填色是这个仓库唯一许可的强调手法，
 * 卡角上的小标签和卡边上的彩条都被砍过不止一次。图片区不跟着换底——一张
 * 照片没有底色可换。
 */

const GAP = 24
/**
 * 一张卡的最小宽度。窄过这条线就少排一列、多排一行——一张一百出头宽的
 * 商品卡，图看不清东西、价格和单位挤成一团，那不是「小一点」，是不成立。
 * 变高的后果是接不住的版式退位，这正是想要的。
 */
const MIN_CARD_W = 220
const CARD_RADIUS = 4
/** 圆角封顶，见 render() 里的说明。 */
const MAX_CARD_RADIUS = 4
const PAD = 16
/** 图片区高度。三列时约 350×136，接近 7:3，仍看得清东西；再高就有主题的
 * 内容矩形接不住整张卡了（playbill/stage 的英文版是最紧的那两个）。 */
const IMAGE_H = 136

const NAME_FONT_SIZE = 20
const NAME_MIN_FONT_SIZE = 16
const NAME_LINE_HEIGHT = Math.round(NAME_FONT_SIZE * 1.25)

const NOTE_FONT_SIZE = 16
const NOTE_MAX_LINES = 2
const NOTE_LINE_HEIGHT_RATIO = 1.35
const GAP_NAME_NOTE = 8

const RULE_GAP_ABOVE = 14
const RULE_GAP_BELOW = 12

const PRICE_FONT_SIZE = 28
const PRICE_MIN_FONT_SIZE = 18
const PRICE_UNIT_FONT_SIZE = 16
/**
 * Air between the price and its small print.
 *
 * Wider than it looks like it needs to be, and deliberately so. The two runs
 * are separate `<text>` elements — the export path carries no `dx`, so a
 * tspan offset would open a gap in the browser and none in the PPTX — which
 * means the unit's x is placed off `measureTextUnits`' estimate of the price.
 * That model classes a currency sign with "other" at 0.46em, and Georgia bold
 * draws "¥" nearer 0.6, so a three-character price under-measures by around
 * 7px and an 8px gap closed to nothing: "¥68席位 / 月". The gap absorbs the
 * model's error on a short bold run rather than pretending the estimate is
 * exact.
 */
const PRICE_UNIT_GAP = 18
/** 强调卡上小字退后一档的混合比例，混完仍要过对比度。 */
const SOFT_INK_MIX = 0.78

interface CardText {
  name: { text: string; fontSize: number; truncated: boolean }
  note: { lines: string[]; fontSize: number; lineHeight: number; truncated: boolean } | null
  price: { text: string; fontSize: number; truncated: boolean } | null
  priceUnit: { text: string; fontSize: number; truncated: boolean } | null
  /** 价格实际占的宽度，单位小字接在它后面。 */
  priceW: number
}

function layoutCard(item: ProductItem, contentW: number, ctx: ComponentCtx): CardText {
  const name = fitSvgLine(item.name, {
    maxWidth: contentW,
    fontSize: NAME_FONT_SIZE,
    minFontSize: NAME_MIN_FONT_SIZE,
    bold: true,
    fontFamily: ctx.fonts.heading,
  })
  const note = item.note
    ? (() => {
        const wrapped = layoutSvgText(item.note, {
          maxWidth: contentW,
          fontSize: NOTE_FONT_SIZE,
          maxLines: NOTE_MAX_LINES,
          lineHeightRatio: NOTE_LINE_HEIGHT_RATIO,
        })
        const maxUnits = contentW / wrapped.fontSize
        return { ...wrapped, lines: wrapped.lines.map((line) => truncateToUnits(line, maxUnits)) }
      })()
    : null
  // 价格与单位共享一行：先按整行宽度收价格，量出它真占多宽，剩下的才是
  // 单位小字的预算。两者各按自己的宽度独立收，行就不会挤出卡片右缘。
  const price = item.price
    ? fitSvgLine(item.price, {
        maxWidth: contentW,
        fontSize: PRICE_FONT_SIZE,
        minFontSize: PRICE_MIN_FONT_SIZE,
        bold: true,
        fontFamily: ctx.fonts.heading,
      })
    : null
  const priceW = price
    ? Math.min(contentW, measureTextUnits(price.text, { bold: true, fontFamily: ctx.fonts.heading }) * price.fontSize)
    : 0
  const priceUnit = item.price_unit
    ? fitSvgLine(item.price_unit, {
        maxWidth: Math.max(1, contentW - (price ? priceW + PRICE_UNIT_GAP : 0)),
        fontSize: PRICE_UNIT_FONT_SIZE,
        minFontSize: PRICE_UNIT_FONT_SIZE,
      })
    : null
  return { name, note, price, priceUnit, priceW }
}

/**
 * 说明文字那一段的高度预算，全套共用最高的一张。
 *
 * 卡壳等高一度是「对齐」的全部实现，但那只对齐了外框：一行说明的卡和两行
 * 说明的卡壳子一样高，价格基线却差 22px，读起来就是三条参差的价格线。真正
 * 要对齐的是分隔线和价格，所以说明段按全套最高的一张预留，短的那张下面留空
 * 白——留白在卡里，不在卡下面。
 */
function noteBandOf(texts: readonly CardText[]): number {
  return Math.max(
    0,
    ...texts.map((text) => (text.note ? GAP_NAME_NOTE + text.note.lines.length * text.note.lineHeight : 0)),
  )
}

/** 价格那一段（分隔线 + 价格行）的高度，任一张卡有价格就全套都留。 */
function priceBandOf(texts: readonly CardText[]): number {
  return texts.some((text) => text.price || text.priceUnit)
    ? RULE_GAP_ABOVE + 1 + RULE_GAP_BELOW + PRICE_FONT_SIZE
    : 0
}

interface CardGeometry {
  cols: number
  rows: number
  cardW: number
  contentW: number
  cardH: number
  texts: CardText[]
  /** 说明段的共用高度，决定分隔线的 y。 */
  noteBand: number
  /** 价格段的共用高度。 */
  priceBand: number
}

function cardGeometry(component: ProductCardsComponent, w: number, ctx: ComponentCtx): CardGeometry {
  const n = component.items.length
  const cols = Math.max(1, Math.min(n, Math.floor((w + GAP) / (MIN_CARD_W + GAP))))
  const rows = Math.ceil(n / cols)
  const cardW = (w - GAP * (cols - 1)) / cols
  const contentW = Math.max(1, cardW - PAD * 2)
  const texts = component.items.map((item) => layoutCard(item, contentW, ctx))
  // 等高：名字一行 + 全套共用的说明段 + 全套共用的价格段。三段都共用，所以
  // 分隔线和价格在每张卡上落在同一条基线。
  const noteBand = noteBandOf(texts)
  const priceBand = priceBandOf(texts)
  const cardH = IMAGE_H + PAD + NAME_LINE_HEIGHT + noteBand + priceBand + PAD
  return { cols, rows, cardW, contentW, cardH, texts, noteBand, priceBand }
}

/** 一张卡自己的一套墨：底色决定其余全部颜色，`featured` 只是换了底。 */
function cardInks(featured: boolean, ctx: ComponentCtx) {
  const fill = featured ? emphasisFill(ctx.colors.primary, ctx.colors.text, ctx.colors.surface) : ctx.colors.surface
  if (featured) {
    const ink = readableOn(fill)
    return {
      fill,
      name: ink,
      // 调淡一档是为了让说明和价格单位退到名字后面，但调淡之后还要再过一遍
      // 对比度：homeroom 与 crayon 的强调底上，0.78 那一档量出来只有 4.11:1
      // 和 3.81:1，都低于 16px 文字要求的 4.5:1。过不了就退回满墨。
      note: accessibleInk(mixHex(fill, ink, SOFT_INK_MIX), fill, NOTE_FONT_SIZE),
      rule: mixHex(fill, ink, 0.3),
      price: ink,
      unit: accessibleInk(mixHex(fill, ink, SOFT_INK_MIX), fill, PRICE_UNIT_FONT_SIZE),
      stroke: undefined as string | undefined,
    }
  }
  const stroke = ctx.colors.cardStroke ?? ctx.colors.border
  return {
    fill,
    name: ctx.colors.text,
    note: accessibleInk(ctx.colors.muted, fill, NOTE_FONT_SIZE),
    rule: stroke ?? mixHex(fill, ctx.colors.text, 0.2),
    price: textInkNotAccent(ctx.colors.primary, fill, PRICE_FONT_SIZE, ctx),
    unit: accessibleInk(ctx.colors.muted, fill, PRICE_UNIT_FONT_SIZE),
    stroke,
  }
}

/**
 * 承载文字的墨，且保证它不是 accent。
 *
 * 规矩是「accent 永远不承载文字」，而这条规矩要按最终画出来的颜色验收，
 * 不是按读了哪个 token 验收：ember 把 primary 和 accent 定义成同一个
 * `#E56A2C`，于是「用 primary 画价格」画出来的就是 accent。对比度是合格的，
 * 违反的是规矩本身。撞上就退回正文墨，层次交给字号和字重去分。
 */
function textInkNotAccent(preferred: string, bg: string, fontSizePx: number, ctx: ComponentCtx): string {
  const ink = accessibleInk(preferred, bg, fontSizePx)
  if (ink.toUpperCase() !== ctx.colors.accent.toUpperCase()) return ink
  return accessibleInk(ctx.colors.text, bg, fontSizePx)
}

function renderPicture(item: ProductItem, x: number, y: number, w: number, ctx: ComponentCtx): React.ReactElement {
  const src = ctx.images?.[item.asset_id]?.src
  const alt = ctx.images?.[item.asset_id]?.alt ?? item.name
  if (src) {
    return (
      <image href={src} x={x} y={y} width={w} height={IMAGE_H} preserveAspectRatio="xMidYMid slice" aria-label={alt} />
    )
  }
  // 资产没交上来。画一块空底，不画假图，并按共用的丢弃协议声明——
  // `data-dropped` 是计数，`data-dropped-kind` 是单位，两个一起才被
  // `slideToRender` 数到、被 `checkContentDropGate` 拒绝。此前只写了
  // `data-dropped="asset"`，`Number("asset") || 0` 把它算成零次丢弃，
  // 缺图的商品卡照样导出。
  return (
    <>
      <rect x={x} y={y} width={w} height={IMAGE_H} fill={ctx.colors.bg} />
      <g data-dropped={1} data-dropped-kind="asset" />
    </>
  )
}

export const productCards: SvgComponent<ProductCardsComponent> = {
  measure(component, w, ctx) {
    const { rows, cardH } = cardGeometry(component, w, ctx)
    return rows * cardH + Math.max(0, rows - 1) * GAP
  },
  render(component: ProductCardsComponent, box: ComponentBox, ctx: ComponentCtx) {
    const { cols, rows, cardW, contentW, cardH, texts, noteBand } = cardGeometry(component, box.w, ctx)
    const measured = rows * cardH + Math.max(0, rows - 1) * GAP
    // 盒子矮过量出来的最小高度就不画、只声明（chart.tsx 的同一条约定）：
    // 图片有自己的宽高比，卡片没有可以压缩的地方，压扁只会画到页外。
    if ((box.h ?? measured) + 0.5 < measured) {
      return <g data-dropped={1} data-dropped-kind="component" />
    }
    // 图片齐着卡片上沿铺满，而导出链路不会裁切图片的圆角（同
    // device-mockup.tsx 的屏幕矩形），所以卡片自己也不假装有大圆角：
    // 主题半径在这里封顶到 4px，圆角主题上仍读作一张卡，图片却不会探出去。
    const radius = Math.min(ctx.shape?.radius ?? CARD_RADIUS, MAX_CARD_RADIUS)
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {component.items.map((item, i) => {
          const cardX = (i % cols) * (cardW + GAP)
          const cardY = Math.floor(i / cols) * (cardH + GAP)
          const text = texts[i]!
          const imageY = 0
          const nameBaselineY = IMAGE_H + PAD + NAME_FONT_SIZE
          const noteTopY = IMAGE_H + PAD + NAME_LINE_HEIGHT + (text.note ? GAP_NAME_NOTE : 0)
          // 分隔线和价格挂在全套共用的说明段下缘，不挂在这一张自己的最后一
          // 行——短说明的卡把空白留在说明和分隔线之间，三条价格线才齐平。
          const ruleY = IMAGE_H + PAD + NAME_LINE_HEIGHT + noteBand + RULE_GAP_ABOVE
          const priceBaselineY = ruleY + 1 + RULE_GAP_BELOW + PRICE_FONT_SIZE
          const hasPriceRow = Boolean(text.price || text.priceUnit)
          const inks = cardInks(Boolean(item.featured), ctx)
          return (
            // 审计框挂在未平移的外层 g 上（同 people-cards.tsx）：它声明的是
            // 这张卡在组件盒里的位置，内层 g 才是绘制用的坐标系。两者叠在
            // 同一个元素上会让 ink-containment 把 cardX 算两遍。
            <g key={i} data-audit-box={`${cardX},${cardY},${cardW}`}>
              <g transform={`translate(${cardX},${cardY})`}>
              <rect
                x={0}
                y={0}
                width={cardW}
                height={cardH}
                rx={radius}
                fill={inks.fill}
                {...(inks.stroke ? { stroke: inks.stroke, strokeWidth: 1 } : {})}
              />
              {renderPicture(item, 0, imageY, cardW, ctx)}
              <text
                data-truncated={text.name.truncated ? "1" : undefined}
                x={PAD}
                y={nameBaselineY}
                fontSize={text.name.fontSize}
                fontWeight="700"
                fill={inks.name}
                fontFamily={ctx.fonts.heading}
                dominantBaseline="alphabetic"
              >
                {text.name.text}
              </text>
              {text.note?.lines.map((line, li) => (
                <text
                  key={li}
                  data-truncated={text.note!.truncated ? "1" : undefined}
                  x={PAD}
                  y={noteTopY + li * text.note!.lineHeight + text.note!.fontSize}
                  fontSize={text.note!.fontSize}
                  fill={inks.note}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
              {hasPriceRow && (
                <rect x={PAD} y={ruleY} width={contentW} height={1} fill={inks.rule} />
              )}
              {text.price && (
                <text
                  data-truncated={text.price.truncated ? "1" : undefined}
                  x={PAD}
                  y={priceBaselineY}
                  fontSize={text.price.fontSize}
                  fontWeight="700"
                  fill={inks.price}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {text.price.text}
                </text>
              )}
              {text.priceUnit && (
                <text
                  data-truncated={text.priceUnit.truncated ? "1" : undefined}
                  x={PAD + (text.price ? text.priceW + PRICE_UNIT_GAP : 0)}
                  y={priceBaselineY}
                  fontSize={text.priceUnit.fontSize}
                  fill={inks.unit}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {text.priceUnit.text}
                </text>
              )}
              </g>
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<ProductCardsComponent> = {
  type: "product_cards",
  measure: productCards.measure,
  render: productCards.render,
}
