import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { stageIndex } from "../render/course-marks"
import { fitDossierTitle } from "./dossier-shared"
import { PITCH_SPEC, PitchRail, pitchBaseline, pitchInks, pitchMeta, pitchText } from "./compositions/pitch"

/*
 * The pitch frame: the head every ember page but the cover wears and the
 * source line under a content page's body. Settled on ember's 2026-10 board
 * (`design/rounds/2026-10-06-ember/`).
 *
 * The page is one beat of a pitch. At the top right the pitch's running
 * order (the deck's `course`) as a rail of words, the page's own beat
 * (`stage`) lit; at the top left the deck's label (`footer.label`,
 * 「种子轮路演」), which the motif prints with the folio
 * (`motifs/motif-ember-motif.tsx`). The claim bold at 34/46 across the
 * 1152px measure from x64, on one line whenever it fits and broken at a comma
 * when it does not, its last line ending at y160 either way. The body runs
 * from y196 to y640, and the source at 12/16 in the muted ink from y650, up
 * to two lines.
 */

export const PITCH_LEFT = 64
export const PITCH_RIGHT = 1216
export const PITCH_W = PITCH_RIGHT - PITCH_LEFT
/** The rail's line, and the deck's label beside it. */
export const PITCH_HEAD_TOP = 28
/** The claim's box: up to two 46px lines whose last line box ends at y160. */
const HEAD = { size: 34, lineHeight: 46, foot: 160, minPt: 28 } as const
export const PITCH_BODY_TOP = 196
export const PITCH_BODY_BOTTOM = 640
const SOURCE = { top: 650, size: 12, lineHeight: 16, maxLines: 2 } as const

/** The heading fit `PitchHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const PITCH_HEAD_FIT = { maxWidth: PITCH_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

/** The deck's course and the page's beat in it, when the page names a stage the course has. */
export function pitchStage(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage">): { course: NonNullable<PptxIR["course"]>; stage: string } | null {
  if (!ir.course || !slide.stage || stageIndex(ir.course, slide.stage) < 0) return null
  return { course: ir.course, stage: slide.stage }
}

/** The rail at the top right, ending at `right`, when the page names its beat. */
export function PitchRailHead({ ir, slide, ctx, right = PITCH_RIGHT }: { ir: Pick<PptxIR, "course">; slide: Pick<Slide, "stage">; ctx: ComponentCtx; right?: number }): React.ReactElement | null {
  const staged = pitchStage(ir, slide)
  return staged ? <PitchRail course={staged.course} stage={staged.stage} ctx={ctx} right={right} top={PITCH_HEAD_TOP} /> : null
}

/**
 * A claim fitted to `width` and painted with its last line ending at `foot`.
 * A claim too long for two lines shrinks toward `minPt` and is then cut with
 * `data-truncated` on its last line.
 */
export function PitchTitle({ heading, ctx, x = PITCH_LEFT, width = PITCH_W, size = HEAD.size, lineHeight = HEAD.lineHeight, minPt = HEAD.minPt, foot = HEAD.foot, ground }: { heading: string | undefined; ctx: ComponentCtx; x?: number; width?: number; size?: number; lineHeight?: number; minPt?: number; foot?: number; ground?: string }): React.ReactElement {
  const inks = pitchInks(ctx)
  const bg = ground ?? inks.ground
  const title = fitDossierTitle(heading, ctx, size, lineHeight, minPt, width)
  const ink = pitchText(inks.ink, bg, title.fontSize)
  const last = pitchBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-pitch-title="">
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

/** The rail and the claim under it, as every content page wears them. */
export function PitchHead({ ir, slide, ctx }: { ir: Pick<PptxIR, "course">; slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  return (
    <g data-pitch-head="">
      <PitchRailHead ir={ir} slide={slide} ctx={ctx} />
      <PitchTitle heading={slide.heading} ctx={ctx} />
    </g>
  )
}

/** The subheading, when a content page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 16, lineHeight: 24, maxLines: 2, gap: 12 } as const

export function fitPitchStandfirst(slide: Pick<Slide, "subheading">, ctx: ComponentCtx, width = PITCH_W): { layout: EmphasisHeadingLayout; h: number } | null {
  const sub = slide.subheading?.trim()
  if (!sub) return null
  const layout = fitEmphasisText(sub, { maxWidth: width, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
  return { layout, h: layout.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap }
}

export function PitchStandfirst({ standfirst, ctx, x = PITCH_LEFT, top = PITCH_BODY_TOP }: { standfirst: ReturnType<typeof fitPitchStandfirst>; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!standfirst) return null
  const inks = pitchInks(ctx)
  const ink = pitchText(inks.muted, inks.ground, STANDFIRST.size)
  const { layout } = standfirst
  return (
    <g data-pitch-standfirst="">
      {renderEmphasisHeading(layout, headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          data-truncated={layout.truncated && i === layout.lines.length - 1 ? "1" : undefined}
          x={x}
          y={pitchBaseline(top + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, layout.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={layout.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The source fitted in up to two lines of `width` from y650, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitPitchSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width = PITCH_W): EmphasisHeadingLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  return fitEmphasisText(source, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines: SOURCE.maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
}

/** The source as the author wrote it, 12/16 in the muted ink. */
export function PitchSource({ source, ctx, x = PITCH_LEFT }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = pitchInks(ctx)
  const ink = pitchMeta(inks.muted, inks.ground)
  return (
    <g data-pitch-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...PITCH_SPEC}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={x}
          y={pitchBaseline(SOURCE.top + i * SOURCE.lineHeight, SOURCE.lineHeight, source.fontSize)}
          fontFamily={ctx.fonts.body}
          fontSize={source.fontSize}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The body band from y196 down to y640. */
export function pitchBodyRect(top = PITCH_BODY_TOP): ContentRect {
  return { x: PITCH_LEFT, y: top, w: PITCH_W, h: PITCH_BODY_BOTTOM - top }
}
