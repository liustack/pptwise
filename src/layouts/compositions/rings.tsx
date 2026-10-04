import type React from "react"
import type { Component } from "@/ir"
import { parseProgressRatio } from "@/ir/components/progress-donuts"
import { donutArcPath } from "../../components/progress-donuts"
import { SEAL_TYPE, sealInks, sealSmall, sealText } from "./seal"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"

type ProgressDonuts = Extract<Component, { type: "progress_donuts" }>

/*
 * rings: completion rates as large rings in a row, vermilion's 2026-10 funds
 * page (p12). Each ring is 92px across its middle on a 16px stroke: a pale
 * track and the progress in the accent, the rate bold at 40px inside it. Under
 * the ring its name bold at 19px, the amounts behind the rate (`detail`) at
 * 16px and its source at 15px. The rate the author marks (`emphasis`) takes
 * the mark for its progress, its rate and its name.
 *
 * Takes: one `progress_donuts` of two to five items with no `icon` or `unit`
 * other than "%". The seal setting only.
 *
 * Declines: a name, detail or source past one line of its column, a rate
 * wider than its ring, and rings taller than the band.
 */

const MAX_ITEMS = 5
const RING = { r: 92, stroke: 16, top: 134 }
const RATE = { size: 40 }
const NAME = { size: 19, lineHeight: 28, drop: 140 }
const DETAIL = { size: 16, lineHeight: 24, drop: 168 }
const SOURCE = { size: SEAL_TYPE.label, lineHeight: 22, drop: 192 }

export const ringsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "seal") return null
  const [only, ...rest] = components
  if (only?.type !== "progress_donuts" || rest.length > 0) return null
  const rings = only as ProgressDonuts
  if (rings.items.length > MAX_ITEMS || rings.items.some((item) => item.icon !== undefined)) return null
  const cellW = rect.w / rings.items.length
  const r = Math.min(RING.r, Math.floor(cellW / 2 - RING.stroke - 16))
  const scale = r / RING.r
  if (r < 60) return null
  const top = rect.y + Math.round(RING.top * scale)
  if (top + SOURCE.drop + 6 > rect.y + rect.h) return null
  const body = ctx.fonts.body
  const fit = (text: string | undefined, spec: { size: number; lineHeight: number }, bold: boolean) =>
    text?.trim() ? fitFixed(text, { width: cellW - 24, size: spec.size, lineHeight: spec.lineHeight, maxLines: 1, fontFamily: body, bold }) : undefined
  const laid = []
  for (const item of rings.items) {
    const ratio = parseProgressRatio(item.value, item.unit)
    if (ratio === null) return null
    const written = item.value.trim()
    const rateText = item.unit?.trim() === "%" && !written.endsWith("%") ? `${written}%` : written
    const rate = fitFixed(rateText, {
      width: (r - RING.stroke) * 1.8,
      size: Math.round(RATE.size * Math.min(1, scale + 0.15)),
      lineHeight: RATE.size,
      maxLines: 1,
      fontFamily: ctx.fonts.heading,
      bold: true,
    })
    const name = fit(item.label, NAME, true)
    const detail = fit(item.detail, DETAIL, false)
    const source = fit(item.source, SOURCE, false)
    if (!rate || name === null || detail === null || source === null) return null
    laid.push({ item, ratio, rate, name, detail, source, marked: item.emphasis === true })
  }

  const inks = sealInks(ctx)
  return (
    <g {...compositionTag("rings")}>
      <g {...blockTag(ctx, rings)}>
        {laid.map((ring, i) => {
          const cx = Math.round(rect.x + cellW * (i + 0.5))
          const cy = top
          const progress = ring.marked ? inks.mark : inks.accent
          const d = ring.ratio >= 1 ? null : donutArcPath(cx, cy, r, ring.ratio)
          const text = (layout: NonNullable<typeof ring.name>, dy: number, spec: { size: number }, ink: string, bold: boolean) =>
            paintLines(layout, {
              ctx,
              x: cx,
              y: cy + Math.round(dy * scale),
              fill: sealText(ink, inks.ground, spec.size),
              fontFamily: body,
              fontWeight: bold ? "700" : "400",
              anchor: "middle",
              attrs: sealSmall(spec.size),
            })
          return (
            <g key={i} data-ring-marked={ring.marked ? "1" : undefined}>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke={inks.track} strokeWidth={RING.stroke} />
              {d === null ? (
                <circle cx={cx} cy={cy} r={r} fill="none" stroke={progress} strokeWidth={RING.stroke} />
              ) : d ? (
                <path d={d} fill="none" stroke={progress} strokeWidth={RING.stroke} strokeLinecap="butt" />
              ) : null}
              {paintLines(ring.rate, {
                ctx,
                x: cx,
                y: cy + Math.round(ring.rate.fontSize * 0.35),
                fill: sealText(ring.marked ? inks.mark : inks.ink, inks.ground, ring.rate.fontSize),
                fontFamily: ctx.fonts.heading,
                fontWeight: "700",
                anchor: "middle",
              })}
              {ring.name && text(ring.name, NAME.drop, NAME, ring.marked ? inks.mark : inks.ink, true)}
              {ring.detail && text(ring.detail, DETAIL.drop, DETAIL, inks.ink, false)}
              {ring.source && text(ring.source, SOURCE.drop, SOURCE, inks.muted, false)}
            </g>
          )
        })}
      </g>
    </g>
  )
}
