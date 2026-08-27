// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { accessibleInk } from "../render/ink"
import { tagRow } from "./tag-row"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#FFFFFF",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const tags = (n: number) => Array.from({ length: n }, (_, i) => `Tag${i + 1}`)
const comp = (items: string[], overrides: Record<string, unknown> = {}) => ({
  type: "tag_row" as const,
  items,
  ...overrides,
})

describe("tag_row component", () => {
  it("renders one outlined chip (rect) and one label (text) per tag, never a capsule", () => {
    const { container } = svg(tagRow.render(comp(tags(6)), { x: 20, y: 20, w: 1000 }, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    const texts = Array.from(container.querySelectorAll("text"))
    expect(rects.length).toBe(6)
    expect(texts.length).toBe(6)
    for (const r of rects) {
      expect(Number(r.getAttribute("rx"))).toBe(2)
      expect(r.getAttribute("fill")).toBe("none")
      expect(r.getAttribute("stroke")).toBeTruthy()
    }
  })

  it("default (no emphasis): every chip is a hairline frame + text ink, no solid fill", () => {
    const { container } = svg(tagRow.render(comp(tags(4)), { x: 0, y: 0, w: 1000 }, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    const texts = Array.from(container.querySelectorAll("text"))
    for (const r of rects) {
      expect(r.getAttribute("fill")).toBe("none")
      expect(r.getAttribute("stroke")).not.toBe(ctx.colors.accent)
    }
    for (const t of texts) expect(t.getAttribute("fill")).toBe(ctx.colors.text)
  })

  it('emphasis "first": only the first chip uses primary ink, the rest stay text-on-page', () => {
    const { container } = svg(
      tagRow.render(comp(tags(4), { emphasis: "first" }), { x: 0, y: 0, w: 1000 }, ctx),
    )
    const rects = Array.from(container.querySelectorAll("rect"))
    const texts = Array.from(container.querySelectorAll("text"))
    const emphInk = accessibleInk(ctx.colors.primary, ctx.colors.bg, 16)
    expect(rects[0].getAttribute("fill")).toBe("none")
    expect(rects[0].getAttribute("stroke")).toBe(ctx.colors.primary)
    expect(texts[0].getAttribute("fill")).toBe(emphInk)
    for (let i = 1; i < rects.length; i++) {
      expect(rects[i].getAttribute("fill")).toBe("none")
      expect(rects[i].getAttribute("stroke")).not.toBe(ctx.colors.primary)
      expect(texts[i].getAttribute("fill")).toBe(ctx.colors.text)
    }
  })

  it("flow-wraps: a fixed set of tags needs more height in a narrow column than a wide one", () => {
    const wide = tagRow.measure(comp(tags(12)), 1200, ctx)
    const narrow = tagRow.measure(comp(tags(12)), 360, ctx)
    // More rows fit fewer pills each → the narrow column is taller.
    expect(narrow).toBeGreaterThan(wide)
    // And a single row of a couple of tags is shorter than 12 wrapped ones.
    expect(tagRow.measure(comp(tags(2)), 1200, ctx)).toBeLessThan(narrow)
  })

  it("measures a CJK/Latin-mixed tag with real per-character width (no under/over-estimate wrap crash)", () => {
    const mixed = ["基于 Kubernetes", "分布式事务", "StatefulSet v2.3", "灰度发布"]
    const { container } = svg(tagRow.render(comp(mixed), { x: 0, y: 0, w: 1000 }, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    // Wide row → nothing truncated, each label survives intact.
    expect(texts).toEqual(mixed)
    expect(Array.from(container.querySelectorAll("text")).every((t) => !t.getAttribute("data-truncated"))).toBe(true)
  })

  it("truncates a single tag wider than the whole row instead of overflowing it", () => {
    const long = "abcdefghijklmnopqrstuvwxyz-abcdefghijklmnopqrstuvwxyz"
    const { container } = svg(tagRow.render(comp([long, "ok"]), { x: 0, y: 0, w: 160 }, ctx))
    const truncated = Array.from(container.querySelectorAll("text")).find((t) => t.getAttribute("data-truncated") === "1")
    expect(truncated).toBeTruthy()
    expect(truncated!.textContent).not.toContain("…")
    expect((truncated!.textContent ?? "").length).toBeLessThan(long.length)
  })

  it("renders an optional overall title above the row, omitting it entirely when unset", () => {
    const withTitle = svg(tagRow.render(comp(tags(4), { title: "Tech stack" }), { x: 0, y: 0, w: 1000 }, ctx))
    expect(Array.from(withTitle.container.querySelectorAll("text")).some((t) => t.textContent === "Tech stack")).toBe(true)
    // With a title, text count = pills + 1.
    expect(withTitle.container.querySelectorAll("text").length).toBe(5)
    const noTitle = svg(tagRow.render(comp(tags(4)), { x: 0, y: 0, w: 1000 }, ctx))
    expect(noTitle.container.querySelectorAll("text").length).toBe(4)
  })

  it("is deterministic — the same IR renders byte-identical SVG markup on repeat calls", () => {
    const c = comp(tags(16), { title: "标签", emphasis: "first" })
    const box = { x: 60, y: 60, w: 900 }
    const a = renderToStaticMarkup(<svg>{tagRow.render(c, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{tagRow.render(c, box, ctx)}</svg>)
    expect(a).toBe(b)
  })

  it("stays inside the controlled SVG element subset (no foreignObject/nested svg/gradient)", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{tagRow.render(comp(tags(16)), { x: 40, y: 40, w: 1200 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })

  it("passes the overflow auditor at the schema min (2) and max (16) tag counts", () => {
    for (const n of [2, 16]) {
      const markup = renderToStaticMarkup(
        <svg viewBox="0 0 1280 720">{tagRow.render(comp(tags(n)), { x: 40, y: 40, w: 1200 }, ctx)}</svg>,
      )
      expect(auditSvgMarkup(markup)).toEqual([])
    }
  })
})

function pillOrigins(container: HTMLElement) {
  return Array.from(container.querySelectorAll("rect")).map((rect) => {
    const group = rect.parentElement!
    const match = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(group.getAttribute("transform") ?? "")
    return {
      x: match ? Number(match[1]) : 0,
      y: match ? Number(match[2]) : 0,
      h: Number(rect.getAttribute("height")),
    }
  })
}

describe("tag_row breathing room", () => {
  it("splits the title band so the gap under the title is at least 24px of sibling air", () => {
    const { container } = svg(
      tagRow.render(comp(tags(4), { title: "Tech stack" }), { x: 0, y: 0, w: 1000 }, ctx),
    )
    const title = Array.from(container.querySelectorAll("text")).find((node) => node.textContent === "Tech stack")!
    const titleY = Number(title.getAttribute("y"))
    const firstPillTop = Math.min(...pillOrigins(container).map((pill) => pill.y))
    expect(firstPillTop - titleY).toBeGreaterThanOrEqual(24)
  })

  it("widens wrapped row gaps past the old 8px crush", () => {
    const { container } = svg(tagRow.render(comp(tags(12)), { x: 0, y: 0, w: 360 }, ctx))
    const pills = pillOrigins(container)
    const rows = [...new Set(pills.map((pill) => pill.y))].sort((a, b) => a - b)
    expect(rows.length).toBeGreaterThan(1)
    expect(rows[1]! - rows[0]! - pills[0]!.h).toBeGreaterThanOrEqual(12)
  })

  it("reserves air under the last pill row so measure() is not flush with the capsules", () => {
    const c = comp(tags(4), { title: "Tech stack" })
    const measured = tagRow.measure(c, 1000, ctx)
    const { container } = svg(tagRow.render(c, { x: 0, y: 0, w: 1000 }, ctx))
    const lastBottom = Math.max(...pillOrigins(container).map((pill) => pill.y + pill.h))
    expect(measured - lastBottom).toBeGreaterThanOrEqual(12)
  })

  it("keeps schema-max ordinary tags inside a content-rect height with no ellipsis and no clip", () => {
    const items = Array.from({ length: 16 }, (_, i) => `标签${i + 1}`)
    const c = comp(items, { title: "能力标签" })
    const measured = tagRow.measure(c, 1088, ctx)
    expect(measured).toBeLessThanOrEqual(400)
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{tagRow.render(c, { x: 96, y: 206, w: 1088 }, ctx)}</svg>,
    )
    expect(markup).not.toContain("…")
    expect(markup).not.toMatch(/(?<![.])\.\.\.(?![.])/)
    expect(markup).not.toContain('data-truncated="1"')
    expect(auditSvgMarkup(markup)).toEqual([])
    const { container } = svg(tagRow.render(c, { x: 0, y: 0, w: 1088 }, ctx))
    const labels = Array.from(container.querySelectorAll("text"))
      .map((node) => node.textContent)
      .filter((text) => text !== "能力标签")
    expect(labels).toEqual(items)
  })
})
