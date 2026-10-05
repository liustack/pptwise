// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { pitchInks } from "./pitch"
import { PITCH_BOARD } from "./__fixtures__/pitch-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages ember's 2026-10 board drew (`design/rounds/2026-10-06-ember/`),
 * each set on ember as the pitch sheet sets it, and then on two themes that
 * share nothing with ember: homeroom (light, misty blue and a red pen) and
 * brief (light, navy, a serif). The setting reads the theme's tokens only, so
 * every page must draw on all three, inside its band, its text legible on
 * what it sits on, and the theme's accent on one thing a page.
 */

/** The pitch sheet's body band: x64 to x1216, y196 down to y640. */
const BAND = { x: 64, y: 196, w: 1152, h: 444 }
/** The photo page's column beside its photograph: x624 to x1216, y280 down to y640. */
const COLUMN = { x: 624, y: 280, w: 592, h: 360 }
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false } })

/** The pitch sheet's compositions, in its order (`content-pitch-sheet.tsx`). */
const PITCH_IDS: readonly CompositionId[] = ["expanse", "stairs", "funnel", "rivals", "equation", "bets", "divide", "locks", "register", "runway", "uses"]

function draw(name: string, theme = "ember") {
  const page = PITCH_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const photo = name === "p09-medical"
  const rect = photo ? COLUMN : BAND
  const element = compose({ components: page.components, ctx, rect, setting: "pitch" }, photo ? ["spotlight"] : PITCH_IDS)
  return { element, ctx, tokens, rect, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

/** The box a filled shape covers: a rect's own, a circle's square, a polygon's bounds. */
function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  if (el.tagName === "polygon") {
    const pts = (el.getAttribute("points") ?? "").trim().split(/\s+/).map((p) => p.split(",").map(Number))
    const xs = pts.map((p) => p[0]!)
    const ys = pts.map((p) => p[1]!)
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)]
  }
  return null
}

/** The fill a text sits on: the last filled shape drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, circle, polygon, text"))) {
    if (el === text) return ground
    if (el.tagName === "text" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]") || el.getAttribute("fill-opacity")) continue
    if (el.closest("[transform]") && el.closest("[transform]") !== text.closest("[transform]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const box = boxOf(el)
    if (!box) continue
    const [x, y, w, h] = box
    if (tx >= x && tx <= x + w && ty >= y && ty <= y + h) ground = fill
  }
  return ground
}

/** The plain words a page's components carry, as a reader would look for them on the page. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      // Switches and handles, and a single series' name: no chart of one series prints its name.
      if (["type", "kind", "asset_id", "icon", "variant", "fit", "chart_type", "direction", "tone", "key", "emphasis", "y_unit"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n|。|\. /u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  // A chart of one series never prints its name.
  for (const c of components) walk(c.type === "chart" && c.series.length === 1 ? { ...c, series: [{ ...c.series[0]!, name: "" }] } : c)
  return out
}

/** Every shape or word painted in the theme's accent, and which light it belongs to. */
function lights(root: Element, accent: string): Set<string> {
  const out = new Set<string>()
  for (const el of Array.from(root.querySelectorAll("*"))) {
    const paint = [el.getAttribute("fill"), el.getAttribute("stroke")].map((c) => c?.toUpperCase())
    if (!paint.includes(accent.toUpperCase())) continue
    const fire = el.closest("[data-pitch-fire]")
    out.add(fire ? fire.getAttribute("data-pitch-fire")! : `stray ${el.tagName} ${textOf(el)}`)
  }
  return out
}

describe.each(["ember", "homeroom", "brief"])("the ember board's pages on %s", (theme) => {
  it.each(Object.keys(PITCH_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = PITCH_BOARD[name]!
    const { root, ctx, rect } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const ground = ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      if (fill === "none") continue
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect, image, polygon"))) {
      if (el.closest("[transform]")) continue
      const [x, y, w, h] = boxOf(el) ?? [0, 0, 0, 0]
      expect(x, name).toBeGreaterThanOrEqual(rect.x - 1)
      expect(x + w, name).toBeLessThanOrEqual(rect.x + rect.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(rect.y - 1)
      expect(y + h, name).toBeLessThanOrEqual(rect.y + rect.h + 1)
    }
    const drawn = texts(root!).map(textOf).join("").replace(/\s+/g, "")
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(word.replace(/\s+/g, ""))
  })
})

describe("the ember board's pages on ember", () => {
  it.each(Object.keys(PITCH_BOARD))("%s lights one thing in the fire", (name) => {
    const { root, ctx } = draw(name)
    expect([...lights(root!, pitchInks(ctx).fire)], name).toHaveLength(1)
  })

  it("expanse sets the whole over a field of squares and lights the part's dot and figure", () => {
    const { root, ctx } = draw("p03-gap")
    expect(root!.querySelectorAll("[data-pitch-field] line").length).toBeGreaterThan(20)
    expect(byText(root!, "600 亿")!.getAttribute("font-size")).toBe("96")
    expect(byText(root!, "100 万+")!.closest("[data-pitch-fire]")).not.toBeNull()
    expect(byText(root!, "100 万+")!.getAttribute("fill")).toBe(pitchInks(ctx).fire)
  })

  it("stairs raises each year a step and lights the highlighted one, its fact and gloss split at the sentence", () => {
    const { root } = draw("p04-why-now")
    const tops = Array.from(root!.querySelectorAll("[data-pitch-step] > rect")).map((r) => Number(r.getAttribute("y")))
    expect(tops[0]! - tops[1]!).toBe(56)
    expect(tops[1]! - tops[2]!).toBe(56)
    expect(root!.querySelector("[data-pitch-step='lit'] [data-pitch-fire] text")!.textContent).toBe("2026")
    const fact = byText(root!, "条例和 CCAR-92 于 1 月 1 日同日生效")!
    expect(fact.getAttribute("data-gloss-break")).toBe("。")
  })

  it("funnel narrows each level by its value and lights the last, printing values with the unit", () => {
    const { root } = draw("p05-funnel")
    expect(byText(root!, "1200 个")).toBeDefined()
    expect(byText(root!, "148 个")!.closest("[data-pitch-fire]")).not.toBeNull()
    expect(byText(root!, "对我们意味着")!.getAttribute("data-tracking")).toBe("2")
  })

  it("funnel prints its levels' corners to the hundredth, so every Node draws the same markup", () => {
    const { root } = draw("p05-funnel")
    const numbers = Array.from(root!.querySelectorAll("[data-pitch-level] polygon")).flatMap((p) => p.getAttribute("points")!.split(/[ ,]/))
    expect(numbers.length).toBeGreaterThan(0)
    for (const n of numbers) expect(n).toMatch(/^-?\d+(\.\d{1,3})?$/)
  })

  it("rivals frames the marked column in the fire with its icon before every cell", () => {
    const { root } = draw("p06-landscape")
    const column = root!.querySelector("[data-pitch-fire='column']")!
    expect(column.querySelectorAll("[data-pitch-icon='circle-help']")).toHaveLength(6)
    expect(texts(column).filter((t) => textOf(t) === "未公布")).toHaveLength(6)
  })

  it("equation fills the result in the fire and strikes what it leaves out", () => {
    const { root } = draw("p08-wedge")
    expect(root!.querySelectorAll("[data-pitch-term]")).toHaveLength(3)
    expect(root!.querySelector("[data-pitch-fire='result']")).not.toBeNull()
    expect(root!.querySelector("[data-pitch-excluded] line[data-strike]")).not.toBeNull()
    expect(texts(root!).filter((t) => ["+", "="].includes(textOf(t))).map(textOf)).toEqual(["+", "+", "="])
  })

  it("bets lays each window on the plan's whole stretch", () => {
    const { root } = draw("p10-hypotheses")
    const lit = root!.querySelector("[data-pitch-bet='lit'] [data-pitch-fire] rect[rx]")!
    const track = Array.from(root!.querySelectorAll("[data-pitch-bet='lit'] > rect")).find((r) => r.getAttribute("height") === "10")!
    const x0 = Number(track.getAttribute("x"))
    const w = Number(track.getAttribute("width"))
    expect(Number(lit.getAttribute("x"))).toBeCloseTo(x0 + (15 / 18) * w, 3)
  })

  it("divide sets the figures in two groups by their tags with a dashed line between", () => {
    const { root } = draw("p11-unit-economics")
    expect(root!.querySelectorAll("[data-pitch-group]")).toHaveLength(2)
    expect(root!.querySelector("line[stroke-dasharray]")).not.toBeNull()
    expect(root!.querySelector("[data-pitch-fire='verdict']")).not.toBeNull()
  })

  it("locks numbers each gate, locks the way between them and lights the last", () => {
    const { root } = draw("p12-compliance")
    expect(byText(root!, "第 1 关")).toBeDefined()
    expect(byText(root!, "第 5 关")!.closest("[data-pitch-fire='gate']")).not.toBeNull()
    expect(root!.querySelectorAll("[data-pitch-icon='lock']")).toHaveLength(4)
  })

  it("register tints the highlighted risk and sets the short column bold", () => {
    const { root } = draw("p13-risks")
    expect(root!.querySelector("[data-pitch-risk='lit'] [data-pitch-fire]")).not.toBeNull()
    expect(byText(root!, "全程")!.getAttribute("font-weight")).toBe("700")
  })

  it("runway ticks the run, sets the gate's diamond where its phase ends and outlines the gate's rule", () => {
    const { root } = draw("p14-milestones")
    expect(byText(root!, "起点")).toBeDefined()
    expect(byText(root!, "第 18 个月")).toBeDefined()
    expect(byText(root!, "闸门：第 6 个月")!.closest("[data-pitch-fire='gate']")).not.toBeNull()
    expect(root!.querySelector("[data-pitch-gate-rule]")!.closest("[data-pitch-fire='gate']")).not.toBeNull()
  })

  it("runway lets a point that wraps push the next one down by its extra line", () => {
    const [road, rule] = PITCH_BOARD["p14-milestones"]!.components as [Extract<Component, { type: "roadmap" }>, Component]
    const items = road.items.map((item, i) => (i === 1 ? { ...item, points: ["园区或城郊医疗点对点，先飞最短的那一条航线", "验证假设 3：安全稳定复飞"] } : item))
    const element = compose({ components: [{ ...road, items }, rule], ctx: chinese(testCtx("ember").ctx), rect: BAND, setting: "pitch" }, PITCH_IDS)
    const phase = renderNode(element!).root.querySelectorAll("[data-pitch-phase]")[1]!
    const [first, second] = Array.from(phase.querySelectorAll("[data-pitch-point]")).map((g) => Array.from(g.querySelectorAll("text")).slice(1).map((t) => Number(t.getAttribute("y"))))
    expect(first).toHaveLength(2)
    // The second point starts a line plus the board's gap under the first one's last line.
    expect(second![0]! - first![1]!).toBe(20 + 24)
  })

  it("uses cuts the bar by share and lights the first part and its swatch", () => {
    const { root } = draw("p15-ask")
    const parts = Array.from(root!.querySelectorAll("[data-pitch-use] > * > g > rect, [data-pitch-use] > g > rect"))
    expect(parts.length).toBeGreaterThanOrEqual(4)
    expect(texts(root!).filter((t) => textOf(t) === "30%").length).toBeGreaterThanOrEqual(2)
    expect(root!.querySelector("[data-pitch-use='0'] [data-pitch-fire='use']")).not.toBeNull()
  })

  it("spotlight sets the marked figure huge in the fire beside the others", () => {
    const { root } = draw("p09-medical")
    expect(byText(root!, "460 万")!.getAttribute("font-size")).toBe("120")
    expect(root!.querySelectorAll("[data-pitch-aside]")).toHaveLength(2)
  })
})
