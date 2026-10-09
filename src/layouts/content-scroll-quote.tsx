import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { stepAside } from "../render/step-aside"
import { SvgContent } from "../render/svg-content"
import { compose } from "./compositions"
import { fitScroll, fitVertical, paintScroll, paintVertical, scrollInks, scrollText, uprightText } from "./compositions/scroll"
import { ScrollClaim, ScrollSource, ScrollVolume, fitScrollSource, scrollBodyRect, SCROLL_BAND_TOP } from "./scroll-shared"

/*
 * scroll-quote: ink's quotation page, drawn to its 2026-10 board (p03). The
 * passage the page quotes (one `blockquote`) is set by the `statute`
 * composition: in Chinese upright in columns read from the right, a short
 * cinnabar bar at its head and where it comes from in a column of its own
 * beside it; in a Latin deck across the band. The page's claim is what the
 * speaker draws from it, in cinnabar in the heading face at the far left:
 * upright down a column in Chinese, across a narrow column in Latin. The
 * page's source stands at the foot. The volume (the page's `kicker`) is down
 * the left margin and the rest of the frame is the motif's, as on every
 * content page.
 *
 * A page it cannot set as a passage gets the claim over the page and its
 * body under it, and steps aside when that band cannot hold it.
 */

/** The claim upright: a column centred on x200, from y90, 22px cells every 26px, two columns at most. */
const LEAD_UPRIGHT = { x: 200, top: 90, size: 22, tracking: 4, capacity: 20, pitch: 40, maxColumns: 2 } as const
/** The claim across: a 220px column from x110, 22/34. */
const LEAD_ACROSS = { x: 110, top: 90, w: 220, size: 22, lineHeight: 34, maxLines: 9 } as const
/** The band the passage is set in: from x240 in Chinese, x356 across. */
const BAND = { upright: 240, across: 356, right: 1170, bottom: 640 } as const

export function ScrollQuoteContent({ slide, ctx }: SvgTemplateProps) {
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const source = fitScrollSource(slide, ctx)
  const [component] = slide.components
  const quote = component?.type === "blockquote" && slide.components.length === 1 ? component : null
  const heading = stripEmphasis(slide.heading ?? "").trim()
  const upright = quote !== null && uprightText(quote.text) && (!heading || uprightText(heading))
  const leadColumns = upright && heading ? fitVertical(slide.heading, LEAD_UPRIGHT) : null
  const leadAcross = !upright && heading ? fitScroll(slide.heading, { width: LEAD_ACROSS.w, size: LEAD_ACROSS.size, lineHeight: LEAD_ACROSS.lineHeight, maxLines: LEAD_ACROSS.maxLines, serif: true }, ctx) : null
  const leadFits = !heading || (upright ? leadColumns !== null : leadAcross !== null)
  const left = upright ? BAND.upright : BAND.across
  const passage = quote && leadFits ? compose({ components: slide.components, ctx, rect: { x: left, y: SCROLL_BAND_TOP, w: BAND.right - left, h: BAND.bottom - SCROLL_BAND_TOP }, setting: "scroll" }, ["statute"]) : null
  if (!passage) {
    // Not one passage it can hold: the claim over the page and the body under
    // it, as the scroll sheet sets a page none of its compositions takes.
    const rect = scrollBodyRect()
    const aside = stepAside({ face: "scroll-quote", slide, ctx, bodyRect: rect })
    if (aside) return aside
    return (
      <>
        <ScrollVolume text={slide.kicker} ctx={ctx} />
        <ScrollClaim heading={slide.heading} ctx={ctx} />
        <SvgContent components={slide.components} rect={rect} ctx={ctx} />
        <ScrollSource source={source} ctx={ctx} />
      </>
    )
  }
  const lead = scrollText(inks.cinnabar, ground, LEAD_UPRIGHT.size)
  return (
    <>
      <ScrollVolume text={slide.kicker} ctx={ctx} />
      {leadColumns ? <g data-scroll-quote-lead="">{paintVertical(leadColumns, { ctx, x: LEAD_UPRIGHT.x, top: LEAD_UPRIGHT.top, spec: LEAD_UPRIGHT, fill: lead })}</g> : null}
      {leadAcross ? <g data-scroll-quote-lead="">{paintScroll(leadAcross, { ctx, x: LEAD_ACROSS.x, top: LEAD_ACROSS.top, serif: true, fill: lead })}</g> : null}
      {passage}
      <ScrollSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  id: "scroll-quote",
  kind: "standard",
  story: {
    name: "Scroll Quote",
    story: "A passage set the way it was written: upright in columns read from the right, a short cinnabar bar at its head, where it comes from in a column beside it, and what the speaker draws from it in cinnabar at the far left.",
    positioning: "Gives a law, a classic or a letter its own page in a lecture. Choose it when the words should be read as they stand before anyone explains them.",
    audience: "Listeners who will weigh the exact words and want to know where they come from.",
    notFor: "A slogan or the deck's own claim, which belongs on a statement page.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["blockquote"], capacity: 1 },
  ],
  pageFields: ["kicker"],
  subheading: { none: "fold it into the heading, what the speaker draws from the passage, or remove it" },
  headingFit: { maxWidth: LEAD_ACROSS.w, fontSize: LEAD_ACROSS.size, maxLines: LEAD_ACROSS.maxLines, minPt: LEAD_ACROSS.size, bold: false, lineHeightRatio: LEAD_ACROSS.lineHeight / LEAD_ACROSS.size },
} satisfies LayoutDefinition
