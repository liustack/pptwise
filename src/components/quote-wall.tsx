import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, truncateToUnits } from "../lib/svg-text-layout"
import { accessibleInk, readableOn } from "../render/ink"
import { mixHex } from "./color-mix"
import { deriveInitials } from "./people-initials"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"

type QuoteWallComponent = Extract<Component, { type: "quote_wall" }>
type QuoteItem = QuoteWallComponent["quotes"][number]

/**
 * 引语墙。一行 2-4 张等高卡片，每张从上到下是：一个大引号、几行原话、
 * 一条细线、首字母圆章 + 姓名 + 头衔。
 *
 * 强调只有一种做法：`featured` 的那张整卡填 primary、卡内所有文字改用
 * `readableOn(primary)` 那一支墨（版式规矩——不许在卡边上加彩条、不许用
 * accent 承载文字）。首字母圆章跟着换底，好让它在深底上仍然是个圆章而
 * 不是一个洞。
 *
 * 引号是装饰，不承载信息：它取卡底与正文墨之间的一档浅调，永远不是
 * accent。
 */

const GAP = 24
/**
 * 一张卡的最小宽度。窄过这条线就少排一列、多排一行——一段话在一百多 px
 * 宽的柱子里读不成句子。变高会让接不住的版式退位，这正是想要的。
 */
const MIN_CARD_W = 240
const CARD_RADIUS = 8
const PAD = 24

/** 大引号的字号与基线，同 blockquote.tsx 的做法：按引号自己的墨深定位。 */
const MARK_FONT_SIZE = 48
const MARK_BASELINE = 40
const MARK_TO_TEXT = 10

const TEXT_FONT_SIZE = 18
const TEXT_MAX_LINES = 5
const TEXT_LINE_HEIGHT_RATIO = 1.5

const RULE_GAP_ABOVE = 18
const RULE_GAP_BELOW = 16

const AVATAR_R = 18
const AVATAR_FONT_SIZE = 16
const AVATAR_TO_NAME = 12
const BASELINE_FUDGE_RATIO = 0.34

const NAME_FONT_SIZE = 16
const NAME_MIN_FONT_SIZE = 16
const ROLE_FONT_SIZE = 16
const NAME_TO_ROLE = 4

interface QuoteLayout {
  lines: { lines: string[]; fontSize: number; lineHeight: number; truncated: boolean }
  name: { text: string; fontSize: number; truncated: boolean }
  role: { text: string; fontSize: number; truncated: boolean } | null
}

function layoutQuote(quote: QuoteItem, contentW: number, ctx: ComponentCtx): QuoteLayout {
  const wrapped = layoutSvgText(quote.text, {
    maxWidth: contentW,
    fontSize: TEXT_FONT_SIZE,
    maxLines: TEXT_MAX_LINES,
    lineHeightRatio: TEXT_LINE_HEIGHT_RATIO,
  })
  const maxUnits = contentW / wrapped.fontSize
  const lines = { ...wrapped, lines: wrapped.lines.map((line) => truncateToUnits(line, maxUnits)) }
  const identityW = Math.max(1, contentW - AVATAR_R * 2 - AVATAR_TO_NAME)
  const name = fitSvgLine(quote.name, {
    maxWidth: identityW,
    fontSize: NAME_FONT_SIZE,
    minFontSize: NAME_MIN_FONT_SIZE,
    bold: true,
    fontFamily: ctx.fonts.heading,
  })
  const role = quote.role
    ? fitSvgLine(quote.role, { maxWidth: identityW, fontSize: ROLE_FONT_SIZE, minFontSize: ROLE_FONT_SIZE })
    : null
  return { lines, name, role }
}

/** 身份区（圆章 + 姓名 + 头衔）自己的高度：圆章与两行小字取高者。 */
function identityHeight(layout: QuoteLayout): number {
  const textH = NAME_FONT_SIZE + (layout.role ? NAME_TO_ROLE + ROLE_FONT_SIZE : 0)
  return Math.max(AVATAR_R * 2, textH)
}

function quoteCardHeight(layout: QuoteLayout): number {
  return (
    PAD +
    MARK_BASELINE +
    MARK_TO_TEXT +
    layout.lines.lines.length * layout.lines.lineHeight +
    RULE_GAP_ABOVE +
    1 +
    RULE_GAP_BELOW +
    identityHeight(layout) +
    PAD
  )
}

interface WallGeometry {
  cols: number
  rows: number
  cardW: number
  contentW: number
  cardH: number
  layouts: QuoteLayout[]
}

function wallGeometry(component: QuoteWallComponent, w: number, ctx: ComponentCtx): WallGeometry {
  const n = component.quotes.length
  const cols = Math.max(1, Math.min(n, Math.floor((w + GAP) / (MIN_CARD_W + GAP))))
  const rows = Math.ceil(n / cols)
  const cardW = (w - GAP * (cols - 1)) / cols
  const contentW = Math.max(1, cardW - PAD * 2)
  const layouts = component.quotes.map((quote) => layoutQuote(quote, contentW, ctx))
  // 等高：最长的一段话决定全套，底部的姓名才对得齐。
  const cardH = Math.max(...layouts.map(quoteCardHeight))
  return { cols, rows, cardW, contentW, cardH, layouts }
}

/** 一张卡自己的一套墨：底色决定其余全部颜色，`featured` 只是换了底。 */
function cardInks(featured: boolean, ctx: ComponentCtx) {
  const fill = featured ? ctx.colors.primary : ctx.colors.surface
  if (featured) {
    const ink = readableOn(fill)
    return {
      fill,
      text: ink,
      name: ink,
      role: mixHex(fill, ink, 0.78),
      rule: mixHex(fill, ink, 0.3),
      mark: mixHex(fill, ink, 0.42),
      avatarFill: ink,
      stroke: undefined as string | undefined,
    }
  }
  const stroke = ctx.colors.cardStroke ?? ctx.colors.border
  return {
    fill,
    text: ctx.colors.text,
    name: ctx.colors.text,
    role: accessibleInk(ctx.colors.muted, fill, ROLE_FONT_SIZE),
    rule: stroke ?? mixHex(fill, ctx.colors.text, 0.2),
    mark: mixHex(fill, ctx.colors.text, 0.22),
    avatarFill: mixHex(fill, ctx.colors.text, 0.14),
    stroke,
  }
}

export const quoteWall: SvgComponent<QuoteWallComponent> = {
  measure(component, w, ctx) {
    const { rows, cardH } = wallGeometry(component, w, ctx)
    return rows * cardH + Math.max(0, rows - 1) * GAP
  },
  render(component: QuoteWallComponent, box: ComponentBox, ctx: ComponentCtx) {
    const { cols, cardW, contentW, cardH, layouts } = wallGeometry(component, box.w, ctx)
    const radius = ctx.shape?.radius ?? CARD_RADIUS
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {component.quotes.map((quote, i) => {
          const layout = layouts[i]!
          const inks = cardInks(Boolean(quote.featured), ctx)
          const cardX = (i % cols) * (cardW + GAP)
          const cardY = Math.floor(i / cols) * (cardH + GAP)
          const textTopY = PAD + MARK_BASELINE + MARK_TO_TEXT
          const textBottomY = textTopY + layout.lines.lines.length * layout.lines.lineHeight
          const ruleY = textBottomY + RULE_GAP_ABOVE
          const identityTopY = ruleY + 1 + RULE_GAP_BELOW
          const idH = identityHeight(layout)
          const avatarCy = identityTopY + idH / 2
          const nameX = PAD + AVATAR_R * 2 + AVATAR_TO_NAME
          const textH = NAME_FONT_SIZE + (layout.role ? NAME_TO_ROLE + ROLE_FONT_SIZE : 0)
          const nameBaselineY = identityTopY + (idH - textH) / 2 + NAME_FONT_SIZE
          const initialsInk = readableOn(inks.avatarFill)
          return (
            // 审计框挂在未平移的外层 g 上（同 people-cards.tsx）：叠在同一个
            // 元素上会让 ink-containment 把 cardX 算两遍。
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
                <text
                  x={PAD}
                  y={PAD + MARK_BASELINE}
                  fontSize={MARK_FONT_SIZE}
                  fontWeight="700"
                  fill={inks.mark}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                  aria-hidden="true"
                >
                  {"“"}
                </text>
                {layout.lines.lines.map((line, li) => (
                  <text
                    key={li}
                    data-truncated={layout.lines.truncated ? "1" : undefined}
                    x={PAD}
                    y={textTopY + li * layout.lines.lineHeight + layout.lines.fontSize}
                    fontSize={layout.lines.fontSize}
                    fill={inks.text}
                    fontFamily={ctx.fonts.body}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))}
                <rect x={PAD} y={ruleY} width={contentW} height={1} fill={inks.rule} />
                <circle cx={PAD + AVATAR_R} cy={avatarCy} r={AVATAR_R} fill={inks.avatarFill} />
                <text
                  x={PAD + AVATAR_R}
                  y={avatarCy + Math.round(AVATAR_FONT_SIZE * BASELINE_FUDGE_RATIO)}
                  textAnchor="middle"
                  fontSize={AVATAR_FONT_SIZE}
                  fontWeight="700"
                  fill={initialsInk}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {deriveInitials(quote.name)}
                </text>
                <text
                  data-truncated={layout.name.truncated ? "1" : undefined}
                  x={nameX}
                  y={nameBaselineY}
                  fontSize={layout.name.fontSize}
                  fontWeight="700"
                  fill={inks.name}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {layout.name.text}
                </text>
                {layout.role && (
                  <text
                    data-truncated={layout.role.truncated ? "1" : undefined}
                    x={nameX}
                    y={nameBaselineY + NAME_TO_ROLE + ROLE_FONT_SIZE}
                    fontSize={layout.role.fontSize}
                    fill={inks.role}
                    fontFamily={ctx.fonts.body}
                    dominantBaseline="alphabetic"
                  >
                    {layout.role.text}
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

export const renderDef: RenderDef<QuoteWallComponent> = {
  type: "quote_wall",
  measure: quoteWall.measure,
  render: quoteWall.render,
}
