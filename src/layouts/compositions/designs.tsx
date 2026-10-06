import type { Component } from "@/ir"
import { SketchDrawing, type SketchInks } from "../../components/sketch"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  MANUSCRIPT_SPEC,
  fitManuscript,
  manuscriptChipWidth,
  manuscriptInks,
  manuscriptText,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptCard,
  paintManuscriptChip,
  splitMiddleDot,
} from "./manuscript"
import { graphicInk } from "../../render/ink"

type Comparison = Extract<Component, { type: "comparison" }>
type Sketch = Extract<Component, { type: "sketch" }>

/*
 * designs: two research designs side by side, each with the sketch of how
 * it tells its effect apart, thesis's 2026-10 board (p14). A card a design:
 * its name in the heading serif and when it can be done as a chip at the
 * top right (pale emerald for the first, pale gold for the second), its
 * sketch (a `sketch` component) drawn small with the gold dashed line at the
 * cutoff or the event, then its terms as ruled rows, each row's name small
 * in the muted ink and what it says beside it.
 *
 * Takes, in the manuscript setting: a `comparison` of two columns written
 * "name · when", two to five rows and no title, tag, icon or mark, then two
 * `sketch`es, one a column in the same order.
 *
 * Declines: a name, a chip or a row's words past one line.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const CARD = { pitch: 584, w: 568, h: 430, pad: 24, title: { dy: 16, size: 20, h: 30 }, chip: { dy: 20, size: 12, h: 24 } } as const
const SKETCH = { dx: 40, dy: 64, w: 488, h: 150, size: 12 } as const
const ROWS = { dy: 242, pitch: 44, label: { dy: 10, size: 13, h: 24, w: 100 }, value: { dx: 100, dy: 10, size: 14, h: 24, w: 420 } } as const

function sketchInks(inks: ReturnType<typeof manuscriptInks>, ground: string): SketchInks {
  return {
    axis: graphicInk(inks.pebble, ground),
    cut: graphicInk(inks.gold, ground),
    cutText: manuscriptText(inks.goldText, ground, SKETCH.size),
    lead: graphicInk(inks.deep, ground),
    leadText: manuscriptText(inks.deep, ground, SKETCH.size),
    quiet: graphicInk(inks.pebble, ground),
    quietText: manuscriptText(inks.pebble, ground, SKETCH.size),
    ink: inks.ink,
    muted: manuscriptText(inks.muted, ground, SKETCH.size),
  }
}

export const designsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [table, first, second, ...rest] = components
  if (table?.type !== "comparison" || first?.type !== "sketch" || second?.type !== "sketch" || rest.length > 0) return null
  const t = table as Comparison
  const sketches = [first as Sketch, second as Sketch]
  if (t.title?.trim() || t.label_column || t.columns.length !== 2 || t.recommended !== undefined || t.tag_column) return null
  if (t.rows.length < 2 || t.rows.length > 5 || t.rows.some((r) => r.icon || r.tag || r.emphasis || r.cells.length !== 2)) return null
  if (rect.w < CARD.pitch + CARD.w || rect.h < ROWS.dy + t.rows.length * ROWS.pitch) return null
  const inks = manuscriptInks(ctx)
  const card = inks.card
  const heads = t.columns.map((col) => {
    const split = splitMiddleDot(col)
    const name = split ? split.name : col.trim()
    const when = split?.rest ?? ""
    const chipW = when ? manuscriptChipWidth(when, CARD.chip.size, ctx) : 0
    return { name, when, fit: fitManuscript(name, { width: CARD.w - CARD.pad * 2 - chipW - 12, size: CARD.title.size, lineHeight: CARD.title.h, maxLines: 1, serif: true, bold: true }, ctx) }
  })
  if (heads.some((h) => !h.fit)) return null
  const rows = t.rows.map((r) => ({
    label: fitManuscript(r.label, { width: ROWS.label.w - 4, size: ROWS.label.size, lineHeight: ROWS.label.h, maxLines: 1, bold: true }, ctx),
    cells: r.cells.map((cell) => fitManuscript(cell, { width: ROWS.value.w, size: ROWS.value.size, lineHeight: ROWS.value.h, maxLines: 1 }, ctx)),
  }))
  if (rows.some((r) => !r.label || r.cells.some((c) => !c))) return null
  const h = Math.max(CARD.h, ROWS.dy + t.rows.length * ROWS.pitch + 12)
  if (rect.h < h) return null
  return (
    <g {...compositionTag("designs")}>
      <g {...blockTag(ctx, t)}>
        {heads.map((head, i) => {
          const x = rect.x + i * CARD.pitch
          const y = rect.y
          const chipFg = i === 0 ? inks.deep : inks.goldText
          const chipBg = i === 0 ? inks.deepPale : inks.goldPale
          return (
            <g key={i} data-manuscript-design={head.name}>
              {paintManuscriptCard({ x, y, w: CARD.w, h }, inks)}
              <g {...(head.when ? { "data-gloss-break": " · " } : {})}>{paintManuscript(head.fit!, { ctx, x: x + CARD.pad, top: y + CARD.title.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, card, CARD.title.size), ground: card })}</g>
              {head.when ? paintManuscriptChip(head.when, x + CARD.w - CARD.pad - manuscriptChipWidth(head.when, CARD.chip.size, ctx), y + CARD.chip.dy, { size: CARD.chip.size, h: CARD.chip.h, fg: chipFg, bg: chipBg }, ctx).node : null}
              {rows.map((r, j) => {
                const ry = y + ROWS.dy + j * ROWS.pitch
                return (
                  <g key={j}>
                    <rect x={x + CARD.pad} y={ry} width={CARD.w - CARD.pad * 2} height={1} fill={inks.line} />
                    {paintManuscript(r.label!, { ctx, x: x + CARD.pad, top: ry + ROWS.label.dy, bold: true, fill: manuscriptText(inks.muted, card, ROWS.label.size), ground: card })}
                    {paintManuscript(r.cells[i]!, { ctx, x: x + CARD.pad + ROWS.value.dx, top: ry + ROWS.value.dy, fill: manuscriptText(inks.ink, card, ROWS.value.size), ground: card })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {sketches.map((sketch, i) => {
        // The outcome's name stands left of the upright axis: the axis moves in to keep it on the card.
        const yTitle = sketch.y_title?.trim() ? manuscriptWidth(sketch.y_title, SKETCH.size, ctx) : 0
        const dx = Math.max(SKETCH.dx, 16 + yTitle)
        return (
        <g key={`s-${i}`} {...blockTag(ctx, sketch)}>
          <SketchDrawing sketch={sketch} box={{ x: rect.x + i * CARD.pitch + dx, y: rect.y + SKETCH.dy, w: SKETCH.w - (dx - SKETCH.dx), h: SKETCH.h }} inks={sketchInks(inks, card)} size={SKETCH.size} fontFamily={ctx.fonts.body} textAttrs={{ ...MANUSCRIPT_SPEC }} />
        </g>
        )
      })}
    </g>
  )
}
