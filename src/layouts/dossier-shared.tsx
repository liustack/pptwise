import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { fitMemoTitle } from "./compositions/memo"
import { cutOrWhole, type HeadingSet } from "./heading-set"
import {
  chipInk,
  chipWidth,
  dossierBaseline,
  dossierInks,
  dossierMeta,
  dossierText,
  paintChip,
  paintDossierTracked,
  DOSSIER_SPEC,
  CHIP,
} from "./compositions/dossier"

/*
 * The dossier frame: the header every clinic content page wears and the
 * source line under its body. Settled on clinic's 2026-10 board
 * (`design/rounds/2026-10-05-clinic/`).
 *
 * The page is a clinical assessment file. The short heartbeat at the top
 * left, the deck's subject at the top right and the folio at the foot belong
 * to the motif (`motifs/motif-clinic-motif.tsx`). The face sets the rest:
 * the section's label right of the heartbeat (the page's `kicker`, 13px bold
 * in the mark, its characters 2px apart), the claim bold at 30/42 across the
 * 1152px measure from x64, at most two lines, its last line ending at y154
 * so one line and two end on the same baseline, wrapping only when it does
 * not fit and then at a comma; a 1px hairline under it at y166 with a 56 by
 * 3 bar of the mark over its left end; the page's tag (`tag`), the evidence
 * the whole page rests on, as a capsule at the top left of the body; the
 * body from y186 to y640; and the source at 12/16 in the muted ink from
 * y648, up to two lines, with the `dossier-spec` exemption the L1 audit
 * knows.
 */

export const DOSSIER_LEFT = 64
export const DOSSIER_RIGHT = 1216
export const DOSSIER_W = DOSSIER_RIGHT - DOSSIER_LEFT
/** The section label right of the motif's heartbeat. */
const SECTION = { x: 106, top: 28, size: 13, lineHeight: 20, tracking: 2 } as const
/** The claim's box: up to two 42px lines whose last line box ends at y154. */
const HEAD = { size: 30, lineHeight: 42, foot: 154, minPt: 26 } as const
const RULE = { y: 166, bar: { w: 56, h: 3 } } as const
export const DOSSIER_BODY_TOP = 186
export const DOSSIER_BODY_BOTTOM = 640
/** The page's tag: a capsule at the body's top left, and the band it takes there. */
export const DOSSIER_TAG_BAND = 40
const SOURCE = { top: 648, size: 12, lineHeight: 16, maxLines: 2 } as const

/** The heading fit `DossierHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const DOSSIER_HEAD_FIT = { maxWidth: DOSSIER_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The section label: the page's `kicker`, tracked, in the mark. */
export function DossierSection({ slide, ctx }: { slide: Pick<Slide, "kicker">; ctx: ComponentCtx }): React.ReactElement | null {
  const label = slide.kicker?.trim()
  if (!label) return null
  const inks = dossierInks(ctx)
  return (
    <g data-dossier-section="">
      {paintDossierTracked({
        ctx,
        text: label,
        x: SECTION.x,
        y: dossierBaseline(SECTION.top, SECTION.lineHeight, SECTION.size),
        size: SECTION.size,
        tracking: SECTION.tracking,
        bold: true,
        fill: dossierText(inks.mark, inks.ground, SECTION.size),
      })}
    </g>
  )
}

/** The claim fitted the way the board sets it: one line when it fits, else two broken at a comma. */
export function fitDossierTitle(heading: string | undefined, ctx: Pick<ComponentCtx, "fonts">, size: number = HEAD.size, lineHeight: number = HEAD.lineHeight, minPt: number = HEAD.minPt, maxWidth: number = DOSSIER_W): EmphasisHeadingLayout {
  return fitMemoTitle(heading, { maxWidth, fontSize: size, minPt, lineHeight, fontFamily: ctx.fonts.heading })
}

/** The heading set of a face whose title is `fitDossierTitle` over these numbers (`LayoutDefinition.headingSet`). */
export function dossierTitleSet(size: number = HEAD.size, lineHeight: number = HEAD.lineHeight, minPt: number = HEAD.minPt, maxWidth: number = DOSSIER_W): HeadingSet {
  return ({ slide, ctx }) => cutOrWhole(fitDossierTitle(slide.heading, ctx, size, lineHeight, minPt, maxWidth))
}

/**
 * The section label, the claim on its last line, and the rule under it. A
 * claim too long for two lines shrinks toward 26px and is then cut with
 * `data-truncated` on its last line.
 */
export function DossierHead({ slide, ctx }: { slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  const inks = dossierInks(ctx)
  const title = fitDossierTitle(slide.heading, ctx)
  const ink = dossierText(inks.ink, inks.ground, title.fontSize)
  const last = dossierBaseline(HEAD.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-dossier-head="">
      <DossierSection slide={slide} ctx={ctx} />
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={DOSSIER_LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={DOSSIER_LEFT} y={RULE.y} width={DOSSIER_W} height={1} fill={inks.line} />
      <rect x={DOSSIER_LEFT} y={RULE.y - 1} width={RULE.bar.w} height={RULE.bar.h} fill={inks.mark} />
    </g>
  )
}

/** Whether the page's tag fits the band's width. */
export function dossierTagFits(slide: Pick<Slide, "tag">, ctx: ComponentCtx): boolean {
  return !slide.tag || chipWidth(slide.tag.text, ctx) <= DOSSIER_W
}

/** The page's tag as a capsule at the top left of the body, from `top`. */
export function DossierTag({ slide, ctx, top = DOSSIER_BODY_TOP }: { slide: Pick<Slide, "tag">; ctx: ComponentCtx; top?: number }): React.ReactElement | null {
  if (!slide.tag) return null
  const inks = dossierInks(ctx)
  if (!dossierTagFits(slide, ctx)) return <g data-dropped={1} data-dropped-kind="tag" />
  return (
    <g data-dossier-page-tag="">
      {paintChip({ ctx, text: slide.tag.text, ink: chipInk(slide.tag, ctx, inks), x: DOSSIER_LEFT, y: top, ground: inks.ground, height: CHIP.height })}
    </g>
  )
}

/** The subheading, when a page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

/** The subheading as muted lines at the body's top, and how far it moves the body down. */
export function fitDossierStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, {
    maxWidth: DOSSIER_W,
    fontSize: STANDFIRST.size,
    minPt: STANDFIRST.size,
    maxLines: STANDFIRST.maxLines,
    lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size,
    fontFamily: ctx.fonts.body,
    bold: false,
  })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function DossierStandfirst({ standfirst, ctx }: { standfirst: ReturnType<typeof fitDossierStandfirst>; ctx: ComponentCtx }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = dossierInks(ctx)
  const ink = dossierText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-dossier-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={DOSSIER_LEFT}
          y={dossierBaseline(DOSSIER_BODY_TOP + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

export interface DossierSourceLayout {
  layout: EmphasisHeadingLayout
  top: number
}

/** The source fitted in up to two lines from y648, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitDossierSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): DossierSourceLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  const layout = fitEmphasisText(source, {
    maxWidth: DOSSIER_W,
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
export function DossierSource({ source, ctx }: { source: DossierSourceLayout | null; ctx: ComponentCtx }): React.ReactElement | null {
  if (!source) return null
  const inks = dossierInks(ctx)
  const ink = dossierMeta(inks.muted, inks.ground)
  const { layout } = source
  return (
    <g data-dossier-source="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...DOSSIER_SPEC}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={DOSSIER_LEFT}
          y={dossierBaseline(source.top + i * SOURCE.lineHeight, SOURCE.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from y186 (or under the page's tag) down to y640. */
export function dossierBodyRect(top = DOSSIER_BODY_TOP): ContentRect {
  return { x: DOSSIER_LEFT, y: top, w: DOSSIER_W, h: DOSSIER_BODY_BOTTOM - top }
}
