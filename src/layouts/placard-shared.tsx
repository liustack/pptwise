import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import type { DeckFooter } from "../render/footer-marks"
import { fitLineupClaim } from "./lineup-shared"
import {
  PLACARD_META,
  PLACARD_SPEC,
  paintPlacard,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardInks,
  placardMeta,
  placardText,
  placardTrackedWidth,
  type PlacardClaimColumn,
  type PlacardSourceColumn,
} from "./compositions/placard"

/*
 * The gallery's frame: what every museum page wears, settled on museum's
 * 2026-10 board (`design/rounds/2026-10-08-museum/`).
 *
 * At the top left the hall the page stands in, small, copper and tracked
 * wide (the page's `kicker`, 「第一展厅 · 月球正面的土」), a seam across the
 * page under it on y58. At the bottom left the talk's own label, small and
 * dim (the deck's `organization` and the footer's `label`), and at the
 * bottom right the page number in the serif inside a small frame, like the
 * plate on a gallery's door. The claim in the heading serif at its regular
 * weight, 32/44, across the whole measure (x64 to x1216), on one line
 * whenever it fits, a point or two smaller if that keeps it there, broken at
 * a comma or a colon when it does not, its last line ending on y154. The
 * source small and dim from y630.
 */

export const PLACARD_LEFT = 64
export const PLACARD_RIGHT = 1216
export const PLACARD_W = PLACARD_RIGHT - PLACARD_LEFT

/** The hall sign: 11px copper tracked 4px in an 18px line from y34, the seam on y58. */
export const HALL = { top: 34, lineHeight: 18, size: 11, tracking: 4, rule: 58, ruleW: 1, w: 1000 } as const

/** The talk's label at the bottom left: 10px tracked 2px in an 18px line from y678. The door plate: a 60 by 28 frame at x1156, y672, the number 14px in the serif. */
export const FOOT = { label: { top: 678, lineHeight: 18, size: 10, tracking: 2, w: 1000 }, plate: { x: 1156, y: 672, w: 60, h: 28, size: 14, lineHeight: 26 } } as const

/** The claim: 32/44 in the heading serif across x64 to x1216, its last line's box ending on y154. */
export const CLAIM = { x: PLACARD_LEFT, w: PLACARD_W, size: 32, lineHeight: 44, foot: 154, maxLines: 2 } as const

/** The source: 10/15 in the dim from y630, one line or two. */
export const SOURCE = { x: PLACARD_LEFT, top: 630, w: 1100, size: 10, lineHeight: 15, maxLines: 2 } as const

/** Where a body set under the claim by the ordinary renderer starts and ends. */
export const BODY = { top: 190, bottom: 616 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const PLACARD_HEAD_FIT = { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: 26, bold: false, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The hall sign and the door plate ────────────────────────────────────

/** The talk's label at the bottom left: the deck's organization and its footer label, joined by a middle dot. */
export function placardLabel(footer: Pick<DeckFooter, "organization" | "label" | "notice">): string {
  return [footer.organization, footer.label, footer.notice]
    .map((part) => (part ? stripEmphasis(part).trim() : ""))
    .filter(Boolean)
    .join(" · ")
}

/** The hall sign at the top left and the seam under it. A sign too long for the page is declared dropped. */
export function PlacardHall({ ctx, hall, rule = true }: { ctx: ComponentCtx; hall?: string | null; rule?: boolean }): React.ReactElement {
  const inks = placardInks(ctx)
  const words = hall ? stripEmphasis(hall).trim() : ""
  const fits = !words || placardTrackedWidth(words, HALL.size, HALL.tracking, ctx) <= HALL.w
  return (
    <g data-placard-hall="">
      {words && fits ? <g data-placard-hall-sign={words}>{paintPlacardTracked({ ctx, text: words, x: PLACARD_LEFT, y: placardBaseline(HALL.top, HALL.lineHeight, HALL.size), size: HALL.size, tracking: HALL.tracking, fill: placardText(inks.copper, inks.ground, HALL.size) })}</g> : null}
      {words && !fits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {rule ? paintPlacardRule(PLACARD_LEFT, PLACARD_RIGHT, HALL.rule, inks.line, HALL.ruleW) : null}
    </g>
  )
}

/** The talk's label at the bottom left, the door plate with the page number at the bottom right, and the marks before the label. */
export function PlacardFoot({ ctx, label, folio, marks }: { ctx: ComponentCtx; label?: string | null; folio?: number | null; marks?: string | null }): React.ReactElement {
  const inks = placardInks(ctx)
  const words = [label, marks].map((part) => (part ? stripEmphasis(part).trim() : "")).filter(Boolean).join(" · ")
  const fits = !words || placardTrackedWidth(words, FOOT.label.size, FOOT.label.tracking, ctx) <= FOOT.label.w
  const plate = FOOT.plate
  return (
    <g data-placard-foot="">
      {words && fits ? <g data-placard-label={words}>{paintPlacardTracked({ ctx, text: words, x: PLACARD_LEFT, y: placardBaseline(FOOT.label.top, FOOT.label.lineHeight, FOOT.label.size), size: FOOT.label.size, tracking: FOOT.label.tracking, fill: placardMeta(inks.dim, inks.ground), attrs: { ...PLACARD_META } })}</g> : null}
      {words && !fits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {folio != null ? (
        <g data-placard-plate="">
          <rect x={plate.x + 0.5} y={plate.y + 0.5} width={plate.w - 1} height={plate.h - 1} fill="none" stroke={inks.line} strokeWidth={1} />
          <text {...PLACARD_SPEC} {...PLACARD_META} data-field={SLIDE_NUMBER_FIELD} x={plate.x + plate.w / 2} y={placardBaseline(plate.y + 1, plate.lineHeight, plate.size, true)} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={plate.size} fill={placardMeta(inks.muted, inks.ground)} dominantBaseline="alphabetic">
            {String(folio)}
          </text>
        </g>
      ) : null}
    </g>
  )
}

// ── The claim ───────────────────────────────────────────────────────────

/** The claim painted from its column, its last line's box ending on `foot`, or centred on the column when `align` is `"center"`. */
export function PlacardClaim({ ctx, layout, column }: { ctx: ComponentCtx; layout: EmphasisHeadingLayout; column: PlacardClaimColumn }): React.ReactElement {
  const inks = placardInks(ctx)
  const lineHeight = column.lineHeight ?? CLAIM.lineHeight
  const foot = column.foot ?? CLAIM.foot
  const center = column.align === "center"
  return (
    <g data-placard-claim="">
      {paintPlacard(layout, { ctx, x: center ? column.x + column.w / 2 : column.x, anchor: center ? "middle" : undefined, top: foot - lineHeight * layout.lines.length, fill: placardText(inks.ink, inks.ground, layout.fontSize), serif: true })}
    </g>
  )
}

/** The claim fitted to a column: one line whenever it fits, a point or two smaller to stay there, else two lines broken at a comma or a colon. */
export function fitPlacardClaim(heading: string | undefined, ctx: ComponentCtx, column: PlacardClaimColumn): EmphasisHeadingLayout {
  return fitLineupClaim(heading, ctx, column.w, column.size ?? CLAIM.size, column.lineHeight ?? CLAIM.lineHeight, column.maxLines ?? CLAIM.maxLines)
}

/** The claim a composition places in a column of its own, or `null` when it would not fit that column whole. */
export function placardClaimIn(slide: Pick<Slide, "heading">, ctx: ComponentCtx): (column: PlacardClaimColumn) => React.ReactElement | null {
  return (column) => {
    if (!stripEmphasis(slide.heading ?? "").trim()) return null
    const layout = fitPlacardClaim(slide.heading, ctx, column)
    if (layout.truncated || layout.lines.length > (column.maxLines ?? CLAIM.maxLines)) return null
    return <PlacardClaim ctx={ctx} layout={layout} column={column} />
  }
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitPlacardSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w, lineHeight: number = SOURCE.lineHeight): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, maxLines: number) =>
    fitEmphasisText(text, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines, lineHeightRatio: lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, SOURCE.maxLines), lineHeight }
  const first = fit(parts[0]!, 1)
  const second = fit(parts.slice(1).join(" "), 1)
  return { ...first, lines: [...first.lines, ...second.lines], segments: [...first.segments, ...second.segments], lineHeight, truncated: first.truncated || second.truncated }
}

export function PlacardSource({ source, ctx, x = SOURCE.x, top = SOURCE.top, align, ground }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number; align?: "center"; ground?: string }): React.ReactElement | null {
  if (!source) return null
  const inks = placardInks(ctx)
  const on = ground ?? inks.ground
  return <g data-placard-source="">{paintPlacard(source, { ctx, x, anchor: align === "center" ? "middle" : undefined, top, fill: placardMeta(inks.dim, on), ground: on, attrs: { ...PLACARD_SPEC, ...PLACARD_META }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}</g>
}

/** The source a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it would not fit. */
export function placardSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: PlacardSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top, align, lineHeight, ground }) => {
    const source = fitPlacardSource(slide, ctx, w, lineHeight)
    if (!source || source.truncated) return null
    return <PlacardSource source={source} ctx={ctx} x={align === "center" ? x + w / 2 : x} top={top ?? SOURCE.top} align={align} ground={ground} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole page, which it sets by its board's coordinates. */
export function placardBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under the claim. */
export function placardBodyRect(): ContentRect {
  return { x: PLACARD_LEFT, y: BODY.top, w: PLACARD_W, h: BODY.bottom - BODY.top }
}
