import { beforeAll, describe, expect, it } from "vitest"
import { renderSlideSvg, validateIr } from "@/api"
import type { PptxIR, Slide } from "@/ir"
import { prefixOf } from "../layouts/text-room"
import { installNodePlatform } from "../platform/node"
import { getThemeDefinition } from "../themes/definitions"
import { cutLines } from "./cut-fields"
import { resolveEffectiveFace } from "./layout-selection"
import { parseSvgRoot } from "./serialize"

/**
 * A cover or chapter over a photograph is drawn by the shared photo page
 * (`ImageCoverPage`), not by its menu face. That page fits its title and
 * subheading on two lines each, shrinking them toward the meta floor and
 * cutting past it, and it cut them with no mark: the text was gone and
 * neither validate, the audit nor the export knew. It now marks the cut,
 * and validate asks its fit before anything is drawn.
 */

beforeAll(() => {
  installNodePlatform()
})

const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

const LONG = "同店增速回到正区间而且这一次不是靠促销拉起来的是复购率和客单价一起抬上来的结果我们建议把明年的第一目标定为同店增长并为此调整门店考核与新品节奏试点覆盖华东三个区域共四十二家门店再往后看还要把会员体系和供应链一起改造".repeat(2)

function photoPage(type: "cover" | "chapter", fields: { heading: string; subheading?: string }): PptxIR {
  return {
    version: "5",
    filename: "photo.pptx",
    theme: { id: "brief" },
    meta: {},
    assets: { images: { hero: { src: PIXEL } } },
    slides: [{ type, ...fields, background: { kind: "asset", asset_id: "hero" }, components: [] } as Slide],
  } as PptxIR
}

/** The fields the drawing cut, read the way the audit reads them. */
function cut(ir: PptxIR): string[] {
  return cutLines(parseSvgRoot(renderSlideSvg(ir, 0)), ir.slides[0]!).flatMap((line) => (line.field ? [line.field] : []))
}

describe("a cover or chapter over a photograph", () => {
  it("is drawn by the shared photo page", () => {
    const ir = photoPage("cover", { heading: "x" })
    expect(resolveEffectiveFace(ir, ir.slides[0]!, getThemeDefinition("brief")).route).toBe("image-cover")
  })

  for (const type of ["cover", "chapter"] as const) {
    it(`${type}: marks a heading it cuts, and validate refuses it quoting what fits`, () => {
      const ir = photoPage(type, { heading: LONG })
      expect(cut(ir)).toEqual(["heading"])
      const result = validateIr(ir)
      expect(result.errors).toHaveLength(1)
      const said = new RegExp(`^a ${type} over a photograph holds the first (\\d+) \\("[^"]+"\\) of this ${type} heading's ${Array.from(LONG).length} characters, so the page would cut the rest off\\. Shorten the heading, or move part of it into the subheading\\.$`).exec(result.errors[0]!.message)
      expect(said, result.errors[0]!.message).not.toBeNull()
      const held = Number(said![1])
      const fits = photoPage(type, { heading: prefixOf(LONG, held) })
      expect(validateIr(fits).ok).toBe(true)
      expect(cut(fits)).toEqual([])
      expect(cut(photoPage(type, { heading: prefixOf(LONG, held + 1) }))).toEqual(["heading"])
    })

    it(`${type}: marks a subheading it cuts, and validate refuses it quoting what fits`, () => {
      const ir = photoPage(type, { heading: "季度复盘", subheading: LONG })
      expect(cut(ir)).toEqual(["subheading"])
      const result = validateIr(ir)
      expect(result.errors).toHaveLength(1)
      const said = new RegExp(`^a ${type} over a photograph holds the first (\\d+) \\("[^"]+"\\) of this ${type} subheading's ${Array.from(LONG).length} characters, so the page would cut the rest off\\.`).exec(result.errors[0]!.message)
      expect(said, result.errors[0]!.message).not.toBeNull()
      const held = Number(said![1])
      expect(validateIr(photoPage(type, { heading: "季度复盘", subheading: prefixOf(LONG, held) })).ok).toBe(true)
      expect(cut(photoPage(type, { heading: "季度复盘", subheading: prefixOf(LONG, held + 1) }))).toEqual(["subheading"])
    })
  }
})
