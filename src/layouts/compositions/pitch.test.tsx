// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { contrastRatio } from "../../render/ink"
import { courseStripWidth } from "../../render/course-marks"
import { PitchRail, RAIL, pitchInks, railLeft, splitSentence } from "./pitch"
import { renderNode, testCtx } from "./__fixtures__/kit"

/*
 * The pitch setting's inks and furniture, read from ember's 2026-10 board
 * (`design/rounds/2026-10-06-ember/`) and derived from any theme's tokens.
 */

const COURSE = { stages: ["机会", "时机", "竞争", "切入", "证明", "风险", "计划", "请求"].map((label) => ({ label })) }

/** How far apart two hex colours are, channel by channel. */
function distance(a: string, b: string): number {
  const ch = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [x, y] = [ch(a), ch(b)]
  return Math.max(...x.map((v, i) => Math.abs(v - y[i]!)))
}

describe("pitch inks", () => {
  it("derive the board's greys and dark bands from ember's tokens", () => {
    const inks = pitchInks(testCtx("ember").ctx)
    expect(distance(inks.dim, "#4A3B30")).toBeLessThanOrEqual(3)
    expect(distance(inks.deep, "#5A4638")).toBeLessThanOrEqual(4)
    expect(inks.quiet).toBe("#A89888")
    expect(inks.fire).toBe("#E56A2C")
    expect(contrastRatio(inks.onFire, inks.fire)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(["ember", "homeroom", "brief", "terminal"])("keep the rail's other beats readable at 12px on %s", (theme) => {
    const inks = pitchInks(testCtx(theme).ctx)
    expect(contrastRatio(inks.rail, inks.ground)).toBeGreaterThanOrEqual(4.5)
  })
})

describe("the rail", () => {
  it("lights the page's beat in the ivory, bold and underlined, and is never wider than the strip validate measures", () => {
    const { ctx } = testCtx("ember")
    const { root } = renderNode(<PitchRail course={COURSE} stage="证明" ctx={ctx} right={1216} top={28} />)
    const lit = root.querySelector("[data-stage-lit]")!
    expect(lit.getAttribute("data-stage")).toBe("证明")
    expect(lit.querySelector("text")!.getAttribute("font-weight")).toBe("700")
    expect(Number(lit.querySelector("rect")!.getAttribute("y"))).toBe(28 + RAIL.height + RAIL.underline.gap)
    expect(1216 - railLeft(COURSE, ctx, 1216)).toBeLessThanOrEqual(courseStripWidth(COURSE, ctx.fonts.body))
  })
})

describe("splitSentence", () => {
  it("splits at the first sentence end and keeps the end the author wrote", () => {
    expect(splitSentence("条例和 CCAR-92 同日生效。运营合格证有了门槛")).toEqual({ lead: "条例和 CCAR-92 同日生效", sep: "。", rest: "运营合格证有了门槛" })
    expect(splitSentence("Rules took effect. Licenses got one bar")).toEqual({ lead: "Rules took effect", sep: ". ", rest: "Licenses got one bar" })
    expect(splitSentence("一句话")).toBeNull()
  })
})
