import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  KEYNOTE_META,
  KEYNOTE_SPEC,
  keynoteBaseline,
  keynoteInks,
  keynoteMeta,
  keynoteText,
  keynoteTrackedWidth,
  keynoteWidth,
  paintKeynote,
  paintKeynoteRule,
  paintKeynoteTracked,
  type KeynoteClaimColumn,
  type KeynoteKickerColumn,
  type KeynoteSourceColumn,
} from "./compositions/keynote"

/*
 * The stage's frame: what every stage page wears, settled on stage's 2026-10
 * board (`design/rounds/2026-10-08-stage/`).
 *
 * Along the foot of every page the presenter's clicker: a 2px track from x64
 * to x1096 on y676, the part of the talk already given (this page over all
 * of them) in silver, and the count at its end, 「5 / 18」. At the top left of
 * an ordinary content page the chapter it belongs to, small, tracked wide in
 * the sand (the page's `kicker`, 「第一章 出海」). The claim bold at 40/50
 * across the whole measure from y76, on one line whenever it fits, a point or
 * two smaller if that keeps it there. The source small and dim over the
 * clicker, one line or two.
 */

export const KEYNOTE_LEFT = 64
export const KEYNOTE_RIGHT = 1216
export const KEYNOTE_W = KEYNOTE_RIGHT - KEYNOTE_LEFT

/** The chapter: 12px in the sand tracked 4px in an 18px line from y40. */
export const KICKER = { x: KEYNOTE_LEFT, top: 40, size: 12, lineHeight: 18, tracking: 4, w: 900 } as const

/** The claim: 40/50 bold across x64 to x1216 from y76. A board that runs it on two lines does so by the author's break. */
export const CLAIM = { x: KEYNOTE_LEFT, w: KEYNOTE_W, top: 76, size: 40, lineHeight: 50, maxLines: 2, oneLineFloor: 11 / 12, minPt: 32 } as const

/** The source: 11/16 in the dim from y626, one line or two, its last line ending by y664. */
export const SOURCE = { x: KEYNOTE_LEFT, top: 626, w: KEYNOTE_W, size: 11, lineHeight: 16, maxLines: 2, foot: 664 } as const

/** The clicker: the track on y676 from x64 to x1096, 2px, and the count 12px tracked 1px in a 20px line from y666, ending at x1216. */
export const CLICKER = { y: 676, x1: KEYNOTE_LEFT, x2: 1096, stroke: 2, count: { right: KEYNOTE_RIGHT, top: 666, size: 12, lineHeight: 20, tracking: 1 } } as const

/** Where a body set under the claim by the ordinary renderer starts and ends. */
export const BODY = { top: 160, bottom: 610, gap: 34 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const KEYNOTE_HEAD_FIT = { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.minPt, bold: true, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The clicker ─────────────────────────────────────────────────────────

/**
 * The presenter's clicker along the foot: the track, the part of the talk
 * given in silver (this page's place over the deck's length), and the count.
 * The number is PowerPoint's slide-number field, so it keeps counting when a
 * page moves. The count is drawn only when the deck asks for page numbers.
 * `light` is the track over a photograph, the paper white a quarter strong.
 */
export function KeynoteClicker({ ctx, place, total, count, light = false }: { ctx: ComponentCtx; place: number; total: number; count: boolean; light?: boolean }): React.ReactElement {
  const inks = keynoteInks(ctx)
  const done = CLICKER.x1 + ((CLICKER.x2 - CLICKER.x1) * Math.min(place, total)) / Math.max(1, total)
  const c = CLICKER.count
  const y = keynoteBaseline(c.top, c.lineHeight, c.size)
  const fill = keynoteMeta(inks.muted, inks.ground)
  const rest = `/ ${total}`
  const restX = c.right - keynoteTrackedWidth(rest, c.size, c.tracking, ctx, { bold: false })
  const space = keynoteWidth(" ", c.size, ctx) + c.tracking
  return (
    <g data-keynote-clicker="">
      {light ? (
        <rect x={CLICKER.x1} y={CLICKER.y - CLICKER.stroke / 2} width={CLICKER.x2 - CLICKER.x1} height={CLICKER.stroke} fill={inks.ink} fillOpacity={0.25} />
      ) : (
        paintKeynoteRule(CLICKER.x1, CLICKER.x2, CLICKER.y, inks.track, CLICKER.stroke)
      )}
      <g data-keynote-progress={`${place}/${total}`}>{paintKeynoteRule(CLICKER.x1, done, CLICKER.y, inks.silver, CLICKER.stroke)}</g>
      {count ? (
        <g data-keynote-count="">
          <text {...KEYNOTE_SPEC} {...KEYNOTE_META} data-field={SLIDE_NUMBER_FIELD} x={restX - space} y={y} textAnchor="end" fontFamily={ctx.fonts.body} fontSize={c.size} fill={fill} dominantBaseline="alphabetic">
            {String(place)}
          </text>
          {paintKeynoteTracked({ ctx, text: rest, x: restX, y, size: c.size, tracking: c.tracking, fill, attrs: { ...KEYNOTE_META } })}
        </g>
      ) : null}
    </g>
  )
}

// ── The chapter ────────────────────────────────────────────────────────

/** The chapter tracked from `column`'s left, or `null` when it does not fit its room. */
export function KeynoteKicker({ ctx, text, column }: { ctx: ComponentCtx; text: string; column: KeynoteKickerColumn }): React.ReactElement | null {
  const words = stripEmphasis(text).trim()
  if (!words || keynoteTrackedWidth(words, KICKER.size, KICKER.tracking, ctx) > column.w) return null
  const inks = keynoteInks(ctx)
  return (
    <g data-keynote-kicker={words}>
      {paintKeynoteTracked({ ctx, text: words, x: column.x, y: keynoteBaseline(column.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: keynoteText(inks.muted, inks.ground, KICKER.size) })}
    </g>
  )
}

/** The chapter a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it does not fit. */
export function keynoteKickerIn(slide: Pick<Slide, "kicker">, ctx: ComponentCtx): ((column: KeynoteKickerColumn) => React.ReactElement | null) | undefined {
  if (!stripEmphasis(slide.kicker ?? "").trim()) return undefined
  return (column) => <KeynoteKicker ctx={ctx} text={slide.kicker ?? ""} column={column} />
}

// ── The claim ───────────────────────────────────────────────────────────

/**
 * The claim fitted bold to a column of `width` at `size`: the author's own
 * break kept, each part on a line of its own. Otherwise on one line whenever
 * it fits, down to a twelfth under its size. Otherwise on lines broken at the
 * last comma or colon that lets both fit.
 */
export function fitKeynoteClaim(heading: string | undefined, ctx: Pick<ComponentCtx, "fonts">, width: number = CLAIM.w, size: number = CLAIM.size, lineHeight: number = CLAIM.lineHeight, maxLines: number = CLAIM.maxLines, minPt: number = Math.round(size * CLAIM.oneLineFloor)): EmphasisHeadingLayout {
  const plain = stripEmphasis(heading ?? "").trim()
  const fontFamily = ctx.fonts.heading
  const parts = (heading ?? "").split(/\n+/u).map((part) => part.trim()).filter(Boolean)
  const floor = Math.min(size, minPt)
  // A break the author wrote is kept: a claim broken into more parts than the column takes lines does not fit it.
  if (parts.length > maxLines) return { ...fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: size, lineHeight, fontFamily, bold: true }), lineHeight, truncated: true }
  if (parts.length > 1) {
    for (let s = size; s >= floor; s -= 1) {
      const fitted = parts.map((part) => fitMemoTitle(part, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily, bold: true }))
      if (fitted.every((f) => f.lines.length === 1 && !f.truncated)) {
        return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), fontSize: s, lineHeight }
      }
    }
    return { ...fitMemoTitle(parts.join(" "), { maxWidth: width, fontSize: size, minPt: size, lineHeight, fontFamily, bold: true }), lineHeight, truncated: true }
  }
  if (plain) {
    const units = measureTextUnits(plain, { fontFamily, bold: true })
    for (let s = size; s >= floor; s -= 1) {
      if (units * s <= width) return { ...fitMemoTitle(heading, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily, bold: true }), lineHeight }
    }
  }
  const layout = fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: size, lineHeight, fontFamily, bold: true })
  return { ...layout, lineHeight, truncated: layout.truncated || layout.lines.length > maxLines }
}

/** Whether the board sets the claim in `column` at its regular weight: a quieter lead-in, or a line under a figure. */
function regularClaim(column: KeynoteClaimColumn): boolean {
  return column.tone === "muted" || column.weight === "regular"
}

/** The claim painted from its column, its first line's box from `top`, centred on the column when `align` is `"center"`. */
export function KeynoteClaim({ ctx, layout, column }: { ctx: ComponentCtx; layout: EmphasisHeadingLayout; column: KeynoteClaimColumn }): React.ReactElement {
  const inks = keynoteInks(ctx)
  const center = column.align === "center"
  const ink = column.tone === "muted" ? inks.muted : inks.ink
  return (
    <g data-keynote-claim="">
      {paintKeynote(layout, { ctx, x: center ? column.x + column.w / 2 : column.x, anchor: center ? "middle" : undefined, top: column.top ?? CLAIM.top, fill: keynoteText(ink, inks.ground, layout.fontSize), serif: true, bold: !regularClaim(column) })}
    </g>
  )
}

/** The claim fitted to a column of its own, or `null` when it would not fit that column whole. */
export function fitKeynoteClaimIn(heading: string | undefined, ctx: Pick<ComponentCtx, "fonts">, column: KeynoteClaimColumn): EmphasisHeadingLayout | null {
  if (!stripEmphasis(heading ?? "").trim()) return null
  const size = column.size ?? CLAIM.size
  const lineHeight = column.lineHeight ?? CLAIM.lineHeight
  const maxLines = column.maxLines ?? 1
  const layout =
    regularClaim(column)
      ? fitEmphasisText(heading, { maxWidth: column.w, fontSize: size, minPt: size, maxLines, lineHeightRatio: lineHeight / size, fontFamily: ctx.fonts.heading, bold: false })
      : fitKeynoteClaim(heading, ctx, column.w, size, lineHeight, maxLines, column.minPt)
  if (layout.truncated || layout.lines.length > maxLines) return null
  return { ...layout, lineHeight }
}

/** The claim a composition places in a column of its own, or `null` when it would not fit that column whole. */
export function keynoteClaimIn(slide: Pick<Slide, "heading">, ctx: ComponentCtx): (column: KeynoteClaimColumn) => React.ReactElement | null {
  return (column) => {
    const layout = fitKeynoteClaimIn(slide.heading, ctx, column)
    return layout ? <KeynoteClaim ctx={ctx} layout={layout} column={column} /> : null
  }
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitKeynoteSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w): EmphasisHeadingLayout | null {
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

/** The source from `top`, or risen a line when it takes two and its last line would pass `foot`. Centred on `x` when `align` is `"center"`. */
export function KeynoteSource({ source, ctx, x = SOURCE.x, top = SOURCE.top, foot = SOURCE.foot, align }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number; foot?: number; align?: "center" }): React.ReactElement | null {
  if (!source) return null
  const inks = keynoteInks(ctx)
  const from = Math.min(top, foot - source.lines.length * source.lineHeight)
  return <g data-keynote-source="">{paintKeynote(source, { ctx, x, anchor: align === "center" ? "middle" : undefined, top: from, fill: keynoteMeta(inks.dim, inks.ground), attrs: { ...KEYNOTE_SPEC, ...KEYNOTE_META }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}</g>
}

/** The source a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it would not fit. */
export function keynoteSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: KeynoteSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top, foot, align }) => {
    const source = fitKeynoteSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <KeynoteSource source={source} ctx={ctx} x={align === "center" ? x + w / 2 : x} top={top ?? SOURCE.top} foot={foot ?? SOURCE.foot} align={align} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole page, which it sets by its board's coordinates. */
export function keynoteBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under a claim of `claimLines` lines. */
export function keynoteBodyRect(claimLines = 1): ContentRect {
  const top = CLAIM.top + claimLines * CLAIM.lineHeight + BODY.gap
  return { x: KEYNOTE_LEFT, y: top, w: KEYNOTE_W, h: BODY.bottom - top }
}
