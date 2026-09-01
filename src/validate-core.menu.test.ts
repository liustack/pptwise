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

  it.each(["image-top", "image-bottom", "image-split", "image-annotate"] as const)(
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

  it("reports image-annotate items beyond its annotation capacity as density", () => {
    const id = "annotation-capacity"
    installTheme(id, {
      ...BASE_MENU,
      content: { photo: { face: "image-annotate" } },
    })

    const result = validateIr(
      deck(id, {
        id: "annotated-photo",
        type: "content",
        kind: "photo",
        heading: "Five observations",
        components: [
          { type: "image", asset_id: "hero", fit: "cover" },
          { type: "bullets", items: ["One", "Two", "Three", "Four", "Five"] },
        ],
      }),
    )

    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "slides.0",
          page: 1,
          slideId: "annotated-photo",
          message: expect.stringContaining('image-annotate layout\'s annotation capacity is 4'),
        }),
      ]),
    )
  })

  it("rejects a content component that the resolved takeover surface has no slot for", () => {
    const id = "annotation-component-contract"
    installTheme(id, {
      ...BASE_MENU,
      content: { photo: { face: "image-annotate" } },
    })

    const result = validateIr(
      deck(id, {
        id: "annotated-photo",
        type: "content",
        kind: "photo",
        heading: "Unsupported prose",
        components: [
          { type: "image", asset_id: "hero", fit: "cover" },
          { type: "paragraph", text: "The annotation surface has no body slot." },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]).toMatchObject({
      path: "slides.0.components",
      page: 1,
      slideId: "annotated-photo",
    })
    expect(result.errors[0]?.message).toContain('layout "image-annotate" does not render paragraph components')
  })

  it("only lets the selected image-family source consume image-annotate's first image slot", () => {
    const id = "annotation-image-selection"
    installTheme(id, {
      ...BASE_MENU,
      content: { photo: { face: "image-annotate" } },
    })

    const result = validateIr(
      deck(id, {
        id: "annotated-photo",
        type: "content",
        kind: "photo",
        heading: "One image anchor",
        components: [
          {
            type: "image_compare",
            left: { asset_id: "before", label: "Before" },
            right: { asset_id: "after", label: "After" },
          },
          { type: "device_mockup", device: "browser", asset_id: "dashboard" },
        ],
      }),
    )

    expect(result.ok).toBe(false)
    expect(result.errors[0]?.message).toContain('layout "image-annotate" does not render device_mockup components')
  })

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
    expect(result.errors[0]?.message).toContain('face "verdict-index"')
    expect(result.errors[0]?.message).toContain("at most 3 items")
    expect(result.errors[0]?.message).toContain("has 4")
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
