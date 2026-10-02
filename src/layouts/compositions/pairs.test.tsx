// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { markedValue, pairsComposition } from "./pairs"
import { attrs, byText, renderComposition, texts, textOf } from "./__fixtures__/kit"

/** The text column the photo page hands its list, under the bar, above the source. */
const COLUMN = { x: 672, y: 324, w: 512, h: 260 }
const ITEMS = ["广州：14,355 → 12,029 家", "深圳：9,113 → 7,814 家", "20 个城市：全部净减少", "关店数：普遍是新开数的 1.5 到 2 倍"]
const bullets = (items: string[] = ITEMS) => ({ type: "bullets", items })

describe("pairs composition", () => {
  it("rules each pair, label small and muted, value beside it (tea board p04)", () => {
    const { root, tokens } = renderComposition(pairsComposition, [bullets()], { rect: COLUMN })
    expect(root).not.toBeNull()
    expect(Array.from(root!.querySelectorAll("line")).map((line) => attrs(line, ["x1", "y1", "x2"]))).toEqual([
      ["672", "324", "1184"],
      ["672", "388", "1184"],
      ["672", "452", "1184"],
      ["672", "516", "1184"],
      ["672", "580", "1184"],
    ])
    expect(attrs(byText(root!, "广州")!, ["x", "y", "font-size", "fill"])).toEqual(["672", "363", "17", tokens.colors.muted])
    expect(attrs(byText(root!, "14,355 → 12,029 家")!, ["x", "y", "font-size", "fill"])).toEqual(["800", "365", "22", tokens.colors.text])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("lets a long value take a second line and the pair grow with it", () => {
    const { root } = renderComposition(pairsComposition, [bullets(["关店数：普遍是新开数的 1.5 到 2 倍，二十个城市里没有一个例外", "广州：14,355 → 12,029 家"])], {
      rect: COLUMN,
    })
    expect(Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))).toEqual(["324", "418", "482"])
  })

  it.each([
    ["one pair", [bullets(ITEMS.slice(0, 1))]],
    ["seven pairs", [bullets([...ITEMS, ...ITEMS.slice(0, 3)])]],
    ["an item with no label", [bullets([...ITEMS.slice(0, 2), "二十个城市全部净减少"])]],
    ["anything else on the page", [bullets(), { type: "paragraph", text: "补充" }]],
  ])("declines %s", (_name, components) => {
    expect(renderComposition(pairsComposition, components, { rect: COLUMN }).element).toBeNull()
  })

  it("declines a column narrower than 380px or shorter than the list", () => {
    expect(renderComposition(pairsComposition, [bullets()], { rect: { ...COLUMN, w: 379 } }).element).toBeNull()
    expect(renderComposition(pairsComposition, [bullets()], { rect: { ...COLUMN, h: 200 } }).element).toBeNull()
  })
})

/** bulletin's 2026-10 export page (p05): the photo page's text column, one row marked. */
const NOTICE_COLUMN = { x: 624, y: 196, w: 576, h: 444 }
const EXPORTS = [
  "7–8 月新能源出口：**105.8 万辆**，去年同期 41.7 万辆",
  "厂家批发（含出口）：−1.6%",
  "国内零售：−21.4%",
  "8 月新能源占出口：58.4%",
  "1–8 月第一大目的国：巴西，33.7 万辆",
]
const notice = (items: string[] = EXPORTS, rect = NOTICE_COLUMN) =>
  renderComposition(pairsComposition, [bullets(items)], { rect, theme: "bulletin", setting: "notice" })

describe("markedValue", () => {
  it("reads a marked figure and the note after it", () => {
    expect(markedValue("**105.8 万辆**，去年同期 41.7 万辆")).toEqual({ figure: "105.8 万辆", note: "去年同期 41.7 万辆" })
    expect(markedValue("**1.058m**, from 0.417m")).toEqual({ figure: "1.058m", note: "from 0.417m" })
  })

  it("leaves a value with no mark at its start alone", () => {
    expect(markedValue("巴西，33.7 万辆")).toBeNull()
  })
})

describe("pairs composition, notice setting", () => {
  it("sets the label small and muted on the left and the value black and bold beside it", () => {
    const { root, tokens } = notice()
    expect(attrs(byText(root!, "厂家批发（含出口）")!, ["x", "font-size", "fill"])).toEqual(["624", "17", tokens.colors.muted])
    expect(attrs(byText(root!, "−1.6%")!, ["x", "font-size", "font-weight", "fill"])).toEqual(["850", "26", "700", tokens.colors.text])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets the marked value at 40px in primary with its note under it, in a taller row", () => {
    const { root, tokens } = notice()
    expect(attrs(byText(root!, "105.8 万辆")!, ["y", "font-size", "fill"])).toEqual(["249", "40", tokens.colors.primary])
    expect(attrs(byText(root!, "去年同期 41.7 万辆")!, ["y", "font-size", "fill"])).toEqual(["278", "16", tokens.colors.muted])
    const rules = Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))
    expect(rules).toEqual(["300", "372", "444", "516"])
    expect(texts(root!).map(textOf).join(" ")).not.toContain("**")
  })

  it("declines rows the column cannot hold", () => {
    expect(notice(EXPORTS, { ...NOTICE_COLUMN, h: 300 }).element).toBeNull()
  })
})
