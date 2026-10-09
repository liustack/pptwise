// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { invitationInks, invitationTracking } from "./invitation"
import { invitationBandRect, invitationClaimIn, invitationSourceIn } from "../invitation-shared"
import { INVITATION_COMPOSITIONS } from "../content-invitation-sheet"
import { INVITATION_BOARD, INVITATION_BOARD_EN, INVITATION_BOARD_IMAGES, type InvitationBoardPage } from "./__fixtures__/invitation-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages luxe's 2026-10 board drew (`design/rounds/2026-10-08-luxe/`),
 * each set on luxe as the invitation sheet sets it, its chapter, claim and
 * source placed by the composition, and then on two light themes that share
 * nothing with it: brief (cream, navy, a serif heading) and crayon (white,
 * bright crayon colours, a sans heading). The setting reads the theme's
 * tokens only, so every page must draw on all three, inside the card, its
 * text legible on what it sits on, and every word the author wrote on the
 * page. The English deck's pages are drawn too.
 */

const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(INVITATION_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))

function draw(name: string, theme = "luxe", board: Record<string, InvitationBoardPage> = INVITATION_BOARD, components?: Component[], ids: readonly CompositionId[] = INVITATION_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true }, images: IMAGES }
  const rect = invitationBandRect()
  const slide = { heading: page.heading, kicker: page.kicker, footnote: page.footnote }
  const element = compose({ components: components ?? page.components, ctx, rect, setting: "invitation", claim: invitationClaimIn(slide, ctx), source: invitationSourceIn(slide, ctx), stamp: page.stamp }, ids)
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
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "key", "evidence", "fit", "x_unit", "y_unit", "delta", "status"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) if (part.trim()) out.push(part.trim())
      return
    }
    if (typeof value === "number" || typeof value === "boolean") return
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) {
    if (c.type === "chart") {
      // A category's parenthesis is set small under its name: the name and what is in it are read apart.
      const categories = c.series.flatMap((s) => s.data.flatMap((d) => String(d.x).split(/[（()）]/u)))
      walk([c.title ?? "", c.reference?.label ?? "", ...c.series.map((s) => s.name), ...categories, ...c.series.flatMap((s) => s.data.map((d) => d.note ?? ""))])
      continue
    }
    walk(c)
  }
  return [...new Set(out.filter(Boolean))]
}

const squash = (s: string) => s.replace(/\s+/g, "")
/** Every word on the page as a reader reads it, spaces gone, a separator declared on a line read back after it. */
const drawnText = (root: Element) => squash(texts(root).map((t) => textOf(t) + (t.getAttribute("data-gloss-break") ?? "")).join(""))
const readable = squash

describe.each(["luxe", "brief", "crayon"])("the luxe board's pages on %s", (theme) => {
  it.each(Object.keys(INVITATION_BOARD))("%s is drawn whole by its compositions, inside the card, legible", (name) => {
    const page = INVITATION_BOARD[name]!
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
    for (const el of Array.from(root!.querySelectorAll("rect, image, circle"))) {
      if (el.closest("[transform]") || el.closest("defs")) continue
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(-1)
      expect(x + w, name).toBeLessThanOrEqual(1281)
      expect(y, name).toBeGreaterThanOrEqual(-1)
      expect(y + h, name).toBeLessThanOrEqual(721)
      // Only the half-page photograph reaches into the footer's row.
      if (!el.closest("[data-invitation-vitrine-photo]")) expect(y + h, name).toBeLessThanOrEqual(660)
    }
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(readable(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
    if (page.kicker) expect(drawn, `${name}: the chapter`).toContain(squash(page.kicker))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the luxe board's pages in English", () => {
  it.each(Object.keys(INVITATION_BOARD_EN))("%s is drawn whole by its compositions", (name) => {
    const page = INVITATION_BOARD_EN[name]!
    const { root } = draw(name, "luxe", INVITATION_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(readable(word))
    for (const line of page.heading.replace(/\*\*/g, "").split("\n")) expect(drawn, `${name}: the claim`).toContain(squash(line))
  })
})

describe("the luxe board's pages on luxe", () => {
  it("programme numbers its items in the deck's numerals and lights the marked one", () => {
    const zh = draw("p02-agenda").root!
    expect(Array.from(zh.querySelectorAll("[data-invitation-item] > text:first-child")).map(textOf)).toEqual(["壹", "贰", "叁", "肆"])
    expect(zh.querySelector("[data-invitation-lead='item']")!.getAttribute("data-invitation-item")).toBe("我们")
    expect(zh.querySelectorAll("[data-invitation-leader]")).toHaveLength(4)
    const en = draw("p02-agenda", "luxe", INVITATION_BOARD_EN).root!
    expect(Array.from(en.querySelectorAll("[data-invitation-item] > text:first-child")).map(textOf)).toEqual(["I", "II", "III", "IV"])
  })

  it("climb hatches the bars the second series carries on, ramps the published ones and draws the record across", () => {
    const { root, ctx } = draw("p03-price")
    const basis = Array.from(root!.querySelectorAll("[data-invitation-bar]")).map((b) => b.getAttribute("data-invitation-basis"))
    expect(basis).toEqual(["published", "published", "published", "published", "published", "published", "worked", "worked"])
    const fills = Array.from(root!.querySelectorAll("[data-invitation-basis='published'] > rect")).map((r) => r.getAttribute("fill"))
    expect(new Set(fills).size).toBe(6)
    expect(root!.querySelector("[data-invitation-basis='worked'] path")).not.toBeNull()
    expect(textOf(root!.querySelector("[data-invitation-reference] text")!)).toBe("历史最高 1,256.00 · 2026-01-29 盘中")
    expect(root!.querySelector("[data-invitation-figure] text")!.getAttribute("fill")).toBe(invitationInks(ctx).gold)
    // Every value printed with the decimals the run is written in.
    expect(textOf(root!.querySelector("[data-invitation-bar='2019'] text")!)).toBe("308.70")
  })

  it("solo hands the drawing beside the figure on, a falling line or pairs of bars", () => {
    const fall = draw("p04-retreat").root!
    expect(modules(fall)).toEqual(["solo", "descent"])
    expect(fall.querySelector("[data-invitation-level] text")!.textContent).toBe("2025 年全年均价 798.12")
    const pairs = draw("p06-flip").root!
    expect(Array.from(pairs.querySelectorAll("[data-invitation-pair]")).map((p) => p.getAttribute("data-invitation-pair"))).toEqual(["2025 年", "2026 年上半年"])
    // The hairline stands further right beside a line than beside bars, which need more room.
    const x = (root: Element) => Number(root.querySelector("[data-invitation-divider]")!.getAttribute("x"))
    expect(x(fall)).toBeGreaterThan(x(pairs))
  })

  it("balance names each side once by the figures' tag and outlines a fall dim and a rise in gold", () => {
    const { root, ctx } = draw("p07-lighter")
    expect(Array.from(root!.querySelectorAll("[data-invitation-side]")).map((s) => s.getAttribute("data-invitation-side"))).toEqual(["用金量", "消费金额"])
    const pills = Array.from(root!.querySelectorAll("[data-invitation-figure] > rect")).map((r) => r.getAttribute("stroke"))
    expect(pills[0]).not.toBe(invitationInks(ctx).gold)
    expect(pills[2]).toBe(invitationInks(ctx).gold)
  })

  it("balance outlines a fall the author calls good news in gold, and a rise called bad news dim", () => {
    const [kpi, ...rest] = INVITATION_BOARD["p07-lighter"]!.components as [{ items: Record<string, unknown>[] }, ...Component[]]
    const told = [{ ...kpi, items: kpi.items.map((it) => ({ ...it, delta_good: it.delta === "down" })) }, ...rest] as Component[]
    const { root, ctx } = draw("p07-lighter", "luxe", INVITATION_BOARD, told)
    const pills = Array.from(root!.querySelectorAll("[data-invitation-figure] > rect")).map((r) => r.getAttribute("stroke"))
    expect(pills[0]).toBe(invitationInks(ctx).gold)
    expect(pills[2]).not.toBe(invitationInks(ctx).gold)
  })

  it("swing keys each stretch by its series and leaves a house a stretch has no figures for empty", () => {
    const { root } = draw("p08-swing")
    expect(textOf(root!.querySelectorAll("[data-invitation-stretch] text")[1]!)).toBe("上一财年 ○ → ● 本财年")
    expect(root!.querySelectorAll("[data-invitation-dumbbells='金价上行时'] circle")).toHaveLength(2)
    expect(root!.querySelectorAll("[data-invitation-dumbbells='金价回落后'] circle")).toHaveLength(4)
  })

  it("ebb runs closures left in bronze and openings right in gold, each house's period under its name", () => {
    const { root, ctx } = draw("p10-stores")
    const rows = Array.from(root!.querySelectorAll("[data-invitation-row]"))
    expect(rows).toHaveLength(7)
    expect(textOf(rows[0]!.querySelectorAll("text")[1]!)).toBe("内地零售点 · 2024-03 至 2026-06")
    const zero = Number(root!.querySelector("[data-invitation-plot] > rect")!.getAttribute("x")) + 0.5
    const bar = (row: Element) => row.querySelector("rect")!
    expect(Number(bar(rows[0]!).getAttribute("x")) + Number(bar(rows[0]!).getAttribute("width"))).toBeCloseTo(zero, 0)
    expect(Number(bar(rows[6]!).getAttribute("x"))).toBeCloseTo(zero, 0)
    expect(bar(rows[6]!).getAttribute("fill")).toBe(invitationInks(ctx).gold)
  })

  it("lapse cuts the long quiet stretch and draws the milestone still to come hollow", () => {
    const { root } = draw("p12-standard")
    expect(root!.querySelector("[data-invitation-break]")).not.toBeNull()
    expect(root!.querySelector("[data-invitation-milestone='2026-10'] circle")!.getAttribute("fill")).not.toBe(root!.querySelector("[data-invitation-milestone='2013-05'] circle")!.getAttribute("fill"))
    expect(root!.querySelector("[data-invitation-lead='milestone']")!.getAttribute("data-invitation-milestone")).toBe("2026-10")
  })

  it("vitrine asks the motif to frame the half page beside its photograph and sets its claim from the left", () => {
    const { root } = draw("p16-service")
    expect(root!.querySelector("[data-frame-left]")!.getAttribute("data-frame-left")).toBe("584")
    const claim = root!.querySelector("[data-invitation-claim] text")!
    expect(claim.getAttribute("text-anchor")).toBeNull()
    expect(Number(claim.getAttribute("x"))).toBe(608)
  })

  it("reply stands the stamp down the torn stub, upright in Chinese and turned in English", () => {
    const zh = draw("p17-decide").root!
    expect(zh.querySelector("[data-invitation-stamp] [data-scroll-vertical]")).not.toBeNull()
    expect(zh.querySelectorAll("[data-invitation-tick]")).toHaveLength(5)
    const en = draw("p17-decide", "luxe", INVITATION_BOARD_EN).root!
    expect(en.querySelector("[data-invitation-stamp] [data-scroll-turned]")).not.toBeNull()
  })
})

describe("the invitation setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = INVITATION_BOARD["p10-stores"]!
    const chart = page.components[0] as Extract<Component, { type: "chart" }>
    const long = { ...chart, series: chart.series.map((s, k) => ({ ...s, data: s.data.map((d, i) => (k === 0 && i === 0 ? { ...d, x: "一个远远放不进这一栏的很长很长很长的公司名字（内地零售点 · 2024-03 至 2026-06）" } : d)) })) }
    expect(draw("p10-stores", "luxe", INVITATION_BOARD, [long], ["ebb"]).root).toBeNull()
  })

  it("offers a page with a stamp to the reply card alone", () => {
    const page = INVITATION_BOARD["p02-agenda"]!
    const { ctx } = testCtx("luxe")
    expect(compose({ components: page.components, ctx, rect: invitationBandRect(), setting: "invitation", stamp: { text: "回执" } }, INVITATION_COMPOSITIONS)).toBeNull()
  })

  it("draws only in the invitation setting", () => {
    const page = INVITATION_BOARD["p02-agenda"]!
    const { ctx } = testCtx("luxe")
    expect(compose({ components: page.components, ctx, rect: invitationBandRect(), setting: "scroll" }, INVITATION_COMPOSITIONS)).toBeNull()
  })

  it("tracks Latin a quarter as wide as Chinese", () => {
    expect(invitationTracking("年度经销商大会", 8)).toBe(8)
    expect(invitationTracking("Annual Dealer Conference", 8)).toBe(2)
  })
})
