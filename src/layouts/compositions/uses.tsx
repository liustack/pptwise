import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"
import { figureStyleOf, groupDigits, joinUnit, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, paintPitchTracked, pitchBaseline, pitchInks, pitchText, pitchTrackedWidth, pitchWidth, type PitchInks } from "./pitch"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * uses: what a round asks for and where its money goes, ember's 2026-10
 * board (the ask page, p15). At the left the ask: what it is small and grey,
 * the ask itself large in up to two lines, a grey line under it. At the
 * right the money's uses as one bar cut into its parts, each as long as its
 * share and named by its share inside it, the first in the fire and the rest
 * stepping back (the ivory, the palette's quietest ink, the dark); under the
 * bar a key, a swatch, a name and a share a row, then a hairline and the
 * bar's caption. Under both, in a card, what the ask is measured against,
 * with its icon.
 *
 * Takes, in the pitch setting: a `kpi_cards` of one item with no delta,
 * tone, icon, source, tag or unit, none marked; then a share bar (`chart`,
 * stacked, direction horizontal) of two to five parts with none marked and
 * no emphasis_label; then optionally a `callout` with no title or tag. A
 * share is printed with the value axis's unit (`axes.y_unit`).
 *
 * Declines: the ask's label past one line, the ask past two lines, its note
 * past two lines, a share wider than its part, a name past one line, the
 * caption past one line, and the card's words past two lines.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const ASK = { w: 520, label: { size: 14, lineHeight: 22, tracking: 2 }, figure: { top: 32, size: 64, lineHeight: 76, maxLines: 2 }, note: { gap: 16, size: 16, lineHeight: 26, maxLines: 2, w: 500 } } as const
const BAR = { x: 576, top: 24, h: 70, gap: 4, share: { pad: 12, size: 24, baseline: 42 } } as const
const KEY = { top: 118, pitch: 40, swatch: { dy: 6, size: 14 }, name: { x: 24, size: 16, lineHeight: 26 }, rule: { gap: 12 }, caption: { gap: 12, size: 13, lineHeight: 22 } } as const
const CARD = { top: 344, h: 76, icon: { x: 24, size: 24 }, text: { x: 62, size: 16, lineHeight: 22, maxLines: 2 } } as const

function partInks(n: number, inks: PitchInks): string[] {
  const steps = [inks.ink, inks.quiet, inks.dim]
  return Array.from({ length: n }, (_, i) => (i === 0 ? inks.fire : steps[(i - 1) % steps.length]!))
}

export const usesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [ask, chart, ref, ...rest] = components
  if (ask?.type !== "kpi_cards" || chart?.type !== "chart" || rest.length > 0) return null
  if (ref !== undefined && (ref.type !== "callout" || ref.title !== undefined || ref.tag !== undefined)) return null
  const k = ask as KpiCards
  if (k.items.length !== 1) return null
  const item = k.items[0]!
  if (item.delta || item.tone || item.icon || item.source || item.tag || item.unit) return null
  const c = chart as Chart
  if (!isShareBar(c) || c.emphasis_label !== undefined || c.series.length < 2 || c.series.length > 5) return null
  if (c.series.some((s) => s.emphasis || s.tone || s.data.length !== 1 || s.data[0]!.y <= 0 || s.data[0]!.note !== undefined)) return null
  if (rect.h < (ref ? CARD.top + CARD.h : KEY.top + c.series.length * KEY.pitch + 60)) return null
  const inks = pitchInks(ctx)
  const value = item.value.replace(/\*\*/g, "")
  if (value !== item.value) return null
  const askLabel = item.label.trim()
  if (pitchTrackedWidth(askLabel, ASK.label.size, ASK.label.tracking, ctx, true) > ASK.w) return null
  const figure = fitPitch(value, { width: ASK.w, size: ASK.figure.size, lineHeight: ASK.figure.lineHeight, maxLines: ASK.figure.maxLines, bold: true }, ctx)
  const note = item.note?.trim() ? fitPitch(item.note, { width: ASK.note.w, size: ASK.note.size, lineHeight: ASK.note.lineHeight, maxLines: ASK.note.maxLines }, ctx) : null
  if (!figure || (item.note?.trim() && !note)) return null

  const barX = rect.x + BAR.x
  const barW = rect.w - BAR.x
  const unit = c.axes?.y_unit?.trim() || undefined
  const chinese = ctx.figures?.chinese ?? mostlyChinese(c.series.map((s) => s.name))
  const total = c.series.reduce((sum, s) => sum + s.data[0]!.y, 0)
  const colors = partInks(c.series.length, inks)
  let at = barX
  const parts = c.series.map((s, i) => {
    const y = s.data[0]!.y
    const w = (barW * y) / total
    const share = joinUnit(groupDigits(writtenFigure(y), figureStyleOf(chinese)), unit)
    const part = { name: s.name.trim(), share, x: at, w, fill: colors[i]!, i }
    at += w
    return part
  })
  if (parts.some((p) => pitchWidth(p.share, BAR.share.size, ctx, true) > p.w - BAR.gap - BAR.share.pad * 2)) return null
  if (parts.some((p) => pitchWidth(p.name, KEY.name.size, ctx, p.i === 0) + pitchWidth(p.share, KEY.name.size, ctx, true) + 32 > barW - KEY.name.x)) return null
  const caption = String(c.series[0]!.data[0]!.x).trim()
  const captionFit = caption ? fitPitch(caption, { width: barW, size: KEY.caption.size, lineHeight: KEY.caption.lineHeight, maxLines: 1 }, ctx) : null
  if (caption && !captionFit) return null
  const ruleTop = KEY.top + parts.length * KEY.pitch + KEY.rule.gap
  const refText = ref?.type === "callout" ? fitPitch(ref.text, { width: rect.w - CARD.text.x - 24, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx) : null
  if (ref && !refText) return null

  const y = rect.y
  const noteTop = y + ASK.figure.top + figure.lines.length * ASK.figure.lineHeight + ASK.note.gap
  return (
    <g {...compositionTag("uses")}>
      <g {...blockTag(ctx, k)} data-pitch-ask="">
        {paintPitchTracked({ ctx, text: askLabel, x: rect.x, y: pitchBaseline(y, ASK.label.lineHeight, ASK.label.size), size: ASK.label.size, tracking: ASK.label.tracking, bold: true, fill: pitchText(inks.muted, inks.ground, ASK.label.size) })}
        {paintPitch(figure, { ctx, x: rect.x, top: y + ASK.figure.top, bold: true, fill: pitchText(inks.ink, inks.ground, ASK.figure.size), ground: inks.ground })}
        {note ? paintPitch(note, { ctx, x: rect.x, top: noteTop, fill: pitchText(inks.muted, inks.ground, ASK.note.size), ground: inks.ground }) : null}
      </g>
      <g {...blockTag(ctx, c)} data-pitch-uses="">
        {parts.map((p) => {
          const block = (
            <g key={p.i}>
              <rect x={p.x} y={y + BAR.top} width={p.w - BAR.gap} height={BAR.h} fill={p.fill} />
              {paintPitchLine(p.share, { ctx, x: p.x + BAR.share.pad, baseline: y + BAR.top + BAR.share.baseline, size: BAR.share.size, bold: true, fill: pitchText(readableOn(p.fill), p.fill, BAR.share.size) })}
            </g>
          )
          const keyY = y + KEY.top + p.i * KEY.pitch
          const swatch = <rect x={barX} y={keyY + KEY.swatch.dy} width={KEY.swatch.size} height={KEY.swatch.size} rx={2} fill={p.fill} />
          return (
            <g key={p.i} data-pitch-use={p.i}>
              {p.i === 0 ? (
                <Fire id="use">
                  {block}
                  {swatch}
                </Fire>
              ) : (
                <>
                  {block}
                  {swatch}
                </>
              )}
              {paintPitchLine(p.name, { ctx, x: barX + KEY.name.x, top: keyY, lineHeight: KEY.name.lineHeight, size: KEY.name.size, bold: p.i === 0, fill: pitchText(inks.ink, inks.ground, KEY.name.size) })}
              {paintPitchLine(p.share, { ctx, x: barX + barW, top: keyY, lineHeight: KEY.name.lineHeight, size: KEY.name.size, bold: true, anchor: "end", fill: pitchText(inks.ink, inks.ground, KEY.name.size) })}
            </g>
          )
        })}
        <rect x={barX} y={y + ruleTop} width={barW} height={1} fill={inks.line} />
        {captionFit ? paintPitch(captionFit, { ctx, x: barX, top: y + ruleTop + KEY.caption.gap, fill: pitchText(inks.muted, inks.ground, KEY.caption.size), ground: inks.ground }) : null}
      </g>
      {ref && refText ? (
        <g {...blockTag(ctx, ref)} data-pitch-reference="">
          {paintPitchCard({ x: rect.x, y: y + CARD.top, w: rect.w, h: CARD.h }, inks)}
          {(ref as Callout).icon ? paintPitchIcon((ref as Callout).icon!, rect.x + CARD.icon.x, y + CARD.top + (CARD.h - CARD.icon.size) / 2, CARD.icon.size, inks.muted, inks.card) : null}
          {paintPitch(refText, { ctx, x: rect.x + ((ref as Callout).icon ? CARD.text.x : CARD.icon.x), top: y + CARD.top + (CARD.h - refText.lines.length * CARD.text.lineHeight) / 2, fill: pitchText(inks.ink, inks.card, CARD.text.size), ground: inks.card })}
        </g>
      ) : null}
    </g>
  )
}
