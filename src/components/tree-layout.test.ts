import { describe, expect, it } from "vitest"
import { orthogonalConnector, orthogonalConnectorRight, tidyTree } from "./tree-layout"

describe("tidyTree", () => {
  it("lays the bottom row on one pitch and centres each branch over its own run", () => {
    const t = tidyTree([2, 2, 1], 100)
    expect(t.leaves).toEqual([50, 150, 250, 350, 450])
    expect(t.branches).toEqual([100, 300, 450])
    expect(t.firstLeaf).toEqual([0, 2, 4])
    expect(t.span).toBe(500)
  })

  it("puts the root halfway between the first and last branch", () => {
    expect(tidyTree([2, 2, 1], 100).root).toBe(275)
    expect(tidyTree([1, 1], 80).root).toBe(80)
  })

  it("gives a childless branch a full slot of its own", () => {
    expect(tidyTree([1, 1, 1], 60).leaves).toEqual([30, 90, 150])
  })

  it("returns the same numbers on a second call — no seed, no iteration", () => {
    expect(tidyTree([3, 1, 2], 90)).toEqual(tidyTree([3, 1, 2], 90))
  })
})

describe("orthogonalConnector", () => {
  it("draws a stem, one bar across the children, and a drop into each", () => {
    const paths = orthogonalConnector(100, 60, 160, [40, 160])
    expect(paths).toEqual([
      "M 100 60 L 100 110",
      "M 40 110 L 160 110",
      "M 40 110 L 40 160",
      "M 160 110 L 160 160",
    ])
  })

  it("draws nothing when a node has no children", () => {
    expect(orthogonalConnector(100, 60, 160, [])).toEqual([])
  })

  it("skips the crossbar when the one child sits directly under the parent", () => {
    expect(orthogonalConnector(100, 60, 160, [100])).toEqual(["M 100 60 L 100 110", "M 100 110 L 100 160"])
  })
})

describe("orthogonalConnectorRight", () => {
  it("is the same connector turned on its side", () => {
    expect(orthogonalConnectorRight(60, 100, 160, [40, 160])).toEqual([
      "M 60 100 L 110 100",
      "M 110 40 L 110 160",
      "M 110 40 L 160 40",
      "M 110 160 L 160 160",
    ])
  })
})
