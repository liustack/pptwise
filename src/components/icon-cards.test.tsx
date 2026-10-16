// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { measureTextUnits } from "../lib/svg-text-layout"
import { columnGutterEm } from "../lib/column-gutter"
import { iconCards } from "./icon-cards"
import { isRuled } from "./surfaces"
import { FORM_BODY_FLOOR } from "./legibility"
import { CANONICAL_THEME_IDS } from "../themes"
import { PPTX_ICON_NAMES } from "@/icons/catalog"
import type { ComponentCtx } from "./types"
import type { PptxIR } from "@/ir"
import { auditDeck } from "../audit/deck-audit"

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function markupOf(node: React.ReactElement): string {
  return renderSvgMarkup(<svg xmlns="http://www.w3.org/2000/svg">{node}</svg>)
}

function card(title: string, text: string, icon = "rocket") {
  return { icon, title, text }
}

const four = {
  type: "icon_cards" as const,
  items: [
    card("断言一", "简短说明一"),
    card("断言二", "简短说明二"),
    card("断言三", "简短说明三"),
    card("断言四", "简短说明四"),
  ],
}

const six = {
  type: "icon_cards" as const,
  items: Array.from({ length: 6 }, (_, i) => card(`口径${i + 1}`, `说明${i + 1}`)),
}

const BOX = { x: 80, y: 100, w: 1088 }

function themeCtx(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
}

function isInsideScaledIcon(el: Element): boolean {
  for (let n: Element | null = el; n; n = n.parentElement) {
    if (/scale\(/.test(n.getAttribute("transform") ?? "")) return true
  }
  return false
}

function nodeCircles(container: ParentNode): SVGCircleElement[] {
  return Array.from(container.querySelectorAll("circle")).filter(
    (c) => !isInsideScaledIcon(c) && Number(c.getAttribute("r") ?? 0) > 16,
  )
}

function assertInsideBox(container: HTMLElement, w: number, h: number, slack = 2) {
  for (const c of Array.from(container.querySelectorAll("circle"))) {
    if (isInsideScaledIcon(c)) continue
    const cx = Number(c.getAttribute("cx") ?? 0)
    const cy = Number(c.getAttribute("cy") ?? 0)
    const r = Number(c.getAttribute("r") ?? 0)
    expect(cx - r).toBeGreaterThanOrEqual(-slack)
    expect(cy - r).toBeGreaterThanOrEqual(-slack)
    expect(cx + r).toBeLessThanOrEqual(w + slack)
    expect(cy + r).toBeLessThanOrEqual(h + slack)
  }
  for (const t of Array.from(container.querySelectorAll("text"))) {
    const x = Number(t.getAttribute("x") ?? 0)
    const y = Number(t.getAttribute("y") ?? 0)
    const fontSize = Number(t.getAttribute("font-size") ?? 0)
    const tw = measureTextUnits(t.textContent ?? "") * fontSize
    const left = t.getAttribute("text-anchor") === "middle" ? x - tw / 2 : x
    expect(left).toBeGreaterThanOrEqual(-slack)
    expect(left + tw).toBeLessThanOrEqual(w + slack)
    expect(y - fontSize).toBeGreaterThanOrEqual(-slack)
    expect(y).toBeLessThanOrEqual(h + slack)
  }
}

// One canonical drawing on every theme: a circled icon over a centred
// title and description, in columns. No card shell, no accent bar.
describe("icon_cards component", () => {
  it("draws one circled icon node per item and no card shell", () => {
    const ctx = themeCtx("almanac")
    const { container } = svg(iconCards.render(four, BOX, ctx))
    const nodes = nodeCircles(container)
    expect(nodes).toHaveLength(4)
    for (const node of nodes) {
      expect(node.getAttribute("fill")).toBe(ctx.colors.surface)
      expect(node.getAttribute("stroke")).toBe(ctx.colors.border)
    }
    const shells = Array.from(container.querySelectorAll("rect")).filter(
      (r) => !isInsideScaledIcon(r) && Number(r.getAttribute("width") ?? 0) > 100,
    )
    expect(shells).toHaveLength(0)
    const bars = Array.from(container.querySelectorAll("rect")).filter(
      (r) => r.getAttribute("height") === "3" && !isInsideScaledIcon(r),
    )
    expect(bars).toHaveLength(0)
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (id: string) => {
      const { container } = svg(iconCards.render(four, BOX, themeCtx(id)))
      return Array.from(container.querySelectorAll("circle, rect, line, polygon"))
        .filter((el) => !isInsideScaledIcon(el))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("almanac")
    // A ruled theme draws a hairline over each column where the others lay
    // a disc: the ruled themes agree among themselves, with no disc at all.
    const ruledIds = CANONICAL_THEME_IDS.filter((id) => isRuled(themeCtx(id)))
    const ruledBaseline = ruledIds.length > 0 ? shapesOf(ruledIds[0]!) : ""
    expect(ruledBaseline).not.toContain("circle")
    for (const id of CANONICAL_THEME_IDS) {
      expect(shapesOf(id), id).toBe(isRuled(themeCtx(id)) ? ruledBaseline : baseline)
    }
  })

  it("renders an icon, a title, and description text for every item", () => {
    const { container } = svg(iconCards.render(four, BOX, themeCtx("almanac")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    for (const item of four.items) {
      expect(texts).toContain(item.title)
      expect(texts).toContain(item.text)
    }
    expect(container.querySelectorAll("path").length).toBeGreaterThan(0)
  })

  it("annotates every column with a data-audit-box in the frame its own ink uses", () => {
    // The columns are drawn under this component's `translate(box.x,box.y)`,
    // so their declarations are stated the way their children are: at the
    // local origin, with the transform carrying both to the page together.
    // Adding `box.x`/`box.y` back in made the declaration mean something
    // different from the ink under it the moment a layout wrapper scaled or
    // moved the whole component.
    const { container } = svg(iconCards.render(four, BOX, themeCtx("almanac")))
    const boxes = Array.from(container.querySelectorAll("[data-audit-box]")).map((el) =>
      (el.getAttribute("data-audit-box") ?? "").split(",").map(Number),
    )
    expect(boxes).toHaveLength(4)
    for (const [x, y, w] of boxes) {
      expect(x).toBeGreaterThanOrEqual(0)
      expect(y).toBe(0)
      expect(w).toBeGreaterThan(0)
    }
    // First column at the local origin, later columns to the right of it.
    expect(boxes[0]![0]).toBe(0)
    expect(boxes[1]![0]).toBeGreaterThan(0)
  })

  // The column drawing keeps its own floors (`legibility.ts`): a title
  // inside a narrow column may shrink below the page's body baseline, but
  // never below the readable floor.
  it("keeps every text line at or above the readable font floor", () => {
    const wordy = {
      type: "icon_cards" as const,
      items: Array.from({ length: 4 }, (_, i) =>
        card(`一个相当长的断言标题第${i + 1}条`, "这一句说明写得比一般情况长一些，用来把换行与缩字都逼出来。"),
      ),
    }
    const { container } = svg(iconCards.render(wordy, BOX, themeCtx("almanac")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      if (isInsideScaledIcon(t)) continue
      expect(Number(t.getAttribute("font-size")), `"${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("6 items stay inside the box on every theme", () => {
    for (const id of ["almanac", "terminal", "thesis", "swiss", "lecture"] as const) {
      const ctx = themeCtx(id)
      const h = iconCards.measure(six, BOX.w, ctx)
      const { container } = svg(iconCards.render(six, { ...BOX, h }, ctx))
      assertInsideBox(container, BOX.w, h)
    }
  })

  it("stays within the controlled SVG subset", () => {
    const markup = markupOf(iconCards.render(six, BOX, themeCtx("almanac")))
    expect(markup).not.toContain("foreignObject")
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })

  it("degrades without throwing when an item names no icon", () => {
    const ctx = themeCtx("almanac")
    const emptyIcon = {
      type: "icon_cards" as const,
      items: [
        { icon: "", title: "空图标", text: "降级" },
        { icon: "rocket", title: "有图标", text: "正常" },
      ],
    }
    expect(() => svg(iconCards.render(emptyIcon, BOX, ctx))).not.toThrow()
    expect(nodeCircles(svg(iconCards.render(emptyIcon, BOX, ctx)).container).length).toBeGreaterThanOrEqual(2)
  })

  it("draws every icon in the catalog without leaving the subset", () => {
    const ctx = themeCtx("almanac")
    for (const name of PPTX_ICON_NAMES.slice(0, 40)) {
      const one = { type: "icon_cards" as const, items: [{ icon: name, title: name, text: "说明" }] }
      const markup = markupOf(iconCards.render(one, BOX, ctx))
      expect(() => assertSubset(parseSvgRoot(markup)), name).not.toThrow()
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const ctx = themeCtx("swiss")
    expect(markupOf(iconCards.render(four, BOX, ctx))).toBe(markupOf(iconCards.render(four, BOX, ctx)))
  })

  it("tops every column in a row at one line, so icons and titles align across it", () => {
    // Pre-fix each column centred its own stack in the row, so a column with
    // a longer body sat higher than its neighbours and the icons stepped
    // across the row (brief and thesis gallery pages).
    const uneven = {
      type: "icon_cards" as const,
      items: [
        card("In-house workspace compute", "Moving workloads off public cloud dropped per-seat monthly cost by thirty-one percent.", "target"),
        card("Vertical playbook replication", "East China penetration is half of South China.", "gauge"),
        card("Staffing-path automation", "Client managers are running near their load ceiling, so expansion is gated on hiring.", "shield"),
        card("Channel partner", "Two competitors bid below cost.", "rocket"),
      ],
    }
    const { container } = svg(iconCards.render(uneven, { x: 96, y: 330, w: 1088, h: 252 }, themeCtx("brief")))
    const groups = Array.from(container.querySelectorAll("[data-audit-box]"))
    expect(groups).toHaveLength(4)
    const nodeCy = groups.map((g) => Number(g.querySelector(":scope > circle")!.getAttribute("cy")))
    expect(new Set(nodeCy).size).toBe(1)
    const titleY = groups.map((g) => Number(g.querySelector("text")!.getAttribute("y")))
    expect(new Set(titleY).size).toBe(1)
    // The bodies still differ in length, so the stacks differ in height.
    const lastY = groups.map((g) => Math.max(...Array.from(g.querySelectorAll("text")).map((t) => Number(t.getAttribute("y")))))
    expect(new Set(lastY).size).toBeGreaterThan(1)
  })

  it("shrinks the icon node before it cuts a sentence the box could hold", () => {
    const english = {
      type: "icon_cards" as const,
      items: [
        card("In-house workspace compute", "Moving workloads off public cloud dropped per-seat monthly cost by thirty-one percent.", "target"),
        card("Vertical playbook replication", "East China penetration is half of South China, and sales coverage density is the main reason.", "gauge"),
        card("Staffing-path automation", "Client managers are running near their load ceiling, so expansion is gated on hiring.", "shield"),
        card("Channel partner enablement", "Two competitors are bidding below cost in the mid-market, which we cannot meet head-on.", "rocket"),
      ],
    }
    const ctx = themeCtx("brief")
    // 224px: short enough that these four need a smaller node than the
    // natural 44. At 252px they used to, while Georgia was priced 20% wide.
    const h = 224
    const { container } = svg(iconCards.render(english, { x: 96, y: 330, w: 1088, h }, ctx))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const words = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join(" ")
    for (const item of english.items) expect(words).toContain(item.text)
    const radii = Array.from(container.querySelectorAll("[data-audit-box] > circle")).map((c) => Number(c.getAttribute("r")))
    expect(radii.length).toBe(english.items.length)
    for (const r of radii) {
      expect(r).toBeLessThan(44)
      expect(r).toBeGreaterThanOrEqual(28)
    }
    for (const t of container.querySelectorAll("text")) expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(h)
  })

  it("sizes the type against the title lines it then reserves, so a tall box does not cut the body", () => {
    // The split-band face hands a four-card row 307px. Type used to be scaled
    // up against one title line and the lines handed out against two, which
    // left each body a line short of its third.
    const farm = {
      type: "icon_cards" as const,
      items: [
        card("轮作不累地", "七月一场大涝淹田三天，稻子倒伏不足一成。", "target"),
        card("稻鸭共作", "稻鸭共作放鸭三百二十只，除草人工省了六成。", "gauge"),
        card("蛙声报告", "田埂鸟类记录新增七种，白鹭单次最多十一只。", "shield"),
        card("冬绿肥", "会员菜箱四百二十户，续订率八成七。", "rocket"),
      ],
    }
    // And when a title really does wrap at the scaled size, the scale has to
    // have paid for its second line.
    const field = {
      type: "icon_cards" as const,
      items: [
        card("音系先验注入", "对照组实验排除了说话人重叠带来的数据泄漏解释。", "target"),
        card("低资源评测协议", "评测集按村落分层抽样，避免了年龄偏置。", "gauge"),
        card("半自动标注流水线", "方法迁移到藏缅语支后，仅声母系统的收益得到复现。", "shield"),
        card("村落分层抽样", "半自动标注流水线把每小时标注成本从四百元降到九十元。", "rocket"),
      ],
    }
    for (const [theme, ir] of [["almanac", farm], ["thesis", field]] as const) {
      const h = 307.2
      const { container } = svg(iconCards.render(ir, { x: 96, y: 200, w: 1088, h }, themeCtx(theme)))
      expect(container.querySelectorAll("[data-truncated]"), theme).toHaveLength(0)
      const words = Array.from(container.querySelectorAll("text"))
        .map((t) => t.textContent ?? "")
        .join("")
      for (const item of ir.items) expect(words, theme).toContain(item.text)
      for (const t of container.querySelectorAll("text")) expect(Number(t.getAttribute("y")), theme).toBeLessThanOrEqual(h)
    }
  })

  it("declines a box too short for even the smallest icon and a line of title", () => {
    const { container } = svg(iconCards.render(four, { x: 0, y: 0, w: 1088, h: 90 }, themeCtx("brief")))
    expect(container.querySelectorAll("circle, text")).toHaveLength(0)
    expect(container.querySelector("[data-dropped]")?.getAttribute("data-dropped-kind")).toBe("component")
  })
})


describe("icon_cards item tag", () => {
  const tagged = {
    type: "icon_cards" as const,
    items: [
      { icon: "repeat" as const, title: "Retry storm", text: "Retries overwhelm one region, then the next.", tag: { text: "Azure 2026-02" } },
      { icon: "layers" as const, title: "Backlog collapse", text: "Leases pile up until nothing moves.", tag: { text: "AWS 2025-10" } },
      { icon: "refresh-cw" as const, title: "Restart together", text: "Every task restarts at once." },
    ],
  }

  it("prints each card's tag under its node, and keeps the titles level", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(iconCards.render(tagged, { ...BOX, h: iconCards.measure(tagged, BOX.w, ctx) }, ctx))
    expect(Array.from(container.querySelectorAll("[data-tag]")).map((tag) => tag.textContent)).toEqual(["Azure 2026-02", "AWS 2025-10"])
    const titles = ["Retry storm", "Backlog collapse", "Restart together"].map((t) => Array.from(container.querySelectorAll("text")).find((el) => el.textContent === t)!)
    expect(new Set(titles.map((t) => t.getAttribute("y"))).size).toBe(1)
  })

  // The writer's references page on brief: six tagged cards in its 412px
  // band. The tag row took the height the text needed, and with the node at
  // its natural size no line of any card's text was left. A text with no
  // line left did not count as cut, so the node never gave up its height,
  // and the six texts went missing under a mark the audit read as a cut
  // title.
  const references = {
    type: "icon_cards" as const,
    items: [
      { icon: "factory" as const, title: "深圳莱宝高科光明工厂", text: "光伏 2.541 MWp，EMC 20 年，预计年发电 295.6 万 kWh、年省约 62.90 万元", tag: { text: "企业口径", evidence: "company" as const } },
      { icon: "factory" as const, title: "常州钟楼金瑞达园区", text: "光伏一期约 1.6 MW，年均发电 146.7 万 kWh，年省约 36 万元", tag: { text: "项目口径", evidence: "official" as const } },
      { icon: "battery-charging" as const, title: "常州钟楼智谷工场", text: "光伏 0.9 MWp 加储能 1.33 MW，年化发电超过 100 万度，收益超过 20 万元", tag: { text: "项目口径", evidence: "official" as const } },
      { icon: "zap" as const, title: "扬州高邮泰晶厂区", text: "光伏 4 万 kW，储能 27.6 MW/80.25 MWh，预计年消纳绿电 5000 万 kWh", tag: { text: "供电公司口径", evidence: "press" as const } },
      { icon: "file-check" as const, title: "亿晶光电江苏四座电站", text: "0.81 至 3.49 MW，一年 991 至 1098 小时，自用率 77.7% 至 91.0%", tag: { text: "会计师审计", evidence: "company" as const } },
      { icon: "search" as const, title: "贵司的数", text: "按贵司的电费单、负荷曲线和屋顶条件算，参照只说明同类厂房做得成", tag: { text: "待贵司资料", quiet: true } },
    ],
  }

  it("shrinks the node before a tagged card's text goes, and draws every text whole", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(iconCards.render(references, { x: 96, y: 200, w: 1088, h: 412 }, ctx))
    expect(container.querySelector("[data-truncated]")).toBeNull()
    expect(container.querySelector("[data-dropped]")).toBeNull()
    // A line breaks at a space, and the space goes with the break.
    const words = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join("")
      .replace(/\s+/g, "")
    for (const item of references.items) expect(words).toContain(item.text.replace(/\s+/g, ""))
  })

  // 336px leaves each row 160px: at the smallest node a tagged card keeps
  // its title and not one line of its text. The cards used to draw like
  // that, six titles over six missing texts. A card with nothing of its
  // text left declines the box, so the page finds a taller one or says what
  // it lost.
  it("declines a box where even the smallest node leaves a tagged card no line of its text", () => {
    const { container } = svg(iconCards.render(references, { x: 96, y: 200, w: 1088, h: 336 }, themeCtx("brief")))
    expect(container.querySelectorAll("circle, text")).toHaveLength(0)
    expect(container.querySelector("[data-dropped]")?.getAttribute("data-dropped-kind")).toBe("component")
  })

  // The same cards on the page itself, the way the deck drew them. The audit
  // used to read the mark left on a card with no text as a cut title,
  // quoting the tag and the title back. Under a standfirst the band is
  // shorter still, and the face could keep only a line of each card's text.
  // A card's text is the author's own words (`../ir/truncation-tiers.ts`),
  // so the face now gives the page to the step-aside sheet, which has the
  // room to draw every card whole.
  it("draws them whole on brief's page, and under a standfirst steps aside rather than cut a card's text", () => {
    const page = (subheading?: string): PptxIR =>
      ({
        version: "5",
        filename: "references",
        theme: { id: "brief" },
        meta: {},
        assets: { images: {} },
        slides: [
          {
            type: "content",
            kind: "list",
            heading: "同类厂房已经在做：公开记录里的五个参照",
            ...(subheading ? { subheading } : {}),
            footnote: "来源：莱宝高科公告（2024-10-30），常州市钟楼区政府（2025-04-11）。均非我方项目",
            components: [references],
          },
        ],
      }) as unknown as PptxIR
    expect(auditDeck(page()).findings).toEqual([])
    const findings = auditDeck(page("五家公开记录，一家待补")).findings
    expect(findings.map((f) => f.code)).toEqual(["stepped-aside"])
    expect(findings[0]!.detail).toEqual({ face: "gauge-sheet" })
  })
})

describe("a title over the cards and a card's tone", () => {
  const lessons = {
    type: "icon_cards" as const,
    title: "公开事故的教训",
    items: [
      { icon: "flame", title: "广州黄埔「6·14」事故", text: "电池包测试时热失控后闪爆", tone: "danger" as const },
      { icon: "zap", title: "深圳龙华储能柜起火", text: "初步认定为充电过载" },
    ],
  }

  it("is accepted on the set and on a card", async () => {
    const { schema } = await import("../ir/components/icon-cards")
    expect(schema.safeParse(lessons).success).toBe(true)
    expect(schema.safeParse({ ...lessons, items: [{ ...lessons.items[0], tone: "bad" }, lessons.items[1]] }).success).toBe(false)
  })

  it("sets the title over the cards and moves them under it", async () => {
    const { renderDef } = await import("./icon-cards")
    const ctx = boundThemeCtx("brief", {})
    const { container } = svg(renderDef.render(lessons, { x: 0, y: 0, w: 900, h: 320 }, ctx) as React.ReactElement)
    const title = container.querySelector("[data-block-title] > text")!
    expect(title.textContent).toBe("公开事故的教训")
    const firstCircle = container.querySelector("circle")!
    expect(Number(firstCircle.getAttribute("cy")) - Number(firstCircle.getAttribute("r"))).toBeGreaterThan(Number(title.getAttribute("y")))
    expect(renderDef.measure(lessons, 900, ctx)).toBe(renderDef.measure({ ...lessons, title: undefined }, 900, ctx) + 32)
  })

  it("draws a toned card's icon in the theme's ink for its news, the others in the accent", () => {
    const ctx = boundThemeCtx("brief", {})
    const markup = markupOf(iconCards.render(lessons, { x: 0, y: 0, w: 900, h: 280 }, ctx))
    const strokes = Array.from(parseSvgRoot(markup).querySelectorAll("g[transform] [stroke]")).map((el) => el.getAttribute("stroke"))
    expect(strokes).toContain(ctx.colors.danger)
    expect(strokes).toContain(ctx.colors.accent)
  })
})

describe("icon_cards columns side by side", () => {
  // Two pages as authors wrote them (2026-10): a vermilion report with four
  // services, and a crayon lecture with three goals. Each line was offered
  // its column less 16px, so neighbouring titles and sentences stood a few
  // pixels apart, under one character, and read as one line across the page.
  const services = {
    type: "icon_cards" as const,
    items: [
      card("全程网办", "群众满意率九十八点六，有效投诉量同比下降四成。", "target"),
      card("帮办代办服务", "帮办代办队伍一百零六人，覆盖全部十二个街道。", "gauge"),
      card("午间延时服务", "午间延时服务累计接待两万一千人次，主要集中在社保与不动产。", "shield"),
      card("材料清单精简", "高频事项申请材料平均精简三成五，重复提交材料基本消除。", "rocket"),
    ],
  }
  const goals = {
    type: "icon_cards" as const,
    items: [
      card("看懂", "每月都扣了税，为什么年底还要再算一遍", "book-open"),
      card("**算对**", "跟着一道例题，从全年收入一路算到退税", "calculator"),
      card("去办", "判断自己要不要办，什么时候、在哪儿办", "smartphone"),
    ],
  }

  const columnLines = (container: ParentNode) =>
    Array.from(container.querySelectorAll("svg > g > g")).map((group) =>
      Array.from(group.querySelectorAll("text")).map((t) => {
        const size = Number(t.getAttribute("font-size"))
        const bold = t.getAttribute("font-weight") === "700" || t.getAttribute("font-weight") === "bold"
        const width = measureTextUnits(t.textContent ?? "", { bold, fontFamily: t.getAttribute("font-family") ?? "" }) * size
        const x = Number(t.getAttribute("x"))
        const anchor = t.getAttribute("text-anchor")
        const left = anchor === "end" ? x - width : anchor === "middle" ? x - width / 2 : x
        const y = Number(t.getAttribute("y"))
        return { text: t.textContent, size, left, right: left + width, top: y - 0.8 * size, bottom: y + 0.2 * size }
      }),
    )

  for (const [label, theme, component, box] of [
    ["four services on vermilion", "vermilion", services, { x: 64, y: 300, w: 1152, h: 300 }],
    ["three goals on crayon", "crayon", goals, { x: 64, y: 260, w: 1152, h: 300 }],
  ] as const) {
    it(`keep a gutter between one column's words and the next: ${label}`, () => {
      const { container } = svg(iconCards.render(component, box, themeCtx(theme)))
      const columns = columnLines(container)
      expect(columns).toHaveLength(component.items.length)
      const words = columns.flat().map((l) => l.text).join("")
      for (const item of component.items) expect(words).toContain(item.text)
      for (let i = 0; i + 1 < columns.length; i++) {
        for (const a of columns[i]!) {
          for (const b of columns[i + 1]!) {
            if (a.bottom <= b.top || b.bottom <= a.top) continue
            const gutter = (columnGutterEm(a.text ?? "") * a.size + columnGutterEm(b.text ?? "") * b.size) / 2
            expect(b.left - a.right, `"${a.text}" and "${b.text}"`).toBeGreaterThanOrEqual(gutter - 0.5)
          }
        }
      }
    })
  }

  it("keeps the type its size and takes the gutter in more lines while the row has the height", () => {
    // A brief page with four cards in a 293px row. The gutter's first cut
    // set the type smaller to keep each line's count: titles from 36.6px to
    // 28.9px and texts from 21.9px to 17.4px, with half the page empty
    // under them. The row has the height for a title's second line and the
    // texts' wrapping at the size the cards had before the gutter.
    const ctx = themeCtx("brief")
    const brief = {
      type: "icon_cards" as const,
      items: [
        card("自建基建替换", "自建基建替换公有云托管，单个席位的月度成本下降三成一。", "target"),
        card("客群场景复制", "华东区域的渗透率是华南的一半，销售覆盖密度是主要原因。", "gauge"),
        card("开通流程自动化", "客户成功工程师的人均负荷已经接近上限，扩张速度受制于招聘。", "shield"),
        card("渠道伙伴培育", "两家竞品在中小客户市场以低于成本的价格投标，短期内难以正面应对。", "rocket"),
      ],
    }
    const { container } = svg(iconCards.render(brief, { x: 96, y: 216, w: 1088, h: 292.8 }, ctx))
    const sizes = (weight: string | null) =>
      new Set(
        Array.from(container.querySelectorAll("text"))
          .filter((t) => t.getAttribute("font-weight") === weight)
          .map((t) => Number(t.getAttribute("font-size")).toFixed(1)),
      )
    expect(sizes("700")).toEqual(new Set(["36.6"]))
    expect(sizes(null)).toEqual(new Set(["21.9"]))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const titles = Array.from(container.querySelectorAll('text[font-weight="700"]')).map((t) => t.textContent)
    expect(titles).toEqual(["自建基建替换", "客群场景复制", "开通流程", "自动化", "渠道伙伴培育"])
  })

  it("sets a title just small enough that no English word breaks between its letters", () => {
    // A rally page in English on brief: at the column's size, 「Co-branded」
    // ran wider than its measure and broke as 「Co-brande」+「d packs」.
    const fans = {
      type: "icon_cards" as const,
      items: [
        card("Drink stations", "Fresh cups, a code on each", "cup-soda"),
        card("Co-branded packs", "Pack codes track sell-through", "package"),
        card("Stub swaps", "Store vouchers track visits", "ticket"),
      ],
    }
    const { container } = svg(iconCards.render(fans, { x: 96, y: 216, w: 1088, h: 341.7 }, themeCtx("brief")))
    const titles = Array.from(container.querySelectorAll('text[font-weight="700"]')).map((t) => t.textContent ?? "")
    const words = new Set(fans.items.flatMap((item) => item.title.split(" ")))
    for (const line of titles) for (const word of line.split(" ")) expect(words, line).toContain(word)
    // Only as far as 「Co-branded」 needs: the titles stood at 46px before the
    // gutter, and holding every title to one line set them at 32px.
    const size = Number(container.querySelector('text[font-weight="700"]')!.getAttribute("font-size"))
    expect(size).toBeGreaterThan(44)
    expect(size).toBeLessThan(46)
  })

  it("breaks a title in two between words, not in even halves through one", () => {
    // Balanced halves split 评测 and 标注 on a thesis page, and 三只 on a
    // crayon one; the segmenter hands those words back a character at a time.
    const field = {
      type: "icon_cards" as const,
      items: [
        card("音系先验注入", "对照组实验排除了说话人重叠带来的数据泄漏解释。", "target"),
        card("低资源评测协议", "评测集按村落分层抽样，避免了年龄偏置。", "gauge"),
        card("半自动标注流水线", "方法迁移到藏缅语支后，仅声母系统的收益得到复现。", "shield"),
        card("村落分层抽样", "半自动标注流水线把每小时标注成本从四百元降到九十元。", "rocket"),
      ],
    }
    const play = {
      type: "icon_cards" as const,
      items: [
        card("四人小组搭积木", "户外每天两小时，只因暴雨停过三次。", "target"),
        card("绘本角的旧沙发", "搭积木从各玩各的，变成四人一组。", "gauge"),
        card("小小值日生", "春游走了两公里，没有一个孩子要抱。", "shield"),
        card("戏剧节三只小猪", "戏剧节排练了四个星期，每个孩子都有一句台词。", "rocket"),
      ],
    }
    const titles = (theme: string, ir: typeof field) => {
      const { container } = svg(iconCards.render(ir, { x: 96, y: 200, w: 1088, h: 307.2 }, themeCtx(theme)))
      return Array.from(container.querySelectorAll("svg > g > g")).map((group) =>
        Array.from(group.querySelectorAll('text[font-weight="700"]')).map((t) => t.textContent),
      )
    }
    const all = [...titles("thesis", field), ...titles("crayon", play)]
    expect(all.filter((lines) => lines.length === 2)).toHaveLength(4)
    for (const lines of all) {
      if (lines.length < 2) continue
      expect(
        [["低资源", "评测协议"], ["半自动", "标注流水线"], ["四人小组", "搭积木"], ["绘本角的", "旧沙发"], ["戏剧节", "三只小猪"]],
      ).toContainEqual(lines)
    }
  })
})
