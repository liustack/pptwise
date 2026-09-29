// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { positioningMap } from "./positioning-map"
import { measureTextUnits } from "../lib/svg-text-layout"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return boundThemeCtx(id, {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const eight = {
  type: "positioning_map" as const,
  x_axis: { title: "实施深度", low: "浅", high: "深" },
  y_axis: { title: "客单价", low: "低", high: "高" },
  quadrants: {
    top_left: "通用工具，价格拉锯",
    top_right: "深度实施，年费制",
    bottom_left: "自助开通，低价走量",
    bottom_right: "重服务，客单价偏低",
  },
  points: [
    { label: "云觅科技", x: 78, y: 82, emphasis: true as const },
    { label: "恒诺云", x: 88, y: 62 },
    { label: "明睿协同", x: 30, y: 74 },
    { label: "微枢云", x: 44, y: 55 },
    { label: "泛联办公", x: 16, y: 36 },
    { label: "星桥智联", x: 58, y: 20 },
    { label: "拓远数科", x: 84, y: 26 },
    { label: "简至办公", x: 32, y: 8 },
  ],
}

describe("positioning_map component", () => {
  it("draws two axes, one dot per point, and names every point", () => {
    const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, themed("brief")))
    expect(container.querySelectorAll("line").length).toBe(2)
    expect(container.querySelectorAll("circle").length).toBe(8)
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    for (const point of eight.points) expect(texts, point.label).toContain(point.label)
  })

  it("prints both ends of both axes and all four quadrant names", () => {
    const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, themed("brief")))
    const joined = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .join("|")
    expect(joined).toContain("实施深度 浅")
    expect(joined).toContain("实施深度 深")
    expect(joined).toContain("客单价 高")
    expect(joined).toContain("客单价 低")
    for (const name of Object.values(eight.quadrants)) expect(joined).toContain(name)
  })

  it("marks the one named subject with a bigger dot in primary and a bolder label", () => {
    const ctx = themed("brief")
    const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, ctx))
    const dots = Array.from(container.querySelectorAll("circle"))
    const marked = dots.filter((d) => d.getAttribute("fill") === ctx.colors.primary)
    expect(marked).toHaveLength(1)
    const others = dots.filter((d) => d !== marked[0])
    for (const other of others) {
      expect(Number(marked[0]!.getAttribute("r"))).toBeGreaterThan(Number(other.getAttribute("r")))
      expect(other.getAttribute("fill")).toBe(ctx.colors.muted)
    }
    const markedLabel = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "云觅科技")!
    expect(markedLabel.getAttribute("font-weight")).toBe("700")
    expect(markedLabel.getAttribute("fill")).not.toBe(ctx.colors.accent)
  })

  it("plots each point where its own coordinates put it", () => {
    const box = { x: 0, y: 0, w: 1088 }
    const { container } = svg(positioningMap.render(eight, box, themed("brief")))
    const dots = Array.from(container.querySelectorAll("circle")).map((c) => ({
      cx: Number(c.getAttribute("cx")),
      cy: Number(c.getAttribute("cy")),
    }))
    // Higher x is further right, higher y is further up.
    const byX = eight.points.map((p, i) => ({ x: p.x, cx: dots[i]!.cx }))
    for (const a of byX) {
      for (const b of byX) {
        if (a.x < b.x) expect(a.cx).toBeLessThan(b.cx)
      }
    }
    const byY = eight.points.map((p, i) => ({ y: p.y, cy: dots[i]!.cy }))
    for (const a of byY) {
      for (const b of byY) {
        if (a.y < b.y) expect(a.cy).toBeGreaterThan(b.cy)
      }
    }
  })

  it("keeps every label clear of the others, and inside the box", () => {
    const box = { x: 0, y: 0, w: 1088 }
    const ctx = themed("brief")
    const h = positioningMap.measure(eight, box.w, ctx)
    const { container } = svg(positioningMap.render(eight, box, ctx))
    for (const t of container.querySelectorAll("text")) {
      const x = Number(t.getAttribute("x"))
      const y = Number(t.getAttribute("y"))
      expect(x).toBeGreaterThanOrEqual(0)
      expect(x).toBeLessThanOrEqual(box.w)
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y).toBeLessThanOrEqual(h)
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("declares a label it cannot place instead of stacking it on another one", () => {
    const crowded = {
      ...eight,
      points: Array.from({ length: 10 }, (_, i) => ({
        label: `候选厂商编号 ${i + 1}`,
        x: 50 + (i % 2),
        y: 50 + (i % 2),
      })),
    }
    const { container } = svg(positioningMap.render(crowded, { x: 0, y: 0, w: 420 }, themed("brief")))
    expect(container.querySelectorAll("circle").length).toBe(10)
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(Number(marker.getAttribute("data-dropped"))).toBeGreaterThan(0)
    expect(marker.getAttribute("data-dropped-kind")).toBe("label")
    // What is left says nothing about what is missing.
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent ?? "")
    for (const text of texts) expect(text).not.toMatch(/\+\d|…|\.\.\./)
  })

  it("keeps a placed label off every dot and every fixed name on the map", () => {
    // Two subjects a hair apart on the same row: the first label used to be
    // placed before the second dot existed, and covered it.
    const crowded = {
      ...eight,
      points: [
        { label: "ALPHA", x: 10, y: 80 },
        { label: "BETA", x: 16, y: 80 },
        { label: "GAMMA", x: 0, y: 100 },
        { label: "DELTA", x: 0, y: 100 },
      ],
    }
    for (const [w, component] of [[800, crowded], [400, crowded]] as const) {
      const ctx = themed("brief")
      const { container } = svg(positioningMap.render(component, { x: 0, y: 0, w }, ctx))
      const dots = Array.from(container.querySelectorAll("circle")).map((c) => ({
        x: Number(c.getAttribute("cx")) - Number(c.getAttribute("r")),
        y: Number(c.getAttribute("cy")) - Number(c.getAttribute("r")),
        w: Number(c.getAttribute("r")) * 2,
        h: Number(c.getAttribute("r")) * 2,
      }))
      const texts = Array.from(container.querySelectorAll("text")).map((t) => {
        const size = Number(t.getAttribute("font-size"))
        const width = measureTextUnits(t.textContent ?? "", {
          bold: t.getAttribute("font-weight") === "700",
          fontFamily: ctx.fonts.body,
        }) * size
        const anchor = t.getAttribute("text-anchor")
        const x = Number(t.getAttribute("x"))
        return {
          x: anchor === "end" ? x - width : x,
          y: Number(t.getAttribute("y")) - size * 0.8,
          w: width,
          h: size * 1.1,
        }
      })
      const hits = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
        a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5
      for (const text of texts) {
        for (const dot of dots) expect(hits(text, dot), `${w}: text over a dot`).toBe(false)
      }
      for (let i = 0; i < texts.length; i += 1) {
        for (let j = i + 1; j < texts.length; j += 1) {
          expect(hits(texts[i]!, texts[j]!), `${w}: "${texts[i]!.x}" over another name`).toBe(false)
        }
      }
    }
  })

  // Subjects clustered round the crossing, as a clinic's patient groups are:
  // several sit a few points off one rule or the other, which is where the
  // labels used to land straight across an axis.
  const crossing = {
    ...eight,
    points: [
      { label: "签约随访组", x: 78, y: 74, emphasis: true as const },
      { label: "普通门诊组", x: 46, y: 52 },
      { label: "独居老人组", x: 20, y: 30 },
      { label: "在职中年组", x: 34, y: 44 },
      { label: "药房取药组", x: 56, y: 40 },
      { label: "讲堂常来组", x: 70, y: 62 },
      { label: "楼组长带教组", x: 62, y: 58 },
      { label: "新确诊组", x: 26, y: 48 },
    ],
  }

  /** Each point's name, its dot, and the two rules, read off the markup. */
  function readMap(component: typeof crossing, w: number, ctx: ComponentCtx) {
    const { container } = svg(positioningMap.render(component, { x: 0, y: 0, w }, ctx))
    const [horizontal, vertical] = Array.from(container.querySelectorAll("line"))
    const axisY = Number(horizontal!.getAttribute("y1"))
    const axisX = Number(vertical!.getAttribute("x1"))
    const circles = Array.from(container.querySelectorAll("circle"))
    const texts = Array.from(container.querySelectorAll("text"))
    const names = component.points.map((point, i) => {
      const t = texts.find((el) => el.textContent === point.label)
      if (!t) return { point, dot: circles[i]!, ink: undefined }
      const size = Number(t.getAttribute("font-size"))
      const width =
        measureTextUnits(point.label, { bold: t.getAttribute("font-weight") === "700", fontFamily: ctx.fonts.body }) *
        size
      const x = Number(t.getAttribute("x"))
      const y = Number(t.getAttribute("y"))
      const left = t.getAttribute("text-anchor") === "end" ? x - width : x
      // The same ink band the gallery's geometry check reads: a full em
      // above the baseline and a quarter below it.
      return { point, dot: circles[i]!, ink: { left, right: left + width, top: y - size, bottom: y + size * 0.25 } }
    })
    return { container, axisX, axisY, names }
  }

  it("keeps every name off both axis rules", () => {
    for (const w of [1088, 880]) {
      const { axisX, axisY, names } = readMap(crossing, w, themed("clinic"))
      for (const { point, ink } of names) {
        expect(ink, `${w}: ${point.label} placed`).toBeDefined()
        const clearOfRow = ink!.bottom <= axisY - 4 || ink!.top >= axisY + 4
        const clearOfColumn = ink!.right <= axisX - 4 || ink!.left >= axisX + 4
        expect(clearOfRow, `${w}: ${point.label} on the horizontal rule`).toBe(true)
        expect(clearOfColumn, `${w}: ${point.label} on the vertical rule`).toBe(true)
      }
    }
  })

  it("names each subject inside its own quadrant", () => {
    const { axisX, axisY, names } = readMap(crossing, 1088, themed("clinic"))
    for (const { point, dot, ink } of names) {
      const cx = Number(dot.getAttribute("cx"))
      const cy = Number(dot.getAttribute("cy"))
      expect(cx < axisX ? ink!.right < axisX : ink!.left > axisX, `${point.label} across the vertical rule`).toBe(true)
      expect(cy < axisY ? ink!.bottom < axisY : ink!.top > axisY, `${point.label} across the horizontal rule`).toBe(true)
    }
  })

  it("moves an earlier name aside rather than drop a later one", () => {
    // Eight classes packed into one quadrant near the crossing. Placed in
    // author order with no second thoughts, the seventh finds every spot
    // beside its dot taken; another arrangement names them all.
    const packed = {
      ...eight,
      points: [
        { label: "本班平均", x: 72, y: 68, emphasis: true as const },
        { label: "基础组", x: 66, y: 42 },
        { label: "提高组", x: 88, y: 86 },
        { label: "初二（1）班", x: 78, y: 74 },
        { label: "初二（5）班", x: 62, y: 60 },
        { label: "年级平均", x: 70, y: 64 },
        { label: "上学期本班", x: 58, y: 56 },
        { label: "订正未跟组", x: 40, y: 34 },
      ],
    }
    const { container, names } = readMap(packed, 1088, themed("homeroom"))
    expect(container.querySelector("[data-dropped]")).toBeNull()
    for (const { point, ink } of names) expect(ink, point.label).toBeDefined()
  })

  it("moves an axis end name off a subject's dot to the other side of its rule", () => {
    // A subject near the far end of the horizontal scale and a little under
    // the middle lands its dot where the high end's name is printed.
    const nearEnd = {
      ...eight,
      x_axis: { title: "托管化程度", low: "自建", high: "全托管" },
      points: [...eight.points.slice(0, 7), { label: "东启金融", x: 92, y: 40 }],
    }
    const { container } = svg(positioningMap.render(nearEnd, { x: 0, y: 0, w: 1088 }, themed("brief")))
    const horizontal = container.querySelector("line")!
    const axisY = Number(horizontal.getAttribute("y1"))
    const name = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === "托管化程度 全托管")!
    const baseline = Number(name.getAttribute("y"))
    const size = Number(name.getAttribute("font-size"))
    const dot = Array.from(container.querySelectorAll("circle"))[7]!
    const cy = Number(dot.getAttribute("cy"))
    const r = Number(dot.getAttribute("r"))
    // The name's ink band and the dot no longer share any height.
    const top = baseline - size
    const bottom = baseline + size * 0.25
    expect(bottom <= cy - r || top >= cy + r).toBe(true)
    expect(bottom).toBeLessThanOrEqual(axisY - 4)
  })

  it("declares instead of drawing past a height it was given", () => {
    const { container } = svg(positioningMap.render(eight, { x: 0, y: 0, w: 1088, h: 200 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")!
    expect(Number(marker.getAttribute("data-dropped"))).toBe(8)
    expect(marker.getAttribute("data-dropped-kind")).toBe("item")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares the whole map rather than cutting a subject's name", () => {
    const long = {
      ...eight,
      points: [
        { label: "云觅科技客户成功中心华东区域运营组", x: 50, y: 50 },
        ...eight.points.slice(1),
      ],
    }
    const { container } = svg(positioningMap.render(long, { x: 0, y: 0, w: 420 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{positioningMap.render(eight, { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(positioningMap.render(eight, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("brief")
    for (const theme of ["thesis", "rally", "terminal", "heritage", "ledger"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const ctx = themed("terminal")
    const a = renderToStaticMarkup(<svg>{positioningMap.render(eight, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{positioningMap.render(eight, box, ctx)}</svg>)
    expect(a).toBe(b)
  })

  it("boxes an English name at the width its face paints, not half again", () => {
    // Eight English subjects on a 700px map. Every Latin name used to be
    // boxed at half again its width, so one of them found no free spot
    // beside its dot and was declared dropped, while the names at their
    // real advances all fit.
    const english = {
      type: "positioning_map" as const,
      x_axis: { title: "Delivery depth", low: "Light", high: "Deep" },
      y_axis: { title: "Annual contract value", low: "Low", high: "High" },
      quadrants: {
        top_left: "Generic tools, price war",
        top_right: "Deep delivery, annual terms",
        bottom_left: "Self-serve, volume play",
        bottom_right: "Service-heavy, low ticket",
      },
      points: [
        { label: "CloudSeek", x: 74, y: 80, emphasis: true as const },
        { label: "Linjiang Group", x: 90, y: 62 },
        { label: "Northshore", x: 88, y: 30 },
        { label: "Yunshan School", x: 30, y: 74 },
        { label: "Dongqi Fund", x: 46, y: 56 },
        { label: "Yonggu Market", x: 16, y: 38 },
        { label: "Ocean Education", x: 58, y: 18 },
        { label: "Jinsui Study", x: 26, y: 8 },
      ],
    }
    for (const themeId of ["brief", "swiss"]) {
      const ctx = themed(themeId)
      const { container } = svg(positioningMap.render(english, { x: 0, y: 0, w: 700 }, ctx))
      expect(container.querySelector("[data-dropped]"), themeId).toBeNull()
      // Each name at its real advance width: none runs into another name or a dot.
      const names = english.points.map((point) => {
        const t = Array.from(container.querySelectorAll("text")).find((el) => el.textContent === point.label)
        expect(t, `${themeId}: ${point.label}`).toBeDefined()
        const size = Number(t!.getAttribute("font-size"))
        const width =
          measureTextUnits(point.label, { bold: point.emphasis === true, fontFamily: ctx.fonts.body, exact: true }) * size
        const x = Number(t!.getAttribute("x"))
        const left = t!.getAttribute("text-anchor") === "end" ? x - width : x
        return { label: point.label, x: left, y: Number(t!.getAttribute("y")) - size * 0.8, w: width, h: size * 1.1 }
      })
      const dots = Array.from(container.querySelectorAll("circle")).map((c) => {
        const r = Number(c.getAttribute("r"))
        return { x: Number(c.getAttribute("cx")) - r, y: Number(c.getAttribute("cy")) - r, w: r * 2, h: r * 2 }
      })
      const hits = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
        a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
      for (const [i, name] of names.entries()) {
        for (const dot of dots) expect(hits(name, dot), `${themeId}: ${name.label} over a dot`).toBe(false)
        for (const other of names.slice(i + 1)) {
          expect(hits(name, other), `${themeId}: ${name.label} over ${other.label}`).toBe(false)
        }
      }
    }
  })

  describe("keeps two names stacked one over the other far enough apart to read as two", () => {
    // Air between two words above and below each other, ink to ink. A wrapped
    // line sits at most 0.3em (5px here) under the one above it.
    const STACK_AIR = 8
    // Ink as the gallery's L1 check reads it: ideographs reach 0.88em above
    // the baseline, Latin less, and a descender 0.25em below.
    const inkOf = (t: Element, ctx: ComponentCtx) => {
      const size = Number(t.getAttribute("font-size"))
      const text = t.textContent ?? ""
      const width =
        measureTextUnits(text, { bold: t.getAttribute("font-weight") === "700", fontFamily: ctx.fonts.body, exact: true }) *
        size
      const x = Number(t.getAttribute("x"))
      const y = Number(t.getAttribute("y"))
      const left = t.getAttribute("text-anchor") === "end" ? x - width : x
      return { text, left, right: left + width, top: y - size * 0.88, bottom: y + size * 0.25 }
    }
    /** Every pair of words on the map that overlap across, with the air between them above and below. */
    function stackedGaps(component: typeof english, w: number, ctx: ComponentCtx) {
      const { container } = svg(positioningMap.render(component, { x: 0, y: 0, w }, ctx))
      expect(container.querySelector("[data-dropped]")).toBeNull()
      const inks = Array.from(container.querySelectorAll("text")).map((t) => inkOf(t, ctx))
      const names = new Set(component.points.map((p) => p.label))
      for (const label of names) expect(inks.some((ink) => ink.text === label), label).toBe(true)
      const gaps: { pair: string; gap: number }[] = []
      for (const [i, a] of inks.entries()) {
        for (const b of inks.slice(i + 1)) {
          // Two axis or quadrant names are placed by the frame, not by the
          // name search; a pair needs a subject's name in it.
          if (!names.has(a.text) && !names.has(b.text)) continue
          if (a.right <= b.left || b.right <= a.left) continue
          gaps.push({ pair: `${a.text} / ${b.text}`, gap: Math.max(b.top - a.bottom, a.top - b.bottom) })
        }
      }
      return gaps
    }
    const english = {
      type: "positioning_map" as const,
      x_axis: { title: "Delivery depth", low: "Light", high: "Deep" },
      y_axis: { title: "Annual contract value", low: "Low", high: "High" },
      points: [
        { label: "Yunshan School", x: 30, y: 70 },
        { label: "Dongqi Fund", x: 30, y: 62 },
      ] as { label: string; x: number; y: number; emphasis?: true }[],
    }

    it("for two subjects one right above the other", () => {
      // Named in author order, the second name used to land one row under
      // the first with 1.4px of ink between them: one name on two lines.
      for (const gap of stackedGaps(english, 1088, themed("brief"))) {
        expect(gap.gap, gap.pair).toBeGreaterThanOrEqual(STACK_AIR)
      }
    })

    it("on a full map, against every other name and every axis and quadrant name", () => {
      const full = {
        ...english,
        quadrants: {
          top_left: "Generic tools, price war",
          top_right: "Deep delivery, annual terms",
          bottom_left: "Self-serve, volume play",
          bottom_right: "Service-heavy, low ticket",
        },
        points: [
          { label: "CloudSeek", x: 74, y: 80, emphasis: true as const },
          { label: "Linjiang Group", x: 90, y: 62 },
          { label: "Northshore", x: 88, y: 30 },
          { label: "Yunshan School", x: 30, y: 74 },
          { label: "Dongqi Fund", x: 46, y: 56 },
          { label: "Yonggu Market", x: 16, y: 38 },
          { label: "Ocean Education", x: 58, y: 18 },
          { label: "Jinsui Study", x: 26, y: 8 },
        ],
      }
      for (const w of [1088, 880]) {
        for (const gap of stackedGaps(full, w, themed("brief"))) {
          expect(gap.gap, `${w}: ${gap.pair}`).toBeGreaterThanOrEqual(STACK_AIR)
        }
      }
      // Eight classes packed round the crossing, as homeroom's map has them.
      const packed = {
        ...eight,
        points: [
          { label: "本班平均", x: 72, y: 68, emphasis: true as const },
          { label: "基础组", x: 66, y: 42 },
          { label: "提高组", x: 88, y: 86 },
          { label: "初二（1）班", x: 78, y: 74 },
          { label: "初二（5）班", x: 62, y: 60 },
          { label: "年级平均", x: 70, y: 64 },
          { label: "上学期本班", x: 58, y: 56 },
          { label: "订正未跟组", x: 40, y: 34 },
        ],
      }
      for (const gap of stackedGaps(packed as typeof english, 1088, themed("homeroom"))) {
        expect(gap.gap, gap.pair).toBeGreaterThanOrEqual(STACK_AIR)
      }
    })
  })
})
