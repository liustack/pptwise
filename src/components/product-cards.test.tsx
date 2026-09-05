// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { contrastRatio } from "../render/ink"
import { productCards } from "./product-cards"
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
    "shot-1": { src: "data:image/png;base64,AAAA", alt: "Workbench screen" },
    "shot-2": { src: "data:image/png;base64,BBBB" },
    "shot-3": { src: "data:image/png;base64,CCCC" },
  },
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

/** Each card's own shell rect — the first rect inside its group. */
function shells(container: HTMLElement): SVGRectElement[] {
  return Array.from(container.querySelectorAll("g[data-audit-box]")).map(
    (card) => card.querySelector("rect")! as SVGRectElement,
  )
}

const box = { x: 0, y: 0, w: 1104 }

const three = {
  type: "product_cards" as const,
  items: [
    { asset_id: "shot-1", name: "客户成功工作台", note: "续约看板与行动清单合在一屏", price: "¥68", price_unit: "席位 / 月" },
    { asset_id: "shot-2", name: "集成中枢", note: "预置四十六个业务系统连接器", price: "¥12万", price_unit: "起 / 年", featured: true as const },
    { asset_id: "shot-3", name: "数据洞察包", note: "按周推送经营简报", price: "¥8万", price_unit: "起 / 年" },
  ],
}

describe("product_cards component", () => {
  it("draws one picture, one name, one note and one price per card", () => {
    const { container } = svg(productCards.render(three, box, ctx))
    expect(container.querySelectorAll("image")).toHaveLength(3)
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toContain("客户成功工作台")
    expect(texts).toContain("¥12万")
    expect(texts).toContain("席位 / 月")
  })

  it("crops each picture to its card and labels it", () => {
    const { container } = svg(productCards.render(three, box, ctx))
    const images = Array.from(container.querySelectorAll("image"))
    for (const image of images) expect(image.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice")
    expect(images[0]!.getAttribute("aria-label")).toBe("Workbench screen")
    // No alt on the asset falls back to the item's own name.
    expect(images[1]!.getAttribute("aria-label")).toBe("集成中枢")
  })

  it("fills the featured card whole and sets its text to read against that fill", () => {
    const { container } = svg(productCards.render(three, box, ctx))
    const fills = shells(container).map((r) => r.getAttribute("fill"))
    expect(fills).toEqual([ctx.colors.surface, ctx.colors.primary, ctx.colors.surface])
    const featured = container.querySelectorAll("g[data-audit-box]")[1]!
    const name = Array.from(featured.querySelectorAll("text")).find((t) => t.textContent === "集成中枢")!
    expect(contrastRatio(name.getAttribute("fill")!, ctx.colors.primary)).toBeGreaterThan(4.5)
  })

  it("paints no badge, bar, or ornament on any card edge", () => {
    const { container } = svg(productCards.render(three, box, ctx))
    for (const card of Array.from(container.querySelectorAll("g[data-audit-box]"))) {
      const rects = Array.from(card.querySelectorAll("rect"))
      // shell + the hairline over the price. Nothing else is ever painted.
      expect(rects).toHaveLength(2)
      expect(rects.every((r) => r.getAttribute("fill") !== ctx.colors.accent)).toBe(true)
    }
  })

  it("gives every card the same height so the price lines align", () => {
    const uneven = {
      type: "product_cards" as const,
      items: [
        { asset_id: "shot-1", name: "A", note: "一行很短", price: "¥1" },
        { asset_id: "shot-2", name: "B", note: "这一行长得多，会折成两行来占更多高度", price: "¥2" },
      ],
    }
    const { container } = svg(productCards.render(uneven, box, ctx))
    const heights = new Set(shells(container).map((r) => r.getAttribute("height")))
    expect(heights.size).toBe(1)
  })

  it("marks a missing asset instead of drawing stand-in art", () => {
    const component = {
      type: "product_cards" as const,
      items: [
        { asset_id: "not-in-the-deck", name: "A" },
        { asset_id: "shot-2", name: "B" },
      ],
    }
    const { container } = svg(productCards.render(component, box, ctx))
    expect(container.querySelectorAll("image")).toHaveLength(1)
    const dropped = container.querySelector("[data-dropped]")!
    expect(dropped.getAttribute("data-dropped")).toBe("asset")
    // Nothing is invented in its place: no fake screen, no label.
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["A", "B"])
  })

  it("measures the height it draws", () => {
    const measured = productCards.measure(three, box.w, ctx)
    const { container } = svg(productCards.render(three, box, ctx))
    expect(Number(shells(container)[0]!.getAttribute("height"))).toBe(measured)
  })

  it("shrinks then marks a name that cannot fit its card", () => {
    const component = {
      type: "product_cards" as const,
      items: [
        { asset_id: "shot-1", name: "A product name far too long for a narrow card to hold in one line" },
        { asset_id: "shot-2", name: "B" },
      ],
    }
    const { container } = svg(productCards.render(component, { x: 0, y: 0, w: 420 }, ctx))
    expect(container.querySelector("text")!.getAttribute("data-truncated")).toBe("1")
  })

  it("stays inside the exported SVG subset and renders deterministically", () => {
    const markup = renderToStaticMarkup(<svg viewBox="0 0 1280 720">{productCards.render(three, { x: 88, y: 120, w: 1104 }, ctx)}</svg>)
    expect(markup).toBe(
      renderToStaticMarkup(<svg viewBox="0 0 1280 720">{productCards.render(three, { x: 88, y: 120, w: 1104 }, ctx)}</svg>),
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
