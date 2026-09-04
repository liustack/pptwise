import { describe, expect, it } from "vitest"
import { STORY_LIMITS } from "@/design-story"
import { COMPONENT_TYPES } from "@/ir"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import { STORY_ZH } from "./stories.zh"

/**
 * The translation table is keyed by object id, and nothing keeps those ids
 * honest except this test. A theme rename or a retired component would
 * otherwise leave a row here that no card will ever read, and a stale
 * translation is worse than a missing one — it reads as done.
 */
const KNOWN_OBJECTS = new Set<string>([
  ...Object.values(THEME_DEFINITIONS).map((theme) => `theme:${theme.id}`),
  ...COMPONENT_TYPES.map((type) => `component:${type}`),
])

describe("the gallery's Chinese design copy", () => {
  it("translates only objects that exist", () => {
    const stale = Object.keys(STORY_ZH).filter((id) => !KNOWN_OBJECTS.has(id))
    expect(stale, "these translations name an object that is gone").toEqual([])
  })

  it("translates only fields a story has", () => {
    const fields = new Set(Object.keys(STORY_LIMITS))
    const unknown = Object.entries(STORY_ZH).flatMap(([id, translated]) =>
      Object.keys(translated)
        .filter((field) => !fields.has(field))
        .map((field) => `${id}.${field}`),
    )
    expect(unknown).toEqual([])
  })

  it("leaves no translated field blank, since a blank one falls back silently", () => {
    const blank = Object.entries(STORY_ZH).flatMap(([id, translated]) =>
      Object.entries(translated)
        .filter(([, text]) => text.trim() === "")
        .map(([field]) => `${id}.${field}`),
    )
    expect(blank).toEqual([])
  })
})
