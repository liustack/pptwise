import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { stageIndex } from "../render/course-marks"
import type { DeckFooter } from "../render/footer-marks"
import { fitDossierTitle } from "./dossier-shared"
import { BINDER_SPEC, binderBaseline, binderInks, binderMeta, binderText, binderWidth, paintBinderLine } from "./compositions/binder"

/*
 * The binder frame: the head every proposal content page wears and the
 * foot under its body, set the way a printed proposal sets its pages
 * (the 2026-10 print board, `design/rounds/2026-10-06-proposal/`).
 *
 * Along the top a running head on y36: the deck's label at the left in the
 * grey at 13px (the motif's, `motifs/motif-proposal-motif.tsx`), the part
 * of the deck the page sits in at the right in petrol bold (「算账」,
 * "Numbers", the label of the page's `stage` in the deck's `course`, with
 * no number), and a hairline under both on y64. Under it the claim bold at
 * 30/42 in petrol across the whole measure, x64 to x1216, from y92 on one
 * line whenever it fits, a two-line claim lifted 20px so its foot stays
 * clear of the body. The body runs from y176 to y640 over a source and to
 * y648 without one. Along the foot, the source at 11/16 in the grey at the
 * left, its last line on the folio's baseline (y686) or on the line over
 * the deck's office when the folio row prints one; the page number at the
 * right is the motif's.
 */

export const BINDER_LEFT = 64
export const BINDER_RIGHT = 1216
export const BINDER_W = BINDER_RIGHT - BINDER_LEFT
/** The running head: 13px words on a line box from y36, the hairline under it on y64. */
export const RUNNING_HEAD = { top: 36, lineHeight: 18, size: 13, rule: 64, gap: 24 } as const
/** The claim: 30/42 bold from y92, two lines at most, a second line lifting it 20px. */
const HEAD = { size: 30, lineHeight: 42, top: 92, rise: 20, minPt: 26 } as const
export const BINDER_BODY_TOP = 176
const BODY_BOTTOM = { source: 640, bare: 648 } as const
/** The foot: the folio's baseline, the source at 11/16 above or on it, two lines at most. */
export const BINDER_FOOT = { baseline: 686, size: 11, lineHeight: 16, maxLines: 2, gap: 24, folio: 13 } as const

/** The heading fit `BinderTitle` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const BINDER_HEAD_FIT = { maxWidth: BINDER_W, fontSize: HEAD.size, maxLines: 2, minPt: HEAD.minPt, bold: true, lineHeightRatio: HEAD.lineHeight / HEAD.size } as const

// ── The running head ───────────────────────────────────────────────────

/**
 * The part of the deck a page sits in, as the running head names it: the
 * label of the page's `stage` in the deck's `course`, 「算账」 or "Numbers",
 * with no number, since a part of the deck may span several stages. `null`
 * when the page names no stage the course has.
 */
export function binderStageLine(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage">): string | null {
  const course = ir.course
  if (!course || !slide.stage) return null
  const at = stageIndex(course, slide.stage)
  if (at < 0) return null
  return stripEmphasis(course.stages[at]!.label).trim()
}

/** The width the right of the running head takes: the stage line bold at 13px, or nothing. */
export function binderStageWidth(text: string | null, ctx: ComponentCtx): number {
  return text ? binderWidth(text, RUNNING_HEAD.size, ctx, true) : 0
}

/**
 * The right of the running head and the hairline under it: the stage line
 * bold in `ink` (petrol on the paper), the hairline in `line`. `left` and
 * `right` bound the hairline, the whole measure on a content page.
 */
export function BinderRunningHead({
  stage,
  ctx,
  top = RUNNING_HEAD.top,
  rule = RUNNING_HEAD.rule,
  left = BINDER_LEFT,
  right = BINDER_RIGHT,
  size = RUNNING_HEAD.size,
  lineHeight = RUNNING_HEAD.lineHeight,
  ground,
  ink,
  line,
}: {
  stage: string | null
  ctx: ComponentCtx
  top?: number
  rule?: number
  left?: number
  right?: number
  size?: number
  lineHeight?: number
  ground?: string
  ink?: string
  line?: string
}): React.ReactElement {
  const inks = binderInks(ctx)
  const bg = ground ?? inks.ground
  return (
    <g data-binder-running-head="">
      {stage ? <g data-binder-stage="">{paintBinderLine(stage, { ctx, x: right, top, lineHeight, size, bold: true, anchor: "end", fill: binderText(ink ?? inks.deep, bg, size) })}</g> : null}
      <rect x={left} y={rule} width={right - left} height={1} fill={line ?? inks.line} />
    </g>
  )
}

/**
 * The left of the running head: a line of the author's words (the deck's
 * label, 「屋顶光伏与储能方案 · 呈 贵司管理层」) in `ink`, the grey on the
 * paper. Declared dropped when it runs past `right`.
 */
export function BinderLabelLine({
  text,
  ctx,
  x = BINDER_LEFT,
  top = RUNNING_HEAD.top,
  right = BINDER_RIGHT,
  size = RUNNING_HEAD.size,
  lineHeight = RUNNING_HEAD.lineHeight,
  bold = false,
  ground,
  ink,
}: {
  text: string
  ctx: ComponentCtx
  x?: number
  top?: number
  right?: number
  size?: number
  lineHeight?: number
  bold?: boolean
  ground?: string
  ink?: string
}): React.ReactElement | null {
  const words = stripEmphasis(text).trim()
  if (!words) return null
  const inks = binderInks(ctx)
  const bg = ground ?? inks.ground
  if (x + binderWidth(words, size, ctx, bold) > right) return <g data-dropped={1} data-dropped-kind="label" />
  return <g data-binder-label="">{paintBinderLine(words, { ctx, x, top, lineHeight, size, bold, fill: ink ? binderText(ink, bg, size) : binderMeta(inks.muted, bg) })}</g>
}

// ── The claim ──────────────────────────────────────────────────────────

/** The claim fitted to `width` at its size, two lines at most, shrinking toward `minPt` before it is cut. */
export function fitBinderTitle(heading: string | undefined, ctx: ComponentCtx, opts: { width?: number; size?: number; lineHeight?: number; minPt?: number } = {}): EmphasisHeadingLayout {
  return fitDossierTitle(heading, ctx, opts.size ?? HEAD.size, opts.lineHeight ?? HEAD.lineHeight, opts.minPt ?? HEAD.minPt, opts.width ?? BINDER_W)
}

/** A fitted title painted with its first line box from `top`, `data-truncated` on its last line when it was cut. */
export function paintBinderTitle(title: EmphasisHeadingLayout, opts: { ctx: ComponentCtx; x: number; top: number; fill: string; ground: string }): React.ReactElement {
  const { ctx } = opts
  const ink = binderText(opts.fill, opts.ground, title.fontSize)
  const first = binderBaseline(opts.top, title.lineHeight, title.fontSize)
  return (
    <g data-binder-title="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: opts.ground }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={opts.x}
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

/** The claim in petrol across the measure from y92, a two-line claim lifted 20px. */
export function BinderTitle({ heading, ctx }: { heading: string | undefined; ctx: ComponentCtx }): React.ReactElement {
  const inks = binderInks(ctx)
  const title = fitBinderTitle(heading, ctx)
  const top = HEAD.top - (title.lines.length > 1 ? HEAD.rise : 0)
  return paintBinderTitle(title, { ctx, x: BINDER_LEFT, top, fill: inks.deep, ground: inks.ground })
}

/** The right of the running head, its hairline and the claim, as every content page wears them. */
export function BinderHead({ ir, slide, ctx }: { ir: Pick<PptxIR, "course">; slide: Slide; ctx: ComponentCtx }): React.ReactElement {
  return (
    <g data-binder-head="">
      <BinderRunningHead stage={binderStageLine(ir, slide)} ctx={ctx} />
      <BinderTitle heading={slide.heading} ctx={ctx} />
    </g>
  )
}

// ── The standfirst ─────────────────────────────────────────────────────

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

// ── The foot ───────────────────────────────────────────────────────────

/** The folio row's words, as the motif prints them: the office and the notice at the left, the draft and confidentiality marks before the page number at the right. */
export function binderFolioParts(footer: DeckFooter): { left: string; right: string } {
  const left = [footer.organization, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  return { left, right }
}

/** The width the right of the folio row takes: the marks, their gap and the page number. */
export function binderFolioRightWidth(footer: DeckFooter, folio: number, ctx: ComponentCtx): number {
  const { right } = binderFolioParts(footer)
  const number = footer.pageNumber ? binderWidth(String(folio), BINDER_FOOT.folio, ctx, true) : 0
  const marks = right ? binderWidth(right, BINDER_FOOT.size, ctx) : 0
  return number + marks + (number && marks ? BINDER_FOOT.gap : 0)
}

/** Where the source sits in the foot: its measure, and the baseline its last line stands on. */
export interface BinderSourcePlace {
  w: number
  lastBaseline: number
}

/**
 * The source's place in the foot of a page whose folio row is `row` (the
 * deck's marks and the page number, when the motif prints them): the left
 * of the row up to the marks at its right, on the folio's baseline, or on
 * the line over it when the row prints the office at the left.
 */
export function binderSourcePlace(row: { footer: DeckFooter; folio: number; drawn: boolean } | null, ctx: ComponentCtx): BinderSourcePlace {
  if (!row || !row.drawn) return { w: BINDER_W, lastBaseline: BINDER_FOOT.baseline }
  const rightW = binderFolioRightWidth(row.footer, row.folio, ctx)
  const { left } = binderFolioParts(row.footer)
  return { w: BINDER_W - (rightW > 0 ? rightW + BINDER_FOOT.gap : 0), lastBaseline: BINDER_FOOT.baseline - (left ? BINDER_FOOT.lineHeight : 0) }
}

/** The source fitted in up to two lines of `width`, or `null` for an empty source. Too long, its last line is cut with `data-truncated`. */
export function fitBinderSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = BINDER_W): EmphasisHeadingLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  return fitEmphasisText(source, { maxWidth: width, fontSize: BINDER_FOOT.size, minPt: BINDER_FOOT.size, maxLines: BINDER_FOOT.maxLines, lineHeightRatio: BINDER_FOOT.lineHeight / BINDER_FOOT.size, fontFamily: ctx.fonts.body, bold: false })
}

/** The source as the author wrote it, 11/16 in the grey, its last line on `lastBaseline`. */
export function BinderSource({
  source,
  ctx,
  x = BINDER_LEFT,
  lastBaseline = BINDER_FOOT.baseline,
  ground,
}: {
  source: EmphasisHeadingLayout | null
  ctx: ComponentCtx
  x?: number
  lastBaseline?: number
  ground?: string
}): React.ReactElement | null {
  if (!source) return null
  const inks = binderInks(ctx)
  const ink = binderMeta(inks.muted, ground ?? inks.ground)
  const first = lastBaseline - (source.lines.length - 1) * BINDER_FOOT.lineHeight
  return (
    <g data-binder-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...BINDER_SPEC}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={x}
          y={first + i * BINDER_FOOT.lineHeight}
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
