// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { resolveNarrative } from "../narrative"
import type { Menu } from "../themes/schema"
import { FullSlideSvg } from "./full-slide-svg"
import { checkIrQuality } from "./ir-quality"
import { resolveEffectiveFace, resolveEffectiveLayoutBodyCapacity, resolveLayoutId } from "./layout-selection"

const MENU: Menu = {
  cover: { face: "poster-center" },
  chapter: { face: "masthead-chapter" },
  content: {
    points: { face: "two-column" },
    comparison: { face: "asymmetric-triptych" },
    photo: { face: "image-split" },
  },
  ending: { face: "poster-ending" },
}

afterEach(() => {
  __resetRegisteredThemes()
})

function installTheme(id: string, menu: Menu): void {
  registerTheme({
    version: 2,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu,
  })
}

function deck(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "menu-lookup.pptx",
    theme: { id: themeId },
    meta: {},
    assets: {
      images: {
        hero: {
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          alt: "hero",
        },
      },
    },
    slides,
  }
}

describe("theme-menu layout lookup", () => {
  it("maps boundary page type and content kind directly to one face", () => {
    expect(resolveLayoutId("cover", undefined, MENU)).toBe("poster-center")
    expect(resolveLayoutId("chapter", undefined, MENU)).toBe("masthead-chapter")
    expect(resolveLayoutId("content", "points", MENU)).toBe("two-column")
    expect(resolveLayoutId("content", "comparison", MENU)).toBe("asymmetric-triptych")
    expect(resolveLayoutId("content", "photo", MENU)).toBe("image-split")
    expect(resolveLayoutId("ending", undefined, MENU)).toBe("poster-ending")
  })

  it("uses one resolved standard face for effective id, capacity, and SVG", () => {
    const id = "menu-parity-standard"
    installTheme(id, {
      ...MENU,
      content: { points: { face: "bento-panel" } },
    })
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "One face",
      components: [{ type: "paragraph", text: "Body" }],
    }
    const ir = deck(id, [slide])

    expect(resolveEffectiveFace(ir, slide)).toMatchObject({
      route: "layout",
      layoutId: "bento-panel",
    })
    expect(resolveEffectiveLayoutBodyCapacity(ir, slide)).toEqual({
      layoutId: "bento-panel",
      capacity: 6,
    })

    const { container } = render(<FullSlideSvg ir={ir} slide={slide} index={0} />)
    expect(container.querySelector("[data-archetype]")?.getAttribute("data-archetype")).toBe("bento-panel")
  })

  it("combines pacing with the capacity declared by the menu-selected face", () => {
    const id = "menu-capacity"
    installTheme(id, {
      ...MENU,
      content: { points: { face: "two-column" } },
    })
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "Capacity",
      components: Array.from({ length: 5 }, (_, i) => ({
        type: "paragraph" as const,
        text: `Block ${i + 1}`,
      })),
    }
    const issue = checkIrQuality(deck(id, [slide]), resolveNarrative({ pacing: "dense" })).find(
      (candidate) => candidate.code === "density",
    )

    expect(issue?.density).toEqual({
      limit: 4,
      pacing: "dense",
      pacingBudget: 5,
      layoutId: "two-column",
      layoutCapacity: 4,
    })
  })

  it("uses the same route record for a menu-selected image takeover", () => {
    const id = "menu-parity-takeover"
    installTheme(id, {
      ...MENU,
      content: { photo: { face: "image-top" } },
    })
    const slide: Slide = {
      type: "content",
      kind: "photo",
      heading: "One takeover",
      components: [{ type: "image", asset_id: "hero", fit: "cover" }],
    }
    const ir = deck(id, [slide])

    expect(resolveEffectiveFace(ir, slide)).toMatchObject({
      route: "takeover",
      layoutId: "image-top",
    })
    expect(resolveEffectiveLayoutBodyCapacity(ir, slide)).toEqual({
      layoutId: "image-top",
      capacity: undefined,
    })

    const { container } = render(<FullSlideSvg ir={ir} slide={slide} index={0} />)
    expect(container.querySelector("[data-archetype]")).toBeNull()
    expect(container.querySelector("image")?.getAttribute("href")).toContain("data:image/png")
  })

  it("retains the bound cover face while an asset background takes over rendering", () => {
    const id = "menu-parity-image-cover"
    installTheme(id, {
      ...MENU,
      cover: { face: "verdict-index" },
    })
    const slide: Slide = {
      type: "cover",
      heading: "Image cover",
      background: { kind: "asset", asset_id: "hero" },
      components: [],
    }

    expect(resolveEffectiveFace(deck(id, [slide]), slide)).toMatchObject({
      route: "image-cover",
      layoutId: "verdict-index",
      layout: { id: "verdict-index" },
    })
  })

  it("fails fast when a content kind has no menu entry", () => {
    const id = "menu-unoffered-kind"
    installTheme(id, MENU)
    const slide: Slide = {
      type: "content",
      kind: "data",
      heading: "Not offered",
      components: [],
    }
    const ir = deck(id, [slide])

    expect(() => render(<FullSlideSvg ir={ir} slide={slide} index={0} />)).toThrow(
      /kind "data" is not offered.*points, comparison, photo/i,
    )
  })

  it("renders only the motif named by the selected menu entry", () => {
    const id = "menu-decor-motif"
    installTheme(id, {
      ...MENU,
      content: {
        points: {
          face: "bento-panel",
          decor: {
            kind: "motif",
            id: "gauge-motif",
            params: { intensity: "subtle" },
          },
        },
      },
    })
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "Menu decor",
      components: [{ type: "paragraph", text: "Body" }],
    }
    const { container } = render(<FullSlideSvg ir={deck(id, [slide])} slide={slide} index={0} />)
    const locator = container.querySelector('[data-decor-piece="locator-corner"]')

    // A structure-role piece lifts to the foreground bare; the data-decor
    // container marker stays on the midground group. Both come from the one
    // motif the entry named.
    expect(locator).not.toBeNull()
    expect(container.querySelector("g[data-decor]")).not.toBeNull()
    expect(locator?.querySelector("line")?.getAttribute("opacity")).toBe("0.62")
  })

  it("decor silent kills the motif; brand silence is the entry's own switch", () => {
    const ordinaryId = "menu-decor-ordinary"
    const silentId = "menu-decor-silent"
    installTheme(ordinaryId, {
      ...MENU,
      content: { points: { face: "bento-panel" } },
    })
    installTheme(silentId, {
      ...MENU,
      content: {
        points: { face: "bento-panel", decor: { kind: "silent" }, brand: "none" },
      },
    })
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "Brand posture",
      components: [{ type: "paragraph", text: "Body" }],
    }
    const branded = (themeId: string): PptxIR => ({
      ...deck(themeId, [slide]),
      branding: "full",
      meta: { organization: "ACME" },
    })

    const ordinary = render(<FullSlideSvg ir={branded(ordinaryId)} slide={slide} index={0} />).container
    const silent = render(<FullSlideSvg ir={branded(silentId)} slide={slide} index={0} />).container

    expect(ordinary.textContent).toContain("ACME")
    expect(ordinary.querySelector('line[y1="664"]')).not.toBeNull()
    expect(silent.textContent).not.toContain("ACME")
    expect(silent.querySelector('line[y1="664"]')).toBeNull()
    expect(silent.querySelector("g[data-decor]")).toBeNull()
  })
})
