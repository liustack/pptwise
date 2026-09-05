import { describe, it, expect } from "vitest"
import JSZip from "jszip"
import { generatePptxBlob } from "./generate"
import { COMPONENT_TYPES, type Component, type PptxIR, type Slide } from "@/ir"

/**
 * Regression guard for the "zero unexpected rasterization" fidelity
 * invariant (borrow-wave, task 1). Across the whole conversion chain
 * (`svg2pptx/dispatch.ts`'s `svgToOps`/`leafToOp` → `svg2pptx/render.ts`'s
 * `renderOp`), the only SVG leaf that can ever become a `<p:pic>` is
 * `<image>` backed by a real, resolvable asset (the `image` op case →
 * pptxgenjs `addImage`). Every other leaf — `<rect>`/`<circle>`/`<ellipse>`/
 * `<line>`/`<polygon>`/`<polyline>`/`<path>`/`<text>`, including every
 * lucide icon primitive in `src/render/icons.tsx` — lands as a native shape,
 * connector, custGeom, or text run, never a picture. Every `<image>`-
 * emitting call site (`image.tsx`, `image-grid.tsx`, `image-compare.tsx`,
 * `background.tsx`'s asset background, `branding.tsx`'s logo, and
 * `image-pages.tsx`'s 4 `image-*` takeover layouts) resolves a real asset
 * first and falls back to a placeholder — a `<rect>` for content image
 * slots, or simply omits itself for the optional branding logo — when
 * one is missing, never to `<image>`. Until this file, that invariant had
 * no regression coverage: nothing would fail if a future change made some
 * decorative motif or a "screenshot fallback" start emitting a raster
 * image.
 *
 * Proven two ways against the real `generatePptxBlob` (never a mock, same
 * posture as this directory's `all-themes.test.ts` and
 * `generate-notes-export.test.ts`):
 *
 * 1. `noAssetIr()` — one deck covering every registered `COMPONENT_TYPES`
 *    entry (completeness self-checked below, same discipline
 *    `full-matrix-contrast.test.ts`'s `MUTED_SURFACE_CLASS` guard already
 *    uses — it fails the moment a 29th component type ships uncovered)
 *    with `assets.images` empty. The 3 image-family types
 *    (`image`/`image_grid`/`image_compare`) are deliberately included, each
 *    referencing an asset id that resolves to nothing, so the deck
 *    exercises their missing-asset fallback rather than just omitting them
 *    — exports with `ppt/media/` empty and zero `<p:pic>` on every slide.
 * 2. `withAssetIr()` — the same deck plus one appended slide holding one
 *    real `image` component backed by one real (1x1 PNG) asset — exports
 *    with the delta exactly +1 media part and +1 `<p:pic>`, landing on
 *    exactly that new slide. Every other slide, including the one carrying
 *    the 3 dangling-asset image-family components from (1), stays at zero
 *    — proving resolution is per-asset, not "some image exists in the IR
 *    somewhere."
 *
 * Sibling to `all-themes.test.ts` (same directory, same real-`generatePptxBlob`
 * posture). `svg2pptx/integration.test.ts` was the other candidate location
 * but is a single-file dispatch/render unit test (already covers one
 * `<image>` at the op-conversion level) rather than a whole-package
 * assertion, so it stays a narrower complement to this file, not a
 * replacement.
 */

const swot: Component = {
  type: "swot",
  strengths: ["Deep bench"],
  weaknesses: ["Slow procurement"],
  opportunities: ["New region"],
  threats: ["New entrant"],
}
const bmc: Component = {
  type: "bmc",
  key_partners: ["Partner"],
  key_activities: ["Activity"],
  key_resources: ["Resource"],
  value_propositions: ["Value"],
  customer_relationships: ["Relationship"],
  channels: ["Channel"],
  customer_segments: ["Segment"],
  cost_structure: ["Cost"],
  revenue_streams: ["Stream"],
}
const waterfall: Component = {
  type: "waterfall",
  items: [
    { label: "Start", value: 100, kind: "total" },
    { label: "Gain", value: 20 },
    { label: "Loss", value: -8 },
  ],
}
const gantt: Component = {
  type: "gantt",
  items: [
    { label: "Design", start: 0, end: 3 },
    { label: "Build", start: 2, end: 6 },
  ],
  axis_labels: ["W1", "W2", "W3"],
}
const pest: Component = {
  type: "pest",
  political: { items: ["Regulation"] },
  economic: { items: ["Interest rates"] },
  social: { items: ["Habits shift"] },
  technological: { items: ["AI adoption"] },
}
const fiveForces: Component = {
  type: "five_forces",
  rivalry: { items: ["Top 3 hold 60% share"], intensity: "high" },
  new_entrants: { items: ["High licensing barrier"], intensity: "low" },
  supplier_power: { items: ["Component shortage"], intensity: "medium" },
  buyer_power: { items: ["Concentrated buyers"] },
  substitutes: { items: ["Open-source alternatives"], intensity: "medium" },
}
const heatmap: Component = {
  type: "heatmap",
  x_labels: ["Q1", "Q2", "Q3"],
  y_labels: ["North", "South"],
  values: [
    [10, 20, 30],
    [5, -5, 15],
  ],
  show_values: true,
}
const sankey: Component = {
  type: "sankey",
  nodes: [
    { id: "coal", label: "Coal" },
    { id: "gas", label: "Gas" },
    { id: "grid", label: "Grid" },
    { id: "homes", label: "Homes" },
    { id: "industry", label: "Industry" },
  ],
  links: [
    { from: "coal", to: "grid", value: 30 },
    { from: "gas", to: "grid", value: 50 },
    { from: "grid", to: "homes", value: 45 },
    { from: "grid", to: "industry", value: 35 },
  ],
}

/** The 3 image-family types, each pointed at an asset id that is never
 *  present in `assets.images` — deliberately exercising the "asset missing
 *  → placeholder, never `<image>`" fallback rather than sidestepping it by
 *  omitting these types from the zero-asset deck. */
const imageDangling: Component = {
  type: "image",
  asset_id: "does-not-exist",
  caption: "missing asset",
  fit: "cover",
}
const imageGridDangling: Component = {
  type: "image_grid",
  items: [{ asset_id: "does-not-exist-1" }, { asset_id: "does-not-exist-2" }],
}
const imageCompareDangling: Component = {
  type: "image_compare",
  left: { asset_id: "does-not-exist-left", label: "Before" },
  right: { asset_id: "does-not-exist-right", label: "After" },
}
/** device_mockup shares the same "asset missing → placeholder, device frame
 *  still renders" contract (device_mockup wave) — same dangling-id pattern. */
const deviceMockupDangling: Component = {
  type: "device_mockup",
  device: "browser",
  asset_id: "does-not-exist",
  url: "app.example.com",
  caption: "missing asset",
}
/** One minimal-valid instance per registered component type. */
const COMPONENT_BY_TYPE: Record<Component["type"], Component> = {
  kpi_cards: { type: "kpi_cards", items: [{ value: "42", label: "widgets", icon: "star" }] },
  chart: {
    type: "chart",
    chart_type: "bar",
    series: [{ name: "Revenue", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 14 }] }],
  },
  icon_cards: {
    type: "icon_cards",
    items: [
      { icon: "check", title: "Fast", text: "very fast indeed" },
      { icon: "star", title: "Good", text: "very good indeed" },
    ],
  },
  callout: { type: "callout", variant: "info", text: "note this", icon: "info" },
  swot,
  bmc,
  waterfall,
  gantt,
  pest,
  five_forces: fiveForces,
  heatmap,
  sankey,
  flowchart: {
    type: "flowchart",
    nodes: [
      { id: "a", label: "Start", kind: "round" },
      { id: "b", label: "Decide", kind: "diamond" },
    ],
    edges: [{ from: "a", to: "b", label: "go" }],
  },
  architecture: { type: "architecture", layers: [{ title: "Frontend", items: ["React", "SVG"] }] },
  timeline: {
    type: "timeline",
    milestones: [
      { date: "2026-01", title: "Kickoff", highlight: true },
      { date: "2026-06", title: "GA" },
    ],
  },
  comparison: {
    type: "comparison",
    columns: ["A", "B"],
    rows: [{ label: "Speed", cells: ["fast", "slow"] }],
  },
  row_cards: {
    type: "row_cards",
    items: [
      { icon: "check", title: "Item one", text: "detail", sub: "sub" },
      { icon: "star", title: "Item two", text: "detail" },
      { title: "Item three", text: "detail" },
    ],
  },
  steps: {
    type: "steps",
    items: [
      { title: "Step 1", text: "do this" },
      { title: "Step 2", text: "do that" },
    ],
  },
  rings: {
    type: "rings",
    items: [
      { label: "Core", desc: "center" },
      { label: "Shell", desc: "outer" },
    ],
  },
  numbered_cards: {
    type: "numbered_cards",
    items: [
      { title: "One", text: "first" },
      { title: "Two", text: "second" },
      { title: "Three", text: "third" },
    ],
  },
  roadmap: {
    type: "roadmap",
    items: [
      { title: "Phase 1", period: "0-3mo", rows: [{ label: "Goal", value: "Launch" }] },
      { title: "Phase 2", period: "3-6mo" },
    ],
  },
  matrix: {
    type: "matrix",
    x_title: "Effort",
    y_title: "Impact",
    cols: 2,
    items: [
      { title: "Quick win", tone: "accent" },
      { title: "Big bet", tone: "info" },
    ],
  },
  insight_panel: {
    type: "insight_panel",
    title: "Takeaway",
    rows: [{ label: "Signal", text: "trending up" }],
    footnote: "n=42",
  },
  verdict_banner: { type: "verdict_banner", text: "Ship it.", tone: "positive", icon: "check" },
  blockquote: { type: "blockquote", text: "Simplicity is the ultimate sophistication.", attribution: "da Vinci" },
  paragraph: { type: "paragraph", text: "This is a plain paragraph of body text for the probe deck." },
  bullets: { type: "bullets", items: ["one", "two", "three"] },
  code: { type: "code", language: "ts", code: "const x = 1" },
  image: imageDangling,
  image_grid: imageGridDangling,
  image_compare: imageCompareDangling,
  data_table: {
    type: "data_table",
    columns: [{ key: "metric", label: "Metric" }, { key: "q1", label: "Q1", align: "right" }],
    rows: [{ cells: { metric: "Revenue", q1: "120" }, emphasis: "total" }],
  },
  device_mockup: deviceMockupDangling,
  cycle: {
    type: "cycle",
    items: [
      { label: "Design" },
      { label: "Build" },
      { label: "Review" },
    ],
  },
  progress_donuts: {
    type: "progress_donuts",
    items: [
      { value: "86%", label: "coverage" },
      { value: "72%", label: "closure" },
    ],
  },
  from_to: {
    type: "from_to",
    from: { kicker: "from", title: "First half, actual" },
    to: { kicker: "to", title: "Second half, target" },
    rows: [
      { label: "Time to open", from: "9", to: "5", unit: "weeks", change: "four weeks off" },
      { label: "Renewal rate", from: "91", to: "95", unit: "%", change: "four points on" },
      { label: "Seats per account", from: "46", to: "72", unit: "seats" },
    ],
    span: "twelve months",
  },
  decision_tree: {
    type: "decision_tree",
    question: "Does the customer already run a data platform?",
    branches: [
      {
        edge: "already runs one",
        title: "Talk to their API",
        detail: "reuses their permissions",
        outcomes: [
          { edge: "38%", title: "Straight to production", detail: "peak risk theirs", value: "4", unit: "weeks" },
          { edge: "62%", title: "One cache in between", value: "6", unit: "weeks", recommended: true },
        ],
      },
      {
        edge: "runs none",
        title: "Host it for them",
        outcomes: [
          { edge: "55%", title: "Standard hosting", value: "9", unit: "weeks" },
          { edge: "45%", title: "Hosting plus build", value: "14", unit: "weeks" },
        ],
      },
    ],
  },
  journey_map: {
    type: "journey_map",
    stages: [
      { label: "Learn", touchpoints: ["report"], action: "compares three vendors", emotion: 4, opportunity: "targeted placement" },
      { label: "Onboard", touchpoints: ["checklist"], action: "chases permissions", emotion: 2, opportunity: "automate the handover" },
      { label: "Renew", action: "asks for budget", emotion: 4, opportunity: "bundle the upgrade" },
    ],
    row_labels: { touchpoints: "Touchpoints", action: "Behaviour", emotion: "Feeling", opportunity: "Opportunity" },
  },
  swimlane: {
    type: "swimlane",
    lanes: [{ label: "Success", role: "account team" }, { label: "Delivery" }],
    steps: [
      { lane: "Success", title: "Signal", detail: "2 days" },
      { lane: "Delivery", title: "Schedule", detail: "4 days" },
      { lane: "Success", title: "Sign" },
    ],
    handoff_note: "six days waiting between the two",
  },
  chevron_process: {
    type: "chevron_process",
    items: [
      { title: "Scope", text: "one page of intent" },
      { title: "Build" },
      { title: "Hand over" },
    ],
  },
  staircase: {
    type: "staircase",
    items: [
      { title: "Trial", value: "412" },
      { title: "Rollout", value: "248", unit: "orgs" },
      { title: "Platform", value: "96", unit: "orgs", note: "shared roadmap" },
    ],
  },
  harvey_balls: {
    type: "harvey_balls",
    criteria: ["Setup time", "Seat cost", "Integrations"],
    legend: true,
    options: [
      { label: "Build it here", scores: [75, 100, 50], total: 62 },
      { label: "Subscribe", scores: [100, 50, 75], total: 71 },
      { label: "Build it together", scores: [100, 100, 100], total: 86, highlight: true },
    ],
  },
  scorecard: {
    type: "scorecard",
    rows: [
      { label: "Renewal rate", target: "88%", actual: "91%", gap: "+3.0", status: "on_track" },
      { label: "Setup weeks", target: "4.0", actual: "5.2", gap: "+1.2", status: "off_track" },
      { label: "Partner share", target: "25%", actual: "23%", gap: "-2.0", status: "watch" },
    ],
    note: "Gap is actual minus target.",
  },
  pictogram: {
    type: "pictogram",
    rows: [
      { filled: 7, caption: "Of ten new customers", label: "were set up in the first week" },
      { filled: 9, caption: "Of ten renewals", label: "added seats", highlight: true },
    ],
  },
  hub_spoke: {
    type: "hub_spoke",
    center: "Platform",
    items: [
      { label: "Billing" },
      { label: "Identity" },
      { label: "Search" },
    ],
  },
  logo_wall: {
    type: "logo_wall",
    title: "Customers",
    items: [
      { name: "Yunmi Technology", asset_id: "photo-a" },
      { name: "星岚数据" },
      { name: "Huitong Supply" },
      { name: "明远教育" },
    ],
  },
  quote_wall: {
    type: "quote_wall",
    quotes: [
      { text: "Onboarding went from nine weeks to five.", name: "Sarah Chen", role: "Acme Corp · Customer Success" },
      { text: "续约看板把要流失的客户提前六周推到我面前。", name: "李蔚", role: "星岚数据 · 运营负责人", featured: true },
    ],
  },
  product_cards: {
    type: "product_cards",
    items: [
      { asset_id: "photo-a", name: "Workbench", note: "One screen for renewals", price: "¥68", price_unit: "per seat / month" },
      { asset_id: "photo-b", name: "集成中枢", note: "四十六个业务系统连接器", price: "¥12万", price_unit: "起 / 年", featured: true },
    ],
  },
  people_cards: {
    type: "people_cards",
    people: [
      { name: "Sarah Chen", role: "Engineering Lead", org: "Acme Corp" },
      { name: "王小明", role: "Product Manager", org: "Acme Corp" },
    ],
  },
  org_tree: {
    type: "org_tree",
    root: { name: "Ada", role: "Lead" },
    children: [{ name: "Bo" }, { name: "Cy" }],
  },
  issue_tree: {
    type: "issue_tree",
    question: "Why did renewals stall?",
    branches: [{ label: "Onboarding" }, { label: "Pricing" }],
  },
  pyramid: {
    type: "pyramid",
    layers: [{ label: "Claim" }, { label: "Evidence" }, { label: "Data" }],
  },
  iceberg: {
    type: "iceberg",
    above: ["Onboarding feels slow"],
    below: ["Six systems", "Three seat definitions", "No write-back"],
  },
  pillar_model: {
    type: "pillar_model",
    goal: "Hold renewal at 93%",
    pillars: [
      { title: "Onboarding", value: "5", unit: "weeks" },
      { title: "Activation", value: "88", unit: "%" },
    ],
    base: "One shared customer record",
  },
  value_chain: {
    type: "value_chain",
    primary: [{ label: "Acquire" }, { label: "Prove" }, { label: "Renew" }],
    support: [{ label: "Platform" }, { label: "People" }],
  },
}

const ONE_PX_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

function contentSlide(heading: string, components: Component[]): Slide {
  // Pin a dense-but-roomy layout. This file is about rasterization, not
  // auto-pick, and brief's second-front content tendencies would
  // otherwise land a tight layout that drops a block on one of these pages.
  return { type: "content", kind: "points", heading,  components }
}

/** A rich deck covering every registered component type, with
 *  `assets.images` empty — the "zero real assets anywhere" baseline. */
function noAssetIr(): PptxIR {
  return {
    version: "5",
    filename: "fidelity-no-asset",
    theme: { id: "brief" },
    meta: {},
    assets: { images: {} },
    slides: [
      { type: "cover", heading: "Fidelity Probe", subheading: "no image assets anywhere", components: [] },
      { type: "chapter", heading: "Body", components: [] },
      contentSlide("Chart + KPI", [COMPONENT_BY_TYPE.chart, COMPONENT_BY_TYPE.kpi_cards]),
      contentSlide("Icons + Callout", [COMPONENT_BY_TYPE.icon_cards, COMPONENT_BY_TYPE.callout]),
      // Full-body types (component-traits.ts's FULL_BODY_TYPES) are each
      // required to be the sole component on their slide.
      contentSlide("SWOT", [COMPONENT_BY_TYPE.swot]),
      contentSlide("BMC", [COMPONENT_BY_TYPE.bmc]),
      contentSlide("Waterfall", [COMPONENT_BY_TYPE.waterfall]),
      contentSlide("Gantt", [COMPONENT_BY_TYPE.gantt]),
      contentSlide("PEST", [COMPONENT_BY_TYPE.pest]),
      contentSlide("Five Forces", [COMPONENT_BY_TYPE.five_forces]),
      contentSlide("Heatmap", [COMPONENT_BY_TYPE.heatmap]),
      contentSlide("Sankey", [COMPONENT_BY_TYPE.sankey]),
      contentSlide("Flow + Architecture", [COMPONENT_BY_TYPE.flowchart, COMPONENT_BY_TYPE.architecture]),
      contentSlide("Timeline + Comparison", [COMPONENT_BY_TYPE.timeline, COMPONENT_BY_TYPE.comparison]),
      // row_cards and steps each get a page: paired, the two overflowed the
      // content area and the layout silently dropped one (content-drop gate,
      // deep-review P1 — this fixture is about component coverage, not about
      // how much fits on a page).
      contentSlide("RowCards", [COMPONENT_BY_TYPE.row_cards]),
      contentSlide("Steps", [COMPONENT_BY_TYPE.steps]),
      // numbered_cards gets its own page for the same reason as RowCards and
      // Steps above: its pill stack plus a rings diagram overflow one page.
      contentSlide("Rings", [COMPONENT_BY_TYPE.rings]),
      contentSlide("Numbered", [COMPONENT_BY_TYPE.numbered_cards]),
      contentSlide("Hub spoke", [COMPONENT_BY_TYPE.hub_spoke]),
      contentSlide("Progress donuts", [COMPONENT_BY_TYPE.progress_donuts]),
      contentSlide("Roadmap + Matrix", [COMPONENT_BY_TYPE.roadmap, COMPONENT_BY_TYPE.matrix]),
      contentSlide("Insight + Verdict", [COMPONENT_BY_TYPE.insight_panel, COMPONENT_BY_TYPE.verdict_banner]),
      contentSlide("Blockquote + Paragraph", [COMPONENT_BY_TYPE.blockquote, COMPONENT_BY_TYPE.paragraph]),
      contentSlide("Bullets + Code", [COMPONENT_BY_TYPE.bullets, COMPONENT_BY_TYPE.code]),
      contentSlide("Data Table", [COMPONENT_BY_TYPE.data_table]),
      // Twelve more the deck had never drawn before the completeness
      // assertion below went in: registered as fixtures, on no slide.
      contentSlide("Cycle", [COMPONENT_BY_TYPE.cycle]),
      contentSlide("People", [COMPONENT_BY_TYPE.people_cards]),
      contentSlide("Device mockup (no resolvable asset)", [COMPONENT_BY_TYPE.device_mockup]),
      contentSlide("Staircase", [COMPONENT_BY_TYPE.staircase]),
      contentSlide("Chevrons", [COMPONENT_BY_TYPE.chevron_process]),
      contentSlide("Swimlane", [COMPONENT_BY_TYPE.swimlane]),
      contentSlide("Journey", [COMPONENT_BY_TYPE.journey_map]),
      contentSlide("Decision tree", [COMPONENT_BY_TYPE.decision_tree]),
      contentSlide("From / to", [COMPONENT_BY_TYPE.from_to]),
      contentSlide("Logo wall", [COMPONENT_BY_TYPE.logo_wall]),
      contentSlide("Quote wall", [COMPONENT_BY_TYPE.quote_wall]),
      // The hierarchy family and the chain each own a page: every one of them
      // measures around 400px and declares a decline rather than shrink, so
      // pairing two would send one of them off the page.
      contentSlide("Org tree", [COMPONENT_BY_TYPE.org_tree]),
      contentSlide("Issue tree", [COMPONENT_BY_TYPE.issue_tree]),
      contentSlide("Pyramid", [COMPONENT_BY_TYPE.pyramid]),
      contentSlide("Iceberg", [COMPONENT_BY_TYPE.iceberg]),
      contentSlide("Pillar model", [COMPONENT_BY_TYPE.pillar_model]),
      contentSlide("Value chain", [COMPONENT_BY_TYPE.value_chain]),
      // The 3 image-family types, all pointed at unresolvable asset ids —
      // must fall back to a placeholder, never emit `<image>`.
      // One per page for the same reason as RowCards/Steps above — all
      // three on one page dropped two of them.
      contentSlide("Image (no resolvable asset)", [COMPONENT_BY_TYPE.image]),
      contentSlide("Image grid (no resolvable asset)", [COMPONENT_BY_TYPE.image_grid]),
      contentSlide("Image compare (no resolvable asset)", [COMPONENT_BY_TYPE.image_compare]),
      contentSlide("Harvey balls", [COMPONENT_BY_TYPE.harvey_balls]),
      contentSlide("Scorecard", [COMPONENT_BY_TYPE.scorecard]),
      contentSlide("Pictogram", [COMPONENT_BY_TYPE.pictogram]),
      { type: "ending", heading: "Thanks", components: [] },
    ],
  }
}

/** `noAssetIr()` plus one appended slide holding one real `image` component
 *  backed by one real asset, inserted right before the ending slide so its
 *  slide index (and therefore its `ppt/slides/slideN.xml` part) is
 *  deterministic. */
function withAssetIr(): PptxIR {
  const base = noAssetIr()
  const endingIndex = base.slides.length - 1
  const realImageSlide = contentSlide("One Real Image", [
    { type: "image", asset_id: "photo1", caption: "a real user photo", fit: "cover" },
  ])
  return {
    ...base,
    filename: "fidelity-with-asset",
    assets: { images: { photo1: { src: ONE_PX_PNG } } },
    slides: [...base.slides.slice(0, endingIndex), realImageSlide, base.slides[endingIndex]!],
  }
}

async function mediaFiles(zip: JSZip): Promise<string[]> {
  return Object.keys(zip.files).filter((p) => p.startsWith("ppt/media/") && !zip.files[p]!.dir)
}

function slideParts(zip: JSZip): string[] {
  return Object.keys(zip.files).filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
}

describe("component-type fixture completeness", () => {
  it("COMPONENT_BY_TYPE covers every entry in COMPONENT_TYPES — fails the moment a new component type ships uncovered", () => {
    expect(Object.keys(COMPONENT_BY_TYPE).sort()).toEqual([...COMPONENT_TYPES].sort())
  })

  // Registering a fixture only proves a literal exists. Until this assertion
  // landed, ten component types sat in `COMPONENT_BY_TYPE` and appeared on no
  // slide of the deck the export test actually converts, so "covers every
  // component type" passed while those ten never touched the export chain.
  it("puts every registered fixture on a slide of the deck the export test converts", () => {
    // `product_cards` is the one type this deck cannot carry: a card without
    // its picture is not a smaller card, so the component drops it, and this
    // deck resolves no assets at all by construction. It rides the
    // asset-bearing deck instead, which the test below converts.
    const ASSET_BOUND = ["product_cards"]
    const drawn = new Set<string>(withAssetIr().slides.flatMap((slide) => slide.components.map((c) => c.type)))
    const missing = [...COMPONENT_TYPES].filter((type) => !drawn.has(type)).sort()
    expect(missing, `these types export nothing: ${missing.join(", ")}`).toEqual(ASSET_BOUND)
  })
})

describe("zero unexpected rasterization — real generatePptxBlob, no mocks", () => {
  it("a deck covering every component type with zero real assets exports with ppt/media/ empty and zero <p:pic> on any slide", async () => {
    const blob = await generatePptxBlob(noAssetIr())
    const zip = await JSZip.loadAsync(await blob.arrayBuffer())

    expect(await mediaFiles(zip)).toEqual([])

    const parts = slideParts(zip)
    expect(parts.length).toBeGreaterThan(0)
    for (const path of parts) {
      const xml = await zip.files[path]!.async("string")
      expect(xml, `${path} should hold zero <p:pic>`).not.toContain("<p:pic>")
    }
  })

  it("adding exactly one real image asset adds exactly +1 media file and +1 <p:pic>, landing on exactly the new slide", async () => {
    const baseZip = await JSZip.loadAsync(await (await generatePptxBlob(noAssetIr())).arrayBuffer())
    const baseMediaCount = (await mediaFiles(baseZip)).length

    const withAsset = withAssetIr()
    const newSlideIndex = withAsset.slides.findIndex((s) =>
      s.components?.some((c) => c.type === "image" && c.asset_id === "photo1"),
    )
    expect(newSlideIndex).toBeGreaterThanOrEqual(0)
    const newSlidePath = `ppt/slides/slide${newSlideIndex + 1}.xml`

    const zip = await JSZip.loadAsync(await (await generatePptxBlob(withAsset)).arrayBuffer())
    const media = await mediaFiles(zip)
    expect(media.length - baseMediaCount).toBe(1)

    const parts = slideParts(zip)
    expect(parts).toContain(newSlidePath)
    let totalPics = 0
    for (const path of parts) {
      const xml = await zip.files[path]!.async("string")
      const count = xml.match(/<p:pic>/g)?.length ?? 0
      totalPics += count
      if (path === newSlidePath) {
        expect(count, `${path} (the new real-image slide) should hold exactly one <p:pic>`).toBe(1)
      } else {
        expect(
          count,
          `${path} should hold zero <p:pic> — includes the dangling image/image_grid/image_compare slide`,
        ).toBe(0)
      }
    }
    expect(totalPics).toBe(1)
  })
})
