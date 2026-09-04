// @vitest-environment node
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { contrastRatio, relativeLuminance } from "../render/ink"
import { deriveMuted } from "../themes/extract/brand-extract"
import { forkTheme } from "./theme-fork"
import { menusEqual, themeFileFromPreset } from "./theme-resolve"

installNodePlatform()

function hueDegrees(hex: string): number {
  const n = Number.parseInt(hex.slice(1, 7), 16)
  const channels = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  const [r, g, b] = channels
  const max = Math.max(...channels)
  const min = Math.min(...channels)
  const delta = max - min
  if (delta === 0) return 0
  const raw = max === r
    ? ((g! - b!) / delta) % 6
    : max === g
      ? (b! - r!) / delta + 2
      : (r! - g!) / delta + 4
  return (raw * 60 + 360) % 360
}

function hueDistance(a: string, b: string): number {
  const delta = Math.abs(hueDegrees(a) - hueDegrees(b))
  return Math.min(delta, 360 - delta)
}

describe("forkTheme", () => {
  const source = themeFileFromPreset("brief", { id: "acme", label: "Acme" })

  it("keeps the menu byte-identical", () => {
    const forked = forkTheme(source, { primary: "#0B5FFF" }, { id: "acme-blue", label: "Acme Blue" })
    expect(menusEqual(source.menu, forked.menu)).toBe(true)
    expect(forked.menu).toEqual(source.menu)
  })

  it("carries the design story through a preset copy and a fork", () => {
    // The story is what the theme is for. A copy and a repaint both keep it,
    // the way `emphasis` is kept, so a workspace theme is never handed to a
    // reviewer or a model with nothing to say for itself.
    const copied = themeFileFromPreset("swiss", { id: "acme-swiss", label: "Acme Swiss" })
    expect(copied.story?.name).toBe("Swiss")

    const forked = forkTheme(copied, { primary: "#0B5FFF" }, { id: "acme-swiss-blue" })
    expect(forked.story).toEqual(copied.story)
  })

  it("keeps the source theme's emphasis stroke", () => {
    // A fork repaints the palette. How the theme strikes a `**marked**` run
    // is handwriting, not palette, so it survives the repaint on both
    // presets that declare one.
    const pad = themeFileFromPreset("brief", { id: "pad-src" })
    expect(pad.emphasis).toBe("pad")
    expect(forkTheme(pad, { primary: "#0B5FFF" }, { id: "pad-fork" }).emphasis).toBe("pad")

    const underline = themeFileFromPreset("lecture", { id: "underline-src" })
    expect(underline.emphasis).toBe("underline")
    expect(forkTheme(underline, { primary: "#0B5FFF" }, { id: "underline-fork" }).emphasis).toBe(
      "underline",
    )
  })

  it("rederives muted with deriveMuted", () => {
    const forked = forkTheme(
      source,
      { primary: "#0B5FFF", bg: "#F7F6F2", text: "#1C1E23", surface: "#FFFFFF" },
      { id: "acme-blue" },
    )
    expect(forked.style.colors.muted).toBe(
      deriveMuted(forked.style.colors.text, forked.style.colors.bg, forked.style.colors.surface),
    )
  })

  it("brief chapter bg follows the new primary", () => {
    expect(source.style.defaultBackgrounds.chapter).toEqual({
      kind: "color",
      value: source.style.colors.primary,
    })
    const forked = forkTheme(source, { primary: "#0B5FFF" }, { id: "acme-blue" })
    expect(forked.style.defaultBackgrounds.chapter).toEqual({ kind: "color", value: "#0B5FFF" })
    expect(forked.style.colors.primary).toBe("#0B5FFF")
  })

  it("keeps primary and accent dependencies separate when Ember anchors coincide", () => {
    const ember = themeFileFromPreset("ember", { id: "ember-source" })
    ember.style.colors.accentPool = [ember.style.colors.accent, "#E8A13C"]
    const forked = forkTheme(
      ember,
      { primary: "#3A7BFF", accent: "#F04E98" },
      { id: "ember-fork" },
    )
    expect(forked.style.colors.chartPalette[0]).toBe("#3A7BFF")
    expect(forked.style.colors.accentPool?.[0]).toBe("#F04E98")
  })

  it("rebuilds structural colors from their background-plane roles", () => {
    const donor = structuredClone(source)
    donor.style.colors.panel = "#EAE8DC"
    donor.style.colors.border = "#DDDCD4"
    donor.style.colors.cardStroke = "#D1CEC0"
    const forked = forkTheme(
      donor,
      {
        primary: "#3A7BFF",
        accent: "#F04E98",
        bg: "#101820",
        surface: "#182530",
        text: "#F5F7FA",
      },
      { id: "acme-dark" },
    )

    expect(forked.style.colors.panel).not.toBe(donor.style.colors.panel)
    expect(forked.style.colors.border).not.toBe(donor.style.colors.border)
    expect(forked.style.colors.cardStroke).not.toBe(donor.style.colors.cardStroke)
    expect(relativeLuminance(forked.style.colors.panel!)).toBeGreaterThan(relativeLuminance(forked.style.colors.bg))
    expect(relativeLuminance(forked.style.colors.border!)).toBeGreaterThan(relativeLuminance(forked.style.colors.surface))
    expect(relativeLuminance(forked.style.colors.cardStroke!)).toBeGreaterThan(relativeLuminance(forked.style.colors.surface))
  })

  it("rotates palette sequences around their semantic anchors", () => {
    const donor = structuredClone(source)
    donor.style.colors.primary = "#FF0000"
    donor.style.colors.accent = "#FFFF00"
    donor.style.colors.chartPalette = ["#FF0000", "#00FF00", "#0000FF"]
    donor.style.colors.accentPool = ["#FFFF00", "#00FFFF", "#FF00FF"]
    const forked = forkTheme(
      donor,
      { primary: "#0000FF", accent: "#00FF00" },
      { id: "acme-rotated" },
    )

    expect(forked.style.colors.chartPalette).toEqual(["#0000FF", "#FF0000", "#00FF00"])
    expect(forked.style.colors.accentPool).toEqual(["#00FF00", "#0000FF", "#FF0000"])
  })

  it("preserves status hues while calibrating lightness against bg and surface", () => {
    const donor = structuredClone(source)
    donor.style.colors.danger = "#660000"
    donor.style.colors.warning = "#665500"
    donor.style.colors.success = "#006633"
    const forked = forkTheme(
      donor,
      {
        primary: "#3A7BFF",
        accent: "#F04E98",
        bg: "#101820",
        surface: "#182530",
        text: "#F5F7FA",
      },
      { id: "acme-status" },
    )

    for (const token of ["danger", "warning", "success"] as const) {
      const before = donor.style.colors[token]!
      const after = forked.style.colors[token]!
      expect(after).not.toBe(before)
      expect(hueDistance(before, after)).toBeLessThanOrEqual(1)
      expect(contrastRatio(after, forked.style.colors.bg)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(after, forked.style.colors.surface)).toBeGreaterThanOrEqual(4.5)
    }
  })

  it("rebuilds non-anchor default background colors by page role", () => {
    const ledger = themeFileFromPreset("ledger", { id: "ledger-source" })
    const before = ledger.style.defaultBackgrounds.cover
    expect(before.kind).toBe("gradient")
    const forked = forkTheme(
      ledger,
      {
        primary: "#2B59C3",
        accent: "#C24172",
        bg: "#F4F5F7",
        surface: "#FFFFFF",
        text: "#15171A",
      },
      { id: "ledger-light" },
    )
    const after = forked.style.defaultBackgrounds.cover
    expect(forked.style.colors.chartPalette[0]).toBe("#2B59C3")
    expect(after.kind).toBe("gradient")
    if (before.kind !== "gradient" || after.kind !== "gradient") return
    expect(after.from).not.toBe(before.from)
    expect(after.to).not.toBe(before.to)
    expect(after.direction).toBe(before.direction)
    expect(relativeLuminance(after.from)).toBeGreaterThan(0.7)
    expect(relativeLuminance(after.to)).toBeGreaterThan(0.7)
  })

  it("writes version 2 with no base", () => {
    const forked = forkTheme(source, { primary: "#0B5FFF" }, { id: "acme-blue" })
    expect(forked.version).toBe(2)
    expect(forked).not.toHaveProperty("base")
    expect(forked.style.id).toBe("acme-blue")
    expect(forked.id).toBe("acme-blue")
  })

  it("throws when the rederived tokens fail the contrast floor", () => {
    expect(() =>
      forkTheme(
        source,
        { primary: "#FFFFFF", bg: "#FFFFFF", text: "#F0F0F0", surface: "#FFFFFF" },
        { id: "acme-wash" },
      ),
    ).toThrow(/contrast ratio/)
  })
})
