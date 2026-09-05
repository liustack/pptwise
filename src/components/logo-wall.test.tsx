// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { logoWall } from "./logo-wall"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#F7F6F2",
    surface: "#FFFFFF",
    primary: "#1E2A4A",
    accent: "#F5C518",
    text: "#1C1E23",
    muted: "#5B6069",
    border: "#DDDCD4",
    chartPalette: ["#1E2A4A", "#F5C518"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
  images: {
    "logo-a": { src: "data:image/png;base64,AAAA", alt: "Yunmi" },
    "logo-b": { src: "data:image/png;base64,BBBB" },
  },
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `Org ${i + 1}`)
const comp = (n: number, overrides: Record<string, unknown> = {}) => ({
  type: "logo_wall" as const,
  items: names(n).map((name) => ({ name })),
  ...overrides,
})

const box = { x: 0, y: 0, w: 1104 }

describe("logo_wall component", () => {
  it("sets one wordmark per organization when no item carries an asset", () => {
    const { container } = svg(logoWall.render(comp(12), box, ctx))
    const texts = Array.from(container.querySelectorAll("text"))
    expect(texts).toHaveLength(12)
    expect(texts.map((t) => t.textContent)).toEqual(names(12))
    expect(container.querySelectorAll("image")).toHaveLength(0)
  })

  it("draws an item's asset as a picture and keeps the name as its label", () => {
    const component = {
      type: "logo_wall" as const,
      items: [
        { name: "Yunmi", asset_id: "logo-a" },
        { name: "Xinglan", asset_id: "logo-b" },
        { name: "Huitong" },
        { name: "Mingyuan" },
      ],
    }
    const { container } = svg(logoWall.render(component, box, ctx))
    const images = Array.from(container.querySelectorAll("image"))
    expect(images).toHaveLength(2)
    expect(images[0]!.getAttribute("aria-label")).toBe("Yunmi")
    // A mark is never cropped: it is fitted whole inside its tile.
    for (const image of images) expect(image.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet")
    // The two items without an asset fall back to their own wordmark.
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toEqual([
      "Huitong",
      "Mingyuan",
    ])
  })

  it("falls back to the wordmark when the asset id resolves to nothing", () => {
    const component = {
      type: "logo_wall" as const,
      items: [
        { name: "Yunmi", asset_id: "not-in-the-deck" },
        { name: "Xinglan" },
        { name: "Huitong" },
        { name: "Mingyuan" },
      ],
    }
    const { container } = svg(logoWall.render(component, box, ctx))
    expect(container.querySelectorAll("image")).toHaveLength(0)
    expect(container.querySelectorAll("text")).toHaveLength(4)
  })

  it("gives every tile the same width and every wordmark the same size", () => {
    const { container } = svg(logoWall.render(comp(12), box, ctx))
    const boxes = Array.from(container.querySelectorAll("g[data-audit-box]")).map(
      (g) => g.getAttribute("data-audit-box")!.split(",").map(Number),
    )
    const widths = new Set(boxes.map((b) => b[2]))
    expect(widths.size).toBe(1)
    const sizes = new Set(Array.from(container.querySelectorAll("text")).map((t) => t.getAttribute("font-size")))
    expect(sizes.size).toBe(1)
  })

  it("draws one hairline between rows and nothing around a tile", () => {
    const { container } = svg(logoWall.render(comp(12), box, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    // 3 rows of 4 → two row rules, and no tile ever gets a frame of its own.
    expect(rects).toHaveLength(2)
    for (const rect of rects) {
      expect(Number(rect.getAttribute("width"))).toBe(box.w)
      expect(Number(rect.getAttribute("height"))).toBe(1)
      expect(rect.getAttribute("fill")).toBe(ctx.colors.border)
    }
  })

  it("centres an underfull last row", () => {
    const { container } = svg(logoWall.render(comp(7), box, ctx))
    const boxes = Array.from(container.querySelectorAll("g[data-audit-box]")).map(
      (g) => g.getAttribute("data-audit-box")!.split(",").map(Number),
    )
    const lastRow = boxes.slice(4)
    expect(lastRow).toHaveLength(3)
    const rowLeft = lastRow[0]![0]!
    const rowRight = lastRow[2]![0]! + lastRow[2]![2]!
    expect(Math.abs(rowLeft - (box.w - rowRight))).toBeLessThan(1)
  })

  it("measures the height it actually draws, at every legal count", () => {
    for (let n = 4; n <= 12; n += 1) {
      const component = comp(n)
      const measured = logoWall.measure(component, box.w, ctx)
      const { container } = svg(logoWall.render(component, box, ctx))
      const bottom = Math.max(
        ...Array.from(container.querySelectorAll("g[data-audit-box]")).map((g) => {
          const [, y] = g.getAttribute("data-audit-box")!.split(",").map(Number)
          return y! + 80
        }),
      )
      expect(bottom).toBeLessThanOrEqual(measured)
    }
  })

  it("reserves a band for the optional title and costs nothing without one", () => {
    const withTitle = logoWall.measure(comp(8, { title: "Customers" }), box.w, ctx)
    const without = logoWall.measure(comp(8), box.w, ctx)
    expect(withTitle).toBeGreaterThan(without)
    const { container } = svg(logoWall.render(comp(8, { title: "Customers" }), box, ctx))
    expect(container.querySelector("text")!.textContent).toBe("Customers")
  })

  it("shrinks then marks a name that cannot fit its tile", () => {
    const long = "A ludicrously long organisation name that no tile holds"
    const component = { type: "logo_wall" as const, items: [{ name: long }, ...names(3).map((name) => ({ name }))] }
    const { container } = svg(logoWall.render(component, { x: 0, y: 0, w: 320 }, ctx))
    const first = container.querySelector("text")!
    expect(first.getAttribute("data-truncated")).toBe("1")
    expect(first.textContent!.length).toBeLessThan(long.length)
  })

  it("stays inside the exported SVG subset and renders deterministically", () => {
    const component = comp(12, { title: "Customers" })
    const markup = renderToStaticMarkup(<svg viewBox="0 0 1280 720">{logoWall.render(component, { x: 88, y: 120, w: 1104 }, ctx)}</svg>)
    expect(markup).toBe(
      renderToStaticMarkup(<svg viewBox="0 0 1280 720">{logoWall.render(component, { x: 88, y: 120, w: 1104 }, ctx)}</svg>),
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

describe("logo_wall in a box it cannot draw in", () => {
  it("declines and declares rather than squashing a row", () => {
    const component = comp(12)
    const measured = logoWall.measure(component, box.w, ctx)
    const { container } = svg(logoWall.render(component, { ...box, h: measured - 40 }, ctx))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker.getAttribute("data-dropped")).toBe("1")
    expect(marker.getAttribute("data-dropped-kind")).toBe("component")
    // Nothing is painted through: no half wall, no shrunken tiles.
    expect(container.querySelectorAll("text")).toHaveLength(0)
    expect(container.querySelectorAll("rect")).toHaveLength(0)
  })

  it("draws in full at exactly its measured height, and above it", () => {
    const component = comp(12)
    const measured = logoWall.measure(component, box.w, ctx)
    for (const h of [measured, measured + 120]) {
      const { container } = svg(logoWall.render(component, { ...box, h }, ctx))
      expect(container.querySelector("[data-dropped]")).toBeNull()
      expect(container.querySelectorAll("text")).toHaveLength(12)
    }
  })
})
