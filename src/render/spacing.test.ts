import { describe, expect, it } from "vitest"
import { CARD_INSET_PX, RULE_TYPE_AIR_EM, SIBLING_AIR_PX } from "./spacing"

describe("shared optical air", () => {
  it("keeps a 24px sibling and card inset, and a 1em rule-to-type gap", () => {
    expect(SIBLING_AIR_PX).toBe(24)
    expect(CARD_INSET_PX).toBe(24)
    expect(RULE_TYPE_AIR_EM).toBe(1)
  })
})
