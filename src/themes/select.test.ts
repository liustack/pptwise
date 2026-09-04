import { describe, expect, it } from "vitest"
import { suggestThemes } from "./select"

describe("suggestThemes", () => {
  it("ranks occasion hits by intersection size", () => {
    expect(suggestThemes({ occasions: ["finance"] })).toEqual(["ledger"])
    expect(suggestThemes({ occasions: ["fashion"] })).toEqual(["runway"])
    expect(suggestThemes({ occasions: ["kids"] })).toEqual(["crayon"])
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
