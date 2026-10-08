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
import { registerTestTheme } from "../themes/test-fixtures"

await installNodePlatform()

/*
 * stage's faces, drawn to its 2026-10 board (`design/rounds/2026-10-08-stage/`):
 * the hall from the back row, the presenter's clicker every page carries
 * along its foot, an act opening over its photograph or on the black, the
 * ordinary content page when no composition takes it, and the last sentence
 * alone. In Chinese and in English, and on two themes that share nothing
 * with stage.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], english = false, theme = "stage", footer: Record<string, unknown> = { page_number: true }): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "stage.pptx",
    theme: { id: theme },
    meta: { date: english ? "October 2026" : "二〇二六年十月" },
    footer,
    assets: { images: { hall: { src: PHOTO } } },
    slides,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", kicker: "游戏开发者大会　主题演讲", heading: "中国游戏，下一个十年靠什么出海", background: { kind: "asset", asset_id: "hall" }, components: [], ...extra }) as unknown as Slide
const chapter = (extra: Partial<Slide> = {}): Slide => ({ type: "chapter", kicker: "第一章", heading: "出海", subheading: "十年，去了哪里，卖什么", background: { kind: "asset", asset_id: "hall" }, components: [], ...extra }) as unknown as Slide
const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "第三章　押注", heading: "下一个十年，我押这三件事", components: [{ type: "bullets", items: ["押留存，不押拉新", "押美国，把欧洲当第二主场"] }], footnote: "来源：游戏工委历年《中国游戏产业报告》", ...extra }) as unknown as Slide
const ending = (extra: Partial<Slide> = {}): Slide => ({ type: "ending", heading: "下一个十年，\n不比谁去得早，比谁**留得住**", subheading: "游戏开发者大会　二〇二六年十月", components: [], ...extra }) as unknown as Slide

const render = (ir: PptxIR, index: number) => {
  const svg = renderSlideSvg(ir, index)
  return { svg, root: parseSvgRoot(svg) }
}
const clean = (svg: string) => {
  expect(svg).not.toContain("data-dropped")
  expect(svg).not.toContain("data-truncated")
}
const lines = (root: Element, selector: string) => Array.from(root.querySelectorAll(`${selector} text`)).map((t) => (t.textContent ?? "").trim())

describe("keynote-cover", () => {
  it("sets the occasion in silver, the title on two lines broken at its comma, the date and the clicker over the photograph", () => {
    const { svg, root } = render(deck([cover(), sheet(), ending()]), 0)
    expect(svg).toContain('data-face="keynote-cover"')
    clean(svg)
    expect(root.querySelector("[data-keynote-cover-kicker]")!.getAttribute("data-keynote-cover-kicker")).toBe("游戏开发者大会　主题演讲")
    expect(lines(root, "[data-keynote-cover-title]")).toEqual(["中国游戏，", "下一个十年靠什么出海"])
    expect(root.querySelector("[data-keynote-cover-title] text")!.getAttribute("font-size")).toBe("76")
    expect(root.querySelector("[data-keynote-cover-date]")!.getAttribute("data-keynote-cover-date")).toBe("二〇二六年十月")
    expect(root.querySelector("[data-keynote-cover-photo] image")).not.toBeNull()
    expect(root.querySelector("[data-keynote-progress]")!.getAttribute("data-keynote-progress")).toBe("1/3")
    expect(root.querySelector('[data-keynote-clicker] [data-field="slidenum"]')!.textContent).toBe("1")
  })

  it("breaks a long English title onto two lines", () => {
    const { svg, root } = render(deck([cover({ kicker: "Game developers conference · Keynote", heading: "What will carry Chinese games abroad next?" } as Partial<Slide>)], true), 0)
    clean(svg)
    expect(root.querySelectorAll("[data-keynote-cover-title] text")).toHaveLength(2)
  })
})

describe("the clicker", () => {
  it("runs the part of the talk given in silver along every page's foot, and counts it only when the deck asks for page numbers", () => {
    const ir = deck([cover(), chapter(), sheet(), sheet(), ending()])
    ir.slides.forEach((_, index) => {
      const { root } = render(ir, index)
      const done = root.querySelector("[data-keynote-progress] rect")!
      expect(Number(done.getAttribute("width")), `page ${index + 1}`).toBeCloseTo(((1096 - 64) * (index + 1)) / 5, 6)
      expect(Number(done.getAttribute("y")) + Number(done.getAttribute("height")) / 2).toBe(676)
      expect(root.querySelector('[data-keynote-count] [data-field="slidenum"]')!.textContent).toBe(String(index + 1))
    })
    const silent = deck([cover(), sheet(), ending()], false, "stage", {})
    for (let i = 0; i < 3; i += 1) {
      const { root } = render(silent, i)
      expect(root.querySelector("[data-keynote-clicker]")).not.toBeNull()
      expect(root.querySelector("[data-keynote-count]")).toBeNull()
    }
  })

  it("is the motif's structure piece on a content page", () => {
    const { root } = render(deck([cover(), sheet()]), 1)
    const piece = root.querySelector('[data-decor-piece="clicker"]')!
    expect(piece.getAttribute("data-decor-role")).toBe("structure")
    expect(piece.querySelector("[data-keynote-clicker]")).not.toBeNull()
  })
})

describe("keynote-chapter", () => {
  it("keeps the act's number, its name and its line over the photograph", () => {
    const { svg, root } = render(deck([cover(), chapter()]), 1)
    expect(svg).toContain('data-face="keynote-chapter"')
    clean(svg)
    expect(root.querySelector("[data-keynote-chapter-number]")!.getAttribute("data-keynote-chapter-number")).toBe("第一章")
    expect(lines(root, "[data-keynote-chapter-title]")).toEqual(["出海"])
    expect(root.querySelector("[data-keynote-chapter-title] text")!.getAttribute("font-size")).toBe("150")
    expect(root.querySelector("[data-keynote-chapter-photo]")).not.toBeNull()
  })

  it("stands on the black in a follow spot without a photograph, and sets an act named in a phrase smaller", () => {
    const { svg, root } = render(deck([cover(), chapter({ background: undefined, heading: "Where the money comes from, and what it buys" } as Partial<Slide>)], true), 1)
    clean(svg)
    expect(root.querySelector("[data-keynote-chapter-photo]")).toBeNull()
    expect(root.querySelector("[data-keynote-spot]")).not.toBeNull()
    expect(Number(root.querySelector("[data-keynote-chapter-title] text")!.getAttribute("font-size"))).toBeLessThan(150)
  })
})

describe("keynote-sheet", () => {
  it("sets the chapter, the claim and the ordinary body when no composition takes the page", () => {
    const { svg, root } = render(deck([cover(), sheet()]), 1)
    expect(svg).toContain('data-face="keynote-sheet"')
    clean(svg)
    expect(root.querySelector("[data-keynote-kicker]")!.getAttribute("data-keynote-kicker")).toBe("第三章　押注")
    const claim = root.querySelector("[data-keynote-claim] text")!
    expect([claim.getAttribute("font-size"), claim.getAttribute("font-weight")]).toEqual(["40", "700"])
    expect(root.querySelector("[data-keynote-source]")).not.toBeNull()
  })
})

describe("keynote-ending", () => {
  it("keeps the author's two lines, its marked words in silver, the occasion at the foot and the clicker at its end", () => {
    const ir = deck([cover(), ending()])
    const { svg, root } = render(ir, 1)
    expect(svg).toContain('data-face="keynote-ending"')
    clean(svg)
    expect(lines(root, "[data-keynote-ending-words]")).toEqual(["下一个十年，", "不比谁去得早，比谁留得住"])
    const lit = root.querySelector("[data-keynote-ending-words] tspan")!
    expect(lit.textContent).toBe("留得住")
    expect(lit.getAttribute("fill")).toBe(compileBuiltinTheme(BUILTIN_THEME_FILES.stage).style.colors.accent)
    expect(root.querySelector("[data-keynote-ending-sign]")!.getAttribute("data-keynote-ending-sign")).toBe("游戏开发者大会　二〇二六年十月")
    expect(root.querySelector("[data-keynote-progress]")!.getAttribute("data-keynote-progress")).toBe("2/2")
  })
})

describe.each(["runway", "crayon"])("the stage faces on %s", (source) => {
  it("draw whole, every word legible on the page", () => {
    const theme = registerTestTheme(`keynote-faces-${source}`, source as "runway", { cover: "keynote-cover", chapter: "keynote-chapter", ending: "keynote-ending", content: { points: "keynote-sheet" } })
    const ir = deck([cover({ background: undefined } as Partial<Slide>), chapter({ background: undefined } as Partial<Slide>), sheet(), ending()], false, theme)
    const bg = compileBuiltinTheme(BUILTIN_THEME_FILES[source as "runway"]).style.colors.bg
    for (const [i, face] of [[0, "keynote-cover"], [1, "keynote-chapter"], [2, "keynote-sheet"], [3, "keynote-ending"]] as const) {
      const { svg, root } = render(ir, i)
      expect(svg).toContain(`data-face="${face}"`)
      clean(svg)
      for (const t of Array.from(root.querySelectorAll("[data-face] text"))) {
        if (!(t.textContent ?? "").trim()) continue
        const need = t.getAttribute("data-contrast-tier") === "meta" ? 3 : Number(t.getAttribute("font-size")) >= 24 ? 3 : 4.5
        expect(contrastRatio(t.getAttribute("fill")!, bg), `${face}: ${t.textContent}`).toBeGreaterThanOrEqual(need)
      }
    }
  })
})
