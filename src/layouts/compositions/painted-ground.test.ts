import { describe, expect, it } from "vitest"
import { auditDeck } from "../../audit/deck-audit"
import type { PptxIR } from "@/ir"

/*
 * A theme's setting grades its own lines (a source, a kicker, a caption)
 * against the ground it stands on. Twelve settings read that ground off the
 * theme's `colors.bg`, so on a page the author painted another colour the
 * lines were measured against a page nobody saw: luxe's source line on a
 * page painted #1F2A44 came out at 2.52:1. They read the page's own ground.
 */
const THEMES = ["luxe", "thesis", "lecture", "stage", "crayon", "museum", "ink", "journal", "rally", "ember", "runway", "proposal"]

function deck(theme: string, ground: string): PptxIR {
  return {
    version: "5",
    filename: "painted",
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides: [
      { type: "cover", heading: "封面", components: [] },
      {
        type: "content",
        kind: "points",
        heading: "背景换了色",
        background: { kind: "color", value: ground },
        components: [
          { type: "paragraph", text: "这是一段正文，作者改了页面背景色。" },
          { type: "bullets", items: ["第一条要点", "第二条要点"] },
        ],
        footnote: "来源：测试",
      },
    ],
  } as unknown as PptxIR
}

describe("a setting's own lines on a page the author painted", () => {
  it.each(THEMES)("%s reads every line against the painted ground", (theme) => {
    for (const ground of ["#1F2A44", "#F7F3EA"]) {
      const low = auditDeck(deck(theme, ground)).findings.filter((f) => f.code === "low-contrast")
      expect(low.map((f) => `${ground} ${f.message}`)).toEqual([])
    }
  })
})
