// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { keynoteCeiling, keynoteDecimals, keynoteInks, keynoteNumber } from "./keynote"
import { climbEnds } from "./giant"
import { fallStart } from "./contour"
import { spread } from "./tilt"
import { litDots, shareOf } from "./crowd"
import { doorPath } from "./arches"
import { keynoteBandRect, keynoteClaimIn, keynoteKickerIn, keynoteSourceIn } from "../keynote-shared"
import { KEYNOTE_COMPOSITIONS } from "../content-keynote-sheet"
import { KEYNOTE_BOARD, KEYNOTE_BOARD_EN, KEYNOTE_BOARD_IMAGES, type KeynoteBoardPage } from "./__fixtures__/keynote-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages stage's 2026-10 board drew (`design/rounds/2026-10-08-stage/`),
 * each set on stage as the keynote sheet sets it, its chapter, claim and
 * source placed by the composition, and then on two themes that share
 * nothing with it: runway (show-white paper, black ink, a crimson) and crayon
 * (white, bright crayon colours, a sans heading). The setting reads the
 * theme's tokens only, so every page must draw on all three, inside the
 * page, its text legible on what it sits on, and every word the author wrote
 * on the page. The English deck's pages are drawn too.
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
const IMAGES = Object.fromEntries(KEYNOTE_BOARD_IMAGES.map((id) => [id, { src: pngOf(1536, 1024) }]))

function draw(name: string, theme = "stage", board: Record<string, KeynoteBoardPage> = KEYNOTE_BOARD, components?: Component[], ids: readonly CompositionId[] = KEYNOTE_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true }, images: IMAGES }
  const slide = { heading: page.heading, footnote: page.footnote, kicker: page.kicker }
  const element = compose({ components: components ?? page.components, ctx, rect: keynoteBandRect(), setting: "keynote", claim: keynoteClaimIn(slide, ctx), source: keynoteSourceIn(slide, ctx), kicker: keynoteKickerIn(slide, ctx) }, ids)
  return { element, ctx, tokens, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  return null
}

/** The fill a text sits on: the last opaque shape drawn before it under its first line, a door it stands in, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  const door = text.closest("[data-keynote-door]")?.querySelector("path")?.getAttribute("fill")
  let ground = door ?? page
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

/** The plain words a page's components carry, as a reader would look for them on the page. A label written as two ends with an arrow is looked for as its two ends. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "delta", "status", "emphasis"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) {
        const ends = climbEnds(part)
        for (const piece of ends ? [ends.from, ends.to] : [part]) if (piece.trim()) out.push(piece.trim())
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

describe.each(["stage", "runway", "crayon"])("the stage board's pages on %s", (theme) => {
  it.each(Object.keys(KEYNOTE_BOARD))("%s is drawn whole by its composition, inside the page, legible", (name) => {
    const page = KEYNOTE_BOARD[name]!
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
      // A follow spot may spill past the page's edge, as a light's would.
      if (el.closest("defs") || el.closest("clipPath") || el.closest("[data-keynote-spot]")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(-1)
      expect(x + w, name).toBeLessThanOrEqual(1281)
      expect(y, name).toBeGreaterThanOrEqual(-1)
      expect(y + h, name).toBeLessThanOrEqual(721)
    }
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
    if (page.kicker) expect(drawn, `${name}: the chapter`).toContain(squash(page.kicker))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the stage board's pages in English", () => {
  it.each(Object.keys(KEYNOTE_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = KEYNOTE_BOARD_EN[name]!
    const { root } = draw(name, "stage", KEYNOTE_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the stage board's pages on stage", () => {
  it("hush sets the sentence on two lines with its marked word in silver, in a follow spot", () => {
    const { root, ctx } = draw("p02-peak")
    const lines = Array.from(root!.querySelectorAll("[data-keynote-claim] text"))
    expect(lines.map(textOf)).toEqual(["国内收入还在涨，", "到顶的是人数"])
    expect(lines.every((t) => t.getAttribute("font-size") === "72" && t.getAttribute("text-anchor") === "middle")).toBe(true)
    expect(root!.querySelector("[data-keynote-claim] tspan")!.getAttribute("fill")).toBe(keynoteInks(ctx).silver)
    expect(root!.querySelector("[data-keynote-spot] radialGradient")).not.toBeNull()
    // A statement page names no chapter.
    expect(root!.querySelector("[data-keynote-kicker]")).toBeNull()
  })

  it("giant sets the claim, the figure and the two ends of the climb at once", () => {
    expect(climbEnds("2018 年　6.26 亿 → 2025 年　6.83 亿")).toEqual({ from: "2018 年　6.26 亿", to: "2025 年　6.83 亿" })
    expect(climbEnds("开发商口径")).toBeNull()
    const { root, ctx } = draw("p03-users")
    const figure = root!.querySelector("[data-keynote-figure]")!
    expect([figure.getAttribute("font-size"), figure.getAttribute("font-weight")]).toEqual(["220", "700"])
    expect(textOf(figure)).toBe("5,700 万")
    expect(root!.querySelectorAll("[data-keynote-climb] circle")).toHaveLength(2)
    const caveat = draw("p10-wukong").root!.querySelector("[data-keynote-caveat]")!
    expect(caveat.getAttribute("data-keynote-caveat")).toBe("开发商口径")
    expect(caveat.querySelector("text")!.getAttribute("fill")).toBe(keynoteInks(ctx).silver)
  })

  it("contour bands the run of falls that ends on the noted point and labels only the ends", () => {
    expect(fallStart([53.1, 72.3, 180.13, 173.46, 163.66, 185.57], 4)).toBe(2)
    expect(fallStart([1, 2, 3], 2)).toBe(2)
    expect(keynoteCeiling(204.55, 0.07, 5)).toBe(220)
    const { root } = draw("p05-trend")
    const band = root!.querySelector("[data-keynote-fall]")!
    // From 2021 to 2023 of eleven years across x120 to x1100.
    expect(Number(band.getAttribute("x"))).toBeCloseTo(120 + 6 * 98, 6)
    expect(Number(band.getAttribute("width"))).toBeCloseTo(2 * 98, 6)
    expect(Array.from(root!.querySelectorAll("[data-keynote-end]")).map((e) => e.getAttribute("data-keynote-end"))).toEqual(["first", "last"])
    expect(drawnText(root!)).toContain("单位：亿美元，自研游戏海外实际销售收入")
    expect(drawnText(root!)).toContain(squash("3.85 倍　年均约 14.4%"))
  })

  it("faceoff sets the marked figure and its name in silver, the other in paper white", () => {
    const { root, ctx } = draw("p06-faster")
    const sides = Array.from(root!.querySelectorAll("[data-keynote-side]"))
    expect(sides.map((s) => s.getAttribute("data-keynote-side"))).toEqual(["出海", "国内"])
    expect(sides[0]!.hasAttribute("data-keynote-lit")).toBe(true)
    expect(sides[1]!.hasAttribute("data-keynote-lit")).toBe(false)
    const figure = (s: Element) => Array.from(s.querySelectorAll("text")).find((t) => t.getAttribute("font-weight") === "700" && Number(t.getAttribute("font-size")) >= 120)!
    expect(figure(sides[0]!).getAttribute("fill")).toBe(keynoteInks(ctx).silver)
    expect(figure(sides[1]!).getAttribute("fill")).toBe(keynoteInks(ctx).ink)
  })

  it("tilt draws the marked row in silver, the rows that moved thick and the rows that held thin, labels apart", () => {
    expect(spread([100, 110, 300], 28)).toEqual([91, 119, 300])
    expect(spread([100, 200], 28)).toEqual([100, 200])
    const { root } = draw("p07-map")
    const kinds = Object.fromEntries(Array.from(root!.querySelectorAll("[data-keynote-row]")).map((r) => [r.getAttribute("data-keynote-row"), r.getAttribute("data-keynote-kind")]))
    expect(kinds).toEqual({ 美国: "held", 日本: "moved", 德英法合计: "lit", 韩国: "held" })
  })

  it("podiums sets both boards on one scale and keeps the decimals of the column", () => {
    expect(keynoteDecimals([19.45, 18.29, 15.1])).toBe(2)
    expect(keynoteNumber(15.1, 2)).toBe("15.10")
    const { root } = draw("p08-genre")
    const bars = Array.from(root!.querySelectorAll("[data-keynote-bar]")).map((b) => Number(b.getAttribute("width")))
    expect(bars[0]).toBeCloseTo((49.96 / 50) * 400, 6)
    expect(bars[3]).toBeCloseTo((19.45 / 50) * 400, 6)
    expect(drawnText(root!)).toContain("15.10%")
    expect(root!.querySelectorAll("[data-keynote-lit]")).toHaveLength(1)
  })

  it("gulf draws the smallest quantity to scale, however thin", () => {
    const { root } = draw("p11-peaks")
    const widths = Array.from(root!.querySelectorAll("[data-keynote-bar]")).map((b) => Number(b.getAttribute("width")))
    expect(widths[0]).toBe(880)
    expect(widths[1]).toBeCloseTo((131518 / 2415714) * 880, 6)
    expect(widths[2]).toBe(1.5)
    expect(drawnText(root!)).toContain("2,415,714")
  })

  it("crowd lights the share the label states exactly, one dot a hundredth", () => {
    expect(shareOf("约 ¼")).toBe(0.25)
    expect(shareOf("1 in 4")).toBe(0.25)
    expect(litDots("约 ¼", "去掉每年 2 月的冲高，平均 24.2%")).toBe(24)
    expect(litDots("约 ¼", "统计的是客户端语言")).toBe(25)
    // A percentage alone may be a rate of growth, not a share: a plain figure takes it.
    expect(litDots("30.22%", "出海")).toBeNull()
    const { root } = draw("p12-steam")
    expect(root!.querySelectorAll("[data-keynote-dots] circle")).toHaveLength(100)
    expect(root!.querySelectorAll('[data-keynote-dot="lit"]')).toHaveLength(24)
  })

  it("tower stacks the figures beside the photograph and moves the chapter and the claim into the column", () => {
    const { root } = draw("p13-small")
    expect(root!.querySelector("[data-keynote-tower-photo] image")).not.toBeNull()
    expect(Array.from(root!.querySelectorAll("[data-keynote-figure-row]")).map((r) => r.getAttribute("data-keynote-figure-row"))).toEqual(["300 万份+", "301,322", "5 人团队"])
    expect(root!.querySelector("[data-keynote-kicker] text")!.getAttribute("x")).toBe("700")
    expect(Array.from(root!.querySelectorAll("[data-keynote-claim] text")).map(textOf)).toEqual(["小团队，", "也有自己的路"])
  })

  it("toll stands the bars to scale and sets the quote behind a silver rule", () => {
    const { root } = draw("p15-cost")
    const bars = Array.from(root!.querySelectorAll("[data-keynote-bar] rect")).map((b) => Number(b.getAttribute("height")))
    expect(bars[0]).toBeCloseTo((48.6 / 50) * 340, 6)
    expect(bars[1]).toBeCloseTo((4.3 / 50) * 340, 6)
    expect(drawnText(root!)).toContain(squash("年报原话：销售费用下降，「主要系报告期内互联网流量费用减少」"))
  })

  it("arches stands each gate in a round-headed door with its symbol", () => {
    expect(doorPath(64, 368)).toBe("M 64 560 L 64 240 Q 64 170 248 170 Q 432 170 432 240 L 432 560")
    const { root } = draw("p16-limits")
    expect(Array.from(root!.querySelectorAll("[data-keynote-door]")).map((d) => d.getAttribute("data-keynote-door"))).toEqual(["版号", "合规", "本地化"])
    expect(Array.from(root!.querySelectorAll("[data-keynote-icon]")).map((d) => d.getAttribute("data-keynote-icon"))).toEqual(["ticket", "shield-check", "languages"])
  })

  it("slate numbers the bets in silver, and only the marked one when the author marks one", () => {
    expect(draw("p17-bets").root!.querySelectorAll("[data-keynote-lit]")).toHaveLength(5)
    const page = KEYNOTE_BOARD["p17-bets"]!
    const cards = page.components[0] as Extract<Component, { type: "numbered_cards" }>
    const marked = { ...cards, items: cards.items.map((it, i) => (i === 2 ? { ...it, emphasis: true } : it)) }
    const lit = Array.from(draw("p17-bets", "stage", KEYNOTE_BOARD, [marked]).root!.querySelectorAll("[data-keynote-lit]"))
    expect(lit.map((r) => r.getAttribute("data-keynote-bet"))).toEqual(["押新玩法，别只靠策略类的惯性"])
  })
})

describe("the keynote setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = KEYNOTE_BOARD["p17-bets"]!
    const cards = page.components[0] as Extract<Component, { type: "numbered_cards" }>
    const long = { ...cards, items: cards.items.map((it, i) => (i === 0 ? { ...it, title: "押留存，不押拉新，这一条要说得非常非常长，长到一行再也放不下它和它的理由" } : it)) }
    expect(draw("p17-bets", "stage", KEYNOTE_BOARD, [long], ["slate"]).root).toBeNull()
  })

  it("leaves a percentage to a plain figure rather than a field of dots", () => {
    const page = KEYNOTE_BOARD["p12-steam"]!
    const kpi = page.components[0] as Extract<Component, { type: "kpi_cards" }>
    const rate = { ...kpi, items: [{ ...kpi.items[0]!, value: "24.2%" }] }
    expect(modules(draw("p12-steam", "stage", KEYNOTE_BOARD, [rate]).root!)).toEqual(["giant"])
  })

  it("draws only in the keynote setting", () => {
    const page = KEYNOTE_BOARD["p02-peak"]!
    const { ctx } = testCtx("stage")
    expect(compose({ components: page.components, ctx, rect: keynoteBandRect(), setting: "placard", claim: keynoteClaimIn(page, ctx) }, KEYNOTE_COMPOSITIONS)).toBeNull()
  })
})
