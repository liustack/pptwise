import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { footnoteBaselineFor } from "../render/branding-geometry"
import { accessibleInk } from "../render/ink"
import { fitEmphasisHeading, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import { CONSOLE_SPEC, consoleInks, fitMono, monoWidth, paintMono } from "./compositions/console"
import { crumbFor, paintCrumb } from "./compositions/crumb"
import { centredBaseline } from "./compositions/type"

/*
 * The console frame: the one header every terminal content page wears, and
 * the source line under its body. Settled on terminal's 2026-10 board
 * (`design/rounds/2026-10-05-terminal/`).
 *
 * The page is an incident console. Its top left corner prints where the page
 * sits (`crumb`, 「● 01 / 复盘 · P04」) at 13px mono. Under it the claim
 * stands bold at 31/42 across the whole 1152px type area from x64, at most
 * two lines, set on its last line so a one-line claim and a two-line one end
 * on the same baseline: it wraps only when it does not fit the measure. A
 * hairline in the border ink runs under it at y156, a 32 by 3 segment of the
 * mark at its left end.
 *
 * The body runs from y180 to y650, and the source sits at the foot in 12/18
 * mono muted type from y668, 「src: 」 before it, at most two lines. The crumb
 * and the source are the small type a console page sets outside its body, at
 * the board's sizes, with the `console-spec` exemption the L1 audit knows.
 */

export const CONSOLE_LEFT = 64
export const CONSOLE_RIGHT = 1216
export const CONSOLE_W = CONSOLE_RIGHT - CONSOLE_LEFT
/** The claim's box: up to two 42px lines ending at y144. */
const HEAD = { size: 31, lineHeight: 42, foot: 144, minPt: 26, maxLines: 2 } as const
/** The hairline under the claim, and the mark's segment at its left end. */
const RULE = { y: 156, segW: 32, segH: 3 } as const
/** The crumb's baseline. */
export const CRUMB_BASELINE = 45
export const CONSOLE_BODY_TOP = 180
export const CONSOLE_BODY_BOTTOM = 650
const SOURCE = { top: 668, size: 12, lineHeight: 18, maxLines: 2, lead: "src: " } as const
const SOURCE_CLEARANCE = 12

/** The heading fit `ConsoleHead` runs, in the shape `LayoutDefinition.headingFit` takes. */
export const CONSOLE_HEAD_FIT = {
  maxWidth: CONSOLE_W,
  fontSize: HEAD.size,
  maxLines: HEAD.maxLines,
  minPt: HEAD.minPt,
  bold: true,
  lineHeightRatio: HEAD.lineHeight / HEAD.size,
} as const

/** Fits a console claim, `**marked**` runs kept for the paint. */
export function fitConsoleHead(heading: string | undefined, ctx: ComponentCtx, maxWidth: number = CONSOLE_W): EmphasisHeadingLayout {
  return fitEmphasisHeading(heading, { ...CONSOLE_HEAD_FIT, maxWidth, fontFamily: ctx.fonts.heading })
}

/** Whether the page prints its own number in its crumb: not when a footer row already does. */
function crumbPageNumber(page: PageRenderContext | undefined): boolean {
  return !(page?.footerRow && page.footer.pageNumber)
}

/** The crumb in the top left corner of page `index`. */
export function ConsoleCrumb({ ir, index, ctx, page }: { ir: PptxIR; index: number; ctx: ComponentCtx; page?: PageRenderContext }) {
  const crumb = crumbFor(ir, index, { chinese: ctx.figures?.chinese ?? false, pageNumber: crumbPageNumber(page) })
  return paintCrumb({ crumb, ctx, x: CONSOLE_LEFT, baseline: CRUMB_BASELINE })
}

/**
 * The crumb, the claim on its last line at y135, and the hairline under it.
 * A claim too long for two lines shrinks toward 26px and is then cut with
 * `data-truncated` on its last line.
 */
export function ConsoleHead({ ir, slide, index, ctx, page }: { ir: PptxIR; slide: Slide; index: number; ctx: ComponentCtx; page?: PageRenderContext }) {
  const { colors, fonts } = ctx
  const inks = consoleInks(ctx)
  const title = fitConsoleHead(slide.heading, ctx)
  const ink = accessibleInk(colors.text, inks.ground, title.fontSize)
  const last = centredBaseline(HEAD.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-console-head="">
      <ConsoleCrumb ir={ir} index={index} ctx={ctx} page={page} />
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: fonts.heading, bold: true }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={CONSOLE_LEFT}
            y={first + i * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={ink}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={CONSOLE_LEFT} y={RULE.y} width={CONSOLE_W} height={1} fill={inks.edge} />
      <rect x={CONSOLE_LEFT} y={RULE.y - 1} width={RULE.segW} height={RULE.segH} fill={inks.mark} />
    </g>
  )
}

export interface ConsoleSourceLayout {
  layout: EmphasisHeadingLayout
  /** Baseline of the first line. */
  firstBaseline: number
  /** Where the source's ink starts. */
  top: number
}

/**
 * The source fitted in up to two mono lines after its 「src: 」 lead, from
 * y668, or above the footer row when the page carries one, or `null` for an
 * empty source. A source too long for two lines is cut with `data-truncated`.
 */
export function fitConsoleSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, page?: PageRenderContext, w: number = CONSOLE_W): ConsoleSourceLayout | null {
  const source = slide.footnote?.trim()
  if (!source) return null
  const width = w - monoWidth(SOURCE.lead, SOURCE.size)
  const spec = { width, size: SOURCE.size, lineHeight: SOURCE.lineHeight, maxLines: SOURCE.maxLines }
  const layout = fitMono(source, spec) ?? cutMono(source, spec)
  const lines = Math.max(1, layout.lines.length)
  const firstBaseline = page?.footerRow
    ? footnoteBaselineFor(SOURCE.size) - (lines - 1) * SOURCE.lineHeight
    : centredBaseline(SOURCE.top, SOURCE.lineHeight, SOURCE.size)
  return { layout, firstBaseline, top: firstBaseline - SOURCE.size }
}

/** A source too long for its lines: the longest head of it that fits, its last line marked cut. */
function cutMono(text: string, spec: { width: number; size: number; lineHeight: number; maxLines: number }): EmphasisHeadingLayout {
  const chars = Array.from(text)
  for (let n = chars.length - 1; n > 0; n--) {
    const layout = fitMono(chars.slice(0, n).join(""), spec)
    if (layout) return { ...layout, truncated: true }
  }
  return { lines: [], segments: [], fontSize: spec.size, lineHeight: spec.lineHeight, truncated: true }
}

/** The source as the author wrote it, after its 「src: 」 lead, 12px mono muted. */
export function ConsoleSource({ source, ctx, x = CONSOLE_LEFT }: { source: ConsoleSourceLayout | null; ctx: ComponentCtx; x?: number }) {
  if (!source) return null
  const inks = consoleInks(ctx)
  const ink = accessibleInk(inks.muted, inks.ground, SOURCE.size)
  const textX = x + monoWidth(SOURCE.lead, SOURCE.size)
  return (
    <g data-console-source="">
      <text {...CONSOLE_SPEC} data-source-lead="" x={x} y={source.firstBaseline} fontFamily={ctx.fonts.mono} fontSize={SOURCE.size} fill={ink} dominantBaseline="alphabetic">
        {SOURCE.lead.trim()}
      </text>
      {paintMono(source.layout, {
        ctx,
        x: textX,
        y: source.firstBaseline,
        fill: ink,
        ...(source.layout.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
      })}
    </g>
  )
}

/** The body band from y180 down to y650, or above a source moved up for a footer row. */
export function consoleBodyRect(source: ConsoleSourceLayout | null, page?: PageRenderContext, top = CONSOLE_BODY_TOP): ContentRect {
  const floor = page?.footerRow && source ? source.top - SOURCE_CLEARANCE : page?.footerRow ? footnoteBaselineFor(SOURCE.size) - 26 : CONSOLE_BODY_BOTTOM
  const bottom = Math.min(CONSOLE_BODY_BOTTOM, floor)
  return { x: CONSOLE_LEFT, y: top, w: CONSOLE_W, h: bottom - top }
}
