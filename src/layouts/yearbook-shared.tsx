import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { fitDossierTitle } from "./dossier-shared"
import {
  paintYearbookTracked,
  yearbookBaseline,
  yearbookInks,
  yearbookMeta,
  yearbookText,
  YearStrip,
  YEARBOOK_SPEC,
} from "./compositions/yearbook"

/*
 * The yearbook frame: the head every almanac content page wears and the
 * source line under its body. Settled on almanac's 2026-10 board
 * (`design/rounds/2026-10-05-almanac/`).
 *
 * The page is one year in a long run. The sprout at the top left and the
 * folio at the foot belong to the motif (`motifs/motif-almanac-motif.tsx`).
 * The face sets the rest: the section's label right of the sprout (the
 * page's `kicker`, 13px bold in the mark, its characters 2px apart); at the
 * top right the run of years the deck follows with the page's own years lit
 * (the page's `years`, `YearStrip`); the claim bold at 30/42 across the
 * 1152px measure from x64, at most two lines, its last line ending at y154
 * so one line and two end on the same baseline, wrapping only when it does
 * not fit and then at a comma; a 1px hairline under it at y166; the body
 * from y186 to y640; and the source at 12/16 in the muted ink from y648, up
 * to two lines, with the `yearbook-spec` exemption the L1 audit knows.
 */

export const YEARBOOK_LEFT = 64
export const YEARBOOK_RIGHT = 1216
export const YEARBOOK_W = YEARBOOK_RIGHT - YEARBOOK_LEFT
/** The section label right of the motif's sprout. */
const SECTION = { x: 90, top: 24, size: 13, lineHeight: 20, tracking: 2 } as const
/** The claim's box: up to two 42px lines whose last line box ends at y154. */
const HEAD = { size: 30, lineHeight: 42, foot: 154, minPt: 26 } as const
const RULE = { y: 166 } as const
export const YEARBOOK_BODY_TOP = 186
export const YEARBOOK_BODY_BOTTOM = 640
const SOURCE = { top: 648, size: 12, lineHeight: 16, maxLines: 2 } as const

/** The heading fit `YearbookHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const YEARBOOK_HEAD_FIT = { maxWidth: YEARBOOK_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The section label: the page's `kicker`, tracked, in the mark, at `x` on the line whose top is `top`. */
export function YearbookSection({ slide, ctx, x = SECTION.x, top = SECTION.top, size = SECTION.size, lineHeight = SECTION.lineHeight }: { slide: Pick<Slide, "kicker">; ctx: ComponentCtx; x?: number; top?: number; size?: number; lineHeight?: number }): React.ReactElement | null {
  const label = slide.kicker?.trim()
  if (!label) return null
  const inks = yearbookInks(ctx)
  return (
    <g data-yearbook-section="">
      {paintYearbookTracked({
        ctx,
        text: label,
        x,
        y: yearbookBaseline(top, lineHeight, size),
        size,
        tracking: SECTION.tracking,
        bold: true,
        fill: yearbookText(inks.mark, inks.ground, size),
      })}
    </g>
  )
}

/**
 * The section label, the strip of years, the claim on its last line, and
 * the hairline under it. A claim too long for two lines shrinks toward 26px
 * and is then cut with `data-truncated` on its last line.
 */
export function YearbookHead({ slide, ctx }: { slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  const inks = yearbookInks(ctx)
  const title = fitDossierTitle(slide.heading, ctx, HEAD.size, HEAD.lineHeight, HEAD.minPt, YEARBOOK_W)
  const ink = yearbookText(inks.ink, inks.ground, title.fontSize)
  const last = yearbookBaseline(HEAD.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-yearbook-head="">
      <YearbookSection slide={slide} ctx={ctx} />
      {slide.years ? <YearStrip years={slide.years} ctx={ctx} /> : null}
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={YEARBOOK_LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={YEARBOOK_LEFT} y={RULE.y} width={YEARBOOK_W} height={1} fill={inks.line} />
    </g>
  )
}

/** The subheading, when a page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

/** The subheading as muted lines at the body's top, and how far it moves the body down. */
export function fitYearbookStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, {
    maxWidth: YEARBOOK_W,
    fontSize: STANDFIRST.size,
    minPt: STANDFIRST.size,
    maxLines: STANDFIRST.maxLines,
    lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function YearbookStandfirst({ standfirst, ctx }: { standfirst: ReturnType<typeof fitYearbookStandfirst>; ctx: ComponentCtx }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = yearbookInks(ctx)
  const ink = yearbookText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-yearbook-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={YEARBOOK_LEFT}
          y={yearbookBaseline(YEARBOOK_BODY_TOP + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

export interface YearbookSourceLayout {
  layout: EmphasisHeadingLayout
  top: number
}

/** The source fitted in up to two lines from y648, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitYearbookSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): YearbookSourceLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  const layout = fitEmphasisText(source, {
    maxWidth: YEARBOOK_W,
    fontSize: SOURCE.size,
    minPt: SOURCE.size,
    maxLines: SOURCE.maxLines,
    lineHeightRatio: SOURCE.lineHeight / SOURCE.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  return { layout, top: SOURCE.top }
}

/** The source as the author wrote it, 12/16 in the muted ink. */
export function YearbookSource({ source, ctx }: { source: YearbookSourceLayout | null; ctx: ComponentCtx }): React.ReactElement | null {
  if (!source) return null
  const inks = yearbookInks(ctx)
  const ink = yearbookMeta(inks.muted, inks.ground)
  const { layout } = source
  return (
    <g data-yearbook-source="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...YEARBOOK_SPEC}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={YEARBOOK_LEFT}
          y={yearbookBaseline(source.top + i * SOURCE.lineHeight, SOURCE.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from y186 (or under the page's subheading) down to y640. */
export function yearbookBodyRect(top = YEARBOOK_BODY_TOP): ContentRect {
  return { x: YEARBOOK_LEFT, y: top, w: YEARBOOK_W, h: YEARBOOK_BODY_BOTTOM - top }
}
