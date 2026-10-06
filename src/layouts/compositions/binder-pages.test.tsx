// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { binderInks } from "./binder"
import { BINDER_BOARD, BINDER_BOARD_IMAGES } from "./__fixtures__/binder-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages proposal's 2026-10 board drew (`design/rounds/2026-10-06-proposal/`),
 * each set on proposal as the binder sheet sets it, and then on two themes
 * that share nothing with it: brief (a cream page, navy and a serif) and
 * rally (a dark page whose accent is a magenta). The setting reads the
 * theme's tokens only, so every page must draw on all three, inside its band,
 * its text legible on what it sits on, and every word the author wrote on the
 * page.
 */

/** The binder sheet's body band: x64 to x1196, y172 down to y640 over a source, y648 without one. */
const band = (sourced: boolean) => ({ x: 64, y: 172, w: 1132, h: (sourced ? 640 : 648) - 172 })
const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(BINDER_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })

/** The binder sheet's compositions, in its order (`content-binder-sheet.tsx`). */
const BINDER_IDS: readonly CompositionId[] = ["gains", "hours", "regions", "workings", "levers", "cycles", "drift", "parts", "plans", "precedents", "safeguards", "remedies", "checkpoints", "quote", "papers"]

function draw(name: string, theme = "proposal", components?: Component[]) {
  const page = BINDER_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const rect = band(page.sourced)
  const element = compose({ components: components ?? page.components, ctx, rect, setting: "binder" }, BINDER_IDS)
  return { element, ctx, tokens, rect, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))

/** The box a filled shape covers: a rect's own, a circle's square. */
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
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "tone", "key", "emphasis", "evidence", "basis", "from", "to", "align", "x_unit"].includes(key)) return
      // The separators a composition declares rather than prints: 「。」「：」" · ", an arrow, a full stop, brackets around an aside.
      for (const part of value.replace(/\*\*/g, "").split(/\n|。|：|: | · |\. | = | → |（|）|\(|\)/u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) {
    if (c.type === "chart") {
      walk(c.series.map((s) => ({ name: s.name, data: s.data.map((d) => ({ x: d.x, note: d.note })) })))
      continue
    }
    if (c.type === "heatmap") {
      // Every other column label is printed under its tick, the steps in the key and the cells.
      walk([...c.x_labels.filter((_, i) => i % (c.label_every ?? 1) === 0), ...c.y_labels, ...(c.bands ?? []).map((b) => b.label), ...(c.steps ?? []).flatMap((s) => [s.label, s.short ?? ""]), c.x_title ?? ""])
      continue
    }
    walk(c)
  }
  return out
}

describe.each(["proposal", "brief", "rally"])("the proposal board's pages on %s", (theme) => {
  it.each(Object.keys(BINDER_BOARD))("%s is drawn whole by its composition, inside its band, legible", (name) => {
    const page = BINDER_BOARD[name]!
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

describe("the proposal board's pages on proposal", () => {
  it.each(Object.keys(BINDER_BOARD))("%s lights at most one thing in the brick red", (name) => {
    const { root, ctx } = draw(name)
    const fire = binderInks(ctx).fire.toUpperCase()
    const leads = new Set(Array.from(root!.querySelectorAll("[data-binder-lead]")).map((el) => el.getAttribute("data-binder-lead")))
    expect(leads.size, name).toBeLessThanOrEqual(1)
    // Nothing outside a lead group is painted in the brick red.
    for (const el of Array.from(root!.querySelectorAll("[fill], [stroke]"))) {
      if (el.closest("[data-binder-lead]")) continue
      expect((el.getAttribute("fill") ?? "").toUpperCase(), name).not.toBe(fire)
      expect((el.getAttribute("stroke") ?? "").toUpperCase(), name).not.toBe(fire)
    }
  })

  it("gains sets each figure at 40px, the marked one in the brick red over the sand", () => {
    const { root, ctx } = draw("p02-promise")
    const figure = byText(root!, "6.1 至 7.7 年")!
    expect(figure.getAttribute("font-size")).toBe("40")
    expect(figure.closest("[data-binder-lead='gain']")).not.toBeNull()
    expect(contrastRatio(figure.getAttribute("fill")!, binderInks(ctx).card)).toBeGreaterThanOrEqual(3)
    expect(byText(root!, "一部分白天用电")).toBeDefined()
    expect(root!.querySelector("[data-binder-bar] text")!.getAttribute("font-weight")).toBe("700")
  })

  it("hours lays the day as runs as wide as their hours, coloured by step, with the midday frame and a tick every six hours", () => {
    const { root } = draw("p04-tou")
    const jiangsu = Array.from(root!.querySelectorAll("[data-binder-hours-row='0'] [data-binder-run] rect"))
    expect(jiangsu).toHaveLength(7)
    const widths = jiangsu.map((r) => Number(r.getAttribute("width")) + 2)
    expect(widths[1]! / widths[0]!).toBeCloseTo(2, 5)
    expect(root!.querySelector("[data-binder-band] ")).not.toBeNull()
    expect(root!.querySelector("[data-binder-lead='band'] [data-binder-icon='sun']")).not.toBeNull()
    expect(["0 时", "6 时", "12 时", "18 时"].every((t) => byText(root!, t))).toBe(true)
    expect(byText(root!, "3 时")).toBeUndefined()
    expect(root!.querySelectorAll("[data-binder-ticks] line")).toHaveLength(25)
    expect(byText(root!, "峰谷差 0.5738")).toBeDefined()
    expect(byText(root!, "苏发改价格发〔2025〕426 号")).toBeDefined()
  })

  it("regions sets the aside of a figure as a chip beside it and the marked verdict in the brick red", () => {
    const { root } = draw("p05-provinces")
    expect(byText(root!, "约 0.76")).toBeDefined()
    expect(root!.querySelector("[data-binder-chip='示意']")!.getAttribute("data-aside-brackets")).toBe("（）")
    expect(root!.querySelector("[data-binder-lead='verdict'] [data-binder-chip='白天发电多半抵峰价']")).not.toBeNull()
    expect(root!.querySelector("[data-binder-note] rect")).not.toBeNull()
  })

  it("workings sets each input's symbol in a disc and the answer as a block of the brick red", () => {
    const { root, ctx } = draw("p06-pv-math")
    expect(Array.from(root!.querySelectorAll("[data-binder-input]")).map((el) => el.getAttribute("data-binder-input"))).toEqual(["E", "p", "O", "I"])
    expect(byText(root!, "E")!.getAttribute("font-style")).toBe("italic")
    expect(byText(root!, "年发电量")).toBeDefined()
    expect(byText(root!, "E × p − O")).toBeDefined()
    expect(byText(root!, "108 × 0.45 − 4.6")).toBeDefined()
    const answer = root!.querySelector("[data-binder-lead='answer'] rect")!
    expect(answer.getAttribute("fill")).toBe(binderInks(ctx).fire)
    expect(byText(root!, "6.1 年")!.getAttribute("font-size")).toBe("60")
  })

  it("levers scales the bars to a round axis, the marked case in the brick red and the reference in the sky", () => {
    const { root, ctx } = draw("p07-sensitivity")
    const inks = binderInks(ctx)
    const bar = (name: string) => root!.querySelector(`[data-binder-bar-case='${name}'] rect`)!
    expect(Number(bar("全部自用，按平段 0.64 元").getAttribute("width"))).toBeCloseTo(4.2 * 40, 5)
    expect(bar("全部自用，按 0.45 元").getAttribute("fill")).toBe(inks.fire)
    expect(bar("1163 小时，按 0.803 元").getAttribute("fill")).toBe(inks.sky)
    expect(byText(root!, "3.0 年")).toBeDefined()
    expect(byText(root!, "10 年")).toBeDefined()
  })

  it("cycles reads each cell as buy, sell and earn, and puts a figure's note on the label line", () => {
    const { root } = draw("p08-storage-math")
    expect(byText(root!, "谷 0.3828")).toBeDefined()
    expect(byText(root!, "514.1 元")).toBeDefined()
    expect(root!.querySelectorAll("[data-binder-icon='arrow-right']")).toHaveLength(4)
    expect(byText(root!, "每天，两充两放 · 未计尖峰")).toBeDefined()
    expect(byText(root!, "1111.3 元")!.getAttribute("font-size")).toBe("44")
  })

  it("drift fades what was, sets what is in petrol and the marked measure in the brick red", () => {
    const { root, ctx } = draw("p09-storage-discount")
    const inks = binderInks(ctx)
    expect(byText(root!, "5.4")!.getAttribute("fill")).toBe(inks.fade)
    expect(byText(root!, "9.1")!.closest("[data-binder-lead='now']")).not.toBeNull()
    expect(byText(root!, "0.65") ?? byText(root!, "约 0.65")).toBeDefined()
  })

  it("parts numbers the parts, the first in the brick red, and dashes the card whose tag is not settled", () => {
    const { root } = draw("p11-solution")
    expect(root!.querySelector("[data-binder-lead='part'] [data-binder-part-number='1']")).not.toBeNull()
    const storage = root!.querySelector("[data-binder-part='储能柜']")!
    expect(storage.querySelector("rect[stroke-dasharray]")).not.toBeNull()
    expect(storage.querySelector("[data-binder-chip='选配']")).not.toBeNull()
  })

  it("plans sets the chip under who the plan suits and the figure's line under it", () => {
    const { root } = draw("p12-models")
    expect(root!.querySelector("[data-binder-plan='合同能源管理（EMC）'] [data-binder-lead='plan'] [data-binder-chip='贵司出资 0 元']")).not.toBeNull()
    expect(byText(root!, "适合：不想占用资金")).toBeDefined()
    expect(byText(root!, "约 44.0 万元")).toBeDefined()
    expect(byText(root!, "44.0 万元减租金")!.getAttribute("font-size")).toBe("28")
  })

  it("precedents sets the title as an outlined chip and the audited record on a brick-red edge", () => {
    const { root } = draw("p13-references")
    expect(root!.querySelector("[data-binder-chip='均非我方项目'] rect")!.getAttribute("fill")).toBe("none")
    expect(root!.querySelector("[data-binder-precedent='亿晶光电江苏四座电站'] [data-binder-lead='precedent'] path")).not.toBeNull()
  })

  it("safeguards heads its columns, reddens the lessons' icons and bolds what is done", () => {
    const { root, ctx } = draw("p14-safety")
    expect(byText(root!, "按什么做")).toBeDefined()
    expect(root!.querySelector("[data-binder-lesson] [data-binder-icon='flame'] [stroke]")!.getAttribute("stroke")).toBe(binderInks(ctx).danger)
    expect(root!.querySelector("[data-binder-lead='rule'] [data-binder-chip='强制性国家标准']")).not.toBeNull()
    expect(root!.querySelector("[data-binder-panel] rect")!.getAttribute("fill")).toBe(binderInks(ctx).deep)
  })

  it("remedies shields each answer in the success ink and tints the lead risk", () => {
    const { root, ctx } = draw("p15-risks")
    expect(root!.querySelectorAll("[data-binder-icon='shield-check']")).toHaveLength(5)
    expect(root!.querySelector("[data-binder-risk='电价时段再调整'] rect")!.getAttribute("fill")).toBe(binderInks(ctx).firePale)
  })

  it("checkpoints chains the steps, the highlighted one in the brick red, and splits each step's paper off its text", () => {
    const { root } = draw("p16-roadmap")
    expect(root!.querySelectorAll("[data-binder-step-arrow]")).toHaveLength(6)
    expect(root!.querySelector("[data-binder-lead='step'] [data-binder-step-arrow='3']")).not.toBeNull()
    expect(byText(root!, "交贵司确认")).toBeDefined()
    expect(byText(root!, "并网意见和备案文件")).toBeDefined()
  })

  it("quote prints the shared headers once, a blank to fill readable, and the lead row's chip", () => {
    const { root, ctx } = draw("p17-pricing")
    expect(texts(root!).filter((t) => textOf(t) === "报价项")).toHaveLength(1)
    const blank = root!.querySelector("[data-binder-blank] text")!
    expect(contrastRatio(blank.getAttribute("fill")!, ctx.colors.bg)).toBeGreaterThanOrEqual(4.5)
    expect(root!.querySelector("[data-binder-lead='quote'] [data-binder-chip='不需要则为零']")).not.toBeNull()
  })

  it("papers gives each paper a box to tick and closes on a line under a rule of petrol", () => {
    const { root, ctx } = draw("p18-documents")
    expect(root!.querySelectorAll("[data-binder-box]")).toHaveLength(6)
    expect(root!.querySelector("[data-binder-closing] rect")!.getAttribute("fill")).toBe(binderInks(ctx).deep)
  })
})

describe("the binder setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = BINDER_BOARD["p02-promise"]!
    const [banner, kpis, callout] = page.components as [Component, Extract<Component, { type: "kpi_cards" }>, Component]
    const long = { ...kpis, items: kpis.items.map((it, i) => (i === 0 ? { ...it, value: "一个远远放不进卡片的很长很长的数字说明" } : it)) }
    expect(draw("p02-promise", "proposal", [banner, long, callout]).root).toBeNull()
  })

  it("draws only in the binder setting", () => {
    const page = BINDER_BOARD["p06-pv-math"]!
    const { ctx } = testCtx("proposal")
    expect(compose({ components: page.components, ctx: chinese(ctx), rect: band(true), setting: "marquee" }, BINDER_IDS)).toBeNull()
  })
})
