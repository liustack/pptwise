// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { ReportOpenCover, layoutDef } from "./cover-report-open-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "星桥集团员工健康年报"
const SUBHEADING = "2,340 人年度体检的解读与干预建议"
const DATE = "二〇二六年八月"
const PULSE_HEX = ["#F2F7F4", "#FBFDFC", "#0E6B5C", "#3D9B82", "#1E2B27", "#5A6C66", "#D5E2DC"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "report-open-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "安和健康 · 企业健康管理",
  authors: [{ name: "健康管理中心" }],
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
      <ReportOpenCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("cover-report-open-cover — board geometry", () => {
  it("places kicker, left title, subtitle, and date/authors sign-off on the board", () => {
    const { root } = renderCover("clinic")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("安和健康"),
    )
    expect(kicker?.getAttribute("x")).toBe("96")
    expect(kicker?.getAttribute("y")).toBe("150")
    expect(kicker?.getAttribute("letter-spacing")).toBeNull()
    expect(kicker?.getAttribute("data-contrast-tier")).toBe("meta")

    const headings = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700" && t.getAttribute("x") === "96",
    )
    expect(headings[0]?.getAttribute("y")).toBe("330")
    expect(Number(headings[0]?.getAttribute("font-size"))).toBe(58)
    expect(headings[0]?.getAttribute("text-anchor")).not.toBe("middle")
    expect(headings.map((t) => t.textContent).join("")).toContain("健康年报")

    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("年度体检"),
    )
    expect(sub?.getAttribute("x")).toBe("96")
    expect(sub?.getAttribute("y")).toBe("410")

    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes(DATE))
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("662")
    expect(foot?.textContent).toContain("健康管理中心")
  })

  it("does not paint a heartbeat, a full-bleed field, or a vertical bar", () => {
    const { root } = renderCover("clinic")
    expect(root.querySelector("path")).toBeNull()
    expect(root.querySelector("polyline")).toBeNull()
    expect(root.querySelector("rect[width='1280']")).toBeNull()
    const bars = Array.from(root.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) < 40 && Number(r.getAttribute("height")) > 30,
    )
    expect(bars).toHaveLength(0)
  })

  it("does not invent cover copy or a privacy line when heading and meta are empty", () => {
    const { root, markup } = renderCover("clinic", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("数据已脱敏")
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("星桥集团员工健康年报")
    expect(root.querySelectorAll("text")).toHaveLength(0)
  })

  it("skips the sign-off when date and authors are missing", () => {
    const { root } = renderCover("clinic", slide(), { organization: "安和健康" })
    const texts = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.some((t) => t.includes("安和健康"))).toBe(true)
    expect(texts.some((t) => t.includes(DATE))).toBe(false)
    expect(texts.join("")).not.toContain("数据已脱敏")
  })
})

describe("cover-report-open-cover — shared pool", () => {
  it("is registered as a cover face that does not paint its own background", () => {
    expect(layoutDef.id).toBe("report-open-cover")
    expect(layoutDef.kind).toBe("standard")
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the page ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens } = renderCover(themeId)
      const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const fill = el.getAttribute("fill")!
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(fill, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
      }
    }
  })

  it("uses tokens, not a baked clinic hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("terminal")
    expect(markup).toContain(tokens.colors.text)
    for (const hex of PULSE_HEX) {
      expect(markup, hex).not.toContain(hex)
    }
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("clinic").markup).toBe(renderCover("clinic").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("clinic")
    for (const t of Array.from(root.querySelectorAll("text")).filter(
      (el) => el.getAttribute("font-weight") === "700",
    )) {
      expect(t.getAttribute("letter-spacing")).toBeNull()
    }
  })

  it("kicker meta ink follows metaInk against the page ground", () => {
    const { root, tokens } = renderCover("clinic")
    const kicker = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("安和健康"),
    )!
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    expect(kicker.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))
  })

  it("does not paint an ellipsis when the title is too long", () => {
    const { markup } = renderCover("clinic", slide("年报解读与干预建议项".repeat(12)))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
