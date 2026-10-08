// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { chalkboardInks, chalkboardLedge, chalkNumber, skipPath } from "./chalkboard"
import { formulaParts, termNote } from "./braces"
import { isFactor } from "./factors"
import { percentOf } from "./risers"
import { workedLine } from "./derivation"
import { asks } from "./exercises"
import { dayOf } from "./chronology"
import { chalkboardBandRect, chalkClaimIn, chalkSourceIn } from "../chalkboard-shared"
import { CHALKBOARD_COMPOSITIONS } from "../content-chalkboard-sheet"
import { CHALKBOARD_BOARD, CHALKBOARD_BOARD_EN, CHALKBOARD_BOARD_IMAGES, type ChalkboardBoardPage } from "./__fixtures__/chalkboard-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages lecture's 2026-10 board drew (`design/rounds/2026-10-08-lecture/`),
 * each set on lecture as the chalkboard sheet sets it, its title, source and
 * stamp placed by the composition, and then on two themes that share nothing
 * with it: stage (a cold black with a matte silver) and crayon (white paper,
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
const IMAGES = Object.fromEntries(CHALKBOARD_BOARD_IMAGES.map((id) => [id, { src: pngOf(1536, 1024) }]))

function draw(name: string, theme = "lecture", board: Record<string, ChalkboardBoardPage> = CHALKBOARD_BOARD, components?: Component[], ids: readonly CompositionId[] = CHALKBOARD_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true }, images: IMAGES }
  const slide = { heading: page.heading, footnote: page.footnote }
  const element = compose({ components: components ?? page.components, ctx, rect: chalkboardBandRect(), setting: "chalkboard", claim: chalkClaimIn(slide, ctx), source: chalkSourceIn(slide, ctx), stamp: page.stamp }, ids)
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

/**
 * The plain words a page's components carry, as a reader would look for them
 * on the page. A note written `term：note` under a formula is looked for as
 * its term and its note, which the page draws apart.
 */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "fit", "delta", "status", "emphasis", "style", "tone"].includes(key)) return
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

function expectWords(name: string, page: ChalkboardBoardPage, root: Element) {
  const drawn = drawnText(root)
  for (const word of authoredWords(page.components)) {
    const note = termNote(word)
    if (drawn.includes(squash(word))) continue
    expect(note && drawn.includes(squash(note.term)) && drawn.includes(squash(note.note)), `${name}: ${word}`).toBe(true)
  }
  for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the title`).toContain(squash(line))
  if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  if (page.stamp) expect(drawn, `${name}: the stamp`).toContain(squash(page.stamp.text))
}

describe.each(["lecture", "stage", "crayon"])("the lecture board's pages on %s", (theme) => {
  it.each(Object.keys(CHALKBOARD_BOARD))("%s is drawn whole by its composition, inside the page, legible", (name) => {
    const page = CHALKBOARD_BOARD[name]!
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
      if (el.closest("defs") || el.closest("clipPath")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(-1)
      expect(x + w, name).toBeLessThanOrEqual(1281)
      expect(y, name).toBeGreaterThanOrEqual(-1)
      expect(y + h, name).toBeLessThanOrEqual(721)
    }
    expectWords(name, page, root!)
  })
})

describe("the lecture board's pages in English", () => {
  it.each(Object.keys(CHALKBOARD_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = CHALKBOARD_BOARD_EN[name]!
    const { root } = draw(name, "lecture", CHALKBOARD_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    expectWords(name, page, root!)
  })
})

describe("the lecture board's pages on lecture", () => {
  it("chalk skips: a stroke is drawn as separate runs along its length", () => {
    const d = skipPath([{ x: 0, y: 0 }, { x: 100, y: 0 }], [40, 10])
    expect(d).toBe("M 0 0 L 40 0 M 50 0 L 90 0")
    expect(skipPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }], [25, 5], true)).toBe("M 0 0 L 10 0 L 10 10 L 5 10 M 0 10 L 0 0")
  })

  it("agenda boxes the parts in chalk and gives the marked one its numeral in yellow and a stroke under its name", () => {
    const { root, ctx } = draw("p02-goals")
    const parts = Array.from(root!.querySelectorAll("[data-chalk-part]"))
    expect(parts.map((p) => p.getAttribute("data-chalk-part"))).toEqual(["看懂", "算对", "去办"])
    expect(parts.map((p) => p.hasAttribute("data-chalk-lit"))).toEqual([false, true, false])
    expect(textOf(parts[1]!.querySelector("text")!)).toBe("二")
    expect(parts[1]!.querySelector("text")!.getAttribute("fill")).toBe(chalkboardInks(ctx).yellow)
    expect(parts[1]!.querySelector("[data-chalk-under]")).not.toBeNull()
    expect(root!.querySelectorAll("[data-chalk-box]")).toHaveLength(3)
    expect(textOf(draw("p02-goals", "lecture", CHALKBOARD_BOARD_EN).root!.querySelectorAll("[data-chalk-part] text")[0]!)).toBe("1")
  })

  it("confluence brings the two paths into the yellow box of the result", () => {
    const { root } = draw("p03-why")
    expect(Array.from(root!.querySelectorAll("[data-chalk-path]")).map((p) => p.getAttribute("data-chalk-path"))).toEqual(["工资", "劳务、稿酬"])
    expect(root!.querySelector("[data-chalk-result]")!.getAttribute("data-chalk-result")).toBe("年度汇算")
    expect(Array.from(root!.querySelectorAll("[data-chalk-result] text")).map(textOf)).toEqual(["年度汇算", "四项合起来", "按全年重算", "多退少补"])
  })

  it("braces reads the formula's terms and puts each note under its own term", () => {
    expect(formulaParts("应纳税额 ＝ 应纳税所得额 × 税率 − **速算扣除数**")!.map((p) => p.text)).toEqual(["应纳税额", "＝", "应纳税所得额", "×", "税率", "−", "**速算扣除数**"])
    expect(formulaParts("没有等号 × 的式子")).toBeNull()
    expect(termNote("税率：查税率表\n第 9 页")).toEqual({ term: "税率", note: "查税率表\n第 9 页" })
    expect(termNote("rate: From the table")).toEqual({ term: "rate", note: "From the table" })
    const { root } = draw("p04-formula")
    expect(Array.from(root!.querySelectorAll("[data-chalk-note]")).map((n) => n.getAttribute("data-chalk-note"))).toEqual(["应纳税所得额", "税率", "速算扣除数"])
    expect(root!.querySelectorAll("[data-chalk-brace]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-chalk-formula] [data-chalk-under]")).toHaveLength(1)
  })

  it("boughs rings the recommended answer in yellow chalk", () => {
    const { root } = draw("p05-who")
    const lit = Array.from(root!.querySelectorAll("[data-chalk-outcome][data-chalk-lit]"))
    expect(lit.map((o) => o.getAttribute("data-chalk-outcome"))).toEqual(["要办"])
    expect(lit[0]!.querySelector("[data-chalk-ring]")).not.toBeNull()
    expect(Array.from(root!.querySelectorAll("[data-chalk-branch]")).map((b) => b.getAttribute("data-chalk-branch"))).toEqual(["多交了", "少交了"])
  })

  it("factors sets each factor across the dashed line, the marked one in yellow", () => {
    expect(isFactor("× 80%")).toBe(true)
    expect(isFactor("从期限届满次日起算")).toBe(false)
    const { root } = draw("p06-income")
    expect(Array.from(root!.querySelectorAll("[data-chalk-factor][data-chalk-lit]")).map((f) => f.getAttribute("data-chalk-factor"))).toEqual(["劳务报酬"])
  })

  it("subtractions writes a minus sign before each item and yellows the marked amount's", () => {
    const { root, ctx } = draw("p07-deduct")
    const cols = Array.from(root!.querySelectorAll("[data-chalk-subtraction]"))
    expect(cols).toHaveLength(4)
    expect(cols.map((c) => textOf(c.querySelector("text")!))).toEqual(["−", "−", "−", "−"])
    expect(cols[0]!.querySelector("text")!.getAttribute("fill")).toBe(chalkboardInks(ctx).yellow)
    expect(root!.querySelector("[data-chalk-warning]")).not.toBeNull()
  })

  it("flashcards rings the tagged cards and sets the rest on a smaller row", () => {
    const { root } = draw("p08-seven")
    expect(root!.querySelectorAll("[data-chalk-card]")).toHaveLength(7)
    expect(Array.from(root!.querySelectorAll("[data-chalk-tag]")).map((t) => t.getAttribute("data-chalk-tag"))).toEqual(["提高", "提高", "提高"])
  })

  it("risers stands each rate as a step to scale and fills the highlighted one in yellow", () => {
    expect(percentOf("10%")).toBe(10)
    expect(percentOf("扣 0")).toBeNull()
    const { root, ctx } = draw("p09-rates")
    const steps = Array.from(root!.querySelectorAll("[data-chalk-step] rect"))
    expect(steps.map((s) => Number(s.getAttribute("height")))).toEqual([20, 66.66666666666666, 133.33333333333331, 166.66666666666669, 200, 233.33333333333334, 300])
    expect(root!.querySelector("[data-chalk-step][data-chalk-lit] rect")!.getAttribute("fill")).toBe(chalkboardInks(ctx).yellow)
    expect(root!.querySelector("[data-chalk-key]")!.getAttribute("data-chalk-key")).toBe("全年应纳税所得额（元）　·　税率　·　速算扣除数（元）")
  })

  it("givens sets the stamp under the title and the givens beside the photographs", () => {
    const { root } = draw("p10-example")
    expect(root!.querySelector("[data-chalk-stamp]")!.getAttribute("data-chalk-stamp")).toBe("例题 · 数字为虚构")
    expect(root!.querySelectorAll("[data-chalk-photos] image")).toHaveLength(2)
  })

  it("derivation lines the equals signs up in two columns and underlines the marked result", () => {
    expect(workedLine("应退 ＝ 已预缴 4240 − 3440 ＝ **800 元**")).toEqual({ what: "应退", work: "已预缴 4240 − 3440", result: "**800 元**", signs: ["＝", "＝"] })
    expect(workedLine("没有等号")).toBeNull()
    const { root } = draw("p11-derive")
    const signs = Array.from(root!.querySelectorAll("[data-chalk-worked]")).map((row) => Array.from(row.querySelectorAll("text")).filter((t) => textOf(t) === "＝").map((t) => t.getAttribute("x")))
    expect(new Set(signs.map((s) => s.join(",")))).toEqual(new Set(["372,890"]))
    expect(root!.querySelectorAll("[data-chalk-worked][data-chalk-lit] [data-chalk-under]")).toHaveLength(1)
  })

  it("cascade floats the marked step from where the sum stood, dashed in yellow", () => {
    expect(chalkNumber(1600, true)).toBe("1600")
    expect(chalkNumber(1600, false)).toBe("1,600")
    const { root, ctx } = draw("p12-why800")
    const bars = Array.from(root!.querySelectorAll("[data-chalk-bar] rect"))
    expect(bars.map((b) => [Number(b.getAttribute("y")), Number(b.getAttribute("height"))])).toEqual([[300, 260], [430, 130], [300, 130]])
    const lit = root!.querySelector("[data-chalk-bar][data-chalk-lit] rect")!
    expect([lit.getAttribute("stroke"), lit.getAttribute("stroke-dasharray")]).toEqual([chalkboardInks(ctx).yellow, "8 5"])
  })

  it("exercises letters the questions and leaves a line to answer on", () => {
    expect(asks("能退多少？")).toBe(true)
    expect(asks("两样可以同时有")).toBe(false)
    const { root } = draw("p13-practice")
    expect(Array.from(root!.querySelectorAll("[data-chalk-exercise]")).map((e) => textOf(e.querySelector("text")!))).toEqual(["A", "B", "C"])
    expect(drawnText(root!).match(/答：/gu)).toHaveLength(3)
    expect(root!.querySelector('[data-chalk-source="note"]')).not.toBeNull()
  })

  it("solutions sets each result in yellow with a stroke under it", () => {
    const { root } = draw("p14-answers")
    expect(Array.from(root!.querySelectorAll("[data-chalk-solution]")).map((s) => s.getAttribute("data-chalk-solution"))).toEqual(["A　漏报租金", "B　两处工资", "C　小额劳务"])
    expect(root!.querySelectorAll("[data-chalk-solution] [data-chalk-under]")).toHaveLength(3)
  })

  it("pitfalls strikes every pitfall with a cross", () => {
    const { root } = draw("p15-traps")
    expect(root!.querySelectorAll("[data-chalk-cross]")).toHaveLength(4)
  })

  it("strikeout strikes the misquoted figure and lights the marked one", () => {
    const { root } = draw("p16-stats")
    expect(root!.querySelector("[data-chalk-struck]")!.getAttribute("data-chalk-struck")).toBe("1.26 亿")
    expect(Array.from(root!.querySelectorAll("[data-chalk-figure][data-chalk-lit]")).map((f) => f.getAttribute("data-chalk-figure"))).toEqual(["超过 1 亿"])
  })

  it("chronology lays the dates at their true distance and boxes the span ahead in yellow", () => {
    expect(dayOf("2026-03-01")).toBeCloseTo(2026 + 2 / 12, 9)
    expect(dayOf("2026-03")).toBeNull()
    const { root } = draw("p17-when")
    const dots = Array.from(root!.querySelectorAll("[data-chalk-date] circle")).map((c) => Number(c.getAttribute("cx")))
    // A year is the same length everywhere on the line: a year and a half across x100 to x1180.
    expect(dots[5]! - dots[2]!).toBeCloseTo(720, 6)
    expect(Array.from(root!.querySelectorAll("[data-chalk-date][data-chalk-lit]")).map((d) => d.getAttribute("data-chalk-date"))).toEqual(["2027-03-01", "2027-06-30"])
    expect(root!.querySelector("[data-chalk-span][data-chalk-lit]")!.getAttribute("data-chalk-span")).toBe("2026 年度汇算")
  })

  it("the ledge's wood is lecture's yellow chalk dulled to a stain", () => {
    const { ctx } = testCtx("lecture")
    expect(chalkboardLedge(ctx).wood).toBe("#5A4632")
  })
})

describe("the chalkboard setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = CHALKBOARD_BOARD["p15-traps"]!
    const rows = page.components[0] as Extract<Component, { type: "row_cards" }>
    const long = { ...rows, items: rows.items.map((it, i) => (i === 0 ? { ...it, title: "平台兼职不再一律按次扣 20%，这一条要写得非常非常长，长到一行再也放不下它和它后面的全部理由和解释" } : it)) }
    expect(draw("p15-traps", "lecture", CHALKBOARD_BOARD, [long], ["pitfalls"]).root).toBeNull()
  })

  it("leaves a list that is not all pitfalls to another drawing", () => {
    const page = CHALKBOARD_BOARD["p15-traps"]!
    const rows = page.components[0] as Extract<Component, { type: "row_cards" }>
    const plain = { ...rows, items: rows.items.map((it) => ({ ...it, tone: undefined })) }
    expect(draw("p15-traps", "lecture", CHALKBOARD_BOARD, [plain], ["pitfalls"]).root).toBeNull()
  })

  it("draws only in the chalkboard setting", () => {
    const page = CHALKBOARD_BOARD["p02-goals"]!
    const { ctx } = testCtx("lecture")
    expect(compose({ components: page.components, ctx, rect: chalkboardBandRect(), setting: "keynote", claim: chalkClaimIn(page, ctx) }, CHALKBOARD_COMPOSITIONS)).toBeNull()
  })
})
