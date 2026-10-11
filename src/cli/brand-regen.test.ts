// @vitest-environment node
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { contrastRatio } from "../render/ink"
import { CANONICAL_THEME_IDS } from "../themes"
import { paletteBreaksTaboo } from "../themes/chart-taboo"
import { compileThemeDefinition } from "../themes/definitions"
import { hexToHsl, hueDelta } from "../themes/palette-rebase"
import type { ThemeFile } from "../themes/schema"
import { measureBrandFace, type BrandFace } from "./brand-face"
import { regenerateFromBrand, type BrandRegenResult } from "./brand-regen"
import { themeFileFromPreset } from "./theme-resolve"

installNodePlatform()

const BRANDS = ["#F09415", "#156082", "#C8102E", "#00843D"] as const

const sources = new Map<string, { file: ThemeFile; face: BrandFace }>()
function source(id: string): { file: ThemeFile; face: BrandFace } {
  let hit = sources.get(id)
  if (hit === undefined) {
    const file = themeFileFromPreset(id, { id: `${id}-src` })
    hit = { file, face: measureBrandFace(file) }
    sources.set(id, hit)
  }
  return hit
}

function regen(id: string, brand: string): BrandRegenResult {
  const { file, face } = source(id)
  return regenerateFromBrand(file, brand, { id: `${id}-brand` }, face)
}

const hue = (hex: string) => hexToHsl(hex).h

describe("R2: the brand goes where it reads, unchanged when it can", () => {
  it("goes into the face unchanged when it reads there (ink's seal takes a red)", () => {
    const { file, placement } = regen("ink", "#C8102E")
    expect(placement).toMatchObject({ face: "accent", slot: "accent", route: "face", color: "#C8102E" })
    expect(file.style.colors.accent).toBe("#C8102E")
  })

  it("moves to the theme's other colored slot when the face cannot hold it (brief's orange takes the short rule)", () => {
    const { file, placement } = regen("brief", "#F09415")
    expect(placement).toMatchObject({ face: "primary", slot: "accent", route: "other", color: "#F09415" })
    // brief's primary sets its headings, so it needs body contrast the orange does not have.
    expect(contrastRatio("#F09415", file.style.colors.bg)).toBeLessThan(4.5)
    expect(file.style.colors.accent).toBe("#F09415")
    expect(file.style.colors.primary).toBe("#1E2A4A")
  })

  it("keeps hue and saturation and lifts lightness when neither slot can hold it (lecture's chalk turns light blue)", () => {
    const { file, placement } = regen("lecture", "#156082")
    expect(placement).toMatchObject({ face: "accent", slot: "accent", route: "lightness", otherIsColor: false })
    const accent = file.style.colors.accent
    expect(Math.abs(hueDelta(hue(accent), hue("#156082")))).toBeLessThan(1.5)
    expect(hexToHsl(accent).s).toBeCloseTo(hexToHsl("#156082").s, 1)
    // At the chalk yellow's own lightness, and readable on the blackboard.
    expect(hexToHsl(accent).l).toBeCloseTo(hexToHsl("#E9C46A").l, 2)
    expect(contrastRatio(accent, file.style.colors.bg)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio("#156082", file.style.colors.bg)).toBeLessThan(3)
  })

  it("takes a shade too small to see in the face before it moves the brand to another slot", () => {
    // #00843D reads 4.45:1 on brief's paper, a hair under the 4.5 its headings need.
    const { file, placement } = regen("brief", "#00843D")
    expect(placement).toMatchObject({ slot: "primary", route: "nudged" })
    expect(file.style.colors.primary).not.toBe("#00843D")
    expect(contrastRatio(file.style.colors.primary, file.style.colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("does not count a slot that is a shade of the ground as a place for the brand (rally's plum primary)", () => {
    const { file, placement } = regen("rally", "#156082")
    expect(placement).toMatchObject({ face: "accent", slot: "accent", otherIsColor: false })
    expect(file.style.colors.primary).toBe("#23173A")
  })
})

describe("R3: the other colors turn by the brand's hue step, greys and blacks stay", () => {
  it("turns brief's yellow by the step its navy took to the brand blue", () => {
    const { file } = regen("brief", "#156082")
    const step = hueDelta(hue("#1E2A4A"), hue("#156082"))
    expect(file.style.colors.primary).toBe("#156082")
    expect(hueDelta(hue("#F5C518") + step, hue(file.style.colors.accent))).toBeCloseTo(0, 0)
    expect(file.style.colors.chartPalette).toContain("#797D86")
  })

  it("leaves a near-black primary alone (ink, swiss, memo)", () => {
    for (const id of ["ink", "swiss", "memo"]) {
      for (const brand of BRANDS) {
        expect(regen(id, brand).file.style.colors.primary, `${id} ${brand}`).toBe(source(id).file.style.colors.primary)
      }
    }
  })
})

describe("R4: the theme keeps its own ground, text, and surface", () => {
  const KEPT = ["bg", "surface", "text", "muted", "panel", "border", "cardStroke", "danger", "warning", "success"] as const
  for (const id of CANONICAL_THEME_IDS) {
    it(`${id}: every brand keeps the ground tokens, fonts, and menu`, () => {
      const src = source(id).file
      for (const brand of BRANDS) {
        const { file } = regen(id, brand)
        for (const token of KEPT) expect(file.style.colors[token], `${brand} ${token}`).toBe(src.style.colors[token])
        expect(file.style.fonts).toEqual(src.style.fonts)
        expect(file.menu).toEqual(src.menu)
        for (const type of ["cover", "chapter", "content", "ending"] as const) {
          const before = src.style.defaultBackgrounds[type]
          const after = file.style.defaultBackgrounds[type]
          if (before.kind === "color" && before.value === src.style.colors.primary) {
            expect(after, `${brand} ${type}`).toEqual({ ...before, value: file.style.colors.primary })
          } else if (before.kind === "color" && before.value === src.style.colors.accent) {
            expect(after, `${brand} ${type}`).toEqual({ ...before, value: file.style.colors.accent })
          } else {
            expect(after, `${brand} ${type}`).toEqual(before)
          }
        }
      }
    })
  }

  it("keeps ink's rice paper", () => {
    for (const brand of BRANDS) {
      const { file } = regen("ink", brand)
      expect(file.style.colors.bg).toBe("#F7F2E7")
      expect(file.style.defaultBackgrounds.cover).toEqual({ kind: "color", value: "#F7F2E7" })
    }
  })
})

describe("R5: the chart keeps the theme's own style", () => {
  it("keeps swiss's black and grey series black and grey", () => {
    for (const brand of BRANDS) {
      const { file } = regen("swiss", brand)
      expect(file.style.colors.chartPalette.slice(1, 3), brand).toEqual(["#101010", "#5F5F5C"])
      expect(file.style.colors.chartPalette[0], brand).toBe(file.style.colors.accent)
    }
  })

  it("keeps ink's seal in the chart's seal position, so the faces that leave the seal out still do", () => {
    for (const brand of BRANDS) {
      const { file } = regen("ink", brand)
      expect(file.style.colors.chartPalette.slice(0, 3), brand).toEqual(["#1F1C18", file.style.colors.accent, "#8A8071"])
    }
  })

  it("keeps every chart color readable on lecture's blackboard", () => {
    for (const brand of BRANDS) {
      const { file } = regen("lecture", brand)
      for (const color of file.style.colors.chartPalette) {
        expect(contrastRatio(color, file.style.colors.bg), `${brand} ${color}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it("never puts a new vivid blue beside a vivid orange", () => {
    for (const id of CANONICAL_THEME_IDS) {
      if (paletteBreaksTaboo(source(id).file.style.colors.chartPalette)) continue
      for (const brand of BRANDS) {
        const palette = regen(id, brand).file.style.colors.chartPalette
        expect(paletteBreaksTaboo(palette), `${id} ${brand}: ${palette.join(" ")}`).toBe(false)
      }
    }
  })

  it("keeps a pair the theme itself ruled in, in whatever color the brand turns it (brief's navy and accent)", () => {
    const { file } = regen("brief", "#F09415")
    expect(file.style.colors.chartPalette.slice(0, 2)).toEqual(["#1E2A4A", "#F09415"])
  })
})

describe("R6: the contrast floor stays a hard gate", () => {
  it("every built-in theme, repainted in each test brand, compiles", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const brand of BRANDS) expect(() => compileThemeDefinition(regen(id, brand).file), `${id} ${brand}`).not.toThrow()
    }
  })

  it("refuses a source whose own text fails the floor", () => {
    const { file, face } = source("brief")
    const broken = structuredClone(file)
    broken.style.colors.text = "#E8E8E8"
    expect(() => regenerateFromBrand(broken, "#C8102E", { id: "broken" }, face)).toThrow(/contrast ratio/)
  })
})
