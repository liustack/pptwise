import { describe, expect, it } from "vitest"
import { BASELINE_OVERSHOOT_EM, FULL_DESCENT_EM, inkDescentEm } from "./ink-descent"

describe("inkDescentEm", () => {
  it("stops at the baseline's overshoot for a run with no descender", () => {
    for (const text of ["MC", "SW", "Platform Team", "2026", "HELLO WORLD!"]) {
      expect(inkDescentEm(text), text).toBe(BASELINE_OVERSHOOT_EM)
    }
  })

  it("hangs a quarter em for any character some exported face draws below the baseline", () => {
    // Lowercase descenders, Q's tail, Cambria's and SimSun's J, Georgia's
    // old-style figures, punctuation that hangs, and Courier New's #.
    for (const char of ["g", "j", "p", "q", "y", "Q", "J", "3", "4", "5", "7", "9", ",", ";", "(", "/", "$", "@", "_", "|", "#"]) {
      expect(inkDescentEm(`AB${char}`), char).toBe(FULL_DESCENT_EM)
    }
  })

  it("keeps the quarter em for characters the glyph table never measured", () => {
    for (const text of ["陈", "Zoë", "Ünal"]) {
      expect(inkDescentEm(text), text).toBe(FULL_DESCENT_EM)
    }
  })

  it("ignores whitespace, which has no ink", () => {
    expect(inkDescentEm("M  C ")).toBe(BASELINE_OVERSHOOT_EM)
  })
})
