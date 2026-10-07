import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { compose, type CompositionId } from "./compositions"
import { fitEmphasisText } from "../render/emphasis"
import { crayonInks, crayonSectionColor, crayonText, paintCrayon } from "./compositions/crayonbox"
import {
  BODY,
  CRAYON_HEAD_FIT,
  CRAYON_LEFT,
  CRAYON_W,
  CrayonClaim,
  CrayonSection,
  CrayonSource,
  crayonBandRect,
  crayonClaimIn,
  crayonSourceIn,
  fitCrayonClaim,
  fitCrayonSource,
} from "./crayonbox-frame"

/*
 * crayonbox-sheet: crayon's ordinary content page, drawn to its 2026-10
 * board. One frame on every content page (the section capsule at the top
 * left in the section's crayon, the claim in the heavy sans with a stroke of
 * crayon under it, the face's; the sun and the stars, the deck's name and
 * term and the page number in its disc, the motif's), and inside it the
 * body: one of the shared compositions in the crayonbox setting
 * (`CRAYONBOX_COMPOSITIONS`), which places the claim and the source itself,
 * or the claim over the page and the ordinary component renderer under it.
 * A page the band cannot hold steps aside.
 *
 * A page with a subheading is set by the ordinary renderer under the claim
 * and the subheading: none of the board's pages carried one.
 *
 * A page over a photograph (`background`) lays the paper over it from the
 * left, nearly whole for the first half of the page and half seen at the
 * right edge, so the words stand on paper and the picture shows through.
 */

/** The compositions a crayonbox sheet offers its body, in the crayonbox setting. */
export const CRAYONBOX_COMPOSITIONS: readonly CompositionId[] = ["crayons", "stickies", "waiver", "storeys", "swatches", "yardstick", "arc", "magnets", "crosscheck", "tray", "checkup", "backing", "badges", "ticks"]

/** The subheading, when a content page carries one: grey lines under the claim's stroke. None of the board's pages carried one. */
const STANDFIRST = { top: 172, size: 16, lineHeight: 24, maxLines: 2, gap: 8 } as const

function fitCrayonStandfirst(text: string, ctx: Parameters<typeof crayonInks>[0]) {
  const layout = fitEmphasisText(text, { maxWidth: CRAYON_W, fontSize: STANDFIRST.size, minPt: STANDFIRST.size, maxLines: STANDFIRST.maxLines, lineHeightRatio: STANDFIRST.lineHeight / STANDFIRST.size, fontFamily: ctx.fonts.body, bold: true })
  return { ...layout, lineHeight: STANDFIRST.lineHeight }
}

/** The paper laid over a page's photograph from the left. */
const VEIL = [
  { offset: "0%", opacity: 0.97 },
  { offset: "55%", opacity: 0.92 },
  { offset: "100%", opacity: 0.5 },
] as const

export function CrayonboxSheetContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = crayonInks(ctx)
  const color = crayonSectionColor(ir.slides, index, inks)
  const photo = slide.background?.kind === "asset"
  const composed = slide.subheading?.trim()
    ? null
    : compose(
        { components: slide.components, ctx, rect: crayonBandRect(), setting: "crayonbox", inks: { section: color }, claim: crayonClaimIn(slide.heading, ctx, color), source: crayonSourceIn(slide, ctx) },
        CRAYONBOX_COMPOSITIONS,
      )
  const veil = photo ? (
    <g data-crayon-veil="">
      <defs>
        <linearGradient id={`crayon-veil-${index}`} x1={0} y1={0} x2={1} y2={0}>
          {VEIL.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={inks.ground} stopOpacity={stop.opacity} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1280} height={720} fill={`url(#crayon-veil-${index})`} />
    </g>
  ) : null
  if (composed) {
    return (
      <>
        {veil}
        <CrayonSection ir={ir} slide={slide} index={index} ctx={ctx} />
        {composed}
      </>
    )
  }
  const claim = fitCrayonClaim(slide.heading, ctx)
  const standfirst = slide.subheading?.trim() ? fitCrayonStandfirst(slide.subheading, ctx) : null
  const shift = standfirst ? standfirst.lines.length * STANDFIRST.lineHeight + STANDFIRST.gap : 0
  const body = { x: CRAYON_LEFT, y: BODY.top + shift, w: CRAYON_W, h: BODY.bottom - BODY.top - shift }
  const aside = stepAside({ face: "crayonbox-sheet", slide, ctx, bodyRect: body })
  if (aside) return aside
  return (
    <>
      {veil}
      <CrayonSection ir={ir} slide={slide} index={index} ctx={ctx} />
      {slide.heading?.trim() ? <CrayonClaim layout={claim} ctx={ctx} color={color} /> : null}
      {standfirst ? (
        <g data-crayon-standfirst="">
          {paintCrayon(standfirst, { ctx, x: CRAYON_LEFT, top: STANDFIRST.top, weight: 600, fill: crayonText(inks.muted, inks.ground, STANDFIRST.size), lastAttrs: standfirst.truncated ? { "data-truncated": "1" } : undefined })}
        </g>
      ) : null}
      <SvgContent components={slide.components} rect={body} ctx={ctx} />
      <CrayonSource source={fitCrayonSource(slide, ctx)} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // Crayons for the contents, sticky notes, two hand-drawn cards, a chart in
  // two bands, five coloured cards, a crossed-out ruler, a sun's arc, fridge
  // magnets, a table of what each body says, a lunch tray, an eye check,
  // studies beside things to do, round badges and a ticklist: one face,
  // several pages, so several kinds may share it.
  dispatch: "content",
  id: "crayonbox-sheet",
  kind: "standard",
  story: {
    name: "Crayonbox Sheet",
    story:
      "Each page is drawn on warm paper with a box of crayons: a rounded capsule in the colour of its section, the claim in a heavy rounded hand with a stroke of crayon under it, cards outlined twice as if traced, and a sun in the corner.",
    positioning:
      "Serves every content kind in one grammar. Choose it for a kindergarten parents' meeting, a family evening or a picture-book talk that should feel drawn by hand and keep its sections apart by colour.",
    audience: "Parents and families in a classroom or a hall, reading each page while a teacher talks it through.",
    notFor: "A board meeting or an investor update, where crayon colours and doodles would read as play.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 5 },
  ],
  pageFields: ["kicker"],
  // The waiver sets the worked example (a waterfall) beside the two cards and the reach.
  fullBodyCompanions: ["icon_cards", "kpi_cards"],
  drawsPhoto: true,
  headingFit: CRAYON_HEAD_FIT,
} satisfies LayoutDefinition
