import { describe, it, expect } from "vitest"
import {
  pxToIn,
  pxToPt,
  ptToPx,
  CANVAS_W_PX,
  CANVAS_H_PX,
  SLIDE_W_IN,
  SLIDE_H_IN,
  PX_PER_IN,
  PT_PER_PX,
  BODY_FONT_FLOOR_PT,
  BODY_FONT_FLOOR_PX,
  META_FONT_FLOOR_PT,
  META_FONT_FLOOR_PX,
} from "./constants"

describe("constants", () => {
  it("pxToIn converts pixels to inches at 96 px/in", () => {
    expect(pxToIn(96)).toBe(1)
    expect(pxToIn(0)).toBe(0)
    expect(pxToIn(48)).toBe(0.5)
  })

  it("canvas pixel dimensions map onto the LAYOUT_WIDE inch size", () => {
    expect(PX_PER_IN).toBe(96)
    expect(pxToIn(CANVAS_W_PX)).toBeCloseTo(SLIDE_W_IN, 3)
    expect(pxToIn(CANVAS_H_PX)).toBe(SLIDE_H_IN)
  })

  it("pxToPt converts pixels to points at 0.75 pt/px", () => {
    expect(PT_PER_PX).toBe(0.75)
    expect(pxToPt(96)).toBe(72)
    expect(pxToPt(2)).toBe(1.5)
  })

  it("ptToPx is the inverse of pxToPt", () => {
    expect(ptToPx(12)).toBe(16)
    expect(ptToPx(18)).toBe(24)
    expect(pxToPt(ptToPx(12))).toBe(12)
  })

  it("readable floors are 12pt meta and 18pt body", () => {
    expect(META_FONT_FLOOR_PT).toBe(12)
    expect(BODY_FONT_FLOOR_PT).toBe(18)
    expect(META_FONT_FLOOR_PX).toBe(16)
    expect(BODY_FONT_FLOOR_PX).toBe(24)
  })
})
