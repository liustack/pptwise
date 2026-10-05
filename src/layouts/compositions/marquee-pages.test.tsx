// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { marqueeInks } from "./marquee"
import { MARQUEE_BOARD } from "./__fixtures__/marquee-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages rally's 2026-10 board drew (`design/rounds/2026-10-06-rally/`),
 * each set on rally as the marquee sheet sets it, and then on two themes
 * that share nothing with rally: homeroom (light, misty blue and a red pen)
 * and brief (light, navy, a serif). The setting reads the theme's tokens
 * only, so every page must draw on all three, inside its band, its text
 * legible on what it sits on, and every word the author wrote on the page.
 */

/** The marquee sheet's body band: x64 to x1216, y188 down to y640 over a source, y648 without one. */
const band = (sourced: boolean) => ({ x: 64, y: 188, w: 1152, h: (sourced ? 640 : 648) - 188 })
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false } })

/** The marquee sheet's compositions, in its order (`content-marquee-sheet.tsx`). */
const MARQUEE_IDS: readonly CompositionId[] = ["crest", "branch", "season", "makeup", "origins", "route", "spots", "wall", "loop", "stubs", "fallbacks", "timetable", "scoreboard", "allotment", "asks"]

function draw(name: string, theme = "rally") {
  const page = MARQUEE_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const rect = band(page.sourced)
  const element = compose({ components: page.components, ctx, rect, setting: "marquee", ballot: page.ballot }, MARQUEE_IDS)
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
      if (["type", "kind", "asset_id", "icon", "variant", "fit", "chart_type", "direction", "tone", "key", "emphasis", "y_unit", "evidence", "basis", "from", "to"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n|。|：| · |\. /u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) {
    // A chart's figures are printed from its values, its x the ticks or the names.
    if (c.type === "chart") {
      walk(c.series.map((s) => ({ name: s.name, data: s.data.map((d) => ({ x: d.x })) })))
      if (c.emphasis_label) walk(c.emphasis_label)
      if (c.axes?.x_title) walk(c.axes.x_title)
      continue
    }
    if (c.type === "heatmap") {
      walk([...c.x_labels, ...c.y_labels, ...(c.bands ?? []).map((b) => b.label)])
      continue
    }
    if (c.type === "gantt") {
      walk({ labels: c.axis_labels, items: c.items.map((it) => ({ label: it.label, text: it.text })), bands: (c.bands ?? []).map((b) => b.label) })
      continue
    }
    walk(c)
  }
  return out
}

describe.each(["rally", "homeroom", "brief"])("the rally board's pages on %s", (theme) => {
  it.each(Object.keys(MARQUEE_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = MARQUEE_BOARD[name]!
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
      const [x, y, w, h] = boxOf(el) ?? [Number(el.getAttribute("x")), Number(el.getAttribute("y")), Number(el.getAttribute("width")), Number(el.getAttribute("height"))]
      expect(x, name).toBeGreaterThanOrEqual(rect.x - 7)
      expect(x + w, name).toBeLessThanOrEqual(rect.x + rect.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(rect.y - 7)
      expect(y + h, name).toBeLessThanOrEqual(rect.y + rect.h + 1)
    }
    const drawn = texts(root!).map(textOf).join("").replace(/\s+/g, "")
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(word.replace(/\s+/g, ""))
  })
})

describe("the rally board's pages on rally", () => {
  it.each(Object.keys(MARQUEE_BOARD))("%s puts the lead on what the page is about", (name) => {
    const { root } = draw(name)
    expect(root!.querySelectorAll("[data-marquee-lead]").length, name).toBeGreaterThan(0)
  })

  it("crest sets the figure huge in the lead, scales the run to its tallest bar and lights the marked year", () => {
    const { root, ctx } = draw("p03-market")
    expect(byText(root!, "4338.58")!.getAttribute("font-size")).toBe("130")
    expect(byText(root!, "4338.58")!.closest("[data-marquee-lead='figure']")).not.toBeNull()
    expect(byText(root!, "万人次 · 2025 年 · 同比 +18.81%")).toBeDefined()
    const bars = Array.from(root!.querySelectorAll("[data-marquee-bar] rect"))
    const h = bars.map((b) => Number(b.getAttribute("height")))
    expect(h[3]! / h[0]!).toBeCloseTo(324.48 / 39.64, 2)
    expect(root!.querySelector("[data-marquee-bar='2025'] [data-marquee-lead] rect")!.getAttribute("fill")).toBe(marqueeInks(ctx).fire)
    expect(byText(root!, "大型演出票房（亿元）")).toBeDefined()
  })

  it("branch climbs the marked series in the lead and drops the other dotted, both changes signed", () => {
    const { root } = draw("p04-split")
    expect(byText(root!, "+30.8%")).toBeDefined()
    expect(byText(root!, "−6.1%")).toBeDefined()
    expect(root!.querySelector("[data-marquee-branch='演唱会'] [data-marquee-lead] path")).not.toBeNull()
    expect(root!.querySelector("[data-marquee-branch='音乐节'] path")!.getAttribute("stroke-dasharray")).toBeTruthy()
    expect(byText(root!, "2024")).toBeDefined()
    expect(byText(root!, "媒体报道")).toBeDefined()
  })

  it("season shades each cell by its value, flames the peaks and frames the band", () => {
    const { root } = draw("p05-season")
    expect(root!.querySelectorAll("[data-heat]")).toHaveLength(24)
    expect(root!.querySelectorAll("[data-marquee-icon='flame']")).toHaveLength(4)
    expect(root!.querySelector("[data-marquee-lead='season'] rect")!.getAttribute("stroke-dasharray")).toBeTruthy()
    expect(byText(root!, "演唱会：8、9 月场次见顶，5、11 月票房高点")).toBeDefined()
  })

  it("makeup prints a share inside its part where it fits and under it where it does not", () => {
    const { root } = draw("p06-audience")
    expect(root!.querySelectorAll("[data-marquee-makeup]")).toHaveLength(2)
    expect(byText(root!, "18 至 34 岁 74.9%")).toBeDefined()
    const festival = root!.querySelector("[data-marquee-makeup='音乐节']")!
    expect(texts(festival).map(textOf)).toEqual(expect.arrayContaining(["2.2", "1.9", "36.2"]))
    expect(byText(root!, "音乐节 67.1%（2024 年）")!.getAttribute("data-gloss-break")).toBe("。")
  })

  it("origins keeps the same parts in the same colours on every row and sets the figure in the lead", () => {
    const { root } = draw("p07-crosscity")
    const fills = Array.from(root!.querySelectorAll("[data-group]")).map((g) => Array.from(g.querySelectorAll("[data-part] rect")).map((r) => r.getAttribute("fill")))
    for (const row of fills) expect(row).toEqual(fills[0])
    expect(byText(root!, "64.2%")!.closest("[data-marquee-lead='figure']")).not.toBeNull()
    expect(root!.querySelector("[data-marquee-photo]")).not.toBeNull()
  })

  it("route dims the stop the plan stays out of and sets its second sentence over it", () => {
    const { root } = draw("p08-weekend")
    const aside = root!.querySelector("[data-stop-aside]")!
    expect(aside.getAttribute("data-stop")).toBe("演出中")
    expect(texts(aside).map(textOf)).toEqual(expect.arrayContaining(["场内归主办方", "我们不进场卖货"]))
    expect(byText(root!, "98.4%")!.closest("[data-bar='餐饮']")).not.toBeNull()
  })

  it("spots outlines the first card in the lead and sets the picture's note at its foot", () => {
    const { root } = draw("p09-touchpoints")
    expect(root!.querySelector("[data-spot='场外'] [data-marquee-lead='spot']")).not.toBeNull()
    expect(texts(root!).filter((t) => textOf(t) === "示意图（AI 生成）")).toHaveLength(4)
  })

  it("wall sets every case with its tag and the count on a card of the lead", () => {
    const { root } = draw("p10-cases")
    expect(root!.querySelectorAll("[data-case]")).toHaveLength(6)
    expect(byText(root!, "0")!.closest("[data-marquee-lead='count']")).not.toBeNull()
    expect(texts(root!).filter((t) => textOf(t) === "企业口径")).toHaveLength(3)
  })

  it("loop lights the first stage, runs the return back under it and bolds the marked column in the lead", () => {
    const { root } = draw("p11-attribution")
    expect(root!.querySelector("[data-stage='发码'] [data-marquee-lead='start']")).not.toBeNull()
    expect(root!.querySelector("[data-marquee-return] path")!.getAttribute("stroke-dasharray")).toBeTruthy()
    expect(byText(root!, "复盘结果回到下一站的发码")).toBeDefined()
    expect(byText(root!, "杯码")!.getAttribute("font-weight")).toBe("700")
  })

  it("stubs perforates each ticket and prints its tag on the stub", () => {
    const { root } = draw("p12-city")
    expect(root!.querySelectorAll("[data-ticket] line[stroke-dasharray]")).toHaveLength(4)
    expect(texts(root!).filter((t) => textOf(t) === "凭票根")).toHaveLength(4)
    expect(byText(root!, "1:6.85")).toBeDefined()
  })

  it("fallbacks tints the highlighted row and points every risk at its plan", () => {
    const { root } = draw("p13-planb")
    expect(root!.querySelector("[data-risk='禁带瓶装'] [data-marquee-lead='row']")).not.toBeNull()
    expect(root!.querySelectorAll("[data-risk] polygon")).toHaveLength(6)
  })

  it("timetable rules each month, tints the season and sets the star on the marked bar", () => {
    const { root } = draw("p14-schedule")
    expect(texts(root!).filter((t) => ["2026.10", "2027.1"].includes(textOf(t)))).toHaveLength(2)
    expect(root!.querySelector("[data-marquee-season]")).not.toBeNull()
    expect(root!.querySelector("[data-row='首站试点'] [data-marquee-icon='star']")).not.toBeNull()
  })

  it("scoreboard leaves three empty slots where each measure's figure will stand", () => {
    const { root } = draw("p15-kpi")
    expect(root!.querySelectorAll("[data-marquee-empty-figure]")).toHaveLength(6)
    expect(root!.querySelectorAll("[data-marquee-empty-figure] rect")).toHaveLength(18)
    // The closing line on the band's floor, where the board set it: y624.
    expect(Number(root!.querySelector("[data-marquee-close] text")!.getAttribute("y"))).toBeGreaterThan(624)
  })

  it("scoreboard lifts its closing line clear of a source line under the band", () => {
    const page = MARQUEE_BOARD["p15-kpi"]!
    const { ctx } = testCtx("rally")
    const element = compose({ components: page.components, ctx: chinese(ctx), rect: band(true), setting: "marquee" }, MARQUEE_IDS)
    const { root } = renderNode(element!)
    const close = root.querySelector("[data-marquee-close] text")!
    expect(Number(close.getAttribute("y"))).toBeLessThan(640)
  })

  it("allotment brackets the set-apart run with its line and names the bar under it", () => {
    const { root } = draw("p16-budget")
    expect(byText(root!, "单列 15%，不挪用")).toBeDefined()
    expect(Number(byText(root!, "拟定比例")!.getAttribute("x"))).toBe(64)
    expect(root!.querySelectorAll("[data-marquee-bracket] rect")).toHaveLength(3)
  })

  it("asks sets a box for each choice on every request and lights the first", () => {
    const { root } = draw("p17-asks")
    expect(root!.querySelectorAll("[data-ballot-choice]")).toHaveLength(8)
    expect(root!.querySelector("[data-ask='方向'] [data-marquee-lead='ask']")).not.toBeNull()
    expect(byText(root!, "见 3 至 9 页")).toBeDefined()
  })

  it("asks steps back from a page with no ballot", () => {
    const page = MARQUEE_BOARD["p17-asks"]!
    const { ctx } = testCtx("rally")
    expect(compose({ components: page.components, ctx, rect: band(false), setting: "marquee" }, ["asks"])).toBeNull()
  })
})
