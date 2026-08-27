// @vitest-environment jsdom
//
// arena-motif wave 8 batch 3: retire the corner HUD brackets and skip
// speed lines this wave. Keep one energy-bar piece, moved to the board's
// lower-right three segments. Chapter yields. Cover / content / ending draw.
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { ArenaMotif } from "./motif-arena-motif"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  countDecorPieces,
  leafOpacity,
  leafPaint,
  paintedLeaves,
} from "./decor-budget"
import { blendOver, contrastRatio } from "../render/ink"
import { textInkBox } from "../render/depth-contract/geometry"
import type { Component, PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"], components: Component[] = []): Slide =>
  ({ type, heading: "标题", components }) as Slide

const TITLE_ZONE = { x: 96, y: 48, w: 1040, h: 122 }
const BODY_ZONE = { x: 96, y: 200, w: 1040, h: 420 }
const FOOTER_ZONE = { x: 48, y: 664, w: 1184, h: 44 }
const LOGO_BOX = { x: 1120, y: 630, w: 96, h: 40 }

const ENERGY = [
  { x: 960, w: 120 },
  { x: 1092, w: 60 },
  { x: 1164, w: 20 },
] as const

const ARENA_HEX = [
  "#120B22",
  "#1B1233",
  "#241847",
  "#52F2A8",
  "#F2F3F7",
  "#A79FC4",
  "#3A2D63",
  "#FF4D9D",
  "#4DC3FF",
  "#FFD84D",
]

function ir(theme = "arena", filename = "arena-motif.pptx"): PptxIR {
  return {
    version: "4",
    filename,
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides: [slideOf("cover")],
  } as unknown as PptxIR
}

const tokens = resolveStyle("arena")

function render(type: Slide["type"], extra: Partial<Slide> = {}, filename?: string) {
  const defaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, defaultBg)
  const slide = { ...slideOf(type), ...extra } as Slide
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <ArenaMotif ir={ir(tokens.id, filename)} slide={slide} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), defaultBg }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

type Box = { x0: number; y0: number; x1: number; y1: number }

const intersects = (b: Box, z: { x: number; y: number; w: number; h: number }) =>
  b.x0 < z.x + z.w && b.x1 > z.x && b.y0 < z.y + z.h && b.y1 > z.y

function rectBox(r: Element): Box {
  const x = num(r, "x")
  const y = num(r, "y")
  return { x0: x, y0: y, x1: x + num(r, "width"), y1: y + num(r, "height") }
}

describe("arena-motif wave 8 — lower-right energy bar", () => {
  it("cover, content, and ending paint one energy-bar piece of three rects", () => {
    for (const type of ["cover", "content", "ending"] as const) {
      const { root } = render(type)
      expect(countDecorPieces(root), type).toBe(1)
      expect(root.querySelector("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("energy-bar")
      const rects = Array.from(root.querySelectorAll("rect"))
      expect(rects, type).toHaveLength(3)
      rects.forEach((r, i) => {
        expect(num(r, "x"), `${type} x${i}`).toBe(ENERGY[i]!.x)
        expect(num(r, "y"), `${type} y${i}`).toBe(708)
        expect(num(r, "width"), `${type} w${i}`).toBe(ENERGY[i]!.w)
        expect(num(r, "height"), `${type} h${i}`).toBe(8)
        expect(r.getAttribute("fill")).toBe(tokens.colors.border)
        expect(num(r, "x") + num(r, "width"), `${type} right${i}`).toBeLessThanOrEqual(1280)
        expect(num(r, "y") + num(r, "height"), `${type} bottom${i}`).toBeLessThan(720)
      })
      expect(root.querySelectorAll("path"), type).toHaveLength(0)
      expect(root.querySelectorAll("line"), type).toHaveLength(0)
      expect(root.querySelectorAll("text"), type).toHaveLength(0)
    }
  })

  it("chapter yields completely", () => {
    const { root } = render("chapter")
    expect(root.children).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(0)
  })

  it("the three segments are one grouped piece, not isolated ticks", () => {
    const { root } = render("content")
    const group = root.querySelector("[data-decor-piece='energy-bar']")
    expect(group).toBeTruthy()
    expect(group?.querySelectorAll("rect")).toHaveLength(3)
    expect(root.querySelectorAll("rect")).toHaveLength(3)
  })

  it("content-page energy recedes below the 3:1 large-text floor", () => {
    const { root, defaultBg } = render("content")
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      if (!paint) continue
      const composite = blendOver(paint.color, defaultBg, leafOpacity(el))
      expect(contrastRatio(composite, defaultBg)).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("does not enter the board safety zones", () => {
    for (const type of ["cover", "content", "ending"] as const) {
      const { root } = render(type)
      for (const box of Array.from(root.querySelectorAll("rect")).map(rectBox)) {
        for (const [name, zone] of Object.entries({
          title: TITLE_ZONE,
          body: BODY_ZONE,
          footer: FOOTER_ZONE,
          brLogo: LOGO_BOX,
        })) {
          expect(intersects(box, zone), `${type} enters the ${name} zone: ${JSON.stringify(box)}`).toBe(false)
        }
      }
    }
  })

  it("paints no midground glyphs, so nothing can bleed", () => {
    const { root } = render("content")
    expect(root.querySelectorAll("text")).toHaveLength(0)
    for (const el of Array.from(root.querySelectorAll("text"))) {
      const box = textInkBox({
        content: el.textContent ?? "",
        x: Number(el.getAttribute("x")),
        y: Number(el.getAttribute("y")),
        fontSize: Number(el.getAttribute("font-size")),
        fontFamily: el.getAttribute("font-family") ?? "",
        fontWeight: el.getAttribute("font-weight"),
        textAnchor: el.getAttribute("text-anchor") ?? "start",
      })
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(1280)
      expect(box.y + box.h).toBeLessThanOrEqual(720)
    }
  })

  it("cover and footnote pages keep the energy bar", () => {
    expect(render("cover").root.querySelectorAll("rect")).toHaveLength(3)
    const noted = render("content", { footnote: "来源：平台后台" } as Partial<Slide>)
    expect(noted.root.querySelectorAll("rect")).toHaveLength(3)
  })

  it("dense pages do not change the energy bar (speed lines are gone)", () => {
    const sparse = render("content", { components: [{ type: "paragraph", text: "一段" } as Component] })
    const dense = render("content", {
      components: Array.from({ length: 8 }, (_, i) => ({ type: "paragraph", text: `第 ${i} 段` }) as Component),
    })
    expect(Array.from(sparse.root.querySelectorAll("rect")).map((r) => r.getAttribute("x"))).toEqual(
      Array.from(dense.root.querySelectorAll("rect")).map((r) => r.getAttribute("x")),
    )
  })

  it("paint stays on the leaves, not the group", () => {
    const { root } = render("cover")
    for (const g of Array.from(root.querySelectorAll("g"))) {
      for (const attr of ["fill", "stroke", "opacity"]) {
        expect(g.getAttribute(attr), `<g> carries ${attr}`).toBeNull()
      }
    }
  })

  it("does not use rotate transform", () => {
    const { root } = render("cover")
    for (const el of Array.from(root.querySelectorAll("rect, g"))) {
      expect(el.getAttribute("transform")).toBeNull()
    }
  })

  it("follows another theme's tokens and does not leak arena hex", () => {
    const heritage = resolveStyle("heritage")
    const ctx = buildCtx(heritage, {})
    const markup = renderSvgMarkup(
      <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
        <ArenaMotif ir={ir("heritage")} slide={slideOf("content")} ctx={ctx} />
      </svg>,
    )
    expect(markup).toContain(heritage.colors.border)
    expect(markup).not.toContain(heritage.colors.chartPalette[1])
    for (const hex of ARENA_HEX) {
      expect(markup, `arena token ${hex} leaked into the heritage render`).not.toContain(hex)
    }
  })

  it("position is inert to seed and identical across two renders", () => {
    const markups = new Set(Array.from({ length: 8 }, (_, i) => render("cover", {}, `probe-${i}.pptx`).markup))
    expect(markups.size).toBe(1)
    expect(render("ending").markup).toBe(render("ending").markup)
  })

  it("does not paint an ellipsis", () => {
    for (const type of ["cover", "chapter", "content", "ending"] as const) {
      const { markup } = render(type)
      expect(markup).not.toContain("…")
      expect(markup).not.toContain("...")
    }
  })

  it("Decor body passes subset validation", () => {
    for (const type of ["cover", "chapter", "content", "ending"] as const) {
      expect(() => assertSubset(render(type).root)).not.toThrow()
    }
  })
})
