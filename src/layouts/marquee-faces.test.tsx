// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { sectionNumber } from "./marquee-shared"
import { splitStatement } from "./content-marquee-statement"

await installNodePlatform()

/*
 * rally's faces, drawn to its 2026-10 board (`design/rounds/2026-10-06-rally/`):
 * the campaign's cover over its photograph, a section page, the sheet's frame
 * round every content page with its ticket stub, the one-line plan, and the
 * close with its next steps and its button.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
const LEAD = "#E84F8A"

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "rally.pptx",
    theme: { id: "rally" },
    meta: { organization: "市场部", date: "2026 年 10 月" },
    footer: { page_number: true },
    assets: { images: { crowd: { src: PHOTO }, confetti: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    kicker: "提案",
    heading: "2027 夏季演唱会季",
    subheading: "开场前，散场后：在跨城歌迷的演唱会周末里接住他们",
    background: { kind: "asset", asset_id: "crowd" },
    components: [{ type: "row_cards", items: [{ icon: "calendar-days", title: "6 至 9 月" }, { icon: "map-pin", title: "场外 · 场后 · 城市" }, { icon: "qr-code", title: "每个触点带一个码" }] }],
    ...extra,
  }) as Slide

const statement = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "content",
    kind: "statement",
    kicker: "一句话方案",
    heading: "2027 年夏天，我们不进场馆抢冠名，去**开场前**和**散场后**\n接住跨城歌迷",
    components: [{ type: "icon_cards", items: [{ icon: "cup-soda", title: "场外饮品站", text: "现制杯装，杯上带码" }, { icon: "package", title: "联名包装", text: "包装码，看动销" }, { icon: "ticket", title: "票根换饮", text: "门店券，看到店" }] }],
    ...extra,
  }) as Slide

const sheet = (kicker: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker, heading: "大型演出一年 4338.58 万人次，票房占全国一半以上", components: [{ type: "paragraph", text: "正文。" }], footnote: "来源：中演协（2026-01）", ...extra }) as Slide

const chapter = (kicker: string): Slide => ({ type: "chapter", kicker, heading: "为什么押演唱会", subheading: "大盘在涨，演唱会和音乐节在分岔", components: [] }) as unknown as Slide

const ending = (components: Slide["components"] = [
  { type: "timeline", milestones: [{ date: "11 月", title: "拿出首批城市和场次清单" }, { date: "12 月", title: "联名包装立项" }, { date: "2027 年 6 月", title: "首站开场" }] },
  { type: "paragraph", text: "拍板，开场" },
] as Slide["components"]): Slide =>
  ({ type: "ending", kicker: "下一步", heading: "10 月拍板，11 月开谈第一站", subheading: "开场前，散场后 · 2027 夏季演唱会季", background: { kind: "asset", asset_id: "confetti" }, components }) as Slide

function page(ir: PptxIR, index: number) {
  return parseSvgRoot(renderSlideSvg(ir, index))
}

const texts = (root: Element) => Array.from(root.querySelectorAll("text")).map((t) => (t.textContent ?? "").trim())

describe("the section numbers", () => {
  it("count the distinct names of chapter and content pages in the order they first appear", () => {
    const ir = deck([cover(), statement(), chapter("市场"), sheet("大盘"), sheet("大盘"), sheet("分岔"), ending()])
    expect(ir.slides.map((s) => sectionNumber(ir, s))).toEqual([null, "01", "02", "03", "03", "04", null])
  })

  it("leave a page with no name without a ticket", () => {
    const ir = deck([cover(), sheet("")])
    expect(page(ir, 1).querySelector("[data-marquee-ticket]")).toBeNull()
  })
})

describe("the marquee faces on rally", () => {
  const ir = deck([cover(), statement(), sheet("大盘"), chapter("市场"), ending()])

  it("validate the sample's page fields, and refuse a ballot on the one-line plan", () => {
    const v = validateIr(ir)
    expect(v.ok, JSON.stringify(v.errors)).toBe(true)
    const ballot = validateIr(deck([cover(), statement({ ballot: { choices: ["批准", "再议"] } })]))
    expect(ballot.ok).toBe(false)
    expect(ballot.errors.some((e) => /ballot/.test(e.message))).toBe(true)
  })

  it("cover: the ticket of what it is and who brings it when, the title, the line in the lead and the pills with their icons", () => {
    const root = page(ir, 0)
    expect(root.querySelector("[data-face='marquee-cover']")).not.toBeNull()
    const ticket = texts(root.querySelector("[data-marquee-ticket]")!)
    expect(ticket).toEqual(["提案", "市场部 · 2026 年 10 月"])
    expect(root.querySelectorAll("[data-marquee-pills] [data-marquee-icon]")).toHaveLength(3)
    expect(root.querySelector("[data-marquee-confetti]")).not.toBeNull()
    const sub = root.querySelector("[data-marquee-cover-sub] text")!
    expect(sub.getAttribute("fill")!.toUpperCase()).toBe(LEAD)
  })

  it("statement: no title bar, the lead-in grey, the claim in the author's two lines with the marked words in the lead", () => {
    const root = page(ir, 1)
    expect(root.querySelector("[data-marquee-title]")).toBeNull()
    expect(texts(root.querySelector("[data-marquee-lead-in]")!)).toEqual(["2027 年夏天，我们不进场馆抢冠名，"])
    const claim = Array.from(root.querySelectorAll("[data-marquee-claim-line] text"))
    expect(claim.map((t) => (t.textContent ?? "").trim())).toEqual(["去开场前和散场后", "接住跨城歌迷"])
    expect(Number(claim[1]!.getAttribute("y")) - Number(claim[0]!.getAttribute("y"))).toBe(112)
    expect(Array.from(claim[0]!.querySelectorAll("tspan")).some((t) => t.getAttribute("fill")?.toUpperCase() === LEAD)).toBe(true)
    // The motif leaves its pile to the face's two bands.
    expect(root.querySelectorAll("[data-marquee-confetti]")).toHaveLength(1)
    expect(texts(root.querySelector("[data-marquee-folio]")!)).toEqual(["2", "/ 5"])
  })

  it("statement: hands a page it cannot set to the sheet instead of leaving its body out", () => {
    const list = { type: "bullets", items: ["上海", "杭州"] }
    const root = page(deck([cover(), statement({ components: [list] as Slide["components"] })]), 1)
    expect(root.querySelector("[data-face-stepped-aside='marquee-statement']")).not.toBeNull()
    expect(texts(root)).toContain("上海")
  })

  it("splits a heading at its last comma and keeps the author's lines", () => {
    expect(splitStatement("Skip naming rights, meet fans\n**before** and **after**")).toEqual({ lead: "Skip naming rights,", lines: ["meet fans", "**before** and **after**"] })
    expect(splitStatement("没有逗号的一句话")).toEqual({ lead: null, lines: ["没有逗号的一句话"] })
  })

  it("sheet: the section's ticket, the claim's last line ending at y172 and the source from y650", () => {
    const root = page(ir, 2)
    expect(texts(root.querySelector("[data-marquee-ticket]")!)).toEqual(["02", "大盘"])
    const title = root.querySelector("[data-marquee-title] text")!
    expect(Number(title.getAttribute("y"))).toBe(162)
    expect(Number(root.querySelector("[data-marquee-source] text")!.getAttribute("y"))).toBe(663)
  })

  it("chapter: the section's ticket and a burst of confetti, no folio", () => {
    const root = page(ir, 3)
    expect(texts(root.querySelector("[data-marquee-ticket]")!)).toEqual(["03", "市场"])
    expect(root.querySelector("[data-marquee-folio]")).toBeNull()
  })

  it("ending: the next steps on a dotted line that never crosses a word, and the author's button", () => {
    const root = page(ir, 4)
    expect(texts(root.querySelector("[data-marquee-ticket]")!)).toEqual(["下一步", "开场前，散场后 · 2027 夏季演唱会季"])
    const lines = Array.from(root.querySelectorAll("[data-marquee-next] line"))
    expect(lines).toHaveLength(2)
    expect(texts(root.querySelector("[data-marquee-lead='ask']")!)).toEqual(["拍板，开场"])
    // The photograph goes down clean: the face lays its own darkening.
    expect(root.querySelector("rect[fill-opacity]")).toBeNull()
  })

  it("ending without a paragraph draws no button", () => {
    const root = page(deck([cover(), ending([ending().components[0]!])]), 1)
    expect(root.querySelector("[data-marquee-lead='ask']")).toBeNull()
  })

  it("declare a ticket whose words run past the page", () => {
    const long = deck([cover(), sheet("一个长到放不下的分区名".repeat(12))])
    expect(page(long, 1).querySelector("[data-dropped-kind='label']")).not.toBeNull()
  })
})
