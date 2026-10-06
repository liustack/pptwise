import { describe, expect, it } from "vitest"
import { groupByPrefix, leakPrefix } from "./tmp-leak-check.mts"

describe("tmp leak check", () => {
  it("groups temp entries by the prefix mkdtemp was given", () => {
    expect(leakPrefix("pptwise-vitest-home-AbC123")).toBe("pptwise-vitest-home")
    expect(leakPrefix("pptwise-deck-iralhl")).toBe("pptwise-deck")
    expect(leakPrefix("pptwise-Xy12Zq")).toBe("pptwise")
    expect(leakPrefix("tsx-501")).toBe("tsx-501")
  })

  it("counts each prefix, largest first", () => {
    const names = ["pptwise-serve-aaaaaa", "pptwise-deck-bbbbbb", "pptwise-serve-cccccc", "tsx-501"]
    expect(groupByPrefix(names)).toEqual([
      ["pptwise-serve", 2],
      ["pptwise-deck", 1],
      ["tsx-501", 1],
    ])
  })
})
