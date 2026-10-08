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
 * lecture's faces, drawn to its 2026-10 board (`design/rounds/2026-10-08-lecture/`):
 * the board before class with the topic in yellow chalk, the frame and the
 * ledge every page carries, the part of a lesson opening on a wiped board,
 * the ordinary content page when no composition takes it, and the homework
 * under the lit school at night. In Chinese and in English, and on two themes
 * that share nothing with lecture.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], english = false, theme = "lecture", footer: Record<string, unknown> = { page_number: true, organization: true, label: english ? "Annual tax reconciliation in one class" : "一节课学会个税年度汇算" }): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "lecture.pptx",
    theme: { id: theme },
    meta: { date: english ? "October 2026" : "2026 年 10 月", organization: english ? "Youth Evening School" : "青年夜校" },
    footer,
    assets: { images: { school: { src: PHOTO } } },
    slides,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", kicker: "青年夜校　第 1 讲", heading: "一节课学会\n**个税年度汇算**", subheading: "把全年的账重算一遍，多交的退回来，少交的按时补上\n下课前，你能自己算出是退还是补", components: [], ...extra }) as unknown as Slide
const chapter = (extra: Partial<Slide> = {}): Slide => ({ type: "chapter", kicker: "二　算对", heading: "跟着一道例题算到底", subheading: "从全年收入一路算到退税", components: [], ...extra }) as unknown as Slide
const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "三　去办", heading: "办之前先备好这三样", components: [{ type: "bullets", items: ["工资条和三险一金明细", "租房合同或房贷合同", "兼职和稿酬的收入凭证"] }], footnote: "来源：国家税务总局令第 57 号", ...extra }) as unknown as Slide
const ending = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "ending",
    kicker: "课后作业",
    heading: "下课。",
    subheading: "下次窗口：**2027 年 3 月 1 日至 6 月 30 日**",
    background: { kind: "asset", asset_id: "school" },
    components: [{ type: "steps", items: [{ title: "核对 App 里今年填的专项附加扣除", text: "租房、赡养、子女，有没有漏填或填错" }, { title: "用今晚的公式，估一估自己是退还是补", text: "应纳税额 ＝ 应纳税所得额 × 税率 − 速算扣除数" }] }],
    footnote: "本课是科普教学，不构成个人税务建议，具体以个税 App 和主管税务机关为准",
    ...extra,
  }) as unknown as Slide

const render = (ir: PptxIR, index: number) => {
  const svg = renderSlideSvg(ir, index)
  return { svg, root: parseSvgRoot(svg) }
}
const clean = (svg: string) => {
  expect(svg).not.toContain("data-dropped")
  expect(svg).not.toContain("data-truncated")
}
const lines = (root: Element, selector: string) => Array.from(root.querySelectorAll(`${selector} text`)).map((t) => (t.textContent ?? "").trim())
const accent = compileBuiltinTheme(BUILTIN_THEME_FILES.lecture).style.colors.accent

describe("chalkboard-cover", () => {
  it("writes the topic in yellow chalk with a stroke under it, the line under the title, the promise and the date", () => {
    const { svg, root } = render(deck([cover(), sheet(), ending()]), 0)
    expect(svg).toContain('data-face="chalkboard-cover"')
    clean(svg)
    expect(root.querySelector("[data-chalk-cover-kicker]")!.getAttribute("data-chalk-cover-kicker")).toBe("青年夜校　第 1 讲")
    expect(lines(root, "[data-chalk-cover-title]")).toEqual(["一节课学会", "个税年度汇算"])
    const lit = root.querySelector("[data-chalk-cover-title] [data-chalk-lit] text")!
    expect([lit.getAttribute("font-size"), lit.getAttribute("fill")]).toEqual(["104", accent])
    expect(root.querySelectorAll("[data-chalk-cover-title] [data-chalk-under]")).toHaveLength(1)
    expect(root.querySelector("[data-chalk-cover-promise]")!.getAttribute("data-chalk-cover-promise")).toBe("下课前，你能自己算出是退还是补")
    expect(root.querySelector("[data-chalk-cover-date]")!.getAttribute("data-chalk-cover-date")).toBe("2026 年 10 月")
  })

  it("shrinks a long English topic to the measure rather than cutting it", () => {
    const { svg, root } = render(deck([cover({ kicker: "Youth Evening School · Lesson 1", heading: "One class on\n**the annual income tax reconciliation**", subheading: "Redo the year's sums" } as Partial<Slide>)], true), 0)
    clean(svg)
    expect(Number(root.querySelector("[data-chalk-cover-title] [data-chalk-lit] text")!.getAttribute("font-size"))).toBeLessThan(104)
  })
})

describe("the board", () => {
  it("frames every page in wood with the chalk ledge, the course on the ledge and the period's count at the top right", () => {
    const ir = deck([cover(), chapter(), sheet(), ending()])
    ir.slides.forEach((_, index) => {
      const { root } = render(ir, index)
      const piece = root.querySelector('[data-decor-piece="board"]')!
      expect(piece.getAttribute("data-decor-role"), `page ${index + 1}`).toBe("structure")
      expect(piece.querySelector("[data-chalk-frame]")).not.toBeNull()
      expect(piece.querySelector("[data-chalk-ledge]")).not.toBeNull()
      expect(piece.querySelector("[data-chalk-course]")!.getAttribute("data-chalk-course")).toBe("青年夜校 · 一节课学会个税年度汇算")
      expect(piece.querySelector('[data-chalk-count] [data-field="slidenum"]')!.textContent).toBe(String(index + 1))
      expect(piece.querySelector("[data-chalk-count]")!.getAttribute("data-chalk-count")).toBe(`${index + 1} / 4`)
    })
    const silent = deck([cover(), sheet(), ending()], false, "lecture", {})
    for (let i = 0; i < 3; i += 1) {
      const { root } = render(silent, i)
      expect(root.querySelector("[data-chalk-ledge]")).not.toBeNull()
      expect(root.querySelector("[data-chalk-count]")).toBeNull()
      expect(root.querySelector("[data-chalk-course]")).toBeNull()
    }
  })
})

describe("chalkboard-chapter", () => {
  it("writes the part's name with a stroke of yellow chalk under it", () => {
    const { svg, root } = render(deck([cover(), chapter()]), 1)
    expect(svg).toContain('data-face="chalkboard-chapter"')
    clean(svg)
    expect(root.querySelector("[data-chalk-chapter-kicker]")!.getAttribute("data-chalk-chapter-kicker")).toBe("二　算对")
    expect(lines(root, "[data-chalk-chapter-title]")).toEqual(["跟着一道例题算到底"])
    expect(root.querySelector("[data-chalk-chapter-title] [data-chalk-under]")).not.toBeNull()
  })
})

describe("chalkboard-sheet", () => {
  it("sets the step, the title and the ordinary body when no composition takes the page, and the stamp at the top right", () => {
    const { svg, root } = render(deck([cover(), sheet({ stamp: { text: "例题 · 数字为虚构" } } as Partial<Slide>)]), 1)
    expect(svg).toContain('data-face="chalkboard-sheet"')
    clean(svg)
    expect(root.querySelector("[data-chalk-step]")!.getAttribute("data-chalk-step")).toBe("三　去办")
    const title = root.querySelector("[data-chalk-claim] text")!
    expect([title.getAttribute("font-size"), title.getAttribute("font-weight")]).toEqual(["34", null])
    expect(root.querySelector("[data-chalk-stamp]")!.getAttribute("data-chalk-stamp")).toBe("例题 · 数字为虚构")
    expect(root.querySelector("[data-chalk-source]")).not.toBeNull()
  })

  it("rests a long title on its line, broken at a comma, rather than cutting it", () => {
    const { svg, root } = render(deck([cover(), sheet({ heading: "专项附加扣除有七项，2023 年只提高了其中三项，另外四项的标准都没有变，今晚只讲常用的几项" } as Partial<Slide>)]), 1)
    clean(svg)
    const titles = Array.from(root.querySelectorAll("[data-chalk-claim] text"))
    expect(titles).toHaveLength(2)
    expect((titles[0]!.textContent ?? "").endsWith("，")).toBe(true)
  })
})

describe("chalkboard-ending", () => {
  it("sets the homework with boxes to tick, the next window in yellow, the dismissal and the reminder over the photograph", () => {
    const { svg, root } = render(deck([cover(), ending()]), 1)
    expect(svg).toContain('data-face="chalkboard-ending"')
    clean(svg)
    expect(root.querySelector("[data-chalk-ending-kicker]")!.getAttribute("data-chalk-ending-kicker")).toBe("课后作业")
    expect(root.querySelectorAll("[data-chalk-ending-tasks] rect")).toHaveLength(2)
    expect(root.querySelector("[data-chalk-ending-next] tspan")!.getAttribute("fill")).toBe(accent)
    expect(lines(root, "[data-chalk-ending-words]")).toEqual(["下课。"])
    expect(root.querySelector("[data-chalk-ending-photo] image")).not.toBeNull()
  })

  it("takes the homework as a checklist too", () => {
    const { svg, root } = render(deck([cover(), ending({ components: [{ type: "bullets", style: "checklist", items: ["核对专项附加扣除", "估一估是退还是补"] }] } as Partial<Slide>)]), 1)
    clean(svg)
    expect(root.querySelectorAll("[data-chalk-ending-tasks] rect")).toHaveLength(2)
  })
})

describe.each(["stage", "crayon"])("the lecture faces on %s", (source) => {
  it("draw whole, every word legible on the page", () => {
    const theme = registerTestTheme(`chalkboard-faces-${source}`, source as "stage", { cover: "chalkboard-cover", chapter: "chalkboard-chapter", ending: "chalkboard-ending", content: { points: "chalkboard-sheet" } })
    const ir = deck([cover(), chapter(), sheet(), ending({ background: undefined } as Partial<Slide>)], false, theme)
    const bg = compileBuiltinTheme(BUILTIN_THEME_FILES[source as "stage"]).style.colors.bg
    for (const [i, face] of [[0, "chalkboard-cover"], [1, "chalkboard-chapter"], [2, "chalkboard-sheet"], [3, "chalkboard-ending"]] as const) {
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
