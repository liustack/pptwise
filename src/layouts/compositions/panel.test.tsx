// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ContentRect } from "../../render/layout"
import type { ComponentCtx } from "../../components/types"
import { barsComposition } from "./bars"
import { columnsComposition } from "./columns"
import { figuresComposition } from "./figures"
import { lanesComposition } from "./lanes"
import { panelInks, panelOutlineInk, panelSeriesInk } from "./panel"
import { railComposition } from "./rail"
import { recordsComposition } from "./records"
import { tableComposition } from "./table"
import type { Composition } from "./shared"
import { byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

/*
 * The panel setting: ledger's 2026-10 board (`design/rounds/2026-10-04-ledger/`).
 * Each page is the board's own, set on ledger, and every page is drawn on
 * three themes that share nothing with it too: bulletin (a light page, IKB),
 * ember (warm and dark) and crayon (light, rounded, saturated). The setting
 * reads the theme's tokens only.
 */

/** ledger's content band: x64 to x1216, y152 to y648. */
const BAND: ContentRect = { x: 64, y: 152, w: 1152, h: 496 }
/** The sample deck's figure style: Chinese, its author grouping four digits ("7,325"). */
const figures = { chinese: true, groupFour: true }
const panel = { setting: "panel" as const, rect: BAND, ctx: (ctx: ComponentCtx) => ({ ...ctx, figures }) }
const THEMES = ["ledger", "bulletin", "ember", "crayon"] as const

const quarters = ["24Q1", "24Q2", "24Q3", "24Q4", "25Q1", "25Q2", "25Q3", "25Q4", "26Q1", "26Q2"]
const series = (name: string, ys: number[], extra: Record<string, unknown> = {}) => ({
  name,
  ...extra,
  data: quarters.map((x, i) => ({ x, y: ys[i]! })),
})

/** p04: four stacked series, Alphabet marked, the change from 25Q2 to 26Q2 bracketed. */
const stacked = {
  type: "chart",
  chart_type: "stacked",
  axes: { y_title: "四家季度资本开支", y_unit: "亿美元" },
  changes: [{ from: "25Q2", to: "26Q2" }],
  series: [
    series("Meta", [64, 82, 83, 144, 129, 165, 188, 214, 190, 301]),
    series("亚马逊", [149, 176, 226, 278, 250, 322, 351, 395, 442, 542]),
    series("微软", [110, 139, 149, 158, 168, 171, 194, 299, 309, 358]),
    series("Alphabet", [120, 132, 131, 143, 172, 224, 240, 278, 357, 449], { emphasis: true }),
  ],
}

/** p06: one bar series and a marked rate line on the right axis. */
const combo = {
  type: "chart",
  chart_type: "combo",
  axes: { y_title: "四家合计", y_unit: "亿美元", y2_unit: "%" },
  series: [
    series("经营现金流减资本开支", [547, 556, 567, 627, 423, 402, 617, 602, 210, 67]),
    series("资本开支占经营现金流", [45, 49, 51, 54, 63, 69, 61, 66, 86, 96], { plot: "line", axis: "right", emphasis: true }),
  ],
}

/** p11: one series, its last bar marked, the change to it bracketed; three figures beside it. */
const upstream = [
  {
    type: "chart",
    chart_type: "bar",
    axes: { y_unit: "亿美元" },
    changes: [{ from: "FY26Q2", to: "FY27Q2" }],
    series: [
      {
        name: "英伟达数据中心收入",
        data: [226, 263, 308, 356, 391, 411, 512, 623, 753, 890].map((y, i) => ({
          x: ["FY25Q1", "FY25Q2", "FY25Q3", "FY25Q4", "FY26Q1", "FY26Q2", "FY26Q3", "FY26Q4", "FY27Q1", "FY27Q2"][i]!,
          y,
          ...(i === 9 ? { emphasis: true } : {}),
        })),
      },
    ],
  },
  {
    type: "kpi_cards",
    items: [
      { value: "167 亿美元", label: "博通 AI 半导体收入，单季", note: "同比 +221%", delta: "up" },
      { value: "542 亿美元", label: "美光单季收入", note: "同比 +379%，内存涨价", delta: "up" },
      { value: "600 至 640 亿", unit: "美元", label: "台积电 2026 年资本预算", note: "此前为 520 至 560 亿", delta: "up" },
    ],
  },
]

/** p05: two figures, then the guidance dumbbell, the figures on the left. */
const guidance = [
  {
    type: "kpi_cards",
    items: [
      { value: "**+79%**", label: "四家合计比 2025 年", note: "约 4,100 亿美元到约 7,325 亿美元", delta: "up" },
      { value: "2,100 至 2,220", unit: "亿美元", label: "下半年隐含单季", note: "比二季度的 1,701 亿高 23% 至 31%" },
    ],
  },
  {
    type: "chart",
    chart_type: "dumbbell",
    axes: { x_title: "2026 年指引", x_unit: "亿美元" },
    series: [
      { name: "年内首次", data: [{ x: "Alphabet", y: 1800 }, { x: "亚马逊", y: 2000 }, { x: "Meta", y: 1250 }, { x: "微软（租赁改口径，投资不变）", y: 1900 }] },
      { name: "7 月最新", data: [{ x: "Alphabet", y: 2000 }, { x: "亚马逊", y: 2200 }, { x: "Meta", y: 1375 }, { x: "微软（租赁改口径，投资不变）", y: 1750 }] },
    ],
  },
]

/** p09: horizontal bars, Oracle marked, two figures beside them. */
const leases = [
  {
    type: "chart",
    chart_type: "bar",
    direction: "horizontal",
    axes: { x_unit: "亿美元" },
    series: [
      {
        name: "已签未起租的数据中心租约",
        data: [{ x: "微软", y: 3291 }, { x: "甲骨文", y: 2880, emphasis: true }, { x: "Meta", y: 2790 }, { x: "亚马逊", y: 1372 }, { x: "Alphabet", y: 852 }],
      },
    ],
  },
  {
    type: "kpi_cards",
    items: [
      { value: "1.12 万亿", unit: "美元", label: "五家合计", note: "另有 Meta 7 月新签的约 680 亿" },
      { value: "**约 9 倍**", label: "甲骨文租约是年经营现金流的", note: "2,880 亿对 2026 财年的 320 亿" },
    ],
  },
]

/** p07: a titled table of five rows, Alphabet highlighted, negative figures, over a note. */
const fcf = [
  {
    type: "data_table",
    title: "自由现金流（亿美元）",
    columns: [
      { key: "co", label: "公司" },
      { key: "period", label: "最新一期" },
      { key: "fcf", label: "自由现金流", align: "right" },
      { key: "prior", label: "一年前或对比", align: "right" },
    ],
    rows: [
      { cells: { co: "微软", period: "2026 年二季度", fcf: "196", prior: "一年前 256" } },
      { cells: { co: "Alphabet", period: "2026 年二季度", fcf: "−59", prior: "一年前 53" }, emphasis: "highlight" },
      { cells: { co: "亚马逊", period: "截至 6 月的十二个月", fcf: "−76", prior: "一年前 182" } },
      { cells: { co: "Meta", period: "2026 年二季度", fcf: "7.8", prior: "一年前 85.5" } },
      { cells: { co: "甲骨文", period: "6 至 8 月财季", fcf: "−54", prior: "2026 财年 −237" } },
    ],
  },
  { type: "callout", variant: "info", text: "微软还明显为正，但比一年前少了 23%，管理层称 2027 财年仍为正。" },
]

/** p08: six milestones on one track, one highlighted, over a titled note. */
const funding = [
  {
    type: "timeline",
    title: "2026 年外部融资和长期承诺",
    milestones: [
      { date: "3 至 7 月", title: "亚马逊发债", desc: "新发约 919 亿" },
      { date: "5 月", title: "Meta 发债 250 亿", desc: "票据余额升到 840 亿" },
      { date: "6 月 2 日", title: "Alphabet 发股 847.5 亿", desc: "含伯克希尔 100 亿", highlight: true },
      { date: "6 至 8 月", title: "甲骨文增发 199 亿", desc: "额度一个季度用完" },
      { date: "7 月", title: "Meta 新签长租约", desc: "约 680 亿，2027 年起租" },
      { date: "8 月", title: "英伟达担保", desc: "上限 1,050 亿" },
    ],
  },
  { type: "callout", variant: "info", text: "表外安排：Meta 与贝莱德合建 1 GW 园区，贝莱德持股 80%，约 140 亿开发成本里 125 亿是借款。" },
]

/** p13: four figures that are changes, then the lead figure and its reading. */
const market = [
  {
    type: "kpi_cards",
    items: [
      { value: "+15.5%", label: "微软 · 财报日", note: "Azure 增长 43%", delta: "up" },
      { value: "+15.3%", label: "亚马逊 · 财报日", note: "AWS 增长 37%", delta: "up" },
      { value: "−7.1%", label: "Alphabet · 财报日", note: "自由现金流转负", delta: "down" },
      { value: "−8.0%", label: "Meta · 财报日", note: "自由现金流只剩 7.8 亿", delta: "down" },
    ],
  },
  { type: "kpi_cards", items: [{ value: "−56%", label: "甲骨文：花钱最多、回款最慢", note: "股价距 2025 年 9 月高点", delta: "down" }] },
  { type: "paragraph", text: "6 月 1 日到 7 月 24 日就跌了 53.5%。2027 财年资本开支最高约 950 亿美元，计划外部融资约 400 亿。" },
]

/** p14: three options, the middle one recommended. */
const options = [
  {
    type: "comparison",
    title: "三个方案",
    recommended: 1,
    columns: ["维持现有配置", "向上游和电力倾斜", "整体减配 AI 链"],
    rows: [
      { label: "做法", cells: ["三条线权重不动", "算力链保持，电力加配，云厂商只留回款快的", "三条线同步降权"] },
      { label: "依据", cells: ["2027 年开支继续上升", "钱先流向上游，瓶颈转向电力", "自有现金见底，需求集中"] },
      { label: "主要风险", cells: ["融资一紧，云厂商先跌", "电力受政策和电价牵制", "开支仍在上调，过早离场"] },
      { label: "改主意的信号", cells: ["任何一家下调指引", "融资成本跳升或实验室收入失速", "2027 年指引继续上调"] },
    ],
  },
]

/** Each page, the composition that draws it, and words it must print. */
const PAGES: { name: string; composition: Composition; components: unknown[]; authored: string[] }[] = [
  { name: "stacked columns", composition: columnsComposition, components: [stacked], authored: ["四家季度资本开支", "亿美元", "Alphabet", "1,650", "▲ 87%", "26Q2"] },
  { name: "combo", composition: columnsComposition, components: [combo], authored: ["四家合计", "亿美元 · %", "资本开支占经营现金流", "45%", "96%", "547"] },
  { name: "columns beside figures", composition: railComposition, components: upstream, authored: ["英伟达数据中心收入", "890", "▲ 117%", "167 亿美元", "美元，此前为 520 至 560 亿"] },
  { name: "dumbbell beside figures", composition: railComposition, components: guidance, authored: ["2026 年指引：年内首次 → 7 月最新", "微软", "租赁改口径，投资不变", "+79%", "2,200", "1,250"] },
  { name: "bars beside figures", composition: railComposition, components: leases, authored: ["已签未起租的数据中心租约", "甲骨文", "3,291", "1.12 万亿", "约 9 倍"] },
  { name: "records", composition: recordsComposition, components: fcf, authored: ["自由现金流（亿美元）", "Alphabet", "−59", "2026 财年 −237", "管理层称 2027 财年仍为正"] },
  { name: "lanes", composition: lanesComposition, components: funding, authored: ["2026 年外部融资和长期承诺", "6 月 2 日", "Alphabet 发股 847.5 亿", "表外安排", "125 亿是借款"] },
  { name: "figures", composition: figuresComposition, components: market, authored: ["微软 · 财报日", "+15.5%", "−56%", "甲骨文：花钱最多、回款最慢", "股价距 2025 年 9 月高点", "53.5%"] },
  { name: "table", composition: tableComposition, components: options, authored: ["三个方案", "向上游和电力倾斜（建议）", "改主意的信号", "融资成本跳升或实验室收入失速"] },
]

/** The fill a text sits on: the last filled rect drawn before it that covers its middle. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, text"))) {
    if (el === text) return ground
    if (el.tagName !== "rect" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none") continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name)))
    if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h!) ground = fill
  }
  return ground
}

describe.each(THEMES)("the panel setting on %s", (theme) => {
  it.each(PAGES.map((p) => [p.name, p] as const))("draws %s whole, export-safe, inside the band", (_name, page) => {
    const { root } = renderComposition(page.composition, page.components, { ...panel, theme })
    expect(root, page.name).not.toBeNull()
    expect(() => assertSubset(root!)).not.toThrow()
    const printed = texts(root!).map(textOf).join(" ")
    for (const words of page.authored) expect(printed, words).toContain(words)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    for (const el of Array.from(root!.querySelectorAll("rect"))) {
      const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name))) as [number, number, number, number]
      expect(x).toBeGreaterThanOrEqual(BAND.x - 0.5)
      expect(x + w).toBeLessThanOrEqual(BAND.x + BAND.w + 0.5)
      expect(y).toBeGreaterThanOrEqual(BAND.y - 0.5)
      expect(y + h).toBeLessThanOrEqual(BAND.y + BAND.h + 0.5)
    }
  })

  it.each(PAGES.map((p) => [p.name, p] as const))("sets %s in the theme's fonts, every text legible on what it sits on", (_name, page) => {
    const { root, ctx } = renderComposition(page.composition, page.components, { ...panel, theme })
    const fonts = new Set([ctx.fonts.body, ctx.fonts.heading])
    const ground = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      expect(fonts.has(text.getAttribute("font-family")!), textOf(text)).toBe(true)
      const size = Number(text.getAttribute("font-size"))
      const fill = text.getAttribute("fill")!
      const under = groundOf(root!, text, ground)
      expect(contrastRatio(fill, under), `${textOf(text)}: ${fill} on ${under}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
      // The board's small type is declared, so the L1 font floor knows it.
      if (size < 16) expect(text.getAttribute("data-font-floor-exempt"), textOf(text)).toBe("panel-spec")
    }
  })
})

describe("the panel setting, as ledger's board draws it", () => {
  it("frames a chart in a panel named by its title, its unit on the right of the bar", () => {
    const { root, ctx } = renderComposition(columnsComposition, [stacked], { ...panel, theme: "ledger" })
    const frame = root!.querySelector("[data-panel] > rect")!
    expect([frame.getAttribute("x"), frame.getAttribute("y"), frame.getAttribute("width"), frame.getAttribute("height")]).toEqual(["64.5", "152.5", "1151", "495"])
    expect(frame.getAttribute("fill")).toBe(ctx.colors.surface)
    expect(frame.getAttribute("stroke")).toBe(ctx.colors.border)
    const name = byText(root!, "四家季度资本开支")!
    expect([name.getAttribute("x"), name.getAttribute("y"), name.getAttribute("font-size")]).toEqual(["82", "175", "13"])
    const unit = byText(root!, "亿美元")!
    expect([unit.getAttribute("x"), unit.getAttribute("text-anchor")]).toEqual(["1198", "end"])
  })

  it("stacks the marked series in the mark and the others in the palette after its lead, nearest the top first", () => {
    const { root, ctx } = renderComposition(columnsComposition, [stacked], { ...panel, theme: "ledger" })
    const inks = panelInks(ctx)
    // The last column's four segments, bottom to top: Meta, Amazon, Microsoft, Alphabet.
    const last = Array.from(root!.querySelectorAll("rect")).filter((rect) => Number(rect.getAttribute("x")) > 1100 && Number(rect.getAttribute("height")) > 20)
    expect(last.map((rect) => rect.getAttribute("fill"))).toEqual([panelSeriesInk(ctx, 2), panelSeriesInk(ctx, 1), panelSeriesInk(ctx, 0), inks.mark])
    expect(ctx.colors.chartPalette.slice(1, 4)).toEqual(["#56677A", "#3D4B5A", "#2E3A47"])
    // The legend reads in the stack's order, top first, the marked name in the mark.
    const legend = texts(root!).filter((text) => Number(text.getAttribute("y")) === 203).map(textOf)
    expect(legend).toEqual(["Alphabet", "微软", "亚马逊", "Meta"])
    expect(byText(root!, "Alphabet")!.getAttribute("fill")).toBe(inks.mark)
  })

  it("brackets the page's change in the mark, and in the direction's colour when a single bar is marked", () => {
    const stack = renderComposition(columnsComposition, [stacked], { ...panel, theme: "ledger" })
    const inks = panelInks(stack.ctx)
    expect(stack.root!.querySelector("[data-change-bracket] path")!.getAttribute("stroke")).toBe(inks.mark)
    expect(byText(stack.root!, "1,650")!.getAttribute("font-weight")).toBe("700")
    const bars = renderComposition(railComposition, upstream, { ...panel, theme: "ledger" })
    expect(bars.root!.querySelector("[data-change-bracket] path")!.getAttribute("stroke")).toBe(inks.up)
    expect(byText(bars.root!, "890")!.getAttribute("fill")).toBe(inks.mark)
  })

  it("prints a combo line's two ends, a label that lands on a bar standing on a plate of the panel's fill", () => {
    const { root, ctx } = renderComposition(columnsComposition, [combo], { ...panel, theme: "ledger" })
    const first = byText(root!, "45%")!
    const last = byText(root!, "96%")!
    expect([first.getAttribute("font-size"), last.getAttribute("font-size")]).toEqual(["20", "24"])
    const plate = root!.querySelector("[data-label-plate]")!
    expect(plate.getAttribute("fill")).toBe(ctx.colors.surface)
    expect(byText(root!, "86%")).toBeUndefined()
  })

  it("sets the figure column beside the chart on the side the author wrote it", () => {
    const right = renderComposition(railComposition, upstream, { ...panel, theme: "ledger" })
    const left = renderComposition(railComposition, guidance, { ...panel, theme: "ledger" })
    const xOf = (root: Element, words: string) => Number(byText(root, words)!.getAttribute("x"))
    expect(xOf(right.root!, "博通 AI 半导体收入，单季")).toBe(64 + 1152 - 376 + 18)
    expect(xOf(left.root!, "四家合计比 2025 年")).toBe(64 + 18)
  })

  it("sets an arrow after a figure for its delta, and spends the mark on the figure the author marked", () => {
    const { root, ctx } = renderComposition(railComposition, guidance, { ...panel, theme: "ledger" })
    const inks = panelInks(ctx)
    const marked = byText(root!, "+79%")!
    expect(marked.getAttribute("fill")).toBe(inks.mark)
    const arrow = root!.querySelector("[data-figure-delta]")!
    expect(textOf(arrow)).toBe("▲")
    expect(arrow.getAttribute("fill")).toBe(inks.up)
    expect(arrow.getAttribute("y")).toBe(marked.getAttribute("y"))
    expect(Number(arrow.getAttribute("x"))).toBeGreaterThan(Number(marked.getAttribute("x")) + 60)
    const edges = Array.from(root!.querySelectorAll("[data-panel='marked'] > rect[stroke]")).map((rect) => rect.getAttribute("stroke"))
    expect(edges).toEqual([inks.mark])
  })

  it("draws a dumbbell's rises in the mark, a fall in the quiet palette colour, and a parenthesis as a note under the name", () => {
    const { root, ctx } = renderComposition(railComposition, guidance, { ...panel, theme: "ledger" })
    const inks = panelInks(ctx)
    const rows = Array.from(root!.querySelectorAll("[data-shift-row]"))
    expect(rows).toHaveLength(4)
    const ends = rows.map((row) => row.querySelectorAll("circle")[1]!.getAttribute("fill"))
    expect(ends).toEqual([inks.mark, inks.mark, inks.mark, panelOutlineInk(ctx)])
    expect(panelOutlineInk(ctx)).toBe("#7E93A8")
    expect(textOf(rows[3]!.querySelectorAll("text")[0]!)).toBe("微软")
    expect(textOf(rows[3]!.querySelectorAll("text")[1]!)).toBe("租赁改口径，投资不变")
  })

  it("sets a table's figures large in the heading face, a negative one in the danger ink, a highlighted row on the mark's tint", () => {
    const { root, ctx } = renderComposition(recordsComposition, fcf, { ...panel, theme: "ledger" })
    const inks = panelInks(ctx)
    const minus = byText(root!, "−59")!
    expect([minus.getAttribute("font-family"), minus.getAttribute("font-size"), minus.getAttribute("fill")]).toEqual([ctx.fonts.heading, "28", inks.down])
    expect(byText(root!, "Alphabet")!.getAttribute("fill")).toBe(inks.mark)
    const flag = Array.from(root!.querySelectorAll("rect")).find((rect) => rect.getAttribute("width") === "3")!
    expect(flag.getAttribute("fill")).toBe(inks.mark)
    // A table with room takes the large size: 80px rows and figures at 36px.
    const large = renderComposition(recordsComposition, [fcf[0]], { ...panel, theme: "ledger" })
    expect(byText(large.root!, "196")!.getAttribute("font-size")).toBe("36")
  })

  it("names a note's panel by the label its author wrote before the colon, and declares the colon", () => {
    const { root } = renderComposition(lanesComposition, funding, { ...panel, theme: "ledger" })
    const label = byText(root!, "表外安排")!
    expect(label.getAttribute("data-gloss-break")).toBe("：")
    expect(byText(root!, "Meta 与贝莱德合建 1 GW 园区，贝莱德持股 80%，约 140 亿开发成本里 125 亿是借款。")).toBeDefined()
  })

  it("runs a timeline on two lanes, the lanes named in the title bar", () => {
    const laned = {
      ...funding[0],
      lanes: ["发债发股", "长期承诺"],
      milestones: (funding[0] as { milestones: Record<string, unknown>[] }).milestones.map((m, i) => ({ ...m, lane: i < 4 ? "发债发股" : "长期承诺" })),
    }
    const { root } = renderComposition(lanesComposition, [laned], { ...panel, theme: "ledger" })
    expect(byText(root!, "上：发债发股 · 下：长期承诺")).toBeDefined()
    expect(root!.querySelectorAll("[data-lane='1']")).toHaveLength(4)
    expect(root!.querySelectorAll("[data-lane='2']")).toHaveLength(2)
    // A date is only ever a date: no lane is printed into it.
    expect(byText(root!, "6 月 2 日")).toBeDefined()
  })

  it("stands the recommended option in a column on the mark's tint inside an edge of the mark", () => {
    const { root, ctx } = renderComposition(tableComposition, options, { ...panel, theme: "ledger" })
    const inks = panelInks(ctx)
    const pick = root!.querySelector("[data-recommended]")!
    expect([pick.getAttribute("fill"), pick.getAttribute("stroke")]).toEqual([inks.tint, inks.mark])
    expect(byText(root!, "向上游和电力倾斜（建议）")!.getAttribute("font-weight")).toBe("700")
    const english = { ...options[0], columns: ["Hold", "Tilt to power", "Cut"], rows: [{ label: "Action", cells: ["Keep", "Add power", "Cut all"] }] }
    const en = renderComposition(tableComposition, [english], { setting: "panel", rect: BAND, theme: "ledger", ctx: (ctx) => ({ ...ctx, figures: { chinese: false, groupFour: true } }) })
    expect(texts(en.root!).map(textOf).join(" ")).toContain("Tilt to power (recommended)")
  })

  it("colours a figure that is itself a change by its direction, and a level in the ink", () => {
    const { root, ctx } = renderComposition(figuresComposition, market, { ...panel, theme: "ledger" })
    const inks = panelInks(ctx)
    expect(byText(root!, "+15.5%")!.getAttribute("fill")).toBe(inks.up)
    expect(byText(root!, "−7.1%")!.getAttribute("fill")).toBe(inks.down)
    expect(byText(root!, "−56%")!.getAttribute("font-size")).toBe("110")
    const levels = renderComposition(railComposition, upstream, { ...panel, theme: "ledger" })
    expect(byText(levels.root!, "167 亿美元")!.getAttribute("fill")).toBe(ctx.colors.text)
  })

  it("leaves the other settings alone: a titled table there is declined, an untitled one drawn as before", () => {
    expect(renderComposition(recordsComposition, fcf, { theme: "bulletin", setting: "notice" }).root).toBeNull()
    expect(renderComposition(barsComposition, [leases[0]], { theme: "bulletin", setting: "notice" }).root).not.toBeNull()
  })

  it("declines what a panel cannot hold whole", () => {
    const wide = { ...fcf[0], rows: [{ cells: { co: "微软".repeat(30), period: "x", fcf: "1", prior: "x" } }] }
    expect(renderComposition(recordsComposition, [wide], { ...panel, theme: "ledger" }).root).toBeNull()
    const five = { ...options[0], columns: ["a", "b", "c", "d", "e"], rows: [{ label: "x", cells: ["1", "2", "3", "4", "5"] }] }
    expect(renderComposition(tableComposition, [five], { ...panel, theme: "ledger" }).root).toBeNull()
  })
})
