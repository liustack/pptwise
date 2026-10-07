// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { cycle } from "./cycle"
import { FORM_BODY_FLOOR, FORM_BODY_TITLE_CAP, capFormBody } from "./legibility"
import { mixHex } from "./color-mix"
import { accessibleInk, readableOn } from "../render/ink"
import type { ComponentCtx } from "./types"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF",
    surface: "#F4F4F4",
    primary: "#006A4E",
    accent: "#00A878",
    text: "#1A2421",
    muted: "#5D6B65",
    chartPalette: ["#006A4E", "#00A878"],
  },
  fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
  bodyFontPx: 24,
}

function themed(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const component3 = {
  type: "cycle" as const,
  items: [
    { label: "Plan", description: "Set goals" },
    { label: "Execute", description: "Do the work" },
    { label: "Review", description: "Check outcomes" },
  ],
}

const component8 = {
  type: "cycle" as const,
  title: "Product loop",
  items: Array.from({ length: 8 }, (_, i) => ({ label: `Stage ${i + 1}` })),
}

const four = {
  type: "cycle" as const,
  title: "闭环",
  items: [
    { label: "采集", description: "传感器接入" },
    { label: "清洗", description: "规则校验" },
    { label: "训练", description: "模型迭代" },
    { label: "回流", description: "误报回灌" },
  ],
}

function parseTranslate(el: Element): { dx: number; dy: number } {
  const t = el.getAttribute("transform") ?? ""
  const m = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(t)
  return { dx: m ? Number(m[1]) : 0, dy: m ? Number(m[2]) : 0 }
}

/**
 * Every stage node, circle or capsule, as a centre plus half-extents. A
 * node is the one shape inside its `data-audit-box` group.
 */
function nodeShapes(container: HTMLElement) {
  return Array.from(container.querySelectorAll("[data-audit-box] > circle, [data-audit-box] > rect")).map((el) => {
    if (el.tagName.toLowerCase() === "circle") {
      const r = Number(el.getAttribute("r"))
      return { shape: "circle", cx: Number(el.getAttribute("cx")), cy: Number(el.getAttribute("cy")), halfW: r, halfH: r }
    }
    const w = Number(el.getAttribute("width"))
    const h = Number(el.getAttribute("height"))
    return {
      shape: "capsule",
      cx: Number(el.getAttribute("x")) + w / 2,
      cy: Number(el.getAttribute("y")) + h / 2,
      halfW: w / 2,
      halfH: h / 2,
    }
  })
}

function allowedPaints(c: ComponentCtx["colors"]): Set<string> {
  const hexes = [
    c.bg,
    c.surface,
    c.primary,
    c.accent,
    c.text,
    c.muted,
    c.border,
    ...(c.chartPalette ?? []),
    "#FFFFFF",
    "#0A0E14",
    "none",
    mixHex(c.surface, c.accent, 0.35),
    readableOn(c.surface),
    readableOn(c.accent),
    accessibleInk(c.accent, c.surface, 16),
    accessibleInk(c.accent, c.surface, 20),
    accessibleInk(c.muted, c.surface, 16),
    accessibleInk(c.muted, c.bg, 16),
  ]
  return new Set(hexes.filter((h): h is string => !!h))
}

// One canonical drawing for every theme: a dashed ring, the first stage
// enlarged and accent-ringed as the reading start, descriptions laid out
// radially. No per-theme dispatch — the skin is the theme's own tokens.
describe("cycle component", () => {
  it("renders one node per stage on a single dashed ring path", () => {
    const { container } = svg(cycle.render(component3, { x: 80, y: 100, w: 900 }, ctx))
    expect(nodeShapes(container)).toHaveLength(3)
    const paths = Array.from(container.querySelectorAll("path"))
    expect(paths).toHaveLength(1)
    expect(paths[0]!.getAttribute("fill")).toBe("none")
    expect(paths[0]!.getAttribute("d") ?? "").toMatch(/A /)
    expect(paths[0]!.getAttribute("stroke-dasharray")).toBe("8 8")
    expect(paths[0]!.getAttribute("stroke")).toBe(ctx.colors.accent)
  })

  it("marks the first stage as the reading start with a larger accent-ringed node", () => {
    const { container } = svg(cycle.render(four, { x: 80, y: 80, w: 1088 }, themed("museum")))
    const circles = Array.from(container.querySelectorAll("circle"))
    expect(circles).toHaveLength(4)
    const r0 = Number(circles[0]!.getAttribute("r"))
    for (const c of circles.slice(1)) {
      expect(r0).toBeGreaterThan(Number(c.getAttribute("r")))
    }
    expect(circles[0]!.getAttribute("stroke")).toBe(themed("museum").colors.accent)
    expect(container.querySelectorAll("marker").length).toBe(0)
  })

  it("renders every node label as text", () => {
    const { container } = svg(cycle.render(component3, { x: 80, y: 100, w: 900 }, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    expect(texts.some((t) => t === "Plan" || (t != null && "Plan".startsWith(t)))).toBe(true)
    expect(texts.some((t) => t != null && "Execute".startsWith(t) && t.length >= 4)).toBe(true)
    expect(texts.some((t) => t != null && "Review".startsWith(t) && t.length >= 4)).toBe(true)
  })

  it("renders description text outside the node in a muted ink", () => {
    const { container } = svg(cycle.render(component3, { x: 0, y: 0, w: 900 }, ctx))
    const desc = Array.from(container.querySelectorAll("text")).find((t) =>
      t.textContent?.includes("Set goals"),
    )
    expect(desc).toBeTruthy()
    expect(desc?.getAttribute("fill")).toBe(accessibleInk(ctx.colors.muted, ctx.colors.bg, 16))
  })

  it("renders an optional overall title above the ring", () => {
    const { container } = svg(cycle.render(component8, { x: 0, y: 0, w: 900 }, ctx))
    const texts = Array.from(container.querySelectorAll("text"))
    expect(texts.some((t) => t.textContent === "Product loop")).toBe(true)
  })

  it("omits the title element entirely when unset", () => {
    const { container } = svg(cycle.render(component3, { x: 0, y: 0, w: 900 }, ctx))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    for (const slogan of ["数据底座", "中枢", "总目", "主场", "核心假设", "主题发布"]) {
      expect(texts.some((t) => t.includes(slogan))).toBe(false)
    }
  })

  it("measure returns a positive height, bounded regardless of node count (3 vs 8)", () => {
    const h3 = cycle.measure(component3, 900, ctx)
    const h8 = cycle.measure(component8, 900, ctx)
    expect(h3).toBeGreaterThan(0)
    expect(h8).toBeGreaterThan(0)
    expect(h3).toBeLessThan(500)
    expect(h8).toBeLessThan(500)
  })

  it("wraps everything in a translated group", () => {
    const { container } = svg(cycle.render(component3, { x: 80, y: 100, w: 900 }, ctx))
    const g = container.querySelector("g")
    expect(/translate\(([\d.]+),([\d.]+)\)/.exec(g?.getAttribute("transform") ?? "")).not.toBeNull()
  })

  it("stays inside the controlled SVG element subset (no foreignObject/nested svg/gradient)", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{cycle.render(component8, { x: 40, y: 40, w: 1200 }, ctx)}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })

  it("passes the overflow auditor at both the schema min (3) and max (8) node counts", () => {
    for (const component of [component3, component8]) {
      const h = cycle.measure(component, 1200, ctx)
      const markup = renderToStaticMarkup(
        <svg viewBox="0 0 1280 720">{cycle.render(component, { x: 40, y: 40, w: 1200 }, ctx)}</svg>,
      )
      expect(h).toBeGreaterThan(0)
      expect(auditSvgMarkup(markup)).toEqual([])
    }
  })

  it("is deterministic — the same IR renders byte-identical SVG markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const a = renderToStaticMarkup(<svg>{cycle.render(component8, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{cycle.render(component8, box, ctx)}</svg>)
    expect(a).toBe(b)
  })

  it("closed-loop geometry: every node sits the same distance from the ring center", () => {
    const { container } = svg(cycle.render(component8, { x: 0, y: 0, w: 900 }, ctx))
    const nodes = nodeShapes(container)
    expect(nodes.length).toBe(8)
    const ring = container.querySelector("path")!
    const d = ring.getAttribute("d") ?? ""
    const [, cxs, cys] = /M ([\d.]+) ([\d.]+)/.exec(d) ?? []
    const cx = Number(cxs)
    const cy = Number(cys) // ring top — the center is one radius below it
    const r = Number(/A ([\d.]+)/.exec(d)?.[1])
    const radii = nodes.map((node) => Math.hypot(node.cx - cx, node.cy - (cy + r)))
    for (const dist of radii) expect(dist).toBeCloseTo(r, 0)
  })

  it("regression: title clears the topmost node at n=8", () => {
    const { container } = svg(cycle.render(component8, { x: 0, y: 0, w: 900 }, ctx))
    const titleEl = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "Product loop")
    expect(titleEl).toBeTruthy()
    const titleBottom = Number(titleEl!.getAttribute("y")) + Number(titleEl!.getAttribute("font-size")) * 0.25
    const nodes = nodeShapes(container)
    expect(nodes.length).toBe(8)
    const ringTop = Math.min(...nodes.map((node) => node.cy - node.halfH))
    expect(titleBottom).toBeLessThan(ringTop)
  })

  it("keeps an English word whole by stretching its node into a capsule", () => {
    const ir = {
      type: "cycle" as const,
      title: "Product",
      items: [
        { label: "Scoping", description: "Seat expansion in existing accounts" },
        { label: "Solutioning", description: "Standardized onboarding templates" },
        { label: "Seat setup", description: "In-house workspace compute" },
        { label: "Access setup", description: "Vertical playbook replication" },
        { label: "Pilot run", description: "Staffing-path automation" },
      ],
    }
    const { container } = svg(cycle.render(ir, { x: 96, y: 186, w: 1088, h: 458 }, themed("brief")))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const groups = Array.from(container.querySelectorAll("[data-audit-box]"))
    expect(groups).toHaveLength(ir.items.length)
    groups.forEach((group, i) => {
      const lines = Array.from(group.querySelectorAll("text")).map((t) => t.textContent ?? "")
      expect(lines.join(" "), `node ${i}`).toBe(ir.items[i]!.label)
    })
    const nodes = nodeShapes(container)
    expect(nodes.find((node) => node.shape === "capsule")).toBeTruthy()
    // A capsule keeps its circle's height, so the reading start stays the tallest node.
    for (const node of nodes.slice(1)) expect(nodes[0]!.halfH).toBeGreaterThan(node.halfH)
    // Neighbours stay apart even after a node widens.
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i]!
      const b = nodes[(i + 1) % nodes.length]!
      const apartX = Math.abs(a.cx - b.cx) - a.halfW - b.halfW
      const apartY = Math.abs(a.cy - b.cy) - a.halfH - b.halfH
      expect(Math.max(apartX, apartY), `nodes ${i} and ${(i + 1) % nodes.length}`).toBeGreaterThan(0)
    }
  })

  it("keeps descriptions inside a short box, giving lines back or declining it", () => {
    const ir = {
      type: "cycle" as const,
      title: "Product",
      items: [
        { label: "Scoping", description: "Seat expansion in existing accounts" },
        { label: "Solutioning", description: "Standardized onboarding templates" },
        { label: "Seat setup", description: "In-house workspace compute" },
        { label: "Access setup", description: "Vertical playbook replication" },
        { label: "Pilot run", description: "Staffing-path automation" },
      ],
    }
    for (const h of [240, 190, 120]) {
      const { container } = svg(cycle.render(ir, { x: 0, y: 0, w: 1088, h }, themed("brief")))
      for (const t of container.querySelectorAll("text")) {
        const y = Number(t.getAttribute("y"))
        const size = Number(t.getAttribute("font-size"))
        expect(y + size * 0.25, `h=${h} "${t.textContent}"`).toBeLessThanOrEqual(h + 1)
        expect(y - size * 0.8, `h=${h} "${t.textContent}"`).toBeGreaterThanOrEqual(-1)
      }
      if (container.querySelectorAll("text").length === 0) {
        expect(container.querySelector("[data-dropped]")?.getAttribute("data-dropped-kind")).toBe("component")
      }
    }
  })

  it("gives a five-character CJK label the room for all five characters", () => {
    const ir = {
      type: "cycle" as const,
      title: "支出",
      items: [
        { label: "需求核报", description: "逐笔可查" },
        { label: "联合采购", description: "失误成章" },
        { label: "物流配送", description: "管理费率" },
        { label: "图书角建设", description: "月捐共同体" },
        { label: "借阅运营", description: "联合采购" },
      ],
    }
    const { container } = svg(cycle.render(ir, { x: 96, y: 186, w: 1088 }, themed("swiss")))
    expect(container.querySelectorAll("[data-truncated]")).toHaveLength(0)
    const joined = Array.from(container.querySelectorAll("[data-audit-box] text"))
      .map((t) => t.textContent ?? "")
      .join("")
    expect(joined).toContain("图书角建设")
  })

  it("3–4 char CJK node labels wrap instead of ellipsizing 试运行", () => {
    const ir = {
      type: "cycle" as const,
      title: "产品进展",
      items: [
        { label: "需求确认", description: "对齐范围与验收口径" },
        { label: "现场勘测", description: "核对安装点位" },
        { label: "设备接入", description: "完成现场接线" },
        { label: "模型调优", description: "压低误报占比" },
        { label: "试运行", description: "小流量观察误报" },
      ],
    }
    const { container } = svg(cycle.render(ir, { x: 96, y: 186, w: 632 }, themed("museum")))
    const nodeTexts = Array.from(container.querySelectorAll("[data-audit-box] text"))
    const runHits = nodeTexts.filter((t) => /试|运|行/.test(t.textContent ?? ""))
    expect(runHits.length).toBeGreaterThan(0)
    const joined = runHits.map((t) => t.textContent ?? "").join("")
    expect(joined).toContain("试")
    expect(joined).toContain("运")
    expect(joined).toContain("行")
    expect(joined).not.toMatch(/试…/)
    for (const t of runHits) {
      expect(Number(t.getAttribute("font-size")), `"${t.textContent}"`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("never leaves one CJK character alone on a node's second line", () => {
    // Pre-fix the brief gallery page drew 「方案评」+「审」-style labels and
    // 「试运」+「行」. Four characters now split two and two in the circle.
    // Three have no character to spare, so the node widens into a capsule
    // and holds the label on one line.
    const ir = {
      type: "cycle" as const,
      title: "产品进展",
      items: [
        { label: "需求确认", description: "存量客户席位扩容" },
        { label: "方案评审", description: "标准化开通模板" },
        { label: "席位开通", description: "自建基建替换" },
        { label: "权限配置", description: "客群场景复制" },
        { label: "试运行", description: "开通流程自动化" },
      ],
    }
    const { container } = svg(cycle.render(ir, { x: 96, y: 186, w: 1088, h: 458 }, themed("brief")))
    const labels = Array.from(container.querySelectorAll("[data-audit-box]")).map((group) =>
      Array.from(group.querySelectorAll("text")).map((t) => t.textContent ?? ""),
    )
    expect(labels[1]).toEqual(["方案", "评审"])
    expect(labels[4]).toEqual(["试运行"])
    for (const lines of labels) expect(Array.from(lines[lines.length - 1]!).length).toBeGreaterThan(1)
    expect(nodeShapes(container)[4]!.shape).toBe("capsule")
  })

  it("scales into a 640×392 slot, stays centered, and caps in-circle type", () => {
    const ir = {
      type: "cycle" as const,
      title: "产品进展",
      items: [
        { label: "需求确认", description: "对齐范围与验收口径" },
        { label: "现场勘测", description: "核对安装点位" },
        { label: "设备接入", description: "完成现场接线" },
        { label: "模型调优", description: "压低误报占比" },
        { label: "试运行", description: "小流量观察误报" },
      ],
    }
    const box = { x: 96, y: 186, w: 640, h: 392 }
    const { container } = svg(cycle.render(ir, box, themed("museum")))
    const root = container.querySelector("svg") ?? container
    const { dx, dy } = parseTranslate(root.querySelector("g")!)
    // 「试运行」 has no character to spare for a two-line circle, so its node
    // is a capsule. Count circles and capsules alike.
    const nodes = nodeShapes(container).map((n) => ({ ...n, cx: dx + n.cx, cy: dy + n.cy }))
    expect(nodes).toHaveLength(5)
    const minX = Math.min(...nodes.map((n) => n.cx - n.halfW))
    const maxX = Math.max(...nodes.map((n) => n.cx + n.halfW))
    const minY = Math.min(...nodes.map((n) => n.cy - n.halfH))
    const maxY = Math.max(...nodes.map((n) => n.cy + n.halfH))
    expect(minX).toBeGreaterThanOrEqual(box.x - 2)
    expect(maxX).toBeLessThanOrEqual(box.x + box.w + 2)
    expect(minY).toBeGreaterThanOrEqual(box.y - 2)
    expect(maxY).toBeLessThanOrEqual(box.y + box.h + 2)
    expect(Math.abs((minX + maxX) / 2 - (box.x + box.w / 2))).toBeLessThanOrEqual(8)
    const nodeTexts = Array.from(container.querySelectorAll("[data-audit-box] text"))
    for (const t of nodeTexts) {
      const fs = Number(t.getAttribute("font-size"))
      expect(fs).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
      const boxAttr = t.closest("[data-audit-box]")?.getAttribute("data-audit-box") ?? ""
      const r = Number(boxAttr.split(",")[2] ?? 0) / 2
      expect(fs).toBeLessThanOrEqual(Math.max(FORM_BODY_FLOOR, r * 0.55) + 0.5)
    }
    const titleFs = Math.max(...nodeTexts.map((t) => Number(t.getAttribute("font-size"))))
    const descHits = Array.from(container.querySelectorAll("text")).filter((t) =>
      (t.textContent ?? "").includes("小流量"),
    )
    for (const t of descHits) {
      const fs = Number(t.getAttribute("font-size"))
      expect(fs).toBeLessThanOrEqual(capFormBody(titleFs, 99) + 0.05)
      expect(fs).toBeLessThanOrEqual(titleFs * FORM_BODY_TITLE_CAP + FORM_BODY_FLOOR)
    }
  })

  it("paints use theme tokens, not board hex literals — on every theme skin", () => {
    for (const theme of ["museum", "ledger", "thesis", "rally", "terminal", "luxe", "journal"]) {
      const themeCtx = themed(theme)
      const { container } = svg(cycle.render(four, { x: 80, y: 80, w: 1088 }, themeCtx))
      const allowed = allowedPaints(themeCtx.colors)
      for (const el of container.querySelectorAll("circle, rect, path, line, text, polygon")) {
        for (const attr of ["fill", "stroke"]) {
          const v = el.getAttribute(attr)
          if (v) expect(allowed.has(v), `${theme} unexpected paint ${v}`).toBe(true)
        }
      }
    }
  })

  it("renders identically on every theme except for its tokens", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(cycle.render(four, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("museum")
    for (const theme of ["ledger", "thesis", "rally", "terminal", "luxe", "journal", "brief"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })
})
