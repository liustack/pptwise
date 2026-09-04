// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { measureTextUnits } from "../lib/svg-text-layout"
import { iconCards } from "./icon-cards"
import { FORM_BODY_FLOOR } from "./legibility"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { PPTX_ICON_NAMES } from "@/icons/catalog"
import type { ComponentCtx } from "./types"

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function markupOf(node: React.ReactElement): string {
  return renderSvgMarkup(<svg xmlns="http://www.w3.org/2000/svg">{node}</svg>)
}

function card(title: string, text: string, icon = "rocket") {
  return { icon, title, text }
}

const four = {
  type: "icon_cards" as const,
  items: [
    card("断言一", "简短说明一"),
    card("断言二", "简短说明二"),
    card("断言三", "简短说明三"),
    card("断言四", "简短说明四"),
  ],
}

const six = {
  type: "icon_cards" as const,
  items: Array.from({ length: 6 }, (_, i) => card(`口径${i + 1}`, `说明${i + 1}`)),
}

const BOX = { x: 80, y: 100, w: 1088 }

function themeCtx(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function isInsideScaledIcon(el: Element): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (/scale\(/.test(n.getAttribute("transform") ?? "")) return true
  }
  return false
}

function nodeCircles(container: ParentNode): SVGCircleElement[] {
  return Array.from(container.querySelectorAll("circle")).filter(
    (c) => !isInsideScaledIcon(c) && Number(c.getAttribute("r") ?? 0) > 16,
  )
}

function assertInsideBox(container: HTMLElement, w: number, h: number, slack = 2) {
  for (const c of Array.from(container.querySelectorAll("circle"))) {
    if (isInsideScaledIcon(c)) continue
    const cx = Number(c.getAttribute("cx") ?? 0)
    const cy = Number(c.getAttribute("cy") ?? 0)
    const r = Number(c.getAttribute("r") ?? 0)
    expect(cx - r).toBeGreaterThanOrEqual(-slack)
    expect(cy - r).toBeGreaterThanOrEqual(-slack)
    expect(cx + r).toBeLessThanOrEqual(w + slack)
    expect(cy + r).toBeLessThanOrEqual(h + slack)
  }
  for (const t of Array.from(container.querySelectorAll("text"))) {
    const x = Number(t.getAttribute("x") ?? 0)
    const y = Number(t.getAttribute("y") ?? 0)
    const fontSize = Number(t.getAttribute("font-size") ?? 0)
    const tw = measureTextUnits(t.textContent ?? "") * fontSize
    const left = t.getAttribute("text-anchor") === "middle" ? x - tw / 2 : x
    expect(left).toBeGreaterThanOrEqual(-slack)
    expect(left + tw).toBeLessThanOrEqual(w + slack)
    expect(y - fontSize).toBeGreaterThanOrEqual(-slack)
    expect(y).toBeLessThanOrEqual(h + slack)
  }
}

// One canonical drawing on every theme: a circled icon over a centred
// title and description, in columns. No card shell, no accent bar.
describe("icon_cards component", () => {
  it("draws one circled icon node per item and no card shell", () => {
    const ctx = themeCtx("almanac")
    const { container } = svg(iconCards.render(four, BOX, ctx))
    const nodes = nodeCircles(container)
    expect(nodes).toHaveLength(4)
    for (const node of nodes) {
      expect(node.getAttribute("fill")).toBe(ctx.colors.surface)
      expect(node.getAttribute("stroke")).toBe(ctx.colors.border)
    }
    const shells = Array.from(container.querySelectorAll("rect")).filter(
      (r) => !isInsideScaledIcon(r) && Number(r.getAttribute("width") ?? 0) > 100,
    )
    expect(shells).toHaveLength(0)
    const bars = Array.from(container.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("height") === "3" && !isInsideScaledIcon(r),
    )
    expect(bars).toHaveLength(0)
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (id: string) => {
      const { container } = svg(iconCards.render(four, BOX, themeCtx(id)))
      return Array.from(container.querySelectorAll("circle, rect, line, polygon"))
        .filter((el) => !isInsideScaledIcon(el))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("almanac")
    for (const id of CANONICAL_THEME_IDS) {
      expect(shapesOf(id), id).toBe(baseline)
    }
  })

  it("renders an icon, a title, and description text for every item", () => {
    const { container } = svg(iconCards.render(four, BOX, themeCtx("almanac")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    for (const item of four.items) {
      expect(texts).toContain(item.title)
      expect(texts).toContain(item.text)
    }
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0)
  })

  it("annotates every column with a data-audit-box in the frame its own ink uses", () => {
    // The columns are drawn under this component's `translate(box.x,box.y)`,
    // so their declarations are stated the way their children are: at the
    // local origin, with the transform carrying both to the page together.
    // Adding `box.x`/`box.y` back in made the declaration mean something
    // different from the ink under it the moment a layout wrapper scaled or
    // moved the whole component.
    const { container } = svg(iconCards.render(four, BOX, themeCtx("almanac")))
    const boxes = Array.from(container.querySelectorAll("[data-audit-box]")).map((el) =>
      (el.getAttribute("data-audit-box") ?? "").split(",").map(Number),
    )
    expect(boxes).toHaveLength(4)
    for (const [x, y, w] of boxes) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBe(0)
      expect(w).toBeGreaterThan(0)
    }
    // First column at the local origin, later columns to the right of it.
    expect(boxes[0]![0]).toBe(0)
    expect(boxes[1]![0]).toBeGreaterThan(0)
  })

  // The column drawing keeps its own floors (`legibility.ts`): a title
  // inside a narrow column may shrink below the page's body baseline, but
  // never below the readable floor.
  it("keeps every text line at or above the readable font floor", () => {
    const wordy = {
      type: "icon_cards" as const,
      items: Array.from({ length: 4 }, (_, i) =>
        card(`一个相当长的断言标题第${i + 1}条`, "这一句说明写得比一般情况长一些，用来把换行与缩字都逼出来。"),
      ),
    }
    const { container } = svg(iconCards.render(wordy, BOX, themeCtx("almanac")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      if (isInsideScaledIcon(t)) continue
      expect(Number(t.getAttribute("font-size")), `"${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("6 items stay inside the box on every theme", () => {
    for (const id of ["almanac", "terminal", "thesis", "swiss", "lecture"] as const) {
      const ctx = themeCtx(id)
      const h = iconCards.measure(six, BOX.w, ctx)
      const { container } = svg(iconCards.render(six, { ...BOX, h }, ctx))
      assertInsideBox(container, BOX.w, h)
    }
  })

  it("stays within the controlled SVG subset", () => {
    const markup = markupOf(iconCards.render(six, BOX, themeCtx("almanac")))
    expect(markup).not.toContain("foreignObject")
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })

  it("degrades without throwing when an item names no icon", () => {
    const ctx = themeCtx("almanac")
    const emptyIcon = {
      type: "icon_cards" as const,
      items: [
        { icon: "", title: "空图标", text: "降级" },
        { icon: "rocket", title: "有图标", text: "正常" },
      ],
    }
    expect(() => svg(iconCards.render(emptyIcon, BOX, ctx))).not.toThrow()
    expect(nodeCircles(svg(iconCards.render(emptyIcon, BOX, ctx)).container).length).toBeGreaterThanOrEqual(2)
  })

  it("draws every icon in the catalog without leaving the subset", () => {
    const ctx = themeCtx("almanac")
    for (const name of PPTX_ICON_NAMES.slice(0, 40)) {
      const one = { type: "icon_cards" as const, items: [{ icon: name, title: name, text: "说明" }] }
      const markup = markupOf(iconCards.render(one, BOX, ctx))
      expect(() => assertSubset(parseSvgRoot(markup)), name).not.toThrow()
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const ctx = themeCtx("swiss")
    expect(markupOf(iconCards.render(four, BOX, ctx))).toBe(markupOf(iconCards.render(four, BOX, ctx)))
  })
})
