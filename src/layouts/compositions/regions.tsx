import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderBaseline, binderInks, binderText, binderWidth, fitBinder, paintBinder, paintBinderLine, splitAside, wholeMark } from "./binder"
import { BinderPlainLine, fitPlainLine, noteHeight } from "./binder-bars"
import type { Recipe } from "./recipe"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * regions: places set side by side, proposal's 2026-10 print board (p05). A
 * column a place, the columns under a hairline and parted by hairlines: its
 * name at 24px in petrol, the line under it (the comparison's first row,
 * when it has no label), a hairline, then each labelled row as its label in
 * small grey over its value at 16px bold, the row the page is about
 * (`emphasis`) as its label over a figure at 36px in petrol, a trailing
 * aside in brackets on that figure set after it in small grey
 * (「约 0.76（示意）」); last, the comparison's closing row with no label as
 * a verdict a column, bold in petrol, the one marked whole (`**…**`) in the
 * brick red. Under the columns, the note as a line after its grey icon, its
 * title bold before its text.
 *
 * Takes, in the binder setting: a `comparison` of two to four columns with
 * no title, label column, tags, icons or recommendation: optionally a first
 * row with no label, then one to three labelled rows, exactly one marked,
 * then optionally a last row with no label, at most one cell of which is
 * marked whole; then optionally a `callout` with a title and no tag.
 *
 * Declines: a name past one line, a line, label or value past its column, a
 * verdict past one line, and a note past two lines.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const COL = { top: 4, pad: 28, name: { top: 18, size: 24, lineHeight: 32 }, sub: { top: 52, size: 12, lineHeight: 20 }, rule: 86, first: 100, row: { label: 18, value: 24, step: 60 }, label: { size: 12, lineHeight: 18 }, value: { size: 16, lineHeight: 24 }, figure: { size: 36, lineHeight: 46, step: 78 }, aside: { gap: 10, size: 13 }, verdict: { size: 14, lineHeight: 22 }, bottom: 18 } as const
const NOTE_GAP = 28

/** What an author writes to get this drawing (`./recipe.ts`). */
export const regionsRecipe: Recipe = {
  look: "Places set side by side",
  kinds: ["comparison"],
  shapes: [{ parts: [{ type: "comparison", count: [1, 4], needs: ["rows[].emphasis"] }, { type: "callout", needs: ["title"], optional: true }] }],
}

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
  const w = rect.w / n
  const inner = (i: number) => w - (i === 0 ? 0 : COL.pad) - (i === n - 1 ? 0 : COL.pad)

  const cols = c.columns.map((name, i) => {
    const title = fitBinder(name, { width: inner(i), size: COL.name.size, lineHeight: COL.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const line = sub ? fitBinder(sub.cells[i] ?? "", { width: inner(i), size: COL.sub.size, lineHeight: COL.sub.lineHeight, maxLines: 1 }, ctx) : null
    if (!title || (sub && !line)) return null
    const fields = rows.map((r) => {
      const label = fitBinder(r.label, { width: inner(i), size: COL.label.size, lineHeight: COL.label.lineHeight, maxLines: 1, bold: true }, ctx)
      const raw = (r.cells[i] ?? "").trim()
      if (!label) return null
      if (!r.emphasis) {
        const value = fitBinder(raw, { width: inner(i), size: COL.value.size, lineHeight: COL.value.lineHeight, maxLines: 1, bold: true }, ctx)
        return value ? { label, value, figure: false as const } : null
      }
      const aside = splitAside(raw)
      const main = aside ? aside.main : raw
      const figure = fitBinder(main, { width: inner(i), size: COL.figure.size, lineHeight: COL.figure.lineHeight, maxLines: 1, bold: true }, ctx)
      if (!figure) return null
      const figureW = binderWidth(main, COL.figure.size, ctx, true)
      const asideText = aside ? `${aside.open}${aside.aside}${aside.close}` : ""
      if (aside && figureW + COL.aside.gap + binderWidth(asideText, COL.aside.size, ctx) > inner(i)) return null
      return { label, figure: true as const, value: figure, asideText, figureW }
    })
    if (fields.some((f) => !f)) return null
    const raw = verdicts?.cells[i]?.trim() ?? ""
    const verdict = raw ? fitBinder(stripEmphasis(raw), { width: inner(i), size: COL.verdict.size, lineHeight: COL.verdict.lineHeight, maxLines: 1, bold: true }, ctx) : null
    if (raw && !verdict) return null
    return { title, line, fields: fields.map((f) => f!), verdict, lit: wholeMark(raw) }
  })
  if (cols.some((col) => !col)) return null

  const fieldsH = rows.reduce((h, r) => h + (r.emphasis ? COL.figure.step : COL.row.step), 0)
  const colH = COL.first + fieldsH + (verdicts ? COL.verdict.lineHeight : 0) + COL.bottom
  const noteText = callout ? fitPlainLine(callout, rect.w, ctx, 2) : null
  if (callout && !noteText) return null
  const noteTop = rect.y + COL.top + colH + NOTE_GAP
  if (COL.top + colH + (noteText ? NOTE_GAP + noteHeight(noteText) : 0) > rect.h) return null

  return (
    <g {...compositionTag("regions")}>
      <g {...blockTag(ctx, c)}>
        <rect x={rect.x} y={rect.y + COL.top} width={rect.w} height={1} fill={inks.line} />
        {cols.map((col, i) => {
          const { title, line, fields, verdict, lit } = col!
          const x = rect.x + i * w
          const y = rect.y + COL.top
          const tx = x + (i === 0 ? 0 : COL.pad)
          let cursor = y + COL.first
          return (
            <g key={i} data-binder-region={stripEmphasis(c.columns[i]!)}>
              {i > 0 ? <rect x={x} y={y} width={1} height={colH} fill={inks.line} /> : null}
              {paintBinder(title, { ctx, x: tx, top: y + COL.name.top, bold: true, fill: binderText(inks.deep, inks.ground, COL.name.size) })}
              {line ? paintBinder(line, { ctx, x: tx, top: y + COL.sub.top, fill: binderText(inks.muted, inks.ground, COL.sub.size) }) : null}
              <rect x={tx} y={y + COL.rule} width={inner(i)} height={1} fill={inks.line} />
              {fields.map((f, k) => {
                const top = cursor
                cursor += f.figure ? COL.figure.step : COL.row.step
                return (
                  <g key={k}>
                    {paintBinder(f.label, { ctx, x: tx, top, bold: true, fill: binderText(inks.muted, inks.ground, COL.label.size) })}
                    {f.figure ? (
                      <>
                        {paintBinder(f.value, { ctx, x: tx, top: top + COL.row.label, bold: true, fill: binderText(inks.deep, inks.ground, COL.figure.size) })}
                        {f.asideText ? (
                          <g data-binder-aside="">
                            {paintBinderLine(f.asideText, {
                              ctx,
                              x: tx + f.figureW + COL.aside.gap,
                              baseline: binderBaseline(top + COL.row.label, COL.figure.lineHeight, COL.figure.size),
                              size: COL.aside.size,
                              fill: binderText(inks.muted, inks.ground, COL.aside.size),
                            })}
                          </g>
                        ) : null}
                      </>
                    ) : (
                      paintBinder(f.value, { ctx, x: tx, top: top + COL.row.label, bold: true, fill: binderText(inks.ink, inks.ground, COL.value.size) })
                    )}
                  </g>
                )
              })}
              {verdict ? (
                lit ? (
                  <Lead id="verdict">{paintBinder(verdict, { ctx, x: tx, top: cursor, bold: true, fill: binderText(inks.fireText, inks.ground, COL.verdict.size) })}</Lead>
                ) : (
                  paintBinder(verdict, { ctx, x: tx, top: cursor, bold: true, fill: binderText(inks.deep, inks.ground, COL.verdict.size) })
                )
              ) : null}
            </g>
          )
        })}
      </g>
      {callout && noteText ? <BinderPlainLine callout={callout} text={noteText} x={rect.x} y={noteTop} ctx={ctx} /> : null}
    </g>
  )
}
