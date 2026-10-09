import { describe, expect, it } from "vitest"
import { layoutPage, themeDeck } from "./decks"
import { LEXICONS } from "./lexicon"

const emptyAssets = { images: {} }

describe("stat-cover corpus heading", () => {
  it("authors a KPI, not the deck title, on the ledger theme cover and the layout table", () => {
    for (const lex of [LEXICONS.zh, LEXICONS.en, LEXICONS.mixed]) {
      const kpi = `${lex.metrics[1]!.value}${lex.metrics[1]!.unit ?? ""}`
      expect(themeDeck("ledger", lex, emptyAssets).slides[0]!.heading).toBe(kpi)
      expect(layoutPage("stat-cover", lex, emptyAssets).slides[0]!.heading).toBe(kpi)
      expect(layoutPage("left-anchor", lex, emptyAssets).slides[0]!.heading).toBe(lex.faceTitles?.["left-anchor"] ?? lex.deckTitle)
    }
  })
})
