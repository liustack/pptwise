// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component, PptxIR } from "@/ir"
import { compose, type CompositionId } from "."
import { isFigure, unitWords } from "./account"
import { bridgeFloor, bridgeLevels } from "./credit"
import { catchUp, catchUpWords, markSignedFigure } from "./reckoning"
import { caseMarks } from "./casefile"
import { countUp, monthOf } from "./relay"
import { roleMove } from "./headcount"
import { figureUnit } from "./sequence"
import { markFigures } from "./requests"
import { accountBandRect, accountClaimIn, accountKickerIn, accountSourceIn } from "../account-shared"
import { ACCOUNT_COMPOSITIONS } from "../content-account-sheet"
import { ACCOUNT_BOARD, ACCOUNT_BOARD_EN, ACCOUNT_BOARD_IMAGES, ACCOUNT_COURSE, ACCOUNT_COURSE_EN, type AccountBoardPage } from "./__fixtures__/account-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages recap's 2026-10 board drew (`design/rounds/2026-10-13-recap/`),
 * each set on recap as the account sheet sets it, its section line, claim
 * and source placed by the composition, and then on three themes that share
 * nothing with it: stage (a black stage, silver, paper-white words), crayon
 * (white, bright crayon colours) and profile (warm paper, a serif heading,
 * aubergine). The setting reads the theme's tokens only, so every page must
 * draw on all four, inside the page, its text legible on what it sits on,
 * and every word the author wrote on the page. The English deck's pages are
 * drawn too.
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
const IMAGES = Object.fromEntries(ACCOUNT_BOARD_IMAGES.map((id) => [id, { src: pngOf(1920, 1280) }]))

/** The footer row the motif draws on every content page, as the face hands it to the source placer. */
const ROW = { label: "示例人物，姓名和数据均为虚构", speaker: "周启航 · 2026 年度述职", folio: 5, drawn: true }
const ROW_EN = { label: "Fictional example: the person and figures are invented", speaker: "Zhou Qihang · 2026 review", folio: 5, drawn: true }

function draw(name: string, theme = "recap", board: Record<string, AccountBoardPage> = ACCOUNT_BOARD, components?: Component[], ids: readonly CompositionId[] = ACCOUNT_COMPOSITIONS) {
  const page = board[name]!
  const english = board === ACCOUNT_BOARD_EN
  const { ctx: base, tokens } = testCtx(theme)
  const ctx: ComponentCtx = { ...base, figures: { chinese: !english, groupFour: false }, images: IMAGES }
  const ir = { course: english ? ACCOUNT_COURSE_EN : ACCOUNT_COURSE } as Pick<PptxIR, "course">
  const slide = { heading: page.heading, footnote: page.footnote, stage: page.stage }
  const element = compose(
    { components: components ?? page.components, ctx, rect: accountBandRect(), setting: "account", claim: accountClaimIn(slide, ctx), source: accountSourceIn(slide, ctx, english ? ROW_EN : ROW), kicker: accountKickerIn(ir, slide, ctx), ballot: page.ballot },
    ids,
  )
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
    if (!fill || fill === "none" || fill.startsWith("url(") || el.closest("clipPath") || el.getAttribute("fill-opacity") || el.getAttribute("opacity")) continue
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
 * on the page. Figures are looked for as their digits, since a figure is set
 * in its own face apart from its unit. Keys that only steer the drawing (a
 * status, a kind, a tone) are not words.
 */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "layout", "tone", "fit", "status", "align", "style", "key", "emphasis"].includes(key)) return
      // A value is set as its figure in the figure face and its unit apart (under the row, or beside it), and a move as its two ends round an arrow.
      const pieces = key === "value" ? value.split(/\s+|→|(?<=\d)(?=\p{L})/u) : value.split(/\n|→/u)
      for (const part of pieces.map((p) => p.replace(/\*\*/g, "").trim())) if (part) out.push(part)
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

describe.each(["recap", "stage", "crayon", "profile"])("the recap board's pages on %s", (theme) => {
  it.each(Object.keys(ACCOUNT_BOARD))("%s is drawn whole by its composition, inside the page, legible", (name) => {
    const page = ACCOUNT_BOARD[name]!
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
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word))
    expect(drawn, `${name}: the claim`).toContain(squash(page.heading.replace(/\*\*/g, "")))
    expect(drawn, `${name}: the section line`).toContain(squash(page.stage))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
    for (const choice of page.ballot?.choices ?? []) expect(drawn, `${name}: ${choice}`).toContain(squash(choice))
  })
})

describe("the recap board's pages in English", () => {
  it.each(Object.keys(ACCOUNT_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = ACCOUNT_BOARD_EN[name]!
    const { root } = draw(name, "recap", ACCOUNT_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const drawn = drawnText(root!).toLowerCase()
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word).toLowerCase())
    expect(drawn, `${name}: the claim`).toContain(squash(page.heading.replace(/\*\*/g, "")).toLowerCase())
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote).toLowerCase())
  })
})

describe("the account setting's helpers", () => {
  it("reads a figure with a currency in front of it", () => {
    expect(isFigure("RMB 31m")).toBe(true)
    expect(isFigure("3,100 万元")).toBe(true)
    expect(isFigure("52 → 34 天")).toBe(true)
    expect(isFigure("先稳苏北")).toBe(false)
  })

  it("words a chart's unit and the floor its axis starts from", () => {
    expect(unitWords("万元", 30000, true)).toBe("单位：万元　纵轴从 30,000 起")
    expect(unitWords("RMB m", 300, false)).toBe("Unit: RMB m, axis from 300")
  })

  it("starts a bridge's axis on a round number under its lowest level", () => {
    const levels = bridgeLevels([
      { label: "2025", value: 36800, kind: "total" },
      { label: "A", value: 3100 },
      { label: "B", value: -400 },
      { label: "2026", value: 44100, kind: "total" },
    ] as Parameters<typeof bridgeLevels>[0])
    expect(levels[0]).toEqual({ from: 0, to: 36800 })
    const floor = bridgeFloor(levels)
    expect(floor).toBeLessThanOrEqual(36800)
    expect(floor % 10000).toBe(0)
  })

  it("finds the quarter a year's running gap closes in", () => {
    const rows = [
      { label: "Q1", target: "96", actual: "87", gap: "−9", status: "off_track" },
      { label: "Q2", target: "105", actual: "109", gap: "+4", status: "on_track" },
      { label: "Q3", target: "99", actual: "112", gap: "+13", status: "on_track" },
    ] as Parameters<typeof catchUp>[0]
    expect(catchUp(rows)).toEqual({ index: 2, lead: 8 })
    expect(catchUpWords("三季度", 8, true)).toContain("三季度")
    expect(markSignedFigure("同比 +19.8%，去年 36,800 万元")).toBe("同比 **+19.8%**，去年 36,800 万元")
  })

  it("marks a case's rows: nothing before the speaker's own, the lead on it, quiet after", () => {
    expect(caseMarks([{}, { highlight: true }, {}])).toEqual([null, "lead", "quiet"])
  })

  it("reads a month off a date and counts a run of titles up", () => {
    expect(monthOf("3 月")).toBe(3)
    expect(monthOf("Sep")).toBe(9)
    expect(monthOf("Q3")).toBeNull()
    expect(countUp(["首批 60 家", "做到 150 家", "全部 210 家"])).toEqual([60 / 210, 150 / 210, 1])
    expect(countUp(["做到 150 家", "首批 60 家"])).toBeNull()
  })

  it("splits a role that moved at its arrow", () => {
    expect(roleMove("客户经理 → 运营商组主管")).toEqual({ from: "客户经理", to: "运营商组主管" })
    expect(roleMove("客户经理")).toBeNull()
  })

  it("reads a row value's unit and marks each figure in a mixed cell", () => {
    expect(figureUnit("11,000 万元")).toBe("万元")
    expect(figureUnit("RMB 110m")).toBe("RMB m")
    expect(markFigures("多占资金约 185 万元")).toBe("多占资金约 **185** 万元")
  })
})

describe("the account setting's limits", () => {
  it("draws only in the account setting", () => {
    const page = ACCOUNT_BOARD["p11-market"]!
    const { ctx } = testCtx("recap")
    expect(compose({ components: page.components, ctx, rect: accountBandRect(), setting: "portrait", claim: accountClaimIn(page, ctx) }, ACCOUNT_COMPOSITIONS)).toBeNull()
  })

  it("declines a roadmap whose rows are not all one figure in one unit", () => {
    const page = ACCOUNT_BOARD["p14-plan"]!
    const mixed = page.components.map((c) => (c.type === "roadmap" ? { ...c, items: c.items.map((it, i) => (i === 1 ? { ...it, rows: [{ label: "季度目标", value: "12,000 家" }] } : it)) } : c))
    expect(draw("p14-plan", "recap", ACCOUNT_BOARD, mixed, ["sequence"]).root).toBeNull()
  })

  it("declines a ballot of one choice", () => {
    const page = ACCOUNT_BOARD["p15-asks"]!
    const { ctx } = testCtx("recap")
    const slide = { heading: page.heading, stage: page.stage }
    const element = compose(
      { components: page.components, ctx, rect: accountBandRect(), setting: "account", claim: accountClaimIn(slide, ctx), kicker: accountKickerIn({ course: ACCOUNT_COURSE }, slide, ctx), ballot: { ...page.ballot!, choices: [page.ballot!.choices[0]!] } },
      ["requests"],
    )
    expect(element).toBeNull()
  })
})
