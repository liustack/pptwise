// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { assertSubset } from "../render/subset-validate"
import { pyramid } from "./pyramid"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { contrastRatio, readableOn, requiredContrastRatio } from "../render/ink"
import { FORM_BODY_FLOOR } from "./legibility"
import type { ComponentCtx } from "./types"

function themed(id: string): ComponentCtx {
  return buildCtx(resolveStyle(id), {})
}

function svg(node: React.ReactElement) {
  return render(<svg viewBox="0 0 1280 720">{node}</svg>)
}

const four = {
  type: "pyramid" as const,
  layers: [
    { label: "结论主张", note: "一句话说清要什么、谁来批、什么时候要" },
    { label: "关键论据", note: "三条支撑互不重叠，每条都能被单独推翻" },
    { label: "数据事实", note: "口径写进脚注，来源可追到系统和取数日期" },
    { label: "数据底座", note: "席位、续约、开通共用一套主数据与口径" },
  ],
}

const bare = {
  type: "pyramid" as const,
  layers: [{ label: "结论" }, { label: "论据" }, { label: "数据" }],
}

const BOX = { x: 88, y: 200, w: 1104, h: 412 }

describe("pyramid component", () => {
  it("draws one trapezoid per level, widening downward, and one legend card each", () => {
    const { container } = svg(pyramid.render(four, BOX, themed("brief")))
    const bands = Array.from(container.querySelectorAll("polygon"))
    expect(bands).toHaveLength(4)
    const widthOf = (p: Element) => {
      const xs = p.getAttribute("points")!.split(" ").map((pair) => Number(pair.split(",")[0]))
      return Math.max(...xs) - Math.min(...xs)
    }
    const widths = bands.map(widthOf)
    for (let i = 1; i < widths.length; i += 1) expect(widths[i]).toBeGreaterThan(widths[i - 1]!)
    // one card + one swatch per level
    expect(container.querySelectorAll("rect")).toHaveLength(8)
    assertSubset(container.querySelector("svg")!)
  })

  it("names each level once, on its own band, and prints its note in the legend beside it", () => {
    const { container } = svg(pyramid.render(four, BOX, themed("brief")))
    const texts = Array.from(container.querySelectorAll("text")).map((t) => t.textContent)
    for (const layer of four.layers) {
      expect(texts.filter((t) => t === layer.label)).toHaveLength(1)
      expect(texts.join("|")).toContain(layer.note.slice(0, 8))
    }
    expect(container.querySelector("[data-dropped]")).toBeNull()
  })

  it("gives each level's swatch the fill of the band it stands for", () => {
    const { container } = svg(pyramid.render(four, BOX, themed("brief")))
    const bands = Array.from(container.querySelectorAll("polygon")).map((p) => p.getAttribute("fill"))
    const swatches = Array.from(container.querySelectorAll("rect"))
      .filter((r) => r.getAttribute("width") === "12")
      .map((r) => r.getAttribute("fill"))
    expect(swatches).toEqual(bands)
  })

  it("keeps every band's own label legible on the band it is painted on, across every theme", () => {
    for (const id of ["brief", "ledger", "terminal", "crayon", "luxe", "stage"]) {
      const { container } = svg(pyramid.render(four, BOX, themed(id)))
      for (const band of Array.from(container.querySelectorAll("polygon"))) {
        const fill = band.getAttribute("fill")!
        expect(contrastRatio(readableOn(fill), fill), `${id} ${fill}`).toBeGreaterThanOrEqual(
          requiredContrastRatio(20),
        )
      }
    }
  })

  it("centres the pyramid and draws no legend when no level carries a note", () => {
    const { container } = svg(pyramid.render(bare, BOX, themed("brief")))
    expect(container.querySelectorAll("polygon")).toHaveLength(3)
    expect(container.querySelectorAll("rect")).toHaveLength(0)
  })

  it("never prints below the readable floor", () => {
    const { container } = svg(pyramid.render(four, BOX, themed("brief")))
    for (const t of Array.from(container.querySelectorAll("text"))) {
      expect(Number(t.getAttribute("font-size")), `${t.textContent}`).toBeGreaterThanOrEqual(FORM_BODY_FLOOR)
    }
  })

  it("declares a decline when notes are authored and the box has no column for the legend", () => {
    const { container } = svg(pyramid.render(four, { ...BOX, w: 520 }, themed("brief")))
    const marker = container.querySelector("[data-dropped]")
    expect(marker).not.toBeNull()
    expect(Number(marker!.getAttribute("data-dropped"))).toBe(4)
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("declines when the legend cards are shorter than the notes they hold", () => {
    const six = {
      type: "pyramid" as const,
      layers: Array.from({ length: 6 }, (_, i) => ({
        label: `第 ${i + 1} 层`,
        note: "口径写进脚注，来源可追到系统和取数日期，评审前一天冻结不再改动",
      })),
    }
    const { container } = svg(pyramid.render(six, { ...BOX, h: 250 }, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
    expect(container.querySelectorAll("text")).toHaveLength(0)
  })

  it("keeps every legend line inside its own card", () => {
    const { container } = svg(pyramid.render(four, BOX, themed("brief")))
    const cards = Array.from(container.querySelectorAll("rect")).filter(
      (r) => Number(r.getAttribute("width")) > 100,
    )
    expect(cards).toHaveLength(4)
    const cardTop = Math.min(...cards.map((r) => Number(r.getAttribute("y"))))
    const cardBottom = Math.max(
      ...cards.map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height"))),
    )
    for (const t of Array.from(container.querySelectorAll("text"))) {
      if (t.getAttribute("text-anchor") === "middle") continue
      const size = Number(t.getAttribute("font-size"))
      const baseline = Number(t.getAttribute("y"))
      expect(baseline - size, `${t.textContent}`).toBeGreaterThanOrEqual(cardTop - 1)
      expect(baseline, `${t.textContent}`).toBeLessThanOrEqual(cardBottom + 1)
    }
  })

  it("declines rather than cut a level name or a legend note", () => {
    const long = {
      ...four,
      layers: four.layers.map((l, i) =>
        i === 0 ? { ...l, label: "结论主张与它所依赖的全部前提条件一并写在这一层" } : l,
      ),
    }
    const { container } = svg(pyramid.render(long, BOX, themed("brief")))
    expect(container.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("prints no data-truncated anywhere, because a cut line is a decline instead", () => {
    const { container } = svg(pyramid.render(four, BOX, themed("brief")))
    expect(container.querySelector("[data-truncated]")).toBeNull()
  })

  it("draws the same geometry on a second render", () => {
    const first = svg(pyramid.render(four, BOX, themed("brief"))).container.innerHTML
    expect(svg(pyramid.render(four, BOX, themed("brief"))).container.innerHTML).toBe(first)
  })
})

describe("pyramid ramp spread", () => {
  it("separates adjacent levels on a dark theme, where primary and the page are neighbours", () => {
    for (const id of ["terminal", "arena", "ledger", "brief", "swiss"]) {
      const { container } = svg(pyramid.render(four, BOX, themed(id)))
      const fills = Array.from(container.querySelectorAll("polygon")).map((p) => p.getAttribute("fill")!)
      expect(new Set(fills).size, `${id} draws ${fills.join(" ")}`).toBe(fills.length)
      for (let i = 1; i < fills.length; i += 1) {
        expect(contrastRatio(fills[i]!, fills[i - 1]!), `${id} ${fills[i - 1]}→${fills[i]}`).toBeGreaterThan(1.12)
      }
    }
  })
})
