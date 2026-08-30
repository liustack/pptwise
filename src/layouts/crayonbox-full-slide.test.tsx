// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { FullSlideSvg } from "../render/full-slide-svg"
import { MAX_DECOR_PIECES } from "../motifs/decor-budget"
import {
  CANDY_PINK,
  CREATIVE_PURPLE,
  GRASS_GREEN,
  SKY_BLUE,
  SUN_YELLOW,
} from "./crayonbox-shared"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"

afterEach(() => {
  __resetRegisteredThemes()
})

function deck(slide: Slide, theme = "crayon"): PptxIR {
  return {
    version: "5",
    filename: "crayonbox-full-slide.pptx",
    theme: { id: theme },
    meta: { organization: "一盒蜡笔", date: "2026 秋季" },
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
}

function draw(slide: Slide, theme = "crayon") {
  return render(<FullSlideSvg ir={deck(slide, theme)} slide={slide} index={0} />).container
}

const dedicatedSlides: readonly Slide[] = [
  { type: "cover",  heading: "打开想象力\n画出新世界", components: [] },
  { type: "chapter",  heading: "让创意发生", components: [] },
  {
    type: "content",
    kind: "list",
    heading: "三支蜡笔，三个方向",
    components: [
      { type: "numbered_cards", items: [
        { title: "观察", text: "看见真实问题" },
        { title: "想象", text: "打开更多可能" },
        { title: "行动", text: "画出下一步" },
      ] },
    ],
  },
  {
    type: "content",
    kind: "statement",
    heading: "每一种颜色\n都有自己的故事",
    components: [{ type: "blockquote", text: "把想象画出来", attribution: "一盒蜡笔" }],
  },
  {
    type: "ending",
    heading: "下一步，一起画出来",
    components: [{ type: "bullets", items: ["选定第一支蜡笔", "画出今天的点子", "把作品送给朋友"] }],
  },
] as const

describe("crayonbox final depth contract", () => {
  it("keeps every dedicated face inside the three-piece decoration budget", () => {
    for (const slide of dedicatedSlides) {
      const count = draw(slide).querySelectorAll("[data-decor-piece]").length
      expect(count, slide.type).toBeGreaterThan(0)
      expect(count, slide.type).toBeLessThanOrEqual(MAX_DECOR_PIECES)
    }
  })

  it("keeps every dedicated sun at the specified yellow after full-slide partitioning", () => {
    for (const slide of dedicatedSlides) {
      const container = draw(slide)
      const sun = container.querySelector('[data-decor-piece="sun"]')!
      expect(sun.getAttribute("data-decor-role"), slide.type).toBe("identity")
      expect(sun.closest('[data-depth="mid"]'), slide.type).not.toBeNull()
      expect(sun.querySelector("circle")?.getAttribute("stroke"), slide.type).toBe(SUN_YELLOW)
      for (const ray of Array.from(sun.querySelectorAll("line"))) {
        expect(ray.getAttribute("stroke"), slide.type).toBe(SUN_YELLOW)
      }
    }
  })

  it("keeps dedicated star and underline colors at their specified candy values", () => {
    const tokens = resolveStyle("crayon")
    const expectations = [
      { slide: dedicatedSlides[0]!, stars: [CANDY_PINK, SKY_BLUE], underline: tokens.colors.accent },
      { slide: dedicatedSlides[2]!, stars: [tokens.colors.accent, CREATIVE_PURPLE] },
      { slide: dedicatedSlides[3]!, stars: [GRASS_GREEN, CREATIVE_PURPLE], underline: tokens.colors.accent },
    ] as const

    for (const expectation of expectations) {
      const container = draw(expectation.slide)
      const stars = container.querySelector('[data-decor-piece="stars"]')!
      expect(stars.getAttribute("data-decor-role"), expectation.slide.type).toBe("identity")
      expect(Array.from(stars.querySelectorAll("text"), (star) => star.getAttribute("fill"))).toEqual(
        expectation.stars,
      )
      if ("underline" in expectation) {
        const underline = container.querySelector('[data-decor-piece="underline"]')!
        expect(underline.getAttribute("data-decor-role"), expectation.slide.type).toBe("identity")
        expect(underline.querySelector("rect")?.getAttribute("fill"), expectation.slide.type).toBe(
          expectation.underline,
        )
      }
    }
  })

  it("keeps the todo badges and their readable numbers in the foreground", () => {
    const tokens = resolveStyle("crayon")
    const container = draw(dedicatedSlides[4]!)
    const badges = container.querySelector('[data-decor-piece="badges"]')!
    expect(badges.closest('[data-depth="fg"]')).not.toBeNull()
    expect(Array.from(badges.querySelectorAll("rect"), (badge) => badge.getAttribute("fill"))).toEqual([
      SKY_BLUE,
      tokens.colors.accent,
      GRASS_GREEN,
    ])
    const numbers = Array.from(container.querySelectorAll("text")).filter((text) =>
      ["1", "2", "3"].includes(text.textContent ?? ""),
    )
    expect(numbers.map((number) => number.getAttribute("fill"))).toEqual([
      tokens.colors.text,
      tokens.colors.text,
      tokens.colors.text,
    ])
    expect(numbers.every((number) => number.closest('[data-depth="fg"]') !== null)).toBe(true)
  })

  it("keeps the shared-layout motif at the specified yellow, pink, and purple", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "共享内容页",
      components: [{ type: "paragraph", text: "正文" }],
    }
    const container = draw(slide)
    const sun = container.querySelector('[data-decor-piece="crayonbox-sun"]')!
    const stars = container.querySelector('[data-decor-piece="crayonbox-stars"]')!

    expect(sun.getAttribute("data-decor-role")).toBe("identity")
    expect(stars.getAttribute("data-decor-role")).toBe("identity")
    expect(sun.querySelector("circle")?.getAttribute("stroke")).toBe(SUN_YELLOW)
    expect(Array.from(stars.querySelectorAll("text"), (star) => star.getAttribute("fill"))).toEqual([
      CANDY_PINK,
      CREATIVE_PURPLE,
    ])
  })

  it("recesses dedicated decoration when another theme menu offers the face", () => {
    const themeId = registerTestTheme("insight-crayonbox-cover", "insight", {
      cover: { face: "crayonbox-open", decor: { kind: "silent" } },
    })
    const container = draw(dedicatedSlides[0]!, themeId)
    for (const id of ["sun", "stars"]) {
      const piece = container.querySelector(`[data-decor-piece="${id}"]`)
      expect(piece, id).not.toBeNull()
      expect(piece?.getAttribute("data-decor-role"), id).toBeNull()
    }
    expect(container.querySelector('[data-decor-piece="underline"]')).toBeNull()
  })
})
