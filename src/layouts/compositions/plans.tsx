import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderCard, paintChip, splitDot, wholeMark } from "./binder"
import { BinderBar, fitBinderBar, type BarSpec } from "./binder-bars"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * plans: the ways a client can pay, as cards, proposal's 2026-10 board
 * (p12). A card a column: its name at 21px in petrol, who it suits under it
 * in small grey (the comparison's first row, with no label), and where that
 * line ends on a part marked whole after a " · " (「适合：不想占用资金 ·
 * **贵司出资 0 元**」), that part as a chip of the tangerine under it; then the
 * marked row's label in small grey over its figure at 34px in petrol (28px
 * for a figure of nine characters or more), the part of the figure's cell
 * after a " · " as a line under it (「约 44.0 万元 · 节省全部归贵司」); then each
 * labelled row under a hairline as its label in small grey over its value at
 * 14px bold. Under the cards, a bar of the pale petrol with the note's icon
 * and two lines. The " · " is declared on the line it ends
 * (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: a `comparison` of two to four columns with
 * no title, label column, tags, icons or recommendation, its rows in this
 * order: optionally a row with no label (who each suits), the marked row
 * (the figures), then one to three labelled rows; then optionally a
 * `callout` with no title or tag.
 *
 * Declines: a name past one line, any line past its card, a figure wider
 * than its card, and a note past two lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CARD = { top: 4, gap: 14, pad: 24, name: { top: 16, size: 21, lineHeight: 30 }, fit: { top: 48, size: 13, lineHeight: 20 }, chip: { top: 76, h: 28, size: 13 }, figureLabel: { top: 116, size: 12, lineHeight: 18 }, figure: { top: 136, size: 34, small: 28, lineHeight: 46, long: 9 }, figureNote: { top: 184, size: 12, lineHeight: 20 }, rows: { top: 218, step: 46, label: { dy: 6, size: 12, lineHeight: 18 }, value: { dy: 24, size: 14, lineHeight: 20 } }, bottom: 4 } as const
const NOTE: BarSpec = { fill: "pale", h: 64, size: 14, lineHeight: 22, maxLines: 2, padTop: 10, padLeft: 58, icon: { x: 18, y: 20, size: 24 } }
const NOTE_GAP = 16

export const plansComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, note, ...rest] = components
  if (table?.type !== "comparison" || rest.length > 0 || (note && note.type !== "callout")) return null
  const c = table as Comparison
  const n = c.columns.length
  if (n < 2 || n > 4 || c.title || c.label_column || c.tag_column || c.recommended !== undefined) return null
  if (c.rows.some((r) => r.tag || r.icon)) return null
  const marked = c.rows.findIndex((r) => r.emphasis)
  if (marked < 0 || marked > 1 || !c.rows[marked]!.label.trim()) return null
  const fitRow = marked === 1 ? c.rows[0]! : undefined
  if (fitRow?.label.trim()) return null
  const fields = c.rows.slice(marked + 1)
  if (fields.length < 1 || fields.length > 3 || fields.some((r) => !r.label.trim())) return null
  // A suit line's marked part after its " · " is the card's chip, at most one on the page.
  const fits = c.columns.map((_, i) => {
    const cell = fitRow?.cells[i]?.trim() ?? ""
    const split = splitDot(cell)
    return split && wholeMark(split.rest) ? { line: split.name, chip: split.rest } : { line: cell, chip: "" }
  })
  if (fits.filter((f) => f.chip).length > 1) return null
  const callout = note as Callout | undefined
  const inks = binderInks(ctx)
  const w = (rect.w - CARD.gap * (n - 1)) / n
  const inner = w - CARD.pad * 2
  const one = (text: string, spec: { size: number; lineHeight: number }, bold = false) => fitBinder(text, { width: inner, size: spec.size, lineHeight: spec.lineHeight, maxLines: 1, bold }, ctx)

  const cards = c.columns.map((name, i) => {
    const title = one(name, CARD.name, true)
    const { line, chip } = fits[i]!
    const fit = line ? one(line, CARD.fit) : null
    const label = one(c.rows[marked]!.label, CARD.figureLabel, true)
    const cell = (c.rows[marked]!.cells[i] ?? "").trim()
    const parts = splitDot(cell)
    const raw = stripEmphasis(parts ? parts.name : cell).trim()
    const size = Array.from(raw).length >= CARD.figure.long ? CARD.figure.small : CARD.figure.size
    const figure = fitBinder(raw, { width: inner + 10, size, lineHeight: CARD.figure.lineHeight, maxLines: 1, bold: true }, ctx)
    const figureNote = parts ? one(parts.rest, CARD.figureNote) : null
    const rows = fields.map((r) => ({ label: one(r.label, CARD.rows.label, true), value: one(r.cells[i] ?? "", CARD.rows.value, true) }))
    if (!title || (line && !fit) || !label || !figure || (parts && !figureNote) || rows.some((r) => !r.label || !r.value)) return null
    if (chip && binderWidth(stripEmphasis(chip), CARD.chip.size, ctx, true) + 22 > inner) return null
    return { title, fit, chip, label, figure, figureNote, rows, fitSep: chip ? " · " : "", figureSep: parts ? " · " : "" }
  })
  if (cards.some((card) => !card)) return null
  const cardH = CARD.rows.top + fields.length * CARD.rows.step + CARD.bottom
  const bar = callout ? fitBinderBar(callout, rect.w, ctx, NOTE) : null
  if (callout && !bar) return null
  if (CARD.top + cardH + (callout ? NOTE_GAP + NOTE.h : 0) > rect.h) return null

  return (
    <g {...compositionTag("plans")}>
      <g {...blockTag(ctx, c)}>
        {cards.map((card, i) => {
          const { title, fit, chip, label, figure, figureNote, rows, fitSep, figureSep } = card!
          const x = rect.x + i * (w + CARD.gap)
          const y = rect.y + CARD.top
          const tx = x + CARD.pad
          return (
            <g key={i} data-binder-plan={stripEmphasis(c.columns[i]!)}>
              {paintBinderCard({ x, y, w, h: cardH }, inks)}
              {paintBinder(title, { ctx, x: tx, top: y + CARD.name.top, bold: true, fill: binderText(inks.deep, inks.card, CARD.name.size), ground: inks.card })}
              {fit ? paintBinder(fit, { ctx, x: tx, top: y + CARD.fit.top, fill: binderText(inks.muted, inks.card, CARD.fit.size), ground: inks.card, lastAttrs: glossBreak(fitSep) }) : null}
              {chip ? <Lead id="plan">{paintChip(chip, tx, y + CARD.chip.top, { size: CARD.chip.size, h: CARD.chip.h, fg: inks.onFire, bg: inks.fire }, ctx, inks).node}</Lead> : null}
              {paintBinder(label, { ctx, x: tx, top: y + CARD.figureLabel.top, bold: true, fill: binderText(inks.muted, inks.card, CARD.figureLabel.size), ground: inks.card })}
              {paintBinder(figure, { ctx, x: tx, top: y + CARD.figure.top, bold: true, fill: binderText(inks.deep, inks.card, figure.fontSize), ground: inks.card, lastAttrs: glossBreak(figureSep) })}
              {figureNote ? paintBinder(figureNote, { ctx, x: tx, top: y + CARD.figureNote.top, fill: binderText(inks.muted, inks.card, CARD.figureNote.size), ground: inks.card }) : null}
              {rows.map((r, j) => {
                const top = y + CARD.rows.top + j * CARD.rows.step
                return (
                  <g key={j}>
                    <rect x={tx} y={top} width={inner} height={1} fill={inks.line} />
                    {paintBinder(r.label!, { ctx, x: tx, top: top + CARD.rows.label.dy, bold: true, fill: binderText(inks.muted, inks.card, CARD.rows.label.size), ground: inks.card })}
                    {paintBinder(r.value!, { ctx, x: tx, top: top + CARD.rows.value.dy, bold: true, fill: binderText(inks.ink, inks.card, CARD.rows.value.size), ground: inks.card })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {callout && bar ? <BinderBar callout={callout} fitted={bar} x={rect.x} y={rect.y + CARD.top + cardH + NOTE_GAP} w={rect.w} ctx={ctx} spec={NOTE} /> : null}
    </g>
  )
}
