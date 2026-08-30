// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, FullSlideSvg, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle, CANONICAL_THEME_IDS } from "../themes"
import { accessibleInk, contrastRatio, requiredContrastRatio, readableOn } from "../render/ink"
import { textInkBox } from "../render/depth-contract/geometry"
import { VerticalTitleCover, layoutDef } from "./cover-vertical-title-cover"
import { sealStudioGlyph } from "./minimal-shared"
import type { PptxIR, Slide } from "@/ir"

const HEADING = "宋词里的江南"
const SUBHEADING = "烟雨 · 舟楫 · 灯火"
const INK_HEX = ["#F7F2E7", "#FCF9F2", "#1F1C18", "#C3272B", "#262421", "#686056", "#DCD2BD"]

function slide(heading = HEADING, extras: Partial<Slide> = {}): Slide {
  return { type: "cover", heading, subheading: SUBHEADING, components: [], ...extras } as Slide
}

function ir(themeId: string, meta: PptxIR["meta"] = {}, s: Slide = slide()): PptxIR {
  return {
    version: "5",
    filename: "vertical-title-cover.pptx",
    theme: { id: themeId },
    meta,
    assets: { images: {} },
    slides: [s],
  } as unknown as PptxIR
}

const FULL_META: PptxIR["meta"] = {
  organization: "听雨书院 · 秋季雅集第四讲",
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
      <VerticalTitleCover ir={ir(themeId, meta, s)} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

function writingModeCount(root: Element): number {
  return Array.from(root.querySelectorAll("*")).filter((el) => el.hasAttribute("writing-mode")).length
}

function verticalTitleGlyphs(root: Element): Element[] {
  return Array.from(root.querySelectorAll("text")).filter((t) => {
    const x = t.getAttribute("x")
    return x === "880" || x === "784"
  })
}

function sealGlyphEl(root: Element): Element | undefined {
  return Array.from(root.querySelectorAll("text")).find(
    (t) => t.getAttribute("font-size") === "34" && t.getAttribute("x") === "1084",
  )
}

describe("cover-vertical-title-cover — board geometry", () => {
  it("sets a per-glyph CJK title on the right axis at the board coordinates", () => {
    const { root } = renderCover("ink")
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "880")
    expect(glyphs.map((t) => t.textContent).join("")).toBe(HEADING)
    expect(glyphs[0]?.getAttribute("y")).toBe("110")
    expect(glyphs[0]?.getAttribute("font-size")).toBe("72")
    expect(glyphs[0]?.getAttribute("text-anchor")).toBe("middle")
    expect(glyphs.map((t) => t.getAttribute("y"))).toEqual(["110", "194", "278", "362", "446", "530"])
    expect(writingModeCount(root)).toBe(0)
    for (const glyph of glyphs) expect(glyph.getAttribute("letter-spacing")).toBeNull()
  })

  it("sets a short vertical subtitle to the left of the title column", () => {
    const { root } = renderCover("ink")
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.getAttribute("x") === "778")
    expect(glyphs.map((t) => t.textContent).join("")).toBe("烟雨·舟楫·灯火")
    expect(glyphs[0]?.getAttribute("y")).toBe("130")
    expect(glyphs[0]?.getAttribute("font-size")).toBe("22")
    expect(glyphs[0]?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("paints one vermilion seal and takes the first CJK from org, never a baked 聽", () => {
    const { root, tokens } = renderCover("ink")
    const seal = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "72" && r.getAttribute("height") === "72",
    )
    expect(seal?.getAttribute("x")).toBe("1048")
    expect(seal?.getAttribute("y")).toBe("480")
    expect(seal?.getAttribute("fill")).toBe(tokens.colors.accent)
    const glyph = sealGlyphEl(root)
    expect(glyph?.textContent).toBe("听")
    expect(glyph?.getAttribute("x")).toBe("1084")
    expect(glyph?.getAttribute("y")).toBe("530")
    expect(glyph?.getAttribute("fill")).toBe(readableOn(tokens.colors.accent))
    expect(root.querySelector("rect[width='20'][height='20']")).toBeFalsy()
    expect(root.textContent).not.toContain("聽")
    expect(root.textContent).not.toContain("茗")
  })

  it("places the organization foot line at the board coordinate", () => {
    const { root } = renderCover("ink")
    const foot = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("听雨书院"),
    )
    expect(foot?.getAttribute("x")).toBe("96")
    expect(foot?.getAttribute("y")).toBe("630")
    expect(foot?.getAttribute("data-contrast-tier")).toBe("meta")
  })

  it("keeps every vertical glyph box inside the canvas", () => {
    const { root } = renderCover("ink")
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

  it("does not invent cover copy when heading is empty, and draws no seal without org CJK", () => {
    const { root, markup } = renderCover("ink", slide("", { heading: "", subheading: "" }), {})
    expect(markup).not.toContain("Thank you")
    expect(markup).not.toContain("谢谢")
    expect(markup).not.toContain("宋词里的江南")
    expect(markup).not.toContain("聽")
    expect(verticalTitleGlyphs(root)).toHaveLength(0)
    expect(root.querySelector("rect[width='72']")).toBeFalsy()
    expect(sealGlyphEl(root)).toBeFalsy()
  })

  it("sets a Latin title horizontally on the left, never as a vertical column", () => {
    const { root } = renderCover("ink", slide("Jiangnan in the Lyrics"))
    expect(writingModeCount(root)).toBe(0)
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("Jiangnan"),
    )
    expect(title?.getAttribute("x")).toBe("96")
    expect(title?.getAttribute("y")).toBe("300")
    expect(title?.getAttribute("text-anchor")).not.toBe("middle")
    const singles = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "J")
    expect(singles).toHaveLength(0)
  })
})

describe("cover-vertical-title-cover — shared pool", () => {
  it("is registered as a cover face that does not paint its own background", () => {
    expect(layoutDef.id).toBe("vertical-title-cover")
    expect(layoutDef.kind).toBe("standard")
    expect("paintsOwnBackground" in layoutDef).toBe(false)
    expect(layoutDef.slideTypes).toEqual(["cover"])
  })

  it("every text run clears its contrast tier against the painted ground", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      const cases: PptxIR["meta"][] = [FULL_META, { organization: "战略与运营部" }, {}]
      for (const meta of cases) {
        const { root, tokens, ctx } = renderCover(themeId, slide(), meta)
        const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
        for (const el of Array.from(root.querySelectorAll("text"))) {
          const size = Number(el.getAttribute("font-size"))
          const fill = el.getAttribute("fill")!
          const required = el.getAttribute("data-contrast-tier") === "meta" ? 3 : requiredContrastRatio(size)
          const onSeal = el === sealGlyphEl(root)
          const ground = onSeal ? tokens.colors.accent : bg
          expect(contrastRatio(fill, ground), `${themeId}: ${el.textContent}`).toBeGreaterThanOrEqual(required)
        }
      }
    }
  })

  it("uses tokens, not a baked ink hex, when another theme borrows it", () => {
    const { markup, tokens } = renderCover("tech")
    expect(markup).toContain(tokens.colors.accent)
    for (const hex of INK_HEX) expect(markup).not.toContain(hex)
  })

  it("emits only export-safe primitives", () => {
    for (const themeId of CANONICAL_THEME_IDS) {
      expect(() => assertSubset(renderCover(themeId).root), themeId).not.toThrow()
    }
  })

  it("renders byte-identically on repeat", () => {
    expect(renderCover("ink").markup).toBe(renderCover("ink").markup)
  })
})

describe("cover-vertical-title-cover — vertical overflow without ellipsis", () => {
  it("keeps a short CJK title on the board single column", () => {
    const { root, markup } = renderCover("ink")
    const glyphs = verticalTitleGlyphs(root)
    expect(glyphs.map((t) => t.textContent).join("")).toBe("宋词里的江南")
    expect(glyphs.map((t) => t.getAttribute("x"))).toEqual(["880", "880", "880", "880", "880", "880"])
    expect(glyphs.map((t) => t.getAttribute("y"))).toEqual(["110", "194", "278", "362", "446", "530"])
    expect(glyphs[0]?.getAttribute("font-size")).toBe("72")
    expect(markup).not.toContain("…")
  })

  it("packs a long CJK title into two columns under the six-character line", () => {
    const heading = "云觅科技 2026 年战略复盘与明年规划"
    const { root, markup } = renderCover("ink", slide(heading))
    const glyphs = verticalTitleGlyphs(root)
    expect(glyphs.map((t) => t.textContent).join("")).toBe("云觅科技二〇二六年战略复盘与明年规划")
    expect(markup).not.toContain("…")
    const xs = [...new Set(glyphs.map((t) => t.getAttribute("x")))]
    expect(xs.every((x) => x === "880" || x === "784")).toBe(true)
    expect(xs).toContain("880")
    expect(xs.length).toBeGreaterThanOrEqual(1)
    expect(xs.length).toBeLessThanOrEqual(2)
    expect(Number(glyphs[0]?.getAttribute("font-size"))).toBeLessThan(72)
    const lastY = Math.max(...glyphs.map((t) => Number(t.getAttribute("y"))))
    expect(lastY).toBeLessThanOrEqual(530)
    expect(Array.from(root.querySelectorAll("text")).some((t) => t.textContent === "烟")).toBe(false)
    const sub = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("烟雨"),
    )
    if (sub) {
      expect(sub.getAttribute("y")).toBe("580")
      expect(sub.getAttribute("font-size")).toBe("16")
      expect(sub.getAttribute("data-contrast-tier")).toBe("meta")
    }
  })

  it("keeps a gallery-length subtitle on one horizontal line or omits it", () => {
    const subheading = "副".repeat(22)
    const { root, markup } = renderCover("ink", slide(HEADING, { subheading }))
    expect(markup).not.toContain("…")
    const singles = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "副")
    expect(singles).toHaveLength(0)
    const horiz = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === subheading)
    expect(horiz.length).toBeLessThanOrEqual(1)
    if (horiz[0]) {
      expect(horiz[0].getAttribute("y")).toBe("580")
      expect(horiz[0].getAttribute("font-size")).toBe("16")
      expect(horiz[0].getAttribute("data-contrast-tier")).toBe("meta")
      expect(horiz[0].getAttribute("x")).toBe("96")
    }
  })

  it("never leaves the drop-cap as an orphan ink when the accent cannot hold it", () => {
    // consulting: accent is 1.51:1 at title size, so the first glyph must not
    // fall back to accessibleInk's orphan near-black while the rest of the
    // column stays on titleInk — the half-and-half defect from the
    // 2026-08-25 ink-duty audit. The whole column shares one ink instead.
    const consulting = renderCover("consulting")
    const singles = Array.from(consulting.root.querySelectorAll("text")).filter(
      (t) => t.textContent?.length === 1 && t.getAttribute("text-anchor") === "middle",
    )
    // The title column is the largest glyph run on the page; the org column
    // and seal paint at smaller sizes with their own inks.
    const titleSize = Math.max(...singles.map((t) => Number(t.getAttribute("font-size"))))
    const glyphs = singles.filter((t) => Number(t.getAttribute("font-size")) === titleSize)
    expect(glyphs.length).toBeGreaterThan(4)
    const fills = new Set(glyphs.map((t) => t.getAttribute("fill")))
    expect(fills.size).toBe(1)
  })

  it("drops a subtitle that would ellipsize rather than painting …", () => {
    const { root, markup } = renderCover("ink", slide(HEADING, { subheading: "副".repeat(200) }))
    expect(markup).not.toContain("…")
    expect(Array.from(root.querySelectorAll("text")).some((t) => (t.textContent ?? "").includes("副"))).toBe(
      false,
    )
  })

  it("cuts an extreme CJK title instead of painting an ellipsis", () => {
    const heading = "江".repeat(40)
    const { root, markup } = renderCover("ink", slide(heading, { subheading: "" }))
    expect(markup).not.toContain("…")
    const glyphs = Array.from(root.querySelectorAll("text")).filter((t) => t.textContent === "江")
    expect(glyphs.length).toBeLessThan(40)
    expect(glyphs.length).toBeGreaterThan(0)
    expect(glyphs[glyphs.length - 1]?.getAttribute("data-truncated")).toBe("1")
    expect(root.querySelector("[data-dropped]")?.getAttribute("data-dropped")).toBe(
      String(40 - glyphs.length),
    )
    const lastY = Math.max(...glyphs.map((t) => Number(t.getAttribute("y"))))
    expect(lastY).toBeLessThanOrEqual(530)
    const xs = [...new Set(glyphs.map((t) => t.getAttribute("x")))]
    expect(xs.every((x) => x === "880" || x === "784")).toBe(true)
    expect(xs.length).toBeLessThanOrEqual(2)
  })
})

describe("cover-vertical-title-cover — vertical digits and Latin path", () => {
  it("sets ASCII digits as CJK numerals in a vertical title", () => {
    const { root } = renderCover("ink", slide("云觅科技 2026 年", { subheading: "" }))
    const glyphs = Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")
    expect(glyphs.join("")).toContain("二〇二六")
    expect(glyphs.some((ch) => ch === "2")).toBe(false)
    expect(glyphs.some((ch) => ch === "0")).toBe(false)
    expect(glyphs.some((ch) => ch === "6")).toBe(false)
  })

  it("leaves Arabic digits on a Latin horizontal title at x96", () => {
    const { root } = renderCover("ink", slide("Report 2026", { subheading: "" }))
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("Report"),
    )
    expect(title?.textContent).toContain("2026")
    expect(title?.getAttribute("x")).toBe("96")
    expect(root.textContent).not.toContain("二〇二六")
  })
})

describe("sealStudioGlyph", () => {
  it("takes the studio name's first CJK, never a baked 聽", () => {
    expect(sealStudioGlyph("听雨书院 · 秋季雅集第四讲")).toBe("听")
    expect(sealStudioGlyph("听雨书院")).toBe("听")
  })

  it("refuses modern department suffixes and empty org", () => {
    expect(sealStudioGlyph("战略与运营部")).toBeUndefined()
    expect(sealStudioGlyph(undefined)).toBeUndefined()
    expect(sealStudioGlyph("")).toBeUndefined()
  })
})

describe("cover-vertical-title-cover — seal rules", () => {
  it("paints 听 from 听雨书院 and never 聽, leaving the title on primary", () => {
    const { root, tokens, ctx } = renderCover("ink")
    const glyph = sealGlyphEl(root)
    expect(glyph?.textContent).toBe("听")
    expect(root.textContent).not.toContain("聽")
    const first = verticalTitleGlyphs(root)[0]
    const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    const size = Number(first?.getAttribute("font-size"))
    expect(first?.getAttribute("fill")).toBe(accessibleInk(tokens.colors.primary, bg, size))
    expect(first?.getAttribute("fill")).not.toBe(accessibleInk(tokens.colors.accent, bg, size))
  })

  it("draws no 72×72 seal for 战略与运营部 and inks the first title glyph", () => {
    const { root, tokens, ctx } = renderCover("ink", slide(), { organization: "战略与运营部" })
    expect(root.querySelector("rect[width='72'][height='72']")).toBeFalsy()
    expect(root.querySelector("rect[width='20'][height='20']")).toBeFalsy()
    expect(sealGlyphEl(root)).toBeFalsy()
    const first = verticalTitleGlyphs(root)[0]
    const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    const size = Number(first?.getAttribute("font-size"))
    const fill = first?.getAttribute("fill")
    expect(fill).toBe(accessibleInk(tokens.colors.accent, bg, size))
    expect(contrastRatio(fill!, bg)).toBeGreaterThanOrEqual(requiredContrastRatio(size))
  })

  it("inks the first title glyph when org is missing", () => {
    const { root, tokens, ctx } = renderCover("ink", slide(), {})
    expect(root.querySelector("rect[width='72'][height='72']")).toBeFalsy()
    const first = verticalTitleGlyphs(root)[0]
    const bg = ctx.defaultBg ?? resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    expect(first?.getAttribute("fill")).toBe(
      accessibleInk(tokens.colors.accent, bg, Number(first?.getAttribute("font-size"))),
    )
  })

  it("draws a 20×20 vermilion square when heading and org are both empty", () => {
    const { root, tokens } = renderCover("ink", slide("", { heading: "", subheading: "" }), {})
    expect(root.querySelector("rect[width='72'][height='72']")).toBeFalsy()
    const dot = Array.from(root.querySelectorAll("rect")).find(
      (r) => r.getAttribute("width") === "20" && r.getAttribute("height") === "20",
    )
    expect(dot?.getAttribute("x")).toBe("1048")
    expect(dot?.getAttribute("y")).toBe("480")
    expect(dot?.getAttribute("fill")).toBe(tokens.colors.accent)
  })
})

describe("cover-vertical-title-cover — FullSlideSvg remnant", () => {
  it("keeps the left remnant mountain when the org foot is present", () => {
    const s = slide(HEADING, {  })
    const markup = renderSvgMarkup(<FullSlideSvg ir={ir("ink", FULL_META, s)} slide={s} index={0} />)
    const root = parseSvgRoot(markup)
    const remnant = root.querySelector('[data-decor-piece="remnant"]')
    expect(remnant).not.toBeNull()
    expect(remnant?.innerHTML ?? "").toContain("M -40 720 Q 140 640")
    expect(remnant?.querySelector("path")).not.toBeNull()
  })
})
