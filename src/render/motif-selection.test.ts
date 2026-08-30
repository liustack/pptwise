// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { CANONICAL_THEME_IDS } from "../themes"
import { MOTIFS } from "../motifs"
import { __resetRegisteredThemes, THEME_DEFINITIONS } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { resolveEffectiveFace } from "./layout-selection"

function contentSlide(id: string): Slide {
  return { type: "content", kind: "points", id, heading: id, components: [] }
}

function makeIR(themeId: string, slides: Slide[] = [contentSlide("p0")]): PptxIR {
  return {
    version: "5",
    filename: "test.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  }
}

afterEach(() => {
  __resetRegisteredThemes()
})

describe("当前渲染契约", () => {
  it("注册主题的装饰由命中的菜单条目携带", () => {
    const id = registerTestTheme("menu-motif-contract", "insight")
    const deck = makeIR(id)
    expect(resolveEffectiveFace(deck, deck.slides[0]!).entry?.decor).toEqual({
      kind: "motif",
      id: "poster-motif",
    })
  })

  it("无 motif 的内置主题没有主题级装饰", () => {
    for (const id of ["runway", "museum", "stage"] as const) {
      expect(THEME_DEFINITIONS[id].motif, id).toBeUndefined()
    }
  })

  it("带 motif 的内置主题锁定自己的锚点", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const motif = THEME_DEFINITIONS[id].motif
      if (motif === undefined) continue
      expect(MOTIFS[motif], id).toBeTypeOf("function")
    }
  })
})
