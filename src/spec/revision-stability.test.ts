import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { CONSULTING_TOKENS } from "../themes/builtin/brief"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import { assembleDeck } from "./assemble"

const TEST_THEME_ID = "spec-revision-tests"

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

function spec(headings: string[]): unknown {
  return {
    narrative: { pacing: "spacious" },
    theme: TEST_THEME_ID,
    pages: [
      { id: "cover", type: "cover", heading: "Cover" },
      ...headings.map((heading, index) => ({
        id: `body-${index + 1}`,
        type: "content",
        kind: "points",
        heading,
      })),
      { id: "ending", type: "ending", heading: "Ending" },
    ],
  }
}

describe("assembly revision stability after selection materialization removal", () => {
  it("editing a heading changes only that authored heading", () => {
    const before = assembleDeck(spec(["A", "B"]), {}).ir
    const after = assembleDeck(spec(["A revised", "B"]), {}).ir

    expect(after.slides[1]?.heading).toBe("A revised")
    expect(after.slides[2]).toEqual(before.slides[2])
    expect(after).not.toHaveProperty("seed")
    expect(after.slides.every((slide) => !("layout" in slide))).toBe(true)
  })

  it("inserting a page adds no derived state to existing pages", () => {
    const before = assembleDeck(spec(["A", "B"]), {}).ir
    const after = assembleDeck(spec(["A", "Inserted", "B"]), {}).ir

    expect(after.slides.find((slide) => slide.id === "body-1")).toEqual(
      before.slides.find((slide) => slide.id === "body-1"),
    )
    expect(after.slides.every((slide) => !("layout" in slide) && !("beat" in slide))).toBe(true)
  })

  it("identical project inputs produce byte-identical JSON", () => {
    const input = spec(["A", "B"])
    expect(JSON.stringify(assembleDeck(input, {}))).toBe(JSON.stringify(assembleDeck(input, {})))
  })
})
