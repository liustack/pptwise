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

  it("rejects retired v1 fields through the ordinary v2 schema, naming the current format", async () => {
    const current = await extractFixtureTheme()
    for (const retired of [{ version: 1 }, { base: "consulting" }, { faces: { cover: ["poster-center"] } }]) {
      expect(() => parseBrandThemeFile({ ...current, ...retired }, "legacy.theme.json")).toThrow(
        /current theme format is version 2.*self-contained/is,
      )
      expect(() => parseBrandThemeFile({ ...current, ...retired }, "legacy.theme.json")).not.toThrow(
        /migrat/i,
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
    expect(def.menu).not.toEqual(consulting.menu)
  })

  it("loads a complete v2 menu", async () => {
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
    expect(def.menu.cover.face).toBe("gauge-verdict")
    expect(def.menu.chapter.face).toBe("gauge-section")
    expect(def.menu.content.data?.face).toBe("gauge-stats")
    expect(def.menu.content.photo?.face).toBe("image-split")
    expect(def.menu.ending.face).toBe("gauge-next")
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

  it("brand extraction rejects a pathological palette before it can be registered", async () => {
    const bytes = await buildThmxBytes({ colors: PATHOLOGICAL_THMX_COLORS })
    await expect(extractBrandTheme(bytes, { id: "gray-soup" })).rejects.toThrow(/cannot derive colors\.muted/)
    expect(getInstalledThemeIds()).not.toContain("gray-soup")
  })

  it("applies the same contrast floor to a complete theme", async () => {
    const extracted = await extractFixtureTheme("gray-complete")
    const style = structuredClone(extracted.style)
    style.colors = {
      ...style.colors,
      bg: "#868686",
      surface: "#888888",
      text: "#808080",
      muted: "#808080",
    }
    style.defaultBackgrounds = {
      cover: { kind: "color", value: "#868686" },
      chapter: { kind: "color", value: "#868686" },
      content: { kind: "color", value: "#868686" },
      ending: { kind: "color", value: "#868686" },
    }
    const file: ThemeFile = {
      version: 2,
      id: "gray-complete",
      style,
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
