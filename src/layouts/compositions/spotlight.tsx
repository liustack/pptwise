import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchLine, pitchInks, pitchText, pitchWidth } from "./pitch"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * spotlight: one figure lit and two beside it, ember's 2026-10 board (the
 * medical page, p09), in the column beside a photograph. The figure the
 * page is about (written `**…**`) set huge in the fire with what it counts
 * under it in the grey; under it the others side by side, large in the
 * ivory, each with what it counts under it.
 *
 * Takes, in the pitch setting: a `kpi_cards` of two or three items, the
 * first marked and the others not, each with a label and no note, delta,
 * tone, icon, source or tag.
 *
 * Declines: the lit figure wider than the column at 120px, its label past
 * one line, another figure wider than its half at 52px, and its label past
 * two lines.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const LIT = { size: 120, lineHeight: 130, label: { top: 130, size: 16, lineHeight: 26 } } as const
const REST = { top: 190, gap: 32, size: 52, lineHeight: 66, label: { top: 260, size: 14, lineHeight: 22, maxLines: 2 } } as const

function plainFigure(item: KpiItem): boolean {
  return item.note === undefined && item.delta === undefined && item.tone === undefined && item.icon === undefined && item.source === undefined && item.tag === undefined
}

export const spotlightComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [figures, ...rest] = components
  if (figures?.type !== "kpi_cards" || rest.length > 0) return null
  const k = figures as KpiCards
  if (k.items.length < 2 || k.items.length > 3 || !k.items.every(plainFigure)) return null
  const figs = k.items.map((item) => ({ item, fig: kpiFigure(item.value, item.unit) }))
  if (!figs[0]!.fig.marked || figs.slice(1).some((f) => f.fig.marked)) return null
  if (rect.h < REST.label.top + REST.label.lineHeight * 2) return null
  const inks = pitchInks(ctx)
  const text = (f: (typeof figs)[number]) => joinUnit(f.fig.text, f.fig.unit)
  const lit = figs[0]!
  if (pitchWidth(text(lit), LIT.size, ctx, true) > rect.w) return null
  const litLabel = fitPitch(lit.item.label, { width: rect.w, size: LIT.label.size, lineHeight: LIT.label.lineHeight, maxLines: 1 }, ctx)
  const others = figs.slice(1)
  const colW = (rect.w - (others.length - 1) * REST.gap) / others.length
  const laid = others.map((f) => ({ f, fits: pitchWidth(text(f), REST.size, ctx, true) <= colW, label: fitPitch(f.item.label, { width: colW, size: REST.label.size, lineHeight: REST.label.lineHeight, maxLines: REST.label.maxLines }, ctx) }))
  if (!litLabel || laid.some((l) => !l.fits || !l.label)) return null
  return (
    <g {...compositionTag("spotlight")}>
      <g {...blockTag(ctx, k)}>
        <Fire id="figure">{paintPitchLine(text(lit), { ctx, x: rect.x, top: rect.y, lineHeight: LIT.lineHeight, size: LIT.size, bold: true, fill: pitchText(inks.fire, inks.ground, LIT.size) })}</Fire>
        {paintPitch(litLabel, { ctx, x: rect.x, top: rect.y + LIT.label.top, fill: pitchText(inks.muted, inks.ground, LIT.label.size), ground: inks.ground })}
        {laid.map((l, i) => {
          const x = rect.x + i * (colW + REST.gap)
          return (
            <g key={i} data-pitch-aside={i}>
              {paintPitchLine(text(l.f), { ctx, x, top: rect.y + REST.top, lineHeight: REST.lineHeight, size: REST.size, bold: true, fill: pitchText(inks.ink, inks.ground, REST.size) })}
              {paintPitch(l.label!, { ctx, x, top: rect.y + REST.label.top, fill: pitchText(inks.muted, inks.ground, REST.label.size), ground: inks.ground })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
