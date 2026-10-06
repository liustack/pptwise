import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { paletteWithoutAccent } from "../render/chart-palette"
import { compose, type CompositionId } from "./compositions"
import { manuscriptChinese } from "./compositions/manuscript"
import { exhibitLabels } from "./manuscript-shared"
import {
  MastheadRules,
  MastheadSection,
  PERIODICAL_HEAD_FIT,
  PeriodicalClaim,
  PeriodicalSource,
  PeriodicalStandfirst,
  claimIn,
  fitPeriodicalSource,
  fitPeriodicalStandfirst,
  periodicalBandRect,
  periodicalBodyRect,
  periodicalExhibitKind,
} from "./periodical-shared"

/*
 * periodical-sheet: journal's ordinary content page, drawn to its 2026-10
 * board. One frame on every content page (the page's section in the accent
 * in the middle of the masthead over a heavy rule and a hairline, and the
 * source at the foot; the column's name, the issue and the folio are the
 * motif's), and between them the claim and the body: one of the shared
 * compositions in the periodical setting (`PERIODICAL_COMPOSITIONS`), which
 * places the claim itself, over the body or beside a photograph that runs up
 * to the masthead, or the claim over the page and the ordinary component
 * renderer under it. A page the band cannot hold steps aside.
 *
 * Figures are numbered across the deck: the face counts the titled charts,
 * timelines, tables, comparisons and grids on the pages before this one and
 * hands the numbers to whatever draws the body (`ctx.exhibitLabels`). A
 * photograph only illustrates a page and takes no number.
 */

/** The compositions a periodical sheet offers its body, in the periodical setting. */
export const PERIODICAL_COMPOSITIONS: readonly CompositionId[] = [
  "foreword",
  "chronicle",
  "measures",
  "elapsed",
  "headline",
  "witness",
  "census",
  "contrast",
  "bracket",
  "mix",
  "twins",
  "parallel",
  "effects",
  "longform",
  "pledges",
]

export function PeriodicalSheetContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const labels = exhibitLabels(ir, index, manuscriptChinese(ctx, [slide.heading ?? ""]), periodicalExhibitKind)
  const pageCtx = labels.size > 0 ? { ...ctx, exhibitLabels: labels } : ctx
  const source = fitPeriodicalSource(slide, ctx)
  const standfirst = fitPeriodicalStandfirst(slide, ctx)
  // A page with a standfirst is set under the claim by the ordinary renderer.
  const composed = standfirst ? null : compose({ components: slide.components, ctx: pageCtx, rect: periodicalBandRect(), setting: "periodical", claim: claimIn(slide.heading, ctx) }, PERIODICAL_COMPOSITIONS)
  // The ordinary charts keep the accent for what the author marks: no bar turns red by being the tallest.
  const plainCtx = { ...pageCtx, colors: { ...pageCtx.colors, chartPalette: paletteWithoutAccent(pageCtx.colors.chartPalette, pageCtx.colors.accent) } }
  const rect = periodicalBodyRect(standfirst)
  if (!composed) {
    const aside = stepAside({ face: "periodical-sheet", slide, ctx: plainCtx, bodyRect: rect })
    if (aside) return aside
  }
  return (
    <>
      <MastheadSection text={slide.kicker} ctx={ctx} />
      <MastheadRules ctx={ctx} />
      {composed ?? (
        <>
          <PeriodicalClaim heading={slide.heading} ctx={ctx} />
          <PeriodicalStandfirst standfirst={standfirst} ctx={ctx} />
          <SvgContent components={slide.components} rect={rect} ctx={plainCtx} />
        </>
      )}
      <PeriodicalSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // An editor's note, years on one line, bars with their symbols, minutes
  // against a year, one figure huge, figures over a pull quote, bars with
  // their gaps, a column of figures, shares by column, two small multiples,
  // a table side by side, effects on one scale, a long read and plans: one
  // face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "periodical-sheet",
  kind: "standard",
  story: {
    name: "Periodical Sheet",
    story:
      "Each page is a page of a small magazine: a masthead naming the column, the section and the issue over two rules, the claim in a bookish serif, every figure numbered with the editor's comment under it, and the source at the foot.",
    positioning:
      "Serves every content kind but a statement and a quote in one editorial grammar. Choose it for a letter to subscribers, a long read with its figures, or a review that should read like the magazine it comes from.",
    audience: "Loyal readers who take their time with each page and expect to be told where every figure comes from.",
    notFor: "A dashboard or a pitch, where a masthead, captions and comments would slow pages meant to be scanned.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 5 },
  ],
  pageFields: ["kicker"],
  headingFit: PERIODICAL_HEAD_FIT,
} satisfies LayoutDefinition
