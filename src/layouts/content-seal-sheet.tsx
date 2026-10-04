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
import { faceParam } from "./face-params"
import { compose, type CompositionId } from "./compositions"
import { centredBaseline } from "./compositions/type"
import { SEAL_BODY_TOP, SEAL_HEAD_FIT, SEAL_LEFT, SEAL_W, SealHead, SealSource, fitSealSource, sealBodyRect, type SealSourceLayout } from "./seal-shared"

/*
 * seal-sheet: vermilion's ordinary content page, drawn to its 2026-10 board.
 * One frame on every content page (the claim centred in the primary colour
 * over a short accent bar, `SealHead`, and the 14px source at the foot), and
 * between them the body: one of the shared compositions in the seal setting
 * (`sealCompositions`) when the content has a shape the board drew, or the
 * ordinary component renderer in the same band. A page the band cannot hold
 * steps aside.
 *
 * Numbered cards come out as ruled rows on a points page and as panels two by
 * two on a list page: the menu entry's `cards` parameter says which the theme
 * gives the kind (`rows`, the default, or `tiles`).
 */

/** The compositions a seal sheet offers its body, in the seal setting, numbered cards first as rows or as tiles. */
function sealCompositions(cards: "rows" | "tiles"): readonly CompositionId[] {
  return [
    ...(cards === "tiles" ? (["tiles", "rows"] as const) : (["rows", "tiles"] as const)),
    "roster",
    "scores",
    "table",
    "targets",
    // Before the lone plots: a chart beside the author's figures.
    "rail",
    "columns",
    "trend",
    "lanes",
    "rings",
  ]
}

/** The subheading, when a page carries one: muted lines at the body's top, the body moved down under them. */
const STANDFIRST = { size: 18, box: 26, maxLines: 2, gap: 14 }

export interface SealSheet {
  standfirst: React.ReactElement | null
  rect: ContentRect
  source: SealSourceLayout | null
  composed: React.ReactElement | null
}

/** Frames the page and asks the compositions whether one of them takes its body. */
export function composeSeal(slide: Slide, ctx: ComponentCtx, page?: PageRenderContext, cards: "rows" | "tiles" = "rows"): SealSheet {
  const source = fitSealSource(slide, ctx, page)
  let top = SEAL_BODY_TOP
  let standfirst: React.ReactElement | null = null
  const sub = slide.subheading?.trim()
  if (sub) {
    const { colors, fonts } = ctx
    const layout = fitEmphasisText(sub, {
      maxWidth: SEAL_W,
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
      <g data-seal-standfirst="">
        {renderEmphasisHeading(
          layout,
          headingEmphasisPaint(ctx, layout, { baseFill: ink, fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, index) => (
            <text
              key={index}
              data-truncated={layout.truncated && index === layout.lines.length - 1 ? "1" : undefined}
              x={SEAL_LEFT}
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
  const rect = sealBodyRect(source, page, top)
  const composed = compose({ components: slide.components, ctx, rect, setting: "seal" }, sealCompositions(cards))
  return { standfirst, rect, source, composed }
}

export function SealSheetContent({ slide, ctx, page, params }: SvgTemplateProps) {
  const cards = faceParam<"rows" | "tiles">(params, "cards", "rows")
  const sheet = composeSeal(slide, ctx, page, cards)
  if (!sheet.composed) {
    const aside = stepAside({ face: "seal-sheet", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return (
    <>
      <SealHead heading={slide.heading} ctx={ctx} />
      {sheet.standfirst}
      {sheet.composed ?? <SvgContent components={slide.components} rect={sheet.rect} ctx={ctx} />}
      <SealSource source={sheet.source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Rows, panels, a two-column roster, a scorecard, tables, targets beside
  // their statement, a chart beside its figures, a trend over a range, a
  // timeline and completion rings: one face, several pages, so several kinds
  // may share it.
  dispatch: "content",
  id: "seal-sheet",
  kind: "standard",
  story: {
    name: "Seal Sheet",
    story: "The claim stands centred in the brand colour over a short bar, and the evidence follows as a formal report sets it: items numbered in squares of the brand colour, open tables under a rule of it, one row or figure a page reversed out of it.",
    positioning: "Serves points, lists, comparisons, processes, data, evidence and team pages in one formal grammar. Choose it when every page should read as one document, the one thing each page is about set in the brand colour.",
    audience: "An office reporting upward, and a room that expects a numbered, sourced account.",
    notFor: "A single figure or a photograph, which have pages of their own.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  params: {
    // How numbered cards are set: ruled rows (a points page) or panels two by two (a list page).
    cards: { type: "string", values: ["rows", "tiles"] },
  },
  headingFit: SEAL_HEAD_FIT,
} satisfies LayoutDefinition
