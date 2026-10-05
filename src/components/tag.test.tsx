// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { contrastRatio, requiredContrastRatio, resolveSemanticColor } from "../render/ink"
import { EVIDENCE_KINDS } from "../ir/components/shared"
import { dataTable } from "./data-table"
import { evidenceInk, tagInks } from "./tag"

describe("a tag that names its source", () => {
  it("outlines each kind of source in its own ink, read from the theme's tokens", () => {
    const { colors } = boundThemeCtx("clinic")
    // clinic's chart palette is teal, light teal (its accent), vein blue and
    // slate: the quieter inks after the primary and the accent are the last two.
    expect(evidenceInk(colors, "trial")).toBe(colors.primary)
    expect(evidenceInk(colors, "official")).toBe(colors.primary)
    expect(evidenceInk(colors, "label")).toBe(colors.chartPalette[2])
    expect(evidenceInk(colors, "registry")).toBe(colors.chartPalette[2])
    expect(evidenceInk(colors, "draft")).toBe(colors.chartPalette[3])
    expect(evidenceInk(colors, "company")).toBe(resolveSemanticColor("warning", colors))
    expect(evidenceInk(colors, "press")).toBe(colors.muted)
  })

  it("keeps every kind's words legible on the page in every built-in theme it is drawn on", () => {
    for (const theme of ["clinic", "brief", "terminal", "memo", "crayon"]) {
      const ctx = boundThemeCtx(theme)
      const ground = ctx.defaultBg ?? ctx.colors.bg
      for (const kind of EVIDENCE_KINDS) {
        const inks = tagInks(ctx, { text: "x", evidence: kind }, false, ground, 16)
        expect(inks.fill).toBeNull()
        expect(contrastRatio(inks.text, ground), `${theme} ${kind}`).toBeGreaterThanOrEqual(requiredContrastRatio(16))
      }
    }
  })

  it("still fills the tag on the row the page marks, whatever its source", () => {
    const ctx = boundThemeCtx("clinic")
    expect(tagInks(ctx, { text: "x", evidence: "press" }, true, ctx.colors.bg, 16).fill).not.toBeNull()
  })

  it("draws a table row's source tag in its kind's ink", () => {
    const ctx = boundThemeCtx("clinic")
    const table = {
      type: "data_table" as const,
      columns: [
        { key: "d", label: "药物" },
        { key: "n", label: "恶心" },
      ],
      rows: [
        { cells: { d: "司美格鲁肽", n: "44%" }, tag: { text: "美国标签", evidence: "label" as const } },
        { cells: { d: "玛仕度肽", n: "50.5%" }, tag: { text: "企业口径", evidence: "company" as const } },
      ],
    }
    const { container } = render(<svg>{dataTable.render(table, { x: 0, y: 0, w: 900 }, ctx)}</svg>)
    const outlines = Array.from(container.querySelectorAll("[data-tag] rect")).map((r) => r.getAttribute("stroke"))
    expect(outlines).toEqual([ctx.colors.chartPalette[2], resolveSemanticColor("warning", ctx.colors)])
  })
})
