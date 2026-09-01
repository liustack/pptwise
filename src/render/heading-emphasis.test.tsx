// @vitest-environment node
import { describe, expect, it } from "vitest"
import { renderSlideSvg } from "../api"
import type { PptxIR, Slide } from "../ir"
import { installNodePlatform } from "../platform/node"
import { CANONICAL_THEME_IDS } from "../themes"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { COVER_LAYOUTS } from "../layouts/index-cover"
import { CHAPTER_LAYOUTS } from "../layouts/index-chapter"
import { CONTENT_LAYOUTS } from "../layouts/index-content"
import { ENDING_LAYOUTS } from "../layouts/index-ending"
import { stripEmphasis } from "./emphasis"

installNodePlatform()

const MARKED = "年度**增长结论**与下一步投入"
const PLAIN = stripEmphasis(MARKED)
const RUN = "增长结论"
const BODY = { type: "paragraph", text: "正文占位。" } as Slide["components"][number]

function deck(themeId: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "heading-emphasis.pptx",
    theme: { id: themeId },
    meta: { organization: "pptwise" },
    assets: { images: {} },
    slides,
  } as PptxIR
}

/** Text actually painted, with every tag removed — what a reader sees. */
function paintedText(svg: string): string {
  return svg.replace(/<[^>]*>/g, "")
}

function contentPage(themeId: string, heading: string, face?: string): string {
  __resetRegisteredThemes()
  const id = face
    ? registerTestTheme(`he-${face}-${themeId}`, themeId as never, { content: { points: face } })
    : themeId
  const svg = renderSlideSvg(
    deck(id, [
      { type: "chapter", heading: "增长战略", components: [] } as Slide,
      { type: "content", kind: "points", heading, components: [BODY] } as Slide,
    ]),
    1,
  )
  __resetRegisteredThemes()
  return svg
}

describe("a tint theme paints its marked heading instead of printing it", () => {
  // arena carries a tag_box treatment, memo has no treatment at all: the two
  // sides of the split that used to decide whether markers reached the page.
  it.each(["arena", "memo"])("%s", (themeId) => {
    const svg = contentPage(themeId, MARKED)
    expect(paintedText(svg)).not.toContain("*")
    expect(paintedText(svg)).toContain(PLAIN)
    expect(svg).toMatch(new RegExp(`<tspan[^>]*>${RUN}</tspan>`))
  })

  it("keeps the run's own fill different from the rest of the line", () => {
    const svg = contentPage("memo", MARKED)
    const run = new RegExp(`<tspan([^>]*)>${RUN}</tspan>`).exec(svg)
    expect(run).not.toBeNull()
    expect(run![1]).toMatch(/fill="#[0-9A-Fa-f]{6}"/)
  })
})

describe("a theme with a declared stroke keeps it", () => {
  it("lecture strikes its chalk underline under a marked heading", () => {
    const svg = contentPage("lecture", MARKED)
    expect(svg).toContain('data-emphasis-underline=""')
    expect(svg).not.toContain('data-emphasis-pad=""')
    expect(paintedText(svg)).not.toContain("*")
  })

  it("consulting swipes its marker pad under a marked heading", () => {
    const svg = contentPage("consulting", MARKED)
    expect(svg).toContain('data-emphasis-pad=""')
    expect(paintedText(svg)).not.toContain("*")
  })
})

describe("no registered face prints a heading marker", () => {
  const faces = [
    ...Object.keys(COVER_LAYOUTS).map((face) => ["cover", face] as const),
    ...Object.keys(CHAPTER_LAYOUTS).map((face) => ["chapter", face] as const),
    ...Object.keys(CONTENT_LAYOUTS).map((face) => ["content", face] as const),
    ...Object.keys(ENDING_LAYOUTS).map((face) => ["ending", face] as const),
  ]

  it.each(faces)("%s/%s", (kind, face) => {
    __resetRegisteredThemes()
    const id =
      kind === "content"
        ? registerTestTheme(`he-${kind}-${face}`, "swiss", { content: { points: face } })
        : registerTestTheme(`he-${kind}-${face}`, "swiss", { [kind]: face })
    const slides: Slide[] =
      kind === "content"
        ? [
            { type: "chapter", heading: "增长战略", components: [] } as Slide,
            { type: "content", kind: "points", heading: MARKED, components: [BODY] } as Slide,
          ]
        : [{ type: kind, heading: MARKED, components: [] } as Slide]
    const svg = renderSlideSvg(deck(id, slides), slides.length - 1)
    __resetRegisteredThemes()
    expect(paintedText(svg)).not.toContain("*")
  })
})

describe("every canonical theme's own menu is marker-free on a marked heading", () => {
  it.each(CANONICAL_THEME_IDS)("%s", (themeId) => {
    const svg = contentPage(themeId, MARKED)
    expect(paintedText(svg)).not.toContain("*")
  })
})
