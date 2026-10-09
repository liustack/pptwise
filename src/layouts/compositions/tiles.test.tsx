// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import { compose } from "."
import { panelInks, panelText } from "./panel"
import { shiftsComposition } from "./shifts"
import { drawTicker } from "./ticker"
import { tilesComposition } from "./tiles"
import { byText, renderComposition, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The shapes only ledger's 2026-10 board draws: numbered panels (p02), a
 * dumbbell in a panel across the band, and the cover's ticker (p01). Each
 * is drawn on ledger and on bulletin and crayon, light themes that share
 * nothing with it.
 */

const BAND = { x: 64, y: 152, w: 1152, h: 496 }
const THEMES = ["ledger", "bulletin", "crayon"] as const

/** p02: four conclusions, the second the one the page lands on. */
const cards = {
  type: "numbered_cards",
  items: [
    { title: "开支还在上调", text: "四家 2026 年指引合计约 7,325 亿美元，比 2025 年高约八成，7 月没有一家下调。" },
    { title: "自有现金快不够了", text: "资本开支已占经营现金流的 96%，缺口开始靠发债、发股和长期租约补。", emphasis: true },
    { title: "需求押在少数客户身上", text: "订单集中在几家 AI 实验室，投资方和客户常常是同一批公司。" },
    { title: "瓶颈转向电力", text: "东部电网容量价格触顶，德州暂停新数据中心并网。" },
  ],
}

/** p01: four figures, the first marked, a move, two notes, one marked whole. */
const ticker = {
  type: "kpi_cards",
  items: [
    { label: "2026 年四家指引中值", value: "**7,325**", unit: "亿美元", note: "79%", delta: "up" },
    { label: "2026 年二季度资本开支占经营现金流", value: "96%", note: "两年前 45%" },
    { label: "已签未起租的租约", value: "1.12", unit: "万亿美元", note: "五家合计" },
    { label: "PJM 容量价格", value: "325", unit: "美元/兆瓦/天", note: "**触及上限**" },
  ],
}

const guidance = {
  type: "chart",
  chart_type: "dumbbell",
  axes: { x_title: "2026 年指引", x_unit: "亿美元" },
  series: [
    { name: "年内首次", data: [{ x: "Alphabet", y: 1800 }, { x: "微软（租赁改口径）", y: 1900 }] },
    { name: "7 月最新", data: [{ x: "Alphabet", y: 2000 }, { x: "微软（租赁改口径）", y: 1750 }] },
  ],
}

const panel = { setting: "panel" as const, rect: BAND }

function legible(root: Element, page: string) {
  for (const text of texts(root)) {
    const size = Number(text.getAttribute("font-size"))
    let ground = page
    for (const el of Array.from(root.querySelectorAll("rect, text"))) {
      if (el === text) break
      if (el.tagName !== "rect") continue
      const [x, y, w, h] = ["x", "y", "width", "height"].map((n) => Number(el.getAttribute(n)))
      const tx = Number(text.getAttribute("x")) + 2
      const ty = Number(text.getAttribute("y")) - size * 0.3
      if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h! && el.getAttribute("fill") !== "none") ground = el.getAttribute("fill")!
    }
    expect(contrastRatio(text.getAttribute("fill")!, ground), textOf(text)).toBeGreaterThanOrEqual(requiredContrastRatio(size))
  }
}

describe.each(THEMES)("ledger's own shapes on %s", (theme) => {
  it("sets four numbered cards two by two in panels, the marked one in the mark", () => {
    const { root, ctx } = renderComposition(tilesComposition, [cards], { ...panel, theme })
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("tiles")
    expect(root!.querySelectorAll("[data-tile]")).toHaveLength(4)
    expect(byText(root!, "02")!.getAttribute("fill")).toBe(panelText(panelInks(ctx).mark, ctx.colors.surface, 13))
    expect(byText(root!, "01")!.getAttribute("fill")).toBe(panelText(ctx.colors.muted, ctx.colors.surface, 13))
    const marked = root!.querySelector("[data-tile='2'] [data-panel='marked'] > rect")!
    expect(marked.getAttribute("stroke")).toBe(panelInks(ctx).mark)
    expect(byText(root!, "自有现金快不够了")!.getAttribute("font-family")).toBe(ctx.fonts.heading)
    expect(() => assertSubset(root!)).not.toThrow()
    legible(root!, ctx.defaultBg ?? ctx.colors.bg)
  })

  it("draws a dumbbell alone across the band in its panel", () => {
    const { root, ctx } = renderComposition(shiftsComposition, [guidance], { ...panel, theme })
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("shifts")
    expect(byText(root!, "2026 年指引：年内首次 → 7 月最新")).toBeDefined()
    expect(byText(root!, "租赁改口径")).toBeDefined()
    legible(root!, ctx.defaultBg ?? ctx.colors.bg)
  })

  it("sets the cover's ticker in cells between hairlines", () => {
    const { ctx } = testCtx(theme)
    const drawn = drawTicker({ components: [ticker] as never, ctx, rect: { x: 64, y: 494, w: 1152, h: 150 } })
    const { root } = renderNode(drawn)
    expect(root.querySelectorAll("[data-ticker-cell]")).toHaveLength(4)
    const inks = panelInks(ctx)
    expect(byText(root, "7,325")!.getAttribute("font-size")).toBe("52")
    expect(byText(root, "▲ 79%")!.getAttribute("font-weight")).toBe("700")
    expect(byText(root, "两年前 45%")!.getAttribute("font-weight")).toBeNull()
    expect(byText(root, "触及上限")!.getAttribute("font-weight")).toBe("700")
    expect(texts(root).map(textOf)).not.toContain("**触及上限**")
    if (theme === "ledger") {
      expect(byText(root, "7,325")!.getAttribute("fill")).toBe(inks.mark)
      expect(byText(root, "▲ 79%")!.getAttribute("fill")).toBe(inks.up)
    }
    legible(root, ctx.defaultBg ?? ctx.colors.bg)
  })
})

describe("the ticker's change line", () => {
  it("takes the colour of the news the author says the move is", () => {
    const { ctx } = testCtx("ledger")
    const items = [{ ...ticker.items[0], delta: "down", delta_good: true, note: "12%" }, ...ticker.items.slice(1)]
    const drawn = drawTicker({ components: [{ ...ticker, items }] as never, ctx, rect: { x: 64, y: 494, w: 1152, h: 150 } })
    const { root } = renderNode(drawn)
    expect(byText(root, "▼ 12%")!.getAttribute("fill")).toBe(panelInks(ctx).up)
  })
})

describe("ledger's own shapes, where they decline", () => {
  it("are offered only in the panel setting", () => {
    const { ctx } = testCtx("ledger")
    const plain = compose({ components: [cards] as never, ctx, rect: BAND })
    expect(plain ? renderNode(plain).markup : "").not.toContain('data-gauge-module="tiles"')
    expect(renderComposition(tilesComposition, [cards], { rect: BAND, theme: "ledger" }).root).toBeNull()
    expect(renderComposition(shiftsComposition, [guidance], { rect: BAND, theme: "ledger" }).root).toBeNull()
  })

  it("decline five cards, and a ticker of five figures", () => {
    const five = { ...cards, items: [...cards.items, { title: "第五条", text: "多出来的一条。" }] }
    expect(renderComposition(tilesComposition, [five], { ...panel, theme: "ledger" }).root).toBeNull()
    const { ctx } = testCtx("ledger")
    expect(drawTicker({ components: [{ ...ticker, items: [...ticker.items, ticker.items[0]] }] as never, ctx, rect: { x: 64, y: 494, w: 1152, h: 150 } })).toBeNull()
  })
})
