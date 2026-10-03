// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx, resolveBackgroundHex } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { emphasisRunInk } from "../render/emphasis"
import { CloseWordEnding, layoutDef } from "./ending-close-word-ending"
import type { PptxIR, Slide } from "@/ir"

/** ledger's 2026-10 ending (p15). */
function slide(extras: Partial<Slide> = {}): Slide {
  return {
    type: "ending",
    kicker: "请投委会定",
    heading: "向**上游和电力**倾斜，云厂商只留回款快的",
    subheading: "接下来盯三个信号",
    components: [
      {
        type: "bullets",
        items: ["融资：发债和增发的成本有没有跳升", "客户：OpenAI、Anthropic 的收入能否撑起采购承诺", "电力：PJM 和德州的并网什么时候松动"],
      },
    ],
    footnote: "本材料不构成投资建议",
    ...extras,
  } as Slide
}

function renderEnding(themeId: string, s: Slide = slide()) {
  const tokens = resolveStyle(themeId)
  const ctx = buildCtx(tokens, {}, undefined, resolveBackgroundHex(tokens.defaultBackgrounds.ending, tokens.colors.surface))
  const ir = { version: "5", filename: "x.pptx", theme: { id: themeId }, meta: {}, assets: { images: {} }, slides: [s] } as unknown as PptxIR
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      <CloseWordEnding ir={ir} slide={s} index={0} ctx={ctx} />
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup), tokens, ctx }
}

const byText = (root: Element, text: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)
const attrs = (el: Element | undefined, names: string[]) => names.map((name) => el?.getAttribute(name) ?? null)

describe("ending-close-word-ending: ledger's 2026-10 board", () => {
  it("sets the kicker, the decision at 52px with its marked words in the emphasis ink, a hairline and the lead-in", () => {
    const { root, tokens, ctx } = renderEnding("ledger")
    expect(attrs(byText(root, "请投委会定"), ["x", "y", "font-size", "fill"])).toEqual(["64", "137", "15", tokens.colors.accent])
    const title = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("上游和电力"))!
    expect(attrs(title, ["x", "y", "font-size", "font-family"])).toEqual(["64", "285", "52", ctx.fonts.heading])
    const run = Array.from(title.querySelectorAll("tspan")).find((t) => t.textContent === "上游和电力")!
    expect(run.getAttribute("fill")).toBe(emphasisRunInk(ctx.colors))
    const rule = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("y") === "340")!
    expect(attrs(rule, ["x", "width", "height"])).toEqual(["64", "1152", "1"])
    expect(attrs(byText(root, "接下来盯三个信号"), ["x", "y", "font-size"])).toEqual(["64", "377", "14"])
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("sets the bullets as numbered panels, each label split from its gloss at the colon", () => {
    const { root, tokens } = renderEnding("ledger")
    const steps = Array.from(root.querySelectorAll("[data-next-step]"))
    expect(steps).toHaveLength(3)
    expect(steps.map((step) => step.querySelector("rect")!.getAttribute("x"))).toEqual(["64.5", "448.5", "832.5"])
    expect(attrs(byText(root, "01"), ["x", "font-size", "fill"])).toEqual(["86", "14", tokens.colors.accent])
    const label = byText(root, "融资")!
    expect(attrs(label, ["font-size", "data-gloss-break"])).toEqual(["30", "："])
    expect(byText(root, "发债和增发的成本有没有跳升")!.getAttribute("font-size")).toBe("17")
  })

  it("sets the page's footnote at the foot", () => {
    const { root } = renderEnding("ledger")
    expect(attrs(byText(root, "本材料不构成投资建议"), ["x", "y", "font-size"])).toEqual(["64", "678", "13"])
  })

  it("draws no thank-you and nothing for a heading it was not given", () => {
    const { root } = renderEnding("ledger", slide({ heading: "", components: [], kicker: undefined, subheading: undefined, footnote: undefined }))
    expect(Array.from(root.querySelectorAll("text")).map((t) => t.textContent)).toEqual([])
  })

  it("declares the kicker and footnote it draws, and up to four steps", () => {
    expect(layoutDef.pageFields).toEqual(["kicker", "footnote"])
    expect(layoutDef.slots.find((s) => s.name === "body")).toMatchObject({ accepts: ["bullets"], capacity: 1, itemCapacity: 4 })
  })
})
