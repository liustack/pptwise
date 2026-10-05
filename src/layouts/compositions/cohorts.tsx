import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonMeta,
  lessonText,
  lessonTrackedWidth,
  lessonWidth,
  paintLesson,
  paintLessonCard,
  paintLessonIcon,
  paintLessonLine,
  paintLessonTracked,
  lessonBaseline,
  glossBreak,
  splitLead,
} from "./lesson"
import { fitTip, paintTip, plainCallout, type TipSpec } from "./lesson-tips"

type Comparison = Extract<Component, { type: "comparison" }>
type Panel = Extract<Component, { type: "insight_panel" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * cohorts: who gains most, the weaker half against the stronger, homeroom's
 * 2026-10 board (the beginners page, p06). For each study a pair of bars on
 * one scale: its name bold over them, the group the page argues about (the
 * comparison's first column) in the pen, the group it is read against (the
 * second) in the ghost, each bar's group named at its left and its figure
 * after its end, a group whose cell has no figure drawn as a stub with its
 * words. A key names the two columns, a muted note under the pairs says how
 * the studies cut their groups. Beside them a card weighs two people, the
 * panel's two rows, as one, with ≈ between them and the verdict under them,
 * and under the card the page's tip in a box of the mark's tint.
 *
 * Each cell is written as a reader would: 「技能最低的五分之一：+36%」, the
 * group, a colon, then its figure as a signed percentage, or words where
 * there is none (「技能最高的五分之一：几乎没变，质量略降」).
 *
 * Takes, in the lesson setting: a `comparison` of two columns and one or two
 * rows, every cell 「group：figure」, then optionally a `callout` with no
 * icon (the note), an `insight_panel` of two rows, and optionally a
 * `callout` (the tip), none with a title or tag.
 *
 * Declines: a cell with no colon, a group, a study's name or a figure past
 * its room, a panel row past one line, and a tip past three lines.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const PAIRS = { w: 640, pitch: 150, name: { baseline: 22, size: 16 }, labelW: 178, barX: 186, bar: { h: 26, a: 42, b: 84 }, aLabel: 58, bLabel: 100, value: { gap: 10, a: { baseline: 62, size: 18 }, b: { baseline: 104, size: 16, words: 14 } }, stub: 3, room: 70 } as const
const KEY = { baseline: 22, size: 12, swatch: 10, gap: 6, between: 16 } as const
const NOTE = { top: 304, size: 12, lineHeight: 20 } as const
const PANEL = { x: 696, h: 270, pad: 24, title: { top: 20, size: 13, lineHeight: 22, tracking: 2 }, rows: { top: 66, pitch: 80, icon: 30, x: 64, label: { dy: -2, size: 15, lineHeight: 24 }, text: { dy: 24, size: 13, lineHeight: 22 } }, approx: { x: 40, baseline: 140, size: 26 }, foot: { top: 224, size: 15, lineHeight: 24 } } as const
const TIP = { top: 294, h: 106 } as const
const TIP_SPEC: TipSpec = { size: 16, lineHeight: 26, maxLines: 3, textX: 60, icon: { x: 20, size: 24 }, padTop: 18 }

/** A cell's figure: a signed percentage such as +36%, as its number, or `null` when the cell says it in words. */
export function cohortFigure(text: string): number | null {
  const m = /^([+\-−]?)(\d+(?:\.\d+)?)\s*%$/u.exec(text.trim())
  if (!m) return null
  return (m[1] === "-" || m[1] === "−" ? -1 : 1) * Number(m[2])
}

export const cohortsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [table, ...others] = components
  if (table?.type !== "comparison") return null
  const t = table as Comparison
  if (t.columns.length !== 2 || t.rows.length < 1 || t.rows.length > 2 || t.recommended !== undefined || t.label_column || t.tag_column || t.title || t.rows.some((r) => r.tag || r.icon || r.emphasis)) return null
  let note: Callout | null = null
  let panel: Panel | null = null
  let tip: Callout | null = null
  for (const c of others) {
    if (c.type === "insight_panel" && !panel && !tip) panel = c
    else if (plainCallout(c) && !panel && !note && !c.icon) note = c
    else if (plainCallout(c) && panel && !tip) tip = c
    else return null
  }
  if (!panel || panel.rows.length !== 2) return null
  if (rect.w < PANEL.x + 400 || rect.h < TIP.top + TIP.h) return null
  const inks = lessonInks(ctx)
  const cells = t.rows.map((row) => row.cells.map((cell) => splitLead(cell)))
  if (cells.some((row) => row.some((cell) => !cell))) return null
  const figures = cells.map((row) => row.map((cell) => cohortFigure(cell!.rest)))
  const top = Math.max(1, ...figures.flat().map((v) => Math.abs(v ?? 0)))
  const k = (PAIRS.w - PAIRS.barX - PAIRS.room) / top
  const fits = (text: string, size: number, w: number, bold = false) => lessonWidth(text, size, ctx, bold) <= w
  for (const [i, row] of t.rows.entries()) {
    if (!fits(row.label, PAIRS.name.size, PAIRS.w, true)) return null
    for (const [j, cell] of cells[i]!.entries()) {
      if (!fits(cell!.lead, 14, PAIRS.labelW)) return null
      const v = figures[i]![j]
      const end = PAIRS.barX + Math.max(PAIRS.stub, Math.abs(v ?? 0) * k) + PAIRS.value.gap
      const size = j === 0 ? PAIRS.value.a.size : v === null ? PAIRS.value.b.words : PAIRS.value.b.size
      if (end + lessonWidth(cell!.rest, size, ctx, v !== null) > PANEL.x - 16) return null
    }
  }
  const keyW = t.columns.reduce((w, name) => w + KEY.swatch + KEY.gap + lessonWidth(name, KEY.size, ctx), 0) + KEY.between
  if (keyW + lessonWidth(t.rows[0]!.label, PAIRS.name.size, ctx, true) + 24 > PAIRS.w) return null
  const noteText = note ? fitLesson(note.text, { width: PAIRS.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  if (note && !noteText) return null
  const panelX = rect.x + PANEL.x
  const panelW = rect.x + rect.w - panelX
  const head = panel.title.trim()
  if (lessonTrackedWidth(head, PANEL.title.size, PANEL.title.tracking, ctx, true) > panelW - PANEL.pad * 2) return null
  const people = panel.rows.map((row) => ({
    label: fitLesson(row.label, { width: panelW - PANEL.rows.x - PANEL.pad, size: PANEL.rows.label.size, lineHeight: PANEL.rows.label.lineHeight, maxLines: 1, bold: true }, ctx),
    text: fitLesson(row.text, { width: panelW - PANEL.rows.x - PANEL.pad, size: PANEL.rows.text.size, lineHeight: PANEL.rows.text.lineHeight, maxLines: 1 }, ctx),
  }))
  if (people.some((p) => !p.label || !p.text)) return null
  const foot = panel.footnote?.trim() ? fitLesson(panel.footnote, { width: panelW - PANEL.pad * 2, size: PANEL.foot.size, lineHeight: PANEL.foot.lineHeight, maxLines: 1 }, ctx) : null
  if (panel.footnote?.trim() && !foot) return null
  const fittedTip = tip ? fitTip(tip, panelW, TIP_SPEC, ctx) : null
  if (tip && !fittedTip) return null
  const inkA = inks.pen
  const inkB = inks.ghost

  return (
    <g {...compositionTag("cohorts")}>
      <g {...blockTag(ctx, t)}>
        <g data-lesson-key="">
          {(() => {
            let x = rect.x + PAIRS.w - keyW + KEY.between
            return t.columns.map((name, j) => {
              const at = x
              x += KEY.swatch + KEY.gap + lessonWidth(name, KEY.size, ctx) + KEY.between
              return (
                <g key={j}>
                  <rect x={at} y={rect.y + KEY.baseline - KEY.swatch} width={KEY.swatch} height={KEY.swatch} rx={2} fill={j === 0 ? inkA : inkB} />
                  {paintLessonLine(name, { ctx, x: at + KEY.swatch + KEY.gap, baseline: rect.y + KEY.baseline, size: KEY.size, fill: lessonMeta(inks.muted, inks.ground) })}
                </g>
              )
            })
          })()}
        </g>
        {t.rows.map((row, i) => {
          const y = rect.y + i * PAIRS.pitch
          return (
            <g key={i} data-lesson-cohort="">
              {paintLessonLine(row.label, { ctx, x: rect.x, baseline: y + PAIRS.name.baseline, size: PAIRS.name.size, bold: true, fill: lessonText(inks.ink, inks.ground, PAIRS.name.size) })}
              {cells[i]!.map((cell, j) => {
                const v = figures[i]![j]
                const w = Math.max(PAIRS.stub, Math.abs(v ?? 0) * k)
                const barY = y + (j === 0 ? PAIRS.bar.a : PAIRS.bar.b)
                const fill = j === 0 ? inkA : inkB
                const valueSize = j === 0 ? PAIRS.value.a.size : v === null ? PAIRS.value.b.words : PAIRS.value.b.size
                const valueInk = j === 0 ? inks.pen : v === null ? inks.muted : inks.ink
                return (
                  <g key={j} data-lesson-bar={j === 0 ? "subject" : "reference"}>
                    {paintLessonLine(cell!.lead, { ctx, x: rect.x, baseline: y + (j === 0 ? PAIRS.aLabel : PAIRS.bLabel), size: 14, fill: lessonText(inks.muted, inks.ground, 14), attrs: glossBreak(cell!.sep) })}
                    <rect data-plot-mark="1" x={rect.x + PAIRS.barX} y={barY} width={w} height={PAIRS.bar.h} rx={3} fill={fill} />
                    {paintLessonLine(cell!.rest, {
                      ctx,
                      x: rect.x + PAIRS.barX + w + PAIRS.value.gap,
                      baseline: y + (j === 0 ? PAIRS.value.a.baseline : PAIRS.value.b.baseline),
                      size: valueSize,
                      bold: v !== null,
                      fill: lessonText(valueInk, inks.ground, valueSize),
                    })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {note && noteText ? <g {...blockTag(ctx, note)}>{paintLesson(noteText, { ctx, x: rect.x, top: rect.y + NOTE.top, fill: lessonMeta(inks.muted, inks.ground) })}</g> : null}
      <g {...blockTag(ctx, panel)} data-lesson-equal="">
        {paintLessonCard({ x: panelX, y: rect.y, w: panelW, h: PANEL.h }, inks)}
        {paintLessonTracked({ ctx, text: head, x: panelX + PANEL.pad, y: lessonBaseline(rect.y + PANEL.title.top, PANEL.title.lineHeight, PANEL.title.size), size: PANEL.title.size, tracking: PANEL.title.tracking, bold: true, fill: lessonText(inks.mark, inks.paper, PANEL.title.size) })}
        {people.map((p, j) => {
          const y = rect.y + PANEL.rows.top + j * PANEL.rows.pitch
          return (
            <g key={j}>
              {paintLessonIcon("user", panelX + PANEL.pad, y, PANEL.rows.icon, j === 0 ? inks.pen : inks.muted, inks.paper)}
              {paintLesson(p.label!, { ctx, x: panelX + PANEL.rows.x, top: y + PANEL.rows.label.dy, bold: true, fill: lessonText(inks.ink, inks.paper, PANEL.rows.label.size), ground: inks.paper })}
              {paintLesson(p.text!, { ctx, x: panelX + PANEL.rows.x, top: y + PANEL.rows.text.dy, fill: lessonText(inks.muted, inks.paper, PANEL.rows.text.size), ground: inks.paper })}
            </g>
          )
        })}
        {paintLessonLine("≈", { ctx, x: panelX + PANEL.approx.x, baseline: rect.y + PANEL.approx.baseline, size: PANEL.approx.size, bold: true, anchor: "middle", fill: lessonText(inks.ink, inks.paper, PANEL.approx.size) })}
        {foot ? paintLesson(foot, { ctx, x: panelX + PANEL.pad, top: rect.y + PANEL.foot.top, fill: lessonText(inks.ink, inks.paper, PANEL.foot.size), ground: inks.paper }) : null}
      </g>
      {fittedTip ? paintTip(fittedTip, { x: panelX, y: rect.y + TIP.top, w: panelW, h: TIP.h }, TIP_SPEC, ctx, inks) : null}
    </g>
  )
}
