// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { contrastRatio, requiredContrastRatio, resolveSemanticColor } from "../render/ink"
import { BASIS_KINDS, EVIDENCE_KINDS } from "../ir/components/shared"
import { dataTable } from "./data-table"
import { basisInk, evidenceInk, paintTag, ordinaryTagSpec, tagInks, TAG_DASH } from "./tag"

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
    expect(evidenceInk(colors, "preprint")).toBe(colors.chartPalette[3])
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

describe("a tag that says what kind of news it is", () => {
  it("is outlined in the theme's ink for that news, ahead of its source's", () => {
    const ctx = boundThemeCtx("clinic")
    const ground = ctx.defaultBg ?? ctx.colors.bg
    const danger = tagInks(ctx, { text: "超说明书", tone: "danger" }, false, ground, 16)
    expect(danger.fill).toBeNull()
    expect(danger.stroke).toBe(resolveSemanticColor("danger", ctx.colors))
    expect(contrastRatio(danger.text, ground)).toBeGreaterThanOrEqual(requiredContrastRatio(16))
    expect(tagInks(ctx, { text: "x", tone: "warning", evidence: "trial" }, false, ground, 16).stroke).toBe(resolveSemanticColor("warning", ctx.colors))
  })
})

describe("a settled tag", () => {
  it("fills a final yes like the marked row's tag and a final no in grey, its words legible", () => {
    const ctx = boundThemeCtx("clinic")
    const ground = ctx.defaultBg ?? ctx.colors.bg
    const marked = tagInks(ctx, { text: "纳入" }, true, ground, 16)
    const yes = tagInks(ctx, { text: "纳入", settled: true }, false, ground, 16)
    expect(yes).toEqual(marked)
    const no = tagInks(ctx, { text: "不纳入", settled: true, quiet: true }, false, ground, 16)
    expect(no.fill).not.toBeNull()
    expect(no.fill).not.toBe(ground)
    expect(contrastRatio(no.text, no.fill!)).toBeGreaterThanOrEqual(requiredContrastRatio(16))
    // An open verdict stays outlined.
    expect(tagInks(ctx, { text: "暂缓", quiet: true }, false, ground, 16).fill).toBeNull()
  })
})

describe("a tag that says what it rests on", () => {
  it("outlines the law in the primary, an estimate and a proposal in the accent, a pending figure in the muted ink", () => {
    const { colors } = boundThemeCtx("almanac")
    expect(basisInk(colors, "law")).toBe(colors.primary)
    expect(basisInk(colors, "estimate")).toBe(colors.accent)
    expect(basisInk(colors, "proposal")).toBe(colors.accent)
    expect(basisInk(colors, "pending")).toBe(colors.muted)
  })

  it("dashes the three that are not settled and keeps the law solid", () => {
    const ctx = boundThemeCtx("almanac")
    const ground = ctx.defaultBg ?? ctx.colors.bg
    const dash = (basis: (typeof BASIS_KINDS)[number]) => {
      const tag = { text: "x", basis }
      const { container } = render(<svg>{paintTag({ tag, x: 0, y: 0, spec: ordinaryTagSpec(ctx), inks: tagInks(ctx, tag, false, ground, 16) })}</svg>)
      return container.querySelector("[data-tag-basis] rect")!.getAttribute("stroke-dasharray")
    }
    expect(dash("law")).toBeNull()
    expect(dash("estimate")).toBe(TAG_DASH)
    expect(dash("pending")).toBe(TAG_DASH)
    expect(dash("proposal")).toBe(TAG_DASH)
  })

  it("keeps every basis legible on the page in every built-in theme it is drawn on", () => {
    for (const theme of ["almanac", "clinic", "brief", "terminal", "memo", "crayon"]) {
      const ctx = boundThemeCtx(theme)
      const ground = ctx.defaultBg ?? ctx.colors.bg
      for (const basis of BASIS_KINDS) {
        const inks = tagInks(ctx, { text: "x", basis }, false, ground, 16)
        expect(inks.fill).toBeNull()
        expect(contrastRatio(inks.text, ground), `${theme} ${basis}`).toBeGreaterThanOrEqual(requiredContrastRatio(16))
      }
    }
  })

  it("still fills the tag on the figure the page marks, whatever it rests on", () => {
    const ctx = boundThemeCtx("almanac")
    expect(tagInks(ctx, { text: "x", basis: "proposal" }, true, ctx.colors.bg, 16).fill).not.toBeNull()
  })
})
