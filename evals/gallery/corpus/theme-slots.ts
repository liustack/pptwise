/**
 * Fixed theme-table assignment: which lead component each of a theme's
 * seven content pages draws, plus the explicit coverage list the tests
 * refuse to let rot.
 *
 * Zero `Math.random`. The table is the whole contract.
 */

import type { Component } from "@/ir"
import { CHART_VARIANTS, COMPONENT_BUILDERS } from "./components"
import type { Lexicon } from "./lexicon"

/**
 * Surfaces the theme table must show at least once. Missing one fails the
 * test. Hand-written, not a `COMPONENT_TYPES` spread, so a new IR type
 * does not silently get absorbed without a human adding it here.
 */
export const THEME_TABLE_REQUIRED_SURFACES = [
  // every IR type, COMPONENT_BUILDERS key order
  "paragraph",
  "bullets",
  "blockquote",
  "quote_wall",
  "callout",
  "code",
  "verdict_banner",
  "kpi_cards",
  "progress_donuts",
  "chart",
  "data_table",
  "waterfall",
  "heatmap",
  "gantt",
  "sankey",
  "steps",
  "concept_equation",
  "numbered_cards",
  "icon_cards",
  "row_cards",
  "timeline",
  "roadmap",
  "cycle",
  "staircase",
  "chevron_process",
  "swimlane",
  "journey_map",
  "decision_tree",
  "hub_spoke",
  "segmented_wheel",
  "rings",
  "pros_cons",
  "positioning_map",
  "venn",
  "fishbone",
  "matrix",
  "from_to",
  "flowchart",
  "architecture",
  "comparison",
  "insight_panel",
  "swot",
  "pest",
  "five_forces",
  "bmc",
  "people_cards",
  "image",
  "image_grid",
  "image_compare",
  "logo_wall",
  "product_cards",
  "device_mockup",
  // 9 chart subtypes + horizontal bar
  "chart:bar",
  "chart:bar-horizontal",
  "chart:line",
  "chart:area",
  "chart:pie",
  "chart:donut",
  "chart:funnel",
  "chart:dumbbell",
  "chart:scatter",
  "chart:gauge",
  "org_tree",
  "issue_tree",
  "pyramid",
  "iceberg",
  "pillar_model",
  "value_chain",
  "harvey_balls",
  "scorecard",
  "pictogram",
  "word_cloud",
] as const

export type ThemeChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "funnel"
  | "dumbbell"
  | "scatter"
  | "gauge"

export interface ThemeContentSlot {
  readonly type: string
  readonly chart_type?: ThemeChartType
  readonly direction?: "horizontal"
}

const CHART_VARIANT_KEY: Record<ThemeChartType, string> = {
  bar: "chart · bar",
  line: "chart · line",
  area: "chart · area",
  pie: "chart · pie",
  donut: "chart · donut",
  funnel: "chart · funnel",
  dumbbell: "chart · dumbbell",
  scatter: "chart · scatter",
  gauge: "chart · gauge",
}

function slot(type: string): ThemeContentSlot {
  return { type }
}

function chart(chart_type: ThemeChartType, direction?: "horizontal"): ThemeContentSlot {
  return direction === "horizontal"
    ? { type: "chart", chart_type: "bar", direction: "horizontal" }
    : { type: "chart", chart_type }
}

/**
 * Per-theme content-page order (seven unique lead types). Chart subtype
 * is noted on chart slots.
 */
export const THEME_CONTENT_SLOTS: Record<string, readonly ThemeContentSlot[]> = {
  thesis: [slot("icon_cards"), slot("paragraph"), chart("funnel"), slot("quote_wall"), slot("callout"), slot("code"), slot("insight_panel")],
  arena: [chart("scatter"), slot("verdict_banner"), slot("insight_panel"), slot("pros_cons"), slot("waterfall"), slot("heatmap"), slot("gantt")],
  rally: [chart("dumbbell"), slot("hub_spoke"), slot("insight_panel"), slot("swot"), slot("pest"), slot("five_forces"), slot("bmc")],
  homeroom: [chart("gauge"), slot("image_grid"), slot("image"), slot("image_compare"), slot("device_mockup"), slot("data_table"), slot("pillar_model")],
  brief: [chart("bar"), slot("bullets"), slot("kpi_cards"), slot("positioning_map"), slot("heatmap"), slot("row_cards"), slot("architecture")],
  crayon: [slot("numbered_cards"), slot("bullets"), slot("swot"), slot("gantt"), slot("callout"), slot("image_grid"), slot("comparison")],
  ember: [slot("numbered_cards"), slot("data_table"), slot("flowchart"), slot("rings"), slot("image"), slot("pest"), slot("fishbone")],
  bulletin: [slot("waterfall"), slot("bullets"), slot("icon_cards"), slot("bmc"), slot("timeline"), slot("architecture"), slot("device_mockup")],
  heritage: [slot("cycle"), slot("data_table"), slot("people_cards"), slot("image_grid"), slot("image_compare"), slot("five_forces"), slot("paragraph")],
  ink: [chart("bar", "horizontal"), slot("row_cards"), slot("blockquote"), slot("steps"), slot("callout"), slot("heatmap"), slot("image_grid")],
  ledger: [slot("cycle"), slot("kpi_cards"), slot("staircase"), slot("concept_equation"), slot("sankey"), slot("harvey_balls"), slot("value_chain")],
  journal: [chart("line"), slot("numbered_cards"), slot("comparison"), slot("blockquote"), slot("roadmap"), slot("callout"), slot("journey_map")],
  lecture: [chart("area"), slot("timeline"), slot("bmc"), slot("bullets"), slot("image_grid"), slot("matrix"), slot("paragraph")],
  luxe: [slot("progress_donuts"), slot("swot"), slot("gantt"), slot("blockquote"), slot("device_mockup"), slot("flowchart"), slot("timeline")],
  memo: [chart("donut"), slot("paragraph"), slot("icon_cards"), slot("pest"), slot("blockquote"), slot("rings"), slot("waterfall")],
  museum: [slot("cycle"), slot("kpi_cards"), slot("org_tree"), slot("heatmap"), slot("segmented_wheel"), slot("logo_wall"), slot("architecture")],
  playbill: [slot("image_grid"), slot("data_table"), slot("word_cloud"), slot("steps"), slot("five_forces"), slot("image"), slot("row_cards")],
  clinic: [slot("numbered_cards"), slot("comparison"), slot("sankey"), slot("people_cards"), slot("image_compare"), slot("issue_tree"), slot("swimlane")],
  runway: [slot("steps"), slot("data_table"), slot("product_cards"), slot("image_grid"), slot("chevron_process"), slot("verdict_banner"), slot("gantt")],
  stage: [slot("timeline"), slot("kpi_cards"), slot("pyramid"), slot("bmc"), slot("image"), slot("blockquote"), slot("architecture")],
  swiss: [chart("pie"), slot("venn"), slot("comparison"), slot("people_cards"), slot("scorecard"), slot("icon_cards"), slot("flowchart")],
  terminal: [slot("icon_cards"), slot("data_table"), slot("waterfall"), slot("code"), slot("device_mockup"), slot("decision_tree"), slot("roadmap")],
  almanac: [slot("icon_cards"), slot("iceberg"), slot("timeline"), slot("pest"), slot("image_compare"), slot("rings"), slot("pictogram")],
  vermilion: [slot("comparison"), slot("kpi_cards"), slot("gantt"), slot("from_to"), slot("people_cards"), slot("code"), slot("architecture")],
}

/** Build the lead component for one theme-table content slot. */
export function buildThemeSlot(spec: ThemeContentSlot, lex: Lexicon): Component {
  if (spec.type === "chart") {
    const key =
      spec.direction === "horizontal" ? "chart · bar horizontal" : CHART_VARIANT_KEY[spec.chart_type ?? "bar"]
    const build = CHART_VARIANTS[key]
    if (!build) throw new Error(`theme table has no chart variant for ${key}`)
    return build(lex)
  }
  const build = COMPONENT_BUILDERS[spec.type]
  if (!build) throw new Error(`theme table has no builder for ${spec.type}`)
  return build(lex)
}
