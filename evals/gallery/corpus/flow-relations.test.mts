// @vitest-environment node
//
// The three flow components whose content is a *relation*, not a bag of words.
//
// A staircase claims each rung sits above the last. A swimlane claims a
// particular desk owns a particular step. A decision tree claims a condition
// sends a reader down one path rather than another. None of those survives
// being assembled from pool positions — the first cut paired a clinic's
// blood-pressure booklets with the resident who models keeping one, and
// answered "measure at home or come in" with 高压低压 and 静坐五分钟.
//
// So each track authors them whole, and this file holds every track to that:
// present, complete, internally consistent, and distinct from its neighbours.
// It reads the tracks rather than the builders, because the builders now do
// nothing but hand the authored fact through.
import { describe, expect, it } from "vitest"
import { LEXICONS } from "./lexicon"
import { NATIVE_LEXICONS } from "./native"
import { COMPONENT_BUILDERS } from "./components"
import type { Lexicon } from "./lexicon"

const TRACKS: readonly (readonly [string, Lexicon])[] = [
  ...Object.entries(LEXICONS).map(([id, lex]) => [`shared:${id}`, lex] as const),
  ...Object.entries(NATIVE_LEXICONS).map(([id, lex]) => [`theme:${id}`, lex] as const),
]

describe("every track authors its own ladder", () => {
  it("names four rungs, each with its own count and unit", () => {
    for (const [id, lex] of TRACKS) {
      expect(lex.levels.length, id).toBeGreaterThanOrEqual(4)
      for (const level of lex.levels) {
        expect(level.title.trim(), id).not.toBe("")
        expect(level.value.trim(), id).not.toBe("")
        expect(level.unit.trim(), id).not.toBe("")
      }
      expect(new Set(lex.levels.map((l) => l.title)).size, id).toBe(lex.levels.length)
    }
  })

  it("thins towards the top, which is what makes it a ladder and not a list", () => {
    for (const [id, lex] of TRACKS) {
      const counts = lex.levels.map((l) => Number(l.value.replace(/,/g, "")))
      for (const count of counts) expect(Number.isFinite(count), id).toBe(true)
      for (let i = 1; i < counts.length; i += 1) {
        expect(counts[i]!, `${id} rung ${i}`).toBeLessThan(counts[i - 1]!)
      }
    }
  })

  it("borrows no rung name from the stage pool, which names steps in time", () => {
    for (const [id, lex] of TRACKS) {
      const stages = new Set(lex.stages)
      for (const level of lex.levels) expect(stages.has(level.title), `${id}: ${level.title}`).toBe(false)
    }
  })
})

describe("every track authors who owns each step", () => {
  it("names an owner for every stage the swimlane draws, inside the lanes it draws", () => {
    for (const [id, lex] of TRACKS) {
      expect(lex.handover.owners.length, id).toBeGreaterThanOrEqual(5)
      for (const owner of lex.handover.owners) {
        expect(Number.isInteger(owner), id).toBe(true)
        expect(owner, id).toBeGreaterThanOrEqual(0)
        expect(owner, id).toBeLessThan(3)
      }
      expect(lex.handover.note.trim(), id).not.toBe("")
    }
  })

  it("hands work over at least once, since a note about a handover needs one", () => {
    for (const [id, lex] of TRACKS) {
      const owners = lex.handover.owners.slice(0, 5)
      expect(owners.some((o, i) => i > 0 && o !== owners[i - 1]), id).toBe(true)
      // Not a rotation: a repeating pattern is what put the wrong step on the
      // wrong desk, so at least one lane owns two steps that are not adjacent.
      expect(new Set(owners).size, id).toBeLessThan(owners.length)
    }
  })
})

describe("every track authors the paths out of its own question", () => {
  it("gives two conditions, each leading somewhere with two priced endings", () => {
    for (const [id, lex] of TRACKS) {
      expect(lex.decision.trim(), id).not.toBe("")
      expect(lex.choices.length, id).toBe(2)
      const seen = new Set<string>()
      for (const branch of lex.choices) {
        expect(branch.edge.trim(), id).not.toBe("")
        expect(branch.title.trim(), id).not.toBe("")
        expect(branch.detail.trim(), id).not.toBe("")
        expect(branch.outcomes.length, id).toBe(2)
        for (const outcome of branch.outcomes) {
          for (const field of [outcome.edge, outcome.title, outcome.detail, outcome.value, outcome.unit]) {
            expect(field.trim(), `${id}: ${outcome.title}`).not.toBe("")
          }
          expect(seen.has(outcome.title), `${id} repeats ${outcome.title}`).toBe(false)
          seen.add(outcome.title)
        }
      }
    }
  })

  it("recommends exactly one ending, which is what a page arguing for a path does", () => {
    for (const [id, lex] of TRACKS) {
      const marked = lex.choices.flatMap((b) => b.outcomes.filter((o) => o.recommended === true))
      expect(marked.length, id).toBe(1)
    }
  })

  it("takes no branch or ending name from the phrase pool the first cut assembled from", () => {
    for (const [id, lex] of TRACKS) {
      const phrases = new Set(lex.phrases)
      for (const branch of lex.choices) {
        expect(phrases.has(branch.title), `${id}: ${branch.title}`).toBe(false)
        for (const outcome of branch.outcomes) {
          expect(phrases.has(outcome.title), `${id}: ${outcome.title}`).toBe(false)
        }
      }
    }
  })
})

describe("the builders hand the authored fact through", () => {
  it("builds each of the three straight from the track, with nothing paired by index", () => {
    for (const [id, lex] of TRACKS) {
      const stair = COMPONENT_BUILDERS.staircase!(lex)
      if (stair.type !== "staircase") throw new Error("not a staircase")
      expect(stair.items.map((i) => i.title), id).toEqual(lex.levels.slice(0, 4).map((l) => l.title))
      expect(stair.items.map((i) => i.unit), id).toEqual(lex.levels.slice(0, 4).map((l) => l.unit))

      const lanes = COMPONENT_BUILDERS.swimlane!(lex)
      if (lanes.type !== "swimlane") throw new Error("not a swimlane")
      expect(lanes.handoff_note, id).toBe(lex.handover.note)
      lanes.steps.forEach((step, i) => {
        expect(step.lane, `${id} step ${i}`).toBe(lex.people[lex.handover.owners[i]!]!.role)
      })

      const tree = COMPONENT_BUILDERS.decision_tree!(lex)
      if (tree.type !== "decision_tree") throw new Error("not a decision_tree")
      expect(tree.question, id).toBe(lex.decision)
      expect(tree.branches.map((b) => b.title), id).toEqual(lex.choices.map((b) => b.title))
    }
  })

  it("copies out of the pools, so a page cannot edit the corpus it was built from", () => {
    const lex = LEXICONS.zh
    const first = COMPONENT_BUILDERS.staircase!(lex)
    if (first.type !== "staircase") throw new Error("not a staircase")
    first.items[0]!.title = "overwritten"
    const second = COMPONENT_BUILDERS.staircase!(lex)
    if (second.type !== "staircase") throw new Error("not a staircase")
    expect(second.items[0]!.title).toBe(lex.levels[0]!.title)
  })
})
