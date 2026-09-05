import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, measureTextUnits, truncateToUnits } from "../lib/svg-text-layout"
import { accessibleInk, readableOn } from "../render/ink"
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
const PRICE_UNIT_GAP = 8

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

/** 一张卡的内容高度（不含图片区与上下内边距）。 */
function cardTextHeight(text: CardText): number {
  const noteH = text.note ? GAP_NAME_NOTE + text.note.lines.length * text.note.lineHeight : 0
  const priceH = text.price || text.priceUnit ? RULE_GAP_ABOVE + 1 + RULE_GAP_BELOW + PRICE_FONT_SIZE : 0
  return NAME_LINE_HEIGHT + noteH + priceH
}

interface CardGeometry {
  cols: number
  rows: number
  cardW: number
  contentW: number
  cardH: number
  texts: CardText[]
}

function cardGeometry(component: ProductCardsComponent, w: number, ctx: ComponentCtx): CardGeometry {
  const n = component.items.length
  const cols = Math.max(1, Math.min(n, Math.floor((w + GAP) / (MIN_CARD_W + GAP))))
  const rows = Math.ceil(n / cols)
  const cardW = (w - GAP * (cols - 1)) / cols
  const contentW = Math.max(1, cardW - PAD * 2)
  const texts = component.items.map((item) => layoutCard(item, contentW, ctx))
  // 等高：最高的一张决定全套，价格线才对得齐。
  const cardH = IMAGE_H + PAD + Math.max(...texts.map(cardTextHeight)) + PAD
  return { cols, rows, cardW, contentW, cardH, texts }
}

/** 一张卡自己的一套墨：底色决定其余全部颜色，`featured` 只是换了底。 */
function cardInks(featured: boolean, ctx: ComponentCtx) {
  const fill = featured ? ctx.colors.primary : ctx.colors.surface
  if (featured) {
    const ink = readableOn(fill)
    return {
      fill,
      name: ink,
      note: mixHex(fill, ink, 0.78),
      rule: mixHex(fill, ink, 0.3),
      price: ink,
      unit: mixHex(fill, ink, 0.78),
      stroke: undefined as string | undefined,
    }
  }
  const stroke = ctx.colors.cardStroke ?? ctx.colors.border
  return {
    fill,
    name: ctx.colors.text,
    note: accessibleInk(ctx.colors.muted, fill, NOTE_FONT_SIZE),
    rule: stroke ?? mixHex(fill, ctx.colors.text, 0.2),
    price: accessibleInk(ctx.colors.primary, fill, PRICE_FONT_SIZE),
    unit: accessibleInk(ctx.colors.muted, fill, PRICE_UNIT_FONT_SIZE),
    stroke,
  }
}

function renderPicture(item: ProductItem, x: number, y: number, w: number, ctx: ComponentCtx): React.ReactElement {
  const src = ctx.images?.[item.asset_id]?.src
  const alt = ctx.images?.[item.asset_id]?.alt ?? item.name
  if (src) {
    return (
      <image href={src} x={x} y={y} width={w} height={IMAGE_H} preserveAspectRatio="xMidYMid slice" aria-label={alt} />
    )
  }
  // 资产没交上来。画一块空底并留下机器找得到的记号，不画假图。
  return <rect data-dropped="asset" x={x} y={y} width={w} height={IMAGE_H} fill={ctx.colors.bg} />
}

export const productCards: SvgComponent<ProductCardsComponent> = {
  measure(component, w, ctx) {
    const { rows, cardH } = cardGeometry(component, w, ctx)
    return rows * cardH + Math.max(0, rows - 1) * GAP
  },
  render(component: ProductCardsComponent, box: ComponentBox, ctx: ComponentCtx) {
    const { cols, cardW, contentW, cardH, texts } = cardGeometry(component, box.w, ctx)
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
          let cursorY = IMAGE_H + PAD + NAME_LINE_HEIGHT
          const noteTopY = cursorY + (text.note ? GAP_NAME_NOTE : 0)
          if (text.note) cursorY = noteTopY + text.note.lines.length * text.note.lineHeight
          const ruleY = cursorY + RULE_GAP_ABOVE
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
