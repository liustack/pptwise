import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { stepAside } from "../render/step-aside"
import { GAUGE_HEAD_FIT } from "./gauge-shared"
import { GaugeSheetPage, composeSheet } from "./gauge-sheet/sheet"

/*
 * gauge-exhibit: the brief board's evidence page. The same frame as
 * gauge-sheet, holding one exhibit across the whole band: a bridge, a chart,
 * a table. It is a separate face because it promises one exhibit rather than
 * a stack of blocks, which is what an evidence page is for.
 */
export function GaugeExhibitContent({ slide, ctx }: SvgTemplateProps) {
  const sheet = composeSheet(slide, ctx)
  if (!sheet.composed) {
    const aside = stepAside({ face: "gauge-exhibit", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return <GaugeSheetPage slide={slide} ctx={ctx} sheet={sheet} />
}

export const layoutDef = {
  branding: "none",
  id: "gauge-exhibit",
  kind: "standard",
  story: {
    name: "Gauge Exhibit",
    story: "A regular-weight claim on a navy rule over one exhibit that fills the page, with its source on a quiet line at the foot. The bars the author marked take the highlight, and the rest recede to grey.",
    positioning: "Serves evidence at one exhibit, and the evidence page of the Brief preset uses it. Choose it when a single bridge, chart or table proves the claim above it.",
    audience: "Readers checking that the number in the claim is the number in the exhibit.",
    notFor: "Several exhibits or a list of points, which belong in Gauge Sheet.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 1 },
  ],
  headingFit: GAUGE_HEAD_FIT,
} satisfies LayoutDefinition
