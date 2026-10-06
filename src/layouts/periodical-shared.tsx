import type React from "react"
import type { Component, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  cjkOnly,
  paintPeriodicalTracked,
  periodicalBaseline,
  periodicalInks,
  periodicalMeta,
  periodicalText,
  periodicalTrackedWidth,
  PERIODICAL_SPEC,
} from "./compositions/periodical"
import type { Exhibit } from "./manuscript-shared"

/*
 * The periodical frame: the masthead every journal content page wears, the
 * claim under it and the source at its foot. Settled on journal's 2026-10
 * board (`design/rounds/2026-10-07-journal/`).
 *
 * The masthead is a line of small type at the top of the page between two
 * rules: the column's name at the left in the heading serif, bold and
 * tracked (the deck's organization, 「致读者」, the motif's), the page's
 * section in the middle in the accent (the page's `kicker`, 「十年」, the
 * face's), the issue at the right in the grey (the footer's `label`,
 * 「二〇二六年秋 · 年度长信」, the motif's), and under all three a heavy
 * rule on y50 and a hairline on y55 across the type area (the face's). The
 * claim is set in the heading serif, bold at 32/44 in the ink, on one line
 * whenever it fits its column and broken at a comma or a colon when it does
 * not, its last line ending on y158. Its column is the whole measure from
 * x64, or the one a composition gives it beside a photograph. The source
 * stands at the foot on y648, 11/15 in the grey, on one line or two. The
 * folio, 「· 3 ·」 centred at the foot, is the motif's.
 */

export const PERIODICAL_LEFT = 64
export const PERIODICAL_RIGHT = 1216
export const PERIODICAL_W = PERIODICAL_RIGHT - PERIODICAL_LEFT

/** The masthead's line: three texts in an 18px box from y26, over a heavy rule and a hairline. */
export const MASTHEAD = {
  top: 26,
  lineHeight: 18,
  column: { size: 13, tracking: { cjk: 6, latin: 1.5 }, maxW: 400 },
  section: { size: 11, tracking: { cjk: 12, spaced: 4, latin: 2 }, center: 640, maxW: 340 },
  issue: { size: 11, tracking: { cjk: 2, latin: 0.5 }, maxW: 400 },
  heavy: { y: 50, w: 2.2 },
  hair: { y: 55, w: 0.6 },
} as const

/** The claim's box: up to two 44px lines whose last line box ends at y158. */
const CLAIM = { size: 32, lineHeight: 44, foot: 158, minPt: 26, maxLines: 2 } as const
/** Where the body band a composition is handed starts: the top of the claim's box. */
export const PERIODICAL_BAND_TOP = 70
/** Where a body set under the claim starts. */
export const PERIODICAL_BODY_TOP = 186
const BODY_BOTTOM = 640
/** The source: 11/15 in the grey from y648, one line or two. */
export const SOURCE = { top: 648, size: 11, lineHeight: 15, maxLines: 2 } as const
/** The subheading, when a content page carries one: grey lines under the claim. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const PERIODICAL_HEAD_FIT = { maxWidth: PERIODICAL_W, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.minPt, bold: true, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

/** How far apart a run of small masthead type is set: wide for Chinese, as the board sets 「致 读 者」, narrow for Latin. */
function tracking(text: string, by: { cjk: number; latin: number; spaced?: number }): number {
  if (!cjkOnly(text)) return by.latin
  return /\s/u.test(text.trim()) && by.spaced !== undefined ? by.spaced : by.cjk
}

// ── The masthead ────────────────────────────────────────────────────────

/** The heavy rule and the hairline under the masthead, across the type area. */
export function MastheadRules({ ctx }: { ctx: ComponentCtx }): React.ReactElement {
  const inks = periodicalInks(ctx)
  return (
    <g data-periodical-rules="">
      <rect x={PERIODICAL_LEFT} y={MASTHEAD.heavy.y - MASTHEAD.heavy.w / 2} width={PERIODICAL_W} height={MASTHEAD.heavy.w} fill={inks.lead} />
      <rect x={PERIODICAL_LEFT} y={MASTHEAD.hair.y - MASTHEAD.hair.w / 2} width={PERIODICAL_W} height={MASTHEAD.hair.w} fill={inks.lead} />
    </g>
  )
}

/** The column's name at the top left, in the heading serif, bold and tracked, or a declared drop when it is too wide. */
export function MastheadColumn({ text, ctx }: { text: string | null | undefined; ctx: ComponentCtx }): React.ReactElement | null {
  const words = text ? stripEmphasis(text).trim() : ""
  if (!words) return null
  const spec = MASTHEAD.column
  const by = tracking(words, spec.tracking)
  if (periodicalTrackedWidth(words, spec.size, by, ctx, { serif: true, bold: true }) > spec.maxW) return <g data-dropped={1} data-dropped-kind="label" />
  const inks = periodicalInks(ctx)
  return (
    <g data-periodical-column="">
      {paintPeriodicalTracked({ ctx, text: words, x: PERIODICAL_LEFT, y: periodicalBaseline(MASTHEAD.top, MASTHEAD.lineHeight, spec.size, true), size: spec.size, tracking: by, serif: true, bold: true, fill: periodicalText(inks.lead, inks.ground, spec.size) })}
    </g>
  )
}

/** The issue at the top right in the grey, tracked, or a declared drop when it is too wide. */
export function MastheadIssue({ text, ctx }: { text: string | null | undefined; ctx: ComponentCtx }): React.ReactElement | null {
  const words = text ? stripEmphasis(text).trim() : ""
  if (!words) return null
  const spec = MASTHEAD.issue
  const by = tracking(words, spec.tracking)
  const w = periodicalTrackedWidth(words, spec.size, by, ctx)
  if (w > spec.maxW) return <g data-dropped={1} data-dropped-kind="label" />
  const inks = periodicalInks(ctx)
  return (
    <g data-periodical-issue="">
      {paintPeriodicalTracked({ ctx, text: words, x: PERIODICAL_RIGHT - w, y: periodicalBaseline(MASTHEAD.top, MASTHEAD.lineHeight, spec.size), size: spec.size, tracking: by, fill: periodicalText(inks.muted, inks.ground, spec.size) })}
    </g>
  )
}

/** The page's section in the middle of the masthead, bold in the accent, or a declared drop when it is too wide. */
export function MastheadSection({ text, ctx }: { text: string | null | undefined; ctx: ComponentCtx }): React.ReactElement | null {
  const words = text ? stripEmphasis(text).trim() : ""
  if (!words) return null
  const spec = MASTHEAD.section
  const by = tracking(words, spec.tracking)
  const w = periodicalTrackedWidth(words, spec.size, by, ctx, { bold: true })
  if (w > spec.maxW) return <g data-dropped={1} data-dropped-kind="label" />
  const inks = periodicalInks(ctx)
  return (
    <g data-periodical-section={words}>
      {paintPeriodicalTracked({ ctx, text: words, x: spec.center - w / 2, y: periodicalBaseline(MASTHEAD.top, MASTHEAD.lineHeight, spec.size), size: spec.size, tracking: by, bold: true, fill: periodicalText(inks.brick, inks.ground, spec.size) })}
    </g>
  )
}

// ── The claim ───────────────────────────────────────────────────────────

/** The claim fitted to a column of `width`. */
export function fitPeriodicalClaim(heading: string | undefined, ctx: ComponentCtx, width: number = PERIODICAL_W): EmphasisHeadingLayout {
  return fitMemoTitle(heading, { maxWidth: width, fontSize: CLAIM.size, minPt: CLAIM.minPt, lineHeight: CLAIM.lineHeight, fontFamily: ctx.fonts.heading })
}

/** The claim painted in its column with its last line ending on y158. A claim too long for two lines is cut and says so. */
export function PeriodicalClaim({ heading, ctx, x = PERIODICAL_LEFT, width = PERIODICAL_W, layout }: { heading: string | undefined; ctx: ComponentCtx; x?: number; width?: number; layout?: EmphasisHeadingLayout }): React.ReactElement {
  const inks = periodicalInks(ctx)
  const title = layout ?? fitPeriodicalClaim(heading, ctx, width)
  const ink = periodicalText(inks.ink, inks.ground, title.fontSize)
  const first = periodicalBaseline(CLAIM.foot - title.lineHeight, title.lineHeight, title.fontSize, true) - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-periodical-claim="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: inks.ground }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={x}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/**
 * The claim a composition places in a column of its own (beside a
 * photograph), or `null` when it would not fit that column whole: the
 * composition then declines the page.
 */
export function claimIn(heading: string | undefined, ctx: ComponentCtx): (column: { x: number; w: number }) => React.ReactElement | null {
  return ({ x, w }) => {
    if (!stripEmphasis(heading ?? "").trim()) return null
    const layout = fitPeriodicalClaim(heading, ctx, w)
    if (layout.truncated) return null
    return <PeriodicalClaim heading={heading} ctx={ctx} x={x} width={w} layout={layout} />
  }
}

export function fitPeriodicalStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, { maxWidth: PERIODICAL_W, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function PeriodicalStandfirst({ standfirst, ctx }: { standfirst: ReturnType<typeof fitPeriodicalStandfirst>; ctx: ComponentCtx }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = periodicalInks(ctx)
  const ink = periodicalText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-periodical-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={PERIODICAL_LEFT}
          y={periodicalBaseline(PERIODICAL_BODY_TOP + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to the foot: the author's own line breaks kept, two lines at most. */
export function fitPeriodicalSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, maxLines: number) =>
    fitEmphasisText(text, { maxWidth: PERIODICAL_W, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, SOURCE.maxLines), lineHeight: SOURCE.lineHeight }
  const first = fit(parts[0]!, 1)
  const second = fit(parts.slice(1).join(" "), 1)
  return {
    ...first,
    lines: [...first.lines, ...second.lines],
    segments: [...first.segments, ...second.segments],
    lineHeight: SOURCE.lineHeight,
    truncated: first.truncated || second.truncated,
  }
}

export function PeriodicalSource({ source, ctx }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx }): React.ReactElement | null {
  if (!source) return null
  const inks = periodicalInks(ctx)
  const ink = periodicalMeta(inks.muted, inks.ground)
  return (
    <g data-periodical-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...PERIODICAL_SPEC}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={PERIODICAL_LEFT}
          y={periodicalBaseline(SOURCE.top + i * SOURCE.lineHeight, SOURCE.lineHeight, SOURCE.size)}
          fontFamily={ctx.fonts.body}
          fontSize={SOURCE.size}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the type area from the top of the claim's box down to the source. */
export function periodicalBandRect(): ContentRect {
  return { x: PERIODICAL_LEFT, y: PERIODICAL_BAND_TOP, w: PERIODICAL_W, h: BODY_BOTTOM - PERIODICAL_BAND_TOP }
}

/** The band the ordinary renderer sets a body in, under the claim and any standfirst. */
export function periodicalBodyRect(standfirst: ReturnType<typeof fitPeriodicalStandfirst>): ContentRect {
  const top = PERIODICAL_BODY_TOP + (standfirst?.h ?? 0)
  return { x: PERIODICAL_LEFT, y: top, w: PERIODICAL_W, h: BODY_BOTTOM - top }
}

// ── Figures numbered across the deck ───────────────────────────────────

/**
 * What a component counts as on a periodical page: a titled chart or
 * timeline is a figure, a titled table, comparison or grid a table. A
 * photograph only illustrates a page and is never numbered.
 */
export function periodicalExhibitKind(component: Component): Exhibit | null {
  const titled = (title: string | undefined) => Boolean(title?.trim())
  switch (component.type) {
    case "chart":
    case "timeline":
      return titled(component.title) ? "figure" : null
    case "data_table":
    case "comparison":
    case "matrix":
      return titled(component.title) ? "table" : null
    default:
      return null
  }
}
