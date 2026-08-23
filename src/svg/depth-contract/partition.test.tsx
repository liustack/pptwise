// @vitest-environment jsdom
import { Fragment, type ReactNode } from "react"
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../serialize"
import { DecorPiece } from "../motifs/decor-piece"
import { partitionSvgDepth } from "./partition"

function keyed(nodes: ReactNode[]) {
  return nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>)
}

function renderLayers(node: ReactNode, slideType: "cover" | "chapter" | "content" | "ending" = "content") {
  const layers = partitionSvgDepth(node, { slideType })
  return parseSvgRoot(
    renderSvgMarkup(
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
        <g data-depth="bg">{keyed(layers.bg)}</g>
        <g data-depth="mid">{keyed(layers.mid)}</g>
        <g data-depth="fg">{keyed(layers.fg)}</g>
      </svg>,
    ),
  )
}

describe("partitionSvgDepth three-tier decor roles", () => {
  it("lifts structure pieces out of a data-decor group into the foreground", () => {
    const root = renderLayers(
      <g data-decor>
        <DecorPiece id="red-bar" role="structure">
          <rect data-probe="bar" x={0} y={0} width={1280} height={12} fill="#D7282F" />
        </DecorPiece>
        <DecorPiece id="ticks">
          <line data-probe="tick" x1={1252} y1={64} x2={1268} y2={64} stroke="#5F5F5C" />
        </DecorPiece>
      </g>,
    )
    const bar = root.querySelector('[data-probe="bar"]')!
    const tick = root.querySelector('[data-probe="tick"]')!
    expect(bar.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(tick.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
    expect(bar.closest("[data-decor]")).toBeNull()
    expect(tick.closest("[data-decor]")).not.toBeNull()
  })

  it("keeps identity pieces in the midground, under type", () => {
    const root = renderLayers(
      <g data-decor>
        <DecorPiece id="seal" role="identity">
          <rect data-probe="seal" x={1231} y={614} width={26} height={26} fill="#C3272B" />
        </DecorPiece>
      </g>,
    )
    const seal = root.querySelector('[data-probe="seal"]')!
    expect(seal.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
    expect(seal.closest("[data-identity]")?.getAttribute("data-identity")).toBe("true")
  })
})
