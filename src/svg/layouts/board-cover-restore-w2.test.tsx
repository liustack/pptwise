// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { FullSlideSvg } from "../full-slide-svg"
import { THEME_DEFINITIONS } from "../../themes/definitions"
import { resolveMotifId } from "../motif-selection"
import { getLayout } from "./registry"
import { HEARTBEAT_POINTS } from "../motifs/motif-pulse-motif"
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
  { id: "luxe", layout: "invitation-plate-cover", motif: "luxe-motif" },
  { id: "journal", layout: "issue-head-cover", motif: "corner-ornament-motif" },
  { id: "ink", layout: "vertical-title-cover", motif: "ink-motif" },
  { id: "museum", layout: "poster-center", motif: undefined },
  { id: "terra", layout: "pledge-open-cover", motif: "terra-motif" },
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
      expect(resolveMotifId(doc, COVER, 0)).toBe(motif)
      const chrome = getLayout(layout)
      if (chrome?.pageFrame || chrome?.suppressMotif) {
        expect(decor).toBeNull()
      } else {
        const painted = container.querySelector("[data-decor], [data-decor-piece]")
        expect(painted).not.toBeNull()
      }
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
  { id: "crayon", type: "cover" as const, layout: "crayonbox-open", motif: "crayonbox-motif" },
  { id: "crayon", type: "chapter" as const, layout: "crayonbox-sticker", motif: "crayonbox-motif" },
  { id: "crayon", type: "ending" as const, layout: "crayonbox-todo", motif: "crayonbox-motif" },
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

const WAVE8_B3_LOCKS = [
  { id: "luxe", type: "cover" as const, layout: "invitation-plate-cover", motif: "luxe-motif" },
  { id: "luxe", type: "chapter" as const, layout: "gilt-ordinal-chapter", motif: "luxe-motif" },
  { id: "luxe", type: "ending" as const, layout: "gilt-word-ending", motif: "luxe-motif" },
  { id: "runway", type: "cover" as const, layout: "show-headline", motif: undefined },
  { id: "runway", type: "chapter" as const, layout: "show-plate", motif: undefined },
  { id: "runway", type: "ending" as const, layout: "show-finale", motif: undefined },
  { id: "vermilion", type: "cover" as const, layout: "red-head-cover", motif: "vermilion-motif" },
  { id: "vermilion", type: "chapter" as const, layout: "seal-numeral-chapter", motif: "vermilion-motif" },
  { id: "vermilion", type: "ending" as const, layout: "deliberation-ending", motif: "vermilion-motif" },
  { id: "terra", type: "cover" as const, layout: "pledge-open-cover", motif: "terra-motif" },
  { id: "terra", type: "chapter" as const, layout: "field-band-chapter", motif: "terra-motif" },
  { id: "terra", type: "ending" as const, layout: "scorecard-ending", motif: "terra-motif" },
  { id: "pulse", type: "cover" as const, layout: "report-open-cover", motif: "pulse-motif" },
  { id: "pulse", type: "chapter" as const, layout: "subject-rule-chapter", motif: "pulse-motif" },
  { id: "pulse", type: "ending" as const, layout: "care-plan-ending", motif: "pulse-motif" },
  { id: "arena", type: "cover" as const, layout: "cut-panel-cover", motif: "arena-motif" },
  { id: "arena", type: "chapter" as const, layout: "round-mark-chapter", motif: "arena-motif" },
  { id: "arena", type: "ending" as const, layout: "seat-cta-ending", motif: "arena-motif" },
] as const

describe("wave 8 batch 3 — locked cover / chapter / ending faces", () => {
  it.each(WAVE8_B3_LOCKS)("$id $type renders $layout with pinned motif", ({ id, type, layout, motif }) => {
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
    if (motif === undefined) {
      expect(resolveMotifId(doc, slide, index)).toBeUndefined()
    } else {
      expect(resolveMotifId(doc, slide, index)).toBe(motif)
    }
  })
})

const WAVE8_B4_LOCKS = [
  { id: "stage", type: "cover" as const, layout: "poster-center", motif: undefined },
  { id: "stage", type: "chapter" as const, layout: "one-word-chapter", motif: undefined },
  { id: "stage", type: "ending" as const, layout: "release-close-ending", motif: undefined },
  { id: "lecture", type: "cover" as const, layout: "board-head", motif: "lecture-motif" },
  { id: "lecture", type: "chapter" as const, layout: "chalk-rule-chapter", motif: "lecture-motif" },
  { id: "lecture", type: "ending" as const, layout: "next-lecture-ending", motif: "lecture-motif" },
  { id: "swiss", type: "cover" as const, layout: "institutional-block", motif: "swiss-motif" },
  { id: "swiss", type: "chapter" as const, layout: "decimal-index-chapter", motif: "swiss-motif" },
  { id: "swiss", type: "ending" as const, layout: "resolution-ending", motif: "swiss-motif" },
  { id: "memo", type: "cover" as const, layout: "memo-head", motif: "memo-motif" },
  { id: "memo", type: "chapter" as const, layout: "issue-line-chapter", motif: "memo-motif" },
  { id: "memo", type: "ending" as const, layout: "decision-close-ending", motif: "memo-motif" },
  { id: "playbill", type: "cover" as const, layout: "bill-head", motif: "playbill-motif" },
  { id: "playbill", type: "chapter" as const, layout: "day-bill-chapter", motif: "playbill-motif" },
  { id: "playbill", type: "ending" as const, layout: "ticket-cta-ending", motif: "playbill-motif" },
  { id: "museum", type: "cover" as const, layout: "poster-center", motif: undefined },
  { id: "museum", type: "chapter" as const, layout: "hall-label-chapter", motif: undefined },
  { id: "museum", type: "ending" as const, layout: "exit-word-ending", motif: undefined },
] as const

describe("wave 8 batch 4 — locked cover / chapter / ending faces", () => {
  it.each(WAVE8_B4_LOCKS)("$id $type renders $layout with pinned motif", ({ id, type, layout, motif }) => {
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
    if (motif === undefined) {
      expect(resolveMotifId(doc, slide, index)).toBeUndefined()
    } else {
      expect(resolveMotifId(doc, slide, index)).toBe(motif)
    }
  })
})

function renderPage(themeId: string, type: "cover" | "chapter" | "content" | "ending") {
  const slide: Slide = {
    type,
    heading: type === "ending" ? "收束" : COVER.heading,
    subheading: COVER.subheading,
    components: type === "content" ? [{ type: "paragraph", text: "证据。" }] : [],
  } as Slide
  const doc = {
    ...ir(themeId),
    slides: type === "chapter" ? [COVER, slide] : [slide],
  } as PptxIR
  const index = type === "chapter" ? 1 : 0
  const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={index} />)
  const mid = container.querySelector('[data-depth="mid"]')!
  return { container, mid, doc, slide, index }
}

describe("wave 8 batch 3 — midground identity survives FullSlideSvg", () => {
  it.each(["cover", "ending"] as const)("luxe %s paints the eight-line invitation frame in the foreground", (type) => {
    const { container } = renderPage("luxe", type)
    const piece = container.querySelector('[data-decor-piece="invitation"]')!
    expect(piece.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    const lines = Array.from(piece.querySelectorAll("line"))
    expect(lines.filter((el) => el.getAttribute("stroke-width") === "1")).toHaveLength(4)
    expect(lines.filter((el) => el.getAttribute("stroke-width") === "0.5")).toHaveLength(4)
    expect(piece.querySelectorAll("rect")).toHaveLength(0)
  })

  it("pulse cover keeps the heartbeat polyline in mid", () => {
    const { mid } = renderPage("pulse", "cover")
    const polylines = mid.querySelectorAll("polyline")
    expect(polylines).toHaveLength(1)
    expect(polylines[0]?.getAttribute("points")).toBe(HEARTBEAT_POINTS)
  })

  it.each(["chapter", "ending"] as const)("pulse %s has no polyline in mid", (type) => {
    const { mid } = renderPage("pulse", type)
    expect(mid.querySelectorAll("polyline")).toHaveLength(0)
  })

  it.each(["cover", "content", "ending"] as const)("terra %s keeps three contour paths", (type) => {
    const { container, mid } = renderPage("terra", type)
    const scope = container.querySelector("[data-decor]") ?? mid
    expect(scope.querySelectorAll("path")).toHaveLength(3)
  })

  it("terra chapter has no contour paths", () => {
    const { container, mid } = renderPage("terra", "chapter")
    const scope = container.querySelector("[data-decor]") ?? mid
    expect(scope.querySelectorAll("path")).toHaveLength(0)
  })

  it.each(["content", "ending"] as const)("vermilion %s paints gold double rules in the foreground", (type) => {
    const { container } = renderPage("vermilion", type)
    const rules = container.querySelector('[data-decor-piece="gold-rules"]')
    expect(rules).not.toBeNull()
    expect(rules!.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(rules!.querySelectorAll("line")).toHaveLength(2)
  })

  it("vermilion cover yields gold-rules so mid does not duplicate the motif pair", () => {
    const { mid } = renderPage("vermilion", "cover")
    expect(mid.querySelector('[data-decor-piece="gold-rules"]')).toBeNull()
    expect(mid.querySelectorAll('[data-decor-piece="gold-rules"] line')).toHaveLength(0)
    expect(mid.querySelectorAll("line").length).toBeLessThan(4)
  })

  it.each(["cover", "content", "ending"] as const)("arena %s keeps three energy bars at y 708 in mid", (type) => {
    const { mid } = renderPage("arena", type)
    const bars = mid.querySelector('[data-decor-piece="energy-bar"]')
    expect(bars).not.toBeNull()
    const rects = bars!.querySelectorAll("rect")
    expect(rects).toHaveLength(3)
    for (const rect of Array.from(rects)) {
      expect(rect.getAttribute("y")).toBe("708")
      expect(Number(rect.getAttribute("height"))).toBe(8)
      expect(Number(rect.getAttribute("x")) + Number(rect.getAttribute("width"))).toBeLessThanOrEqual(1280)
      expect(Number(rect.getAttribute("y")) + Number(rect.getAttribute("height"))).toBeLessThan(720)
    }
  })

  it("arena content after a chapter keeps the ROUND chip and drops HUD corner brackets", () => {
    const chapter: Slide = { type: "chapter", heading: "增长战略", components: [] } as Slide
    const slide: Slide = {
      type: "content",
      heading: COVER.heading,
      subheading: COVER.subheading,
      components: [{ type: "paragraph", text: "证据。" }],
    } as Slide
    const doc = { ...ir("arena"), slides: [chapter, slide] } as PptxIR
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={1} />)
    expect(container.textContent).toContain("ROUND")
    expect(container.querySelectorAll("path")).toHaveLength(0)
    expect(container.innerHTML).not.toContain("M 96 56 l 0 -8 l 8 0")
    expect(container.innerHTML).not.toContain("M 246 86 l 0 8 l -8 0")
  })

  it("arena chapter has no energy-bar rects in mid", () => {
    const { mid } = renderPage("arena", "chapter")
    expect(mid.querySelector('[data-decor-piece="energy-bar"]')).toBeNull()
    const energy = Array.from(mid.querySelectorAll("rect")).filter((el) => el.getAttribute("y") === "708")
    expect(energy).toHaveLength(0)
  })
})
