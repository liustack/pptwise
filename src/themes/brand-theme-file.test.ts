import { afterEach, describe, expect, it } from "vitest"
import { __resetRegisteredThemes, getInstalledThemeIds, getThemeDefinition } from "./definitions"
import { buildThmxBytes, PATHOLOGICAL_THMX_COLORS } from "./extract/__fixtures__/thmx"
import { extractBrandTheme, type BrandThemeFile } from "./extract/brand-extract"
import { parseBrandThemeFile, registerBrandThemeFile } from "./brand-theme-file"
import type { ThemeFile } from "./schema"

afterEach(() => {
  __resetRegisteredThemes()
})

async function extractFixtureTheme(id = "acme"): Promise<BrandThemeFile> {
  const bytes = await buildThmxBytes({ schemeName: "Acme" })
  return extractBrandTheme(bytes, { id })
}

describe("parseBrandThemeFile", () => {
  it("round-trips extractBrandTheme's own output (schema and interface stay in sync)", async () => {
    const theme = await extractFixtureTheme()
    const parsed = parseBrandThemeFile(JSON.parse(JSON.stringify(theme)), "acme.theme.json")
    expect(parsed).toEqual(theme)
  })

  it("rejects a malformed file with the path and field in the message", () => {
    expect(() => parseBrandThemeFile({ id: "x", style: { colors: {} } }, "bad.theme.json")).toThrow(
      /invalid theme file bad\.theme\.json/,
    )
  })

  it("rejects a non-hex color value", async () => {
    const theme = JSON.parse(JSON.stringify(await extractFixtureTheme())) as Record<string, unknown>
    ;(theme.style as { colors: Record<string, unknown> }).colors.text = "red"
    expect(() => parseBrandThemeFile(theme, "bad.theme.json")).toThrow(/expected #RGB/)
  })

  it("hard-rejects every retired v1 shape by naming the current format, with no migration offer", async () => {
    const current = await extractFixtureTheme()
    for (const retired of [{ version: 1 }, { base: "consulting" }, { faces: { cover: ["poster-center"] } }]) {
      expect(() => parseBrandThemeFile({ ...current, ...retired }, "legacy.theme.json")).toThrow(
        /current theme format is version 2.*self-contained.*No migration tool is provided/is,
      )
    }
  })
})

describe("registerBrandThemeFile", () => {
  it("registers an extracted file as its own self-contained theme, inheriting nothing", async () => {
    const theme = await extractFixtureTheme()
    const id = registerBrandThemeFile(theme)
    expect(id).toBe("acme")
    expect(getInstalledThemeIds()).toContain("acme")

    const def = getThemeDefinition("acme")
    expect(def.style.colors.text).toBe(theme.style.colors.text)
    // Its own id everywhere: no donor theme lends its structural tables, and
    // the engine-only board knobs never reach a public file.
    expect(def.style.id).toBe("acme")
    expect(def.style.shape?.cover).toBeUndefined()
    expect(def.menu).toEqual(theme.menu)
    expect(def.motif).toBeUndefined()
    const consulting = getThemeDefinition("consulting")
    expect(def.layouts).not.toEqual(consulting.layouts)
  })

  it("loads a complete v2 menu, deriving the transitional layout record from it", async () => {
    const extracted = await extractFixtureTheme("acme-complete")
    const file = parseBrandThemeFile(
      {
        version: 2,
        id: "acme-complete",
        style: extracted.style,
        menu: {
          cover: { face: "gauge-verdict" },
          chapter: { face: "gauge-section" },
          content: {
            data: { face: "gauge-stats", decor: { kind: "silent" } },
            photo: { face: "image-split" },
          },
          ending: { face: "gauge-next" },
        },
      },
      "complete.theme.json",
    )

    registerBrandThemeFile(file)
    const def = getThemeDefinition("acme-complete")
    expect(def.menu).toEqual(file.menu)
    // The takeover face a menu may legitimately name stays out of the
    // archetype-only pool the pre-S1-A selector samples.
    expect(def.layouts).toEqual({
      cover: ["gauge-verdict"],
      chapter: ["gauge-section"],
      content: ["gauge-stats"],
      ending: ["gauge-next"],
    })
    expect(def.menu.content.data?.decor).toEqual({ kind: "silent" })
  })

  it("rejects an unknown menu face at the registry gate", async () => {
    const extracted = await extractFixtureTheme("acme-unknown-face")
    const file = parseBrandThemeFile(
      {
        version: 2,
        id: "acme-unknown-face",
        style: extracted.style,
        menu: {
          cover: { face: "not-a-layout" },
          chapter: { face: "gauge-section" },
          content: { data: { face: "gauge-stats" } },
          ending: { face: "gauge-next" },
        },
      },
      "unknown-face.theme.json",
    )

    expect(() => registerBrandThemeFile(file)).toThrow(
      /menu\.cover\.face references unknown layout id "not-a-layout"/,
    )
  })

  it("rejects a menu face whose registry entry belongs to another page type", async () => {
    const extracted = await extractFixtureTheme("acme-wrong-face")
    const file = parseBrandThemeFile(
      {
        version: 2,
        id: "acme-wrong-face",
        style: extracted.style,
        menu: {
          cover: { face: "two-column" },
          chapter: { face: "gauge-section" },
          content: { data: { face: "gauge-stats" } },
          ending: { face: "gauge-next" },
        },
      },
      "wrong-face.theme.json",
    )

    expect(() => registerBrandThemeFile(file)).toThrow(
      /menu\.cover\.face layout "two-column" is not valid for "cover" slides/,
    )
  })

  it("shadows a builtin id so getThemeDefinition reads the file", async () => {
    const theme = await extractFixtureTheme("consulting")
    expect(registerBrandThemeFile(theme)).toBe("consulting")
    const def = getThemeDefinition("consulting")
    expect(def.style.colors.primary).toBe(theme.style.colors.primary)
    expect(def.menu).toEqual(theme.menu)
    expect(getInstalledThemeIds().filter((id) => id === "consulting")).toHaveLength(1)
  })

  it("is idempotent for the same already-registered id (serve rebuild loop)", async () => {
    const theme = await extractFixtureTheme()
    registerBrandThemeFile(theme)
    expect(() => registerBrandThemeFile(theme)).not.toThrow()
    expect(getInstalledThemeIds().filter((id) => id === "acme")).toHaveLength(1)
  })

  it("contrast floor blocks a pathological palette with an actionable message", async () => {
    const bytes = await buildThmxBytes({ colors: PATHOLOGICAL_THMX_COLORS })
    const theme = await extractBrandTheme(bytes, { id: "gray-soup", unchecked: true })
    // The message names the token, the measured ratio, the background, and
    // the floor — error quality is part of this wave's acceptance.
    expect(() => registerBrandThemeFile(theme)).toThrow(
      /theme "gray-soup" colors\.(text|muted) has a contrast ratio of \d+\.\d+:1 against its "(cover|content|ending)" background \(#[0-9A-Fa-f]{6}\) — must be at least 3\.0:1/,
    )
    expect(getInstalledThemeIds()).not.toContain("gray-soup")
  })

  it("applies the same contrast floor to a complete theme", async () => {
    const bytes = await buildThmxBytes({ colors: PATHOLOGICAL_THMX_COLORS })
    const extracted = await extractBrandTheme(bytes, { id: "gray-complete", unchecked: true })
    const file: ThemeFile = {
      version: 2,
      id: "gray-complete",
      style: extracted.style,
      menu: {
        cover: { face: "gauge-verdict" },
        chapter: { face: "gauge-section" },
        content: { data: { face: "gauge-stats" } },
        ending: { face: "gauge-next" },
      },
    }

    expect(() => registerBrandThemeFile(file)).toThrow(/theme "gray-complete" colors\.(text|muted).*at least 3\.0:1/)
    expect(getInstalledThemeIds()).not.toContain("gray-complete")
  })
})
