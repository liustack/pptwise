import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  CHALKBOARD_META,
  CHALKBOARD_SPEC,
  ChalkUnder,
  chalkBaseline,
  chalkWidth,
  chalkMeta,
  chalkText,
  chalkTrackedWidth,
  chalkboardInks,
  paintChalk,
  paintChalkTracked,
  type ChalkClaimColumn,
  type ChalkSourceColumn,
} from "./compositions/chalkboard"

/*
 * The board's frame: what every lecture page wears, settled on lecture's
 * 2026-10 board (`design/rounds/2026-10-08-lecture/`).
 *
 * The wooden frame, the chalk ledge along the foot with its chalk and its
 * eraser, the course's name written on the ledge and the period's count at
 * the top right are the motif's. The face writes the lesson's step small at
 * the top left, tracked wide in the chalk grey (the page's `kicker`, 「二 算
 * 对」), the title in the heading serif at 34/46 across the whole measure,
 * its last line resting on y142, on one line whenever it fits and broken at
 * a comma or a colon when it does not, and the source small and dim over the
 * ledge, one line or two.
 */

export const CHALK_LEFT = 64
export const CHALK_RIGHT = 1216
export const CHALK_W = CHALK_RIGHT - CHALK_LEFT

/** The lesson's step: 12px in the chalk grey tracked 3px in an 18px line from y34. */
export const STEP = { x: CHALK_LEFT, top: 34, size: 12, lineHeight: 18, tracking: 3, w: 900 } as const

/** The title: 34/46 in the heading serif across x64 to x1216, its last line resting on y142. */
export const TITLE = { x: CHALK_LEFT, w: CHALK_W, foot: 142, size: 34, lineHeight: 46, maxLines: 2, oneLineFloor: 11 / 12 } as const

/** The source: 11/15 in the dim grey from y646, one line or two, its last line ending by y676. */
export const SOURCE = { x: CHALK_LEFT, top: 646, w: CHALK_W, size: 11, lineHeight: 15, maxLines: 2, foot: 676 } as const

/** Where a body set under the title by the ordinary renderer starts and ends. */
export const BODY = { top: 172, bottom: 636 } as const

/** The heading fit the title runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const CHALKBOARD_HEAD_FIT = { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: Math.round(TITLE.size * TITLE.oneLineFloor), bold: false, lineHeightRatio: TITLE.lineHeight / TITLE.size } as const

// ── The lesson's step ──────────────────────────────────────────────────

/** The lesson's step tracked from `column`'s left, or `null` when it does not fit its room. */
export function ChalkStep({ ctx, text, column = STEP }: { ctx: ComponentCtx; text: string; column?: { x: number; top: number; w: number } }): React.ReactElement | null {
  const words = stripEmphasis(text).trim()
  if (!words || chalkTrackedWidth(words, STEP.size, STEP.tracking, ctx) > column.w) return null
  const inks = chalkboardInks(ctx)
  return (
    <g data-chalk-step={words}>
      {paintChalkTracked({ ctx, text: words, x: column.x, y: chalkBaseline(column.top, STEP.lineHeight, STEP.size), size: STEP.size, tracking: STEP.tracking, fill: chalkText(inks.muted, inks.ground, STEP.size) })}
    </g>
  )
}

// ── The title ───────────────────────────────────────────────────────────

/**
 * The title fitted to a column of `width` at `size` in the heading serif at
 * its regular weight: the author's own break kept, each part on a line of
 * its own. Otherwise on one line whenever it fits, down to a twelfth under
 * its size. Otherwise on lines broken at the last comma or colon that lets
 * both fit.
 */
export function fitChalkClaim(heading: string | undefined, ctx: Pick<ComponentCtx, "fonts">, width: number = TITLE.w, size: number = TITLE.size, lineHeight: number = TITLE.lineHeight, maxLines: number = TITLE.maxLines, minPt: number = Math.round(size * TITLE.oneLineFloor)): EmphasisHeadingLayout {
  const plain = stripEmphasis(heading ?? "").trim()
  const fontFamily = ctx.fonts.heading
  const parts = (heading ?? "").split(/\n+/u).map((part) => part.trim()).filter(Boolean)
  const floor = Math.min(size, minPt)
  const fit = (text: string, s: number) => fitMemoTitle(text, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily, bold: false })
  if (parts.length > maxLines) return { ...fit(heading ?? "", size), lineHeight, truncated: true }
  if (parts.length > 1) {
    for (let s = size; s >= floor; s -= 1) {
      const fitted = parts.map((part) => fit(part, s))
      if (fitted.every((f) => f.lines.length === 1 && !f.truncated)) {
        return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), fontSize: s, lineHeight }
      }
    }
    return { ...fit(parts.join(" "), size), lineHeight, truncated: true }
  }
  if (plain) {
    const units = measureTextUnits(plain, { fontFamily, bold: false })
    for (let s = size; s >= floor; s -= 1) {
      if (units * s <= width) return { ...fit(heading ?? "", s), lineHeight }
    }
  }
  const layout = fit(heading ?? "", size)
  return { ...layout, lineHeight, truncated: layout.truncated || layout.lines.length > maxLines }
}

/** The title painted in its column, resting on `foot` (or hung from `top`), in the chalk white or quieter. */
export function ChalkClaim({ ctx, layout, column }: { ctx: ComponentCtx; layout: EmphasisHeadingLayout; column: ChalkClaimColumn }): React.ReactElement {
  const inks = chalkboardInks(ctx)
  const ink = column.tone === "muted" ? inks.muted : inks.chalk
  const top = column.top ?? (column.foot ?? TITLE.foot) - layout.lines.length * layout.lineHeight
  const fill = chalkText(ink, inks.ground, layout.fontSize)
  if (column.tracking && layout.lines.length === 1) {
    return (
      <g data-chalk-claim="">
        {paintChalkTracked({ ctx, text: layout.lines[0]!, x: column.x, y: chalkBaseline(top, layout.lineHeight, layout.fontSize), size: layout.fontSize, tracking: column.tracking, fill })}
      </g>
    )
  }
  // A run the author marks is written in chalk white with one stroke of yellow chalk under it: the theme's emphasis underline.
  const baseline0 = chalkBaseline(top, layout.lineHeight, layout.fontSize, true)
  const unders = layout.lines.flatMap((_, i) => {
    let x = column.x
    return (layout.segments[i] ?? []).flatMap((segment) => {
      const w = chalkWidth(segment.text, layout.fontSize, ctx, { serif: true })
      const from = x
      x += w
      return segment.emphasized && segment.text.trim() ? [{ x1: from, x2: from + w, y: baseline0 + i * layout.lineHeight + Math.round(layout.fontSize * 0.28) }] : []
    })
  })
  return (
    <g data-chalk-claim="">
      {paintChalk(layout, { ctx, x: column.x, top, fill, serif: true, lit: column.tone === "muted" ? inks.muted : inks.chalk })}
      {unders.map((u, i) => (
        <ChalkUnder key={i} x1={u.x1} x2={u.x2} y={u.y} ink={inks.yellow} width={4} marked />
      ))}
    </g>
  )
}

/** The page's title a composition places in a column of its own, or `null` when it would not fit that column whole. */
export function chalkClaimIn(slide: Pick<Slide, "heading">, ctx: ComponentCtx): (column: ChalkClaimColumn) => React.ReactElement | null {
  return (column) => {
    if (!stripEmphasis(slide.heading ?? "").trim()) return null
    const size = column.size ?? TITLE.size
    const lineHeight = column.lineHeight ?? TITLE.lineHeight
    const maxLines = column.maxLines ?? TITLE.maxLines
    // A lead-in tracked wide is set in the body sans on one line, as the board writes it over a formula.
    const layout = column.tracking
      ? fitEmphasisText(slide.heading, { maxWidth: column.w, fontSize: size, minPt: size, maxLines: 1, lineHeightRatio: lineHeight / size, fontFamily: ctx.fonts.body, bold: false })
      : fitChalkClaim(slide.heading, ctx, column.w, size, lineHeight, maxLines)
    if (layout.truncated || layout.lines.length > maxLines) return null
    if (column.tracking && chalkTrackedWidth(stripEmphasis(slide.heading ?? "").trim(), size, column.tracking, ctx) > column.w) return null
    return <ChalkClaim ctx={ctx} layout={{ ...layout, lineHeight }} column={column} />
  }
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitChalkSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w, type: { size: number; lineHeight: number } = SOURCE): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, maxLines: number) =>
    fitEmphasisText(text, { maxWidth: width, fontSize: type.size, minPt: type.size, maxLines, lineHeightRatio: type.lineHeight / type.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, SOURCE.maxLines), lineHeight: type.lineHeight }
  if (parts.length > SOURCE.maxLines) return { ...fit(parts.join(" "), SOURCE.maxLines), lineHeight: type.lineHeight, truncated: true }
  const fitted = parts.map((part) => fit(part, 1))
  return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), lineHeight: type.lineHeight, truncated: fitted.some((f) => f.truncated) }
}

/** A footnote set as a note beside a stamp: 13/22 in the chalk grey. */
export const NOTE = { size: 13, lineHeight: 22 } as const

/** The source from `top`, or risen a line when it takes two and its last line would pass `foot`. Centred on `x` when `align` is `"center"`. */
export function ChalkSource({ source, ctx, x = SOURCE.x, top = SOURCE.top, foot = SOURCE.foot, align, note = false }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number; foot?: number; align?: "center"; note?: boolean }): React.ReactElement | null {
  if (!source) return null
  const inks = chalkboardInks(ctx)
  const from = Math.min(top, foot - source.lines.length * source.lineHeight)
  const fill = note ? chalkText(inks.muted, inks.ground, source.fontSize) : chalkMeta(inks.dim, inks.ground)
  return <g data-chalk-source={note ? "note" : ""}>{paintChalk(source, { ctx, x, anchor: align === "center" ? "middle" : undefined, top: from, fill, attrs: note ? { ...CHALKBOARD_SPEC } : { ...CHALKBOARD_SPEC, ...CHALKBOARD_META }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}</g>
}

/** The source a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it would not fit. */
export function chalkSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: ChalkSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top, foot, align, note }) => {
    const source = fitChalkSource(slide, ctx, w, note ? NOTE : SOURCE)
    if (!source || source.truncated) return null
    return <ChalkSource source={source} ctx={ctx} x={align === "center" ? x + w / 2 : x} top={top ?? SOURCE.top} foot={foot ?? SOURCE.foot} align={align} note={note} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole page, which it sets by its board's coordinates. */
export function chalkboardBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under the title and over the source. */
export function chalkboardBodyRect(): ContentRect {
  return { x: CHALK_LEFT, y: BODY.top, w: CHALK_W, h: BODY.bottom - BODY.top }
}
