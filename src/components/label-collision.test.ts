import { describe, expect, it } from "vitest"
import {
  labelLinePitch,
  resolveValueLabelCollisions,
  stackLabelColumn,
  valueLabelBox,
  type ColumnLabelSpec,
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

describe("stackLabelColumn", () => {
  const pitch = labelLinePitch(16)
  const col = (id: string, y: number, priority = 1): ColumnLabelSpec => ({ id, y, pitch, priority })
  const bounds = { top: 0, bottom: 240 }

  it("leaves labels that already sit a line apart where they are", () => {
    const placed = stackLabelColumn([col("a", 40), col("b", 100)], bounds)
    expect(placed.map((p) => p.y)).toEqual([40, 100])
    expect(placed.every((p) => !p.hidden)).toBe(true)
  })

  it("pushes two labels that want the same y one pitch apart", () => {
    const placed = stackLabelColumn([col("a", 100), col("b", 102)], bounds)
    expect(placed[1]!.y - placed[0]!.y).toBeGreaterThanOrEqual(pitch)
  })

  it("keeps the column inside its bounds, top and bottom", () => {
    const placed = stackLabelColumn([col("a", -50), col("b", -48), col("c", 900)], bounds)
    for (const p of placed) {
      // Sweeping back up lands on the bound through a different sum than
      // sweeping down does, so the two disagree in the last float bit.
      expect(p.y).toBeGreaterThanOrEqual(bounds.top + pitch / 2 - 1e-9)
      expect(p.y).toBeLessThanOrEqual(bounds.bottom - pitch / 2 + 1e-9)
    }
  })

  it("keeps by-angle order, so no leader crosses another", () => {
    const placed = stackLabelColumn([col("a", 120), col("b", 118), col("c", 122)], bounds)
    const byId = new Map(placed.map((p) => [p.id, p.y]))
    expect(byId.get("b")!).toBeLessThan(byId.get("a")!)
    expect(byId.get("a")!).toBeLessThan(byId.get("c")!)
  })

  it("drops the least important labels when the column cannot hold them all", () => {
    const crowded = Array.from({ length: 30 }, (_, i) => col(`s${i}`, 10 + i * 3, 30 - i))
    const placed = stackLabelColumn(crowded, bounds)
    const kept = placed.filter((p) => !p.hidden)
    expect(kept.length).toBe(Math.floor((bounds.bottom - bounds.top) / pitch))
    // Priority order decides who survives, not input order.
    expect(placed.find((p) => p.id === "s0")!.hidden).toBe(false)
    expect(placed.find((p) => p.id === "s29")!.hidden).toBe(true)
    // And whatever survives still clears a full line.
    const ys = kept.map((p) => p.y).sort((a, b) => a - b)
    for (let i = 1; i < ys.length; i++) expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(pitch - 1e-9)
  })

  it("returns nothing for no labels", () => {
    expect(stackLabelColumn([], bounds)).toEqual([])
  })
})
