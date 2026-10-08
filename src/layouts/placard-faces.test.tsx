// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { BUILTIN_THEME_FILES } from "../themes"
import { compileBuiltinTheme } from "../themes/definitions"
import { contrastRatio } from "../render/ink"

await installNodePlatform()

/*
 * museum's faces, drawn to its 2026-10 board (`design/rounds/2026-10-08-museum/`):
 * the catalogue cover, the gallery wall every content page stands on (the
 * hall sign, the talk's label and the door plate), the doorway to the next
 * hall with or without a photograph, and the lights going down. In Chinese
 * and in English, and on two themes that share nothing with museum.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], english = false, theme = "museum"): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "museum.pptx",
    theme: { id: theme },
    meta: { organization: english ? "Weekend Science Talk" : "周末科普讲座", date: english ? "October 2026" : "二〇二六年十月" },
    footer: { page_number: true, organization: true, label: english ? "Soil from the Far Side of the Moon" : "从月球背面带回来的土" },
    assets: { images: { jar: { src: PHOTO } } },
    slides,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", kicker: "周末科普讲座", heading: "从月球背面\n带回来的土", subheading: "嫦娥五号、嫦娥六号的月球样品，一件一件看", footnote: "样品瓶示意（AI 生成，非样品实拍）", components: [{ type: "image", asset_id: "jar", fit: "cover" }], ...extra }) as unknown as Slide
const chapter = (extra: Partial<Slide> = {}): Slide => ({ type: "chapter", kicker: "第一展厅", heading: "月球正面的土", subheading: "嫦娥五号　2020 年　风暴洋北部", components: [], ...extra }) as unknown as Slide
const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "第三展厅 · 去向和问题", heading: "我们还不知道的五件事", components: [{ type: "bullets", items: ["月球为什么到 20 亿年前还有岩浆", "月背火山是两期，还是一直在喷"] }], footnote: "来源：Nature（2021）", ...extra }) as unknown as Slide
const ending = (extra: Partial<Slide> = {}): Slide => ({ type: "ending", kicker: "周末科普讲座", heading: "土很少，问题很多", subheading: "谢谢各位，下面是提问时间", components: [], ...extra }) as unknown as Slide

const render = (ir: PptxIR, index: number) => {
  const svg = renderSlideSvg(ir, index)
  return { svg, root: parseSvgRoot(svg) }
}
const clean = (svg: string) => {
  expect(svg).not.toContain("data-dropped")
  expect(svg).not.toContain("data-truncated")
}

describe("placard-cover", () => {
  it("sets the occasion over a copper rule, the title on the author's two lines, its line, the date and the caption", () => {
    const { svg, root } = render(deck([cover()]), 0)
    expect(svg).toContain('data-face="placard-cover"')
    clean(svg)
    expect(root.querySelector("[data-placard-cover-kicker]")!.getAttribute("data-placard-cover-kicker")).toBe("周末科普讲座")
    expect(Array.from(root.querySelectorAll("[data-placard-cover-title] text")).map((t) => t.textContent)).toEqual(["从月球背面", "带回来的土"])
    expect(root.querySelector("[data-placard-cover-date]")!.getAttribute("data-placard-cover-date")).toBe("二〇二六年十月")
    expect(root.querySelector("[data-placard-cover-note]")).not.toBeNull()
  })

  it("breaks a long English title onto two lines", () => {
    const { svg, root } = render(deck([cover({ heading: "Soil from the Far Side of the Moon" } as Partial<Slide>)], true), 0)
    clean(svg)
    expect(root.querySelectorAll("[data-placard-cover-title] text")).toHaveLength(2)
  })
})

describe("the gallery wall", () => {
  it("sets the hall sign over its seam, the talk's label and the page number on a door plate on every content page", () => {
    const { svg, root } = render(deck([cover(), sheet()]), 1)
    clean(svg)
    expect(svg).toContain('data-decor-piece="hall"')
    expect(root.querySelector("[data-placard-hall-sign]")!.getAttribute("data-placard-hall-sign")).toBe("第三展厅 · 去向和问题")
    expect(root.querySelector("[data-placard-label]")!.getAttribute("data-placard-label")).toBe("周末科普讲座 · 从月球背面带回来的土")
    const folio = root.querySelector('[data-placard-plate] [data-field="slidenum"]')!
    expect(folio.textContent).toBe("2")
  })

  it("leaves the label and the plate off a deck that asks for no footer, and keeps the hall sign", () => {
    const ir = deck([cover(), sheet()])
    const { svg, root } = render({ ...ir, footer: undefined }, 1)
    clean(svg)
    expect(root.querySelector("[data-placard-label]")).toBeNull()
    expect(root.querySelector("[data-placard-plate]")).toBeNull()
    expect(root.querySelector("[data-placard-hall-sign]")).not.toBeNull()
  })
})

describe("placard-chapter", () => {
  it("names the hall twice and keeps it when the page carries a photograph", () => {
    for (const extra of [{}, { components: [{ type: "image", asset_id: "jar", fit: "cover" }] }]) {
      const { svg, root } = render(deck([cover(), chapter(extra as Partial<Slide>)]), 1)
      clean(svg)
      expect(root.querySelector("[data-placard-chapter-hall]")!.getAttribute("data-placard-chapter-hall")).toBe("第一展厅")
      expect(root.querySelector("[data-placard-hall-sign]")!.getAttribute("data-placard-hall-sign")).toBe("第一展厅")
      expect(root.querySelector('[data-placard-plate] [data-field="slidenum"]')!.textContent).toBe("2")
    }
  })

  it("breaks a long English title onto two lines and lifts the hall over it", () => {
    const { svg, root } = render(deck([chapter({ kicker: "Hall 3", heading: "Where all the soil went, and the questions still left to ask", subheading: "Where it went · What we don't know" } as Partial<Slide>)], true), 0)
    clean(svg)
    expect(root.querySelectorAll("[data-placard-chapter-title] text")).toHaveLength(2)
  })
})

describe("placard-ending", () => {
  it("keeps every line the author broke the closing words' line into", () => {
    const { svg, root } = render(deck([ending({ subheading: "谢谢各位\n下面是提问时间" } as Partial<Slide>)]), 0)
    clean(svg)
    expect(Array.from(root.querySelectorAll("[data-placard-ending-sub] text")).map((t) => t.textContent)).toEqual(["谢谢各位", "下面是提问时间"])
    expect(root.querySelector("[data-placard-ending-date]")).not.toBeNull()
  })
})

describe("the placard faces on another theme", () => {
  it.each(["runway", "crayon"] as const)("%s: every face draws whole from the theme's tokens", (theme) => {
    const file = BUILTIN_THEME_FILES[theme]
    const content = Object.fromEntries(Object.keys(file.menu.content).map((kind) => [kind, { face: "placard-sheet" }]))
    const compiled = compileBuiltinTheme({ ...file, menu: { ...file.menu, cover: { face: "placard-cover" }, chapter: { face: "placard-chapter" }, ending: { face: "placard-ending" }, content: { ...file.menu.content, ...content } } })
    const ir = { ...deck([cover(), chapter(), sheet(), ending()]), theme: { id: theme } } as PptxIR
    const faces = ["placard-cover", "placard-chapter", "placard-sheet", "placard-ending"]
    faces.forEach((face, index) => {
      const svg = renderSlideSvg(ir, index, { theme: compiled })
      expect(svg, face).toContain(`data-face="${face}"`)
      expect(svg, face).not.toContain("data-dropped")
      expect(svg, face).not.toContain("data-truncated")
      const root = parseSvgRoot(svg)
      for (const t of Array.from(root.querySelectorAll("[data-placard-claim] text"))) {
        expect(contrastRatio(t.getAttribute("fill")!, compiled.style.colors.bg), face).toBeGreaterThanOrEqual(4.5)
      }
    })
  })
})
