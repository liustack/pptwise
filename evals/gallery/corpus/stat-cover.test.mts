import { describe, expect, it } from "vitest"
import { getThemeDefinition } from "@/themes/definitions"
import { layoutPage, themeDeck } from "./decks"
import { LEXICONS } from "./lexicon"

const emptyAssets = { images: {} }

describe("bulletin icon_cards slot", () => {
  it("orders list from the menu and keeps three cards so body text stays on the readable floor", () => {
    const page = themeDeck("bulletin", LEXICONS.zh, emptyAssets).slides[4]!
    expect(page.type).toBe("content")
    if (page.type !== "content") throw new Error("expected content page")
    expect(page.kind).toBe("list")
    expect(getThemeDefinition("bulletin").menu.content[page.kind]?.face).toBe("bento-panel")
    expect(page.components[0]?.type).toBe("icon_cards")
    if (page.components[0]?.type !== "icon_cards") throw new Error("expected icon_cards")
    expect(page.components[0].items).toHaveLength(3)
  })
})

describe("stat-cover corpus heading", () => {
  it("authors a KPI, not the deck title, on the ledger theme cover and the layout table", () => {
    for (const lex of [LEXICONS.zh, LEXICONS.en, LEXICONS.mixed]) {
      const kpi = `${lex.metrics[1]!.value}${lex.metrics[1]!.unit ?? ""}`
      expect(themeDeck("ledger", lex, emptyAssets).slides[0]!.heading).toBe(kpi)
      expect(layoutPage("stat-cover", lex, emptyAssets).slides[0]!.heading).toBe(kpi)
      expect(layoutPage("left-anchor", lex, emptyAssets).slides[0]!.heading).toBe(lex.deckTitle)
    }
  })
})
