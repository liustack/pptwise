import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { resolveDeckFooter } from "../render/footer-marks"
import { compose, type CompositionId } from "./compositions"
import { fitPortrait, paintPortrait, portraitInks, portraitText, PortraitSection } from "./compositions/portrait"
import {
  CLAIM,
  PORTRAIT_HEAD_FIT,
  PortraitClaim,
  PortraitSource,
  fitPortraitClaim,
  fitPortraitSource,
  portraitBandRect,
  portraitBodyRect,
  portraitClaimIn,
  portraitFooterLabel,
  portraitKickerIn,
  portraitSectionText,
  portraitSourceIn,
  portraitSpeaker,
} from "./portrait-shared"
import { HEAD, sectionWidth } from "./compositions/portrait"

/*
 * portrait-sheet: profile's ordinary content page, drawn to its 2026-10
 * board. The footer row is the motif's. The section line, the claim, the
 * body and the source are the face's. The body is one of the shared
 * compositions in the portrait setting (`PORTRAIT_COMPOSITIONS`), which
 * places the section line, the claim and the source itself. Or the section
 * line and the claim over the page and the ordinary component renderer under
 * them. A page the band cannot hold steps aside.
 */

/** The compositions a portrait sheet offers its body, in the portrait setting. */
export const PORTRAIT_COMPOSITIONS: readonly CompositionId[] = ["aside", "stations", "verdicts", "casework", "results", "uplift", "appraisal", "shortfalls", "tenure", "credo"]

/** The subheading, when a content page carries one: lines in the grey under the claim. None of the board's pages carried one. */
const STANDFIRST = { size: 18, lineHeight: 28, maxLines: 2, gap: 10 } as const

export function PortraitSheetContent({ ir, slide, ctx, page, index }: SvgTemplateProps) {
  const footer = page?.footer ?? resolveDeckFooter(ir)
  const row = {
    label: portraitFooterLabel(footer) || null,
    name: portraitSpeaker(ir),
    folio: footer.pageNumber ? index + 1 : null,
    drawn: page ? page.footerRow === "motif" : true,
  }
  // The compositions have no place for a subheading: a page with one is set under the claim by the ordinary renderer.
  const composed = slide.subheading?.trim()
    ? null
    : compose({ components: slide.components, ctx, rect: portraitBandRect(), setting: "portrait", claim: portraitClaimIn(slide, ctx), source: portraitSourceIn(slide, ctx, row), kicker: portraitKickerIn(ir, slide, ctx) }, PORTRAIT_COMPOSITIONS)
  if (composed) return composed
  const claim = slide.heading?.trim() ? fitPortraitClaim(slide.heading, ctx) : null
  const claimLines = claim ? Math.min(claim.lines.length, CLAIM.maxLines) : 1
  const standfirst = slide.subheading?.trim() ? fitPortrait(slide.subheading, { width: CLAIM.w, size: STANDFIRST.size, lineHeight: STANDFIRST.lineHeight, maxLines: STANDFIRST.maxLines }, ctx) : undefined
  const source = fitPortraitSource(slide, ctx)
  const body = portraitBodyRect(claimLines, source !== null)
  const standfirstTop = CLAIM.top + claimLines * CLAIM.lineHeight + STANDFIRST.gap
  const shift = standfirst ? standfirstTop + standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap * 2 - body.y : 0
  const rect = { ...body, y: body.y + Math.max(0, shift), h: body.h - Math.max(0, shift) }
  const aside = stepAside({ face: "portrait-sheet", slide, ctx, bodyRect: rect })
  if (aside) return aside
  const inks = portraitInks(ctx)
  const section = portraitSectionText(ir, slide, ctx)
  const sectionFits = section !== null && sectionWidth(section, ctx) <= CLAIM.w
  return (
    <>
      {section && sectionFits ? <PortraitSection text={section} ctx={ctx} x={CLAIM.x} top={HEAD.top} /> : null}
      {section && !sectionFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {claim ? <PortraitClaim ctx={ctx} layout={claim} x={CLAIM.x} top={CLAIM.top} /> : null}
      {standfirst ? (
        <g data-portrait-standfirst="">{paintPortrait(standfirst, { ctx, x: CLAIM.x, top: standfirstTop, fill: portraitText(inks.muted, inks.ground, STANDFIRST.size) })}</g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      <SvgContent components={slide.components} rect={rect} ctx={ctx} />
      <PortraitSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Who the speaker is, the posts they held, what the role asks against
  // what they have done, a case worked through, results beside a picture,
  // bars against a control, a self-assessment, the gaps and how they close,
  // the first ninety days and one line in their own words: one face, several
  // pages, so several kinds may share it.
  dispatch: "content",
  id: "portrait-sheet",
  compositions: { setting: "portrait", offer: PORTRAIT_COMPOSITIONS, subheading: "declines" },
  kind: "standard",
  story: {
    name: "Portrait Sheet",
    story:
      "Each page reads like a magazine profile: a small line naming the part of the talk, a serif claim, the work in open columns under hairlines, large serif figures, a photograph bled off one side, and one result a page in colour.",
    positioning:
      "Serves every content kind it is offered in one grammar. Choose it for a candidacy, a self-introduction or a career plan, where every page is one person's evidence and the panel should finish knowing who they are.",
    audience: "A hiring panel, a promotion board or a review committee listening to one candidate for a few minutes.",
    notFor: "A team's report, a market analysis or a product launch, where a page about one person's record is the wrong frame.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  pageFields: ["kicker", "stage"],
  headingFit: PORTRAIT_HEAD_FIT,
  // A self-assessment closes on the line that counts where the speaker stands.
  fullBodyCompanions: ["paragraph"],
} satisfies LayoutDefinition
