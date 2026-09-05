// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { contrastRatio } from "../render/ink"
import { quoteWall } from "./quote-wall"
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
  type: "quote_wall" as const,
  quotes: [
    { text: "开通从九周压到五周，最直接的变化是销售敢在合同里写上线日期了。", name: "宋海", role: "云觅科技 · 客户成功总监" },
    { text: "续约看板把要流失的客户提前六周推到我面前。", name: "李蔚", role: "星岚数据 · 运营负责人", featured: true as const },
    { text: "以前每周三个人手工拼报表，现在系统自己发。", name: "Zhao Qin", role: "汇通供应链 · 信息化经理" },
  ],
}

describe("quote_wall component", () => {
  it("draws each remark with its speaker's initials, name and role", () => {
    const { container } = svg(quoteWall.render(three, box, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toContain("宋海")
    expect(texts).toContain("云觅科技 · 客户成功总监")
    // A CJK name gives its surname character, a Latin name its two initials.
    expect(texts).toContain("宋")
    expect(texts).toContain("ZQ")
    expect(container.querySelectorAll("circle")).toHaveLength(3)
  })

  it("fills the featured card whole and sets its text to read against that fill", () => {
    const { container } = svg(quoteWall.render(three, box, ctx))
    expect(shells(container).map((r) => r.getAttribute("fill"))).toEqual([
      ctx.colors.surface,
      ctx.colors.primary,
      ctx.colors.surface,
    ])
    const featured = container.querySelectorAll("g[data-audit-box]")[1]!
    const name = Array.from(featured.querySelectorAll("text")).find((t) => t.textContent === "李蔚")!
    expect(contrastRatio(name.getAttribute("fill")!, ctx.colors.primary)).toBeGreaterThan(4.5)
    const body = Array.from(featured.querySelectorAll("text")).find((t) => t.textContent!.startsWith("续约"))!
    expect(contrastRatio(body.getAttribute("fill")!, ctx.colors.primary)).toBeGreaterThan(4.5)
  })

  it("never lets the accent colour carry text and paints no edge ornament", () => {
    const { container } = svg(quoteWall.render(three, box, ctx))
    for (const text of Array.from(container.querySelectorAll("text"))) {
      expect(text.getAttribute("fill")).not.toBe(ctx.colors.accent)
    }
    for (const card of Array.from(container.querySelectorAll("g[data-audit-box]"))) {
      // shell + the hairline over the speaker. Nothing else is ever painted.
      expect(card.querySelectorAll("rect")).toHaveLength(2)
    }
  })

  it("gives every card the same height so the speakers line up", () => {
    const uneven = {
      type: "quote_wall" as const,
      quotes: [
        { text: "很短。", name: "宋海" },
        { text: "这一句长得多，会折成好几行，把整张卡片撑得更高一些，另一张卡片必须跟着长高。", name: "李蔚" },
      ],
    }
    const { container } = svg(quoteWall.render(uneven, box, ctx))
    expect(new Set(shells(container).map((r) => r.getAttribute("height"))).size).toBe(1)
  })

  it("measures the height it draws", () => {
    const measured = quoteWall.measure(three, box.w, ctx)
    const { container } = svg(quoteWall.render(three, box, ctx))
    expect(Number(shells(container)[0]!.getAttribute("height"))).toBe(measured)
  })

  it("drops a column and grows a row rather than narrowing past a readable line", () => {
    const narrow = quoteWall.measure(three, 400, ctx)
    const wide = quoteWall.measure(three, 1104, ctx)
    expect(narrow).toBeGreaterThan(wide * 2)
    const { container } = svg(quoteWall.render(three, { x: 0, y: 0, w: 400 }, ctx))
    const xs = new Set(
      Array.from(container.querySelectorAll("g[data-audit-box]")).map(
        (g) => g.getAttribute("data-audit-box")!.split(",")[0],
      ),
    )
    expect(xs.size).toBe(1)
  })

  it("marks a remark it had to cut instead of dropping it silently", () => {
    const component = {
      type: "quote_wall" as const,
      quotes: [
        { text: "一句反复堆叠的长话，".repeat(12), name: "宋海" },
        { text: "短。", name: "李蔚" },
      ],
    }
    const { container } = svg(quoteWall.render(component, { x: 0, y: 0, w: 520 }, ctx))
    expect(container.querySelector("[data-truncated]")).not.toBeNull()
  })

  it("renders without a role line and keeps the avatar centred on the name", () => {
    const component = {
      type: "quote_wall" as const,
      quotes: [
        { text: "开通从九周压到五周。", name: "宋海" },
        { text: "报表现在系统自己发。", name: "李蔚" },
      ],
    }
    const { container } = svg(quoteWall.render(component, box, ctx))
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toEqual([
      "“", "开通从九周压到五周。", "宋", "宋海",
      "“", "报表现在系统自己发。", "李", "李蔚",
    ])
  })

  it("stays inside the exported SVG subset and renders deterministically", () => {
    const markup = renderToStaticMarkup(<svg viewBox="0 0 1280 720">{quoteWall.render(three, { x: 88, y: 120, w: 1104 }, ctx)}</svg>)
    expect(markup).toBe(
      renderToStaticMarkup(<svg viewBox="0 0 1280 720">{quoteWall.render(three, { x: 88, y: 120, w: 1104 }, ctx)}</svg>),
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

describe("quote_wall on a theme whose primary sits close to its surface", () => {
  // luxe: a near-black surface under a deep-brown primary. Filling the
  // featured card in primary there left all three cards looking the same,
  // which is the same failure as drawing no emphasis at all.
  const dark: ComponentCtx = {
    ...ctx,
    colors: { ...ctx.colors, bg: "#0B0A09", surface: "#171412", primary: "#241C15", text: "#F2EDE6" },
  }

  it("fills the featured card with the theme ink instead, so it still separates", () => {
    const component = {
      type: "quote_wall" as const,
      quotes: [
        { text: "开通从九周压到五周。", name: "宋海" },
        { text: "报表现在系统自己发。", name: "李蔚", featured: true as const },
      ],
    }
    const { container } = svg(quoteWall.render(component, box, dark))
    const fills = shells(container).map((r) => r.getAttribute("fill"))
    expect(fills).toEqual([dark.colors.surface, dark.colors.text])
    expect(contrastRatio(fills[1]!, dark.colors.surface)).toBeGreaterThan(3)
  })

  it("keeps the primary fill on a theme whose primary is a real change of ground", () => {
    const component = {
      type: "quote_wall" as const,
      quotes: [
        { text: "开通从九周压到五周。", name: "宋海" },
        { text: "报表现在系统自己发。", name: "李蔚", featured: true as const },
      ],
    }
    const { container } = svg(quoteWall.render(component, box, ctx))
    expect(shells(container)[1]!.getAttribute("fill")).toBe(ctx.colors.primary)
  })
})

describe("quote_wall speaker line", () => {
  it("wraps a two-part role rather than cutting the second part off", () => {
    const component = {
      type: "quote_wall" as const,
      quotes: [
        { text: "锦官立坊十年。", name: "顾锦官", role: "主理人 · 制衣三十年 · 锦官坊" },
        { text: "本夜到场来宾五十六位。", name: "秦绣娘", role: "首席绣娘 · 绣坊" },
      ],
    }
    const { container } = svg(quoteWall.render(component, { x: 0, y: 0, w: 560 }, ctx))
    const roleLines = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent!)
      .filter((t) => t.includes("主理人") || t.includes("锦官坊"))
    expect(roleLines.length).toBeGreaterThan(1)
    expect(roleLines.join("")).toContain("锦官坊")
  })
})

describe("quote_wall in a box it cannot draw in", () => {
  it("declines and declares rather than drawing the last card off the page", () => {
    const measured = quoteWall.measure(three, box.w, ctx)
    const { container } = svg(quoteWall.render(three, { ...box, h: measured - 40 }, ctx))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker.getAttribute("data-dropped")).toBe("1")
    expect(marker.getAttribute("data-dropped-kind")).toBe("component")
    expect(container.querySelectorAll("text")).toHaveLength(0)
    expect(container.querySelectorAll("circle")).toHaveLength(0)
  })

  it("draws in full at exactly its measured height, and above it", () => {
    const measured = quoteWall.measure(three, box.w, ctx)
    for (const h of [measured, measured + 120]) {
      const { container } = svg(quoteWall.render(three, { ...box, h }, ctx))
      expect(container.querySelector("[data-dropped]")).toBeNull()
      expect(container.querySelectorAll("circle")).toHaveLength(3)
    }
  })
})

describe("quote_wall speaker baseline", () => {
  it("puts every card's rule and speaker on one baseline, whatever the remark runs to", () => {
    const uneven = {
      type: "quote_wall" as const,
      quotes: [
        { text: "很短。", name: "宋海", role: "客户成功总监" },
        {
          text: "这一句长得多，会折成好几行，把这张卡的正文占满，另一张卡的署名仍然要和它齐平。",
          name: "李蔚",
          role: "运营负责人",
        },
        { text: "中等长度的一句话，两行左右。", name: "赵沁", role: "信息化经理" },
      ],
    }
    const { container } = svg(quoteWall.render(uneven, box, ctx))
    const cards = Array.from(container.querySelectorAll("g[data-audit-box]"))
    const nameYs = cards.map(
      (card, i) =>
        Array.from(card.querySelectorAll("text")).find((t) => t.textContent === uneven.quotes[i]!.name)!.getAttribute("y"),
    )
    expect(new Set(nameYs).size).toBe(1)
    const ruleYs = cards.map((card) => Array.from(card.querySelectorAll("rect"))[1]!.getAttribute("y"))
    expect(new Set(ruleYs).size).toBe(1)
  })
})
