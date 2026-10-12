import { afterEach, describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "./themes/builtin/brief"
import { __resetRegisteredThemes, registerTheme } from "./themes/definitions"
import type { Menu } from "./themes/schema"
import { validateIr } from "./validate-core"

const BASE_MENU: Menu = {
  cover: { face: "gauge-verdict" },
  chapter: { face: "ghost-section-chapter" },
  content: { points: { face: "gauge-sheet" } },
  ending: { face: "signoff-ending" },
}

function publicStyle(id: string) {
  const style = structuredClone(CONSULTING_TOKENS)
  style.id = id
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

  it("rejects bound-face components when the image-cover surface takes over rendering", () => {
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

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "slides.0",
      page: 1,
      slideId: "cover",
    })
    expect(result.errors[0]?.message).toContain("do not render components")
  })

  it("rejects cover components absent from the menu-bound cover face", () => {
    const id = "boundary-menu-reject"
    installTheme(id, { ...BASE_MENU, cover: { face: "institutional-block" } })

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

  it("draws a content kind outside the bound menu on its nearest offered kind", () => {
    const id = "ir-menu-kind"
    installTheme(id, BASE_MENU)

    const result = validateIr(
      deck(id, {
        id: "content",
        type: "content",
        kind: "data",
        heading: "Data",
        components: [{ type: "paragraph", text: "Figures in words" }],
      }),
    )

    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
  })

  it("hard-rejects a content kind with nowhere to land and lists the offer", () => {
    const id = "ir-menu-nowhere"
    installTheme(id, { ...BASE_MENU, content: { statement: { face: "statement" } } })

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
    expect(result.errors[0]?.message).toContain("neither is any kind it can stand in for (evidence, points, list)")
    expect(result.errors[0]?.message).toContain("Available content kinds: statement")
  })

  it.each(["image-top", "image-split"] as const)(
    "requires an image component for the %s takeover surface",
    (face) => {
      const id = `required-${face}`
      installTheme(id, {
        ...BASE_MENU,
        content: { photo: { face } },
      })

      const result = validateIr(
        deck(id, {
          id: "photo",
          type: "content",
          kind: "photo",
          heading: "Photo story",
          components: [{ type: "paragraph", text: "Body without a photo" }],
        }),
      )

      expect(result.ok).toBe(false)
      expect(result.errors[0]).toMatchObject({
        path: "slides.0.components",
        page: 1,
        slideId: "photo",
      })
      expect(result.errors[0]?.message).toContain(`layout "${face}" requires an image or image_grid or image_compare or device_mockup component`)
    },
  )

  it("accepts a boundary page filled exactly to the bound face's item capacity", () => {
    const id = "boundary-items-at-cap"
    installTheme(id, BASE_MENU)

    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Verdict",
        components: [{ type: "bullets", items: ["One", "Two", "Three"] }],
      }),
    )

    expect(result.ok).toBe(true)
  })

  it("rejects a boundary page with more items than the bound face draws", () => {
    const id = "boundary-items-over-cap"
    installTheme(id, BASE_MENU)

    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Verdict",
        components: [{ type: "bullets", items: ["One", "Two", "Three", "Four"] }],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "slides.0.components",
      page: 1,
      slideId: "cover",
    })
    // The face and its limit are both named: an author who reads this knows
    // what to shorten and by how much, which is the whole point of turning
    // a silent `items.slice(0, 3)` into an error.
    expect(result.errors[0]?.message).toContain('face "gauge-verdict"')
    expect(result.errors[0]?.message).toContain("at most 3 items")
    expect(result.errors[0]?.message).toContain("has 4")
  })

  it("rejects a second accepted block on a slot that draws one", () => {
    const id = "boundary-two-blocks"
    installTheme(id, BASE_MENU)

    // `gauge-verdict` declares `body accepts: ["bullets"], capacity: 1` and
    // draws the first block it finds. The second one used to reach no page,
    // no error and no audit — the page simply printed less than it was given.
    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Verdict",
        components: [
          { type: "bullets", items: ["First"] },
          { type: "bullets", items: ["Second"] },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "slides.0.components",
      page: 1,
      slideId: "cover",
    })
    expect(result.errors[0]?.message).toContain('face "gauge-verdict"')
    expect(result.errors[0]?.message).toContain("body slot")
    expect(result.errors[0]?.message).toContain("has 2")
  })

  it("counts the items the bound face will draw, not the blanks between them", () => {
    const id = "boundary-blank-items"
    installTheme(id, { ...BASE_MENU, ending: { face: "signoff-ending" } })

    // `signoff-ending` draws four lines and skips items with no glyphs, so
    // this page holds exactly four. Counting the raw array rejected it as
    // five and sent the author looking for content to cut that was already
    // not being drawn.
    const result = validateIr(
      deck(id, {
        id: "ending",
        type: "ending",
        heading: "Close",
        components: [{ type: "bullets", items: ["One", "", "Two", "  ", "Three", "Four"] }],
      }),
    )

    expect(result.ok).toBe(true)
  })

  it("still rejects a page whose drawable items exceed the face's capacity", () => {
    const id = "boundary-blank-items-over"
    installTheme(id, { ...BASE_MENU, ending: { face: "signoff-ending" } })

    const result = validateIr(
      deck(id, {
        id: "ending",
        type: "ending",
        heading: "Close",
        components: [{ type: "bullets", items: ["One", "", "Two", "Three", "Four", "Five"] }],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.message).toContain('face "signoff-ending"')
    expect(result.errors[0]?.message).toContain("at most 4 items")
    expect(result.errors[0]?.message).toContain("has 5")
  })

  it("never measures a page against a cap the bound face does not use", () => {
    const id = "boundary-items-image-cover"
    installTheme(id, BASE_MENU)

    // An asset cover draws no bullets at all, so `checkBoundaryPageContent`
    // rejects the components outright and no item cap is consulted.
    const result = validateIr(
      deck(id, {
        id: "cover",
        type: "cover",
        heading: "Verdict",
        background: { kind: "asset", asset_id: "hero" },
        components: [{ type: "bullets", items: ["One", "Two", "Three", "Four"] }],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.message).toContain("do not render components")
  })
})
