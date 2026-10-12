/**
 * The sample deck a theme is drawn with to find its brand face
 * (`./brand-face.ts`): a cover, a chapter, one page for every content kind,
 * and an ending. Each page holds one component every built-in face for that
 * kind accepts, so the deck reaches every face a menu names without knowing
 * which faces those are.
 *
 * The photo is a flat grey, so it adds no color of its own to the count.
 */
export const BRAND_SAMPLE_PHOTO = "brand-sample-photo"

const GREY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAADklEQVR4nGNoQAIMODkAXzYSAY5zHKsAAAAASUVORK5CYII="

/** One content page per kind, in the vocabulary's order. */
const CONTENT_PAGES: readonly Record<string, unknown>[] = [
  {
    kind: "points",
    heading: "What we decided",
    components: [{ type: "bullets", items: ["Hold hiring at 42", "Cut the analytics rebuild", "Share the support rotation"] }],
  },
  {
    kind: "list",
    heading: "Open workstreams",
    components: [{ type: "bullets", items: ["EU residency addendum", "Partner invite flow", "Invoice localization"] }],
  },
  {
    kind: "comparison",
    heading: "Build vs buy",
    components: [
      {
        type: "comparison",
        columns: ["Build", "Buy"],
        rows: [
          { label: "Time to first report", cells: ["14 weeks", "3 weeks"] },
          { label: "Year-one cost", cells: ["$420k", "$180k"] },
        ],
      },
    ],
  },
  {
    kind: "process",
    heading: "How we ship",
    components: [
      {
        type: "steps",
        items: [
          { title: "Scope", text: "One page, one owner" },
          { title: "Build", text: "Two-week slices" },
          { title: "Prove", text: "A number in production" },
        ],
      },
    ],
  },
  {
    kind: "data",
    heading: "Revenue against target",
    components: [
      {
        type: "chart",
        chart_type: "bar",
        series: [
          { name: "Actual", data: [{ x: "Q1", y: 12 }, { x: "Q2", y: 14 }, { x: "Q3", y: 16 }, { x: "Q4", y: 18 }] },
          { name: "Target", data: [{ x: "Q1", y: 12 }, { x: "Q2", y: 15 }, { x: "Q3", y: 16 }, { x: "Q4", y: 17 }] },
        ],
      },
    ],
  },
  {
    kind: "photo",
    heading: "The new floor",
    components: [{ type: "image", asset_id: BRAND_SAMPLE_PHOTO, caption: "Level three, the week we moved in" }],
  },
  {
    kind: "statement",
    heading: "We will not add a fourth product line this year",
    components: [{ type: "paragraph", text: "Three products is the house." }],
  },
  {
    kind: "quote",
    heading: "From the floor",
    components: [{ type: "blockquote", text: "We almost shipped the wrong thing.", attribution: "Team lead" }],
  },
  {
    kind: "fact",
    heading: "NPS",
    components: [{ type: "kpi_cards", items: [{ value: "61", label: "trailing 90-day NPS", delta: "up" }] }],
  },
  {
    kind: "evidence",
    heading: "What customers said",
    components: [{ type: "blockquote", text: "Setup took an afternoon, not a quarter.", attribution: "Operations director" }],
  },
  {
    kind: "hierarchy",
    heading: "Who owns what",
    components: [
      {
        type: "org_tree",
        root: { name: "Dana Reyes", role: "COO" },
        children: [
          { name: "Sam Okafor", role: "Platform" },
          { name: "Lee Park", role: "Growth" },
        ],
      },
    ],
  },
]

const COVER = { type: "cover", heading: "Third Quarter Review", subheading: "Q3 operating report for the board" }
const CHAPTER = { type: "chapter", heading: "The Quarter" }
const ENDING = { type: "ending", heading: "See you Thursday" }

/** Every page heading the sample deck sets, so a measure can tell a heading run from other words. */
export const BRAND_SAMPLE_HEADINGS: readonly string[] = [COVER, CHAPTER, ...CONTENT_PAGES, ENDING].map((page) => page.heading as string)

/** The sample deck for `themeId`, keeping the content kinds in `offered`. */
export function brandSampleIr(themeId: string, offered: ReadonlySet<string>): Record<string, unknown> {
  return {
    version: "5",
    filename: "brand-sample",
    theme: { id: themeId },
    meta: { organization: "Northstar", date: "2026-10-01" },
    assets: { images: { [BRAND_SAMPLE_PHOTO]: { src: GREY_PNG, alt: "An office floor" } } },
    slides: [
      COVER,
      CHAPTER,
      ...CONTENT_PAGES.filter((page) => offered.has(page.kind as string)).map((page) => ({ type: "content", ...page })),
      ENDING,
    ],
  }
}
