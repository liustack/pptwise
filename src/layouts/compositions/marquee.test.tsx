// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { contrastRatio } from "../../render/ink"
import { assertSubset } from "../../render/subset-validate"
import { Confetti, SeededRandom, TICKET, Ticket, confettiBounds, confettiPieces, marqueeInks, paintMarqueePhoto, splitDot, splitName, ticketWidths } from "./marquee"
import { renderNode, testCtx } from "./__fixtures__/kit"

/*
 * The marquee setting's inks and furniture, read from rally's 2026-10 board
 * (`design/rounds/2026-10-06-rally/`) and derived from any theme's tokens.
 */

/** How far apart two hex colours are, channel by channel. */
function distance(a: string, b: string): number {
  const ch = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [x, y] = [ch(a), ch(b)]
  return Math.max(...x.map((v, i) => Math.abs(v - y[i]!)))
}

describe("marquee inks", () => {
  it("derive the board's violet and dark ink from rally's tokens", () => {
    const inks = marqueeInks(testCtx("rally").ctx)
    expect(distance(inks.dim, "#5B4B7A")).toBeLessThanOrEqual(4)
    expect(distance(inks.onFire, "#1A1030")).toBeLessThanOrEqual(4)
    expect(inks.fire).toBe("#E84F8A")
    expect(inks.confetti).toEqual(["#E84F8A", "#F0B429", "#4FC1E9", "#9BE36D"])
  })

  it.each(["rally", "homeroom", "brief", "terminal"])("keep words on the lead readable at 12px on %s", (theme) => {
    const inks = marqueeInks(testCtx(theme).ctx)
    expect(contrastRatio(inks.onFire, inks.fire)).toBeGreaterThanOrEqual(4.5)
  })
})

describe("the seeded scatter", () => {
  it("draws what Python's random.Random draws for the same seed", () => {
    // python3 -c "import random; r=random.Random(2); print(r.random(), r.random(), r.randint(-60, 60), r.choice([10,14,6]), r.choice([4,5,10]))"
    const r = new SeededRandom(2)
    expect(r.random()).toBeCloseTo(0.956034271889, 11)
    expect(r.random()).toBeCloseTo(0.947827487059, 11)
    expect(r.randint(-60, 60)).toBe(-53)
    expect(r.choice([10, 14, 6])).toBe(10)
    expect(r.choice([4, 5, 10])).toBe(4)
    const s = new SeededRandom(22)
    expect(s.random()).toBeCloseTo(0.958209379817, 11)
  })

  it("throws the same pieces for the same seed and different ones for another", () => {
    const region = { x: 1100, y: 14, w: 160, h: 44 }
    expect(confettiPieces({ seed: 5, region, count: 7 }, ["a"])).toEqual(confettiPieces({ seed: 5, region, count: 7 }, ["a"]))
    expect(confettiPieces({ seed: 5, region, count: 7 }, ["a"])).not.toEqual(confettiPieces({ seed: 6, region, count: 7 }, ["a"]))
  })

  it("leaves out a piece that would land on words it is kept off", () => {
    const region = { x: 0, y: 0, w: 400, h: 200 }
    const throws = [{ seed: 9, region, count: 20 }]
    const all = confettiPieces(throws[0]!, ["#E84F8A"])
    const keepOff = [{ x: 0, y: 0, w: 200, h: 200 }]
    const { root } = renderNode(<Confetti throws={throws} colors={["#E84F8A"]} keepOff={keepOff} />)
    const kept = Number(root.querySelector("[data-marquee-confetti]")!.getAttribute("data-marquee-confetti"))
    expect(kept).toBe(all.filter((p) => confettiBounds(p).x > 204).length)
    expect(() => assertSubset(root)).not.toThrow()
  })
})

describe("the ticket stub", () => {
  it("sets the stamp on the lead, perforates the seam and punches a hole at each end", () => {
    const { ctx } = testCtx("rally")
    const { root } = renderNode(<Ticket x={64} y={30} text={{ stamp: "02", label: "大盘" }} ctx={ctx} />)
    const w = ticketWidths({ stamp: "02", label: "大盘" }, ctx)
    const holes = Array.from(root.querySelectorAll("[data-marquee-perforation] circle"))
    expect(holes.map((c) => [Number(c.getAttribute("cx")), Number(c.getAttribute("cy"))])).toEqual([
      [64 + w.stamp, 30],
      [64 + w.stamp, 30 + TICKET.h],
    ])
    expect(root.querySelector("[data-marquee-perforation] line")!.getAttribute("stroke-dasharray")).toBe(TICKET.dash)
    expect(root.querySelector("[data-marquee-lead='ticket'] rect")!.getAttribute("fill")).toBe("#E84F8A")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("is only a stub, or only a stamp, when it has words for one part", () => {
    const { ctx } = testCtx("rally")
    expect(renderNode(<Ticket x={64} y={30} text={{ label: "市场部" }} ctx={ctx} />).root.querySelector("[data-marquee-lead]")).toBeNull()
    expect(renderNode(<Ticket x={64} y={30} text={{ stamp: "下一步" }} ctx={ctx} />).root.querySelector("[data-marquee-stub]")).toBeNull()
  })
})

describe("a rounded photograph", () => {
  it("lays a piece of the ground over each corner, so the export keeps the rounding", () => {
    const { ctx } = testCtx("rally")
    const inks = marqueeInks(ctx)
    const { root } = renderNode(paintMarqueePhoto("p", { x: 0, y: 0, w: 200, h: 100 }, { ...ctx, images: { p: { src: "data:image/png;base64,AAAA" } } }, inks, { r: 10 }))
    const corners = Array.from(root.querySelectorAll("[data-photo-corner]"))
    expect(corners).toHaveLength(4)
    expect(corners.every((c) => c.getAttribute("fill") === inks.ground)).toBe(true)
  })
})

describe("splitting a written line", () => {
  it("at its first colon, and at its first ' · '", () => {
    expect(splitName("场外：饮品站，现制杯装")).toEqual({ name: "场外", sep: "：", rest: "饮品站，现制杯装" })
    expect(splitName("Outside: A drink station")).toEqual({ name: "Outside", sep: ": ", rest: "A drink station" })
    expect(splitName("没有冒号")).toBeNull()
    expect(splitDot("沪上阿姨 · 茶饮 · 2024")).toEqual({ name: "沪上阿姨", rest: "茶饮 · 2024" })
  })
})
