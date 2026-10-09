// @vitest-environment node
//
// The two inks the full component probe still found low on a mid-tone page
// ground. The iceberg's waterline name stands on the page, above the line,
// and was measured against the water under the line: white on #777777 read
// at 4.48:1. A row card's description is its text ink at 85% over the card,
// and on a card a step off a mid-tone page the dimmed ink fell to 4.06:1.
// Both now take the ground they stand on and the source rules every other
// ink takes (`accessibleInk`, `accessibleOpacity`).
import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import { auditDeck } from "@/audit/deck-audit"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { contrastRatio } from "@/render/ink"
import { parseSvgRoot } from "@/render/serialize"
import { CANONICAL_THEME_IDS } from "@/themes"
import { getThemeDefinition } from "@/themes/definitions"
import { COMPONENT_BUILDERS } from "../../evals/gallery/corpus/components"
import { componentPage, corpusAssets, type CorpusAssets } from "../../evals/gallery/corpus/decks"
import { LEXICONS } from "../../evals/gallery/corpus/lexicon"

let assets: CorpusAssets
beforeAll(async () => {
  installNodePlatform()
  assets = await corpusAssets(LEXICONS.zh)
})

/** The component's gallery page on `theme`, its content pages painted `ground` when one is given. */
function page(component: string, theme: string, ground?: string): PptxIR {
  const ir = componentPage(component, COMPONENT_BUILDERS[component]!, LEXICONS.zh, assets, theme)
  if (ground !== undefined) for (const slide of ir.slides) if (slide.type === "content") slide.background = { kind: "color", value: ground }
  const result = validateIr(ir)
  expect(result.errors).toEqual([])
  return result.ir!
}

describe("waterline names and row descriptions read on a mid-tone page", () => {
  for (const ground of ["#777777", "#6B7B8C"]) {
    it.each(["iceberg", "row_cards"])(`%s on ${ground}, every theme`, (component) => {
      const low = CANONICAL_THEME_IDS.flatMap((theme) =>
        auditDeck(page(component, theme, ground))
          .findings.filter((f) => f.code === "low-contrast")
          .map((f) => `${theme}: ${JSON.stringify(f.detail)}`),
      )
      expect(low).toEqual([])
    })
  }

  it("keeps a theme's primary on a waterline name its own page reads it on", () => {
    for (const theme of ["ember", "homeroom"]) {
      const colors = getThemeDefinition(theme).style.colors
      expect(contrastRatio(colors.primary, colors.bg)).toBeGreaterThanOrEqual(4.5)
      const root = parseSvgRoot(renderSlideSvg(page("iceberg", theme), 0))
      const name = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("x") === "4")
      expect(name?.getAttribute("fill"), theme).toBe(colors.primary)
    }
  })

  it("keeps the descriptions dimmed where the card lets them read so", () => {
    for (const theme of CANONICAL_THEME_IDS) {
      const markup = renderSlideSvg(page("row_cards", theme), 0)
      expect(markup, theme).toContain('fill-opacity="0.85"')
    }
  })
})
