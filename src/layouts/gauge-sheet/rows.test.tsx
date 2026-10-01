// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { assertSubset } from "../../render/subset-validate"
import { sheetRows, splitRow } from "./rows"
import { gaugeBodyRect } from "../gauge-shared"
import { attrs, byText, renderModule, renderNode, sheetSlide, sheetTestCtx, texts, textOf } from "./__fixtures__/kit"

const ITEMS = ["Missed deliveries: No time windows", "Density: Routes cut for 2022 volume", "Overtime: Shifts planned same day"]
const CLOSE = "None of the three needs a single new van. All three need a better plan."

const boardPage = (items = ITEMS, callout: Record<string, unknown> | null = { type: "callout", variant: "info", text: CLOSE }) =>
  sheetSlide([{ type: "bullets", items }, ...(callout ? [callout] : [])])

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

describe("rows module", () => {
  it("sets the board's numbered rows: muted number, bold primary label, gloss in ink, a rule under each", () => {
    const { root, tokens } = renderModule(sheetRows, boardPage())
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
    const { root, tokens } = renderModule(sheetRows, boardPage())
    const block = root!.querySelector("rect")!
    expect(attrs(block, ["x", "y", "width", "height", "fill"])).toEqual(["96", "488", "1088", "112", tokens.colors.primary])
    const close = byText(root!, CLOSE)!
    expect(attrs(close, ["x", "y", "font-size", "fill"])).toEqual(["144", "554", "28", "#FFFFFF"])
    expect(() => assertSubset(root!)).not.toThrow()
  })

  it("sets a marked run in the closing block bold, with no highlight on the primary block", () => {
    const { root } = renderModule(
      sheetRows,
      boardPage(ITEMS, { type: "callout", variant: "tip", text: "All three need **a better plan**." }),
    )
    const bold = Array.from(root!.querySelectorAll("tspan")).find((tspan) => tspan.textContent === "a better plan")!
    expect(bold.getAttribute("font-weight")).toBe("700")
    expect(root!.querySelector("[data-emphasis-pad]")).toBeNull()
  })

  it("lays the highlighter under a marked run in a gloss", () => {
    const { root, tokens } = renderModule(sheetRows, boardPage(["Density: Routes cut for **2022 volume**", ...ITEMS.slice(1)]))
    const pads = Array.from(root!.querySelectorAll("[data-emphasis-pad]"))
    expect(pads.length).toBe(1)
    expect(pads[0]!.getAttribute("fill")).toBe(tokens.colors.accent)
  })

  it("closes on the last rule when the page has no callout", () => {
    const { root } = renderModule(sheetRows, boardPage(ITEMS, null))
    expect(root!.querySelector("rect")).toBeNull()
    expect(texts(root!).length).toBe(9)
  })

  it("runs a row with no label across the label and gloss columns", () => {
    const { root } = renderModule(sheetRows, boardPage(["Routes are cut once a year", ...ITEMS.slice(1)]))
    expect(attrs(byText(root!, "Routes are cut once a year")!, ["x", "font-weight"])).toEqual(["152", null])
  })

  it("lets a long gloss take a second line and moves the rows below it down", () => {
    const long = "Density: Routes were cut for the 2022 volume and have not been re-cut since, so every van now drives further for each stop"
    const { root } = renderModule(sheetRows, boardPage([ITEMS[0]!, long, ITEMS[2]!], null))
    const rules = Array.from(root!.querySelectorAll("line")).map((line) => line.getAttribute("y1"))
    expect(rules).toEqual(["268", "388", "476"])
    expect(byText(root!, "03")!.getAttribute("y")).toBe("438")
  })

  it.each([
    ["one item", boardPage(["Only one"], null)],
    ["six items", boardPage(["a: b", "c: d", "e: f", "g: h", "i: j", "k: l"], null)],
    ["a warning callout", boardPage(ITEMS, { type: "callout", variant: "warn", text: CLOSE })],
    ["a callout with an icon", boardPage(ITEMS, { type: "callout", variant: "info", text: CLOSE, icon: "target" })],
    ["a third component", sheetSlide([{ type: "bullets", items: ITEMS }, { type: "callout", variant: "info", text: CLOSE }, { type: "paragraph", text: "More." }])],
    ["a paragraph in place of the callout", sheetSlide([{ type: "bullets", items: ITEMS }, { type: "paragraph", text: CLOSE }])],
    ["a gloss past two lines", boardPage([ITEMS[0]!, `Density: ${"Routes were cut for the 2022 volume and never re-cut. ".repeat(4)}`], null)],
  ])("declines %s", (_name, slide) => {
    expect(renderModule(sheetRows, slide).element).toBeNull()
  })

  it("declines rows that do not fit above the source line", () => {
    const tall = Array.from({ length: 5 }, (_, i) => `Driver ${i}: ${"Routes were cut for an older volume and never re-cut. ".repeat(2)}`)
    expect(renderModule(sheetRows, sheetSlide([{ type: "bullets", items: tall }], { footnote: "Source" })).element).toBeNull()
  })

  it("prints every item it was given", () => {
    const { root } = renderModule(sheetRows, boardPage())
    const printed = texts(root!).map(textOf).join(" ")
    for (const item of ITEMS) for (const part of item.split(": ")) expect(printed).toContain(part)
    expect(printed).toContain(CLOSE)
  })

  it("tags the list and the closing block as two components, so each enters on its own", () => {
    const slide = boardPage()
    const { ctx } = sheetTestCtx()
    const tagged = { ...ctx, blockIndex: new Map(slide.components.map((component, i) => [component, i])) }
    const { root } = renderNode(sheetRows({ slide, ctx: tagged, rect: gaugeBodyRect(slide) }))
    const groups = Array.from(root.querySelectorAll("[data-blk]"))
    expect(groups.map((g) => g.getAttribute("data-blk"))).toEqual(["0", "1"])
    expect(groups[0]!.textContent).toContain("Missed deliveries")
    expect(groups[1]!.textContent).toContain(CLOSE)
  })

  it("adds no tag when animation is off", () => {
    expect(renderModule(sheetRows, boardPage()).root!.querySelector("[data-blk]")).toBeNull()
  })
})
