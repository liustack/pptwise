import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ChalkStamp,
  SOURCE_AT,
  STAMP_TOP_RIGHT,
  chalkChinese,
  chalkLine,
  chalkMark,
  chalkNumber,
  chalkStampWidth,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkLine,
  placeChalkClaimBesideStamp,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Waterfall = Extract<Component, { type: "waterfall" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * cascade: a sum bridged as bars drawn in chalk, lecture's 2026-10 board
 * (p12). Two to five bars on one chalk line: a total stands from the line,
 * a box of the board edged in chalk (the first) or the grey (the rest); a
 * step that adds or takes away floats from where the running sum stood to
 * where it goes, an outline dashed in the grey, or in yellow when the author
 * marks it. Each bar's figure in the serif over it in its edge's ink, what
 * it is under the line, and a dashed grey line from each bar across to the
 * top of the next. A line in the grey centred under the bars, then the
 * source. The example's stamp stands at the top right.
 *
 * Takes, in the chalkboard setting: a `waterfall` of two to five items, at
 * most one marked, then optionally a `paragraph`. The page's stamp when it
 * has one.
 *
 * Declines: a waterfall with a title or a line over its marked bars, an
 * item with a note, a marked total, a label wider than its bar's room, a
 * closing line past one line, a stamp with a date line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const PLOT = { x0: 140, x1: 1100, centre: 620, base: 560, height: 260, maxStep: 320, maxW: 200 } as const
const FIGURE = { size: 40, rise: 16 } as const
const LABEL = { dy: 30, size: 15 } as const
const CLOSE = { top: 608, size: 15, lineHeight: 26, w: 1000 } as const

export const cascadeComposition: Composition = ({ components, ctx, setting, rect, claim, source, stamp }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [bridge, close, ...rest] = components
  if (bridge?.type !== "waterfall" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const wf = bridge as Waterfall
  if (wf.title?.trim() || wf.emphasis_label?.trim()) return null
  const items = wf.items
  const n = items.length
  if (n < 2 || n > 5 || items.some((item) => item.note?.trim())) return null
  if (items.filter((item) => item.emphasis).length > 1) return null
  // Each bar from where the running sum stood to where it goes.
  let running = 0
  const spans = items.map((item) => {
    const from = item.kind === "total" ? 0 : running
    const to = item.kind === "total" ? item.value : running + item.value
    running = to
    return { lo: Math.min(from, to), hi: Math.max(from, to), total: item.kind === "total" }
  })
  if (spans.some((s) => s.lo < 0)) return null
  const top = Math.max(...spans.map((s) => s.hi))
  if (!(top > 0)) return null
  const k = PLOT.height / top
  const step = Math.min(PLOT.maxStep, (PLOT.x1 - PLOT.x0) / n)
  const w = Math.min(PLOT.maxW, step - 120)
  const x0 = PLOT.centre - (n * step - (step - w)) / 2
  const chinese = chalkChinese(ctx, items.map((item) => item.label))
  const unit = wf.unit?.trim()
  const figures = items.map((item) => {
    const v = chalkNumber(Math.abs(item.value), chinese)
    const signed = item.kind !== "total" && item.value < 0 ? `−${v}` : v
    return unit ? `${signed} ${unit}` : signed
  })
  for (const [i, item] of items.entries()) {
    if (chalkWidth(stripEmphasis(item.label), LABEL.size, ctx) > step - 16) return null
    if (chalkWidth(figures[i]!, FIGURE.size, ctx, { serif: true }) > step - 16) return null
  }
  const closing = close ? fitChalk((close as Paragraph).text, { width: CLOSE.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null) return null
  if (stamp?.date?.trim()) return null
  const head = placeChalkClaimBesideStamp(claim, stamp ? chalkStampWidth(stamp.text, ctx) : 0)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const y = (v: number) => PLOT.base - v * k
  return (
    <g {...compositionTag("cascade")}>
      {head}
      {stamp ? <ChalkStamp ctx={ctx} text={stamp.text} x={STAMP_TOP_RIGHT.x} y={STAMP_TOP_RIGHT.y} anchor="end" /> : null}
      <g {...blockTag(ctx, bridge)} data-chalk-cascade="">
        {chalkLine(PLOT.x0, PLOT.base, PLOT.x1, PLOT.base, chalkMark(inks.chalk, ground), 2)}
        {items.map((item, i) => {
          const x = x0 + i * step
          const s = spans[i]!
          const lit = item.emphasis === true
          const edge = s.total ? (i === 0 ? inks.chalk : inks.muted) : lit ? inks.yellow : inks.muted
          const next = spans[i + 1]
          return (
            <g key={i} data-chalk-bar={stripEmphasis(item.label)} data-chalk-lit={lit ? "" : undefined}>
              <rect x={x} y={y(s.hi)} width={w} height={(s.hi - s.lo) * k} fill={s.total ? inks.panel : "none"} stroke={chalkMark(edge, ground)} strokeWidth={2} strokeDasharray={s.total ? undefined : "8 5"} />
              {paintChalkLine(figures[i]!, { ctx, x: x + w / 2, anchor: "middle", baseline: y(s.hi) - FIGURE.rise, size: FIGURE.size, serif: true, fill: chalkText(edge, ground, FIGURE.size) })}
              {paintChalkLine(item.label, { ctx, x: x + w / 2, anchor: "middle", baseline: PLOT.base + LABEL.dy, size: LABEL.size, fill: chalkText(inks.chalk, ground, LABEL.size) })}
              {next ? chalkLine(x + w, y(next.hi), x + step, y(next.hi), chalkMark(inks.muted, ground), 1.5, { dash: "4 4" }) : null}
            </g>
          )
        })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 640, anchor: "middle", top: CLOSE.top, fill: chalkText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
