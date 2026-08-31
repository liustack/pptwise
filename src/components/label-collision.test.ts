import { describe, expect, it } from "vitest"
import {
  resolveValueLabelCollisions,
  valueLabelBox,
  type ValueLabelSpec,
} from "./label-collision"

function spec(partial: Partial<ValueLabelSpec> & Pick<ValueLabelSpec, "id" | "text" | "y">): ValueLabelSpec {
  return {
    x: 1000,
    anchor: "end",
    fontSize: 16,
    priority: 1,
    ...partial,
  }
}

describe("resolveValueLabelCollisions", () => {
  it("leaves two labels that already sit a line apart", () => {
    const placed = resolveValueLabelCollisions([
      spec({ id: "a", text: "90", y: 160, priority: 2 }),
      spec({ id: "b", text: "87", y: 190, priority: 1 }),
    ])
    expect(placed.every((label) => !label.hidden)).toBe(true)
    expect(placed.map((label) => label.y)).toEqual([160, 190])
  })

  it("opens a full line between two labels whose ink boxes only just clear", () => {
    // 16px apart: the ink boxes (0.9em tall) miss each other by a hair, so
    // the old overlap-only test left the digits sitting on top of one
    // another. A line of air is 1.2em + 2.
    const placed = resolveValueLabelCollisions([
      spec({ id: "a", text: "90", y: 160, priority: 2 }),
      spec({ id: "b", text: "87", y: 176, priority: 1 }),
    ])
    expect(placed.every((label) => !label.hidden)).toBe(true)
    const [a, b] = placed
    expect(Math.abs(a!.y - b!.y)).toBeCloseTo(16 * 1.2 + 2)
  })

  it("staggers the lower-priority label when two endpoint numbers kiss", () => {
    const placed = resolveValueLabelCollisions([
      spec({ id: "a", text: "90", y: 174, priority: 2 }),
      spec({ id: "b", text: "87", y: 184, priority: 1 }),
    ])
    const a = placed.find((label) => label.id === "a")!
    const b = placed.find((label) => label.id === "b")!
    expect(a.hidden).toBe(false)
    expect(b.hidden).toBe(false)
    expect(Math.abs(a.y - b.y)).toBeGreaterThan(Math.abs(174 - 184))
    expect(valueLabelBox(a)).not.toEqual(valueLabelBox(b))
  })

  it("hides one label rather than drawing an ellipsis when stagger cannot clear the band", () => {
    const placed = resolveValueLabelCollisions([
      spec({
        id: "a",
        text: "99999",
        x: 400,
        y: 200,
        anchor: "middle",
        fontSize: 48,
        priority: 2,
        yMin: 190,
        yMax: 210,
      }),
      spec({
        id: "b",
        text: "88888",
        x: 400,
        y: 202,
        anchor: "middle",
        fontSize: 48,
        priority: 1,
        yMin: 190,
        yMax: 210,
      }),
    ])
    expect(placed.some((label) => label.hidden)).toBe(true)
    expect(placed.every((label) => !label.text.includes("…"))).toBe(true)
  })
})
