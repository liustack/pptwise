// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../render/subset-validate"
import { NoticeSheetContent, layoutDef } from "./content-notice-sheet"
import { NOTICE_HEAD_FIT } from "./notice-shared"
import { attrs, byText, renderFace, sheetSlide, texts, textOf } from "./gauge-sheet/__fixtures__/kit"

const HEADING = "内需缩了两成，增量来自海外，四季度目标按实际走势重定"
/** bulletin's 2026-10 overview (p02). */
const FINDINGS = {
  type: "numbered_cards",
  items: [
    { title: "国内在缩", text: "三季度国内零售同比约降两成。" },
    { title: "增量在海外", text: "7–8 月新能源乘用车出口 105.8 万辆。" },
    { title: "四季度怎么打", text: "目标按实际走势重定。", emphasis: true },
  ],
}
const PROSE = { type: "paragraph", text: "一段说明文字。" }
const QUOTE = { type: "blockquote", text: "三季度没有旺季。" }

const face = (components: unknown[], overrides: Record<string, unknown> = {}) =>
  renderFace(NoticeSheetContent, sheetSlide(components, { heading: HEADING, ...overrides }), "bulletin")

describe("content-notice-sheet", () => {
  it("heads the page with a black bold claim over a grey hairline and a short primary bar", () => {
    const { root, tokens } = face([FINDINGS])
    expect(attrs(byText(root, HEADING)!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual(["80", "134", "34", "700", tokens.colors.text])
    const head = root.querySelector("[data-notice-head]")!
    const rects = Array.from(head.querySelectorAll("rect")).map((rect) => attrs(rect, ["x", "y", "width", "height", "fill"]))
    expect(rects).toEqual([
      ["80", "163", "1120", "1", tokens.colors.border],
      ["80", "162", "96", "3", tokens.colors.primary],
    ])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("bottom-aligns a claim that wraps, so its last line keeps the one-line baseline", () => {
    const long = "国内零售连续三个月同比降两成以上，9 月也没有旺季，四季度的目标需要按照实际走势重新确定"
    const { root } = face([FINDINGS], { heading: long })
    const lines = texts(root.querySelector("[data-notice-head]")!)
    expect(lines.map((line) => line.getAttribute("y"))).toEqual(["88", "134"])
  })

  it("hands a page with a shape the board drew to its composition in the notice setting", () => {
    const { root } = face([FINDINGS])
    expect(root.querySelector("[data-gauge-module]")!.getAttribute("data-gauge-module")).toBe("rows")
    expect(root.querySelector('[data-row-marked="1"]')).not.toBeNull()
  })

  it("sets the source in 14px muted type at the foot", () => {
    const { root, tokens } = face([FINDINGS], { footnote: "来源：乘联分会（2026 年 10 月）" })
    const source = byText(root, "来源：乘联分会（2026 年 10 月）")!
    expect(attrs(source, ["x", "y", "font-size", "fill"])).toEqual(["80", "666", "14", tokens.colors.muted])
  })

  it("draws any other content with the component renderer in the band under the rule, under a standfirst", () => {
    const { root, markup, tokens } = face([PROSE, QUOTE], { subheading: "副标题在规则下面" })
    expect(root.querySelector("[data-gauge-module]")).toBeNull()
    expect(attrs(byText(root, "副标题在规则下面")!, ["x", "y", "font-size", "fill"])).toEqual(["80", "216", "18", tokens.colors.muted])
    expect(root.querySelector("[data-audit-rect]")!.getAttribute("data-audit-rect")).toBe("80,238,1120,422")
    expect(markup).not.toContain("data-face-stepped-aside")
    expect(texts(root).map(textOf).join(" ")).toContain("一段说明文字。")
  })

  it("declares the heading fit it draws and the companions a full-body component may keep", () => {
    expect(layoutDef.headingFit).toEqual(NOTICE_HEAD_FIT)
    expect(layoutDef.fullBodyCompanions).toEqual(["kpi_cards"])
    expect(layoutDef.slots.find((slot) => slot.name === "body")).toEqual({ name: "body", accepts: "any", capacity: 4 })
  })
})
