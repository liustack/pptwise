import { describe, expect, it } from "vitest"
import { bmc } from "../components/bmc"
import { schema } from "../ir/components/bmc"
import { boundThemeCtx } from "../render/__fixtures__/theme-ctx"
import { layoutSvgText, measureTextUnits } from "./svg-text-layout"

// The script-seam preference among balanced splits used to enumerate every
// split, exponential in the line count. With bmc items no longer capped in
// lines, one long mixed item stalled a plain `bmc.measure()` for seconds.
// Both calls below took over 4 s before the search became a bounded dynamic
// programme, and take about 1-2 ms after. The bound is loose on purpose: it
// catches a return to exponential time, not a slow machine.
const LIMIT_MS = 50

function timed<T>(run: () => T): { value: T; ms: number } {
  const start = performance.now()
  const value = run()
  return { value, ms: performance.now() - start }
}

describe("balanced wrapping stays fast on long mixed text", () => {
  it("balances a Latin word before 81 CJK characters in a narrow column", () => {
    const text = `A ${"中".repeat(81)}`
    const opts = { maxWidth: 160, fontSize: 16, minPt: 16, maxLines: Number.POSITIVE_INFINITY }
    layoutSvgText("A 中中中", { ...opts, balanceLines: true }) // warm the path
    const { value: r, ms } = timed(() => layoutSvgText(text, { ...opts, balanceLines: true }))
    expect(ms).toBeLessThan(LIMIT_MS)

    const plain = layoutSvgText(text, opts)
    expect(r.lines.length).toBe(plain.lines.length)
    expect(r.fontSize).toBe(16)
    expect(r.truncated).toBe(false)
    for (const line of r.lines) expect(measureTextUnits(line) * 16).toBeLessThanOrEqual(160 + 1e-9)
    expect(Array.from(r.lines.at(-1)!).length).toBeGreaterThan(1)
    expect(r.lines.join("").replace(/\s/g, "")).toBe(text.replace(/\s/g, ""))
  })

  it("measures a bmc whose key partners item is a Latin word and 101 CJK characters", () => {
    const one = ["B"]
    const component = schema.parse({
      type: "bmc",
      key_partners: [`A ${"中".repeat(101)}`],
      key_activities: one,
      key_resources: one,
      value_propositions: one,
      customer_relationships: one,
      channels: one,
      customer_segments: one,
      cost_structure: one,
      revenue_streams: one,
    })
    const ctx = boundThemeCtx("swiss", {})
    bmc.measure(schema.parse({ ...component, key_partners: ["A 中中中"] }), 1051, ctx) // warm the path
    const { value: h, ms } = timed(() => bmc.measure(component, 1051, ctx))
    expect(ms).toBeLessThan(LIMIT_MS)
    expect(h).toBeGreaterThan(0)
  })
})
