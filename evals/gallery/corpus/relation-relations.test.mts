// @vitest-environment node
//
// The six relation components whose content is a *claim*, not a bag of words.
//
// A Venn diagram claims membership in more than one set at once. A fishbone
// claims a kind of reason produced a result. A positioning map claims one
// subject sits further along a scale than another. An equation claims two
// things add up to a third. A wheel claims these parts together are the
// whole. A pros/cons page claims both columns argue about the same proposal.
// None of that survives being assembled from pool positions: the first cut
// put a foundation's 月捐 against its 图书采购 and named the overlap 月捐
// again, sorted a fishbone's ribs by customer industry, and ran a continuous
// x axis from 华东 to 华南.
//
// So every track authors them whole, and this file holds each track to it.
// It reads the tracks rather than the builders, because the builders now do
// nothing but hand the authored claim through.
import { describe, expect, it } from "vitest"
import { LEXICONS } from "./lexicon"
import { NATIVE_LEXICONS } from "./native"
import { COMPONENT_BUILDERS } from "./components"
import type { Lexicon } from "./lexicon"

const TRACKS: readonly (readonly [string, Lexicon])[] = [
  ...Object.entries(LEXICONS).map(([id, lex]) => [`shared:${id}`, lex] as const),
  ...Object.entries(NATIVE_LEXICONS).map(([id, lex]) => [`theme:${id}`, lex] as const),
]

const filled = (text: string) => text.trim() !== ""

describe("every track authors three sets that share one named ground", () => {
  it("names three sets and what being in all of them means", () => {
    for (const [id, lex] of TRACKS) {
      expect(lex.sets.labels, id).toHaveLength(3)
      for (const label of lex.sets.labels) expect(filled(label), id).toBe(true)
      expect(filled(lex.sets.overlap), id).toBe(true)
    }
  })

  it("does not name the shared ground after one of the sets, which would say nothing", () => {
    for (const [id, lex] of TRACKS) {
      expect(new Set(lex.sets.labels).size, id).toBe(3)
      expect(lex.sets.labels, `${id}: overlap repeats a set`).not.toContain(lex.sets.overlap)
    }
  })

  it("borrows no set from the label pool, which names nouns rather than memberships", () => {
    for (const [id, lex] of TRACKS) {
      const labels = new Set(lex.labels)
      for (const set of lex.sets.labels) expect(labels.has(set), `${id}: ${set}`).toBe(false)
    }
  })
})

describe("every track authors the causes behind one result", () => {
  it("names a result and four categories, each with two causes of its own", () => {
    for (const [id, lex] of TRACKS) {
      expect(filled(lex.causes.effect), id).toBe(true)
      expect(lex.causes.categories.length, id).toBeGreaterThanOrEqual(4)
      for (const category of lex.causes.categories) {
        expect(filled(category.label), id).toBe(true)
        expect(category.causes, `${id}: ${category.label}`).toHaveLength(2)
        for (const cause of category.causes) expect(filled(cause), id).toBe(true)
      }
      const names = lex.causes.categories.map((c) => c.label)
      expect(new Set(names).size, id).toBe(names.length)
    }
  })

  it("sorts the causes, not the customers: no category is an organisation this world names", () => {
    for (const [id, lex] of TRACKS) {
      const orgs = new Set(lex.orgs)
      for (const category of lex.causes.categories) {
        expect(orgs.has(category.label), `${id}: ${category.label}`).toBe(false)
      }
    }
  })

  it("says something specific under each category — no cause repeats anywhere in the diagram", () => {
    for (const [id, lex] of TRACKS) {
      const causes = lex.causes.categories.flatMap((c) => c.causes)
      expect(new Set(causes).size, id).toBe(causes.length)
      expect(causes, id).not.toContain(lex.causes.effect)
    }
  })
})

describe("every track authors two scales and where its subjects sit on them", () => {
  it("names both ends of both axes, four quadrants, and eight subjects", () => {
    for (const [id, lex] of TRACKS) {
      for (const axis of [lex.positions.x, lex.positions.y]) {
        expect(filled(axis.title), id).toBe(true)
        expect(filled(axis.low), id).toBe(true)
        expect(filled(axis.high), id).toBe(true)
        expect(axis.low, `${id}: ${axis.title} ends read the same`).not.toBe(axis.high)
      }
      expect(lex.positions.quadrants, id).toHaveLength(4)
      for (const quadrant of lex.positions.quadrants) expect(filled(quadrant), id).toBe(true)
      expect(lex.positions.points.length, id).toBeGreaterThanOrEqual(4)
      expect(lex.positions.points.length, id).toBeLessThanOrEqual(10)
    }
  })

  it("marks exactly one subject as the page's own", () => {
    for (const [id, lex] of TRACKS) {
      expect(lex.positions.points.filter((p) => p.mine).length, id).toBe(1)
    }
  })

  it("keeps every subject inside the scale and off its neighbours' coordinates", () => {
    for (const [id, lex] of TRACKS) {
      const seen = new Set<string>()
      for (const point of lex.positions.points) {
        expect(filled(point.label), id).toBe(true)
        expect(point.x, `${id}: ${point.label}`).toBeGreaterThanOrEqual(0)
        expect(point.x, `${id}: ${point.label}`).toBeLessThanOrEqual(100)
        expect(point.y, `${id}: ${point.label}`).toBeGreaterThanOrEqual(0)
        expect(point.y, `${id}: ${point.label}`).toBeLessThanOrEqual(100)
        const key = `${point.x}:${point.y}`
        expect(seen.has(key), `${id}: ${point.label} sits on another subject`).toBe(false)
        seen.add(key)
      }
    }
  })

  it("uses the whole plot rather than one corner of it, which is what makes it a map", () => {
    for (const [id, lex] of TRACKS) {
      const xs = lex.positions.points.map((p) => p.x)
      const ys = lex.positions.points.map((p) => p.y)
      expect(Math.max(...xs) - Math.min(...xs), id).toBeGreaterThanOrEqual(40)
      expect(Math.max(...ys) - Math.min(...ys), id).toBeGreaterThanOrEqual(40)
    }
  })
})

describe("every track authors an addition someone could argue with", () => {
  it("names two terms and a result, each with its own figure and line", () => {
    for (const [id, lex] of TRACKS) {
      for (const term of [...lex.equation.operands, lex.equation.result]) {
        expect(filled(term.label), id).toBe(true)
        expect(filled(term.value), id).toBe(true)
        expect(filled(term.note), id).toBe(true)
      }
      const labels = [...lex.equation.operands.map((t) => t.label), lex.equation.result.label]
      expect(new Set(labels).size, id).toBe(3)
    }
  })
})

describe("every track authors one whole cut into parts", () => {
  it("names the whole, six parts, and the one part the page is about", () => {
    for (const [id, lex] of TRACKS) {
      expect(filled(lex.wheel.whole), id).toBe(true)
      expect(lex.wheel.sectors.length, id).toBeGreaterThanOrEqual(4)
      expect(lex.wheel.sectors.length, id).toBeLessThanOrEqual(8)
      for (const sector of lex.wheel.sectors) {
        expect(filled(sector.label), id).toBe(true)
        expect(filled(sector.value), id).toBe(true)
      }
      expect(new Set(lex.wheel.sectors.map((s) => s.label)).size, id).toBe(lex.wheel.sectors.length)
      expect(lex.wheel.marked, id).toBeGreaterThanOrEqual(0)
      expect(lex.wheel.marked, id).toBeLessThan(lex.wheel.sectors.length)
    }
  })
})

describe("every track authors one proposal argued from both sides", () => {
  it("names the proposal, both column headings, four points a side, and the call", () => {
    for (const [id, lex] of TRACKS) {
      expect(filled(lex.debate.proposal), id).toBe(true)
      expect(filled(lex.debate.forTitle), id).toBe(true)
      expect(filled(lex.debate.againstTitle), id).toBe(true)
      expect(lex.debate.forTitle, id).not.toBe(lex.debate.againstTitle)
      expect(lex.debate.pros.length, id).toBeGreaterThanOrEqual(2)
      expect(lex.debate.cons.length, id).toBeGreaterThanOrEqual(2)
      for (const item of [...lex.debate.pros, ...lex.debate.cons]) {
        expect(filled(item.label), id).toBe(true)
        expect(filled(item.note), id).toBe(true)
      }
      expect(filled(lex.debate.verdict), id).toBe(true)
    }
  })

  it("argues about the proposal rather than reciting the organisation's strengths", () => {
    for (const [id, lex] of TRACKS) {
      const strengths = new Set(lex.strengths)
      const weaknesses = new Set(lex.weaknesses)
      for (const pro of lex.debate.pros) expect(strengths.has(pro.label), `${id}: ${pro.label}`).toBe(false)
      for (const con of lex.debate.cons) expect(weaknesses.has(con.label), `${id}: ${con.label}`).toBe(false)
    }
  })

  it("says something different on each side, and lands somewhere at the end", () => {
    for (const [id, lex] of TRACKS) {
      const both = [...lex.debate.pros, ...lex.debate.cons].map((item) => item.label)
      expect(new Set(both).size, id).toBe(both.length)
      expect(lex.debate.verdict.length, id).toBeGreaterThan(10)
    }
  })
})

describe("the builders hand the authored claim through", () => {
  it("draws exactly what each track wrote, on every track", () => {
    for (const [id, lex] of TRACKS) {
      const venn = COMPONENT_BUILDERS.venn!(lex)
      if (venn.type !== "venn") throw new Error("expected venn")
      expect(venn.sets.map((s) => s.label), id).toEqual([...lex.sets.labels])
      expect(venn.center, id).toBe(lex.sets.overlap)

      const fishbone = COMPONENT_BUILDERS.fishbone!(lex)
      if (fishbone.type !== "fishbone") throw new Error("expected fishbone")
      expect(fishbone.effect, id).toBe(lex.causes.effect)
      expect(fishbone.ribs.map((r) => r.label), id).toEqual(lex.causes.categories.map((c) => c.label))

      const map = COMPONENT_BUILDERS.positioning_map!(lex)
      if (map.type !== "positioning_map") throw new Error("expected positioning_map")
      expect(map.points.filter((p) => p.emphasis).length, id).toBe(1)
      expect(map.x_axis.high, id).toBe(lex.positions.x.high)

      const equation = COMPONENT_BUILDERS.concept_equation!(lex)
      if (equation.type !== "concept_equation") throw new Error("expected concept_equation")
      expect(equation.result.label, id).toBe(lex.equation.result.label)

      const wheel = COMPONENT_BUILDERS.segmented_wheel!(lex)
      if (wheel.type !== "segmented_wheel") throw new Error("expected segmented_wheel")
      expect(wheel.segments.filter((s) => s.emphasis).length, id).toBe(1)
      expect(wheel.center, id).toBe(lex.wheel.whole)

      const debate = COMPONENT_BUILDERS.pros_cons!(lex)
      if (debate.type !== "pros_cons") throw new Error("expected pros_cons")
      expect(debate.verdict, id).toBe(lex.debate.verdict)
      expect(debate.pros.items.length, id).toBe(lex.debate.pros.length)
    }
  })
})
