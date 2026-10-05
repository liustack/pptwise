// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { chipInk, dossierInks, dossierSolid, heartbeatPoints } from "./dossier"
import { DOSSIER_BOARD } from "./__fixtures__/dossier-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The dossier setting (`./dossier.tsx`), clinic's 2026-10 board: the forms it
 * gives the shared compositions (proposals on cards, options with their
 * proposals as capsules, approvals on two lanes, rules on cards two by two),
 * each on the board's own page, set on clinic and on two themes that share
 * nothing with it, ember (dark, its primary the same orange as its accent)
 * and crayon (light, rounded, saturated).
 */

/** The dossier sheet's body band: x64 to x1216, y186 down to y640. */
const BAND = { x: 64, y: 186, w: 1152, h: 454 }
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false } })
const FORMS: readonly CompositionId[] = ["rows", "table", "lanes", "cards"]

/** The board's pages these forms draw, the scope page without its photograph. */
const PAGES: Record<string, { components: Component[]; kicker: string; drawnBy: CompositionId }> = {
  "p02 proposal": { ...DOSSIER_BOARD["p02-proposal"]!, drawnBy: "rows" },
  "p10 approvals": { ...DOSSIER_BOARD["p10-approvals"]!, drawnBy: "lanes" },
  "p13 formulary": { ...DOSSIER_BOARD["p13-formulary"]!, drawnBy: "table" },
  "p14 scope": {
    ...DOSSIER_BOARD["p14-scope"]!,
    components: DOSSIER_BOARD["p14-scope"]!.components.filter((c) => c.type !== "image"),
    drawnBy: "cards",
  },
}

function draw(name: string, theme = "clinic") {
  const page = PAGES[name]!
  const { ctx: base } = testCtx(theme)
  const ctx = chinese(base)
  const element = compose({ components: page.components, ctx, rect: BAND, setting: "dossier", section: page.kicker }, FORMS)
  return { ctx, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

/** The fill a text sits on: the last filled rect drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, text"))) {
    if (el === text) return ground
    if (el.tagName !== "rect" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name)))
    if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h!) ground = fill
  }
  return ground
}

describe.each(["clinic", "ember", "crayon"])("the dossier forms on %s", (theme) => {
  it.each(Object.keys(PAGES))("%s is drawn whole in its dossier form, inside the band, legible", (name) => {
    const { root, ctx } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe(PAGES[name]!.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    const page = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      const on = groundOf(root!, text, page)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect"))) {
      // An icon's own drawing is set in its own coordinates.
      if (el.closest("[transform]")) continue
      const x = Number(el.getAttribute("x"))
      const w = Number(el.getAttribute("width"))
      expect(x, name).toBeGreaterThanOrEqual(BAND.x - 1)
      expect(x + w, name).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
    }
  })
})

describe("the dossier forms on clinic", () => {
  it("rows numbers each proposal under the page's section, the marked one filled with the mark", () => {
    const { root, ctx } = draw("p02 proposal")
    expect(root!.querySelectorAll("[data-dossier-card]")).toHaveLength(3)
    for (const words of ["提议 1", "提议 2", "提议 3"]) expect(byText(root!, words), words).toBeDefined()
    expect(root!.querySelector("[data-dossier-card='marked'] rect")!.getAttribute("fill")).toBe(dossierInks(ctx).mark)
  })

  it("table sets each proposal as a capsule that says how settled it is", () => {
    const { root } = draw("p13 formulary")
    const picks = Array.from(root!.querySelectorAll("[data-dossier-pick]")).map((el) => el.getAttribute("data-dossier-pick"))
    expect(new Set(picks)).toEqual(new Set(["settled", "open", "quiet", "settled-quiet"]))
    expect(root!.querySelectorAll("[data-dossier-option='marked']")).toHaveLength(1)
  })

  it("lanes sets every approval on its lane and marks one", () => {
    const { root } = draw("p10 approvals")
    const timeline = PAGES["p10 approvals"]!.components[0] as Extract<Component, { type: "timeline" }>
    expect(root!.querySelectorAll("[data-dossier-milestone]")).toHaveLength(timeline.milestones.length)
    expect(root!.querySelectorAll("[data-dossier-milestone='marked']")).toHaveLength(1)
  })

  it("cards sets the rules two by two", () => {
    const { root } = draw("p14 scope")
    expect(root!.querySelectorAll("[data-dossier-rule]")).toHaveLength(4)
  })
})

describe("the dossier inks", () => {
  it("names each kind of source in its own ink, and a draft apart from an official file", () => {
    const { ctx } = testCtx("clinic")
    const inks = dossierInks(ctx)
    const ink = (evidence: "trial" | "label" | "company" | "press" | "draft" | "official") => chipInk({ text: "x", evidence }, ctx, inks)
    expect(ink("trial")).toBe(ink("official"))
    expect(new Set([ink("trial"), ink("label"), ink("company"), ink("press"), ink("draft")]).size).toBe(5)
    expect(ink("company")).toBe(ctx.colors.warning)
  })

  it("steps a solid fill toward the text ink until its words read on it, and turns the words over on a dark page", () => {
    for (const theme of ["clinic", "ember", "crayon"]) {
      const { ctx } = testCtx(theme)
      const inks = dossierInks(ctx)
      for (const fill of [inks.accent, inks.warning]) {
        const solid = dossierSolid(fill, inks.ink, 13)
        expect(contrastRatio(solid.words, solid.fill), `${theme} ${fill}`).toBeGreaterThanOrEqual(requiredContrastRatio(13))
      }
    }
    expect(dossierSolid(dossierInks(testCtx("clinic").ctx).accent, dossierInks(testCtx("clinic").ctx).ink, 13).words).toBe("#FFFFFF")
  })

  it("draws a heartbeat flat to its beat, one sharp rise and fall, then flat to its end", () => {
    const points = heartbeatPoints(64, 38, 34, 0.05).split(" ").map((p) => p.split(",").map(Number))
    expect(points[0]).toEqual([64, 38])
    expect(points.at(-1)).toEqual([98, 38])
    expect(Math.min(...points.map(([, y]) => y!))).toBe(38 - 22)
  })
})
