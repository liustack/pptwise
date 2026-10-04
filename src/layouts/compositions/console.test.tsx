// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio } from "../../render/ink"
import type { ContentRect } from "../../render/layout"
import type { ComponentCtx } from "../../components/types"
import { recordsComposition } from "./records"
import { tableComposition } from "./table"
import { wavesComposition } from "./waves"
import { railComposition } from "./rail"
import { consoleInks, consoleTagWidth, fitMono, monoWidth, splitNote } from "./console"
import { crumbFor, headingLead } from "./crumb"
import { drawChecklist } from "./checklist"
import { drawContentsConsole } from "./contents-console"
import type { Composition } from "./shared"
import { byText, renderComposition, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The console setting: terminal's 2026-10 board (`design/rounds/2026-10-05-terminal/`).
 * Each page is the board's own, set on terminal, and every page is drawn on
 * two themes that share nothing with it too: vermilion (warm paper, a red
 * mark, a gold accent) and crayon (light, rounded, saturated). The setting
 * reads the theme's tokens only.
 */

/** The console sheet's body: x64 to x1216, y180 to y650. */
const BAND: ContentRect = { x: 64, y: 180, w: 1152, h: 470 }
const IMAGES = { "grid-a": { src: "data:image/png;base64,AAAA" }, "grid-b": { src: "data:image/png;base64,BBBB" }, "grid-c": { src: "data:image/png;base64,CCCC" }, dash: { src: "data:image/png;base64,DDDD" } }
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })
const THEMES = ["terminal", "vermilion", "crayon"] as const

function draw(composition: Composition, components: unknown[], theme: string = "terminal", rect: ContentRect = BAND) {
  return renderComposition(composition, components, { theme, rect, setting: "console", ctx: chinese })
}


/** p09: which redundancy holds, the cells marked. */
const matrix = [
  {
    type: "data_table",
    columns: [
      { key: "case", label: "事故" },
      { key: "scope", label: "故障范围" },
      { key: "az", label: "多可用区" },
      { key: "region", label: "同云多区域" },
    ],
    rows: [
      { cells: { case: "AWS use1-az4 · 2026-05", scope: "单可用区", az: "✓ 能", region: "✓ 能" } },
      { cells: { case: "AWS us-east-1 · 2025-10", scope: "单区域，牵连部分全局功能", az: "✕ 不能", region: "✓ 能，大体能，IAM 依赖 us-east-1" } },
      { cells: { case: "Google 2025-06、Azure 2026-02", scope: "全球或多区域控制面", az: "✕ 不能", region: "✕ 不能" }, emphasis: "highlight" },
      { cells: { case: "Cloudflare、Azure Front Door", scope: "全球边缘网络", az: "— 不适用", region: "— 不适用，要备用入口" } },
    ],
  },
]

/** p11: a table of figures beside three figure panels, one marked. */
const sla = [
  {
    type: "data_table",
    columns: [
      { key: "sla", label: "SLA 允许的停机" },
      { key: "month", label: "每月", align: "right" },
      { key: "year", label: "每年", align: "right" },
    ],
    rows: [
      { cells: { sla: "99.9%", month: "43.8 分钟", year: "8.77 小时" } },
      { cells: { sla: "99.99%", month: "4.38 分钟", year: "52.6 分钟" }, emphasis: "highlight" },
      { cells: { sla: "99.999%", month: "26.3 秒", year: "5.26 分钟" } },
    ],
  },
  {
    type: "kpi_cards",
    items: [
      { value: "当月服务费", label: "抵扣上限", note: "AWS、Google、Azure 都是", icon: "receipt" },
      { value: "**199**", unit: "倍", label: "AWS 2025-10 窗口是月度额度的", note: "872 分钟对 4.38 分钟", icon: "timer" },
    ],
  },
]

/** p12: four tiers, the third recommended, cost as a rating. */
const tiers = [
  {
    type: "comparison",
    columns: ["备份恢复", "核心待命", "温备", "多区域多活"],
    recommended: 2,
    rows: [
      { label: "RPO", cells: ["小时级", "分钟级", "秒级", "接近零"] },
      { label: "平时在跑", cells: ["只有备份", "数据库和存储常开", "缩小规模的整套服务", "多个区域同时接流量"] },
      { label: "成本", cells: ["$", "$$", "$$$", "$$$$"] },
    ],
  },
]

/** p15: four phases, the first marked, and the decision. */
const roadmap = [
  {
    type: "roadmap",
    items: [
      { title: "限流与退避", period: "2026 Q4", emphasis: true, rows: [{ label: "重试", value: "随机指数退避，设上限" }, { label: "队列", value: "按积压长度限流" }] },
      { title: "独立备用路径", period: "2027 Q1", rows: [{ label: "入口", value: "备用 DNS 与入口" }] },
      { title: "第二区域温备", period: "2027 Q2", rows: [{ label: "RPO", value: "秒级" }, { label: "RTO", value: "分钟级" }] },
    ],
  },
  { type: "callout", variant: "warn", icon: "flag", text: "请评审会拍板：第二区域做温备，不做多活。" },
]

/** p04: windows ranked, the global changes marked, beside two figures. */
const windows = [
  {
    type: "chart",
    chart_type: "bar",
    direction: "horizontal",
    axes: { x_title: "事故窗口", x_unit: "分钟" },
    series: [
      { name: "单区域故障", data: [{ x: "Azure West US 2 · 2026-05", y: 1326 }, { x: "AWS us-east-1 · 2025-10", y: 872 }] },
      { name: "全局变更推到全部", emphasis: true, data: [{ x: "Azure Front Door · 2025-10", y: 504 }, { x: "Cloudflare WAF · 2025-12", y: 25 }] },
    ],
  },
  {
    type: "kpi_cards",
    items: [
      { value: "**5/8**", label: "一次变更推到全部", note: "全局配置、策略或数据很快推到全部节点", icon: "zap" },
      { value: "7+", unit: "个月", label: "AWS 中东两个区域", note: "从 3 月 1 日算起", icon: "flame", tone: "danger" },
    ],
  },
]

const PAGES: [string, Composition, unknown[]][] = [
  ["records (marks)", recordsComposition, matrix],
  ["records (figures)", recordsComposition, sla],
  ["table", tableComposition, tiers],
  ["waves", wavesComposition, roadmap],
  ["rail", railComposition, windows],
]

describe("the console forms on terminal and two themes unlike it", () => {
  for (const theme of THEMES) {
    for (const [name, composition, components] of PAGES) {
      it(`${name} draws the board's page on ${theme}, inside the band, in the subset`, () => {
        const { root } = draw(composition, components, theme)
        expect(root, name).not.toBeNull()
        expect(() => assertSubset(root!)).not.toThrow()
        for (const text of texts(root!)) {
          const x = Number(text.getAttribute("x"))
          expect(x, textOf(text)).toBeGreaterThanOrEqual(BAND.x - 1)
          expect(x, textOf(text)).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
        }
      })
    }
  }
})

describe("records, table, waves and rail in the console setting", () => {
  it("draws a cell's mark as an icon, its word bold in the mark's ink and its note after it", () => {
    const { root, ctx } = draw(recordsComposition, matrix)
    const inks = consoleInks(ctx)
    expect(root!.querySelectorAll("[data-cell-mark='check']")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-cell-mark='x']")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-cell-mark='minus']")).toHaveLength(2)
    const cell = root!.querySelectorAll("[data-cell-mark='check']")[2]!
    const [word, note] = Array.from(cell.querySelectorAll("text"))
    expect(word!.getAttribute("fill")).toBe(inks.success)
    expect(word!.getAttribute("font-weight")).toBe("700")
    expect([word!.getAttribute("data-mark-lead"), textOf(word!), word!.getAttribute("data-gloss-break"), textOf(note!)]).toEqual(["✓ ", "能", "，", "大体能，IAM 依赖 us-east-1"])
    expect(note!.getAttribute("fill")).toBe(inks.muted)
    expect(root!.querySelector("[data-row-marked='1'] rect")!.getAttribute("fill")).toBe(inks.tint)
  })

  it("sets a table of figures in mono, the first column at 32px, beside the figure panels", () => {
    const { root, ctx } = draw(recordsComposition, sla)
    expect(byText(root!, "99.9%")!.getAttribute("font-size")).toBe("32")
    expect(byText(root!, "99.9%")!.getAttribute("font-family")).toBe(ctx.fonts.mono)
    expect(byText(root!, "43.8 分钟")!.getAttribute("text-anchor")).toBe("end")
    expect(root!.querySelector("[data-figure-marked='1']")).not.toBeNull()
    expect(byText(root!, "199 倍")!.getAttribute("fill")).toBe(consoleInks(ctx).mark)
  })

  it("sets the options as cards, the recommended one selected, cost as a meter and RPO in bold mono", () => {
    const { root, ctx } = draw(tableComposition, tiers)
    const inks = consoleInks(ctx)
    expect(Array.from(root!.querySelectorAll("[data-console-tag='filled']")).map(textOf)).toEqual(["SELECT"])
    expect(Array.from(root!.querySelectorAll("[data-console-meter]")).map((m) => m.getAttribute("data-console-meter"))).toEqual(["1/4", "2/4", "3/4", "4/4"])
    expect(byText(root!, "成本 $$$")).toBeDefined()
    const rpo = byText(root!, "秒级")!
    expect([rpo.getAttribute("font-family"), rpo.getAttribute("font-weight"), rpo.getAttribute("fill")]).toEqual([ctx.fonts.mono, "700", inks.mark])
    expect(byText(root!, "只有备份")!.getAttribute("font-family")).toBe(ctx.fonts.body)
  })

  it("runs the phases along one line, the marked node filled, the decision in a warning banner", () => {
    const { root, ctx } = draw(wavesComposition, roadmap)
    const inks = consoleInks(ctx)
    const marked = root!.querySelector("[data-phase='marked'] circle")!
    expect(marked.getAttribute("fill")).toBe(inks.mark)
    expect(root!.querySelector("[data-console-banner='warn'] rect")!.getAttribute("stroke")).toBe(inks.warning)
  })

  it("ranks the bars in the chart's order, the marked series first in the legend", () => {
    const { root, ctx } = draw(railComposition, windows)
    expect(Array.from(root!.querySelectorAll("[data-legend]")).map((l) => l.getAttribute("data-legend"))).toEqual(["全局变更推到全部", "单区域故障"])
    expect(Array.from(root!.querySelectorAll("[data-bar-row]")).map((r) => r.getAttribute("data-bar-row"))).toEqual(["Azure West US 2", "AWS us-east-1", "Azure Front Door", "Cloudflare WAF"])
    expect(byText(root!, "2026-05")!.getAttribute("font-family")).toBe(ctx.fonts.mono)
    expect(byText(root!, "5/8")!.getAttribute("font-size")).toBe("72")
    expect(byText(root!, "AWS 中东两个区域")!.getAttribute("fill")).toBe(consoleInks(ctx).danger)
  })
})

describe("the console's shared pieces", () => {
  it("names a page by its chapter's lead, before the first chapter by its own", () => {
    const ir = {
      meta: { organization: "基础架构组", date: "2026-10" },
      slides: [
        { type: "cover", heading: "封面", components: [] },
        { type: "content", kind: "points", heading: "结论：多区域做到温备", components: [] },
        { type: "chapter", heading: "复盘：13 起中断说了什么", components: [] },
        { type: "content", kind: "points", heading: "没有冒号的一页", components: [] },
        { type: "ending", heading: "收尾", components: [] },
      ],
    } as never
    expect(crumbFor(ir, 0, { chinese: true, pageNumber: true })).toEqual({ section: "00", name: "基础架构组", tail: "2026-10" })
    expect(crumbFor(ir, 1, { chinese: true, pageNumber: true })).toEqual({ section: "00", name: "结论", tail: "P02" })
    expect(crumbFor(ir, 2, { chinese: true, pageNumber: true })).toEqual({ section: "01", name: "章节", tail: "DIR" })
    expect(crumbFor(ir, 2, { chinese: false, pageNumber: true }).name).toBe("Chapter")
    expect(crumbFor(ir, 3, { chinese: true, pageNumber: false })).toEqual({ section: "01", name: "复盘", tail: null })
    expect(crumbFor(ir, 4, { chinese: true, pageNumber: true })).toEqual({ section: "EOF", name: "复盘", tail: "2026-10" })
    expect(headingLead("Review: what 13 outages tell us")).toBe("Review")
    expect(headingLead("没有冒号")).toBeNull()
  })

  it("measures mono at the wider face, wraps between words and never before closing punctuation", () => {
    expect(monoWidth("2h52m", 16)).toBeCloseTo(5 * 16 * (1233 / 2048), 5)
    const fit = fitMono('"DWFM had entered a state of congestive collapse"，而且没有现成的恢复手册。', { width: 384, size: 17, lineHeight: 27, maxLines: 4 })!
    expect(fit.lines.length).toBe(3)
    expect(fit.lines.every((line) => !/^[，。]/u.test(line))).toBe(true)
    expect(fitMono("x".repeat(80), { width: 100, size: 17, lineHeight: 27, maxLines: 4 })).toBeNull()
  })

  it("splits a note at its first colon when what comes before it is a label", () => {
    expect(splitNote("故障本身 vs 事故窗口：5 倍：拖长它的是积压")).toEqual({ label: "故障本身 vs 事故窗口", text: "5 倍：拖长它的是积压", glossBreak: "：" })
    expect(splitNote("Fault vs incident window: 5×").label).toBe("Fault vs incident window")
    expect(splitNote("没有标签的一句话").label).toBeNull()
  })

  it("sizes a tag the way the board does", () => {
    expect(consoleTagWidth("SELECT")).toBe(Math.round(6 * 0.7 * 12 + 18))
  })

  it("lists a checklist whole, and declines more items than the band holds", () => {
    const { ctx } = testCtx("terminal")
    const items = [{ due: "2026 Q4", title: "限流与退避", gloss: "重试退避、队列限流" }, { due: "2027 Q1", title: "独立备用路径", gloss: "入口、身份各留一条路" }]
    const drawn = drawChecklist({ items, ctx, rect: { x: 64, y: 350, w: 1152, h: 300 } })
    const { root } = renderNode(drawn!)
    expect(root.querySelectorAll("[data-checklist-item]")).toHaveLength(2)
    expect(texts(root).filter((t) => textOf(t) === "[ ]")).toHaveLength(2)
    expect(drawChecklist({ items: [...items, ...items, ...items], ctx, rect: { x: 64, y: 350, w: 1152, h: 300 } })).toBeNull()
  })

  it("lists a chapter's pages as a directory, whole or not at all", () => {
    const { ctx } = testCtx("terminal")
    const entries = [{ page: 4, heading: "8 起重大中断里 5 起是同一类：一次变更推到全部" }, { page: 5, heading: "复盘原话：坏配置几秒内推到全部" }]
    const { root } = renderNode(drawContentsConsole({ entries, ctx, rect: { x: 64, y: 410, w: 760, h: 290 } })!)
    expect(texts(root).map(textOf)).toContain("├─ 04")
    expect(drawContentsConsole({ entries, ctx, rect: { x: 64, y: 410, w: 760, h: 40 } })).toBeNull()
  })

  it("keeps every word it paints legible on what it sits on", () => {
    for (const theme of THEMES) {
      const { ctx } = testCtx(theme)
      const inks = consoleInks(chinese(ctx))
      for (const [ink, ground] of [[inks.text, inks.surface], [inks.body, inks.surface], [inks.muted, inks.ground]] as const) {
        expect(contrastRatio(ink, ground), `${theme} ${ink} on ${ground}`).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
