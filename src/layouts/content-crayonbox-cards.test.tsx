// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { accessibleInk } from "../render/ink"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { CrayonboxCardsContent, layoutDef } from "./content-crayonbox-cards"
import { CREATIVE_PURPLE, GRASS_GREEN, SKY_BLUE, SUN_YELLOW } from "./crayonbox-shared"

const chapter: Slide = { type: "chapter", heading: "探索计划", components: [] } as Slide
const slide: Slide = {
  type: "content",
  kind: "points",
  heading: "今天画三幅小作品",
  subheading: "先观察，再动笔，最后大胆分享。",
  components: [
    {
      type: "numbered_cards",
      items: [
        { title: "抬头看天空", text: "找到最亮的蓝", sub: "画下一朵云" },
        { title: "低头找果实", text: "挑一颗暖橘", sub: "记住它的形状" },
        { title: "蹲下摸草叶", text: "数一数绿色", sub: "留下一条纹理" },
      ],
    },
  ],
} as Slide

function renderContent(contentSlide: Slide = slide) {
  const tokens = resolveStyle("crayon")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const ir = {
    version: "5",
    filename: "crayonbox-cards.pptx",
    theme: { id: "crayon" },
    meta: {},
    assets: { images: {} },
    slides: [chapter, contentSlide],
  } as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CrayonboxCardsContent ir={ir} slide={contentSlide} index={1} ctx={ctx} />
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup, tokens, bg }
}

const textBy = (root: Element, value: string) =>
  Array.from(root.querySelectorAll("text")).find((text) => text.textContent === value)

describe("content-crayonbox-cards", () => {
  it("draws the small four-ray sun and two top-right stars", () => {
    const { root, tokens } = renderContent()
    const sun = root.querySelector('[data-decor-piece="sun"]')!
    expect(sun.querySelector("g")?.getAttribute("transform")).toBe("translate(1236,30)")
    const circle = sun.querySelector("circle")!
    expect([circle.getAttribute("r"), circle.getAttribute("stroke"), circle.getAttribute("stroke-width")]).toEqual([
      "11",
      SUN_YELLOW,
      "3",
    ])
    expect(Array.from(sun.querySelectorAll("line")).map((ray) => ["x1", "y1", "x2", "y2"].map((name) => Number(ray.getAttribute(name))))).toEqual([
      [0, -16, 0, -22],
      [0, 16, 0, 22],
      [16, 0, 22, 0],
      [-16, 0, -22, 0],
    ])
    const stars = Array.from(root.querySelectorAll('[data-decor-piece="stars"] text'))
    expect(stars.map((star) => [star.getAttribute("x"), star.getAttribute("y"), star.getAttribute("font-size"), star.getAttribute("fill")])).toEqual([
      ["1246", "88", "22", tokens.colors.accent],
      ["1232", "118", "18", CREATIVE_PURPLE],
    ])
  })

  it("places the kicker, title, three cards, badges, copy, and conclusion on the approved grid", () => {
    const { root, tokens, bg } = renderContent()
    const capsule = root.querySelector(`rect[fill="${SKY_BLUE}"]`)!
    expect(["x", "y", "width", "height", "rx"].map((name) => capsule.getAttribute(name))).toEqual([
      "96",
      "94",
      "196",
      "36",
      "18",
    ])
    const kicker = textBy(root, "探索计划")!
    expect([kicker.getAttribute("x"), kicker.getAttribute("y"), kicker.getAttribute("font-size")]).toEqual([
      "116",
      "119",
      "17",
    ])
    expect(kicker.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, SKY_BLUE, 17))
    expect(kicker.getAttribute("fill")).not.toBe("#FFFFFF")
    const title = textBy(root, "今天画三幅小作品")!
    expect([title.getAttribute("x"), title.getAttribute("y"), title.getAttribute("font-size"), title.getAttribute("font-weight"), title.getAttribute("fill")]).toEqual([
      "96",
      "196",
      "44",
      "700",
      accessibleInk(tokens.colors.text, bg, 44),
    ])

    const cards = Array.from(root.querySelectorAll(`rect[fill="${tokens.colors.surface}"]`))
    expect(cards.map((card) => ["x", "y", "width", "height", "rx", "stroke", "stroke-width"].map((name) => card.getAttribute(name)))).toEqual([
      ["96", "248", "336", "330", "22", tokens.colors.border, "1.5"],
      ["472", "248", "336", "330", "22", tokens.colors.border, "1.5"],
      ["848", "248", "336", "330", "22", tokens.colors.border, "1.5"],
    ])

    const badgeFills = [SKY_BLUE, tokens.colors.accent, GRASS_GREEN]
    const badgeXs = [128, 504, 880]
    for (let index = 0; index < 3; index++) {
      const badge = root.querySelector(`rect[x="${badgeXs[index]}"][y="284"]`)!
      expect([badge.getAttribute("width"), badge.getAttribute("height"), badge.getAttribute("rx"), badge.getAttribute("fill")]).toEqual([
        "56",
        "56",
        "18",
        badgeFills[index],
      ])
      const number = textBy(root, String(index + 1))!
      expect([number.getAttribute("x"), number.getAttribute("y"), number.getAttribute("text-anchor"), number.getAttribute("font-size"), number.getAttribute("font-weight")]).toEqual([
        String(badgeXs[index]! + 28),
        "323",
        "middle",
        "30",
        "700",
      ])
      expect(number.getAttribute("fill")).toBe(accessibleInk(tokens.colors.text, badgeFills[index]!, 30))
      expect(number.getAttribute("fill")).not.toBe("#FFFFFF")
    }

    for (const [index, item] of (slide.components[0] as Extract<Slide["components"][number], { type: "numbered_cards" }>).items.entries()) {
      const x = String(badgeXs[index])
      const cardTitle = textBy(root, item.title)!
      expect([cardTitle.getAttribute("x"), cardTitle.getAttribute("y"), cardTitle.getAttribute("font-size"), cardTitle.getAttribute("font-weight")]).toEqual([
        x,
        "410",
        "26",
        "700",
      ])
      expect([textBy(root, item.text!)?.getAttribute("y"), textBy(root, item.sub!)?.getAttribute("y")]).toEqual([
        "452",
        "482",
      ])
    }
    const conclusion = textBy(root, "先观察，再动笔，最后大胆分享。")!
    expect([conclusion.getAttribute("x"), conclusion.getAttribute("y"), conclusion.getAttribute("font-size"), conclusion.getAttribute("fill")]).toEqual([
      "96",
      "632",
      "20",
      tokens.colors.text,
    ])
  })

  it("preserves arbitrary content through the SvgContent fallback", () => {
    const paragraphSlide: Slide = {
      type: "content",
      kind: "points",
      heading: "别让正文消失",
      components: [{ type: "paragraph", text: "自动选中卡片版式时，这段正文仍然必须渲染。" }],
    } as Slide
    const { root } = renderContent(paragraphSlide)
    expect(root.textContent).toContain("自动选中卡片版式时，这段正文仍然必须渲染。")
  })

  it("declares a pin-only full-density layout and exports safe primitives", () => {
    expect(layoutDef).toMatchObject({
      id: "crayonbox-cards",
      kind: "archetype",
      pinOnly: true,
      suppressMotif: true,
      slideTypes: ["content"],
      arrangements: "all",
    })
    expect(layoutDef).not.toHaveProperty("branding")
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({
      name: "body",
      accepts: "any",
      capacity: 4,
    })
    expect(() => assertSubset(renderContent().root)).not.toThrow()
  })
})
