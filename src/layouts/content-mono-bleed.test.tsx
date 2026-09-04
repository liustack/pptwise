// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../render/serialize"
import { assertSubset } from "../render/subset-validate"
import { buildCtx } from "../render/full-slide-svg"
import { resolveStyle } from "../themes"
import { readableOn } from "../render/ink"
import { MonoBleedContent, layoutDef } from "./content-mono-bleed"
import type { PptxIR, Slide } from "@/ir"

const CJK_LONG =
  "微服务架构下的分布式事务一致性保障机制与补偿策略设计规范以及跨可用区容灾演练的完整落地路径说明"
const MIXED_LONG =
  "基于 Kubernetes Operator 的 StatefulSet 滚动升级与 PodDisruptionBudget 联动策略 v2.3.1-rc.4 说明"
const CJK_LINE = "把灯关掉"
const EN_LINE = "Turn the lights off."

function ir(theme: string, slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: theme },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

function render(body: React.ReactElement): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

describe("layoutDef", () => {
  it("declares pinOnly, paintsOwnBackground, and capacity-0 body", () => {
    expect(layoutDef.id).toBe("mono-bleed")
    expect(layoutDef.paintsOwnBackground).toBe(true)
    expect(layoutDef.slideTypes).toEqual(["content"])
    expect(layoutDef.slots.find((s) => s.name === "body")?.capacity).toBe(0)
  })
})

describe("MonoBleedContent", () => {
  it("paints a full-bleed primary field and inverts type with readableOn", () => {
    const ctx = buildCtx(resolveStyle("brief"), {})
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "mono-bleed",
      heading: CJK_LINE,
      subheading: "然后只留一句",
      components: [],
    } as Slide
    const { markup, root } = render(
      <MonoBleedContent ir={ir("brief", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const field = root.querySelector("rect")
    expect(field?.getAttribute("width")).toBe("1280")
    expect(field?.getAttribute("height")).toBe("720")
    expect(field?.getAttribute("fill")).toBe(ctx.colors.primary)
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("把灯关掉"),
    )!
    expect(heading.getAttribute("text-anchor")).toBe("middle")
    expect(heading.getAttribute("x")).toBe("640")
    expect(heading.getAttribute("font-weight")).toBe("700")
    expect(heading.getAttribute("fill")).toBe(readableOn(ctx.colors.primary))
    expect(markup).toContain("然后只留一句")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("English heading renders on thesis against thesis primary, not brief navy", () => {
    const ctx = buildCtx(resolveStyle("thesis"), {})
    const slide: Slide = { type: "content", kind: "points", layout: "mono-bleed", heading: EN_LINE, components: [] } as Slide
    const { markup, root } = render(
      <MonoBleedContent ir={ir("thesis", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(markup).toContain("lights")
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(markup).not.toContain("#1E2A4A")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("ledger primary field is not luxe champagne gold", () => {
    const ctx = buildCtx(resolveStyle("ledger"), {})
    const slide: Slide = { type: "content", kind: "points", layout: "mono-bleed", heading: CJK_LINE, components: [] } as Slide
    const { markup, root } = render(
      <MonoBleedContent ir={ir("ledger", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(root.querySelector("rect")?.getAttribute("fill")).toBe(ctx.colors.primary)
    expect(markup).not.toContain("#C6A15B")
    expect(() => assertSubset(root)).not.toThrow()
  })

  it("mixed long heading shrinks/wraps to at most 3 lines and never dumps the raw source verbatim", () => {
    const ctx = buildCtx(resolveStyle("ledger"), {})
    const extreme = `${CJK_LONG}${MIXED_LONG}`
    const slide: Slide = { type: "content", kind: "points", layout: "mono-bleed", heading: extreme, components: [] } as Slide
    const { markup, root } = render(
      <MonoBleedContent ir={ir("ledger", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const headingTexts = Array.from(root.querySelectorAll("text")).filter(
      (t) => t.getAttribute("font-weight") === "700",
    )
    expect(headingTexts.length).toBeGreaterThanOrEqual(1)
    expect(headingTexts.length).toBeLessThanOrEqual(3)
    expect(markup).not.toContain(extreme)
  })

  it("empty subheading: no empty text node, heading still renders", () => {
    const ctx = buildCtx(resolveStyle("brief"), {})
    const slide: Slide = { type: "content", kind: "points", layout: "mono-bleed", heading: CJK_LINE, components: [] } as Slide
    const { root } = render(
      <MonoBleedContent ir={ir("brief", [slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const texts = Array.from(root.querySelectorAll("text"))
    expect(texts.every((t) => (t.textContent ?? "").trim().length > 0)).toBe(true)
    expect(texts.some((t) => (t.textContent ?? "").includes("把灯关掉"))).toBe(true)
  })
})
