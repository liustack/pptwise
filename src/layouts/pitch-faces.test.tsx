// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { resolveEffectiveFace } from "../render/layout-selection"
import { parseSvgRoot } from "../render/serialize"
import { getThemeDefinition } from "../themes/definitions"
import { validateIr } from "../validate-core"

await installNodePlatform()

/*
 * ember's faces, drawn to its 2026-10 board (`design/rounds/2026-10-06-ember/`):
 * the pitch's cover over its photograph, an act with its number outlined in
 * the fire, the sheet's frame round every content page with the running
 * order, the photograph page, and the close with its button.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const FIRE = "#E56A2C"
const COURSE = { stages: ["机会", "时机", "竞争", "切入", "证明", "风险", "计划", "请求"].map((label) => ({ label })) }

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "ember.pptx",
    theme: { id: "ember" },
    meta: { date: "2026 年 10 月" },
    footer: { page_number: true, label: "种子轮路演" },
    course: COURSE,
    assets: { images: { dusk: { src: PHOTO }, medkit: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    kicker: "种子轮路演",
    heading: "低空即时配送：先飞医疗和社区",
    subheading: "一家还没开飞的公司，用 18 个月证明三件事",
    background: { kind: "asset", asset_id: "dusk" },
    components: [{ type: "bullets", items: ["医疗 + 社区", "园区和城郊先行", "18 个月三道验证"] }],
    ...extra,
  }) as Slide

const chapter: Slide = {
  type: "chapter",
  heading: "订单池很大，天上几乎还是空的",
  background: { kind: "asset", asset_id: "dusk" },
  components: [{ type: "row_cards", items: [{ icon: "package", title: "一年 600 亿单" }, { icon: "trending-up", title: "为什么是现在" }, { icon: "map-pin", title: "医疗起降点" }, { icon: "users", title: "六家先行者" }] }],
} as Slide

const sheet = (extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", stage: "机会", heading: "一年 600 亿单即时配送，无人机多年累计才过百万单", components: [{ type: "paragraph", text: "正文。" }], footnote: "来源：中物联（2026-03-26）", ...extra }) as Slide

const photo = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "photo",
    stage: "切入",
    heading: "医疗单够轻、够急，先行者已经送过 460 万管标本",
    components: [
      { type: "image", asset_id: "medkit", caption: "示意图，AI 生成", fit: "cover" },
      { type: "kpi_cards", items: [{ value: "**460 万**", label: "迅蚁累计运送医疗标本（管）" }, { value: "81 万", label: "美团累计配送检验样本和药品（份）" }, { value: "2.5 kg", label: "美团第四代机最大载重" }] },
    ],
    footnote: "来源：中华网（2025-11-26）",
    ...extra,
  }) as Slide

const ending = (components: Slide["components"] = [
  { type: "timeline", milestones: [{ date: "第 6 个月", title: "运营合格证", icon: "file-check" }, { date: "第 9 个月", title: "首条医疗航线", icon: "hospital" }] },
  { type: "paragraph", text: "约个时间聊" },
] as Slide["components"]): Slide => ({ type: "ending", heading: "一起把第一条医疗航线飞起来", subheading: "18 个月，三道验证", components }) as Slide

function page(ir: PptxIR, index: number) {
  return parseSvgRoot(renderSlideSvg(ir, index))
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => t.textContent ?? "")

describe("ember's menu", () => {
  it("sets the cover, the act, every content kind and the close on the pitch faces", () => {
    const theme = getThemeDefinition("ember")
    expect(theme.menu.cover.face).toBe("pitch-cover")
    expect(theme.menu.chapter.face).toBe("pitch-chapter")
    expect(theme.menu.ending.face).toBe("pitch-ending")
    for (const [kind, entry] of Object.entries(theme.menu.content)) expect(entry!.face, kind).toBe(kind === "photo" ? "pitch-photo" : "pitch-sheet")
    const ir = deck([cover(), chapter, sheet(), photo(), ending()])
    expect(ir.slides.map((s) => resolveEffectiveFace(ir, s, theme).layoutId)).toEqual(["pitch-cover", "pitch-chapter", "pitch-sheet", "pitch-photo", "pitch-ending"])
    expect(validateIr(ir).ok).toBe(true)
  })

  it("refuses a kicker on a content page: the rail names the page's beat", () => {
    const v = validateIr(deck([cover(), sheet({ kicker: "机会" })]))
    expect(v.ok).toBe(false)
    expect(v.errors.some((e) => /kicker/.test(e.message))).toBe(true)
  })
})

describe("pitch-cover", () => {
  it("keeps the fire's wedge and the occasion over the photograph", () => {
    const root = page(deck([cover()]), 0)
    expect(root.querySelector("[data-pitch-wedge]")!.getAttribute("fill")).toBe(FIRE)
    expect(root.querySelector("[data-pitch-scrim]")).not.toBeNull()
    expect(root.querySelector("[data-pitch-cover-head] text")!.textContent).toBe("种子轮路演 · 2026 年 10 月")
    expect(root.querySelectorAll("[data-pitch-chips] rect")).toHaveLength(3)
    expect(texts(root)).toContain("低空即时配送：先飞医疗和社区")
  })

  it("keeps the wedge on a cover with no photograph, with no darkening to lay", () => {
    const root = page(deck([cover({ background: undefined })]), 0)
    expect(root.querySelector("[data-pitch-wedge]")).not.toBeNull()
    expect(root.querySelector("[data-pitch-scrim]")).toBeNull()
  })
})

describe("pitch-chapter", () => {
  it("outlines the act's number in the fire, full strength, over the photograph", () => {
    const root = page(deck([cover(), chapter, sheet(), chapter]), 3)
    const numeral = root.querySelector("[data-pitch-numeral]")!
    expect(numeral.textContent).toBe("02")
    expect([numeral.getAttribute("fill"), numeral.getAttribute("stroke"), numeral.getAttribute("stroke-opacity")]).toEqual(["none", FIRE, null])
    expect(numeral.closest("[data-depth]")!.getAttribute("data-depth")).toBe("fg")
    expect(root.querySelectorAll("[data-pitch-chapter-points] [data-pitch-icon]")).toHaveLength(4)
  })

  it("declares the points dropped past four", () => {
    const five = { ...chapter, components: [{ type: "row_cards", items: Array.from({ length: 5 }, (_, i) => ({ icon: "package", title: `要点 ${i + 1}` })) }] } as Slide
    expect(validateIr(deck([cover(), five])).ok).toBe(false)
  })
})

describe("pitch-sheet", () => {
  it("lights the page's beat on the rail and ends the claim on y160", () => {
    const root = page(deck([cover(), sheet()]), 1)
    const lit = root.querySelector("[data-pitch-rail] [data-stage-lit]")!
    expect(lit.getAttribute("data-stage")).toBe("机会")
    expect(lit.querySelector("rect")).not.toBeNull()
    expect(root.querySelectorAll("[data-pitch-rail] [data-stage]")).toHaveLength(8)
    const title = root.querySelector("[data-pitch-title] text")!
    expect(Number(title.getAttribute("y"))).toBeGreaterThan(140)
    expect(Number(title.getAttribute("y"))).toBeLessThan(160)
    expect(root.querySelector("[data-pitch-label] text")!.textContent).toBe("种子轮路演")
    expect(texts(root)).toContain("来源：中物联（2026-03-26）")
  })
})

describe("pitch-photo", () => {
  it("sets the photograph down the left half and the lit figure in the column beside it", () => {
    const root = page(deck([cover(), photo()]), 1)
    const image = root.querySelector("[data-pitch-photo]")!
    expect([image.getAttribute("x"), image.getAttribute("width"), image.getAttribute("height")]).toEqual(["0", "560", "720"])
    expect(root.querySelector("[data-gauge-module='spotlight']")).not.toBeNull()
    const title = root.querySelector("[data-pitch-title] text")!
    expect(title.getAttribute("x")).toBe("624")
    expect(texts(root)).toContain("示意图，AI 生成")
    // The deck's label joins the folio beside the photograph.
    expect(root.querySelector("[data-pitch-label]")).toBeNull()
    expect(texts(root)).toContain("种子轮路演")
  })

  it("sets a photo page with no photograph as an ordinary sheet", () => {
    const root = page(deck([cover(), photo({ components: [{ type: "paragraph", text: "正文。" }] })]), 1)
    expect(root.querySelector("[data-pitch-photo]")).toBeNull()
    expect(root.querySelector("[data-pitch-title] text")!.getAttribute("x")).toBe("64")
  })
})

describe("pitch-ending", () => {
  it("keeps the wedge and sets the author's own words on the button", () => {
    const root = page(deck([cover(), ending()]), 1)
    expect(root.querySelector("[data-pitch-wedge]")).not.toBeNull()
    const button = root.querySelector("[data-pitch-fire='ask']")!
    expect(button.querySelector("text")!.textContent).toBe("约个时间聊")
    expect(button.querySelector("rect")!.getAttribute("fill")).toBe(FIRE)
    expect(root.querySelectorAll("[data-pitch-recap] [data-pitch-icon]")).toHaveLength(2)
  })

  it("draws no button the author did not write", () => {
    const root = page(deck([cover(), ending([])]), 1)
    expect(root.querySelector("[data-pitch-fire='ask']")).toBeNull()
    expect(texts(root).some((t) => /Let's talk|聊/.test(t))).toBe(false)
  })
})
