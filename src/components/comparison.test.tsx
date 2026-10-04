// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { comparison } from "./comparison"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { contrastRatio } from "../render/ink"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    border: "#CCCCCC",
    chartPalette: ["#006A4E"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24, // balanced default — this suite doesn't exercise body-text sizing
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

const component = {
  type: "comparison" as const,
  columns: ["方案A", "方案B"],
  rows: [
    { label: "价格", cells: ["100元", "200元"] },
    { label: "性能", cells: ["快", "慢"] },
    { label: "稳定性", cells: ["高", "中"] },
  ],
}

describe("comparison component", () => {
  // 用户复验（2026-07-08）：表头 surface 填充条在米色/深色页面上都是一块
  // 割裂的色带（所有主题共用本渲染器，全部中招）。改为编辑排版惯例
  // （booktabs）：零填充融入任意主题底色，层级由加粗表头 + 表头下重规则线
  // 表达。
  it("renders no background fills at all (blends into any theme bg)", () => {
    const { container } = svg(
      comparison.render(component, { x: 80, y: 100, w: 1000 }, ctx),
    )
    expect(container.querySelectorAll("rect").length).toBe(0)
  })

  it("sets the header off with a heavier text-colored rule instead of a fill", () => {
    const { container } = svg(
      comparison.render(component, { x: 0, y: 0, w: 1000 }, ctx),
    )
    const lines = Array.from(container.querySelectorAll("line"))
    const headerRule = lines.find((l) => l.getAttribute("y1") === "44")
    expect(headerRule).toBeTruthy()
    expect(headerRule?.getAttribute("stroke")).toBe(ctx.colors.text)
    expect(Number(headerRule?.getAttribute("stroke-width"))).toBeGreaterThanOrEqual(2)
    // 表头上方不再有顶线（旧实现 y=0 有一条）——表头直接坐在页面底色上
    expect(lines.some((l) => l.getAttribute("y1") === "0")).toBe(false)
  })

  it("closes the table with a light bottom rule", () => {
    const { container } = svg(
      comparison.render(component, { x: 0, y: 0, w: 1000 }, ctx),
    )
    const lines = Array.from(container.querySelectorAll("line"))
    const bottomY = String((component.rows.length + 1) * 44)
    const bottom = lines.find((l) => l.getAttribute("y1") === bottomY)
    expect(bottom).toBeTruthy()
    expect(bottom?.getAttribute("stroke")).toBe("#CCCCCC")
    expect(Number(bottom?.getAttribute("stroke-width"))).toBe(1)
  })

  it("renders correct number of text elements for headers and cells", () => {
    const { container } = svg(
      comparison.render(component, { x: 0, y: 0, w: 1000 }, ctx),
    )
    const texts = container.querySelectorAll("text")
    // Headers: 2 visible (first column header is empty so skipped) = 2
    // Data cells: 3 rows * 3 columns (label + 2 cells) = 9
    // Total >= columns.length + rows * (columns.length + 1)
    const minExpected = component.columns.length + component.rows.length * (component.columns.length + 1)
    expect(texts.length).toBeGreaterThanOrEqual(minExpected)
  })

  it("renders separator lines between rows", () => {
    const { container } = svg(
      comparison.render(component, { x: 0, y: 0, w: 1000 }, ctx),
    )
    const lines = container.querySelectorAll("line")
    // 表头规则线 + 数据行间细线 (rows-1) + 收尾底线 = rows+1 条；无顶线。
    expect(lines.length).toBe(component.rows.length + 1)
    // 首线是表头规则线（y=44，正文色重线），行间细线用 border 色
    expect(lines[0].getAttribute("y1")).toBe("44")
    expect(lines[1].getAttribute("stroke")).toBe("#CCCCCC")
  })

  it("measure returns (rows + 1) * 44", () => {
    const h = comparison.measure(component, 1000, ctx)
    expect(h).toBe((component.rows.length + 1) * 44)
  })

  it("allocates wider column to longer text content", () => {
    const wideComponent = {
      type: "comparison" as const,
      columns: ["短", "这是一个非常非常非常非常长的列标题用来测试列宽分配算法"],
      rows: [
        { label: "行", cells: ["A", "这也是超长文本内容用于验证列宽"] },
      ],
    }
    const { container } = svg(
      comparison.render(wideComponent, { x: 0, y: 0, w: 1200 }, ctx),
    )
    // Find header text elements (skip empty first column header)
    const headerTexts = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "bold" && t.getAttribute("font-size") === "18",
    )
    // The second header (long text) should start at a larger x than the first
    // which means the x gap between them indicates column width distribution
    expect(headerTexts.length).toBeGreaterThanOrEqual(2)
    const x0 = Number(headerTexts[0].getAttribute("x"))
    const x1 = Number(headerTexts[1].getAttribute("x"))
    // The gap from col1 start to col2 start (= col1 width) should be smaller
    // than the gap from col2 start to total width (= col2 width)
    const col1Width = x1 - x0
    const col2Width = 1200 - x1
    expect(col2Width).toBeGreaterThan(col1Width)
  })

  it("wraps in a translated group", () => {
    const { container } = svg(
      comparison.render(component, { x: 120, y: 300, w: 800 }, ctx),
    )
    const g = container.querySelector("g")
    expect(g?.getAttribute("transform")).toBe("translate(120,300)")
  })

  it("uses border color from ctx when available", () => {
    const { container } = svg(
      comparison.render(component, { x: 0, y: 0, w: 1000 }, ctx),
    )
    // 首线是表头规则线（正文色）——行间细线从第二条起
    const line = container.querySelectorAll("line")[1]
    expect(line?.getAttribute("stroke")).toBe("#CCCCCC")
  })

  // 列头/单元格先全表统一缩字号（地板 16px / 12pt），到地板仍放不下才截断。
  describe("shrink-before-truncate", () => {
    const longHeaders = {
      type: "comparison" as const,
      columns: ["对比维度总览与说明列表甲", "对比维度总览与说明列表乙"],
      rows: [{ label: "行", cells: ["A", "B"] }],
    }

    it("renders a moderately long header in full at a reduced font size", () => {
      const { container } = svg(
        comparison.render(longHeaders, { x: 0, y: 0, w: 900 }, ctx),
      )
      const headerTexts = Array.from(container.querySelectorAll("text")).filter(
        (t) => t.getAttribute("font-weight") === "bold" && t.textContent?.startsWith("对比"),
      )
      expect(headerTexts.length).toBe(2)
      for (const t of headerTexts) {
        expect(t.textContent).toMatch(/^对比维度总览与说明列表[甲乙]$/)
        expect(t.textContent).not.toContain("…")
        const size = Number(t.getAttribute("font-size"))
        expect(size).toBeLessThanOrEqual(18)
        expect(size).toBeGreaterThanOrEqual(16)
      }
    })

    it("still truncates at the 16px floor for pathologically long headers", () => {
      const extreme = {
        ...longHeaders,
        columns: [
          "对比维度总览与说明列表甲对比维度总览与说明列表甲对比维度总览与说明列表甲",
          "乙",
        ],
      }
      const { container } = svg(
        comparison.render(extreme, { x: 0, y: 0, w: 500 }, ctx),
      )
      const long = Array.from(container.querySelectorAll("text")).find((t) =>
        t.textContent?.startsWith("对比"),
      )
      expect(long?.textContent).not.toContain("…")
      expect(long?.getAttribute("data-truncated")).toBe("1")
      expect(long?.getAttribute("font-size")).toBe("16")
    })

    it("renders a moderately long cell in full at a reduced font size", () => {
      const cellComponent = {
        type: "comparison" as const,
        columns: ["方案A", "方案B"],
        rows: [
          { label: "结论", cells: ["落后 27 个百分点且持续扩大中", "领先"] },
        ],
      }
      // 宽盒在 16px 地板上仍能完整放下。更窄的盒走到截断，由下一条钉死。
      const { container } = svg(
        comparison.render(cellComponent, { x: 0, y: 0, w: 720 }, ctx),
      )
      const cell = Array.from(container.querySelectorAll("text")).find((t) =>
        t.textContent?.startsWith("落后"),
      )
      expect(cell?.textContent).toBe("落后 27 个百分点且持续扩大中")
      const size = Number(cell?.getAttribute("font-size"))
      expect(size).toBeGreaterThanOrEqual(16)
    })

    it("keeps default sizes when content is short", () => {
      const { container } = svg(
        comparison.render(component, { x: 0, y: 0, w: 1000 }, ctx),
      )
      const header = Array.from(container.querySelectorAll("text")).find(
        (t) => t.textContent === "方案A",
      )
      const cell = Array.from(container.querySelectorAll("text")).find(
        (t) => t.textContent === "100元",
      )
      expect(header?.getAttribute("font-size")).toBe("18")
      expect(cell?.getAttribute("font-size")).toBe("16")
    })
  })

  it("falls back to muted color when border is not set", () => {
    const noBorderCtx: ComponentCtx = {
      ...ctx,
      colors: { ...ctx.colors, border: undefined },
    }
    const { container } = svg(
      comparison.render(component, { x: 0, y: 0, w: 1000 }, noBorderCtx),
    )
    const line = container.querySelectorAll("line")[1]
    expect(line?.getAttribute("stroke")).toBe("#5D6B65")
  })
})

describe("comparison 首列重复归一化（2026-07-10 无图矩阵真机病型：模型把 label 又抄进 cells[0]）", () => {
  it("全部行 cells[0]===label 且 cells 长度等于 columns 长度时：丢 cells[0]，columns[0] 移作标签列表头", () => {
    const dupComponent = {
      type: "comparison" as const,
      columns: ["维度", "我们", "竞品"],
      rows: [
        { label: "价格", cells: ["价格", "低 15%", "基准"] },
        { label: "性能", cells: ["性能", "提升 30%", "基准"] },
      ],
    }
    const { container } = render(
      <svg>{comparison.render(dupComponent, { x: 80, y: 200, w: 1120 }, ctx)}</svg>,
    )
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    // 「价格」只出现一次（标签列），不再双渲
    expect(texts.filter((t) => t === "价格")).toHaveLength(1)
    expect(texts.filter((t) => t === "性能")).toHaveLength(1)
    // columns[0]「维度」成为标签列表头
    expect(texts).toContain("维度")
    expect(texts).toContain("低 15%")
  })

  it("非全行命中（真实数据巧合）不归一", () => {
    const okComponent = {
      type: "comparison" as const,
      columns: ["项目", "数值"],
      rows: [
        { label: "甲", cells: ["甲", "1"] },
        { label: "乙", cells: ["丙", "2"] },
      ],
    }
    const { container } = render(
      <svg>{comparison.render(okComponent, { x: 80, y: 200, w: 1120 }, ctx)}</svg>,
    )
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts.filter((t) => t === "甲")).toHaveLength(2)
  })

  // P0 hardening (robustness deep-review D1, family-sweep sibling of
  // bullets.tsx): `rows` has no schema ceiling and each row costs a fixed
  // ROW px regardless of content — pre-fix, render() drew every row
  // unconditionally, pushing an extreme row count (D1's repro used 300)
  // arbitrarily far past the canvas.
  describe("box.h-aware vertical cap (graceful landing)", () => {
    const manyRowsComponent = {
      type: "comparison" as const,
      columns: ["A", "B"],
      rows: Array.from({ length: 300 }, (_, i) => ({
        label: `row ${i}`,
        cells: [`cell ${i}a`, `cell ${i}b`],
      })),
    }

    it("caps rendered rows to what box.h can hold and marks the drop with data-dropped, never drawing a rule line past the box", () => {
      const box = { x: 96, y: 176, w: 1088, h: 300 }
      const { container } = render(<svg>{comparison.render(manyRowsComponent, box, ctx)}</svg>)
      // Far fewer than the full 300 rows got rendered.
      const dataRowLabelTexts = Array.from(container.querySelectorAll("text")).filter((t) =>
        (t.textContent ?? "").startsWith("row "),
      )
      expect(dataRowLabelTexts.length).toBeGreaterThan(0)
      expect(dataRowLabelTexts.length).toBeLessThan(manyRowsComponent.rows.length)

      // No rule line (header/separator/bottom) lands past box.h.
      for (const line of Array.from(container.querySelectorAll("line"))) {
        expect(Number(line.getAttribute("y1"))).toBeLessThanOrEqual(box.h)
      }

      const dropped = container.querySelector("[data-dropped]")
      expect(dropped).toBeTruthy()
      const hiddenCount = Number(dropped!.getAttribute("data-dropped"))
      expect(hiddenCount).toBeGreaterThan(0)
      expect((dropped!.textContent ?? "").trim()).toBe("")
      expect(hiddenCount + dataRowLabelTexts.length).toBe(manyRowsComponent.rows.length)
    })

    // This used to pin the opposite: at least one row drawn, however short
    // the box. A row kept that way is drawn below the box with no mark
    // anywhere, which breaks the repo's rule that a component either draws
    // all it was given or declares the loss. The whole table now declines.
    it("declines a box too short for the header and one row, instead of drawing that row outside it", () => {
      const box = { x: 0, y: 0, w: 1088, h: 5 }
      const { container } = render(<svg>{comparison.render(manyRowsComponent, box, ctx)}</svg>)
      expect(container.querySelectorAll("text")).toHaveLength(0)
      const marker = container.querySelector("[data-dropped]")
      expect(marker?.getAttribute("data-dropped-kind")).toBe("component")
    })

    it("declines a one-row table whose row cannot fit under the header", () => {
      const single = {
        type: "comparison" as const,
        columns: ["Option"],
        rows: [{ label: "Plan", cells: ["Customer support and training included"] }],
      }
      const { container } = render(<svg>{comparison.render(single, { x: 0, y: 0, w: 300, h: 80 }, ctx)}</svg>)
      for (const t of container.querySelectorAll("text, line")) {
        expect(Number(t.getAttribute("y") ?? t.getAttribute("y1"))).toBeLessThanOrEqual(80)
      }
      expect(container.querySelector("[data-dropped]")?.getAttribute("data-dropped-kind")).toBe("component")
    })

    it("is a byte-identical no-op when box.h is omitted (the ordinary/common render path)", () => {
      const withoutH = render(
        <svg>{comparison.render(component, { x: 0, y: 0, w: 1120 }, ctx)}</svg>,
      ).container.innerHTML
      const withGenerousH = render(
        <svg>{comparison.render(component, { x: 0, y: 0, w: 1120, h: 100000 }, ctx)}</svg>,
      ).container.innerHTML
      expect(withoutH).toBe(withGenerousH)
      expect(withoutH).not.toContain("data-dropped")
    })

    it("never shows a data-dropped marker when every row already fits box.h", () => {
      const measured = comparison.measure(component, 1120, ctx)
      const { container } = render(
        <svg>{comparison.render(component, { x: 0, y: 0, w: 1120, h: measured + 40 }, ctx)}</svg>,
      )
      expect(container.querySelector("[data-dropped]")).toBeNull()
    })
  })
})

describe("comparison 空首列表头归一化（2026-08-19 gallery 重渲：20 页表头整排右移一列）", () => {
  // 作者在 columns 里替标签列先塞了一个空表头，于是表头比数据列多出一格。
  // 归一化之前「冶金」压在「华东」那一列上，第一列数据头顶没有表头，
  // 「风电」悬在一个没有数据的第五列。
  const blankLeadComponent = {
    type: "comparison" as const,
    columns: ["", "冶金", "化工", "风电"],
    rows: [
      { label: "华东", cells: ["第一季度", "增长 12%", "第二季度"] },
      { label: "华南", cells: ["第三季度", "持平", "第四季度"] },
    ],
  }

  const xByText = (container: HTMLElement) => {
    const map = new Map<string, number>()
    for (const t of Array.from(container.querySelectorAll("text"))) {
      map.set(t.textContent ?? "", Number(t.getAttribute("x")))
    }
    return map
  }

  it("丢掉空的首个表头，每个表头回到自己那一列数据的正上方", () => {
    const { container } = render(
      <svg>{comparison.render(blankLeadComponent, { x: 96, y: 176, w: 1088 }, ctx)}</svg>,
    )
    const x = xByText(container)
    expect(x.get("冶金")).toBe(x.get("第一季度"))
    expect(x.get("化工")).toBe(x.get("增长 12%"))
    expect(x.get("风电")).toBe(x.get("第二季度"))
    // 最后一个表头不再悬在没有数据的空列上：它的 x 不超过最右一列数据
    expect(x.get("风电")!).toBeLessThanOrEqual(x.get("第四季度")!)
  })

  it("cells 与 columns 等长时不归一（作者真要的空表头，本来就对齐）", () => {
    const intentionalBlank = {
      type: "comparison" as const,
      columns: ["", "我们", "竞品"],
      rows: [{ label: "价格", cells: ["基准", "低 15%", "高 4%"] }],
    }
    const { container } = render(
      <svg>{comparison.render(intentionalBlank, { x: 0, y: 0, w: 1088 }, ctx)}</svg>,
    )
    const x = xByText(container)
    // 三列数据全部画出，表头压在后两列上
    expect(x.get("基准")).toBeDefined()
    expect(x.get("我们")).toBe(x.get("低 15%"))
    expect(x.get("竞品")).toBe(x.get("高 4%"))
  })

  it("两种笔误叠在一起时先丢空表头，再走首列重复归一化", () => {
    const both = {
      type: "comparison" as const,
      columns: ["", "维度", "我们", "竞品"],
      rows: [
        { label: "价格", cells: ["价格", "低 15%", "基准"] },
        { label: "性能", cells: ["性能", "提升 30%", "基准"] },
      ],
    }
    const { container } = render(
      <svg>{comparison.render(both, { x: 0, y: 0, w: 1120 }, ctx)}</svg>,
    )
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts.filter((t) => t === "价格")).toHaveLength(1)
    const x = xByText(container)
    expect(x.get("维度")).toBe(x.get("价格"))
    expect(x.get("我们")).toBe(x.get("低 15%"))
  })

  describe("a half-page box", () => {
    const georgia: ComponentCtx = { ...ctx, fonts: { heading: "Georgia", body: "Georgia, Songti SC, STSong, serif", mono: "Consolas" } }
    const english = {
      type: "comparison" as const,
      columns: ["Consulting", "Platforms", "K-12"],
      rows: [
        { label: "Seat expansion in existing accounts", cells: ["Q1", "East", "Q2"] },
        { label: "Standardized onboarding templates", cells: ["Q2", "South", "Q3"] },
        { label: "In-house workspace compute", cells: ["Q3", "North", "Q4"] },
        { label: "Vertical playbook replication", cells: ["Q4", "Southwest", "Q1"] },
      ],
    }

    it("gives short columns the width their words need and wraps the long label column", () => {
      const box = { x: 656, y: 294, w: 528 }
      const h = comparison.measure(english, box.w, georgia)
      const { container } = render(<svg>{comparison.render(english, box, georgia)}</svg>)
      expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
      const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
      for (const header of english.columns) expect(texts).toContain(header)
      expect(texts).toContain("Southwest")
      const words = texts.join(" ")
      for (const row of english.rows) expect(words).toContain(row.label)
      // The height the face reserves is the height drawn: the closing rule
      // sits on it and every baseline sits above it.
      const rules = Array.from(container.querySelectorAll("line")).map((l) => Number(l.getAttribute("y1")))
      expect(Math.max(...rules)).toBe(h)
      for (const t of container.querySelectorAll("text")) expect(Number(t.getAttribute("y"))).toBeLessThan(h)
      expect(h).toBeGreaterThan((english.rows.length + 1) * 44)
    })
  })
})

describe("comparison in a box shorter than its wrapped rows", () => {
  it("gives back cell lines and marks the cut rather than drawing past the box", () => {
    const table = {
      type: "comparison" as const,
      columns: ["Option"],
      rows: [{ label: "Plan", cells: ["Customer support and training included"] }],
    }
    const swiss = boundThemeCtx("swiss", {})
    // Unbounded, the cell wraps and the table measures taller than one row.
    expect(comparison.measure(table, 300, swiss)).toBeGreaterThan(88)
    const box = { x: 0, y: 0, w: 300, h: 88 }
    const { container } = render(<svg>{comparison.render(table, box, swiss)}</svg>)
    for (const line of container.querySelectorAll("line")) expect(Number(line.getAttribute("y1"))).toBeLessThanOrEqual(box.h)
    for (const t of container.querySelectorAll("text")) expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(box.h)
    expect(container.querySelector('[data-truncated="1"]')).not.toBeNull()
  })
})


describe("comparison marks and a recommended column", () => {
  const options = {
    type: "comparison" as const,
    columns: ["Add 600 vans", "Fix density first"],
    rows: [
      { label: "Cost to Northwind", cells: ["$210M capital", "$38M over 12 months"] },
      { label: "Cost per parcel", cells: ["4% lower", "**18% lower**"] },
    ],
  }
  const brief = boundThemeCtx("brief", {})
  const lecture = boundThemeCtx("lecture", {})
  const box = { x: 0, y: 0, w: 1000 }
  const texts = (container: Element) => Array.from(container.querySelectorAll("text"))
  const textOf = (container: Element, content: string) => texts(container).find((t) => t.textContent === content)!

  it("paints a `**` run with the theme's own stroke and never prints the asterisks", () => {
    for (const ctx of [brief, lecture]) {
      const { container } = svg(comparison.render(options, box, ctx))
      expect(container.textContent).not.toContain("*")
      expect(textOf(container, "18% lower")).toBeDefined()
    }
    // brief strikes a marked run with a marker pad, lecture with a chalk underline.
    expect(svg(comparison.render(options, box, brief)).container.querySelector("[data-emphasis-pad]")).not.toBeNull()
    expect(svg(comparison.render(options, box, lecture)).container.querySelector("[data-emphasis-underline]")).not.toBeNull()
  })

  it("paints a marked run on vermilion in a colour that reads as text, not its gold", () => {
    // vermilion's accent is a gold kept for rules (2.26:1 on its paper). A
    // marked run fell back to it, so the one phrase a page marked was the
    // hardest one to read.
    const vermilion = boundThemeCtx("vermilion", {})
    const { container } = svg(comparison.render(options, box, vermilion))
    const tspan = Array.from(container.querySelectorAll("tspan")).find((t) => t.textContent === "18% lower")
    const fill = tspan?.getAttribute("fill") ?? textOf(container, "18% lower").getAttribute("fill")!
    expect(fill.toLowerCase()).not.toBe(vermilion.colors.accent.toLowerCase())
    expect(contrastRatio(fill, vermilion.defaultBg ?? vermilion.colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("measures a marked cell without its asterisks", () => {
    const plain = { ...options, rows: options.rows.map((row) => ({ ...row, cells: row.cells.map((cell) => cell.replaceAll("**", "")) })) }
    expect(comparison.measure(options, 520, brief)).toBe(comparison.measure(plain, 520, brief))
    const { container } = svg(comparison.render(options, { x: 0, y: 0, w: 520 }, brief))
    expect(container.querySelector('[data-truncated="1"]')).toBeNull()
  })

  it("sets the recommended column's header and cells in primary, bold", () => {
    const { container } = svg(comparison.render({ ...options, recommended: 1 }, box, brief))
    const primary = brief.colors.primary
    const header = textOf(container, "Fix density first")
    expect(header.getAttribute("fill")).toBe(primary)
    expect(header.getAttribute("font-weight")).toBe("bold")
    const cell = textOf(container, "$38M over 12 months")
    expect(cell.getAttribute("fill")).toBe(primary)
    expect(cell.getAttribute("font-weight")).toBe("bold")
    // The other option keeps the table's own inks.
    expect(textOf(container, "Add 600 vans").getAttribute("fill")).toBe(brief.colors.text)
    const other = textOf(container, "$210M capital")
    expect(other.getAttribute("fill")).toBe(brief.colors.text)
    expect(other.getAttribute("font-weight")).toBe("normal")
  })

  it("keeps a recommended column readable on a theme whose primary is a block fill", () => {
    // rally's primary is a banner color that does not separate from its page.
    const rally = boundThemeCtx("rally", {})
    const { container } = svg(comparison.render({ ...options, recommended: 1 }, box, rally))
    const cell = textOf(container, "$38M over 12 months")
    expect(contrastRatio(cell.getAttribute("fill")!, rally.colors.bg)).toBeGreaterThanOrEqual(4.5)
  })

  it("follows the recommended column when a repeated label column is folded away", () => {
    // Every row repeats its label in cells[0], so columns[0] becomes the
    // label column's header and recommended 2 still names "Fix density first".
    const repeated = {
      type: "comparison" as const,
      columns: ["Measure", "Add 600 vans", "Fix density first"],
      recommended: 2,
      rows: options.rows.map((row) => ({ ...row, cells: [row.label, ...row.cells] })),
    }
    const { container } = svg(comparison.render(repeated, box, brief))
    expect(textOf(container, "Fix density first").getAttribute("fill")).toBe(brief.colors.primary)
    expect(textOf(container, "Add 600 vans").getAttribute("fill")).toBe(brief.colors.text)
  })

  it("paints an unmarked table with no tspans and the table's own inks", () => {
    const { container } = svg(comparison.render(component, box, brief))
    expect(container.querySelector("tspan")).toBeNull()
    for (const t of texts(container)) expect([brief.colors.text, brief.colors.muted]).toContain(t.getAttribute("fill"))
  })
})
