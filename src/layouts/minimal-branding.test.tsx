// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import type { MenuDecor } from "../themes/schema"
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

function installTheme(id: string, decor?: MenuDecor): void {
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
      content: { points: { face: "statement", ...(decor ? { decor } : {}) } },
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

  it("silences branding through the selected menu entry, not the face", () => {
    installTheme("menu-branding-silent", { kind: "silent" })
    const markup = renderSlideSvg(deck("menu-branding-silent", "full"), 0)
    const root = parseSvgRoot(markup)

    expect(markup).not.toContain("ACME")
    expect(root.querySelector(`line[y1="${FOOTER_DIVIDER_Y}"]`)).toBeNull()
    expect(root.querySelector("image")).toBeNull()
  })

  it("leaves the deck-level minimal posture unchanged", () => {
    installTheme("menu-branding-minimal")
    const markup = renderSlideSvg(deck("menu-branding-minimal", "minimal"), 0)
    const root = parseSvgRoot(markup)

    expect(markup).not.toContain("ACME")
    expect(root.querySelector(`line[y1="${FOOTER_DIVIDER_Y}"]`)).toBeNull()
    expect(root.querySelector("image")).not.toBeNull()
  })
})
