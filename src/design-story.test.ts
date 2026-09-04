import { describe, expect, it } from "vitest"
import { COMPONENT_TYPES } from "@/ir"
import { COMPONENT_STORY_TYPES, componentStory } from "@/ir/components/stories"
import { KIND_STORIES } from "@/ir/kind-stories"
import { KIND_VALUES } from "@/ir/narrative-values"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import {
  isValidDesignStory,
  scanSentences,
  STORY_LIMITS,
  validateDesignStory,
  type DesignStory,
} from "./design-story"

/**
 * Every theme, kind, and component must carry a design story, and this test
 * is what keeps that true as objects are added.
 *
 * Faces are deliberately out of the sweep. `LayoutDefinition` has the field,
 * no face fills it yet, and the copy for the general faces lands in its own
 * batch — adding 134 ids to the baseline below would bury the one thing it
 * is for. Add the face registry here in the same change that writes the
 * first face story.
 *
 * `STORYLESS_BASELINE` is a frozen licence, not a work list. It was frozen
 * empty, because every theme, kind, and component was written before this
 * test landed, and it may only lose entries. That is what makes this a
 * ratchet rather than a list: a new object with no story cannot be waved
 * through by appending a line, because the baseline is asserted to hold
 * nothing it was not frozen with.
 */
const STORYLESS_BASELINE: readonly string[] = []

/** What the baseline was frozen with. Editing this is editing the rule. */
const FROZEN_BASELINE: readonly string[] = []

interface StoriedObject {
  /** Namespaced so a theme and a component may share a plain id. */
  readonly id: string
  readonly story: DesignStory | undefined
}

function subjects(): readonly StoriedObject[] {
  const themes = Object.values(THEME_DEFINITIONS).map((theme) => ({
    id: `theme:${theme.id}`,
    story: theme.story,
  }))
  const kinds = KIND_VALUES.map((kind) => ({ id: `kind:${kind}`, story: KIND_STORIES[kind] as DesignStory }))
  const components = COMPONENT_TYPES.map((type) => ({
    id: `component:${type}`,
    story: componentStory(type),
  }))
  return [...themes, ...kinds, ...components]
}

describe("design story drift", () => {
  it("indexes every component in the vocabulary", () => {
    expect([...COMPONENT_STORY_TYPES].sort()).toEqual([...COMPONENT_TYPES].sort())
  })

  it("has a baseline that only shrinks", () => {
    expect(STORYLESS_BASELINE.filter((id) => !FROZEN_BASELINE.includes(id)), "the baseline is frozen — an object with no story is written, not licenced").toEqual([])
  })

  it("gives every theme, kind, and component a story", () => {
    const storyless = subjects()
      .filter((subject) => subject.story === undefined)
      .map((subject) => subject.id)
      .filter((id) => !STORYLESS_BASELINE.includes(id))
    expect(storyless, "these objects need a design story — the baseline is frozen and cannot take a new line").toEqual([])
  })

  it("drops a baseline entry as soon as its story is written", () => {
    const known = new Set(subjects().map((subject) => subject.id))
    expect(STORYLESS_BASELINE.filter((id) => !known.has(id)), "the baseline names an object that is gone").toEqual([])

    const written = subjects()
      .filter((subject) => subject.story !== undefined && STORYLESS_BASELINE.includes(subject.id))
      .map((subject) => subject.id)
    expect(written, "these stories are written — delete their lines from the baseline").toEqual([])
  })

  it("reports how much copy is left", () => {
    const total = subjects().length
    const done = total - STORYLESS_BASELINE.length
    console.info(`design stories: ${done}/${total} written, ${STORYLESS_BASELINE.length} pending`)
    expect(done).toBeGreaterThan(0)
  })

  it("holds every written story inside the field caps and the copy rules", () => {
    const problems = subjects().flatMap((subject) =>
      subject.story === undefined
        ? []
        : validateDesignStory(subject.story).map((problem) => `${subject.id} ${problem.field}: ${problem.message}`),
    )
    expect(problems).toEqual([])
  })

  it("gives each object a distinct name", () => {
    const names = subjects().flatMap((subject) => (subject.story === undefined ? [] : [subject.story.name]))
    expect(new Set(names).size).toBe(names.length)
  })
})

describe("scanSentences", () => {
  const cases: readonly [string, number, boolean][] = [
    ["Warm black, amber figures.", 1, true],
    ["One. Two. Three.", 3, true],
    // An abbreviation's full stop closes nothing.
    ["Leaders, e.g. directors.", 1, true],
    ["Choose it for reports, memos, etc.", 1, true],
    ["Read chapter No. 5 first.", 1, true],
    // Decimals are not sentence ends.
    ["It grew 3.5 times.", 1, true],
    // Chinese runs sentences together with no space between them.
    ["第一句。第二句。", 2, true],
    ["一句话。", 1, true],
    // A closing quote or bracket may sit after the full stop.
    ["Readers who ask \u201cWhy?\u201d", 1, true],
    ["The answer (finally.)", 1, true],
    // A fragment after the last full stop leaves the text unfinished.
    ["Leaders listen. trailing fragment", 1, false],
    ["anything loud", 0, false],
  ]

  for (const [text, count, closed] of cases) {
    it(`reads ${JSON.stringify(text)} as ${count} ${closed ? "closed" : "open"}`, () => {
      expect(scanSentences(text)).toEqual({ count, closed })
    })
  }
})

describe("validateDesignStory", () => {
  const good: DesignStory = {
    name: "Ledger",
    story: "Warm black, amber figures, a serif for the argument.",
    positioning: "Choose it when the story is a bet with numbers attached.",
    audience: "An analyst addressing people who allocate money.",
    notFor: "Soft narratives with no number to defend.",
  }

  it("passes a story that fits every cap", () => {
    expect(validateDesignStory(good)).toEqual([])
    expect(isValidDesignStory(good)).toBe(true)
  })

  it("names each missing required field", () => {
    const problems = validateDesignStory({ ...good, audience: "" })
    expect(problems.map((problem) => [problem.field, problem.code])).toEqual([["audience", "blank"]])
  })

  it("refuses prose past the character cap", () => {
    const problems = validateDesignStory({ ...good, story: `${"a".repeat(STORY_LIMITS.story.chars)}.` })
    expect(problems.map((problem) => problem.code)).toContain("too_long")
  })

  it("refuses a third sentence in a two-sentence field", () => {
    const problems = validateDesignStory({ ...good, positioning: "One. Two. Three." })
    expect(problems.map((problem) => problem.code)).toContain("too_many_sentences")
  })

  it("refuses prose that never finishes its sentence", () => {
    expect(validateDesignStory({ ...good, notFor: "anything loud" }).map((p) => p.code)).toContain(
      "unfinished_sentence",
    )
    expect(
      validateDesignStory({ ...good, notFor: "Anything loud. and a fragment" }).map((p) => p.code),
    ).toContain("unfinished_sentence")
  })

  it("accepts an abbreviation without counting it as a sentence", () => {
    expect(validateDesignStory({ ...good, audience: "Deciders, e.g. a board, who read fast." })).toEqual([])
  })

  it("refuses a name that ends on punctuation", () => {
    expect(validateDesignStory({ ...good, name: "Ledger." }).map((p) => p.code)).toContain(
      "name_reads_as_sentence",
    )
  })

  it("allows punctuation inside a name", () => {
    // Anchored at the end only: the rule is that a name must not read as a
    // sentence, not that it may hold no full stop at all.
    expect(validateDesignStory({ ...good, name: "No. 5" })).toEqual([])
  })

  it("refuses a name that answers who it is for", () => {
    for (const name of ["Financial Insight", "Kids Education", "Enterprise", "Wealth Management"]) {
      expect(validateDesignStory({ ...good, name }).map((p) => p.code), name).toContain(
        "forbidden_name_word",
      )
    }
  })

  it("welcomes a vertical in positioning and audience", () => {
    expect(
      validateDesignStory({
        ...good,
        positioning: "Choose it for a healthcare board review or any quarter that ends in a number.",
        audience: "A finance team reporting to its board.",
      }),
    ).toEqual([])
  })

  it("refuses maintainer vocabulary anywhere in the prose", () => {
    for (const field of ["story", "positioning", "audience", "notFor"] as const) {
      const problems = validateDesignStory({ ...good, [field]: "It picks the right face for the page." })
      expect(problems.map((p) => [p.field, p.code]), field).toContainEqual([field, "maintainer_word"])
    }
    expect(
      validateDesignStory({ ...good, story: "Nine named slots, one component, one layout." }).map((p) => p.code),
    ).toContain("maintainer_word")
  })
})
