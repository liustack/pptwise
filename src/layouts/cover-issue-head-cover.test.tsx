// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { contrastRatio, metaInk, requiredContrastRatio } from "../render/ink"
import { renderSlideSvg } from "../api"
import { IssueHeadCover, layoutDef } from "./cover-issue-head-cover"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "县城咖啡的第二个春天"
const SUBHEADING = "九个县、四十家店、三种活法：一线打法在县城为何失灵"

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "issue-head-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "观潮",
  date: "2026-08-15",
  authors: [{ name: "消费组" }],
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
      <IssueHeadCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens }
}

describe("cover-issue-head-cover — board geometry", () => {
  it("places the masthead name, date, wenwu rules, lead title, and colophon on the board", () => {
    const { root, tokens } = renderCover("journal")
    const name = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "观潮")
    expect(name?.getAttribute("x")).toBe("96")
    expect(name?.getAttribute("y")).toBe("120")
    expect(name?.getAttribute("font-weight")).toBe("700")
    expect(name?.getAttribute("fill")).toBe(tokens.colors.primary)

    const date = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("二〇二六年八月"))
    expect(date?.getAttribute("x")).toBe("1184")
    expect(date?.getAttribute("y")).toBe("120")
    expect(date?.getAttribute("text-anchor")).toBe("end")
    expect(date?.getAttribute("data-contrast-tier")).toBe("meta")

    const lines = Array.from(root.querySelectorAll("line"))
    const thick = lines.find((l) => l.getAttribute("y1") === "148")
    const thin = lines.find((l) => l.getAttribute("y1") === "156")
    expect(thick?.getAttribute("stroke-width")).toBe("3")
    expect(thin?.getAttribute("stroke-width")).toBe("1")
    expect(thick?.getAttribute("stroke")).toBe(tokens.colors.primary)
    expect(thin?.getAttribute("stroke")).toBe(tokens.colors.primary)
    expect(thick?.getAttribute("x1")).toBe("96")
    expect(thick?.getAttribute("x2")).toBe("1184")

    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("县城咖啡"))
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("280")
    expect(Number(title?.getAttribute("font-size"))).toBe(60)
    expect(title?.getAttribute("fill")).toBe(tokens.colors.text)

    const foot = lines.find((l) => l.getAttribute("y1") === "640")
    expect(foot?.getAttribute("stroke")).toBe(tokens.colors.border)

    const colophon = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("消费组"))
    expect(colophon?.getAttribute("y")).toBe("676")
  })

  it("keeps accent off the cover", () => {
    const { root, tokens } = renderCover("journal")
    const paints = [
      ...Array.from(root.querySelectorAll("text")).map((el) => el.getAttribute("fill")),
      ...Array.from(root.querySelectorAll("line")).map((el) => el.getAttribute("stroke")),
    ]
    expect(paints).not.toContain(tokens.colors.accent)
  })

  it("does not invent 第 24 期, and omits the date slot when meta.date is missing", () => {
    const withDate = renderCover("journal")
    const texts = Array.from(withDate.root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(texts.join("")).not.toContain("第 24 期")
    expect(texts.join("")).toContain("二〇二六年八月")

    const { root } = renderCover("journal", slide(), { organization: "观潮" })
    const right = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("text-anchor") === "end")
    expect(right).toHaveLength(0)
  })

  it("does not invent cover copy when heading is empty", () => {
    const { root, markup } = renderCover("journal", slide("", { heading: "", subheading: "" }))
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("县城咖啡")
    const titles = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("font-weight") === "700")
    expect(titles.some((t) => (t.textContent ?? "").includes("观潮"))).toBe(true)
    expect(titles.some((t) => (t.textContent ?? "").includes("春天"))).toBe(false)
  })
})

describe("cover-issue-head-cover — shared pool", () => {
  it("is registered as a pinOnly cover", () => {
    expect(layoutDef.id).toBe("issue-head-cover")
    expect(layoutDef.kind).toBe("archetype")
    expect(layoutDef.pinOnly).toBe(true)
    expect(layoutDef.branding).toBe("none")
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the cover background", () => {
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

  it("uses tokens, not a baked journal hex, when another theme borrows it", () => {
    const { markup, tokens, root } = renderCover("tech")
    expect(markup).toContain(tokens.colors.primary)
    expect(markup).not.toContain("#2C2C2A")
    expect(markup).not.toContain("#8C4A3C")
    expect(markup).not.toContain("#EFEBE1")
    expect(root.querySelector("line")?.getAttribute("stroke")).toBe(tokens.colors.primary)
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("journal").markup).toBe(renderCover("journal").markup)
  })

  it("CJK title has no letter-spacing", () => {
    const { root } = renderCover("journal")
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("县城咖啡"))
    expect(title?.getAttribute("letter-spacing")).toBeNull()
  })

  it("date meta ink follows metaInk against the field", () => {
    const { root, tokens } = renderCover("journal")
    const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    const date = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("二〇二六"))!
    expect(date.getAttribute("fill")).toBe(metaInk(tokens.colors.muted, bg))
  })
})

describe("cover-issue-head-cover — optical center", () => {
  it("does not stack a motif foot line under the layout foot, and hangs the title closer to the masthead", () => {
    const deck: PptxIR = {
      version: "5",
      filename: "issue-head-center.pptx",
      theme: { id: "journal" },
      meta: FULL_META,
      assets: { images: {} },
      seed: 1,
      slides: [{ type: "cover", layout: "issue-head-cover", heading: HEADING, subheading: SUBHEADING, components: [] }],
    } as unknown as PptxIR
    const root = parseSvgRoot(renderSlideSvg(deck, 0))
    expect(root.querySelector('line[y1="712"]')).toBeNull()
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("№"))).toBe(false)
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("县城咖啡"))
    expect(title?.getAttribute("y")).toBe("280")
    expect(layoutDef.suppressMotif).toBe(true)
  })
})
