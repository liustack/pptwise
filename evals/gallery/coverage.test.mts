// @vitest-environment node
//
// Bidirectional inventory coverage for the visual-review gallery.
// Cheap: walks `buildMatrix` page ids, no render.

import { describe, expect, it } from "vitest"
import { COMPONENT_FORMS } from "@/svg/components/form-assignments"
import { LAYOUT_REGISTRY } from "@/svg/layouts/registry"
import { CANONICAL_THEME_IDS } from "@/themes"
import { CHART_VARIANTS, FORM_VARIANTS } from "./corpus/components"
import type { CorpusAssets } from "./corpus/decks"
import {
  assertInventoryCoverage,
  dedicatedFormIds,
  formIdForVariant,
  galleryCoverageGaps,
  mapJobSubject,
} from "./coverage"
import { buildMatrix, type Job } from "./matrix"

const emptyAssets = { images: {} } as CorpusAssets
const assets = { zh: emptyAssets, en: emptyAssets, mixed: emptyAssets }

function jobs(opts?: Parameters<typeof buildMatrix>[2]): Job[] {
  return buildMatrix(CANONICAL_THEME_IDS, assets, opts)
}

describe("mapJobSubject", () => {
  it("maps current tables onto their inventories", () => {
    expect(mapJobSubject({ table: "theme", subject: "consulting" })).toEqual({
      inventory: "theme",
      id: "consulting",
    })
    expect(mapJobSubject({ table: "layout", subject: "two-column" })).toEqual({
      inventory: "layout",
      id: "two-column",
    })
    expect(mapJobSubject({ table: "component", subject: "callout" })).toEqual({
      inventory: "component",
      id: "callout",
    })
    expect(mapJobSubject({ table: "component", subject: "chart · bar" })).toEqual({
      inventory: "component",
      id: "chart",
    })
    expect(mapJobSubject({ table: "component", subject: "flowchart · typed nodes" })).toEqual({
      inventory: "form",
      id: "typed_nodes",
    })
    expect(mapJobSubject({ table: "component", subject: "architecture · layer stack" })).toEqual({
      inventory: "form",
      id: "layer_stack",
    })
    expect(mapJobSubject({ table: "density", subject: "bullets" })).toEqual({
      inventory: "component",
      id: "bullets",
    })
  })

  it("leaves retired subjects unmapped, including bloom / logo-wall / side-highlight", () => {
    expect(mapJobSubject({ table: "theme", subject: "bloom" })).toBeUndefined()
    expect(mapJobSubject({ table: "component", subject: "logo-wall" })).toBeUndefined()
    expect(mapJobSubject({ table: "layout", subject: "side-highlight" })).toBeUndefined()
    expect(mapJobSubject({ table: "component", subject: "speech" })).toBeUndefined()
    expect(mapJobSubject({ table: "unknown", subject: "consulting" })).toBeUndefined()
  })

  it("maps every chart variant onto the chart component type", () => {
    for (const id of Object.keys(CHART_VARIANTS)) {
      expect(mapJobSubject({ table: "component", subject: id }), id).toEqual({
        inventory: "component",
        id: "chart",
      })
    }
  })
})

describe("gallery inventory coverage", () => {
  it("covers every canonical theme, registered layout (incl pinOnly), and IR component type", () => {
    const matrix = jobs()
    const gaps = galleryCoverageGaps(matrix)

    expect(gaps.missingThemes, `missing themes: ${gaps.missingThemes.join(", ")}`).toEqual([])
    expect(gaps.missingLayouts, `missing layouts: ${gaps.missingLayouts.join(", ")}`).toEqual([])
    expect(gaps.missingComponents, `missing components: ${gaps.missingComponents.join(", ")}`).toEqual([])

    const pinOnly = Object.values(LAYOUT_REGISTRY)
      .filter((def) => def.pinOnly)
      .map((def) => def.id)
      .sort()
    const layoutSubjects = new Set(matrix.filter((job) => job.table === "layout").map((job) => job.subject))
    expect(pinOnly.filter((id) => !layoutSubjects.has(id))).toEqual([])
    expect(layoutSubjects.size).toBe(Object.keys(LAYOUT_REGISTRY).length)
  })

  it("keeps flowchart typed_nodes and architecture layer_stack as findable component pages", () => {
    const ids = new Set(jobs({ only: "component" }).map((job) => job.id))
    for (const lang of ["zh", "en", "mixed"] as const) {
      expect(ids.has(`component--flowchart-typed-nodes--${lang}`)).toBe(true)
      expect(ids.has(`component--architecture-layer-stack--${lang}`)).toBe(true)
    }
  })

  it("gives every component-face form a dedicated FORM_VARIANTS page, and pad only a theme-table surface", () => {
    const matrix = jobs()
    const dedicated = new Set(
      FORM_VARIANTS.map(formIdForVariant).filter((form): form is NonNullable<typeof form> => !!form),
    )

    expect(dedicatedFormIds().includes("pad")).toBe(false)
    expect(dedicatedFormIds().includes("underline")).toBe(false)
    expect(COMPONENT_FORMS.includes("pad")).toBe(true)
    expect(COMPONENT_FORMS.includes("underline")).toBe(true)

    const missingDedicated = dedicatedFormIds().filter((form) => !dedicated.has(form))
    expect(missingDedicated, `missing dedicated form pages: ${missingDedicated.join(", ")}`).toEqual([])

    const gaps = galleryCoverageGaps(matrix)
    expect(gaps.missingForms, `forms with no visible surface: ${gaps.missingForms.join(", ")}`).toEqual([])
    expect(gaps.missingDedicatedForms).toEqual([])
  })

  it("names unmapped leftover subjects instead of mixing them into the review wall", () => {
    const ghost: Job = {
      ...jobs({ only: "component", languages: ["zh"] })[0]!,
      id: "component--logo-wall--zh",
      subject: "logo-wall",
    }
    expect(() => assertInventoryCoverage([ghost])).toThrow(/logo-wall/)
  })

  it("accepts the current matrix", () => {
    expect(() => assertInventoryCoverage(jobs())).not.toThrow()
  })
})
