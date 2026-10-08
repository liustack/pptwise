// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { placardInks } from "./placard"
import { ledLine } from "./specimen"
import { logDomain } from "./decades"
import { yearOf } from "./dateline"
import { roomWidths } from "./floorplan"
import { placardBandRect, placardClaimIn, placardSourceIn } from "../placard-shared"
import { PLACARD_COMPOSITIONS } from "../content-placard-sheet"
import { PLACARD_BOARD, PLACARD_BOARD_EN, PLACARD_BOARD_IMAGES, type PlacardBoardPage } from "./__fixtures__/placard-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages museum's 2026-10 board drew (`design/rounds/2026-10-08-museum/`),
 * each set on museum as the placard sheet sets it, its claim and source
 * placed by the composition, and then on two themes that share nothing with
 * it: runway (show-white paper, black ink, a crimson) and crayon (white,
 * bright crayon colours, a sans heading). The setting reads the theme's
 * tokens only, so every page must draw on all three, inside the page, its
 * text legible on what it sits on, and every word the author wrote on the
 * page. The English deck's pages are drawn too.
 */

/** A PNG header that says `w` by `h`, so a crop has a shape to work from. */
function pngOf(w: number, h: number): string {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, w)
  view.setUint32(20, h)
  return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`
}
const IMAGES = Object.fromEntries(PLACARD_BOARD_IMAGES.map((id) => [id, { src: pngOf(1024, 1024) }]))

function draw(name: string, theme = "museum", board: Record<string, PlacardBoardPage> = PLACARD_BOARD, components?: Component[], ids: readonly CompositionId[] = PLACARD_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true }, images: IMAGES }
  const slide = { heading: page.heading, footnote: page.footnote }
  const element = compose({ components: components ?? page.components, ctx, rect: placardBandRect(), setting: "placard", claim: placardClaimIn(slide, ctx), source: placardSourceIn(slide, ctx) }, ids)
  return { element, ctx, tokens, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  return null
}

/** The fill a text sits on: the last opaque shape drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, circle, text"))) {
    if (el === text) return ground
    if (el.tagName === "text") continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || fill.startsWith("url(") || el.closest("clipPath") || el.getAttribute("fill-opacity")) continue
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

/** The plain words a page's components carry, as a reader would look for them on the page. A line led by a short label and a colon is looked for as its two parts. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "delta", "status", "emphasis"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) {
        const led = ledLine(part)
        for (const piece of led ? [led.label, led.line] : [part]) if (piece.trim()) out.push(piece.trim())
      }
      return
    }
    if (typeof value === "number" || typeof value === "boolean") return
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) walk(c)
  return [...new Set(out.filter(Boolean))]
}

const squash = (s: string) => s.replace(/\s+/g, "")
const drawnText = (root: Element) => squash(texts(root).map((t) => textOf(t)).join(""))

describe.each(["museum", "runway", "crayon"])("the museum board's pages on %s", (theme) => {
  it.each(Object.keys(PLACARD_BOARD))("%s is drawn whole by its composition, inside the page, legible", (name) => {
    const page = PLACARD_BOARD[name]!
    const { root, ctx } = draw(name, theme)
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
      const need = text.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(need)
    }
    for (const el of Array.from(root!.querySelectorAll("rect, circle"))) {
      // A pool of light may spill past the page's edge, as a lamp's would.
      if (el.closest("defs") || el.closest("clipPath") || el.closest("[data-placard-glow]")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(-1)
      expect(x + w, name).toBeLessThanOrEqual(1281)
      expect(y, name).toBeGreaterThanOrEqual(-1)
      expect(y + h, name).toBeLessThanOrEqual(721)
    }
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the museum board's pages in English", () => {
  it.each(Object.keys(PLACARD_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = PLACARD_BOARD_EN[name]!
    const { root } = draw(name, "museum", PLACARD_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
  })
})

describe("the museum board's pages on museum", () => {
  it("floorplan numbers the exhibits across the visit and walks a dotted copper line through them", () => {
    const { root } = draw("p02-guide")
    expect(Array.from(root!.querySelectorAll("[data-placard-exhibit]")).map((e) => e.getAttribute("data-placard-exhibit"))).toEqual(["1", "2", "3", "4", "5", "6", "7"])
    expect(root!.querySelectorAll("[data-placard-room]")).toHaveLength(4)
    expect(root!.querySelectorAll("[data-placard-door]")).toHaveLength(4)
    expect(root!.querySelector("[data-placard-walk]")!.getAttribute("d")!.startsWith("M 190 ")).toBe(true)
    expect(roomWidths([0, 3, 3, 1])).toEqual([252, 300, 300, 252])
  })

  it("jars sets the marked quantity in copper and each plate's side under it", () => {
    const { root, ctx } = draw("p03-missions")
    const jars = Array.from(root!.querySelectorAll("[data-placard-jar]"))
    expect(jars.map((j) => j.getAttribute("data-placard-jar"))).toEqual(["嫦娥五号", "嫦娥六号"])
    const figure = (j: Element) => Array.from(j.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "84")!
    expect(figure(jars[1]!).getAttribute("fill")).toBe(placardInks(ctx).copper)
    expect(figure(jars[0]!).getAttribute("fill")).toBe(placardInks(ctx).ink)
  })

  it("squares draws the areas to scale", () => {
    const { root } = draw("p04-apollo")
    const sides = Array.from(root!.querySelectorAll("[data-placard-square]")).map((r) => Number(r.getAttribute("width")))
    expect(sides[0]).toBeCloseTo(360, 6)
    expect((sides[1]! / sides[0]!) ** 2).toBeCloseTo(3666.3 / 382000, 5)
  })

  it("specimen cuts the exhibit round in its pool of light and sets its label", () => {
    const { root } = draw("p06-basalt")
    expect(root!.querySelector("[data-placard-specimen] clipPath circle")).not.toBeNull()
    expect(root!.querySelector("[data-placard-glow] radialGradient")).not.toBeNull()
    expect(root!.querySelector("[data-placard-number]")!.getAttribute("data-placard-number")).toBe("展品 1")
    expect(Array.from(root!.querySelectorAll("[data-placard-learn] text")).map(textOf)).toEqual(["它让我们知道", "月球的火山活动，", "比此前已知的又延续了约 8 至 9 亿年"])
  })

  it("decades sets the ranges on a log scale from a nice round end to a nice round end", () => {
    expect(logDomain([1116, 0, 28.5, 1], [2516, 1909, 170, 5])).toEqual([0.5, 5000])
    expect(logDomain([1, 1, 1], [200, 5, 1.5])).toEqual([0.5, 500])
    const { root } = draw("p07-water")
    expect(Array.from(root!.querySelectorAll("[data-placard-decade]")).map((t) => t.getAttribute("data-placard-decade"))).toEqual(["1", "10", "100", "1000"])
    expect(drawnText(root!)).toContain("含量，微克每克（对数刻度）")
    const tight = draw("p12-mantle").root!
    expect(tight.querySelector("[data-placard-band]")).not.toBeNull()
  })

  it("dateline lays the events at their true distance in time and lights the marked ones", () => {
    expect(yearOf("2020-12")).toBeCloseTo(2020 + 11 / 12, 6)
    expect(yearOf("2021")).toBe(2021)
    expect(yearOf("Dec 2020")).toBeNull()
    const { root } = draw("p14-timeline")
    expect(Array.from(root!.querySelectorAll("[data-placard-year]")).map((y) => y.getAttribute("data-placard-year"))).toEqual(["2021", "2022", "2023", "2024", "2025", "2026"])
  })

  it("slice cuts the marked part to scale and edges its card in copper", () => {
    const { root } = draw("p15-where")
    const part = root!.querySelector("[data-placard-part]")!
    expect(Number(part.getAttribute("width"))).toBeCloseTo((148.26 / 3666.3) * 1152, 3)
  })

  it("blanks numbers the open questions in the deck's language", () => {
    expect(Array.from(draw("p16-unknown").root!.querySelectorAll("[data-placard-blank]")).map((b) => textOf(b.querySelector("text")!))).toEqual(["问题 1", "问题 2", "问题 3", "问题 4", "问题 5"])
    expect(textOf(draw("p16-unknown", "museum", PLACARD_BOARD_EN).root!.querySelector("[data-placard-blank] text")!)).toBe("Question 1")
  })

  it("reads a line led by a short label and a colon as the label and the rest", () => {
    expect(ledLine("它让我们知道：月球的火山活动")).toEqual({ label: "它让我们知道", line: "月球的火山活动" })
    expect(ledLine("What it tells us: Lunar volcanism lasted longer")).toEqual({ label: "What it tells us", line: "Lunar volcanism lasted longer" })
    expect(ledLine("两次任务，两罐土")).toBeNull()
  })
})

describe("the placard setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = PLACARD_BOARD["p16-unknown"]!
    const cards = page.components[0] as Extract<Component, { type: "numbered_cards" }>
    const long = { ...cards, items: cards.items.map((it, i) => (i === 0 ? { ...it, title: "一个远远放不进这一张空展签的很长很长很长很长很长很长很长的问题，再加上一句同样很长很长很长很长的补充说明" } : it)) }
    expect(draw("p16-unknown", "museum", PLACARD_BOARD, [long], ["blanks"]).root).toBeNull()
  })

  it("leaves numbered cards without one shared verdict to the ordinary renderer", () => {
    const page = PLACARD_BOARD["p16-unknown"]!
    const cards = page.components[0] as Extract<Component, { type: "numbered_cards" }>
    const mixed = { ...cards, items: cards.items.map((it, i) => (i === 0 ? { ...it, sub: "已有答案" } : it)) }
    expect(draw("p16-unknown", "museum", PLACARD_BOARD, [mixed], ["blanks"]).root).toBeNull()
  })

  it("draws only in the placard setting", () => {
    const page = PLACARD_BOARD["p02-guide"]!
    const { ctx } = testCtx("museum")
    expect(compose({ components: page.components, ctx, rect: placardBandRect(), setting: "lineup" }, PLACARD_COMPOSITIONS)).toBeNull()
  })
})
