// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { measureTextUnits } from "../lib/svg-text-layout"
import { CANVAS_W_PX } from "../constants"
import { isBold } from "./fonts"
import { parseSvgRoot } from "./serialize"
import { slideToSvgMarkup } from "./render-slide"
import type { PptxIR, Slide } from "@/ir"
import type { CanonicalThemeId } from "../themes"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"

// Gallery review r1 leftover item 11: image-split / image-top English
// headings sized with Regular metrics then painted at font-weight 600.
const GALLERY_EN_HEADING = "Competitors are pricing below cost in the mid-market"
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

const SPLIT_TEXT_W = CANVAS_W_PX - 620 - 96
const BAND_PAD_X = 96
const TOP_TITLE_W = CANVAS_W_PX - BAND_PAD_X * 2 - 120
const LATIN_DESCENT = 0.22

function makeSlide(heading: string): Slide {
  return {
    type: "content",
    kind: "photo",
    heading,
    components: [
      { type: "image", asset_id: "hero", fit: "cover", caption: "Onboarding cabinet" },
      {
        type: "paragraph",
        text: "Connected equipment passed one hundred thousand units this quarter, up sixty-seven percent year over year.",
      },
    ],
  } as Slide
}

function makeIr(theme: string, slide: Slide): PptxIR {
  return {
    version: "5",
    filename: "deck.pptx",
    theme: { id: theme },
    meta: { organization: "Strategy & Operations" },
    assets: { images: { hero: { src: PIXEL } } },
    slides: [slide],
  } as PptxIR
}

let themeSerial = 0

afterEach(() => {
  __resetRegisteredThemes()
})

function renderRoot(theme: CanonicalThemeId, face: "image-split" | "image-top", slide: Slide): Element {
  const themeId = registerTestTheme(`image-pages-${themeSerial++}`, theme, { content: { photo: face } })
  return parseSvgRoot(slideToSvgMarkup(makeIr(themeId, slide), slide, 0))
}

function titleNodes(root: Element, heading: string): Element[] {
  const plain = heading.replace(/…/g, "")
  return Array.from(root.querySelectorAll("text")).filter((t) => {
    const content = (t.textContent ?? "").replace(/…/g, "").trim()
    if (!content) return false
    if (!isBold(t.getAttribute("font-weight"))) return false
    return plain.includes(content) || content.includes(plain.slice(0, 12))
  })
}

function lineWidth(el: Element): number {
  const text = el.textContent ?? ""
  const fontSize = Number(el.getAttribute("font-size"))
  const fontFamily = el.getAttribute("font-family") ?? undefined
  return measureTextUnits(text, { bold: isBold(el.getAttribute("font-weight")), fontFamily }) * fontSize
}

describe("image-split / image-top gallery English heading overflow", () => {
  it("image-split: every title line of the gallery English heading fits the 564px text column", () => {
    for (const theme of ["consulting", "journal"] as const) {
      const slide = makeSlide(GALLERY_EN_HEADING)
      const root = renderRoot(theme, "image-split", slide)
      const titles = titleNodes(root, GALLERY_EN_HEADING)
      expect(titles.length, theme).toBeGreaterThan(0)
      expect(
        titles.some((t) => (t.textContent ?? "").trim() === GALLERY_EN_HEADING),
        `${theme} must wrap rather than dump the raw line`,
      ).toBe(false)
      for (const t of titles) {
        expect(lineWidth(t), `${theme} "${t.textContent}"`).toBeLessThanOrEqual(SPLIT_TEXT_W + 1)
      }
      expect(titles.map((t) => t.textContent).join(" ")).toContain("Competitors")
      expect(titles.map((t) => t.textContent).join(" ")).toContain("mid-market")
    }
  })

  it("image-top: gallery English heading stays inside the band box and is not one overflowing line", () => {
    for (const theme of ["consulting", "journal"] as const) {
      const slide = makeSlide(GALLERY_EN_HEADING)
      const root = renderRoot(theme, "image-top", slide)
      const titles = titleNodes(root, GALLERY_EN_HEADING)
      expect(titles.length, theme).toBeGreaterThan(0)
      expect(titles.length, theme).toBeLessThanOrEqual(2)
      for (const t of titles) {
        expect(lineWidth(t), `${theme} "${t.textContent}"`).toBeLessThanOrEqual(TOP_TITLE_W + 1)
      }
      expect(titles.map((t) => t.textContent).join("")).toContain("Competitors")
      expect(titles.map((t) => t.textContent).join("")).toContain("mid-market")

      const hairline = Array.from(root.querySelectorAll("rect")).find(
        (r) => r.getAttribute("height") === "1" && Number(r.getAttribute("width")) > 1000,
      )
      expect(hairline, theme).toBeTruthy()
      const last = titles[titles.length - 1]!
      const lastInk = Number(last.getAttribute("y")) + Number(last.getAttribute("font-size")) * LATIN_DESCENT
      expect(Number(hairline!.getAttribute("y")), theme).toBeGreaterThan(lastInk)

      const col = Array.from(root.querySelectorAll("g[transform]")).find((g) =>
        /^translate\(\s*96[\s,]/.test(g.getAttribute("transform") ?? ""),
      )
      expect(col, theme).toBeTruthy()
      const colY = Number(/translate\(\s*96[\s,]+([\d.]+)/.exec(col!.getAttribute("transform") ?? "")?.[1])
      expect(colY, theme).toBeGreaterThan(Number(hairline!.getAttribute("y")))
    }
  })

  it("image-top wraps a longer English heading instead of shrinking one overflowing line, and the band grows", () => {
    const heading = `${GALLERY_EN_HEADING} across every region`
    const slide = makeSlide(heading)
    const root = renderRoot("journal", "image-top", slide)
    const titles = titleNodes(root, heading)
    expect(titles.length).toBeGreaterThanOrEqual(2)
    for (const t of titles) {
      expect(lineWidth(t), `"${t.textContent}"`).toBeLessThanOrEqual(TOP_TITLE_W + 1)
    }
    const ys = titles.map((t) => Number(t.getAttribute("y")))
    expect(ys[1]!).toBeGreaterThan(ys[0]!)

    const hairline = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("height") === "1" && Number(r.getAttribute("width")) > 1000,
    )!
    const last = titles[titles.length - 1]!
    const lastInk = Number(last.getAttribute("y")) + Number(last.getAttribute("font-size")) * LATIN_DESCENT
    expect(Number(hairline.getAttribute("y"))).toBeGreaterThan(lastInk)
    const col = Array.from(root.querySelectorAll("g[transform]")).find((g) =>
      /^translate\(\s*96[\s,]/.test(g.getAttribute("transform") ?? ""),
    )!
    const colY = Number(/translate\(\s*96[\s,]+([\d.]+)/.exec(col.getAttribute("transform") ?? "")?.[1])
    expect(colY).toBeGreaterThan(Number(hairline.getAttribute("y")))
    expect(colY).toBeGreaterThan(442)
  })
})
