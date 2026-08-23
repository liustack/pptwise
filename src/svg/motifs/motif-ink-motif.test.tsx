// @vitest-environment jsdom
//
// ink-motif wave 8 batch 2: keep the remnant mountain and the colophon
// rail, split by page type so they do not collide with the new pinOnly
// faces. Cover keeps the left remnant only. Chapter yields. Content keeps
// the rail at x>=1220. Ending moves the remnant to the lower right.
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle } from "../../themes"
import { InkMotif } from "./motif-ink-motif"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  countDecorPieces,
  leafOpacity,
  leafPaint,
  paintedLeaves,
} from "./decor-budget"
import { blendOver, contrastRatio } from "../ink"
import { textInkBox } from "../depth-contract/geometry"
import type { PptxIR, Slide } from "@/ir"

const slideOf = (type: Slide["type"]): Slide => ({ type, heading: "标题", components: [] }) as Slide
const SLIDE_TYPES = ["cover", "chapter", "content", "ending"] as const

const REMNANT_LEFT = "M -40 720 Q 140 640 330 690 Q 430 708 500 720 Z"
const REMNANT_RIGHT = "M 1320 720 Q 1140 640 950 690 Q 850 708 780 720 Z"
const RAIL_X = 1220
const BR_LOGO = { x: 1120, y: 630, w: 96, h: 40 }

function ir(meta: PptxIR["meta"] = { organization: "云帆科技", date: "2026-08-15" }): PptxIR {
  return {
    version: "4",
    filename: "ink-motif.pptx",
    theme: { id: "ink" },
    meta,
    assets: { images: {} },
    slides: [slideOf("cover")],
  } as unknown as PptxIR
}

const tokens = resolveStyle("ink")

function render(type: Slide["type"], meta?: PptxIR["meta"]) {
  const defaultBg = resolveBackgroundHex(tokens.defaultBackgrounds[type], tokens.colors.surface)
  const pageCtx = buildCtx(tokens, {}, undefined, defaultBg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <InkMotif ir={ir(meta)} slide={slideOf(type)} ctx={pageCtx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), defaultBg }
}

describe("ink-motif wave 8 — remnant mountain and colophon rail by page type", () => {
  it("cover paints only the left remnant, no rail and no second seal", () => {
    const { root } = render("cover")
    expect(countDecorPieces(root)).toBe(1)
    expect(root.querySelector("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("remnant")
    expect(root.querySelectorAll("path")).toHaveLength(1)
    expect(root.querySelector("path")?.getAttribute("d")).toBe(REMNANT_LEFT)
    expect(root.querySelector("path")?.getAttribute("opacity")).toBe("0.06")
    expect(root.querySelector("path")?.getAttribute("fill")).toBe(tokens.colors.primary)
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })

  it("chapter yields completely", () => {
    const { root } = render("chapter")
    expect(root.children).toHaveLength(0)
    expect(countDecorPieces(root)).toBe(0)
  })

  it("ending paints the right remnant, no rail and no motif seal", () => {
    const { root } = render("ending")
    expect(countDecorPieces(root)).toBe(1)
    expect(root.querySelector("path")?.getAttribute("d")).toBe(REMNANT_RIGHT)
    expect(root.querySelector("path")?.getAttribute("opacity")).toBe("0.06")
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(root.querySelectorAll("rect")).toHaveLength(0)
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })

  it("content keeps the colophon rail at or right of x1220, one grouped piece", () => {
    const { root } = render("content")
    expect(countDecorPieces(root)).toBe(1)
    expect(root.querySelector("[data-decor-piece]")?.getAttribute("data-decor-piece")).toBe("colophon")
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(1)
    expect(root.querySelectorAll("rect")).toHaveLength(2)
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent).join("")).toBe(
      "云帆科技二〇二六年八月",
    )

    const xs: { what: string; x: number }[] = []
    for (const el of Array.from(root.querySelectorAll("line"))) {
      xs.push({ what: "line x1", x: Number(el.getAttribute("x1")) })
      xs.push({ what: "line x2", x: Number(el.getAttribute("x2")) })
    }
    for (const el of Array.from(root.querySelectorAll("rect"))) {
      xs.push({ what: "rect x", x: Number(el.getAttribute("x")) })
    }
    for (const el of Array.from(root.querySelectorAll("text"))) {
      const size = Number(el.getAttribute("font-size"))
      xs.push({ what: `glyph "${el.textContent}" left edge`, x: Number(el.getAttribute("x")) - size / 2 })
    }
    expect(xs.length).toBeGreaterThan(10)
    for (const { what, x } of xs) expect(x, what).toBeGreaterThanOrEqual(RAIL_X)
  })

  it("content rail ink stays clear of the bottom-right logo box", () => {
    const { root } = render("content")
    const RULE_HALF_STROKE = 0.6
    const inkLeftEdges: number[] = [RAIL_X - RULE_HALF_STROKE]
    for (const el of Array.from(root.querySelectorAll("rect"))) {
      inkLeftEdges.push(Number(el.getAttribute("x")))
    }
    for (const el of Array.from(root.querySelectorAll("text"))) {
      inkLeftEdges.push(Number(el.getAttribute("x")) - Number(el.getAttribute("font-size")) / 2)
    }
    for (const x of inkLeftEdges) expect(x).toBeGreaterThan(BR_LOGO.x + BR_LOGO.w)
  })

  it("content-page rail recedes below the 3:1 large-text floor", () => {
    const { root, defaultBg } = render("content")
    for (const el of paintedLeaves(root)) {
      const paint = leafPaint(el)
      if (!paint) continue
      const composite = blendOver(paint.color, defaultBg, leafOpacity(el))
      expect(contrastRatio(composite, defaultBg)).toBeLessThan(CONTENT_DECOR_CONTRAST_CEILING)
    }
  })

  it("content column glyphs stay inside the canvas", () => {
    const { root } = render("content")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      const box = textInkBox({
        content: el.textContent ?? "",
        x: Number(el.getAttribute("x")),
        y: Number(el.getAttribute("y")),
        fontSize: Number(el.getAttribute("font-size")),
        fontFamily: el.getAttribute("font-family") ?? "",
        fontWeight: el.getAttribute("font-weight"),
        textAnchor: el.getAttribute("text-anchor") ?? "start",
      })
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.x + box.w).toBeLessThanOrEqual(1280)
      expect(box.y + box.h).toBeLessThanOrEqual(720)
    }
  })

  it("the column stays clear of the seal — the last glyph's baseline never reaches it", () => {
    const { root } = render("content", { organization: "云".repeat(20), date: "2026-11-01" })
    const SEAL_TOP = 614
    const baselines = Array.from(root.querySelectorAll("text")).map((t) => Number(t.getAttribute("y")))
    expect(Math.max(...baselines)).toBeLessThan(SEAL_TOP)
  })

  it("a too-long org is truncated with an ellipsis and marked, not silently cut", () => {
    const { root } = render("content", { organization: "云".repeat(20), date: "2026-08-15" })
    const glyphs = Array.from(root.querySelectorAll("text"))
    const orgGlyphs = glyphs.filter((t) => Number(t.getAttribute("font-size")) === 19)
    expect(orgGlyphs.length).toBeLessThan(20)
    expect(orgGlyphs[orgGlyphs.length - 1].textContent).toBe("…")
    expect(orgGlyphs[orgGlyphs.length - 1].getAttribute("data-truncated")).toBe("1")
    const short = render("content").root.querySelectorAll('[data-truncated="1"]')
    expect(short).toHaveLength(0)
  })

  it("records the column's real capacity limit: 11 glyphs with a date, and what that excludes", () => {
    const glyphCount = (org: string, date = "2026-08-15") =>
      Array.from(
        render("content", { organization: org, date }).root.querySelectorAll("text"),
      ).filter((t) => Number(t.getAttribute("font-size")) === 19).length
    const truncates = (org: string) =>
      render("content", { organization: org, date: "2026-08-15" }).root.querySelectorAll(
        '[data-truncated="1"]',
      ).length > 0

    expect(glyphCount("云".repeat(11))).toBe(11)
    expect(truncates("云".repeat(11))).toBe(false)
    expect(truncates("云".repeat(12))).toBe(true)
    expect(truncates("云帆科技")).toBe(false)
    expect(truncates("北京云帆科技有限公司")).toBe(false)
    expect(truncates("北京云帆科技有限责任公司")).toBe(true)
    expect(truncates("Meridian Analytics")).toBe(true)
    expect(glyphCount("云".repeat(20), "not a date")).toBe(17)
  })

  it("the year/month renders in Chinese numerals, and an unreadable date renders nothing rather than a guess", () => {
    const glyphsFor = (date: string | undefined) =>
      Array.from(render("content", { organization: "甲", date }).root.querySelectorAll("text"))
        .map((t) => t.textContent)
        .join("")
    expect(glyphsFor("2026-08-15")).toBe("甲二〇二六年八月")
    expect(glyphsFor("2026-10-01")).toBe("甲二〇二六年十月")
    expect(glyphsFor("2026-11-30")).toBe("甲二〇二六年十一月")
    expect(glyphsFor("2026/1/9")).toBe("甲二〇二六年一月")
    expect(glyphsFor("Q3 FY26")).toBe("甲")
    expect(glyphsFor("2026-13-01")).toBe("甲")
    expect(glyphsFor(undefined)).toBe("甲")
  })

  it("carries no meta at all when the deck declares neither org nor date — just the rule and the seal", () => {
    const { root } = render("content", {})
    expect(root.querySelectorAll("text")).toHaveLength(0)
    expect(root.querySelectorAll("line")).toHaveLength(1)
    expect(root.querySelectorAll("rect")).toHaveLength(2)
  })

  it("every color comes from a theme token — no baked hex anywhere in the file", () => {
    const { root } = render("content")
    const { colors } = tokens
    expect(root.querySelector("line")!.getAttribute("stroke")).toBe(colors.border)
    const [seal, inner] = Array.from(root.querySelectorAll("rect"))
    expect(seal.getAttribute("fill")).toBe(colors.accent)
    expect(inner.getAttribute("stroke")).toBe(colors.surface)
    expect(inner.getAttribute("fill")).toBe(colors.accent)
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("fill")).toBe(colors.muted)
      expect(t.getAttribute("data-contrast-tier")).toBe("meta")
    }
  })

  it("emits only export-safe primitives (the SVG -> DrawingML subset)", () => {
    for (const type of SLIDE_TYPES) {
      expect(() => assertSubset(render(type).root), type).not.toThrow()
    }
  })

  it("is a pure function of (theme, slide type, deck meta) — repeated renders are byte-identical", () => {
    for (const type of SLIDE_TYPES) {
      expect(render(type).markup).toBe(render(type).markup)
    }
  })

  it("does not invent isolated corner ticks", () => {
    for (const type of ["cover", "content", "ending"] as const) {
      expect(countDecorPieces(render(type).root), type).toBe(1)
    }
  })
})
