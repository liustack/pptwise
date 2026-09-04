import { describe, expect, it } from "vitest"
import { findForbiddenNameWords, STORY_LIMITS, type DesignStory, type DesignStoryField } from "@/design-story"
import { COMPONENT_TYPES } from "@/ir"
import { componentStory } from "@/ir/components/stories"
import { KIND_STORIES } from "@/ir/kind-stories"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import { decodeManifest, MANIFEST_VERSION } from "./render"
import { STORY_ZH } from "./stories.zh"

/**
 * The translation table is keyed by object id and field, and nothing keeps
 * either honest except this test.
 *
 * It binds to the stories themselves, not merely to the list of objects: a
 * translation of a field the source story does not have is a translation
 * nobody will ever read, and it reads as done. A renamed theme or a retired
 * component leaves the same kind of hole from the other direction.
 */
const SOURCE_STORIES: ReadonlyMap<string, DesignStory> = new Map([
  ...Object.values(THEME_DEFINITIONS).flatMap((theme) =>
    theme.story === undefined ? [] : ([[`theme:${theme.id}`, theme.story]] as [string, DesignStory][]),
  ),
  ...Object.entries(KIND_STORIES).map(([kind, story]) => [`kind:${kind}`, story] as [string, DesignStory]),
  ...COMPONENT_TYPES.flatMap((type) => {
    const story = componentStory(type)
    return story === undefined ? [] : ([[`component:${type}`, story]] as [string, DesignStory][])
  }),
])

describe("the gallery's Chinese design copy", () => {
  it("translates only objects whose story is written", () => {
    const orphans = Object.keys(STORY_ZH).filter((id) => !SOURCE_STORIES.has(id))
    expect(orphans, "these translations have no source story — nothing will ever show them").toEqual([])
  })

  it("translates only fields the source story actually has", () => {
    const fields = new Set(Object.keys(STORY_LIMITS))
    const orphans = Object.entries(STORY_ZH).flatMap(([id, translated]) =>
      Object.keys(translated)
        .filter((field) => !fields.has(field) || SOURCE_STORIES.get(id)?.[field as DesignStoryField] === undefined)
        .map((field) => `${id}.${field}`),
    )
    expect(orphans, "these fields are translated but not written in English").toEqual([])
  })

  it("leaves no translated field blank, since a blank one falls back silently", () => {
    const blank = Object.entries(STORY_ZH).flatMap(([id, translated]) =>
      Object.entries(translated)
        .filter(([, text]) => text.trim() === "")
        .map(([field]) => `${id}.${field}`),
    )
    expect(blank).toEqual([])
  })

  it("holds a translated name to the same naming rule as the name it translates", () => {
    const broken = Object.entries(STORY_ZH).flatMap(([id, translated]) =>
      translated.name === undefined
        ? []
        : findForbiddenNameWords(translated.name).map((word) => `${id} name "${translated.name}" says "${word}"`),
    )
    expect(broken, "a translated name names a voice too").toEqual([])
  })
})

describe("decodeManifest", () => {
  it("accepts the version this build writes", () => {
    expect(decodeManifest({ manifestVersion: MANIFEST_VERSION }, "probe").manifestVersion).toBe(MANIFEST_VERSION)
  })

  it("refuses an older gallery rather than dropping what it cannot read", () => {
    expect(() => decodeManifest({ manifestVersion: 4 }, "old/manifest.json")).toThrow(/version 4/)
    expect(() => decodeManifest({ manifestVersion: 4 }, "old/manifest.json")).toThrow(/pnpm gallery/)
    expect(() => decodeManifest({}, "empty/manifest.json")).toThrow(/undefined/)
  })
})
