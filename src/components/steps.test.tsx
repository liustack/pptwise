// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { steps } from "./steps"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { readableOn } from "../render/ink"

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function stepsMarkup(node: React.ReactElement): string {
  return renderSvgMarkup(<svg xmlns="http://www.w3.org/2000/svg">{node}</svg>)
}

function step(title: string, text: string) {
  return { title, text }
}

const threeSteps = {
  type: "steps" as const,
  items: [
    step("注册账号", "填写基本信息完成注册"),
    step("配置项目", "选择模板并设置参数"),
    step("发布上线", "一键发布并持续监控"),
  ],
}

const fiveSteps = {
  type: "steps" as const,
  items: [
    step("步骤一", "说明一"),
    step("步骤二", "说明二"),
    step("步骤三", "说明三"),
    step("步骤四", "说明四"),
    step("步骤五", "说明五"),
  ],
}

// One canonical drawing on every theme: a right-pointing chevron per step
// with its number and title reversed out of the fill, and the step's own
// sentence laid under it at full column width.
describe("steps component", () => {
  const box = { x: 0, y: 0, w: 1088, h: 360 }
  const three = threeSteps

  it("draws one chevron per step, an 01/02/03 badge, the title on the arrow and the sentence under it", () => {
    const themeCtx = buildCtx(resolveStyle("runway"), {})
    const { container } = svg(steps.render(three, box, themeCtx))
    const arrows = Array.from(container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("fill") === themeCtx.colors.primary,
    )
    expect(arrows).toHaveLength(3)
    expect(container.querySelectorAll("circle")).toHaveLength(3)
    const digits = Array.from(container.querySelectorAll("text")).filter((t) => /^\d{2}$/.test(t.textContent ?? ""))
    expect(digits.map((t) => t.textContent)).toEqual(["01", "02", "03"])
    for (const item of three.items) {
      expect(container.textContent).toContain(item.title)
      expect(container.textContent).toContain(item.text)
    }
    const title = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === three.items[0].title)!
    expect(title.getAttribute("fill")).toBe(readableOn(themeCtx.colors.primary))
    const titleY = Number(title.getAttribute("y"))
    const foot = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === three.items[0].text)!
    expect(Number(foot.getAttribute("y"))).toBeGreaterThan(titleY)
    expect(container.querySelectorAll("rect").length === 0 || container.querySelectorAll('rect[rx="8"]').length === 0).toBe(
      true,
    )
  })



  it("four gallery steps stay on one row in a 640-wide slot and stay inside the box", () => {
    const themeCtx = buildCtx(resolveStyle("runway"), {})
    const four = {
      type: "steps" as const,
      items: [
        step("需求确认", "对齐范围与验收口径，避免现场返工。"),
        step("现场勘测", "核对安装点位与供电条件。"),
        step("设备接入", "完成接线并写入资产台账。"),
        step("模型调优", "压低误报占比后再放量。"),
      ],
    }
    const box = { x: 0, y: 0, w: 640, h: 360 }
    const measured = steps.measure(four, box.w, themeCtx)
    expect(measured).toBeLessThanOrEqual(box.h)
    const { container } = svg(steps.render(four, box, themeCtx))
    const arrows = Array.from(container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("fill") === themeCtx.colors.primary,
    )
    expect(arrows).toHaveLength(4)
    const ys = arrows.map((p) => Number((p.getAttribute("d") ?? "").match(/M [\d.]+ ([\d.]+)/)?.[1] ?? 0))
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(8)
    for (const el of Array.from(container.querySelectorAll("circle"))) {
      const cx = Number(el.getAttribute("cx"))
      const cy = Number(el.getAttribute("cy"))
      const r = Number(el.getAttribute("r"))
      expect(cx - r).toBeGreaterThanOrEqual(-2)
      expect(cx + r).toBeLessThanOrEqual(box.w + 2)
      expect(cy + r).toBeLessThanOrEqual(box.h + 2)
    }
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("number badges stay inside the chevron instead of hanging off the left", () => {
    const themeCtx = buildCtx(resolveStyle("runway"), {})
    const { container } = svg(steps.render(three, box, themeCtx))
    for (const c of Array.from(container.querySelectorAll("circle"))) {
      const cx = Number(c.getAttribute("cx"))
      const r = Number(c.getAttribute("r"))
      const sw = Number(c.getAttribute("stroke-width") ?? 0)
      expect(cx - r - sw / 2).toBeGreaterThanOrEqual(0)
    }
  })

  it("narrow width stacks the same chevrons rather than switching drawing", () => {
    const themeCtx = buildCtx(resolveStyle("runway"), {})
    const narrow = { x: 0, y: 0, w: 600, h: 900 }
    const { container } = svg(steps.render(fiveSteps, narrow, themeCtx))
    expect(Array.from(container.querySelectorAll("rect")).filter((r) => r.getAttribute("rx") === "8")).toHaveLength(0)
    const arrows = Array.from(container.querySelectorAll("path")).filter(
      (p) => p.getAttribute("fill") === themeCtx.colors.primary,
    )
    expect(arrows).toHaveLength(5)
    const ys = arrows.map((p) => Number((p.getAttribute("d") ?? "").match(/M [\d.]+ ([\d.]+)/)?.[1] ?? 0))
    expect(ys[4]).toBeGreaterThan(ys[0] + 40)
  })


  it("n=2 and n=5 stay inside the box, and the tree is subset-safe", () => {
    const themeCtx = buildCtx(resolveStyle("runway"), {})
    for (const ir of [
      { type: "steps" as const, items: [step("甲", "说明甲"), step("乙", "说明乙")] },
      fiveSteps,
    ]) {
      const h = Math.max(steps.measure(ir, box.w, themeCtx), 420)
      const node = steps.render(ir, { x: 0, y: 0, w: 1088, h }, themeCtx)
      const markup = stepsMarkup(node)
      const root = parseSvgRoot(markup)
      expect(() => assertSubset(root)).not.toThrow()
      for (const el of Array.from(root.querySelectorAll("rect, circle"))) {
        if (el.tagName.toLowerCase() === "circle") {
          const cx = Number(el.getAttribute("cx"))
          const cy = Number(el.getAttribute("cy"))
          const r = Number(el.getAttribute("r"))
          expect(cx - r).toBeGreaterThanOrEqual(-2)
          expect(cy - r).toBeGreaterThanOrEqual(-2)
          expect(cx + r).toBeLessThanOrEqual(1088 + 2)
          expect(cy + r).toBeLessThanOrEqual(h + 2)
        } else {
          const x = Number(el.getAttribute("x") ?? 0)
          const y = Number(el.getAttribute("y") ?? 0)
          const w = Number(el.getAttribute("width") ?? 0)
          const hh = Number(el.getAttribute("height") ?? 0)
          expect(x).toBeGreaterThanOrEqual(-2)
          expect(y).toBeGreaterThanOrEqual(-2)
          expect(x + w).toBeLessThanOrEqual(1088 + 2)
          expect(y + hh).toBeLessThanOrEqual(h + 2)
        }
      }
    }
  })
})

describe("steps on every theme", () => {
  it("renders the same shapes everywhere — only the tokens differ", () => {
    const shapesOf = (id: string) => {
      const { container } = svg(steps.render(threeSteps, { x: 0, y: 0, w: 1088, h: 360 }, buildCtx(resolveStyle(id), {})))
      return Array.from(container.querySelectorAll("circle, rect, path, line, polygon"))
        .map((el) => el.tagName.toLowerCase())
        .join(",")
    }
    const baseline = shapesOf("runway")
    for (const id of CANONICAL_THEME_IDS) {
      expect(shapesOf(id), id).toBe(baseline)
    }
  })
})
