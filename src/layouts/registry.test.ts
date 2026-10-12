import { describe, expect, it } from "vitest"
import { COVER_LAYOUTS } from "./index-cover"
import { CHAPTER_LAYOUTS } from "./index-chapter"
import { CONTENT_LAYOUTS } from "./index-content"
import { ENDING_LAYOUTS } from "./index-ending"
import {
  getLayout,
  LAYOUT_REGISTRY,
  layoutsForSlideType,
  type SlideType,
} from "./registry"

/**
 * The four real layout registries paired with the `SlideType` their family
 * renders as — this is the drift guard: every id the render chain actually
 * dispatches through must have a matching `LAYOUT_REGISTRY` entry, so if a
 * future layout is added to one of these without a registry entry, this
 * test fails loudly instead of the metadata silently going stale.
 */
const FAMILIES: { registry: Record<string, unknown>; slideType: SlideType }[] = [
  { registry: COVER_LAYOUTS, slideType: "cover" },
  { registry: CHAPTER_LAYOUTS, slideType: "chapter" },
  { registry: CONTENT_LAYOUTS, slideType: "content" },
  { registry: ENDING_LAYOUTS, slideType: "ending" },
]

const TAKEOVER_IDS = ["image-split", "image-top"] as const

describe("LAYOUT_REGISTRY completeness (layout ids)", () => {
  for (const { registry, slideType } of FAMILIES) {
    for (const id of Object.keys(registry)) {
      it(`${slideType} layout "${id}" has a matching registry entry`, () => {
        const entry = LAYOUT_REGISTRY[id]
        expect(entry, `missing LAYOUT_REGISTRY entry for layout id "${id}"`).toBeDefined()
        expect(entry.id).toBe(id)
        expect(entry.kind).toBe("standard")
        expect(entry.slideTypes).toContain(slideType)
      })
    }
  }

  it("has exactly 109 layout-kind entries, all traceable to one of the four real registries", () => {
    const knownIds = new Set([
      ...Object.keys(COVER_LAYOUTS),
      ...Object.keys(CHAPTER_LAYOUTS),
      ...Object.keys(CONTENT_LAYOUTS),
      ...Object.keys(ENDING_LAYOUTS),
    ])
    const layoutEntries = Object.values(LAYOUT_REGISTRY).filter((e) => e.kind === "standard")
    // 202 until the 99 faces no built-in theme menu used were deleted: 105.
    // profile's four faces: 109.
    expect(layoutEntries).toHaveLength(109)
    for (const entry of layoutEntries) {
      expect(knownIds.has(entry.id), `"${entry.id}" is not a real layout id`).toBe(true)
    }
  })
})

describe("LAYOUT_REGISTRY completeness (takeover ids)", () => {
  for (const id of TAKEOVER_IDS) {
    it(`"${id}" is registered as a content takeover with a "first" image slot`, () => {
      const entry = LAYOUT_REGISTRY[id]
      expect(entry, `missing LAYOUT_REGISTRY entry for takeover id "${id}"`).toBeDefined()
      expect(entry.id).toBe(id)
      expect(entry.kind).toBe("takeover")
      expect(entry.slideTypes).toEqual(["content"])
      const image = entry.slots.find((s) => s.name === "image")
      expect(image?.selection).toBe("first")
    })
  }

  it("has exactly 2 takeover-kind entries", () => {
    const takeoverEntries = Object.values(LAYOUT_REGISTRY).filter((e) => e.kind === "takeover")
    expect(takeoverEntries).toHaveLength(2)
  })

})

describe("content family: body slot", () => {
  for (const id of Object.keys(CONTENT_LAYOUTS)) {
    it(`"${id}" has a body slot`, () => {
      const entry = LAYOUT_REGISTRY[id]
      expect(entry.slots.some((s) => s.name === "body"), `"${id}" is missing a body slot`).toBe(true)
    })
  }

  it("cover/chapter/ending layouts never read components, so none declare a body slot", () => {
    for (const { registry, slideType } of FAMILIES) {
      if (slideType === "content") continue
      for (const id of Object.keys(registry)) {
        const entry = LAYOUT_REGISTRY[id]
        // gauge-verdict reads the first bullets component as numbered
        // arguments. Empty components stay legal (capacity 1, zero drawn).
        if (
          id === "gauge-verdict" ||
          id === "signoff-ending" ||
          id === "deliberation-ending" ||
          id === "resolution-ending" ||
          id === "gauge-next" ||
          id === "crayonbox-ending" ||
          id === "close-word-ending" ||
          id === "console-ending" ||
          id === "memo-ending" ||
          id === "dossier-ending" ||
          id === "yearbook-cover" ||
          id === "yearbook-ending" ||
          id === "lesson-cover" ||
          id === "lesson-chapter" ||
          id === "lesson-ending" ||
          id === "pitch-cover" ||
          id === "pitch-chapter" ||
          id === "pitch-ending" ||
          id === "marquee-cover" ||
          id === "marquee-chapter" ||
          id === "marquee-ending" ||
          id === "binder-cover" ||
          id === "binder-chapter" ||
          id === "binder-ending" ||
          id === "manuscript-ending" ||
          id === "chalkboard-ending" ||
          id === "portrait-cover" ||
          id === "portrait-ending"
        ) {
          expect(entry.slots.some((s) => s.name === "body")).toBe(true)
          continue
        }
        expect(
          entry.slots.some((s) => s.name === "body"),
          `${slideType} layout "${id}" should not declare a body slot`,
        ).toBe(false)
      }
    }
  })
})

describe("capacity metadata: only where the inventory gives hard numbers", () => {

  it("the remaining content layouts' body slots carry capacity 4, the registry's flat default, except the faces listed here", () => {
    for (const id of Object.keys(CONTENT_LAYOUTS)) {
      if (
        id === "statement" ||
        id === "pull-quote" ||
        id === "stat-hero" ||
        id === "gauge-point" ||
        id === "gauge-exhibit" ||
        id === "gauge-figure" ||
        id === "seal-figure" ||
        // The lesson board's two-study page sets two panels with their charts and a closing tip: five.
        id === "lesson-sheet" ||
        // The campaign's one-line plan sets one row of touchpoints under its claim.
        id === "marquee-statement" ||
        // The periodical's channel page sets five blocks: shares by year, its comment, a photograph, a share bar and its note.
        id === "periodical-sheet" ||
        // The periodical's quotation page takes its one quote.
        id === "periodical-quote" ||
        // The scroll's record page sets five blocks: a photograph, two figures, a progress bar and its line.
        id === "scroll-sheet" ||
        // The scroll's quotation page takes its one passage.
        id === "scroll-quote" ||
        // The crayonbox's studies page sets five blocks: a photograph, two studies, a caution, the lead and the things to do.
        id === "crayonbox-sheet" ||
        // The invitation's swing page sets five blocks: the houses, two dumbbells and the line under them.
        id === "invitation-sheet"
      )
        continue
      const body = LAYOUT_REGISTRY[id].slots.find((s) => s.name === "body")
      expect(body?.capacity, `"${id}" body slot should carry capacity 4`).toBe(4)
    }
  })

  it("stat-hero's body slot carries capacity 1", () => {
    expect(LAYOUT_REGISTRY["stat-hero"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("statement and pull-quote body slots carry capacity 1 (editorial-verse wave — attribution/prose annotation, not a geometric flat-default)", () => {
    expect(LAYOUT_REGISTRY["statement"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["pull-quote"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("gauge-point carries one attribution component", () => {
    expect(LAYOUT_REGISTRY["gauge-point"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("gauge-sheet takes up to four blocks, and gauge-exhibit and gauge-figure one", () => {
    const body = (id: string) => LAYOUT_REGISTRY[id].slots.find((s) => s.name === "body")
    expect(body("gauge-sheet")).toMatchObject({ accepts: "any", capacity: 4 })
    expect(body("gauge-exhibit")).toMatchObject({ accepts: "any", capacity: 1 })
    expect(body("gauge-figure")).toMatchObject({ accepts: ["kpi_cards", "paragraph"], capacity: 1 })
  })

})

describe("getLayout", () => {
  it("returns the entry for a known layout id", () => {
    expect(getLayout("institutional-block")?.kind).toBe("standard")
  })
  it("returns the entry for a known takeover id", () => {
    expect(getLayout("image-split")?.kind).toBe("takeover")
  })
  it("returns undefined for an unknown id", () => {
    expect(getLayout("does-not-exist")).toBeUndefined()
  })
})

describe("layoutsForSlideType", () => {
  it("returns only entries applicable to the given slide type", () => {
    const covers = layoutsForSlideType("cover")
    expect(covers.length).toBeGreaterThan(0)
    for (const l of covers) expect(l.slideTypes).toContain("cover")
  })

  it("cover, chapter, and ending expose 23 registered layouts each with no takeovers", () => {
    expect(layoutsForSlideType("cover")).toHaveLength(23)
    expect(layoutsForSlideType("chapter")).toHaveLength(23)
    expect(layoutsForSlideType("ending")).toHaveLength(23)
  })

  it("content includes both the 40 layouts and the 2 takeovers", () => {
    const contents = layoutsForSlideType("content")
    expect(contents.filter((l) => l.kind === "standard")).toHaveLength(40)
    expect(contents.filter((l) => l.kind === "takeover")).toHaveLength(2)
    expect(contents).toHaveLength(42)
  })
})
