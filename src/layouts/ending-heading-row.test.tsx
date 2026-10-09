// @vitest-environment node
//
// Four ending faces set their list in fixed rows: a heading written as the
// list fills them, and on a page with bullets the heading takes the first
// row and the bullets the rows after it. They used to read such a heading
// for its script only and draw none of it, with no mark and validate
// passing the page.
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { parseSvgRoot } from "../render/serialize"
import { getLayout } from "./registry"

beforeAll(() => {
  installNodePlatform()
})

afterEach(() => {
  __resetRegisteredThemes()
})

const FACES = [
  { face: "defense-close-ending", rows: ["240", "316", "392"] },
  { face: "homework-close-ending", rows: ["256", "336", "416"] },
  { face: "next-lecture-ending", rows: ["270", "350"] },
  { face: "decision-close-ending", rows: ["280", "360"] },
] as const

const HEADING = "鹦鹉螺结论"
const ITEMS = ["第一条琥珀要点", "第二条珊瑚要点", "第三条海獭要点"]

let serial = 0

function deck(face: string, slide: Record<string, unknown>): PptxIR {
  const themeId = registerTestTheme(`heading-row-${serial++}`, "brief", { ending: face })
  return {
    version: "5",
    filename: "heading-row.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: [{ type: "ending", components: [], ...slide }],
  } as unknown as PptxIR
}

/** Each drawn line's text by its baseline, top to bottom. */
function rows(markup: string): Map<string, string> {
  const out = new Map<string, string>()
  for (const el of Array.from(parseSvgRoot(markup).querySelectorAll("text"))) out.set(el.getAttribute("y")!, el.textContent ?? "")
  return out
}

function dropped(markup: string): { count: string | null; kind: string | null }[] {
  return Array.from(parseSvgRoot(markup).querySelectorAll("[data-dropped]")).map((el) => ({
    count: el.getAttribute("data-dropped"),
    kind: el.getAttribute("data-dropped-kind"),
  }))
}

describe("an ending face that sets its list in rows sets the heading in the first one beside bullets", () => {
  for (const { face, rows: ys } of FACES) {
    const room = ys.length - 1

    it(`${face}: the heading takes the first row and the bullets the rows after it`, () => {
      const v = validateIr(deck(face, { heading: HEADING, components: [{ type: "bullets", items: ITEMS.slice(0, room) }] }))
      expect(v.errors).toEqual([])
      const markup = renderSlideSvg(v.ir!, 0)
      const drawn = rows(markup)
      expect(ys.map((y) => drawn.get(y))).toEqual([HEADING, ...ITEMS.slice(0, room)])
      expect(dropped(markup)).toEqual([])
    })

    it(`${face}: validate holds the bullets to the rows the heading leaves`, () => {
      const v = validateIr(deck(face, { heading: HEADING, components: [{ type: "bullets", items: ITEMS.slice(0, ys.length) }] }))
      expect(v.errors.map((e) => e.path)).toEqual(["slides.0.components"])
      expect(v.errors[0]!.message).toContain(`draws at most ${room} item`)
      expect(v.errors[0]!.message).toContain("sets the heading in the list's first row")
      expect(v.errors[0]!.message).toContain("remove the heading")
    })

    it(`${face}: a page validate refused declares the item it had no row for`, () => {
      const markup = renderSlideSvg(deck(face, { heading: HEADING, components: [{ type: "bullets", items: ITEMS.slice(0, ys.length) }] }), 0)
      expect(rows(markup).get(ys[0])).toBe(HEADING)
      expect(dropped(markup)).toEqual([{ count: "1", kind: "item" }])
    })

    it(`${face}: without a heading the bullets fill every row`, () => {
      const v = validateIr(deck(face, { subheading: "松柏落款", components: [{ type: "bullets", items: ITEMS.slice(0, ys.length) }] }))
      expect(v.errors).toEqual([])
      const drawn = rows(renderSlideSvg(v.ir!, 0))
      expect(ys.map((y) => drawn.get(y))).toEqual(ITEMS.slice(0, ys.length))
    })

    it(`${face}: validate refuses a heading beside bullets that its row would cut`, () => {
      const v = validateIr(deck(face, { heading: "鹦鹉螺".repeat(30), components: [{ type: "bullets", items: ITEMS.slice(0, 1) }] }))
      expect(v.errors.map((e) => e.path)).toEqual(["slides.0.heading"])
      expect(v.errors[0]!.message).toContain(`face "${face}"`)
    })

    it(`${face}: declares the row it gives the heading`, () => {
      expect(getLayout(face)!.slots.find((slot) => slot.name === "body")?.headingRow).toBe(true)
    })
  }
})

describe("action-pad-ending has no place for a subheading beside bullets", () => {
  it("refuses one there, and says where the words go", () => {
    const v = validateIr(deck("action-pad-ending", { heading: "本周定人定责", subheading: "鹈鹕副题", components: [{ type: "bullets", items: ITEMS }] }))
    expect(v.errors.map((e) => e.path)).toEqual(["slides.0.subheading"])
    expect(v.errors[0]!.message).toContain("on a page with bullets")
    expect(v.errors[0]!.message).toContain("call to action")
  })

  it("draws one as the call to action on a page whose heading is the list", () => {
    const v = validateIr(deck("action-pad-ending", { heading: ITEMS.join("\n"), subheading: "鹈鹕副题" }))
    expect(v.errors).toEqual([])
    expect(renderSlideSvg(v.ir!, 0)).toContain("鹈鹕副题")
  })
})
