// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { CutPanelCover, layoutDef } from "./cover-cut-panel-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "S3 点火"
const SUBHEADING = "八城海选 · 十六强线下 · 总决赛主场馆"
const DATE = "2026.10 - 2027.01"
const ARENA_HEX = ["#120B22", "#1B1233", "#241847", "#52F2A8", "#F2F3F7", "#A79FC4", "#3A2D63"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "cut-panel-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "星环杯 · 城市邀请赛",
  date: DATE,
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
      <CutPanelCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

function titleEl(root: Element): Element | undefined {
  return Array.from(root.querySelectorAll("text")).find(
    (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
  )
}

describe("cover-cut-panel-cover — board geometry", () => {
  it("paints the cut panel and light-strip at the board coordinates", () => {
    const { root, tokens } = renderCover("arena")
    const panel = root.querySelector("polygon")
    expect(panel?.getAttribute("points")).toBe("0,236 748,236 688,484 0,484")
    expect(panel?.getAttribute("fill")).toBe(tokens.colors.surface)
    const strip = root.querySelector("line")
    expect(strip?.getAttribute("x1")).toBe("748")
    expect(strip?.getAttribute("y1")).toBe("236")
    expect(strip?.getAttribute("x2")).toBe("688")
    expect(strip?.getAttribute("y2")).toBe("484")
    expect(strip?.getAttribute("stroke-width")).toBe("5")
    expect(strip?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(root.querySelectorAll("path")).toHaveLength(0)
    expect(root.querySelectorAll("rect")).toHaveLength(0)
  })

  it("places the accent title inside the panel and leaves the right side open", () => {
    const { root, tokens } = renderCover("arena")
    const title = titleEl(root)
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("352")
    expect(Number(title?.getAttribute("font-size"))).toBe(96)
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    expect(title?.textContent).toBe(HEADING)
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, tokens.colors.surface, 96))
    const rightHeavy = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && Number(t.getAttribute("x")) > 200,
    )
    expect(rightHeavy).toHaveLength(0)
  })

  it("places the organization kicker at the board coordinate without CJK tracking", () => {
    const { root } = renderCover("arena")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("星环杯"),
    )
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("150")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("puts subheading on the panel and date on the foot line", () => {
    const { root } = renderCover("arena")
    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("八城海选"),
    )
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("440")
    const foot = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === DATE)
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("662")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("fills the foot from subheading when date is missing, without duplicating it", () => {
    const { root } = renderCover("arena", slide(), { organization: "星环杯 · 城市邀请赛" })
    const copies = Array.from(root.querySelectorAll("text")).filter((t) =>
      (t.textContent ?? "").includes("八城海选"),
    )
    expect(copies).toHaveLength(1)
    expect(copies[0]?.getAttribute("y")).toBe("662")
  })

  it("does not invent cover copy when heading is empty", () => {
    const { root, markup } = renderCover("arena", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("S3 点火")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(titleEl(root)).toBeUndefined()
    expect(root.querySelector("polygon")).toBeTruthy()
  })
})

describe("cover-cut-panel-cover — shared pool", () => {
  it("is registered as a cover face that does not paint its own background", () => {
    expect(layoutDef.id).toBe("cut-panel-cover")
    expect(layoutDef.kind).toBe("standard")
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the surface it sits on", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const pageBg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const y = Number(el.getAttribute("y"))
        const onPanel = y >= 236 && y <= 484
        const ground = onPanel ? tokens.colors.surface : pageBg
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("uses tokens, not a baked arena hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.surface)
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of ARENA_HEX) expect(markup, hex).not.toContain(hex)
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("arena").markup).toBe(renderCover("arena").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("arena")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("kicker meta ink follows metaInk against the page ground", () => {
    const { root, tokens } = renderCover("arena")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("星环杯"),
    )!
    const pageBg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    expect(kicker.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, pageBg))
  })

  it("does not paint an ellipsis, even on an extreme title", () => {
    const { markup: shortMarkup } = renderCover("arena")
    expect(shortMarkup).not.toContain("…")
    expect(shortMarkup).not.toContain("...")
    const { root, markup } = renderCover("arena", slide("火".repeat(40)))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = titleEl(root)
    expect((title?.textContent ?? "").length).toBeGreaterThan(0)
    expect((title?.textContent ?? "").length).toBeLessThan(40)
    expect(Number(title?.getAttribute("font-size"))).toBeLessThanOrEqual(96)
  })

  it("paints a 13-CJK-char title in full at ≥ 36pt with no ellipsis", () => {
    const { root, markup } = renderCover("arena", slide("年度增长结论与下一步投入"))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
    const title = titleEl(root)
    expect(title?.textContent).toBe("年度增长结论与下一步投入")
    expect(Number(title?.getAttribute("font-size"))).toBeGreaterThanOrEqual(36)
    expect(title?.getAttribute("data-truncated")).toBeNull()
  })
})
