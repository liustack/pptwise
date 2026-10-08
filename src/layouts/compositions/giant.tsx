import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  KICKER_AT,
  KeynoteSpot,
  SOURCE_CENTRED,
  fitKeynote,
  keynoteBaseline,
  keynoteFigureWidth,
  keynoteInks,
  keynoteMark,
  keynoteText,
  keynoteTrackedWidth,
  keynoteWidth,
  paintKeynote,
  paintKeynoteFigure,
  paintKeynoteLine,
  paintKeynoteRule,
  paintKeynoteTracked,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * giant: one figure owns the page, stage's 2026-10 board (p03, p10). The
 * claim that leads into it in the sand, 22px and centred, the figure under
 * it at 220px bold in the paper white with its unit after it a third the
 * size (「5,700 万」, 「1,000 万套」), in a faint follow spot, and under the
 * figure what it rests on: the two ends of a climb set on a hairline with a
 * dot at each end, the later one in silver (「2018 年 6.26 亿」 to 「2025 年
 *  6.83 亿」, written as one label with an arrow between the ends, the arrow
 * drawn as the line and read back by the scans as `data-gloss-break`), or one
 * short line tracked wide in silver (「开发商口径」). The source small and
 * dim, centred at the foot.
 *
 * Takes, in the keynote setting: a `kpi_cards` of one item, its value the
 * figure, its unit, and its label what the figure rests on, on a page with a
 * claim. A `fact` page that names a figure and says what it means is drawn
 * here, claim, figure and label all at once.
 *
 * Declines: an item with a note, an icon, a tag, a delta, a tone or a source
 * of its own, a figure wider than the page, a claim past two lines, a label
 * past two lines.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const SPOT = { cx: 640, cy: 330, r: 460, strength: 0.08 } as const
const CLAIM = { x: 64, w: 1152, top: 150, size: 22, lineHeight: 30 } as const
const FIGURE = { top: 196, size: 220, lineHeight: 240, unit: 80, tracking: -6, w: 1152 } as const
const CLIMB = { y: 500, x1: 380, x2: 900, stroke: 2, from: 6, to: 7, label: { baseline: 532, size: 14 } } as const
const CAVEAT = { top: 470, size: 16, lineHeight: 26, tracking: 4, w: 1152, maxLines: 2 } as const

/** A label written as the two ends of a climb, 「2018 年 6.26 亿 → 2025 年 6.83 亿」, read as its two ends. */
export function climbEnds(label: string): { from: string; to: string } | null {
  const parts = stripEmphasis(label).split(/\s*(?:→|->)\s*/u)
  if (parts.length !== 2) return null
  const [from, to] = parts.map((p) => p.trim())
  return from && to ? { from, to } : null
}

export const giantComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect) || !claim) return null
  const [kpi, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length !== 1) return null
  const item = items[0]!
  if (item.note || item.icon || item.tag || item.delta || item.tone || item.source) return null
  const value = stripEmphasis(item.value).trim()
  const unit = item.unit?.trim() ?? ""
  if (!value || keynoteFigureWidth(value, unit, FIGURE, ctx) > FIGURE.w) return null
  // The claim on one line, or on two with the first risen a line.
  let head = placeKeynoteClaim(claim, { ...CLAIM, maxLines: 1, tone: "muted", align: "center" })
  if (head === false) head = placeKeynoteClaim(claim, { ...CLAIM, top: CLAIM.top - CLAIM.lineHeight, maxLines: 2, tone: "muted", align: "center" })
  if (head === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const label = item.label.trim()
  const ends = label ? climbEnds(label) : null
  const endW = (text: string, bold: boolean) => keynoteWidth(text, CLIMB.label.size, ctx, { bold })
  if (ends && (endW(ends.from, false) / 2 > CLIMB.x1 - 64 || endW(ends.to, true) / 2 > 1216 - CLIMB.x2 || (endW(ends.from, false) + endW(ends.to, true)) / 2 + 24 > CLIMB.x2 - CLIMB.x1)) return null
  const tracked = !ends && label && keynoteTrackedWidth(stripEmphasis(label), CAVEAT.size, CAVEAT.tracking, ctx) <= CAVEAT.w ? stripEmphasis(label) : null
  const caveat = !ends && label && !tracked ? fitKeynote(label, { width: CAVEAT.w, size: CAVEAT.size, lineHeight: CAVEAT.lineHeight, maxLines: CAVEAT.maxLines }, ctx) : undefined
  if (caveat === null) return null
  const foot = placeKeynoteSource(source, SOURCE_CENTRED)
  if (foot === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const silver = keynoteText(inks.silver, ground, CAVEAT.size)
  return (
    <g {...compositionTag("giant")}>
      <KeynoteSpot id="keynote-giant-spot" cx={SPOT.cx} cy={SPOT.cy} r={SPOT.r} strength={SPOT.strength} ctx={ctx} />
      {chapter}
      {head}
      <g {...blockTag(ctx, kpi)} data-keynote-giant="">
        {paintKeynoteFigure({ ctx, value, unit, x: 640, baseline: keynoteBaseline(FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: keynoteText(inks.ink, ground, FIGURE.unit), anchor: "middle", attrs: { "data-keynote-figure": "" } })}
        {ends ? (
          <g data-keynote-climb="">
            {paintKeynoteRule(CLIMB.x1, CLIMB.x2, CLIMB.y, inks.track, CLIMB.stroke)}
            <circle cx={CLIMB.x1} cy={CLIMB.y} r={CLIMB.from} fill={keynoteMark(inks.muted, ground)} />
            <circle cx={CLIMB.x2} cy={CLIMB.y} r={CLIMB.to} fill={keynoteMark(inks.silver, ground)} />
            {paintKeynoteLine(ends.from, { ctx, x: CLIMB.x1, anchor: "middle", baseline: CLIMB.label.baseline, size: CLIMB.label.size, fill: keynoteText(inks.muted, ground, CLIMB.label.size), attrs: { "data-gloss-break": "→" } })}
            {paintKeynoteLine(ends.to, { ctx, x: CLIMB.x2, anchor: "middle", baseline: CLIMB.label.baseline, size: CLIMB.label.size, bold: true, fill: keynoteText(inks.silver, ground, CLIMB.label.size) })}
          </g>
        ) : null}
        {tracked ? <g data-keynote-caveat={tracked}>{paintKeynoteTracked({ ctx, text: tracked, x: 640, y: keynoteBaseline(CAVEAT.top, CAVEAT.lineHeight, CAVEAT.size), size: CAVEAT.size, tracking: CAVEAT.tracking, anchor: "middle", fill: silver })}</g> : null}
        {caveat ? <g data-keynote-caveat="">{paintKeynote(caveat, { ctx, x: 640, anchor: "middle", top: CAVEAT.top, fill: silver })}</g> : null}
      </g>
      {foot}
    </g>
  )
}
