import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { ContentRect } from "../render/layout"
import type { PageRenderContext } from "../render/page-context"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { accessibleInk } from "../render/ink"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { compose, type CompositionId } from "./compositions"
import { centredBaseline } from "./compositions/type"
import { CONSOLE_BODY_TOP, CONSOLE_HEAD_FIT, CONSOLE_LEFT, CONSOLE_W, ConsoleHead, ConsoleSource, consoleBodyRect, fitConsoleSource, type ConsoleSourceLayout } from "./console-shared"

/*
 * console-sheet: terminal's ordinary content page, drawn to its 2026-10
 * board. One frame on every content page (the crumb, the claim across the
 * full measure over a hairline, `ConsoleHead`, and the 12px mono source at
 * the foot), and between them the body: one of the shared compositions in
 * the console setting (`CONSOLE_COMPOSITIONS`) when the content has a shape
 * the board drew, or the ordinary component renderer in the same band. A page
 * the band cannot hold steps aside.
 *
 * The photo pages are content pages here too: a row of pictures over their
 * figures, and a device beside its log, are compositions like any other.
 */

/** The compositions a console sheet offers its body, in the console setting. */
const CONSOLE_COMPOSITIONS: readonly CompositionId[] = [
  "cards",
  "listing",
  "log",
  "span",
  "plates",
  "paths",
  "screen",
  "records",
  "table",
  // Before a lone chart: a chart beside the author's figures.
  "rail",
  "waves",
]

/** The subheading, when a page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 17, box: 26, maxLines: 2, gap: 12 }

export interface ConsoleSheet {
  standfirst: React.ReactElement | null
  rect: ContentRect
  source: ConsoleSourceLayout | null
  composed: React.ReactElement | null
}

/** Frames the page and asks the compositions whether one of them takes its body. */
export function composeConsole(slide: Slide, ctx: ComponentCtx, page?: PageRenderContext): ConsoleSheet {
  const source = fitConsoleSource(slide, ctx, page)
  let top = CONSOLE_BODY_TOP
  let standfirst: React.ReactElement | null = null
  const sub = slide.subheading?.trim()
  if (sub) {
    const { colors, fonts } = ctx
    const layout = fitEmphasisText(sub, {
      maxWidth: CONSOLE_W,
      fontSize: STANDFIRST.size,
      minPt: STANDFIRST.size,
      maxLines: STANDFIRST.maxLines,
      lineHeightRatio: STANDFIRST.box / STANDFIRST.size,
      fontFamily: fonts.body,
      bold: false,
    })
    const ink = accessibleInk(colors.muted, ctx.defaultBg ?? colors.bg, layout.fontSize)
    const first = centredBaseline(top, STANDFIRST.box, STANDFIRST.size)
    standfirst = (
      <g data-console-standfirst="">
        {renderEmphasisHeading(
          layout,
          headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, index) => (
            <text
              key={index}
              data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
              x={CONSOLE_LEFT}
              y={first + index * STANDFIRST.box}
              fontFamily={fonts.body}
              fontSize={layout.fontSize}
              fill={ink}
              dominantBaseline="alphabetic"
            />
          ),
        )}
      </g>
    )
    top += layout.lines.length * STANDFIRST.box + STANDFIRST.gap
  }
  const rect = consoleBodyRect(source, page, top)
  const composed = compose({ components: slide.components, ctx, rect, setting: "console" }, CONSOLE_COMPOSITIONS)
  return { standfirst, rect, source, composed }
}

export function ConsoleSheetContent({ ir, slide, index, ctx, page }: SvgTemplateProps) {
  const sheet = composeConsole(slide, ctx, page)
  if (!sheet.composed) {
    const aside = stepAside({ face: "console-sheet", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return (
    <>
      <ConsoleHead ir={ir} slide={slide} index={index} ctx={ctx} page={page} />
      {sheet.standfirst}
      {sheet.composed ?? <SvgContent components={slide.components} rect={sheet.rect} ctx={ctx} />}
      <ConsoleSource source={sheet.source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // HUD cards, a listing, a log, pictures over their figures, paths, a
  // device beside its log, tables, options, a chart beside its figures and a
  // roadmap: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "console-sheet",
  kind: "standard",
  story: {
    name: "Console Sheet",
    story: "Each page prints where it sits in a mono line, states its claim in bold over a hairline, and sets its evidence as an incident console does: square panels, figures and times in mono, one thing on the signal colour's tint.",
    positioning: "Serves points, lists, comparisons, processes, data, photos, evidence and hierarchies in one console grammar. Choose it for a technical review that should read as one screen, the logs and figures framed.",
    audience: "Engineers and their leads reviewing what broke, why, and what to build next.",
    notFor: "A single figure or a statement, which have pages of their own.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: CONSOLE_HEAD_FIT,
  // The crumb, the claim and the source are the page's furniture, and the
  // board draws no motif over them.
  suppressMotif: true,
} satisfies LayoutDefinition
