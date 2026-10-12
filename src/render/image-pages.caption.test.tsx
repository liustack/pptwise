// @vitest-environment jsdom
import { afterEach, describe, it, expect } from "vitest"
import { boundSlideToSvgMarkup } from "./__fixtures__/bound-slide"
import type { PptxIR, Slide } from "@/ir"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"

const slide: Slide = {
  type: "content",
  kind: "photo",
  heading: "底图页标题",
  components: [
    { type: "image", asset_id: "hero", fit: "cover", caption: "样例底图" },
    { type: "paragraph", text: "正文段落。" },
  ],
}

afterEach(() => {
  __resetRegisteredThemes()
})

function makeIr(themeId: string): PptxIR {
  return {
    version: "5",
    filename: "deck.pptx",
    theme: { id: themeId },
    meta: { organization: "ACME", date: "2026-08-22" },
    assets: {
      images: {
        hero: {
          src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        },
      },
    },
    slides: [slide],
  }
}

describe("a takeover's caption marks", () => {
  it.each(["image-split", "image-top"])("%s paints a marked run of the caption, not its asterisks", (face) => {
    registerTestTheme(`caption-marks-${face}`, "brief", { content: { photo: face } })
    const marked: Slide = {
      ...slide,
      components: [{ type: "image", asset_id: "hero", fit: "cover", caption: "示意图：**车间里的老工人**（AI 生成）" }, { type: "bullets", items: ["对象：受新规约束的城镇职工", "问题一：到龄以后就业有没有上升"] }],
    }
    const ir = { ...makeIr(`caption-marks-${face}`), slides: [marked] }
    const markup = boundSlideToSvgMarkup(ir, marked, 0)
    expect(markup).not.toContain("**")
    expect(markup).toMatch(/<tspan[^>]*>车间里的老工人<\/tspan>/)
  })
})
