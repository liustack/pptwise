// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../render/subset-validate"
import { GaugeExhibitContent, layoutDef } from "./content-gauge-exhibit"
import { GAUGE_HEAD_FIT } from "./gauge-shared"
import { byText, renderFace, sheetSlide } from "./gauge-sheet/__fixtures__/kit"

const BRIDGE = {
  type: "waterfall",
  unit: "$",
  items: [
    { label: "FY2023", value: 4.1, kind: "total" },
    { label: "Failed first attempts", value: 0.48 },
    { label: "Falling route density", value: 0.37 },
    { label: "Driver overtime", value: 0.26 },
    { label: "Fuel", value: 0.09 },
    { label: "Other", value: 0.05 },
    { label: "FY2026", value: 5.35, kind: "total" },
  ],
}

const evidence = (components: unknown[]) =>
  sheetSlide(components, {
    kind: "evidence",
    heading: "Three drivers explain almost 90% of the increase",
    footnote: "Last-mile cost per parcel, Halden analysis of 2.1 million route records",
  })

describe("content-gauge-exhibit", () => {
  it("hands one exhibit the whole band between the heading rule and the source line", () => {
    const { root, markup } = renderFace(GaugeExhibitContent, evidence([BRIDGE]))
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("96,200,1088,412")
    expect(markup).not.toMatch(/data-dropped="[1-9]/)
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(byText(root, "Three drivers explain almost 90% of the increase")!.getAttribute("y")).toBe("150")
    expect(byText(root, "Last-mile cost per parcel, Halden analysis of 2.1 million route records")).toBeDefined()
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("composes an exhibit that has the board's shape the way the sheet does", () => {
    const comparison = {
      type: "comparison",
      columns: ["Add 600 vans", "Fix density first"],
      rows: [{ label: "Cost to Northwind", cells: ["$210M capital", "$38M over 12 months"] }],
      recommended: 1,
    }
    const { root } = renderFace(GaugeExhibitContent, evidence([comparison]))
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("table")
  })

  it("promises one exhibit and the brief heading fit", () => {
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({ name: "body", accepts: "any", capacity: 1 })
    expect(layoutDef.headingFit).toEqual(GAUGE_HEAD_FIT)
    expect(layoutDef.branding).toBe("none")
  })
})
