// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, COMPOSITIONS, type CompositionId } from "."
import { memoInks } from "./memo"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The compositions memo's 2026-10 board added (`design/rounds/2026-10-05-memo/`),
 * each on the board's own page, set on memo as the memo sheet sets it, and
 * then on two themes that share nothing with memo: terminal (a navy-black
 * page, a cyan accent) and crayon (light, rounded, saturated). The
 * setting reads the theme's tokens only, so every page must draw on all
 * three, inside its band, its text legible on what it sits on.
 */

/** memo's body band: x240 to x1216, y186 down to y640. */
const BAND = { x: 240, y: 186, w: 976, h: 454 }
const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(["weekend", "friday-office", "service-desk", "planner", "headset", "standup"].map((id) => [id, { src: PIXEL }]))
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })

/** The memo sheet's compositions, in its order (`content-memo-sheet.tsx`). */
const MEMO_IDS: readonly CompositionId[] = ["annex", "catalog", "rota", "records", "rows", "tallies", "slopes", "diverging", "citation", "scales", "sum", "schedule", "checks"]

function draw(components: unknown[], theme = "memo", exhibitNumber = 1) {
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const element = compose({ components: components as Component[], ctx, rect: BAND, setting: "memo", exhibitNumber }, MEMO_IDS)
  return { element, ctx, tokens, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))
const fillOf = (root: Element, text: string) => byText(root, text)?.getAttribute("fill")

/** The fill a text sits on: the last filled rect drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, text"))) {
    if (el === text) return ground
    if (el.tagName !== "rect" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]")) continue
    if (el.closest("[transform]") !== text.closest("[transform]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name)))
    if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h!) ground = fill
  }
  return ground
}

const REASONS = [
  {
    type: "kpi_cards",
    items: [
      { icon: "heart-pulse", label: "降低倦怠", value: "82%", note: "英国试点一年后回访 28 家组织，提到员工福祉改善" },
      { icon: "user-check", label: "留住人", value: "50%", note: "同一回访提到离职减少。15% 的员工说加多少薪都不回五天" },
      { icon: "user-plus", label: "招到人", value: "32%", note: "同一回访提到招聘改善。南剑桥郡议会改四天后，求职申请增加超过 120%" },
    ],
  },
  { type: "image", asset_id: "weekend", caption: "工作日早晨（示意）" },
  { type: "callout", variant: "info", text: "营收的准确说法是「大体持平」" },
]

const WELLBEING = [
  {
    type: "chart",
    chart_type: "line",
    axes: { y_title: "倦怠（越低越好，1 到 5）" },
    series: [
      {
        name: "试点组 141 家，2,896 人",
        emphasis: true,
        data: [
          { x: "试行前", y: 2.83 },
          { x: "试行后", y: 2.38 },
        ],
      },
      {
        name: "对照组 12 家，285 人",
        data: [
          { x: "试行前", y: 2.9 },
          { x: "试行后", y: 2.94 },
        ],
      },
    ],
  },
  {
    type: "chart",
    chart_type: "line",
    axes: { y_title: "心理健康（1 到 5）" },
    series: [
      {
        name: "试点组 141 家，2,896 人",
        emphasis: true,
        data: [
          { x: "试行前", y: 2.93 },
          { x: "试行后", y: 3.32 },
        ],
      },
      {
        name: "对照组 12 家，285 人",
        data: [
          { x: "试行前", y: 2.9 },
          { x: "试行后", y: 2.93 },
        ],
      },
    ],
  },
  {
    type: "chart",
    chart_type: "line",
    axes: { y_title: "身体健康（1 到 5）" },
    series: [
      {
        name: "试点组 141 家，2,896 人",
        emphasis: true,
        data: [
          { x: "试行前", y: 3.01 },
          { x: "试行后", y: 3.29 },
        ],
      },
      {
        name: "对照组 12 家，285 人",
        data: [
          { x: "试行前", y: 3.06 },
          { x: "试行后", y: 3.09 },
        ],
      },
    ],
  },
  { type: "callout", variant: "warn", icon: "triangle-alert", text: "作者自注：“our findings probably overestimate the true effect” 非随机，公司自愿参加，结果是员工自报。可信的是方向，不是幅度。" },
]

const PACE = [
  {
    type: "chart",
    chart_type: "percent_stacked",
    series: [
      {
        name: "变好",
        tone: "success",
        data: [
          { x: "倦怠", y: 71 },
          { x: "工作压力", y: 39 },
          { x: "睡眠困难", y: 40 },
          { x: "工作量", y: 2 },
          { x: "工作节奏", y: 2 },
        ],
      },
      {
        name: "不变",
        data: [
          { x: "倦怠", y: 7 },
          { x: "工作压力", y: 48 },
          { x: "睡眠困难", y: 45 },
          { x: "工作量", y: 78 },
          { x: "工作节奏", y: 36 },
        ],
      },
      {
        name: "变差",
        tone: "danger",
        data: [
          { x: "倦怠", y: 22 },
          { x: "工作压力", y: 13 },
          { x: "睡眠困难", y: 15 },
          { x: "工作量", y: 20 },
          { x: "工作节奏", y: 62, emphasis: true },
        ],
      },
    ],
  },
  { type: "kpi_cards", items: [{ value: "38→34", unit: "小时", label: "每周实际工时", note: "只少了 4 小时，不是 8 小时" }] },
]

const REVENUE = [
  { type: "blockquote", text: "Companies' revenue, for instance, stayed broadly the same over the trial period, rising by 1.4% on average.", attribution: "Autonomy 等，英国试点报告，2023 年 2 月" },
  { type: "callout", variant: "info", text: "意为：试点期间营收大体持平，按规模加权平均增长 1.4%" },
  {
    type: "kpi_cards",
    items: [
      { value: "**+1.4%**", label: "23 家，试验起点到终点" },
      { value: "+34.5%", label: "另一批 24 家，对比上年同期" },
    ],
  },
  { type: "callout", variant: "info", text: "同一份报告，两种算法：不能混用，引用时两种都写清" },
]

const WEIGHING = [
  {
    type: "pros_cons",
    pros: {
      title: "站得住的",
      items: [
        { label: "倦怠下降，身心健康改善", note: "141 家组织，有对照组，但非随机、员工自报" },
        { label: "多数公司试完愿意继续", note: "英国 61 家，一年后至少 89% 仍在实行" },
        { label: "先改流程的公司更稳", note: "葡萄牙改造两项以上的公司只有 8% 退回" },
      ],
    },
    cons: {
      title: "要当心的",
      items: [
        { label: "营收没有因此上涨", note: "英国 +1.4%，德国无显著差异，巴西 27.3% 的公司下降" },
        { label: "节奏变快，压力转移", note: "英国 62% 说节奏变快，巴西 33.3% 的公司专门加人" },
        { label: "客服和连续在岗岗位最难", note: "Krystal 客服错峰后支持变慢、员工更累，退回五天" },
        { label: "时间一长有人退出", note: "德国两年后 30% 不再缩时，巴西 20 家只剩 2 家" },
      ],
    },
    verdict: "所以我们试，但先定好边界、指标和停止条件，再开始",
  },
]

const MODES = [
  {
    type: "image_grid",
    items: [
      { asset_id: "friday-office", caption: "全员周五（示意）" },
      { asset_id: "service-desk", caption: "错峰轮休（示意）" },
      { asset_id: "planner", caption: "两周九天（示意）" },
    ],
  },
  {
    type: "comparison",
    columns: ["全员周五", "错峰轮休", "两周九天"],
    recommended: 1,
    recommended_label: "客服用这个",
    rows: [
      { label: "怎么休", cells: ["整个部门周五休息", "组员分别休周一到周五中的一天", "两周休一天，其余九天每天约 7.1 小时"] },
      { label: "适合谁", cells: ["协作密集、对外联系少的团队", "客服、运维等需要五天覆盖的岗位", "整天离开有困难的交付团队"] },
      { label: "别处多常见", cells: ["英国试点 32% 的公司", "英国试点 25% 的公司", "葡萄牙试点六成以上员工"] },
    ],
  },
]

const COVERAGE = [
  {
    type: "data_table",
    title: "示例：十人客服组的错峰排班",
    columns: [
      { key: "who", label: "组员" },
      { key: "mon", label: "周一" },
      { key: "tue", label: "周二" },
      { key: "wed", label: "周三" },
      { key: "thu", label: "周四" },
      { key: "fri", label: "周五" },
    ],
    rows: [
      { icon: "user", cells: { who: "组员 A", mon: "休", tue: "", wed: "", thu: "", fri: "" } },
      { icon: "user", cells: { who: "组员 B", mon: "休", tue: "", wed: "", thu: "", fri: "" } },
      { icon: "user", cells: { who: "组员 C", mon: "", tue: "休", wed: "", thu: "", fri: "" } },
      { icon: "user", cells: { who: "组员 D", mon: "", tue: "休", wed: "", thu: "", fri: "" } },
      { icon: "user", cells: { who: "组员 E", mon: "", tue: "", wed: "休", thu: "", fri: "" } },
      { icon: "user", cells: { who: "组员 F", mon: "", tue: "", wed: "休", thu: "", fri: "" } },
      { icon: "user", cells: { who: "组员 G", mon: "", tue: "", wed: "", thu: "休", fri: "" } },
      { icon: "user", cells: { who: "组员 H", mon: "", tue: "", wed: "", thu: "休", fri: "" } },
      { icon: "user", cells: { who: "组员 I", mon: "", tue: "", wed: "", thu: "", fri: "休" } },
      { icon: "user", cells: { who: "组员 J", mon: "", tue: "", wed: "", thu: "", fri: "休" } },
      { emphasis: "total", cells: { who: "在岗", mon: "8 / 10", tue: "8 / 10", wed: "8 / 10", thu: "8 / 10", fri: "8 / 10" } },
    ],
  },
  { type: "image", asset_id: "headset", caption: "错峰后的客服席位（示意）" },
  {
    type: "kpi_cards",
    items: [
      { icon: "headset", value: "50%", label: "最忙那天在岗", note: "Krystal" },
      { icon: "clock", value: "94% → 92%", label: "三日内首次回复率", note: "苏格兰 SOSE" },
      { icon: "building-2", value: "21 / 24", label: "服务指标改善或持平", note: "南剑桥郡议会" },
    ],
  },
]

const ARITHMETIC = [
  { type: "bullets", items: ["每周工时：40 小时 → 32 小时", "总产出：不变", "每小时产出：40 ÷ 32 = 1.25"] },
  { type: "kpi_cards", items: [{ value: "25%", label: "要提高" }] },
  { type: "callout", variant: "info", text: "前车之鉴：Krystal 退回五天的原因之一：多出的休息没能把产出提高 20%。\n所以不能指望大家「更拼一点」，要先砍掉会议和流程。" },
]

const PROCESS = [
  {
    type: "numbered_cards",
    items: [
      { title: "例会默认 30 分钟", text: "每周三上午不排会，超过 1 小时的会要部门负责人批准" },
      { title: "汇报改书面", text: "每周一份书面进展，取代口头汇报会" },
      { title: "审批压到两级", text: "常规审批不超过两个签字人" },
      { title: "每个部门交一份停做清单", text: "列出试行期间不再做的报表和流程", emphasis: true },
    ],
  },
  { type: "image", asset_id: "standup", caption: "白板前的站会（示意）" },
  {
    type: "kpi_cards",
    items: [
      { value: "**8%**", label: "流程改造两项以上", note: "葡萄牙 21 家公司，退回五天的占比" },
      { value: "38%", label: "改造不足两项", note: "葡萄牙 21 家公司，退回五天的占比" },
    ],
  },
]

const TIMETABLE = [
  {
    type: "gantt",
    axis_labels: ["2026 年 10 月", "11 月", "12 月", "2027 年 1 月", "2 月", "3 月", "4 月", "5 月", "6 月", "7 月"],
    items: [
      { label: "准备 2 个月", start: 1, end: 3 },
      { label: "试行 6 个月 · 每周 32 小时", start: 3, end: 9, emphasis: true },
      { label: "定去留", start: 9, end: 10 },
    ],
  },
  {
    type: "timeline",
    milestones: [
      { date: "2026 年 10 月", title: "发布本备忘录", desc: "各部门选模式" },
      { date: "11 月 30 日", title: "各部门交方案", desc: "排班、停做清单、值班表" },
      { date: "2027 年 1 月 4 日", title: "试行开始", desc: "每周 32 小时，薪酬不变", highlight: true },
      { date: "3 月 31 日", title: "中期复盘", desc: "第二次问卷，排班可调" },
      { date: "6 月 30 日", title: "试行结束", desc: "第三次问卷" },
      { date: "7 月 31 日前", title: "公布去留", desc: "逐个部门对照基线决定" },
    ],
  },
]

const STOP = [
  {
    type: "row_cards",
    items: [
      { icon: "headset", title: "客户：首次响应时间", text: "连续 4 周比基线慢 10% 以上" },
      { icon: "trending-down", title: "产出：部门核心指标", text: "连续 2 个月比基线低 5% 以上" },
      { icon: "wallet", title: "成本：加班和外包费用", text: "为顶班新增的部分超过部门工资总额的 3%" },
      { icon: "gauge", title: "员工：倦怠和工作压力", text: "中期问卷的得分高于基线" },
    ],
  },
  { type: "callout", variant: "warn", icon: "circle-stop", text: "触发后：两周内恢复五天。人力资源部提请管理层决定，薪酬照常，其他部门继续试行" },
]

const PAGES: Record<string, { components: unknown[]; drawnBy: CompositionId[]; exhibitNumber?: number }> = {
  "p03 reasons": { components: REASONS, drawnBy: ["annex", "tallies"], exhibitNumber: 2 },
  "p04 wellbeing": { components: WELLBEING, drawnBy: ["slopes"] },
  "p05 pace": { components: PACE, drawnBy: ["diverging"] },
  "p06 revenue": { components: REVENUE, drawnBy: ["citation"] },
  "p08 weighing": { components: WEIGHING, drawnBy: ["scales"] },
  "p09 modes": { components: MODES, drawnBy: ["catalog"], exhibitNumber: 3 },
  "p10 coverage": { components: COVERAGE, drawnBy: ["annex", "rota"], exhibitNumber: 6 },
  "p11 arithmetic": { components: ARITHMETIC, drawnBy: ["sum"] },
  "p12 process": { components: PROCESS, drawnBy: ["annex", "rows"], exhibitNumber: 7 },
  "p13 timetable": { components: TIMETABLE, drawnBy: ["schedule"] },
  "p14 stop": { components: STOP, drawnBy: ["checks"] },
}

describe.each(["memo", "terminal", "crayon"])("the memo board's pages on %s", (theme) => {
  it.each(Object.keys(PAGES))("%s is drawn whole by its compositions, inside the band, legible", (name) => {
    const page = PAGES[name]!
    const { root, ctx } = draw(page.components, theme, page.exhibitNumber)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    const ground = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      if (text.closest("[data-exhibit]") || text.closest("[data-memo-quote-mark]")) continue
      const fill = text.getAttribute("fill")!
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect"))) {
      if (el.closest("[transform]")) continue
      const x = Number(el.getAttribute("x"))
      const w = Number(el.getAttribute("width"))
      expect(x, name).toBeGreaterThanOrEqual(BAND.x - 1)
      expect(x + w, name).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
    }
  })
})

describe("the memo board's pages on memo", () => {
  it("annex pastes the reasons page's picture in as the exhibit the face numbers, a remark in the mark under it", () => {
    const { root, ctx } = draw(REASONS, "memo", 2)
    expect(textOf(root!.querySelector("[data-exhibit] text")!)).toBe("附图 2 · 工作日早晨（示意）")
    expect(root!.querySelector("[data-memo-remark] rect")!.getAttribute("fill")).toBe(memoInks(ctx).mark)
  })

  it("tallies sets every reason's figure in the mark", () => {
    const { root, ctx } = draw(REASONS, "memo", 2)
    const rows = Array.from(root!.querySelectorAll("[data-memo-tally]"))
    expect(rows.length).toBe(3)
    for (const row of rows) {
      const figure = texts(row).find((t) => t.getAttribute("font-size") === "48")!
      expect(figure.getAttribute("fill")).toBe(memoInks(ctx).mark)
    }
  })

  it("slopes prints both ends of each line at the decimals the author wrote, the marked group's in the mark", () => {
    const { root, ctx } = draw(WELLBEING)
    expect(root!.querySelectorAll("[data-memo-slope]")).toHaveLength(3)
    expect(fillOf(root!, "2.83")).toBe(memoInks(ctx).mark)
    expect(byText(root!, "2.90")).toBeDefined()
    expect(root!.querySelector("[data-memo-note]")).not.toBeNull()
  })

  it("diverging runs the better share left and the worse right, the marked row's name in the mark", () => {
    const { root, ctx } = draw(PACE)
    const marked = root!.querySelector("[data-memo-diverging-row='marked']")!
    expect(textOf(texts(marked)[0]!)).toBe("工作节奏")
    expect(texts(marked)[0]!.getAttribute("fill")).toBe(memoInks(ctx).mark)
    expect(root!.querySelector("[data-memo-figure-column]")).not.toBeNull()
  })

  it("citation types the original in the mono face and sets its meaning in the heading face", () => {
    const { root, ctx } = draw(REVENUE)
    const quote = texts(root!).find((t) => textOf(t).startsWith("Companies"))!
    expect(quote.getAttribute("font-family")).toBe(ctx.fonts.mono)
    expect(root!.querySelector("[data-memo-meaning] text:last-of-type")!.getAttribute("font-family")).toBe(ctx.fonts.heading)
    expect(root!.querySelector("[data-memo-figure-panel]")).not.toBeNull()
  })

  it("scales closes the weighing on a banner of ink", () => {
    const { root, ctx } = draw(WEIGHING)
    expect(root!.querySelector("[data-memo-verdict] rect")!.getAttribute("fill")).toBe(memoInks(ctx).ink)
    expect(root!.querySelectorAll("[data-memo-side]")).toHaveLength(2)
  })

  it("catalog numbers its exhibits on from the face's number and tags the recommended option", () => {
    const { root } = draw(MODES, "memo", 3)
    const captions = Array.from(root!.querySelectorAll("[data-exhibit] text")).map(textOf)
    expect(captions).toEqual(["附图 3 · 全员周五（示意）", "附图 4 · 错峰轮休（示意）", "附图 5 · 两周九天（示意）"])
    expect(byText(root!, "客服用这个")).toBeDefined()
  })

  it("rota marks every day off in the mark and totals each day in bold mono", () => {
    const { root, ctx } = draw(COVERAGE, "memo", 6)
    expect(root!.querySelectorAll("[data-rota-off]")).toHaveLength(10)
    const total = texts(root!.querySelector("[data-rota-total]")!).filter((t) => textOf(t) === "8 / 10")
    expect(total).toHaveLength(5)
    expect(total[0]!.getAttribute("font-family")).toBe(ctx.fonts.mono)
  })

  it("sum sets the answer very large in the mark under the working", () => {
    const { root, ctx } = draw(ARITHMETIC)
    const answer = texts(root!).find((t) => textOf(t).startsWith("25"))!
    expect(answer.getAttribute("fill")).toBe(memoInks(ctx).mark)
    expect(Number(answer.getAttribute("font-size"))).toBeGreaterThanOrEqual(80)
    expect(root!.querySelector("[data-memo-side-note]")).not.toBeNull()
  })

  it("schedule letters the stretches in their bars, the marked one in the mark, and keeps the year under the calendar", () => {
    const { root, ctx } = draw(TIMETABLE)
    expect(root!.querySelector("[data-memo-stretch='marked'] rect")!.getAttribute("fill")).toBe(memoInks(ctx).mark)
    expect(byText(root!, "2026 年")).toBeDefined()
    expect(byText(root!, "10 月")).toBeDefined()
    expect(root!.querySelectorAll("[data-memo-dates] [data-memo-row='marked']")).toHaveLength(1)
  })

  it("checks gives each condition a box to tick and closes on a banner of the mark", () => {
    const { root, ctx } = draw(STOP)
    expect(root!.querySelectorAll("[data-memo-tickbox]")).toHaveLength(4)
    expect(root!.querySelector("[data-memo-stop-banner] rect")!.getAttribute("fill")).toBe(memoInks(ctx).mark)
  })
})

describe("what the memo board's compositions decline", () => {
  const ALL: CompositionId[] = ["annex", "tallies", "slopes", "diverging", "citation", "scales", "catalog", "rota", "sum", "schedule", "checks"]
  it.each(ALL)("%s draws only in the memo setting", (id) => {
    const { ctx } = testCtx("memo")
    for (const page of Object.values(PAGES)) {
      expect(COMPOSITIONS[id]({ components: page.components as Component[], ctx: chinese(ctx), rect: BAND })).toBeNull()
    }
  })

  it("diverging declines bars whose series do not say which side is which", () => {
    const chart = { ...(PACE[0] as object), series: (PACE[0] as { series: object[] }).series.map((s) => ({ ...s, tone: undefined })) }
    expect(draw([chart]).element).toBeNull()
  })

  it("checks declines a threshold too long for its column", () => {
    const rows = STOP[0] as { items: { text: string }[] }
    const long = { ...rows, items: rows.items.map((item) => ({ ...item, text: item.text.repeat(4) })) }
    const { root } = draw([long, STOP[1]])
    expect(root === null || !modules(root).includes("checks")).toBe(true)
  })

  it("rota declines a day cell that is not blank or the one word for a day off", () => {
    const table = COVERAGE[0] as { rows: { cells: Record<string, string> }[] }
    const busy = { ...table, rows: table.rows.map((row, i) => (i === 0 ? { ...row, cells: { ...row.cells, tue: "外出" } } : row)) }
    const { ctx } = testCtx("memo")
    expect(COMPOSITIONS.rota({ components: [busy] as Component[], ctx: chinese(ctx), rect: BAND, setting: "memo" })).toBeNull()
  })
})
