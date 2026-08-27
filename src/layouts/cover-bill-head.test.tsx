// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, FullSlideSvg, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { svgToOps, type Op } from "../pptx/svg2pptx/dispatch"
import { applyPoint, parseTransform } from "../pptx/svg2pptx/transform"
import { PX_PER_IN } from "../constants"
import { BillHeadCover, layoutDef } from "./cover-bill-head"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "开演前十分钟"
const VENUE = "RIVERSIDE WAREHOUSE"

function slide(heading = HEADING, subheading: string | null = VENUE): Slide {
  return { type: "cover", heading, subheading: subheading ?? undefined, components: [] } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}): PptxIR {
  return {
    version: "4",
    filename: "bill-head.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [slide()],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "城市青年戏剧节 · 主单元",
  date: "9.20—28",
}

function renderCover(themeId: string, s: Slide = slide(), meta: PptxIR["meta"] = FULL_META) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(
    tokens,
    {},
    undefined,
    resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface),
  )
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <BillHeadCover ir={ir(themeId, meta)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

const PATCH_CX = 1149
const PATCH_CY = 81
const PATCH_W = 150
const PATCH_H = 34
const PATCH_DEG = 4
const CHIP_TOP = 64
const CHIP_RIGHT = 1224

const round1 = (v: number) => Math.round(v * 10) / 10

function bakeClockwise(cx: number, cy: number, deg: number): string {
  const a = (deg * Math.PI) / 180
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const hw = PATCH_W / 2
  const hh = PATCH_H / 2
  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  return corners.map(([lx, ly]) => `${round1(cx + lx * ca - ly * sa)},${round1(cy + lx * sa + ly * ca)}`).join(" ")
}

function polygonPoints(el: Element): { x: number; y: number }[] {
  return el
    .getAttribute("points")!
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(",").map(Number)
      return { x: x!, y: y! }
    })
}

const num = (el: Element, a: string) => Number(el.getAttribute(a))

function isChipText(el: Element): boolean {
  return (el.getAttribute("transform") ?? "").startsWith(`rotate(${PATCH_DEG} `)
}

describe("cover-bill-head — board geometry", () => {
  it("places the bleed heading, thick baseline, split footer, and the wave-7 date chip", () => {
    const { root, tokens } = renderCover("playbill")
    const headings = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "56" && t.getAttribute("font-weight") === "700")
    expect(headings.map((t) => t.textContent).join("")).toContain("开演前")
    expect(Number(headings[0]!.getAttribute("font-size"))).toBeGreaterThanOrEqual(180)

    const rule = root.querySelector("rect")!
    expect([rule.getAttribute("x"), rule.getAttribute("y"), rule.getAttribute("width"), rule.getAttribute("height")]).toEqual([
      "56",
      "610",
      "1168",
      "5",
    ])
    expect(rule.getAttribute("fill")).toBe(tokens.colors.primary)

    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.some((t) => t.textContent === FULL_META.organization)).toBe(true)
    expect(texts.some((t) => t.textContent === VENUE)).toBe(true)
    expect(texts.some((t) => t.textContent === FULL_META.date)).toBe(true)

    const poly = root.querySelector("polygon")!
    const expected = bakeClockwise(PATCH_CX, PATCH_CY, PATCH_DEG)
    expect(poly.getAttribute("points")).toBe(expected)
    expect(poly.getAttribute("fill")).toBe(tokens.colors.primary)
    const pts = polygonPoints(poly)
    const unrotatedTop = PATCH_CY - PATCH_H / 2
    const unrotatedRight = PATCH_CX + PATCH_W / 2
    expect(unrotatedTop).toBe(CHIP_TOP)
    expect(unrotatedRight).toBe(CHIP_RIGHT)
    expect(pts[1]!.y, "clockwise 4° drops the unrotated top-right corner").toBeGreaterThan(unrotatedTop)

    const date = texts.find((t) => t.textContent === FULL_META.date)!
    expect(date.getAttribute("transform")).toBe(`rotate(${PATCH_DEG} ${PATCH_CX} ${PATCH_CY})`)
    expect(num(date, "x")).toBe(PATCH_CX)
    expect(date.getAttribute("fill")).toBe(tokens.colors.bg)
  })

  it("does not paint an empty black block when meta.date is missing", () => {
    const { root } = renderCover("playbill", slide(), { organization: FULL_META.organization })
    expect(root.querySelector("polygon")).toBeNull()
    expect(Array.from(root.querySelectorAll("text")).some((t) => isChipText(t))).toBe(false)
  })

  it("vertically centers the display title in the band between TITLE_TOP and the rule", () => {
    const TITLE_TOP = 56
    const RULE_Y = 610
    const bandCenter = (TITLE_TOP + RULE_Y) / 2
    for (const heading of ["开演前十分钟", "Ten minutes to curtain", "开演前 Ten minutes"]) {
      const { root } = renderCover("playbill", slide(heading))
      const lines = Array.from(root.querySelectorAll("text")).filter(
        (t) => t.getAttribute("x") === "56" && t.getAttribute("font-weight") === "700",
      )
      expect(lines.length).toBeGreaterThanOrEqual(1)
      const fontSize = Number(lines[0]!.getAttribute("font-size"))
      const lineHeight = Number(lines[1]?.getAttribute("y") ?? lines[0]!.getAttribute("y")) - Number(lines[0]!.getAttribute("y")) || fontSize * 1.02
      const blockSpan = Math.max(0, lines.length - 1) * (lines.length > 1 ? lineHeight : 0)
      const firstY = Number(lines[0]!.getAttribute("y"))
      const expected = Math.round(bandCenter - blockSpan / 2 + 0.35 * fontSize)
      expect(firstY).toBe(expected)
      expect(firstY).toBeGreaterThan(TITLE_TOP + fontSize * 0.5)
    }
  })

  it("keeps the thick rule above the fifth band", () => {
    const { root } = renderCover("playbill")
    const rule = root.querySelector("rect")!
    expect(Number(rule.getAttribute("y")) + Number(rule.getAttribute("height"))).toBeLessThanOrEqual(620)
  })
})

describe("cover-bill-head — shared pool", () => {
  it("is registered for cover only, as an archetype", () => {
    expect(layoutDef.id).toBe("bill-head")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover background", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        if (isChipText(el)) {
          expect(
            contrastRatio(el.getAttribute("fill")!, tokens.colors.primary),
            `${themeId} chip: ${el.textContent}`,
          ).toBeGreaterThanOrEqual(requiredContrastRatio(Number(el.getAttribute("font-size"))))
          continue
        }
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("paints the date chip in foreground, not midground motif", () => {
    const tokens = resolveStyle("playbill")
    const s = slide()
    const doc = ir("playbill", FULL_META)
    doc.slides = [s]
    const { container } = render(<FullSlideSvg ir={doc} slide={s} index={0} />)
    const poly = container.querySelector("polygon")!
    expect(poly.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(poly.closest("[data-decor]")).toBeNull()
    const date = Array.from(container.querySelectorAll("text")).find((t) => t.textContent === FULL_META.date)!
    expect(date.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(poly.getAttribute("fill")).toBe(tokens.colors.primary)
  })

  it("export chain keeps the date on the baked chip at clockwise 4°", () => {
    const { root } = renderCover("playbill")
    const ops = svgToOps(root)
    const textOp = ops.find(
      (op): op is Extract<Op, { kind: "text" }> =>
        op.kind === "text" && op.runs.some((run) => run.text === FULL_META.date),
    )
    expect(textOp, "date text must survive svgToOps").toBeTruthy()
    expect(textOp!.rotate).toBeCloseTo(4, 5)

    const svgText = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === FULL_META.date)!
    const fontSizePx = num(svgText, "font-size")
    const svgAnchor = applyPoint(parseTransform(svgText.getAttribute("transform")!), num(svgText, "x"), num(svgText, "y"))
    const cx = (textOp!.x + textOp!.w / 2) * PX_PER_IN
    const cy = (textOp!.y + textOp!.h / 2) * PX_PER_IN
    const hPx = textOp!.h * PX_PER_IN
    const ascent = 0.8 * fontSizePx
    const dy = -hPx / 2 + ascent
    const rad = ((textOp!.rotate ?? 0) * Math.PI) / 180
    const baselineX = cx - dy * Math.sin(rad)
    const baselineY = cy + dy * Math.cos(rad)
    expect(baselineX).toBeCloseTo(svgAnchor.x, 5)
    expect(baselineY).toBeCloseTo(svgAnchor.y, 5)

    const pts = polygonPoints(root.querySelector("polygon")!)
    const x0 = Math.min(...pts.map((p) => p.x))
    const x1 = Math.max(...pts.map((p) => p.x))
    const y0 = Math.min(...pts.map((p) => p.y))
    const y1 = Math.max(...pts.map((p) => p.y))
    expect(baselineX).toBeGreaterThan(x0)
    expect(baselineX).toBeLessThan(x1)
    expect(baselineY).toBeGreaterThan(y0)
    expect(baselineY).toBeLessThan(y1)
    expect(textOp!.w * PX_PER_IN).toBeLessThan(PATCH_W)
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("playbill").markup).toBe(renderCover("playbill").markup)
  })
})
