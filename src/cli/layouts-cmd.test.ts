// @vitest-environment node
import { describe, expect, it } from "vitest"
import { LAYOUT_REGISTRY } from "../layouts/registry"
import { runLayouts } from "./commands"

describe("runLayouts", () => {
  it("prints a non-empty human table containing known ids", () => {
    const human = runLayouts(false)
    expect(human.length).toBeGreaterThan(0)
    expect(human).toContain("gauge-sheet")
    expect(human).toContain("pull-quote")
    expect(human).not.toMatch(/pin-only/)
  })

  it("--json parses and has one entry per LAYOUT_REGISTRY id", () => {
    const rows = JSON.parse(runLayouts(true)) as unknown[]
    expect(rows).toHaveLength(Object.keys(LAYOUT_REGISTRY).length)
  })

  it("JSON entry for gauge-sheet has slideTypes and body capacity 4", () => {
    const rows = JSON.parse(runLayouts(true)) as Array<{
      id: string
      slideTypes: string[]
      pinOnly?: boolean
      arrangements?: string[] | "all"
      slots: Array<{ name: string; accepts: string[] | "any"; capacity?: number }>
    }>
    const sheet = rows.find((r) => r.id === "gauge-sheet")
    expect(sheet).toBeDefined()
    expect(sheet!.slideTypes).toEqual(["content"])
    expect(sheet).not.toHaveProperty("arrangements")
    expect(sheet).not.toHaveProperty("pinOnly")
    const body = sheet!.slots.find((s) => s.name === "body")
    expect(body?.capacity).toBe(4)
  })
})
