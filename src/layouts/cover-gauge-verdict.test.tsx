// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugeVerdictCover, layoutDef } from "./cover-gauge-verdict"

const slide: Slide = {
  type: "cover",
  heading: "增长重回正轨\n利润同步修复",
  subheading: "三项证据共同指向可持续改善",
  components: [
    { type: "bullets", items: ["新增业务恢复增长", "交付周期继续缩短", "留存率保持稳定"] },
  ],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "gauge-verdict.pptx",
  theme: { id: "consulting" },
  meta: {
    organization: "云觅咨询",
    confidentiality: "internal",
    version: "v2",
    date: "2026-08",
  },
  assets: { images: {} },
  slides: [slide],
} as PptxIR

function renderCover() {
  const tokens = resolveStyle("consulting")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeVerdictCover ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("cover-gauge-verdict", () => {
  it("places the kicker, two title lines, underline, and subtitle at the approved coordinates", () => {
    const { root, tokens } = renderCover()
    const kicker = textBy(root, "Internal")!
    expect([kicker.getAttribute("x"), kicker.getAttribute("y"), kicker.getAttribute("font-size")]).toEqual([
      "160",
      "214",
      "16",
    ])
    expect(kicker.getAttribute("letter-spacing")).toBe("2")
    expect(kicker.getAttribute("fill")).toBe(tokens.colors.muted)

    const titles = Array.from(root.querySelectorAll('text[font-weight="700"]')).filter(
      (text) => text.getAttribute("font-size") === "72",
    )
    expect(titles.map((text) => [text.getAttribute("x"), text.getAttribute("y")])).toEqual([
      ["160", "330"],
      ["160", "418"],
    ])
    expect(titles.map((text) => text.getAttribute("fill"))).toEqual([
      tokens.colors.primary,
      tokens.colors.primary,
    ])

    const underline = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect([
      underline.getAttribute("x"),
      underline.getAttribute("y"),
      underline.getAttribute("width"),
      underline.getAttribute("height"),
    ]).toEqual(["160", "432", "504", "8"])

    const subtitle = textBy(root, "三项证据共同指向可持续改善")!
    expect([subtitle.getAttribute("x"), subtitle.getAttribute("y"), subtitle.getAttribute("font-size")]).toEqual([
      "160",
      "492",
      "22",
    ])
  })

  it("draws exactly three navy ticks and three numbered evidence columns", () => {
    const { root, tokens } = renderCover()
    const ticks = Array.from(root.querySelectorAll("line"))
    expect(ticks.map((line) => ["x1", "y1", "x2", "y2"].map((name) => Number(line.getAttribute(name))))).toEqual([
      [160, 552, 200, 552],
      [500, 552, 540, 552],
      [840, 552, 880, 552],
    ])
    expect(ticks.map((line) => [line.getAttribute("stroke"), line.getAttribute("stroke-width")])).toEqual([
      [tokens.colors.primary, "1"],
      [tokens.colors.primary, "1"],
      [tokens.colors.primary, "1"],
    ])

    for (const [index, x] of [160, 500, 840].entries()) {
      const number = textBy(root, String(index + 1).padStart(2, "0"))!
      const evidence = textBy(root, (slide.components[0] as Extract<Slide["components"][number], { type: "bullets" }>).items[index]!)!
      expect([number.getAttribute("x"), number.getAttribute("y"), number.getAttribute("font-size")]).toEqual([
        String(x),
        "586",
        "22",
      ])
      expect([evidence.getAttribute("x"), evidence.getAttribute("y"), evidence.getAttribute("font-size")]).toEqual([
        String(x),
        "612",
        "17",
      ])
    }
  })

  it("moves meta to the two-line top-right eyebrow and keeps yellow shape-only", () => {
    const { root, tokens } = renderCover()
    const meta = [textBy(root, "云觅咨询")!, textBy(root, "v2 · 2026-08")!]
    expect(meta.map((text) => [text.getAttribute("x"), text.getAttribute("y")])).toEqual([
      ["1184", "100"],
      ["1184", "122"],
    ])
    for (const text of meta) {
      expect(text.getAttribute("font-size")).toBe("14")
      expect(text.getAttribute("text-anchor")).toBe("end")
      expect(text.getAttribute("fill")).toBe(tokens.colors.muted)
      expect(text.getAttribute("data-contrast-tier")).toBe("meta")
    }
    expect(root.querySelectorAll(`rect[fill="${tokens.colors.accent}"]`)).toHaveLength(1)
    expect(root.querySelectorAll(`text[fill="${tokens.colors.accent}"]`)).toHaveLength(0)
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("declares a theme-locked cover with one bullets slot and no shared branding footer", () => {
    expect(layoutDef).toMatchObject({
      id: "gauge-verdict",
      kind: "standard",
      slideTypes: ["cover"],
    })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["bullets"],
      capacity: 1,
      itemCapacity: 3,
    })
  })
})
