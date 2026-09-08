import { describe, expect, it } from "vitest"
import { validateIr } from "./validate-core"

const MESSAGE = "overflow-vocabulary: write the value itself as data, not a count of what was left out"

const SCORE_ROWS = [
  { label: "Renewal", target: "88%", actual: "91%", gap: "+3.0", status: "on_track" },
  { label: "Setup", target: "4.0", actual: "5.2", gap: "+1.2", status: "watch" },
  { label: "Partners", target: "25%", actual: "23%", gap: "-2.0", status: "off_track" },
] as const

function deck(themeId: string, slide: Record<string, unknown>): unknown {
  return {
    version: "5",
    filename: "overflow-vocab",
    theme: { id: themeId },
    slides: [{ type: "cover", heading: "Hello" }, slide],
  }
}

describe("validateIr leftover phrasing", () => {
  it("rejects a bullets item that uses leftover plus-count with more", () => {
    const result = validateIr(
      deck("brief", {
        type: "content",
        id: "points-leftover",
        kind: "points",
        heading: "Findings",
        components: [{ type: "bullets", items: ["Alpha", "+3 more"] }],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "slides.1.components.0.items.1",
          slideId: "points-leftover",
          page: 2,
          message: MESSAGE,
        }),
      ]),
    )
  })

  it("rejects a scorecard gap that uses leftover plus-count with 项", () => {
    const result = validateIr(
      deck("brief", {
        type: "content",
        id: "data-leftover",
        kind: "data",
        heading: "Goals",
        components: [
          {
            type: "scorecard",
            rows: [
              SCORE_ROWS[0],
              { label: "Window", target: "500 个", actual: "540 个", gap: "+40 项", status: "on_track" },
              SCORE_ROWS[2],
            ],
          },
        ],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "slides.1.components.0.rows.1.gap",
          slideId: "data-leftover",
          page: 2,
          message: MESSAGE,
        }),
      ]),
    )
  })

  it("rejects a paragraph that uses remainder-count 另有 2 项", () => {
    const result = validateIr(
      deck("brief", {
        type: "content",
        id: "points-remainder",
        kind: "points",
        heading: "Notes",
        components: [{ type: "paragraph", text: "另有 2 项" }],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "slides.1.components.0.text",
          slideId: "points-remainder",
          page: 2,
          message: MESSAGE,
        }),
      ]),
    )
  })

  it("rejects a blockquote whose text uses an ellipsis", () => {
    const result = validateIr(
      deck("ink", {
        type: "content",
        id: "quote-ellipsis",
        kind: "quote",
        heading: "Voice",
        components: [{ type: "blockquote", text: "The work is never done..." }],
      }),
    )
    expect(result.ok).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "slides.1.components.0.text",
          slideId: "quote-ellipsis",
          page: 2,
          message: MESSAGE,
        }),
      ]),
    )
  })

  it("does not reject scorecard, kpi, or bullet strings that write the value itself", () => {
    const result = validateIr({
      version: "5",
      filename: "overflow-vocab-ok",
      theme: { id: "brief" },
      slides: [
        { type: "cover", heading: "Hello" },
        {
          type: "content",
          id: "score-ok",
          kind: "data",
          heading: "Goals",
          components: [
            {
              type: "scorecard",
              rows: [
                { label: "Share", target: "40 pp", actual: "44 pp", gap: "+4 pp", status: "on_track" },
                { label: "Churn", target: "8 pp", actual: "20 pp", gap: "-12 pp", status: "off_track" },
                { label: "Window", target: "500 项", actual: "540 项", gap: "+40 个", status: "on_track" },
              ],
            },
          ],
        },
        {
          type: "content",
          id: "kpi-ok",
          kind: "data",
          heading: "Mass",
          components: [{ type: "kpi_cards", items: [{ value: "5.4 克", label: "Sample" }] }],
        },
        {
          type: "content",
          id: "points-ok",
          kind: "points",
          heading: "Notes",
          components: [{ type: "bullets", items: ["+4 pp", "-12 pp", "540 项", "5.4 克"] }],
        },
      ],
    })
    expect(result.ok).toBe(true)
  })

  it("accepts a structurally valid deck with no leftover phrasing", () => {
    const result = validateIr(
      deck("brief", {
        type: "content",
        id: "points-clean",
        kind: "points",
        heading: "Findings",
        components: [{ type: "bullets", items: ["Alpha", "Beta"] }],
      }),
    )
    expect(result.ok).toBe(true)
  })
})
