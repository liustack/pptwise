import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, fitBinder, glossBreak, paintBinder, splitDot, wholeMark } from "./binder"
import { BinderPlainLine, fitPlainLine, noteHeight } from "./binder-bars"
import type { Recipe } from "./recipe"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * plans: the ways a client can pay, side by side, proposal's 2026-10 print
 * board (p12). A column a way, the columns under a hairline and parted by
 * hairlines: its name at 21px in petrol, who it suits under it in small grey
 * (the comparison's first row, with no label), and where that line ends on a
 * part marked whole after a " · " (「适合：不想占用资金 · **贵司出资 0 元**」),
 * that part under it in the brick red, bold; then the
 * marked row's label in small grey over its figure at 34px in petrol (28px
 * for a figure of nine characters or more), the part of the figure's cell
 * after a " · " as a line under it (「约 44.0 万元 · 节省全部归贵司」); then each
 * labelled row under a hairline as its label in small grey over its value at
 * 14px bold. Under the columns, the note as up to two lines after its grey
 * icon. The " · " is declared on the line it ends
 * (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: a `comparison` of two to four columns with
 * no title, label column, tags, icons or recommendation, its rows in this
 * order: optionally a row with no label (who each suits), the marked row
 * (the figures), then one to three labelled rows; then optionally a
 * `callout` with no title or tag.
 *
 * Declines: a name past one line, any line past its column, a figure wider
 * than its column, and a note past two lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CARD = { top: 4, pad: 24, name: { top: 16, size: 21, lineHeight: 30 }, fit: { top: 48, size: 13, lineHeight: 20 }, chip: { top: 74, size: 14, lineHeight: 24 }, figureLabel: { top: 116, size: 12, lineHeight: 18 }, figure: { top: 136, size: 34, small: 28, lineHeight: 46, long: 9 }, figureNote: { top: 184, size: 12, lineHeight: 20 }, rows: { top: 218, step: 46, label: { dy: 6, size: 12, lineHeight: 18 }, value: { dy: 24, size: 14, lineHeight: 20 } }, bottom: 4 } as const
const NOTE_GAP = 28

/** What an author writes to get this drawing (`./recipe.ts`). */
export const plansRecipe: Recipe = {
  look: "The ways a client can pay, side by side",
  kinds: ["comparison"],
  shapes: [{ parts: [{ type: "comparison", count: [3, 5], needs: ["rows[].emphasis"] }, { type: "callout", optional: true }] }],
}

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
  const w = rect.w / n
  const innerOf = (i: number) => w - (i === 0 ? 0 : CARD.pad) - (i === n - 1 ? 0 : CARD.pad)

  const cards = c.columns.map((name, i) => {
    const inner = innerOf(i)
    const one = (text: string, spec: { size: number; lineHeight: number }, bold = false) => fitBinder(text, { width: inner, size: spec.size, lineHeight: spec.lineHeight, maxLines: 1, bold }, ctx)
    const title = one(name, CARD.name, true)
    const { line, chip } = fits[i]!
    const fit = line ? one(line, CARD.fit) : null
    const label = one(c.rows[marked]!.label, CARD.figureLabel, true)
    const cell = (c.rows[marked]!.cells[i] ?? "").trim()
    const parts = splitDot(cell)
    const raw = stripEmphasis(parts ? parts.name : cell).trim()
    const size = Array.from(raw).length >= CARD.figure.long ? CARD.figure.small : CARD.figure.size
    const figure = fitBinder(raw, { width: inner, size, lineHeight: CARD.figure.lineHeight, maxLines: 1, bold: true }, ctx)
    const figureNote = parts ? one(parts.rest, CARD.figureNote) : null
    const rows = fields.map((r) => ({ label: one(r.label, CARD.rows.label, true), value: one(r.cells[i] ?? "", CARD.rows.value, true) }))
    if (!title || (line && !fit) || !label || !figure || (parts && !figureNote) || rows.some((r) => !r.label || !r.value)) return null
    const chipLine = chip ? one(stripEmphasis(chip), CARD.chip, true) : null
    if (chip && !chipLine) return null
    return { title, fit, chip: chipLine, label, figure, figureNote, rows, fitSep: chip ? " · " : "", figureSep: parts ? " · " : "" }
  })
  if (cards.some((card) => !card)) return null
  const cardH = CARD.rows.top + fields.length * CARD.rows.step + CARD.bottom
  const bar = callout ? fitPlainLine(callout, rect.w, ctx, 2) : null
  if (callout && !bar) return null
  if (CARD.top + cardH + (bar ? NOTE_GAP + noteHeight(bar) : 0) > rect.h) return null

  return (
    <g {...compositionTag("plans")}>
      <g {...blockTag(ctx, c)}>
        <rect x={rect.x} y={rect.y + CARD.top} width={rect.w} height={1} fill={inks.line} />
        {cards.map((card, i) => {
          const { title, fit, chip, label, figure, figureNote, rows, fitSep, figureSep } = card!
          const x = rect.x + i * w
          const y = rect.y + CARD.top
          const tx = x + (i === 0 ? 0 : CARD.pad)
          const inner = innerOf(i)
          return (
            <g key={i} data-binder-plan={stripEmphasis(c.columns[i]!)}>
              {i > 0 ? <rect x={x} y={y} width={1} height={cardH} fill={inks.line} /> : null}
              {paintBinder(title, { ctx, x: tx, top: y + CARD.name.top, bold: true, fill: binderText(inks.deep, inks.ground, CARD.name.size) })}
              {fit ? paintBinder(fit, { ctx, x: tx, top: y + CARD.fit.top, fill: binderText(inks.muted, inks.ground, CARD.fit.size), ground: inks.ground, lastAttrs: glossBreak(fitSep) }) : null}
              {chip ? (
                <Lead id="plan">
                  <g data-binder-plan-lead="">{paintBinder(chip, { ctx, x: tx, top: y + CARD.chip.top, bold: true, fill: binderText(inks.fireText, inks.ground, CARD.chip.size) })}</g>
                </Lead>
              ) : null}
              {paintBinder(label, { ctx, x: tx, top: y + CARD.figureLabel.top, bold: true, fill: binderText(inks.muted, inks.ground, CARD.figureLabel.size) })}
              {paintBinder(figure, { ctx, x: tx, top: y + CARD.figure.top, bold: true, fill: binderText(inks.deep, inks.ground, figure.fontSize), ground: inks.ground, lastAttrs: glossBreak(figureSep) })}
              {figureNote ? paintBinder(figureNote, { ctx, x: tx, top: y + CARD.figureNote.top, fill: binderText(inks.muted, inks.ground, CARD.figureNote.size) }) : null}
              {rows.map((r, j) => {
                const top = y + CARD.rows.top + j * CARD.rows.step
                return (
                  <g key={j}>
                    <rect x={tx} y={top} width={inner} height={1} fill={inks.line} />
                    {paintBinder(r.label!, { ctx, x: tx, top: top + CARD.rows.label.dy, bold: true, fill: binderText(inks.muted, inks.ground, CARD.rows.label.size) })}
                    {paintBinder(r.value!, { ctx, x: tx, top: top + CARD.rows.value.dy, bold: true, fill: binderText(inks.ink, inks.ground, CARD.rows.value.size) })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {callout && bar ? <BinderPlainLine callout={callout} text={bar} x={rect.x} y={rect.y + CARD.top + cardH + NOTE_GAP} ctx={ctx} /> : null}
    </g>
  )
}
