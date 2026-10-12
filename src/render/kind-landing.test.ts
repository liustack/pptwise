// @vitest-environment node
import { describe, expect, it } from "vitest"
import {
  BUILTIN_THEME_IDS,
  KIND_VALUES,
  type Component,
  type PageKind,
  type PptxIR,
  type Slide,
} from "@/ir"
import { getLayout } from "../layouts/registry"
import { getThemeDefinition } from "../themes/definitions"
import type { Menu } from "../themes/schema"
import {
  faceHoldsComponents,
  KIND_LANDING,
  landingCandidates,
  landKind,
} from "./kind-landing"
import { resolveEffectiveFace } from "./layout-selection"

const BULLETS = {
  type: "bullets",
  items: ["One", "Two", "Three"],
} as Component
const KPI = {
  type: "kpi_cards",
  items: [{ value: "38%", label: "year over year" }],
} as Component
const QUOTE = {
  type: "blockquote",
  text: "Simplicity is the ultimate sophistication.",
  attribution: "Leonardo",
} as Component
const CHART = {
  type: "chart",
  chart_type: "bar",
  series: [
    {
      name: "Revenue",
      data: [
        { x: "Expansion", y: 62 },
        { x: "New", y: 38 },
      ],
    },
  ],
} as Component
const ORG = { type: "org_tree", root: { name: "CEO" }, children: [{ name: "CTO" }, { name: "CFO" }] } as Component
const GANTT = {
  type: "gantt",
  axis_labels: ["Q1", "Q2", "Q3"],
  items: [
    { label: "Build", start: 1, end: 2 },
    { label: "Ship", start: 2, end: 3 },
  ],
} as Component

/** What a page of each kind most often carries. */
const TYPICAL: Record<PageKind, Component[]> = {
  points: [BULLETS],
  list: [BULLETS],
  comparison: [BULLETS],
  process: [BULLETS],
  data: [CHART],
  photo: [BULLETS],
  statement: [],
  quote: [QUOTE],
  fact: [KPI],
  evidence: [CHART],
  hierarchy: [ORG],
}

function page(kind: PageKind, components: Component[]): Slide {
  return { type: "content", kind, heading: "A page", components } as Slide
}

function deck(themeId: string): PptxIR {
  return {
    version: "5",
    filename: "landing.pptx",
    theme: { id: themeId },
    meta: {},
    assets: {},
    slides: [],
  } as unknown as PptxIR
}

describe("KIND_LANDING", () => {
  it("names stand-ins for every kind, never the kind itself, ending at points or list", () => {
    expect(Object.keys(KIND_LANDING).sort()).toEqual([...KIND_VALUES].sort())
    for (const kind of KIND_VALUES) {
      const stand = KIND_LANDING[kind]
      expect(stand.length, kind).toBeGreaterThan(0)
      expect(stand, kind).not.toContain(kind)
      expect(new Set(stand).size, kind).toBe(stand.length)
      expect(["points", "list"], kind).toContain(stand[stand.length - 1])
    }
  })

  it("always has somewhere to land on a built-in theme: every menu offers points and list", () => {
    for (const id of BUILTIN_THEME_IDS) {
      const menu = getThemeDefinition(id).menu
      expect(menu.content.points, id).toBeDefined()
      expect(menu.content.list, id).toBeDefined()
      for (const kind of KIND_VALUES)
        expect(
          landingCandidates(kind, menu).length,
          `${id} ${kind}`
        ).toBeGreaterThan(0)
    }
  })
})

describe("landingCandidates", () => {
  const menu: Menu = {
    cover: { face: "institutional-block" },
    chapter: { face: "ghost-section-chapter" },
    content: {
      points: { face: "grid-sheet" },
      statement: { face: "statement" },
    },
    ending: { face: "signoff-ending" },
  }

  it("puts the kind itself first when offered, then the offered stand-ins nearest first", () => {
    expect(landingCandidates("points", menu)).toEqual(["points"])
    expect(landingCandidates("fact", menu)).toEqual(["statement", "points"])
    expect(landingCandidates("quote", menu)).toEqual(["statement", "points"])
    expect(landingCandidates("data", menu)).toEqual(["points"])
  })
})

describe("landKind", () => {
  const crayon = getThemeDefinition("crayon").menu

  it("lands a page with no components on the nearest offered kind", () => {
    expect(crayon.content.fact).toBeUndefined()
    expect(landKind("fact", page("fact", []), crayon, getLayout)).toBe(
      landingCandidates("fact", crayon)[0]
    )
  })

  it("passes over a stand-in whose face cannot take the page, to the next one that can", () => {
    const candidates = landingCandidates("hierarchy", crayon)
    const served = landKind(
      "hierarchy",
      page("hierarchy", [ORG]),
      crayon,
      getLayout
    )
    expect(candidates).toContain(served)
    expect(
      faceHoldsComponents(
        getLayout(crayon.content[served!]!.face)!,
        page("hierarchy", [ORG])
      )
    ).toBe(true)
  })

  it("falls back to the first offered kind when no face takes the page, so validate can say why", () => {
    const awkward = page("process", [
      GANTT,
      { type: "paragraph", text: "Two phases" } as Component,
    ])
    expect(landKind("process", awkward, crayon, getLayout)).toBe("process")
  })
})

describe("every built-in theme lands every kind it lacks", () => {
  for (const id of BUILTIN_THEME_IDS) {
    const theme = getThemeDefinition(id)
    const missing = KIND_VALUES.filter(
      (kind) => theme.menu.content[kind] === undefined
    )
    for (const kind of missing) {
      it(`${id}: a typical ${kind} page is drawn by a stand-in whose face takes it`, () => {
        const slide = page(kind, TYPICAL[kind])
        const face = resolveEffectiveFace(deck(id), slide, theme)
        expect(face.error).toBeUndefined()
        expect(KIND_LANDING[kind]).toContain(face.servedKind)
        expect(faceHoldsComponents(face.layout!, slide)).toBe(true)
      })
    }
  }

  it("hands a page back to its own kind's face once the theme offers it", () => {
    const memo = getThemeDefinition("memo")
    for (const kind of KIND_VALUES) {
      const face = resolveEffectiveFace(deck("memo"), page(kind, []), memo)
      expect(face.servedKind, kind).toBe(kind)
      expect(face.layoutId, kind).toBe(memo.menu.content[kind]!.face)
    }
  })
})
