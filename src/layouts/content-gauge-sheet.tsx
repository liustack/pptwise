import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { stepAside } from "../render/step-aside"
import { GAUGE_HEAD_FIT } from "./gauge-shared"
import { GaugeSheetPage, composeSheet } from "./gauge-sheet/sheet"

/*
 * gauge-sheet: the brief board's ordinary content page. The claim sits on the
 * y172 rule, the source closes the page above the footer, and between them
 * the body takes one of the board's hand-set compositions when the content
 * has that shape (the shared `compositions/`): numbered rows with a closing
 * block, an options table, phase columns, a two-level team, or a chart with a
 * change column beside it. Any other content is drawn by the ordinary component
 * renderer in the same band, and a page that band cannot hold steps aside.
 */
export function GaugeSheetContent({ slide, ctx }: SvgTemplateProps) {
  const sheet = composeSheet(slide, ctx)
  if (!sheet.composed) {
    const aside = stepAside({ face: "gauge-sheet", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return <GaugeSheetPage slide={slide} ctx={ctx} sheet={sheet} />
}

export const layoutDef = {
  branding: "none",
  // Rows, a table, phase columns, a team chart or a chart with its change
  // column: one face, several pages, so several kinds may share it.
  dispatch: "content",
  id: "gauge-sheet",
  kind: "standard",
  story: {
    name: "Gauge Sheet",
    story: "A regular-weight claim on a navy rule, the evidence beneath it, and the source on a quiet line at the foot. Lists become ruled numbered rows, options a table with the pick lifted onto white, and phases open columns.",
    positioning: "Serves points, lists, comparisons, processes, data and team pages in one report grammar. Choose it when every page after the verdict should read as the same bound document.",
    audience: "Readers who want each page to state its point first and prove it below.",
    notFor: "A single figure or a single statement, which belong in Gauge Figure and Gauge Verdict.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
  ],
  headingFit: GAUGE_HEAD_FIT,
} satisfies LayoutDefinition
