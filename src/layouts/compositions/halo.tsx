import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PlacardGlow,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardInks,
  placardText,
  placardTrackedWidth,
  placardWidth,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * halo: one figure in a pool of light, museum's 2026-10 board (p11). The
 * hall lights down to one exhibit: a wide pool of warm light in the middle
 * of the page, the exhibit's number small and tracked in copper over it
 * (「展品 5」), the figure set huge in the serif in copper with its unit after
 * it a third the size (「42.03 亿年」), a short seam, the page's claim under
 * it in the serif as the line the figure answers to, centred, what the
 * figure rests on in old paper under that, and the source small at the
 * foot, centred.
 *
 * Takes, in the placard setting: a `kpi_cards` of one item, its value the
 * figure, its unit, its tag the exhibit's number and its label what it rests
 * on, on a page with a claim. A `fact` page that names a figure and says
 * what it means is drawn here, claim and all.
 *
 * Declines: a figure wider than the page, a claim past two lines, a label
 * past two lines.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const LIGHT = { cx: 640, cy: 340, r: 380, strength: 0.18 } as const
const NUMBER = { top: 150, size: 12, lineHeight: 20, tracking: 6 } as const
const FIGURE = { top: 200, size: 170, lineHeight: 190, unit: 52, w: 1152 } as const
const SEAM = { y: 420, w: 120 } as const
const CLAIM = { x: 240, w: 800, size: 22, lineHeight: 32, foot: 476 } as const
const LABEL = { top: 486, size: 14, lineHeight: 26, w: 800, maxLines: 2 } as const
const SOURCE = { top: 600, lineHeight: 20 } as const

export const haloComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect)) return null
  const [kpi, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0 || !claim) return null
  const items = (kpi as Kpi).items
  if (items.length !== 1) return null
  const item = items[0]!
  if (item.icon || item.note || item.source || item.delta || item.tone) return null
  const value = stripEmphasis(item.value).trim()
  const unit = item.unit?.trim() ?? ""
  const figureW = placardWidth(value, FIGURE.size, ctx, { serif: true }) + (unit ? placardWidth(` ${unit}`, FIGURE.unit, ctx, { serif: true }) : 0)
  if (!value || figureW > FIGURE.w) return null
  const number = stripEmphasis(item.tag?.text ?? "").trim()
  if (number && placardTrackedWidth(number, NUMBER.size, NUMBER.tracking, ctx, { bold: true }) > FIGURE.w) return null
  // The claim on one line, or on two with what follows moved down a line.
  let lines = 1
  let head = placePlacardClaim(claim, { x: rect.x + CLAIM.x, w: CLAIM.w, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.foot, maxLines: 1, align: "center" })
  if (head === false) {
    lines = 2
    head = placePlacardClaim(claim, { x: rect.x + CLAIM.x, w: CLAIM.w, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.foot + CLAIM.lineHeight, maxLines: 2, align: "center" })
  }
  if (head === false) return null
  const shift = (lines - 1) * CLAIM.lineHeight
  const label = item.label.trim() ? fitPlacardSentence(item.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx) : undefined
  if (label === null) return null
  const labelBottom = LABEL.top + shift + (label?.lines.length ?? 0) * LABEL.lineHeight
  if (labelBottom > SOURCE.top - 8) return null
  const foot = placePlacardSource(source, { x: rect.x + 240, w: 800, top: rect.y + SOURCE.top, lineHeight: SOURCE.lineHeight, align: "center" })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const copper = placardText(inks.copper, ground, FIGURE.unit)
  const mid = rect.x + 640
  return (
    <g {...compositionTag("halo")}>
      <PlacardGlow id="placard-halo-light" cx={rect.x + LIGHT.cx} cy={rect.y + LIGHT.cy} r={LIGHT.r} strength={LIGHT.strength} ctx={ctx} />
      <g {...blockTag(ctx, kpi)} data-placard-halo="">
        {number ? <g data-placard-number={number}>{paintPlacardTracked({ ctx, text: number, x: mid, y: placardBaseline(rect.y + NUMBER.top, NUMBER.lineHeight, NUMBER.size), size: NUMBER.size, tracking: NUMBER.tracking, bold: true, anchor: "middle", fill: placardText(inks.copper, ground, NUMBER.size) })}</g> : null}
        <text data-placard-figure="" x={mid} y={placardBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, FIGURE.size, true)} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={FIGURE.size} fill={copper} dominantBaseline="alphabetic" xmlSpace={unit ? "preserve" : undefined}>
          {value}
          {unit ? <tspan fontSize={FIGURE.unit}>{` ${unit}`}</tspan> : null}
        </text>
        {paintPlacardRule(mid - SEAM.w / 2, mid + SEAM.w / 2, rect.y + SEAM.y, inks.line, 1)}
        {label ? <g data-placard-halo-label="">{paintPlacard(label, { ctx, x: mid, anchor: "middle", top: rect.y + LABEL.top + shift, fill: placardText(inks.muted, ground, LABEL.size) })}</g> : null}
      </g>
      {head}
      {foot}
    </g>
  )
}

