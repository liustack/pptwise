// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { periodicalInks } from "./periodical"
import { claimIn, periodicalBandRect } from "../periodical-shared"
import { PERIODICAL_COMPOSITIONS } from "../content-periodical-sheet"
import { PERIODICAL_BOARD, PERIODICAL_BOARD_IMAGES } from "./__fixtures__/periodical-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages journal's 2026-10 board drew (`design/rounds/2026-10-07-journal/`),
 * each set on journal as the periodical sheet sets it, its claim placed by
 * the composition, and then on two themes that share nothing with it: brief
 * (a cream page, navy and a sans body) and rally (a dark page whose accent is
 * a magenta). The setting reads the theme's tokens only, so every page must
 * draw on all three, inside its band, its text legible on what it sits on,
 * and every word the author wrote on the page.
 */

const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(PERIODICAL_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))

function draw(name: string, theme = "journal", components?: Component[], ids: readonly CompositionId[] = PERIODICAL_COMPOSITIONS) {
  const page = PERIODICAL_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const used = components ?? page.components
  // The numbers the sheet counts across the deck, handed to the blocks that take them.
  const labels = new Map<Component, string>(used.flatMap((c, i) => (page.exhibits[i] ? [[c, page.exhibits[i]!] as const] : [])))
  const ctx: ComponentCtx = { ...base, figures: { chinese: true, groupFour: false }, images: IMAGES, exhibitLabels: labels }
  const rect = periodicalBandRect()
  const element = compose({ components: used, ctx, rect, setting: "periodical", claim: claimIn(page.heading, ctx) }, ids)
  return { element, ctx, tokens, rect, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

/** The box a filled shape covers: a rect's own, a circle's square, an image's own. */
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
    if (el.tagName === "text") continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]") || el.getAttribute("fill-opacity") || el.closest("[transform]")) continue
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
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "x_unit", "y_unit"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (typeof value === "number") return
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) {
    if (c.type === "chart") {
      // One series needs no name to tell it apart, as the ordinary chart prints none: its caption says what it counts.
      const keyed = c.series.length > 1
      walk([c.title ?? "", c.tag?.text ?? "", ...(keyed ? c.series.map((s) => s.name) : []), ...c.series.flatMap((s) => s.data.flatMap((d) => [String(d.x), d.note ?? ""])), ...(c.gaps ?? []).flatMap((g) => [g.x, g.label]), ...(c.bands ?? []).map((b) => b.label ?? "")])
      continue
    }
    walk(c)
  }
  return out
}

describe.each(["journal", "brief", "rally"])("the journal board's pages on %s", (theme) => {
  it.each(Object.keys(PERIODICAL_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = PERIODICAL_BOARD[name]!
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
    expect(drawn, `${name}: the claim`).toContain(page.heading.replace(/\s+/g, ""))
    for (const label of page.exhibits) if (label) expect(drawn, `${name}: ${label}`).toContain(label.replace(/\s+/g, ""))
  })
})

describe("the journal board's pages on journal", () => {
  it.each(Object.keys(PERIODICAL_BOARD))("%s lights one thing, or one figure and the bar it ends", (name) => {
    // The book trade page leads with the year's bar and the year's discount beside it, the same 2025.
    const { root } = draw(name)
    const leads = new Set(Array.from(root!.querySelectorAll("[data-periodical-lead]")).map((el) => el.getAttribute("data-periodical-lead")))
    expect(leads.size, name).toBeLessThanOrEqual(name === "p11-market" ? 2 : 1)
  })

  it("foreword drops the note's first character three lines deep in the accent, the marked figure in the accent", () => {
    const { root, ctx } = draw("p02-note")
    const inks = periodicalInks(ctx)
    const cap = root!.querySelector("[data-periodical-dropcap] text")!
    expect(cap.textContent).toBe("今")
    expect(cap.getAttribute("font-size")).toBe("112")
    expect(cap.getAttribute("fill")).toBe(inks.brick)
    const lines = Array.from(root!.querySelectorAll("[data-periodical-dropcap] text")).slice(1)
    // The three lines beside the cap start past it, the fourth at the measure's edge.
    expect(Number(lines[0]!.getAttribute("x"))).toBeGreaterThan(Number(cap.getAttribute("x")) + 100)
    expect(lines[3]!.getAttribute("x")).toBe(cap.getAttribute("x"))
    expect(root!.querySelector("[data-periodical-lead='figure']")!.getAttribute("data-periodical-figure")).toBe("16.6%")
  })

  it("chronicle rings the noted dip in the accent and names each line at its end", () => {
    const { root, ctx } = draw("p03-books")
    expect(root!.querySelector("[data-periodical-note] circle")!.getAttribute("stroke")).toBe(periodicalInks(ctx).brick)
    const ends = texts(root!).map(textOf)
    expect(ends).toContain("纸书 4.81 本")
    expect(ends).toContain("电子书 3.58 本")
    expect(root!.querySelector("[data-periodical-caption]")!.textContent).toContain("图 1")
  })

  it("elapsed cuts each bar where it stood in the earlier year and sets the claim beside the photograph", () => {
    const { root } = draw("p05-time")
    const ticks = Array.from(root!.querySelectorAll("[data-periodical-earlier]"))
    expect(ticks.map((t) => t.getAttribute("data-periodical-earlier"))).toEqual(["80.43", "20.38"])
    const claim = root!.querySelector("[data-periodical-claim] text")!
    expect(Number(claim.getAttribute("x"))).toBeGreaterThan(500)
  })

  it("witness and longform set the pull quote's mark in the heading's own family, Chinese deck or not", () => {
    for (const name of ["p07-magazine", "p16-essay"]) {
      const { root, ctx } = draw(name)
      const mark = Array.from(root!.querySelectorAll("[data-periodical-pull-quote] text")).find((t) => t.textContent === "“")!
      expect(mark.getAttribute("font-family"), name).toBe(ctx.fonts.heading)
    }
  })

  it("headline sets the figure huge with its unit attached and breaks the trend where a year was left blank", () => {
    const { root, ctx } = draw("p06-periodicals")
    const figure = root!.querySelector("[data-periodical-lead='figure'] text")!
    expect(figure.getAttribute("font-size")).toBe("200")
    expect(figure.getAttribute("fill")).toBe(periodicalInks(ctx).brick)
    expect(root!.querySelector("[data-periodical-gap]")!.textContent).toBe("留空")
    // Each line's lone first year is a dot, the rest a polyline.
    expect(root!.querySelectorAll("[data-periodical-series] circle")).toHaveLength(2)
    // 45.7 sits just under the 50% hairline, so the hairline stops short of it.
    const value = Array.from(root!.querySelectorAll("text")).find((t) => t.textContent === "45.7")!
    const [x, y] = [Number(value.getAttribute("x")), Number(value.getAttribute("y"))]
    const near = Array.from(root!.querySelectorAll("rect[height='1']")).filter((r) => {
      const [rx, ry, rw] = [Number(r.getAttribute("x")), Number(r.getAttribute("y")), Number(r.getAttribute("width"))]
      return rx < x + 24 && rx + rw > x && ry > y - 12 - 4 && ry < y + 3 + 4
    })
    expect(near).toEqual([])
  })

  it("census and contrast keep a dashed place for the years nobody published", () => {
    const census = draw("p09-heavy").root!
    expect(Array.from(census.querySelectorAll("[data-periodical-gap]")).map((g) => g.getAttribute("data-periodical-gap"))).toEqual(["2018", "2022"])
    for (const gap of Array.from(census.querySelectorAll("[data-periodical-gap] rect"))) expect(gap.getAttribute("stroke-dasharray")).toBe("4 3")
    const contrast = draw("p10-gap").root!
    expect(contrast.querySelector("[data-periodical-gap]")!.getAttribute("data-periodical-gap")).toBe("2023 年起")
  })

  it("bracket states the change between the first and last bar over the run", () => {
    const { root } = draw("p11-market")
    expect(root!.querySelector("[data-periodical-bracket]")!.getAttribute("data-periodical-bracket")).toBe("−14%")
    expect(root!.querySelector("[data-periodical-chart-tag]")!.textContent!.replace(/\s/g, "")).toBe("企业口径·2025年回溯后的新口径")
  })

  it("mix prints every share in its column and every part in the share bar", () => {
    const { root } = draw("p12-channels")
    const drawn = texts(root!).map(textOf)
    for (const v of ["45.1", "11.9", "40.5", "28.79", "35.90"]) expect(drawn).toContain(v)
  })

  it("twins sets two runs on their own scales under one caption for both", () => {
    const { root } = draw("p13-library")
    expect(root!.querySelectorAll("[data-periodical-pane]")).toHaveLength(2)
    expect(root!.querySelector("[data-periodical-caption]")!.getAttribute("data-periodical-caption")).toBe("图 8、图 9")
  })

  it("effects sets the two studies on one scale of g, signed, with the zero line cut clear of their values", () => {
    const { root } = draw("p15-screen")
    expect(root!.querySelectorAll("[data-periodical-effect]")).toHaveLength(8)
    const values = Array.from(root!.querySelectorAll("[data-periodical-effect] text")).map(textOf)
    expect(values).toContain("+0.01")
    expect(values).toContain("−0.21")
    expect(values.some((t) => t.includes("%"))).toBe(false)
    expect(root!.querySelectorAll("[data-periodical-zero] rect").length).toBeGreaterThan(1)
  })

  it("pledges numbers the plans in the deck's numerals", () => {
    const { root } = draw("p17-plans")
    const drawn = texts(root!).map(textOf)
    for (const n of ["一", "二", "三", "四"]) expect(drawn).toContain(n)
  })
})

describe("the periodical setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = PERIODICAL_BOARD["p04-ways"]!
    const [chart, ...rest] = page.components as [Extract<Component, { type: "chart" }>, ...Component[]]
    const long = { ...chart, series: chart.series.map((s) => ({ ...s, data: s.data.map((d, i) => (i === 0 ? { ...d, x: "一个远远放不进这一栏的很长很长很长的读法名字" } : d)) })) }
    expect(draw("p04-ways", "journal", [long, ...rest], ["measures"]).root).toBeNull()
  })

  it("declines a claim that does not fit beside the photograph", () => {
    const page = PERIODICAL_BOARD["p07-magazine"]!
    const { ctx } = testCtx("journal")
    const rect = periodicalBandRect()
    const long = "报刊的线都在往下走，我们也在其中，而且这一句标题长到放不进照片旁边那一栏的两行里面去了，再长一点，再长一点，再长一点，再长一点，再长一点"
    expect(compose({ components: page.components, ctx: { ...ctx, images: IMAGES }, rect, setting: "periodical", claim: claimIn(long, ctx) }, ["witness"])).toBeNull()
  })

  it("draws only in the periodical setting", () => {
    const page = PERIODICAL_BOARD["p16-essay"]!
    const { ctx } = testCtx("journal")
    expect(compose({ components: page.components, ctx, rect: periodicalBandRect(), setting: "manuscript" }, PERIODICAL_COMPOSITIONS)).toBeNull()
  })
})
