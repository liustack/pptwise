import { afterEach, describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "./themes/builtin/consulting"
import { __resetRegisteredThemes, registerTheme } from "./themes/definitions"
import type { Menu } from "./themes/schema"
import { validateIr } from "./validate-core"

const BASE_MENU: Menu = {
  cover: { face: "verdict-index" },
  chapter: { face: "masthead-chapter" },
  content: { points: { face: "two-column" } },
  ending: { face: "poster-ending" },
}

function publicStyle(id: string) {
  const style = structuredClone(CONSULTING_TOKENS)
  style.id = id
  if (style.shape?.cover !== undefined) delete style.shape.cover
  return style
}

function installTheme(id: string, menu: Menu): void {
  registerTheme({
    version: 2,
    id,
    style: publicStyle(id),
    brand: {},
    menu,
  })
}

function installThemeWithoutMenu(id: string): void {
  registerTheme({
    version: 2,
    id,
    style: publicStyle(id),
    brand: {},
  })
}

function deck(themeId: string, slide: Record<string, unknown>): unknown {
  return {
    version: "5",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: [slide],
  }
}

afterEach(() => {
  __resetRegisteredThemes()
})

describe("IR validation against the bound theme menu", () => {
  it("rejects a theme file with no menu at registration", () => {
    const id = "ir-missing-menu"
    expect(() => installThemeWithoutMenu(id)).toThrow(/menu/i)
  })

  it("accepts cover components declared by the menu-bound cover face", () => {
    const id = "boundary-menu-face"
    installTheme(id, BASE_MENU)

    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Verdict",
        components: [{ type: "bullets", items: ["One"] }],
      }),
    )

    expect(result.ok).toBe(true)
  })

  it("uses the bound cover face for slots even when an asset background takes over rendering", () => {
    const id = "boundary-menu-image-cover"
    installTheme(id, BASE_MENU)

    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Verdict",
        background: { kind: "asset", asset_id: "hero" },
        components: [{ type: "bullets", items: ["One"] }],
      }),
    )

    expect(result.ok).toBe(true)
  })

  it("rejects cover components absent from the menu-bound cover face", () => {
    const id = "boundary-menu-reject"
    installTheme(id, { ...BASE_MENU, cover: { face: "poster-center" } })

    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Poster",
        components: [{ type: "bullets", items: ["One"] }],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "slides.0",
      page: 1,
      slideId: "cover",
    })
    expect(result.errors[0]?.message).toContain("do not render components")
  })

  it("hard-rejects a content kind outside the bound menu and lists its offer", () => {
    const id = "ir-menu-kind"
    installTheme(id, BASE_MENU)

    const result = validateIr(
      deck(id, {
        id: "content",
        type: "content",
        kind: "data",
        heading: "Data",
        components: [],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "slides.0.kind",
      page: 1,
      slideId: "content",
    })
    expect(result.errors[0]?.message).toContain("points")
  })
})
