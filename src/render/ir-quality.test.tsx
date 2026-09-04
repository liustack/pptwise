import { afterEach, describe, expect, it } from "vitest"
import { checkIrQuality, type QualityIssue } from "./ir-quality"
import { CAPACITY } from "../audit/capacity"
import { renderSvgMarkup } from "./serialize"
import { chart } from "../components/chart"
import type { ComponentCtx } from "../components/types"
import { PACING_BUDGETS, resolveNarrative, type Pacing, type NarrativeProfile } from "@/narrative"
import type { Component, PptxIR, Slide } from "@/ir"
import { CONSULTING_TOKENS } from "../themes/builtin/brief"
import { __resetRegisteredThemes, registerTheme } from "../themes/definitions"
import type { Menu } from "../themes/schema"

// ── helpers ──

function makeIR(slides: Slide[], themeId: PptxIR["theme"]["id"] = "brief"): PptxIR {
  return {
    version: "5",
    filename: "test.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides,
  }
}

function codes(issues: QualityIssue[]): string[] {
  return issues.map((i) => i.code)
}

function paragraphs(n: number): Component[] {
  return Array.from({ length: n }, (_, i) => ({ type: "paragraph" as const, text: String(i) }))
}

/** {@link NarrativeProfile} varying only in `pacing` — strategy/audience default (briefing/public, neither affects W3's density/bullets gates). */
function pacingAxes(pacing: Pacing): NarrativeProfile {
  return resolveNarrative({ pacing })
}

function installMenuTheme(id: string, content: Menu["content"]): void {
  registerTheme({
    version: 2,
    id,
    style: {
      ...CONSULTING_TOKENS,
      id,
      shape: { radius: 2, gapScale: 1, typeScale: 1 },
    },
    menu: {
      cover: { face: "poster-center" },
      chapter: { face: "masthead-chapter" },
      content,
      ending: { face: "poster-ending" },
    },
  })
}

afterEach(() => {
  __resetRegisteredThemes()
})

// ── tests ──

describe("checkIrQuality", () => {
  it("returns empty array for a clean deck", () => {
    const ir = makeIR([
      {
        type: "cover",
        heading: "标题",
        components: [],
      },
      {
        type: "content",
        kind: "points",
        heading: "内容页",
        components: [
          { type: "bullets", items: ["a", "b", "c"] },
          { type: "paragraph", text: "hello" },
        ],
      },
    ])
    expect(checkIrQuality(ir)).toEqual([])
  })

  // ── empty_deck ──

  it("reports error for empty deck", () => {
    const issues = checkIrQuality(makeIR([]))
    expect(issues).toHaveLength(1)
    expect(issues[0].severity).toBe("error")
    expect(issues[0].code).toBe("empty_deck")
  })

  describe("density gate uses the menu face plus the unchanged pacing budget", () => {
    it("lets a capacity-4 face bind below dense pacing's budget of 5", () => {
      installMenuTheme("quality-capacity-four", {
        points: { face: "two-column" },
      })
      const ir = makeIR(
        [
          {
            type: "content",
            kind: "points",
            heading: "Capacity",
            components: paragraphs(5),
          },
        ],
        "quality-capacity-four",
      )
      const issue = checkIrQuality(ir, pacingAxes("dense")).find((candidate) => candidate.code === "density")

      expect(issue?.density).toEqual({
        limit: 4,
        pacing: "dense",
        pacingBudget: 5,
        layoutId: "two-column",
        layoutCapacity: 4,
      })
    })

    it("lets pacing bind below a capacity-6 face", () => {
      installMenuTheme("quality-capacity-six", {
        points: { face: "bento-panel" },
      })
      const ir = makeIR(
        [
          {
            type: "content",
            kind: "points",
            heading: "Capacity",
            components: paragraphs(6),
          },
        ],
        "quality-capacity-six",
      )
      const issue = checkIrQuality(ir, pacingAxes("dense")).find((candidate) => candidate.code === "density")

      expect(issue?.density).toEqual({
        limit: 5,
        pacing: "dense",
        pacingBudget: 5,
        layoutId: "bento-panel",
        layoutCapacity: 6,
      })
    })

    it("uses only pacing when the selected takeover declares no body capacity", () => {
      installMenuTheme("quality-takeover", { photo: { face: "image-top" } })
      const ir = makeIR(
        [
          {
            type: "content",
            kind: "photo",
            heading: "Photo",
            components: paragraphs(6),
          },
        ],
        "quality-takeover",
      )
      const issue = checkIrQuality(ir, pacingAxes("dense")).find((candidate) => candidate.code === "density")

      expect(issue?.density).toEqual({
        limit: 5,
        pacing: "dense",
        pacingBudget: 5,
        layoutId: "image-top",
        layoutCapacity: undefined,
      })
    })

    it("excludes the selected image-family source from takeover body density", () => {
      installMenuTheme("quality-takeover-selection", { photo: { face: "image-top" } })
      const ir = makeIR(
        [
          {
            type: "content",
            kind: "photo",
            heading: "Photo",
            components: [
              {
                type: "image_compare",
                left: { asset_id: "before", label: "Before" },
                right: { asset_id: "after", label: "After" },
              },
              ...paragraphs(4),
            ],
          },
        ],
        "quality-takeover-selection",
      )

      expect(codes(checkIrQuality(ir, pacingAxes("balanced")))).not.toContain("density")
    })

    it("does not apply the content density gate to boundary pages", () => {
      installMenuTheme("quality-boundary", { points: { face: "two-column" } })
      const ir = makeIR([{ type: "cover", heading: "Cover", components: paragraphs(8) }], "quality-boundary")

      expect(codes(checkIrQuality(ir, pacingAxes("spacious")))).not.toContain("density")
    })
  })

  // ── bullets (W3 task 3: reads PACING_BUDGETS[pacing].bullets instead of the old flat CAPACITY.bullets) ──

  describe("bullets gate matrix", () => {
    const pacings: Pacing[] = ["dense", "balanced", "spacious"]

    for (const pacing of pacings) {
      const budget = PACING_BUDGETS[pacing]
      const axes = pacingAxes(pacing)

      it(`${pacing} pacing: does NOT warn bullets_overflow at exactly ${budget.bullets.maxItems} items`, () => {
        const ir = makeIR([
          {
            type: "content",
            kind: "points",
            heading: "列表页",
            components: [
              { type: "bullets", items: Array.from({ length: budget.bullets.maxItems }, (_, i) => String(i)) },
            ],
          },
        ])
        expect(codes(checkIrQuality(ir, axes))).not.toContain("bullets_overflow")
      })

      it(`${pacing} pacing: warns bullets_overflow at ${budget.bullets.maxItems + 1} items, naming the pacing`, () => {
        const ir = makeIR([
          {
            type: "content",
            kind: "points",
            heading: "列表页",
            components: [
              { type: "bullets", items: Array.from({ length: budget.bullets.maxItems + 1 }, (_, i) => String(i)) },
            ],
          },
        ])
        const issues = checkIrQuality(ir, axes)
        expect(codes(issues)).toContain("bullets_overflow")
        const issue = issues.find((i) => i.code === "bullets_overflow")!
        expect(issue.message).toContain(String(budget.bullets.maxItems))
        expect(issue.bulletsBudget).toEqual({
          pacing,
          maxItems: budget.bullets.maxItems,
          maxUnitsPerItem: budget.bullets.maxUnitsPerItem,
        })
      })

      it(`${pacing} pacing: does NOT warn bullet_item_long at exactly ${budget.bullets.maxUnitsPerItem} measureTextUnits`, () => {
        const ok = "长".repeat(budget.bullets.maxUnitsPerItem) // CJK weight = 1.0/字
        const ir = makeIR([
          { type: "content", kind: "points", heading: "列表页", components: [{ type: "bullets", items: [ok] }] },
        ])
        expect(codes(checkIrQuality(ir, axes))).not.toContain("bullet_item_long")
      })

      it(`${pacing} pacing: warns bullet_item_long over ${budget.bullets.maxUnitsPerItem} measureTextUnits`, () => {
        const long = "长".repeat(budget.bullets.maxUnitsPerItem + 1)
        const ir = makeIR([
          { type: "content", kind: "points", heading: "列表页", components: [{ type: "bullets", items: [long] }] },
        ])
        const issues = checkIrQuality(ir, axes)
        expect(codes(issues)).toContain("bullet_item_long")
        const issue = issues.find((i) => i.code === "bullet_item_long")!
        expect(issue.severity).toBe("warn")
        expect(issue.bulletsBudget?.pacing).toBe(pacing)
      })
    }

    it("narrative omitted defaults to the general preset (balanced) bullets budget — maxItems 5", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "列表页",
          components: [{ type: "bullets", items: Array.from({ length: 6 }, (_, i) => String(i)) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("bullets_overflow")
      expect(issues.find((i) => i.code === "bullets_overflow")!.bulletsBudget).toEqual({
        pacing: "balanced",
        maxItems: 5,
        maxUnitsPerItem: 25,
      })
    })
  })

  // ── bullet_item_overflow (borrow wave, Task 2: geometric hard ceiling,
  // dual-threshold severity recalibration) — see CAPACITY.bullets
  // .itemOverflowUnits's own derivation comment (capacity.ts) for the
  // formula (2 lines x MIN_FONT=24 floor x narrowest two-column width) and
  // its empirical confirmation. Pacing-independent by construction (the
  // floor and wrap cap bullets.tsx uses are flat constants) — unlike
  // bullet_item_long, this fires the same regardless of which pacing axis
  // resolved.

  describe("bullet_item_overflow (geometric hard ceiling, severity error)", () => {
    it(`does NOT report bullet_item_overflow at exactly ${CAPACITY.bullets.itemOverflowUnits} measureTextUnits`, () => {
      const atCeiling = "长".repeat(CAPACITY.bullets.itemOverflowUnits) // CJK weight = 1.0/字
      const ir = makeIR([
        { type: "content", kind: "points", heading: "列表页", components: [{ type: "bullets", items: [atCeiling] }] },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("bullet_item_overflow")
    })

    it(`reports bullet_item_overflow (severity error) over ${CAPACITY.bullets.itemOverflowUnits} measureTextUnits, alongside bullet_item_long (different questions, neither supersedes the other)`, () => {
      const over = "长".repeat(CAPACITY.bullets.itemOverflowUnits + 1)
      const ir = makeIR([
        { type: "content", kind: "points", heading: "列表页", components: [{ type: "bullets", items: [over] }] },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("bullet_item_overflow")
      expect(issues.find((i) => i.code === "bullet_item_overflow")!.severity).toBe("error")
      expect(codes(issues)).toContain("bullet_item_long")
    })

    it("fires the same regardless of pacing (flat geometric ceiling, not PACING_BUDGETS-scoped)", () => {
      const over = "长".repeat(CAPACITY.bullets.itemOverflowUnits + 1)
      const ir = makeIR([
        { type: "content", kind: "points", heading: "列表页", components: [{ type: "bullets", items: [over] }] },
      ])
      for (const pacing of ["dense", "balanced", "spacious"] as Pacing[]) {
        const issues = checkIrQuality(ir, pacingAxes(pacing))
        expect(codes(issues)).toContain("bullet_item_overflow")
      }
    })
  })

  // ── bullets_count_overflow (P0 hardening, robustness deep-review D1:
  // bullets_overflow's second-tier escalation — borrow-wave Task 2's
  // dual-threshold machinery reused, not a new severity system). See
  // CAPACITY.bullets.countOverflowItems's own derivation comment
  // (capacity.ts) for the formula and its D-report empirical grounding
  // (500/20000-item repro). Flat, pacing-independent ceiling — same design
  // as bullet_item_overflow above, not scaled by each pacing tier's own
  // editorial maxItems budget.

  describe("bullets_count_overflow (second-tier escalation, severity error, flat pacing-independent ceiling)", () => {
    const threshold = CAPACITY.bullets.countOverflowItems

    it(`does NOT report bullets_count_overflow at exactly ${threshold} items (fires alongside the warn-level bullets_overflow, which stays warn)`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "列表页",
          components: [{ type: "bullets", items: Array.from({ length: threshold }, (_, i) => String(i)) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).not.toContain("bullets_count_overflow")
      // Still over the ordinary editorial budget — bullets_overflow (warn)
      // stays a separate, lower-severity finding, untouched by this gate.
      expect(codes(issues)).toContain("bullets_overflow")
    })

    it(`reports bullets_count_overflow (severity error) over ${threshold} items`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "列表页",
          components: [{ type: "bullets", items: Array.from({ length: threshold + 1 }, (_, i) => String(i)) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("bullets_count_overflow")
      const issue = issues.find((i) => i.code === "bullets_count_overflow")!
      expect(issue.severity).toBe("error")
    })

    it("fires the same regardless of pacing (flat ceiling, not PACING_BUDGETS-scoped)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "列表页",
          components: [{ type: "bullets", items: Array.from({ length: threshold + 1 }, (_, i) => String(i)) }],
        },
      ])
      for (const pacing of ["dense", "balanced", "spacious"] as Pacing[]) {
        const issues = checkIrQuality(ir, pacingAxes(pacing))
        expect(codes(issues)).toContain("bullets_count_overflow")
      }
    })

    // D1's own repro fixtures (scratchpad `dr/gen-deck.mts`
    // buildPathologicalDeck / `dr/big-bullets.mts`) — the 500-item scenario
    // must land as graceful (this gate silent), the 20000-item scenario
    // must be blocked. Full generatePptx/render-level coverage lives in
    // `src/pptx/depth-axis-hardening.test.ts`; this pins the quality-gate
    // boundary itself in isolation.
    it("does NOT report bullets_count_overflow for the 500-item D1 repro (must land gracefully, not block)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "500-item bullets stress",
          components: [{ type: "bullets", items: Array.from({ length: 500 }, (_, i) => `item ${i}`) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("bullets_count_overflow")
    })

    it("reports bullets_count_overflow for the 20000-item D1 repro (must block)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "extreme bullets",
          components: [{ type: "bullets", items: Array.from({ length: 20_000 }, (_, i) => `item ${i}`) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).toContain("bullets_count_overflow")
    })
  })

  // ── comparison_overflow / comparison_count_overflow,
  // architecture_overflow / architecture_count_overflow
  // (carried-items wave — P0 hardening's family sweep gave these
  // vertical-stacking components a render-time box.h cap + data-dropped
  // marker, same as bullets, but zero pre-render editorial signal: bullets_
  // overflow/bullets_count_overflow's own dual-threshold shape applied here.
  // Unlike bullets_overflow (a per-pacing PACING_BUDGETS editorial number),
  // these components have no pacing table of their own — both the warn
  // and error thresholds live in CAPACITY (capacity.ts), flat and pacing-
  // independent, mirroring bullet_item_overflow/bullets_count_overflow's own
  // "flat CAPACITY constant" shape instead. See CAPACITY.comparison/
  // .architecture's own derivation comments (capacity.ts) for the
  // box-geometry arithmetic (warn) and two-sided bracketing (error). ──

  function comparisonRows(n: number): { label: string; cells: string[] }[] {
    return Array.from({ length: n }, (_, i) => ({ label: `row ${i}`, cells: ["a", "b"] }))
  }

  describe("comparison_overflow (warn, geometric render-capacity budget)", () => {
    const threshold = CAPACITY.comparison.warnRows

    it(`does NOT warn at exactly ${threshold} rows (the worst-case content box's own no-drop boundary)`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "对比页",
          components: [{ type: "comparison", columns: ["A", "B"], rows: comparisonRows(threshold) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("comparison_overflow")
    })

    it(`warns (severity warn) at ${threshold + 1} rows`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "对比页",
          components: [{ type: "comparison", columns: ["A", "B"], rows: comparisonRows(threshold + 1) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("comparison_overflow")
      expect(issues.find((i) => i.code === "comparison_overflow")!.severity).toBe("warn")
    })
  })

  describe("comparison_count_overflow (error, extreme ceiling mirroring bullets_count_overflow's bracketing)", () => {
    const threshold = CAPACITY.comparison.errorRows

    it(`does NOT report at exactly ${threshold} rows`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "对比压力测试",
          components: [{ type: "comparison", columns: ["A", "B"], rows: comparisonRows(threshold) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("comparison_count_overflow")
    })

    it(`reports (severity error) over ${threshold} rows`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "对比压力测试",
          components: [{ type: "comparison", columns: ["A", "B"], rows: comparisonRows(threshold + 1) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("comparison_count_overflow")
      expect(issues.find((i) => i.code === "comparison_count_overflow")!.severity).toBe("error")
    })

    // Lower bracket anchor: depth-axis-hardening.test.ts's own pinned D1-family
    // fixture (300-row comparison) must keep landing gracefully (render-side
    // cap + data-dropped, never a validate rejection) — this gate must never
    // regress that already-shipped guarantee.
    it("does NOT report for 300 rows (depth-axis-hardening.test.ts's own pinned 'must land gracefully' fixture)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "300-row comparison stress",
          components: [{ type: "comparison", columns: ["A", "B"], rows: comparisonRows(300) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("comparison_count_overflow")
    })

    // Upper bracket anchor: clearly pathological scale (same order of
    // magnitude as the D1 report's own 20000-item bullets repro) must reject.
    it("reports for 20000 rows (clearly pathological, must reject)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "extreme comparison",
          components: [{ type: "comparison", columns: ["A", "B"], rows: comparisonRows(20_000) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).toContain("comparison_count_overflow")
    })
  })

  function architectureLayers(n: number): { title: string; items: string[] }[] {
    return Array.from({ length: n }, (_, i) => ({ title: `layer ${i}`, items: ["a", "b"] }))
  }

  describe("architecture_overflow (warn, geometric render-capacity budget)", () => {
    const threshold = CAPACITY.architecture.warnLayers

    it(`does NOT warn at exactly ${threshold} layers (the worst-case content box's own no-drop boundary)`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "架构页",
          components: [{ type: "architecture", layers: architectureLayers(threshold) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("architecture_overflow")
    })

    it(`warns (severity warn) at ${threshold + 1} layers`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "架构页",
          components: [{ type: "architecture", layers: architectureLayers(threshold + 1) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("architecture_overflow")
      expect(issues.find((i) => i.code === "architecture_overflow")!.severity).toBe("warn")
    })
  })

  describe("architecture_count_overflow (error, extreme ceiling mirroring bullets_count_overflow's bracketing)", () => {
    const threshold = CAPACITY.architecture.errorLayers

    it(`does NOT report at exactly ${threshold} layers`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "架构压力测试",
          components: [{ type: "architecture", layers: architectureLayers(threshold) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("architecture_count_overflow")
    })

    it(`reports (severity error) over ${threshold} layers`, () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "架构压力测试",
          components: [{ type: "architecture", layers: architectureLayers(threshold + 1) }],
        },
      ])
      const issues = checkIrQuality(ir)
      expect(codes(issues)).toContain("architecture_count_overflow")
      expect(issues.find((i) => i.code === "architecture_count_overflow")!.severity).toBe("error")
    })

    it("reports for 150 layers (past the geometric ceiling, must split)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "150-layer architecture stress",
          components: [{ type: "architecture", layers: architectureLayers(150) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).toContain("architecture_count_overflow")
    })

    it("reports for 20000 layers (clearly pathological, must reject)", () => {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "extreme architecture",
          components: [{ type: "architecture", layers: architectureLayers(20_000) }],
        },
      ])
      expect(codes(checkIrQuality(ir))).toContain("architecture_count_overflow")
    })
  })

  // ── placeholder pages (W5 task 1): quality gate skips all content rules ──

  it("a placeholder page reports no issues even though it is missing a heading", () => {
    const ir = makeIR([{ type: "content", kind: "points", placeholder: true, components: [] }])
    expect(checkIrQuality(ir)).toEqual([])
  })

  it("a placeholder page skips density/long_heading too, even when it looks overloaded", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        placeholder: true,
        heading: "标".repeat(CAPACITY.headingMaxChars + 1),
        components: paragraphs(20),
      },
    ])
    expect(checkIrQuality(ir)).toEqual([])
  })

  it("does not let placeholder:true on one slide suppress a real issue on another slide", () => {
    const ir = makeIR([
      { type: "content", kind: "points", placeholder: true, components: [] },
      { type: "content", kind: "points", components: [{ type: "paragraph", text: "hi" }] }, // no heading — real issue
    ])
    const issues = checkIrQuality(ir)
    expect(issues).toHaveLength(1)
    expect(issues[0].slide).toBe(1)
    expect(issues[0].code).toBe("missing_heading")
  })

  // ── missing_heading ──

  it("warns when content slide has no heading", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        components: [{ type: "paragraph", text: "hi" }],
      },
    ])
    expect(codes(checkIrQuality(ir))).toContain("missing_heading")
  })

  it("warns when cover slide has no heading", () => {
    const ir = makeIR([
      {
        type: "cover",
        components: [],
      },
    ])
    expect(codes(checkIrQuality(ir))).toContain("missing_heading")
  })

  it("warns when chapter slide has no heading", () => {
    const ir = makeIR([
      {
        type: "chapter",
        components: [],
      },
    ])
    expect(codes(checkIrQuality(ir))).toContain("missing_heading")
  })

  it("does NOT warn missing_heading for ending slide", () => {
    const ir = makeIR([
      {
        type: "ending",
        components: [],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("missing_heading")
  })

  it("does NOT warn missing_heading for background-image-only pages", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        components: [{ type: "image", asset_id: "hero", fit: "cover" }],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("missing_heading")
  })

  // ── long_heading ──

  it(`warns when heading exceeds ${CAPACITY.headingMaxChars} characters`, () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading:
          "这是一个超过四十个字符的标题用来测试标题过长告警功能是否正常工作的完整长句子啊你好世界。这句真的很长",
        components: [],
      },
    ])
    const issues = checkIrQuality(ir)
    expect(codes(issues)).toContain("long_heading")
    expect(issues.find((i) => i.code === "long_heading")!.message).toContain(
      "断言式短句"
    )
  })

  it(`does NOT warn for heading at exactly ${CAPACITY.headingMaxChars} characters`, () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "a".repeat(CAPACITY.headingMaxChars),
        components: [],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("long_heading")
  })

  // ── chart_axes_ignored (chart-axes feature) ──
  // `component.axes` only renders for bar/line (chart.tsx's own
  // AXES_APPLICABLE_TYPES) — pie/funnel/dumbbell silently dropped it before
  // this warn-severity finding existed (dual-threshold severity, Task 2's
  // machinery: warn reports without blocking `ok`).

  it("warns when a pie chart sets axes (x_title/y_title/show_grid all ignored for this chart_type)", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Share",
        components: [
          {
            type: "chart",
            chart_type: "pie",
            axes: { x_title: "Segment", y_title: "Share" },
            series: [{ name: "S1", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
          },
        ],
      },
    ])
    expect(codes(checkIrQuality(ir))).toContain("chart_axes_ignored")
  })

  it("warns when a funnel or dumbbell chart sets axes", () => {
    for (const chart_type of ["funnel", "dumbbell"] as const) {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "Pipeline",
          components: [
            {
              type: "chart",
              chart_type,
              axes: { show_grid: true },
              series:
                chart_type === "dumbbell"
                  ? [
                      { name: "From", data: [{ x: "A", y: 10 }] },
                      { name: "To", data: [{ x: "A", y: 20 }] },
                    ]
                  : [{ name: "S1", data: [{ x: "A", y: 10 }] }],
            },
          ],
        },
      ])
      expect(codes(checkIrQuality(ir))).toContain("chart_axes_ignored")
    }
  })

  it("does NOT warn for bar or line charts with axes (the applicable types)", () => {
    for (const chart_type of ["bar", "line"] as const) {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "Trend",
          components: [
            {
              type: "chart",
              chart_type,
              axes: { x_title: "X", y_title: "Y" },
              series: [{ name: "S1", data: [{ x: "A", y: 10 }] }],
            },
          ],
        },
      ])
      expect(codes(checkIrQuality(ir))).not.toContain("chart_axes_ignored")
    }
  })

  it("does NOT warn for a pie chart with no axes field at all", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Share",
        components: [
          {
            type: "chart",
            chart_type: "pie",
            series: [{ name: "S1", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
          },
        ],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("chart_axes_ignored")
  })

  it("does NOT warn for a pie chart with axes present but every sub-field undefined (axes: {})", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Share",
        components: [
          {
            type: "chart",
            chart_type: "pie",
            axes: {},
            series: [{ name: "S1", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }],
          },
        ],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("chart_axes_ignored")
  })

  // ── F3 (review round): renderer-vs-validator agreement tripwire ──
  // chart.tsx's AXES_APPLICABLE_TYPES and this file's own
  // AXES_APPLICABLE_CHART_TYPES are two local Set literals, deliberately not
  // shared (both files document why — a pure quality-check module vs. a
  // React SVG renderer, same precedent as gantt.tsx's `vx`). A local
  // duplicate can silently drift, and a drift here would make this warning
  // lie about what actually renders: either a chart_type would render a
  // y_title with no visibility into "this type isn't fully supported", or a
  // chart_type would warn "ignored" while quietly rendering one anyway.
  // (probe is y_title — both axis titles now paint on applicable types —
  // so the probe string is y_title.)
  // Pins agreement behaviorally (chart.render's real output vs.
  // checkIrQuality's real finding) rather than reaching into either file's
  // private constants, so it also catches a bug in either applicability
  // check itself, not just a text-literal mismatch between the two lists.
  describe("chart_axes_ignored renderer-vs-validator agreement (F3 divergence tripwire)", () => {
    const ctx: ComponentCtx = {
      colors: {
        bg: "#FFFFFF",
        surface: "#F4F4F4",
        primary: "#006A4E",
        accent: "#00A878",
        text: "#1A2421",
        muted: "#5D6B65",
        chartPalette: ["#006A4E", "#00A878"],
      },
      fonts: { heading: "Georgia", body: "Microsoft YaHei", mono: "Consolas" },
      bodyFontPx: 24,
    }
    const box = { x: 0, y: 0, w: 1120 }
    const ALL_CHART_TYPES = ["bar", "line", "pie", "funnel", "dumbbell"] as const

    it.each(ALL_CHART_TYPES)("chart_type=%s: chart.tsx renders y_title iff ir-quality.ts does NOT warn chart_axes_ignored", (chart_type) => {
      const series =
        chart_type === "dumbbell"
          ? [
              { name: "From", data: [{ x: "A", y: 10 }] },
              { name: "To", data: [{ x: "A", y: 20 }] },
            ]
          : [{ name: "S1", data: [{ x: "A", y: 40 }, { x: "B", y: 60 }] }]
      // Probe is y_title (both titles paint on applicable types).
      const component = { type: "chart" as const, chart_type, axes: { y_title: "Probe" }, series }

      const markup = renderSvgMarkup(
        <svg xmlns="http://www.w3.org/2000/svg">{chart.render(component, box, ctx)}</svg>,
      )
      const renders = markup.includes("Probe")

      const ir = makeIR([{ type: "content", kind: "points", heading: "h", components: [component] }])
      const warns = codes(checkIrQuality(ir)).includes("chart_axes_ignored")

      expect(renders).toBe(!warns)
    })
  })

  // ── chart_duplicate_category (R1 evidence wave, Task T2) ──
  // chart-model.ts's buildChartModel flags an x value repeated within one
  // series (kept: first occurrence, dropped: the rest) — a data-authoring
  // concern independent of chart_type, so this runs for every chart_type,
  // not just bar/line (unlike chart_axes_ignored above, which is scoped to
  // the types that actually ignore the field).

  it("warns when a series has a duplicate category value within itself", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Revenue",
        components: [
          {
            type: "chart",
            chart_type: "bar",
            series: [{ name: "Q1", data: [{ x: "East", y: 10 }, { x: "East", y: 20 }, { x: "West", y: 15 }] }],
          },
        ],
      },
    ])
    expect(codes(checkIrQuality(ir))).toContain("chart_duplicate_category")
  })

  it("does NOT warn when every series has distinct category values", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Revenue",
        components: [
          {
            type: "chart",
            chart_type: "bar",
            series: [{ name: "Q1", data: [{ x: "East", y: 10 }, { x: "West", y: 15 }] }],
          },
        ],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("chart_duplicate_category")
  })

  it("does NOT warn when the same category appears across different series (cross-series sharing is normal, not a duplicate)", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Revenue",
        components: [
          {
            type: "chart",
            chart_type: "line",
            series: [
              { name: "2025", data: [{ x: "Q1", y: 10 }, { x: "Q2", y: 20 }] },
              { name: "2026", data: [{ x: "Q1", y: 15 }, { x: "Q2", y: 25 }] },
            ],
          },
        ],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("chart_duplicate_category")
  })

  it("reports one issue per repeated key, not one per repeat occurrence (a key repeated 3x in one series is one issue)", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Revenue",
        components: [
          {
            type: "chart",
            chart_type: "bar",
            series: [{ name: "Q1", data: [{ x: "East", y: 1 }, { x: "East", y: 2 }, { x: "East", y: 3 }] }],
          },
        ],
      },
    ])
    const issues = checkIrQuality(ir).filter((i) => i.code === "chart_duplicate_category")
    expect(issues).toHaveLength(1)
  })

  it("fires for every chart_type, including pie/funnel/dumbbell — the data-quality concern is chart_type-agnostic (unlike chart_axes_ignored)", () => {
    for (const chart_type of ["pie", "funnel", "dumbbell"] as const) {
      const series =
        chart_type === "dumbbell"
          ? [
              { name: "From", data: [{ x: "A", y: 10 }, { x: "A", y: 20 }] },
              { name: "To", data: [{ x: "A", y: 30 }] },
            ]
          : [{ name: "S1", data: [{ x: "A", y: 10 }, { x: "A", y: 20 }, { x: "B", y: 15 }] }]
      const ir = makeIR([
        { type: "content", kind: "points", heading: "h", components: [{ type: "chart", chart_type, series }] },
      ])
      expect(codes(checkIrQuality(ir))).toContain("chart_duplicate_category")
    }
  })

  it("carries the series name and the duplicated x value, and is warn-severity (never blocks)", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Revenue",
        components: [
          {
            type: "chart",
            chart_type: "bar",
            series: [{ name: "Q1 Actuals", data: [{ x: "East", y: 10 }, { x: "East", y: 20 }] }],
          },
        ],
      },
    ])
    const issue = checkIrQuality(ir).find((i) => i.code === "chart_duplicate_category")
    expect(issue?.severity).toBe("warn")
    // The chart type travels with the issue, because what a repeat costs
    // depends on it: bar folds the category and keeps the first value,
    // everything else draws both entries.
    expect(issue?.chartDuplicateCategory).toEqual({
      seriesName: "Q1 Actuals",
      x: "East",
      chartType: "bar",
    })
    // A folding type really does lose the later value, so it keeps the
    // first-wins wording.
    expect(issue?.message).toContain("仅保留首次出现的取值")
  })

  it("tells a non-folding chart that both entries are drawn, not that one is dropped", () => {
    // A pie reads its points in order and never folds them: two slices
    // called East draw as two slices and both values print. The advisory
    // used to tell every author that the later value was dropped, which
    // named a loss the page had not taken.
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Share",
        components: [
          {
            type: "chart",
            chart_type: "pie",
            series: [{ name: "Q1 Actuals", data: [{ x: "East", y: 10 }, { x: "East", y: 20 }] }],
          },
        ],
      },
    ])
    const issue = checkIrQuality(ir).find((i) => i.code === "chart_duplicate_category")
    expect(issue?.severity).toBe("warn")
    expect(issue?.chartDuplicateCategory?.chartType).toBe("pie")
    expect(issue?.message).toContain("两条都会画出来")
    expect(issue?.message).not.toContain("仅保留首次出现的取值")
    expect(issue?.message).not.toContain("其余将被忽略")
  })

  // ── chart_line_too_many_series ──
  // Dataviz's 8-series ceiling (CAPACITY.chart.lineSeriesAdvisoryMax). A
  // line chart past that is still legal IR and still renders — the legend
  // drops the overflow rather than the renderer refusing. This is
  // the editorial warning that the authoring problem exists, warn-only.

  function nSeries(n: number) {
    return Array.from({ length: n }, (_, i) => ({
      name: `S${i}`,
      data: [
        { x: "A", y: i + 1 },
        { x: "B", y: i + 2 },
      ],
    }))
  }

  it("warns when a line chart has more than 8 series", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Trend",
        components: [{ type: "chart", chart_type: "line", series: nSeries(9) }],
      },
    ])
    const issue = checkIrQuality(ir).find((i) => i.code === "chart_line_too_many_series")
    expect(issue).toBeTruthy()
    expect(issue?.severity).toBe("warn")
    expect(issue?.message).toMatch(/8/)
    expect(issue?.message).toMatch(/拆分|归并/)
  })

  it("does NOT warn at 8 line series (the last count inside the ceiling)", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Trend",
        components: [{ type: "chart", chart_type: "line", series: nSeries(8) }],
      },
    ])
    expect(codes(checkIrQuality(ir))).not.toContain("chart_line_too_many_series")
  })

  it("warns for an area chart too, which now names its series in the same one column", () => {
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Trend",
        components: [{ type: "chart", chart_type: "area", series: nSeries(9) }],
      },
    ])
    expect(codes(checkIrQuality(ir))).toContain("chart_line_too_many_series")
  })

  it("does NOT warn for a bar or scatter chart with the same many series", () => {
    for (const chart_type of ["bar", "scatter"] as const) {
      const ir = makeIR([
        {
          type: "content",
          kind: "points",
          heading: "Trend",
          components: [{ type: "chart", chart_type, series: nSeries(9) }],
        },
      ])
      expect(codes(checkIrQuality(ir)), chart_type).not.toContain("chart_line_too_many_series")
    }
  })

  // ── data_table_missing_cell (R1 evidence wave, Task T3) ──
  // data-table.ts's schema tolerates a row whose `cells` omits one of
  // `columns`' declared keys (renders empty, never a parse error) — this is
  // the pre-render advisory for that lenient half of the contract. The
  // *strict* half (an extra key not declared in any column) is a schema-level
  // hard error instead (`ir/index.test.ts`'s data_table describe block), not
  // a quality warning — this file only covers the lenient/warn half.

  const dataTableIR = (rows: Array<{ cells: Record<string, string | number>; emphasis?: "highlight" | "total" }>) =>
    makeIR([
      {
        type: "content",
        kind: "points",
        heading: "Metrics",
        components: [
          {
            type: "data_table",
            columns: [
              { key: "metric", label: "Metric" },
              { key: "q1", label: "Q1" },
            ],
            rows,
          },
        ],
      },
    ])

  it("warns when a row's cells omit a declared column's key", () => {
    const ir = dataTableIR([{ cells: { metric: "Revenue" } }])
    expect(codes(checkIrQuality(ir))).toContain("data_table_missing_cell")
  })

  it("does NOT warn when every row's cells cover every declared column", () => {
    const ir = dataTableIR([{ cells: { metric: "Revenue", q1: "120" } }])
    expect(codes(checkIrQuality(ir))).not.toContain("data_table_missing_cell")
  })

  it("reports one issue per missing key, not one per row (a row missing 2 of 2 keys produces 2 issues)", () => {
    const ir = dataTableIR([{ cells: {} }])
    const issues = checkIrQuality(ir).filter((i) => i.code === "data_table_missing_cell")
    expect(issues).toHaveLength(2)
  })

  it("carries the row index and the missing column key, and is warn-severity (never blocks)", () => {
    const ir = dataTableIR([
      { cells: { metric: "Revenue", q1: "120" } },
      { cells: { metric: "Costs" } }, // row index 1, missing "q1"
    ])
    const issue = checkIrQuality(ir).find((i) => i.code === "data_table_missing_cell")
    expect(issue?.severity).toBe("warn")
    expect(issue?.dataTableMissingCell).toEqual({ rowIndex: 1, key: "q1" })
  })

  // ── multiple issues on one slide ──

  it("can report multiple issues on a single slide (default narrative: general/balanced)", () => {
    const budget = PACING_BUDGETS.balanced
    const ir = makeIR([
      {
        type: "content",
        kind: "points",
        // no heading + over the density limit + bullets overflow
        components: [
          { type: "bullets", items: Array.from({ length: budget.bullets.maxItems + 1 }, (_, i) => String(i)) },
          ...paragraphs(budget.maxComponentsPerSlide),
        ],
      },
    ])
    const c = codes(checkIrQuality(ir))
    expect(c).toContain("density")
    expect(c).toContain("bullets_overflow")
    expect(c).toContain("missing_heading")
  })

  // ── slide index correctness ──

  it("reports correct slide index (0-based)", () => {
    const ir = makeIR([
      { type: "cover", heading: "OK", components: [] },
      {
        type: "content",
        kind: "points",
        // no heading
        components: [{ type: "paragraph", text: "x" }],
      },
    ])
    const issues = checkIrQuality(ir)
    expect(issues).toHaveLength(1)
    expect(issues[0].slide).toBe(1)
  })
})
