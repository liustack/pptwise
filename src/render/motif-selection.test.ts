// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { CANONICAL_THEME_IDS } from "../themes"
import { MOTIFS } from "../motifs"
import { __resetRegisteredThemes, THEME_DEFINITIONS } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { resolveEffectiveFace } from "./layout-selection"
import { MOTIF_CANDIDATES, resolveMotifId } from "./motif-selection"

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

describe("MOTIF_CANDIDATES 兼容表", () => {
  it("每个带主题级 motif 的内置主题都锁到自己的唯一锚点", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const motif = THEME_DEFINITIONS[id].motif
      const candidates = MOTIF_CANDIDATES[id]
      if (motif === undefined) {
        expect(candidates, `${id} 不应有候选项`).toBeUndefined()
        continue
      }
      expect(candidates, `${id} 应只有自己的 motif`).toEqual([motif])
    }
  })

  it("兼容表中的每个 id 都对应已注册 motif", () => {
    for (const candidates of Object.values(MOTIF_CANDIDATES)) {
      for (const motifId of candidates ?? []) {
        expect(MOTIFS[motifId], motifId).toBeTypeOf("function")
      }
    }
  })
})

describe("resolveMotifId 兼容读取", () => {
  it("无 motif 的内置主题返回 undefined", () => {
    for (const id of ["runway", "museum", "stage"] as const) {
      const deck = makeIR(id)
      expect(resolveMotifId(deck, deck.slides[0], 0), id).toBeUndefined()
    }
  })

  it("带 motif 的内置主题稳定返回自己的锚点", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const motif = THEME_DEFINITIONS[id].motif
      if (motif === undefined) continue
      const slides = [contentSlide("p0"), contentSlide("p1")]
      const deck = makeIR(id, slides)
      expect(resolveMotifId(deck, slides[0], 0), id).toBe(motif)
      expect(resolveMotifId(deck, slides[1], 1), id).toBe(motif)
    }
  })

  it("未知主题直接报错，不回退到其他主题", () => {
    const deck = makeIR("does-not-exist")
    expect(() => resolveMotifId(deck, deck.slides[0], 0)).toThrow(/unknown theme/i)
  })
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
})
