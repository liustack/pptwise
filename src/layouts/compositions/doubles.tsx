import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import type React from "react"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  decimalsOf,
  invitationInks,
  invitationMark,
  invitationText,
  invitationValue,
  invitationWidth,
  paintInvitationLine,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Chart = Extract<Component, { type: "chart" }>

/*
 * doubles: two quantities side by side in each of one or two periods, as
 * pairs of bars on their side, luxe's 2026-10 board (p06, beside the figure
 * `solo` sets). Each period is named in bold ivory over its pair: the first
 * series a solid gold bar, the second an outline in old gold, each with its
 * value and unit past its end in the serif (the first's lifted toward the
 * ivory) and its series' name small under it. Both pairs read on one scale.
 *
 * Takes, in the invitation setting, in a band another composition hands on
 * or on a page of its own under the centred claim:
 * one `bar` chart on its side (`direction: "horizontal"`) of two series over
 * one or two categories, every value above zero.
 *
 * Declines: any other chart mark (a title, a tag, notes, symbols, ranges,
 * changes, a reference, bands, gaps, emphasis, a status or a tone), a name
 * or a value past its room, a band shorter than 300px.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's figures (`ctx.figures`).
 */

const GROUP = { dy: 10, pitch: 170 } as const
const NAME = { size: 14, dy: 6 } as const
const BAR = { h: 26, first: 22, second: 82, stroke: 1.2 } as const
const VALUE = { size: 16, gap: 10, first: 42, second: 102 } as const
const SERIES = { size: 11, first: 70, second: 130 } as const
/** The room past the longest bar for its value. */
const VALUE_ROOM = 90

/**
 * On a page of its own the drawing takes the band under the centred claim,
 * from y230, 800px wide in the middle of the card, the source at the foot.
 */
const PAGE_BAND = { x: 240, y: 230, w: 800, h: 350 } as const

export const doublesComposition: Composition = (props) => {
  const { rect, setting, claim, source } = props
  if (setting !== "invitation") return null
  if (!claim) {
    const drawn = drawDoubles(props)
    return drawn ? <g {...compositionTag("doubles")}>{drawn}</g> : null
  }
  if (!wholeCanvas(rect)) return null
  const drawn = drawDoubles({ ...props, rect: { x: rect.x + PAGE_BAND.x, y: rect.y + PAGE_BAND.y, w: PAGE_BAND.w, h: PAGE_BAND.h } })
  if (!drawn) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  return (
    <g {...compositionTag("doubles")}>
      {head}
      {drawn}
      {foot}
    </g>
  )
}

/** The drawing alone, in the band it is handed. */
function drawDoubles({ components, ctx, rect }: Parameters<Composition>[0]): React.ReactElement | null {
  const [chart, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  const c = chart as Chart
  if (c.chart_type !== "bar" || c.direction !== "horizontal" || c.title || c.tag || c.changes || c.reference || c.bands || c.gaps || c.markers) return null
  if (c.series.length !== 2 || c.series.some((s) => s.tone || s.emphasis)) return null
  if (c.series.some((s) => s.data.some((d) => d.note || d.icon || d.status || d.emphasis || d.upper !== undefined || !(d.y > 0)))) return null
  const categories = c.series[0]!.data.map((d) => String(d.x))
  if (categories.length < 1 || categories.length > 2) return null
  if (c.series[1]!.data.length !== categories.length || c.series[1]!.data.some((d, i) => String(d.x) !== categories[i])) return null
  if (rect.h < 300 || rect.y + GROUP.dy + (categories.length - 1) * GROUP.pitch + SERIES.second > rect.y + rect.h + 10) return null
  const values = c.series.flatMap((s) => s.data.map((d) => d.y))
  const decimals = decimalsOf(values)
  const unit = c.axes?.x_unit?.trim() || c.axes?.y_unit?.trim() || ""
  const scale = (rect.w - VALUE_ROOM) / Math.max(...values)
  const label = (v: number) => (unit ? `${invitationValue(v, ctx, decimals)} ${unit}` : invitationValue(v, ctx, decimals))
  if (c.series.some((s) => s.data.some((d) => d.y * scale + VALUE.gap + invitationWidth(label(d.y), VALUE.size, ctx, { serif: true, bold: true }) > rect.w))) return null
  if (categories.some((cat) => invitationWidth(cat, NAME.size, ctx, { bold: true }) > rect.w)) return null
  const names = c.series.map((s) => stripEmphasis(s.name).trim())
  if (names.some((n) => invitationWidth(n, SERIES.size, ctx) > rect.w)) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  return (
    <g data-invitation-drawing="doubles">
      <g {...blockTag(ctx, chart)} data-invitation-plot="">
        {categories.map((cat, i) => {
          const y = rect.y + GROUP.dy + i * GROUP.pitch
          const a = c.series[0]!.data[i]!.y
          const b = c.series[1]!.data[i]!.y
          return (
            <g key={i} data-invitation-pair={cat}>
              {paintInvitationLine(cat, { ctx, x: rect.x, baseline: y + NAME.dy, size: NAME.size, bold: true, fill: invitationText(inks.ivory, ground, NAME.size) })}
              <rect x={rect.x} y={y + BAR.first} width={a * scale} height={BAR.h} fill={invitationMark(inks.gold, ground)} />
              {paintInvitationLine(label(a), { ctx, x: rect.x + a * scale + VALUE.gap, baseline: y + VALUE.first, size: VALUE.size, serif: true, bold: true, fill: invitationText(inks.goldLight, ground, VALUE.size) })}
              {paintInvitationLine(names[0]!, { ctx, x: rect.x, baseline: y + SERIES.first, size: SERIES.size, fill: invitationText(inks.muted, ground, SERIES.size) })}
              <rect x={rect.x + BAR.stroke / 2} y={y + BAR.second + BAR.stroke / 2} width={Math.max(1, b * scale - BAR.stroke)} height={BAR.h - BAR.stroke} fill="none" stroke={invitationMark(inks.muted, ground)} strokeWidth={BAR.stroke} />
              {paintInvitationLine(label(b), { ctx, x: rect.x + b * scale + VALUE.gap, baseline: y + VALUE.second, size: VALUE.size, serif: true, fill: invitationText(inks.ivory, ground, VALUE.size) })}
              {paintInvitationLine(names[1]!, { ctx, x: rect.x, baseline: y + SERIES.second, size: SERIES.size, fill: invitationText(inks.muted, ground, SERIES.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
