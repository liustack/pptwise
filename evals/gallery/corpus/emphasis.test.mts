import { describe, expect, it } from "vitest"
import { themeDeck } from "./decks"
import { LEXICONS } from "./lexicon"

const emptyAssets = { images: {} }

describe("themeDeck emphasis form coverage", () => {
  const zh = LEXICONS.zh

  it("authors marked cover, content heading, and bullets only for brief", () => {
    const brief = themeDeck("brief", zh, emptyAssets)
    expect(brief.slides[0]?.heading).toContain("**业务评审**")
    expect(brief.slides[2]?.heading).toContain("**新签**")
    const bullets = brief.slides[3]?.components[0]
    expect(bullets?.type).toBe("bullets")
    if (bullets?.type !== "bullets") throw new Error("brief gallery p04 must lead with bullets")
    expect(bullets.items[0]).toContain("**九成一**")

    const thesis = themeDeck("thesis", zh, emptyAssets)
    expect(JSON.stringify(thesis.slides)).not.toContain("**")
  })

  it.each(["zh", "en", "mixed"] as const)("authors valid marked copy for the %s corpus", (language) => {
    const brief = themeDeck("brief", LEXICONS[language], emptyAssets)
    expect(brief.slides[0]?.heading).toMatch(/\*\*.+\*\*/)
    expect(brief.slides[2]?.heading).toMatch(/\*\*.+\*\*/)
    const bullets = brief.slides[3]?.components[0]
    expect(bullets?.type).toBe("bullets")
    if (bullets?.type !== "bullets") throw new Error("brief gallery p04 must lead with bullets")
    expect(bullets.items[0]).toMatch(/\*\*.+\*\*/)
  })
})
