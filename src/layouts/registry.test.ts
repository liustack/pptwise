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

  it("has exactly 183 layout-kind entries, all traceable to one of the four real registries", () => {
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
    // The brief sample redesign adds gauge-sheet, gauge-exhibit and
    // gauge-figure, three theme-locked content faces: 130 -> 133. The
    // bulletin sample redesign adds notice-sheet: 133 -> 134. The swiss
    // sample redesign adds grid-sheet, grid-statement and grid-figure: 137.
    // The ledger sample redesign adds panel-sheet and panel-figure: 139.
    // The vermilion sample redesign adds seal-sheet and seal-figure: 141.
    // The terminal sample redesign adds console-cover, console-chapter,
    // console-sheet and console-ending: 145. The memo sample redesign adds
    // memo-cover, memo-sheet and memo-ending: 148. The clinic sample
    // redesign adds dossier-cover, dossier-sheet and dossier-ending: 151. The
    // almanac sample redesign adds yearbook-cover, yearbook-sheet and
    // yearbook-ending: 154. The homeroom sample redesign adds lesson-cover,
    // lesson-chapter, lesson-sheet and lesson-ending: 158. The ember sample
    // redesign adds pitch-cover, pitch-chapter, pitch-sheet, pitch-photo and
    // pitch-ending: 163. The rally sample redesign adds marquee-cover,
    // marquee-chapter, marquee-sheet, marquee-statement and marquee-ending:
    // 168. The proposal theme adds binder-cover, binder-chapter, binder-sheet
    // and binder-ending: 172. The thesis redesign adds manuscript-cover,
    // manuscript-chapter, manuscript-sheet and manuscript-ending: 176. The
    // journal redesign adds periodical-cover, periodical-sheet,
    // periodical-quote and periodical-ending: 180. The ink redesign adds
    // scroll-cover, scroll-chapter, scroll-sheet, scroll-quote and
    // scroll-ending: 185. The arena, playbill and heritage fold deletes the
    // ten faces only those themes drew (cut-panel-cover, round-mark-chapter,
    // seat-cta-ending, bill-head, day-bill-chapter, ticket-cta-ending,
    // mono-bleed, double-frame-cover, mirror-volume-chapter,
    // invite-field-ending): 175. The crayon redesign adds crayonbox-cover,
    // crayonbox-chapter, crayonbox-sheet and crayonbox-ending: 179. The luxe
    // redesign adds invitation-cover, invitation-chapter, invitation-sheet and
    // invitation-ending: 183. The runway redesign adds lineup-cover,
    // lineup-chapter, lineup-sheet and lineup-ending: 187. The museum redesign
    // adds placard-cover, placard-chapter, placard-sheet and placard-ending: 191.
    // The stage redesign adds keynote-cover, keynote-chapter, keynote-sheet and
    // keynote-ending: 195. The lecture redesign adds chalkboard-cover,
    // chalkboard-chapter, chalkboard-sheet and chalkboard-ending: 199.
    expect(layoutEntries).toHaveLength(199)
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
          id === "ask-ending" ||
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
          id === "crayonbox-todo" ||
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
          id === "chalkboard-ending"
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
        id === "gauge-point" ||
        id === "gauge-exhibit" ||
        id === "gauge-figure" ||
        id === "seal-figure" ||
        id === "crayonbox-point" ||
        id === "show-gallery" ||
        id === "show-spotlight" ||
        id === "show-statement" ||
        id === "show-figures" ||
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

  it("gauge-sheet takes up to four blocks, and gauge-exhibit and gauge-figure one", () => {
    const body = (id: string) => LAYOUT_REGISTRY[id].slots.find((s) => s.name === "body")
    expect(body("gauge-sheet")).toMatchObject({ accepts: "any", capacity: 4 })
    expect(body("gauge-exhibit")).toMatchObject({ accepts: "any", capacity: 1 })
    expect(body("gauge-figure")).toMatchObject({ accepts: ["kpi_cards", "paragraph"], capacity: 1 })
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

  it("speech-layout body capacities: stat-hero 1, one-evidence 1", () => {
    expect(LAYOUT_REGISTRY["stat-hero"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
    expect(LAYOUT_REGISTRY["one-evidence"].slots.find((s) => s.name === "body")?.capacity).toBe(1)
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

  it("cover, chapter, and ending expose 51, 46, and 48 registered layouts with no takeovers", () => {
    // The shared automatic pools are unchanged by the gauge family: 19, 8, 7.
    expect(layoutsForSlideType("cover")).toHaveLength(51)
    // Wave 8 batch 4: +6 chapter +6 ending pinOnly faces.
    expect(layoutsForSlideType("chapter")).toHaveLength(46)
    expect(layoutsForSlideType("ending")).toHaveLength(48)
  })

  it("content includes both the 54 layouts and the 4 takeovers", () => {
    const contents = layoutsForSlideType("content")
    expect(contents.filter((l) => l.kind === "standard")).toHaveLength(54)
    expect(contents.filter((l) => l.kind === "takeover")).toHaveLength(4)
    expect(contents).toHaveLength(58)
  })
})
