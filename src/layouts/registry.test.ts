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

const TAKEOVER_IDS = ["image-split", "image-top", "image-bottom", "image-annotate"] as const

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

  it("has exactly 130 layout-kind entries, all traceable to one of the four real registries", () => {
    const knownIds = new Set([
      ...Object.keys(COVER_LAYOUTS),
      ...Object.keys(CHAPTER_LAYOUTS),
      ...Object.keys(CONTENT_LAYOUTS),
      ...Object.keys(ENDING_LAYOUTS),
    ])
    const layoutEntries = Object.values(LAYOUT_REGISTRY).filter((e) => e.kind === "standard")
    // Wave 8 batch 4: +6 chapter +6 ending pinOnly faces, 102 -> 114.
    // banner-heading retired: 114 -> 113.
    // brief gauge adds five pin-only faces: 113 -> 118. All five are
    // theme-locked, so none of them joins the shared automatic pools.
    // One-box-of-crayons adds five theme-locked pin-only faces: 118 -> 123.
    // Runway show adds seven pin-only faces: 123 -> 130.
    expect(layoutEntries).toHaveLength(130)
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

  it("has exactly 4 takeover-kind entries", () => {
    const takeoverEntries = Object.values(LAYOUT_REGISTRY).filter((e) => e.kind === "takeover")
    expect(takeoverEntries).toHaveLength(4)
  })

  it("image-annotate declares a capacity-4 annotation slot", () => {
    const entry = LAYOUT_REGISTRY["image-annotate"]
    const annotation = entry.slots.find((s) => s.name === "annotation")
    expect(annotation?.capacity).toBe(4)
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
        // verdict-index reads the first bullets component as numbered
        // arguments. Empty components stay legal (capacity 1, zero drawn).
        if (
          id === "verdict-index" ||
          id === "gauge-verdict" ||
          id === "action-pad-ending" ||
          id === "signoff-ending" ||
          id === "pill-cta-ending" ||
          id === "defense-close-ending" ||
          id === "homework-close-ending" ||
          id === "reminder-list-ending" ||
          id === "deliberation-ending" ||
          id === "scorecard-ending" ||
          id === "care-plan-ending" ||
          id === "next-lecture-ending" ||
          id === "resolution-ending" ||
          id === "decision-close-ending" ||
          id === "gauge-next" ||
          id === "crayonbox-todo"
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
  it("hero and strip slots (stacked-poster) carry capacity 1", () => {
    const slots = LAYOUT_REGISTRY["stacked-poster"].slots
    expect(slots.find((s) => s.name === "hero")?.capacity).toBe(1)
    expect(slots.find((s) => s.name === "strip")?.capacity).toBe(1)
  })

  it("the grid slot (bento-panel) carries capacity 6", () => {
    const grid = LAYOUT_REGISTRY["bento-panel"].slots.find((s) => s.name === "grid")
    expect(grid?.capacity).toBe(6)
  })

  it("bento-panel's body slot mirrors its own grid capacity (6), not the flat single-stack default (W2 task 5)", () => {
    const body = LAYOUT_REGISTRY["bento-panel"].slots.find((s) => s.name === "body")
    expect(body?.capacity).toBe(6)
  })

  it("the remaining content layouts' body slots carry capacity 4 (W2 task 5 — the registry's own geometric number, unchanged by W3; P1 variety wave task 4's three new layouts join at the same flat default — see registry.ts's CONTENT_LAYOUT_DEFS header comment) — except bento-panel (6, its own grid capacity, asserted separately above) and quote-stage (1, a deliberate authoring contract, not a geometric flat-default — see that layout's own registry.ts derivation comment, quote-stage wave task T2)", () => {
    for (const id of Object.keys(CONTENT_LAYOUTS)) {
      if (
        id === "bento-panel" ||
        id === "quote-stage" ||
        id === "statement" ||
        id === "pull-quote" ||
        id === "stat-hero" ||
        id === "one-evidence" ||
        id === "mono-bleed" ||
        id === "gauge-point" ||
        id === "crayonbox-point" ||
        id === "show-gallery" ||
        id === "show-spotlight" ||
        id === "show-statement" ||
        id === "show-figures"
      )
        continue
      const body = LAYOUT_REGISTRY[id].slots.find((s) => s.name === "body")
      expect(body?.capacity, `"${id}" body slot should carry capacity 4`).toBe(4)
    }
  })

  it("quote-stage's body slot carries capacity 1 (quote-stage wave, task T2 — a deliberate authoring contract for its single attribution/footnote annotation slot, not a geometric flat-default)", () => {
    const body = LAYOUT_REGISTRY["quote-stage"].slots.find((s) => s.name === "body")
    expect(body?.capacity).toBe(1)
  })

  it("statement and pull-quote body slots carry capacity 1 (editorial-verse wave — attribution/prose annotation, not a geometric flat-default)", () => {
    expect(LAYOUT_REGISTRY["statement"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["pull-quote"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("gauge-point carries one attribution component", () => {
    expect(LAYOUT_REGISTRY["gauge-point"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("crayonbox-point carries one attribution component", () => {
    expect(LAYOUT_REGISTRY["crayonbox-point"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("show content faces declare their gated component capacities", () => {
    expect(LAYOUT_REGISTRY["show-gallery"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["show-spotlight"].slots.find((s) => s.name === "body")?.capacity).toBe(2)
    expect(LAYOUT_REGISTRY["show-statement"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["show-figures"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
  })

  it("show content faces declare every slide field their exact composition renders", () => {
    for (const id of ["show-gallery", "show-spotlight", "show-figures"] as const) {
      expect(LAYOUT_REGISTRY[id].slots.some((slot) => slot.name === "subheading"), id).toBe(true)
    }
    expect(LAYOUT_REGISTRY["show-statement"].slots.some((slot) => slot.name === "subheading")).toBe(false)
  })

  it("speech-layout body capacities: stat-hero 1, one-evidence 1, mono-bleed 0", () => {
    expect(LAYOUT_REGISTRY["stat-hero"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["one-evidence"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["mono-bleed"].slots.find((s) => s.name === "body")?.capacity).toBe(0)
  })
})

describe("getLayout", () => {
  it("returns the entry for a known layout id", () => {
    expect(getLayout("banner-title")?.kind).toBe("standard")
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

  it("cover, chapter, and ending expose 37, 36, and 34 registered layouts with no takeovers", () => {
    // The shared automatic pools are unchanged by the gauge family: 19, 8, 7.
    expect(layoutsForSlideType("cover")).toHaveLength(37)
    // Wave 8 batch 4: +6 chapter +6 ending pinOnly faces.
    expect(layoutsForSlideType("chapter")).toHaveLength(36)
    expect(layoutsForSlideType("ending")).toHaveLength(34)
  })

  it("content includes both the 23 layouts and the 4 takeovers", () => {
    const contents = layoutsForSlideType("content")
    expect(contents.filter((l) => l.kind === "standard")).toHaveLength(23)
    expect(contents.filter((l) => l.kind === "takeover")).toHaveLength(4)
    expect(contents).toHaveLength(27)
  })
})
