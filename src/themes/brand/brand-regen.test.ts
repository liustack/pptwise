// @vitest-environment node
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { contrastRatio } from "../../render/ink"
import { CANONICAL_THEME_IDS } from ".."
import { paletteBreaksTaboo } from "../chart-taboo"
import { compileThemeDefinition } from "../definitions"
import { hexToOklch, hueDistance, oklabDistance } from "../palette-rebase"
import type { ThemeFile } from "../schema"
import { isChromatic, measureBrandFace, renderBrandSample, type BrandFace } from "./brand-face"
import { colorName } from "./color-name"
import { describePlacement, isSingleColorPalette, parseBrandOption, regenerateFromBrand, type BrandColors, type BrandRegenResult } from "./brand-regen"
import { themeFileFromPreset } from "../presets"

installNodePlatform()

const ORANGE = "#F09415" // Berlin's accent1
const BLUE = "#156082" // Office's accent1
const RED = "#C8102E"
const GREEN = "#00843D"
const OFFICE: BrandColors = { brand: BLUE, second: "#E97132" } // Office's accent1 and accent2
const SINGLE = [ORANGE, BLUE, RED, GREEN].map((brand) => ({ brand }))
const ALL: BrandColors[] = [...SINGLE, OFFICE]
const name = (c: BrandColors) => (c.second ? `${c.brand},${c.second}` : c.brand)

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

const results = new Map<string, BrandRegenResult>()
function regen(id: string, colors: BrandColors | string): BrandRegenResult {
  const c = typeof colors === "string" ? { brand: colors } : colors
  const key = `${id} ${name(c)}`
  let hit = results.get(key)
  if (hit === undefined) {
    const { file, face } = source(id)
    hit = regenerateFromBrand(file, c, { id: `${id}-brand` }, face)
    results.set(key, hit)
  }
  return hit
}

/** Every color the repaint wrote that a reader sees as a color: slots, chart, pool, emphasis ink. */
function written(file: ThemeFile): string[] {
  const c = file.style.colors
  return [c.primary, c.accent, ...c.chartPalette, ...(c.accentPool ?? []), ...(c.emphasisInk ? [c.emphasisInk] : [])]
}

/** The theme's own colors the repaint left in their own place. */
function keptOwn(src: ThemeFile, out: ThemeFile): Set<string> {
  const a = src.style.colors
  const b = out.style.colors
  const kept = new Set<string>()
  if (a.primary.toUpperCase() === b.primary.toUpperCase()) kept.add(b.primary.toUpperCase())
  if (a.accent.toUpperCase() === b.accent.toUpperCase()) kept.add(b.accent.toUpperCase())
  if (a.emphasisInk && b.emphasisInk && a.emphasisInk.toUpperCase() === b.emphasisInk.toUpperCase()) kept.add(b.emphasisInk.toUpperCase())
  // The theme's own inks stand in where no shade of the brand keeps its name.
  kept.add(a.text.toUpperCase())
  kept.add(a.muted.toUpperCase())
  return kept
}

/**
 * The hue rule: a color the repaint wrote is an ink or a grey, a color the
 * theme kept in its own place, or within 30 degrees (OKLCH hue) of the
 * brand or of the company's second color.
 */
function strayHues(id: string, colors: BrandColors): string[] {
  const out = regen(id, colors).file
  const kept = keptOwn(source(id).file, out)
  const family = [colors.brand, ...(colors.second ? [colors.second] : [])].map((hex) => hexToOklch(hex).h)
  return written(out).filter((hex) => {
    if (!isChromatic(hex) || kept.has(hex.toUpperCase())) return false
    const h = hexToOklch(hex).h
    return !family.some((f) => hueDistance(h, f) <= 30)
  })
}

describe("a brand with no color in it", () => {
  it("says the theme is repainted in grey when the brand is a grey, a black or a white", () => {
    for (const grey of ["#838383", "#111111", "#FAFAFA"]) {
      const { placement } = regen("bulletin", grey)
      expect(placement.brand.neutral, grey).toBe(true)
      expect(describePlacement(placement).join("\n"), grey).toMatch(/has no color in it.*repainted in grey/)
    }
  })

  it("says nothing of the kind for a colored brand", () => {
    const { placement } = regen("bulletin", ORANGE)
    expect(placement.brand.neutral).toBeUndefined()
    expect(describePlacement(placement).join("\n")).not.toMatch(/repainted in grey/)
  })
})

describe("rule 1: the brand goes in as it is, and the words change ink", () => {
  it("fills bulletin's cover field with Berlin's orange as it is", () => {
    const { file, placement } = regen("bulletin", ORANGE)
    expect(file.style.colors.primary).toBe(ORANGE)
    expect(placement.brand).toMatchObject({ slot: "primary", written: ORANGE, ground: true })
    const cover = renderBrandSample(file)[0]!
    expect(cover).toMatch(new RegExp(`<rect[^>]*width="1280"[^>]*height="720"[^>]*fill="${ORANGE}"`))
    expect(placement.brand.lifted).toBeUndefined()
  })

  it("keeps brief's navy headings and puts the orange in the rules and marks, as it is", () => {
    const { file, placement } = regen("brief", ORANGE)
    expect(file.style.colors.primary).toBe("#1E2A4A")
    expect(file.style.colors.accent).toBe(ORANGE)
    expect(placement.brand).toMatchObject({ slot: "accent", written: ORANGE })
    // Brief's headings are 36px and up: 3:1, and the orange reads 2.17:1.
    expect(placement.brand.passedOver).toMatchObject({ slot: "primary", why: "headings", need: 3 })
    expect((placement.brand.passedOver as { ratio: number }).ratio).toBeLessThan(3)
  })

  it("writes brief's headings in a brand that reads there", () => {
    for (const brand of [BLUE, RED, GREEN]) {
      const { file, placement } = regen("brief", brand)
      expect(file.style.colors.primary, brand).toBe(brand)
      expect(placement.brand.passedOver, brand).toBeUndefined()
    }
  })

  it("moves the brand's lightness for a heading slot only when the theme has no other color to give it (luxe's gold)", () => {
    const { file, placement } = regen("luxe", BLUE)
    expect(contrastRatio(BLUE, file.style.colors.bg)).toBeLessThan(3)
    expect(placement.brand).toMatchObject({ slot: "accent", lifted: { need: 3 } })
    expect(file.style.colors.primary).toBe(source("luxe").file.style.colors.primary)
  })
})

describe("rule 2: no neon on a dark page", () => {
  const DARK = CANONICAL_THEME_IDS.filter((id) => hexToOklch(source(id).file.style.colors.bg).L < 0.4)

  it("finds the dark themes", () => {
    expect(DARK).toEqual(expect.arrayContaining(["ledger", "rally", "terminal", "luxe", "ember", "museum", "stage", "lecture"]))
  })

  it("lifts Berlin's orange in swiss's red rules just to 3:1, its hue and chroma kept", () => {
    const { file, placement } = regen("swiss", ORANGE)
    const accent = file.style.colors.accent
    const ratio = contrastRatio(accent, file.style.colors.bg)
    expect(ratio).toBeGreaterThanOrEqual(3)
    expect(ratio).toBeLessThan(3.1)
    expect(hueDistance(hexToOklch(accent).h, hexToOklch(ORANGE).h)).toBeLessThan(2)
    expect(hexToOklch(accent).C).toBeLessThanOrEqual(hexToOklch(ORANGE).C + 0.005)
    expect(placement.brand).toMatchObject({ slot: "accent", lifted: { need: 3 } })
  })

  it("fills lecture's chalk bars with the deep blue as it is: a field of color is not lifted", () => {
    const { file, placement } = regen("lecture", BLUE)
    expect(file.style.colors.accent).toBe(BLUE)
    expect(placement.brand).toMatchObject({ slot: "accent", written: BLUE, fills: true })
    expect(placement.brand.lifted).toBeUndefined()
  })

  it("never writes a color more saturated than the colors asked for, on any theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const colors of ALL) {
        const out = regen(id, colors).file
        const kept = keptOwn(source(id).file, out)
        const cap = Math.max(...[colors.brand, colors.second ?? colors.brand].map((hex) => hexToOklch(hex).C)) + 0.01
        for (const hex of written(out)) {
          if (kept.has(hex.toUpperCase())) continue
          expect(hexToOklch(hex).C, `${id} ${name(colors)} ${hex}`).toBeLessThanOrEqual(cap)
        }
      }
    }
  })

  it("uses the brand as it is wherever it already stands off the ground", () => {
    for (const id of DARK) {
      const { placement } = regen(id, ORANGE)
      expect(placement.brand.written, id).toBe(ORANGE)
    }
  })
})

describe("rule 3: the other colors are drawn from the brand", () => {
  it("adds no hue the brand and the theme do not have (thesis orange, brief red and green, almanac, homeroom and proposal green)", () => {
    const cases: [string, string][] = [
      ["thesis", ORANGE],
      ["brief", RED],
      ["brief", GREEN],
      ["almanac", ORANGE],
      ["almanac", BLUE],
      ["almanac", RED],
      ["almanac", GREEN],
      ["homeroom", GREEN],
      ["proposal", GREEN],
    ]
    for (const [id, brand] of cases) expect(strayHues(id, { brand }), `${id} ${brand}`).toEqual([])
  })

  it("keeps every theme and brand inside the brand's family", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const colors of ALL) expect(strayHues(id, colors), `${id} ${name(colors)}`).toEqual([])
    }
  })

  it("gives brief's second slot a clearly lighter shade of the brand", () => {
    const { file } = regen("brief", BLUE)
    const accent = hexToOklch(file.style.colors.accent)
    expect(hueDistance(accent.h, hexToOklch(BLUE).h)).toBeLessThan(2)
    expect(accent.L - hexToOklch(BLUE).L).toBeGreaterThan(0.12)
  })

  it("leads every chart that is not one color among inks with the brand as its slot holds it", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const src = source(id).file.style.colors
      if (isSingleColorPalette(src.chartPalette.map((hex) => hex.toUpperCase()))) continue
      for (const colors of SINGLE) {
        const { file, placement } = regen(id, colors)
        expect(file.style.colors.chartPalette[0], `${id} ${colors.brand}`).toBe(placement.brand.chart)
        // The bars take the brand as it is unless the chart's lead is a slot that only draws marks.
        if (placement.brand.lifted === undefined) expect(placement.brand.chart, `${id} ${colors.brand}`).toBe(colors.brand)
      }
    }
  })

  it("fills Berlin's orange bars as they are on a light page (thesis, clinic, crayon, bulletin)", () => {
    for (const id of ["thesis", "clinic", "crayon", "bulletin"]) {
      expect(regen(id, ORANGE).file.style.colors.chartPalette[0], id).toBe(ORANGE)
    }
  })

  it("keeps a single-color chart single-colored: swiss's black and grey stay where they were", () => {
    for (const colors of ALL) {
      const palette = regen("swiss", colors).file.style.colors.chartPalette
      expect(palette[0], name(colors)).toBe(regen("swiss", colors).file.style.colors.accent)
      expect(palette[1], name(colors)).toBe("#101010")
      // The grey stays a grey. It moves its lightness only when the brand lands next to it (the deep blue does).
      expect(isChromatic(palette[2]!), `${name(colors)} ${palette[2]}`).toBe(false)
    }
    expect(regen("swiss", RED).file.style.colors.chartPalette[2]).toBe("#5F5F5C")
  })

  it("keeps ink's seal in the chart's seal position, so the faces that leave the seal out still do", () => {
    for (const colors of SINGLE) {
      const { file } = regen("ink", colors)
      expect(file.style.colors.chartPalette.slice(0, 3), colors.brand).toEqual(["#1F1C18", file.style.colors.accent, "#8A8071"])
    }
  })

  it("keeps neighbouring chart series apart", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const own = new Set(source(id).file.style.colors.chartPalette.map((hex) => hex.toUpperCase()))
      for (const colors of ALL) {
        const palette = regen(id, colors).file.style.colors.chartPalette
        for (let i = 1; i < palette.length; i++) {
          // Two inks the theme set side by side itself (ledger's slates) are its own call.
          if (own.has(palette[i - 1]!) && own.has(palette[i]!)) continue
          expect(oklabDistance(palette[i - 1]!, palette[i]!), `${id} ${name(colors)} ${palette.join(" ")}`).toBeGreaterThanOrEqual(0.09)
        }
      }
    }
  })

  it("keeps every chart color it derived readable on lecture's blackboard", () => {
    for (const colors of ALL) {
      const { file, placement } = regen("lecture", colors)
      const asked = new Set([placement.brand.chart, placement.second?.chart].filter((hex): hex is string => hex !== undefined))
      for (const color of file.style.colors.chartPalette) {
        if (asked.has(color)) continue
        expect(contrastRatio(color, file.style.colors.bg), `${name(colors)} ${color}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it("never puts a blue beside an orange unless the company paired them", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const colors of SINGLE) {
        const palette = regen(id, colors).file.style.colors.chartPalette
        expect(paletteBreaksTaboo(palette), `${id} ${colors.brand}: ${palette.join(" ")}`).toBe(false)
      }
    }
  })
})

describe("rule D: a face the pages rework must still look like the brand", () => {
  it("keeps homeroom's blackboard blue-grey and puts Berlin's orange in the accent, as the board would turn it brown", () => {
    const { file, placement } = regen("homeroom", ORANGE)
    expect(file.style.colors.primary).toBe(source("homeroom").file.style.colors.primary)
    expect(file.style.colors.accent).toBe(ORANGE)
    expect(placement.brand.passedOver).toMatchObject({ slot: "primary", why: "repainted" })
    expect((placement.brand.passedOver as { distance: number }).distance).toBeGreaterThan(0.1)
  })

  it("lets a brand the board only darkens a little take homeroom's primary", () => {
    for (const brand of [BLUE, RED, GREEN]) {
      const { file, placement } = regen("homeroom", brand)
      expect(file.style.colors.primary, brand).toBe(brand)
      expect(placement.brand.passedOver, brand).toBeUndefined()
    }
  })
})

describe("rule A: a derived shade keeps the brand's color name", () => {
  /** Colors the repaint derived (not the brand, the second color, or the theme's own) whose name is not the brand's or the second's. */
  function renamed(id: string, colors: BrandColors): string[] {
    const { file, placement } = regen(id, colors)
    const kept = keptOwn(source(id).file, file)
    const asked = [placement.brand, ...(placement.second ? [placement.second] : [])]
    const given = new Set(asked.flatMap((p) => [p.color, p.written, p.chart]).filter((hex): hex is string => hex !== null).map((hex) => hex.toUpperCase()))
    const names = new Set(asked.map((p) => colorName(p.color)))
    return written(file).filter((hex) => {
      const key = hex.toUpperCase()
      if (kept.has(key) || given.has(key) || colorName(hex) === "neutral") return false
      return !names.has(colorName(hex))
    })
  }

  it("turns no red pink, no orange peach or brown, on any theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const colors of ALL) expect(renamed(id, colors), `${id} ${name(colors)}`).toEqual([])
    }
  })

  it("gives brief's accent rule one of brief's greys rather than a pink under a red brand", () => {
    const { file } = regen("brief", RED)
    expect(colorName(file.style.colors.accent)).toBe("neutral")
    expect(source("brief").file.style.colors.chartPalette.map((hex) => hex.toUpperCase())).toContain(file.style.colors.accent.toUpperCase())
  })

  it("draws no pink series on rally's and stage's dark pages under a red brand", () => {
    for (const id of ["rally", "stage", "ember", "terminal", "bulletin"]) {
      const palette = regen(id, RED).file.style.colors.chartPalette
      expect(palette.filter((hex) => colorName(hex) === "pink"), `${id} ${palette.join(" ")}`).toEqual([])
    }
  })
})

describe("the company's second color", () => {
  it("takes brief's second slot and the chart's second series", () => {
    const { file, placement } = regen("brief", OFFICE)
    expect(file.style.colors.primary).toBe(BLUE)
    expect(file.style.colors.accent).toBe("#E97132")
    expect(file.style.colors.chartPalette[0]).toBe(BLUE)
    expect(file.style.colors.chartPalette[1]).toBe(placement.second!.chart)
    expect(placement.second!.chart).toBe("#E97132")
  })

  it("is the chart's second series only when the theme has no second colored slot (terminal)", () => {
    const { file, placement } = regen("terminal", OFFICE)
    expect(placement.second).toMatchObject({ slot: null, noSlot: "neutral", chart: "#E97132" })
    expect(file.style.colors.primary).toBe(source("terminal").file.style.colors.primary)
    expect(file.style.colors.chartPalette[1]).toBe("#E97132")
  })

  it("stays out of a chart drawn as one color among inks (swiss, ink, journal, memo, ledger, luxe, runway, stage)", () => {
    for (const id of CANONICAL_THEME_IDS) {
      if (!isSingleColorPalette(source(id).file.style.colors.chartPalette.map((hex) => hex.toUpperCase()))) continue
      const { file, placement } = regen(id, OFFICE)
      expect(placement.second!.chart, id).toBeNull()
      const vivid = file.style.colors.chartPalette.filter((hex) => hexToOklch(hex).C >= 0.08)
      expect(vivid.every((hex) => hueDistance(hexToOklch(hex).h, hexToOklch(BLUE).h) <= 30), `${id} ${file.style.colors.chartPalette.join(" ")}`).toBe(true)
    }
  })

  it("keeps journal's chart black and blue under the blue and orange pair", () => {
    const palette = regen("journal", OFFICE).file.style.colors.chartPalette
    expect(palette.slice(0, 2)).toEqual(["#2C2C2A", BLUE])
    expect(palette.some((hex) => colorName(hex) === "orange")).toBe(false)
  })

  it("is read from --brand as a second hex after a comma", () => {
    expect(parseBrandOption("#156082,#e97132")).toEqual(OFFICE)
    expect(parseBrandOption(" #C8102E ")).toEqual({ brand: RED })
    expect(() => parseBrandOption("#156082,#E97132,#000000")).toThrow(/at most two colors/)
    expect(() => parseBrandOption("blue")).toThrow(/hex color/)
  })
})

describe("the theme keeps its own ground, text, and surface", () => {
  const KEPT = ["bg", "surface", "text", "muted", "panel", "border", "cardStroke", "danger", "warning", "success"] as const
  for (const id of CANONICAL_THEME_IDS) {
    it(`${id}: every brand keeps the ground tokens, fonts, and menu`, () => {
      const src = source(id).file
      for (const colors of ALL) {
        const { file } = regen(id, colors)
        for (const token of KEPT) expect(file.style.colors[token], `${name(colors)} ${token}`).toBe(src.style.colors[token])
        expect(file.style.fonts).toEqual(src.style.fonts)
        expect(file.menu).toEqual(src.menu)
        for (const type of ["cover", "chapter", "content", "ending"] as const) {
          const before = src.style.defaultBackgrounds[type]
          const after = file.style.defaultBackgrounds[type]
          if (before.kind === "color" && before.value === src.style.colors.primary) {
            expect(after, `${name(colors)} ${type}`).toEqual({ ...before, value: file.style.colors.primary })
          } else if (before.kind === "color" && before.value === src.style.colors.accent) {
            expect(after, `${name(colors)} ${type}`).toEqual({ ...before, value: file.style.colors.accent })
          } else {
            expect(after, `${name(colors)} ${type}`).toEqual(before)
          }
        }
      }
    })
  }

  it("keeps ink's rice paper", () => {
    for (const colors of ALL) {
      const { file } = regen("ink", colors)
      expect(file.style.colors.bg).toBe("#F7F2E7")
      expect(file.style.defaultBackgrounds.cover).toEqual({ kind: "color", value: "#F7F2E7" })
    }
  })

  it("writes a marked run's ink that reads as body text", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const colors of ALL) {
        const { file } = regen(id, colors)
        const ink = file.style.colors.emphasisInk
        if (ink === undefined || ink === source(id).file.style.colors.emphasisInk) continue
        expect(contrastRatio(ink, file.style.colors.bg), `${id} ${name(colors)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})

describe("the contrast floor stays a hard gate", () => {
  it("every built-in theme, repainted in each test brand, compiles", () => {
    for (const id of CANONICAL_THEME_IDS) {
      for (const colors of ALL) expect(() => compileThemeDefinition(regen(id, colors).file), `${id} ${name(colors)}`).not.toThrow()
    }
  })

  it("refuses a source whose own text fails the floor", () => {
    const { file, face } = source("brief")
    const broken = structuredClone(file)
    broken.style.colors.text = "#E8E8E8"
    expect(() => regenerateFromBrand(broken, { brand: RED }, { id: "broken" }, face)).toThrow(/contrast ratio/)
  })
})
