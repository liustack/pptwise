// @vitest-environment node
//
// A theme copy that keeps a built-in id reaches that theme's own skin of a
// shared face (`sparseFace`, keyed by theme id), even for a face the
// built-in menu never offers. No built-in menu offers `one-evidence`, so its
// eight skins were reached only that way, and none of them held the face
// discipline: a subheading on a page with no evidence was set at full size
// whatever its length and ran off the page, one beside an exhibit was cut to
// the column with no mark, and lecture's skin left it off the page entirely.
// The source line had the same two gaps. Each authored line now either
// stands whole on the page or carries the mark that says it was cut.
import { beforeAll, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { installNodePlatform } from "../../platform/node"
import { BUILTIN_THEME_FILES, type CanonicalThemeId } from "../../themes"
import { compileBuiltinTheme } from "../../themes/definitions"
import { slideToSvgMarkup } from "../../render/render-slide"
import { parseSvgRoot } from "../../render/serialize"
import { cutLines } from "../../render/cut-fields"
import { stripEmphasis } from "../../render/emphasis"
import { auditSvgMarkup } from "../../audit/svg-audit"
import { FACES } from "./registry"

beforeAll(() => {
  installNodePlatform()
})

const SKINNED = Object.entries(FACES)
  .filter(([, faces]) => faces?.["one-evidence"] !== undefined)
  .map(([id]) => id as CanonicalThemeId)

const LONG_SUB =
  "试点覆盖华东三个区域共四十二家门店，统计口径为二〇二五年第三季度至二〇二六年第二季度的同店销售额与客单价，剔除新开店与闭店影响"
const LONG_SOURCE =
  "来源：国家统计局《2025 年全国规模以上工业产能利用率》，中国机械工业联合会《2025 年机械工业经济运行报告》，公司财务部门季度经营数据，作者整理与测算"

const CHART = {
  type: "chart",
  chart_type: "bar",
  series: [{ name: "同店增速", data: [{ x: "Q1", y: 3 }, { x: "Q2", y: 5 }, { x: "Q3", y: 4 }] }],
}

/** The built-in file under its own id, with `evidence` drawn by `one-evidence`: a workspace copy of the theme. */
function copyOf(id: CanonicalThemeId) {
  const file = BUILTIN_THEME_FILES[id]
  return compileBuiltinTheme({
    ...file,
    menu: { ...file.menu, content: { ...file.menu.content, evidence: { face: "one-evidence" } } },
  })
}

function deck(id: string, slide: Slide): PptxIR {
  return { version: "5", filename: "x.pptx", theme: { id }, meta: {}, assets: { images: {} }, slides: [slide] } as unknown as PptxIR
}

const plain = (text: string) => stripEmphasis(text).replace(/\s+/gu, "")

const PAGES: { name: string; slide: Slide }[] = [
  {
    name: "a long subheading with no exhibit",
    slide: { type: "content", kind: "evidence", heading: "同店增速回到正区间", subheading: LONG_SUB, components: [] } as unknown as Slide,
  },
  {
    name: "a long subheading beside an exhibit",
    slide: { type: "content", kind: "evidence", heading: "同店增速回到正区间", subheading: LONG_SUB, components: [CHART] } as unknown as Slide,
  },
  {
    name: "a short subheading beside an exhibit",
    slide: { type: "content", kind: "evidence", heading: "同店增速回到正区间", subheading: "华东三区试点", components: [CHART] } as unknown as Slide,
  },
  {
    name: "a long source with no exhibit",
    slide: { type: "content", kind: "evidence", heading: "同店增速回到正区间", footnote: LONG_SOURCE, components: [] } as unknown as Slide,
  },
  {
    name: "a long source beside an exhibit",
    slide: { type: "content", kind: "evidence", heading: "同店增速回到正区间", footnote: LONG_SOURCE, components: [CHART] } as unknown as Slide,
  },
]

describe("one-evidence on a theme copy that keeps a built-in id", () => {
  it("reaches a skin on eight themes", () => {
    expect(SKINNED.sort()).toEqual(["almanac", "brief", "lecture", "museum", "rally", "swiss", "terminal", "vermilion"])
  })

  for (const id of SKINNED) {
    const theme = copyOf(id)
    for (const { name, slide } of PAGES) {
      it(`${id}: ${name} stands whole on the page or is marked cut`, () => {
        const markup = slideToSvgMarkup(deck(id, slide), slide, 0, theme)
        expect(auditSvgMarkup(markup)).toEqual([])
        const root = parseSvgRoot(markup)
        const onPage = plain(root.textContent ?? "")
        const cut = new Set(cutLines(root, slide).map((line) => line.field))
        for (const field of ["subheading", "footnote"] as const) {
          const text = slide[field]
          if (text === undefined) continue
          expect(onPage.includes(plain(text)) || cut.has(field), field).toBe(true)
        }
      })
    }
  }
})
