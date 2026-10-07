import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { paletteWithoutAccent } from "../render/chart-palette"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { compose, type CompositionId } from "./compositions"
import { scrollBaseline, scrollInks, scrollText } from "./compositions/scroll"
import {
  SCROLL_HEAD_FIT,
  SCROLL_LEFT,
  SCROLL_W,
  ScrollClaim,
  ScrollSource,
  ScrollVolume,
  fitScrollSource,
  scrollBandRect,
  scrollBodyRect,
  scrollClaimIn,
  scrollSourceIn,
} from "./scroll-shared"

/*
 * scroll-sheet: ink's ordinary content page, drawn to its 2026-10 board. One
 * frame on every content page, the page hung as a scroll (the volume the page
 * belongs to upright in cinnabar down the left margin, the face's; the
 * scroll's edges, the hall and the date down the right margin and the folio,
 * the motif's), and inside it the claim and the body: one of the shared
 * compositions in the scroll setting (`SCROLL_COMPOSITIONS`), which places
 * the claim and the source itself, over the body or beside a photograph that
 * runs the height of the page, or the claim over the page and the ordinary
 * component renderer under it. A page the band cannot hold steps aside.
 *
 * A page with a subheading is set under the claim by the ordinary renderer:
 * none of the board's pages carried one.
 */

/** The compositions a scroll sheet offers its body, in the scroll setting. */
export const SCROLL_COMPOSITIONS: readonly CompositionId[] = ["opening", "strata", "handscroll", "revival", "nations", "genres", "bases", "ages", "archive", "scenes", "daily", "excerpts", "glyphs"]

/** The subheading, when a content page carries one: grey lines in the body face under the claim. */
const STANDFIRST = { top: 162, size: 16, lineHeight: 24, maxLines: 2, gap: 8 } as const

export function ScrollSheetContent({ slide, ctx }: SvgTemplateProps) {
  const standfirst = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: SCROLL_W, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: false })
    : null
  const composed = standfirst ? null : compose({ components: slide.components, ctx, rect: scrollBandRect(), setting: "scroll", claim: scrollClaimIn(slide.heading, ctx), source: scrollSourceIn(slide, ctx) }, SCROLL_COMPOSITIONS)
  // The ordinary charts keep the cinnabar for what the author marks: no bar turns red by being the tallest.
  const plainCtx = { ...ctx, colors: { ...ctx.colors, chartPalette: paletteWithoutAccent(ctx.colors.chartPalette, ctx.colors.accent) } }
  const body = scrollBodyRect()
  const shift = standfirst ? standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap : 0
  const rect = { ...body, y: body.y + shift, h: body.h - shift }
  if (!composed) {
    const aside = stepAside({ face: "scroll-sheet", slide, ctx: plainCtx, bodyRect: rect })
    if (aside) return aside
  }
  const inks = scrollInks(ctx)
  return (
    <>
      <ScrollVolume text={slide.kicker} ctx={ctx} />
      {composed ?? (
        <>
          <ScrollClaim heading={slide.heading} ctx={ctx} />
          {standfirst ? (
            <g data-scroll-standfirst="">
              {renderEmphasisHeading(standfirst, headingEmphasisPaint(ctx, standfirst, { baseFill: scrollText(inks.muted, inks.ground, STANDFIRST.size), fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
                <text
                  key={i}
                  data-truncated={standfirst.truncated && i === standfirst.lines.length - 1 ? "1" : undefined}
                  x={SCROLL_LEFT}
                  y={scrollBaseline(STANDFIRST.top + i * STANDFIRST.lineHeight, STANDFIRST.lineHeight, STANDFIRST.size)}
                  fontFamily={ctx.fonts.body}
                  fontSize={STANDFIRST.size}
                  fill={scrollText(inks.muted, inks.ground, STANDFIRST.size)}
                  dominantBaseline="alphabetic"
                />
              ))}
            </g>
          ) : null}
          <SvgContent components={slide.components} rect={rect} ctx={plainCtx} />
          <ScrollSource source={fitScrollSource(slide, ctx)} ctx={ctx} />
        </>
      )}
    </>
  )
}

export const layoutDef = {
  // Three figures over a line read aloud, a pyramid of tiers, a long scroll
  // of years, two figures beside a photograph, countries beside how they are
  // counted, twin bars, counts beside a table that must not be added, a
  // share bar of ages, a progress bar beside a photograph, photographs over
  // figures, a table by the day and quoted findings: one face, several
  // pages, so several kinds may share it.
  dispatch: "content",
  id: "scroll-sheet",
  kind: "standard",
  story: {
    name: "Scroll Sheet",
    story:
      "Each page hangs like a section of a scroll: thin edges down both sides, the hall and the date standing upright in the right margin, the volume in cinnabar in the left, the claim in kaishu, and one thing on the page in cinnabar.",
    positioning:
      "Serves every content kind but a statement and a quote in one grammar. Choose it for a public lecture, a museum talk or a cultural briefing that should read as one hanging scroll from the first page to the last.",
    audience: "A hall of listeners who read a page while the speaker talks it through, and expect each figure to say where it comes from.",
    notFor: "A dashboard or a quarterly review, where margins of vertical type and brush headings would slow pages meant to be scanned.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 5 },
  ],
  pageFields: ["kicker"],
  headingFit: SCROLL_HEAD_FIT,
} satisfies LayoutDefinition

