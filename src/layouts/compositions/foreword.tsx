import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPeriodical,
  paintFigure,
  paintPeriodical,
  paintPeriodicalIcon,
  periodicalBaseline,
  periodicalInks,
  periodicalMark,
  periodicalText,
  periodicalWidth,
  placeClaim,
  figureWidth,
} from "./periodical"
import { wholeMark } from "./manuscript"

type Paragraph = Extract<Component, { type: "paragraph" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * foreword: the editor's note, journal's 2026-10 board (p02). The claim over
 * the page; under it the note in the heading serif at 20/38, its first
 * character dropped three lines deep in the accent; and at the right, past a
 * hairline, two or three figures in a column, each with its symbol, its
 * figure set large, its label and the line that puts it in context. The
 * marked figure (`**…**`) and its symbol are in the accent.
 *
 * Takes, in the periodical setting: a `paragraph` with no marked runs, then
 * a `kpi_cards` of two or three, each with a symbol and a note.
 *
 * Declines: a note longer than ten lines, a figure, label or note past its
 * column, a figure with a tag, a source or a direction.
 *
 * Reads: the periodical inks (`./periodical.tsx`).
 */

const NOTE = { top: 122, w: 720, size: 20, lineHeight: 38, maxLines: 10 } as const
const CAP = { size: 112, lineHeight: 104, dropTop: 4, gap: 14, lines: 3 } as const
const RULE = { x: 768, top: 118, bottom: 530 } as const
const FIGURES = { top: 118, pitch: 140, icon: { x: 800, dy: 8, size: 22 }, value: { x: 836, h: 60, size: 48 }, label: { x: 800, dy: 66, size: 13, h: 22 }, note: { dy: 90, size: 12, h: 20 }, w: 352 } as const

/** The note's lines beside the drop cap and under it: `null` when they do not fit. */
export function fitDropCap(text: string, ctx: ComponentCtx): { cap: string; capW: number; lines: string[] } | null {
  const chars = Array.from(text.trim())
  if (chars.length < 2 || text.includes("**")) return null
  const cap = chars[0]!
  const capW = periodicalWidth(cap, CAP.size, ctx, { serif: true, bold: true })
  const besideW = NOTE.w - capW - CAP.gap
  const rest = chars.slice(1).join("")
  const spec = { size: NOTE.size, lineHeight: NOTE.lineHeight, serif: true } as const
  const beside = fitPeriodical(rest, { ...spec, width: besideW, maxLines: 40 }, ctx)
  if (!beside) return null
  if (beside.lines.length <= CAP.lines) return { cap, capW, lines: beside.lines }
  // What the three lines beside the cap hold, then the rest at the full measure.
  const held = beside.lines.slice(0, CAP.lines)
  let at = 0
  for (const line of held) {
    for (const ch of Array.from(line)) {
      while (at < rest.length && rest[at] !== ch && /\s/u.test(rest[at]!)) at += 1
      at += ch.length
    }
  }
  const under = fitPeriodical(rest.slice(at).trim(), { ...spec, width: NOTE.w, maxLines: NOTE.maxLines - CAP.lines }, ctx)
  if (!under) return null
  return { cap, capW, lines: [...held, ...under.lines] }
}

export const forewordComposition: Composition = ({ components, ctx, rect, setting, claim }) => {
  if (setting !== "periodical") return null
  const [paragraph, figures, ...rest] = components
  if (paragraph?.type !== "paragraph" || figures?.type !== "kpi_cards" || rest.length > 0) return null
  const p = paragraph as Paragraph
  const k = figures as Kpis
  if (k.items.length < 2 || k.items.length > 3) return null
  if (k.items.some((it) => !it.icon || !it.note?.trim() || it.tag || it.source || it.delta || it.tone)) return null
  if (rect.w < FIGURES.label.x + FIGURES.w || rect.h < RULE.bottom) return null
  const note = fitDropCap(p.text, ctx)
  if (!note || note.lines.length > NOTE.maxLines) return null
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const items = k.items.map((it) => ({
    it,
    lit: wholeMark(it.value),
    label: fitPeriodical(it.label, { width: FIGURES.w, size: FIGURES.label.size, lineHeight: FIGURES.label.h, maxLines: 1, bold: true }, ctx),
    note: fitPeriodical(it.note!, { width: FIGURES.w, size: FIGURES.note.size, lineHeight: FIGURES.note.h, maxLines: 1 }, ctx),
  }))
  if (items.some((f) => !f.label || !f.note || figureWidth(f.it.value, f.it.unit, { size: FIGURES.value.size, unit: FIGURES.value.size * 0.5 }, ctx) > rect.w - FIGURES.value.x)) return null
  const head = placeClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const x0 = rect.x
  const y0 = rect.y
  const textX = (i: number) => x0 + (i < CAP.lines ? note.capW + CAP.gap : 0)
  const capBaseline = periodicalBaseline(y0 + NOTE.top + CAP.dropTop, CAP.lineHeight, CAP.size, true)
  const bodyInk = periodicalText(inks.ink, ground, NOTE.size)
  return (
    <g {...compositionTag("foreword")}>
      {head}
      <g {...blockTag(ctx, p)} data-periodical-dropcap={note.cap}>
        <text x={x0} y={capBaseline} fontFamily={ctx.fonts.heading} fontSize={CAP.size} fontWeight="700" fill={periodicalText(inks.brick, ground, CAP.size)} dominantBaseline="alphabetic">
          {note.cap}
        </text>
        {note.lines.map((line, i) => (
          <text key={i} x={textX(i)} y={periodicalBaseline(y0 + NOTE.top + i * NOTE.lineHeight, NOTE.lineHeight, NOTE.size, true)} fontFamily={ctx.fonts.heading} fontSize={NOTE.size} fill={bodyInk} dominantBaseline="alphabetic" xmlSpace={line.includes("  ") ? "preserve" : undefined}>
            {line}
          </text>
        ))}
      </g>
      <rect x={x0 + RULE.x - 0.5} y={y0 + RULE.top} width={1} height={RULE.bottom - RULE.top} fill={inks.line} />
      <g {...blockTag(ctx, k)}>
        {items.map((f, i) => {
          const top = y0 + FIGURES.top + i * FIGURES.pitch
          const ink = f.lit ? inks.brick : inks.lead
          return (
            <g key={i} data-periodical-figure={f.it.value.replace(/\*/g, "")} {...(f.lit ? { "data-periodical-lead": "figure" } : {})}>
              {paintPeriodicalIcon(f.it.icon!, x0 + FIGURES.icon.x, top + FIGURES.icon.dy, FIGURES.icon.size, periodicalMark(ink, ground), ground)}
              {paintFigure({ ctx, value: f.it.value, unit: f.it.unit, x: x0 + FIGURES.value.x, baseline: periodicalBaseline(top, FIGURES.value.h, FIGURES.value.size, true), spec: { size: FIGURES.value.size, unit: FIGURES.value.size * 0.5 }, fill: periodicalText(ink, ground, FIGURES.value.size), ground })}
              {paintPeriodical(f.label!, { ctx, x: x0 + FIGURES.label.x, top: top + FIGURES.label.dy, bold: true, fill: periodicalText(inks.ink, ground, FIGURES.label.size) })}
              {paintPeriodical(f.note!, { ctx, x: x0 + FIGURES.label.x, top: top + FIGURES.note.dy, fill: periodicalText(inks.muted, ground, FIGURES.note.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
