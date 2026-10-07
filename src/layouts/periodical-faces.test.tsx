// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { contrastRatio } from "../render/ink"

await installNodePlatform()

/*
 * journal's faces, drawn to its 2026-10 board (`design/rounds/2026-10-07-journal/`):
 * a small magazine's cover beside its photograph, the masthead and the
 * claim round every content page, the quotation page, and the afterword
 * with its sign-off; and the motif's words in the masthead and its folio.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const BRICK = "#8C4A3C"

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "journal.pptx",
    theme: { id: "journal" },
    meta: { organization: "致读者", date: "2026 年 10 月" },
    footer: { page_number: true, organization: true, label: "二〇二六年秋 · 年度长信" },
    assets: { images: { desk: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    kicker: "二〇二六年秋 · 一封写给订阅读者的年度长信",
    heading: "我们还在读书吗",
    subheading: "十年阅读调查读下来，主编想和你说的话",
    background: { kind: "asset", asset_id: "desk" },
    fields: [
      { label: "03", value: "十年里，读书的人和本数几乎没变" },
      { label: "06", value: "跌得最狠的是报刊，我们也在其中" },
      { label: "11", value: "书卖得更少、更便宜，也换了地方卖" },
      { label: "17", value: "编辑部接下来一年的四个打算" },
    ],
    footnote: "封面图为 AI 生成的示意图",
    components: [],
    ...extra,
  }) as unknown as Slide

const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "data",
    kicker: "十年",
    heading: "十年里，读书的人从 58.4% 到 60.0%，人均纸书只多了 0.23 本",
    components: [
      { type: "chart", chart_type: "line", title: "成年人人均阅读量（本）", axes: { y_unit: "本" }, series: [{ name: "纸书", data: [{ x: "2015", y: 4.58 }, { x: "2020", y: 4.7 }, { x: "2025", y: 4.81 }] }] },
      { type: "callout", variant: "info", text: "4.81 本是平均数。" },
    ],
    footnote: "来源：第 13 至 23 次全国国民阅读调查",
    ...extra,
  }) as unknown as Slide

const quote = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "quote",
    kicker: "不读的人",
    heading: "不读书的人自己说",
    components: [{ type: "blockquote", text: "没有读书的习惯或不喜欢读书。\n工作太忙。", attribution: "第 23 次全国国民阅读调查列出的主要原因。" }],
    ...extra,
  }) as unknown as Slide

const ending = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "ending", kicker: "后记", heading: "人还在读，只是换了读法。\n我们也换一种做法，接着陪你读。", subheading: "主编\n二〇二六年十月", components: [], ...extra }) as unknown as Slide

const draw = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const textOf = (el: Element | null) => (el?.textContent ?? "").replace(/\s+/g, "")

describe("the periodical faces on journal", () => {
  const ir = deck([cover(), sheet(), quote(), ending()])

  it("validate the sample's page fields", () => {
    const result = validateIr(ir)
    expect(result.ok, JSON.stringify(result.errors)).toBe(true)
  })

  it("cover: the masthead large over its issue, the cover story in the accent, the cover lines with their pages, the photograph down the right", () => {
    const root = draw(ir, 0)
    expect(textOf(root.querySelector("[data-periodical-masthead]"))).toBe("致读者")
    expect(root.querySelector("[data-periodical-masthead] text")!.getAttribute("font-size")).toBe("96")
    expect(textOf(root.querySelector("[data-periodical-issue]"))).toBe("二〇二六年秋·一封写给订阅读者的年度长信")
    const story = root.querySelector("[data-periodical-story] text")!
    expect([story.textContent, story.getAttribute("fill"), story.getAttribute("font-size")]).toEqual(["我们还在读书吗", BRICK, "50"])
    const lines = Array.from(root.querySelectorAll("[data-periodical-cover-line]"))
    expect(lines.map((l) => l.getAttribute("data-periodical-cover-line"))).toEqual(["03", "06", "11", "17"])
    expect(root.querySelector("[data-periodical-cover-photo]")!.getAttribute("x")).toBe("620")
    expect(textOf(root.querySelector("[data-periodical-cover-note]"))).toBe("封面图为AI生成的示意图")
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("sheet: the section in the accent between the column and the issue over two rules, the claim ending on y158, the source at the foot and the folio centred", () => {
    const root = draw(ir, 1)
    const section = root.querySelector("[data-periodical-section] text")!
    expect(textOf(section)).toBe("十年")
    expect(section.getAttribute("fill")).toBe(BRICK)
    expect(textOf(root.querySelector("[data-periodical-column]"))).toBe("致读者")
    expect(textOf(root.querySelector("[data-periodical-issue]"))).toBe("二〇二六年秋·年度长信")
    const rules = Array.from(root.querySelectorAll("[data-periodical-rules] rect")).map((r) => Number(r.getAttribute("y")) + Number(r.getAttribute("height")) / 2)
    expect(rules).toEqual([50, 55])
    const claim = root.querySelector("[data-periodical-claim] text")!
    expect(claim.getAttribute("font-size")).toBe("32")
    expect(Number(claim.getAttribute("y"))).toBeGreaterThan(140)
    expect(Number(claim.getAttribute("y"))).toBeLessThanOrEqual(158)
    expect(textOf(root.querySelector("[data-periodical-source]"))).toBe("来源：第13至23次全国国民阅读调查")
    expect(Array.from(root.querySelectorAll("[data-periodical-folio] text")).map((t) => t.textContent)).toEqual(["·", "2", "·"])
    expect(root.querySelector("[data-periodical-caption]")!.textContent).toContain("图 1")
  })

  it("quote: the heading a small line in the accent, the words a sentence a line, the attribution exactly as written", () => {
    const root = draw(ir, 2)
    const label = root.querySelector("[data-periodical-quote-label] text")!
    expect([textOf(label), label.getAttribute("fill"), label.getAttribute("font-size")]).toEqual(["不读书的人自己说", BRICK, "13"])
    expect(Array.from(root.querySelectorAll("[data-periodical-quote] text")).map((t) => t.textContent)).toEqual(["没有读书的习惯或不喜欢读书。", "工作太忙。"])
    const attribution = root.querySelector("[data-periodical-attribution] text")!.textContent!
    expect(attribution).toBe("第 23 次全国国民阅读调查列出的主要原因。")
    expect(attribution.startsWith("—")).toBe(false)
  })

  it("quote: sets the quotation mark in the heading's own family in a Chinese deck, so it stands where it is drawn in PowerPoint too", () => {
    // SimSun's 「“」 is a full-width glyph drawn in the right half of its em:
    // a mark set in SimSun alone lands on the words in PowerPoint's export.
    const mark = draw(ir, 2).querySelector("[data-periodical-quote-mark]")!
    expect(mark.getAttribute("font-family")).toBe(draw(ir, 2).querySelector("[data-periodical-claim] text, [data-periodical-quote] text")!.getAttribute("font-family"))
    expect(mark.getAttribute("font-family")!.startsWith("Times New Roman")).toBe(true)
  })

  it("quote: sets the page's source at the foot, as every other page does, whether it sets the words as a quotation or not", () => {
    const footnote = "来源：第 23 次全国国民阅读调查"
    const quoted = draw(deck([cover(), quote({ footnote } as Partial<Slide>)]), 1)
    expect(textOf(quoted.querySelector("[data-periodical-source]"))).toBe("来源：第23次全国国民阅读调查")
    const plain = quote({ footnote, components: [{ type: "bullets", items: ["工作太忙", "没有习惯"] }] } as Partial<Slide>)
    expect(textOf(draw(deck([cover(), plain]), 1).querySelector("[data-periodical-source]"))).toBe("来源：第23次全国国民阅读调查")
  })

  it("ending: the masthead with its own section, the closing words as the author broke them, the sign-off right-aligned under its rule", () => {
    const root = draw(ir, 3)
    expect(textOf(root.querySelector("[data-periodical-section]"))).toBe("后记")
    expect(Array.from(root.querySelectorAll("[data-periodical-closing] text")).map((t) => t.textContent)).toEqual(["人还在读，只是换了读法。", "我们也换一种做法，接着陪你读。"])
    const sign = Array.from(root.querySelectorAll("[data-periodical-signoff] text"))
    expect(sign.map(textOf)).toEqual(["主编", "二〇二六年十月"])
    const all = root.textContent ?? ""
    expect(all).not.toContain("AFTERWORD")
    expect(all).not.toContain("NEXT ISSUE")
    expect(root.querySelector("[data-field]")).toBeNull()
  })

  it("every face's words read against the paper", () => {
    for (const index of [0, 1, 2, 3]) {
      const root = draw(ir, index)
      for (const text of Array.from(root.querySelectorAll("[data-periodical-section] text, [data-periodical-claim] text, [data-periodical-source] text"))) {
        expect(contrastRatio(text.getAttribute("fill")!, "#EFEBE1")).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it("sets a page none of its compositions takes under the claim with the ordinary renderer", () => {
    const plain = sheet({ components: [{ type: "bullets", items: ["读书的人还在", "少掉的是报刊"] }] } as Partial<Slide>)
    const root = draw(deck([cover(), plain]), 1)
    expect(root.querySelector("[data-gauge-module]")).toBeNull()
    expect(textOf(root.querySelector("[data-periodical-claim]"))).toContain("十年里")
    expect(root.textContent).toContain("少掉的是报刊")
  })
})
