// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { blendOver, contrastRatio } from "../render/ink"
import { HomeroomMotif } from "./motif-homeroom-motif"
import { CONTENT_DECOR_CONTRAST_CEILING, DECOR_PIECE_ATTR, countDecorPieces, leafOpacity, leafPaint, paintedLeaves } from "./decor-budget"
import {
  IDENTITY_MATRIX,
  multiplyMatrices,
  parseSvgTransform,
  textInkBox,
  transformBox,
} from "../render/depth-contract/geometry"
import { FOOTER_DIVIDER_Y } from "../render/branding-geometry"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { buildMatrix } from "../../evals/gallery/matrix"
import { corpusAssets, themeDeck, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS, type LanguageId } from "../../evals/gallery/corpus/lexicon"
import type { DeckBranding, PptxIR, Slide } from "@/ir"

const coverSlide: Slide = { type: "cover", heading: "封面", components: [] } as Slide
const chapterSlide: Slide = { type: "chapter", heading: "章节", components: [] } as Slide
const contentSlide: Slide = { type: "content", kind: "points", heading: "内容", components: [] } as Slide
const endingSlide: Slide = { type: "ending", components: [] } as Slide
const DRAWN_SLIDES = [coverSlide, chapterSlide, contentSlide]

const CLASSROOM_HEX = ["#ECF0F2", "#F9FBFC", "#4A6B8A", "#B96A5E", "#23282E", "#5A6470", "#D3DBE0"]
const BAND = { x: 96, y: 252, w: 1088, h: 176 }

const ir = (theme: string, branding?: DeckBranding): PptxIR =>
  ({
    version: "3",
    filename: "x.pptx",
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides: [coverSlide],
    ...(branding ? { branding } : {}),
  }) as unknown as PptxIR

function render(body: React.ReactElement | null): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(theme: string, slide: Slide, opts: { branding?: DeckBranding } = {}) {
  const tokens = resolveStyle(theme)
  const defaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, defaultBg)
  return {
    ...render(<HomeroomMotif ir={ir(theme, opts.branding)} slide={slide} ctx={ctx} />),
    ctx,
    tokens,
    defaultBg,
  }
}

/** Blank page between a rule and the nearest line of text, in px. */
const RULE_TEXT_CLEARANCE = 12

function inherited(el: Element, name: string): string | null {
  for (let n: Element | null = el; n && n.tagName.toLowerCase() !== "svg"; n = n.parentElement) {
    const v = n.getAttribute(name)
    if (v !== null && v !== "") return v
  }
  return null
}

/**
 * Every homeroom page the gallery draws (sample deck, each menu face, every
 * component skin), rendered through the public entry point. Returns one
 * line per text that a motif rule crosses or comes within
 * `RULE_TEXT_CLEARANCE` of. The text box runs a full em above the baseline
 * and a quarter em below it, the reach of CJK glyphs and italic
 * descenders.
 */
async function ruleTextOffenders(theme: string): Promise<string[]> {
  installNodePlatform()
  const assets = { zh: await corpusAssets(LEXICONS.zh) } as Record<LanguageId, CorpusAssets>
  const offenders: string[] = []
  for (const job of buildMatrix([theme], assets, { section: theme })) {
    const svg = renderSlideSvg(job.ir, job.slideIndex)
    const root = parseSvgRoot(svg)
    const rules: { y: number; x1: number; x2: number }[] = []
    const texts: { label: string; box: { x: number; y: number; w: number; h: number } }[] = []
    const visit = (el: Element, parent: typeof IDENTITY_MATRIX, inRules: boolean) => {
      const matrix = multiplyMatrices(parent, parseSvgTransform(el.getAttribute("transform")))
      const rulesHere = inRules || el.getAttribute(DECOR_PIECE_ATTR) === "rules"
      const tag = el.tagName.toLowerCase()
      if (tag === "line" && rulesHere) {
        const box = transformBox(
          { x: num(el, "x1"), y: num(el, "y1"), w: num(el, "x2") - num(el, "x1"), h: 0 },
          matrix,
        )
        rules.push({ y: box.y, x1: box.x, x2: box.x + box.w })
      }
      if (tag === "text" && !el.closest("[data-decor]")) {
        const content = (el.textContent ?? "").trim()
        if (content) {
          const fontSize = Number(inherited(el, "font-size") ?? 16)
          const ink = textInkBox({
            content,
            x: num(el, "x"),
            y: num(el, "y"),
            fontSize,
            fontFamily: inherited(el, "font-family") ?? "",
            fontWeight: inherited(el, "font-weight"),
            textAnchor: inherited(el, "text-anchor") ?? "start",
          })
          const box = { x: ink.x, y: num(el, "y") - fontSize, w: ink.w, h: fontSize * 1.25 }
          texts.push({ label: content.slice(0, 16), box: transformBox(box, matrix) })
        }
      }
      for (const child of Array.from(el.children)) visit(child, matrix, rulesHere)
    }
    visit(root, IDENTITY_MATRIX, false)
    for (const rule of rules) {
      for (const t of texts) {
        if (t.box.x >= rule.x2 || t.box.x + t.box.w <= rule.x1) continue
        const gap = Math.max(t.box.y - rule.y, rule.y - (t.box.y + t.box.h))
        if (gap < RULE_TEXT_CLEARANCE) {
          offenders.push(`${job.id}: rule y${rule.y} is ${gap.toFixed(1)}px from "${t.label}"`)
        }
      }
    }
  }
  return offenders
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

type Box = { x0: number; y0: number; x1: number; y1: number }

function inkBoxes(root: Element): Box[] {
  return Array.from(root.querySelectorAll("line")).map((l) => {
    const half = num(l, "stroke-width") / 2
    return {
      x0: Math.min(num(l, "x1"), num(l, "x2")) - half,
      y0: Math.min(num(l, "y1"), num(l, "y2")) - half,
      x1: Math.max(num(l, "x1"), num(l, "x2")) + half,
      y1: Math.max(num(l, "y1"), num(l, "y2")) + half,
    }
  })
}

const intersects = (b: Box, z: { x: number; y: number; w: number; h: number }) =>
  b.x0 < z.x + z.w && b.x1 > z.x && b.y0 < z.y + z.h && b.y1 > z.y

/**
 * homeroom-motif v3「横线簿格线」（第八波批 2）。
 * 设计源：`.issues/design-boards/wave8/b2/Classroom.dc.html`
 */
describe("HomeroomMotif（横线簿格线）", () => {
  it("装订孔、铅笔虚线、回形针全部退役，只剩横线", () => {
    for (const slide of [...DRAWN_SLIDES, endingSlide]) {
      const { root } = draw("homeroom", slide)
      expect(root.querySelectorAll("circle"), `circles on ${slide.type}`).toHaveLength(0)
      expect(root.querySelectorAll("path"), `paths on ${slide.type}`).toHaveLength(0)
      expect(root.querySelectorAll("rect"), `rects on ${slide.type}`).toHaveLength(0)
      for (const l of Array.from(root.querySelectorAll("line"))) {
        expect(l.getAttribute("stroke-dasharray"), `dashed pencil on ${slide.type}`).toBeNull()
      }
    }
  })

  it("chapter 按板画两条沉底格线，一个 DecorPiece", () => {
    const { root, tokens } = draw("homeroom", chapterSlide)
    const lines = Array.from(root.querySelectorAll("line"))
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => [num(l, "x1"), num(l, "y1"), num(l, "x2"), num(l, "y2")])).toEqual([
      [96, 500, 1184, 500],
      [96, 548, 1184, 548],
    ])
    for (const l of lines) {
      expect(l.getAttribute("stroke")).toBe(tokens.colors.border)
      expect(l.getAttribute("stroke-width")).toBe("1")
      expect(l.getAttribute("opacity")).toBeNull()
    }
    expect(countDecorPieces(root)).toBe(1)
    expect(root.querySelector(`[${DECOR_PIECE_ATTR}="rules"]`)).toBeTruthy()
  })

  it("cover 两条淡格线避开板书带，成组，对比低于 3:1", () => {
    const { root, defaultBg } = draw("homeroom", coverSlide)
    const lines = Array.from(root.querySelectorAll("line"))
    expect(lines).toHaveLength(2)
    expect(lines.map((l) => [num(l, "x1"), num(l, "y1"), num(l, "x2"), num(l, "y2")])).toEqual([
      [96, 580, 1184, 580],
      [96, 628, 1184, 628],
    ])
    expect(countDecorPieces(root)).toBe(1)
    for (const box of inkBoxes(root)) {
      expect(intersects(box, BAND), `cover rule enters the chalk band: ${JSON.stringify(box)}`).toBe(false)
    }
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      expect(paint).toBeTruthy()
      const ratio = contrastRatio(blendOver(paint!.color, defaultBg, leafOpacity(el)), defaultBg)
      expect(ratio).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("content 两条格线成组，对比低于 3:1", () => {
    const { root, defaultBg } = draw("homeroom", contentSlide)
    expect(Array.from(root.querySelectorAll("line"))).toHaveLength(2)
    expect(countDecorPieces(root)).toBe(1)
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      expect(paint).toBeTruthy()
      const ratio = contrastRatio(blendOver(paint!.color, defaultBg, leafOpacity(el)), defaultBg)
      expect(ratio).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("content 格线沉到页脚分隔线以下，版心里一条不画", () => {
    // 版式把内容（含脚注墨）都排在 FOOTER_DIVIDER_Y 之上，线落在它下面才
    // 碰不到任何组件。y500/548 落在版心中段，横穿图表坐标、卡片字和表格行。
    const { root } = draw("homeroom", contentSlide)
    const lines = Array.from(root.querySelectorAll("line"))
    expect(lines.map((l) => [num(l, "x1"), num(l, "y1"), num(l, "x2"), num(l, "y2")])).toEqual([
      [96, 672, 1184, 672],
      [96, 696, 1184, 696],
    ])
    for (const box of inkBoxes(root)) {
      expect(box.y0, "rule inside the content frame").toBeGreaterThan(FOOTER_DIVIDER_Y)
      expect(720 - box.y1, "rule too close to the page edge").toBeGreaterThanOrEqual(20)
    }
  })

  it("deck 给内容页画页脚时 content 格线让位，不与分隔线、meta 行、logo 叠", () => {
    for (const branding of ["full", "minimal"] as const) {
      const { root } = draw("homeroom", contentSlide, { branding })
      expect(root.querySelectorAll("line"), branding).toHaveLength(0)
      expect(countDecorPieces(root), branding).toBe(0)
    }
    for (const branding of ["cover-only", undefined] as const) {
      const { root } = draw("homeroom", contentSlide, { branding })
      expect(root.querySelectorAll("line"), String(branding)).toHaveLength(2)
    }
    // 封面与章节的格线位置由版式定死，与页脚无关，照画。
    for (const slide of [coverSlide, chapterSlide]) {
      expect(draw("homeroom", slide, { branding: "full" }).root.querySelectorAll("line")).toHaveLength(2)
    }
  })

  it("整页走真实渲染：格线与每一行字至少隔 12px（样张 + 菜单版式 + 全部组件皮肤）", async () => {
    const offenders = await ruleTextOffenders("homeroom")
    expect(offenders, offenders.join("\n")).toEqual([])
  })

  it("整页走真实渲染：branding full 的内容页只有页脚分隔线，没有格线", async () => {
    installNodePlatform()
    const deck = themeDeck("homeroom", LEXICONS.zh, await corpusAssets(LEXICONS.zh))
    const branded = { ...deck, branding: "full", meta: { ...deck.meta, organization: "明澜中学", date: "2026-07-01" } } as PptxIR
    let contentPages = 0
    branded.slides.forEach((slide, index) => {
      const root = parseSvgRoot(renderSlideSvg(branded, index))
      const rules = root.querySelectorAll(`[${DECOR_PIECE_ATTR}="rules"]`)
      if (slide.type !== "content") return
      contentPages++
      expect(rules, `p${index + 1}`).toHaveLength(0)
      const footer = Array.from(root.querySelectorAll("line")).filter((l) => num(l, "y1") === FOOTER_DIVIDER_Y)
      expect(footer, `p${index + 1} footer divider`).toHaveLength(1)
    })
    expect(contentPages).toBeGreaterThan(0)
  })

  it("ending 完全退让，避免与作业底线叠一条", () => {
    const { root } = draw("homeroom", endingSlide)
    expect(root.children).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(0)
  })

  it("没有孤立小件：无角标、无括弧、无 tick、无短竖线", () => {
    for (const slide of DRAWN_SLIDES) {
      const { root } = draw("homeroom", slide)
      expect(root.querySelectorAll("circle")).toHaveLength(0)
      expect(root.querySelectorAll("rect")).toHaveLength(0)
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const vertical = num(l, "x1") === num(l, "x2") && Math.abs(num(l, "y2") - num(l, "y1")) > 30
        expect(vertical, `vertical bar rendered: ${l.outerHTML}`).toBe(false)
        const shortTick =
          Math.abs(num(l, "x2") - num(l, "x1")) < 40 && Math.abs(num(l, "y2") - num(l, "y1")) < 40
        expect(shortTick, `isolated tick: ${l.outerHTML}`).toBe(false)
      }
    }
  })

  it("没有出血幽灵字", () => {
    for (const slide of [...DRAWN_SLIDES, endingSlide]) {
      const { root } = draw("homeroom", slide)
      expect(root.querySelectorAll("text")).toHaveLength(0)
      for (const t of Array.from(root.querySelectorAll("text"))) {
        const box = textInkBox({
          content: t.textContent ?? "",
          x: Number(t.getAttribute("x")),
          y: Number(t.getAttribute("y")),
          fontSize: Number(t.getAttribute("font-size")),
          fontFamily: t.getAttribute("font-family") ?? "",
          fontWeight: t.getAttribute("font-weight"),
          textAnchor: t.getAttribute("text-anchor") ?? "start",
        })
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.y).toBeGreaterThanOrEqual(0)
        expect(box.x + box.w).toBeLessThanOrEqual(1280)
        expect(box.y + box.h).toBeLessThanOrEqual(720)
      }
    }
  })

  it("画笔属性写在叶子上，不挂 <g>", () => {
    const { root } = draw("homeroom", chapterSlide)
    for (const g of Array.from(root.querySelectorAll("g"))) {
      for (const attr of ["fill", "stroke", "opacity", "stroke-width"]) {
        expect(g.getAttribute(attr), `<g> carries ${attr}, which svg2pptx drops`).toBeNull()
      }
    }
    for (const el of Array.from(root.querySelectorAll("line"))) {
      expect(el.getAttribute("stroke"), `${el.tagName} has no own stroke`).toBeTruthy()
    }
  })

  it("motif 不读 chartPalette——图表调色板轮转改不动它一个字节", () => {
    const tokens = resolveStyle("homeroom")
    const markups = new Set(
      tokens.colors.chartPalette.map((_, offset) =>
        renderSvgMarkup(
          <HomeroomMotif
            ir={ir("homeroom")}
            slide={coverSlide}
            ctx={buildCtx(tokens, {}, undefined, undefined, undefined, offset)}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
    const chartOnly = tokens.colors.chartPalette.filter(
      (c) => c !== tokens.colors.primary && c !== tokens.colors.accent && c !== tokens.colors.muted,
    )
    expect(chartOnly.length).toBeGreaterThan(0)
    const markup = renderSvgMarkup(
      <HomeroomMotif ir={ir("homeroom")} slide={coverSlide} ctx={buildCtx(tokens, {})} />,
    )
    for (const hex of chartOnly) expect(markup, `chart-only ${hex} painted by the motif`).not.toContain(hex)
  })

  it("换一家 tokens 渲染时颜色跟着换，homeroom 的色一处不残留", () => {
    const thesis = resolveStyle("thesis")
    const ctx = buildCtx(thesis, {})
    const { markup } = render(<HomeroomMotif ir={ir("thesis")} slide={coverSlide} ctx={ctx} />)
    expect(markup).toContain(thesis.colors.border)
    for (const hex of CLASSROOM_HEX) {
      expect(markup, `homeroom token ${hex} leaked into the thesis render`).not.toContain(hex)
    }
  })

  it("装饰位置写死：换 filename 输出逐字节不变", () => {
    const ctx = boundThemeCtx("homeroom", {})
    const markups = new Set(
      Array.from({ length: 12 }, (_, i) =>
        renderSvgMarkup(
          <HomeroomMotif ir={{ ...ir("homeroom"), filename: `probe-${i}.pptx` } as PptxIR} slide={coverSlide} ctx={ctx} />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [...DRAWN_SLIDES, endingSlide]) {
      expect(() => assertSubset(draw("homeroom", slide).root)).not.toThrow()
    }
  })
})
