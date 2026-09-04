// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { GaugeNextEnding, layoutDef } from "./ending-gauge-next"

const ITEMS = ["确定首批试点团队", "冻结核心指标口径", "四周后复盘扩容"]
const slide: Slide = {
  type: "ending",
  heading: "下一步",
  subheading: "云觅咨询 · 增长战略组",
  components: [{ type: "bullets", items: ITEMS }],
} as Slide

const ir: PptxIR = {
  version: "5",
  filename: "gauge-next.pptx",
  theme: { id: "brief" },
  meta: { organization: "云觅咨询", version: "v2", date: "2026-08" },
  assets: { images: {} },
  slides: [slide],
} as PptxIR

function renderEnding() {
  const tokens = resolveStyle("brief")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <GaugeNextEnding ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), tokens }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("ending-gauge-next", () => {
  it("places NEXT and three numbered actions on the approved grid", () => {
    const { root, tokens } = renderEnding()
    const kicker = textBy(root, "NEXT")!
    expect([
      kicker.getAttribute("x"),
      kicker.getAttribute("y"),
      kicker.getAttribute("font-size"),
      kicker.getAttribute("letter-spacing"),
      kicker.getAttribute("fill"),
    ]).toEqual(["160", "200", "16", "6", tokens.colors.muted])

    const ys = [292, 384, 476]
    for (const index of ITEMS.keys()) {
      const number = textBy(root, String(index + 1).padStart(2, "0"))!
      const item = textBy(root, ITEMS[index]!)!
      expect([
        number.getAttribute("x"),
        number.getAttribute("y"),
        number.getAttribute("font-size"),
        number.getAttribute("font-weight"),
        number.getAttribute("fill"),
      ]).toEqual(["160", String(ys[index]), "20", "700", tokens.colors.primary])
      expect([
        item.getAttribute("x"),
        item.getAttribute("y"),
        item.getAttribute("font-size"),
        item.getAttribute("font-weight"),
        item.getAttribute("fill"),
      ]).toEqual([
        "212",
        String(ys[index]),
        "36",
        "700",
        index === 0 ? tokens.colors.primary : tokens.colors.text,
      ])
    }
  })

  it("underlines only the first action and places the closing rule and signoff", () => {
    const { root, tokens } = renderEnding()
    const underline = root.querySelector(`rect[fill="${tokens.colors.accent}"]`)!
    expect([
      underline.getAttribute("x"),
      underline.getAttribute("y"),
      underline.getAttribute("width"),
      underline.getAttribute("height"),
    ]).toEqual(["212", "306", "252", "6"])
    expect(root.querySelectorAll(`rect[fill="${tokens.colors.accent}"]`)).toHaveLength(1)
    expect(root.querySelectorAll(`text[fill="${tokens.colors.accent}"]`)).toHaveLength(0)

    const rule = root.querySelector('line[y1="600"][y2="600"]')!
    expect([rule.getAttribute("x1"), rule.getAttribute("x2"), rule.getAttribute("stroke-width")]).toEqual([
      "160",
      "1130",
      "1",
    ])
    const signoff = textBy(root, "云觅咨询 · 增长战略组")!
    expect([
      signoff.getAttribute("x"),
      signoff.getAttribute("y"),
      signoff.getAttribute("font-size"),
      signoff.getAttribute("fill"),
    ]).toEqual(["160", "636", "16", tokens.colors.muted])
  })

  it("keeps top-right meta and declares a theme-locked ending", () => {
    const { root } = renderEnding()
    expect([textBy(root, "云觅咨询")?.getAttribute("x"), textBy(root, "云觅咨询")?.getAttribute("y")]).toEqual([
      "1184",
      "100",
    ])
    expect([textBy(root, "v2 · 2026-08")?.getAttribute("x"), textBy(root, "v2 · 2026-08")?.getAttribute("y")]).toEqual([
      "1184",
      "122",
    ])
    expect(layoutDef).toMatchObject({
      id: "gauge-next",
      kind: "standard",
      slideTypes: ["ending"],
    })
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: ["bullets"],
      capacity: 1,
      itemCapacity: 3,
    })
    expect(() => assertSubset(root)).not.toThrow()
  })
})
