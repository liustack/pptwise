// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ContentRect } from "../../render/layout"
import type { ComponentCtx } from "../../components/types"
import { columnsComposition } from "./columns"
import { lanesComposition } from "./lanes"
import { railComposition } from "./rail"
import { ringsComposition } from "./rings"
import { rosterComposition } from "./roster"
import { rowsComposition } from "./rows"
import { scoresComposition } from "./scores"
import { sealInks, sealSeriesInk } from "./seal"
import { tableComposition } from "./table"
import { targetsComposition } from "./targets"
import { tilesComposition } from "./tiles"
import { trendComposition } from "./trend"
import type { Composition } from "./shared"
import { byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

/*
 * The seal setting: vermilion's 2026-10 board (`design/rounds/2026-10-04-vermilion/`).
 * Each page is the board's own, set on vermilion, and every page is drawn on
 * three themes that share nothing with it too: bulletin (a light page, IKB),
 * ember (warm and dark, its primary the same orange as its accent) and
 * crayon (light, rounded, saturated). The setting reads the theme's tokens
 * only.
 */

/** The seal sheet's body: x80 to x1200, y186 to y648. */
const BAND: ContentRect = { x: 80, y: 186, w: 1120, h: 462 }
const seal = { setting: "seal" as const, rect: BAND, ctx: (ctx: ComponentCtx) => ({ ...ctx, figures: { chinese: true, groupFour: false } }) }
const english = { ...seal, ctx: (ctx: ComponentCtx) => ({ ...ctx, figures: { chinese: false, groupFour: false } }) }
const THEMES = ["vermilion", "bulletin", "ember", "crayon"] as const

/** p02: four numbered points, the last the one the page lands on. */
const summary = [
  {
    type: "numbered_cards",
    items: [
      { title: "目标：去年基本完成，今年改成区间", text: "2025 年只有 CPI 没达标。2026 年增长目标「4.5%—5%」，扩内需排十项任务第一。" },
      { title: "「十五五」：不设速度目标，约束转向碳", text: "不设五年 GDP 数值目标，碳强度五年累计降 17%，新增护理型床位等民生指标。" },
      { title: "今年以来：增长在区间内，投资偏弱", text: "上半年 GDP 增长 4.7%，1–8 月固定资产投资 −7.2%，PPI 由负转正到 +2.0%。" },
      { title: "对我们：跟着政策的钱和约束走", text: "盯服务消费和设备更新政策，提前算碳账，稳住出口。", emphasis: true },
    ],
  },
]

/** p03: a scorecard of five goals, one off track, its headers named. */
const scorecard = [
  {
    type: "scorecard",
    labels: { metric: "指标", target: "2025 年目标", actual: "2025 年实际", gap: "差距", status: "判断" },
    rows: [
      { label: "经济增长", target: "5% 左右", actual: "5.0%", gap: "持平", status: "on_track", status_label: "完成" },
      { label: "城镇新增就业", target: "1200 万人以上", actual: "1267 万人", gap: "+67 万人", status: "on_track", status_label: "完成" },
      { label: "城镇调查失业率", target: "5.5% 左右", actual: "平均 5.2%", gap: "低 0.3 个百分点", status: "on_track", status_label: "完成" },
      { label: "居民消费价格", target: "涨幅 2% 左右", actual: "与上年持平", gap: "低约 2 个百分点", status: "off_track", status_label: "未完成" },
      { label: "单位 GDP 能耗", target: "降低 3% 左右", actual: "降低 5.1%", gap: "超 2.1 个百分点", status: "on_track", status_label: "完成" },
    ],
    note: "粮食产量 1.43 万亿斤、居民收入实际增长 5.0%，也都完成",
  },
]

/** p04: two years' targets side by side, each row tagged with what changed. */
const targetsTable = [
  {
    type: "comparison",
    columns: ["2025 年目标", "2026 年目标"],
    rows: [
      { label: "经济增长", cells: ["5% 左右", "「4.5%—5%，在实际工作中努力争取更好结果」"], tag: { text: "改为区间" }, emphasis: true },
      { label: "就业", cells: ["新增 1200 万人以上，失业率 5.5% 左右", "不变"], tag: { text: "不变", quiet: true } },
      { label: "居民消费价格", cells: ["涨幅 2% 左右", "不变，「推动价格总水平由负转正」"], tag: { text: "不变", quiet: true } },
      { label: "粮食产量", cells: ["1.4 万亿斤左右", "不变"], tag: { text: "不变", quiet: true } },
      { label: "绿色指标", cells: ["单位 GDP 能耗降低 3% 左右", "单位 GDP 二氧化碳排放降低 3.8% 左右"], tag: { text: "换指标" } },
    ],
    tag_column: "变化",
  },
]

/** p05: two years of four instruments, the later year marked, beside three figures. */
const fiscal = [
  {
    type: "chart",
    chart_type: "bar",
    axes: { y_unit: "万亿元" },
    series: [
      { name: "2025 年", data: [["赤字", 5.66], ["地方专项债", 4.4], ["超长期特别国债", 1.3], ["银行注资特别国债", 0.5]].map(([x, y]) => ({ x, y })) },
      { name: "2026 年", emphasis: true, data: [["赤字", 5.89], ["地方专项债", 4.4], ["超长期特别国债", 1.3], ["银行注资特别国债", 0.3]].map(([x, y]) => ({ x, y })) },
    ],
  },
  {
    type: "kpi_cards",
    items: [
      { value: "**2300 亿元**", label: "赤字比上年增加", note: "赤字 5.89 万亿元，赤字率 4% 左右" },
      { value: "30 万亿元", label: "一般公共预算支出", note: "首次达到" },
      { value: "11.89 万亿元", label: "新增政府债务合计", note: "上年 11.86 万亿元" },
    ],
  },
]

const TASKS = [
  "着力建设强大国内市场",
  "加紧培育壮大新动能",
  "加快高水平科技自立自强",
  "持续深化重点领域改革",
  "进一步扩大高水平对外开放",
  "扎实推进乡村全面振兴",
  "推动新型城镇化和区域协调发展",
  "更大力度保障和改善民生",
  "加快推动全面绿色转型",
  "加强重点领域风险防范化解和安全能力建设",
]
/** p06: ten tasks, the first marked, over a note. */
const tasks = [
  { type: "numbered_cards", items: TASKS.map((title, i) => ({ title, ...(i === 0 ? { emphasis: true } : {}) })) },
  { type: "callout", variant: "info", text: "顺序变化：民生由 2025 年的第十位移到第八位，风险防范由第六位移到第十位" },
]

/** p07: the plan's statement in a block beside its targets. */
const plan = [
  {
    type: "insight_panel",
    title: "经济增长",
    rows: [{ label: "不设五年数值目标", text: "「保持在合理区间、各年度视情提出」" }],
    footnote: "20 项主要指标中，12 项预期性，8 项约束性",
  },
  {
    type: "from_to",
    from: { title: "2025 年" },
    to: { title: "2030 年" },
    label_column: "指标",
    rows: [
      { label: "常住人口城镇化率", from: "67.9", to: "71", unit: "%" },
      { label: "数字经济核心产业占 GDP 比重", from: "10.5", to: "12.5", unit: "%" },
      { label: "非化石能源占能源消费比重", from: "21.7", to: "25", unit: "%", tag: { text: "新入表" }, emphasis: true },
      { label: "养老机构护理型床位占比", from: "68", to: "73", unit: "%", tag: { text: "新增" } },
      { label: "每万人口高价值发明专利", from: "16", to: "＞22", unit: "件" },
      { label: "人均预期寿命", from: "79.25", to: "80", unit: "岁" },
    ],
  },
]

/** p09: one quarterly series over its target range. */
const growthChart = {
  type: "chart",
  chart_type: "line",
  axes: { y_title: "GDP 单季同比", y_unit: "%" },
  series: [{ name: "GDP 单季同比", data: [5.4, 5.2, 4.8, 4.5, 5.0, 4.3].map((y, i) => ({ x: ["2025Q1", "2025Q2", "2025Q3", "2025Q4", "2026Q1", "2026Q2"][i]!, y })) }],
  bands: [{ from: 4.5, to: 5, label: "2026 年目标区间 4.5%—5%" }],
}
const growth = [
  growthChart,
  {
    type: "kpi_cards",
    items: [
      { value: "**4.7%**", label: "上半年 GDP 增长", note: "一季度 5.0%，二季度 4.3%" },
      { value: "10 月 19 日", label: "前三季度数据发布", note: "国家统计局发布日程" },
    ],
  },
]

const INDICATORS = ["社会消费品零售总额", "固定资产投资", "规模以上工业增加值", "CPI", "PPI"]
/** p10: three periods of five indicators, negatives among them, one bar marked. */
const indicators = [
  {
    type: "chart",
    chart_type: "bar",
    axes: { y_title: "累计同比", y_unit: "%" },
    series: [
      { name: "一季度", data: [2.4, 1.7, 6.1, 0.9, -0.6].map((y, i) => ({ x: INDICATORS[i]!, y })) },
      { name: "上半年", data: [1.3, -5.7, 5.4, 1.0, 1.5].map((y, i) => ({ x: INDICATORS[i]!, y })) },
      { name: "1–8 月", data: [1.1, -7.2, 5.3, 0.9, 2.0].map((y, i) => ({ x: INDICATORS[i]!, y, ...(i === 1 ? { emphasis: true } : {}) })) },
    ],
  },
]

/** p11: six policies on two lanes, one highlighted, over a note. */
const policies = [
  {
    type: "timeline",
    lanes: ["促消费", "产业和就业"],
    milestones: [
      { date: "1 月 7 日", title: "人工智能+制造", desc: "工信部等八部门专项行动", lane: "产业和就业" },
      { date: "1 月 20 日", title: "中小微企业贷款贴息", desc: "年化 1.5 个百分点，最长 2 年", lane: "产业和就业" },
      { date: "1 月 29 日", title: "服务消费新增长点方案", desc: "国务院办公厅印发", lane: "促消费" },
      { date: "7 月 13 日", title: "扩大消费「十五五」规划", desc: "2030 年社零 60 万亿元左右", lane: "促消费" },
      { date: "8 月 21 日", title: "贴息加码", desc: "消费贷上限 5000 元，企业贷上限 7500 万元", highlight: true, lane: "促消费" },
      { date: "9 月 28 日", title: "国务院常务会议", desc: "增加科技创新和技术改造再贷款额度", lane: "产业和就业" },
    ],
  },
  { type: "callout", variant: "info", text: "最相关的是 8 月贴息加码：企业贴息贷款单户上限提到 7500 万元" },
]

/** p12: four completion rates with the amounts behind them, the last marked. */
const funds = [
  {
    type: "progress_donuts",
    items: [
      { value: "90.5%", label: "超长期特别国债", detail: "11770 / 13000 亿元", source: "截至 9 月 16 日" },
      { value: "66.6%", label: "新增专项债", detail: "29293 / 44000 亿元", source: "1–8 月" },
      { value: "60.5%", label: "一般公共预算支出", detail: "181451 / 300100 亿元", source: "1–8 月" },
      { value: "100%", label: "以旧换新资金", detail: "2500 / 2500 亿元", source: "截至 9 月 30 日全部下达", emphasis: true },
    ],
  },
]

/** p14: four numbered panels, the second the one the page lands on. */
const implications = [
  {
    type: "numbered_cards",
    items: [
      { title: "消费：从补商品转向促服务和贴息", text: "以旧换新资金少 500 亿元，1–8 月服务零售 +4.9%" },
      { title: "设备更新：有钱也有贴息", text: "2000 亿元资金已下达，企业贷款贴息 1.5 个百分点", emphasis: true },
      { title: "碳排放：年度考核换口径", text: "今年碳排放强度降 3.8% 左右，五年累计降 17%" },
      { title: "出口：外需仍是亮点", text: "上半年出口 +13.4%，1–8 月货物进出口 +17.6%" },
    ],
  },
]

/** Each page, the composition that draws it, and words it must print. */
const PAGES: { name: string; composition: Composition; components: unknown[]; authored: string[] }[] = [
  { name: "rows", composition: rowsComposition, components: summary, authored: ["一", "四", "目标：去年基本完成，今年改成区间", "稳住出口。"] },
  { name: "scores", composition: scoresComposition, components: scorecard, authored: ["2025 年目标", "判断", "1267 万人", "低约 2 个百分点", "未完成", "也都完成"] },
  { name: "table", composition: tableComposition, components: targetsTable, authored: ["2026 年目标", "变化", "改为区间", "换指标", "单位 GDP 二氧化碳排放降低 3.8% 左右"] },
  { name: "columns beside figures", composition: railComposition, components: fiscal, authored: ["2025 年", "万亿元", "5.89", "0.3", "银行注资特别国债", "2300 亿元", "上年 11.86 万亿元"] },
  { name: "roster", composition: rosterComposition, components: tasks, authored: ["十", "着力建设强大国内市场", "加强重点领域风险防范化解和安全能力建设", "风险防范由第六位移到第十位"] },
  { name: "targets", composition: targetsComposition, components: plan, authored: ["经济增长", "不设五年", "数值目标", "指标", "2030 年", "79.25 岁", "＞22 件", "新入表"] },
  { name: "trend beside figures", composition: railComposition, components: growth, authored: ["GDP 单季同比", "2026 年目标区间 4.5%—5%", "5.0", "4.3", "2026Q2", "4.7%", "10 月 19 日"] },
  { name: "columns", composition: columnsComposition, components: indicators, authored: ["一季度", "1–8 月", "累计同比，%", "−7.2", "−0.6", "固定资产投资", "PPI"] },
  { name: "lanes", composition: lanesComposition, components: policies, authored: ["促消费", "产业和就业", "8 月 21 日", "贴息加码", "单户上限提到 7500 万元"] },
  { name: "rings", composition: ringsComposition, components: funds, authored: ["90.5%", "100%", "以旧换新资金", "181451 / 300100 亿元", "截至 9 月 30 日全部下达"] },
  { name: "tiles", composition: tilesComposition, components: implications, authored: ["二", "设备更新：有钱也有贴息", "上半年出口 +13.4%，1–8 月货物进出口 +17.6%"] },
  { name: "trend", composition: trendComposition, components: [growthChart], authored: ["GDP 单季同比", "5.4", "5.0", "4.3", "2025Q1"] },
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

const numberOf = (el: Element | undefined, name: string) => Number(el!.getAttribute(name))

describe.each(THEMES)("the seal setting on %s", (theme) => {
  it.each(PAGES.map((p) => [p.name, p] as const))("draws %s whole, export-safe, inside the band", (_name, page) => {
    const { root } = renderComposition(page.composition, page.components, { ...seal, theme })
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
    const { root, ctx } = renderComposition(page.composition, page.components, { ...seal, theme })
    const fonts = new Set([ctx.fonts.body, ctx.fonts.heading])
    const ground = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      expect(fonts.has(text.getAttribute("font-family")!), textOf(text)).toBe(true)
      const size = Number(text.getAttribute("font-size"))
      const fill = text.getAttribute("fill")!
      const under = groundOf(root!, text, ground)
      expect(contrastRatio(fill, under), `${textOf(text)}: ${fill} on ${under}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
      // The board's small type is declared, so the L1 font floor knows it.
      if (size < 16) expect(text.getAttribute("data-font-floor-exempt"), textOf(text)).toBe("seal-spec")
    }
  })
})

describe("the seal setting, as vermilion's board draws it", () => {
  const draw = (composition: Composition, components: unknown[], options: Partial<typeof seal> = {}) =>
    renderComposition(composition, components, { ...seal, theme: "vermilion", ...options })

  it("reverses the marked point out of the mark, its square turned white, and numbers the points in Chinese", () => {
    const { root, ctx } = draw(rowsComposition, summary)
    const inks = sealInks(ctx)
    const marked = root!.querySelector("[data-row-marked='1']")!
    expect(marked.querySelector("rect")!.getAttribute("fill")).toBe(inks.mark)
    expect(Array.from(root!.querySelectorAll("[data-seal-numeral] text")).map(textOf)).toEqual(["一", "二", "三", "四"])
    expect(marked.querySelector("[data-seal-numeral] rect")!.getAttribute("fill")).toBe(inks.onMark)
    expect(byText(root!, "对我们：跟着政策的钱和约束走")!.getAttribute("fill")).toBe(inks.onMark)
  })

  it("numbers in Arabic numerals in an English deck", () => {
    const { root } = draw(rowsComposition, summary, english)
    expect(Array.from(root!.querySelectorAll("[data-seal-numeral] text")).map(textOf)).toEqual(["1", "2", "3", "4"])
  })

  it("sets ten tasks in two columns of five, 一 to 十, the first reversed out of the mark", () => {
    const { root, ctx } = draw(rosterComposition, tasks)
    const numerals = Array.from(root!.querySelectorAll("[data-seal-numeral] text"))
    expect(numerals.map(textOf)).toEqual(["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"])
    // The sixth item heads the right column, level with the first.
    expect(numberOf(numerals[5], "y")).toBe(numberOf(numerals[0], "y"))
    expect(numberOf(numerals[5], "x")).toBe(numberOf(numerals[0], "x") + (BAND.w - 24) / 2 + 24)
    const marked = root!.querySelectorAll("[data-row-marked='1']")
    expect(marked).toHaveLength(1)
    expect(marked[0]!.querySelector("rect")!.getAttribute("fill")).toBe(sealInks(ctx).mark)
    expect(root!.querySelector("[data-seal-note]")).not.toBeNull()
  })

  it("scores the goal off track on the mark's tint, its verdict filled, the others outlined", () => {
    const { root, ctx } = draw(scoresComposition, scorecard)
    const inks = sealInks(ctx)
    expect(byText(root!, "居民消费价格")!.getAttribute("fill")).toBe(inks.mark)
    expect(Array.from(root!.querySelectorAll("rect")).some((rect) => rect.getAttribute("fill") === inks.tint)).toBe(true)
    const missed = root!.querySelector("[data-tag='marked']")!
    expect(textOf(missed)).toBe("未完成")
    expect(missed.querySelector("rect")!.getAttribute("fill")).toBe(inks.mark)
    expect(root!.querySelectorAll("[data-tag='']")).toHaveLength(4)
  })

  it("reads a two-year table toward the later year, the marked row tinted, the tags under their header at the right edge", () => {
    const { root, ctx } = draw(tableComposition, targetsTable)
    const inks = sealInks(ctx)
    const later = byText(root!, "2026 年目标")!
    expect([later.getAttribute("fill"), later.getAttribute("font-weight")]).toEqual([inks.mark, "700"])
    expect(byText(root!, "变化")!.getAttribute("text-anchor")).toBe("end")
    expect(numberOf(byText(root!, "变化"), "x")).toBe(BAND.x + BAND.w)
    expect(root!.querySelector("[data-row-marked='1'] rect")!.getAttribute("fill")).toBe(inks.tint)
    expect(root!.querySelector("[data-row-marked='1'] [data-tag='marked']")).not.toBeNull()
    expect(root!.querySelectorAll("[data-tag='quiet']")).toHaveLength(3)
  })

  it("sets the plan's statement on two even lines in the reversed block, and heads the measures' names", () => {
    const { root, ctx } = draw(targetsComposition, plan)
    const inks = sealInks(ctx)
    const statement = Array.from(root!.querySelectorAll("[data-seal-statement] text")).filter((text) => text.getAttribute("font-size") === "34")
    expect(statement.map(textOf)).toEqual(["不设五年", "数值目标"])
    expect(root!.querySelector("[data-seal-statement] rect")!.getAttribute("fill")).toBe(inks.mark)
    const header = byText(root!, "指标")!
    expect(numberOf(header, "x")).toBe(numberOf(byText(root!, "常住人口城镇化率"), "x"))
    // Value columns of 110px, the tag column of 110px and 20px off the edge.
    expect(numberOf(byText(root!, "2030 年"), "x")).toBe(BAND.x + BAND.w - 130)
    expect(numberOf(byText(root!, "2025 年"), "x")).toBe(BAND.x + BAND.w - 270)
    expect(byText(root!, "25%")!.getAttribute("fill")).toBe(inks.mark)
  })

  it("sets a short statement on one line", () => {
    const short = [{ ...plan[0], rows: [{ label: "不设目标", text: "「保持在合理区间」" }] }, plan[1]]
    const { root } = draw(targetsComposition, short)
    const statement = Array.from(root!.querySelectorAll("[data-seal-statement] text")).filter((text) => text.getAttribute("font-size") === "34")
    expect(statement.map(textOf)).toEqual(["不设目标"])
  })

  it("hangs negative values under the zero line, the marked bar's series and category in the mark", () => {
    const { root, ctx } = draw(columnsComposition, indicators)
    const inks = sealInks(ctx)
    const zero = Array.from(root!.querySelectorAll("rect")).find((rect) => rect.getAttribute("width") === String(BAND.w) && rect.getAttribute("height") === "1")!
    const zeroY = numberOf(zero, "y")
    const marks = Array.from(root!.querySelectorAll("rect")).filter((rect) => rect.getAttribute("fill") === inks.mark)
    expect(marks.length).toBeGreaterThanOrEqual(5)
    expect(marks.some((rect) => numberOf(rect, "y") === zeroY && numberOf(rect, "height") > 100)).toBe(true)
    const category = byText(root!, "固定资产投资")!
    expect([category.getAttribute("fill"), category.getAttribute("font-weight")]).toEqual([inks.mark, "700"])
    expect(byText(root!, "PPI")!.getAttribute("font-weight")).not.toBe("700")
    expect(Array.from(root!.querySelectorAll("rect")).some((rect) => rect.getAttribute("fill") === sealSeriesInk(ctx, 1))).toBe(true)
  })

  it("prints a trend's values as written, its target range tinted behind the line", () => {
    const { root } = draw(trendComposition, [growthChart])
    expect(root!.querySelector("[data-chart-band]")).not.toBeNull()
    expect(byText(root!, "5.0")).toBeDefined()
    expect(byText(root!, "5")).toBeUndefined()
  })

  it("rings the marked rate in the mark and the others in the accent", () => {
    const { root, ctx } = draw(ringsComposition, funds)
    const inks = sealInks(ctx)
    const marked = root!.querySelector("[data-ring-marked='1']")!
    expect(Array.from(marked.querySelectorAll("circle")).map((c) => c.getAttribute("stroke"))).toEqual([inks.track, inks.mark])
    const first = root!.querySelector("[data-ring-marked]")
    expect(first).toBe(marked)
    const others = Array.from(root!.querySelectorAll("g > path")).map((path) => path.getAttribute("stroke"))
    expect(others).toEqual([inks.accent, inks.accent, inks.accent])
    expect(byText(root!, "100%")!.getAttribute("fill")).toBe(inks.mark)
  })

  it("runs the policies on two lanes either side of the axis, the highlighted one in the mark", () => {
    const { root, ctx } = draw(lanesComposition, policies)
    expect(Array.from(root!.querySelectorAll("[data-lane]")).map((lane) => lane.getAttribute("data-lane"))).toEqual(["促消费", "产业和就业"])
    const axisY = numberOf(root!.querySelector("line[stroke-width='2']")!, "y1")
    const dateY = (date: string) => numberOf(byText(root!, date), "y")
    for (const date of ["1 月 29 日", "7 月 13 日", "8 月 21 日"]) expect(dateY(date), date).toBeLessThan(axisY)
    for (const date of ["1 月 7 日", "1 月 20 日", "9 月 28 日"]) expect(dateY(date), date).toBeGreaterThan(axisY)
    const highlighted = root!.querySelector("[data-milestone-highlight]")!
    expect(textOf(highlighted)).toContain("贴息加码")
    expect(byText(root!, "8 月 21 日")!.getAttribute("fill")).toBe(sealInks(ctx).mark)
  })
})
