import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { stepAside } from "../render/step-aside"
import {
  cjkOnly,
  fitPeriodical,
  paintPeriodical,
  paintPeriodicalTracked,
  periodicalBaseline,
  periodicalInks,
  periodicalText,
  periodicalTrackedWidth,
} from "./compositions/periodical"
import { MastheadRules, MastheadSection, PeriodicalClaim, PeriodicalSource, fitPeriodicalSource, periodicalBodyRect } from "./periodical-shared"
import { SvgContent } from "../render/svg-content"

/*
 * periodical-quote: journal's quotation page, drawn to its 2026-10 board
 * (p08). Under the masthead (the page's section in the accent over the heavy
 * rule and the hairline; the column, the issue and the folio are the
 * motif's) the page's heading is a small line in the accent, bold and
 * tracked, saying whose words these are; a quotation mark stands huge in the
 * accent at the left; the words themselves are set at 40/64 in the heading
 * serif, one sentence a line where the author broke them; a short rule in
 * the accent, and under it the attribution in the grey, as the author wrote
 * it, with nothing added before it. The page's source, when it has one,
 * stands at the foot as on every other page.
 *
 * Takes one `blockquote`. A page it cannot set as a quotation (more than
 * four lines, an attribution past two) gets the claim over the page and its
 * body under it, and steps aside when that band cannot hold it.
 */

const LABEL = { x: 220, top: 100, lineHeight: 24, size: 13, tracking: { cjk: 3, latin: 1 }, w: 900 } as const
const MARK = { x: 64, top: 130, lineHeight: 200, size: 200 } as const
const QUOTE = { x: 220, top: 170, w: 900, size: 40, lineHeight: 64, maxLines: 4 } as const
const RULE = { x: 220, y: 470, w: 80, h: 2 } as const
const ATTRIBUTION = { x: 220, top: 486, w: 900, size: 14, lineHeight: 25, maxLines: 2 } as const

/** The quotation's lines: the author's own breaks kept, each wrapped to the measure, four at most. */
function fitQuote(text: string, ctx: SvgTemplateProps["ctx"]) {
  const parts = text
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  const spec = { width: QUOTE.w, size: QUOTE.size, lineHeight: QUOTE.lineHeight, serif: true, bold: true } as const
  const fitted = parts.map((part) => fitPeriodical(part, { ...spec, maxLines: QUOTE.maxLines }, ctx))
  if (fitted.some((f) => !f)) return null
  const lines = fitted.flatMap((f) => f!.lines)
  const segments = fitted.flatMap((f) => f!.segments)
  if (lines.length > QUOTE.maxLines || lines.length === 0) return null
  return { ...fitted[0]!, lines, segments }
}

export function PeriodicalQuoteContent({ slide, ctx }: SvgTemplateProps) {
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const source = fitPeriodicalSource(slide, ctx)
  const [component] = slide.components
  const quote = component?.type === "blockquote" && slide.components.length === 1 ? component : null
  const lines = quote ? fitQuote(quote.text, ctx) : null
  const attribution = quote?.attribution?.trim() ? fitPeriodical(quote.attribution, { width: ATTRIBUTION.w, size: ATTRIBUTION.size, lineHeight: ATTRIBUTION.lineHeight, maxLines: ATTRIBUTION.maxLines }, ctx) : null
  if (!quote || !lines || (quote.attribution?.trim() && !attribution)) {
    // Not one quotation it can hold: the claim over the page and the body
    // under it, as the periodical sheet sets a page none of its compositions takes.
    const rect = periodicalBodyRect(null)
    const aside = stepAside({ face: "periodical-quote", slide, ctx, bodyRect: rect })
    if (aside) return aside
    return (
      <>
        <MastheadSection text={slide.kicker} ctx={ctx} />
        <MastheadRules ctx={ctx} />
        <PeriodicalClaim heading={slide.heading} ctx={ctx} />
        <SvgContent components={slide.components} rect={rect} ctx={ctx} />
        <PeriodicalSource source={source} ctx={ctx} />
      </>
    )
  }
  const label = stripEmphasis(slide.heading ?? "").trim()
  const labelTracking = cjkOnly(label) ? LABEL.tracking.cjk : LABEL.tracking.latin
  const labelFits = !label || periodicalTrackedWidth(label, LABEL.size, labelTracking, ctx, { bold: true }) <= LABEL.w
  return (
    <>
      <MastheadSection text={slide.kicker} ctx={ctx} />
      <MastheadRules ctx={ctx} />
      {label ? (
        <g data-periodical-quote-label="" data-truncated={labelFits ? undefined : "1"}>
          {paintPeriodicalTracked({ ctx, text: label, x: LABEL.x, y: periodicalBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: labelFits ? labelTracking : 0, bold: true, fill: periodicalText(inks.brick, ground, LABEL.size) })}
        </g>
      ) : null}
      <text data-periodical-quote-mark="" x={MARK.x} y={periodicalBaseline(MARK.top, MARK.lineHeight, MARK.size, true)} fontFamily={ctx.fonts.heading} fontSize={MARK.size} fontWeight="700" fill={periodicalText(inks.brick, ground, MARK.size)} dominantBaseline="alphabetic">
        {"“"}
      </text>
      {lines ? <g data-periodical-quote="">{paintPeriodical(lines, { ctx, x: QUOTE.x, top: QUOTE.top, serif: true, bold: true, fill: periodicalText(inks.ink, ground, QUOTE.size) })}</g> : null}
      <rect x={RULE.x} y={RULE.y - RULE.h / 2} width={RULE.w} height={RULE.h} fill={inks.brick} />
      {attribution ? <g data-periodical-attribution="">{paintPeriodical(attribution, { ctx, x: ATTRIBUTION.x, top: ATTRIBUTION.top, fill: periodicalText(inks.muted, ground, ATTRIBUTION.size) })}</g> : null}
      <PeriodicalSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  id: "periodical-quote",
  kind: "standard",
  story: {
    name: "Periodical Quote",
    story: "A magazine's quotation page: a small red line saying whose words these are, a quotation mark set huge, the words in a bookish serif one sentence a line, and the attribution under a short rule, exactly as written.",
    positioning: "Gives a quote its own page in an editorial deck. Choose it when the words should be read before anything is said about them.",
    audience: "Readers who will weigh the words and want to know exactly where they come from.",
    notFor: "A slogan or the deck's own claim, which belongs on a statement page.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["blockquote"], capacity: 1 },
  ],
  pageFields: ["kicker"],
  subheading: { none: "fold it into the heading, the line over the quotation that says whose words these are, or remove it" },
  headingFit: { maxWidth: LABEL.w, fontSize: LABEL.size, maxLines: 1, minPt: LABEL.size, bold: true },
} satisfies LayoutDefinition
