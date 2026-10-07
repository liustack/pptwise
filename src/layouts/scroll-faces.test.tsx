// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { contrastRatio } from "../render/ink"
import { horizontalForm } from "./compositions/scroll"

await installNodePlatform()

/*
 * ink's faces, drawn to its 2026-10 board (`design/rounds/2026-10-07-ink/`):
 * the cover's title slip beside its photograph, the scroll frame round every
 * content page, the statute page, the volume's opening beside its painting
 * and the colophon with its seal; in Chinese, where the slip, the margins and
 * the colophon stand upright, and in English, where nothing Latin does.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const CINNABAR = "#C3272B"

function deck(slides: Slide[], extra: Partial<PptxIR> = {}, english = false): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "ink.pptx",
    theme: { id: "ink" },
    meta: { organization: english ? "Culture Lecture Hall" : "文化讲堂", date: "2026-10" },
    footer: { page_number: true, organization: true, label: english ? "October 2026" : "二〇二六年十月" },
    assets: { images: { shadow: { src: PHOTO }, river: { src: PHOTO }, brush: { src: PHOTO } } },
    slides,
    ...extra,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", kicker: "公众讲座", heading: "非遗怎样活在今天", subheading: "从名录，到人，再回到生活", background: { kind: "asset", asset_id: "shadow" }, stamp: { text: "文" }, footnote: "示意图（AI 生成）", components: [], ...extra }) as unknown as Slide
const coverEn = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "cover", kicker: "Public Lecture", heading: "How Intangible Heritage Lives On Today", subheading: "From the lists, to the people, back to everyday life", background: { kind: "asset", asset_id: "shadow" }, stamp: { text: "文" }, footnote: "Illustration (AI-generated)", components: [], ...extra }) as unknown as Slide
const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "points",
    kicker: "卷之一　先看名录",
    heading: "名录已经很长，非遗能不能活下去，要看还有没有人在做",
    components: [
      { type: "kpi_cards", items: [{ value: "45", unit: "项", label: "列入联合国教科文组织名录、名册" }, { value: "1557", unit: "项", label: "国家级代表性项目" }, { value: "**3994**", unit: "名", label: "国家级代表性传承人" }] },
      { type: "paragraph", text: "名录记下的是项目，手艺和习俗活在会做、还在做的人身上。" },
    ],
    footnote: "来源：中国非遗网（2025-12）",
    ...extra,
  }) as unknown as Slide
const statute = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "quote",
    kicker: "引子",
    heading: "非遗不只是手艺，也包括相关的实物和场所",
    components: [{ type: "blockquote", text: "本法所称非物质文化遗产，\n是指各族人民世代相传并视为", attribution: "《非物质文化遗产法》第二条" }],
    footnote: "2011 年 2 月 25 日通过，6 月 1 日施行",
    ...extra,
  }) as unknown as Slide
const chapter = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "chapter", kicker: "卷之一", heading: "先看名录", subheading: "联合国的名录，国家的名录", background: { kind: "asset", asset_id: "river" }, footnote: "画芯为 AI 生成的示意图", components: [], ...extra }) as unknown as Slide
const ending = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "ending", kicker: "公众讲座", heading: "名录记下名字，手艺要靠人传下去。", subheading: "文化和自然遗产日\n每年 6 月第二个星期六", background: { kind: "asset", asset_id: "brush" }, stamp: { text: "文" }, footnote: "背景为 AI 生成的示意图", components: [], ...extra }) as unknown as Slide

const draw = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const columns = (root: Element, selector: string) => Array.from(root.querySelectorAll(`${selector} [data-scroll-column]`)).map((c) => c.getAttribute("data-scroll-column"))
const read = (el: Element) =>
  Array.from(el.querySelectorAll("text"))
    .map((t) => Array.from(t.textContent ?? "").map(horizontalForm).join(""))
    .join("")

describe("scroll-cover", () => {
  it("keeps its title slip over a photograph instead of handing the page to the photo renderer", () => {
    const root = draw(deck([cover()]), 0)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("scroll-cover")
    expect(root.querySelector("[data-scroll-cover-photo] image")).not.toBeNull()
    expect(columns(root, "[data-scroll-title]")).toEqual(["非遗怎样活在今天"])
    expect(root.querySelector("[data-scroll-seal]")!.getAttribute("data-scroll-seal")).toBe("文")
    expect(root.querySelector("[data-scroll-seal] rect")!.getAttribute("fill")).toBe(CINNABAR)
    // The subtitle stands upright, its commas in the upper right of their cells.
    expect(read(root.querySelector("[data-scroll-subtitle]")!)).toBe("从名录，到人，再回到生活")
    expect(root.querySelector("[data-scroll-hall]")!.getAttribute("data-scroll-hall")).toBe("文化讲堂　公众讲座")
    expect(root.querySelector("[data-scroll-date]")!.getAttribute("data-scroll-date")).toBe("二〇二六年十月")
    expect(read(root.querySelector("[data-scroll-cover-note]")!)).toBe("示意图（AI 生成）")
  })

  it("sets a Latin title across a widened slip and turns its labels to read from the top", () => {
    const root = draw(deck([coverEn()], {}, true), 0)
    expect(root.querySelector("[data-scroll-title] [data-scroll-column]")).toBeNull()
    expect(read(root.querySelector("[data-scroll-title]")!).replace(/\s/g, "")).toBe("HowIntangibleHeritageLivesOnToday")
    expect(read(root.querySelector("[data-scroll-subtitle]")!).replace(/\s/g, "")).toBe("Fromthelists,tothepeople,backtoeverydaylife")
    expect(root.querySelector("[data-scroll-hall] [data-scroll-turned]")).not.toBeNull()
    expect(root.querySelector("[data-scroll-date] [data-scroll-turned]")).not.toBeNull()
  })

  it("lays the ink under a classification it prints over the photograph's corner", () => {
    const root = draw(deck([cover()], { meta: { organization: "文化讲堂", classification: "秘密★1年" } } as Partial<PptxIR>), 0)
    const mark = root.querySelector('[data-cover-mark="classification"]')!
    expect(Number(mark.getAttribute("x"))).toBeLessThanOrEqual(120)
    expect(contrastRatio(mark.getAttribute("fill")!, "#1F1C18")).toBeGreaterThanOrEqual(4.5)
  })
})

describe("the scroll frame", () => {
  it("hangs a content page between its edges, the volume upright in cinnabar down the left margin", () => {
    const ir = deck([cover(), sheet()])
    const root = draw(ir, 1)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("scroll-sheet")
    expect(root.querySelectorAll('[data-decor-piece="edges"] rect')).toHaveLength(2)
    const volume = root.querySelector("[data-scroll-volume]")!
    expect(columns(volume, "")).toEqual(["卷之一　先看名录"])
    expect(Array.from(volume.querySelectorAll("text")).every((t) => t.getAttribute("fill") === CINNABAR)).toBe(true)
    expect(root.querySelector("[data-scroll-hall]")!.getAttribute("data-scroll-hall")).toBe("文化讲堂　二〇二六年十月")
    expect(root.querySelector('[data-field="slidenum"]')!.textContent).toBe("2")
    expect(root.querySelector('[data-gauge-module="opening"]')).not.toBeNull()
  })

  it("turns a Latin volume, hall and date a quarter, never letter by letter", () => {
    const en = { ...sheet(), kicker: "Volume One · The Lists", heading: "The lists are long. Heritage lives in people" } as Slide
    const root = draw(deck([coverEn(), en], {}, true), 1)
    expect(root.querySelector("[data-scroll-volume] [data-scroll-turned]")).not.toBeNull()
    expect(root.querySelector("[data-scroll-hall] [data-scroll-turned]")).not.toBeNull()
    for (const column of Array.from(root.querySelectorAll("[data-scroll-column]"))) expect(column.getAttribute("data-scroll-column")).not.toMatch(/[A-Za-z]/u)
  })

  it("sets a page none of its compositions takes under the claim, with its source", () => {
    const plain = sheet({ components: [{ type: "bullets", items: ["先看名录", "再看人", "最后看它怎样回到生活"] }] } as Partial<Slide>)
    const root = draw(deck([cover(), plain]), 1)
    expect(root.querySelector("[data-gauge-module]")).toBeNull()
    expect(read(root.querySelector("[data-scroll-claim]")!)).toBe("名录已经很长，非遗能不能活下去，要看还有没有人在做")
    expect(read(root.querySelector("[data-scroll-source]")!)).toBe("来源：中国非遗网（2025-12）")
    expect(root.querySelector("[data-truncated]")).toBeNull()
  })
})

describe("scroll-quote", () => {
  it("stands the statute upright with its source beside it and the claim in cinnabar at the far left", () => {
    const root = draw(deck([cover(), statute()]), 1)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("scroll-quote")
    expect(columns(root, "[data-scroll-statute] > [data-scroll-vertical]")).toEqual(["本法所称非物质文化遗产，", "是指各族人民世代相传并视为"])
    expect(read(root.querySelector("[data-scroll-attribution]")!)).toBe("《非物质文化遗产法》第二条")
    const lead = root.querySelector("[data-scroll-quote-lead]")!
    expect(read(lead)).toBe("非遗不只是手艺，也包括相关的实物和场所")
    expect(Array.from(lead.querySelectorAll("text")).every((t) => t.getAttribute("fill") === CINNABAR)).toBe(true)
    expect(read(root.querySelector("[data-scroll-source]")!)).toBe("2011 年 2 月 25 日通过，6 月 1 日施行")
  })

  it("sets a Latin statute across the band", () => {
    const en = statute({ heading: "Heritage includes its objects and places", components: [{ type: "blockquote", text: "Intangible cultural heritage means the traditional cultural expressions that people have passed down through generations.", attribution: "ICH Law of the PRC, Article 2 (translated)" }] } as Partial<Slide>)
    const root = draw(deck([coverEn(), en], {}, true), 1)
    expect(root.querySelector("[data-scroll-statute] [data-scroll-column]")).toBeNull()
    expect(read(root.querySelector("[data-scroll-quote-lead]")!).replace(/\s/g, "")).toBe("Heritageincludesitsobjectsandplaces")
  })
})

describe("scroll-chapter", () => {
  it("opens the volume beside its mounted painting, its number upright in cinnabar", () => {
    const root = draw(deck([cover(), chapter()]), 1)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("scroll-chapter")
    expect(root.querySelector("[data-scroll-painting] image")).not.toBeNull()
    expect(columns(root, "[data-scroll-volume-number]")).toEqual(["卷之一"])
    expect(read(root.querySelector("[data-scroll-chapter-title]")!)).toBe("先看名录")
    expect(root.querySelector("[data-scroll-hall]")!.getAttribute("data-scroll-hall")).toBe("文化讲堂　二〇二六年十月")
  })

  it("turns a Latin volume number and breaks a long title at its comma", () => {
    const en = chapter({ kicker: "Volume Two", heading: "Behind the lists, people", subheading: "A skill lives only in someone's hands" } as Partial<Slide>)
    const root = draw(deck([coverEn(), en], {}, true), 1)
    expect(root.querySelector("[data-scroll-volume-number] [data-scroll-turned]")).not.toBeNull()
    expect(Array.from(root.querySelectorAll("[data-scroll-chapter-title] text")).map((t) => t.textContent)).toEqual(["Behind the lists,", "people"])
  })
})

describe("scroll-ending", () => {
  it("signs the scroll off a clause a column, with the hall, the date and the seal", () => {
    const root = draw(deck([cover(), ending()]), 1)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("scroll-ending")
    expect(columns(root, "[data-scroll-verse]")).toEqual(["名录记下名字，", "手艺要靠人传下去。"])
    expect(root.querySelector("[data-scroll-hall]")!.getAttribute("data-scroll-hall")).toBe("文化讲堂　公众讲座")
    expect(root.querySelector("[data-scroll-seal]")!.getAttribute("data-scroll-seal")).toBe("文")
    expect(Array.from(root.querySelectorAll("[data-scroll-sign] text")).map((t) => t.textContent)).toEqual(["文化和自然遗产日", "每年 6 月第二个星期六"])
    expect(root.querySelector("[data-scroll-veil]")).not.toBeNull()
  })

  it("sets Latin closing words a sentence a line", () => {
    const en = ending({ kicker: "Public Lecture", heading: "Lists keep names. People keep skills alive.", subheading: "Cultural and Natural Heritage Day" } as Partial<Slide>)
    const root = draw(deck([coverEn(), en], {}, true), 1)
    expect(Array.from(root.querySelectorAll("[data-scroll-verse] text")).map((t) => t.textContent)).toEqual(["Lists keep names.", "People keep skills alive."])
    expect(root.querySelector("[data-scroll-hall] [data-scroll-turned]")).not.toBeNull()
  })
})
