import { afterEach, describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "../themes/builtin/brief"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import type { Menu } from "../themes/schema"
import { validateSpec } from "./index"

const MENU: Menu = {
  cover: { face: "institutional-block" },
  chapter: { face: "ghost-section-chapter" },
  content: {
    points: { face: "gauge-sheet" },
    list: { face: "gauge-sheet" },
  },
  ending: { face: "signoff-ending" },
}

function installTheme(id: string): void {
  registerTheme({
    version: 2,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: MENU,
  })
}

function installThemeWithoutMenu(id: string): void {
  registerTheme({
    version: 2,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    brand: {},
  })
}

function spec(theme: string, kinds: Array<"points" | "list" | "data">): unknown {
  return {
    version: "1",
    theme,
    narrative: { pacing: "spacious" },
    pages: [
      { id: "cover", type: "cover", heading: "Cover" },
      ...kinds.map((kind, index) => ({
        id: `content-${index + 1}`,
        type: "content",
        kind,
        heading: `Content ${index + 1}`,
      })),
      { id: "ending", type: "ending", heading: "Ending" },
    ],
  }
}

afterEach(() => {
  __resetRegisteredThemes()
})

describe("deck spec theme menu", () => {
  it("hard-rejects a public v2 theme that has no menu at registration", () => {
    const themeId = "spec-missing-menu"
    expect(() => installThemeWithoutMenu(themeId)).toThrow(/menu/i)
  })

  it("lands a content kind outside the bound theme menu on its nearest offered kind, and says so", () => {
    const themeId = "spec-menu-offer"
    installTheme(themeId)

    const result = validateSpec(spec(themeId, ["data", "list"]))

    expect(result.errors).toEqual([])
    expect(result.ok).toBe(true)
    expect(result.landings).toEqual([
      {
        path: "pages.1.kind",
        pageId: "content-1",
        kind: "data",
        lands: ["points", "list"],
        message:
          'theme "spec-menu-offer" offers no "data" page: this one is drawn as "points", or on "list" when its components need that face. Nothing to change in the spec',
      },
    ])
  })

  it("hard-rejects a content kind with nowhere to land and lists the offer", () => {
    const themeId = "spec-menu-nowhere"
    registerTheme({
      version: 2,
      id: themeId,
      style: { ...CONSULTING_TOKENS, id: themeId, shape: { radius: 2, gapScale: 1, typeScale: 1 } },
      menu: { ...MENU, content: { statement: { face: "statement" } } },
    })

    const result = validateSpec(spec(themeId, ["data"]))

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: "pages.1.kind",
        pageId: "content-1",
        message: expect.stringContaining('kind "data" is not offered by theme "spec-menu-nowhere", and neither is any kind it can stand in for (evidence, points, list)'),
      }),
    ])
    expect(result.errors[0]?.message).toContain("Available content kinds: statement")
  })

  it("reports consecutive use of one kind as an advisory without blocking the spec", () => {
    const themeId = "spec-kind-advisory"
    installTheme(themeId)

    const result = validateSpec(spec(themeId, ["points", "points", "points"]))

    expect(result.ok).toBe(true)
    expect(result.warnings).toEqual([
      expect.objectContaining({
        path: "pages",
        pageId: "content-1",
        message: expect.stringContaining('3 consecutive content pages use kind "points"'),
      }),
    ])
  })
})
