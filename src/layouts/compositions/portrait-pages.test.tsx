// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, readableBlock, requiredContrastRatio } from "../../render/ink"
import type { ComponentCtx } from "../../components/types"
import type { Component } from "@/ir"
import { compose, type CompositionId } from "."
import { focusCrop, splitFigure } from "./portrait"
import { stationFigure } from "./stations"
import { appraisalVerdict } from "./appraisal"
import { colonSplit } from "./shortfalls"
import { upliftScale } from "./uplift"
import { tenureMark } from "./tenure"
import { portraitBandRect, portraitClaimIn, portraitKickerIn, portraitSourceIn } from "../portrait-shared"
import { PORTRAIT_COMPOSITIONS } from "../content-portrait-sheet"
import { PORTRAIT_BOARD, PORTRAIT_BOARD_EN, PORTRAIT_BOARD_IMAGES, type PortraitBoardPage } from "./__fixtures__/portrait-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The pages profile's 2026-10 board drew (`design/rounds/2026-10-12-profile/`),
 * each set on profile as the portrait sheet sets it, its section line, claim
 * and source placed by the composition, and then on two themes that share
 * nothing with it: stage (a black stage, silver, paper-white words) and
 * crayon (white, bright crayon colours, a sans heading). The setting reads
 * the theme's tokens only, so every page must draw on all three, inside the
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
const IMAGES = Object.fromEntries(PORTRAIT_BOARD_IMAGES.map((id) => [id, { src: id === "portrait" ? pngOf(1086, 1448) : pngOf(1920, 680) }]))

/** The footer row the motif draws on every content page, as the face hands it to the source placer. */
const ROW = { label: "示例人物，姓名和数据均为虚构", name: "陈立行", folio: 5, drawn: true }
const ROW_EN = { label: "Fictional example: the person and figures are invented", name: "Chen Lixing", folio: 5, drawn: true }

function draw(name: string, theme = "profile", board: Record<string, PortraitBoardPage> = PORTRAIT_BOARD, components?: Component[], ids: readonly CompositionId[] = PORTRAIT_COMPOSITIONS) {
  const page = board[name]!
  const { ctx: base, tokens } = testCtx(theme)
  const chinese = !/[A-Za-z]{3}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true }, images: IMAGES }
  const slide = { heading: page.heading, footnote: page.footnote, kicker: page.kicker }
  const element = compose(
    { components: components ?? page.components, ctx, rect: portraitBandRect(), setting: "portrait", claim: portraitClaimIn(slide, ctx), source: portraitSourceIn(slide, ctx, chinese ? ROW : ROW_EN), kicker: portraitKickerIn({}, slide, ctx) },
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
 * on the page. Words broken at a colon are looked for as their two ends, as
 * the shortfalls table sets them. A chart's series name is not looked for:
 * a one-series chart under its title prints the title, not the series.
 */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "kind", "asset_id", "icon", "variant", "chart_type", "direction", "layout", "tone", "fit", "name", "duration_unit"].includes(key)) return
      for (const part of value.replace(/\*\*/g, "").split(/\n/u)) {
        for (const piece of part.split(/[：:]/u)) if (piece.trim()) out.push(piece.trim())
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

describe.each(["profile", "stage", "crayon"])("the profile board's pages on %s", (theme) => {
  it.each(Object.keys(PORTRAIT_BOARD))("%s is drawn whole by its composition, inside the page, legible", (name) => {
    const page = PORTRAIT_BOARD[name]!
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
    if (page.kicker) expect(drawn, `${name}: the section line`).toContain(squash(page.kicker))
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote))
  })
})

describe("the profile board's pages in English", () => {
  it.each(Object.keys(PORTRAIT_BOARD_EN))("%s is drawn whole by its composition", (name) => {
    const page = PORTRAIT_BOARD_EN[name]!
    const { root } = draw(name, "profile", PORTRAIT_BOARD_EN)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual(page.drawnBy)
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    // A state's name read inside a line is lowered there ("before 12%"), so the words are looked for in any case.
    const drawn = drawnText(root!).toLowerCase()
    for (const word of authoredWords(page.components)) expect(drawn, `${name}: ${word}`).toContain(squash(word).toLowerCase())
    expect(drawn, `${name}: the claim`).toContain(squash(page.heading.replace(/\*\*/g, "")).toLowerCase())
    if (page.footnote) expect(drawn, `${name}: the source`).toContain(squash(page.footnote).toLowerCase())
  })
})

describe("the profile board's pages on profile", () => {
  it("aside moves the footer into the column and credits the photograph after the label", () => {
    const { root } = draw("p02-who")
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-frame-left")).toBe("640")
    const credit = root!.querySelector("[data-portrait-credit]")!
    expect(textOf(credit)).toBe("图为 AI 生成的示意图")
    expect(credit.getAttribute("y")).toBe("685")
  })

  it("aside puts a credit too long for the footer row on its own line and keeps the rows clear of it", () => {
    const { root } = draw("p02-who", "profile", PORTRAIT_BOARD_EN)
    expect(root!.querySelector("[data-portrait-credit]")).toBeNull()
    const source = root!.querySelector("[data-portrait-source]")!
    expect(textOf(source)).toBe("AI-generated illustration")
    const rule = Array.from(root!.querySelectorAll("[data-portrait-rows] rect")).map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")))
    expect(Math.max(...rule)).toBeLessThanOrEqual(624)
  })

  it("stations reads each post's figure off its words and lights the post held now", () => {
    expect(stationFigure("积分投诉每月 1,240 件降到 380 件")).toEqual({ value: "380", unit: "件", words: "积分投诉每月 1,240 件降到 380 件" })
    expect(stationFigure("带 6 人，改储值卡、唤回沉睡会员")?.unit).toBe("人")
    expect(stationFigure("生日券核销率 12% 到 27%")).toEqual({ value: "27%", words: "生日券核销率 12% 到 27%" })
    expect(stationFigure("Sorted points complaints into 5 types")).toMatchObject({ value: "5", unit: "types" })
    expect(stationFigure("Points complaints 1,240 to 380 a month")).toEqual({ value: "380", words: "Points complaints 1,240 to 380 a month" })
    expect(stationFigure("没有数字")).toBeNull()
    const { root } = draw("p03-path")
    const lit = Array.from(root!.querySelectorAll("[data-portrait-post][data-lit]")).map((p) => p.getAttribute("data-portrait-post"))
    expect(lit).toEqual(["会员运营主管"])
  })

  it("verdicts tags every row and sets the row the page is about on the tint", () => {
    const { root } = draw("p04-fit")
    expect(Array.from(root!.querySelectorAll("[data-portrait-verdict]")).map((r) => r.getAttribute("data-portrait-verdict"))).toEqual(["懂会员业务", "数据与实验", "跨部门推动", "需求与研发协作", "产品规划"])
    expect(Array.from(root!.querySelectorAll("[data-portrait-icon]")).map((r) => r.getAttribute("data-portrait-icon"))).toContain("circle-dashed")
  })

  it("uplift scales the bars to the next fifth of a power of ten and sets the values in one column", () => {
    expect(upliftScale(11.2)).toBe(12)
    expect(upliftScale(48.6)).toBe(50)
    expect(upliftScale(0)).toBe(1)
    const { root } = draw("p07-winback")
    const bars = Array.from(root!.querySelectorAll("[data-portrait-bar] rect")).map((b) => Number(b.getAttribute("width")))
    expect(bars[0]).toBeCloseTo((11.2 / 12) * 480, 6)
    const xs = new Set(Array.from(root!.querySelectorAll("[data-portrait-bar] text:last-of-type")).map((t) => t.getAttribute("x")))
    expect(xs.size).toBe(1)
    expect(Array.from(root!.querySelectorAll("[data-portrait-bar][data-lit]")).map((b) => b.getAttribute("data-portrait-bar"))).toEqual(["招牌菜"])
  })

  it("appraisal words each criterion against the first option and lights the furthest short", () => {
    expect(appraisalVerdict(4, 3, true)).toBe("高一档")
    expect(appraisalVerdict(3, 3, true)).toBe("达标")
    expect(appraisalVerdict(1, 3, true)).toBe("差两档")
    expect(appraisalVerdict(2, 3, false)).toBe("1 short")
    expect(appraisalVerdict(4, 3, false)).toBe("1 above")
    const { root } = draw("p08-skills")
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-footer-pack")).toBe("end")
    expect(drawnText(root!)).toContain("差两档")
  })

  it("shortfalls breaks each gap and each due date at its colon", () => {
    expect(colonSplit("第 90 天：交下半年路线图初稿")).toEqual({ lead: "第 90 天", rest: "交下半年路线图初稿" })
    expect(colonSplit("Day 60: my first complete spec")).toEqual({ lead: "Day 60", rest: "my first complete spec" })
    expect(colonSplit("没有冒号")).toBeNull()
    const { root } = draw("p09-gaps")
    expect(Array.from(root!.querySelectorAll("[data-portrait-shortfall]")).map((r) => r.getAttribute("data-portrait-shortfall"))).toEqual(["产品规划", "需求与研发协作"])
  })

  it("tenure names each start on the ruler and fills the phase the page is about", () => {
    expect(tenureMark(31, "天", true)).toBe("第 31 天")
    expect(tenureMark(31, "days", false)).toBe("Day 31")
    expect(tenureMark(2, "weeks", false)).toBe("Week 2")
    expect(tenureMark(2, "sprints", false)).toBeNull()
    const { root, ctx } = draw("p10-plan")
    const lit = root!.querySelector("[data-portrait-phase][data-lit] rect")!
    expect(lit.getAttribute("fill")).toBe(readableBlock(ctx.colors.accent, 16))
    expect(drawnText(root!)).toContain(squash("第 90 天"))
  })

  it("tenure sets every period under its title when a title is a word too wide to share the line", () => {
    const { root } = draw("p10-plan", "profile", PORTRAIT_BOARD_EN)
    const periods = Array.from(root!.querySelectorAll("[data-portrait-phase] text")).filter((t) => /^Days /u.test(textOf(t)))
    expect(new Set(periods.map((t) => t.getAttribute("x"))).size).toBe(3)
    expect(periods.every((t) => Number(t.getAttribute("x")) < 1200)).toBe(true)
  })

  it("credo sets the label on the figure's baseline and keeps the footer to the column", () => {
    const { root } = draw("p11-why")
    expect(root!.querySelector("[data-gauge-module]")!.getAttribute("data-frame-right")).toBe("800")
    const grounds = root!.querySelector("[data-portrait-grounds]")!
    const [figure, , label] = Array.from(grounds.querySelectorAll("text"))
    expect(label!.getAttribute("y")).toBe(figure!.getAttribute("y"))
  })
})

describe("the portrait setting's helpers", () => {
  it("splits a figure from its unit only when one follows a space", () => {
    expect(splitFigure("13.4 万")).toEqual({ value: "13.4", unit: "万" })
    expect(splitFigure("27%")).toEqual({ value: "27%" })
    expect(splitFigure("7 → 3", "档")).toEqual({ value: "7 → 3", unit: "档" })
  })

  it("crops a photograph to its box around the focus, as object-position does", () => {
    // A 1920 by 640 photograph in a box 560 by 720 keeps its full height, a strip 533 wide around 38%.
    const [left, top, w, h] = focusCrop(pngOf(1920, 640), { w: 560, h: 720 }, 0.38, 0.5)!
    expect(top).toBe(0)
    expect(h).toBe(1)
    expect(w).toBeCloseTo((640 * 560) / 720 / 1920, 3)
    expect(left).toBeCloseTo(0.38 * (1 - w), 3)
    expect(focusCrop("not an image", { w: 560, h: 720 }, 0.5, 0.5)).toBeUndefined()
  })
})

describe("the portrait setting's limits", () => {
  it("declines a page it cannot hold rather than cutting it", () => {
    const page = PORTRAIT_BOARD["p11-why"]!
    const long = page.components.map((c) => (c.type === "paragraph" ? { ...c, text: c.text.repeat(4) } : c))
    expect(draw("p11-why", "profile", PORTRAIT_BOARD, long, ["credo"]).root).toBeNull()
  })

  it("leaves a timeline whose words hold no number to the ordinary renderer", () => {
    const page = PORTRAIT_BOARD["p03-path"]!
    const plain = page.components.map((c) => (c.type === "timeline" ? { ...c, milestones: c.milestones.map((m) => ({ ...m, desc: "积分投诉归类" })) } : c))
    expect(draw("p03-path", "profile", PORTRAIT_BOARD, plain, ["stations"]).root).toBeNull()
  })

  it("draws only in the portrait setting", () => {
    const page = PORTRAIT_BOARD["p04-fit"]!
    const { ctx } = testCtx("profile")
    expect(compose({ components: page.components, ctx, rect: portraitBandRect(), setting: "keynote", claim: portraitClaimIn(page, ctx) }, PORTRAIT_COMPOSITIONS)).toBeNull()
  })
})
