// @vitest-environment node
//
// Bidirectional inventory coverage for the visual-review gallery.
// Cheap: walks `buildMatrix` page ids, no render.

import { describe, expect, it } from "vitest"

import { LAYOUT_REGISTRY } from "@/layouts/registry"
import { CANONICAL_THEME_IDS } from "@/themes"
import { CHART_VARIANTS } from "./corpus/components"
import type { CorpusAssets } from "./corpus/decks"
import {
  assertInventoryCoverage,
  galleryCoverageGaps,
  mapJobSubject,
} from "./coverage"
import { buildMatrix, servedLayoutIds, unservedLayoutIds, UNSERVED_SECTION, type Job } from "./matrix"

const emptyAssets = { images: {} } as CorpusAssets
const assets = { zh: emptyAssets, en: emptyAssets, mixed: emptyAssets }

function jobs(opts?: Parameters<typeof buildMatrix>[2]): Job[] {
  return buildMatrix(CANONICAL_THEME_IDS, assets, opts)
}

describe("mapJobSubject", () => {
  it("maps current bands onto their inventories", () => {
    expect(mapJobSubject({ band: "deck", subject: "consulting" })).toEqual({
      inventory: "theme",
      id: "consulting",
    })
    expect(mapJobSubject({ band: "face", subject: "two-column" })).toEqual({
      inventory: "layout",
      id: "two-column",
    })
    expect(mapJobSubject({ band: "component", subject: "callout" })).toEqual({
      inventory: "component",
      id: "callout",
    })
    expect(mapJobSubject({ band: "component", subject: "chart · bar" })).toEqual({
      inventory: "component",
      id: "chart",
    })
    expect(mapJobSubject({ band: "component", subject: "hub_spoke" })).toEqual({
      inventory: "component",
      id: "hub_spoke",
    })
    expect(mapJobSubject({ band: "component", subject: "flowchart · typed nodes" })).toBeUndefined()
  })

  it("leaves retired subjects unmapped, including bloom / logo-wall / side-highlight", () => {
    expect(mapJobSubject({ band: "deck", subject: "bloom" })).toBeUndefined()
    expect(mapJobSubject({ band: "component", subject: "logo-wall" })).toBeUndefined()
    expect(mapJobSubject({ band: "face", subject: "side-highlight" })).toBeUndefined()
    expect(mapJobSubject({ band: "component", subject: "speech" })).toBeUndefined()
    expect(mapJobSubject({ band: "unknown", subject: "consulting" })).toBeUndefined()
  })

  it("maps every chart variant onto the chart component type", () => {
    for (const id of Object.keys(CHART_VARIANTS)) {
      expect(mapJobSubject({ band: "component", subject: id }), id).toEqual({
        inventory: "component",
        id: "chart",
      })
    }
  })
})

describe("gallery inventory coverage", () => {
  it("covers every canonical theme, registered layout, and IR component type", () => {
    const matrix = jobs()
    const gaps = galleryCoverageGaps(matrix)

    expect(gaps.missingThemes, `missing themes: ${gaps.missingThemes.join(", ")}`).toEqual([])
    expect(gaps.missingLayouts, `missing layouts: ${gaps.missingLayouts.join(", ")}`).toEqual([])
    expect(gaps.missingComponents, `missing components: ${gaps.missingComponents.join(", ")}`).toEqual([])
  })

  it("gives every theme section the same component page list — one drawing per component", () => {
    const ids = jobs({ only: "component" })
    const perTheme = new Map<string, string[]>()
    for (const job of ids) {
      perTheme.set(job.section, [...(perTheme.get(job.section) ?? []), job.subject])
    }
    const sorted = [...perTheme.values()].map((list) => [...new Set(list)].sort().join(","))
    expect(new Set(sorted).size, "theme sections disagree on which components they draw").toBe(1)
  })

  it("gives every theme section all three bands, and every one of them every component type", () => {
    const gaps = galleryCoverageGaps(jobs())
    expect(gaps.missingBands, `missing bands: ${gaps.missingBands.join(", ")}`).toEqual([])
    expect(
      gaps.missingSectionComponents,
      `missing per-section components: ${gaps.missingSectionComponents.slice(0, 10).join(", ")}`,
    ).toEqual([])
  })

  it("puts exactly the layouts no menu serves into the appendix section", () => {
    const matrix = jobs()
    const gaps = galleryCoverageGaps(matrix)
    expect(gaps.missingUnserved, `unserved but absent: ${gaps.missingUnserved.join(", ")}`).toEqual([])
    expect(gaps.misfiledUnserved, `served but filed as unserved: ${gaps.misfiledUnserved.join(", ")}`).toEqual([])

    const served = servedLayoutIds(CANONICAL_THEME_IDS)
    const appendix = matrix.filter((job) => job.section === UNSERVED_SECTION)
    expect(appendix.length).toBeGreaterThan(0)
    expect(appendix.every((job) => job.band === "face")).toBe(true)
    expect(appendix.every((job) => job.theme === "consulting")).toBe(true)
    expect([...new Set(appendix.map((job) => job.subject))].sort()).toEqual(unservedLayoutIds(CANONICAL_THEME_IDS))
    expect(appendix.some((job) => served.has(job.subject))).toBe(false)
  })

  it("gives every registered layout a face-band page somewhere", () => {
    const faces = new Set(jobs().filter((job) => job.band === "face").map((job) => job.subject))
    const missing = Object.keys(LAYOUT_REGISTRY).filter((id) => !faces.has(id)).sort()
    expect(missing, `layouts with no face page: ${missing.join(", ")}`).toEqual([])
  })

  it("names unmapped leftover subjects instead of mixing them into the review wall", () => {
    const ghost: Job = {
      ...jobs({ only: "component", languages: ["zh"] })[0]!,
      id: "consulting--comp--logo-wall--zh",
      subject: "logo-wall",
    }
    expect(() => assertInventoryCoverage([ghost])).toThrow(/logo-wall/)
  })

  it("accepts the current matrix", () => {
    expect(() => assertInventoryCoverage(jobs())).not.toThrow()
  })
})
