import { describe, expect, it } from "vitest"
import type { PageRenderContext } from "../render/page-context"
import { clearsFaceFurniture, STRUCTURE_MARK_CLEARANCE } from "./keep-out"

const MARK = { x: 56, y: 56, w: 72, h: 72 }
const page = (decorKeepOut: PageRenderContext["decorKeepOut"]): PageRenderContext => ({
  motifOn: true,
  brandOn: false,
  branding: "none",
  metadataOn: false,
  documentMetaOn: false,
  decorKeepOut,
  geometry: { imageBottomCaptionBottomY: 0 },
})

describe("clearsFaceFurniture", () => {
  it("clears a page with no page context and a face that reserves nothing", () => {
    expect(clearsFaceFurniture(undefined, MARK)).toBe(true)
    expect(clearsFaceFurniture(page(undefined), MARK)).toBe(true)
    expect(clearsFaceFurniture(page([]), MARK)).toBe(true)
  })

  it("blocks furniture the mark overlaps outright", () => {
    expect(clearsFaceFurniture(page([{ x: 60, y: 60, w: 10, h: 10 }]), MARK)).toBe(false)
  })

  it("blocks furniture that is merely adjacent — the defect this exists for", () => {
    // rail-numbered's rail: 4px left of the mark's vertical arm.
    expect(clearsFaceFurniture(page([{ x: 48, y: 96, w: 4, h: 544 }]), MARK)).toBe(false)
  })

  it("clears furniture just past the clearance band", () => {
    const x = MARK.x + MARK.w + STRUCTURE_MARK_CLEARANCE
    expect(clearsFaceFurniture(page([{ x, y: 56, w: 4, h: 544 }]), MARK)).toBe(true)
    expect(clearsFaceFurniture(page([{ x: x - 1, y: 56, w: 4, h: 544 }]), MARK)).toBe(false)
  })

  it("takes a caller-supplied clearance", () => {
    const rail = [{ x: 48, y: 96, w: 4, h: 544 }]
    expect(clearsFaceFurniture(page(rail), MARK, 0)).toBe(true)
  })
})
