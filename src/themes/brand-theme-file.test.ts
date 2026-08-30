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
    expect(() => parseBrandThemeFile(theme, "bad.theme.json")).toThrow(/hex color/)
  })

  it("hard-rejects the legacy BrandThemeFile shape with the v1 migration outline", async () => {
    const current = await extractFixtureTheme()
    const legacy = { id: current.id, label: current.label, style: current.style, brand: {}, tags: [] }
    expect(() => parseBrandThemeFile(legacy, "legacy.theme.json")).toThrow(
      /legacy BrandThemeFile.*version.*base.*faces.*docs\/brand-extraction\.md/i,
    )
  })
})

describe("registerBrandThemeFile", () => {
  it("registers a partial through registerTheme and inherits every structural field from its base", async () => {
    const theme = await extractFixtureTheme()
    const base = getThemeDefinition("consulting")
    const id = registerBrandThemeFile(theme)
    expect(id).toBe("acme")
    expect(getInstalledThemeIds()).toContain("acme")
    const def = getThemeDefinition("acme")
    expect(def.style.colors.text).toBe(theme.style.colors.text)
    // Component forms and sparse boarded faces dispatch through
    // StyleTokens.id. A partial uses its base id there so it inherits those
    // structural tables too, while its public file id remains "acme".
    expect(def.style.id).toBe("consulting")
    expect(Object.prototype.hasOwnProperty.call(theme.style.shape ?? {}, "cover")).toBe(false)
    expect(def.style.shape?.cover).toBe(base.style.shape?.cover)
    expect(def.layouts).toEqual(base.layouts)
    expect(def.motif).toBe(base.motif)
    expect(def.layoutTendencies).toEqual(base.layoutTendencies)
    expect(def.sparseLayouts).toEqual(base.sparseLayouts)
  })

  it("loads a complete theme with curated pin-only faces, parameters, motif, tendencies, and sparse offers", async () => {
    const extracted = await extractFixtureTheme("acme-complete")
    const file = parseBrandThemeFile(
      {
        version: 1,
        id: "acme-complete",
        style: extracted.style,
        faces: {
          cover: ["gauge-verdict"],
          chapter: ["gauge-section"],
          content: [{ id: "gauge-stats", params: { capacity: { slot: "body", max: 3 } } }],
          ending: ["gauge-next"],
        },
        motif: { id: "gauge-motif", params: { intensity: "subtle" } },
        tendencies: {
          cover: ["gauge-verdict"],
          chapter: ["gauge-section"],
          content: ["gauge-stats"],
          ending: ["gauge-next"],
        },
        sparse: ["statement", "verse-chapter"],
      },
      "complete.theme.json",
    )

    registerBrandThemeFile(file)
    const def = getThemeDefinition("acme-complete")
    expect(def.layouts).toEqual({
      cover: ["gauge-verdict"],
      chapter: ["gauge-section"],
      content: ["gauge-stats"],
      ending: ["gauge-next"],
    })
    expect((def as unknown as { faces?: unknown }).faces).toEqual((file as unknown as { faces?: unknown }).faces)
    expect(def.motif).toBe("gauge-motif")
    expect(def.motifParameters).toEqual({ intensity: "subtle" })
    expect(def.layoutTendencies).toEqual((file as unknown as { tendencies?: unknown }).tendencies)
    expect(def.sparseLayouts).toEqual((file as unknown as { sparse?: unknown }).sparse)
  })

  it("rejects an unknown complete face at the registry gate", async () => {
    const extracted = await extractFixtureTheme("acme-unknown-face")
    const file = parseBrandThemeFile(
      {
        version: 1,
        id: "acme-unknown-face",
        style: extracted.style,
        faces: {
          cover: ["not-a-layout"],
          chapter: ["gauge-section"],
          content: ["gauge-stats"],
          ending: ["gauge-next"],
        },
      },
      "unknown-face.theme.json",
    )

    expect(() => registerBrandThemeFile(file)).toThrow(/faces\.cover.*unknown layout id "not-a-layout"/)
  })

  it("rejects a complete face whose registry entry belongs to another page type", async () => {
    const extracted = await extractFixtureTheme("acme-wrong-face")
    const file = parseBrandThemeFile(
      {
        version: 1,
        id: "acme-wrong-face",
        style: extracted.style,
        faces: {
          cover: ["two-column"],
          chapter: ["gauge-section"],
          content: ["gauge-stats"],
          ending: ["gauge-next"],
        },
      },
      "wrong-face.theme.json",
    )

    expect(() => registerBrandThemeFile(file)).toThrow(/faces\.cover.*"two-column".*not valid for "cover"/)
  })

  it("rejects a face capacity adjustment above the registry slot capacity", async () => {
    const extracted = await extractFixtureTheme("acme-capacity")
    const file = parseBrandThemeFile(
      {
        version: 1,
        id: "acme-capacity",
        style: extracted.style,
        faces: {
          cover: ["gauge-verdict"],
          chapter: ["gauge-section"],
          content: [{ id: "two-column", params: { capacity: { slot: "body", max: 5 } } }],
          ending: ["gauge-next"],
        },
      },
      "capacity.theme.json",
    )

    expect(() => registerBrandThemeFile(file)).toThrow(/params\.capacity\.max is 5.*capacity 4/)
  })

  it("refuses to shadow a builtin id, naming the fix", async () => {
    const theme = await extractFixtureTheme("consulting")
    expect(() => registerBrandThemeFile(theme)).toThrow(/collides with a built-in pptwise theme.*--id/)
  })

  it("is idempotent for the same already-registered id (serve rebuild loop)", async () => {
    const theme = await extractFixtureTheme()
    registerBrandThemeFile(theme)
    expect(() => registerBrandThemeFile(theme)).not.toThrow()
    expect(getInstalledThemeIds().filter((id) => id === "acme")).toHaveLength(1)
  })

  it("contrast floor blocks a pathological palette with an actionable message", async () => {
    const bytes = await buildThmxBytes({ colors: PATHOLOGICAL_THMX_COLORS })
    const theme = await extractBrandTheme(bytes, { id: "gray-soup" })
    // The message names the token, the measured ratio, the background, and
    // the floor — error quality is part of this wave's acceptance.
    expect(() => registerBrandThemeFile(theme)).toThrow(
      /theme "gray-soup" colors\.(text|muted) has a contrast ratio of \d+\.\d+:1 against its "(cover|content|ending)" background \(#[0-9A-Fa-f]{6}\) — must be at least 3\.0:1/,
    )
    expect(getInstalledThemeIds()).not.toContain("gray-soup")
  })

  it("applies the same contrast floor to a complete theme", async () => {
    const bytes = await buildThmxBytes({ colors: PATHOLOGICAL_THMX_COLORS })
    const extracted = await extractBrandTheme(bytes, { id: "gray-complete" })
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
