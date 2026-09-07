import JSZip from "jszip"
import { describe, expect, it } from "vitest"
import { generatePptx, renderSlideSvg, validateIr } from "./api"
import { auditDeck } from "./audit/deck-audit"
import { makeSolidRegionPngDataUri } from "./platform/test-png-fixture"
import { buildAssetBrief } from "./render/asset-brief"
import { THEME_DEFINITIONS, getThemeDefinition, type ThemeDefinition } from "./themes/definitions"

/**
 * A theme definition travels with the call that uses it. Two callers in one
 * process may each hold a definition under the same id with different
 * colors, and neither sees the other's, because nothing along the render
 * chain looks the id up in a shared mutable table.
 */

const PRIMARY_A = "#0A3D91"
const PRIMARY_B = "#8B1A1A"
const BG_A = "#F0F4FF"
const BG_B = "#FFF3F0"

function recolored(primary: string, bg: string): ThemeDefinition {
  const base = THEME_DEFINITIONS.brief
  return {
    ...base,
    style: {
      ...base.style,
      colors: { ...base.style.colors, primary, bg },
      defaultBackgrounds: {
        cover: { kind: "color", value: bg },
        chapter: { kind: "color", value: bg },
        content: { kind: "color", value: bg },
        ending: { kind: "color", value: bg },
      },
    },
  }
}

const THEME_A = recolored(PRIMARY_A, BG_A)
const THEME_B = recolored(PRIMARY_B, BG_B)

const raw = {
  version: "5",
  filename: "theme-by-value",
  theme: { id: "brief" },
  slides: [
    { type: "cover", heading: "Theme by value" },
    {
      type: "content",
      kind: "points",
      heading: "Points",
      components: [{ type: "bullets", items: ["alpha", "beta"] }],
    },
  ],
}

async function slideXml(bytes: Uint8Array, part: string): Promise<string> {
  const zip = await JSZip.loadAsync(bytes)
  return zip.file(part)!.async("string")
}

function hex(color: string): string {
  return color.slice(1).toUpperCase()
}

describe("theme definitions passed by value", () => {
  it("two same-id themes exported concurrently each keep their own colors", async () => {
    const soloA = await generatePptx(raw, { theme: THEME_A })
    const soloB = await generatePptx(raw, { theme: THEME_B })

    const [a, b] = await Promise.all([
      generatePptx(raw, { theme: THEME_A }),
      generatePptx(raw, { theme: THEME_B }),
    ])

    expect(Buffer.from(a).equals(Buffer.from(soloA))).toBe(true)
    expect(Buffer.from(b).equals(Buffer.from(soloB))).toBe(true)
    expect(Buffer.from(a).equals(Buffer.from(b))).toBe(false)

    const coverA = await slideXml(a, "ppt/slides/slide1.xml")
    const coverB = await slideXml(b, "ppt/slides/slide1.xml")
    expect(coverA).toContain(hex(BG_A))
    expect(coverA).not.toContain(hex(BG_B))
    expect(coverB).toContain(hex(BG_B))
    expect(coverB).not.toContain(hex(BG_A))
  })

  it("renderSlideSvg paints the supplied definition, not the built-in under the same id", () => {
    const v = validateIr(raw, { theme: THEME_A })
    expect(v.ok).toBe(true)
    const svg = renderSlideSvg(v.ir!, 0, { theme: THEME_A })
    expect(svg).toContain(`fill="${BG_A}"`)
    expect(svg).not.toContain(`fill="${THEME_DEFINITIONS.brief.style.colors.bg}"`)
  })

  it("leaves the built-in table untouched after a by-value render", async () => {
    await generatePptx(raw, { theme: THEME_A })
    expect(getThemeDefinition("brief").style.colors.primary).toBe(THEME_DEFINITIONS.brief.style.colors.primary)
    expect(THEME_DEFINITIONS.brief.style.colors.bg).not.toBe(BG_A)
  })

  it("validateIr refuses a definition whose id disagrees with the IR binding", () => {
    const v = validateIr({ ...raw, theme: { id: "swiss" } }, { theme: THEME_A })
    expect(v.ok).toBe(false)
    expect(v.errors[0]!.path).toBe("theme.id")
    expect(v.errors[0]!.message).toMatch(/"swiss".*"brief"/)
  })

  it("asset brief and audit read the supplied definition", () => {
    const withImage = {
      ...raw,
      assets: { images: { pic: { src: makeSolidRegionPngDataUri(2, 2, () => [10, 20, 30]) } } },
      slides: [
        ...raw.slides,
        {
          type: "content",
          kind: "photo",
          heading: "Photo",
          components: [{ type: "image", asset_id: "pic" }],
        },
      ],
    }
    const v = validateIr(withImage, { theme: THEME_A })
    expect(v.ok).toBe(true)
    const brief = buildAssetBrief(v.ir!, { theme: THEME_A })
    expect(brief.items[0]!.palette.primary).toBe(PRIMARY_A)
    const report = auditDeck(v.ir!, { theme: THEME_A })
    expect(report.pagesAudited).toBe(3)
  })
})
