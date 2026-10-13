// @vitest-environment jsdom
//
// A theme that declares `shape.surfaces: "ruled"` is set as print: every
// shared component draws its cards, cells, nodes and badges without a fill
// or a rounded corner, and its words still clear the contrast audit on the
// paper they now sit on (`./surfaces.ts`). Each component is drawn here from
// the gallery corpus's ordinary instance, on proposal's colours with the
// token turned on, so the rule holds whatever theme turns it on.
import { beforeAll, describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { Component } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { findContrastIssues, __pathBoundingBox } from "@/audit/deck-audit"
import { resolveStyle, type StyleTokens } from "@/themes"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { corpusAssets, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS } from "../../evals/gallery/corpus/lexicon"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderComponent, measureComponent } from "./index"
import { isRuled } from "./surfaces"
import { contrastRatio } from "../render/ink"
import type { ComponentCtx } from "./types"

const BOX = { x: 64, y: 176, w: 1152 }
const BAND_BOTTOM = 640

let assets: CorpusAssets
beforeAll(async () => {
  installNodePlatform()
  assets = await corpusAssets(LEXICONS.zh)
})

/**
 * proposal's colours with the shared components set as print. The surface is
 * a warm sand distinct from the paper, so a card the renderer still lays
 * cannot hide by being as white as the page, and the radius is a rounded
 * theme's, so a corner the renderer still takes from the theme shows. A
 * plotted mark keeps the theme's corner, as a chart keeps its marks.
 */
function ruledTokens(): StyleTokens {
  const base = resolveStyle("proposal")
  const { cardStroke: _cardStroke, ...colors } = base.colors
  return { ...base, colors: { ...colors, surface: "#F3F0EA" }, shape: { ...base.shape, radius: 8, surfaces: "ruled" } }
}

function ruledCtx(component: Component): ComponentCtx {
  return boundThemeCtx("proposal", assets.images, [component], undefined, undefined, undefined, ruledTokens())
}

/** The page: paper under the component, the way a content page paints it. */
function page(component: Component, ctx: ComponentCtx): string {
  const h = Math.min(measureComponent(component, BOX.w, ctx), BAND_BOTTOM - BOX.y)
  const body = renderToStaticMarkup(renderComponent(component, { ...BOX, h }, ctx))
  const paper = ctx.defaultBg ?? ctx.colors.bg
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720" width="1280" height="720"><rect x="0" y="0" width="1280" height="720" fill="${paper}"/>${body}</svg>`
}

/** A shape's fill as painted: `none` when it paints nothing. */
function paintedFill(el: Element): string {
  if (el.closest("defs, clipPath, mask, pattern, symbol")) return "none"
  const fill = (el.getAttribute("fill") ?? "#000000").toLowerCase()
  const opacity = Number(el.getAttribute("fill-opacity") ?? el.getAttribute("opacity") ?? "1")
  if (fill === "none" || fill === "transparent" || opacity === 0) return "none"
  return fill
}

/** A rect no thicker than this is a rule, not a card. */
const RULE_THICKNESS = 3

function area(el: Element): number {
  const n = (name: string) => Number(el.getAttribute(name) ?? "0")
  switch (el.tagName.toLowerCase()) {
    case "rect":
      return Math.min(n("width"), n("height")) <= RULE_THICKNESS ? 0 : n("width") * n("height")
    case "circle":
      return (2 * n("r")) ** 2
    case "ellipse":
      return 4 * n("rx") * n("ry")
    case "polygon":
    case "polyline": {
      const pts = (el.getAttribute("points") ?? "").trim().split(/[\s,]+/).map(Number)
      const xs = pts.filter((_, i) => i % 2 === 0)
      const ys = pts.filter((_, i) => i % 2 === 1)
      return (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys))
    }
    case "path": {
      const box = __pathBoundingBox(el.getAttribute("d") ?? "")
      return box ? box.w * box.h : 0
    }
    default:
      return 0
  }
}

/**
 * A filled shape bigger than a mark: a card, a cell, a node, a disc. Marks
 * (a dot on a timeline, a tick in a box, an icon's strokes) are smaller than
 * a 20px square and stay.
 */
const MARK_AREA = 20 * 20

/**
 * Shapes a component draws as data, not as furniture: they keep their fill
 * under ruled, as a chart keeps its bars. Keyed by component type, each a
 * test of one element.
 */
function seriesInk(el: Element, ctx: ComponentCtx): boolean {
  const fill = (el.getAttribute("fill") ?? "").toLowerCase()
  return [...ctx.colors.chartPalette, ctx.colors.accent, ctx.colors.primary].some((c) => c.toLowerCase() === fill)
}

const plotMark = (el: Element) => el.hasAttribute("data-plot-mark")
const DATA_SHAPES: Record<string, (el: Element, ctx: ComponentCtx) => boolean> = {
  // A cell's shade is its value.
  heatmap: plotMark,
  // A flow's width and a node's height are their values.
  sankey: (el) => plotMark(el) || el.tagName === "rect",
  // A bar's span is its dates, its colour the series.
  gantt: (el, ctx) => el.tagName === "rect" && seriesInk(el, ctx),
  // A ball's fill is its score.
  harvey_balls: (el) => el.tagName === "path" || el.tagName === "circle",
  // A figure filled is one counted.
  pictogram: () => true,
  // A bar's length is its value.
  waterfall: () => true,
  // A milestone's dot is its place on the axis.
  timeline: (el) => el.tagName === "circle",
  // A picture of the device the screenshot sits in.
  device_mockup: () => true,
}

/** Components that are all data: nothing in them is a card. */
const ALL_DATA = new Set(["chart"])

function filledFurniture(markup: string, type: string, ctx: ComponentCtx): string[] {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml")
  const paper = (ctx.defaultBg ?? ctx.colors.bg).toLowerCase()
  const shapes = [...doc.querySelectorAll("rect, circle, ellipse, polygon, path")].slice(1)
  const found: string[] = []
  for (const el of shapes) {
    const fill = paintedFill(el)
    if (fill === "none" || fill === paper) continue
    if (area(el) <= MARK_AREA || inIcon(el)) continue
    if (DATA_SHAPES[type]?.(el, ctx)) continue
    found.push(el.outerHTML.slice(0, 160))
  }
  return found
}

/**
 * A rounded corner that is a symbol, not a card: the device a screenshot
 * sits in, and a flowchart's start and end, whose rounded ends say so.
 */
const ROUNDED_SYMBOLS: Record<string, (el: Element) => boolean> = {
  device_mockup: () => true,
  flowchart: (el) => el.getAttribute("rx") === "20" && paintedFill(el) !== "none",
}

/** A part of an icon glyph (`render/icons.tsx` draws each one scaled in a group). */
function inIcon(el: Element): boolean {
  for (let g = el.parentElement; g; g = g.parentElement) {
    if (/scale\(/.test(g.getAttribute("transform") ?? "")) return true
  }
  return false
}

function rounded(markup: string, type: string): string[] {
  const doc = new DOMParser().parseFromString(markup, "image/svg+xml")
  return [...doc.querySelectorAll("rect")]
    .filter((el) => Number(el.getAttribute("rx") ?? "0") > 0 && !inIcon(el) && !plotMark(el) && !ROUNDED_SYMBOLS[type]?.(el))
    .map((el) => el.outerHTML.slice(0, 160))
}

describe("the surfaces token", () => {
  it("is off unless a theme declares ruled", () => {
    expect(isRuled(boundThemeCtx("brief"))).toBe(false)
    expect(isRuled({ shape: { surfaces: "filled" } })).toBe(false)
    expect(isRuled({ shape: { surfaces: "ruled" } })).toBe(true)
  })
})

describe("a ruled theme sets every shared component as print", () => {
  for (const [type, build] of Object.entries(COMPONENT_BUILDERS)) {
    if (ALL_DATA.has(type)) continue
    it(`${type}: no filled card, cell, node or disc, no rounded corner, words on the paper legible`, () => {
      const component = build(LEXICONS.zh)
      const ctx = ruledCtx(component)
      const markup = page(component, ctx)
      expect(filledFurniture(markup, type, ctx)).toEqual([])
      expect(rounded(markup, type)).toEqual([])
      expect(findContrastIssues(markup)).toEqual([])
    })
  }
})

describe("a ruled face with no photograph", () => {
  // The ring that stands for a person is a mark, not a divider: drawn in the
  // hairline it sat at 1.35:1 on white and the roster read as blank space.
  for (const type of ["people_cards", "quote_wall"] as const) {
    it(`${type}: draws each face's ring in an ink that reads as a graphic`, () => {
      const component = COMPONENT_BUILDERS[type]!(LEXICONS.zh)
      const ctx = ruledCtx(component)
      const doc = new DOMParser().parseFromString(page(component, ctx), "image/svg+xml")
      const rings = [...doc.querySelectorAll("circle")].filter((c) => c.getAttribute("fill") === "none")
      expect(rings.length).toBeGreaterThan(0)
      for (const ring of rings) {
        expect(contrastRatio(ring.getAttribute("stroke")!, ctx.defaultBg ?? ctx.colors.bg)).toBeGreaterThanOrEqual(3)
      }
    })
  }
})

describe("a ruled figure with nothing inside it", () => {
  // A ring of a layered model or a wedge of a wheel is only its outline,
  // its label out on a leader line. Drawn in the hairline it all but
  // vanished: on memo's notepaper the hairline reads at 1.18:1.
  const outlines: Record<string, string> = { rings: "circle", segmented_wheel: "path" }
  for (const [type, tag] of Object.entries(outlines)) {
    it(`${type}: draws every outline in an ink that reads as a graphic`, () => {
      const component = COMPONENT_BUILDERS[type]!(LEXICONS.zh)
      const ctx = ruledCtx(component)
      const doc = new DOMParser().parseFromString(page(component, ctx), "image/svg+xml")
      const shapes = [...doc.querySelectorAll(tag)].filter((el) => el.getAttribute("fill") === "none" && el.getAttribute("stroke"))
      expect(shapes.length).toBeGreaterThan(1)
      for (const shape of shapes) {
        expect(contrastRatio(shape.getAttribute("stroke")!, ctx.defaultBg ?? ctx.colors.bg)).toBeGreaterThanOrEqual(3)
      }
    })
  }
})
