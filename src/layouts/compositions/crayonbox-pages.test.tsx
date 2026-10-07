// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { crayonInks } from "./crayonbox"
import { crayonBandRect, crayonClaimIn, crayonSourceIn } from "../crayonbox-frame"
import { CRAYONBOX_COMPOSITIONS } from "../content-crayonbox-sheet"
import { CRAYONBOX_BOARD, CRAYONBOX_BOARD_EN, CRAYONBOX_BOARD_IMAGES, type CrayonboxBoardPage } from "./__fixtures__/crayonbox-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages crayon's 2026-10 board drew (`design/rounds/2026-10-08-crayon/`),
 * each set on crayon as the crayonbox sheet sets it, its claim and source
 * placed by the composition, and then on two themes that share nothing with
 * it: brief (a cream page, navy and a sans body, no pool of crayons) and
 * ledger (a dark page). The setting reads the theme's tokens only, so every
 * page must draw on all three, inside its band, its text legible on what it
 * sits on, and every word the author wrote on the page.
 */

const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(CRAYONBOX_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))

function draw(name: string, theme = "crayon", board: Record<string, CrayonboxBoardPage> = CRAYONBOX_BOARD, components?: Component[], ids: readonly CompositionId[] = CRAYONBOX_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: !chinese }, images: IMAGES }
  const rect = crayonBandRect()
  const section = crayonInks(ctx).box[2]!
  const element = compose({ components: components ?? page.components, ctx, rect, setting: "crayonbox", inks: { section }, claim: crayonClaimIn(page.heading, ctx, section), source: crayonSourceIn({ footnote: page.footnote }, ctx) }, ids)
  return { element, ctx, tokens, rect, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  if (el.tagName === "image") return [n("x"), n("y"), n("width"), n("height")]
  return null
}

/** The fill a text sits on: the last opaque shape drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, circle, polygon, text"))) {
    if (el === text) return ground
    if (el.tagName === "text") continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || fill.startsWith("url(") || el.getAttribute("opacity") || el.closest("[opacity]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    if (el.tagName === "polygon") {
      const pts = (el.getAttribute("points") ?? "").split(/\s+/).map((p) => p.split(",").map(Number))
      const ys = pts.map((p) => p[1]!)
      const xs = pts.map((p) => p[0]!)
      if (ty >= Math.min(...ys) && ty <= Math.max(...ys) && tx >= Math.min(...xs) && tx <= Math.max(...xs)) ground = fill
      continue
    }
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
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "x_unit", "y_unit", "y2_unit", "unit", "emphasis", "style", "plot", "axis", "status", "tone"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (typeof value === "number") return
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) walk(c)
  return [...new Set(out)]
}

const drawnText = (root: Element) =>
  texts(root)
    .map(textOf)
    .join("")
    .replace(/\s+/g, "")
const squash = (s: string) => s.replace(/\s+/g, "")

describe.each(["crayon", "brief", "ledger"])("the crayon board's pages on %s", (theme) => {
  it.each(Object.keys(CRAYONBOX_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = CRAYONBOX_BOARD[name]!
    const { root, ctx, rect } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      if (fill === "none" || !textOf(text) || text.closest("[transform]")) continue
      const on = groundOf(root!, text, ctx.colors.bg)
      const size = Number(text.getAttribute("font-size"))
      const need = text.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(need)
    }
    for (const el of Array.from(root!.querySelectorAll("rect, image, circle"))) {
      if (el.closest("[transform]") || el.closest("defs")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(rect.x - 8)
      expect(x + w, name).toBeLessThanOrEqual(rect.x + rect.w + 8)
      // The yardstick's ruler hangs a little over the band's top, as the board drew it.
      expect(y, name).toBeGreaterThanOrEqual(rect.y - 20)
      expect(y + h, name).toBeLessThanOrEqual(648)
    }
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    for (const line of page.heading.split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the crayon board's pages in English", () => {
  it.each(Object.keys(CRAYONBOX_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = CRAYONBOX_BOARD_EN[name]!
    const { root } = draw(name, "crayon", CRAYONBOX_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
  })
})

describe("the crayon board's pages on crayon", () => {
  it("crayons take the box's colours in section order, white words on the purple", () => {
    const { root, ctx } = draw("p02-agenda")
    const inks = crayonInks(ctx)
    const bodies = Array.from(root!.querySelectorAll("[data-crayon-crayon] > rect[rx]")).map((r) => r.getAttribute("fill"))
    expect(bodies).toEqual([...inks.box])
    const purple = root!.querySelector("[data-crayon-crayon='请您配合']")!
    expect(Array.from(purple.querySelectorAll("text")).map((t) => t.getAttribute("fill"))).toContain("#FFFFFF")
  })

  it("stickies turn each note and its tape but leave the words upright, the article on a white label", () => {
    const { root } = draw("p03-law")
    const notes = Array.from(root!.querySelectorAll("[data-crayon-note]"))
    expect(notes).toHaveLength(6)
    for (const note of notes) {
      expect(note.querySelector("g[transform^='rotate']")).not.toBeNull()
      for (const text of Array.from(note.querySelectorAll("text"))) expect(text.closest("[transform^='rotate']")).toBeNull()
    }
    expect(root!.querySelector("[data-crayon-label='第五十六、五十九条']")).not.toBeNull()
  })

  it("waiver sets each line the author wrote as a point, and works the example out as a sum", () => {
    const { root, ctx } = draw("p04-free")
    const inks = crayonInks(ctx)
    const free = root!.querySelector("[data-crayon-side='免']")!
    expect(Array.from(free.querySelectorAll("text")).map(textOf).filter((t) => t.startsWith("·"))).toHaveLength(3)
    const sum = root!.querySelector("[data-crayon-sum]")!
    expect(texts(sum).map(textOf)).toEqual(["官方举的例子：民办园怎么算", "800 元", "民办园每月收费", "−", "500 元", "同类公办园标准，免", "=", "300 元", "家长交差额"])
    const figure = (term: string, value: string) => Array.from(root!.querySelectorAll(`[data-crayon-term='${term}'] text`)).find((t) => textOf(t) === value)!
    expect(figure("家长交差额", "300 元").getAttribute("fill")).toBe(inks.rust)
    expect(figure("同类公办园标准，免", "500 元").getAttribute("fill")).toBe(inks.leaf)
  })

  it("waiver declines a bridge whose items do not add up to its total", () => {
    const [cards, kpi, bridge] = CRAYONBOX_BOARD["p04-free"]!.components as [Component, Component, Extract<Component, { type: "waterfall" }>]
    const wrong = { ...bridge, items: bridge.items.map((it, i) => (i === 2 ? { ...it, value: 250 } : it)) }
    expect(draw("p04-free", "crayon", CRAYONBOX_BOARD, [cards, kpi, wrong], ["waiver"]).root).toBeNull()
  })

  it("storeys keeps the rate's storey clear of the tallest bar's value", () => {
    const { root } = draw("p05-trend")
    const lowestPoint = Math.max(...Array.from(root!.querySelectorAll("[data-crayon-rate] circle")).map((c) => Number(c.getAttribute("cy")) + 7))
    const tallest = Math.min(...Array.from(root!.querySelectorAll("[data-crayon-bar] text")).map((t) => Number(t.getAttribute("y")) - 13))
    expect(lowestPoint).toBeLessThan(tallest)
    expect(Array.from(root!.querySelectorAll("[data-crayon-rate] text")).map(textOf)).toContain("92.0%")
  })

  it("swatches give each card its own crayon", () => {
    const { root } = draw("p07-domains")
    const bands = Array.from(root!.querySelectorAll("[data-crayon-swatch]")).map((s) => s.querySelectorAll("rect")[1]!.getAttribute("fill"))
    expect(new Set(bands).size).toBe(5)
  })

  it("arc puts the highlighted part at the top of the sun's path and the parts either side down its ends", () => {
    const { root } = draw("p09-day")
    const at = (name: string) => root!.querySelector(`[data-crayon-stop='${name}'] circle`)!
    expect(root!.querySelector("[data-crayon-lead='stop']")!.getAttribute("data-crayon-stop")).toBe("户外")
    expect(Number(at("户外").getAttribute("cy"))).toBeLessThan(Number(at("正餐").getAttribute("cy")))
    expect(Number(at("入园").getAttribute("cx"))).toBeLessThan(Number(at("离园").getAttribute("cx")))
    // The first photograph's note is the row's.
    expect(root!.querySelectorAll("[data-crayon-photo-note]")).toHaveLength(1)
  })

  it("crosscheck greys a cell with no figure in a column of figures and stamps the binding row", () => {
    const { root, ctx } = draw("p12-guides")
    const inks = crayonInks(ctx)
    const row = root!.querySelector("[data-crayon-lead='row']")!
    expect(row.getAttribute("data-crayon-row")).toBe("《幼儿园工作规程》，在园")
    expect(row.querySelector("[data-crayon-stamp='规定'] rect")!.getAttribute("fill")).toBe(inks.leaf)
    const quiet = Array.from(root!.querySelectorAll("text")).filter((t) => textOf(t) === "未涉及")
    expect(quiet.length).toBe(5)
    for (const t of quiet) expect(t.getAttribute("font-weight")).toBe("500")
  })

  it("checkup draws the estimated year pale in a dashed outline and names it so", () => {
    const { root } = draw("p14-vision")
    expect(root!.querySelector("[data-crayon-bar='2018'] [data-mark-status='estimate']")).not.toBeNull()
    expect(Array.from(root!.querySelectorAll("text")).map(textOf)).toContain("2018（推算）")
    expect(root!.querySelector("[data-crayon-lead='bar']")!.getAttribute("data-crayon-bar")).toBe("2022")
  })

  it("badges set the danger badge larger with its name in red", () => {
    const { root, ctx } = draw("p16-safety")
    const hot = root!.querySelector("[data-crayon-lead='badge']")!
    expect(hot.getAttribute("data-crayon-badge")).toBe("玩水")
    expect(Number(hot.querySelector("circle")!.getAttribute("r"))).toBe(72)
    expect(hot.querySelector("text")!.getAttribute("fill")).toBe(crayonInks(ctx).red)
  })

  it("ticks draw a box twice for each thing, in the section's crayon", () => {
    const { root } = draw("p17-checklist")
    expect(root!.querySelectorAll("[data-crayon-tick]")).toHaveLength(5)
    for (const tick of Array.from(root!.querySelectorAll("[data-crayon-tick]"))) expect(tick.querySelectorAll(":scope > rect")).toHaveLength(2)
  })
})

describe("the crayonbox setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = CRAYONBOX_BOARD["p16-safety"]!
    const cards = page.components[0] as Extract<Component, { type: "icon_cards" }>
    const long = { ...cards, items: cards.items.map((it, i) => (i === 0 ? { ...it, title: "一个远远放不进这一枚徽章底下的很长很长的名字" } : it)) }
    expect(draw("p16-safety", "crayon", CRAYONBOX_BOARD, [long], ["badges"]).root).toBeNull()
  })

  it("declines a header it has no place for", () => {
    const page = CRAYONBOX_BOARD["p07-domains"]!
    const table = { ...(page.components[0] as Extract<Component, { type: "from_to" }>), label_column: "领域" }
    expect(draw("p07-domains", "crayon", CRAYONBOX_BOARD, [table], ["swatches"]).root).toBeNull()
  })

  it("draws only in the crayonbox setting", () => {
    const page = CRAYONBOX_BOARD["p02-agenda"]!
    const { ctx } = testCtx("crayon")
    expect(compose({ components: page.components, ctx, rect: crayonBandRect(), setting: "scroll" }, CRAYONBOX_COMPOSITIONS)).toBeNull()
  })
})
