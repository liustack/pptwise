// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { rowsComposition, splitRow } from "./rows"
import { attrs, BAND, BAND_ABOVE_SOURCE, byText, NOTICE_BAND, renderComposition, renderNode, testCtx, texts, textOf } from "./__fixtures__/kit"

const ITEMS = ["Missed deliveries: No time windows", "Density: Routes cut for 2022 volume", "Overtime: Shifts planned same day"]
const CLOSE = "None of the three needs a single new van. All three need a better plan."

const boardPage = (items = ITEMS, callout: Record<string, unknown> | null = { type: "callout", variant: "info", text: CLOSE }) => [
  { type: "bullets", items },
  ...(callout ? [callout] : []),
]

describe("splitRow", () => {
  it("splits a label from its gloss at the first colon followed by a space", () => {
    expect(splitRow("Missed deliveries: No time windows")).toEqual({ label: "Missed deliveries", gloss: "No time windows" })
  })

  it("splits at a full-width colon with or without a space", () => {
    expect(splitRow("渠道：结构收敛")).toEqual({ label: "渠道", gloss: "结构收敛" })
  })

  it("keeps a time or a ratio inside its sentence", () => {
    expect(splitRow("Stand-up at 10:30 every day")).toEqual({ gloss: "Stand-up at 10:30 every day" })
    expect(splitRow("Contrast holds at 3:1")).toEqual({ gloss: "Contrast holds at 3:1" })
  })

  it("leaves a line whose lead runs past 24 characters whole", () => {
    const line = "A label far too long to be a label: and its gloss"
    expect(splitRow(line)).toEqual({ gloss: line })
  })
})

describe("rows composition", () => {
  it("sets the board's numbered rows: muted number, bold primary label, gloss in ink, a rule under each", () => {
    const { root, tokens } = renderComposition(rowsComposition, boardPage())
    expect(root).not.toBeNull()
    const numbers = ["01", "02", "03"].map((n) => byText(root!, n)!)
    expect(numbers.map((el) => attrs(el, ["x", "y", "font-size", "fill"]))).toEqual([
      ["96", "230", "18", tokens.colors.muted],
      ["96", "318", "18", tokens.colors.muted],
      ["96", "406", "18", tokens.colors.muted],
    ])
    const label = byText(root!, "Missed deliveries")!
    expect(attrs(label, ["x", "y", "font-size", "font-weight", "fill"])).toEqual(["152", "233", "26", "700", tokens.colors.primary])
    const gloss = byText(root!, "No time windows")!
    expect(attrs(gloss, ["x", "y", "font-size", "fill"])).toEqual(["520", "233", "26", tokens.colors.text])
    const rules = Array.from(root!.querySelectorAll("line"))
    expect(rules.map((line) => attrs(line, ["x1", "y1", "x2", "stroke"]))).toEqual([
      ["96", "268", "1184", tokens.colors.border],
      ["96", "356", "1184", tokens.colors.border],
      ["96", "444", "1184", tokens.colors.border],
    ])
  })

  it("reverses the closing line out of a full-width primary block", () => {
    const { root, tokens } = renderComposition(rowsComposition, boardPage())
    const block = root!.querySelector("rect")!
    expect(attrs(block, ["x", "y", "width", "height", "fill"])).toEqual(["96", "488", "1088", "112", tokens.colors.primary])
    const close = byText(root!, CLOSE)!
    expect(attrs(close, ["x", "y", "font-size", "fill"])).toEqual(["144", "554", "28", "#FFFFFF"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets a marked run in the closing block bold, with no highlight on the primary block", () => {
    const { root } = renderComposition(
      rowsComposition,
      boardPage(ITEMS, { type: "callout", variant: "tip", text: "All three need **a better plan**." }),
    )
    const bold = Array.from(root!.querySelectorAll("tspan")).find((tspan) => tspan.textContent === "a better plan")!
    expect(bold.getAttribute("font-weight")).toBe("700")
    expect(root!.querySelector("[data-emphasis-pad]")).toBeNull()
  })

  it("lays the highlighter under a marked run in a gloss", () => {
    const { root, tokens } = renderComposition(rowsComposition, boardPage(["Density: Routes cut for **2022 volume**", ...ITEMS.slice(1)]))
    const pads = Array.from(root!.querySelectorAll("[data-emphasis-pad]"))
    expect(pads.length).toBe(1)
    expect(pads[0]!.getAttribute("fill")).toBe(tokens.colors.accent)
  })

  it("closes on the last rule when the page has no callout", () => {
    const { root } = renderComposition(rowsComposition, boardPage(ITEMS, null))
    expect(root!.querySelector("rect")).toBeNull()
    expect(texts(root!).length).toBe(9)
  })

  it("runs a row with no label across the label and gloss columns", () => {
    const { root } = renderComposition(rowsComposition, boardPage(["Routes are cut once a year", ...ITEMS.slice(1)]))
    expect(attrs(byText(root!, "Routes are cut once a year")!, ["x", "font-weight"])).toEqual(["152", null])
  })

  it("lets a long gloss take a second line and moves the rows below it down", () => {
    const long = "Density: Routes were cut for the 2022 volume and have not been re-cut since, so every van now drives further for each stop"
    const { root } = renderComposition(rowsComposition, boardPage([ITEMS[0]!, long, ITEMS[2]!], null))
    const rules = Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))
    expect(rules).toEqual(["268", "388", "476"])
    expect(byText(root!, "03")!.getAttribute("y")).toBe("438")
  })

  it.each([
    ["one item", boardPage(["Only one"], null)],
    ["six items", boardPage(["a: b", "c: d", "e: f", "g: h", "i: j", "k: l"], null)],
    ["a warning callout", boardPage(ITEMS, { type: "callout", variant: "warn", text: CLOSE })],
    ["a callout with an icon", boardPage(ITEMS, { type: "callout", variant: "info", text: CLOSE, icon: "target" })],
    ["a third component", [{ type: "bullets", items: ITEMS }, { type: "callout", variant: "info", text: CLOSE }, { type: "paragraph", text: "More." }]],
    ["a paragraph in place of the callout", [{ type: "bullets", items: ITEMS }, { type: "paragraph", text: CLOSE }]],
    ["a gloss past two lines", boardPage([ITEMS[0]!, `Density: ${"Routes were cut for the 2022 volume and never re-cut. ".repeat(4)}`], null)],
  ])("declines %s", (_name, components) => {
    expect(renderComposition(rowsComposition, components).element).toBeNull()
  })

  it("declines rows that do not fit the band", () => {
    const tall = Array.from({ length: 5 }, (_, i) => `Driver ${i}: ${"Routes were cut for an older volume and never re-cut. ".repeat(2)}`)
    expect(renderComposition(rowsComposition, [{ type: "bullets", items: tall }], { rect: BAND_ABOVE_SOURCE }).element).toBeNull()
  })

  it("declines a band too narrow for the label and gloss columns", () => {
    expect(renderComposition(rowsComposition, boardPage(), { rect: { ...BAND, w: 783 } }).element).toBeNull()
    expect(renderComposition(rowsComposition, boardPage(), { rect: { ...BAND, w: 784 } }).element).not.toBeNull()
  })

  it("prints every item it was given", () => {
    const { root } = renderComposition(rowsComposition, boardPage())
    const printed = texts(root!).map(textOf).join(" ")
    for (const item of ITEMS) for (const part of item.split(": ")) expect(printed).toContain(part)
    expect(printed).toContain(CLOSE)
  })

  it("tags the list and the closing block as two components, so each enters on its own", () => {
    const components = boardPage() as unknown as Parameters<typeof rowsComposition>[0]["components"]
    const { ctx } = testCtx()
    const tagged = { ...ctx, blockIndex: new Map(components.map((component, i) => [component, i])) }
    const { root } = renderNode(rowsComposition({ components, ctx: tagged, rect: BAND }))
    const groups = Array.from(root.querySelectorAll("[data-blk]"))
    expect(groups.map((g) => g.getAttribute("data-blk"))).toEqual(["0", "1"])
    expect(groups[0]!.textContent).toContain("Missed deliveries")
    expect(groups[1]!.textContent).toContain(CLOSE)
  })

  it("adds no tag when animation is off", () => {
    expect(renderComposition(rowsComposition, boardPage()).root!.querySelector("[data-blk]")).toBeNull()
  })
})

/** bulletin's 2026-10 overview (p02): four findings, the last one the page's answer. */
const findings = (marked: number | null = 3, overrides: Record<string, unknown> = {}) => ({
  type: "numbered_cards",
  items: [
    { title: "国内在缩", text: "三季度国内零售同比约降两成，9 月没有旺季。" },
    { title: "增量在海外", text: "7–8 月新能源乘用车出口 105.8 万辆，是去年同期的 2.5 倍。" },
    { title: "份额在挪，价格转暗", text: "比亚迪国内份额约少 4.5 个点，新势力多了 5.5 个点。" },
    { title: "四季度怎么打", text: "目标按实际走势重定，预算押在补贴窗口。" },
  ].map((item, i) => (i === marked ? { ...item, emphasis: true } : item)),
  ...overrides,
})
const notice = (components: unknown[], rect = NOTICE_BAND) =>
  renderComposition(rowsComposition, components, { rect, theme: "bulletin", setting: "notice" })

describe("rows composition, notice setting", () => {
  it("sets each finding in a 104px band: the number bold in primary, the label black and bold, the gloss beside it", () => {
    const { root, tokens } = notice([findings()])
    expect(attrs(byText(root!, "01")!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual(["80", "261", "26", "700", tokens.colors.primary])
    expect(attrs(byText(root!, "国内在缩")!, ["x", "y", "font-size", "font-weight", "fill"])).toEqual(["184", "259", "22", "700", tokens.colors.text])
    expect(attrs(byText(root!, "三季度国内零售同比约降两成，9 月没有旺季。")!, ["x", "font-size"])).toEqual(["480", "19"])
    const rules = Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))
    expect(rules).toEqual(["300", "404"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("reverses the marked finding out of a primary block 8px clear of the row above, with no rule over it", () => {
    const { root, tokens } = notice([findings()])
    const block = root!.querySelector('[data-row-marked="1"] rect')!
    expect(attrs(block, ["x", "y", "width", "height", "fill"])).toEqual(["80", "524", "1120", "96", tokens.colors.primary])
    expect(attrs(byText(root!, "04")!, ["x", "fill"])).toEqual(["108", "#FFFFFF"])
    expect(byText(root!, "四季度怎么打")!.getAttribute("fill")).toBe("#FFFFFF")
  })

  it("paints a marked run inside a finding instead of printing its asterisks", () => {
    const cards = findings(null)
    cards.items[1] = { title: "增量在海外", text: "出口 **105.8 万辆**，是去年同期的 2.5 倍。" }
    const { root } = notice([cards])
    expect(texts(root!).map(textOf).join(" ")).not.toContain("**")
    expect(Array.from(root!.querySelectorAll("tspan")).some((tspan) => tspan.textContent === "105.8 万辆")).toBe(true)
  })

  it("takes bullets split at their colons, and a closing panel under the rows", () => {
    const { root } = notice([{ type: "bullets", items: ["国内：在缩", "海外：在涨", "价格：转暗"] }, { type: "callout", variant: "info", text: "四季度按实际走势重定目标" }])
    expect(byText(root!, "在涨")!.getAttribute("x")).toBe("480")
    expect(root!.querySelector('[data-closing="notice"]')).not.toBeNull()
  })

  it("declines a card with a sub line, more than five rows, and rows the band cannot hold at 84px", () => {
    const withSub = findings(null)
    expect(notice([{ ...withSub, items: [{ ...withSub.items[0]!, sub: "国内" }, ...withSub.items.slice(1)] }]).element).toBeNull()
    // A card's icon has no place in these rows: the ordinary cards draw it.
    expect(notice([{ ...withSub, items: [{ ...withSub.items[0]!, icon: "pill" }, ...withSub.items.slice(1)] }]).element).toBeNull()
    const six = { type: "numbered_cards", items: Array.from({ length: 6 }, (_, i) => ({ title: `第 ${i + 1} 条`, text: "说明" })) }
    expect(notice([six]).element).toBeNull()
    expect(notice([findings()], { ...NOTICE_BAND, h: 320 }).element).toBeNull()
  })
})
