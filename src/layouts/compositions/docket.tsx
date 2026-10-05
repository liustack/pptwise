import type React from "react"
import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import {
  dossierInks,
  dossierMeta,
  dossierText,
  dossierTone,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierIcon,
  paintDossierLine,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * docket: cases on file, one a row, clinic's 2026-10 board (the outside-risk
 * page, p04, beside its photograph). Each row is a case: its icon, who
 * reported it and when (the item's `source`) small and bold in the muted ink,
 * what happened (its `note`) under that, and at the right the figure the case
 * turns on, what the figure is (its `label`, 「货值」「涉案」「罚款」) small
 * over it. A case that is bad news (`tone: "danger"`) sets its icon and its
 * figure in the danger ink. Hairlines part the rows.
 *
 * Takes, in the dossier setting: one `kpi_cards` of two to five items, each
 * with an icon and a source and none with a delta or a tag.
 *
 * Declines: a figure wider than its column, a source past one line, a note
 * past two lines, and rows taller than the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces.
 */

const PITCH = 102
const TOP = 10
const ICON = { top: 8, size: 24 } as const
const TEXT_X = 40
const SOURCE = { top: 4, size: 13, lineHeight: 22 } as const
const NOTE = { top: 30, size: 16, lineHeight: 26, maxLines: 2 } as const
const LABEL = { top: 4, size: 12, lineHeight: 20 } as const
const FIGURE = { top: 26, size: 30, lineHeight: 44, minW: 256, gap: 20 } as const
const RULE = 8

export const docketComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [kpis, ...rest] = components
  if (kpis?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpis as KpiCards).items
  if (items.length < 2 || items.length > 5) return null
  if (items.some((item) => !item.icon || !item.source?.trim() || item.delta || item.tag)) return null
  if (TOP + (items.length - 1) * PITCH + FIGURE.top + FIGURE.lineHeight > rect.h) return null
  const inks = dossierInks(ctx)
  const figures = items.map((item) => {
    const { text, unit } = kpiFigure(item.value, item.unit)
    return joinUnit(text, unit?.trim() || undefined)
  })
  const figureW = Math.max(FIGURE.minW, ...figures.map((f) => Math.ceil(dossierWidth(f, FIGURE.size, ctx, true))))
  const textW = rect.w - TEXT_X - figureW - FIGURE.gap
  if (textW < 160) return null
  const rows = items.map((item) => ({
    source: fitDossier(item.source, { width: textW, size: SOURCE.size, lineHeight: SOURCE.lineHeight, maxLines: 1, bold: true }, ctx),
    note: item.note?.trim() ? fitDossier(item.note, { width: textW, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : null,
    label: fitDossier(item.label, { width: figureW, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1 }, ctx),
  }))
  if (rows.some((r, i) => !r.source || !r.label || (items[i]!.note?.trim() && !r.note))) return null
  const right = rect.x + rect.w
  return (
    <g {...compositionTag("docket")} {...blockTag(ctx, kpis)}>
      {items.map((item, i) => {
        const top = rect.y + TOP + i * PITCH
        const toned = dossierTone(inks, item.tone)
        const { source, note, label } = rows[i]!
        return (
          <g key={i} data-dossier-case={item.tone ?? ""}>
            {i > 0 ? <rect x={rect.x} y={top - RULE} width={rect.w} height={1} fill={inks.line} /> : null}
            {paintDossierIcon(item.icon!, rect.x, top + ICON.top, ICON.size, toned ?? inks.mark, inks.ground)}
            {paintDossier(source!, { ctx, x: rect.x + TEXT_X, top: top + SOURCE.top, bold: true, fill: dossierMeta(inks.muted, inks.ground) })}
            {note ? paintDossier(note, { ctx, x: rect.x + TEXT_X, top: top + NOTE.top, fill: dossierText(inks.ink, inks.ground, NOTE.size) }) : null}
            {paintDossier(label!, { ctx, x: right, top: top + LABEL.top, anchor: "end", fill: dossierMeta(inks.muted, inks.ground) })}
            {paintDossierLine(figures[i]!, {
              ctx,
              x: right,
              top: top + FIGURE.top,
              lineHeight: FIGURE.lineHeight,
              size: FIGURE.size,
              bold: true,
              anchor: "end",
              fill: dossierText(toned ?? inks.ink, inks.ground, FIGURE.size),
            })}
          </g>
        )
      })}
    </g>
  )
}
