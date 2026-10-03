import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { accessibleInk } from "../render/ink"
import { fitFigure, markedFigure, paintBoldFigure, plainFigure, type FittedFigure } from "./compositions/figure"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"
import { ruleInk } from "./compositions/shared"
import { gridMark } from "./compositions/grid"
import type { EmphasisHeadingLayout } from "../render/emphasis"
import { GRID_HEAD_FIT, GRID_LEFT, GRID_RIGHT, GridHead, GridSource, fitGridSource, gridBodyRect, gridKicker } from "./grid-shared"
import { GridSheetContent } from "./content-grid-sheet"

type KpiItem = Extract<Component, { type: "kpi_cards" }>["items"][number]

/*
 * grid-figure: swiss's single-figure page, drawn to its 2026-10 board (p06).
 * Under the grid header, the figure the page is about very large and bold
 * on the left, a small label over it saying what it counts and a sentence
 * under it putting it in context. Right of a black rule at x800, one or two
 * supporting figures at 56px, each with its label and note, a hairline
 * between them. The figure the author marks (`**…**` around its value) is
 * set in the emphasis ink, the others black.
 *
 * The page is a `kpi_cards` of one to three items: the first is the lead
 * figure, the second and third stand beside it. The lead figure takes the
 * largest of 176, 152, 128 and 104 at which it fits its column on one line,
 * so a longer figure steps down rather than running under the rule. A page
 * of any other shape, or one whose figures, labels or notes do not fit, is
 * drawn as a grid sheet.
 */

const LEAD = {
  /** The lead figure's column, x72 to x760: the board sets the figure 8px left of the type area to align its ink. */
  x: GRID_LEFT - 8,
  right: 760,
  sizes: [176, 152, 128, 104] as const,
  label: { size: 17, box: 24 },
  /** The figure's line box starts 40px under the label's, 200px tall at 176px (y262 to y462 on the board). */
  figureTop: 40,
  figureBoxRatio: 200 / 176,
  note: { size: 20, lineHeight: 30, maxLines: 2, w: 640 },
  /** The note's first line box starts 38px under the figure's (y500 on the board). */
  noteGap: 38,
}
const SIDE = {
  ruleX: 800,
  x: 840,
  pitch: 176,
  label: { size: 16, box: 24 },
  figure: { size: 56, top: 30, box: 64 },
  note: { size: 17, top: 100, lineHeight: 26, maxLines: 2 },
  /** The hairline between two side figures sits this far over the lower one. */
  ruleAbove: 20,
  max: 2,
}
/** The lead column and the side column both start 26px into the band (y222 on the board). */
const FIRST = 26

interface Block {
  item: KpiItem
  label: EmphasisHeadingLayout
  figure: FittedFigure
  note: EmphasisHeadingLayout | null
  marked: boolean
}

function figureItems(components: readonly Component[]): { lead: KpiItem; side: KpiItem[] } | null {
  if (components.length !== 1) return null
  const only = components[0]!
  if (only.type !== "kpi_cards" || only.items.length < 1 || only.items.length > 1 + SIDE.max) return null
  if (!only.items.every(plainFigure)) return null
  const [lead, ...side] = only.items
  return { lead: lead!, side }
}

export function GridFigureContent(props: SvgTemplateProps) {
  const { ir, slide, index, ctx, page } = props
  // A subheading has no place on the figure page: the sheet sets it.
  const items = slide.subheading?.trim() ? null : figureItems(slide.components)
  if (!items) return <GridSheetContent {...props} />
  const { colors, fonts } = ctx
  const body = fonts.body
  const bg = ctx.defaultBg ?? colors.bg
  const source = fitGridSource(slide, ctx, page)
  const rect = gridBodyRect(source, page)
  const top = rect.y + FIRST
  const beside = items.side.length > 0
  const leadW = (beside ? LEAD.right : GRID_RIGHT) - LEAD.x

  // The lead figure, at the largest size it fits.
  let leadFigure: FittedFigure | null = null
  for (const size of LEAD.sizes) {
    leadFigure = fitFigure(items.lead, size, leadW, fonts.heading, false, true)
    if (leadFigure) break
  }
  const leadLabel = fitFixed(items.lead.label, { width: leadW, size: LEAD.label.size, lineHeight: LEAD.label.box, maxLines: 1, fontFamily: body, bold: false })
  const noteW = Math.min(LEAD.note.w, leadW)
  const leadNote = items.lead.note?.trim()
    ? fitFixed(items.lead.note, { width: noteW, size: LEAD.note.size, lineHeight: LEAD.note.lineHeight, maxLines: LEAD.note.maxLines, fontFamily: body, bold: false })
    : undefined
  if (!leadFigure || !leadLabel || leadNote === null) return <GridSheetContent {...props} />

  const sideW = GRID_RIGHT - SIDE.x
  const side: Block[] = []
  for (const item of items.side) {
    const label = fitFixed(item.label, { width: sideW, size: SIDE.label.size, lineHeight: SIDE.label.box, maxLines: 1, fontFamily: body, bold: false })
    const figure = fitFigure(item, SIDE.figure.size, sideW, fonts.heading, false, true)
    const note = item.note?.trim()
      ? fitFixed(item.note, { width: sideW, size: SIDE.note.size, lineHeight: SIDE.note.lineHeight, maxLines: SIDE.note.maxLines, fontFamily: body, bold: false })
      : undefined
    if (!label || !figure || note === null) return <GridSheetContent {...props} />
    side.push({ item, label, figure, note: note ?? null, marked: markedFigure(item) })
  }

  const size = leadFigure.size
  const labelY = centredBaseline(top, LEAD.label.box, LEAD.label.size)
  const figureTop = top + LEAD.figureTop
  const figureBox = Math.round(size * LEAD.figureBoxRatio)
  const figureY = centredBaseline(figureTop, figureBox, size)
  const noteTop = figureTop + figureBox + LEAD.noteGap
  const noteY = centredBaseline(noteTop, LEAD.note.lineHeight, LEAD.note.size)
  const leadFoot = leadNote ? noteTop + leadNote.lines.length * LEAD.note.lineHeight : figureTop + figureBox
  const sideTop = (i: number) => top + i * SIDE.pitch
  const lastSide = side[side.length - 1]
  const sideFoot = lastSide
    ? sideTop(side.length - 1) +
      (lastSide.note
        ? SIDE.note.top + lastSide.note.lines.length * SIDE.note.lineHeight
        : SIDE.figure.top + SIDE.figure.box)
    : top
  if (Math.max(leadFoot, sideFoot) > rect.y + rect.h) return <GridSheetContent {...props} />

  const labelInk = (s: number) => accessibleInk(colors.muted, bg, s)
  const ink = (marked: boolean, s: number) => accessibleInk(marked ? gridMark(ctx) : colors.text, bg, s)
  const rule = ruleInk(ctx)
  const ruleFoot = Math.max(sideFoot, leadFoot) - 6
  return (
    <>
      <GridHead heading={slide.heading} ctx={ctx} kicker={gridKicker(ir, index)} />
      <g data-grid-figure="" data-figure-size={size}>
        {paintLines(leadLabel, { ctx, x: GRID_LEFT, y: labelY, fill: labelInk(LEAD.label.size), fontFamily: body, fontWeight: "400" })}
        {paintBoldFigure(leadFigure, { x: LEAD.x, y: figureY, ink: ink(markedFigure(items.lead), size) }, ctx)}
        {leadNote && paintLines(leadNote, { ctx, x: GRID_LEFT, y: noteY, fill: accessibleInk(colors.text, bg, LEAD.note.size), fontFamily: body, fontWeight: "400" })}
      </g>
      {beside && (
        <g data-figure-side="">
          <rect x={SIDE.ruleX} y={top} width={1} height={ruleFoot - top} fill={accessibleInk(colors.text, bg, SIDE.label.size)} />
          {side.map((block, i) => {
            const t = sideTop(i)
            return (
              <g key={i}>
                {i > 0 && <line x1={SIDE.x} y1={t - SIDE.ruleAbove} x2={GRID_RIGHT} y2={t - SIDE.ruleAbove} stroke={rule} strokeWidth={1} />}
                {paintLines(block.label, { ctx, x: SIDE.x, y: centredBaseline(t, SIDE.label.box, SIDE.label.size), fill: labelInk(SIDE.label.size), fontFamily: body, fontWeight: "400" })}
                {paintBoldFigure(block.figure, { x: SIDE.x, y: centredBaseline(t + SIDE.figure.top, SIDE.figure.box, SIDE.figure.size), ink: ink(block.marked, SIDE.figure.size) }, ctx)}
                {block.note &&
                  paintLines(block.note, {
                    ctx,
                    x: SIDE.x,
                    y: centredBaseline(t + SIDE.note.top, SIDE.note.lineHeight, SIDE.note.size),
                    fill: accessibleInk(colors.text, bg, SIDE.note.size),
                    fontFamily: body,
                    fontWeight: "400",
                  })}
              </g>
            )
          })}
        </g>
      )}
      <GridSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  id: "grid-figure",
  kind: "standard",
  story: {
    name: "Grid Figure",
    story: "Under the report's claim, one figure set very large and black with the sentence that puts it in context, and up to two supporting figures right of a black rule, one of them in the signal colour.",
    positioning: "Serves fact at one figure with its context. Choose it for the single number a finding rests on, with the two numbers that qualify it.",
    audience: "A board or the public that will remember one number and needs to see what it does not say.",
    notFor: "Several figures of equal weight, which belong in a row on a statement or data page.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: GRID_HEAD_FIT,
} satisfies LayoutDefinition
