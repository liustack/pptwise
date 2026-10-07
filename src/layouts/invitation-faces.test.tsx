// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { contrastRatio } from "../render/ink"
import { BUILTIN_THEME_FILES, resolveStyle } from "../themes"
import { compileBuiltinTheme } from "../themes/definitions"

await installNodePlatform()

/*
 * luxe's faces, drawn to its 2026-10 board (`design/rounds/2026-10-08-luxe/`):
 * the invitation card beside its photograph on the cover, the card stock
 * round every content page with the chapter, the claim and its diamond, the
 * occasion and the hallmark folio, a part opening under a veil with its
 * Roman numeral, and the card signed at the close. In Chinese and in English.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const GOLD = resolveStyle("luxe").colors.accent

function deck(slides: Slide[], english = false, theme = "luxe"): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "luxe.pptx",
    theme: { id: theme },
    meta: { organization: english ? "Annual Dealer Conference" : "年度经销商大会", date: english ? "October 2026" : "二〇二六年十月" },
    footer: { page_number: true, organization: true, label: english ? "October 2026" : "二〇二六年十月" },
    assets: { images: { bangle: { src: PHOTO }, counter: { src: PHOTO }, tray: { src: PHOTO } } },
    slides,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", heading: "金价新高之后\n我们卖什么", subheading: "品牌总部 敬致全国经销商伙伴", background: { kind: "asset", asset_id: "bangle" }, footnote: "示意图：古法金手镯（AI 生成）", components: [], ...extra }) as unknown as Slide
const chapter = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "chapter", kicker: "第一章", heading: "顾客变了", subheading: "首饰少了，金条金币多了，一口价在回摆", background: { kind: "asset", asset_id: "counter" }, footnote: "示意图（AI 生成）", components: [], ...extra }) as unknown as Slide
const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "points",
    kicker: "第一章　顾客变了",
    heading: "一口价做上去了，金价一回落，按克计价又回来了，三家同行都看到了同一个方向",
    components: [{ type: "bullets", items: ["周大福定价首饰占比回落", "六福按克同店销量由跌转升"] }],
    footnote: "来源：各公司公告。企业口径",
    ...extra,
  }) as unknown as Slide
const ending = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "ending", heading: "金价我们定不了，\n卖什么、怎么卖，我们**一起**定。", subheading: "品牌总部 敬上", components: [], ...extra }) as unknown as Slide

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => (t.textContent ?? "").replace(/\s+/g, ""))
const render = (ir: PptxIR, index: number) => {
  const svg = renderSlideSvg(ir, index)
  return { svg, root: parseSvgRoot(svg) }
}

describe("invitation-cover", () => {
  it("sets the occasion, the title as the author broke it, who sends it and when inside a gilt card, the photograph at the right", () => {
    const { svg, root } = render(deck([cover()]), 0)
    expect(svg).toContain('data-face="invitation-cover"')
    expect(root.querySelector("[data-invitation-occasion]")!.getAttribute("data-invitation-occasion")).toBe("年度经销商大会")
    expect(Array.from(root.querySelectorAll("[data-invitation-title] text")).map((t) => t.textContent)).toEqual(["金价新高之后", "我们卖什么"])
    expect(root.querySelector("[data-invitation-date]")!.getAttribute("data-invitation-date")).toBe("二〇二六年十月")
    expect(root.querySelector("[data-invitation-cover-photo] image")!.getAttribute("x")).toBe("640")
    expect(root.querySelectorAll("[data-invitation-gilt] line")).toHaveLength(8)
    expect(texts(root)).toContain("示意图：古法金手镯（AI生成）")
    expect(svg).not.toContain("data-dropped")
  })

  it("an English title keeps the author's break at the largest size that holds both lines", () => {
    const { root } = render(deck([cover({ heading: "After Gold's Record High,\nWhat Do We Sell?", subheading: "From head office to our dealer partners" })], true), 0)
    expect(Array.from(root.querySelectorAll("[data-invitation-title] text")).map((t) => t.textContent)).toEqual(["After Gold's Record High,", "What Do We Sell?"])
  })
})

describe("invitation-chapter", () => {
  it("numbers the part in Roman numerals by its place among the chapter pages", () => {
    const ir = deck([cover(), chapter(), sheet(), chapter({ kicker: "第二章", heading: "行业变了" })])
    expect(render(ir, 1).root.querySelector("[data-invitation-numeral]")!.getAttribute("data-invitation-numeral")).toBe("I")
    const second = render(ir, 3).root
    expect(second.querySelector("[data-invitation-numeral]")!.getAttribute("data-invitation-numeral")).toBe("II")
    expect(second.querySelector("[data-invitation-chapter-kicker]")!.getAttribute("data-invitation-chapter-kicker")).toBe("第二章")
    expect(texts(second)).toContain("示意图（AI生成）")
  })
})

describe("invitation-sheet", () => {
  it("frames the page, sets the chapter, the claim in gold and a diamond under its last line, the occasion and the hallmark", () => {
    const { svg, root } = render(deck([cover(), sheet()]), 1)
    expect(svg).toContain('data-face="invitation-sheet"')
    expect(root.querySelectorAll("[data-decor-piece='stock'] line")).toHaveLength(4)
    expect(root.querySelector("[data-invitation-chapter]")!.getAttribute("data-invitation-chapter")).toBe("第一章　顾客变了")
    const claim = Array.from(root.querySelectorAll("[data-invitation-claim] text"))
    expect(claim).toHaveLength(2)
    for (const line of claim) expect(line.getAttribute("fill")).toBe(GOLD)
    const lastBaseline = Math.max(...claim.map((t) => Number(t.getAttribute("y"))))
    const diamond = root.querySelector("[data-invitation-diamond]")!
    const top = Math.min(...(diamond.getAttribute("points") ?? "").split(" ").map((p) => Number(p.split(",")[1])))
    expect(top).toBeGreaterThan(lastBaseline)
    const row = root.querySelector('[data-footer="row"]')!
    expect(texts(row)).toEqual(["年度经销商大会·二〇二六年十月", "2"])
    expect(svg).not.toContain("data-dropped")
  })

  it("sets a subheading under the diamond and the body under it", () => {
    const { svg, root } = render(deck([cover(), sheet({ subheading: "三家的期间和分母都不同，只比各家自己的方向" })]), 1)
    expect(root.querySelector("[data-invitation-standfirst]")).not.toBeNull()
    expect(svg).not.toContain("data-dropped")
  })

  it("declares a stamp dropped when no reply card takes the page", () => {
    const { svg } = render(deck([cover(), sheet({ stamp: { text: "回执" } })]), 1)
    expect(svg).toContain('data-dropped-kind="stamp"')
  })

  it("frames only the right half beside a photograph that runs from the page's left edge", () => {
    const page = sheet({
      kind: "photo",
      heading: "以旧换新和回收按标准做，\n金价风险先记清再对冲",
      components: [
        { type: "image", asset_id: "tray", fit: "cover" },
        { type: "icon_cards", items: [{ icon: "repeat", title: "以旧换新", text: "按行业团体标准做" }, { icon: "recycle", title: "回收", text: "报价当着顾客算清" }, { icon: "shield-check", title: "金价风险", text: "先记清再谈对冲" }] },
      ],
    } as Partial<Slide>)
    const { root } = render(deck([cover(), page]), 1)
    expect(root.querySelector("[data-gauge-module='vitrine']")).not.toBeNull()
    const xs = Array.from(root.querySelectorAll("[data-decor-piece='stock'] line")).flatMap((l) => [Number(l.getAttribute("x1")), Number(l.getAttribute("x2"))])
    expect(Math.min(...xs)).toBe(584.5)
    const occasion = root.querySelector('[data-footer="row"] text')!
    expect(Number(occasion.getAttribute("x"))).toBe(608)
  })
})

describe("invitation-ending", () => {
  it("signs the card: the occasion, the closing words with the marked ones in gold, the sign-off and the date", () => {
    const { svg, root } = render(deck([cover(), ending()]), 1)
    expect(svg).toContain('data-face="invitation-ending"')
    expect(Array.from(root.querySelectorAll("[data-invitation-words] text")).map((t) => (t.textContent ?? "").trim())).toEqual(["金价我们定不了，", "卖什么、怎么卖，我们一起定。"])
    const lit = Array.from(root.querySelectorAll("[data-invitation-words] tspan")).find((t) => t.textContent === "一起")!
    expect(lit.getAttribute("fill")).toBe(GOLD)
    expect(root.querySelector("[data-invitation-sign]")!.getAttribute("data-invitation-sign")).toBe("品牌总部 敬上")
    expect(root.querySelector("[data-invitation-date]")!.getAttribute("data-invitation-date")).toBe("二〇二六年十月")
  })
})

describe("the invitation faces on another theme", () => {
  it.each(["brief", "crayon"] as const)("%s: every face draws whole from the theme's tokens", (theme) => {
    const file = BUILTIN_THEME_FILES[theme]
    const content = Object.fromEntries(Object.keys(file.menu.content).map((kind) => [kind, { face: "invitation-sheet" }]))
    const compiled = compileBuiltinTheme({ ...file, menu: { ...file.menu, cover: { face: "invitation-cover" }, chapter: { face: "invitation-chapter" }, ending: { face: "invitation-ending" }, content: { ...file.menu.content, ...content } } })
    const ir = { ...deck([cover(), chapter(), sheet(), ending()]), theme: { id: theme } } as PptxIR
    const faces = ["invitation-cover", "invitation-chapter", "invitation-sheet", "invitation-ending"]
    faces.forEach((face, index) => {
      const svg = renderSlideSvg(ir, index, { theme: compiled })
      expect(svg, face).toContain(`data-face="${face}"`)
      expect(svg, face).not.toContain("data-dropped")
      expect(svg, face).not.toContain("data-truncated")
      // The gold of the theme is its accent: the claim, the numeral and the occasion read on its page.
      const root = parseSvgRoot(svg)
      for (const t of Array.from(root.querySelectorAll("[data-invitation-claim] text, [data-invitation-occasion] text"))) {
        expect(contrastRatio(t.getAttribute("fill")!, compiled.style.colors.bg), face).toBeGreaterThanOrEqual(3)
      }
    })
  })
})
