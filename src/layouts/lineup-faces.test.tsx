// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { BUILTIN_THEME_FILES, resolveStyle } from "../themes"
import { compileBuiltinTheme } from "../themes/definitions"
import { contrastRatio } from "../render/ink"

await installNodePlatform()

/*
 * runway's faces, drawn to its 2026-10 board (`design/rounds/2026-10-08-runway/`):
 * the magazine cover, the running order's masthead across every content page
 * with its label, section and folio, a part opening on a photograph or on its
 * looks in a row, and the bow on a black stage. In Chinese and in English, and
 * on two themes that share nothing with runway.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], english = false, theme = "runway"): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "runway.pptx",
    theme: { id: theme },
    meta: { organization: english ? "Final Project" : "毕业设计" },
    footer: { page_number: true, organization: true, label: english ? "Wear It Again" : "再穿一次" },
    assets: { images: { hero: { src: PHOTO }, group: { src: PHOTO } } },
    slides,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", kicker: "毕业设计　服装设计 · 本科", heading: "再穿一次", subheading: "把回收的旧牛仔裤拆开，再做成一个系列", tag: { text: "七个造型" }, footnote: "LOOK 01（AI 生成示意）", components: [{ type: "image", asset_id: "hero", fit: "cover", crop: [0, 0.19, 1, 0.38] }], ...extra }) as unknown as Slide
const chapter = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "chapter", heading: "灵感：穿过的痕迹", subheading: "磨白、褶痕、口袋印，都是被穿过的证据", footnote: "AI 生成示意", components: [{ type: "image", asset_id: "hero", fit: "cover" }], ...extra }) as unknown as Slide
const row = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "chapter",
    heading: "系列：七个造型",
    subheading: "按色阶出场，从深走到浅",
    footnote: "AI 生成示意",
    components: [{ type: "image_grid", emphasis: "first", items: Array.from({ length: 7 }, (_, i) => ({ asset_id: i % 2 ? "group" : "hero", caption: `LOOK 0${i + 1}` })) }],
    ...extra,
  }) as unknown as Slide
const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "边界", heading: "这个系列示范了一种做法，**没有解决环境问题**", components: [{ type: "bullets", items: ["劳动密集、来料不稳，难以规模化", "环境账没有核算"] }], footnote: "来源：艾伦·麦克阿瑟基金会", ...extra }) as unknown as Slide
const ending = (extra: Partial<Slide> = {}): Slide => ({ type: "ending", heading: "谢谢各位老师", subheading: "再穿一次 · 答辩结束，请老师提问", components: [], ...extra }) as unknown as Slide

const render = (ir: PptxIR, index: number) => {
  const svg = renderSlideSvg(ir, index)
  return { svg, root: parseSvgRoot(svg) }
}
const clean = (svg: string) => {
  expect(svg).not.toContain("data-dropped")
  expect(svg).not.toContain("data-truncated")
}

describe("lineup-cover", () => {
  it("sets the occasion, the name over the photograph, its line, the crimson tag and the caption", () => {
    const { svg, root } = render(deck([cover()]), 0)
    expect(svg).toContain('data-face="lineup-cover"')
    clean(svg)
    expect(root.querySelector("[data-lineup-cover-kicker]")!.getAttribute("data-lineup-cover-kicker")).toBe("毕业设计　服装设计 · 本科")
    expect(root.querySelector("[data-lineup-cover-title] text")!.getAttribute("font-size")).toBe("150")
    expect(root.querySelector("[data-lineup-cover-tag]")!.getAttribute("data-lineup-cover-tag")).toBe("七个造型")
    expect(root.querySelector("[data-lineup-cover-note]")).not.toBeNull()
  })

  it("shrinks a long English name to keep it on one line", () => {
    const { svg, root } = render(deck([cover({ heading: "Wear It Again, Once More" } as Partial<Slide>)], true), 0)
    clean(svg)
    expect(Number(root.querySelector("[data-lineup-cover-title] text")!.getAttribute("font-size"))).toBeLessThan(150)
  })
})

describe("the running order's masthead", () => {
  it("sets the deck's label, the page's section and the folio over a black hairline on every content page", () => {
    const ir = deck([cover(), sheet()])
    const { svg, root } = render(ir, 1)
    clean(svg)
    expect(root.querySelector("[data-lineup-label]")!.getAttribute("data-lineup-label")).toBe("毕业设计 · 再穿一次")
    expect(root.querySelector("[data-lineup-section]")!.getAttribute("data-lineup-section")).toBe("边界")
    const folio = root.querySelector("[data-lineup-folio]")!
    expect(folio.getAttribute("data-field")).toBe("slidenum")
    expect(folio.textContent).toBe("2")
    expect(svg).toContain('data-decor-piece="masthead"')
  })

  it("leaves the label and the folio off a deck that asks for no footer, and keeps the section and the hairline", () => {
    const ir = deck([cover(), sheet()])
    const { svg, root } = render({ ...ir, footer: undefined }, 1)
    clean(svg)
    expect(root.querySelector("[data-lineup-label]")).toBeNull()
    expect(root.querySelector("[data-lineup-folio]")).toBeNull()
    expect(root.querySelector("[data-lineup-section]")).not.toBeNull()
  })
})

describe("lineup-chapter", () => {
  it("opens a part on a photograph with its numeral in the foreground and its number in the masthead", () => {
    const ir = deck([cover(), chapter(), sheet(), chapter({ heading: "面料：拆、分、拼" } as Partial<Slide>)])
    for (const [index, n] of [[1, "01"], [3, "02"]] as const) {
      const { svg, root } = render(ir, index)
      clean(svg)
      expect(root.querySelector("[data-lineup-chapter-numeral]")!.getAttribute("data-lineup-chapter-numeral")).toBe(n)
      expect(root.querySelector("[data-lineup-chapter-numeral] text")!.getAttribute("fill-opacity")).toBeNull()
    }
    expect(render(ir, 1).root.querySelector("[data-lineup-section]")!.getAttribute("data-lineup-section")).toBe("第 1 部分")
  })

  it("opens a part on its looks in a row on paper", () => {
    const { svg, root } = render(deck([cover(), row()]), 1)
    clean(svg)
    expect(svg).toContain('data-gauge-module="parade"')
    expect(root.querySelectorAll("[data-lineup-look]")).toHaveLength(7)
    expect(root.querySelector("[data-lineup-paper]")).not.toBeNull()
  })

  it("names the part in English", () => {
    const { root } = render(deck([chapter({ heading: "Inspiration", subheading: "The marks of wear", footnote: "AI-generated" } as Partial<Slide>)], true), 0)
    expect(root.querySelector("[data-lineup-section]")!.getAttribute("data-lineup-section")).toBe("Part 1")
  })
})

describe("lineup-ending", () => {
  it("takes its bow on the stage with a short crimson rule", () => {
    const { svg, root } = render(deck([ending()]), 0)
    clean(svg)
    expect(root.querySelector("[data-lineup-stage]")!.getAttribute("fill")).toBe(resolveStyle("runway").colors.primary)
    expect(root.querySelector("[data-lineup-ending-words] text")!.getAttribute("font-size")).toBe("110")
  })
})

describe("the lineup faces on another theme", () => {
  it.each(["luxe", "crayon"] as const)("%s: every face draws whole from the theme's tokens", (theme) => {
    const file = BUILTIN_THEME_FILES[theme]
    const content = Object.fromEntries(Object.keys(file.menu.content).map((kind) => [kind, { face: "lineup-sheet" }]))
    const compiled = compileBuiltinTheme({ ...file, menu: { ...file.menu, cover: { face: "lineup-cover" }, chapter: { face: "lineup-chapter" }, ending: { face: "lineup-ending" }, content: { ...file.menu.content, ...content } } })
    const ir = { ...deck([cover(), chapter(), sheet(), row(), ending()]), theme: { id: theme } } as PptxIR
    const faces = ["lineup-cover", "lineup-chapter", "lineup-sheet", "lineup-chapter", "lineup-ending"]
    faces.forEach((face, index) => {
      const svg = renderSlideSvg(ir, index, { theme: compiled })
      expect(svg, face).toContain(`data-face="${face}"`)
      expect(svg, face).not.toContain("data-dropped")
      expect(svg, face).not.toContain("data-truncated")
      const root = parseSvgRoot(svg)
      for (const t of Array.from(root.querySelectorAll("[data-lineup-claim] text"))) {
        expect(contrastRatio(t.getAttribute("fill")!, compiled.style.colors.bg), face).toBeGreaterThanOrEqual(4.5)
      }
    })
  })
})
