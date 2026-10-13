import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitFigure,
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
import { wholeLit } from "./lineup"
import type { Recipe } from "./recipe"

type Image = Extract<Component, { type: "image" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * results: what a piece of work came to, in a few figures beside a
 * photograph of the work, profile's 2026-10 board (p06). The photograph
 * bleeds from x680 to the page's right edge the full height of the page. In
 * the column from x80 to x620: the section line and the claim, and from y270
 * the figures as open rows, the first under a hairline of the ink, the rest
 * under pale hairlines, a last pale hairline under them. Each row: the figure
 * bold in the heading serif at 44px with its unit after it at 18px, in the
 * accent when its author marked all of it, and beside it the figure's label
 * at 17px and its note at 14px in the grey. The footer keeps to the column
 * (`data-frame-right`), and a source that credits the photograph follows the
 * deck's label there.
 *
 * Takes, in the portrait setting: an `image` and a `kpi_cards` of two to
 * four items, in either order.
 *
 * Declines: a caption, an item with an icon, a delta, a tag, a tone or a
 * source, a figure wider than its 200px, a label past one line or a note
 * past two, rows that run into the footer, a claim past three lines.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces,
 * the image's crop or its centre.
 */

const PHOTO = { x: 680, y: 0, w: 600, h: 720 } as const
const COLUMN = { x: 80, w: 540, top: 64 } as const
const ROWS = { top: 270, minGap: 40, pad: 22, figureW: 200, gap: 20, figure: { size: 44, lineHeight: 44, unit: 18, gap: 6 }, label: { size: 17, lineHeight: 25 }, between: 4, note: { size: 14, lineHeight: 21, maxLines: 2 }, bottom: 650 } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const resultsRecipe: Recipe = {
  look: "What a piece of work came to, in a few figures beside a photograph of the work",
  kinds: ["points"],
  shapes: [{ parts: [{ type: "image" }, { type: "kpi_cards", count: [2, 4] }] }],
}

export const resultsComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 2) return null
  const image = components.find((c): c is Image => c.type === "image")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  if (!image || !kpis || image.caption?.trim()) return null
  const items = kpis.items
  if (items.length < 2 || items.length > 4 || items.some((it) => it.icon || it.delta || it.tag || it.tone || it.source)) return null
  const textX = COLUMN.x + ROWS.figureW + ROWS.gap
  const textW = COLUMN.x + COLUMN.w - textX
  const rows = items.map((it) => ({
    it,
    figure: splitFigure(it.value, it.unit),
    lit: wholeLit(it.value),
    label: fitPortrait(it.label, { width: textW, size: ROWS.label.size, lineHeight: ROWS.label.lineHeight, maxLines: 1 }, ctx),
    note: it.note?.trim() ? fitPortrait(it.note, { width: textW, size: ROWS.note.size, lineHeight: ROWS.note.lineHeight, maxLines: ROWS.note.maxLines }, ctx) : undefined,
  }))
  if (rows.some((r) => !r.label || r.note === null || portraitFigureWidth(r.figure.value, r.figure.unit, ROWS.figure, ctx) > ROWS.figureW)) return null
  const head = placePortraitHead(kicker, claim, { ...COLUMN, maxLines: 3 })
  if (!head) return null
  const top = Math.max(ROWS.top, head.bottom + ROWS.minGap)
  const heights = rows.map((r) => ROWS.pad * 2 + Math.max(ROWS.figure.lineHeight, ROWS.label.lineHeight + (r.note ? ROWS.between + r.note.lines.length * ROWS.note.lineHeight : 0)) + 1)
  const credit = placePortraitSource(source, { x: COLUMN.x, w: COLUMN.w, footer: true })
  if (credit === false) return null
  if (top + heights.reduce((a, b) => a + b, 0) > portraitBodyBottom(credit, ROWS.bottom)) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  let y = top
  return (
    <g {...compositionTag("results")} data-frame-right={COLUMN.x + COLUMN.w}>
      {paintPortraitPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop, focus: [0.5, 0.5] })}
      {head.node}
      <g {...blockTag(ctx, kpis)} data-portrait-results="">
        {rows.map((r, i) => {
          const at = y
          y += heights[i]!
          const mid = at + 1 + (heights[i]! - 1) / 2
          const textH = ROWS.label.lineHeight + (r.note ? ROWS.between + r.note.lines.length * ROWS.note.lineHeight : 0)
          return (
            <g key={i} data-portrait-result={stripEmphasis(r.it.label)} data-lit={r.lit ? "" : undefined}>
              {paintPortraitRule(COLUMN.x, COLUMN.x + COLUMN.w, at + 0.5, i === 0 ? inks.ink : inks.line, 1)}
              {paintPortraitFigure({ ctx, value: r.figure.value, unit: r.figure.unit, x: COLUMN.x, baseline: portraitBaseline(mid - ROWS.figure.lineHeight / 2, ROWS.figure.lineHeight, ROWS.figure.size, true), spec: ROWS.figure, fill: portraitText(r.lit ? inks.lead : inks.ink, ground, ROWS.figure.unit) })}
              {paintPortrait(r.label!, { ctx, x: textX, top: mid - textH / 2, fill: portraitText(inks.ink, ground, ROWS.label.size) })}
              {r.note ? paintPortrait(r.note, { ctx, x: textX, top: mid - textH / 2 + ROWS.label.lineHeight + ROWS.between, fill: portraitText(inks.muted, ground, ROWS.note.size) }) : null}
            </g>
          )
        })}
        {paintPortraitRule(COLUMN.x, COLUMN.x + COLUMN.w, y + 0.5, inks.line, 1)}
      </g>
      {credit}
    </g>
  )
}
