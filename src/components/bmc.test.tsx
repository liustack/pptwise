// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { bmc } from "./bmc"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#F7F7F2",
    surface: "#FFFFFF",
    primary: "#051C2C",
    accent: "#FFC72C",
    text: "#051C2C",
    muted: "#6C6C6C",
    chartPalette: ["#051C2C", "#FFC72C"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24, // balanced default — this suite doesn't exercise body-text sizing
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const basic = {
  type: "bmc" as const,
  key_partners: ["核心供应商", "渠道伙伴"],
  key_activities: ["产品研发"],
  key_resources: ["工程团队"],
  value_propositions: ["一站式解决方案", "更低的总拥有成本"],
  customer_relationships: ["专属客户成功经理"],
  channels: ["直销团队", "合作伙伴分销"],
  customer_segments: ["中型企业客户"],
  cost_structure: ["研发投入", "云基础设施"],
  revenue_streams: ["订阅费", "实施服务费"],
}

describe("bmc component", () => {
  it("renders exactly 9 block panels (one rect per named block)", () => {
    const { container } = svg(bmc.render(basic, { x: 40, y: 60, w: 1088 }, ctx))
    expect(container.querySelectorAll("rect")).toHaveLength(9)
  })

  it("renders every item across all nine blocks", () => {
    const { container } = svg(bmc.render(basic, { x: 0, y: 0, w: 1088 }, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    const allItems = [
      ...basic.key_partners,
      ...basic.key_activities,
      ...basic.key_resources,
      ...basic.value_propositions,
      ...basic.customer_relationships,
      ...basic.channels,
      ...basic.customer_segments,
      ...basic.cost_structure,
      ...basic.revenue_streams,
    ]
    for (const item of allItems) expect(texts).toContain(item)
  })

  it("only value_propositions is tinted — the other 8 blocks stay plain colors.surface", () => {
    const { container } = svg(bmc.render(basic, { x: 0, y: 0, w: 1088 }, ctx))
    const fills = Array.from(container.querySelectorAll("rect")).map((r) => r.getAttribute("fill"))
    const flat = fills.filter((f) => f === ctx.colors.surface)
    const tinted = fills.filter((f) => f !== ctx.colors.surface)
    expect(flat).toHaveLength(8)
    expect(tinted).toHaveLength(1)
  })

  it("cost_structure and revenue_streams split the bottom band 50/50", () => {
    const { container } = svg(bmc.render(basic, { x: 40, y: 60, w: 1088 }, ctx))
    const rects = Array.from(container.querySelectorAll("rect"))
    // The bottom-band pair share the same y (topBandH+GAP) and same width,
    // and together span the full content width (minus the one gap between them).
    const sorted = [...rects].sort((a, b) => Number(b.getAttribute("y")) - Number(a.getAttribute("y")))
    const bottomY = sorted[0].getAttribute("y")
    const bottomRow = rects.filter((r) => r.getAttribute("y") === bottomY)
    expect(bottomRow).toHaveLength(2)
    expect(Number(bottomRow[0].getAttribute("width"))).toBeCloseTo(Number(bottomRow[1].getAttribute("width")))
  })

  it("box.h stretches the canvas to fill the given height (no 1.7x cap)", () => {
    const natural = bmc.measure(basic, 1088, ctx)
    const shortRender = svg(bmc.render(basic, { x: 0, y: 0, w: 1088, h: natural }, ctx))
    const tallRender = svg(bmc.render(basic, { x: 0, y: 0, w: 1088, h: natural * 3 }, ctx))
    const shortTotalH = Math.max(
      ...Array.from(shortRender.container.querySelectorAll("rect")).map(
        (r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")),
      ),
    )
    const tallTotalH = Math.max(
      ...Array.from(tallRender.container.querySelectorAll("rect")).map(
        (r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")),
      ),
    )
    expect(tallTotalH).toBeGreaterThan(shortTotalH * 2)
  })

  it("measure()/render() are deterministic — same input, same output", () => {
    const a = bmc.measure(basic, 1088, ctx)
    const b = bmc.measure(basic, 1088, ctx)
    expect(a).toBe(b)
    const markupA = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{bmc.render(basic, { x: 0, y: 0, w: 1088 }, ctx)}</svg>,
    )
    const markupB = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{bmc.render(basic, { x: 0, y: 0, w: 1088 }, ctx)}</svg>,
    )
    expect(markupA).toBe(markupB)
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{bmc.render(basic, { x: 0, y: 0, w: 1088 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})

describe("bmc block titles follow the language of the content", () => {
  // Joined with spaces: a long title such as Customer Relationships wraps
  // onto two text lines in its block.
  const titles = (c: Parameters<typeof bmc.render>[0]) =>
    Array.from(svg(bmc.render(c, { x: 0, y: 0, w: 1088 }, ctx)).container.querySelectorAll("text")).map(
      (t) => t.textContent ?? "",
    )

  it("titles Chinese content in Chinese", () => {
    const text = titles(basic).join(" ")
    for (const title of ["重要合作", "关键业务", "核心资源", "价值主张", "客户关系", "渠道通路", "客户细分", "成本结构", "收入来源"]) {
      expect(text).toContain(title)
    }
    expect(text).not.toContain("Key Partners")
  })

  it("titles English content in English", () => {
    const text = titles({
      type: "bmc",
      key_partners: ["Suppliers"],
      key_activities: ["R&D"],
      key_resources: ["Engineers"],
      value_propositions: ["One stop shop"],
      customer_relationships: ["Account managers"],
      channels: ["Direct sales"],
      customer_segments: ["Mid-size firms"],
      cost_structure: ["Cloud"],
      revenue_streams: ["Subscriptions"],
    }).join(" ")
    for (const title of [
      "Key Partners",
      "Key Activities",
      "Key Resources",
      "Value Propositions",
      "Customer Relationships",
      "Channels",
      "Customer Segments",
      "Cost Structure",
      "Revenue Streams",
    ]) {
      expect(text).toContain(title)
    }
    expect(text).not.toContain("重要合作")
  })
})

// A canvas on a narrower content rect: a column of about 150px holds nine
// characters a line at the type floor. Items used to be fitted to one line
// and cut there ("协作活跃率领先同行两") while the cell had room underneath.
describe("bmc wraps an item instead of cutting it", () => {
  const long = {
    ...basic,
    value_propositions: ["协作活跃率领先同行两个身位", "开通模板已覆盖四个客群"],
    key_activities: ["Seat expansion in existing accounts"],
  }
  const W = 880

  it("sets every word of a long item, under its one bullet", () => {
    const { container } = svg(bmc.render(long, { x: 0, y: 0, w: W }, ctx))
    expect(container.querySelector("[data-truncated]")).toBeNull()
    expect(container.querySelector("[data-dropped]")).toBeNull()
    // One group per item: its bullet and its lines, no panel.
    const groups = Array.from(container.querySelectorAll("g")).filter((g) => !g.querySelector("rect, g"))
    for (const item of [...long.value_propositions, ...long.key_activities]) {
      const group = groups.find((g) =>
        (g.textContent ?? "").replace(/ /g, "").includes(item.replace(/ /g, "")),
      )
      expect(group, item).toBeDefined()
      const lines = Array.from(group!.querySelectorAll("text"))
      expect(lines.length, item).toBeGreaterThan(1)
      expect(group!.querySelectorAll("circle"), item).toHaveLength(1)
      // The continuation hangs under the first line, not under the bullet.
      expect(new Set(lines.map((t) => t.getAttribute("x"))).size, item).toBe(1)
    }
  })

  it("measures the lines an item wraps onto", () => {
    expect(bmc.measure(long, W, ctx)).toBeGreaterThan(bmc.measure(basic, W, ctx))
  })

  it("keeps an item that fits on its one line", () => {
    const { container } = svg(bmc.render(long, { x: 0, y: 0, w: W }, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts).toContain("核心供应商")
    expect(texts).toContain("合作伙伴分销")
  })
})
