import type { Component } from "@/ir"
import type { CompositionId } from ".."
import { NOTICE_KINDS_BOARD } from "./notice-kinds-board"

/*
 * Sample pages for the compositions no showcase page opens on, for
 * `../recipes.test.tsx`. Every other composition takes its samples from the
 * showcase pages it draws.
 *
 * Most of these draw part of a showcase page another composition hands on
 * (`handOn`): docket draws the figures beside an inset photograph, span the
 * figures beside a log. Their sample is that page cut to the components
 * they draw (`keep`, indexes into the page's components), parade the row
 * of pictures a chapter page opens on. The rest come
 * from their own boards.
 */

/** A showcase page cut to some of its components: `deck` is `<theme>/<lang>`, `page` 1-based. */
export interface CutSample {
  deck: string
  page: number
  keep: readonly number[]
}

/** A page of its own, set into the theme's showcase deck in place of its first content page. */
export interface OwnSample {
  theme: string
  heading: string
  components: Component[]
  footnote?: string
}

/** bulletin's September page: two years of retail by month, the last month a forecast. */
const RETAIL = {
  type: "chart",
  chart_type: "bar",
  axes: { y_unit: "万辆" },
  series: [
    { name: "2025 年", data: [{ x: "7 月", y: 182.6 }, { x: "8 月", y: 199.5 }, { x: "9 月", y: 224.1 }] },
    { name: "2026 年", emphasis: true, data: [{ x: "7 月", y: 146.1 }, { x: "8 月", y: 154.1 }, { x: "9 月", y: 169, status: "forecast" }] },
  ],
} as Component

function noticeSamples(): Partial<Record<CompositionId, OwnSample[]>> {
  const out: Partial<Record<CompositionId, OwnSample[]>> = {}
  for (const page of Object.values(NOTICE_KINDS_BOARD)) {
    const sample: OwnSample = { theme: "bulletin", heading: page.heading, components: page.components, ...(page.footnote !== undefined ? { footnote: page.footnote } : {}) }
    ;(out[page.drawnBy] ??= []).push(sample)
  }
  return out
}

/** Whether a sample cuts a showcase page. */
export function isCut(sample: CutSample | OwnSample): sample is CutSample {
  return "deck" in sample
}

export const RECIPE_SAMPLES: Partial<Record<CompositionId, (CutSample | OwnSample)[]>> = {
  shifts: [{ deck: "ledger/en", page: 5, keep: [1] }],
  trend: [{ deck: "vermilion/en", page: 9, keep: [0] }],
  span: [{ deck: "terminal/en", page: 6, keep: [1] }],
  tallies: [{ deck: "memo/en", page: 3, keep: [0] }],
  rota: [{ deck: "memo/en", page: 10, keep: [0] }],
  docket: [{ deck: "clinic/en", page: 4, keep: [1] }],
  descent: [{ deck: "luxe/en", page: 4, keep: [1] }],
  doubles: [{ deck: "luxe/en", page: 6, keep: [1] }],
  // The pictures runway's chapter page draws in a row, set as a page's body.
  parade: [{ deck: "runway/en", page: 12, keep: [0] }],
  tree: [
    {
      theme: "brief",
      heading: "One steering group owns the turnaround, three leads own a lever each",
      components: [
        {
          type: "org_tree",
          root: { name: "Steering group", role: "COO, CFO, Halden partner" },
          children: [
            { name: "First attempts", role: "VP Customer" },
            { name: "Route density", role: "VP Network" },
            { name: "Overtime", role: "VP Operations" },
          ],
        } as Component,
      ],
    },
  ],
  // The settings no showcase page uses these in, from their boards.
  rows: [
    {
      theme: "brief",
      heading: "Three causes, none of them the fleet",
      components: [
        { type: "bullets", items: ["Missed deliveries: No time windows", "Density: Routes cut for 2022 volume", "Overtime: Shifts planned same day"] },
        { type: "callout", variant: "info", text: "None of the three needs a single new van. All three need a better plan." },
      ] as Component[],
    },
  ],
  waves: [
    {
      theme: "brief",
      heading: "Twelve months, four phases, one target each",
      components: [
        {
          type: "roadmap",
          items: [
            { title: "Pilot", period: "Months 1 to 3", rows: [{ label: "Depots", value: "3" }, { label: "Target", value: "$0.40 off per parcel" }] },
            { title: "First attempts", period: "Months 4 to 6", rows: [{ label: "Depots", value: "20" }, { label: "Target", value: "92% success" }] },
            { title: "Route re-cut", period: "Months 7 to 9", rows: [{ label: "Depots", value: "All 46" }, { label: "Target", value: "15% more stops" }] },
            { title: "Overtime and handover", period: "Months 10 to 12", rows: [{ label: "Owner", value: "Northwind ops" }, { label: "Target", value: "Run rate reached" }] },
          ],
        },
      ] as Component[],
    },
  ],
  bridge: [
    {
      theme: "bulletin",
      heading: "Conventional cars took most of the fall",
      components: [
        {
          type: "waterfall",
          unit: "万辆",
          items: [
            { label: "2025 年 7–8 月", value: 382.1, kind: "total" },
            { label: "新能源", value: -13.2 },
            { label: "常规燃油车", value: -68.7, emphasis: true },
            { label: "2026 年 7–8 月", value: 300.2, kind: "total" },
          ],
        },
      ] as Component[],
    },
  ],
  columns: [
    { theme: "bulletin", heading: "September brought no peak season", components: [RETAIL] },
    { theme: "swiss", heading: "September brought no peak season", components: [RETAIL] },
  ],
  bars: [
    { deck: "bulletin/en", page: 6, keep: [0] },
    {
      theme: "ledger",
      heading: "BYD gave up the most share",
      components: [
        {
          type: "chart",
          chart_type: "bar",
          direction: "horizontal",
          axes: { y_unit: "%" },
          series: [{ name: "2026 年 8 月", data: [{ x: "比亚迪", y: 23.3, emphasis: true }, { x: "吉利", y: 11 }, { x: "长安", y: 5.8 }, { x: "特斯拉中国", y: 5 }] }],
        },
      ] as Component[],
    },
  ],
  share: [
    {
      theme: "bulletin",
      heading: "Wind and solar now hold almost half the capacity",
      components: [
        {
          type: "chart",
          chart_type: "stacked",
          direction: "horizontal",
          axes: { y_unit: "亿千瓦" },
          series: [
            { name: "太阳能", emphasis: true, data: [{ x: "2025 年末全国发电装机", y: 12.02 }] },
            { name: "风电", emphasis: true, data: [{ x: "2025 年末全国发电装机", y: 6.4 }] },
            { name: "火电", data: [{ x: "2025 年末全国发电装机", y: 15.39 }] },
            { name: "水电", data: [{ x: "2025 年末全国发电装机", y: 4.48 }] },
            { name: "核电", data: [{ x: "2025 年末全国发电装机", y: 0.62 }] },
          ],
        },
      ] as Component[],
    },
  ],
  cards: [
    {
      theme: "clinic",
      heading: "Three rules hold every prescription",
      components: [
        {
          type: "icon_cards",
          items: [
            { icon: "stethoscope", title: "Who may prescribe", text: "Endocrinology and weight clinics only" },
            { icon: "clipboard-check", title: "Reviewed first", text: "Pharmacy checks every prescription before it is filled" },
            { icon: "wallet", title: "Self-pay", text: "Weight loss is billed outside insurance" },
          ],
        },
      ] as Component[],
    },
  ],
  ...noticeSamples(),
}

