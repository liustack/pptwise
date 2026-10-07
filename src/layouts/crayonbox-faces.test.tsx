// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { contrastRatio } from "../render/ink"
import { resolveStyle } from "../themes"
import { crayonSectionIndex } from "./compositions/crayonbox"

await installNodePlatform()

/*
 * crayon's faces, drawn to its 2026-10 board (`design/rounds/2026-10-08-crayon/`):
 * the welcome cover beside its framed photograph, the crayonbox frame round
 * every content page (the section capsule, the claim with its stroke of
 * crayon, the source), the part's tilted number, and the close with its
 * contact cards over a veiled photograph.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const POOL = resolveStyle("crayon").colors.accentPool!

function deck(slides: Slide[]): PptxIR {
  const result = validateIr({
    version: "5",
    filename: "crayon.pptx",
    theme: { id: "crayon" },
    meta: { organization: "全园新学期家长会", date: "2026 年秋季学期" },
    footer: { page_number: true, organization: true, label: "2026 年秋季学期" },
    assets: { images: { playground: { src: PHOTO }, blocks: { src: PHOTO }, crayons: { src: PHOTO }, books: { src: PHOTO } } },
    slides,
  })
  if (!result.ok) throw new Error(result.errors.map((e) => `${e.path}: ${e.message}`).join("\n"))
  return result.ir!
}

const cover = { type: "cover", kicker: "全园新学期家长会", heading: "新学期好！\n我们一起陪孩子长大", subheading: "新规定、孩子的成长、在家怎么配合、安全，今天一次说清", background: { kind: "asset", asset_id: "playground" }, footnote: "示意图：户外活动（AI 生成）", components: [] } as unknown as Slide
const contents = {
  type: "content",
  kind: "process",
  kicker: "新规定",
  heading: "今天和您聊五件事",
  components: [
    {
      type: "numbered_cards",
      items: [
        { icon: "scale", title: "新规定", text: "学前教育法，大班免保教费" },
        { icon: "sprout", title: "孩子会长成什么样", text: "五大领域，在园的一天" },
        { icon: "heart-handshake", title: "家园共育", text: "睡眠、屏幕、户外、吃饭、视力" },
      ],
    },
  ],
} as unknown as Slide
const plain = (kicker: string | undefined, heading: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", ...(kicker ? { kicker } : {}), heading, components: [{ type: "bullets", items: ["按时上床，按时起床", "午睡也算在一天的睡眠里"] }], footnote: "来源：教育部 2012 年指南", ...extra }) as unknown as Slide
const chapter = { type: "chapter", heading: "孩子会长成什么样", subheading: "教育部《3-6 岁儿童学习与发展指南》的五大领域", background: { kind: "asset", asset_id: "blocks" }, footnote: "示意图：搭积木（AI 生成）", components: [] } as unknown as Slide
const ending = {
  type: "ending",
  kicker: "下次见",
  heading: "下次见面：家长开放日",
  subheading: "有事随时找老师",
  background: { kind: "asset", asset_id: "crayons" },
  footnote: "背景为 AI 生成的示意图",
  components: [
    {
      type: "icon_cards",
      items: [
        { icon: "calendar", title: "家长开放日", text: "来班里看看孩子的一天" },
        { icon: "messages-square", title: "班级群", text: "每周食谱和通知都发在这里" },
        { icon: "users", title: "家长委员会", text: "欢迎报名，一起商量园里的事" },
      ],
    },
  ],
} as unknown as Slide

const svg = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => (t.textContent ?? "").trim())

describe("crayon's sections", () => {
  it("take the box's crayons in the order the deck names them, a chapter by its heading", () => {
    const ir = deck([cover, contents, plain("新规定", "第二页"), chapter, plain("孩子会长成什么样", "第五页"), plain(undefined, "第六页"), plain("家园共育", "第七页"), ending])
    expect(ir.slides.map((_, i) => crayonSectionIndex(ir.slides, i))).toEqual([0, 0, 0, 1, 1, 1, 2, 2])
  })
})

describe("crayon's faces", () => {
  it("the cover sets the occasion in a sky capsule, the title with a tangerine stroke, the term, and the photograph framed on paper", () => {
    const root = svg(deck([cover, contents]), 0)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("crayonbox-cover")
    expect(root.querySelector("[data-crayon-capsule='全园新学期家长会'] rect")!.getAttribute("fill")).toBe(POOL[0])
    expect(texts(root)).toEqual(expect.arrayContaining(["新学期好！", "我们一起陪孩子长大", "2026 年秋季学期", "示意图：户外活动（AI 生成）"]))
    expect(root.querySelector("[data-crayon-paper]")).not.toBeNull()
    expect(root.querySelector("[data-crayon-photo='playground'] [data-crayon-frame]")!.getAttribute("stroke")).toBe(resolveStyle("crayon").colors.accent)
    // The page is paper: the photograph is not laid under it.
    expect(root.querySelectorAll("image")).toHaveLength(1)
  })

  it("a content page wears its section's capsule with the contents' symbol for it, the claim and its stroke", () => {
    const ir = deck([cover, contents, plain("新规定", "大班免的是保育教育费，伙食费等照常交")])
    const root = svg(ir, 2)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("crayonbox-sheet")
    const capsule = root.querySelector("[data-crayon-capsule='新规定']")!
    expect(capsule.querySelector("rect")!.getAttribute("fill")).toBe(POOL[0])
    expect(capsule.querySelector("[data-crayon-icon='scale']")).not.toBeNull()
    const claim = root.querySelector("[data-crayon-claim] text")!
    expect(claim.textContent).toBe("大班免的是保育教育费，伙食费等照常交")
    expect([claim.getAttribute("font-size"), claim.getAttribute("font-weight")]).toEqual(["34", "900"])
    expect(root.querySelector("[data-decor-piece='crayon-underline'] path")!.getAttribute("stroke")).toBe(POOL[0])
    expect(texts(root)).toContain("来源：教育部 2012 年指南")
  })

  it("a claim too long for one line breaks at a comma and ends on the same line", () => {
    const one = svg(deck([cover, plain("新规定", "短标题")]), 1)
    const two = svg(deck([cover, plain("新规定", "入园头几周孩子真有压力，陪着慢慢分开有研究支持，再多写一些让它放不下一行才行")]), 1)
    const last = (root: Element) => Array.from(root.querySelectorAll("[data-crayon-claim] text")).at(-1)!.getAttribute("y")
    expect(two.querySelectorAll("[data-crayon-claim] text")).toHaveLength(2)
    expect(texts(two).find((t) => t.startsWith("入园"))!.endsWith("，")).toBe(true)
    expect(last(one)).toBe(last(two))
  })

  it("a content page over a photograph lays the paper over it from the left", () => {
    const root = svg(deck([cover, plain("孩子会长成什么样", "不用一把尺子量孩子", { background: { kind: "asset", asset_id: "books" } } as Partial<Slide>)]), 1)
    expect(root.querySelector("[data-crayon-veil] linearGradient")).not.toBeNull()
  })

  it("the chapter's number stands on a tilted block of its section's crayon beside its framed photograph", () => {
    const root = svg(deck([cover, contents, chapter]), 2)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("crayonbox-chapter")
    const tile = root.querySelector("[data-crayon-number='01']")!
    expect(tile.getAttribute("transform")).toMatch(/^rotate\(-4 /)
    expect(tile.querySelector("rect")!.getAttribute("fill")).toBe(POOL[1])
    expect(root.querySelector("[data-crayon-photo='blocks'] [data-crayon-frame]")!.getAttribute("stroke")).toBe(POOL[1])
    expect(texts(root)).toEqual(expect.arrayContaining(["孩子会长成什么样", "示意图：搭积木（AI 生成）"]))
    // No page number off the content pages.
    expect(root.querySelector('[data-field="slidenum"]')).toBeNull()
  })

  it("the close wears the last section's crayon, a card a way to reach the school, and the line to remember on a tangerine pill", () => {
    const ir = deck([cover, contents, plain("请您配合", "最后一页"), ending])
    const root = svg(ir, 3)
    expect(root.querySelector("[data-face]")!.getAttribute("data-face")).toBe("crayonbox-ending")
    expect(root.querySelector("[data-crayon-capsule='下次见'] rect")!.getAttribute("fill")).toBe(POOL[1])
    expect(root.querySelectorAll("[data-crayon-contact]")).toHaveLength(3)
    expect(root.querySelector("[data-crayon-pill] rect")!.getAttribute("fill")).toBe(resolveStyle("crayon").colors.accent)
    expect(texts(root)).toEqual(expect.arrayContaining(["下次见面：家长开放日", "有事随时找老师", "背景为 AI 生成的示意图"]))
  })

  it("the close takes a list as contact cards, each item's name before its colon", () => {
    const list = { ...ending, components: [{ type: "bullets", items: ["家长开放日：来班里看看孩子的一天", "班级群：每周食谱和通知都发在这里"] }] } as unknown as Slide
    const root = svg(deck([cover, list]), 1)
    expect(Array.from(root.querySelectorAll("[data-crayon-contact]")).map((c) => c.getAttribute("data-crayon-contact"))).toEqual(["家长开放日", "班级群"])
    expect(root.querySelector("[data-gloss-break='：']")).not.toBeNull()
  })

  it("every word the faces set reads on what it stands on", () => {
    const ir = deck([cover, contents, chapter, ending])
    const ground = resolveStyle("crayon").colors.bg
    for (const index of [0, 2]) {
      for (const t of Array.from(svg(ir, index).querySelectorAll("[data-crayon-title] text, [data-crayon-subtitle] text, [data-crayon-date] text"))) {
        expect(contrastRatio(t.getAttribute("fill")!, ground)).toBeGreaterThanOrEqual(3)
      }
    }
  })
})
