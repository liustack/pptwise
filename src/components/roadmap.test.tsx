// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { roadmap } from "./roadmap"
import { measureTextUnits } from "../lib/svg-text-layout"
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

const threePhase = {
  type: "roadmap" as const,
  items: [
    { title: "样板验证", period: "0-6 个月", rows: [{ label: "规模", value: "3-5 个标杆站" }] },
    { title: "区域扩张", period: "7-18 个月", rows: [{ label: "规模", value: "进入 3-5 个城市" }] },
    { title: "规模复制", period: "19-36 个月", rows: [{ label: "规模", value: "策略目标 500+ 站点" }] },
  ],
}

describe("roadmap component", () => {
  it("lays out N equal-width cards with gap=24", () => {
    const { container } = svg(roadmap.render(threePhase, { x: 80, y: 100, w: 1088 }, ctx))
    const cards = Array.from(container.querySelectorAll("rect"))
    expect(cards).toHaveLength(3)
    const cardW = (1088 - 24 * 2) / 3
    cards.forEach((r, i) => {
      expect(Number(r.getAttribute("x"))).toBeCloseTo(80 + i * (cardW + 24))
      expect(Number(r.getAttribute("width"))).toBeCloseTo(cardW)
    })
  })

  it("numbers badges 01..03 (zero-padded) in primary-filled circles", () => {
    const { container } = svg(roadmap.render(threePhase, { x: 0, y: 0, w: 1088 }, ctx))
    const badges = Array.from(container.querySelectorAll("circle"))
    expect(badges).toHaveLength(3)
    badges.forEach((c) => expect(c.getAttribute("fill")).toBe(ctx.colors.primary))
    const digits = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .filter((t) => t && /^0\d$/.test(t))
    expect(digits).toEqual(["01", "02", "03"])
  })

  it("paints an accent top bar as a <path> (rounded top, not a square rect)", () => {
    const { container } = svg(roadmap.render(threePhase, { x: 0, y: 0, w: 1088 }, ctx))
    const bars = Array.from(container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("fill") === ctx.colors.accent,
    )
    expect(bars).toHaveLength(3)
    // Rounded-top path uses an arc command.
    bars.forEach((p) => expect(p.getAttribute("d")).toContain("A "))
  })

  it("measure() grows when a value wraps to two lines", () => {
    const short = {
      type: "roadmap" as const,
      items: [
        { title: "A", rows: [{ label: "x", value: "短" }] },
        { title: "B", rows: [{ label: "x", value: "短" }] },
      ],
    }
    const long = {
      type: "roadmap" as const,
      items: [
        {
          title: "A",
          rows: [{ label: "x", value: "这是一段很长的值会换行到第二行占更多高度的文本内容内容内容" }],
        },
        { title: "B", rows: [{ label: "x", value: "短" }] },
      ],
    }
    expect(roadmap.measure(long, 600, ctx)).toBeGreaterThan(roadmap.measure(short, 600, ctx))
  })

  it("prints a short period whole, at the floor, and never flags it as cut", () => {
    // The period's starting size sat under its own 16px floor, so every fit
    // took the truncate branch and flagged the line even when the whole of
    // "Q1" was painted. The gallery reported every roadmap on every theme.
    const periods = ["Q1", "第一季度", "三月", "Q3 第 1 月", "0-6 个月"]
    const component = {
      type: "roadmap" as const,
      items: periods.slice(0, 3).map((period, i) => ({ title: `阶段${i + 1}`, period })),
    }
    const { container } = svg(roadmap.render(component, { x: 0, y: 0, w: 1088 }, ctx))
    for (const period of periods.slice(0, 3)) {
      const text = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === period)
      expect(text, period).toBeDefined()
      expect(text!.getAttribute("data-truncated"), period).toBeNull()
      expect(Number(text!.getAttribute("font-size")), period).toBeGreaterThanOrEqual(16)
    }
    const rest = { ...component, items: periods.slice(3).map((period, i) => ({ title: `阶段${i + 1}`, period })) }
    const other = svg(roadmap.render(rest, { x: 0, y: 0, w: 1088 }, ctx)).container
    expect(other.querySelector("[data-truncated]")).toBeNull()
  })

  it("says so when a value runs past its two lines, and never of one that fits", () => {
    const long = {
      type: "roadmap" as const,
      items: [
        {
          title: "定方法",
          rows: [{ label: "核算", value: "按欧盟方法核算 2026 年直接排放，约定欧盟认可的核查机构，梳理欧盟客户合同里的 CBAM 费用条款，并把核算与核查费用列入预算" }],
        },
        { title: "实地核查", rows: [{ label: "核查", value: "首个核查年度实地查厂" }] },
        { title: "首次清缴", rows: [{ label: "清缴", value: "申报人清缴 2026 年证书" }] },
      ],
    }
    const { container } = svg(roadmap.render(long, { x: 0, y: 0, w: 1088 }, ctx))
    const cut = Array.from(container.querySelectorAll("text[data-truncated]"))
    expect(cut).toHaveLength(1)
    expect(cut[0]!.textContent!.length).toBeGreaterThan(0)
    expect("按欧盟方法核算 2026 年直接排放，约定欧盟认可的核查机构，梳理欧盟客户合同里的 CBAM 费用条款，并把核算与核查费用列入预算").toContain(cut[0]!.textContent!.replace(/…$/, ""))
    expect(svg(roadmap.render(threePhase, { x: 0, y: 0, w: 1088 }, ctx)).container.querySelector("[data-truncated]")).toBeNull()
  })

  it("sets each value on its label's baseline", () => {
    // The value started at 14.5px under the 16px floor: it painted at 16 but
    // was placed as if it were 14.5, a pixel and a half above its label.
    const { container } = svg(roadmap.render(threePhase, { x: 0, y: 0, w: 1088 }, ctx))
    const texts = Array.from(container.querySelectorAll("text"))
    const labels = texts.filter((t) => t.textContent === "规模")
    expect(labels).toHaveLength(3)
    for (const [i, value] of ["3-5 个标杆站", "进入 3-5 个城市", "策略目标 500+ 站点"].entries()) {
      const v = texts.find((t) => t.textContent === value)
      expect(v, value).toBeDefined()
      expect(v!.getAttribute("y"), value).toBe(labels[i]!.getAttribute("y"))
      expect(Number(v!.getAttribute("font-size")), value).toBeGreaterThanOrEqual(16)
    }
  })

  it("widens the label column into the room short values leave, rather than cut the label", () => {
    // The gallery's English roadmap printed "Workspace headcount" as
    // "Workspace": the label column stopped at 42% of the card although the
    // values beside it were "102k seats" and "91%".
    const component = {
      type: "roadmap" as const,
      items: ["Quarter at a Glance", "Customers and Revenue Mix", "Product and Delivery"].map((title, i) => ({
        title,
        period: `Q${i + 1}`,
        rows: [
          { label: "Workspace headcount", value: "102k seats" },
          { label: "Renewal rate", value: "91%" },
        ],
      })),
    }
    const { container } = svg(roadmap.render(component, { x: 0, y: 0, w: 1088 }, ctx))
    expect(container.querySelector("[data-truncated]")).toBeNull()
    const texts = Array.from(container.querySelectorAll("text"))
    const labels = texts.filter((t) => t.textContent === "Workspace headcount")
    const values = texts.filter((t) => t.textContent === "102k seats")
    expect(labels).toHaveLength(3)
    expect(values).toHaveLength(3)
    for (const [i, label] of labels.entries()) {
      const end = Number(label.getAttribute("x")) + measureTextUnits("Workspace headcount") * 16
      expect(Number(values[i]!.getAttribute("x")) - end).toBeGreaterThanOrEqual(12 - 1e-6)
    }
  })

  it("wraps a label the values leave no room for onto a second line, whole", () => {
    const component = {
      type: "roadmap" as const,
      items: [0, 1, 2].map((i) => ({
        title: `Phase ${i + 1}`,
        rows: [
          { label: "Workspace headcount", value: "十万两千席，三个大区" },
          { label: "Renewal rate", value: "91%" },
        ],
      })),
    }
    const flat = {
      ...component,
      items: component.items.map((it) => ({ ...it, rows: it.rows.map((r) => ({ ...r, label: "Seats" })) })),
    }
    const { container } = svg(roadmap.render(component, { x: 0, y: 0, w: 1088 }, ctx))
    expect(container.querySelector("[data-truncated]")).toBeNull()
    const texts = Array.from(container.querySelectorAll("text"))
    const at = (s: string) => texts.filter((t) => t.textContent === s).map((t) => Number(t.getAttribute("y")))
    expect(at("Workspace")).toHaveLength(3)
    expect(at("headcount")).toHaveLength(3)
    expect(at("十万两千席，三个大区"), "the value keeps its one line").toHaveLength(3)
    // The row under a two-line label starts below that label's second line,
    // and the card grows by what the second line costs.
    expect(at("Renewal rate")[0]! - at("headcount")[0]!).toBeGreaterThanOrEqual(16 * 1.4)
    expect(roadmap.measure(component, 1088, ctx)).toBeGreaterThan(roadmap.measure(flat, 1088, ctx))
  })

  it("renders only svg2pptx-subset primitives", () => {
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">
        {roadmap.render(threePhase, { x: 0, y: 0, w: 1088 }, ctx)}
      </svg>,
    )
    const root = parseSvgRoot(markup)
    expect(() => assertSubset(root)).not.toThrow()
  })
})

describe("roadmap emphasis", () => {
  const barFills = (c: Parameters<typeof roadmap.render>[0]) =>
    Array.from(svg(roadmap.render(c, { x: 80, y: 100, w: 1088 }, ctx)).container.querySelectorAll("path")).map((p) =>
      p.getAttribute("fill"),
    )

  it("keeps the accent bar on the marked phase only, the others in primary", () => {
    const marked = { ...threePhase, items: threePhase.items.map((item, i) => (i === 1 ? { ...item, emphasis: true } : item)) }
    expect(barFills(marked)).toEqual([ctx.colors.primary, ctx.colors.accent, ctx.colors.primary])
  })

  it("keeps every bar accent, byte for byte, when no phase is marked", () => {
    expect(barFills(threePhase)).toEqual([ctx.colors.accent, ctx.colors.accent, ctx.colors.accent])
    const markup = (c: Parameters<typeof roadmap.render>[0]) =>
      renderSvgMarkup(<svg>{roadmap.render(c, { x: 80, y: 100, w: 1088 }, ctx)}</svg>)
    const withFalse = { ...threePhase, items: threePhase.items.map((item) => ({ ...item, emphasis: false })) }
    expect(markup(withFalse)).toBe(markup(threePhase))
  })
})

describe("roadmap phase icon", () => {
  it("draws a phase's icon in its badge in place of the number", () => {
    const { container } = svg(
      roadmap.render(
        {
          type: "roadmap",
          items: [
            { title: "Throttle and back off", period: "2026 Q4", icon: "timer" },
            { title: "Independent paths", period: "2027 Q1" },
          ],
        },
        { x: 0, y: 0, w: 900 },
        ctx,
      ),
    )
    const numbers = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(numbers).not.toContain("01")
    expect(numbers).toContain("02")
    expect(container.querySelectorAll("g[transform^='translate']").length).toBeGreaterThan(0)
  })
})

describe("a roadmap row's basis", () => {
  const budget = {
    type: "roadmap" as const,
    items: [
      { title: "定方法、定机构", period: "2026 年四季度", rows: [{ label: "核算", value: "按欧盟方法核算" }, { label: "预算项", value: "核算与核查费用：待定", basis: "pending" as const }] },
      { title: "首次清缴", period: "2027 年 9 月 30 日", rows: [{ label: "交付", value: "向申报人提交经核查的排放", basis: "law" as const }] },
    ],
  }

  it("underlines a value that is not settled, dashed, and leaves a settled one alone", () => {
    const { container } = svg(roadmap.render(budget, { x: 0, y: 0, w: 900 }, ctx))
    const marks = Array.from(container.querySelectorAll("[data-roadmap-basis]"))
    expect(marks.map((m) => m.getAttribute("data-roadmap-basis"))).toEqual(["pending"])
    expect(marks[0]!.getAttribute("stroke-dasharray")).not.toBeNull()
    expect(Array.from(container.querySelectorAll("text")).map((t) => t.textContent)).toContain("核算与核查费用：待定")
  })
})

describe("a roadmap's timed phases", () => {
  const lesson = {
    type: "roadmap" as const,
    duration_unit: "分钟",
    items: [
      { period: "环节一", title: "它在哪儿帮忙", duration: 15, points: ["四项研究", "两种帮倒忙"], checkpoint: "小测一", rows: [{ label: "目标", value: "会挑任务" }] },
      { period: "环节二", title: "三个真实案例", duration: 7, points: ["三星、律师、航空公司"], rows: [{ label: "目标", value: "会避开风险" }] },
    ],
  }

  it("adds each phase's length to its period, its points under the title and its checkpoint as a tag", () => {
    const { container } = svg(roadmap.render(lesson, { x: 0, y: 0, w: 900 }, ctx))
    const words = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(words).toEqual(expect.arrayContaining(["环节一 · 15 分钟", "环节二 · 7 分钟", "· 四项研究", "· 两种帮倒忙", "· 三星、律师、航空公司", "小测一", "会挑任务"]))
    expect(container.querySelectorAll("[data-roadmap-checkpoint]")).toHaveLength(1)
    expect(container.querySelector("[data-truncated], [data-dropped]")).toBeNull()
    // The rows sit under the checkpoint, not over it.
    const tag = container.querySelector("[data-roadmap-checkpoint] rect")!
    const goal = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "会挑任务")!
    expect(Number(goal.getAttribute("y"))).toBeGreaterThan(Number(tag.getAttribute("y")) + Number(tag.getAttribute("height")))
    expect(() => assertSubset(container.querySelector("svg")!)).not.toThrow()
  })

  it("measures the taller card the points and the checkpoint make", () => {
    const plain = { ...lesson, duration_unit: undefined, items: lesson.items.map(({ title, period, rows }) => ({ title, period, rows })) }
    expect(roadmap.measure(lesson, 900, ctx)).toBeGreaterThan(roadmap.measure(plain, 900, ctx))
  })
})
