import { describe, expect, it } from "vitest"
import { COMPONENT_TYPES } from "@/ir"
import { COMPONENT_STORY_TYPES, componentStory } from "@/ir/components/stories"
import { KIND_STORIES } from "@/ir/kind-stories"
import { KIND_VALUES } from "@/ir/narrative-values"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import {
  isValidDesignStory,
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
 * batch — adding 134 ids to the pending list below would bury the ids that
 * are actually close to being written. Add the face registry here in the
 * same change that writes the first face story.
 *
 * The pending list is a shrinking list, not a configuration knob. It fails
 * in both directions: an object that has no story and is not listed fails,
 * and a listed object that has since been written fails too, so nobody can
 * write the copy and leave the list claiming otherwise.
 */
// Empty: every theme, kind, and component carries its copy. Faces are the
// batch that follows, and they join this sweep with the first face story.
const PENDING: readonly string[] = []

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

  it("gives every theme, kind, and component a story, or names it as pending", () => {
    const unlisted = subjects()
      .filter((subject) => subject.story === undefined)
      .map((subject) => subject.id)
      .filter((id) => !PENDING.includes(id))
    expect(unlisted, "these objects need a design story, or a line in PENDING").toEqual([])
  })

  it("keeps the pending list shrinking", () => {
    const known = new Set(subjects().map((subject) => subject.id))
    const stale = PENDING.filter((id) => !known.has(id))
    expect(stale, "PENDING names objects that no longer exist").toEqual([])

    const written = subjects()
      .filter((subject) => subject.story !== undefined && PENDING.includes(subject.id))
      .map((subject) => subject.id)
    expect(written, "these stories are written — take them out of PENDING").toEqual([])
  })

  it("reports how much copy is left", () => {
    const total = subjects().length
    const done = total - PENDING.length
    console.info(`design stories: ${done}/${total} written, ${PENDING.length} pending\n${PENDING.join("\n")}`)
    expect(done).toBeGreaterThan(0)
  })

  it("holds every written story inside the field caps", () => {
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
    const problems = validateDesignStory({ ...good, notFor: "anything loud" })
    expect(problems.map((problem) => problem.code)).toContain("unfinished_sentence")
  })

  it("refuses a name written as a sentence", () => {
    const problems = validateDesignStory({ ...good, name: "Ledger." })
    expect(problems.map((problem) => problem.code)).toContain("name_reads_as_sentence")
  })

  it("refuses a name that squats on an industry", () => {
    const problems = validateDesignStory({ ...good, name: "Financial Insight" })
    expect(problems.map((problem) => problem.code)).toContain("industry_word")
  })

  it("welcomes an industry in positioning and audience", () => {
    expect(
      validateDesignStory({
        ...good,
        positioning: "Choose it for a healthcare board review or any quarter that ends in a number.",
        audience: "A finance team reporting to its board.",
      }),
    ).toEqual([])
  })
})
