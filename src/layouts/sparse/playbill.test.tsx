// @vitest-environment jsdom
import { describe, expect, it } from "vitest"
import { renderSvgMarkup, parseSvgRoot } from "../../render/serialize"
import { assertSubset } from "../../render/subset-validate"
import { buildCtx } from "../../render/full-slide-svg"
import { resolveStyle } from "../../themes"
import { StatementContent } from "../content-statement"
import { StatHeroContent } from "../content-stat-hero"
import { MonoBleedContent } from "../content-mono-bleed"
import { boxesIntersect, textInkBox } from "../../render/depth-contract/geometry"
import { LATIN_DESCENT_RATIO } from "../underline"
import type { PptxIR, Slide } from "@/ir"

const VERSE = "设备不会突然坏，只是没人**听**它说话。"
const VERSE_PLAIN = "设备不会突然坏，只是没人听它说话。"
const LUXE_GOLD = "#C6A15B"
const PLACEHOLDER = "客户现场图"

function ir(slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "x.pptx",
    theme: { id: "playbill" },
    meta: {},
    assets: { images: {} },
    slides,
  } as unknown as PptxIR
}

const SHOTS = {
  shot: { src: "data:image/png;base64,iVBORw0KGgo=", alt: "客户现场" },
  shot2: { src: "data:image/png;base64,iVBORw0KGgo=", alt: "第二现场" },
}

function irWithShot(slides: Slide[]): PptxIR {
  return { ...ir(slides), assets: { images: SHOTS } } as unknown as PptxIR
}

function render(body: React.ReactElement): { markup: string; root: Element } {
  const markup = renderSvgMarkup(
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1280 720">
      {body}
    </svg>,
  )
  return { markup, root: parseSvgRoot(markup) }
}

describe("playbill sparse faces", () => {
  const ctx = buildCtx(resolveStyle("playbill"), {})
  const shotCtx = buildCtx(resolveStyle("playbill"), SHOTS)

  it("statement is three-line heavy type with an accent run and a closer bar", () => {
    const chapter: Slide = { type: "chapter", heading: "工作区订阅 · 开演", components: [] } as Slide
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE, components: [] } as Slide
    const { markup, root } = render(
      <StatementContent ir={ir([chapter, slide])} slide={slide} index={1} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("设备不会"),
    )!
    expect(heading.getAttribute("x")).toBe("96")
    expect(heading.getAttribute("font-weight")).toBe("700")
    expect(Number(heading.getAttribute("font-size"))).toBe(110)
    expect(heading.textContent).toMatch(/，$/)
    const em = Array.from(root.querySelectorAll("tspan")).find((t) => t.textContent === "听")
    expect(em?.getAttribute("fill")).toBe(ctx.colors.accent)
    const bar = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("height") === "4")
    expect(bar?.getAttribute("x")).toBe("96")
    expect(bar?.getAttribute("y")).toBe("610")
    expect(bar?.getAttribute("width")).toBe("1088")
    expect(bar?.getAttribute("fill")).toBe(ctx.colors.text)
    expect(markup).toContain("工作区订阅")
    expect(markup).not.toContain(LUXE_GOLD)
    expect(root.querySelector("polygon")).toBeNull()
  })

  it("statement without ** keeps the verse on text fill", () => {
    const slide: Slide = { type: "content", kind: "points", layout: "statement", heading: VERSE_PLAIN, components: [] } as Slide
    const { root } = render(
      <StatementContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("听"),
    )!
    expect(heading.querySelector("tspan")).toBeNull()
  })

  it("stat-hero bleeds a 380px numeral and bakes a rotated unit chip", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "-43%",
      subheading: "席位净流失 · 试点 90 天",
      components: [],
    } as Slide
    const { root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const hero = Array.from(root.querySelectorAll("text")).find((t) => t.getAttribute("font-size") === "380")!
    expect(hero.textContent).toBe("43")
    expect(hero.getAttribute("x")).toBe("640")
    expect(hero.getAttribute("y")).toBe("500")
    expect(hero.getAttribute("text-anchor")).toBe("middle")
    expect(hero.getAttribute("font-weight")).toBe("700")
    expect(root.querySelector("polygon")).not.toBeNull()
    expect(root.querySelector("rect[transform]")).toBeNull()
    const chip = Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").includes("%"))
    expect(chip?.textContent).toBe("-43%")
    expect(chip?.getAttribute("transform")).toContain("rotate(4 1100 152)")
    expect(chip?.getAttribute("fill")).toBe(ctx.colors.bg)
  })

  it("stat-hero chip polygon is clockwise 4° (top-right corner drops in y-down)", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "-43%",
      subheading: "席位净流失 · 试点 90 天",
      components: [],
    } as Slide
    const { root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const pts = root
      .querySelector("polygon")!
      .getAttribute("points")!
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [x, y] = p.split(",").map(Number)
        return { x: x!, y: y! }
      })
    const tr = pts[1]!
    const unrotatedTr = { x: 1100 + 180 / 2, y: 152 - 64 / 2 }
    expect(tr.y).toBeGreaterThan(unrotatedTr.y)
    expect(tr.x).toBeGreaterThan(unrotatedTr.x)
  })

  it("stat-hero numeral does not cross the caption or the unit chip", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "stat-hero",
      heading: "10.2",
      subheading: "下半年的三项确定性投入",
      components: [],
    } as Slide
    const { root } = render(
      <StatHeroContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    const hero = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === "10.2")!
    const caption = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("下半年"),
    )!
    const fs = Number(hero.getAttribute("font-size"))
    const heroY = Number(hero.getAttribute("y"))
    const heroInk = textInkBox({
      content: hero.textContent ?? "",
      x: Number(hero.getAttribute("x")),
      y: heroY,
      fontSize: fs,
      fontFamily: hero.getAttribute("font-family") ?? "",
      fontWeight: hero.getAttribute("font-weight"),
      textAnchor: hero.getAttribute("text-anchor") ?? "start",
    })
    heroInk.h = fs * (0.72 + LATIN_DESCENT_RATIO)
    const captionTop = Number(caption.getAttribute("y")) - Number(caption.getAttribute("font-size"))
    expect(captionTop).toBeGreaterThan(heroY + fs * LATIN_DESCENT_RATIO)
    const pts = root
      .querySelector("polygon")!
      .getAttribute("points")!
      .trim()
      .split(/\s+/)
      .map((p) => {
        const [x, y] = p.split(",").map(Number)
        return { x: x!, y: y! }
      })
    const chipBox = {
      x: Math.min(...pts.map((p) => p.x)),
      y: Math.min(...pts.map((p) => p.y)),
      w: Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)),
      h: Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)),
    }
    expect(boxesIntersect(heroInk, chipBox)).toBe(false)
  })

  it("mono-bleed without an image falls back to the generic type-on-field face", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "mono-bleed",
      heading: "凌晨两点的会议，以后交给工作区",
      components: [],
    } as Slide
    const { markup, root } = render(
      <MonoBleedContent ir={ir([slide])} slide={slide} index={0} ctx={ctx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    const field = Array.from(root.querySelectorAll("rect")).find((r) => r.getAttribute("width") === "1280")
    expect(field?.getAttribute("fill")).toBe(ctx.colors.primary)
    const heading = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("凌晨两点"),
    )!
    expect(heading.getAttribute("x")).toBe("640")
    expect(heading.getAttribute("y")).toBe("260")
    expect(heading.getAttribute("text-anchor")).toBe("middle")
    expect(Number(heading.getAttribute("font-size"))).toBeLessThanOrEqual(64)
    expect(root.querySelector("image")).toBeNull()
    expect(markup).not.toContain(PLACEHOLDER)
  })

  it("mono-bleed paints the kept picture's caption in the band under the bleed", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "mono-bleed",
      heading: "凌晨两点的会议，以后交给工作区",
      components: [{ type: "image", asset_id: "shot", fit: "cover", caption: PLACEHOLDER }],
    } as Slide
    const { root } = render(
      <MonoBleedContent ir={irWithShot([slide])} slide={slide} index={0} ctx={shotCtx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    expect(root.querySelector("image")).not.toBeNull()
    const caption = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === PLACEHOLDER)
    expect(caption, "the picture's caption reaches the page").toBeTruthy()
    // playbill's own band register: bold line at 662, quiet line at 694.
    const title = Array.from(root.querySelectorAll("text")).find((t) =>
      (t.textContent ?? "").includes("凌晨两点"),
    )!
    expect(title.getAttribute("y")).toBe("662")
    expect(caption!.getAttribute("y")).toBe("694")
    expect(caption!.getAttribute("fill")).toBe(ctx.colors.bg)
    // Both sit inside the field band under the 600px bleed, never on the photo.
    for (const node of [title, caption!]) {
      const size = Number(node.getAttribute("font-size"))
      expect(Number(node.getAttribute("y")) - size).toBeGreaterThan(600)
    }
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("mono-bleed steps aside when one picture frame cannot hold the page's pictures", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      layout: "mono-bleed",
      heading: "凌晨两点的会议，以后交给工作区",
      components: [
        {
          type: "image_grid",
          items: [
            { asset_id: "shot", caption: PLACEHOLDER },
            { asset_id: "shot2", caption: "第二张" },
          ],
        },
      ],
    } as Slide
    const { root } = render(
      <MonoBleedContent ir={irWithShot([slide])} slide={slide} index={0} ctx={shotCtx} />,
    )
    expect(() => assertSubset(root)).not.toThrow()
    // Never one of two pictures painted silently.
    expect(root.querySelector("image")).toBeNull()
    expect(root.querySelector("[data-dropped]")).not.toBeNull()
  })
})
