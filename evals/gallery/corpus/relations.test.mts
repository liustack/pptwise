// @vitest-environment node
//
// The six structure blocks draw a *relation*, and a relation is what an index
// into a word pool cannot supply. A builder that slices two unrelated pools at
// the same index produces a page that passes every automatic check — no drops,
// no truncation, no repeats, contrast fine — and teaches an author the wrong
// use of the component: a museum's own coordinator reporting to its lighting
// designer, a farm's cash-flow problems filed under "wildlife", a chain
// attributing the same 54% on all twenty-four themes.
//
// Three of the relations are now written by each track (`orgChart`, `iceberg`,
// `chain`) and three read pools whose meaning already matches the slot. Both
// kinds are checked here, against every lexicon the gallery renders with — the
// three shared tracks and all 23 native ones — because an authored field can
// go wrong in ways a type cannot catch: a manager with nobody under them, a
// berg whose tip is larger than its mass, a chain whose shares do not add up.

import { describe, expect, it } from "vitest"
import type { Component } from "@/ir"
import { COMPONENT_BUILDERS } from "./components"
import { LEXICONS, type Lexicon } from "./lexicon"
import { NATIVE_LEXICONS } from "./native"

const TRACKS: readonly (readonly [string, Lexicon])[] = [
  ...Object.entries(LEXICONS).map(([id, lex]) => [id, lex] as const),
  ...Object.entries(NATIVE_LEXICONS).map(([id, lex]) => [id, lex] as const),
]

function build<T extends Component["type"]>(type: T, lex: Lexicon): Extract<Component, { type: T }> {
  const builder = COMPONENT_BUILDERS[type]
  if (!builder) throw new Error(`no corpus builder for ${type}`)
  return builder(lex) as Extract<Component, { type: T }>
}

describe("orgChart: a stated reporting line, three levels deep", () => {
  it.each(TRACKS)("%s", (_id, lex) => {
    const chart = lex.orgChart
    expect(chart.managers).toHaveLength(3)
    const leaves = chart.managers.flatMap((m) => m.reports)
    expect(leaves.length).toBeGreaterThanOrEqual(4)
    expect(leaves.length).toBeLessThanOrEqual(6)
    // Every node names a person and the job they do, and nobody appears twice
    // — a chart that lists one person under two managers is not a chart.
    const names = [chart.root.name, ...chart.managers.map((m) => m.name), ...leaves.map((r) => r.name)]
    expect(new Set(names).size).toBe(names.length)
    for (const manager of chart.managers) {
      expect(manager.reports.length).toBeGreaterThanOrEqual(1)
      expect(manager.role.trim()).not.toBe("")
      for (const report of manager.reports) expect(report.role.trim()).not.toBe("")
    }

    const tree = build("org_tree", lex)
    expect(tree.root.name).toBe(chart.root.name)
    expect(tree.children.map((c) => c.name)).toEqual(chart.managers.map((m) => m.name))
    tree.children.forEach((child, i) => {
      expect(child.children?.map((c) => c.name)).toEqual(chart.managers[i]!.reports.map((r) => r.name))
    })
  })
})

describe("iceberg: a small stated tip over a larger unstated mass", () => {
  it.each(TRACKS)("%s", (_id, lex) => {
    const ice = lex.iceberg
    expect(ice.above.length).toBeGreaterThanOrEqual(1)
    expect(ice.above.length).toBeLessThanOrEqual(2)
    expect(ice.below.length).toBeGreaterThanOrEqual(4)
    expect(ice.below.length).toBeLessThanOrEqual(5)
    // The whole argument: the visible part is the small part.
    expect(ice.above.length).toBeLessThan(ice.below.length)
    // The two bands are named for what they are, not for a section of the
    // deck that happens to sit at the same index.
    expect(ice.aboveLabel).not.toBe(ice.belowLabel)
    for (const line of [ice.waterline, ice.aboveLabel, ice.belowLabel]) expect(line.trim()).not.toBe("")
    expect(new Set([...ice.above, ...ice.below]).size).toBe(ice.above.length + ice.below.length)

    const berg = build("iceberg", lex)
    expect(berg.above).toEqual([...ice.above])
    expect(berg.below).toEqual([...ice.below])
    expect(berg.waterline).toBe(ice.waterline)
    expect(berg.above_label).toBe(ice.aboveLabel)
    expect(berg.below_label).toBe(ice.belowLabel)
  })
})

describe("chain: shares that add up, and the wedge that closes them", () => {
  it.each(TRACKS)("%s", (_id, lex) => {
    const chain = lex.chain
    expect(chain.links.length).toBeGreaterThanOrEqual(3)
    expect(chain.links.length).toBeLessThanOrEqual(5)
    expect(chain.support.length).toBeGreaterThanOrEqual(2)
    expect(chain.support.length).toBeLessThanOrEqual(3)
    // Every link is a share of the same whole, and the wedge is the rest of
    // it: a reader who adds the row up gets a hundred.
    const share = (v: string) => Number(v.replace("%", ""))
    const total = chain.links.reduce((n, link) => n + share(link.value), 0) + share(chain.margin.value)
    expect(total, `${chain.links.map((l) => l.value).join(" + ")} + ${chain.margin.value}`).toBe(100)
    for (const link of chain.links) expect(link.unit).toBe("%")
    for (const band of chain.support) expect(band.note.trim()).not.toBe("")

    const drawn = build("value_chain", lex)
    expect(drawn.primary.map((p) => p.label)).toEqual(chain.links.map((l) => l.label))
    expect(drawn.margin?.value).toBe(chain.margin.value)
    // Exactly one link is marked, and it is the one that makes the most.
    const marked = drawn.primary.filter((p) => p.emphasis)
    expect(marked).toHaveLength(1)
    const largest = Math.max(...chain.links.map((l) => share(l.value)))
    expect(share(marked[0]!.value!)).toBe(largest)
  })
})

describe("issue_tree: a section, the problems inside it, the measures that test them", () => {
  it.each(TRACKS)("%s", (_id, lex) => {
    const tree = build("issue_tree", lex)
    expect(tree.question).toBe(lex.chapters[2])
    expect(tree.branches.map((b) => b.label)).toEqual(lex.weaknesses.slice(0, 3))
    expect(tree.branches.filter((b) => b.emphasis).length).toBe(1)
    expect(tree.branches[0]!.emphasis).toBe(true)
    for (const branch of tree.branches) {
      expect(branch.children).toHaveLength(2)
      for (const child of branch.children!) {
        const metric = lex.metrics.find((m) => child.label.startsWith(m.label))
        expect(metric, child.label).toBeDefined()
        // A check names a measure *and* where it stands, or it is only a noun.
        expect(child.label.length).toBeGreaterThan(metric!.label.length)
      }
      // No share-of-the-gap note: no track carries one.
      expect(branch.note).toBeUndefined()
    }
  })
})

describe("pyramid: one list of sections, written short on the band and long in the legend", () => {
  it.each(TRACKS)("%s", (_id, lex) => {
    const { layers } = build("pyramid", lex)
    expect(layers).toHaveLength(4)
    layers.forEach((layer, i) => {
      expect(layer.label).toBe(lex.kickers[i])
      expect(layer.note).toBe(lex.chapters[i])
      // The legend explains the band beside it rather than repeating it.
      expect(layer.note!.length).toBeGreaterThanOrEqual(layer.label.length)
    })
  })
})

describe("pillar_model: the deck's own verdict on the measures it reached it on", () => {
  it.each(TRACKS)("%s", (_id, lex) => {
    const model = build("pillar_model", lex)
    expect(model.goal).toBe(lex.verdicts.positive)
    expect(model.base).toBe(lex.deckSubtitle)
    expect(model.pillars).toHaveLength(3)
    model.pillars.forEach((pillar, i) => {
      const metric = lex.metrics[i]!
      expect(pillar.title).toBe(metric.label)
      expect(pillar.value).toBe(metric.value)
      expect(pillar.unit).toBe(metric.unit)
    })
  })
})
