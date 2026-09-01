// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../render/serialize"
import { boundaryBulletItems, boundarySlotBlock, boundarySlotBlocks, drawableItems } from "./boundary-content"
import { COVER_LAYOUTS } from "./index-cover"
import { ENDING_LAYOUTS } from "./index-ending"
import { LAYOUT_REGISTRY } from "./registry"
import type { CoverLayoutId, EndingLayoutId, SvgTemplateProps } from "./types"

function slideWith(components: Slide["components"], type: Slide["type"] = "ending"): Slide {
  return { type, heading: "收口标题", subheading: "副标题", components } as Slide
}

describe("boundary slot selection", () => {
  it("returns every accepted block, so validate can see the overflow the face drops", () => {
    const slide = slideWith([
      { type: "bullets", items: ["A"] },
      { type: "paragraph", text: "P" },
      { type: "bullets", items: ["B"] },
    ])
    expect(boundarySlotBlocks(slide, ["bullets"]).length).toBe(2)
    expect(boundarySlotBlocks(slide, ["bullets", "paragraph"]).length).toBe(3)
    expect(boundarySlotBlocks(slide, ["kpi_cards"]).length).toBe(0)
  })

  it("draws the first accepted block, in authored order", () => {
    const slide = slideWith([
      { type: "bullets", items: ["FIRST"] },
      { type: "bullets", items: ["SECOND"] },
    ])
    const block = boundarySlotBlock(slide, ["bullets"])
    expect(block?.type === "bullets" && block.items).toEqual(["FIRST"])
  })
})

describe("drawable items", () => {
  it("keeps every item that paints glyphs and drops every item that cannot", () => {
    expect(drawableItems(["One", "", "  ", "\n", "Two", "** **"])).toEqual(["One", "Two"])
    // `****` is not an empty emphasis run — it is four literal asterisks and
    // they reach the page (see `parseEmphasis`), so it stays.
    expect(drawableItems(["****"])).toEqual(["****"])
  })

  it("keeps an emphasized item — the markers are not the content", () => {
    expect(drawableItems(["**Ship it**"])).toEqual(["**Ship it**"])
  })

  it("caps at the face's item capacity after the blanks are gone", () => {
    const slide = slideWith([{ type: "bullets", items: ["One", "", "Two", "Three", "Four"] }])
    expect(boundaryBulletItems(slide, 4)).toEqual(["One", "Two", "Three", "Four"])
    expect(boundaryBulletItems(slide, 2)).toEqual(["One", "Two"])
  })

  it("holds no items when the page has no accepted block", () => {
    expect(boundaryBulletItems(slideWith([{ type: "paragraph", text: "P" }]), 3)).toEqual([])
  })
})

/**
 * Every boundary face whose body slot declares an item capacity, rendered at
 * exactly that capacity with blanks mixed in. A face is free to shorten,
 * uppercase or number the lines it draws; what it may not do is answer a
 * blank item by drawing one line fewer than it had room for.
 */
const FACES = Object.values(LAYOUT_REGISTRY).filter((layout) => {
  const body = layout.slots.find((slot) => slot.itemCapacity !== undefined)
  if (!body || body.accepts === "any") return false
  return body.accepts.includes("bullets") && (layout.slideTypes.includes("cover") || layout.slideTypes.includes("ending"))
})

function renderFace(id: string, slide: Slide): string {
  const Face = (COVER_LAYOUTS[id as CoverLayoutId] ?? ENDING_LAYOUTS[id as EndingLayoutId]) as
    | ((props: SvgTemplateProps) => React.ReactElement)
    | undefined
  if (!Face) throw new Error(`no template registered for face "${id}"`)
  const tokens = resolveStyle("consulting")
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface)
  const ctx = buildCtx(tokens, {}, undefined, bg)
  const ir = {
    version: "5",
    filename: "boundary.pptx",
    theme: { id: "consulting" },
    meta: { organization: "云觅咨询" },
    assets: { images: {} },
    slides: [slide],
  } as PptxIR
  return renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <Face ir={ir} slide={slide} index={0} ctx={ctx} />
    </svg>,
  )
}

describe("boundary faces draw the items validate counts", () => {
  it("covers every face that declares an item capacity", () => {
    expect(FACES.length).toBeGreaterThanOrEqual(15)
  })

  it.each(FACES.map((face) => [face.id, face] as const))(
    "%s draws its full capacity when the block also holds blank items",
    (id, layout) => {
      const capacity = layout.slots.find((slot) => slot.itemCapacity !== undefined)!.itemCapacity!
      const sentinels = Array.from({ length: capacity }, (_, i) => `SENTINEL${i + 1}`)
      const items = ["", ...sentinels.flatMap((sentinel) => [sentinel, "   "])]
      const slide = slideWith(
        [{ type: "bullets", items }],
        layout.slideTypes.includes("cover") ? "cover" : "ending",
      )
      const text = parseSvgRoot(renderFace(id, slide)).textContent ?? ""
      for (const sentinel of sentinels) {
        expect(text, `${id} lost ${sentinel}`).toContain(sentinel)
      }
    },
  )
})
