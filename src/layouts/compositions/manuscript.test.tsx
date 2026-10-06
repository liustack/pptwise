// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { Component, PptxIR, Slide } from "@/ir"
import { contrastRatio } from "../../render/ink"
import { decimalsOf, exhibitWord, figureText, fitBroken, fitManuscript, hasSuperscript, manuscriptInks, paintManuscript, splitLabel, splitSentenceEnd, withUnit } from "./manuscript"
import { ManuscriptNotes, exhibitLabels, fitManuscriptNotes, manuscriptBodyRect, manuscriptSection, noteLines, sectionPages } from "../manuscript-shared"
import { renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

/*
 * The manuscript setting's shared pieces (`./manuscript.tsx`) and the frame
 * every thesis content page shares (`../manuscript-shared.tsx`): the inks it
 * derives from a theme's tokens, how it reads and breaks the author's words,
 * the notes over the folio, and how it numbers figures and tables across a
 * deck.
 */

describe("manuscriptInks", () => {
  it("reads thesis's board colours from its tokens", () => {
    const inks = manuscriptInks(testCtx("thesis").ctx)
    expect(inks.ground).toBe("#F5F3EC")
    expect(inks.card).toBe("#FCFBF6")
    expect(inks.deep).toBe("#0E6245")
    expect(inks.gold).toBe("#A8861D")
    expect(inks.ink).toBe("#23251F")
    expect(inks.muted).toBe("#62655B")
    expect(inks.indigo).toBe("#3F5B8C")
    expect(inks.pebble).toBe("#8A8471")
  })

  it("takes another theme's tokens whole, a dark one included, and keeps its gold text readable", () => {
    for (const theme of ["rally", "brief"]) {
      const { ctx, tokens } = testCtx(theme)
      const inks = manuscriptInks(ctx)
      expect(inks.ground).toBe(tokens.colors.bg)
      expect(inks.gold).toBe(tokens.colors.accent)
      expect(contrastRatio(inks.goldText, inks.ground)).toBeGreaterThanOrEqual(4.5)
    }
  })
})

describe("reading the author's words", () => {
  it("splits a line's label at its first colon in either script", () => {
    expect(splitLabel("对象：受新规约束的 50 至 60 岁城镇职工")).toEqual({ name: "对象", sep: "：", rest: "受新规约束的 50 至 60 岁城镇职工" })
    expect(splitLabel("Who: urban employees aged 50 to 60")).toEqual({ name: "Who", sep: ": ", rest: "urban employees aged 50 to 60" })
    expect(splitLabel("no label here")).toBeNull()
  })

  it("splits a sentence off what follows it", () => {
    expect(splitSentenceEnd("更可能在业。依据：第 8 页")).toEqual({ lead: "更可能在业", sep: "。", rest: "依据：第 8 页" })
    expect(splitSentenceEnd("More likely in work. Basis: page 8")).toEqual({ lead: "More likely in work", sep: ". ", rest: "Basis: page 8" })
  })

  it("knows a note's superscript", () => {
    expect(hasSuperscript("会不会更可能在业？¹")).toBe(true)
    expect(hasSuperscript("会不会更可能在业？")).toBe(false)
  })

  it("prints figures as the board does: a true minus, a plus when asked, the run's decimals, a unit after a space", () => {
    expect(decimalsOf([20.9, 13.4, 6, 1.45])).toBe(2)
    expect(figureText(-47.8, 1)).toBe("−47.8")
    expect(figureText(20.9, 1, { plus: true })).toBe("+20.9")
    expect(figureText(5, 0)).toBe("5")
    expect(withUnit("5", "个月")).toBe("5 个月")
    expect(withUnit("23.0", "%")).toBe("23.0%")
  })

  it("numbers an exhibit in the deck's language", () => {
    expect(exhibitWord("figure", 3, true)).toBe("图 3")
    expect(exhibitWord("table", 1, false)).toBe("Table 1")
  })
})

describe("fitBroken", () => {
  const { ctx } = testCtx("thesis")
  const spec = { width: 260, size: 13, lineHeight: 20, maxLines: 2 }

  it("keeps a line that fits whole", () => {
    expect(fitBroken("每 4 个出生月延 1 个月", spec, ctx)!.layout.lines).toHaveLength(1)
  })

  it("breaks a line that does not at its first comma, the comma declared rather than printed", () => {
    const fitted = fitBroken("每 4 个出生月延 1 个月，1965 年 1 月起，1976 年 9 月到位", spec, ctx)!
    expect(fitted.sep).toBe("，")
    expect(fitted.layout.lines[0]).toBe("每 4 个出生月延 1 个月")
    expect(fitted.layout.lines[1]).toBe("1965 年 1 月起，1976 年 9 月到位")
  })

  it("returns null when no break fits", () => {
    expect(fitBroken("一句没有任何标点可以断开而且远远超过两行宽度的很长很长很长很长很长很长很长很长很长很长很长很长的话", spec, ctx)).toBeNull()
  })
})

describe("paintManuscript", () => {
  it("lights a note's superscript in emerald bold", () => {
    const { ctx } = testCtx("thesis")
    const layout = fitManuscript("会不会更可能在业？¹", { width: 600, size: 30, lineHeight: 42, maxLines: 1, serif: true }, ctx)!
    const { root } = renderNode(<g>{paintManuscript(layout, { ctx, x: 0, top: 0, serif: true, fill: manuscriptInks(ctx).ink })}</g>)
    const lit = Array.from(root.querySelectorAll("tspan")).find((t) => t.textContent === "¹")!
    expect(lit.getAttribute("fill")).toBe(manuscriptInks(ctx).deep)
    expect(lit.getAttribute("font-weight")).toBe("700")
  })
})

describe("the notes over the folio", () => {
  const { ctx } = testCtx("thesis")
  const footnote = "Hesketh 等（2025），Journal of Population Economics\nRabaté 和 Rochut（2020），Journal of Public Economics"

  it("reads one note a line, and numbers them in emerald", () => {
    expect(noteLines({ footnote })).toHaveLength(2)
    const notes = fitManuscriptNotes({ footnote }, ctx)!
    const { root } = renderNode(<ManuscriptNotes notes={notes} ctx={ctx} />)
    const numbers = texts(root).filter((t) => /^\d$/.test(textOf(t)))
    expect(numbers.map(textOf)).toEqual(["1", "2"])
    for (const n of numbers) expect(n.getAttribute("fill")).toBe(manuscriptInks(ctx).deep)
    // The last note's line ends on y676, the rule over the first a few pixels above it.
    expect(notes.top + 2 * 17).toBe(676)
    expect(manuscriptBodyRect(notes).y + manuscriptBodyRect(notes).h).toBe(notes.ruleY - 16)
  })

  it("keeps three notes and declares the rest dropped", () => {
    const notes = fitManuscriptNotes({ footnote: "一\n二\n三\n四" }, ctx)!
    expect(notes.notes).toHaveLength(3)
    const { root } = renderNode(<ManuscriptNotes notes={notes} ctx={ctx} />)
    expect(root.querySelector("[data-dropped-kind='footnote']")!.getAttribute("data-dropped")).toBe("1")
  })

  it("leaves the body its full band on a page without notes", () => {
    expect(manuscriptBodyRect(null)).toEqual({ x: 64, y: 168, w: 1152, h: 480 })
  })
})

describe("numbering across the deck", () => {
  const chart = (title?: string): Component => ({ type: "chart", chart_type: "line", ...(title ? { title } : {}), series: [{ name: "a", data: [{ x: "1", y: 1 }, { x: "2", y: 2 }] }] }) as Component
  const table = (title?: string): Component => ({ type: "data_table", ...(title ? { title } : {}), columns: [{ key: "a", label: "A" }], rows: [{ cells: { a: "1" } }] }) as Component
  const photo: Component = { type: "image", asset_id: "x", caption: "示意" } as Component
  const slides = [
    { type: "content", kind: "photo", heading: "一", components: [photo] },
    { type: "content", heading: "二", components: [chart("图题"), table("表题")] },
    { type: "content", heading: "三", components: [chart(), table("另一张表")] },
    { type: "content", heading: "四", components: [chart("第二张图")] },
  ] as unknown as Slide[]
  const ir = { slides } as Pick<PptxIR, "slides">

  it("counts titled figures and tables on the pages before and in reading order", () => {
    expect([...exhibitLabels(ir, 0, true).values()]).toEqual(["图 1"])
    expect([...exhibitLabels(ir, 1, true).values()]).toEqual(["图 2", "表 1"])
    expect([...exhibitLabels(ir, 2, true).values()]).toEqual(["表 2"])
    expect([...exhibitLabels(ir, 3, false).values()]).toEqual(["Figure 3"])
  })

  it("finds a section's number and the pages it runs over", () => {
    const course = { stages: [{ label: "问题与背景" }, { label: "文献与缺口" }] }
    expect(manuscriptSection({ course } as Pick<PptxIR, "course">, { stage: "文献与缺口" })).toEqual({ n: 2, label: "文献与缺口" })
    const staged = { slides: [{ type: "cover" }, { type: "content", stage: "问题与背景" }, { type: "content", stage: "问题与背景" }, { type: "chapter", stage: "文献与缺口" }, { type: "content", stage: "文献与缺口" }] } as unknown as Pick<PptxIR, "slides">
    expect(sectionPages(staged, "问题与背景")).toEqual({ first: 2, last: 3 })
    expect(sectionPages(staged, "文献与缺口")).toEqual({ first: 5, last: 5 })
    expect(sectionPages(staged, "计划")).toBeNull()
  })
})
