// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { FullSlideSvg } from "../full-slide-svg"
import { THEME_DEFINITIONS } from "../../themes/definitions"
import { resolveMotifId } from "../motif-selection"
import type { PptxIR, Slide } from "@/ir"

const COVER: Slide = {
  type: "cover",
  heading: "云觅科技 2026 年第二季度业务评审",
  subheading: "增长质量与下半年投入方向",
  components: [],
} as Slide

const WAVE2 = [
  { id: "academic", layout: "thesis-plate-cover", motif: "rail-motif" },
  { id: "campaign", layout: "poster-center", motif: "campaign-motif" },
  { id: "insight", layout: "stat-cover", motif: "poster-motif" },
  { id: "tech", layout: "type-rule-cover", motif: "constellation-motif" },
  { id: "luxe", layout: "poster-center", motif: "luxe-motif" },
  { id: "journal", layout: "issue-head-cover", motif: "corner-ornament-motif" },
  { id: "ink", layout: "vertical-title-cover", motif: "ink-motif" },
  { id: "museum", layout: "poster-center", motif: undefined },
  { id: "terra", layout: "tone-adaptive-header", motif: "terra-motif" },
  { id: "heritage", layout: "double-frame-cover", motif: "heritage-motif" },
] as const

function ir(themeId: string): PptxIR {
  return {
    version: "4",
    filename: "w2-cover.pptx",
    theme: { id: themeId },
    branding: "full",
    meta: {
      organization: "云觅科技 · 战略与运营部",
      authors: [{ name: "陈砚清", role: "首席技术官" }],
      date: "2026 年 7 月",
      confidentiality: "internal",
    },
    assets: { images: {} },
    slides: [COVER],
    seed: 20260815,
  } as unknown as PptxIR
}

describe("board-cover-restore wave 2 — locked cover faces", () => {
  it.each(WAVE2)("$id cover renders $layout with pinned motif", ({ id, layout, motif }) => {
    expect(THEME_DEFINITIONS[id].layouts.cover).toEqual([layout])
    const doc = ir(id)
    const { container } = render(<FullSlideSvg ir={doc} slide={COVER} index={0} />)
    expect(container.querySelector("[data-archetype]")?.getAttribute("data-archetype")).toBe(layout)
    const decor = container.querySelector("[data-decor]")
    if (motif === undefined) {
      expect(decor).toBeNull()
      expect(resolveMotifId(doc, COVER, 0)).toBeUndefined()
    } else {
      expect(decor).not.toBeNull()
      expect(resolveMotifId(doc, COVER, 0)).toBe(motif)
    }
  })
})

const WAVE8_B2_LOCKS = [
  { id: "academic", type: "cover" as const, layout: "thesis-plate-cover", motif: "rail-motif" },
  { id: "academic", type: "chapter" as const, layout: "folio-ghost-chapter", motif: "rail-motif" },
  { id: "academic", type: "ending" as const, layout: "defense-close-ending", motif: "rail-motif" },
  { id: "classroom", type: "cover" as const, layout: "chalk-band-cover", motif: "classroom-motif" },
  { id: "classroom", type: "chapter" as const, layout: "lesson-box-chapter", motif: "classroom-motif" },
  { id: "classroom", type: "ending" as const, layout: "homework-close-ending", motif: "classroom-motif" },
  { id: "crayon", type: "cover" as const, layout: "capsule-open-cover", motif: "crayon-motif" },
  { id: "crayon", type: "chapter" as const, layout: "sticker-numeral-chapter", motif: "crayon-motif" },
  { id: "crayon", type: "ending" as const, layout: "reminder-list-ending", motif: "crayon-motif" },
  { id: "journal", type: "cover" as const, layout: "issue-head-cover", motif: "corner-ornament-motif" },
  { id: "journal", type: "chapter" as const, layout: "fascicle-ghost-chapter", motif: "corner-ornament-motif" },
  { id: "journal", type: "ending" as const, layout: "afterword-ending", motif: "corner-ornament-motif" },
  { id: "heritage", type: "cover" as const, layout: "double-frame-cover", motif: "heritage-motif" },
  { id: "heritage", type: "chapter" as const, layout: "mirror-volume-chapter", motif: "heritage-motif" },
  { id: "heritage", type: "ending" as const, layout: "invite-field-ending", motif: "heritage-motif" },
  { id: "ink", type: "cover" as const, layout: "vertical-title-cover", motif: "ink-motif" },
  { id: "ink", type: "chapter" as const, layout: "volume-slip-chapter", motif: "ink-motif" },
  { id: "ink", type: "ending" as const, layout: "seal-close-ending", motif: "ink-motif" },
] as const

describe("wave 8 batch 2 — locked cover / chapter / ending faces", () => {
  it.each(WAVE8_B2_LOCKS)("$id $type renders $layout with pinned motif", ({ id, type, layout, motif }) => {
    expect(THEME_DEFINITIONS[id].layouts[type]).toEqual([layout])
    const slide: Slide = {
      type,
      heading: type === "ending" ? "收束" : COVER.heading,
      subheading: COVER.subheading,
      components: [],
    } as Slide
    const doc = {
      ...ir(id),
      slides: type === "chapter" ? [COVER, slide] : [slide],
    } as PptxIR
    const index = type === "chapter" ? 1 : 0
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={index} />)
    expect(container.querySelector("[data-archetype]")?.getAttribute("data-archetype")).toBe(layout)
    expect(resolveMotifId(doc, slide, index)).toBe(motif)
  })
})
