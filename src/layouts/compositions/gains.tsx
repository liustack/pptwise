import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, fitBinder, paintBinder, paintBinderIcon, wholeMark } from "./binder"
import { stripEmphasis } from "../../render/emphasis"
import { BinderPlainLine, fitPlainLine } from "./binder-bars"
import type { Recipe } from "./recipe"

type Banner = Extract<Component, { type: "verdict_banner" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * gains: what the client gets, proposal's 2026-10 print board (p02). A line
 * naming the offer with its icon, then a column per thing the client gets,
 * the columns under a hairline and parted by hairlines: its icon, what it is
 * in two lines of 20px bold, the figure at 40px in petrol and a note in two
 * lines; the figure the page lands on (written `**…**`) in the brick red.
 * Under the columns, a line with a grey icon.
 *
 * Takes, in the binder setting: optionally a `verdict_banner` (the line over
 * the columns), a `kpi_cards` of two to four with an icon each, no unit,
 * delta, tag, tone or source, at most one value marked whole; then
 * optionally a `callout` with no tag.
 *
 * Declines: a figure wider than its column, a label or a note past two
 * lines, a banner or a line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const HEAD = { icon: { dy: 4, size: 22 }, text: { dx: 32, top: 2, size: 17, lineHeight: 26, w: 1000 } } as const
const COLS = { top: 46, pad: 28, icon: { dy: 24, size: 24 }, label: { dy: 64, size: 20, lineHeight: 31, maxLines: 2 }, value: { dy: 140, size: 40, lineHeight: 50 }, note: { dy: 198, size: 13, lineHeight: 21, maxLines: 2 }, h: 250 } as const
const LINE_GAP = 40

/** What an author writes to get this drawing (`./recipe.ts`). */
export const gainsRecipe: Recipe = {
  look: "What the client gets",
  kinds: ["points"],
  shapes: [{ parts: [{ type: "verdict_banner", optional: true }, { type: "kpi_cards", count: [2, 3], needs: ["items[*].icon"] }, { type: "callout", optional: true }] }],
}

export const gainsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  let i = 0
  const banner = components[i]?.type === "verdict_banner" ? (components[i++] as Banner) : undefined
  const kpis = components[i]?.type === "kpi_cards" ? (components[i++] as Kpis) : undefined
  const tip = components[i]?.type === "callout" ? (components[i++] as Callout) : undefined
  if (!kpis || i !== components.length) return null
  const n = kpis.items.length
  if (n < 2 || n > 4 || rect.h < COLS.top + COLS.h + (tip ? LINE_GAP + 24 : 0)) return null
  if (kpis.items.some((it) => !it.icon || it.unit || it.delta || it.tag || it.tone || it.source)) return null
  if (kpis.items.filter((it) => it.value.includes("**")).length > 1 || kpis.items.some((it) => it.value.includes("**") && !wholeMark(it.value))) return null
  const inks = binderInks(ctx)
  const w = rect.w / n
  const inner = (k: number) => w - (k === 0 ? 0 : COLS.pad) - (k === n - 1 ? 0 : COLS.pad)
  const head = banner ? fitBinder(banner.text, { width: HEAD.text.w, size: HEAD.text.size, lineHeight: HEAD.text.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (banner && !head) return null
  const cols = kpis.items.map((it, k) => {
    const value = fitBinder(stripEmphasis(it.value), { width: inner(k), size: COLS.value.size, lineHeight: COLS.value.lineHeight, maxLines: 1, bold: true }, ctx)
    const label = fitBinder(it.label, { width: inner(k), size: COLS.label.size, lineHeight: COLS.label.lineHeight, maxLines: COLS.label.maxLines, bold: true }, ctx)
    const note = it.note?.trim() ? fitBinder(it.note, { width: inner(k), size: COLS.note.size, lineHeight: COLS.note.lineHeight, maxLines: COLS.note.maxLines }, ctx) : null
    if (!value || !label || (it.note?.trim() && !note)) return null
    return { it, value, label, note, lit: wholeMark(it.value) }
  })
  if (cols.some((c) => !c)) return null
  const line = tip ? fitPlainLine(tip, rect.w, ctx) : null
  if (tip && !line) return null
  const top = rect.y + COLS.top

  return (
    <g {...compositionTag("gains")}>
      {banner && head ? (
        <g {...blockTag(ctx, banner)} data-binder-banner="">
          {banner.icon ? paintBinderIcon(banner.icon, rect.x, rect.y + HEAD.icon.dy, HEAD.icon.size, inks.deep, inks.ground) : null}
          {paintBinder(head, { ctx, x: rect.x + (banner.icon ? HEAD.text.dx : 0), top: rect.y + HEAD.text.top, bold: true, fill: binderText(inks.deep, inks.ground, HEAD.text.size) })}
        </g>
      ) : null}
      <g {...blockTag(ctx, kpis)}>
        <rect x={rect.x} y={top} width={rect.w} height={1} fill={inks.line} />
        {cols.map((c, k) => {
          const { it, value, label, note, lit } = c!
          const x = rect.x + k * w + (k === 0 ? 0 : COLS.pad)
          const figure = paintBinder(value, { ctx, x, top: top + COLS.value.dy, bold: true, fill: binderText(lit ? inks.fire : inks.deep, inks.ground, COLS.value.size) })
          return (
            <g key={k} data-binder-gain={k}>
              {k > 0 ? <rect x={rect.x + k * w} y={top} width={1} height={COLS.h} fill={inks.line} /> : null}
              {paintBinderIcon(it.icon!, x, top + COLS.icon.dy, COLS.icon.size, inks.deep, inks.ground)}
              {paintBinder(label, { ctx, x, top: top + COLS.label.dy, bold: true, fill: binderText(inks.ink, inks.ground, COLS.label.size) })}
              {lit ? <Lead id="gain">{figure}</Lead> : figure}
              {note ? paintBinder(note, { ctx, x, top: top + COLS.note.dy, fill: binderText(inks.muted, inks.ground, COLS.note.size) }) : null}
            </g>
          )
        })}
      </g>
      {tip && line ? <BinderPlainLine callout={tip} text={line} x={rect.x} y={top + COLS.h + LINE_GAP} ctx={ctx} /> : null}
    </g>
  )
}
