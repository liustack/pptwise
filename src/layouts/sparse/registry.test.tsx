// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { boundThemeCtx } from "../../render/__fixtures__/theme-ctx"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { StatementContent } from "../content-statement"
import { OneEvidenceContent } from "../content-one-evidence"
import { PullQuoteContent } from "../content-pull-quote"
import { StatHeroContent } from "../content-stat-hero"
import { auditSvgMarkup } from "../../audit/svg-audit"
import { sparseFace } from "./registry"
import type { PptxIR, Slide } from "@/ir"

const VERSE = "设备不会突然坏，只是没人听它说话。"

function ir(theme: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function render(body: React.ReactElement): Element {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return parseSvgRoot(markup)
}

describe("sparseFace dispatch", () => {
  it("looks up by (themeId, layoutId) and misses fall through to undefined", () => {
    expect(sparseFace("statement", "stage")).toBeTypeOf("function")
    expect(sparseFace("statement", "lecture")).toBeTypeOf("function")
    expect(sparseFace("statement", "brief")).toBeTypeOf("function")
    expect(sparseFace("one-evidence", "stage")).toBeUndefined()
    expect(sparseFace("mono-bleed", "luxe")).toBeUndefined()
    expect(sparseFace("statement", undefined)).toBeUndefined()
  })

  it("the same statement IR is centered on stage, left on lecture, italic 500 on crayon", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE, components: [] } as Slide

    const stageCtx = boundThemeCtx("stage", {})
    const stageRoot = render(
      <StatementContent ir={ir("stage", [slide])} slide={slide} index={0} ctx={stageCtx} />,
    )
    const stageHeading = Array.from(stageRoot.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(stageHeading.getAttribute("x")).toBe("640")
    expect(stageHeading.getAttribute("text-anchor")).toBe("middle")
    expect(stageHeading.getAttribute("font-style")).not.toBe("italic")

    const lectureCtx = boundThemeCtx("lecture", {})
    const lectureRoot = render(
      <StatementContent ir={ir("lecture", [slide])} slide={slide} index={0} ctx={lectureCtx} />,
    )
    const lectureHeading = Array.from(lectureRoot.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(lectureHeading.getAttribute("x")).toBe("120")

    const crayonCtx = boundThemeCtx("crayon", {})
    const crayonRoot = render(
      <StatementContent ir={ir("crayon", [slide])} slide={slide} index={0} ctx={crayonCtx} />,
    )
    const crayonHeading = Array.from(crayonRoot.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(crayonHeading.getAttribute("x")).toBe("640")
    expect(crayonHeading.getAttribute("font-style")).toBe("italic")
    expect(crayonHeading.getAttribute("font-weight")).toBe("500")

    const consultingCtx = boundThemeCtx("brief", {})
    const consultingRoot = render(
      <StatementContent ir={ir("brief", [slide])} slide={slide} index={0} ctx={consultingCtx} />,
    )
    const consultingHeading = Array.from(consultingRoot.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(consultingHeading.getAttribute("x")).toBe("96")
    expect(consultingHeading.getAttribute("font-weight")).toBe("700")
    expect(consultingHeading.getAttribute("font-style")).not.toBe("italic")
  })

  it("an unregistered pair (stage, one-evidence) keeps the generic face", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "one-evidence",
      heading: "迁徙路线在十年里缩短了四成",
      components: [],
    } as Slide
    const ctx = boundThemeCtx("stage", {})
    const root = render(
      <OneEvidenceContent ir={ir("stage", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("迁徙路线"),
    )!
    expect(heading.getAttribute("x")).toBe("80")
    expect(heading.getAttribute("font-weight")).toBe("600")
    expect(root.querySelector("rect[stroke-dasharray]")).toBeNull()
  })
})

// A statement page's footnote used to be joined onto the line under the
// claim after a middle dot and fitted to one line with it, so a cited source
// was cut at about seventy characters. It stands on its own now, whole.
describe("a statement page's source under the sentence it closes", () => {
  const SOURCE =
    "来源：国家统计局《2025 年全国规模以上工业产能利用率》，中国机械工业联合会《2025 年机械工业经济运行报告》，作者整理与测算"
  const NOTE = "不是新建产线，而是把已有设备的开机率从六成拉到八成。"
  const THEMES = ["almanac", "ink", "journal", "ledger", "luxe", "memo", "terminal", "thesis", "vermilion", "brief", "lecture", "stage", "swiss", "museum", "rally"]

  it.each(THEMES)("%s sets the paragraph and the whole footnote on lines of their own", (theme) => {
    const slide: Slide = {
      type: "content",
      kind: "statement",
      heading: VERSE,
      components: [{ type: "paragraph", text: NOTE }],
      footnote: SOURCE,
    }
    const root = render(<StatementContent ir={ir(theme, [slide])} slide={slide} index={0} ctx={boundThemeCtx(theme, {})} />)
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.some((t) => (t.textContent ?? "").includes("·"))).toBe(false)
    expect(root.querySelector('[data-truncated="1"]')).toBeNull()
    const note = texts.find((t) => t.textContent === NOTE)
    expect(note, theme).toBeDefined()
    const source = texts.filter((t) => Number(t.getAttribute("font-size")) <= 20 && SOURCE.includes(t.textContent ?? "\u0000") && t.textContent !== NOTE)
    expect(source.map((t) => t.textContent ?? "").join("").replace(/\s/g, "")).toBe(SOURCE.replace(/\s/g, ""))
    for (const line of source) expect(Number(line.getAttribute("y"))).not.toBe(Number(note!.getAttribute("y")))
  })
})

// A quote's attribution and a hero figure's source used to take the page's
// footnote onto their one line, which ran off the page (most skins set it as
// written) or was cut at about seventy characters. Each sets the footnote on
// lines of its own now, or hands the page over whole.
describe("a quote's or a figure's source and the page's footnote under it", () => {
  const SOURCE =
    "Source: National Bureau of Statistics, 2025 industrial capacity utilisation survey; China Machinery Industry Federation annual report 2025; author's calculations"
  const footnoteWhole = (root: Element) =>
    Array.from(root.querySelectorAll("text"))
      .map((t) => t.textContent ?? "")
      .filter((t) => t.length > 0 && SOURCE.includes(t))
      .join(" ")
      .replace(/\s+/g, " ")
      .includes(SOURCE.replace(/\s+/g, " ").slice(0, 120))

  it.each(["thesis", "ledger", "luxe", "stage", "ink", "journal", "memo"])("%s pull quote", (theme) => {
    const slide: Slide = {
      type: "content",
      kind: "quote",
      heading: "What they said",
      components: [{ type: "blockquote", text: "The most expensive outage is the one nobody saw coming.", attribution: "Plant maintenance lead" }],
      footnote: SOURCE,
    }
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <PullQuoteContent ir={ir(theme, [slide])} slide={slide} index={0} ctx={boundThemeCtx(theme, {})} />
      </svg>,
    )
    const root = parseSvgRoot(markup)
    expect(root.querySelector('[data-truncated="1"]'), theme).toBeNull()
    expect(footnoteWhole(root), theme).toBe(true)
    expect(auditSvgMarkup(markup), theme).toEqual([])
  })

  it.each(["terminal", "almanac", "journal", "ledger", "luxe", "memo", "museum", "rally", "stage", "swiss", "thesis", "vermilion", "ink", "lecture"])("%s hero figure", (theme) => {
    const slide: Slide = {
      type: "content",
      kind: "fact",
      components: [{ type: "kpi_cards", items: [{ value: "62%", label: "Utilisation", source: "NBS survey" }] }],
      footnote: SOURCE,
    }
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <StatHeroContent ir={ir(theme, [slide])} slide={slide} index={0} ctx={boundThemeCtx(theme, {})} />
      </svg>,
    )
    const root = parseSvgRoot(markup)
    expect(root.querySelector('[data-truncated="1"]'), theme).toBeNull()
    expect(footnoteWhole(root), theme).toBe(true)
    expect(auditSvgMarkup(markup), theme).toEqual([])
  })
})

// A skin sets its claim, quote or figure straight onto the page in the
// theme's brand colours, and on a page the author painted those stood at
// 1.2 to 2.9:1 (ink's and journal's statements, ledger's and luxe's quotes,
// almanac's and vermilion's claims). They are held to the painted ground now,
// and the theme's own pages keep their colours.
describe("a skin's brand colours on a page the author painted", () => {
  const GROUNDS = ["#F7F3EA", "#1F2A44", "#C8102E", "#FFD400"]
  const slides = (kind: "statement" | "quote" | "fact"): Slide[] =>
    GROUNDS.map((value) => ({
      type: "content",
      kind,
      heading: kind === "fact" ? undefined : "设备不会突然坏，只是没人听它说话",
      background: { kind: "color", value },
      components:
        kind === "statement"
          ? [{ type: "paragraph", text: "去年对账全文" }]
          : kind === "quote"
            ? [{ type: "blockquote", text: "最贵的停机，是没人预料到的那一次。", attribution: "设备主管" }]
            : [{ type: "kpi_cards", items: [{ value: "62%", label: "设备开机率" }] }],
    })) as unknown as Slide[]

  it.each([
    ["ink", "statement"],
    ["journal", "statement"],
    ["almanac", "statement"],
    ["vermilion", "statement"],
    ["ledger", "statement"],
    ["luxe", "statement"],
    ["ledger", "quote"],
    ["luxe", "quote"],
    ["thesis", "quote"],
    ["terminal", "fact"],
  ] as const)("%s %s", async (theme, kind) => {
    const { auditDeck } = await import("../../audit/deck-audit")
    const deck = ir(theme, [{ type: "cover", heading: "封面", components: [] } as unknown as Slide, ...slides(kind)])
    const low = auditDeck(deck).findings.filter((f) => f.code === "low-contrast")
    expect(low.map((f) => f.message)).toEqual([])
  })
})
