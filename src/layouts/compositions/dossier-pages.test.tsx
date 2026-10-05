// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, COMPOSITIONS, type CompositionId } from "."
import { dossierInks } from "./dossier"
import { DOSSIER_BOARD, DOSSIER_BOARD_IMAGES } from "./__fixtures__/dossier-board"
import { byText, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages clinic's 2026-10 board drew (`design/rounds/2026-10-05-clinic/`),
 * each set on clinic as the dossier sheet sets it, and then on two themes
 * that share nothing with clinic: ember (a dark page whose primary is the
 * same bright orange as its accent) and crayon (light, rounded, saturated).
 * The setting reads the theme's tokens only, so every page must draw on all
 * three, inside its band, its text legible on what it sits on.
 */

/** The dossier sheet's body band: x64 to x1216, y186 down to y640. */
const BAND = { x: 64, y: 186, w: 1152, h: 454 }
/** The room a page's tag takes at the top of the band (`DOSSIER_TAG_BAND`). */
const TAG_BAND = 40
const PIXEL = "data:image/png;base64,AAAA"
const IMAGES = Object.fromEntries(DOSSIER_BOARD_IMAGES.map((id) => [id, { src: PIXEL }]))
const chinese = (ctx: ComponentCtx): ComponentCtx => ({ ...ctx, figures: { chinese: true, groupFour: false }, images: IMAGES })

/** The dossier sheet's compositions, in its order (`content-dossier-sheet.tsx`). */
const DOSSIER_IDS: readonly CompositionId[] = [
  "inset",
  "watch",
  "rows",
  "readings",
  "docket",
  "controlled",
  "duel",
  "forest",
  "multiples",
  "fork",
  "lanes",
  "ruler",
  "dumbbells",
  "table",
  "cards",
  "gate",
]

function draw(name: string, theme = "clinic") {
  const page = DOSSIER_BOARD[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const ctx = chinese(base)
  const element = compose({ components: page.components, ctx, rect: BAND, setting: "dossier", section: page.kicker, tagBand: page.tag ? TAG_BAND : 0 }, DOSSIER_IDS)
  return { element, ctx, tokens, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))
const fillOf = (root: Element, text: string) => byText(root, text)?.getAttribute("fill")

/** The fill a text sits on: the last filled rect drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, text"))) {
    if (el === text) return ground
    if (el.tagName !== "rect" || el.hasAttribute("data-emphasis-pad")) continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || el.closest("[opacity]")) continue
    if (el.closest("[transform]") !== text.closest("[transform]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = ["x", "y", "width", "height"].map((name) => Number(el.getAttribute(name)))
    if (tx >= x! && tx <= x! + w! && ty >= y! && ty <= y! + h!) ground = fill
  }
  return ground
}

describe.each(["clinic", "ember", "crayon"])("the clinic board's pages on %s", (theme) => {
  it.each(Object.keys(DOSSIER_BOARD))("%s is drawn whole by its compositions, inside the band, legible", (name) => {
    const page = DOSSIER_BOARD[name]!
    const { root, ctx } = draw(name, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    const ground = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      const fill = text.getAttribute("fill")!
      const on = groundOf(root!, text, ground)
      const size = Number(text.getAttribute("font-size"))
      expect(contrastRatio(fill, on), `${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(requiredContrastRatio(size))
    }
    for (const el of Array.from(root!.querySelectorAll("rect"))) {
      if (el.closest("[transform]")) continue
      const x = Number(el.getAttribute("x"))
      const y = Number(el.getAttribute("y"))
      const w = Number(el.getAttribute("width"))
      const h = Number(el.getAttribute("height"))
      expect(x, name).toBeGreaterThanOrEqual(BAND.x - 1)
      expect(x + w, name).toBeLessThanOrEqual(BAND.x + BAND.w + 1)
      expect(y, name).toBeGreaterThanOrEqual(BAND.y - 1)
      expect(y + h, name).toBeLessThanOrEqual(BAND.y + BAND.h + 1)
    }
  })
})

describe("the clinic board's pages on clinic", () => {
  it("rows numbers each proposal under the page's section and marks the first card", () => {
    const { root, ctx } = draw("p02-proposal")
    expect(root!.querySelectorAll("[data-dossier-card]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-dossier-card='marked']")).toHaveLength(1)
    expect(byText(root!, "提议 1")).toBeDefined()
    expect(fillOf(root!, "依据见第 5 至 13 页")).toBeDefined()
    expect(root!.querySelector("[data-dossier-card='marked'] rect")!.getAttribute("stroke")).toBe(dossierInks(ctx).mark)
  })

  it("readings tags each figure with the kind of source it rests on and marks two parts of the share bar", () => {
    const { root } = draw("p03-why-now")
    expect(root!.querySelectorAll("[data-dossier-reading]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-dossier-reading='marked']")).toHaveLength(1)
    expect(root!.querySelectorAll("[data-dossier-part='marked']")).toHaveLength(2)
    // Three kinds of source, three inks.
    const chips = Array.from(root!.querySelectorAll("[data-dossier-reading] [data-dossier-chip] rect")).map((rect) => rect.getAttribute("stroke"))
    expect(chips).toHaveLength(3)
    expect(new Set(chips).size).toBe(3)
  })

  it("docket sets the two bad-news cases apart from the official ones", () => {
    const { root } = draw("p04-outside")
    expect(root!.querySelectorAll("[data-dossier-case]")).toHaveLength(4)
    expect(root!.querySelectorAll("[data-dossier-case='danger']")).toHaveLength(2)
    expect(root!.querySelector("[data-dossier-photo]")).not.toBeNull()
  })

  it("controlled draws each drug in the mark and each placebo as an outline, never filled", () => {
    const { root, ctx } = draw("p05-china")
    const drugs = Array.from(root!.querySelectorAll("[data-dossier-bar='drug']"))
    const controls = Array.from(root!.querySelectorAll("[data-dossier-bar='control'], [data-dossier-bar='control-tick']"))
    expect(drugs).toHaveLength(controls.length)
    for (const bar of drugs) expect(bar.getAttribute("fill")).toBe(dossierInks(ctx).mark)
    for (const bar of root!.querySelectorAll("[data-dossier-bar='control']")) expect(bar.getAttribute("fill")).toBe("none")
    // One placebo group gained weight: its bar is a tick at zero.
    expect(root!.querySelectorAll("[data-dossier-bar='control-tick']")).toHaveLength(1)
  })

  it("duel tags the share chart with the company's figures", () => {
    const { root } = draw("p06-h2h")
    expect(textOf(root!.querySelector("[data-dossier-duel-chart] [data-dossier-chip] text")!)).toBe("企业口径")
    expect(root!.querySelector("[data-dossier-duel-figures]")).not.toBeNull()
    expect(root!.querySelector("[data-dossier-duel-stats]")).not.toBeNull()
  })

  it("forest draws one interval per endpoint against a dashed line of no effect, the primary endpoint marked", () => {
    const { root } = draw("p07-select")
    expect(root!.querySelectorAll("[data-dossier-interval]")).toHaveLength(4)
    expect(root!.querySelectorAll("[data-dossier-endpoint='marked']")).toHaveLength(1)
    expect(root!.querySelector("[data-dossier-unity]")!.getAttribute("stroke-dasharray")).toBeTruthy()
    expect(root!.querySelector("[data-dossier-note]")).not.toBeNull()
  })

  it("multiples sets each drug against its placebo as a tick, one panel marked, the risks beside", () => {
    const { root } = draw("p08-safety")
    expect(root!.querySelectorAll("[data-dossier-multiple]")).toHaveLength(3)
    expect(root!.querySelectorAll("[data-dossier-multiple='marked']")).toHaveLength(1)
    expect(root!.querySelectorAll("[data-dossier-bar='drug']")).toHaveLength(root!.querySelectorAll("[data-dossier-bar='control-tick']").length)
    expect(root!.querySelector("[data-dossier-risks]")).not.toBeNull()
  })

  it("fork runs one trail in the mark to the split, then the stopped arm away from it", () => {
    const { root, ctx } = draw("p09-rebound")
    expect(root!.querySelector("[data-dossier-trail='shared']")!.getAttribute("stroke")).toBe(dossierInks(ctx).mark)
    expect(root!.querySelectorAll("[data-dossier-trail='other']").length).toBeGreaterThan(0)
    expect(root!.querySelector("[data-dossier-split]")).not.toBeNull()
    expect(root!.querySelector("[data-dossier-evidence]")).not.toBeNull()
    expect(root!.querySelector("[data-dossier-close]")).not.toBeNull()
  })

  it("lanes sets every approval on its lane and marks one", () => {
    const { root } = draw("p10-approvals")
    const milestones = DOSSIER_BOARD["p10-approvals"]!.components[0] as Extract<Component, { type: "timeline" }>
    expect(root!.querySelectorAll("[data-dossier-milestone]")).toHaveLength(milestones.milestones.length)
    expect(root!.querySelectorAll("[data-dossier-milestone='marked']")).toHaveLength(1)
  })

  it("ruler draws the breach dashed and the marked row on the tint", () => {
    const { root } = draw("p11-thresholds")
    expect(root!.querySelectorAll("[data-dossier-range='marked']")).toHaveLength(1)
    expect(root!.querySelectorAll("[data-dossier-range='breach'] [data-dossier-band='dashed']").length).toBeGreaterThan(0)
    expect(root!.querySelector("[data-dossier-review]")).not.toBeNull()
  })

  it("dumbbells draws every price before and after, the insurance reminder beside", () => {
    const { root } = draw("p12-cost")
    expect(root!.querySelectorAll("[data-dossier-dumbbell]").length).toBeGreaterThanOrEqual(3)
    expect(root!.querySelector("[data-dossier-reminder]")).not.toBeNull()
  })

  it("table sets each proposal as a capsule that says how settled it is", () => {
    const { root } = draw("p13-formulary")
    const picks = Array.from(root!.querySelectorAll("[data-dossier-pick]")).map((el) => el.getAttribute("data-dossier-pick"))
    expect(new Set(picks)).toEqual(new Set(["settled", "open", "quiet", "settled-quiet"]))
    expect(root!.querySelectorAll("[data-dossier-option='marked']")).toHaveLength(1)
  })

  it("cards sets the scope's rules two by two beside the photograph", () => {
    const { root } = draw("p14-scope")
    expect(root!.querySelectorAll("[data-dossier-rule]")).toHaveLength(4)
  })

  it("gate joins the steps that can stop the review into a stop box in the danger ink", () => {
    const { root, ctx } = draw("p15-audit")
    expect(root!.querySelectorAll("[data-dossier-step]")).toHaveLength(5)
    expect(root!.querySelectorAll("[data-dossier-step='danger']")).toHaveLength(2)
    expect(root!.querySelector("[data-dossier-gate]")).not.toBeNull()
    expect(root!.querySelector("[data-dossier-stop] rect")!.getAttribute("stroke")).toBe(dossierInks(ctx).danger)
  })

  it("rows sets the pharmacist's duties beside the photograph", () => {
    const { root } = draw("p16-pharmacist")
    expect(root!.querySelector("[data-dossier-duties]")).not.toBeNull()
  })

  it("watch sets the checks, the photograph and the reviews, one review marked", () => {
    const { root } = draw("p17-monitoring")
    expect(root!.querySelectorAll("[data-dossier-watch]")).toHaveLength(3)
    expect(root!.querySelector("[data-dossier-photo] image")).not.toBeNull()
    expect(root!.querySelectorAll("[data-dossier-review='marked']")).toHaveLength(1)
  })
})

describe("what the clinic board's compositions say they cannot drop", () => {
  it("forest sets a ratio's note on its own line, the comma between them the break", () => {
    const { root } = draw("p07-select")
    const note = byText(root!, "未达统计学显著")!
    expect(note).toBeDefined()
    const ratio = byText(root!, "0.85（0.71 至 1.01）")!
    expect(ratio.getAttribute("data-gloss-break")).toBe("，")
  })

  it("watch sets each sentence of a card as a check, its full stop the break after it", () => {
    const { root } = draw("p17-monitoring")
    const first = root!.querySelector("[data-dossier-watch]")!
    const breaks = Array.from(first.querySelectorAll("[data-dossier-check]")).map((check) => Array.from(check.querySelectorAll("text")).at(-1)!.getAttribute("data-gloss-break"))
    expect(breaks).toEqual(["。", null])
  })

  it("multiples keeps each control's tick clear of the figure over its bar", () => {
    const { root } = draw("p08-safety")
    for (const cell of Array.from(root!.querySelectorAll("[data-dossier-multiple]"))) {
      const tick = cell.querySelector("[data-dossier-bar='control-tick']")!
      const figure = Array.from(cell.querySelectorAll("text")).find((t) => t.getAttribute("font-weight") === "700" && /%$/u.test(textOf(t)))!
      expect(Number(tick.getAttribute("y"))).toBeGreaterThanOrEqual(Number(figure.getAttribute("y")) + 4)
    }
  })

  it("dumbbells breaks the grid under every figure it sets on the plot", () => {
    const { root, ctx } = draw("p12-cost")
    const pads = root!.querySelectorAll("[data-dossier-dumbbell] [data-dossier-label-pad]")
    expect(pads.length).toBe(root!.querySelectorAll("[data-dossier-dumbbell]").length * 2)
    for (const pad of Array.from(pads)) expect(pad.getAttribute("fill")).toBe(dossierInks(ctx).ground)
  })

  it("watch sets a photograph's caption under it, the picture shortened to keep its foot level with the cards'", () => {
    const page = DOSSIER_BOARD["p17-monitoring"]!
    const components = page.components.map((c) => (c.type === "image" ? { ...c, caption: "示意图：营养门诊咨询（AI 生成）" } : c))
    const { ctx } = testCtx("clinic")
    const { root } = renderNode(compose({ components, ctx: chinese(ctx), rect: BAND, setting: "dossier" }, DOSSIER_IDS)!)
    const caption = root.querySelector("[data-dossier-photo] text")!
    expect(textOf(caption)).toBe("示意图：营养门诊咨询（AI 生成）")
    const photo = root.querySelector("[data-dossier-photo] image")!
    const card = root.querySelector("[data-dossier-watch] rect")!
    expect(Number(caption.getAttribute("y"))).toBeLessThanOrEqual(Number(card.getAttribute("y")) + Number(card.getAttribute("height")))
    expect(Number(photo.getAttribute("height"))).toBeLessThan(Number(card.getAttribute("height")))
  })
})

describe("what the clinic board's compositions decline", () => {
  const OWN: CompositionId[] = ["readings", "inset", "docket", "controlled", "duel", "forest", "multiples", "fork", "ruler", "dumbbells", "gate", "watch"]
  it.each(OWN)("%s draws only in the dossier setting", (id) => {
    const { ctx } = testCtx("clinic")
    for (const page of Object.values(DOSSIER_BOARD)) {
      expect(COMPOSITIONS[id]({ components: page.components, ctx: chinese(ctx), rect: BAND })).toBeNull()
    }
  })

  it("controlled declines a control group that is not named as one", () => {
    const page = DOSSIER_BOARD["p05-china"]!
    const chart = page.components[0] as Extract<Component, { type: "chart" }>
    const unnamed = { ...chart, series: chart.series.map((s) => ({ ...s, emphasis: undefined })) }
    const { ctx } = testCtx("clinic")
    expect(COMPOSITIONS.controlled({ components: [unnamed, ...page.components.slice(1)] as Component[], ctx: chinese(ctx), rect: BAND, setting: "dossier" })).toBeNull()
  })

  it("table declines a row with no proposal to set as a capsule", () => {
    const page = DOSSIER_BOARD["p13-formulary"]!
    const table = page.components[0] as Extract<Component, { type: "comparison" }>
    const bare = { ...table, rows: table.rows.map((row, i) => (i === 0 ? { ...row, tag: undefined } : row)) }
    const { ctx } = testCtx("clinic")
    expect(COMPOSITIONS.table({ components: [bare] as Component[], ctx: chinese(ctx), rect: BAND, setting: "dossier" })).toBeNull()
  })
})
