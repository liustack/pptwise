// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderToStaticMarkup } from "react-dom/server"
import type { PptxIR } from "@/ir"
import { validateIr } from "../validate-core"
import { CroppedImage, cropPlacement } from "./cropped-image"
import { assertSubset } from "./subset-validate"
import { visibleImageBox } from "../lib/svg-image-box"
import { dataUriDimensions } from "../lib/image-size"
import { imageToOp } from "../pptx/svg2pptx/image"
import { renderComponent } from "../components"
import { boundThemeCtx } from "./__fixtures__/theme-ctx"
import { compose } from "../layouts/compositions"

/** A PNG header that says `w` by `h`: enough for the size to be read, which is all a crop needs. */
function pngOf(w: number, h: number): string {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, w)
  view.setUint32(20, h)
  return `data:image/png;base64,${btoa(String.fromCharCode(...bytes))}`
}

/** A group photograph of three people side by side, 1024 square. */
const GROUP = pngOf(1024, 1024)

function svgRoot(node: React.ReactElement): Element {
  const markup = renderToStaticMarkup(<svg xmlns="http://www.w3.org/2000/svg">{node}</svg>)
  return new DOMParser().parseFromString(markup, "image/svg+xml").documentElement
}

describe("a cropped picture", () => {
  it("reads a picture's size from its header", () => {
    expect(dataUriDimensions(GROUP)).toEqual({ w: 1024, h: 1024 })
  })

  it("places the whole picture so the named part fills the frame, its centre on the frame's centre", () => {
    // The middle of three people in a 154 by 360 window.
    const box = { x: 230, y: 262, w: 154, h: 360 }
    const placed = cropPlacement(GROUP, box, [0.31, 0.1, 0.38, 0.8])!
    // The part is 389 by 819 source pixels: its height decides the scale.
    const scale = 360 / (0.8 * 1024)
    expect(placed.w).toBeCloseTo(1024 * scale, 1)
    expect(placed.h).toBeCloseTo(1024 * scale, 1)
    // The part's centre (x 0.5, y 0.5 of the picture) lands on the frame's centre.
    expect(placed.x + placed.w * 0.5).toBeCloseTo(box.x + box.w / 2, 1)
    expect(placed.y + placed.h * 0.5).toBeCloseTo(box.y + box.h / 2, 1)
  })

  it("draws an uncropped picture as the plain image every renderer draws", () => {
    const plain = renderToStaticMarkup(<svg><CroppedImage src={GROUP} box={{ x: 1, y: 2, w: 3, h: 4 }} /></svg>)
    expect(plain).toBe(`<svg><image href="${GROUP}" x="1" y="2" width="3" height="4" preserveAspectRatio="xMidYMid slice"></image></svg>`)
  })

  it("cuts a cropped picture with a clip of one rectangle the subset admits, and reads its box through the clip", () => {
    const root = svgRoot(<CroppedImage src={GROUP} box={{ x: 64, y: 262, w: 154, h: 360 }} crop={[0, 0.1, 0.38, 0.8]} assetKey="look0507" />)
    expect(() => assertSubset(root)).not.toThrow()
    const image = root.querySelector("image")!
    expect(image.getAttribute("clip-path")).toMatch(/^url\(#crop-look0507-/)
    expect(Number(image.getAttribute("width"))).toBeGreaterThan(154)
    expect(visibleImageBox(image)).toEqual({ x: 64, y: 262, w: 154, h: 360 })
  })

  it("falls back to the plain picture when its size cannot be read", () => {
    const remote = "https://example.com/a.jpg"
    const root = svgRoot(<CroppedImage src={remote} box={{ x: 0, y: 0, w: 10, h: 10 }} crop={[0, 0, 0.5, 0.5]} />)
    expect(root.querySelector("clipPath")).toBeNull()
    expect(root.querySelector("image")!.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice")
  })

  it("is refused by the subset when the clip is anything but one rectangle, or cuts anything but a picture", () => {
    const parse = (inner: string) => new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg">${inner}</svg>`, "image/svg+xml").documentElement
    expect(() => assertSubset(parse(`<clipPath id="c"><circle r="4"/></clipPath><image href="${GROUP}" clip-path="url(#c)"/>`))).toThrow(/one untransformed rectangle/)
    expect(() => assertSubset(parse(`<clipPath id="c"><rect width="4" height="4"/></clipPath><rect width="9" height="9" clip-path="url(#c)"/>`))).toThrow(/only a picture/)
  })
})

describe("the export of a cropped picture", () => {
  it("draws the clip's box and crops the picture to it", () => {
    const root = svgRoot(<CroppedImage src={GROUP} box={{ x: 96, y: 96, w: 192, h: 288 }} crop={[0.5, 0, 0.5, 1]} />)
    const op = imageToOp(root.querySelector("image")!)
    expect(op.x).toBe(1)
    expect(op.y).toBe(1)
    expect(op.sizing).toMatchObject({ type: "crop", w: 2, h: 3 })
    // The right half (512 by 1024) covers the 192 by 288 frame at 0.375, so the
    // whole picture is drawn 384 square from x -96, y 48: the crop starts two
    // inches in from its left and half an inch down.
    expect(op.w).toBeCloseTo(4, 3)
    expect(op.h).toBeCloseTo(4, 3)
    expect(op.sizing!.type === "crop" && op.sizing!.x).toBeCloseTo(2, 3)
    expect(op.sizing!.type === "crop" && op.sizing!.y).toBeCloseTo(0.5, 3)
  })
})

describe("crop in the IR", () => {
  const deck = (crop: unknown): unknown => ({
    version: "5",
    filename: "crop",
    theme: { id: "brief" },
    meta: {},
    assets: { images: { group: { src: GROUP } } },
    slides: [{ type: "content", kind: "photo", heading: "Looks", components: [{ type: "image_grid", items: [{ asset_id: "group", crop }, { asset_id: "group", crop: [0.5, 0, 0.5, 1] }] }] }],
  })

  it("takes a part inside the picture", () => {
    expect(validateIr(deck([0, 0.1, 0.38, 0.8])).ok).toBe(true)
  })

  it("refuses a part that leaves the picture or has no size", () => {
    expect(validateIr(deck([0.8, 0, 0.5, 1])).ok).toBe(false)
    expect(validateIr(deck([0, 0, 0, 1])).ok).toBe(false)
    expect(validateIr(deck([0, 0, 1])).ok).toBe(false)
  })

  it("is drawn by the ordinary grid, and keeps a hand-set composition from taking the page", () => {
    const ir = (validateIr(deck([0, 0.1, 0.38, 0.8])) as { ok: true; ir: PptxIR }).ir
    const grid = ir.slides[0]!.components[0]!
    const ctx = boundThemeCtx("brief", ir.assets.images)
    const root = svgRoot(renderComponent(grid, { x: 64, y: 200, w: 1152 }, ctx))
    expect(root.querySelectorAll("clipPath")).toHaveLength(2)
    expect(() => assertSubset(root)).not.toThrow()
    expect(compose({ components: ir.slides[0]!.components, ctx, rect: { x: 64, y: 200, w: 1152, h: 400 } })).toBeNull()
  })
})
