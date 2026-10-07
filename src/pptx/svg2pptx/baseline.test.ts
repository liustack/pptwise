import { describe, expect, it } from "vitest"
import { SAFE_FONTS } from "../../render/fonts"
import { BASELINE_FACES, firstBaselineEm } from "./baseline"

describe("firstBaselineEm", () => {
  it("covers every face the export can name", () => {
    // `resolveFontFace` only ever returns a SAFE_FONTS member, so a face
    // added there without metrics here would silently take the fallback.
    expect([...SAFE_FONTS].filter((face) => !BASELINE_FACES.has(face))).toEqual([])
  })

  it("is 1.2 × winAscent / (winAscent + winDescent), the PowerPoint calibration", () => {
    expect(firstBaselineEm("Georgia")).toBeCloseTo((1.2 * 1878) / (1878 + 449), 10)
    expect(firstBaselineEm("Microsoft YaHei")).toBeCloseTo((1.2 * 2167) / (2167 + 536), 10)
    expect(firstBaselineEm("SimSun")).toBeCloseTo((1.2 * 220) / 256, 10)
    expect(firstBaselineEm("Courier New")).toBeCloseTo((1.2 * 1705) / (1705 + 615), 10)
  })

  it("reads Consolas by its win metrics, the one face where hhea disagrees", () => {
    // hhea would give 1.2 × 0.7427 = 0.891 em. PowerPoint measured 0.945.
    expect(firstBaselineEm("Consolas")).toBeCloseTo(0.9428, 4)
  })

  it("matches faces the way resolveFontFace writes them, aliases included", () => {
    expect(firstBaselineEm("'Microsoft YaHei'")).toBe(firstBaselineEm("microsoft yahei"))
    expect(firstBaselineEm("微软雅黑")).toBe(firstBaselineEm("Microsoft YaHei"))
    expect(firstBaselineEm("楷体")).toBe(firstBaselineEm("KaiTi"))
  })

  it("sets YaHei's Western cut where PowerPoint set it, on YaHei's baseline, not its own win metrics'", () => {
    expect(firstBaselineEm("Microsoft YaHei UI")).toBe(firstBaselineEm("Microsoft YaHei"))
  })

  it("takes Calibri for a missing or unknown face, which is what PowerPoint draws", () => {
    expect(firstBaselineEm(undefined)).toBe(firstBaselineEm("Calibri"))
    expect(firstBaselineEm("NoSuchFace")).toBe(firstBaselineEm("Calibri"))
  })
})
