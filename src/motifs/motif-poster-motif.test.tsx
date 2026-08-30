// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { THEME_DEFINITIONS } from "../themes/definitions"
import { contrastRatio } from "../audit/deck-audit"
import { CONTENT_DECOR_CONTRAST_CEILING, countDecorPieces } from "./decor-budget"
import { PosterMotif } from "./motif-poster-motif"
import type { PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide

const LOGO_BR = { x: 1120, y: 630, w: 96, h: 40 }

function rectsOverlap(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

const ir = (theme: string, date?: string): PptxIR =>
  ({
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: date ? { date } : {},
    assets: { images: {} },
    slides: [coverSlide],
  }) as unknown as PptxIR

function render(body: React.ReactElement): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(theme: string, slide: Slide, date?: string) {
  const tokens = resolveStyle(theme)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface),
  )
  return { ...render(<PosterMotif ir={ir(theme, date)} slide={slide} ctx={ctx} />), ctx, tokens }
}

/** Same control points the motif paints. Duplicated here so the golden `d` is computed from the formula, not copied from render output. */
const COVER_POINTS: readonly (readonly [number, number])[] = [
  [0, 545], [180, 538], [320, 552], [470, 530], [640, 542], [810, 522],
  [980, 534], [1140, 514], [1280, 522],
]

const FOOT_POINTS: readonly (readonly [number, number])[] = [
  [0, 600], [200, 590], [380, 602], [560, 584], [760, 594], [960, 578],
  [1280, 586],
]

function pathCoord(n: number): number {
  return Math.round(n * 100) / 100
}

/** Uniform Catmull-Rom → cubic Bézier, endpoint clamp by repeating first/last. */
function catmullRomCubicD(pts: readonly (readonly [number, number])[]): string {
  if (pts.length === 0) return ""
  const r = pathCoord
  let d = `M ${r(pts[0]![0])} ${r(pts[0]![1])}`
  const n = pts.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]!
    const p1 = pts[i]!
    const p2 = pts[i + 1]!
    const p3 = pts[i + 2 < n ? i + 2 : n - 1]!
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${r(c1x)} ${r(c1y)} ${r(c2x)} ${r(c2y)} ${r(p2[0])} ${r(p2[1])}`
  }
  return d
}

function tickerPath(root: Element): Element {
  const path = root.querySelector("path")
  expect(path).toBeTruthy()
  return path!
}

function pathEndpoints(d: string): { start: [number, number]; end: [number, number] } {
  const cmds = [...d.matchAll(/([MLHVQCSTAZ])([^MLHVQCSTAZ]*)/gi)]
  expect(cmds.length).toBeGreaterThan(0)
  const first = cmds[0]!
  const last = cmds[cmds.length - 1]!
  const startNums = first[2]!.trim().split(/[\s,]+/).map(Number)
  const endNums = last[2]!.trim().split(/[\s,]+/).map(Number)
  return {
    start: [startNums[0]!, startNums[1]!],
    end: [endNums[endNums.length - 2]!, endNums[endNums.length - 1]!],
  }
}

function pathYRange(d: string): { minY: number; maxY: number } {
  const ys: number[] = []
  for (const m of d.matchAll(/([MLHVQCSTAZ])([^MLHVQCSTAZ]*)/gi)) {
    const nums = m[2]!.trim().split(/[\s,]+/).filter(Boolean).map(Number)
    for (let i = 1; i < nums.length; i += 2) ys.push(nums[i]!)
  }
  return { minY: Math.min(...ys), maxY: Math.max(...ys) }
}

/**
 * poster-motif 第八波：顶缘行情带与幽灵季字退役，只留底缘暗线。
 * 行情波浪由折线改为 Catmull-Rom 三次贝塞尔 path。
 */
describe("PosterMotif（底缘暗线）", () => {
  it("稀排条目不带 decor：脸自带无框事实，主题 motif 照画", () => {
    const content = THEME_DEFINITIONS.insight.menu.content
    for (const kind of ["statement", "quote", "fact"] as const) {
      expect(content[kind]?.decor, kind).toBeUndefined()
    }
    expect(draw("insight", contentSlide).root.querySelectorAll("path")).toHaveLength(1)
    expect(draw("insight", coverSlide).root.querySelectorAll("path")).toHaveLength(1)
  })

  it("退役顶缘行情带、刻度齿、封面幽灵季字（走线是 path，不是 line/text/circle）", () => {
    for (const slide of [coverSlide, contentSlide, endingSlide]) {
      const { root } = draw("insight", slide, "2026-07-15")
      expect(root.querySelectorAll("line"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("text"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("circle"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("polyline"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("path"), slide.type).toHaveLength(1)
    }
    const { root } = draw("insight", chapterSlide, "2026-07-15")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("text")).toHaveLength(0)
    expect(root.querySelectorAll("circle")).toHaveLength(0)
    expect(root.querySelectorAll("path")).toHaveLength(0)
  })

  it("chapter 整片退让，幽灵序号改由章节版式画", () => {
    const { root } = draw("insight", chapterSlide, "2026-07-15")
    expect(root.querySelectorAll("polyline")).toHaveLength(0)
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.children).toHaveLength(0)
  })

  it("cover/content/ending 各画一根带 C 的三次贝塞尔 path，不是 polyline", () => {
    const cases: { slide: Slide; start: [number, number]; end: [number, number] }[] = [
      { slide: coverSlide, start: [0, 545], end: [1280, 522] },
      { slide: contentSlide, start: [0, 600], end: [1280, 586] },
      { slide: endingSlide, start: [0, 600], end: [1280, 586] },
    ]
    for (const { slide, start, end } of cases) {
      const { root } = draw("insight", slide)
      expect(root.querySelectorAll("polyline"), slide.type).toHaveLength(0)
      expect(root.querySelectorAll("path"), slide.type).toHaveLength(1)
      const d = tickerPath(root).getAttribute("d") ?? ""
      expect(d, slide.type).toMatch(/C/)
      expect(d, slide.type).toMatch(/^M /)
      const { start: s, end: e } = pathEndpoints(d)
      expect(s, slide.type).toEqual(start)
      expect(e, slide.type).toEqual(end)
    }
  })

  it("封面画板上那根底缘暗线：border，中景，一件", () => {
    const { root, tokens } = draw("insight", coverSlide)
    expect(countDecorPieces(root)).toBe(1)
    const line = tickerPath(root)
    expect(line.getAttribute("stroke")).toBe(tokens.colors.border)
    expect(line.getAttribute("fill")).toBe("none")
    expect(line.getAttribute("stroke-width")).toBe("2")
    expect(line.getAttribute("opacity")).toBe("0.4")
    const d = line.getAttribute("d") ?? ""
    const { start, end } = pathEndpoints(d)
    expect(start).toEqual([0, 545])
    expect(end).toEqual([1280, 522])
    const { minY, maxY } = pathYRange(d)
    expect(rectsOverlap({ x: 0, y: minY - 1, w: 1280, h: maxY - minY + 2 }, LOGO_BR)).toBe(false)
  })

  it("ending / content 画 ending 板上那根更贴底缘的线", () => {
    for (const slide of [endingSlide, contentSlide]) {
      const { root, tokens } = draw("insight", slide)
      const line = tickerPath(root)
      const { start, end } = pathEndpoints(line.getAttribute("d") ?? "")
      expect(start, slide.type).toEqual([0, 600])
      expect(end, slide.type).toEqual([1280, 586])
      expect(line.getAttribute("stroke")).toBe(tokens.colors.border)
      expect(line.getAttribute("opacity"), slide.type).toBe("0.4")
    }
  })

  it("pins the cover and foot cubic d so float drift fails", () => {
    const coverD = tickerPath(draw("insight", coverSlide).root).getAttribute("d")
    const footD = tickerPath(draw("insight", contentSlide).root).getAttribute("d")
    expect(coverD).toBe(catmullRomCubicD(COVER_POINTS))
    expect(footD).toBe(catmullRomCubicD(FOOT_POINTS))
    expect(coverD).toMatch(/C/)
    expect(footD).toMatch(/C/)
  })

  it("内容页中景对比低于 3:1 上限", () => {
    const t = resolveStyle("insight")
    const { root } = draw("insight", contentSlide)
    const ground = resolveBackgroundHex(t.defaultBackgrounds.content, t.colors.bg)
    const line = tickerPath(root)
    const hex = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16))
    const blend = (fg: string, a: number) => {
      const f = hex(fg)
      const b = hex(ground)
      return "#" + f.map((c, i) => Math.round(c * a + b[i]! * (1 - a)).toString(16).padStart(2, "0")).join("")
    }
    const opacity = Number(line.getAttribute("opacity") ?? 1)
    const ratio = contrastRatio(blend(line.getAttribute("stroke")!, opacity), ground)
    expect(ratio).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
  })

  it("换一家 tokens 渲染时颜色整体跟着换，insight 的色一处不残留", () => {
    const consulting = resolveStyle("consulting")
    const ctx = buildCtx(consulting, {})
    const { markup } = render(
      <PosterMotif ir={ir("consulting", "2026-07-15")} slide={coverSlide} ctx={ctx} />,
    )
    expect(markup).toContain(consulting.colors.border)
    for (const hex of ["#0F1216", "#171C22", "#16202B", "#F0A63C", "#F2EFE8", "#9AA7B4", "#2A3440"]) {
      expect(markup, `insight token ${hex} leaked into consulting render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const ctx = buildCtx(resolveStyle("insight"), {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <PosterMotif
            ir={{ ...ir("insight", "2026-07-15"), filename: `probe-${i}.pptx` } as PptxIR}
            slide={coverSlide}
            ctx={ctx}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("不画任何左竖条，也不画孤立角标", () => {
    for (const slide of [coverSlide, contentSlide, endingSlide]) {
      const { root } = draw("insight", slide)
      expect(root.querySelectorAll("rect")).toHaveLength(0)
      expect(root.querySelectorAll("circle")).toHaveLength(0)
      expect(root.querySelectorAll("polygon")).toHaveLength(0)
    }
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root } = draw("insight", slide, "2026-07-15")
      expect(() => assertSubset(root)).not.toThrow()
    }
  })
})
