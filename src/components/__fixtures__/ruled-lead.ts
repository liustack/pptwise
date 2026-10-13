import { expect } from "vitest"
import { contrastRatio } from "../../render/ink"

/** A drawn line's ink and weight, as the element states them. */
function strokeOf(el: Element): { stroke: string; width: number } {
  return { stroke: el.getAttribute("stroke") ?? "none", width: Number(el.getAttribute("stroke-width") ?? "1") }
}

/**
 * On a ruled page (`../surfaces.ts`) the part a component lifts has no fill
 * to stand out by, so it stands out by its line: heavier than the plain
 * parts' lines, in another ink, and an ink that reads as a graphic (3:1) on
 * the paper. A lift drawn as a hairline like the rest, or in a pale ink,
 * fails here the way a fill as pale as the card failed before.
 */
export function expectLeadLine(lead: Element | undefined, plain: Element[], paper: string, label: string): void {
  expect(lead, label).toBeDefined()
  expect(plain.length, label).toBeGreaterThan(0)
  const l = strokeOf(lead!)
  for (const p of plain.map(strokeOf)) {
    expect(l.stroke, label).not.toBe(p.stroke)
    expect(l.width, label).toBeGreaterThan(p.width)
  }
  expect(contrastRatio(l.stroke, paper), label).toBeGreaterThanOrEqual(3)
}
