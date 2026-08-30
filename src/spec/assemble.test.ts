import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { PptwiseError } from "../errors"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import { assembleDeck, disassembleDeck, type PageContent } from "./assemble"

const TEST_THEME_ID = "spec-assemble-tests"

beforeAll(() => {
  registerTheme({
    version: 2,
    id: TEST_THEME_ID,
    style: {
      ...CONSULTING_TOKENS,
      id: TEST_THEME_ID,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: { points: { face: "two-column" } },
      ending: { face: "poster-ending" },
    },
  })
})

afterAll(() => {
  __resetRegisteredThemes()
})

function spec(extra: Record<string, unknown> = {}): unknown {
  return {
    version: "1",
    narrative: { pacing: "spacious" },
    theme: TEST_THEME_ID,
    filename: "assembled.pptx",
    pages: [
      { id: "cover", type: "cover", heading: "Cover", summary: "Summary" },
      { id: "body-a", type: "content", kind: "points", heading: "Body A" },
      { id: "body-b", type: "content", kind: "points", heading: "Body B" },
      { id: "ending", type: "ending", heading: "Ending" },
    ],
    ...extra,
  }
}

describe("assembleDeck", () => {
  it("routes invalid specs through the spec validator", () => {
    expect(() => assembleDeck({ pages: [] }, {})).toThrow(PptwiseError)
    expect(() => assembleDeck({ pages: [] }, {})).toThrow(/invalid spec.*no pages/s)
  })

  it.each(["type", "kind", "heading"])("protects spec-owned field %s", (field) => {
    const pages = { "body-a": { [field]: "override" } } as unknown as Record<string, PageContent>
    expect(() => assembleDeck(spec(), pages)).toThrow(new RegExp(`"${field}" is locked by the spec`))
  })

  it("rejects malformed and orphan page records", () => {
    expect(() => assembleDeck(spec(), { "body-a": null } as unknown as Record<string, PageContent>)).toThrow(
      /page content must be an object/,
    )
    expect(() => assembleDeck(spec(), { orphan: {} })).toThrow(/orphan page id "orphan"/)
  })

  it("creates placeholders with the spec-owned content kind", () => {
    const { ir } = assembleDeck(spec(), {})
    expect(ir.slides.find((slide) => slide.id === "body-a")).toMatchObject({
      type: "content",
      kind: "points",
      heading: "Body A",
      placeholder: true,
    })
    expect(ir.slides[0]).toMatchObject({
      subheading: "Summary",
      placeholder: true,
    })
  })

  it("merges fillable page content without leaking content-page summary", () => {
    const { ir } = assembleDeck(spec(), {
      cover: {},
      "body-a": {
        components: [{ type: "paragraph", text: "Evidence" }],
        footnote: "Source",
        notes: "Speaker note",
      },
    })
    expect(ir.slides[0]?.subheading).toBe("Summary")
    expect(ir.slides[1]).toMatchObject({
      id: "body-a",
      type: "content",
      kind: "points",
      heading: "Body A",
      footnote: "Source",
      notes: "Speaker note",
      components: [{ type: "paragraph", text: "Evidence" }],
    })
    expect(ir.slides[1]?.subheading).toBeUndefined()
  })

  it("applies IR component defaults at the final parse boundary", () => {
    const pages = {
      "body-a": { components: [{ type: "image", asset_id: "hero" }] },
    } as unknown as Record<string, PageContent>
    const { ir } = assembleDeck(spec(), pages)
    expect(ir.slides[1]?.components).toEqual([{ type: "image", asset_id: "hero", fit: "cover" }])
  })

  it("passes through top-level narrative, theme, brand, and branding", () => {
    const { ir } = assembleDeck(
      spec({
        brand: { logo_asset_id: "logo", position: "tl" },
        branding: "minimal",
      }),
      {},
    )
    expect(ir.version).toBe("5")
    expect(ir.narrative).toEqual({ pacing: "spacious" })
    expect(ir.theme).toEqual({ id: TEST_THEME_ID })
    expect(ir.brand).toEqual({ logo_asset_id: "logo", position: "tl" })
    expect(ir.branding).toBe("minimal")
  })

  it("never materializes selection state", () => {
    const result = assembleDeck(spec(), {}) as unknown as Record<string, unknown>
    expect(result).toEqual({ ir: expect.any(Object) })
    for (const slide of (result.ir as { slides: Array<Record<string, unknown>> }).slides) {
      expect(slide).not.toHaveProperty("layout")
      expect(slide).not.toHaveProperty("beat")
    }
    expect(result.ir).not.toHaveProperty("seed")
    expect(result).not.toHaveProperty("generatedSeed")
    expect(result).not.toHaveProperty("materializedLayoutCount")
  })

  it("is deterministic without generated selection fields", () => {
    const pages: Record<string, PageContent> = {
      "body-a": { components: [{ type: "paragraph", text: "Evidence" }] },
    }
    expect(assembleDeck(spec(), pages)).toEqual(assembleDeck(spec(), pages))
  })
})

describe("disassembleDeck", () => {
  it("round-trips content kind and representable page content", () => {
    const original = assembleDeck(spec(), {
      "body-a": { components: [{ type: "paragraph", text: "Evidence" }] },
    }).ir
    const project = disassembleDeck(original)

    expect(project.spec.pages[1]).toMatchObject({
      type: "content",
      kind: "points",
    })
    expect(project.pages["body-a"]?.components).toEqual([{ type: "paragraph", text: "Evidence" }])
    expect(assembleDeck(project.spec, project.pages).ir).toEqual(original)
  })

  it("synthesizes stable ids and headings for bare slides", () => {
    const original = assembleDeck(spec(), {}).ir
    const bare = {
      ...original,
      slides: [{ ...original.slides[1], id: undefined, heading: undefined }],
    }
    const project = disassembleDeck(bare)
    expect(project.spec.pages[0]).toMatchObject({
      id: "p-1-content",
      type: "content",
      kind: "points",
      heading: "Untitled",
    })
  })
})
