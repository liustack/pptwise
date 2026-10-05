// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, COMPOSITIONS, type CompositionId } from "."
import { barInks } from "./benchmark"
import { spreadLabels, startBaseline } from "./horizon"
import { yearbookInks } from "./yearbook"
import { YEARBOOK_BOARD, YEARBOOK_BOARD_IMAGES } from "./__fixtures__/yearbook-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages almanac's 2026-10 board drew (`design/rounds/2026-10-05-almanac/`),
 * each set on almanac as the yearbook sheet sets it, and then on two themes
 * that share nothing with almanac: ember (a dark page whose primary is the
 * same bright orange as its accent) and crayon (light, rounded, saturated).
 * The setting reads the theme's tokens only, so every page must draw on all
 * three, inside its band, its text legible on what it sits on.
 */

/** The yearbook sheet's body band: x64 to x1216, y186 down to y640. */
const BAND = { x: 64, y: 186, w: 1152, h: 454 }
const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(YEARBOOK_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })

/** The yearbook sheet's compositions, in its order (`content-yearbook-sheet.tsx`). */
const YEARBOOK_IDS: readonly CompositionId[] = [
  "motion",
  "calendar",
  "horizon",
  "formula",
  "errata",
  "breakdown",
  "benchmark",
  "paired",
  "procedure",
  "magnitude",
  "segments",
  "survey",
  "outlook",
  "phases",
]

function draw(name: string, theme = "almanac") {
  const page = YEARBOOK_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const element = compose({ components: page.components, ctx, rect: BAND, setting: "yearbook", section: page.kicker, pageTag: page.tag }, YEARBOOK_IDS)
  return { element, ctx, tokens, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

/** The fill a text sits on: the last filled rect drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, text"))) {
    if (el === text) return ground
    if (el.tagName !== "rect" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]")) continue
    if (el.getAttribute("fill-opacity")) continue
    if (el.closest("[transform]") !== text.closest("[transform]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name)))
    if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h!) ground = fill
  }
  return ground
}

describe.each(["almanac", "ember", "crayon"])("the almanac board's pages on %s", (theme) => {
  it.each(Object.keys(YEARBOOK_BOARD))("%s is drawn whole by its compositions, inside the band, legible", (name) => {
    const page = YEARBOOK_BOARD[name]!
    const { root, ctx } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const ground = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect, image"))) {
      if (el.closest("[transform]")) continue
      const x = Number(el.getAttribute("x"))
      const y = Number(el.getAttribute("y"))
      const w = Number(el.getAttribute("width"))
      const h = Number(el.getAttribute("height"))
      expect(x, name).toBeGreaterThanOrEqual(BAND.x - 1)
      expect(x + w, name).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(BAND.y - 1)
      expect(y + h, name).toBeLessThanOrEqual(BAND.y + BAND.h + 1)
    }
    // Every word the author wrote on the page is on it.
    const drawn = texts(root!).map(textOf).join("").replace(/\s+/g, "")
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(word.replace(/\s+/g, ""))
  })
})

/** The plain words a page's components carry, as a reader would look for them on the page. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      // Switches, handles and the positions a scale draws as places rather than words.
      if (["type", "kind", "asset_id", "icon", "variant", "fit", "chart_type", "direction", "basis", "evidence", "language", "from", "to"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n|：|: /u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  components.forEach((c) => walk(c))
  return out
}

describe("the almanac board's pages on almanac", () => {
  it("motion sets the background as rows beside the ask on a card in the mark", () => {
    const { root, ctx } = draw("p02-ask")
    expect(root!.querySelectorAll("[data-yearbook-reason]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-yearbook-ask]")).toHaveLength(2)
    expect(root!.querySelector("[data-yearbook-motion] rect")!.getAttribute("fill")).toBe(yearbookInks(ctx).mark)
    expect(byText(root!, "1")).toBeDefined()
  })

  it("calendar lays the months to scale, the paid year on the accent's tint, the law it rests on under the figures", () => {
    const { root, ctx } = draw("p03-timeline")
    const inks = yearbookInks(ctx)
    const spans = Array.from(root!.querySelectorAll("[data-yearbook-span]"))
    expect(spans.map((s) => s.getAttribute("data-yearbook-span"))).toEqual(["", "marked"])
    expect(spans[1]!.querySelector("rect")!.getAttribute("fill")).toBe(inks.warm)
    expect(root!.querySelectorAll("[data-yearbook-milestone='marked']")).toHaveLength(1)
    expect(textOf(root!.querySelector("[data-yearbook-page-tag] text")!)).toBe("§ 条例 (EU) 2025/2083 修订后第 6、20、22 至 24 条")
    // The recalculated price is pending: its card is dashed.
    const cards = Array.from(root!.querySelectorAll("[data-yearbook-price]"))
    expect(cards[2]!.querySelector("rect")!.getAttribute("stroke-dasharray")).not.toBeNull()
    expect(cards[0]!.querySelector("rect")!.getAttribute("stroke-dasharray")).toBeNull()
    // A milestone in early April stands a quarter of the way into its year.
    const nodes = Array.from(root!.querySelectorAll("[data-yearbook-milestone] circle")).map((c) => Number(c.getAttribute("cx")))
    expect(nodes[1]! - nodes[0]!).toBeGreaterThan(((nodes[2]! - nodes[0]!) / 13) * 3)
  })

  it("horizon follows the marked line heavy in the mark over the table of years, the scenario's pill under it", () => {
    const { root, ctx } = draw("p04-curve")
    const marked = root!.querySelector("[data-yearbook-line='marked'] polyline")!
    expect(marked.getAttribute("stroke")).toBe(yearbookInks(ctx).mark)
    expect(marked.getAttribute("stroke-width")).toBe("4")
    expect(root!.querySelectorAll("[data-yearbook-years-row] text")).toHaveLength(10)
    expect(root!.querySelector("[data-yearbook-chart-tag] rect")!.getAttribute("stroke-dasharray")).not.toBeNull()
  })

  it("formula colours the bridge by what each bar is and sets the formula beside it", () => {
    const { root, ctx } = draw("p05-waterfall")
    const inks = yearbookInks(ctx)
    const fills = Array.from(root!.querySelectorAll("[data-yearbook-bar] rect")).map((r) => r.getAttribute("fill"))
    expect(fills).toEqual([inks.quiet, inks.ghost, inks.accent, inks.mark])
    // Five parameters, each its symbol and what it stands for.
    expect(root!.querySelectorAll("[data-yearbook-parameters] text")).toHaveLength(10)
    expect(byText(root!, "P = €75.36")).toBeDefined()
    expect(byText(root!, "− 因子 × CSCF × BM")!.getAttribute("data-formula-indent")).toBe("2")
  })

  it("errata strikes out the wrong working and sets the right figure in the accent", () => {
    const { root, ctx } = draw("p06-miscalc")
    expect(root!.querySelectorAll("[data-strike]")).toHaveLength(1)
    const right = root!.querySelector("[data-yearbook-errata='right'] [data-yearbook-errata-row='figure'] text:last-of-type")!
    expect(right.getAttribute("fill")).toBe(yearbookInks(ctx).accent)
    expect(root!.querySelector("[data-yearbook-why]")).not.toBeNull()
  })

  it("breakdown brackets the marked run under the author's own line", () => {
    const { root } = draw("p07-exposure")
    expect(root!.querySelectorAll("[data-yearbook-part='marked']")).toHaveLength(4)
    expect(textOf(root!.querySelector("[data-yearbook-bracket] text")!)).toBe("第 73 章制品 €93.5 亿，占 69.5%")
  })

  it("benchmark steps a short list toward the marked bar and draws the reference dashed in the mark", () => {
    const { root, ctx } = draw("p08-products")
    const inks = yearbookInks(ctx)
    expect(Array.from(root!.querySelectorAll("[data-yearbook-bar] rect")).map((r) => r.getAttribute("fill"))).toEqual([inks.quiet, inks.mark, inks.accent])
    expect(root!.querySelector("[data-yearbook-reference] line")!.getAttribute("stroke")).toBe(inks.mark)
    expect(root!.querySelector("[data-yearbook-photo] image")).not.toBeNull()
  })

  it("benchmark steps a long list back to the ghost", () => {
    const { root, ctx } = draw("p09-countries")
    const inks = yearbookInks(ctx)
    const fills = Array.from(root!.querySelectorAll("[data-yearbook-bar] rect")).map((r) => r.getAttribute("fill"))
    expect(fills.filter((f) => f === inks.ghost)).toHaveLength(5)
    expect(fills.filter((f) => f === inks.accent)).toHaveLength(1)
  })

  it("paired sets the way the page argues for in the mark and the pending note dashed in the accent", () => {
    const { root, ctx } = draw("p10-actual")
    const inks = yearbookInks(ctx)
    expect(root!.querySelectorAll("[data-yearbook-bar='marked']")).toHaveLength(5)
    const note = root!.querySelector("[data-yearbook-basis-note] rect")!
    expect(note.getAttribute("stroke")).toBe(inks.accent)
    expect(note.getAttribute("stroke-dasharray")).not.toBeNull()
  })

  it("procedure marks the step the page turns on and tints the recommended column", () => {
    const { root, ctx } = draw("p11-verify")
    expect(root!.querySelectorAll("[data-yearbook-step='marked']")).toHaveLength(1)
    expect(byText(root!, "首年实地查厂")).toBeDefined()
    expect(root!.querySelector("[data-yearbook-column='recommended'] [data-yearbook-icon='check']")).not.toBeNull()
    expect(Array.from(root!.querySelectorAll("[data-yearbook-table] rect")).some((r) => r.getAttribute("fill") === yearbookInks(ctx).tint)).toBe(true)
  })

  it("magnitude sets the figure at 200px and the price bars beside it", () => {
    const { root } = draw("p12-china-price")
    expect(byText(root!, "±3%")!.getAttribute("font-size")).toBe("200")
    expect(byText(root!, "€7.68 · 62.36 元")).toBeDefined()
    expect(textOf(root!.querySelector("[data-yearbook-side] [data-yearbook-pill] text")!)).toBe("第 9 条抵扣细则：仍是草案")
  })

  it("segments says what each part means under it: the marked part solid, the other dashed", () => {
    const { root, ctx } = draw("p13-green-power")
    const meanings = Array.from(root!.querySelectorAll("[data-yearbook-meaning]"))
    expect(meanings).toHaveLength(2)
    expect(meanings[0]!.querySelector("line")!.getAttribute("stroke")).toBe(yearbookInks(ctx).accent)
    expect(meanings[1]!.querySelector("line")!.getAttribute("stroke-dasharray")).not.toBeNull()
  })

  it("survey ramps the routes from the ghost to the mark and dashes the company's claim", () => {
    const { root, ctx } = draw("p14-routes")
    const inks = yearbookInks(ctx)
    expect(Array.from(root!.querySelectorAll("[data-yearbook-bar] rect")).map((r) => r.getAttribute("fill"))).toEqual([inks.ghost, inks.quiet, inks.mark])
    expect(root!.querySelector("[data-yearbook-claim] rect")!.getAttribute("stroke-dasharray")).not.toBeNull()
    expect(byText(root!, "2.34 · 基准线")).toBeDefined()
  })

  it("outlook sets the law on the tint and the proposal dashed, each rule's stem clear of its year", () => {
    const { root } = draw("p15-rules")
    expect(Array.from(root!.querySelectorAll("[data-yearbook-span]")).map((s) => s.getAttribute("data-yearbook-span"))).toEqual(["", "proposed"])
    expect(root!.querySelectorAll("[data-yearbook-rule='proposed']")).toHaveLength(2)
    for (const rule of Array.from(root!.querySelectorAll("[data-yearbook-rule]"))) {
      const stem = rule.querySelector("line")!
      expect(Number(stem.getAttribute("y1"))).toBeGreaterThan(BAND.y + 144 + 24)
    }
  })

  it("phases sets each pending budget line at its card's foot in a dashed pill", () => {
    const { root, ctx } = draw("p16-roadmap")
    expect(root!.querySelectorAll("[data-yearbook-pending]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-yearbook-phase='marked']")).toHaveLength(1)
    expect(root!.querySelector("[data-yearbook-phase='marked'] rect")!.getAttribute("fill")).toBe(yearbookInks(ctx).warm)
  })
})

describe("what the yearbook's compositions decline", () => {
  it.each(YEARBOOK_IDS)("%s draws only in the yearbook setting", (id) => {
    const { ctx } = testCtx("almanac")
    for (const page of Object.values(YEARBOOK_BOARD)) {
      expect(COMPOSITIONS[id]({ components: page.components, ctx: chinese(ctx), rect: BAND })).toBeNull()
    }
  })

  it("calendar declines a date it cannot lay on a scale", () => {
    const page = YEARBOOK_BOARD["p03-timeline"]!
    const timeline = page.components[0] as Extract<Component, { type: "timeline" }>
    const loose = { ...timeline, milestones: timeline.milestones.map((m, i) => (i === 0 ? { ...m, date: "明年初" } : m)) }
    const { ctx } = testCtx("almanac")
    expect(COMPOSITIONS.calendar({ components: [loose, ...page.components.slice(1)] as Component[], ctx: chinese(ctx), rect: BAND, setting: "yearbook" })).toBeNull()
  })

  it("calendar runs its axis on to a milestone late in its last month", () => {
    const page = YEARBOOK_BOARD["p03-timeline"]!
    const timeline = page.components[0] as Extract<Component, { type: "timeline" }>
    const late = {
      ...timeline,
      periods: [{ from: "2026-03", to: "2026-11", label: "农时" }],
      milestones: [
        { date: "2026-03-05", title: "春耕" },
        { date: "2026-07-22", title: "防涝" },
        { date: "2026-11-22", title: "修渠" },
      ],
    }
    const { ctx } = testCtx("almanac")
    const element = COMPOSITIONS.calendar({ components: [late, ...page.components.slice(1)] as Component[], ctx: chinese(ctx), rect: BAND, setting: "yearbook" })
    const { root } = renderNode(element!)
    const nodes = Array.from(root.querySelectorAll("[data-yearbook-milestone] circle")).map((c) => Number(c.getAttribute("cx")))
    expect(nodes).toHaveLength(3)
    for (const x of nodes) expect(x).toBeLessThanOrEqual(BAND.x + BAND.w)
    for (const text of Array.from(root.querySelectorAll("[data-yearbook-milestone] text"))) expect(Number(text.getAttribute("x"))).toBeLessThanOrEqual(BAND.x + BAND.w)
  })

  it("breakdown declines a share bar with no line of the author's own for its run", () => {
    const page = YEARBOOK_BOARD["p07-exposure"]!
    const chart = page.components[0] as Extract<Component, { type: "chart" }>
    const { ctx } = testCtx("almanac")
    expect(COMPOSITIONS.breakdown({ components: [{ ...chart, emphasis_label: undefined }, page.components[1]!] as Component[], ctx: chinese(ctx), rect: BAND, setting: "yearbook" })).toBeNull()
  })
})

describe("the yearbook's small rules", () => {
  it("steps a short list of bars from the ghost to the mark and a long one back to the ghost", () => {
    const { ctx } = testCtx("almanac")
    const inks = yearbookInks(ctx)
    expect(barInks([false, false, true], inks)).toEqual([inks.quiet, inks.mark, inks.accent])
    expect(barInks([false, false, false], inks)).toEqual([inks.ghost, inks.quiet, inks.mark])
    expect(barInks([false, true], inks)).toEqual([inks.mark, inks.accent])
    expect(barInks([false, true, false, false, false, false], inks).filter((c) => c === inks.ghost)).toHaveLength(5)
  })

  it("keeps the marked line's first value clear of every gridline", () => {
    // 14px figures: 11.2px over the baseline, 2.8 under, and 4px of air each side.
    const clear = (b: number, rules: number[]) => rules.every((r) => r < b - 15.2 || r > b + 6.8)
    // Under its point, as the board set it, when no rule is near.
    expect(startBaseline(400, [300, 500], 520)).toBe(422)
    // Pushed on below a rule its words would graze.
    const pushed = startBaseline(422, [442.5, 520], 520)
    expect(pushed).toBeGreaterThan(442.5)
    expect(clear(pushed, [442.5, 520])).toBe(true)
    // Over its point when below it would run into the years under the plot.
    const over = startBaseline(510, [442.5, 520], 520)
    expect(over).toBeLessThan(510)
    expect(clear(over, [442.5, 520])).toBe(true)
  })

  it("spreads the end labels of lines that end close together", () => {
    const ys = spreadLabels([382, 390, 243, 341], 20)
    expect(ys[2]).toBe(243)
    expect(Math.abs(ys[0]! - ys[1]!)).toBeGreaterThanOrEqual(19.9)
    expect(ys[0]! + ys[1]!).toBeCloseTo(772, 5)
  })
})
