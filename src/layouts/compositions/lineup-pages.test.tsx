// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { lineupInks, lineupTracking } from "./lineup"
import { lookNumber } from "./look"
import { lineupBandRect, lineupClaimIn, lineupSourceIn } from "../lineup-shared"
import { LINEUP_COMPOSITIONS } from "../content-lineup-sheet"
import { LINEUP_BOARD, LINEUP_BOARD_EN, LINEUP_BOARD_IMAGES, LINEUP_PARADE, LINEUP_PARADE_EN, type LineupBoardPage } from "./__fixtures__/lineup-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages runway's 2026-10 board drew (`design/rounds/2026-10-08-runway/`),
 * each set on runway as the lineup sheet sets it, its claim and source placed
 * by the composition, and then on two themes that share nothing with it:
 * luxe (warm black, gold, a serif heading) and crayon (white, bright crayon
 * colours, a sans heading). The setting reads the theme's tokens only, so
 * every page must draw on all three, inside the page, its text legible on
 * what it sits on, and every word the author wrote on the page. The English
 * deck's pages are drawn too.
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
const SQUARE = pngOf(1024, 1024)
const IMAGES = Object.fromEntries(LINEUP_BOARD_IMAGES.map((id) => [id, { src: SQUARE }]))

function draw(name: string, theme = "runway", board: Record<string, LineupBoardPage> = LINEUP_BOARD, components?: Component[], ids: readonly CompositionId[] = LINEUP_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true }, images: IMAGES }
  const rect = lineupBandRect()
  const slide = { heading: page.heading, footnote: page.footnote }
  const element = compose({ components: components ?? page.components, ctx, rect, setting: "lineup", claim: lineupClaimIn(slide, ctx), source: lineupSourceIn(slide, ctx) }, ids)
  return { element, ctx, tokens, rect, ...(element ? renderNode(element) : { root: null, markup: "" }) }
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
    if (!fill || fill === "none" || fill.startsWith("url(") || el.closest("[opacity]") || el.closest("clipPath") || el.getAttribute("fill-opacity")) continue
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

/** Whether a text sits over a photograph (the moodboard's captions over their fade). */
function overPhoto(text: Element): boolean {
  return text.closest("[data-lineup-tile]") !== null
}

/** The plain words a page's components carry, as a reader would look for them on the page. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "delta", "status", "emphasis"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) if (part.trim()) out.push(part.trim())
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

describe.each(["runway", "luxe", "crayon"])("the runway board's pages on %s", (theme) => {
  it.each(Object.keys(LINEUP_BOARD))("%s is drawn whole by its composition, inside the page, legible", (name) => {
    const page = LINEUP_BOARD[name]!
    const { root, ctx } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const ground = ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      if (fill === "none" || !textOf(text) || overPhoto(text)) continue
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      const need = text.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(need)
    }
    for (const el of Array.from(root!.querySelectorAll("rect, circle"))) {
      if (el.closest("defs") || el.closest("clipPath")) continue
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

describe("the runway board's pages in English", () => {
  it.each(Object.keys(LINEUP_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = LINEUP_BOARD_EN[name]!
    const { root } = draw(name, "runway", LINEUP_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
  })
})

describe("the runway board's pages on runway", () => {
  it("order numbers its parts as exits and sets the marked one in crimson", () => {
    const { root, ctx } = draw("p02-agenda")
    const numerals = Array.from(root!.querySelectorAll("[data-lineup-part] > text")).filter((t) => t.getAttribute("font-size") === "96")
    expect(numerals.map(textOf)).toEqual(["01", "02", "03", "04", "05"])
    expect(numerals[3]!.getAttribute("fill")).toBe(lineupInks(ctx).crimson)
    expect(numerals[0]!.getAttribute("fill")).not.toBe(lineupInks(ctx).crimson)
  })

  it("standfirst sets its claim at 52px on the two lines the author broke it into", () => {
    const { root } = draw("p03-why")
    const lines = Array.from(root!.querySelectorAll("[data-lineup-claim] text"))
    expect(lines).toHaveLength(2)
    expect(lines.every((l) => l.getAttribute("font-size") === "52")).toBe(true)
    expect(root!.querySelector("[data-lineup-lit]")!.textContent).toBe("再被用一次")
  })

  it("duet stands two figures apart, never to scale, the marked one in crimson", () => {
    const { root, ctx } = draw("p04-cost")
    expect(root!.querySelector("[data-lineup-divider]")).not.toBeNull()
    const figures = Array.from(root!.querySelectorAll("[data-lineup-figure] > text:first-child"))
    expect(figures.map((f) => f.getAttribute("fill"))).toEqual([lineupInks(ctx).crimson, lineupInks(ctx).ink])
  })

  it("lengths draws the lines to one scale and reaches from the shorter up to the longer", () => {
    const { root } = draw("p09-fiber")
    const bars = Array.from(root!.querySelectorAll("[data-lineup-length] > rect")).filter((r) => r.getAttribute("height") === "6")
    const w = bars.map((b) => Number(b.getAttribute("width")))
    expect(w[1]! / w[0]!).toBeCloseTo(18.9 / 28.3, 3)
    expect(root!.querySelector("[data-lineup-reach]")).not.toBeNull()
  })

  it("leaves two figures with no direction to duet, and two that moved to lengths", () => {
    const duet = LINEUP_BOARD["p04-cost"]!.components
    expect(modules(draw("p04-cost", "runway", LINEUP_BOARD, duet).root!)).toEqual(["duet"])
    const fibre = LINEUP_BOARD["p09-fiber"]!.components
    expect(modules(draw("p09-fiber", "runway", LINEUP_BOARD, fibre).root!)).toEqual(["lengths"])
  })

  it("collage numbers its six pictures in their own captions", () => {
    const { root } = draw("p06-mood")
    expect(Array.from(root!.querySelectorAll("[data-lineup-tile] text")).map(textOf)).toEqual(["1 口袋印", "2 膝盖磨白", "3 明线卷边", "4 毛边", "5 补丁", "6 靛蓝色阶"])
  })

  it("thread stands its pictures under the middle steps", () => {
    const { root } = draw("p08-unpick")
    const dots = Array.from(root!.querySelectorAll("[data-lineup-step] circle")).map((c) => Number(c.getAttribute("cx")))
    const photos = Array.from(root!.querySelectorAll("[data-lineup-process-photo] image")).map((i) => i.getAttribute("clip-path") ? 0 : Number(i.getAttribute("x")))
    expect(photos).toHaveLength(3)
    expect(photos[0]! - dots[1]!).toBeLessThan(0)
    expect(photos[0]!).toBeGreaterThan(dots[0]!)
  })

  it("look reads its number off the panel's title and asks the motif to start at the half page", () => {
    expect(lookNumber("LOOK **01**")).toEqual({ word: "LOOK", number: "01", lit: true })
    expect(lookNumber("LOOK 05–07")).toEqual({ word: "LOOK", number: "05–07", lit: false })
    expect(lookNumber("造型")).toBeNull()
    const { root, ctx } = draw("p13-look01")
    expect(root!.querySelector("[data-frame-left]")!.getAttribute("data-frame-left")).toBe("600")
    expect(root!.querySelector("[data-lineup-look-number] text")!.getAttribute("fill")).toBe(lineupInks(ctx).crimson)
    // The photograph is cropped to the part the author named.
    expect(root!.querySelector("[data-lineup-look-photo] clipPath")).not.toBeNull()
  })

  it("parade crops each look out of its group photograph and lights the first", () => {
    const { ctx } = testCtx("runway")
    const element = compose({ components: [LINEUP_PARADE], ctx: { ...ctx, images: IMAGES }, rect: { x: 64, y: 262, w: 1152, h: 392 }, setting: "lineup" }, ["parade"])!
    const { root } = renderNode(element)
    const looks = Array.from(root.querySelectorAll("[data-lineup-look]"))
    expect(looks).toHaveLength(7)
    expect(looks.filter((l) => l.querySelector("clipPath")).length).toBe(5)
    expect(looks[0]!.querySelector("text")!.getAttribute("fill")).toBe(lineupInks(ctx).crimson)
    expect(looks[1]!.querySelector("text")!.getAttribute("fill")).toBe(lineupInks(ctx).ink)
    const en = compose({ components: [LINEUP_PARADE_EN], ctx: { ...ctx, images: IMAGES }, rect: { x: 64, y: 262, w: 1152, h: 392 }, setting: "lineup" }, ["parade"])
    expect(en).not.toBeNull()
  })

  it("bounds ticks what was done in the ink and crosses what was not in crimson", () => {
    const { root, ctx } = draw("p17-limits")
    const icons = Array.from(root!.querySelectorAll("[data-lineup-icon]"))
    expect(icons.map((i) => i.getAttribute("data-lineup-icon"))).toEqual(["check", "check", "check", "x", "x", "x"])
    expect(root!.querySelector("[data-lineup-verdict] text")!.textContent).toBe("能说的是方法，不能说的是环境收益")
    expect(lineupInks(ctx).crimson).toBe(ctx.colors.accent)
  })
})

describe("the lineup setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = LINEUP_BOARD["p02-agenda"]!
    const cards = page.components[0] as Extract<Component, { type: "numbered_cards" }>
    const long = { ...cards, items: cards.items.map((it, i) => (i === 0 ? { ...it, title: "一个远远放不进这一栏的很长很长很长的部分名字" } : it)) }
    expect(draw("p02-agenda", "runway", LINEUP_BOARD, [long], ["order"]).root).toBeNull()
  })

  it("draws only in the lineup setting", () => {
    const page = LINEUP_BOARD["p02-agenda"]!
    const { ctx } = testCtx("runway")
    expect(compose({ components: page.components, ctx, rect: lineupBandRect(), setting: "invitation" }, LINEUP_COMPOSITIONS)).toBeNull()
  })

  it("tracks a lower-case Latin line a quarter as wide, and keeps capitals and Chinese at the board's tracking", () => {
    expect(lineupTracking("毕业设计 · 再穿一次", 4)).toBe(4)
    expect(lineupTracking("LOOK", 6)).toBe(6)
    expect(lineupTracking("Final Project · Wear It Again", 4)).toBe(1)
  })
})
