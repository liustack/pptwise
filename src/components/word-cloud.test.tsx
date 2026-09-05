// @vitest-environment jsdom
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { packWords, wordCloud } from "./word-cloud"
import { measureTextUnits } from "../lib/svg-text-layout"
import { validateIr } from "@/api"
import type { Component } from "@/ir"
import type { ComponentCtx } from "./types"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { buildCtx } from "../render/full-slide-svg"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { FORM_BODY_FLOOR } from "./legibility"

function themeCtx(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg>{node}</svg>)
}

function deck(component: Component): unknown {
  return {
    version: "5",
    theme: { id: "brief" },
    slides: [{ type: "content", kind: "list", heading: "words", components: [component] }],
  }
}

const ZH = [
  ["续约率", 4],
  ["客户成功", 4],
  ["流失预警", 4],
  ["开通周期", 3],
  ["席位扩容", 3],
  ["服务响应", 3],
  ["权限治理", 3],
  ["价格压力", 3],
  ["自助报表", 2],
  ["集成能力", 2],
  ["交付验收", 2],
  ["数据迁移", 2],
  ["增购", 2],
  ["渠道伙伴", 1],
  ["教育客群", 1],
  ["培训认证", 1],
] as const

const CLOUD = {
  type: "word_cloud" as const,
  words: ZH.map(([text, weight]) => ({ text, weight })),
}

const LATIN = {
  type: "word_cloud" as const,
  words: [
    "Renewal",
    "Success",
    "Churn",
    "Setup",
    "Seats",
    "Response",
    "Pricing",
    "Migration",
    "Reporting",
    "Partners",
  ].map((text, i) => ({ text, weight: ((i % 4) + 1) as 1 | 2 | 3 | 4 })),
}

describe("word_cloud schema", () => {
  it("accepts sixteen weighted words", () => {
    expect(validateIr(deck(CLOUD)).ok).toBe(true)
  })

  it("refuses seven words, twenty-one words, a fifth size, and a repeat", () => {
    expect(validateIr(deck({ ...CLOUD, words: CLOUD.words.slice(0, 7) })).ok).toBe(false)
    expect(
      validateIr(
        deck({
          ...CLOUD,
          words: Array.from({ length: 21 }, (_, i) => ({ text: `w${i}`, weight: 2 as const })),
        }),
      ).ok,
    ).toBe(false)
    expect(
      validateIr(deck({ type: "word_cloud", words: CLOUD.words.map((w, i) => (i === 0 ? { ...w, weight: 5 } : w)) } as unknown as Component))
        .ok,
    ).toBe(false)
    const repeat = validateIr(
      deck({ ...CLOUD, words: [{ text: "续约率", weight: 2 as const }, ...CLOUD.words.slice(0, 15)] }),
    )
    expect(repeat.ok).toBe(false)
    expect(JSON.stringify(repeat)).toContain("once")
  })
})

describe("word_cloud packing", () => {
  it("is deterministic — the same words in the same panel land in the same places", () => {
    const a = packWords(CLOUD.words, 1064, 372, { fontFamily: "Georgia" })
    const b = packWords(CLOUD.words, 1064, 372, { fontFamily: "Georgia" })
    expect(b.placed).toEqual(a.placed)
    expect(a.dropped).toBe(0)
  })

  it("never overlaps two words and never leaves the panel", () => {
    for (const words of [CLOUD.words, LATIN.words]) {
      const { placed } = packWords(words, 1064, 372, { fontFamily: "Georgia" })
      for (const item of placed) {
        expect(item.x).toBeGreaterThanOrEqual(0)
        expect(item.y).toBeGreaterThanOrEqual(0)
        expect(item.x + item.w).toBeLessThanOrEqual(1064 + 0.001)
        expect(item.y + item.h).toBeLessThanOrEqual(372 + 0.001)
      }
      for (let i = 0; i < placed.length; i++) {
        for (let j = i + 1; j < placed.length; j++) {
          const a = placed[i]!
          const b = placed[j]!
          const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y
          expect(apart, `${a.word.text} / ${b.word.text}`).toBe(true)
        }
      }
    }
  })

  it("packs CJK and Latin with the same measurement, so neither track overflows", () => {
    const zh = packWords(CLOUD.words, 1064, 372, { fontFamily: "Georgia" })
    const en = packWords(LATIN.words, 1064, 372, { fontFamily: "Georgia" })
    expect(zh.dropped).toBe(0)
    expect(en.dropped).toBe(0)
  })

  it("shrinks the sizes before it gives up on a word", () => {
    // A panel with no room to spread the full-size setting comes back a step
    // smaller with every word still set, rather than at full size with words
    // missing.
    const tight = packWords(CLOUD.words, 420, 260, { fontFamily: "Georgia" })
    expect(tight.scale).toBeLessThan(1)
    expect(tight.dropped).toBe(0)
  })

  it("sizes its collision boxes by what the glyphs will actually paint", () => {
    // The shared estimator prices most text from a class average, so a box
    // sized to the estimate can be crossed by the letters drawn inside it.
    const { placed } = packWords(LATIN.words, 1064, 372, { fontFamily: "Georgia" })
    for (const item of placed) {
      const bold = item.word.weight >= 3
      const estimate = measureTextUnits(item.word.text, { bold, fontFamily: "Georgia" }) * item.fontSize
      expect(item.w, item.word.text).toBeGreaterThanOrEqual(estimate)
    }
    // And a gutter on top, so two boxes never share an edge.
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!
        const b = placed[j]!
        const gapX = Math.max(a.x - (b.x + b.w), b.x - (a.x + a.w))
        const gapY = Math.max(a.y - (b.y + b.h), b.y - (a.y + a.h))
        expect(Math.max(gapX, gapY), `${a.word.text} / ${b.word.text}`).toBeGreaterThan(0)
      }
    }
  })

  it("keeps the four sizes apart or declares the panel too small", () => {
    // Shrinking every tier into the type floor leaves four authored weights
    // printed in three sizes, which is a silent loss of a whole tier.
    for (const [w, h] of [
      [1064, 372],
      [640, 320],
      [420, 260],
      [400, 250],
      [400, 280],
      [360, 210],
    ] as const) {
      const { placed } = packWords(CLOUD.words, w, h, { fontFamily: "Georgia" })
      const byTier = new Map<number, number>()
      for (const item of placed) byTier.set(item.word.weight, item.fontSize)
      const sizes = [...byTier.entries()].sort((a, b) => a[0] - b[0]).map(([, size]) => size)
      expect(new Set(sizes).size, `${w}x${h} → ${sizes.join("/")}`).toBe(sizes.length)
    }
  })

  it("puts a word in the same place however the author ordered the list", () => {
    const forward = packWords(CLOUD.words, 1064, 372, { fontFamily: "Georgia" })
    const reversed = packWords([...CLOUD.words].reverse(), 1064, 372, { fontFamily: "Georgia" })
    const at = (p: typeof forward, text: string) => p.placed.find((item) => item.word.text === text)
    for (const { text } of CLOUD.words) {
      expect(at(reversed, text), text).toEqual(at(forward, text))
    }
  })

  it("sets the heavy words larger than the light ones", () => {
    const { placed } = packWords(CLOUD.words, 1064, 372, { fontFamily: "Georgia" })
    const size = (weight: number) => placed.find((p) => p.word.weight === weight)!.fontSize
    expect(size(4)).toBeGreaterThan(size(3))
    expect(size(3)).toBeGreaterThan(size(2))
    expect(size(2)).toBeGreaterThan(size(1))
  })
})

describe("word_cloud rendering", () => {
  it("sets every word once, upright, on its own panel", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(wordCloud.render(CLOUD, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
    expect(container.querySelectorAll("text").length).toBe(CLOUD.words.length)
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{wordCloud.render(CLOUD, { x: 0, y: 0, w: 1104, h: 412 }, ctx)}</svg>,
    )
    expect(markup).not.toContain("rotate(")
    expect(container.querySelector("rect")!.getAttribute("fill")).toBe(ctx.colors.surface)
  })

  it("keeps every word over its contrast floor against the panel on every theme", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const ctx = themeCtx(id)
      const { container } = svg(wordCloud.render(CLOUD, { x: 0, y: 0, w: 1104, h: 412 }, ctx))
      for (const text of container.querySelectorAll("text")) {
        const size = Number(text.getAttribute("font-size"))
        expect(size, `${id} ${text.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
        expect(
          contrastRatio(text.getAttribute("fill")!, ctx.colors.surface),
          `${id} ${text.textContent}`,
        ).toBeGreaterThanOrEqual(requiredContrastRatio(size))
      }
    }
  })

  it("declares the words a small panel cost it, and prints no count of them", () => {
    const ctx = themeCtx("brief")
    const { container } = svg(wordCloud.render(CLOUD, { x: 0, y: 0, w: 280, h: 120 }, ctx))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(marker!.getAttribute("data-dropped-kind")).toBe("label")
    expect(container.textContent).not.toContain("…")
  })

  it("emits only the exportable subset", () => {
    const ctx = themeCtx("museum")
    const markup = renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg">{wordCloud.render(CLOUD, { x: 0, y: 0, w: 1104, h: 412 }, ctx)}</svg>,
    )
    expect(markup).not.toContain("data-dropped")
    expect(() => assertSubset(parseSvgRoot(markup))).not.toThrow()
  })
})
