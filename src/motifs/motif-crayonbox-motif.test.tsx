// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { accessibleInk } from "../render/ink"
import {
  CANDY_PINK,
  CREATIVE_PURPLE,
  GRASS_GREEN,
  SKY_BLUE,
  SUN_YELLOW,
} from "../layouts/crayonbox-shared"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { countDecorPieces, MAX_DECOR_PIECES } from "./decor-budget"
import { CrayonboxMotif } from "./motif-crayonbox-motif"

const ir: PptxIR = {
  version: "5",
  filename: "crayonbox-motif.pptx",
  theme: { id: "crayon" },
  meta: {},
  assets: { images: {} },
  slides: [],
} as PptxIR

function slideOf(type: Slide["type"]): Slide {
  return { type, heading: "画出新的可能", components: [] } as Slide
}

function render(type: Slide["type"]) {
  const tokens = resolveStyle("crayon")
  const ctx = buildCtx(tokens, {})
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CrayonboxMotif ir={ir} slide={slideOf(type)} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

const PROTECTED_ZONES = {
  title: { x: 96, y: 48, w: 1040, h: 122 },
  body: { x: 96, y: 200, w: 1040, h: 420 },
  footerMeta: { x: 48, y: 664, w: 1184, h: 44 },
  brLogo: { x: 1120, y: 630, w: 96, h: 40 },
  trLogo: { x: 1120, y: 48, w: 96, h: 40 },
} as const

type Box = { x0: number; y0: number; x1: number; y1: number }

const intersects = (box: Box, zone: { x: number; y: number; w: number; h: number }) =>
  box.x0 < zone.x + zone.w && box.x1 > zone.x && box.y0 < zone.y + zone.h && box.y1 > zone.y

describe("CrayonboxMotif", () => {
  it("paints a yellow four-ray sun and a two-star sticker group on content only", () => {
    const { root } = render("content")
    const sun = root.querySelector('[data-decor-piece="crayonbox-sun"]')!
    const sunGroup = sun.querySelector("g")!
    expect(sunGroup.getAttribute("transform")).toBe("translate(1240,28)")
    const circle = sun.querySelector("circle")!
    expect([circle.getAttribute("r"), circle.getAttribute("stroke"), circle.getAttribute("stroke-width")]).toEqual([
      "8",
      SUN_YELLOW,
      "3",
    ])
    const rays = Array.from(sun.querySelectorAll("line"))
    expect(rays.map((ray) => ["x1", "y1", "x2", "y2"].map((name) => Number(ray.getAttribute(name))))).toEqual([
      [0, -12, 0, -18],
      [0, 12, 0, 18],
      [12, 0, 18, 0],
      [-12, 0, -18, 0],
    ])
    expect(rays.every((ray) => ray.getAttribute("stroke-linecap") === "round")).toBe(true)

    const stars = Array.from(root.querySelectorAll('[data-decor-piece="crayonbox-stars"] text'))
    expect(stars.map((star) => [
      star.textContent,
      star.getAttribute("x"),
      star.getAttribute("y"),
      star.getAttribute("font-size"),
      star.getAttribute("fill"),
    ])).toEqual([
      ["★", "1224", "78", "18", CANDY_PINK],
      ["★", "1250", "112", "14", CREATIVE_PURPLE],
    ])
    expect(countDecorPieces(root)).toBe(2)
    expect(countDecorPieces(root)).toBeLessThanOrEqual(MAX_DECOR_PIECES)

    for (const type of ["cover", "chapter", "ending"] as const) {
      expect(render(type).root.children, type).toHaveLength(0)
    }
  })

  it("keeps every leaf to the right of all five protected regions", () => {
    const { root } = render("content")
    const boxes: Box[] = []
    for (const ray of Array.from(root.querySelectorAll('[data-decor-piece="crayonbox-sun"] line'))) {
      const half = Number(ray.getAttribute("stroke-width")) / 2
      boxes.push({
        x0: 1240 + Math.min(Number(ray.getAttribute("x1")), Number(ray.getAttribute("x2"))) - half,
        y0: 28 + Math.min(Number(ray.getAttribute("y1")), Number(ray.getAttribute("y2"))) - half,
        x1: 1240 + Math.max(Number(ray.getAttribute("x1")), Number(ray.getAttribute("x2"))) + half,
        y1: 28 + Math.max(Number(ray.getAttribute("y1")), Number(ray.getAttribute("y2"))) + half,
      })
    }
    boxes.push({ x0: 1238, y0: 60, x1: 1256, y1: 82 })
    boxes.push({ x0: 1250, y0: 95, x1: 1264, y1: 115 })

    for (const box of boxes) {
      expect(box.x0).toBeGreaterThan(1216)
      for (const [name, zone] of Object.entries(PROTECTED_ZONES)) {
        expect(intersects(box, zone), `${JSON.stringify(box)} enters ${name}`).toBe(false)
      }
    }
  })

  it("documents the purple-only white-ink exception and keeps other candy blocks dark", () => {
    const { tokens } = render("content")
    expect(accessibleInk(tokens.colors.text, CREATIVE_PURPLE, 18)).toBe("#FFFFFF")
    for (const fill of [SKY_BLUE, tokens.colors.accent, GRASS_GREEN]) {
      expect(accessibleInk(tokens.colors.text, fill, 18)).toBe(tokens.colors.text)
      expect(accessibleInk(tokens.colors.text, fill, 18)).not.toBe("#FFFFFF")
    }
  })

  it("renders deterministically and stays inside the supported SVG subset", () => {
    const first = render("content")
    const second = render("content")
    expect(first.markup).toBe(second.markup)
    expect(() => assertSubset(first.root)).not.toThrow()
  })
})
