import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPlacard,
  paintPlacard,
  paintPlacardIcon,
  paintPlacardLine,
  paintPlacardRule,
  placardInks,
  placardMark,
  placardText,
  placardWidth,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Chart = Extract<Component, { type: "chart" }>
type Cards = Extract<Component, { type: "icon_cards" }>

/*
 * slice: a whole drawn as one bar with the part a page is about cut out of
 * it in copper, over a label for each way the whole went, museum's 2026-10
 * board (p15). The claim over the page. One case-dark bar across the whole
 * measure, the marked part at its start in copper to scale, the author's
 * line for that part in the serif beside it (「约 148 克 约 4%」), the rest's
 * name small inside the bar at its end, and what the whole is under the bar
 * at the right (the chart's one category, 「两次合计 3,666.3 克」). Under it a
 * label for each way the whole went, on a lifted board with a seam along its
 * top, its icon in copper, its name in the serif and what it holds in old
 * paper: the label named as the marked part has a copper edge.
 *
 * Takes, in the placard setting: a share bar (a `stacked` chart laid
 * `horizontal`, one category, two parts, the first marked with `emphasis`,
 * and an `emphasis_label`), then an `icon_cards` of two to four items, one
 * of them titled as the marked part.
 *
 * Declines: a marked part too wide to leave its line room, a card's text
 * past four lines, no card for the marked part.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const BAR = { x: 64, y: 210, w: 1152, h: 56 } as const
const SHARE = { gap: 14, size: 16, rest: { size: 12, pad: 16 } } as const
const WHOLE = { top: 278, size: 12, lineHeight: 18 } as const
const CARD = { y: 336, h: 220, gap: 24, pad: 24, edge: 2 } as const
const ICON = { dy: 26, size: 24 } as const
const NAME = { dy: 64, size: 22, lineHeight: 32 } as const
const TEXT = { dy: 106, size: 14, lineHeight: 24, maxLines: 4 } as const

export const sliceComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect) || components.length !== 2) return null
  const [chart, cards] = components
  if (chart?.type !== "chart" || cards?.type !== "icon_cards") return null
  const c = chart as Chart
  if (c.chart_type !== "stacked" || c.direction !== "horizontal" || c.series.length !== 2 || !c.emphasis_label?.trim()) return null
  if (c.title?.trim() || c.tag || c.bands || c.reference || c.changes) return null
  const [part, rest] = c.series
  if (!part!.emphasis || rest!.emphasis || part!.data.length !== 1 || rest!.data.length !== 1) return null
  const a = part!.data[0]!.y
  const b = rest!.data[0]!.y
  if (!(a > 0) || !(b > 0)) return null
  const whole = stripEmphasis(String(part!.data[0]!.x)).trim()
  const items = (cards as Cards).items
  if (items.length < 2 || items.length > 4 || (cards as Cards).title?.trim() || items.some((it) => it.tag || it.tone)) return null
  const marked = items.findIndex((it) => stripEmphasis(it.title).trim() === stripEmphasis(part!.name).trim())
  if (marked < 0) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const sliceW = (a / (a + b)) * BAR.w
  const label = c.emphasis_label.trim()
  const labelW = placardWidth(label, SHARE.size, ctx, { serif: true, bold: true })
  const restName = stripEmphasis(rest!.name).trim()
  const restW = placardWidth(restName, SHARE.rest.size, ctx)
  if (BAR.x + sliceW + SHARE.gap + labelW + 24 + restW + SHARE.rest.pad > BAR.x + BAR.w) return null
  const cardW = (BAR.w - (items.length - 1) * CARD.gap) / items.length
  const inner = cardW - CARD.pad * 2
  const names = items.map((it) => fitPlacard(it.title, { width: inner, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const texts = items.map((it) => fitPlacard(it.text, { width: inner, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx))
  if (names.some((n) => !n) || texts.some((t) => !t)) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const vitrine = inks.vitrine
  const barY = rect.y + BAR.y
  const mid = barY + BAR.h / 2
  return (
    <g {...compositionTag("slice")}>
      {head}
      <g {...blockTag(ctx, chart)} data-placard-slice="">
        <rect x={rect.x + BAR.x + 0.5} y={barY + 0.5} width={BAR.w - 1} height={BAR.h - 1} fill={vitrine} stroke={inks.line} strokeWidth={1} />
        <rect data-placard-part={stripEmphasis(part!.name).trim()} x={rect.x + BAR.x} y={barY} width={sliceW} height={BAR.h} fill={placardMark(inks.copper, vitrine)} />
        {paintPlacardLine(label, { ctx, x: rect.x + BAR.x + sliceW + SHARE.gap, baseline: mid + SHARE.size * 0.36, size: SHARE.size, serif: true, bold: true, fill: placardText(inks.lit, vitrine, SHARE.size), ground: vitrine })}
        {paintPlacardLine(restName, { ctx, x: rect.x + BAR.x + BAR.w - SHARE.rest.pad, baseline: mid + SHARE.rest.size * 0.36, size: SHARE.rest.size, anchor: "end", fill: placardText(inks.muted, vitrine, SHARE.rest.size), ground: vitrine })}
        {whole ? paintPlacardLine(whole, { ctx, x: rect.x + BAR.x + BAR.w, top: rect.y + WHOLE.top, lineHeight: WHOLE.lineHeight, size: WHOLE.size, anchor: "end", fill: placardText(inks.muted, ground, WHOLE.size) }) : null}
      </g>
      <g {...blockTag(ctx, cards)} data-placard-ways="">
        {items.map((it, i) => {
          const x = rect.x + BAR.x + i * (cardW + CARD.gap)
          const y = rect.y + CARD.y
          const board = inks.board
          return (
            <g key={i} data-placard-way={stripEmphasis(it.title).trim()}>
              <rect x={x} y={y} width={cardW} height={CARD.h} fill={board} />
              {paintPlacardRule(x, x + cardW, y + CARD.edge / 2, i === marked ? placardMark(inks.copper, ground) : inks.line, CARD.edge)}
              {paintPlacardIcon(it.icon, x + CARD.pad, y + ICON.dy, ICON.size, inks.copper, board, { stroke: 1.4 })}
              {paintPlacard(names[i]!, { ctx, x: x + CARD.pad, top: y + NAME.dy, fill: placardText(inks.ink, board, NAME.size), serif: true, ground: board })}
              {paintPlacard(texts[i]!, { ctx, x: x + CARD.pad, top: y + TEXT.dy, fill: placardText(inks.muted, board, TEXT.size), ground: board })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}

