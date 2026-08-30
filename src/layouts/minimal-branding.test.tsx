// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { FOOTER_DIVIDER_Y } from "../render/branding-geometry"
import { parseSvgRoot } from "../render/serialize"

const LOGO_SRC =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="

const slide: Slide = {
  type: "content",
  kind: "points",
  heading: "Menu-owned brand posture",
  components: [{ type: "paragraph", text: "Body" }],
}

afterEach(() => {
  __resetRegisteredThemes()
})

function installTheme(id: string, extra?: Partial<{ brand: "none" }>): void {
  registerTheme({
    version: 2,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content: {
        points: { face: "two-column", ...(extra ?? {}) },
        statement: { face: "statement" },
      },
      ending: { face: "poster-ending" },
    },
  })
}

function deck(themeId: string, branding: PptxIR["branding"]): PptxIR {
  return {
    version: "5",
    filename: "menu-branding.pptx",
    theme: { id: themeId },
    branding,
    meta: { organization: "ACME" },
    brand: { logo_asset_id: "logo", position: "br" },
    assets: { images: { logo: { src: LOGO_SRC, alt: "logo" } } },
    slides: [slide],
  }
}

describe("menu-owned page branding posture", () => {
  it("keeps full deck branding on an ordinary menu entry", () => {
    installTheme("menu-branding-ordinary")
    const markup = renderSlideSvg(deck("menu-branding-ordinary", "full"), 0)
    const root = parseSvgRoot(markup)

    expect(markup).toContain("ACME")
    expect(root.querySelector(`line[y1="${FOOTER_DIVIDER_Y}"]`)).not.toBeNull()
    expect(root.querySelector("image")).not.toBeNull()
  })

  it("silences branding through the menu entry's own brand switch", () => {
    installTheme("menu-branding-silent", { brand: "none" })
    const markup = renderSlideSvg(deck("menu-branding-silent", "full"), 0)
    const root = parseSvgRoot(markup)

    expect(markup).not.toContain("ACME")
    expect(root.querySelector(`line[y1="${FOOTER_DIVIDER_Y}"]`)).toBeNull()
    expect(root.querySelector("image")).toBeNull()
  })

  it("keeps a structurally frameless face unbranded even under full", () => {
    installTheme("menu-branding-frameless")
    const ir = deck("menu-branding-frameless", "full")
    ir.slides = [{ type: "content", kind: "statement", heading: "Menu-owned brand posture", components: [] }]
    const markup = renderSlideSvg(ir, 0)
    expect(markup).not.toContain("ACME")
  })

  it("leaves the deck-level minimal posture unchanged", () => {
    installTheme("menu-branding-minimal")
    const markup = renderSlideSvg(deck("menu-branding-minimal", "minimal"), 0)
    const root = parseSvgRoot(markup)

    expect(markup).not.toContain("ACME")
    expect(root.querySelector(`line[y1="${FOOTER_DIVIDER_Y}"]`)).toBeNull()
    expect(root.querySelector("image")).not.toBeNull()
  })

  it("silences document metadata painted inside a cover face", () => {
    const id = "menu-branding-cover-silent"
    registerTheme({
      version: 2,
      id,
      style: {
        ...CONSULTING_TOKENS,
        id,
        shape: { radius: 2, gapScale: 1, typeScale: 1 },
      },
      menu: {
        cover: { face: "split-diagonal", brand: "none" },
        chapter: { face: "masthead-chapter" },
        content: { points: { face: "two-column" } },
        ending: { face: "poster-ending" },
      },
    })
    const cover: Slide = { type: "cover", heading: "Silent cover", components: [] }
    const ir: PptxIR = {
      ...deck(id, "full"),
      meta: {
        organization: "ACME",
        confidentiality: "internal",
        version: "v1",
        date: "2026-08-31",
      },
      slides: [cover],
    }

    const markup = renderSlideSvg(ir, 0)
    expect(markup).not.toContain("ACME")
    expect(markup).not.toContain("Internal")
    expect(markup).not.toContain("v1")
    expect(markup).not.toContain("2026-08-31")
  })

  it("silences every metadata field even when the selected face reads IR meta directly", () => {
    const id = "menu-branding-direct-meta-silent"
    registerTheme({
      version: 2,
      id,
      style: {
        ...CONSULTING_TOKENS,
        id,
        shape: { radius: 2, gapScale: 1, typeScale: 1 },
      },
      menu: {
        cover: { face: "poster-center", brand: "none" },
        chapter: { face: "masthead-chapter" },
        content: { points: { face: "two-column" } },
        ending: { face: "poster-ending" },
      },
    })
    const cover: Slide = { type: "cover", heading: "Direct metadata cover", components: [] }
    const ir: PptxIR = {
      ...deck(id, "full"),
      meta: {
        organization: "ACME",
        confidentiality: "internal",
        version: "v1",
        date: "2026-08-31",
        authors: [{ name: "Ada", role: "Author" }],
      },
      slides: [cover],
    }

    const markup = renderSlideSvg(ir, 0)
    expect(markup).toContain("Direct metadata")
    for (const value of ["ACME", "Internal", "v1", "2026-08-31", "Ada", "Author"]) {
      expect(markup).not.toContain(value)
    }
  })

  it("silences metadata when an asset background hands the cover to image-cover", () => {
    const id = "menu-branding-image-cover-silent"
    registerTheme({
      version: 2,
      id,
      style: {
        ...CONSULTING_TOKENS,
        id,
        shape: { radius: 2, gapScale: 1, typeScale: 1 },
      },
      menu: {
        cover: { face: "split-diagonal", brand: "none" },
        chapter: { face: "masthead-chapter" },
        content: { points: { face: "two-column" } },
        ending: { face: "poster-ending" },
      },
    })
    const cover: Slide = {
      type: "cover",
      heading: "Silent image cover",
      background: { kind: "asset", asset_id: "hero" },
      components: [],
    }
    const ir: PptxIR = {
      ...deck(id, "full"),
      meta: { organization: "ACME", date: "2026-08-31" },
      assets: {
        images: {
          logo: { src: LOGO_SRC, alt: "logo" },
          hero: { src: LOGO_SRC, alt: "hero" },
        },
      },
      slides: [cover],
    }

    const markup = renderSlideSvg(ir, 0)
    expect(markup).toContain("Silent image cover")
    expect(markup).not.toContain("ACME")
    expect(markup).not.toContain("2026-08-31")
  })
})
