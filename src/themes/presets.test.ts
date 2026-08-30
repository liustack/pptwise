import { describe, it, expect } from "vitest"
import { PptwiseError } from "../errors"
import { CANONICAL_THEME_IDS } from "./index"
import { THEME_PRESETS, copyThemePreset, getThemePreset, isThemePresetId } from "./presets"
import { THEME_OCCASIONS } from "./occasions"

describe("the factory preset shelf", () => {
  it("lists every built-in with its occasion tags and identity band", () => {
    expect(THEME_PRESETS.map((preset) => preset.id)).toEqual([...CANONICAL_THEME_IDS])
    for (const preset of THEME_PRESETS) {
      expect(preset.occasions).toEqual(THEME_OCCASIONS[preset.id].occasions)
      expect(preset.identity).toBe(THEME_OCCASIONS[preset.id].identity)
      expect(preset.label.length).toBeGreaterThan(0)
    }
  })

  it("rejects an unknown preset id instead of falling back", () => {
    expect(() => getThemePreset("nope")).toThrow(PptwiseError)
    expect(isThemePresetId("nope")).toBe(false)
    expect(isThemePresetId("consulting")).toBe(true)
  })

  it("copies under a new id and rewrites style.id to match", () => {
    const copy = copyThemePreset("consulting", "acme-report")
    expect(copy.id).toBe("acme-report")
    expect(copy.style.id).toBe("acme-report")
    expect(copy.version).toBe(2)
    expect(copy.occasions).toEqual(THEME_OCCASIONS.consulting.occasions)
  })

  it("allows a freeze copy that keeps the preset id", () => {
    const frozen = copyThemePreset("consulting", "consulting")
    expect(frozen.id).toBe("consulting")
    expect(frozen.style.id).toBe("consulting")
    const shadowed = copyThemePreset("consulting", "academic")
    expect(shadowed.id).toBe("academic")
    expect(shadowed.style.id).toBe("academic")
  })

  it("shares no mutable state with the preset it copied", () => {
    const copy = copyThemePreset("academic", "fork-a")
    copy.style.colors.bg = "#000000"
    copy.menu.content.points!.face = "quiet-frame"
    const second = copyThemePreset("academic", "fork-b")
    expect(second.style.colors.bg).not.toBe("#000000")
    expect(second.menu.content.points!.face).not.toBe("quiet-frame")
  })

  it("pushes the theme-wide motif down into every entry whose face can take one", () => {
    const copy = copyThemePreset("academic", "fork-motif")
    expect(copy.motif).toBeUndefined()
    expect(copy.menu.cover.decor).toEqual({ kind: "motif", id: "rail-motif" })
    expect(copy.menu.content.points?.decor).toEqual({ kind: "motif", id: "rail-motif" })
    // A sparse climax face is frameless (branding: "none") but the theme
    // motif still paints on it, so the pushdown writes the anchor here too.
    expect(copy.menu.content.statement?.decor).toEqual({ kind: "motif", id: "rail-motif" })
  })

  it("leaves a motif-less preset's entries undecorated", () => {
    const copy = copyThemePreset("stage", "fork-stage")
    expect(copy.menu.cover.decor).toBeUndefined()
  })
})
