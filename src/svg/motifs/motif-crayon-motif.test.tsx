// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx } from "../full-slide-svg"
import { blendOver, contrastRatio } from "../ink"
import { resolveStyle } from "../../themes"
import { CrayonMotif, CONTENT_STICKER_COUNT, COVER_SUN } from "./motif-crayon-motif"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  countDecorPieces,
  countSlantedTiles,
  leafOpacity,
  leafPaint,
  paintedLeaves,
} from "./decor-budget"
import type { Component, PptxIR, Slide } from "@/ir"

const para = (text: string): Component => ({ type: "paragraph", text }) as Component
const slideOf = (type: Slide["type"], components: Component[] = [], heading = "标题"): Slide =>
  ({ type, heading, components }) as Slide

const coverSlide = slideOf("cover")
const chapterSlide = slideOf("chapter")
const contentSlide = slideOf("content")
const endingSlide = slideOf("ending", [], undefined as unknown as string)

const BOARD_ZONES = {
  title: { x: 96, y: 48, w: 1040, h: 122 },
  body: { x: 96, y: 200, w: 1040, h: 420 },
  footerMeta: { x: 48, y: 664, w: 1184, h: 44 },
  brLogo: { x: 1120, y: 630, w: 96, h: 40 },
  trLogo: { x: 1120, y: 48, w: 96, h: 40 },
} as const

const TITLE_RIGHT = BOARD_ZONES.title.x + BOARD_ZONES.title.w

const ir = (theme: string, filename = "x.pptx"): PptxIR =>
  ({
    version: "3",
    filename,
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides: [coverSlide],
  }) as unknown as PptxIR

function render(body: React.ReactElement | null): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

function draw(theme: string, slide: Slide, filename?: string) {
  const ctx = buildCtx(resolveStyle(theme), {})
  return { ...render(<CrayonMotif ir={ir(theme, filename)} slide={slide} ctx={ctx} />), ctx }
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

type Box = { x0: number; y0: number; x1: number; y1: number }

const intersects = (b: Box, z: { x: number; y: number; w: number; h: number }) =>
  b.x0 < z.x + z.w && b.x1 > z.x && b.y0 < z.y + z.h && b.y1 > z.y

function lineBox(l: Element, originX: number, originY: number): Box {
  const half = num(l, "stroke-width") / 2
  return {
    x0: originX + Math.min(num(l, "x1"), num(l, "x2")) - half,
    y0: originY + Math.min(num(l, "y1"), num(l, "y2")) - half,
    x1: originX + Math.max(num(l, "x1"), num(l, "x2")) + half,
    y1: originY + Math.max(num(l, "y1"), num(l, "y2")) + half,
  }
}

function circleBox(c: Element, originX: number, originY: number): Box {
  const r = num(c, "r") + (Number(c.getAttribute("stroke-width")) || 0) / 2
  return {
    x0: originX + (Number(c.getAttribute("cx")) || 0) - r,
    y0: originY + (Number(c.getAttribute("cy")) || 0) - r,
    x1: originX + (Number(c.getAttribute("cx")) || 0) + r,
    y1: originY + (Number(c.getAttribute("cy")) || 0) + r,
  }
}

function pathBox(p: Element): Box {
  const nums = (p.getAttribute("d") ?? "").match(/-?[\d.]+/g)!.map(Number)
  const xs = nums.filter((_, i) => i % 2 === 0)
  const ys = nums.filter((_, i) => i % 2 === 1)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

function sunOrigin(g: Element | null): { x: number; y: number } {
  const tr = g?.getAttribute("transform") ?? ""
  const m = /translate\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/.exec(tr)
  return { x: m ? Number(m[1]) : 0, y: m ? Number(m[2]) : 0 }
}

function parts(root: Element) {
  const sunGroup = Array.from(root.querySelectorAll("g")).find((g) => g.getAttribute("transform")?.startsWith("translate(")) ?? null
  const origin = sunOrigin(sunGroup)
  const host = sunGroup ?? root
  return {
    sunGroup,
    origin,
    circle: host.querySelector("circle"),
    rays: Array.from(host.querySelectorAll("line")),
    stars: Array.from(root.querySelectorAll("path")),
    polygons: Array.from(root.querySelectorAll("polygon")),
    edgeDashes: Array.from(root.querySelectorAll("line")).filter((l) => num(l, "y1") === 644),
  }
}

function stickerBoxes(root: Element): { label: string; box: Box }[] {
  const p = parts(root)
  const out: { label: string; box: Box }[] = []
  if (p.circle) out.push({ label: "sun", box: circleBox(p.circle, p.origin.x, p.origin.y) })
  for (const l of p.rays) out.push({ label: `ray@${l.getAttribute("x1")}`, box: lineBox(l, p.origin.x, p.origin.y) })
  for (const s of p.stars) out.push({ label: "star", box: pathBox(s) })
  return out
}

/**
 * crayon-motif「太阳涂鸦」（第八波批 2）。
 * 设计源：`.issues/design-boards/wave8/b2/Crayon.dc.html`
 */
describe("CrayonMotif（太阳涂鸦）", () => {
  it("封面只留右上那一枚太阳，圈 r44 加八根光芒，走 accent", () => {
    const t = resolveStyle("crayon")
    const { root } = draw("crayon", coverSlide)
    const p = parts(root)
    expect(p.origin).toEqual({ x: COVER_SUN.x, y: COVER_SUN.y })
    expect(p.circle?.getAttribute("r")).toBe("44")
    expect(p.circle?.getAttribute("stroke")).toBe(t.colors.accent)
    expect(p.circle?.getAttribute("stroke-width")).toBe("5")
    expect(p.rays).toHaveLength(8)
    expect(p.stars).toHaveLength(0)
    expect(p.polygons).toHaveLength(0)
    expect(p.edgeDashes).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(1)
    expect(root.querySelector("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("sun")
  })

  it("封面不画顶缘涂边、不画彩虹划、不画向日黄芯", () => {
    const t = resolveStyle("crayon")
    const { root, markup } = draw("crayon", coverSlide)
    expect(root.querySelector("polygon")).toBeNull()
    expect(parts(root).edgeDashes).toHaveLength(0)
    expect(markup).not.toContain(t.colors.chartPalette[3]!)
    const filled = Array.from(root.querySelectorAll("circle")).filter((c) => {
      const fill = c.getAttribute("fill")
      return fill !== null && fill !== "none"
    })
    expect(filled).toHaveLength(0)
  })

  it("chapter / ending 完全退让", () => {
    for (const slide of [chapterSlide, endingSlide]) {
      const { root } = draw("crayon", slide)
      expect(root.children, slide.type).toHaveLength(0)
    }
  })

  it("内容页太阳或星贴纸合计 3 件，成组缩右上角", () => {
    expect(CONTENT_STICKER_COUNT).toBe(3)
    const { root } = draw("crayon", contentSlide)
    const p = parts(root)
    expect(p.circle).toBeTruthy()
    expect(p.rays).toHaveLength(8)
    expect(p.stars).toHaveLength(2)
    expect(countDecorPieces(root)).toBe(1)
    expect(root.querySelector("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("doodles")
    expect(p.polygons).toHaveLength(0)
    expect(p.edgeDashes).toHaveLength(0)
  })

  it("内容页贴纸落在标题区右沿之外，不进五个保护区", () => {
    const { root } = draw("crayon", contentSlide)
    const boxes = stickerBoxes(root)
    expect(boxes.length).toBeGreaterThan(0)
    for (const { label, box } of boxes) {
      expect(box.x0, `${label} left ${box.x0} must sit right of title edge ${TITLE_RIGHT}`).toBeGreaterThan(TITLE_RIGHT)
      for (const [name, zone] of Object.entries(BOARD_ZONES)) {
        expect(intersects(box, zone), `${label} enters the ${name} zone: ${JSON.stringify(box)}`).toBe(false)
      }
    }
  })

  it("内容页中景对比低于 3:1", () => {
    const t = resolveStyle("crayon")
    const { root } = draw("crayon", contentSlide)
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      if (!paint) continue
      const opacity = leafOpacity(el)
      const composite = blendOver(paint.color, t.colors.bg, opacity)
      expect(
        contrastRatio(composite, t.colors.bg),
        `${el.tagName} ${paint.color} @${opacity}`,
      ).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("任何页型都不画孤立斜贴片，不画左竖条，不画 M56,628 星", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      const { root, markup } = draw("crayon", slide)
      expect(countSlantedTiles(root), slide.type).toBe(0)
      expect(markup, `M56,628 survived on ${slide.type}`).not.toContain("M56,628")
      expect(root.querySelector("rect"), slide.type).toBeNull()
      for (const l of Array.from(root.querySelectorAll("line"))) {
        const vertical = num(l, "x1") === num(l, "x2") && Math.abs(num(l, "y2") - num(l, "y1")) > 30
        expect(vertical, `vertical bar on ${slide.type}: ${l.outerHTML}`).toBe(false)
      }
    }
  })

  it("同一份 IR 两次渲染逐字节相同", () => {
    expect(draw("crayon", coverSlide).markup).toBe(draw("crayon", coverSlide).markup)
    expect(draw("crayon", contentSlide).markup).toBe(draw("crayon", contentSlide).markup)
  })

  it("装饰位置写死：换 seed（filename）输出逐字节不变", () => {
    const markups = new Set(Array.from({ length: 12 }, (_, i) => draw("crayon", coverSlide, `probe-${i}.pptx`).markup))
    expect(markups.size).toBe(1)
    const contentMarkups = new Set(
      Array.from({ length: 12 }, (_, i) => draw("crayon", contentSlide, `probe-${i}.pptx`).markup),
    )
    expect(contentMarkups.size).toBe(1)
  })

  it("motif 不受 chartPaletteOffset 影响", () => {
    const tokens = resolveStyle("crayon")
    const markups = new Set(
      tokens.colors.chartPalette.map((_, offset) =>
        renderSvgMarkup(
          <CrayonMotif
            ir={ir("crayon")}
            slide={contentSlide}
            ctx={buildCtx(tokens, {}, undefined, undefined, undefined, offset)}
          />,
        ),
      ),
    )
    expect(markups.size).toBe(1)
  })

  it("判据纯度：同结构不同文案，输出逐字节相同", () => {
    const short = slideOf("content", [para("短")], "短")
    const long = slideOf(
      "content",
      [
        para(
          "这一段正文特意写得很长很长很长，长到足以把版式的自动缩字号与换行逻辑整个跑一遍，" +
            "再长一点还会触发溢出截断，但页面的组件数量始终是一个，结构层没有任何变化。",
        ),
      ],
      "这是一个长到会换行、会触发标题自动缩字号、甚至可能被截断的超长标题",
    )
    expect(draw("crayon", long).markup).toBe(draw("crayon", short).markup)
  })

  it("画笔属性写在叶子上，不挂 <g>", () => {
    for (const slide of [coverSlide, contentSlide]) {
      const { root } = draw("crayon", slide)
      for (const g of Array.from(root.querySelectorAll("g"))) {
        for (const attr of ["fill", "stroke", "opacity"]) {
          expect(g.getAttribute(attr), `<g> on ${slide.type} carries ${attr}`).toBeNull()
        }
      }
    }
  })

  it("换一家 tokens 渲染时颜色跟着换，crayon 的色一处不残留", () => {
    const luxe = resolveStyle("luxe")
    const { markup } = render(<CrayonMotif ir={ir("luxe")} slide={contentSlide} ctx={buildCtx(luxe, {})} />)
    for (const hex of ["#FFF6E9", "#FFFDF6", "#2B59C3", "#E4572E", "#2E2A25", "#6E655A", "#F1E3C8", "#2E933C", "#F5B700"]) {
      expect(markup, `crayon token ${hex} leaked into the luxe render`).not.toContain(hex)
    }
  })

  it("Decor body passes subset validation", () => {
    for (const slide of [coverSlide, chapterSlide, contentSlide, endingSlide]) {
      expect(() => assertSubset(draw("crayon", slide).root)).not.toThrow()
    }
  })
})
