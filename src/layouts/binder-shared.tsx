import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { stageIndex } from "../render/course-marks"
import { fitDossierTitle } from "./dossier-shared"
import { BINDER_SPEC, BinderTabs, binderBaseline, binderInks, binderMeta, binderText, binderTrackedWidth, paintBinderTracked, splitDot } from "./compositions/binder"

/*
 * The binder frame: the head every proposal content page wears and the
 * source line under its body. Settled on proposal's 2026-10 board
 * (`design/rounds/2026-10-06-proposal/`).
 *
 * The page is one leaf of a proposal binder. Down the right edge, the
 * binder's index tabs, one a stage of the deck's `course`, the page's own
 * `stage` sticking out in petrol. At the top left the deck's label (the
 * motif's, `motifs/motif-proposal-motif.tsx`). The claim bold at 32/44 in
 * petrol across the 1132px measure from x64, on one line whenever it fits and
 * broken at a comma or a colon when it does not, its last line ending at
 * y150. The body runs from y172 to y640 over a source and to y648 without
 * one; the source at 12/17 in the muted ink from y650, up to two lines. The
 * folio is the motif's.
 */

export const BINDER_LEFT = 64
export const BINDER_RIGHT = 1196
export const BINDER_W = BINDER_RIGHT - BINDER_LEFT
/** The claim's box: up to two 44px lines whose last line box ends at y150. */
const HEAD = { size: 32, lineHeight: 44, foot: 150, minPt: 26 } as const
export const BINDER_BODY_TOP = 172
const BODY_BOTTOM = { source: 640, bare: 648 } as const
const SOURCE = { top: 650, size: 12, lineHeight: 17, maxLines: 2, w: 1100 } as const
/** The deck's label at the top left: 12/18, its characters 1px apart, its first part in petrol. */
export const LABEL_LINE = { top: 34, lineHeight: 18, size: 12, tracking: 1 } as const

/** The heading fit `BinderTitle` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const BINDER_HEAD_FIT = { maxWidth: BINDER_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The page's stage and the deck's course, when the page names a stage the course has. */
export function binderStage(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage">): { course: NonNullable<PptxIR["course"]>; stage: string } | null {
  if (!ir.course || !slide.stage || stageIndex(ir.course, slide.stage) < 0) return null
  return { course: ir.course, stage: slide.stage }
}

/** The binder's tabs down the right edge, the page's stage lit, when the page names one. */
export function BinderTabsFor({ ir, slide, ctx, onPhoto = false }: { ir: Pick<PptxIR, "course">; slide: Pick<Slide, "stage">; ctx: ComponentCtx; onPhoto?: boolean }): React.ReactElement | null {
  const staged = binderStage(ir, slide)
  return staged ? <BinderTabs course={staged.course} stage={staged.stage} ctx={ctx} onPhoto={onPhoto} /> : null
}

/**
 * The deck's label line, as the author wrote it: the part before its first
 * " · " (「屋顶光伏与储能方案」) in petrol, the rest (「呈 贵司管理层」) in the
 * muted ink, both 12px bold with 1px between characters. Declared dropped
 * when it runs past `right`.
 */
export function BinderLabelLine({ text, ctx, x = BINDER_LEFT, top = LABEL_LINE.top, right = BINDER_RIGHT }: { text: string; ctx: ComponentCtx; x?: number; top?: number; right?: number }): React.ReactElement | null {
  const words = text.trim()
  if (!words) return null
  const inks = binderInks(ctx)
  const y = binderBaseline(top, LABEL_LINE.lineHeight, LABEL_LINE.size)
  const split = splitDot(words)
  const head = split ? split.name : words
  const tail = split ? ` · ${split.rest}` : ""
  const headW = binderTrackedWidth(head, LABEL_LINE.size, LABEL_LINE.tracking, ctx, true)
  const tailW = tail ? binderTrackedWidth(tail, LABEL_LINE.size, LABEL_LINE.tracking, ctx, true) + LABEL_LINE.tracking : 0
  if (x + headW + tailW > right) return <g data-dropped={1} data-dropped-kind="label" />
  return (
    <g data-binder-label="">
      {paintBinderTracked({ ctx, text: head, x, y, size: LABEL_LINE.size, tracking: LABEL_LINE.tracking, bold: true, fill: binderText(inks.deep, inks.ground, LABEL_LINE.size) })}
      {tail
        ? paintBinderTracked({ ctx, text: tail, x: x + headW + LABEL_LINE.tracking, y, size: LABEL_LINE.size, tracking: LABEL_LINE.tracking, bold: true, fill: binderMeta(inks.muted, inks.ground) })
        : null}
    </g>
  )
}

/**
 * A claim fitted to `width` and painted with its last line ending at `foot`.
 * A claim too long for two lines shrinks toward `minPt` and is then cut with
 * `data-truncated` on its last line.
 */
export function BinderTitle({ heading, ctx, x = BINDER_LEFT, width = BINDER_W, size = HEAD.size, lineHeight = HEAD.lineHeight, minPt = HEAD.minPt, foot = HEAD.foot, ground, fill }: { heading: string | undefined; ctx: ComponentCtx; x?: number; width?: number; size?: number; lineHeight?: number; minPt?: number; foot?: number; ground?: string; fill?: string }): React.ReactElement {
  const inks = binderInks(ctx)
  const bg = ground ?? inks.ground
  const title = fitDossierTitle(heading, ctx, size, lineHeight, minPt, width)
  const ink = binderText(fill ?? inks.deep, bg, title.fontSize)
  const last = binderBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-binder-title="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg }), (_line, i) => (
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

/** The tabs and the claim, as every content page wears them. */
export function BinderHead({ ir, slide, ctx }: { ir: Pick<PptxIR, "course">; slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  return (
    <g data-binder-head="">
      <BinderTabsFor ir={ir} slide={slide} ctx={ctx} />
      <BinderTitle heading={slide.heading} ctx={ctx} />
    </g>
  )
}

/** The subheading, when a content page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

export function fitBinderStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx, width = BINDER_W): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, { maxWidth: width, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function BinderStandfirst({ standfirst, ctx, x = BINDER_LEFT, top = BINDER_BODY_TOP }: { standfirst: ReturnType<typeof fitBinderStandfirst>; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = binderInks(ctx)
  const ink = binderText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-binder-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={x}
          y={binderBaseline(top + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The source fitted in up to two lines of 1100px from y650, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitBinderSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w): EmphasisHeadingLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  return fitEmphasisText(source, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines: SOURCE.maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
}

/** The source as the author wrote it, 12/17 in the muted ink. */
export function BinderSource({ source, ctx, x = BINDER_LEFT, top = SOURCE.top, ground }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number; ground?: string }): React.ReactElement | null {
  if (!source) return null
  const inks = binderInks(ctx)
  const ink = binderMeta(inks.muted, ground ?? inks.ground)
  return (
    <g data-binder-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...BINDER_SPEC}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={x}
          y={binderBaseline(top + i * SOURCE.lineHeight, SOURCE.lineHeight, source.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={source.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from `top` down to y640 over a source, or y648 on a page without one. */
export function binderBodyRect(hasSource: boolean, top = BINDER_BODY_TOP): ContentRect {
  return { x: BINDER_LEFT, y: top, w: BINDER_W, h: (hasSource ? BODY_BOTTOM.source : BODY_BOTTOM.bare) - top }
}
