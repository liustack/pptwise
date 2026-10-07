import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  SCROLL_META,
  SCROLL_SPEC,
  fitColumnLabel,
  paintColumnLabel,
  scrollBaseline,
  scrollInks,
  scrollMeta,
  scrollText,
  type ClaimColumn,
} from "./compositions/scroll"

/*
 * The scroll frame: what every ink content page wears, settled on ink's
 * 2026-10 board (`design/rounds/2026-10-07-ink/`).
 *
 * The page is hung as a scroll. Two hairlines run down it at x70 and x1210,
 * the scroll's edges (the motif's). In the right margin the hall and the
 * date stand upright, 13px in the taupe, tracked 6px (the deck's
 * `organization` and the footer's `label`, the motif's); in the left margin
 * the volume the page belongs to stands upright in cinnabar, 15px in the
 * heading face, tracked 8px (the page's `kicker`, 「卷之一」「先看名录」, the
 * face's). In a Latin deck both are turned a quarter to read from the top.
 *
 * The claim is set in the heading face at 34px in the ink, on one line
 * across the whole measure (x110 to x1170) whenever it fits, a point or two
 * smaller if that keeps it there, and broken at a comma or a colon when it
 * does not; its last line stands on y152, so a
 * claim of one line and a claim of two end on the same line. Beside a
 * photograph that runs the height of the page it takes the column beside
 * it, larger. The source stands at the foot from
 * y648, 11/15 in the grey. The folio, the page number at the bottom right
 * against the right edge, is the motif's.
 */

export const SCROLL_LEFT = 110
export const SCROLL_RIGHT = 1170
export const SCROLL_W = SCROLL_RIGHT - SCROLL_LEFT

/** The scroll's two edges. */
export const EDGES = { left: 70, right: 1210, top: 40, bottom: 680, w: 1 } as const

/** The right margin: the hall and the date, from y48 in a 30px column at x1222. */
export const HALL = { box: { x: 1222, w: 30 }, top: 48, length: 600, size: 13, tracking: 6, latinTracking: 1 } as const
/** The left margin: the volume, from y48 in a 30px column at x30. */
export const VOLUME = { box: { x: 30, w: 30 }, top: 48, length: 600, size: 15, tracking: 8, latinTracking: 1.5 } as const

/**
 * The claim: 34px, its last line's 46px box ending on y152. It gives up at
 * most a twentieth of its size to stay on one line before it breaks.
 */
export const CLAIM = { size: 34, oneLineFloor: 0.95, lineHeight: 46, foot: 152, minPt: 26, maxLines: 2 } as const

/** Where the body band a composition is handed starts: the top of the claim's box. */
export const SCROLL_BAND_TOP = 56
/** Where a body set under the claim by the ordinary renderer starts. */
export const SCROLL_BODY_TOP = 190
const BODY_BOTTOM = 640
/** The source: 11/15 in the grey from y648, one line or two. */
export const SOURCE = { top: 648, size: 11, lineHeight: 15, maxLines: 2 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const SCROLL_HEAD_FIT = { maxWidth: SCROLL_W, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.minPt, bold: false, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The margins ─────────────────────────────────────────────────────────

/** The volume the page belongs to, down the left margin in cinnabar, or a declared drop when it is too long. */
export function ScrollVolume({ text, ctx }: { text: string | null | undefined; ctx: ComponentCtx }): React.ReactElement | null {
  const words = text ? stripEmphasis(text).trim() : ""
  if (!words) return null
  const label = fitColumnLabel(words, { size: VOLUME.size, tracking: VOLUME.tracking, length: VOLUME.length, lineHeight: VOLUME.box.w, maxColumns: 1, latinTracking: VOLUME.latinTracking }, ctx)
  if (!label) return <g data-dropped={1} data-dropped-kind="label" />
  const inks = scrollInks(ctx)
  return <g data-scroll-volume={words}>{paintColumnLabel(label, { ctx, right: VOLUME.box.x + VOLUME.box.w, top: VOLUME.top, fill: scrollText(inks.cinnabar, inks.ground, VOLUME.size), attrs: { ...SCROLL_SPEC } })}</g>
}

/** The hall and the date down the right margin in the taupe, or a declared drop when they are too long. */
export function ScrollHall({ text, ctx, x = HALL.box.x, top = HALL.top, size = HALL.size, length = HALL.length }: { text: string | null | undefined; ctx: ComponentCtx; x?: number; top?: number; size?: number; length?: number }): React.ReactElement | null {
  const words = text ? stripEmphasis(text).trim() : ""
  if (!words) return null
  const label = fitColumnLabel(words, { size, tracking: HALL.tracking, length, lineHeight: HALL.box.w, maxColumns: 1, latinTracking: HALL.latinTracking, serif: false }, ctx)
  if (!label) return <g data-dropped={1} data-dropped-kind="label" />
  const inks = scrollInks(ctx)
  return <g data-scroll-hall={words}>{paintColumnLabel(label, { ctx, right: x + HALL.box.w, top, fill: scrollMeta(inks.taupe, inks.ground), attrs: { ...SCROLL_SPEC, ...SCROLL_META } })}</g>
}

// ── The claim ───────────────────────────────────────────────────────────

/**
 * The claim fitted to a column of `width` at `size`: on one line whenever it
 * fits, down to 95% of its size, and otherwise on two lines broken at the
 * last comma or colon that lets both fit, as a memo types its title. A claim
 * the author broke in two keeps the author's break.
 */
export function fitScrollClaim(heading: string | undefined, ctx: ComponentCtx, width: number = SCROLL_W, size: number = CLAIM.size): EmphasisHeadingLayout {
  const plain = stripEmphasis(heading ?? "").trim()
  const floor = Math.round(size * CLAIM.oneLineFloor)
  // A line break the author wrote is where the claim breaks: each part on a line of its own, at the largest size that holds both.
  const parts = (heading ?? "").split(/\n+/u).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 2) {
    for (let s = size; s >= CLAIM.minPt; s -= 1) {
      const fitted = parts.map((part) => fitMemoTitle(part, { maxWidth: width, fontSize: s, minPt: s, lineHeight: CLAIM.lineHeight, fontFamily: ctx.fonts.heading, bold: false }))
      if (fitted.every((f) => f.lines.length === 1 && !f.truncated)) {
        return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), lineHeight: CLAIM.lineHeight }
      }
    }
  }
  if (plain && !plain.includes("\n")) {
    const units = measureTextUnits(plain, { fontFamily: ctx.fonts.heading, bold: false })
    for (let s = size; s >= floor; s -= 1) {
      if (units * s <= width) return fitMemoTitle(heading, { maxWidth: width, fontSize: s, minPt: s, lineHeight: CLAIM.lineHeight, fontFamily: ctx.fonts.heading, bold: false })
    }
  }
  const layout = fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: CLAIM.minPt, lineHeight: CLAIM.lineHeight, fontFamily: ctx.fonts.heading, bold: false })
  return { ...layout, lineHeight: CLAIM.lineHeight }
}

/** The claim painted in its column with its last line's box ending on `foot`. A claim too long for two lines is cut and says so. */
export function ScrollClaim({ heading, ctx, x = SCROLL_LEFT, width = SCROLL_W, foot = CLAIM.foot, layout }: { heading: string | undefined; ctx: ComponentCtx; x?: number; width?: number; foot?: number; layout?: EmphasisHeadingLayout }): React.ReactElement {
  const inks = scrollInks(ctx)
  const title = layout ?? fitScrollClaim(heading, ctx, width)
  const ink = scrollText(inks.ink, inks.ground, title.fontSize)
  const first = scrollBaseline(foot - CLAIM.lineHeight * title.lines.length, CLAIM.lineHeight, title.fontSize, true)
  return (
    <g data-scroll-claim="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "400", fontFamily: ctx.fonts.heading, bold: false, bg: inks.ground }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={x}
          y={first + i * CLAIM.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/**
 * The claim a composition places in a column of its own, or `null` when it
 * would not fit that column whole: the composition then declines the page.
 * A column beside a photograph names the claim's size and its foot.
 */
export function scrollClaimIn(heading: string | undefined, ctx: ComponentCtx): (column: ClaimColumn) => React.ReactElement | null {
  return ({ x, w, size, foot }) => {
    if (!stripEmphasis(heading ?? "").trim()) return null
    const layout = fitScrollClaim(heading, ctx, w, size ?? CLAIM.size)
    if (layout.truncated) return null
    return <ScrollClaim heading={heading} ctx={ctx} x={x} width={w} foot={foot ?? CLAIM.foot} layout={layout} />
  }
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when it does not fit. */
export function fitScrollSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SCROLL_W): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, maxLines: number) =>
    fitEmphasisText(text, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, SOURCE.maxLines), lineHeight: SOURCE.lineHeight }
  const first = fit(parts[0]!, 1)
  const second = fit(parts.slice(1).join(" "), 1)
  return { ...first, lines: [...first.lines, ...second.lines], segments: [...first.segments, ...second.segments], lineHeight: SOURCE.lineHeight, truncated: first.truncated || second.truncated }
}

export function ScrollSource({ source, ctx, x = SCROLL_LEFT }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = scrollInks(ctx)
  const ink = scrollMeta(inks.muted, inks.ground)
  return (
    <g data-scroll-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...SCROLL_SPEC}
          {...SCROLL_META}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={x}
          y={scrollBaseline(SOURCE.top + i * SOURCE.lineHeight, SOURCE.lineHeight, SOURCE.size)}
          fontFamily={ctx.fonts.body}
          fontSize={SOURCE.size}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/**
 * The source a composition places under a column of its own, or `undefined`
 * when the page has none. The placer answers `null` when the source would
 * not fit the column whole.
 */
export function scrollSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: { x: number; w: number }) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w }) => {
    const source = fitScrollSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <ScrollSource source={source} ctx={ctx} x={x} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the measure from the top of the claim's box down to the source. */
export function scrollBandRect(): ContentRect {
  return { x: SCROLL_LEFT, y: SCROLL_BAND_TOP, w: SCROLL_W, h: BODY_BOTTOM - SCROLL_BAND_TOP }
}

/** The band the ordinary renderer sets a body in, under the claim. */
export function scrollBodyRect(): ContentRect {
  return { x: SCROLL_LEFT, y: SCROLL_BODY_TOP, w: SCROLL_W, h: BODY_BOTTOM - SCROLL_BODY_TOP }
}
