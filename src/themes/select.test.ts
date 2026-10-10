import { describe, expect, it } from "vitest"
import { suggestThemes, themeShortlist, THEME_SHORTLIST_MAX, THEME_SHORTLIST_MIN } from "./select"

describe("suggestThemes", () => {
  it("ranks occasion hits by intersection size", () => {
    expect(suggestThemes({ occasions: ["finance"] })).toEqual(["ledger"])
    expect(suggestThemes({ occasions: ["fashion"] })).toEqual(["runway"])
    expect(suggestThemes({ occasions: ["kids"] })).toEqual(["crayon"])
    expect(suggestThemes({ occasions: ["sales"] })).toEqual(["proposal"])
    const educationAndKids = suggestThemes({ occasions: ["education", "kids"] })
    expect(educationAndKids[0]).toBe("crayon")
    expect(educationAndKids).toContain("thesis")
    expect(educationAndKids).toContain("homeroom")
    expect(educationAndKids).toContain("lecture")
  })

  it("breaks occasion ties with identity, then narrative recs, then catalog order", () => {
    expect(suggestThemes({ occasions: ["business"], identity: "low" })).toEqual([
      "bulletin",
      "memo",
      "brief",
      "proposal",
    ])
    expect(suggestThemes({ occasions: ["education"], identity: "high" })).toEqual([
      "crayon",
      "lecture",
      "thesis",
      "homeroom",
    ])
    expect(suggestThemes({ occasions: ["education"], strategy: "instructional" })).toEqual([
      "homeroom",
      "thesis",
      "crayon",
      "lecture",
    ])
  })

  it("falls back to narrative preset recommendations when there is no occasion signal", () => {
    expect(suggestThemes({ strategy: "instructional" })).toEqual(["homeroom", "thesis", "terminal"])
    expect(suggestThemes({ strategy: "pitch" })).toEqual(["brief", "terminal", "rally"])
    expect(suggestThemes({ strategy: "product-launch" })).toEqual(["rally", "runway", "terminal"])
    expect(suggestThemes({ strategy: "pyramid" })).toEqual([
      "brief",
      "bulletin",
      "ledger",
      "terminal",
      "rally",
    ])
    expect(suggestThemes({ strategy: "briefing" })).toEqual(["brief", "bulletin"])
  })

  it("falls back to brief when every signal is absent or empty", () => {
    expect(suggestThemes({})).toEqual(["brief"])
    expect(suggestThemes({ occasions: [] })).toEqual(["brief"])
    expect(suggestThemes({ occasions: ["not-a-vocab-word"] })).toEqual(["brief"])
    expect(suggestThemes({ strategy: "not-a-strategy" })).toEqual(["brief"])
  })

  it("is deterministic: same input yields the same array", () => {
    const signals = { occasions: ["event", "marketing"], identity: "high" as const, strategy: "showcase" }
    expect(suggestThemes(signals)).toEqual(suggestThemes({ ...signals }))
    expect(suggestThemes(signals)).toEqual(suggestThemes(signals))
  })

  it("returns identity-band builtins in catalog order when identity is the only live signal", () => {
    expect(suggestThemes({ identity: "low" })).toEqual(["bulletin", "vermilion", "swiss", "memo"])
  })
})

describe("themeShortlist", () => {
  it("puts the occasion's own themes first and fills a short list from the spread", () => {
    expect(themeShortlist({ occasions: ["finance"] })).toEqual(["ledger", "brief", "swiss", "journal"])
    expect(themeShortlist({ strategy: "weekly-brief" })).toEqual(["bulletin", "brief", "swiss", "journal"])
  })

  it("draws a spread of voices when the caller gives nothing", () => {
    expect(themeShortlist({})).toEqual(["brief", "swiss", "journal", "terminal"])
  })

  it("cuts a long ranked list at six", () => {
    const list = themeShortlist({ occasions: ["business", "institutional", "education"] })
    expect(list).toHaveLength(THEME_SHORTLIST_MAX)
    expect(list).toEqual(suggestThemes({ occasions: ["business", "institutional", "education"] }).slice(0, 6))
  })

  it("always offers four to six distinct themes", () => {
    for (const signals of [{}, { occasions: ["kids"] }, { strategy: "pitch" }, { occasions: ["tech"], strategy: "product-launch" }]) {
      const list = themeShortlist(signals)
      expect(list.length).toBeGreaterThanOrEqual(THEME_SHORTLIST_MIN)
      expect(list.length).toBeLessThanOrEqual(THEME_SHORTLIST_MAX)
      expect(new Set(list).size).toBe(list.length)
    }
  })
})
