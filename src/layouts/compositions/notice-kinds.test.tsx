// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest"
import type { Component, PptxIR, Slide } from "@/ir"
import { renderSlideSvg, validateIr } from "@/api"
import { installNodePlatform } from "@/platform/node"
import { assertSubset } from "../../render/subset-validate"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import { parseSvgRoot } from "../../render/serialize"
import type { ComponentCtx } from "../../components/types"
import { compose, type CompositionId } from "."
import { fitKeepAll, keepAllPieces } from "./type"
import { exhibitCaption, readingLabel } from "./proof"
import { rowFigure } from "./billboard"
import { noticeStatementClaim } from "../content-notice-statement"
import { noticeExhibitNumber } from "../content-notice-exhibit"
import { noticeBand } from "../content-notice-sheet"
import { NOTICE_KINDS_BOARD, NOTICE_KINDS_BOARD_EN, type NoticeBoardPage } from "./__fixtures__/notice-kinds-board"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * bulletin's statement, fact and evidence pages, drawn to the approved
 * 2026-10 kinds board (`design/rounds/2026-10-09-bulletin-kinds/`).
 *
 * The three compositions (`sentence`, `billboard`, `proof`) read the theme's
 * tokens only, so every board page is set in the notice setting on bulletin
 * and then on two themes that share nothing with it: stage (a cold black
 * page, bold white type, a silver mark) and crayon (white, a rounded sans,
 * a sky-blue primary). Each must be drawn whole, inside the page, legible
 * on what it sits on, and print every word the author wrote. Then the faces
 * are rendered as pages of a bulletin deck.
 */

beforeAll(() => {
  installNodePlatform()
})

const ALL: [string, NoticeBoardPage][] = [...Object.entries(NOTICE_KINDS_BOARD), ...Object.entries(NOTICE_KINDS_BOARD_EN).map(([k, v]) => [`en-${k}`, v] as [string, NoticeBoardPage])]

/** A page set in the notice setting the way its face sets it, its claim placed by the statement face. */
function draw(page: NoticeBoardPage, theme = "bulletin", components: Component[] = page.components) {
  const { ctx: base } = testCtx(theme)
  const chinese = !/[A-Za-z]{4}/u.test(page.heading)
  const ctx: ComponentCtx = { ...base, figures: { chinese, groupFour: true } }
  const ids: CompositionId[] = [page.drawnBy]
  const rect = page.drawnBy === "sentence" ? { x: 80, y: 110, w: 1120, h: 500 } : noticeBand({ footnote: page.footnote }, ctx).rect
  const element = compose({ components, ctx, rect, setting: "notice", claim: noticeStatementClaim(page.heading, ctx), exhibitNumber: 1 }, ids)
  return { element, ctx, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

const modules = (root: Element) => Array.from(root.querySelectorAll("[data-gauge-module]")).map((el) => el.getAttribute("data-gauge-module"))
const squash = (s: string) => s.replace(/\s+/g, "")
const drawnText = (root: Element) => squash(texts(root).map((t) => textOf(t)).join(""))

function boxOf(el: Element): [number, number, number, number] | null {
  const n = (name: string) => Number(el.getAttribute(name))
  if (el.tagName === "rect") return [n("x"), n("y"), n("width"), n("height")]
  if (el.tagName === "circle") return [n("cx") - n("r"), n("cy") - n("r"), 2 * n("r"), 2 * n("r")]
  return null
}

/** The fill a text sits on: the last opaque rectangle or disc drawn before it under its first line, or the page. */
function groundOf(root: Element, text: Element, page: string): string {
  let ground = page
  for (const el of Array.from(root.querySelectorAll("rect, circle, text"))) {
    if (el === text) return ground
    if (el.tagName === "text") continue
    const fill = el.getAttribute("fill")
    if (!fill || fill === "none" || fill.startsWith("url(") || el.closest("[data-mark-status]") || el.closest("[data-plot-legend]")) continue
    const size = Number(text.getAttribute("font-size"))
    const anchor = text.getAttribute("text-anchor")
    const tx = Number(text.getAttribute("x")) + (anchor === "middle" ? 0 : anchor === "end" ? -2 : 2)
    const ty = Number(text.getAttribute("y")) - size * 0.3
    const [x, y, w, h] = boxOf(el)!
    if (tx >= x && tx <= x + w && ty >= y && ty <= y + h) ground = fill
  }
  return ground
}

/** The words a page's components carry, as a reader looks for them. A figure and its unit are looked for apart. */
function authoredWords(components: readonly Component[]): string[] {
  const out: string[] = []
  const walk = (value: unknown, key = "") => {
    if (typeof value === "string") {
      if (["type", "chart_type", "key", "align", "status", "emphasis", "y_unit"].includes(key)) return
      const plain = value.replace(/\*\*/g, "").trim()
      if (plain) out.push(plain)
      return
    }
    if (Array.isArray(value)) value.forEach((v) => walk(v, key))
    else if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) walk(v, k)
  }
  for (const c of components) walk(c)
  return out
}

describe.each(["bulletin", "stage", "crayon"])("the kinds board's pages on %s", (theme) => {
  it.each(ALL)("%s is drawn whole by its composition, inside the page, legible", (name, page) => {
    const { root, ctx } = draw(page, theme)
    expect(root, name).not.toBeNull()
    expect(modules(root!)).toEqual([page.drawnBy])
    expect(() => assertSubset(root!)).not.toThrow()
    expect(root!.querySelector("[data-truncated]")).toBeNull()
    expect(root!.querySelector("[data-dropped]")).toBeNull()
    const page0 = ctx.defaultBg ?? ctx.colors.bg
    for (const text of texts(root!)) {
      if (!textOf(text)) continue
      const fill = text.getAttribute("fill")!
      const on = groundOf(root!, text, page0)
      const need = requiredContrastRatio(Number(text.getAttribute("font-size")))
      expect(contrastRatio(fill, on), `${theme} ${name} ${textOf(text)}: ${fill} on ${on}`).toBeGreaterThanOrEqual(need)
    }
    for (const el of Array.from(root!.querySelectorAll("rect, circle"))) {
      const [x, y, w, h] = boxOf(el)!
      expect(x, name).toBeGreaterThanOrEqual(0)
      expect(x + w, name).toBeLessThanOrEqual(1280)
      expect(y, name).toBeGreaterThanOrEqual(0)
      expect(y + h, name).toBeLessThanOrEqual(720)
    }
    const drawn = drawnText(root!)
    for (const word of authoredWords(page.components)) {
      const kpi = page.components[0]?.type === "kpi_cards"
      // The billboard sets a lead figure's unit apart from its digits.
      expect(drawn, `${name}: ${word}`).toContain(squash(kpi && word === "%" ? "%" : word))
    }
    if (page.drawnBy === "sentence") expect(drawn, `${name}: the sentence`).toContain(squash(page.heading.replace(/\*\*/g, "")))
  })
})

describe("sentence", () => {
  it("sets the claim at 60px kept whole word by word, broken at the comma, its marked words in the emphasis ink", () => {
    const { root, ctx } = draw(NOTICE_KINDS_BOARD["p02-share"]!)
    const lines = Array.from(root!.querySelectorAll("[data-notice-statement-claim] text"))
    expect(lines.map(textOf)).toEqual(["份额在挪：比亚迪少了约 4.5 个点，", "拿走份额的是新势力"])
    expect(lines.every((t) => t.getAttribute("font-size") === "60" && t.getAttribute("font-weight") === "700")).toBe(true)
    const lit = Array.from(root!.querySelectorAll("[data-notice-statement-claim] tspan")).find((t) => t.textContent === "新势力")!
    expect(lit.getAttribute("fill")).toBe(ctx.colors.emphasisInk)
    // The support keeps 「吉利、长安、特斯拉中国」 together.
    const support = Array.from(root!.querySelectorAll("[data-notice-sentence-support] text")).map(textOf)
    expect(support[1]).toMatch(/^吉利、长安、特斯拉中国/u)
  })

  it("stands the block centred in its band: one line sits lower than two", () => {
    const top = (name: string) => Number(draw(NOTICE_KINDS_BOARD[name]!).root!.querySelector("[data-notice-sentence-bar]")!.getAttribute("y"))
    // One line and one support line: 203px of block in a 500px band from y110.
    expect(top("p01-target")).toBe(Math.round(110 + (500 - 203) / 2))
    expect(top("p02-share")).toBe(Math.round(110 + (500 - 317) / 2))
  })

  it("declines anything but a claim and one paragraph", () => {
    const page = NOTICE_KINDS_BOARD["p01-target"]!
    expect(draw(page, "bulletin", [...page.components, ...page.components]).element).toBeNull()
    expect(draw(page, "bulletin", [{ type: "bullets", items: ["一", "二"] }]).element).toBeNull()
    // The claim alone is a page too: the bar and the sentence, no rule.
    const alone = draw(page, "bulletin", []).root!
    expect(alone.querySelector("[data-notice-sentence-support]")).toBeNull()
  })
})

describe("billboard", () => {
  it("sets the figure at 210px closed up 6px, its unit at 60px, and three figures under a hairline", () => {
    const { root, ctx } = draw(NOTICE_KINDS_BOARD["p04-market"]!)
    const figure = root!.querySelector("[data-notice-billboard-figure]")!
    expect([figure.getAttribute("font-size"), figure.getAttribute("font-weight"), figure.getAttribute("fill")]).toEqual(["210", "700", ctx.colors.primary])
    expect(textOf(figure)).toBe("−23.6%")
    const tspans = Array.from(figure.querySelectorAll("tspan"))
    expect(tspans.slice(0, -1).every((t) => t.getAttribute("dx") === "-6")).toBe(true)
    expect([tspans.at(-1)!.getAttribute("font-size"), tspans.at(-1)!.getAttribute("dx")]).toEqual(["60", "18"])
    expect(root!.querySelectorAll("[data-notice-billboard-cell]")).toHaveLength(3)
    expect(rowFigure({ value: "105.8", unit: "万辆" })).toBe("105.8 万辆")
    expect(rowFigure({ value: "58.4", unit: "%" })).toBe("58.4%")
  })

  it("declines a figure with a note or an arrow, and a second component", () => {
    const page = NOTICE_KINDS_BOARD["p03-export"]!
    const kpi = page.components[0] as Extract<Component, { type: "kpi_cards" }>
    expect(draw(page, "bulletin", [{ ...kpi, items: [{ ...kpi.items[0]!, note: "注" }, ...kpi.items.slice(1)] }]).element).toBeNull()
    expect(draw(page, "bulletin", [{ ...kpi, items: [{ ...kpi.items[0]!, delta: "up" }] }]).element).toBeNull()
    expect(draw(page, "bulletin", [kpi, { type: "paragraph", text: "多一段" }]).element).toBeNull()
  })
})

describe("proof", () => {
  const chartPage = NOTICE_KINDS_BOARD["p05-september"]!
  const tablePage = NOTICE_KINDS_BOARD["p06-players"]!
  type Chart = Extract<Component, { type: "chart" }>
  type Table = Extract<Component, { type: "data_table" }>
  const ring = (root: Element) => {
    const r = root.querySelector("[data-notice-proof-ring] rect")!
    return ["x", "y", "width", "height"].map((a) => Math.round(Number(r.getAttribute(a))))
  }

  it("rings the category of the marked bar, as the board draws it, and leads to the reading level with it", () => {
    const { root, markup } = draw(chartPage)
    // The board's ring stands at (564, 284) 240 by 324: the engine centres it on the group.
    expect(ring(root!)).toEqual([561, 284, 240, 324])
    const disc = root!.querySelector("[data-notice-proof-ring] circle")!
    expect([disc.getAttribute("cx"), disc.getAttribute("cy")]).toEqual(["884", "310"])
    expect(Array.from(root!.querySelectorAll("[data-notice-proof-reading] text")).map(textOf)).toEqual(["9 月 1–27 日零售同比", "−29%，比 7、8 月降得更深"])
    expect(markup).toContain("图 1\u3000乘用车国内零售，万辆")
  })

  it("moves the ring with the author's mark", () => {
    const chart = chartPage.components[0] as Chart
    const moved: Chart = {
      ...chart,
      series: chart.series.map((s) => ({ ...s, data: s.data.map((p) => ({ ...p, emphasis: s === chart.series[1] && p.x === "7 月" ? true : undefined })) })),
    }
    const { root } = draw(chartPage, "bulletin", [moved, ...chartPage.components.slice(1)])
    expect(ring(root!)[0]).toBe(561 - 2 * Math.round(692 / 3))
    const table = tablePage.components[0] as Table
    const at = (row: number) => draw(tablePage, "bulletin", [{ ...table, rows: table.rows.map((r, i) => ({ ...r, emphasis: i === row ? ("highlight" as const) : undefined })) }, ...tablePage.components.slice(1)])
    expect(ring(at(0).root!)).toEqual([104, 286, 692, 46])
    // A row so low the reading and its notes cannot stand level with it: the page goes to the sheet.
    expect(at(5).element).toBeNull()
    expect(ring(draw(tablePage).root!)).toEqual([104, 332, 692, 46])
  })

  it("declines a chart with nothing marked, two marked rows, or a reading too long for the column", () => {
    const chart = chartPage.components[0] as Chart
    const unmarked: Chart = { ...chart, series: chart.series.map((s) => ({ ...s, data: s.data.map(({ emphasis: _e, ...p }) => p) })) }
    expect(draw(chartPage, "bulletin", [unmarked, ...chartPage.components.slice(1)]).element).toBeNull()
    const table = tablePage.components[0] as Table
    const twice: Table = { ...table, rows: table.rows.map((r, i) => ({ ...r, emphasis: i < 2 ? ("highlight" as const) : undefined })) }
    expect(draw(tablePage, "bulletin", [twice, ...tablePage.components.slice(1)]).element).toBeNull()
    const long: Component = { type: "paragraph", text: "很长的结论".repeat(12) }
    expect(draw(chartPage, "bulletin", [chart, long]).element).toBeNull()
  })

  it("names the exhibit in the deck's language and numbers it across the deck", () => {
    expect(exhibitCaption("figure", 2, true)).toBe("图 2")
    expect(exhibitCaption("table", 1, false)).toBe("Exhibit 1")
    expect(readingLabel(true)).toBe("怎么看")
    expect(readingLabel(false)).toBe("How to read it")
    const slide = (page: NoticeBoardPage): Slide => ({ type: "content", kind: page.kind, heading: page.heading, components: page.components }) as Slide
    const ir = { slides: [slide(chartPage), slide(tablePage), slide(chartPage), slide(tablePage)] }
    expect([0, 1, 2, 3].map((i) => noticeExhibitNumber(ir, i, true))).toEqual([1, 1, 2, 2])
    expect([0, 1, 2, 3].map((i) => noticeExhibitNumber(ir, i, false))).toEqual([1, 2, 3, 4])
  })
})

describe("keep-all wrapping", () => {
  const spec = { width: 300, size: 20, lineHeight: 30, maxLines: 3, fontFamily: "Microsoft YaHei", bold: false }
  it("breaks only at a space or after a clause mark, never after 「、」", () => {
    expect(keepAllPieces("比亚迪少了约 4.5 个点，拿走份额")).toEqual(["比亚迪少了约 ", "4.5 ", "个点，", "拿走份额"])
    expect(keepAllPieces("吉利、长安、特斯拉中国也各让出")).toEqual(["吉利、长安、特斯拉中国也各让出"])
  })
  it("keeps an author's line break, and wraps the ordinary way when a piece is wider than the measure", () => {
    expect(fitKeepAll("第一行\n第二行", spec)!.lines).toEqual(["第一行", "第二行"])
    expect(fitKeepAll("没有标点的一长串汉字一直写到超过整行宽度为止还在继续", spec)!.lines.length).toBeGreaterThan(1)
    expect(fitKeepAll("短句，短句，短句，短句，短句，短句，短句，短句，短句，短句，短句，短句", { ...spec, maxLines: 2 })).toBeNull()
  })
})

describe("the three faces in a bulletin deck", () => {
  const deck = (slides: Slide[]): PptxIR => ({ version: "5", narrative: { strategy: "pyramid", pacing: "balanced", audience: "executive" }, theme: { id: "bulletin" }, meta: {}, assets: { images: {} }, slides }) as unknown as PptxIR
  const asSlide = (page: NoticeBoardPage, extra: Partial<Slide> = {}): Slide => ({ type: "content", kind: page.kind, heading: page.heading, components: page.components, footnote: page.footnote, ...extra }) as Slide
  const pages = Object.values(NOTICE_KINDS_BOARD).map((p) => asSlide(p))

  it("validates and draws each page on its own face", () => {
    const ir = deck(pages)
    expect(validateIr(ir).errors).toEqual([])
    pages.forEach((_slide, i) => {
      const root = parseSvgRoot(renderSlideSvg(ir, i))
      const page = Object.values(NOTICE_KINDS_BOARD)[i]!
      expect(root.querySelector(`[data-gauge-module="${page.drawnBy}"]`), page.heading).not.toBeNull()
      // The statement has no claim header, the other two keep it.
      expect(root.querySelector("[data-notice-head]") === null, page.heading).toBe(page.drawnBy === "sentence")
      expect(root.querySelector("[data-notice-source]"), page.heading).not.toBeNull()
    })
  })

  it("hands a page its composition cannot hold to the notice sheet", () => {
    const statement = asSlide(NOTICE_KINDS_BOARD["p01-target"]!, { components: [{ type: "bullets", items: ["一条", "两条"] }] })
    const subheaded = asSlide(NOTICE_KINDS_BOARD["p04-market"]!, { subheading: "副题" })
    const ir = deck([statement, subheaded])
    expect(validateIr(ir).errors).toEqual([])
    for (const i of [0, 1]) {
      const root = parseSvgRoot(renderSlideSvg(ir, i))
      expect(root.querySelector("[data-notice-head]")).not.toBeNull()
      expect(root.querySelector('[data-gauge-module="sentence"], [data-gauge-module="billboard"]')).toBeNull()
    }
    expect(parseSvgRoot(renderSlideSvg(ir, 1)).textContent).toContain("副题")
  })
})
