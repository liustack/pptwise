// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { Slide } from "@/ir"
import { leaveOffDropped } from "./content-loss"
import type { PageLoss } from "./boundary-loss"

const loss = (drops: PageLoss["drops"]): PageLoss => ({ dropped: drops.reduce((sum, { count }) => sum + count, 0), drops, cut: [], hardCut: [] })

const ganttPage = (range?: { from: number; to: number }): Slide =>
  ({
    type: "content",
    kind: "process",
    heading: "Plan",
    components: [
      {
        type: "gantt",
        axis_labels: ["Q1", "Q2", "Q3", "Q4"],
        ...(range !== undefined ? { range } : {}),
        items: [
          { label: "Design", start: 1, end: 2 },
          { label: "Build", start: 2, end: 3 },
          { label: "Pilot", start: 3, end: 4 },
          { label: "Launch", start: 4, end: 5 },
        ],
      },
    ],
  }) as unknown as Slide

describe("leaveOffDropped", () => {
  it("leaves off the bars a gantt did not draw and writes out the axis the whole list set", () => {
    const left = leaveOffDropped(ganttPage(), loss([{ kind: "item", count: 2 }]))
    expect(left?.took).toBe("the last 2 of the 4 items in its gantt")
    const gantt = left!.slide.components[0] as unknown as { items: { label: string }[]; range: { from: number; to: number } }
    expect(gantt.items.map((item) => item.label)).toEqual(["Design", "Build"])
    expect(gantt.range).toEqual({ from: 1, to: 5 })
  })

  it("keeps a gantt's own range", () => {
    const left = leaveOffDropped(ganttPage({ from: 0, to: 6 }), loss([{ kind: "item", count: 1 }]))
    expect((left!.slide.components[0] as unknown as { range: unknown }).range).toEqual({ from: 0, to: 6 })
  })

  it("leaves off the page fields the face had no place for", () => {
    const page = { ...ganttPage(), stamp: "Draft", footnote: "Source: plan" } as unknown as Slide
    const left = leaveOffDropped(page, loss([{ kind: "stamp", count: 1 }, { kind: "footnote", count: 1 }]))
    expect(left?.took).toBe("its stamp and source line (footnote)")
    expect(left!.slide).not.toHaveProperty("stamp")
    expect(left!.slide).not.toHaveProperty("footnote")
  })

  it("names nothing when nothing was dropped", () => {
    expect(leaveOffDropped(ganttPage(), loss([]))).toBeUndefined()
  })
})
