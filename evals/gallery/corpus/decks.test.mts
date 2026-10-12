import { describe, expect, it } from "vitest"
import { getThemeDefinition } from "@/themes/definitions"
import { themeDeck } from "./decks"
import { LEXICONS } from "./lexicon"

const emptyAssets = { images: {} }

describe("themeDeck corpus thicken (gallery r2 D10/D11/D12/D21)", () => {
  const zh = LEXICONS.zh

  it("stage p03 orders process from its menu with a timeline lead and a companion paragraph", () => {
    const deck = themeDeck("stage", zh, emptyAssets)
    const page = deck.slides[2]!
    expect(page.type).toBe("content")
    if (page.type !== "content") throw new Error("expected content page")
    expect(page.kind).toBe("process")
    expect(getThemeDefinition("stage").menu.content[page.kind]?.face).toBe("keynote-sheet")
    expect(page.components.map((c) => c.type)).toEqual(["timeline", "paragraph"])
  })

  it("swiss p03 orders data from its menu with a pie plus bullets", () => {
    const deck = themeDeck("swiss", zh, emptyAssets)
    const page = deck.slides[2]!
    expect(page.type).toBe("content")
    if (page.type !== "content") throw new Error("expected content page")
    expect(page.kind).toBe("data")
    expect(getThemeDefinition("swiss").menu.content[page.kind]?.face).toBe("grid-sheet")
    expect(page.components[0]?.type).toBe("chart")
    expect(page.components[1]?.type).toBe("bullets")
  })

  it("clinic p06 / runway p08 carry a companion paragraph", () => {
    const clinic = themeDeck("clinic", zh, emptyAssets).slides[5]!
    expect(clinic.components.map((c) => c.type)).toEqual(["people_cards", "paragraph"])

    const runway = themeDeck("runway", zh, emptyAssets).slides[7]!
    expect(runway.components.map((c) => c.type)).toEqual(["verdict_banner", "paragraph"])
  })
})
