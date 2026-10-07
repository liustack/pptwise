// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { chevronProcess } from "./chevron-process"
import { FORM_BODY_FLOOR, FORM_TITLE_FLOOR } from "./legibility"
import { listThemes } from "../api"
import { contrastRatio } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import { SIBLING_AIR_PX } from "../render/spacing"
import { irJsonSchema } from "../ir/json-schema"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const five = {
  type: "chevron_process" as const,
  items: [
    { title: "需求确认", text: "对齐席位口径与上线范围" },
    { title: "数据接入", text: "打通账号目录与用量表" },
    { title: "配置调试", text: "权限与审批流逐项核对" },
    { title: "小范围试跑", text: "两个部门先跑满两周" },
    { title: "正式交付", text: "全员开通并移交客户成功" },
  ],
}

function withN(n: number) {
  return {
    type: "chevron_process" as const,
    items: Array.from({ length: n }, (_, i) => ({ title: `Stage ${i + 1}`, text: `note ${i + 1}` })),
  }
}

function polys(container: HTMLElement) {
  return Array.from(container.querySelectorAll("polygon")).map((p) => {
    const pts = (p.getAttribute("points") ?? "")
      .trim()
      .split(/\s+/)
      .map((pair) => pair.split(",").map(Number) as [number, number])
    return {
      points: pts,
      fill: p.getAttribute("fill"),
      minX: Math.min(...pts.map(([x]) => x)),
      maxX: Math.max(...pts.map(([x]) => x)),
      minY: Math.min(...pts.map(([, y]) => y)),
      maxY: Math.max(...pts.map(([, y]) => y)),
    }
  })
}

describe("chevron_process component", () => {
  it("draws one chevron per stage and no card rects behind them", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    expect(polys(container)).toHaveLength(5)
    expect(container.querySelectorAll("rect, circle, line").length).toBe(0)
  })

  it("interlocks: each chevron's point reaches past where the next one bites in", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const band = polys(container)
    for (let i = 1; i < band.length; i += 1) {
      expect(band[i]!.minX, `chevron ${i}`).toBeLessThan(band[i - 1]!.maxX)
      expect(band[i]!.minX, `chevron ${i}`).toBeGreaterThan(band[i - 1]!.minX)
    }
    // The first chevron's tail is flat (5 points); every later one is notched (6).
    expect(band[0]!.points).toHaveLength(5)
    for (const chevron of band.slice(1)) expect(chevron.points).toHaveLength(6)
  })

  it("points right: the tip sits on the vertical midline of the band", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    for (const chevron of polys(container)) {
      const tip = chevron.points.find(([x]) => x === chevron.maxX)!
      expect(tip[1]).toBeCloseTo((chevron.minY + chevron.maxY) / 2, 5)
    }
  })

  it("fills the destination chevron whole in primary rather than banding an edge", () => {
    const ctx = themed("brief")
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, ctx))
    const band = polys(container)
    expect(band.at(-1)!.fill).toBe(ctx.colors.primary)
    for (const chevron of band.slice(0, -1)) expect(chevron.fill).toBe(ctx.colors.surface)
    const fills = new Set(Array.from(container.querySelectorAll("text")).map((t) => t.getAttribute("fill")))
    expect(fills.has(ctx.colors.accent)).toBe(false)
  })

  it("prints every stage name, its index and its note", () => {
    const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed("brief")))
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    for (const item of five.items) {
      expect(text.join("|")).toContain(item.title)
      expect(text.join("|")).toContain(item.text)
    }
    expect(text).toEqual(expect.arrayContaining(["01", "02", "03", "04", "05"]))
    expect(container.querySelectorAll("[data-dropped]").length).toBe(0)
  })

  it("describes the note in the public schema the way it is drawn: up to two lines", () => {
    // The schema used to promise a single line while the renderer wrapped a
    // long note to a second one, so a model writing to the schema kept notes
    // shorter than the drawing needs.
    const defs = irJsonSchema().$defs as Record<string, { properties: Record<string, unknown> }>
    const items = defs.chevron_process!.properties.items as { items: { properties: { text: { description: string } } } }
    const note = items.items.properties.text.description
    expect(note).not.toMatch(/single line/i)
    expect(note).toMatch(/two lines/i)
    const long = {
      type: "chevron_process" as const,
      items: [
        { title: "Scoping", text: "Seat expansion across every existing enterprise account in the region" },
        { title: "Solutioning", text: "Templates" },
        { title: "Rollout", text: "Pilot" },
      ],
    }
    const { container } = svg(chevronProcess.render(long, { x: 96, y: 290, w: 1088 }, themed("brief")))
    const noteLines = Array.from(container.querySelectorAll("text")).filter(
      (t) => Number(t.getAttribute("y")) > 118 && Number(t.getAttribute("x")) < 200,
    )
    expect(noteLines.length).toBe(2)
  })

  it("keeps a sibling's air between two notes that share a baseline", () => {
    // Seventeen characters fit the 275px the note used to be allowed, which
    // left its last glyph 15px from the next note's first. At 12px apart two
    // notes read as one line, so the note now stops SIBLING_AIR_PX short.
    const crowded = {
      type: "chevron_process" as const,
      items: [
        { title: "需求核报", text: "一笔三百万捐赠因附带指定条款被婉拒" },
        { title: "联合采购", text: "失误成章" },
        { title: "物流配送", text: "管理费率" },
        { title: "借阅运营", text: "月捐共同体" },
      ],
    }
    const ctx = themed("swiss")
    const { container } = svg(chevronProcess.render(crowded, { x: 96, y: 290, w: 1088 }, ctx))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const notes = Array.from(container.querySelectorAll("text")).filter(
      (t) => Number(t.getAttribute("font-size")) === FORM_BODY_FLOOR && Number(t.getAttribute("y")) > 118,
    )
    const firstLine = new Map<number, Element>()
    for (const t of notes) {
      const y = Number(t.getAttribute("y"))
      const x = Number(t.getAttribute("x"))
      if (!firstLine.has(x) || Number(firstLine.get(x)!.getAttribute("y")) > y) firstLine.set(x, t)
    }
    const starts = [...firstLine.keys()].sort((a, b) => a - b)
    expect(starts).toHaveLength(4)
    for (const t of notes) {
      const x = Number(t.getAttribute("x"))
      const next = starts.find((s) => s > x)
      if (next === undefined) continue
      const end = x + measureTextUnits(t.textContent ?? "", { fontFamily: ctx.fonts.body }) * FORM_BODY_FLOOR
      expect(next - end, t.textContent ?? "").toBeGreaterThanOrEqual(SIBLING_AIR_PX)
    }
    const words = notes.map((t) => t.textContent ?? "").join("")
    expect(words).toContain(crowded.items[0]!.text)
  })

  it("wraps a note wider than its column onto a second line instead of cutting it", () => {
    const english = {
      type: "chevron_process" as const,
      items: [
        { title: "Scoping", text: "Seat expansion in existing accounts" },
        { title: "Solutioning", text: "Standardized onboarding templates" },
        { title: "Seat setup", text: "In-house workspace compute" },
        { title: "Access setup", text: "Vertical playbook replication" },
      ],
    }
    const ctx = themed("brief")
    const box = { x: 96, y: 290, w: 1088 }
    const h = chevronProcess.measure(english, box.w, ctx)
    const { container } = svg(chevronProcess.render(english, box, ctx))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const words = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .join(" ")
      .replace(/\s+/g, " ")
    for (const item of english.items) expect(words).toContain(item.text)
    // The second line is paid for in the measured height.
    const lastBaseline = Math.max(...Array.from(container.querySelectorAll("text")).map((t) => Number(t.getAttribute("y"))))
    expect(lastBaseline).toBeLessThanOrEqual(h)
    expect(h).toBeGreaterThan(chevronProcess.measure(withN(4), box.w, ctx))
  })

  it("gives the notes' second line back in a box too short for it, and marks the cut", () => {
    const english = {
      type: "chevron_process" as const,
      items: [
        { title: "Scoping", text: "Seat expansion in existing accounts" },
        { title: "Solutioning", text: "Standardized onboarding templates" },
        { title: "Seat setup", text: "In-house workspace compute" },
        { title: "Access setup", text: "Vertical playbook replication" },
      ],
    }
    const ctx = themed("brief")
    const oneLineH = chevronProcess.measure(withN(4), 1088, ctx)
    expect(chevronProcess.measure(english, 1088, ctx)).toBeGreaterThan(oneLineH)
    const box = { x: 0, y: 0, w: 1088, h: oneLineH }
    const { container } = svg(chevronProcess.render(english, box, ctx))
    for (const t of container.querySelectorAll("text")) expect(Number(t.getAttribute("y")), t.textContent ?? "").toBeLessThanOrEqual(box.h)
    expect(container.querySelector('[data-truncated="1"]')).not.toBeNull()
  })

  it("declines a box too short for the band and one line of note", () => {
    const box = { x: 0, y: 0, w: 1104, h: 120 }
    const { container } = svg(chevronProcess.render(five, box, themed("brief")))
    expect(container.querySelectorAll("polygon, text")).toHaveLength(0)
    expect(container.querySelector("[data-dropped]")?.getAttribute("data-dropped-kind")).toBe("component")
  })

  it("keeps stage names inside their own chevron at the widest legal count", () => {
    const { container } = svg(chevronProcess.render(withN(6), { x: 88, y: 96, w: 1104 }, themed("swiss")))
    const band = polys(container)
    const titles = Array.from(container.querySelectorAll("text")).filter((t) => /Stage/.test(t.textContent ?? ""))
    expect(titles).toHaveLength(6)
    titles.forEach((t, i) => {
      const x = Number(t.getAttribute("x"))
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_TITLE_FLOOR)
      expect(x).toBeGreaterThanOrEqual(band[i]!.minX)
      expect(x).toBeLessThan(band[i]!.maxX)
    })
    for (const t of container.querySelectorAll("text")) {
      expect(Number(t.getAttribute("font-size")), t.textContent ?? "").toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("keeps all ink inside its own measured box at every legal stage count", () => {
    for (const n of [3, 4, 5, 6]) {
      const ctx = themed("thesis")
      const box = { x: 88, y: 96, w: 1104 }
      const component = withN(n)
      const h = chevronProcess.measure(component, box.w, ctx)
      expect(h, `n=${n}`).toBeGreaterThan(0)
      expect(h, `n=${n}`).toBeLessThanOrEqual(400)
      const { container } = svg(chevronProcess.render(component, box, ctx))
      for (const chevron of polys(container)) {
        expect(chevron.minX, `n=${n}`).toBeGreaterThanOrEqual(-1)
        expect(chevron.maxX, `n=${n}`).toBeLessThanOrEqual(box.w + 1)
        expect(chevron.maxY, `n=${n}`).toBeLessThanOrEqual(h + 1)
      }
    }
  })


  it("keeps the highlighted chevron visible on every theme, dark ones included", () => {
    for (const theme of listThemes().map((t) => t.id)) {
      const ctx = themed(theme)
      const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, ctx))
      const fill = polys(container).at(-1)!.fill!
      expect(fill, theme).not.toBe(ctx.colors.surface)
      expect(contrastRatio(fill, ctx.colors.surface), theme).toBeGreaterThanOrEqual(2)
    }
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">
        {chevronProcess.render(withN(6), { x: 40, y: 40, w: 1200 }, themed("terminal"))}
      </svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(chevronProcess.render(five, { x: 88, y: 96, w: 1104 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("brief")
    for (const theme of ["ink", "rally", "terminal", "journal", "luxe"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 88, y: 96, w: 1104 }
    const ctx = themed("brief")
    const a = renderToStaticMarkup(<svg>{chevronProcess.render(five, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{chevronProcess.render(five, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})

describe("chevron_process stage icon", () => {
  it("draws a stage's icon on the line of its number, at the right of its text", () => {
    const ctx = boundThemeCtx("ledger", {})
    const component = {
      type: "chevron_process" as const,
      items: [{ title: "实名登记", icon: "id-card" as const }, { title: "操控员执照" }, { title: "运营合格证", icon: "badge-check" as const }],
    }
    const { container } = render(<svg viewBox="0 0 1280 720">{chevronProcess.render(component, { x: 0, y: 0, w: 1088 }, ctx)}</svg>)
    const icons = Array.from(container.querySelectorAll("g[data-stage-icon]"))
    expect(icons.map((g) => g.getAttribute("data-stage-icon"))).toEqual(["id-card", "badge-check"])
    const number = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "01")!
    const at = /translate\(([\d.]+),([\d.]+)\)/.exec(icons[0]!.querySelector("g")!.getAttribute("transform")!)!
    expect(Number(at[1])).toBeGreaterThan(Number(number.getAttribute("x")) + 30)
    expect(Number(at[2])).toBeLessThan(Number(number.getAttribute("y")))
  })
})
