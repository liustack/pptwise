import { describe, expect, it } from "vitest"
import { measureTextUnits } from "../../../lib/svg-text-layout"
import { wrapClip } from "./clip-text"

describe("wrapClip", () => {
  it("wraps at the frozen font size instead of wrapping small then bumping minPt", () => {
    const source = "一二三四五六七八九十".repeat(8)
    const frozen = 16
    const r = wrapClip(source, {
      maxWidth: 80,
      fontSize: frozen,
      minPt: 15,
      maxLines: 3,
    })
    expect(r.fontSize).toBe(frozen)
    expect(r.lines.length).toBeGreaterThan(0)
    expect(r.lines.length).toBeLessThanOrEqual(3)
    for (const line of r.lines) {
      expect(line).not.toContain("…")
      expect(measureTextUnits(line) * r.fontSize).toBeLessThanOrEqual(80 + 1e-6)
    }
  })

  it("stamps truncated when extra lines are dropped, and never paints an overflow mark", () => {
    const source = "一二三四五六七八九十".repeat(6)
    const r = wrapClip(source, {
      maxWidth: 80,
      fontSize: 16,
      minPt: 16,
      maxLines: 2,
    })
    expect(r.truncated).toBe(true)
    expect(r.lines.join("")).not.toContain("…")
    expect(r.lines.join("").length).toBeLessThan(source.length)
    expect(r.lines.length).toBeLessThanOrEqual(2)
  })

  it("stamps truncated when a kept line is clipped to the width budget", () => {
    const source = "一二三四五六七八九十一二三四五六七八九十"
    const r = wrapClip(source, {
      maxWidth: 60,
      fontSize: 16,
      maxLines: 1,
    })
    expect(r.truncated).toBe(true)
    expect(r.lines).toHaveLength(1)
    expect(r.lines[0]).not.toContain("…")
    expect(source.startsWith(r.lines[0]!)).toBe(true)
    expect(r.lines[0]!.length).toBeLessThan(source.length)
  })
})
