// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { manuscriptInks } from "./manuscript"
import { fitManuscriptNotes, manuscriptBodyRect } from "../manuscript-shared"
import { MANUSCRIPT_BOARD, MANUSCRIPT_BOARD_IMAGES } from "./__fixtures__/manuscript-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages thesis's 2026-10 board drew (`design/rounds/2026-10-06-thesis/`),
 * each set on thesis as the manuscript sheet sets it, and then on two themes
 * that share nothing with it: brief (a cream page, navy and a sans body) and
 * rally (a dark page whose accent is a magenta). The setting reads the
 * theme's tokens only, so every page must draw on all three, inside its band,
 * its text legible on what it sits on, and every word the author wrote on the
 * page.
 */

const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(MANUSCRIPT_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))

/** The manuscript sheet's compositions, in its order (`content-manuscript-sheet.tsx`). */
const MANUSCRIPT_IDS: readonly CompositionId[] = ["inquiry", "ladder", "reach", "backdrop", "thresholds", "tabulation", "partition", "findings", "coverage", "propositions", "cadence", "designs", "hazards", "itinerary", "queries"]

function draw(name: string, theme = "thesis", components?: Component[]) {
  const page = MANUSCRIPT_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const used = components ?? page.components
  // The numbers the sheet counts across the deck, handed to the blocks that take them.
  const labels = new Map<Component, string>(used.flatMap((c, i) => (page.exhibits[i] ? [[c, page.exhibits[i]!] as const] : [])))
  const ctx: ComponentCtx = { ...base, figures: { chinese: true, groupFour: false }, images: IMAGES, exhibitLabels: labels }
  const rect = manuscriptBodyRect(fitManuscriptNotes({ footnote: page.footnote }, base))
  const element = compose({ components: used, ctx, rect, setting: "manuscript" }, MANUSCRIPT_IDS)
  return { element, ctx, tokens, rect, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

/** The box a filled shape covers: a rect's own, a circle's square, a path's or polygon's points. */
function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  if (el.tagName === "image") return [n("x"), n("y"), n("width"), n("height")]
  return null
}

/** The fill a text sits on: the last filled shape drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, circle, text"))) {
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
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "tone", "key", "emphasis", "basis", "evidence", "status", "fit", "align", "x_unit", "y_unit", "x_title", "date", "lane"].includes(key)) return
      // The separators a composition declares rather than prints: a label's colon, a sentence's full stop at a
      // line's end, the comma a note breaks its line at, a middle dot, an arrow.
      for (const part of value.replace(/\*\*/g, "").split(/\n|：|: |。|，| · | → /u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) {
    if (c.type === "chart") {
      // A chart's categories are printed where the chart names them, a scatter's and a line's positions are its
      // axis's, and a line of one series needs no name to tell it apart.
      const named = c.chart_type === "bar"
      const keyed = c.chart_type !== "line" || c.series.length > 1
      walk([c.title ?? "", ...(keyed ? c.series.map((s) => s.name) : []), ...c.series.flatMap((s) => s.data.flatMap((d) => [named ? String(d.x) : "", d.note ?? ""])), ...(c.markers ?? []).map((m) => m.label)])
      continue
    }
    if (c.type === "timeline") {
      // A round whose title only repeats its date is a dot on the axis, named by where it stands.
      walk([c.title ?? "", ...(c.lanes ?? []), ...(c.periods ?? []).map((p) => p.label), ...c.milestones.flatMap((m) => [m.title === m.date ? "" : m.title, m.desc ?? ""])])
      continue
    }
    if (c.type === "gantt") {
      walk([...c.items.flatMap((it) => [it.label, it.period ?? ""]), ...(c.milestones ?? []).map((m) => m.label), ...(c.axis_labels ?? [])])
      continue
    }
    walk(c)
  }
  return out
}

describe.each(["thesis", "brief", "rally"])("the thesis board's pages on %s", (theme) => {
  it.each(Object.keys(MANUSCRIPT_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = MANUSCRIPT_BOARD[name]!
    const { root, ctx, rect } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const ground = ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      if (fill === "none" || !textOf(text)) continue
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect, image, circle"))) {
      if (el.closest("[transform]")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(rect.x - 7)
      expect(x + w, name).toBeLessThanOrEqual(rect.x + rect.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(rect.y - 7)
      expect(y + h, name).toBeLessThanOrEqual(rect.y + rect.h + 1)
    }
    const drawn = texts(root!).map(textOf).join("").replace(/\s+/g, "")
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(word.replace(/\s+/g, ""))
    for (const label of page.exhibits) if (label) expect(drawn, `${name}: ${label}`).toContain(label.replace(/\s+/g, ""))
  })
})

describe("the thesis board's pages on thesis", () => {
  it.each(Object.keys(MANUSCRIPT_BOARD))("%s lights at most one thing", (name) => {
    const { root } = draw(name)
    const leads = new Set(Array.from(root!.querySelectorAll("[data-manuscript-lead]")).map((el) => el.getAttribute("data-manuscript-lead")))
    expect(leads.size, name).toBeLessThanOrEqual(1)
  })

  it("inquiry sets the question in the heading serif in emerald, its note's number lit, and each line's label bold", () => {
    const { root, ctx } = draw("p02-question")
    const inks = manuscriptInks(ctx)
    const question = root!.querySelector("[data-manuscript-question] text")!
    expect(question.getAttribute("font-family")).toBe(ctx.fonts.heading)
    expect(question.getAttribute("fill")).toBe(inks.deep)
    expect(byText(root!, "¹") ?? root!.querySelector("[data-manuscript-question] tspan")).toBeTruthy()
    expect(byText(root!, "图 1")?.getAttribute("font-weight") ?? textOf(root!.querySelector("[data-manuscript-caption]")!)).toContain("图 1")
  })

  it("ladder steps each group's age by birth month and ends it on a dot", () => {
    const { root, markup } = draw("p03-policy")
    const ladders = Array.from(root!.querySelectorAll("[data-manuscript-ladder]"))
    expect(ladders).toHaveLength(3)
    for (const ladder of ladders) {
      const points = ladder.querySelector("polyline")!.getAttribute("points")!.trim().split(/\s+/)
      expect(points.length).toBeGreaterThan(10)
      expect(ladder.querySelector("circle")).not.toBeNull()
    }
    expect(markup).toContain("图 2")
  })

  it("reach fills each bar to now, ticks where it stood, and names the three readings", () => {
    const { root } = draw("p04-dose")
    expect(root!.querySelectorAll("[data-manuscript-reach]")).toHaveLength(2)
    expect(root!.querySelectorAll("line[stroke-dasharray='3 3']")).toHaveLength(2)
  })

  it("thresholds draws a dashed gold line at each statutory age", () => {
    const { root, ctx } = draw("p06-cliff")
    const gold = manuscriptInks(ctx).gold.toUpperCase()
    const markers = Array.from(root!.querySelectorAll("[data-manuscript-threshold]"))
    expect(markers.length).toBe(3)
    for (const marker of markers) expect((marker.querySelector("line")?.getAttribute("stroke") ?? "").toUpperCase()).toBe(gold)
  })

  it("tabulation tints the marked column and heads the table with its number", () => {
    const { root, markup } = draw("p08-intl")
    expect(root!.querySelector("[data-manuscript-lead='column']")).not.toBeNull()
    expect(markup).toContain("表 1")
  })

  it("partition lays the parts end to end on the whole's scale", () => {
    const { root } = draw("p09-france")
    const parts = Array.from(root!.querySelectorAll("[data-manuscript-part] rect"))
    expect(parts).toHaveLength(5)
    expect(root!.querySelector("[data-manuscript-whole] rect")!.getAttribute("stroke-dasharray")).toBe("4 3")
  })

  it("coverage leaves an empty cell as a dashed frame, the gap the study fills in gold", () => {
    const { root, ctx } = draw("p11-gap")
    const inks = manuscriptInks(ctx)
    const gap = root!.querySelector("[data-manuscript-empty='gap'] rect")!
    expect(gap.getAttribute("stroke-dasharray")).toBe("6 4")
    expect(gap.getAttribute("stroke")).toBe(inks.gold)
    for (const blank of Array.from(root!.querySelectorAll("[data-manuscript-empty=''] rect"))) expect(blank.getAttribute("stroke")).toBe(inks.faint)
  })

  it("cadence draws a round still to come hollow and the period after the event in pale gold", () => {
    const { root, ctx } = draw("p13-data")
    expect(root!.querySelector("[data-manuscript-round][data-pending] circle")!.getAttribute("fill")).not.toBe(manuscriptInks(ctx).deep)
    expect(root!.querySelector("[data-manuscript-span] ")!.getAttribute("fill")).toBe(manuscriptInks(ctx).goldPale)
  })

  it("designs sketches a discontinuity and a difference in differences", () => {
    const { root } = draw("p14-design")
    expect(root!.querySelectorAll("[data-sketch]")).toHaveLength(2)
  })

  it("itinerary dashes the stretch not settled and marks the gate with a gold diamond", () => {
    const { root, ctx } = draw("p16-plan")
    expect(root!.querySelector("[data-manuscript-unsettled]")).not.toBeNull()
    expect(root!.querySelector("[data-manuscript-moment] path")!.getAttribute("fill")).toBe(manuscriptInks(ctx).gold)
  })
})

describe("the manuscript setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = MANUSCRIPT_BOARD["p04-dose"]!
    const [chart, callout] = page.components as [Extract<Component, { type: "chart" }>, Component]
    const long = { ...chart, series: chart.series.map((s) => ({ ...s, data: s.data.map((d, i) => (i === 0 ? { ...d, x: "一个远远放不进这一行的很长很长很长很长很长很长很长很长很长很长很长很长很长很长的组名" } : d)) })) }
    expect(draw("p04-dose", "thesis", [long, callout]).root).toBeNull()
  })

  it("draws only in the manuscript setting", () => {
    const page = MANUSCRIPT_BOARD["p09-france"]!
    const { ctx } = testCtx("thesis")
    expect(compose({ components: page.components, ctx, rect: manuscriptBodyRect(null), setting: "binder" }, MANUSCRIPT_IDS)).toBeNull()
  })
})
