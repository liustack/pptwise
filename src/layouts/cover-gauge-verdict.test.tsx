// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugeVerdictCover, layoutDef } from "./cover-gauge-verdict"

const ITEMS = ["Lift first-attempt success to 92%", "Re-cut routes for 15% more stops", "Plan overtime a week ahead"]

const coverSlide = (overrides: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    heading: "Cut last-mile cost 18% in twelve months",
    subheading: "Proposal to Northwind Logistics",
    components: [{ type: "bullets", items: ITEMS }],
    ...overrides,
  }) as Slide

const ir = (slide: Slide, branding: PptxIR["branding"]): PptxIR =>
  ({
    version: "5",
    filename: "gauge-verdict.pptx",
    theme: { id: "brief" },
    branding,
    meta: {
      organization: "Halden Partners",
      confidentiality: "confidential",
      authors: [{ name: "Maya Ellison", role: "Engagement lead" }],
      date: "14 October 2026",
    },
    assets: { images: {} },
    slides: [slide],
  }) as PptxIR

function renderCover(slide: Slide = coverSlide(), { branding }: { branding: PptxIR["branding"] } = { branding: "full" }) {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg, undefined, undefined, "pad")
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeVerdictCover ir={ir(slide, branding)} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens, ctx }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)
const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))

describe("cover-gauge-verdict", () => {
  it("sets the organization top left and the confidentiality label top right on one baseline", () => {
    const { root, tokens } = renderCover()
    const org = textBy(root, "Halden Partners")!
    expect(attrs(org, ["x", "y", "font-size", "font-weight", "letter-spacing", "fill", "data-contrast-tier"])).toEqual([
      "96",
      "77",
      "20",
      "700",
      "1",
      tokens.colors.primary,
      "meta",
    ])
    const conf = textBy(root, "Confidential")!
    expect(attrs(conf, ["x", "y", "font-size", "text-anchor", "fill", "data-contrast-tier"])).toEqual([
      "1184",
      "77",
      "16",
      "end",
      tokens.colors.muted,
      "meta",
    ])
  })

  it("places the yellow bar, subtitle, and two-line regular-weight title on the board's grid", () => {
    const { root, tokens, ctx } = renderCover()
    const bar = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect(attrs(bar, ["x", "y", "width", "height"])).toEqual(["96", "196", "64", "6"])

    const subtitle = textBy(root, "Proposal to Northwind Logistics")!
    expect(attrs(subtitle, ["x", "y", "font-size", "fill"])).toEqual(["96", "250", "22", tokens.colors.muted])

    const titles = Array.from(root.querySelectorAll("text")).filter((text) => text.getAttribute("font-size") === "68")
    expect(titles.map((text) => attrs(text, ["x", "y", "font-weight", "fill"]))).toEqual([
      ["96", "336", "400", tokens.colors.primary],
      ["96", "416", "400", tokens.colors.primary],
    ])
    expect(titles.map((text) => text.textContent).join(" ")).toBe("Cut last-mile cost 18% in twelve months")
    for (const title of titles) expect(title.getAttribute("font-family")).toBe(ctx.fonts.heading)
  })

  it("opens three numbered points with a primary rule at y520", () => {
    const { root, tokens } = renderCover()
    const rules = Array.from(root.querySelectorAll("line"))
    expect(rules.map((line) => attrs(line, ["x1", "y1", "x2", "y2", "stroke", "stroke-width"]))).toEqual([
      ["96", "520", "1184", "520", tokens.colors.primary, "1"],
    ])
    for (const [index, x] of [96, 464, 832].entries()) {
      const number = textBy(root, String(index + 1).padStart(2, "0"))!
      expect(attrs(number, ["x", "y", "font-size", "fill"])).toEqual([String(x), "558", "16", tokens.colors.muted])
      const body = Array.from(root.querySelectorAll("text")).filter(
        (text) =>
          text.getAttribute("x") === String(x) &&
          text.getAttribute("font-size") === "22" &&
          Number(text.getAttribute("y")) > 520,
      )
      expect(body.map((line) => line.textContent).join(" ")).toBe(ITEMS[index])
      expect(body[0]!.getAttribute("y")).toBe("592")
      for (const line of body) expect(line.getAttribute("fill")).toBe(tokens.colors.text)
    }
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })

  it("closes with the first author left and the date right, and no footer rule", () => {
    const { root, tokens } = renderCover()
    const author = textBy(root, "Maya Ellison, Engagement lead")!
    expect(attrs(author, ["x", "y", "font-size", "fill", "data-contrast-tier"])).toEqual([
      "96",
      "694",
      "16",
      tokens.colors.muted,
      "meta",
    ])
    const date = textBy(root, "14 October 2026")!
    expect(attrs(date, ["x", "y", "font-size", "text-anchor", "data-contrast-tier"])).toEqual([
      "1184",
      "694",
      "16",
      "end",
      "meta",
    ])
    expect(root.querySelectorAll('line[y1="664"]')).toHaveLength(0)
  })

  it("keeps confidentiality and date off the page unless the deck declares full branding", () => {
    for (const branding of [undefined, "cover-only", "minimal"] as const) {
      const { root } = renderCover(coverSlide(), { branding })
      expect(textBy(root, "Confidential"), String(branding)).toBeUndefined()
      expect(textBy(root, "14 October 2026"), String(branding)).toBeUndefined()
      expect(textBy(root, "Halden Partners"), String(branding)).toBeDefined()
      expect(textBy(root, "Maya Ellison, Engagement lead"), String(branding)).toBeDefined()
    }
  })

  it("paints yellow on the bar alone, plus a pad only where the author marked the title", () => {
    const plain = renderCover()
    expect(plain.root.querySelectorAll(`[fill="${plain.tokens.colors.accent}"]`)).toHaveLength(1)
    expect(plain.root.querySelectorAll("[data-emphasis-pad]")).toHaveLength(0)
    expect(plain.root.querySelectorAll(`text[fill="${plain.tokens.colors.accent}"]`)).toHaveLength(0)
    // The old top-right two-line meta (14px, below the type floor) is gone.
    expect(plain.root.querySelectorAll('text[font-size="14"]')).toHaveLength(0)
    expect(() => assertSubset(plain.root)).not.toThrow()

    const marked = renderCover(coverSlide({ heading: "Cut last-mile cost **18%** in twelve months" }))
    const pads = Array.from(marked.root.querySelectorAll("[data-emphasis-pad]"))
    expect(pads).toHaveLength(1)
    expect(pads[0]!.getAttribute("fill")).toBe(marked.tokens.colors.accent)
    expect(marked.root.querySelectorAll(`rect[fill="${marked.tokens.colors.accent}"]`)).toHaveLength(1)
  })

  it("draws no rule or numbers without bullets, and leaves missing meta off the page", () => {
    const slide = coverSlide({ components: [], subheading: undefined })
    const tokens = resolveStyle("brief")
    const ctx = buildCtx(tokens, {}, undefined, tokens.colors.bg)
    const bare = { ...ir(slide, "full"), meta: {} } as PptxIR
    const root = parseSvgRoot(
      renderSvgMarkup(
        <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
          <GaugeVerdictCover ir={bare} slide={slide} index={0} ctx={ctx} />
        </svg>,
      ),
    )
    expect(root.querySelectorAll("line")).toHaveLength(0)
    expect(textBy(root, "01")).toBeUndefined()
    const sizes = Array.from(root.querySelectorAll("text")).map((text) => text.getAttribute("font-size"))
    expect(new Set(sizes)).toEqual(new Set(["68"]))
  })

  it("declares a theme-locked cover with one bullets slot and no shared branding", () => {
    expect(layoutDef).toMatchObject({
      id: "gauge-verdict",
      kind: "standard",
      slideTypes: ["cover"],
      branding: "none",
    })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["bullets"],
      capacity: 1,
      itemCapacity: 3,
    })
    expect(layoutDef.headingFit).toMatchObject({ fontSize: 68, maxLines: 2, bold: false })
  })
})
