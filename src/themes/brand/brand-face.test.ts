// @vitest-environment node
import { describe, expect, it } from "vitest"
import { installNodePlatform } from "@/platform/node"
import { CANONICAL_THEME_IDS } from ".."
import { countHeadingRuns, countSlotUse, isChromatic, LARGE_TEXT_PX, measureBrandFace, paintedField, pickBrandFace, renderBrandSample } from "./brand-face"
import { themeFileFromPreset } from "../presets"

installNodePlatform()

/**
 * Each built-in theme's face as its own sample pages measure it. A change
 * to a theme's palette or faces that moves its face fails here: look at the
 * theme's pages, and update the row only when the new face is the color the
 * theme now shows most.
 */
const FACES: Record<(typeof CANONICAL_THEME_IDS)[number], "primary" | "accent"> = {
  brief: "primary", // navy chapter page, headings, steps, chart
  bulletin: "primary", // ultramarine bands and headings
  thesis: "primary", // forest green
  ledger: "accent", // amber on the night page; the primary is a panel shade
  rally: "accent", // magenta; the primary is the plum page itself
  homeroom: "primary", // the lesson's slate blue
  ink: "accent", // the cinnabar seal; the primary is ink black
  terminal: "accent", // cyan; the primary is a console navy 0.12 off the page
  runway: "accent", // rust; the primary is black
  journal: "accent", // brick; the primary is charcoal
  luxe: "accent", // gold
  clinic: "primary", // clinical green
  almanac: "primary", // moss green chapter page, steps, chart
  ember: "primary", // primary and accent are one orange
  vermilion: "primary", // vermilion red headings, bars, chapter mark; the gold is hairlines
  crayon: "primary", // crayon blue, just ahead of the orange
  museum: "accent", // bronze
  stage: "accent", // no slot has chroma: the silver accent takes the brand
  lecture: "accent", // yellow chalk; the primary is blackboard green-grey
  swiss: "accent", // signal red; the primary is black
  memo: "accent", // stamp red; the primary is typewriter black
  proposal: "primary", // deep petrol chapter page and headings
  profile: "accent", // plum section lines, figures and the filled phase; the primary is ink
}

describe("measureBrandFace", () => {
  for (const id of CANONICAL_THEME_IDS) {
    it(`${id}: the face is colors.${FACES[id]}`, () => {
      expect(measureBrandFace(themeFileFromPreset(id, { id: `${id}-probe` })).slot).toBe(FACES[id])
    })
  }

  it("draws every page of the sample deck the theme's menu offers, none of them declined", () => {
    for (const id of CANONICAL_THEME_IDS) {
      const svgs = renderBrandSample(themeFileFromPreset(id, { id: `${id}-probe` }))
      expect(svgs.length, id).toBeGreaterThanOrEqual(10)
      for (const svg of svgs) expect(svg, id).not.toMatch(/data-dropped|data-truncated/)
    }
  })
})

describe("measureBrandFace: fields the pages work out from a slot", () => {
  it("finds homeroom's blackboard, its primary darkened, filling the cover", () => {
    const theme = themeFileFromPreset("homeroom", { id: "homeroom-probe" })
    const field = measureBrandFace(theme).use.primary.derivedField
    expect(field).toMatchObject({ page: 0, share: 1 })
    expect(paintedField(theme, "primary", theme.style.colors.primary, field!)).toBe("#3E5A74")
  })

  it("finds no page-sized reworked field on a theme that paints its colors as they are", () => {
    for (const id of ["brief", "bulletin", "proposal"]) {
      const use = measureBrandFace(themeFileFromPreset(id, { id: `${id}-probe` })).use
      for (const slot of ["primary", "accent"] as const) expect(use[slot].derivedField?.share ?? 0, `${id} ${slot}`).toBeLessThan(0.5)
    }
  })
})

describe("isChromatic", () => {
  it("tells a dark color from an ink black", () => {
    expect(isChromatic("#1E2A4A")).toBe(true) // brief navy
    expect(isChromatic("#0E3B53")).toBe(true) // proposal petrol
    expect(isChromatic("#4D5D39")).toBe(true) // almanac moss
    expect(isChromatic("#1F1C18")).toBe(false) // ink black
    expect(isChromatic("#2E4038")).toBe(false) // blackboard green-grey
    expect(isChromatic("#C4BFB6")).toBe(false) // stage silver
  })
})

describe("countSlotUse", () => {
  const colors = { primary: "#112233", accent: "#CC3300" }

  it("sums painted area, not paints: one bar outweighs two hairlines", () => {
    const svg = [
      `<svg><rect x="0" y="0" width="100" height="2" fill="#112233"></rect>`,
      `<rect x="0" y="4" width="100" height="2" fill="#112233"></rect>`,
      `<rect x="0" y="10" width="40" height="40" fill="#cc3300"></rect></svg>`,
    ].join("")
    const use = countSlotUse([svg], colors)
    expect(use.primary.area).toBe(400)
    expect(use.accent.area).toBe(1600)
  })

  it("tells fields of color from marks: a bar is filled, a rule and a stroke are not", () => {
    const svg = `<svg><rect x="0" y="0" width="40" height="120" fill="#112233"></rect><rect x="0" y="0" width="200" height="4" fill="#112233"></rect><line x1="0" y1="0" x2="100" y2="0" stroke="#112233" stroke-width="3"></line></svg>`
    const use = countSlotUse([svg], colors)
    expect(use.primary.area).toBe(4800 + 800 + 300)
    expect(use.primary.filled).toBe(4800)
  })

  it("counts strokes by length and width, and opacity scales the area", () => {
    const svg = `<svg><line x1="0" y1="0" x2="100" y2="0" stroke="#112233" stroke-width="3"></line><rect x="0" y="0" width="10" height="10" fill="#CC3300" fill-opacity="0.5"></rect></svg>`
    const use = countSlotUse([svg], colors)
    expect(use.primary.area).toBe(300)
    expect(use.accent.area).toBe(50)
  })

  it("notes which slot sets body-size words and which sets display words", () => {
    const svg = [
      `<svg><text x="0" y="0" font-size="16" fill="#CC3300">kicker</text>`,
      `<text x="0" y="0" font-size="${LARGE_TEXT_PX}" fill="#112233">Heading</text>`,
      `<text x="0" y="0" font-size="40"><tspan fill="#112233">Lead</tspan></text></svg>`,
    ].join("")
    const use = countSlotUse([svg], colors)
    expect(use.accent).toMatchObject({ bodyText: 1, largeText: 0 })
    expect(use.primary).toMatchObject({ bodyText: 0, largeText: 2 })
  })
})

describe("countSlotUse: headings and grounds", () => {
  const colors = { primary: "#112233", accent: "#CC3300" }

  it("counts the runs of a page heading a slot sets, wrapped lines included, at their largest size", () => {
    const svg = [
      `<svg><text x="0" y="0" font-size="54" fill="#112233">We will not add a fourth</text>`,
      `<text x="0" y="60" font-size="54" fill="#112233">product line this year</text>`,
      `<text x="0" y="90" font-size="14" fill="#112233">We will not add a fourth product line this year</text>`,
      `<text x="0" y="120" font-size="16" fill="#CC3300">Northstar</text></svg>`,
    ].join("")
    const use = countSlotUse([svg], colors, ["We will not add a fourth product line this year"])
    expect(use.primary).toMatchObject({ headings: 3, headingPx: 54 })
    expect(use.accent.headings).toBe(0)
    expect(countHeadingRuns([svg], ["We will not add a fourth product line this year"])).toBe(3)
  })

  it("notes the largest rectangle a slot fills, as a share of the page", () => {
    const svg = `<svg><rect x="0" y="0" width="1280" height="720" fill="#112233"></rect><rect x="0" y="0" width="640" height="72" fill="#CC3300"></rect></svg>`
    const use = countSlotUse([svg], colors)
    expect(use.primary.field).toBe(1)
    expect(use.accent.field).toBeCloseTo(0.05, 5)
  })

  it("tells the slot that writes brief's headings and the slot that fills bulletin's cover", () => {
    const brief = measureBrandFace(themeFileFromPreset("brief", { id: "brief-probe" }))
    expect(brief.use.primary.headings * 2).toBeGreaterThanOrEqual(brief.headingRuns)
    expect(brief.use.primary.headingPx).toBeGreaterThanOrEqual(LARGE_TEXT_PX)
    const bulletin = measureBrandFace(themeFileFromPreset("bulletin", { id: "bulletin-probe" }))
    expect(bulletin.use.primary.headings).toBe(0)
    expect(bulletin.use.primary.field).toBe(1)
  })
})

describe("pickBrandFace", () => {
  const use = (area: number) => ({ area, bodyText: 0, largeText: 0, headings: 0, headingPx: 0, field: 0, filled: 0 })

  it("weighs area by how far the color stands from the ground", () => {
    // The primary covers twice the area but is a shade of the page.
    const face = pickBrandFace({ primary: "#14294A", accent: "#53E0D2", bg: "#0A0F1E" }, { primary: use(2000), accent: use(1000) })
    expect(face.slot).toBe("accent")
  })

  it("passes over a slot without chroma however much it paints", () => {
    const face = pickBrandFace({ primary: "#141414", accent: "#B0483C", bg: "#F2F0EB" }, { primary: use(100000), accent: use(10) })
    expect(face.slot).toBe("accent")
  })

  it("falls back to accent when neither slot has chroma", () => {
    const face = pickBrandFace({ primary: "#1E1E22", accent: "#C4BFB6", bg: "#0F0F12" }, { primary: use(10), accent: use(10) })
    expect(face).toMatchObject({ slot: "accent", chromatic: { primary: false, accent: false } })
  })
})
