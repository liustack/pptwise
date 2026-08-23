// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { assertSubset } from "../subset-validate"
import { buildCtx, resolveBackgroundHex } from "../full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../../themes"
import { accessibleInk, contrastRatio, metaInk, requiredContrastRatio } from "../ink"
import { RedHeadCover, layoutDef } from "./cover-red-head-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "二〇二六年上半年工作汇报"
const SUBHEADING = "「一网通办」深化与基层减负专项"
const ORG = "市数字政务服务中心"
const DATE = "二〇二六年七月"
const AUTHOR = "政务服务工作专班"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "4",
    filename: "red-head-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: ORG,
  date: DATE,
  authors: [{ name: AUTHOR }],
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
      <RedHeadCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function texts(root: Element): string[] {
  return Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
}

describe("cover-red-head-cover — board geometry", () => {
  it("centers the red-head organization and the document title at the board coordinates", () => {
    const { root, tokens, ctx } = renderCover("vermilion")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const org = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("市数字政务"))
    expect(org?.getAttribute("x")).toBe("640")
    expect(org?.getAttribute("y")).toBe("150")
    expect(org?.getAttribute("text-anchor")).toBe("middle")
    expect(org?.getAttribute("font-weight")).toBe("700")
    expect(Number(org?.getAttribute("font-size"))).toBe(44)
    expect(org?.getAttribute("letter-spacing")).toBeNull()
    expect(org?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, 44))
    expect(org?.getAttribute("fill")).not.toBe(tokens.colors.accent)

    const title = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    expect(title?.getAttribute("x")).toBe("640")
    expect(title?.getAttribute("y")).toBe("380")
    expect(title?.getAttribute("text-anchor")).toBe("middle")
    expect(title?.getAttribute("font-weight")).toBe("700")
    expect(Number(title?.getAttribute("font-size"))).toBe(52)
    expect(title?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, bg, 52))
    expect(title?.getAttribute("fill")).not.toBe(tokens.colors.accent)
  })

  it("draws the red-plus-gold double rule as layout structure at the board coordinates", () => {
    const { root, tokens } = renderCover("vermilion")
    const red = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("stroke-width") === "4")
    expect(red?.getAttribute("x1")).toBe("200")
    expect(red?.getAttribute("x2")).toBe("1080")
    expect(red?.getAttribute("y1")).toBe("196")
    expect(red?.getAttribute("stroke")).toBe(tokens.colors.primary)

    const gold = Array.from(root.querySelectorAll("line")).find((l) => l.getAttribute("stroke-width") === "1")
    expect(gold?.getAttribute("x1")).toBe("200")
    expect(gold?.getAttribute("x2")).toBe("1080")
    expect(gold?.getAttribute("y1")).toBe("206")
    expect(gold?.getAttribute("stroke")).toBe(tokens.colors.accent)
    expect(gold?.getAttribute("data-depth")).toBeNull()
    expect(gold?.closest("[data-decor-role]")?.getAttribute("data-decor-role")).toBe("structure")
    expect(red?.closest("[data-decor-role]")?.getAttribute("data-decor-role")).toBe("structure")
  })

  it("places the subtitle and the date-plus-authors presentation line", () => {
    const { root, tokens, ctx } = renderCover("vermilion")
    const bg = ctx.defaultBg ?? tokens.colors.bg
    const sub = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("一网通办"))
    expect(sub?.getAttribute("x")).toBe("640")
    expect(sub?.getAttribute("y")).toBe("450")
    expect(sub?.getAttribute("text-anchor")).toBe("middle")
    expect(sub?.getAttribute("data-contrast-tier")).toBe("meta")
    expect(sub?.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))

    const foot = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes(DATE))
    expect(foot?.textContent).toBe(`${DATE} · ${AUTHOR}`)
    expect(foot?.getAttribute("y")).toBe("620")
    expect(foot?.getAttribute("text-anchor")).toBe("middle")
    expect(foot?.getAttribute("fill")).toBe(
      accessibleInk(tokens.colors.text, bg, Number(foot?.getAttribute("font-size"))),
    )
  })

  it("does not invent an agency name, a leading group, or cover copy when fields are empty", () => {
    const { root, markup } = renderCover("vermilion", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("市数字政务服务中心")
    expect(markup).not.toContain("领导小组")
    expect(markup).not.toContain("请审议")
    expect(texts(root).some((t) => t.includes("工作汇报"))).toBe(false)
    expect(Array.from(root.querySelectorAll("line"))).toHaveLength(2)
  })

  it("does not paint a full-bleed field of its own", () => {
    const { root } = renderCover("vermilion")
    expect(root.querySelector("rect[width='1280']")).toBeNull()
  })
})

describe("cover-red-head-cover — shared pool", () => {
  it("is registered as a pinOnly cover that does not paint its own background", () => {
    expect(layoutDef.id).toBe("red-head-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover paper", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const { root, tokens, ctx } = renderCover(themeId)
      const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
      for (const el of Array.from(root.querySelectorAll("text"))) {
        const size = Number(el.getAttribute("font-size"))
        const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
        expect(contrastRatio(el.getAttribute("fill")!, bg), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(
          required,
        )
      }
    }
  })

  it("vermilion gold accent is never used as type", () => {
    const { root, tokens } = renderCover("vermilion")
    for (const el of Array.from(root.querySelectorAll("text"))) {
      expect(el.getAttribute("fill"), el.textContent).not.toBe(tokens.colors.accent)
    }
  })

  it("uses tokens, not a baked vermilion hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.primary)
    expect(markup).toContain(tokens.colors.accent)
    expect(markup).not.toContain("#B02318")
    expect(markup).not.toContain("#C79A3B")
    expect(markup).not.toContain("#F6EFE3")
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("vermilion").markup).toBe(renderCover("vermilion").markup)
  })

  it("CJK title and red-head have no letter-spacing", () => {
    const { root } = renderCover("vermilion")
    for (const t of Array.from(root.querySelectorAll("text"))) {
      expect(t.getAttribute("letter-spacing"), t.textContent).toBeNull()
    }
  })

  it("does not paint an overflow mark", () => {
    const long = "基".repeat(80)
    const { markup } = renderCover("vermilion", slide(long, { subheading: "副".repeat(80) }))
    expect(markup).not.toContain("…")
    expect(markup).not.toContain("...")
  })
})
