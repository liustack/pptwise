import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import {
  chipInk,
  chipWidth,
  dossierInks,
  dossierMeta,
  dossierSeries,
  dossierText,
  dossierTone,
  dossierWidth,
  fitDossier,
  paintChip,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type DataTable = Extract<Component, { type: "data_table" }>
type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * multiples: how often each thing happens on each drug, against its control,
 * beside the risks to watch, clinic's 2026-10 board (the safety page, p08).
 * At the left a small multiple: one row a drug, one column a measure
 * (nausea, vomiting, stopping), each cell the drug's rate as a solid bar in
 * the mark with its figure over it, and its control's rate as a tick across
 * the bar in the slate series ink, named and figured at the cell's right.
 * The drug's name and the capsule naming its source (the row's `tag`) stand
 * at the row's left. The row the page is about sits on the mark's tint.
 * Every column has its own scale, so a cell compares a drug with its own
 * control and with the drugs above and below it.
 *
 * At the right the risks as cards: an icon in its tone's ink, a title and a
 * line or two under it.
 *
 * The table is written as the author keeps it: each drug's row followed by
 * its control's, every control row named alike (「安慰剂」, "Placebo"). The
 * legend over it names the drugs by the first column's label and the
 * controls by their rows' name, after the table's title (「发生率」).
 *
 * Takes, in the dossier setting: a `data_table` of two to five columns whose
 * rows pair drugs with controls, two to four pairs, figures written as
 * numbers with an optional unit; then optionally a `row_cards` of three to
 * five items with icons.
 *
 * Declines: a cell that is not a figure, a control row with a tag, an icon
 * or a mark, control rows named differently, a total row, and anything past
 * its column.
 *
 * Reads: the dossier inks and series inks (`./dossier.tsx`), the body and
 * heading faces.
 */

const LEFT_W = 664
const LEGEND = { size: 12, lineHeight: 20, swatch: 10, gap: 6, step: 18 } as const
const HEAD = { top: 28, size: 13, lineHeight: 20, rule: 52 } as const
const NAME_COL = 226
const ROWS = { top: 54, pitch: 112, inset: 12 } as const
const NAME = { top: 26, size: 17, lineHeight: 24 } as const
const CHIP_TOP = 58
const CELL = { trail: 16, bar: { top: 40, h: 22, r: 2 }, tick: { top: 36, h: 30, w: 2 }, value: { baseline: 32, size: 15 }, control: { size: 12, under: 86 } } as const
const CARDS = { x: 704, top: 10, pitch: 108, h: 96, icon: { x: 20, top: 18, size: 24 }, textX: 56, title: { top: 14, size: 17, lineHeight: 26 }, text: { top: 44, size: 14, lineHeight: 22, maxLines: 2 } } as const

/** A cell read as a figure and the unit written after it, or `null`. */
function figureOf(cell: unknown): { n: number; text: string } | null {
  const text = String(cell ?? "").trim()
  const m = /^(\d+(?:\.\d+)?)\s*(%|％)?$/u.exec(text)
  return m ? { n: Number(m[1]), text } : null
}

interface Pair {
  name: string
  tag: DataTable["rows"][number]["tag"]
  marked: boolean
  drug: { n: number; text: string }[]
  control: { n: number; text: string }[]
}

function pairsOf(t: DataTable): { pairs: Pair[]; controlName: string } | null {
  if (t.source?.trim() || t.columns.length < 2 || t.columns.length > 5 || t.rows.length % 2 !== 0) return null
  const n = t.rows.length / 2
  if (n < 2 || n > 4) return null
  const [kName, ...kMeasures] = t.columns.map((c) => c.key)
  const pairs: Pair[] = []
  let controlName: string | null = null
  for (let i = 0; i < n; i++) {
    const drug = t.rows[2 * i]!
    const control = t.rows[2 * i + 1]!
    if (drug.icon || drug.emphasis === "total" || control.tag || control.icon || control.emphasis) return null
    const cName = String(control.cells[kName!] ?? "").trim()
    if (!cName || (controlName !== null && cName !== controlName)) return null
    controlName = cName
    const drugFigures = kMeasures.map((k) => figureOf(drug.cells[k]))
    const controlFigures = kMeasures.map((k) => figureOf(control.cells[k]))
    if (drugFigures.some((f) => !f) || controlFigures.some((f) => !f)) return null
    pairs.push({ name: String(drug.cells[kName!] ?? "").trim(), tag: drug.tag, marked: drug.emphasis === "highlight", drug: drugFigures as Pair["drug"], control: controlFigures as Pair["control"] })
  }
  if (pairs.some((p) => p.name === controlName)) return null
  return { pairs, controlName: controlName! }
}

export const multiplesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [table, cards, ...rest] = components
  if (table?.type !== "data_table" || rest.length > 0) return null
  if (cards !== undefined && cards.type !== "row_cards") return null
  const t = table as DataTable
  const shape = pairsOf(t)
  if (!shape) return null
  const { pairs, controlName } = shape
  if (ROWS.top + pairs.length * ROWS.pitch > rect.h) return null
  const inks = dossierInks(ctx)
  const series = dossierSeries(ctx)
  const tickInk = series[2] ?? series[series.length - 1]!
  const measures = t.columns.slice(1)
  const step = (LEFT_W - NAME_COL) / measures.length
  const cellW = step - CELL.trail
  const scales = measures.map((_, j) => {
    const max = Math.max(...pairs.flatMap((p) => [p.drug[j]!.n, p.control[j]!.n]))
    return max > 0 ? (cellW - 8) / max : 0
  })
  if (scales.some((s) => s <= 0)) return null
  for (const p of pairs) {
    if (dossierWidth(p.name, NAME.size, ctx, true) > NAME_COL - ROWS.inset - 8) return null
    if (p.tag && chipWidth(p.tag.text, ctx) > NAME_COL - ROWS.inset - 8) return null
    for (let j = 0; j < measures.length; j++) {
      // The control's figure stands at the cell's right on the drug's line, or under the bar when the two do not fit side by side.
      if (dossierWidth(p.drug[j]!.text, CELL.value.size, ctx, true) > cellW) return null
      if (dossierWidth(`${controlName} ${p.control[j]!.text}`, CELL.control.size, ctx) > cellW) return null
    }
  }
  if (measures.some((m) => dossierWidth(m.label, HEAD.size, ctx, true) > step - 4)) return null
  const drawnCards = cards ? fitCards(cards as RowCards, rect.w - CARDS.x, rect.h, ctx) : null
  if (cards && !drawnCards) return null
  const beside = (drugText: string, controlText: string) =>
    dossierWidth(drugText, CELL.value.size, ctx, true) + 8 + dossierWidth(controlText, CELL.control.size, ctx) <= cellW
  const legendLead = t.title?.trim() ?? ""
  const drugName = t.columns[0]!.label.trim()

  return (
    <g {...compositionTag("multiples")}>
      <g {...blockTag(ctx, t)}>
        {paintLegend({ lead: legendLead, drug: drugName, control: controlName }, rect.x, rect.y, inks, tickInk, ctx)}
        {measures.map((m, j) => paintDossierLine(m.label, { ctx, key: `h${j}`, x: rect.x + NAME_COL + j * step, top: rect.y + HEAD.top, lineHeight: HEAD.lineHeight, size: HEAD.size, bold: true, fill: dossierText(inks.ink, inks.ground, HEAD.size) }))}
        <rect x={rect.x} y={rect.y + HEAD.rule} width={LEFT_W} height={2} fill={inks.ink} />
        {pairs.map((p, i) => {
          const y = rect.y + ROWS.top + i * ROWS.pitch
          const ground = p.marked ? inks.tint : inks.ground
          return (
            <g key={i} data-dossier-multiple={p.marked ? "marked" : ""}>
              {p.marked ? <rect x={rect.x} y={y} width={LEFT_W} height={ROWS.pitch} fill={inks.tint} /> : null}
              <rect x={rect.x} y={y + ROWS.pitch - 1} width={LEFT_W} height={1} fill={inks.line} />
              {paintDossierLine(p.name, { ctx, x: rect.x + ROWS.inset, top: y + NAME.top, lineHeight: NAME.lineHeight, size: NAME.size, bold: true, fill: dossierText(inks.ink, ground, NAME.size) })}
              {p.tag ? paintChip({ ctx, text: p.tag.text, ink: chipInk(p.tag, ctx, inks), x: rect.x + ROWS.inset, y: y + CHIP_TOP, ground }) : null}
              {measures.map((_, j) => {
                const x = rect.x + NAME_COL + j * step
                const sc = scales[j]!
                const drug = p.drug[j]!
                const control = p.control[j]!
                return (
                  <g key={j}>
                    <rect data-dossier-bar="drug" x={x} y={y + CELL.bar.top} width={drug.n * sc} height={CELL.bar.h} rx={CELL.bar.r} fill={inks.mark} />
                    <rect data-dossier-bar="control-tick" x={x + control.n * sc - CELL.tick.w / 2} y={y + CELL.tick.top} width={CELL.tick.w} height={CELL.tick.h} fill={tickInk} />
                    {paintDossierLine(drug.text, { ctx, x, top: 0, lineHeight: 0, baseline: y + CELL.value.baseline, size: CELL.value.size, bold: true, fill: dossierText(inks.mark, ground, CELL.value.size) })}
                    {beside(drug.text, `${controlName} ${control.text}`)
                      ? paintDossierLine(`${controlName} ${control.text}`, { ctx, x: x + cellW, top: 0, lineHeight: 0, baseline: y + CELL.value.baseline, size: CELL.control.size, anchor: "end", fill: dossierMeta(inks.muted, ground) })
                      : paintDossierLine(`${controlName} ${control.text}`, { ctx, x, top: 0, lineHeight: 0, baseline: y + CELL.control.under, size: CELL.control.size, fill: dossierMeta(inks.muted, ground) })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {cards && drawnCards ? (
        <g {...blockTag(ctx, cards)} data-dossier-risks="">
          {drawnCards.map((c, i) => {
            const x = rect.x + CARDS.x
            const y = rect.y + CARDS.top + i * CARDS.pitch
            const w = rect.w - CARDS.x
            return (
              <g key={i}>
                {paintDossierCard({ x, y, w, h: CARDS.h }, inks)}
                {c.item.icon ? paintDossierIcon(c.item.icon, x + CARDS.icon.x, y + CARDS.icon.top, CARDS.icon.size, dossierTone(inks, c.item.tone) ?? inks.mark, inks.paper) : null}
                {paintDossier(c.title, { ctx, x: x + CARDS.textX, top: y + CARDS.title.top, bold: true, fill: dossierText(inks.ink, inks.paper, CARDS.title.size), ground: inks.paper })}
                {c.text ? paintDossier(c.text, { ctx, x: x + CARDS.textX, top: y + CARDS.text.top, fill: dossierText(inks.muted, inks.paper, CARDS.text.size), ground: inks.paper }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
    </g>
  )
}

function fitCards(cards: RowCards, w: number, h: number, ctx: ComponentCtx) {
  const items = cards.items
  if (items.length < 3 || items.length > 5 || items.some((item) => !item.icon || item.sub?.trim() || item.highlight)) return null
  if (CARDS.top + (items.length - 1) * CARDS.pitch + CARDS.h > h) return null
  const textW = w - CARDS.textX - 16
  const fitted = items.map((item) => ({
    item,
    title: fitDossier(item.title, { width: textW, size: CARDS.title.size, lineHeight: CARDS.title.lineHeight, maxLines: 1, bold: true }, ctx),
    text: item.text?.trim() ? fitDossier(item.text, { width: textW, size: CARDS.text.size, lineHeight: CARDS.text.lineHeight, maxLines: CARDS.text.maxLines }, ctx) : null,
  }))
  if (fitted.some((f) => !f.title || (f.item.text?.trim() && !f.text))) return null
  return fitted.map((f) => ({ item: f.item, title: f.title!, text: f.text }))
}

/** The legend over the multiples: the table's title, a solid swatch for the drugs, a tick for their controls. */
function paintLegend(legend: { lead: string; drug: string; control: string }, x: number, top: number, inks: DossierInks, tickInk: string, ctx: ComponentCtx): React.ReactElement {
  const meta = dossierMeta(inks.muted, inks.ground)
  const swatchTop = top + (LEGEND.lineHeight - LEGEND.swatch) / 2
  let at = x
  const parts: React.ReactNode[] = []
  if (legend.lead) {
    parts.push(paintDossierLine(legend.lead, { ctx, key: "l", x: at, top, lineHeight: LEGEND.lineHeight, size: LEGEND.size, fill: meta }))
    at += dossierWidth(legend.lead, LEGEND.size, ctx) + LEGEND.step
  }
  if (legend.drug) {
    parts.push(<rect key="ds" x={at} y={swatchTop} width={LEGEND.swatch} height={LEGEND.swatch} fill={inks.mark} />)
    at += LEGEND.swatch + LEGEND.gap
    parts.push(paintDossierLine(legend.drug, { ctx, key: "d", x: at, top, lineHeight: LEGEND.lineHeight, size: LEGEND.size, fill: meta }))
    at += dossierWidth(legend.drug, LEGEND.size, ctx) + LEGEND.step
  }
  parts.push(<rect key="cs" x={at + LEGEND.swatch / 2 - 1} y={swatchTop - 2} width={2} height={LEGEND.swatch + 4} fill={tickInk} />)
  at += LEGEND.swatch + LEGEND.gap
  parts.push(paintDossierLine(legend.control, { ctx, key: "c", x: at, top, lineHeight: LEGEND.lineHeight, size: LEGEND.size, fill: meta }))
  return <g data-dossier-legend="">{parts}</g>
}
