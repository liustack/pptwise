// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveFontFace, resolveFontStack } from "../render/fonts"
import { resolveStyle } from "../themes"
import { THEME_DEFINITIONS } from "../themes/definitions"
import { memoInks } from "../layouts/compositions/memo"
import { VermilionMotif } from "./motif-vermilion-motif"
import { MemoMotif } from "./motif-memo-motif"
import type { PptxIR, Slide } from "@/ir"

/*
 * memo-motif，2026-10 定稿（`design/rounds/2026-10-05-memo/`）：封面以外每页
 * 左上一行拉开字距的 MEMORANDUM 和一道红双线，内容页在 deck 要页脚时再打
 * 右上的事由和底下的页脚。
 */

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const ALL_SLIDES = [coverSlide, chapterSlide, contentSlide, endingSlide]

/** 内容页的标题区从 y84 起（页边栏与标题），正文带 y186–640。 */
const TITLE_TOP = 84
const BODY_ZONE = { top: 186, bottom: 640 }

const FOOTER = { page_number: true, organization: true, label: "四天工作制试点 · 决定", draft: "讨论稿", confidentiality: "footer" }

const ir = (theme: string, extra: Partial<PptxIR> = {}): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: { organization: "管理层 · 人力资源部", confidentiality: "confidential" },
    assets: { images: {} },
    slides: [coverSlide, contentSlide, chapterSlide, contentSlide, endingSlide],
    ...extra,
  } as unknown as PptxIR)

function render(body: React.ReactElement): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(theme: string, slide: Slide, extra: Partial<PptxIR> = {}, index?: number) {
  const ctx = boundThemeCtx(theme, {})
  return { ...render(<MemoMotif ir={ir(theme, extra)} slide={slide} ctx={ctx} index={index} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

function parts(root: Element) {
  const rects = Array.from(root.querySelectorAll("rect"))
  const texts = Array.from(root.querySelectorAll("text"))
  return {
    thickRule: rects.find((r) => r.getAttribute("height") === "2")!,
    thinRule: rects.find((r) => r.getAttribute("height") === "1")!,
    eyebrow: texts.find((t) => t.textContent === "MEMORANDUM")!,
    runningHead: root.querySelector("[data-memo-running-head]"),
    folio: root.querySelector('[data-footer="row"]'),
    texts,
    rects,
  }
}

describe("MemoMotif（打字机备忘录的页眉与页脚）", () => {
  it("封面整片不画：公文头由 memo-cover 自己画", () => {
    const { root } = draw("memo", coverSlide)
    expect(root.children).toHaveLength(0)
  })

  it("章节、内容、结尾都画红双线和 MEMORANDUM", () => {
    for (const slide of [chapterSlide, contentSlide, endingSlide]) {
      const p = parts(draw("memo", slide).root)
      expect(p.thickRule, `no thick rule on ${slide.type}`).toBeTruthy()
      expect(p.thinRule, `no thin rule on ${slide.type}`).toBeTruthy()
      expect(p.eyebrow, `no MEMORANDUM on ${slide.type}`).toBeTruthy()
    }
  })

  it("双线几何：x64→1216，2px 在 y48，1px 在 y53", () => {
    const { thickRule, thinRule } = parts(draw("memo", contentSlide).root)
    for (const r of [thickRule, thinRule]) {
      expect(num(r, "x")).toBe(64)
      expect(num(r, "width")).toBe(1216 - 64)
    }
    expect([num(thickRule, "y"), num(thinRule, "y")]).toEqual([48, 53])
  })

  it("MEMORANDUM 是等宽、加粗、12px、拉开 6px 字距，基线在双线之上", () => {
    const t = resolveStyle("memo")
    const { eyebrow } = parts(draw("memo", contentSlide).root)
    expect(eyebrow.getAttribute("font-family")).toBe(resolveFontStack(t.fonts.mono ?? [], "mono"))
    expect(resolveFontFace(t.fonts.mono ?? [], "mono")).toBe("Courier New")
    expect(eyebrow.getAttribute("font-size")).toBe("12")
    expect(eyebrow.getAttribute("font-weight")).toBe("700")
    expect(eyebrow.getAttribute("data-tracking")).toBe("6")
    expect(eyebrow.getAttribute("data-font-floor-exempt")).toBe("memo-spec")
    expect(num(eyebrow, "x")).toBe(64)
    expect(num(eyebrow, "y")).toBeLessThan(48)
  })

  it("颜色一律读 ctx：双线和眉字走印章红，页脚走灰", () => {
    const { root, ctx } = draw("memo", contentSlide, { footer: FOOTER } as Partial<PptxIR>, 1)
    const inks = memoInks(ctx)
    const p = parts(root)
    expect(p.thickRule.getAttribute("fill")).toBe(inks.mark)
    expect(p.thinRule.getAttribute("fill")).toBe(inks.mark)
    expect(p.eyebrow.getAttribute("fill")).toBe(inks.mark)
    for (const text of Array.from(p.folio!.querySelectorAll("text"))) expect(text.getAttribute("fill")).not.toBe(inks.mark)
  })

  it("换一家 tokens 渲染时颜色跟着换，memo 的色一处不残留", () => {
    const journal = resolveStyle("journal")
    const ctx = buildCtx(journal, {})
    const { markup } = render(<MemoMotif ir={ir("journal")} slide={contentSlide} ctx={ctx} />)
    for (const hex of ["#F6F1E7", "#FBF8F1", "#A63A2B", "#675E51", "#E4DFD2"]) {
      expect(markup, `memo token ${hex} leaked into the journal render`).not.toContain(hex)
    }
  })

  it("印章红只成线不成面：没有高过 2px 的红色块", () => {
    for (const slide of ALL_SLIDES) {
      const { root, ctx } = draw("memo", slide)
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        if (r.getAttribute("fill") !== memoInks(ctx).mark) continue
        expect(num(r, "height"), r.outerHTML).toBeLessThanOrEqual(2)
      }
    }
  })

  it("deck 不要页脚时：没有事由、没有页脚、没有页码字段", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("memo", slide)
      const p = parts(root)
      expect(p.runningHead).toBeNull()
      expect(p.folio).toBeNull()
      expect(root.querySelector("[data-field]")).toBeNull()
    }
  })

  it("deck 要页脚时：内容页右上打事由，页脚左边发文部门，右边「第 N 页 共 M 页」，N 是页码字段", () => {
    const { root } = draw("memo", contentSlide, { footer: FOOTER } as Partial<PptxIR>, 3)
    const p = parts(root)
    expect(p.runningHead!.textContent).toBe("四天工作制试点 · 决定")
    expect(p.runningHead!.getAttribute("text-anchor")).toBe("end")
    expect(num(p.runningHead!, "x")).toBe(1216)
    const words = Array.from(p.folio!.querySelectorAll("text")).map((t) => t.textContent)
    expect(words).toEqual(["管理层 · 人力资源部", "讨论稿 · 内部资料，请勿外传", "第", "4", "页 共 5 页"])
    const number = p.folio!.querySelector('[data-field="slidenum"]')!
    expect(number.textContent).toBe("4")
    const after = Array.from(p.folio!.querySelectorAll("text")).at(-1)!
    expect(num(after, "x")).toBeLessThan(1216)
    for (const text of Array.from(p.folio!.querySelectorAll("text"))) {
      expect(text.getAttribute("font-size")).toBe("12")
      expect(text.getAttribute("data-font-floor-exempt")).toBe("memo-spec")
    }
  })

  it("英文 deck 写 Page N of M", () => {
    const en = { footer: { page_number: true }, meta: {}, slides: [coverSlide, { ...contentSlide, heading: "Why now" }, endingSlide] } as unknown as Partial<PptxIR>
    const { root } = draw("memo", { ...contentSlide, heading: "Why now" } as Slide, en, 1)
    expect(Array.from(parts(root).folio!.querySelectorAll("text")).map((t) => t.textContent)).toEqual(["Page", "2", "of 3"])
  })

  it("页码和事由只上内容页：章节和结尾只有 MEMORANDUM 和双线", () => {
    for (const slide of [chapterSlide, endingSlide]) {
      const p = parts(draw("memo", slide, { footer: FOOTER } as Partial<PptxIR>, 2).root)
      expect(p.runningHead, slide.type).toBeNull()
      expect(p.folio, slide.type).toBeNull()
    }
  })

  it("安全区：页眉全在标题区 y84 之上，页脚全在正文带之下", () => {
    const p = parts(draw("memo", contentSlide, { footer: FOOTER } as Partial<PptxIR>, 1).root)
    for (const r of [p.thickRule, p.thinRule]) expect(num(r, "y") + num(r, "height")).toBeLessThan(TITLE_TOP)
    expect(num(p.eyebrow, "y")).toBeLessThan(TITLE_TOP)
    for (const text of Array.from(p.folio!.querySelectorAll("text"))) expect(num(text, "y") - 12).toBeGreaterThan(BODY_ZONE.bottom)
  })

  it("不画左竖条，正文带里一件不落", () => {
    for (const slide of ALL_SLIDES) {
      const { root } = draw("memo", slide, { footer: FOOTER } as Partial<PptxIR>, 1)
      for (const r of Array.from(root.querySelectorAll("rect"))) {
        expect(num(r, "height"), `vertical bar: ${r.outerHTML}`).toBeLessThan(30)
        const y = num(r, "y")
        expect(y < BODY_ZONE.top || y > BODY_ZONE.bottom, `inside the body: ${r.outerHTML}`).toBe(true)
      }
    }
  })

  it("装饰位置写死：换 filename 输出逐字节不变", () => {
    const ctx = boundThemeCtx("memo", {})
    const markups = new Set(Array.from({ length: 12 }, (_, i) => renderSvgMarkup(<MemoMotif ir={{ ...ir("memo"), filename: `probe-${i}.pptx` } as PptxIR} slide={contentSlide} ctx={ctx} />)))
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of ALL_SLIDES) {
      expect(() => assertSubset(draw("memo", slide, { footer: FOOTER } as Partial<PptxIR>, 1).root)).not.toThrow()
    }
  })
})

describe("memo vs vermilion（同是纸面双线，几何分家）", () => {
  it("memo 2px@y48 加 1px@y53 的红双线，vermilion 金线 2px@y26", () => {
    const memo = parts(draw("memo", contentSlide).root)
    const vermilionRoot = render(<VermilionMotif ir={ir("vermilion")} slide={contentSlide} ctx={boundThemeCtx("vermilion", {})} />).root
    const vermilionThick = Array.from(vermilionRoot.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "2")!
    expect(num(memo.thickRule, "y")).toBe(48)
    expect(num(vermilionThick, "y")).toBe(26)
    expect(vermilionThick.getAttribute("fill")).toBe(resolveStyle("vermilion").colors.accent)
  })

  it("只有 memo 写 MEMORANDUM，vermilion chapter 整页退让", () => {
    expect(parts(draw("memo", chapterSlide).root).eyebrow).toBeTruthy()
    const vermilionChapter = render(<VermilionMotif ir={ir("vermilion")} slide={chapterSlide} ctx={boundThemeCtx("vermilion", {})} />).root
    expect(vermilionChapter.children).toHaveLength(0)
  })

  it("branding 仍归 deck 声明：主题定义不绑定 branding", () => {
    expect(THEME_DEFINITIONS.memo.brand).toEqual({})
    expect(THEME_DEFINITIONS.memo).not.toHaveProperty("branding")
  })

  it("稀排条目不带 decor：statement 照画主题 motif", () => {
    expect(THEME_DEFINITIONS.memo.menu.content.statement?.decor).toBeUndefined()
  })
})
