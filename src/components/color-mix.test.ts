import { describe, expect, it } from "vitest"
import { mixHex } from "./color-mix"

describe("mixHex", () => {
  it("mixes shorthand and alpha hex forms through their opaque RGB channels", () => {
    expect(mixHex("#000", "#FFF", 0.5)).toBe("#808080")
    expect(mixHex("#000F", "#FFFFFFFF", 0.5)).toBe("#808080")
    expect(mixHex("#00000080", "#FFFFFF00", 0.5)).toBe("#808080")
  })

  it("rejects five-digit and seven-digit hex colors", () => {
    expect(() => mixHex("#12345", "#FFFFFF", 0.5)).toThrow(/invalid hex color "#12345"/)
    expect(() => mixHex("#FFFFFF", "#1234567", 0.5)).toThrow(/invalid hex color "#1234567"/)
  })
})
