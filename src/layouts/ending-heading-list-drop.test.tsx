// @vitest-environment node
//
// Seven ending faces set a heading written as a list (a line per break, or
// 「一、」/"1." numbering) in their fixed list rows. validate refuses a
// heading with more lines than rows, but a deck that skipped validate, or
// an export run with --allow-dropped-content, got the first lines drawn
// and the rest gone with no mark, so neither the export gate nor audit
// could say a word about them.
import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import { auditDeck } from "@/audit/deck-audit"
import type { PptxIR } from "@/ir"
import { installNodePlatform } from "@/platform/node"
import { generatePptxBlob } from "@/pptx/generate"
import { __resetRegisteredThemes, getThemeDefinition } from "../themes/definitions"
import { registerTestTheme } from "../themes/test-fixtures"
import { parseSvgRoot } from "../render/serialize"

beforeAll(() => {
  installNodePlatform()
})

afterEach(() => {
  __resetRegisteredThemes()
})

/** Each face and the rows it sets a heading list in. */
const FACES = [
  ["defense-close-ending", 3],
  ["homework-close-ending", 3],
  ["next-lecture-ending", 2],
  ["decision-close-ending", 2],
  ["action-pad-ending", 3],
  ["care-plan-ending", 3],
  ["reminder-list-ending", 3],
] as const

const LINES = ["一、鹦鹉螺要点", "二、琥珀要点", "三、珊瑚要点", "四、海獭要点", "五、鲸鱼要点"]

let serial = 0

function deck(face: string, lines: number): PptxIR {
  const themeId = registerTestTheme(`heading-list-${serial++}`, "brief", { ending: face })
  return {
    version: "5",
    filename: "heading-list.pptx",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: [{ type: "ending", heading: LINES.slice(0, lines).join("\n"), components: [] }],
  } as unknown as PptxIR
}

function drops(markup: string) {
  return Array.from(parseSvgRoot(markup).querySelectorAll("[data-dropped]")).map((el) => [el.getAttribute("data-dropped"), el.getAttribute("data-dropped-kind")])
}

describe("an ending face that sets the heading as its list declares the lines it has no row for", () => {
  for (const [face, rows] of FACES) {
    it(`${face}: a heading of ${rows} lines fills the rows with nothing declared`, () => {
      const v = validateIr(deck(face, rows))
      expect(v.errors).toEqual([])
      const markup = renderSlideSvg(v.ir!, 0)
      expect(drops(markup)).toEqual([])
      const text = parseSvgRoot(markup).textContent ?? ""
      for (const line of LINES.slice(0, rows)) expect(text).toContain(line.slice(2))
    })

    it(`${face}: the lines past the last row are declared as items`, () => {
      const ir = deck(face, rows + 2)
      expect(validateIr(ir).errors.map((e) => e.path)).toEqual(["slides.0.heading"])
      const markup = renderSlideSvg(ir, 0)
      expect(drops(markup)).toEqual([["2", "item"]])
      const text = parseSvgRoot(markup).textContent ?? ""
      for (const line of LINES.slice(rows, rows + 2)) expect(text).not.toContain(line.slice(2))
    })

    it(`${face}: audit and the export gate name what was lost`, async () => {
      const ir = deck(face, rows + 1)
      const theme = getThemeDefinition(ir.theme.id)
      const found = auditDeck(ir, { theme }).findings.filter((f) => f.code === "content-dropped")
      expect(found.map((f) => f.detail)).toEqual([{ count: 1, kind: "item" }])
      expect(found[0]!.message).toMatch(/^1 item is missing/)
      await expect(generatePptxBlob(ir, { theme })).rejects.toThrow("page 1: 1 item")
    })
  }
})
