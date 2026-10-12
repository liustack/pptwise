import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { contrastRatio } from "../../render/ink"
import { regenerateFromBrand } from "../brand/brand-regen"
import { themeFileFromPreset } from "../presets"
import { buildThemeXml, buildThmxBytes, BRAND_THMX_COLORS, DEFAULT_THMX_COLORS, PATHOLOGICAL_THMX_COLORS } from "./__fixtures__/thmx"
import { deriveMuted, extractBrandTheme, slugify } from "./brand-extract"

installNodePlatform()

const ACCENT1 = `#${BRAND_THMX_COLORS.accent1}`
const ACCENT2 = `#${BRAND_THMX_COLORS.accent2}`

describe("extractBrandTheme repaints a theme around the template's brand color", () => {
  it("repaints bulletin by default, by the same rules as theme fork --brand", async () => {
    const bytes = await buildThmxBytes({ schemeName: "Acme Corp", colors: BRAND_THMX_COLORS })
    const { file, placement, fontNotes } = await extractBrandTheme(bytes)
    const bulletin = themeFileFromPreset("bulletin", { id: "acme-corp", label: "Acme Corp" })
    const forked = regenerateFromBrand(bulletin, { brand: ACCENT1, second: ACCENT2 }, { id: "acme-corp", label: "Acme Corp" })
    expect(file).toEqual(forked.file)
    expect(placement).toEqual(forked.placement)
    expect(fontNotes).toEqual([])
    expect(file.id).toBe("acme-corp")
    expect(file.label).toBe("Acme Corp")
    expect(file.menu).toEqual(bulletin.menu)
    expect(placement.brand.color).toBe(ACCENT1)
    expect(placement.second?.color).toBe(ACCENT2)
    // The theme keeps its own paper: the template's dk1/lt1/lt2 never reach it.
    expect(file.style.colors.bg).toBe(bulletin.style.colors.bg)
    expect(file.style.colors.text).toBe(bulletin.style.colors.text)
    expect(file.style.colors.surface).toBe(bulletin.style.colors.surface)
  })

  it("repaints the built-in theme named by from", async () => {
    const bytes = await buildThmxBytes({ schemeName: "Acme Corp", colors: BRAND_THMX_COLORS })
    const { file } = await extractBrandTheme(bytes, { id: "acme", label: "Acme", from: "swiss" })
    const swiss = themeFileFromPreset("swiss", { id: "acme", label: "Acme" })
    expect(file).toEqual(regenerateFromBrand(swiss, { brand: ACCENT1, second: ACCENT2 }, { id: "acme", label: "Acme" }).file)
    expect(file.menu).toEqual(swiss.menu)
  })

  it("repaints a theme file passed by value, under the new id and label", async () => {
    const bytes = await buildThmxBytes({ colors: BRAND_THMX_COLORS })
    const own = themeFileFromPreset("thesis", { id: "house-style", label: "House style" })
    const { file } = await extractBrandTheme(bytes, { id: "acme", label: "Acme", from: own })
    expect(file.id).toBe("acme")
    expect(file.style.id).toBe("acme")
    expect(file.label).toBe("Acme")
    expect(file.menu).toEqual(own.menu)
    expect(own.id).toBe("house-style")
  })

  it("says so when the template's brand color has no color in it", async () => {
    const bytes = await buildThmxBytes({ colors: PATHOLOGICAL_THMX_COLORS })
    const { placement } = await extractBrandTheme(bytes, { id: "grey" })
    expect(placement.brand.color).toBe(`#${PATHOLOGICAL_THMX_COLORS.accent1}`)
    expect(placement.brand.neutral).toBe(true)
  })

  it("leaves the second color out when the template's accent2 is a grey", async () => {
    const bytes = await buildThmxBytes({ colors: { ...BRAND_THMX_COLORS, accent2: "A5A5A5" } })
    const { placement } = await extractBrandTheme(bytes, { id: "acme" })
    expect(placement.brand.color).toBe(ACCENT1)
    expect(placement.second).toBeUndefined()
  })

  it("takes dk2 as the brand color when accent1 is absent", async () => {
    const { accent1: _accent1, ...rest } = DEFAULT_THMX_COLORS
    const bytes = await buildThmxBytes({ colors: rest })
    const { placement } = await extractBrandTheme(bytes, { id: "acme" })
    expect(placement.brand.color).toBe(`#${DEFAULT_THMX_COLORS.dk2}`)
  })

  it("reads the real .thmx theme part path and ignores a themeVariants sibling", async () => {
    const bytes = await buildThmxBytes({
      colors: BRAND_THMX_COLORS,
      themePartPath: "theme/theme/theme1.xml",
      extraEntries: {
        "theme/themeVariants/variant1/theme/theme1.xml": buildThemeXml({
          colors: { ...BRAND_THMX_COLORS, accent1: "C00000" },
        }),
      },
    })
    const { placement } = await extractBrandTheme(bytes, { id: "acme" })
    expect(placement.brand.color).toBe(ACCENT1)
  })

  it("is deterministic: the same bytes always give the same theme JSON", async () => {
    const bytes = await buildThmxBytes({ schemeName: "Acme Corp", colors: BRAND_THMX_COLORS })
    const a = await extractBrandTheme(bytes)
    const b = await extractBrandTheme(bytes)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe("extractBrandTheme — fonts", () => {
  it("keeps the theme's own fonts unless brandFonts is on", async () => {
    const bytes = await buildThmxBytes({ colors: BRAND_THMX_COLORS, majorFont: "Georgia", minorFont: "Verdana" })
    const { file } = await extractBrandTheme(bytes, { id: "acme" })
    expect(file.style.fonts).toEqual(themeFileFromPreset("bulletin", { id: "acme" }).style.fonts)
  })

  it("puts the template's Latin fonts first under brandFonts and keeps the theme's East Asian faces", async () => {
    const bytes = await buildThmxBytes({ colors: BRAND_THMX_COLORS, majorFont: "Georgia", minorFont: "Times New Roman" })
    const { file, fontNotes } = await extractBrandTheme(bytes, { id: "acme", brandFonts: true })
    const own = themeFileFromPreset("bulletin", { id: "acme" }).style.fonts
    expect(file.style.fonts.heading[0]).toBe("Georgia")
    expect(file.style.fonts.body[0]).toBe("Times New Roman")
    expect(file.style.fonts.heading.slice(1)).toEqual(own.heading.filter((f) => f !== "Georgia"))
    expect(fontNotes).toEqual([])
  })

  it("says when a template font is not on the safe list", async () => {
    const bytes = await buildThmxBytes({ colors: BRAND_THMX_COLORS, majorFont: "Acme Grotesk", minorFont: "Georgia" })
    const { fontNotes } = await extractBrandTheme(bytes, { id: "acme", brandFonts: true })
    expect(fontNotes).toHaveLength(1)
    expect(fontNotes[0]).toMatch(/^warning: heading font "Acme Grotesk" is not on the safe font list/)
  })

  it("says when the template names no font for a role", async () => {
    const bytes = await buildThmxBytes({ colors: BRAND_THMX_COLORS, majorFont: undefined, minorFont: undefined })
    const { file, fontNotes } = await extractBrandTheme(bytes, { id: "acme", brandFonts: true })
    expect(file.style.fonts).toEqual(themeFileFromPreset("bulletin", { id: "acme" }).style.fonts)
    expect(fontNotes).toEqual([
      "fonts: the template names no heading font, so heading text keeps the theme's own",
      "fonts: the template names no body font, so body text keeps the theme's own",
    ])
  })
})

describe("extractBrandTheme — structural failures", () => {
  it("throws when the package has no theme part at all", async () => {
    const JSZip = (await import("jszip")).default
    const zip = new JSZip()
    zip.file("some/other/part.xml", "<x/>")
    const bytes = await zip.generateAsync({ type: "uint8array" })
    await expect(extractBrandTheme(bytes)).rejects.toThrow(/no theme part found/)
  })

  it("throws when there are no accent colors at all", async () => {
    const bytes = await buildThmxBytes({ colors: { dk1: DEFAULT_THMX_COLORS.dk1, lt1: DEFAULT_THMX_COLORS.lt1 } })
    await expect(extractBrandTheme(bytes)).rejects.toThrow(/no accent colors/)
  })

  it("throws when the theme does not exist", async () => {
    const bytes = await buildThmxBytes({ colors: BRAND_THMX_COLORS })
    await expect(extractBrandTheme(bytes, { id: "acme", from: "no-such-theme" })).rejects.toThrow(/no-such-theme/)
  })
})

describe("deriveMuted", () => {
  it("clears 4.5:1 against both bg and surface for a normal light palette", () => {
    const muted = deriveMuted(`#${DEFAULT_THMX_COLORS.dk1}`, `#${DEFAULT_THMX_COLORS.lt1}`, `#${DEFAULT_THMX_COLORS.lt2}`)
    expect(contrastRatio(muted, `#${DEFAULT_THMX_COLORS.lt1}`)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(muted, `#${DEFAULT_THMX_COLORS.lt2}`)).toBeGreaterThanOrEqual(4.5)
  })

  it("throws when no muted candidate clears both background anchors", () => {
    expect(() =>
      deriveMuted(
        `#${PATHOLOGICAL_THMX_COLORS.dk1}`,
        `#${PATHOLOGICAL_THMX_COLORS.lt1}`,
        `#${PATHOLOGICAL_THMX_COLORS.lt2}`,
      ),
    ).toThrow(/cannot derive colors\.muted.*4\.5:1.*colors\.bg.*colors\.surface/)
  })

  it("is deterministic across repeated calls", () => {
    const a = deriveMuted("#222222", "#F0F0F0", "#E5E5E5")
    const b = deriveMuted("#222222", "#F0F0F0", "#E5E5E5")
    expect(a).toBe(b)
  })
})

describe("slugify", () => {
  it("lower-cases and hyphenates non-alphanumeric runs", () => {
    expect(slugify("Acme Corp!!")).toBe("acme-corp")
    expect(slugify("  Über Brand  ")).toBe("ber-brand")
  })

  it("falls back to 'brand' for an empty/non-alphanumeric input", () => {
    expect(slugify("")).toBe("brand")
    expect(slugify("***")).toBe("brand")
  })

  it("uses the caller-supplied fallback (workspace deck names want 'deck')", () => {
    expect(slugify("季度回顾", "deck")).toBe("deck")
    expect(slugify("***", "deck")).toBe("deck")
  })
})
