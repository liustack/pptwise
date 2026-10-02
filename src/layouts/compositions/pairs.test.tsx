// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { pairsComposition } from "./pairs"
import { attrs, byText, renderComposition } from "./__fixtures__/kit"

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
