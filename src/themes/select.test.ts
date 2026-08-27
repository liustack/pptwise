import { describe, expect, it } from "vitest"
import { suggestThemes } from "./select"

describe("suggestThemes", () => {
  it("ranks occasion hits by intersection size", () => {
    expect(suggestThemes({ occasions: ["finance"] })).toEqual(["insight"])
    expect(suggestThemes({ occasions: ["fashion"] })).toEqual(["runway"])
    expect(suggestThemes({ occasions: ["kids"] })).toEqual(["crayon"])
    const educationAndKids = suggestThemes({ occasions: ["education", "kids"] })
    expect(educationAndKids[0]).toBe("crayon")
    expect(educationAndKids).toContain("academic")
    expect(educationAndKids).toContain("classroom")
    expect(educationAndKids).toContain("lecture")
  })

  it("breaks occasion ties with identity, then narrative recs, then catalog order", () => {
    expect(suggestThemes({ occasions: ["business"], identity: "low" })).toEqual([
      "enterprise",
      "memo",
      "consulting",
    ])
    expect(suggestThemes({ occasions: ["education"], identity: "high" })).toEqual([
      "crayon",
      "lecture",
      "academic",
      "classroom",
    ])
    expect(suggestThemes({ occasions: ["education"], strategy: "instructional" })).toEqual([
      "classroom",
      "academic",
      "crayon",
      "lecture",
    ])
  })

  it("falls back to narrative preset recommendations when there is no occasion signal", () => {
    expect(suggestThemes({ strategy: "instructional" })).toEqual(["classroom", "academic", "tech"])
    expect(suggestThemes({ strategy: "pitch" })).toEqual(["consulting", "tech", "campaign"])
    expect(suggestThemes({ strategy: "product-launch" })).toEqual(["campaign", "runway", "tech"])
    expect(suggestThemes({ strategy: "pyramid" })).toEqual([
      "consulting",
      "enterprise",
      "insight",
      "tech",
      "campaign",
    ])
    expect(suggestThemes({ strategy: "briefing" })).toEqual(["consulting", "enterprise"])
  })

  it("falls back to consulting when every signal is absent or empty", () => {
    expect(suggestThemes({})).toEqual(["consulting"])
    expect(suggestThemes({ occasions: [] })).toEqual(["consulting"])
    expect(suggestThemes({ occasions: ["not-a-vocab-word"] })).toEqual(["consulting"])
    expect(suggestThemes({ strategy: "not-a-strategy" })).toEqual(["consulting"])
  })

  it("is deterministic: same input yields the same array", () => {
    const signals = { occasions: ["event", "marketing"], identity: "high" as const, strategy: "showcase" }
    expect(suggestThemes(signals)).toEqual(suggestThemes({ ...signals }))
    expect(suggestThemes(signals)).toEqual(suggestThemes(signals))
  })

  it("returns identity-band builtins in catalog order when identity is the only live signal", () => {
    expect(suggestThemes({ identity: "low" })).toEqual(["enterprise", "vermilion", "swiss", "memo"])
  })
})
