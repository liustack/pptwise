import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchLine, pitchBaseline, pitchInks, pitchText, pitchWidth } from "./pitch"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * expanse: how small one thing is beside another, ember's 2026-10 board (the
 * scale page, p03). At the left a field of squares in a hairline frame, the
 * whole (a year's 60 billion orders) set huge over it, and in its corner one
 * small dot of the fire with a leader up to the part (a million drone
 * orders), the part's figure in the fire. At the right the ratio between
 * them set large, what it measures under it, a hairline, and the page's
 * point.
 *
 * Takes, in the pitch setting: a `kpi_cards` of three items, the whole, the
 * part with its figure written `**…**`, then the ratio, each with a label and
 * no note, source, tag, delta, tone or icon; then optionally a `paragraph`,
 * the point.
 *
 * The squares stop short of the words set over them: each word stands on a
 * plate of the page's own colour 4px wider than its ink all round, so no
 * line of the field runs through a word (the design brief's rule).
 *
 * Declines: a whole wider than the field even at 80px, a ratio past two
 * lines, a label past one line (the ratio's past two), and a point past four
 * lines.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const FIELD = { w: 640, h: 400, cell: 40, frame: 1.5, grid: 0.6 } as const
/** How far a plate under a word reaches past its ink at either end. */
const KNOCK = 4
const WHOLE = { x: 32, top: 24, sizes: [96, 80] as const, lineHeight: 1.146, label: { x: 36, gap: 8, size: 18, lineHeight: 30 } } as const
const PART = { dot: { x: 16, fromBottom: 16, r: 3, ring: 12 }, leader: { dx: 70, dy: 60 }, figure: { x: 92, top: 292, size: 30, lineHeight: 34 }, label: { top: 328, size: 14, lineHeight: 22 } } as const
const SIDE = { x: 696, ratio: { size: 64, lineHeight: 76 }, measure: { top: 94, size: 16, lineHeight: 26 }, rule: 184, point: { top: 208, size: 20, lineHeight: 32, maxLines: 4 } } as const

function plainFigure(item: KpiItem): boolean {
  return item.note === undefined && item.source === undefined && item.tag === undefined && item.delta === undefined && item.tone === undefined && item.icon === undefined
}

export const expanseComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [figures, point, ...rest] = components
  if (figures?.type !== "kpi_cards" || rest.length > 0) return null
  if (point !== undefined && point.type !== "paragraph") return null
  const k = figures as KpiCards
  if (k.items.length !== 3 || !k.items.every(plainFigure)) return null
  const [whole, part, ratio] = k.items.map((item) => ({ item, fig: kpiFigure(item.value, item.unit) }))
  if (!part!.fig.marked || whole!.fig.marked || ratio!.fig.marked) return null
  if (rect.w < SIDE.x + 320 || rect.h < FIELD.h) return null
  const inks = pitchInks(ctx)
  const sideW = rect.w - SIDE.x

  // The whole, at the first size that fits the field.
  const fieldInner = FIELD.w - WHOLE.x * 2
  const wholeText = joinUnit(whole!.fig.text, whole!.fig.unit)
  const wholeSize = WHOLE.sizes.find((size) => pitchWidth(wholeText, size, ctx, true) <= fieldInner)
  if (wholeSize === undefined) return null
  const wholeLine = Math.round(wholeSize * WHOLE.lineHeight)
  const wholeLabel = fitPitch(whole!.item.label, { width: fieldInner, size: WHOLE.label.size, lineHeight: WHOLE.label.lineHeight, maxLines: 1 }, ctx)
  const partText = joinUnit(part!.fig.text, part!.fig.unit)
  const partLabel = fitPitch(part!.item.label, { width: FIELD.w - PART.figure.x - 24, size: PART.label.size, lineHeight: PART.label.lineHeight, maxLines: 1 }, ctx)
  const partFits = pitchWidth(partText, PART.figure.size, ctx, true) <= FIELD.w - PART.figure.x - 24
  const ratioText = joinUnit(ratio!.fig.text, ratio!.fig.unit)
  const ratioFit = fitPitch(ratioText, { width: sideW, size: SIDE.ratio.size, lineHeight: SIDE.ratio.lineHeight, maxLines: 2, bold: true }, ctx)
  const measure = fitPitch(ratio!.item.label, { width: sideW, size: SIDE.measure.size, lineHeight: SIDE.measure.lineHeight, maxLines: 2 }, ctx)
  const pointFit = point?.type === "paragraph" ? fitPitch(point.text, { width: sideW, size: SIDE.point.size, lineHeight: SIDE.point.lineHeight, maxLines: SIDE.point.maxLines }, ctx) : null
  if (!wholeLabel || !partLabel || !partFits || !ratioFit || !measure || (point && !pointFit)) return null
  // A ratio on two lines moves everything under it down a line.
  const shift = (ratioFit.lines.length - 1) * SIDE.ratio.lineHeight + (measure.lines.length - 1) * SIDE.measure.lineHeight
  if (pointFit && SIDE.point.top + shift + pointFit.lines.length * SIDE.point.lineHeight > rect.h) return null

  const fx = rect.x
  const fy = rect.y
  const lines: React.ReactElement[] = []
  for (let gx = 1; gx * FIELD.cell < FIELD.w; gx++) {
    lines.push(<line key={`v${gx}`} x1={fx + gx * FIELD.cell} y1={fy + 1} x2={fx + gx * FIELD.cell} y2={fy + FIELD.h - 1} stroke={inks.dim} strokeWidth={FIELD.grid} />)
  }
  for (let gy = 1; gy * FIELD.cell < FIELD.h; gy++) {
    lines.push(<line key={`h${gy}`} x1={fx + 1} y1={fy + gy * FIELD.cell} x2={fx + FIELD.w - 1} y2={fy + gy * FIELD.cell} stroke={inks.dim} strokeWidth={FIELD.grid} />)
  }
  const dotX = fx + PART.dot.x
  const dotY = fy + FIELD.h - PART.dot.fromBottom
  const wholeBaseline = pitchBaseline(fy + WHOLE.top, wholeLine, wholeSize)
  const wholeLabelTop = fy + WHOLE.top + wholeLine + WHOLE.label.gap
  const sx = rect.x + SIDE.x
  // The plates the field's lines stop at: one under each word set on it.
  const plate = (x: number, top: number, w: number, h: number, key: string) => <rect key={key} x={x - KNOCK} y={top} width={w + KNOCK * 2} height={h} fill={inks.ground} />
  const wholeW = pitchWidth(wholeText, wholeSize, ctx, true)
  const plates = [
    plate(fx + WHOLE.x, fy + WHOLE.top + 4, wholeW, wholeLine - 4, "whole"),
    plate(fx + WHOLE.label.x, wholeLabelTop, Math.max(...wholeLabel!.lines.map((l) => pitchWidth(l, WHOLE.label.size, ctx))), WHOLE.label.lineHeight, "whole-label"),
    plate(fx + PART.figure.x, fy + PART.figure.top, pitchWidth(partText, PART.figure.size, ctx, true), PART.figure.lineHeight, "part"),
    plate(fx + PART.figure.x, fy + PART.label.top, Math.max(...partLabel!.lines.map((l) => pitchWidth(l, PART.label.size, ctx))), PART.label.lineHeight, "part-label"),
  ]
  return (
    <g {...compositionTag("expanse")}>
      <g {...blockTag(ctx, k)}>
        <g data-pitch-field="">
          {lines}
          <rect x={fx + FIELD.frame / 2} y={fy + FIELD.frame / 2} width={FIELD.w - FIELD.frame} height={FIELD.h - FIELD.frame} fill="none" stroke={inks.line} strokeWidth={FIELD.frame} />
          <g data-pitch-plates="">{plates}</g>
        </g>
        {paintPitchLine(wholeText, { ctx, x: fx + WHOLE.x, baseline: wholeBaseline, size: wholeSize, bold: true, fill: pitchText(inks.ink, inks.ground, wholeSize) })}
        {paintPitch(wholeLabel!, { ctx, x: fx + WHOLE.label.x, top: wholeLabelTop, fill: pitchText(inks.muted, inks.ground, WHOLE.label.size), ground: inks.ground })}
        <Fire id="part">
          <circle cx={dotX} cy={dotY} r={PART.dot.r} fill={inks.fire} />
          <circle cx={dotX} cy={dotY} r={PART.dot.ring} fill="none" stroke={inks.fire} strokeWidth={1.2} />
          <line x1={dotX + 3} y1={dotY - 3} x2={dotX + PART.leader.dx} y2={dotY - PART.leader.dy} stroke={inks.fire} strokeWidth={1.2} />
          {paintPitchLine(partText, { ctx, x: fx + PART.figure.x, top: fy + PART.figure.top, lineHeight: PART.figure.lineHeight, size: PART.figure.size, bold: true, fill: pitchText(inks.fire, inks.ground, PART.figure.size) })}
        </Fire>
        {paintPitch(partLabel!, { ctx, x: fx + PART.figure.x, top: fy + PART.label.top, fill: pitchText(inks.muted, inks.ground, PART.label.size), ground: inks.ground })}
        <g data-pitch-ratio="">
          {paintPitch(ratioFit!, { ctx, x: sx, top: fy, bold: true, fill: pitchText(inks.ink, inks.ground, SIDE.ratio.size), ground: inks.ground })}
          {paintPitch(measure!, { ctx, x: sx, top: fy + SIDE.measure.top + (ratioFit!.lines.length - 1) * SIDE.ratio.lineHeight, fill: pitchText(inks.muted, inks.ground, SIDE.measure.size), ground: inks.ground })}
        </g>
      </g>
      <rect x={sx} y={fy + SIDE.rule + shift} width={sideW} height={1} fill={inks.line} />
      {pointFit && point ? (
        <g {...blockTag(ctx, point)} data-pitch-point="">
          {paintPitch(pointFit, { ctx, x: sx, top: fy + SIDE.point.top + shift, fill: pitchText(inks.ink, inks.ground, SIDE.point.size), ground: inks.ground })}
        </g>
      ) : null}
    </g>
  )
}
