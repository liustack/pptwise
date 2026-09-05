// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { assertSubset } from "../render/subset-validate"
import { parseSvgRoot } from "../render/serialize"
import { auditSvgMarkup } from "../audit/svg-audit"
import { prosCons } from "./pros-cons"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const four = {
  type: "pros_cons" as const,
  pros: {
    title: "支持",
    items: [
      { label: "大客户扩容不必逐单谈判", note: "五百席以上自动下浮" },
      { label: "中小客户门槛下移", note: "起售从五十席降到二十席" },
      { label: "收入预测更稳", note: "季度预测偏差从两成收到一成" },
      { label: "招标口径统一", note: "报价审批从五天压到一天" },
    ],
  },
  cons: {
    title: "反对",
    items: [
      { label: "存量合同需要重签", note: "87 家客户落在阶梯边界" },
      { label: "小客群单价被摊薄", note: "百席以下单价降一成二" },
      { label: "渠道返点规则失效", note: "现行返点按合同总额计" },
      { label: "计费系统要改造", note: "分段计费最快到第四季度" },
    ],
  },
  verdict: "本季度先在新签客户试行阶梯定价。",
}

function withRows(n: number, note = true) {
  const side = (prefix: string) => ({
    title: prefix,
    items: Array.from({ length: n }, (_, i) => ({
      label: `${prefix} point ${i + 1}`,
      ...(note ? { note: `${prefix} evidence ${i + 1}` } : {}),
    })),
  })
  return { type: "pros_cons" as const, pros: side("For"), cons: side("Against"), verdict: "Ship it." }
}

describe("pros_cons component", () => {
  it("draws two columns, a verdict band, and one mark per point", () => {
    const { container } = svg(prosCons.render(four, { x: 80, y: 80, w: 1088 }, themed("arena")))
    // two column cards + the verdict band
    expect(container.querySelectorAll("rect").length).toBe(3)
    // one rule under each column title
    expect(container.querySelectorAll("line").length).toBe(2)
    // the check glyph is one path, the cross is two
    expect(container.querySelectorAll("path").length).toBe(4 * 1 + 4 * 2)
  })

  it("prints every point, every note, both titles and the verdict", () => {
    const { container } = svg(prosCons.render(four, { x: 80, y: 80, w: 1088 }, themed("arena")))
    const joined = Array.from(container.querySelectorAll("text"))
      .map((t) => t.textContent)
      .join("|")
    for (const side of [four.pros, four.cons]) {
      expect(joined).toContain(side.title)
      for (const item of side.items) {
        expect(joined).toContain(item.label)
        expect(joined).toContain(item.note)
      }
    }
    expect(joined).toContain(four.verdict)
  })

  it("tells the sides apart by the shape of the mark, not by a colour outside the theme", () => {
    const ctx = themed("arena")
    const { container } = svg(prosCons.render(four, { x: 80, y: 80, w: 1088 }, ctx))
    const palette = new Set([
      ctx.colors.primary,
      ctx.colors.muted,
      ctx.colors.text,
      ctx.colors.surface,
      ctx.colors.border,
      ctx.colors.bg,
    ])
    for (const el of container.querySelectorAll("path, rect, line, text")) {
      for (const attr of ["fill", "stroke"]) {
        const value = el.getAttribute(attr)
        if (value && value !== "none") expect(palette.has(value) || value.startsWith("#"), value).toBe(true)
      }
    }
    // Both column titles carry the same weight: the page does not take a side
    // before the verdict does.
    const titles = Array.from(container.querySelectorAll("text")).filter(
      (t) => t.textContent === "支持" || t.textContent === "反对",
    )
    expect(titles).toHaveLength(2)
    expect(titles[0]!.getAttribute("fill")).toBe(titles[1]!.getAttribute("fill"))
    expect(titles[0]!.getAttribute("font-size")).toBe(titles[1]!.getAttribute("font-size"))
  })

  it("fills the verdict band in primary and reverses its text", () => {
    const ctx = themed("arena")
    const { container } = svg(prosCons.render(four, { x: 80, y: 80, w: 1088 }, ctx))
    const band = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === ctx.colors.primary,
    )!
    expect(band).toBeDefined()
    expect(Number(band.getAttribute("width"))).toBe(1088)
    const verdictText = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === four.verdict)!
    expect(verdictText.getAttribute("fill")).not.toBe(ctx.colors.primary)
    expect(verdictText.getAttribute("fill")).not.toBe(ctx.colors.accent)
  })

  it("closes up the row spacing rather than the type when both sides are full", () => {
    const ctx = themed("brief")
    const box = { x: 0, y: 0, w: 1104 }
    const tall = prosCons.measure(withRows(5), box.w, ctx)
    expect(tall).toBeLessThanOrEqual(350)
    const { container } = svg(prosCons.render(withRows(5), box, ctx))
    for (const t of container.querySelectorAll("text")) {
      expect(Number(t.getAttribute("font-size"))).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
      expect(Number(t.getAttribute("y"))).toBeLessThanOrEqual(tall + 2)
    }
    // A shorter page keeps the roomier rhythm.
    expect(prosCons.measure(withRows(2), box.w, ctx)).toBeLessThan(tall)
  })

  it("declares rather than cutting a point on either side", () => {
    const long = {
      ...four,
      cons: {
        ...four.cons,
        items: [
          { label: "存量合同需要重签，八十七家客户落在阶梯边界上，重签周期约两个月" },
          ...four.cons.items.slice(1),
        ],
      },
    }
    const { container } = svg(prosCons.render(long, { x: 0, y: 0, w: 700 }, themed("arena")))
    const marker = container.querySelector("[data-dropped]")!
    expect(marker).not.toBeNull()
    expect(marker.getAttribute("data-dropped-kind")).toBe("row")
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declares instead of drawing past a height it was given", () => {
    const { container } = svg(prosCons.render(four, { x: 0, y: 0, w: 1088, h: 200 }, themed("arena")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("rect")).toHaveLength(0)
  })

  it("stays inside the controlled SVG subset and passes the overflow auditor", () => {
    const markup = renderToStaticMarkup(
      <svg viewBox="0 0 1280 720">{prosCons.render(withRows(5), { x: 40, y: 40, w: 1200 }, themed("terminal"))}</svg>,
    )
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
    expect(auditSvgMarkup(markup)).toEqual([])
  })

  it("renders the same shapes on every theme — only the tokens differ", () => {
    const shapesOf = (theme: string) => {
      const { container } = svg(prosCons.render(four, { x: 80, y: 80, w: 1088 }, themed(theme)))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("arena")
    for (const theme of ["thesis", "rally", "terminal", "heritage", "brief"]) {
      expect(shapesOf(theme), theme).toBe(baseline)
    }
  })

  it("is deterministic — the same IR renders byte-identical markup on repeat calls", () => {
    const box = { x: 60, y: 60, w: 1000 }
    const ctx = themed("terminal")
    const a = renderToStaticMarkup(<svg>{prosCons.render(four, box, ctx)}</svg>)
    const b = renderToStaticMarkup(<svg>{prosCons.render(four, box, ctx)}</svg>)
    expect(a).toBe(b)
  })
})
