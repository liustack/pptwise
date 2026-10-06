import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, paintBinder, paintBinderCard, paintBinderIcon, paintChip, splitAside, wholeMark } from "./binder"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * regions: places set side by side as cards, proposal's 2026-10 board (p05).
 * A card a column: its name at 24px in petrol, the line under it (the
 * comparison's first row, when it has no label), a hairline, then each
 * labelled row as its label in small grey over its value at 16px bold, the
 * row the page is about (`emphasis`) as its label over a figure at 36px in
 * petrol, a trailing aside in brackets on that figure set beside it as a grey
 * chip (「约 0.76（示意）」); last, the comparison's closing row with no label
 * as a verdict chip a card, sky on paper, the one marked whole (`**…**`) in
 * the tangerine. Under the cards, the note as a block of petrol with its
 * icon, its title bold and its text in the paper's white.
 *
 * Takes, in the binder setting: a `comparison` of two to four columns with
 * no title, label column, tags, icons or recommendation: optionally a first
 * row with no label, then one to three labelled rows, exactly one marked,
 * then optionally a last row with no label, at most one cell of which is
 * marked whole; then optionally a `callout` with a title and no tag.
 *
 * Declines: a name past one line, a line, label or value past its card, a
 * verdict wider than its card, and a note past two lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CARD = { top: 4, gap: 14, pad: 28, name: { top: 20, size: 24, lineHeight: 32 }, sub: { top: 54, size: 12, lineHeight: 20 }, rule: 90, first: 104, row: { label: 18, value: 24, step: 60 }, label: { size: 12, lineHeight: 18 }, value: { size: 16, lineHeight: 24 }, figure: { size: 36, lineHeight: 46, step: 78 }, aside: { gap: 14, dy: 12, h: 24, size: 12 }, verdict: { h: 30, size: 14 }, bottom: 16 } as const
const NOTE = { gap: 20, pad: 28, icon: { y: 22, size: 24 }, textX: 66, title: { top: 18, size: 19, lineHeight: 30 }, text: { top: 54, size: 15, lineHeight: 25, maxLines: 2 }, bottom: 16, onDeep: 0.86 } as const

export const regionsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [table, note, ...rest] = components
  if (table?.type !== "comparison" || rest.length > 0 || (note && note.type !== "callout")) return null
  const c = table as Comparison
  const n = c.columns.length
  if (n < 2 || n > 4 || c.title || c.label_column || c.tag_column || c.recommended !== undefined) return null
  if (c.rows.some((r) => r.tag || r.icon)) return null
  const rows = [...c.rows]
  const sub = rows[0] && !rows[0].label.trim() ? rows.shift()! : undefined
  const verdicts = rows.length > 0 && !rows[rows.length - 1]!.label.trim() ? rows.pop()! : undefined
  if (rows.length < 1 || rows.length > 3 || rows.some((r) => !r.label.trim()) || rows.filter((r) => r.emphasis).length !== 1) return null
  if (verdicts && (verdicts.cells.filter((cell) => wholeMark(cell)).length > 1 || verdicts.cells.some((cell) => cell.includes("**") && !wholeMark(cell)))) return null
  const callout = note as Callout | undefined
  if (callout && (!callout.title?.trim() || callout.tag)) return null
  const inks = binderInks(ctx)
  const w = (rect.w - CARD.gap * (n - 1)) / n
  const inner = w - CARD.pad * 2

  const cards = c.columns.map((name, i) => {
    const title = fitBinder(name, { width: inner, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const line = sub ? fitBinder(sub.cells[i] ?? "", { width: inner, size: CARD.sub.size, lineHeight: CARD.sub.lineHeight, maxLines: 1 }, ctx) : null
    if (!title || (sub && !line)) return null
    const fields = rows.map((r) => {
      const label = fitBinder(r.label, { width: inner, size: CARD.label.size, lineHeight: CARD.label.lineHeight, maxLines: 1, bold: true }, ctx)
      const raw = (r.cells[i] ?? "").trim()
      if (!label) return null
      if (!r.emphasis) {
        const value = fitBinder(raw, { width: inner, size: CARD.value.size, lineHeight: CARD.value.lineHeight, maxLines: 1, bold: true }, ctx)
        return value ? { label, value, figure: false as const } : null
      }
      const aside = splitAside(raw)
      const main = aside ? aside.main : raw
      const figure = fitBinder(main, { width: inner, size: CARD.figure.size, lineHeight: CARD.figure.lineHeight, maxLines: 1, bold: true }, ctx)
      if (!figure) return null
      const figureW = binderWidth(main, CARD.figure.size, ctx, true)
      const chipW = aside ? binderWidth(aside.aside, CARD.aside.size, ctx, true) + 22 : 0
      if (aside && figureW + CARD.aside.gap + chipW > inner) return null
      return { label, figure: true as const, value: figure, aside, figureW }
    })
    if (fields.some((f) => !f)) return null
    const verdict = verdicts?.cells[i]?.trim() ?? ""
    if (verdict && binderWidth(stripEmphasis(verdict), CARD.verdict.size, ctx, true) + 22 > inner) return null
    return { title, line, fields: fields.map((f) => f!), verdict }
  })
  if (cards.some((card) => !card)) return null

  // Every card runs as tall as the tallest.
  const fieldsH = rows.reduce((h, r) => h + (r.emphasis ? CARD.figure.step : CARD.row.step), 0)
  const verdictH = verdicts ? CARD.verdict.h : 0
  const cardH = CARD.first + fieldsH + verdictH + CARD.bottom - (verdicts ? 0 : CARD.figure.step - CARD.row.label - CARD.figure.lineHeight)
  const noteText = callout ? fitBinder(callout.text, { width: rect.w - NOTE.textX - NOTE.pad, size: NOTE.text.size, lineHeight: NOTE.text.lineHeight, maxLines: NOTE.text.maxLines }, ctx) : null
  const noteTitle = callout ? fitBinder(callout.title!, { width: rect.w - NOTE.textX - NOTE.pad, size: NOTE.title.size, lineHeight: NOTE.title.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (callout && (!noteText || !noteTitle)) return null
  const noteTop = rect.y + CARD.top + cardH + NOTE.gap
  const noteH = callout ? NOTE.text.top + NOTE.text.lineHeight * NOTE.text.maxLines + NOTE.bottom : 0
  if (CARD.top + cardH + (callout ? NOTE.gap + noteH : 0) > rect.h) return null

  return (
    <g {...compositionTag("regions")}>
      <g {...blockTag(ctx, c)}>
        {cards.map((card, i) => {
          const { title, line, fields, verdict } = card!
          const x = rect.x + i * (w + CARD.gap)
          const y = rect.y + CARD.top
          const tx = x + CARD.pad
          let cursor = y + CARD.first
          return (
            <g key={i} data-binder-region={stripEmphasis(c.columns[i]!)}>
              {paintBinderCard({ x, y, w, h: cardH }, inks)}
              {paintBinder(title, { ctx, x: tx, top: y + CARD.name.top, bold: true, fill: binderText(inks.deep, inks.card, CARD.name.size), ground: inks.card })}
              {line ? paintBinder(line, { ctx, x: tx, top: y + CARD.sub.top, fill: binderText(inks.muted, inks.card, CARD.sub.size), ground: inks.card }) : null}
              <rect x={tx} y={y + CARD.rule} width={inner} height={1} fill={inks.line} />
              {fields.map((f, k) => {
                const top = cursor
                cursor += f.figure ? CARD.figure.step : CARD.row.step
                return (
                  <g key={k}>
                    {paintBinder(f.label, { ctx, x: tx, top, bold: true, fill: binderText(inks.muted, inks.card, CARD.label.size), ground: inks.card })}
                    {f.figure ? (
                      <>
                        {paintBinder(f.value, { ctx, x: tx, top: top + CARD.row.label, bold: true, fill: binderText(inks.deep, inks.card, CARD.figure.size), ground: inks.card })}
                        {f.aside
                          ? paintChip(f.aside.aside, tx + f.figureW + CARD.aside.gap, top + CARD.row.label + CARD.aside.dy, { size: CARD.aside.size, h: CARD.aside.h, fg: inks.muted, border: inks.line }, ctx, inks, { attrs: { "data-aside-brackets": `${f.aside.open}${f.aside.close}` } }).node
                          : null}
                      </>
                    ) : (
                      paintBinder(f.value, { ctx, x: tx, top: top + CARD.row.label, bold: true, fill: binderText(inks.ink, inks.card, CARD.value.size), ground: inks.card })
                    )}
                  </g>
                )
              })}
              {verdict
                ? wholeMark(verdict)
                  ? <Lead id="verdict">{paintChip(verdict, tx, cursor, { size: CARD.verdict.size, h: CARD.verdict.h, fg: inks.onFire, bg: inks.fire }, ctx, inks).node}</Lead>
                  : paintChip(verdict, tx, cursor, { size: CARD.verdict.size, h: CARD.verdict.h, fg: inks.deep, bg: inks.skyPale }, ctx, inks).node
                : null}
            </g>
          )
        })}
      </g>
      {callout && noteText && noteTitle ? (
        <g {...blockTag(ctx, callout)} data-binder-note="">
          <rect x={rect.x} y={noteTop} width={rect.w} height={noteH} rx={12} fill={inks.deep} />
          {callout.icon ? paintBinderIcon(callout.icon, rect.x + NOTE.pad, noteTop + NOTE.icon.y, NOTE.icon.size, inks.onDeep, inks.deep) : null}
          {paintBinder(noteTitle, { ctx, x: rect.x + NOTE.textX, top: noteTop + NOTE.title.top, bold: true, fill: binderText(inks.onDeep, inks.deep, NOTE.title.size), ground: inks.deep })}
          {paintBinder(noteText, { ctx, x: rect.x + NOTE.textX, top: noteTop + NOTE.text.top, fill: binderText(blendOver(inks.onDeep, inks.deep, NOTE.onDeep), inks.deep, NOTE.text.size), ground: inks.deep })}
        </g>
      ) : null}
    </g>
  )
}
