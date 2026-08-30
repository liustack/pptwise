import { afterEach, describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "../themes/builtin/consulting"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import type { Menu } from "../themes/schema"
import { validateSpec } from "./index"

const MENU: Menu = {
  cover: { face: "poster-center" },
  chapter: { face: "masthead-chapter" },
  content: {
    points: { face: "two-column" },
    list: { face: "narrow-column" },
  },
  ending: { face: "poster-ending" },
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

  it("hard-rejects a content kind outside the bound theme menu and lists the offer", () => {
    const themeId = "spec-menu-offer"
    installTheme(themeId)

    const result = validateSpec(spec(themeId, ["data", "list"]))

    expect(result.ok).toBe(false)
    expect(result.errors).toEqual([
      expect.objectContaining({
        path: "pages.1.kind",
        pageId: "content-1",
        message: expect.stringContaining('kind "data"'),
      }),
    ])
    expect(result.errors[0]?.message).toContain("points, list")
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
