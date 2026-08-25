import { describe, expect, it } from "vitest"
import { layoutPage, themeDeck } from "./decks"
import { LEXICONS } from "./lexicon"

const emptyAssets = { images: {} }

describe("themeDeck corpus thicken (gallery r2 D10/D11/D12/D21)", () => {
  const zh = LEXICONS.zh

  it("stage p03 is two-column with a timeline lead and a companion paragraph", () => {
    const deck = themeDeck("stage", zh, emptyAssets)
    const page = deck.slides[2]!
    expect(page.layout).toBe("two-column")
    expect(page.components.map((c) => c.type)).toEqual(["timeline", "paragraph"])
  })

  it("swiss p03 is a two-column pie plus bullets", () => {
    const deck = themeDeck("swiss", zh, emptyAssets)
    const page = deck.slides[2]!
    expect(page.layout).toBe("two-column")
    expect(page.components[0]?.type).toBe("chart")
    expect(page.components[1]?.type).toBe("bullets")
  })

  it("arena p05 / pulse p06 / runway p08 / heritage p06 carry a companion paragraph", () => {
    const arena = themeDeck("arena", zh, emptyAssets).slides[4]!
    expect(arena.components.map((c) => c.type)).toEqual(["tag_row", "paragraph"])

    const pulse = themeDeck("pulse", zh, emptyAssets).slides[5]!
    expect(pulse.components.map((c) => c.type)).toEqual(["verdict_banner", "paragraph"])

    const runway = themeDeck("runway", zh, emptyAssets).slides[7]!
    expect(runway.components.map((c) => c.type)).toEqual(["callout", "paragraph"])

    const heritage = themeDeck("heritage", zh, emptyAssets).slides[5]!
    expect(heritage.components.map((c) => c.type)).toEqual(["tag_row", "paragraph"])
  })
})

describe("runway show layout corpus", () => {
  const zh = LEXICONS.zh

  it("authors the 132px show headline as one short cover claim", () => {
    expect(themeDeck("runway", zh, emptyAssets).slides[0]?.heading).toBe(zh.kickers[0])
    expect(layoutPage("show-headline", zh, emptyAssets).slides[0]?.heading).toBe(zh.kickers[0])
  })

  it("authors every gated show face with the component shape that reaches its exact composition", () => {
    const gallery = layoutPage("show-gallery", zh, emptyAssets).slides[0]!
    expect(gallery.components).toHaveLength(1)
    expect(gallery.components[0]?.type).toBe("image_grid")
    if (gallery.components[0]?.type === "image_grid") expect(gallery.components[0].items).toHaveLength(6)

    const spotlight = layoutPage("show-spotlight", zh, emptyAssets).slides[0]!
    expect(spotlight.components.map((component) => component.type)).toEqual(["image", "insight_panel"])

    const statement = layoutPage("show-statement", zh, emptyAssets).slides[0]!
    expect(statement.components[0]?.type).toBe("numbered_cards")
    if (statement.components[0]?.type === "numbered_cards") expect(statement.components[0].items).toHaveLength(3)

    const figures = layoutPage("show-figures", zh, emptyAssets).slides[0]!
    expect(figures.components[0]?.type).toBe("kpi_cards")
    if (figures.components[0]?.type === "kpi_cards") expect(figures.components[0].items).toHaveLength(3)
  })
})
