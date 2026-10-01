import { describe, it, expect } from "vitest"
import { KIND_VALUES } from "@/ir"
import { getLayout } from "../../layouts/registry"
import { BUILTIN_THEME_FILES, CANONICAL_THEME_IDS } from "../index"
import type { Menu, MenuEntry } from "../schema"

function entries(menu: Menu): { path: string; slideType: "cover" | "chapter" | "content" | "ending"; entry: MenuEntry }[] {
  const content = Object.entries(menu.content).flatMap(([kind, entry]) =>
    entry === undefined ? [] : [{ path: `content.${kind}`, slideType: "content" as const, entry }],
  )
  return [
    { path: "cover", slideType: "cover" as const, entry: menu.cover },
    { path: "chapter", slideType: "chapter" as const, entry: menu.chapter },
    ...content,
    { path: "ending", slideType: "ending" as const, entry: menu.ending },
  ]
}

/** Faces a menu names for more than one kind without declaring that they dispatch by content. */
function repeatedFixedFaces(content: Menu["content"]): string[] {
  const counts = new Map<string, number>()
  for (const entry of Object.values(content)) {
    if (entry === undefined) continue
    counts.set(entry.face, (counts.get(entry.face) ?? 0) + 1)
  }
  return [...counts]
    .filter(([face, n]) => n > 1 && getLayout(face)?.dispatch !== "content")
    .map(([face]) => face)
}

describe("built-in menus", () => {
  it.each(CANONICAL_THEME_IDS)("%s names a registered face valid for each page type", (id) => {
    for (const { path, slideType, entry } of entries(BUILTIN_THEME_FILES[id].menu)) {
      const layout = getLayout(entry.face)
      expect(layout, `${id} ${path} face "${entry.face}"`).toBeDefined()
      expect(layout!.slideTypes, `${id} ${path}`).toContain(slideType)
    }
  })

  it.each(CANONICAL_THEME_IDS)("%s serves a non-empty subset of the kind vocabulary", (id) => {
    const kinds = Object.keys(BUILTIN_THEME_FILES[id].menu.content)
    expect(kinds.length).toBeGreaterThan(0)
    for (const kind of kinds) expect(KIND_VALUES as readonly string[]).toContain(kind)
  })

  // A face drawing one fixed arrangement, named by two kinds, makes two kinds
  // of page look the same. Only a face that picks its composition from the
  // page's content (`LayoutDefinition.dispatch`) may serve several kinds.
  it.each(CANONICAL_THEME_IDS)("%s gives each served kind its own face, unless the face dispatches by content", (id) => {
    expect(repeatedFixedFaces(BUILTIN_THEME_FILES[id].menu.content), `${id} points two kinds at one face`).toEqual([])
  })

  it("refuses a fixed face named by two kinds, and lets a dispatching face serve several", () => {
    expect(repeatedFixedFaces({ points: { face: "narrow-column" }, list: { face: "narrow-column" } })).toEqual(["narrow-column"])
    expect(
      repeatedFixedFaces({ points: { face: "gauge-sheet" }, list: { face: "gauge-sheet" }, data: { face: "gauge-sheet" } }),
    ).toEqual([])
  })

  it.each(CANONICAL_THEME_IDS)("%s silences decoration only where the face draws its own", (id) => {
    for (const { entry } of entries(BUILTIN_THEME_FILES[id].menu)) {
      if (entry.decor?.kind !== "silent") continue
      expect(getLayout(entry.face)).toBeDefined()
    }
  })

  it("every built-in declares version 2 and no retired structural field", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const file = BUILTIN_THEME_FILES[id] as Record<string, unknown>
      expect(file.version).toBe(2)
      expect(file).not.toHaveProperty("faces")
      expect(file).not.toHaveProperty("tendencies")
      expect(file).not.toHaveProperty("sparse")
    }
  })

  it("the four boundary faces stay locked to one face each", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const menu = BUILTIN_THEME_FILES[id].menu
      for (const entry of [menu.cover, menu.chapter, menu.ending]) {
        expect(typeof entry.face).toBe("string")
        expect(entry.face.length).toBeGreaterThan(0)
      }
    }
  })
})
