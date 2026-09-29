import { describe, expect, it } from "vitest"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"
import { fitHeroLine, HERO_UNIT_MIN_PX, heroUnitMark, rotateRectPolygon, yearQuarter, type HeroLine } from "./shared"

const round1 = (v: number) => Math.round(v * 10) / 10

/** Independent CSS/SVG clockwise bake. Does not import the helper under test. */
function bakeClockwise(cx: number, cy: number, width: number, height: number, cssDeg: number): string {
  const a = (cssDeg * Math.PI) / 180
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const hw = width / 2
  const hh = height / 2
  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  return corners
    .map(([lx, ly]) => `${round1(cx + lx * ca - ly * sa)},${round1(cy + lx * sa + ly * ca)}`)
    .join(" ")
}

function parsePoints(points: string): { x: number; y: number }[] {
  return points
    .trim()
    .split(/\s+/)
    .map((p) => {
      const [x, y] = p.split(",").map(Number)
      return { x: x!, y: y! }
    })
}

describe("rotateRectPolygon", () => {
  it("bakes a clockwise 4° playbill chip (top-right corner drops in y-down)", () => {
    const points = rotateRectPolygon(1100, 152, 180, 64, 4)
    expect(points).toBe(bakeClockwise(1100, 152, 180, 64, 4))
    expect(points).not.toBe(bakeClockwise(1100, 152, 180, 64, -4))

    const pts = parsePoints(points)
    const tr = pts[1]!
    const unrotatedTr = { x: 1100 + 180 / 2, y: 152 - 64 / 2 }
    expect(tr.y).toBeGreaterThan(unrotatedTr.y)
    expect(tr.x).toBeGreaterThan(unrotatedTr.x)
  })

  it("does not negate a 45° luxe diamond: the helper matches the clockwise bake", () => {
    const points = rotateRectPolygon(640, 180, 14, 14, 45)
    expect(points).toBe(bakeClockwise(640, 180, 14, 14, 45))
    expect(points).not.toBe(bakeClockwise(640, 180, 14, 14, -45))

    const pts = parsePoints(points)
    expect(pts).toHaveLength(4)
    const dist = (p: { x: number; y: number }) => Math.hypot(p.x - 640, p.y - 180)
    const d0 = dist(pts[0]!)
    for (const p of pts) expect(dist(p)).toBeCloseTo(d0, 5)
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(Math.max(...ys) - Math.min(...ys), 5)
  })
})

describe("yearQuarter", () => {
  it("parses a four-digit year plus a 1–12 month into year and quarter", () => {
    expect(yearQuarter("2026-01-15")).toEqual({ year: "2026", quarter: "Q1" })
    expect(yearQuarter("2026-05-01")).toEqual({ year: "2026", quarter: "Q2" })
    expect(yearQuarter("2026-11-20")).toEqual({ year: "2026", quarter: "Q4" })
    expect(yearQuarter("2026-12")).toEqual({ year: "2026", quarter: "Q4" })
  })

  it("returns undefined when the date cannot be read as year-month", () => {
    expect(yearQuarter("sometime soon")).toBeUndefined()
    expect(yearQuarter("2026")).toBeUndefined()
    expect(yearQuarter(undefined)).toBeUndefined()
    expect(yearQuarter("")).toBeUndefined()
    expect(yearQuarter("2026-00-01")).toBeUndefined()
    expect(yearQuarter("2026-13-01")).toBeUndefined()
  })
})

describe("fitHeroLine", () => {
  const family = "Microsoft YaHei, PingFang SC, Helvetica Neue, sans-serif"
  const opts = { maxWidth: 1100, fontSize: 360, fontFamily: family, bold: true }
  const units = (text: string) => measureTextUnits(text, { bold: true, fontFamily: family })
  /** The line as the skins draw it: figure, then the unit `<tspan>` at its own size. */
  const drawnWidth = (fitted: HeroLine, unit: string) =>
    units(fitted.text) * fitted.fontSize + fitted.unitMark.dx + units(unit) * fitted.unitMark.fontSize

  // swiss' stat-hero drew "1142.6" at the size that filled 1100px on its own
  // and then set "万元" after it, 180px past the measure it was fitted to.
  it("fits the figure and its trailing unit inside one measure", () => {
    const fitted = fitHeroLine("1142.6", { ...opts, unit: "万元" })!
    expect(fitted.text).toBe("1142.6")
    expect(fitted.unitMark).toEqual(heroUnitMark(fitted.fontSize))
    expect(drawnWidth(fitted, "万元")).toBeLessThanOrEqual(1100)
    const larger = fitted.fontSize + 1
    expect(drawnWidth({ text: fitted.text, fontSize: larger, unitMark: heroUnitMark(larger) }, "万元")).toBeGreaterThan(1100)
  })

  it("counts a shrunk percent sign that trails the figure", () => {
    const fitted = fitHeroLine("1142.6", { ...opts, percentScale: 0.5 })!
    const percent = units("%") * Math.round(fitted.fontSize * 0.5)
    expect(units(fitted.text) * fitted.fontSize + percent).toBeLessThanOrEqual(1100)
  })

  it("keeps the full size when figure and unit already fit", () => {
    expect(fitHeroLine("10.2", { ...opts, unit: "万席" })!.fontSize).toBe(360)
  })

  it("fits a figure with no unit exactly as a plain line fit does", () => {
    const plain = fitSvgLine("1142.6", { maxWidth: 1100, fontSize: 360, minFontSize: 128, fontFamily: family, bold: true })
    const fitted = fitHeroLine("1142.6", opts)!
    expect({ text: fitted.text, fontSize: fitted.fontSize }).toEqual({ text: plain.text, fontSize: plain.fontSize })
  })

  // The reported page: swiss, "1234567890" with "registered accounts". The
  // pair did not fit at the 128px floor, and the figure was cut to
  // "123456789" to make room for the unit.
  it("shrinks the unit, never the figure, when the pair only fits that way", () => {
    const unit = "registered accounts"
    const fitted = fitHeroLine("1234567890", { ...opts, unit })!
    expect(fitted.text).toBe("1234567890")
    expect(fitted.fontSize).toBe(128)
    expect(fitted.unitMark.fontSize).toBeLessThan(heroUnitMark(128).fontSize)
    expect(fitted.unitMark.fontSize).toBeGreaterThanOrEqual(HERO_UNIT_MIN_PX)
    expect(drawnWidth(fitted, unit)).toBeLessThanOrEqual(1100)
  })

  it("declines a figure too wide for the measure even at its floor, with or without a unit", () => {
    expect(fitHeroLine("12345678901234567890", opts)).toBeNull()
    expect(fitHeroLine("12345678901234567890", { ...opts, unit: "万元" })).toBeNull()
  })

  it("declines when the unit at its smallest still does not leave the figure room", () => {
    // Fits alone at the floor, with nothing to spare for a long unit.
    const fitted = fitHeroLine("123456789012", { ...opts, unit: "registered user accounts in total" })
    expect(fitHeroLine("123456789012", opts)).not.toBeNull()
    expect(fitted).toBeNull()
  })
})
