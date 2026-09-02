// @vitest-environment jsdom
//
// The compare label is fitted with the tracking it is painted with, and a
// label too long for its half is cut rather than erased.
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"
import { imageCompare } from "./image-compare"
import type { ComponentCtx } from "./types"
import { collectInkFindings } from "../../evals/gallery/ink-containment"
import { renderSvgMarkup } from "../render/serialize"

const ctx: ComponentCtx = {
  colors: {
    bg: "#FFFFFF", surface: "#F4F4F4", primary: "#006A4E", accent: "#00A878",
    text: "#1A2421", muted: "#5D6B65", chartPalette: ["#006A4E", "#00A878"],
  },
  fonts: { heading: "Georgia", body: "Georgia", mono: "Consolas" },
  bodyFontPx: 24,
}

const W = 1012

function compare(left: string, right: string) {
  return {
    type: "image_compare" as const,
    style: "before_after" as const,
    left: { asset_id: "missing-left", label: left },
    right: { asset_id: "missing-right", label: right },
  }
}

function labelsOf(component: ReturnType<typeof compare>) {
  const { container } = render(<svg>{imageCompare.render(component, { x: 0, y: 0, w: W }, ctx)}</svg>)
  // Only the labels carry tracking; the placeholder caption does not.
  return Array.from(container.querySelectorAll("text[letter-spacing]")).map((t) => ({
    text: t.textContent ?? "",
    truncated: t.getAttribute("data-truncated"),
  }))
}

describe("image_compare labels", () => {
  it("cuts an overlong label instead of erasing it", () => {
    // 500 tracked glyphs ask for 499px of gaps alone, past the ~485px each
    // half has. Budgeting that against the input rather than the survivor
    // took both author labels off the page whole.
    const labels = labelsOf(compare("i".repeat(500), "i".repeat(500)))
    expect(labels).toHaveLength(2)
    for (const label of labels) {
      expect(label.text.length).toBeGreaterThan(0)
      expect(label.truncated).toBe("1")
    }
  })

  it("keeps what it cut inside the component's own box", () => {
    const markup = renderSvgMarkup(imageCompare.render(compare("i".repeat(500), "i".repeat(500)), { x: 0, y: 0, w: W }, ctx))
    const wrapped = `<svg xmlns="http://www.w3.org/2000/svg"><g data-audit-rect="0,0,${W},400"><g data-audit-box="0,0,${W}">${markup}</g></g></svg>`
    expect(collectInkFindings(wrapped)).toEqual([])
  })

  it("leaves a label that fits untouched", () => {
    const labels = labelsOf(compare("改造前", "改造后"))
    expect(labels.map((l) => l.text)).toEqual(["改造前", "改造后"])
    expect(labels.every((l) => l.truncated === null)).toBe(true)
  })
})
