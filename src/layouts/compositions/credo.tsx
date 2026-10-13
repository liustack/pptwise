import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitFigure,
  paintPortraitLine,
  paintPortraitPhoto,
  paintPortraitRule,
  placePortraitHead,
  placePortraitSource,
  portraitBodyBottom,
  portraitBaseline,
  portraitFigureWidth,
  portraitInks,
  portraitText,
  splitFigure,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Image = Extract<Component, { type: "image" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * credo: why this person, in one sentence in their own words beside their
 * portrait, profile's 2026-10 board (p11). The portrait bleeds from x880 to
 * the page's right edge the full height of the page. In the column from x80
 * to x800: the section line and the claim; from y250 an opening quotation
 * mark set huge in the heading serif in the accent, and the paragraph under
 * it in the serif at 38/59, its marked words bold in the accent; from y548,
 * under a hairline of the ink, the one figure it rests on, bold at 44px with
 * its unit, its label at 16px on the figure's baseline beside it and its note at
 * 14px in the grey under the label.
 * The footer keeps to the column (`data-frame-right`), and a source that
 * credits the photograph follows the deck's label there.
 *
 * Takes, in the portrait setting: an `image`, a `paragraph` and a
 * `kpi_cards` of one item, in any order.
 *
 * Declines: a caption, an item with an icon, a delta, a tag, a tone or a
 * source, a paragraph past four lines, a claim past two lines.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces,
 * the image's crop or its centre.
 */

const PHOTO = { x: 880, y: 0, w: 400, h: 720 } as const
const COLUMN = { x: 80, w: 720, top: 64 } as const
const QUOTE = { top: 250, h: 56, size: 110, base: 80 } as const
const BOTTOM = 650
const SAYING = { size: 38, lineHeight: 58.9, maxLines: 4 } as const
const FIGURE = { top: 548, pad: 18, figure: { size: 44, lineHeight: 44, unit: 18, gap: 6 }, gap: 22, label: { size: 16, lineHeight: 23 }, between: 2, note: { size: 14, lineHeight: 20 } } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const credoRecipe: Recipe = {
  look: "Why this person, in one sentence in their own words beside their portrait",
  kinds: ["fact"],
  shapes: [{ parts: [{ type: "image" }, { type: "kpi_cards", count: [1, 1] }, { type: "paragraph" }] }],
}

export const credoComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 3) return null
  const image = components.find((c): c is Image => c.type === "image")
  const para = components.find((c): c is Paragraph => c.type === "paragraph")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!image || !para || !kpis || image.caption?.trim() || kpis.items.length !== 1) return null
  const item = kpis.items[0]!
  if (item.icon || item.delta || item.tag || item.tone || item.source) return null
  const saying = fitPortrait(para.text, { width: COLUMN.w, size: SAYING.size, lineHeight: SAYING.lineHeight, maxLines: SAYING.maxLines, serif: true }, ctx)
  if (!saying) return null
  const figure = splitFigure(item.value, item.unit)
  const figureW = portraitFigureWidth(figure.value, figure.unit, FIGURE.figure, ctx)
  const textX = COLUMN.x + figureW + FIGURE.gap
  const label = fitPortrait(item.label, { width: COLUMN.x + COLUMN.w - textX, size: FIGURE.label.size, lineHeight: FIGURE.label.lineHeight, maxLines: 1 }, ctx)
  const note = item.note?.trim() ? fitPortrait(item.note, { width: COLUMN.x + COLUMN.w - textX, size: FIGURE.note.size, lineHeight: FIGURE.note.lineHeight, maxLines: 1 }, ctx) : undefined
  if (!label || note === null) return null
  const head = placePortraitHead(kicker, claim, COLUMN)
  if (!head) return null
  const quoteTop = Math.max(QUOTE.top, head.bottom + 50)
  const sayingTop = quoteTop + QUOTE.h
  const figureTop = Math.max(FIGURE.top, sayingTop + saying.lines.length * SAYING.lineHeight + 40)
  const credit = placePortraitSource(source, { x: COLUMN.x, w: COLUMN.w, footer: true })
  if (credit === false) return null
  const bottom = portraitBodyBottom(credit, BOTTOM)
  if (figureTop + 1 + FIGURE.pad + FIGURE.figure.lineHeight > bottom) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const figureBase = portraitBaseline(figureTop + 1 + FIGURE.pad, FIGURE.figure.lineHeight, FIGURE.figure.size, true)
  // The label beside the figure on its baseline, the note under the label.
  const labelBase = figureBase
  const noteBase = labelBase + FIGURE.label.lineHeight + FIGURE.between - 1
  if (note && noteBase + FIGURE.note.lineHeight / 3 > bottom) return null
  return (
    <g {...compositionTag("credo")} data-frame-right={COLUMN.x + COLUMN.w}>
      {paintPortraitPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop, focus: [0.5, 0.3] })}
      {head.node}
      <g {...blockTag(ctx, para)} data-portrait-credo="">
        {paintPortraitLine("\u201C", { ctx, x: COLUMN.x, baseline: quoteTop + QUOTE.base, size: QUOTE.size, serif: true, bold: true, fill: portraitText(inks.lead, ground, QUOTE.size), attrs: { "data-portrait-quote-mark": "" } })}
        {paintPortrait(saying, { ctx, x: COLUMN.x, top: sayingTop, serif: true, fill: portraitText(inks.ink, ground, SAYING.size) })}
      </g>
      <g {...blockTag(ctx, kpis)} data-portrait-grounds={stripEmphasis(item.label)}>
        {paintPortraitRule(COLUMN.x, COLUMN.x + COLUMN.w, figureTop + 0.5, inks.ink, 1)}
        {paintPortraitFigure({ ctx, value: figure.value, unit: figure.unit, x: COLUMN.x, baseline: figureBase, spec: FIGURE.figure, fill: portraitText(inks.ink, ground, FIGURE.figure.unit) })}
        {paintPortraitLine(label.lines[0]!, { ctx, x: textX, baseline: labelBase, size: FIGURE.label.size, fill: portraitText(inks.ink, ground, FIGURE.label.size) })}
        {note ? paintPortraitLine(note.lines[0]!, { ctx, x: textX, baseline: noteBase, size: FIGURE.note.size, fill: portraitText(inks.muted, ground, FIGURE.note.size) }) : null}
      </g>
      {credit}
    </g>
  )
}
