// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest"
import { BoundSlideSvg } from "../render/__fixtures__/bound-slide"
import { render } from "@testing-library/react"
import { getLayout } from "./registry"
import { __resetRegisteredThemes, getThemeDefinition, THEME_DEFINITIONS } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import type { CanonicalThemeId } from "../themes"
import type { MenuDecor } from "../themes/schema"
import type { PptxIR, Slide } from "@/ir"

const COVER: Slide = {
  type: "cover",
  heading: "云觅科技 2026 年第二季度业务评审",
  subheading: "增长质量与下半年投入方向",
  components: [],
} as Slide

const WAVE2 = [
  { id: "thesis", face: "manuscript-cover" },
  { id: "rally", face: "marquee-cover" },
  { id: "ledger", face: "stat-cover" },
  { id: "terminal", face: "console-cover" },
  { id: "luxe", face: "invitation-plate-cover" },
  { id: "journal", face: "periodical-cover" },
  { id: "ink", face: "scroll-cover" },
  { id: "museum", face: "poster-center" },
  { id: "almanac", face: "yearbook-cover" },
  { id: "heritage", face: "double-frame-cover" },
] as const

type BoundaryType = "cover" | "chapter" | "ending"

function expectedDecor(themeId: CanonicalThemeId, type: BoundaryType): MenuDecor | undefined {
  const source = THEME_DEFINITIONS[themeId]
  const explicit = source.menu[type].decor
  if (explicit !== undefined || source.motif === undefined) return explicit
  return source.motifParameters
    ? { kind: "motif", id: source.motif, params: { ...source.motifParameters } }
    : { kind: "motif", id: source.motif }
}

function materializedDecor(
  themeId: CanonicalThemeId,
  type: BoundaryType,
  face: string,
): MenuDecor | undefined {
  const expected = expectedDecor(themeId, type)
  return expected?.kind === "motif" && getLayout(face)?.suppressMotif === true ? undefined : expected
}

function ir(themeId: string): PptxIR {
  return {
    version: "5",
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
  } as unknown as PptxIR
}

let themeSerial = 0

afterEach(() => {
  __resetRegisteredThemes()
})

function materializedIr(themeId: CanonicalThemeId): PptxIR {
  const registeredId = registerTestTheme(`board-cover-${themeSerial++}`, themeId)
  return ir(registeredId)
}

describe("board-cover-restore wave 2 — locked cover faces", () => {
  it.each(WAVE2)("$id cover renders the menu face and decor", ({ id, face }) => {
    expect(THEME_DEFINITIONS[id].menu.cover.face).toBe(face)
    const doc = materializedIr(id)
    const { container } = render(<BoundSlideSvg ir={doc} slide={COVER} index={0} />)
    expect(container.querySelector("[data-face]")?.getAttribute("data-face")).toBe(face)
    const decor = container.querySelector("[data-decor]")
    const menuDecor = getThemeDefinition(doc.theme.id).menu.cover.decor
    const expected = materializedDecor(id, "cover", face)
    expect(menuDecor).toEqual(expected)
    const faceSuppresses = getLayout(face)?.suppressMotif === true
    if (expected?.kind !== "motif" || faceSuppresses) {
      // A face that paints its own identity keeps every motif off, whatever
      // the menu entry says.
      expect(decor).toBeNull()
    } else {
      const painted = container.querySelector("[data-decor], [data-decor-piece]")
      expect(painted).not.toBeNull()
    }
  })
})

const WAVE8_B2_LOCKS = [
  { id: "thesis", type: "cover" as const, face: "manuscript-cover" },
  { id: "thesis", type: "chapter" as const, face: "manuscript-chapter" },
  { id: "thesis", type: "ending" as const, face: "manuscript-ending" },
  { id: "homeroom", type: "cover" as const, face: "lesson-cover" },
  { id: "homeroom", type: "chapter" as const, face: "lesson-chapter" },
  { id: "homeroom", type: "ending" as const, face: "lesson-ending" },
  { id: "crayon", type: "cover" as const, face: "crayonbox-open" },
  { id: "crayon", type: "chapter" as const, face: "crayonbox-sticker" },
  { id: "crayon", type: "ending" as const, face: "crayonbox-todo" },
  { id: "journal", type: "cover" as const, face: "periodical-cover" },
  { id: "journal", type: "chapter" as const, face: "fascicle-ghost-chapter" },
  { id: "journal", type: "ending" as const, face: "periodical-ending" },
  { id: "heritage", type: "cover" as const, face: "double-frame-cover" },
  { id: "heritage", type: "chapter" as const, face: "mirror-volume-chapter" },
  { id: "heritage", type: "ending" as const, face: "invite-field-ending" },
  { id: "ink", type: "cover" as const, face: "scroll-cover" },
  { id: "ink", type: "chapter" as const, face: "scroll-chapter" },
  { id: "ink", type: "ending" as const, face: "scroll-ending" },
] as const

describe("wave 8 batch 2 — locked cover / chapter / ending faces", () => {
  it.each(WAVE8_B2_LOCKS)("$id $type renders the menu face and decor", ({ id, type, face }) => {
    expect(THEME_DEFINITIONS[id].menu[type].face).toBe(face)
    const slide: Slide = {
      type,
      heading: type === "ending" ? "收束" : COVER.heading,
      subheading: COVER.subheading,
      components: [],
    } as Slide
    const doc = {
      ...materializedIr(id),
      slides: type === "chapter" ? [COVER, slide] : [slide],
    } as PptxIR
    const index = type === "chapter" ? 1 : 0
    const { container } = render(<BoundSlideSvg ir={doc} slide={slide} index={index} />)
    expect(container.querySelector("[data-face]")?.getAttribute("data-face")).toBe(face)
    expect(getThemeDefinition(doc.theme.id).menu[type].decor).toEqual(materializedDecor(id, type, face))
  })
})

const WAVE8_B3_LOCKS = [
  { id: "luxe", type: "cover" as const, face: "invitation-plate-cover" },
  { id: "luxe", type: "chapter" as const, face: "gilt-ordinal-chapter" },
  { id: "luxe", type: "ending" as const, face: "gilt-word-ending" },
  { id: "runway", type: "cover" as const, face: "show-headline" },
  { id: "runway", type: "chapter" as const, face: "show-plate" },
  { id: "runway", type: "ending" as const, face: "show-finale" },
  { id: "vermilion", type: "cover" as const, face: "red-head-cover" },
  { id: "vermilion", type: "chapter" as const, face: "seal-numeral-chapter" },
  { id: "vermilion", type: "ending" as const, face: "deliberation-ending" },
  { id: "almanac", type: "cover" as const, face: "yearbook-cover" },
  { id: "almanac", type: "chapter" as const, face: "field-band-chapter" },
  { id: "almanac", type: "ending" as const, face: "yearbook-ending" },
  { id: "clinic", type: "cover" as const, face: "dossier-cover" },
  { id: "clinic", type: "chapter" as const, face: "subject-rule-chapter" },
  { id: "clinic", type: "ending" as const, face: "dossier-ending" },
  { id: "arena", type: "cover" as const, face: "cut-panel-cover" },
  { id: "arena", type: "chapter" as const, face: "round-mark-chapter" },
  { id: "arena", type: "ending" as const, face: "seat-cta-ending" },
] as const

describe("wave 8 batch 3 — locked cover / chapter / ending faces", () => {
  it.each(WAVE8_B3_LOCKS)("$id $type renders the menu face and decor", ({ id, type, face }) => {
    expect(THEME_DEFINITIONS[id].menu[type].face).toBe(face)
    const slide: Slide = {
      type,
      heading: type === "ending" ? "收束" : COVER.heading,
      subheading: COVER.subheading,
      components: [],
    } as Slide
    const doc = {
      ...materializedIr(id),
      slides: type === "chapter" ? [COVER, slide] : [slide],
    } as PptxIR
    const index = type === "chapter" ? 1 : 0
    const { container } = render(<BoundSlideSvg ir={doc} slide={slide} index={index} />)
    expect(container.querySelector("[data-face]")?.getAttribute("data-face")).toBe(face)
    // A face that sets its own frame (clinic's cover) suppresses the motif.
    expect(getThemeDefinition(doc.theme.id).menu[type].decor).toEqual(materializedDecor(id, type, face))
  })
})

const WAVE8_B4_LOCKS = [
  { id: "stage", type: "cover" as const, face: "poster-center" },
  { id: "stage", type: "chapter" as const, face: "one-word-chapter" },
  { id: "stage", type: "ending" as const, face: "release-close-ending" },
  { id: "lecture", type: "cover" as const, face: "board-head" },
  { id: "lecture", type: "chapter" as const, face: "chalk-rule-chapter" },
  { id: "lecture", type: "ending" as const, face: "next-lecture-ending" },
  { id: "swiss", type: "cover" as const, face: "institutional-block" },
  { id: "swiss", type: "chapter" as const, face: "decimal-index-chapter" },
  { id: "swiss", type: "ending" as const, face: "resolution-ending" },
  { id: "memo", type: "cover" as const, face: "memo-cover" },
  { id: "memo", type: "chapter" as const, face: "issue-line-chapter" },
  { id: "memo", type: "ending" as const, face: "memo-ending" },
  { id: "playbill", type: "cover" as const, face: "bill-head" },
  { id: "playbill", type: "chapter" as const, face: "day-bill-chapter" },
  { id: "playbill", type: "ending" as const, face: "ticket-cta-ending" },
  { id: "museum", type: "cover" as const, face: "poster-center" },
  { id: "museum", type: "chapter" as const, face: "hall-label-chapter" },
  { id: "museum", type: "ending" as const, face: "exit-word-ending" },
] as const

describe("wave 8 batch 4 — locked cover / chapter / ending faces", () => {
  it.each(WAVE8_B4_LOCKS)("$id $type renders the menu face and decor", ({ id, type, face }) => {
    expect(THEME_DEFINITIONS[id].menu[type].face).toBe(face)
    const slide: Slide = {
      type,
      heading: type === "ending" ? "收束" : COVER.heading,
      subheading: COVER.subheading,
      components: [],
    } as Slide
    const doc = {
      ...materializedIr(id),
      slides: type === "chapter" ? [COVER, slide] : [slide],
    } as PptxIR
    const index = type === "chapter" ? 1 : 0
    const { container } = render(<BoundSlideSvg ir={doc} slide={slide} index={index} />)
    expect(container.querySelector("[data-face]")?.getAttribute("data-face")).toBe(face)
    // A face that sets its own frame (memo's cover) suppresses the motif.
    expect(getThemeDefinition(doc.theme.id).menu[type].decor).toEqual(materializedDecor(id, type, face))
  })
})

function renderPage(themeId: string, type: "cover" | "chapter" | "content" | "ending") {
  const slide: Slide = {
    type,
    ...(type === "content" ? { kind: "points" as const } : {}),
    heading: type === "ending" ? "收束" : COVER.heading,
    subheading: COVER.subheading,
    components: type === "content" ? [{ type: "paragraph", text: "证据。" }] : [],
  } as Slide
  const doc = {
    ...materializedIr(themeId as CanonicalThemeId),
    slides: type === "chapter" ? [COVER, slide] : [slide],
  } as PptxIR
  const index = type === "chapter" ? 1 : 0
  const { container } = render(<BoundSlideSvg ir={doc} slide={slide} index={index} />)
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

  it("clinic cover draws its own heartbeat across the page, with nothing in mid", () => {
    const { container, mid } = renderPage("clinic", "cover")
    expect(mid.querySelectorAll("polyline")).toHaveLength(0)
    const beat = container.querySelector("[data-dossier-heartbeat]")!
    expect(beat.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    // No photograph: the line runs to the page's right edge.
    expect(beat.getAttribute("points")!.split(" ").at(-1)).toBe("1280,410")
  })

  it.each(["chapter", "ending"] as const)("clinic %s has no polyline in mid", (type) => {
    const { mid } = renderPage("clinic", type)
    expect(mid.querySelectorAll("polyline")).toHaveLength(0)
  })

  it("almanac cover draws its own six contour lines, with nothing in mid", () => {
    const { container, mid } = renderPage("almanac", "cover")
    expect(mid.querySelectorAll("path")).toHaveLength(0)
    expect(container.querySelectorAll("[data-yearbook-contours] path")).toHaveLength(6)
  })

  it("almanac content heads its page with the sprout, a structure piece in the foreground", () => {
    const { container } = renderPage("almanac", "content")
    const sprout = container.querySelector('[data-decor-piece="sprout"]')!
    expect(sprout.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(sprout.querySelector("[data-yearbook-icon='sprout']")).not.toBeNull()
  })

  it.each(["chapter", "ending"] as const)("almanac %s carries no motif piece: the close sets its own sprout, the olive chapter none", (type) => {
    const { container } = renderPage("almanac", type)
    expect(container.querySelector('[data-decor-piece="sprout"]')).toBeNull()
  })

  it.each(["content", "ending"] as const)("vermilion %s paints gold double rules in the foreground", (type) => {
    const { container } = renderPage("vermilion", type)
    const rules = container.querySelector('[data-decor-piece="gold-rules"]')
    expect(rules).not.toBeNull()
    expect(rules!.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(rules!.querySelectorAll("rect")).toHaveLength(2)
  })

  it("vermilion cover draws its gold rules at the foot only, in the foreground", () => {
    const { container, mid } = renderPage("vermilion", "cover")
    expect(container.querySelector('[data-decor-piece="gold-rules"]')).toBeNull()
    const foot = container.querySelector('[data-decor-piece="gold-rules-foot"]')
    expect(foot!.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(Array.from(foot!.querySelectorAll("rect")).map((rect) => rect.getAttribute("y"))).toEqual(["668", "674"])
    expect(mid.querySelectorAll("rect, line")).toHaveLength(0)
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
      kind: "points",
      heading: COVER.heading,
      subheading: COVER.subheading,
      components: [{ type: "paragraph", text: "证据。" }],
    } as Slide
    const doc = { ...ir("arena"), slides: [chapter, slide] } as PptxIR
    const { container } = render(<BoundSlideSvg ir={doc} slide={slide} index={1} />)
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
