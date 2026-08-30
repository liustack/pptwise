// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, readableOn, requiredContrastRatio } from "../render/ink"
import { ChalkBandCover, layoutDef } from "./cover-chalk-band-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "二次函数的图像与性质"
const SUBHEADING = "从一张抛物线，读出开口、顶点和对称轴"
const CLASSROOM_HEX = ["#ECF0F2", "#F9FBFC", "#4A6B8A", "#B96A5E", "#23282E", "#5A6470", "#D3DBE0"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "chalk-band-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "高一数学 · 必修一",
  authors: [{ name: "程雨桐", role: "明澜中学" }],
  date: "第 3 课时 · 共 4 课时 · **本节重点：顶点式**",
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
      <ChalkBandCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function textPaint(el: Element): string {
  const fill = el.getAttribute("fill")
  if (fill && fill !== "none") return fill
  return el.getAttribute("stroke") ?? ""
}

describe("cover-chalk-band-cover — board geometry", () => {
  it("paints an inset primary chalk band and inverted title at the board coordinates", () => {
    const { root, tokens } = renderCover("classroom")
    const band = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "1088" && r.getAttribute("height") === "176",
    )
    expect(band?.getAttribute("x")).toBe("96")
    expect(band?.getAttribute("y")).toBe("252")
    expect(band?.getAttribute("fill")).toBe(tokens.colors.primary)

    const title = Array.from(root.querySelectorAll("text")).find(
      (t) => t.getAttribute("font-weight") === "700" && (t.textContent ?? "").includes("二次函数"),
    )
    expect(title?.getAttribute("x")).toBe("152")
    expect(title?.getAttribute("y")).toBe("332")
    expect(Number(title?.getAttribute("font-size"))).toBeGreaterThanOrEqual(50)
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    expect(title?.getAttribute("fill")).toBe(readableOn(tokens.colors.primary))
  })

  it("places the inverted subtitle inside the band, not under it", () => {
    const { root, tokens } = renderCover("classroom")
    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("抛物线"),
    )
    expect(sub?.getAttribute("x")).toBe("152")
    expect(sub?.getAttribute("y")).toBe("392")
    expect(Number(sub?.getAttribute("y"))).toBeLessThan(252 + 176)
    expect(sub?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, tokens.colors.primary))
  })

  it("places the organization kicker above the band without CJK tracking", () => {
    const { root } = renderCover("classroom")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("高一数学"),
    )
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("128")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("paints the lesson/focus row under the band, with **emphasis** in accent", () => {
    const { root, tokens, ctx } = renderCover("classroom")
    const paper = ctx.defaultBg ?? tokens.colors.bg
    const focus = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("第 3 课时"),
    )
    expect(focus?.getAttribute("x")).toBe("96")
    expect(focus?.getAttribute("y")).toBe("530")
    const mark = Array.from(focus?.querySelectorAll("tspan") ?? []).find((t) =>
      (t.textContent ?? "").includes("本节重点"),
    )
    expect(mark).toBeTruthy()
    expect(mark?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, paper, 24))
  })

  it("places the author row at the board foot and does not invent a 授课 prefix", () => {
    const { root, markup } = renderCover("classroom")
    const author = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("程雨桐"),
    )
    expect(author?.getAttribute("x")).toBe("96")
    expect(author?.getAttribute("y")).toBe("662")
    expect(author?.textContent).toContain("明澜中学")
    expect(markup).not.toContain("授课")
  })

  it("does not draw a clay wave or a top-right band mark", () => {
    const { root } = renderCover("classroom")
    expect(root.querySelectorAll("path")).toHaveLength(0)
    const mark = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "26" && r.getAttribute("height") === "26",
    )
    expect(mark).toBeUndefined()
  })

  it("does not invent cover copy when heading is empty", () => {
    const { markup } = renderCover("classroom", slide("", { heading: "", subheading: "" }), {
      organization: "高一数学 · 必修一",
    })
    expect(markup).not.toContain("二次函数")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("本节重点")
  })
})

describe("cover-chalk-band-cover — shared pool", () => {
  it("is registered as a pinOnly cover named by composition, not theme", () => {
    expect(layoutDef.id).toBe("chalk-band-cover")
    expect(layoutDef.kind).toBe("standard")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the painted ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderCover(themeId)
      const paper = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      const field = tokens.colors.primary
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const y = Number(el.getAttribute("y"))
        const onBand = y >= 252 && y <= 428
        const ground = onBand ? field : paper
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        const tspans = Array.from(el.querySelectorAll("tspan"))
        if (tspans.length === 0) {
          const fill = textPaint(el)
          expect(contrastRatio(fill, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
        } else {
          for (const span of tspans) {
            const fill = span.getAttribute("fill") || textPaint(el)
            const pad = span.getAttribute("data-emphasis-pad-fill")
            const against = pad || ground
            expect(contrastRatio(fill, against), `${themeId}: ${span.textContent}`).toBeGreaterThanOrEqual(required)
          }
        }
      }
    }
  })

  it("uses tokens, not a baked classroom hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.primary)
    for (const hex of CLASSROOM_HEX) {
      expect(markup, `classroom token ${hex} leaked`).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("classroom").markup).toBe(renderCover("classroom").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("classroom")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })
})
