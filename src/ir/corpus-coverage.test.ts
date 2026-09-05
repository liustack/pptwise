// @vitest-environment node
//
// Permanent regression test: every live `COMPONENT_TYPES` member must be
// behaviorally exercised at least once by the IR validation corpus
// assembled below (`examples/*.json` + `STRESS_DECKS` + the hand-written
// `COVERAGE_ENTRIES`). This is what forces corpus coverage onto every
// future component type — land a new component without also getting it
// into this corpus (either because an existing `examples/*.json`/
// `STRESS_DECKS` fixture already happens to use it, or because a new
// `COVERAGE_ENTRIES` pair was added for it), and the first test below
// goes red.
//
// Why this can't just rely on `examples/*.json` + `STRESS_DECKS` alone:
// those two sources are curated for other purposes (a walkthrough example;
// 13-theme render/audit pressure pages) and aren't guaranteed to touch
// every component type. They didn't, once: an audit found they covered
// only 27 of the IR's 32 component types at the time — `gantt`, `heatmap`,
// `image_grid`, `sankey`, `waterfall` never appeared in either. That
// mattered more than an ordinary coverage gap because `z.refine`/
// `z.superRefine` closures are opaque to static schema inspection
// (`z.toJSONSchema` can't see them) — a type missing from every corpus
// entry isn't just an untested happy path, it's an untested *rejection*
// path too. The gap was confirmed by reproduction: deleting `sankey`'s
// entire 6-check `superRefine` block (duplicate node ids, dangling
// `from`/`to`, self-loops, cycle detection) left every existing test green,
// because nothing in the corpus ever constructed a `sankey` component at
// all.
//
// `COVERAGE_ENTRIES` below closes that class of gap directly: for each
// type not otherwise guaranteed to appear, a `-valid` entry (a clean
// minimal instance — proves the happy parse still succeeds) and a
// `-tripwire` entry (an otherwise-minimal instance that fails exactly one
// check, isolated so the failure is unambiguous). Deliberately literals in
// this file, not new `STRESS_DECKS` pages — `STRESS_DECKS` is a
// render-pressure fixture set (13-theme render/audit assertions read it
// elsewhere), the wrong, far more expensive tool for "make sure this one
// schema branch gets exercised." Add a new `-valid`/`-tripwire` pair here
// whenever a new component type isn't already covered by
// `examples/*.json` or `STRESS_DECKS` (R1's `data_table` is the next one
// due).
import { extname } from "node:path"
import { readdirSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { validateIr } from "@/api"
import { COMPONENT_TYPES } from "@/ir"
import { STRESS_DECKS } from "@/audit/stress-fixtures"

const EXAMPLES_DIR = new URL("../../examples/", import.meta.url)

/** Wraps one component in the smallest deck `validateIr` accepts — every `coverage/*` entry below is single-component, which trivially satisfies `checkFullBodyExclusivity` for the full-body types among them (gantt/heatmap/sankey/waterfall). */
function minimalDeck(component: Record<string, unknown>): unknown {
  return {
    version: "5",
    theme: { id: "brief" },
    slides: [{ type: "content", kind: "points", heading: "coverage probe", components: [component] }],
  }
}

/**
 * Hand-written fill-in for component types not otherwise guaranteed to
 * appear in `examples/*.json` or `STRESS_DECKS` — see this file's top doc
 * comment for why this exists. Each type gets exactly 2 entries: `-valid`
 * (a clean minimal instance — proves the happy parse still succeeds) and
 * `-tripwire` (an otherwise-minimal instance that fails exactly one check,
 * isolated so the failure is unambiguous). Both are asserted against
 * `validateIr` below — the coverage test only proves the type is
 * *present* in the corpus; the per-entry assertions below prove its
 * refine/bound actually *fires*:
 *  - `gantt-tripwire`: item `end` (8) not `>` its own `start` (8) —
 *    `GanttItemSchema`'s `.refine`.
 *  - `heatmap-tripwire`: `domain.max` (1) `<` `domain.min` (10) — the 3rd
 *    of heatmap's 3 `.refine`s; `values`/`x_labels`/`y_labels` stay
 *    perfectly shaped so the other 2 refines don't also fire.
 *  - `sankey-tripwire`: link `to: "c"` references a node id not declared
 *    in `nodes` — the dangling-endpoint check inside `sankey`'s
 *    `superRefine`.
 *  - `image_grid-tripwire` / `waterfall-tripwire`: neither component
 *    declares a custom refine, so each trips its tightest schema-level
 *    bound instead (`image_grid.items` `min(2)`, `waterfall.items`
 *    `min(3)`).
 *  - `data_table-tripwire` (R1 evidence wave, Task T3 — 33rd component):
 *    row 0's `cells` carries `ghost_col`, a key not declared in `columns` —
 *    the sharpest contract violation this component's schema rejects (`ir/
 *    components/data-table.ts`'s `superRefine`). Deliberately not a
 *    *missing*-key row (`cells` short one declared column's key) — that
 *    case is schema-legal by the plan's own lenient-revision contract
 *    (renders empty + an `ir-quality.ts` warn, never a parse failure), so it
 *    belongs in a quality/warn-path test (`ir-quality.test.tsx`), not this
 *    file's hard-rejection tripwire.
 */
const COVERAGE_ENTRIES: Record<string, unknown> = {
  "coverage/gantt-valid": minimalDeck({
    type: "gantt",
    items: [
      { label: "Design", start: 0, end: 5 },
      { label: "Build", start: 5, end: 12 },
    ],
  }),
  "coverage/gantt-tripwire": minimalDeck({
    type: "gantt",
    items: [
      { label: "Design", start: 0, end: 5 },
      { label: "Build", start: 8, end: 8 },
    ],
  }),
  "coverage/heatmap-valid": minimalDeck({
    type: "heatmap",
    x_labels: ["Q1", "Q2"],
    y_labels: ["East", "West"],
    values: [
      [1, 2],
      [3, 4],
    ],
  }),
  "coverage/heatmap-tripwire": minimalDeck({
    type: "heatmap",
    x_labels: ["Q1", "Q2"],
    y_labels: ["East", "West"],
    values: [
      [1, 2],
      [3, 4],
    ],
    domain: { min: 10, max: 1 },
  }),
  "coverage/image_grid-valid": minimalDeck({
    type: "image_grid",
    items: [{ asset_id: "a1" }, { asset_id: "a2" }],
  }),
  "coverage/image_grid-tripwire": minimalDeck({
    type: "image_grid",
    items: [{ asset_id: "a1" }],
  }),
  "coverage/sankey-valid": minimalDeck({
    type: "sankey",
    nodes: [
      { id: "a", label: "Source" },
      { id: "b", label: "Target" },
    ],
    links: [{ from: "a", to: "b", value: 5 }],
  }),
  "coverage/sankey-tripwire": minimalDeck({
    type: "sankey",
    nodes: [
      { id: "a", label: "Source" },
      { id: "b", label: "Target" },
    ],
    links: [{ from: "a", to: "c", value: 5 }],
  }),
  "coverage/waterfall-valid": minimalDeck({
    type: "waterfall",
    items: [
      { label: "Start", value: 100 },
      { label: "Q1", value: 20 },
      { label: "Q2", value: -15 },
    ],
  }),
  "coverage/waterfall-tripwire": minimalDeck({
    type: "waterfall",
    items: [
      { label: "Start", value: 100 },
      { label: "Q1", value: 20 },
    ],
  }),
  "coverage/data_table-valid": minimalDeck({
    type: "data_table",
    columns: [
      { key: "metric", label: "Metric" },
      { key: "q1", label: "Q1", align: "right" },
    ],
    rows: [{ cells: { metric: "Revenue", q1: "120" } }],
  }),
  "coverage/data_table-tripwire": minimalDeck({
    type: "data_table",
    columns: [
      { key: "metric", label: "Metric" },
      { key: "q1", label: "Q1", align: "right" },
    ],
    rows: [{ cells: { metric: "Revenue", q1: "120", ghost_col: "x" } }],
  }),
  // hub_spoke's own hard check is the element-count floor: a center with
  // fewer than 3 peers reads as a list, not a structure.
  "coverage/hub_spoke-valid": minimalDeck({
    type: "hub_spoke",
    center: "Platform",
    items: [{ label: "Billing" }, { label: "Identity" }, { label: "Search" }],
  }),
  "coverage/hub_spoke-tripwire": minimalDeck({
    type: "hub_spoke",
    center: "Platform",
    items: [{ label: "Billing" }, { label: "Identity" }],
  }),
  // progress_donuts' own hard check is the 0-100 value domain: an absolute
  // quantity has no share of a whole to fill a ring with.
  "coverage/progress_donuts-valid": minimalDeck({
    type: "progress_donuts",
    items: [
      { value: "86%", label: "coverage" },
      { value: "72", label: "closure" },
    ],
  }),
  // quote_wall's own hard checks are the 140-char remark ceiling and the
  // single featured card.
  "coverage/quote_wall-valid": minimalDeck({
    type: "quote_wall",
    quotes: [
      { text: "Onboarding went from nine weeks to five.", name: "Sarah Chen", role: "Acme Corp" },
      { text: "续约看板把要流失的客户提前六周推到我面前。", name: "李蔚", featured: true },
    ],
  }),
  "coverage/quote_wall-tripwire": minimalDeck({
    type: "quote_wall",
    quotes: [
      { text: "a".repeat(141), name: "Sarah Chen" },
      { text: "Short enough.", name: "李蔚" },
    ],
  }),
  // product_cards' own hard check is the picture: a card without one is a
  // row_cards row, and only one card may wear the whole-fill highlight.
  "coverage/product_cards-valid": minimalDeck({
    type: "product_cards",
    items: [
      { asset_id: "shot-1", name: "Workbench", price: "¥68" },
      { asset_id: "shot-2", name: "Hub", featured: true },
    ],
  }),
  "coverage/product_cards-tripwire": minimalDeck({
    type: "product_cards",
    items: [
      { asset_id: "shot-1", name: "Workbench", featured: true },
      { asset_id: "shot-2", name: "Hub", featured: true },
    ],
  }),
  // logo_wall's own hard check is the floor: three names are a sentence,
  // not a wall.
  "coverage/logo_wall-valid": minimalDeck({
    type: "logo_wall",
    items: [{ name: "Yunmi" }, { name: "Xinglan", asset_id: "mark-1" }, { name: "Huitong" }, { name: "Mingyuan" }],
  }),
  "coverage/logo_wall-tripwire": minimalDeck({
    type: "logo_wall",
    items: [{ name: "Yunmi" }, { name: "Xinglan" }, { name: "Huitong" }],
  }),
  "coverage/progress_donuts-tripwire": minimalDeck({
    type: "progress_donuts",
    items: [
      { value: "128", unit: "台", label: "devices" },
      { value: "72%", label: "closure" },
    ],
  }),
  // staircase's own hard check is the level-count floor: two treads read as
  // a comparison, not a climb.
  // from_to's own hard check is the row-count floor: one or two measures are
  // a kpi_cards pair, not a shift.
  "coverage/from_to-valid": minimalDeck({
    type: "from_to",
    from: { title: "Today" },
    to: { title: "Next year" },
    rows: [
      { label: "Time to open", from: "9", to: "5" },
      { label: "Renewal rate", from: "91", to: "95" },
      { label: "Seats", from: "46", to: "72" },
    ],
  }),
  "coverage/from_to-tripwire": minimalDeck({
    type: "from_to",
    from: { title: "Today" },
    to: { title: "Next year" },
    rows: [
      { label: "Time to open", from: "9", to: "5" },
      { label: "Renewal rate", from: "91", to: "95" },
    ],
  }),
  // decision_tree's own hard check is the single recommendation: two filled
  // outcomes read as two answers to one question.
  "coverage/decision_tree-valid": minimalDeck({
    type: "decision_tree",
    question: "Buy or build?",
    branches: [
      { edge: "buy", title: "Licence it", outcomes: [{ edge: "60%", title: "Standard tier" }, { edge: "40%", title: "Enterprise tier", recommended: true }] },
      { edge: "build", title: "Build it", outcomes: [{ edge: "70%", title: "One team" }, { edge: "30%", title: "Two teams" }] },
    ],
  }),
  "coverage/decision_tree-tripwire": minimalDeck({
    type: "decision_tree",
    question: "Buy or build?",
    branches: [
      { edge: "buy", title: "Licence it", outcomes: [{ edge: "60%", title: "Standard tier" }, { edge: "40%", title: "Enterprise tier", recommended: true }] },
      { edge: "build", title: "Build it", outcomes: [{ edge: "70%", title: "One team", recommended: true }, { edge: "30%", title: "Two teams" }] },
    ],
  }),
  // Every line into an outcome carries its condition; a second level that says
  // nothing about why a reader lands there is a list drawn with arrows.
  "coverage/decision_tree-edgeless-tripwire": minimalDeck({
    type: "decision_tree",
    question: "Buy or build?",
    branches: [
      { edge: "buy", title: "Licence it", outcomes: [{ title: "Standard tier" }, { title: "Enterprise tier" }] },
      { edge: "build", title: "Build it", outcomes: [{ edge: "70%", title: "One team" }, { edge: "30%", title: "Two teams" }] },
    ],
  }),
  // Whitespace is not a condition: it cleared a length test, trimmed to
  // nothing at draw time, and left four lines bare with no mark to say so.
  "coverage/decision_tree-blank-outcome-edge-tripwire": minimalDeck({
    type: "decision_tree",
    question: "Buy or build?",
    branches: [
      { edge: "buy", title: "Licence it", outcomes: [{ edge: "   ", title: "Standard tier" }, { edge: "40%", title: "Enterprise tier" }] },
      { edge: "build", title: "Build it", outcomes: [{ edge: "70%", title: "One team" }, { edge: "30%", title: "Two teams" }] },
    ],
  }),
  "coverage/decision_tree-blank-branch-edge-tripwire": minimalDeck({
    type: "decision_tree",
    question: "Buy or build?",
    branches: [
      { edge: "\t\n ", title: "Licence it", outcomes: [{ edge: "60%", title: "Standard tier" }, { edge: "40%", title: "Enterprise tier" }] },
      { edge: "build", title: "Build it", outcomes: [{ edge: "70%", title: "One team" }, { edge: "30%", title: "Two teams" }] },
    ],
  }),
  // A unit is what a number is counted in, and there is no number here.
  "coverage/decision_tree-unitless-tripwire": minimalDeck({
    type: "decision_tree",
    question: "Buy or build?",
    branches: [
      { edge: "buy", title: "Licence it", outcomes: [{ edge: "60%", title: "Standard tier", unit: "weeks" }, { edge: "40%", title: "Enterprise tier" }] },
      { edge: "build", title: "Build it", outcomes: [{ edge: "70%", title: "One team" }, { edge: "30%", title: "Two teams" }] },
    ],
  }),
  // journey_map's own hard check is the 1-5 emotion domain: a curve is only
  // a curve when every stage scores on the same scale.
  "coverage/journey_map-valid": minimalDeck({
    type: "journey_map",
    stages: [
      { label: "Learn", emotion: 4 },
      { label: "Onboard", emotion: 2 },
      { label: "Renew", emotion: 4 },
    ],
  }),
  "coverage/journey_map-tripwire": minimalDeck({
    type: "journey_map",
    stages: [
      { label: "Learn", emotion: 4 },
      { label: "Onboard", emotion: 9 },
      { label: "Renew", emotion: 4 },
    ],
  }),
  // swimlane's own hard check is the cross-reference: a step names a lane,
  // and a lane it names has to exist.
  "coverage/swimlane-valid": minimalDeck({
    type: "swimlane",
    lanes: [{ label: "Success" }, { label: "Delivery" }],
    steps: [
      { lane: "Success", title: "Signal" },
      { lane: "Delivery", title: "Schedule" },
      { lane: "Success", title: "Sign" },
    ],
  }),
  // Two lanes with one name leave a step no way to say which it belongs to.
  "coverage/swimlane-duplicate-lane-tripwire": minimalDeck({
    type: "swimlane",
    lanes: [{ label: "Success" }, { label: "Success", role: "second team" }],
    steps: [
      { lane: "Success", title: "Signal" },
      { lane: "Success", title: "Schedule" },
      { lane: "Success", title: "Sign" },
    ],
  }),
  // A note about a handover, on a process that never hands anything over.
  "coverage/swimlane-note-without-handover-tripwire": minimalDeck({
    type: "swimlane",
    lanes: [{ label: "Success" }, { label: "Delivery" }],
    steps: [
      { lane: "Success", title: "Signal" },
      { lane: "Success", title: "Schedule" },
      { lane: "Success", title: "Sign" },
    ],
    handoff_note: "six days waiting between the two",
  }),
  "coverage/swimlane-tripwire": minimalDeck({
    type: "swimlane",
    lanes: [{ label: "Success" }, { label: "Delivery" }],
    steps: [
      { lane: "Success", title: "Signal" },
      { lane: "Finance", title: "Schedule" },
      { lane: "Success", title: "Sign" },
    ],
  }),
  // chevron_process' own hard check is the stage-count floor: two chevrons
  // read as a before/after, which is `comparison`.
  "coverage/chevron_process-valid": minimalDeck({
    type: "chevron_process",
    items: [{ title: "Scope" }, { title: "Build" }, { title: "Hand over" }],
  }),
  "coverage/chevron_process-tripwire": minimalDeck({
    type: "chevron_process",
    items: [{ title: "Scope" }, { title: "Hand over" }],
  }),
  "coverage/staircase-valid": minimalDeck({
    type: "staircase",
    items: [
      { title: "Trial", value: "412" },
      { title: "Rollout", value: "248" },
      { title: "Platform", value: "96" },
    ],
  }),
  "coverage/staircase-tripwire": minimalDeck({
    type: "staircase",
    items: [
      { title: "Trial", value: "412" },
      { title: "Platform", value: "96" },
    ],
  }),
  // Hierarchy family: each tripwire trips exactly the cap its own describe()
  // sentence states, and nothing else.
  "coverage/org_tree-valid": minimalDeck({
    type: "org_tree",
    root: { name: "Chen", role: "Lead" },
    children: [
      { name: "Lin", children: [{ name: "Han" }, { name: "Yao" }] },
      { name: "Su", children: [{ name: "Wen" }] },
    ],
  }),
  // Nine bottom nodes against a cap of eight — the whole-tree leaf refine.
  "coverage/org_tree-tripwire": minimalDeck({
    type: "org_tree",
    root: { name: "Chen" },
    children: [
      { name: "Lin", children: [{ name: "a" }, { name: "b" }, { name: "c" }, { name: "d" }, { name: "e" }] },
      { name: "Su", children: [{ name: "f" }, { name: "g" }, { name: "h" }, { name: "i" }] },
    ],
  }),
  "coverage/issue_tree-valid": minimalDeck({
    type: "issue_tree",
    question: "Why did renewals stall?",
    branches: [
      { label: "Onboarding", emphasis: true, children: [{ label: "Nine weeks" }] },
      { label: "Pricing", children: [{ label: "Discount is unlinked" }] },
    ],
  }),
  // Two branches both marked — the single-emphasis refine.
  "coverage/issue_tree-tripwire": minimalDeck({
    type: "issue_tree",
    question: "Why did renewals stall?",
    branches: [
      { label: "Onboarding", emphasis: true },
      { label: "Pricing", emphasis: true },
    ],
  }),
  "coverage/pyramid-valid": minimalDeck({
    type: "pyramid",
    layers: [{ label: "Claim" }, { label: "Evidence", note: "three supports" }, { label: "Data" }],
  }),
  // Two levels against a floor of three.
  "coverage/pyramid-tripwire": minimalDeck({
    type: "pyramid",
    layers: [{ label: "Claim" }, { label: "Data" }],
  }),
  "coverage/iceberg-valid": minimalDeck({
    type: "iceberg",
    above: ["Onboarding feels slow"],
    below: ["Six systems", "Three seat definitions", "No write-back"],
    waterline: "waterline",
  }),
  // Three items above a cap of two.
  "coverage/iceberg-tripwire": minimalDeck({
    type: "iceberg",
    above: ["a", "b", "c"],
    below: ["d", "e", "f"],
  }),
  "coverage/pillar_model-valid": minimalDeck({
    type: "pillar_model",
    goal: "Hold renewal at 93%",
    pillars: [
      { title: "Onboarding", value: "5", unit: "weeks" },
      { title: "Activation", value: "88", unit: "%" },
    ],
    base: "One shared customer record",
  }),
  // One column under a beam is a heading over a number.
  "coverage/pillar_model-tripwire": minimalDeck({
    type: "pillar_model",
    goal: "Hold renewal at 93%",
    pillars: [{ title: "Onboarding", value: "5" }],
    base: "One shared customer record",
  }),
  "coverage/value_chain-valid": minimalDeck({
    type: "value_chain",
    primary: [{ label: "Acquire" }, { label: "Prove" }, { label: "Renew", emphasis: true }],
    support: [{ label: "Platform", note: "one tenant model" }, { label: "People" }],
    margin: { label: "Operating margin", value: "38%" },
  }),
  // Two links are a before and an after, not a chain.
  "coverage/value_chain-tripwire": minimalDeck({
    type: "value_chain",
    primary: [{ label: "Acquire" }, { label: "Renew" }],
    support: [{ label: "Platform" }, { label: "People" }],
  }),
  // A unit with no figure beside it: the drawing has nowhere to put it, so
  // the schema refuses it rather than letting the renderer erase it.
  "coverage/value_chain-unit-tripwire": minimalDeck({
    type: "value_chain",
    primary: [{ label: "Acquire", unit: "%" }, { label: "Prove" }, { label: "Renew" }],
    support: [{ label: "Platform" }, { label: "People" }],
  }),
  // The same loss written the other way: a figure that is present but empty
  // satisfied "value is not undefined" while the renderer, which reads the
  // figure for truth, still drew neither figure nor unit.
  "coverage/value_chain-blank-value-tripwire": minimalDeck({
    type: "value_chain",
    primary: [{ label: "Acquire", value: "", unit: "%" }, { label: "Prove" }, { label: "Renew" }],
    support: [{ label: "Platform" }, { label: "People" }],
  }),
  // harvey_balls' own hard check is the rectangle: every option is scored on
  // every criterion, and a short row would read as a column of zeros.
  "coverage/harvey_balls-valid": minimalDeck({
    type: "harvey_balls",
    criteria: ["speed", "cost", "fit"],
    options: [
      { label: "Build", scores: [100, 25, 50] },
      { label: "Buy", scores: [50, 75, 75] },
      { label: "Partner", scores: [75, 100, 100] },
    ],
  }),
  "coverage/harvey_balls-tripwire": minimalDeck({
    type: "harvey_balls",
    criteria: ["speed", "cost", "fit"],
    options: [
      { label: "Build", scores: [100, 25] },
      { label: "Buy", scores: [50, 75, 75] },
      { label: "Partner", scores: [75, 100, 100] },
    ],
  }),
  // scorecard's own hard check is the row floor: two goals are headline
  // numbers, and kpi_cards prints those larger.
  "coverage/scorecard-valid": minimalDeck({
    type: "scorecard",
    rows: [
      { label: "Renewal", target: "88%", actual: "91%", gap: "+3.0", status: "on_track" },
      { label: "Setup", target: "4.0", actual: "5.2", gap: "+1.2", status: "off_track" },
      { label: "Partners", target: "25%", actual: "23%", gap: "-2.0", status: "watch" },
    ],
  }),
  "coverage/scorecard-tripwire": minimalDeck({
    type: "scorecard",
    rows: [
      { label: "Renewal", target: "88%", actual: "91%", gap: "+3.0", status: "on_track" },
      { label: "Setup", target: "4.0", actual: "5.2", gap: "+1.2", status: "off_track" },
    ],
  }),
  // pictogram's own hard check is the denominator: the row counts out of ten,
  // so an eleventh figure has nowhere to stand.
  "coverage/pictogram-valid": minimalDeck({
    type: "pictogram",
    rows: [{ filled: 7, label: "were set up in the first week" }],
  }),
  "coverage/pictogram-tripwire": minimalDeck({
    type: "pictogram",
    rows: [{ filled: 11, label: "were set up in the first week" }],
  }),
}

// Assembles the validation corpus from all three sources, keyed by
// `<source>/<name>` (only used for readable failure output — the coverage
// test below doesn't care about the keys, just the `type` of each
// component it finds inside).
const exampleFiles = readdirSync(fileURLToPath(EXAMPLES_DIR))
  .filter((f) => extname(f) === ".json")
  .sort()

const corpus: Record<string, unknown> = {}
for (const file of exampleFiles) {
  corpus[`examples/${file.slice(0, -".json".length)}`] = JSON.parse(readFileSync(new URL(file, EXAMPLES_DIR), "utf-8"))
}
for (const [name, deck] of Object.entries(STRESS_DECKS)) {
  corpus[`stress/${name}`] = deck
}
for (const [key, deck] of Object.entries(COVERAGE_ENTRIES)) {
  corpus[key] = deck
}

describe("validation corpus coverage", () => {
  it(`the corpus behaviorally exercises all ${COMPONENT_TYPES.length} live COMPONENT_TYPES at least once`, () => {
    const touched = new Set<string>()
    for (const raw of Object.values(corpus)) {
      const slides = (raw as { slides?: unknown[] }).slides
      if (!Array.isArray(slides)) continue
      for (const slide of slides) {
        const components = (slide as { components?: unknown[] }).components
        if (!Array.isArray(components)) continue
        for (const c of components) {
          const t = (c as { type?: unknown }).type
          if (typeof t === "string") touched.add(t)
        }
      }
    }
    for (const type of COMPONENT_TYPES) {
      expect(touched).toContain(type)
    }
  })

  describe("COVERAGE_ENTRIES actually exercise their target check (presence alone doesn't prove this)", () => {
    const validEntries = Object.entries(COVERAGE_ENTRIES).filter(([key]) => key.endsWith("-valid"))
    const tripwireEntries = Object.entries(COVERAGE_ENTRIES).filter(([key]) => key.endsWith("-tripwire"))

    it.each(validEntries)("%s parses cleanly", (_key, deck) => {
      const result = validateIr(deck)
      expect(result.ok).toBe(true)
      expect(result.errors).toEqual([])
    })

    it.each(tripwireEntries)("%s fails validation", (_key, deck) => {
      const result = validateIr(deck)
      expect(result.ok).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
