// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { horizontalForm, scrollInks } from "./scroll"
import { scrollBandRect, scrollClaimIn, scrollSourceIn } from "../scroll-shared"
import { SCROLL_COMPOSITIONS } from "../content-scroll-sheet"
import { SCROLL_BOARD, SCROLL_BOARD_EN, SCROLL_BOARD_IMAGES, type ScrollBoardPage } from "./__fixtures__/scroll-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages ink's 2026-10 board drew (`design/rounds/2026-10-07-ink/`), each
 * set on ink as the scroll sheet sets it, its claim and source placed by the
 * composition, and then on two themes that share nothing with it: brief (a
 * cream page, navy and a sans body) and rally (a dark page whose accent is a
 * magenta). The setting reads the theme's tokens only, so every page must
 * draw on all three, inside its band, its text legible on what it sits on,
 * and every word the author wrote on the page. The English deck's pages are
 * drawn too: nothing Latin stands upright.
 */

const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(SCROLL_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))

/** The statute is set by the quotation page in the band right of its claim: x240 in Chinese, x356 across. */
function bandFor(name: string, page: ScrollBoardPage): ContentRect {
  const band = scrollBandRect()
  if (page.drawnBy[0] !== "statute") return band
  const left = /[A-Za-z]/u.test(page.heading) ? 356 : 240
  return { ...band, x: left, w: 1170 - left }
}

function draw(name: string, theme = "ink", board: Record<string, ScrollBoardPage> = SCROLL_BOARD, components?: Component[], ids: readonly CompositionId[] = [...SCROLL_COMPOSITIONS, "statute"]) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: !chinese }, images: IMAGES }
  const rect = bandFor(name, page)
  const slide = { footnote: page.footnote }
  const element = compose({ components: components ?? page.components, ctx, rect, setting: "scroll", claim: scrollClaimIn(page.heading, ctx), source: scrollSourceIn(slide, ctx) }, ids)
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
    if (!fill || fill === "none" || fill.startsWith("url(") || el.closest("[opacity]") || el.getAttribute("fill-opacity") || el.closest("[transform]")) continue
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
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "x_unit", "y_unit", "emphasis"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (typeof value === "number") return
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) {
    if (c.type === "chart") {
      // A staircase names its series beside its steps; a share bar names its category over it and each part in it.
      const keyed = c.series.length > 1 || c.chart_type === "scatter"
      walk([c.title ?? "", c.emphasis_label ?? "", ...(keyed ? c.series.map((s) => s.name) : []), ...(c.chart_type === "scatter" ? [] : c.series.flatMap((s) => s.data.map((d) => String(d.x))))])
      continue
    }
    if (c.type === "image") {
      walk(c.caption ?? "")
      continue
    }
    if (c.type === "timeline") {
      // The spans run to their years along the axis drawn to scale: their names are words, their ends are places.
      walk([...c.milestones.flatMap((m) => [m.date, m.title]), ...(c.periods ?? []).map((p) => p.label)])
      continue
    }
    walk(c)
  }
  return [...new Set(out)]
}

/** Every word on the page as a reader reads it: vertical forms read back as written, spaces gone. */
const drawnText = (root: Element) =>
  texts(root)
    .map(textOf)
    .join("")
    .replace(/\s+/g, "")
    .split("")
    .map(horizontalForm)
    .join("")

const squash = (s: string) => s.replace(/\s+/g, "")

describe.each(["ink", "brief", "rally"])("the ink board's pages on %s", (theme) => {
  it.each(Object.keys(SCROLL_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = SCROLL_BOARD[name]!
    const { root, ctx, rect } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const ground = ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      if (fill === "none" || !textOf(text) || text.closest("[data-scroll-photo-note]")) continue
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      const need = text.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(need)
    }
    for (const el of Array.from(root!.querySelectorAll("rect, image, circle"))) {
      if (el.closest("[transform]") || el.closest("defs")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(rect.x - 7)
      expect(x + w, name).toBeLessThanOrEqual(rect.x + rect.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(rect.y - 7)
      expect(y + h, name).toBeLessThanOrEqual(648 + 34)
    }
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    if (page.drawnBy[0] !== "statute") expect(drawn, `${name}: the claim`).toContain(squash(page.heading))
    if (page.footnote && page.drawnBy[0] !== "statute") expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the ink board's pages in English", () => {
  it.each(Object.keys(SCROLL_BOARD_EN))("%s is drawn whole by its composition, nothing Latin upright", (name) => {
    const page = SCROLL_BOARD_EN[name]!
    const { root } = draw(name, "ink", SCROLL_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    for (const column of Array.from(root!.querySelectorAll("[data-scroll-column]"))) expect(column.getAttribute("data-scroll-column")).not.toMatch(/[A-Za-z0-9]/u)
    const drawn = texts(root!).map(textOf).join(" ").replace(/\s+/g, "")
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
  })
})

describe("the ink board's pages on ink", () => {
  it.each(Object.keys(SCROLL_BOARD))("%s spends cinnabar on one thing", (name) => {
    const { root } = draw(name)
    const leads = new Set(Array.from(root!.querySelectorAll("[data-scroll-lead]")).map((el) => el.getAttribute("data-scroll-lead")))
    expect(leads.size, name).toBeLessThanOrEqual(1)
  })

  it("opening sets the marked figure and its symbol in cinnabar and the line read aloud under a hairline", () => {
    const { root, ctx } = draw("p02-open")
    const lit = root!.querySelector("[data-scroll-lead='figure']")!
    expect(lit.getAttribute("data-scroll-figure")).toBe("3994")
    expect(lit.querySelector("text")!.getAttribute("fill")).toBe(scrollInks(ctx).cinnabar)
    // The two-character figure is set a size larger, as the board set 45.
    const sizes = Array.from(root!.querySelectorAll("[data-scroll-figure] text")).map((t) => t.getAttribute("font-size")).filter((s) => Number(s) > 100)
    expect(sizes).toEqual(["120", "110", "110"])
    expect(root!.querySelector("[data-scroll-read] text")!.getAttribute("font-family")).toBe(ctx.fonts.heading)
  })

  it("statute stands the passage upright, a column a line the author wrote, its punctuation in vertical form", () => {
    const { root } = draw("p03-law")
    const columns = Array.from(root!.querySelectorAll("[data-scroll-statute] > [data-scroll-vertical] > [data-scroll-column]")).map((c) => c.getAttribute("data-scroll-column"))
    expect(columns).toEqual(["本法所称非物质文化遗产，", "是指各族人民世代相传并视为", "其文化遗产组成部分的各种传统", "文化表现形式，以及与传统文化", "表现形式相关的实物和场所。"])
    // 《 and 》 take their vertical forms; a comma moves to the upper right of its cell.
    const cite = root!.querySelector("[data-scroll-attribution]")!
    expect(textOf(cite).replace(/\s/g, "")).toBe("︽非物质文化遗产法︾第二条")
    const chan = Array.from(root!.querySelectorAll("[data-scroll-column] text")).find((t) => t.textContent === "产")!
    const comma = chan.nextElementSibling!
    expect(comma.textContent).toBe("，")
    expect(Number(comma.getAttribute("x"))).toBeGreaterThan(Number(chan.getAttribute("x")) + 15)
  })

  it("strata names a tier's figure in its band and steps the tiers from the ink to the faint", () => {
    const { root, ctx } = draw("p04-system")
    expect(root!.querySelector("[data-scroll-tier='国家级'] text")!.textContent).toBe("国家级\u30001557 项")
    const inks = scrollInks(ctx)
    expect(Array.from(root!.querySelectorAll("[data-scroll-tier] polygon")).map((p) => p.getAttribute("fill"))).toEqual([inks.lead, inks.ink2, inks.taupe, inks.faint])
  })

  it("handscroll lays the years to scale, keeps every stem clear of every name, and names the steepest step and the end", () => {
    const { root } = draw("p06-scroll")
    const x = (year: string) => Number(root!.querySelector(`[data-scroll-milestone='${year}'] circle`)!.getAttribute("cx"))
    // 2001 to 2003 is two years, 2003 to 2009 six: the axis keeps the ratio.
    expect((x("2009") - x("2003")) / (x("2003") - x("2001"))).toBeCloseTo(3, 5)
    expect(Array.from(root!.querySelectorAll("[data-scroll-stair-note]")).map((n) => n.getAttribute("data-scroll-stair-note"))).toEqual(["累计 29", "累计 45"])
    expect(root!.querySelector("[data-scroll-lead='milestone']")!.getAttribute("data-scroll-milestone")).toBe("2024")
    // No stem passes through a name.
    const names = Array.from(root!.querySelectorAll("[data-scroll-milestone] text")).filter((t) => Number(t.getAttribute("font-size")) >= 13)
    for (const stem of Array.from(root!.querySelectorAll("[data-scroll-milestone] rect"))) {
      const sx = Number(stem.getAttribute("x")) + 0.5
      const [y0, y1] = [Number(stem.getAttribute("y")), Number(stem.getAttribute("y")) + Number(stem.getAttribute("height"))]
      for (const name of names) {
        const by = Number(name.getAttribute("y"))
        const size = Number(name.getAttribute("font-size"))
        const w = (textOf(name).length * size) / 2 + 4
        const nx = Number(name.getAttribute("x"))
        const anchor = name.getAttribute("text-anchor")
        const [x0, x1] = anchor === "end" ? [nx - 2 * w, nx] : anchor === "middle" ? [nx - w, nx + w] : [nx, nx + 2 * w]
        if (sx > x0 && sx < x1) expect(y1 <= by - size || y0 >= by + 4, `${textOf(name)} cut by a stem at ${sx}`).toBe(true)
      }
    }
  })

  it("nations and genres light the marked bar, its figure and its name", () => {
    for (const [name, lead] of [["p08-world", "中国"], ["p09-categories", "传统医药"]] as const) {
      const { root, ctx } = draw(name)
      const lit = root!.querySelector("[data-scroll-lead='bar']")!
      expect(lit.getAttribute(name === "p08-world" ? "data-scroll-nation" : "data-scroll-genre")).toBe(lead)
      expect(Array.from(lit.querySelectorAll("text")).some((t) => t.getAttribute("fill") === scrollInks(ctx).cinnabar)).toBe(true)
    }
  })

  it("bases lights the highlighted row's figure and never joins the counts", () => {
    const { root, ctx } = draw("p11-bearers")
    const lit = root!.querySelector("[data-scroll-lead='figure']")!
    expect(lit.getAttribute("data-scroll-base")).toBe("2241")
    expect(Array.from(root!.querySelectorAll("[data-scroll-base]"))).toHaveLength(4)
    expect(Array.from(lit.querySelectorAll("text")).find((t) => t.textContent === "2241")!.getAttribute("fill")).toBe(scrollInks(ctx).cinnabar)
    expect(root!.querySelector("polyline")).toBeNull()
  })

  it("ages brackets the marked run and names the part too narrow for its words under the bar", () => {
    const { root } = draw("p12-aging")
    expect(root!.querySelector("[data-scroll-bracket]")!.getAttribute("data-scroll-bracket")).toBe("60 岁以上 631 人，占 58.3%")
    expect(textOf(root!.querySelector("[data-scroll-narrow] text")!)).toBe("40 岁以下 7 人")
    expect(root!.querySelectorAll("[data-scroll-run]")).toHaveLength(3)
  })

  it("revival, archive and daily set the claim beside the photograph, the source under its column", () => {
    for (const name of ["p07-yimakan", "p13-records", "p15-spring"]) {
      const { root } = draw(name)
      expect(Number(root!.querySelector("[data-scroll-claim] text")!.getAttribute("x")), name).toBeGreaterThan(560)
      expect(Number(root!.querySelector("[data-scroll-source] text")!.getAttribute("x")), name).toBeGreaterThan(560)
    }
    // The author's own break in a claim is kept.
    const spring = draw("p15-spring").root!
    expect(Array.from(spring.querySelectorAll("[data-scroll-claim] text")).map(textOf)).toEqual(["春节入遗后，", "按天算出游多了 5.7%"])
  })

  it("glyphs reads its columns from the right in Chinese and from the left in English", () => {
    const zh = draw("p17-todo").root!
    const order = (root: Element) => Array.from(root.querySelectorAll("[data-scroll-glyph]")).map((g) => [g.getAttribute("data-scroll-glyph"), Number(g.querySelector("rect")!.getAttribute("x"))] as const)
    const zhOrder = order(zh)
    expect(zhOrder[0]![0]).toBe("看")
    expect(zhOrder[0]![1]).toBeGreaterThan(zhOrder[4]![1])
    expect(zh.querySelector("[data-scroll-lead='word']")!.getAttribute("data-scroll-glyph")).toBe("记")
    const en = draw("p17-todo", "ink", SCROLL_BOARD_EN).root!
    const enOrder = order(en)
    expect(enOrder[0]![0]).toBe("See")
    expect(enOrder[0]![1]).toBeLessThan(enOrder[4]![1])
  })
})

describe("the scroll setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = SCROLL_BOARD["p08-world"]!
    const [chart, ...rest] = page.components as [Extract<Component, { type: "chart" }>, ...Component[]]
    const long = { ...chart, series: chart.series.map((s) => ({ ...s, data: s.data.map((d, i) => (i === 0 ? { ...d, x: "一个远远放不进这一栏的很长的国家名字" } : d)) })) }
    expect(draw("p08-world", "ink", SCROLL_BOARD, [long, ...rest], ["nations"]).root).toBeNull()
  })

  it("declines a claim that does not fit beside the photograph", () => {
    const page = SCROLL_BOARD["p13-records"]!
    const { ctx } = testCtx("ink")
    const long = "七十一人没等到自己的记录做完，而且这一句标题长到放不进照片旁边那一栏的两行里面去了，再长一点，再长一点，再长一点，再长一点"
    expect(compose({ components: page.components, ctx: { ...ctx, images: IMAGES }, rect: scrollBandRect(), setting: "scroll", claim: scrollClaimIn(long, ctx) }, ["archive"])).toBeNull()
  })

  it("declines a statute column longer than its cells", () => {
    const page = SCROLL_BOARD["p03-law"]!
    const quote = { ...(page.components[0] as Extract<Component, { type: "blockquote" }>), text: "本法所称非物质文化遗产是指各族人民世代相传并视为其文化遗产组成部分的各种传统文化表现形式以及与传统文化表现形式相关的实物和场所本法所称非物质文化遗产是指各族人民世代相传并视为其文化遗产组成部分的各种传统文化表现形式" }
    expect(draw("p03-law", "ink", SCROLL_BOARD, [quote], ["statute"]).root).toBeNull()
  })

  it("draws only in the scroll setting", () => {
    const page = SCROLL_BOARD["p02-open"]!
    const { ctx } = testCtx("ink")
    expect(compose({ components: page.components, ctx, rect: scrollBandRect(), setting: "periodical" }, SCROLL_COMPOSITIONS)).toBeNull()
  })
})
