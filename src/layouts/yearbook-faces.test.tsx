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
 * almanac's faces, drawn to its 2026-10 board (`design/rounds/2026-10-05-almanac/`):
 * the yearbook's cover with its photograph and run of years, the sheet's
 * frame round every content page with its strip of years, and the
 * decisions over a photograph.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "almanac.pptx",
    theme: { id: "almanac" },
    meta: { organization: "可持续发展部", date: "2026 年 10 月" },
    footer: { page_number: true, organization: true },
    assets: { images: { port: { src: PHOTO }, wind: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover: Slide = {
  type: "cover",
  heading: "CBAM 开始计费：先改报实际排放",
  subheading: "董事会 ESG 委员会汇报",
  background: { kind: "asset", asset_id: "port" },
  components: [
    {
      type: "timeline",
      title: "免费配额（CBAM 因子）从 97.5% 退到 0",
      milestones: [
        { date: "2026", title: "97.5%" },
        { date: "2034", title: "0%", highlight: true },
      ],
    },
  ],
} as Slide

const sheet = (heading: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "决定", heading, years: { from: 2026, to: 2034, marked: [2026, 2027] }, components: [{ type: "paragraph", text: "正文。" }], footnote: "来源：条例 (EU) 2025/2083", ...extra }) as Slide

const ending: Slide = {
  type: "ending",
  kicker: "决定",
  heading: "请委员会今天决定三件事",
  subheading: "可持续发展部 · 2026 年 10 月",
  background: { kind: "asset", asset_id: "wind" },
  components: [{ type: "bullets", items: ["改报实际值：**启动 2026 年排放核算和核查**", "绿电：按国内考核比例列绿证采购预算", "工艺：电炉和直接还原铁可研列入预算项"] }],
} as Slide

const root = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const textsOf = (el: Element) => Array.from(el.querySelectorAll("text")).map((t) => (t.textContent ?? "").trim())

describe("yearbook cover", () => {
  it("keeps its own page over a photograph: the photograph squared on the right, the office, the title, the run of years", () => {
    const ir = deck([cover])
    expect(resolveEffectiveFace(ir, cover, getThemeDefinition("almanac"))).toMatchObject({ route: "layout", layoutId: "yearbook-cover" })
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 0)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("yearbook-cover")
    const photo = page.querySelector("[data-yearbook-photo]")!
    expect([photo.getAttribute("x"), photo.getAttribute("width"), photo.getAttribute("height")]).toEqual(["560", "720", "720"])
    expect(photo.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice")
    // The face paints its own ground left of the photograph: no full-page background under it.
    expect(page.querySelector("[data-yearbook-ground]")!.getAttribute("width")).toBe("560")
    const all = textsOf(page)
    for (const words of ["2026", "2034", "97.5%", "0%", "免费配额（CBAM 因子）从 97.5% 退到 0", "2026 年 10 月"]) expect(all).toContain(words)
    expect(page.querySelector("[data-yearbook-cover-head]")!.textContent).toContain("董事会 ESG 委员会汇报")
    // Nine years, the two the timeline names filled.
    expect(page.querySelectorAll("[data-yearbook-scale] [data-year]")).toHaveLength(9)
    expect(page.querySelectorAll("[data-yearbook-contours] path")).toHaveLength(6)
  })

  it("lays the whole page in its colour when there is no photograph", () => {
    const page = root(deck([{ ...cover, background: undefined } as Slide]), 0)
    expect(page.querySelector("[data-yearbook-photo]")).toBeNull()
    expect(page.querySelector("[data-yearbook-ground]")!.getAttribute("width")).toBe("1280")
  })

  it("sets a long office and occasion untracked over two lines rather than cut them", () => {
    const ir = deck([{ ...cover, subheading: "Briefing for the Board ESG Committee on the first year of charging" } as Slide], { meta: { organization: "Sustainability Department", date: "October 2026" } })
    const page = root(ir, 0)
    const head = page.querySelector("[data-yearbook-cover-head]")!
    expect(head.querySelectorAll("text").length).toBe(2)
    expect(page.querySelector("[data-dropped]")).toBeNull()
  })
})

describe("yearbook sheet", () => {
  it("names the section beside the motif's sprout, lights the page's years and sets the claim over a hairline", () => {
    const ir = deck([cover, sheet("请委员会定两件事：改报实际排放，为三条线列预算项")])
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 1)
    expect(page.querySelector("[data-yearbook-section]")!.textContent).toBe("决定")
    const lit = Array.from(page.querySelectorAll("[data-yearbook-strip] [data-year-lit]")).map((g) => g.getAttribute("data-year"))
    expect(lit).toEqual(["2026", "2027"])
    expect(textsOf(page.querySelector("[data-yearbook-strip]")!)).toEqual(["2026", "2027", "2034"])
    expect(page.querySelector('[data-decor-piece="sprout"]')).not.toBeNull()
    const title = Array.from(page.querySelectorAll("[data-yearbook-head] text")).find((t) => t.textContent!.startsWith("请委员会"))!
    expect(title.getAttribute("font-size")).toBe("30")
    expect(page.querySelector("[data-yearbook-source] text")!.getAttribute("data-font-floor-exempt")).toBe("yearbook-spec")
  })

  it("refuses a strip of years on a face of another theme", () => {
    const ir = deck([sheet("x")], { theme: { id: "clinic" } })
    expect(validateIr(ir).errors.map((e) => e.path)).toContain("slides.0.years")
  })

  it("sets a page's tag at the body's top when no composition takes it", () => {
    const ir = deck([cover, sheet("x", { tag: { text: "条例 (EU) 2025/2083", basis: "law" } })])
    const page = root(ir, 1)
    expect(page.querySelector("[data-yearbook-page-tag] text")!.textContent).toBe("§ 条例 (EU) 2025/2083")
  })
})

describe("yearbook ending", () => {
  it("lays the photograph under a scrim from the left and sets each decision on a card, the marked one in the accent", () => {
    const ir = deck([cover, sheet("x"), ending])
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 2)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("yearbook-ending")
    expect(page.querySelector("[data-photo-scrim]")).not.toBeNull()
    // The photograph goes down under the page, clean.
    expect(page.querySelector('[data-depth="bg"] image')).not.toBeNull()
    expect(page.querySelectorAll("[data-yearbook-decision]")).toHaveLength(3)
    expect(page.querySelectorAll("[data-yearbook-decision='marked']")).toHaveLength(1)
    const all = textsOf(page)
    for (const words of ["启动 2026 年排放核算和核查", "改", "可持续发展部 · 2026 年 10 月"]) expect(all.join("|")).toContain(words)
    expect(all.join("")).not.toContain("**")
  })
})
