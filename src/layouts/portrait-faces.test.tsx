// @vitest-environment node
import { describe, expect, it } from "vitest"
import { createElement } from "react"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import { treeFooterPack, treeFrameLeft, treeFrameRight } from "../render/frame-left"
import { portraitSectionText } from "./portrait-shared"
import { testCtx } from "./compositions/__fixtures__/kit"

await installNodePlatform()

/*
 * profile's faces, drawn to its 2026-10 board (`design/rounds/2026-10-12-profile/`):
 * the cover with the speaker's name beside their portrait, a chapter, the
 * sheet's section line and claim over the ordinary renderer when no
 * composition takes the page, and the close with the round portrait on its
 * card; and the motif's footer row, which moves into the column a bled
 * photograph leaves it.
 */

/** A PNG header that says `w` by `h`, so a crop has a shape to work from. */
function pngOf(w: number, h: number): string {
  const bytes = new Uint8Array(33)
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52])
  const view = new DataView(bytes.buffer)
  view.setUint32(16, w)
  view.setUint32(20, h)
  return `data:image/png;base64,${Buffer.from(bytes).toString("base64")}`
}

const LABEL = "示例人物，姓名和数据均为虚构"

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "profile.pptx",
    theme: { id: "profile" },
    meta: { date: "2026 年 10 月", authors: [{ name: "陈立行", role: "会员运营主管" }] },
    footer: { page_number: true, label: LABEL },
    course: { stages: [{ label: "我是谁" }, { label: "做成过" }, { label: "差距" }, { label: "上任后" }] },
    assets: { images: { portrait: { src: pngOf(1086, 1448) }, room: { src: pngOf(1920, 640) } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    kicker: "会员产品经理岗位竞聘",
    heading: "把留住会员的办法，做进产品里",
    subheading: "竞聘会员产品经理",
    background: { kind: "asset", asset_id: "portrait" },
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: "9 年", label: "在会员一线", note: "客服到会员运营" },
          { value: "3 次", label: "主导会员规则改版", note: "生日券、储值卡、唤回" },
          { value: "13.4 万", label: "请回来的沉睡会员", note: "2025 年全量" },
        ],
      },
    ],
    ...extra,
  }) as Slide

const sheet = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", stage, heading: "九年都在会员身边，从接投诉做到改规则", components: [{ type: "bullets", items: ["接过上千通会员电话", "每周看会员看板", "储值卡改版牵头四个部门"] }], ...extra }) as Slide

const chapter = (stage: string): Slide => ({ type: "chapter", stage, heading: "做成过的三件事", subheading: "生日券、储值卡、沉睡会员唤回", components: [] }) as unknown as Slide

const ending = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "ending",
    heading: "谢谢各位，90 天后我用唤回率和路线图交账",
    subheading: "会员运营主管，竞聘会员产品经理",
    background: { kind: "asset", asset_id: "room" },
    footnote: "图为 AI 生成的示意图",
    components: [
      { type: "paragraph", text: "请各位评委提问指教" },
      { type: "image", asset_id: "portrait" },
    ],
    ...extra,
  }) as Slide

const page = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const byText = (root: Element, words: string) => Array.from(root.querySelectorAll("text")).find((t) => (t.textContent ?? "").replace(/\s/g, "") === words.replace(/\s/g, ""))

describe("the portrait faces on profile", () => {
  const ir = deck([cover(), sheet("我是谁"), chapter("做成过"), sheet("做成过"), ending()])

  it("validate the sample's page fields", () => {
    const v = validateIr(ir)
    expect(v.ok, JSON.stringify(v.errors)).toBe(true)
  })

  it("cover: the occasion and the date over a rule, the name at 112px, the role row, three facts and the portrait from x640", () => {
    const root = page(ir, 0)
    expect(root.querySelector("[data-face='portrait-cover']")).not.toBeNull()
    expect(root.querySelector("[data-portrait-occasion]")).not.toBeNull()
    expect(byText(root, "2026 年 10 月")).toBeDefined()
    const name = root.querySelector("[data-portrait-name] text")!
    expect(name.getAttribute("font-size")).toBe("112")
    expect(root.querySelector("[data-portrait-role] [data-portrait-arrow]")).not.toBeNull()
    expect(root.querySelectorAll("[data-portrait-fact]")).toHaveLength(3)
    expect(root.querySelector("[data-portrait-photo='portrait']")).not.toBeNull()
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("cover: a longer name steps down to fit, and a role row too long for one line puts the target under the role", () => {
    const en = deck([cover({ kicker: "Internal application", heading: "Making member loyalty part of the product", subheading: "Membership Product Manager", components: [] })], {
      meta: { date: "October 2026", authors: [{ name: "Chen Lixing", role: "Membership Ops Lead" }] },
    } as Partial<PptxIR>)
    const root = page(en, 0)
    const size = Number(root.querySelector("[data-portrait-name] text")!.getAttribute("font-size"))
    expect(size).toBeLessThan(112)
    expect(size).toBeGreaterThanOrEqual(72)
    const role = byText(root, "Membership Ops Lead")!
    const target = byText(root, "Membership Product Manager")!
    expect(Number(target.getAttribute("y"))).toBeGreaterThan(Number(role.getAttribute("y")))
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("sheet: the stage's section line and the claim over the ordinary renderer, and the motif's footer row", () => {
    const root = page(ir, 1)
    expect(root.querySelector("[data-face='portrait-sheet']")).not.toBeNull()
    expect(root.querySelector("[data-portrait-section]")!.getAttribute("data-portrait-section")).toBe("一　我是谁")
    expect(byText(root, "九年都在会员身边，从接投诉做到改规则")).toBeDefined()
    expect(root.querySelector("[data-portrait-label]")!.textContent).toBe(LABEL)
    expect(root.querySelector("[data-portrait-speaker]")!.textContent).toBe("陈立行")
    const folio = root.querySelector("[data-portrait-folio]")!
    expect(folio.textContent).toBe("2")
    expect(folio.getAttribute("data-field")).toBe("slidenum")
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("names a stage by its number and label, in the deck's language", () => {
    const { ctx } = testCtx("profile")
    const course = { stages: [{ label: "Who" }, { label: "Proof" }] }
    expect(portraitSectionText({ course }, { stage: "Proof" }, ctx)).toBe("2 Proof")
    expect(portraitSectionText(ir, { stage: "差距" }, ctx)).toBe("三　差距")
    expect(portraitSectionText(ir, { kicker: "附录" }, ctx)).toBe("附录")
  })

  it("chapter: the stage's section line, the title and the subheading", () => {
    const root = page(ir, 2)
    expect(root.querySelector("[data-face='portrait-chapter']")).not.toBeNull()
    expect(root.querySelector("[data-portrait-section]")!.getAttribute("data-portrait-section")).toBe("二　做成过")
    expect(root.querySelector("[data-portrait-chapter-title]")).not.toBeNull()
    expect(root.querySelector("[data-portrait-chapter-sub]")).not.toBeNull()
  })

  it("ending: the photograph at the left, the close, and the card with the round portrait, the name and the summary", () => {
    const root = page(ir, 4)
    expect(root.querySelector("[data-face='portrait-ending']")).not.toBeNull()
    const avatar = root.querySelector("[data-portrait-avatar]")!
    expect(avatar.querySelector("clipPath ellipse, clipPath circle"), "the round clip").not.toBeNull()
    expect(byText(root, "陈立行"), "陈立行").toBeDefined()
    expect(byText(root, "会员运营主管，竞聘会员产品经理"), "会员运营主管，竞聘会员产品经理").toBeDefined()
    expect(byText(root, "请各位评委提问指教"), "请各位评委提问指教").toBeDefined()
    // The credit follows the deck's label in the close's own footer.
    expect(root.textContent!.replace(/\s/g, "")).toContain(`${LABEL}图为AI生成的示意图`)
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })
})

describe("the footer row's frame", () => {
  it("reads where a bled photograph leaves the footer and where the face packs it", () => {
    const tree = createElement("g", { "data-frame-right": 800 }, createElement("g", { "data-footer-pack": "end" }))
    expect(treeFrameRight(tree)).toBe(800)
    expect(treeFooterPack(tree)).toBe("end")
    expect(treeFrameLeft(tree)).toBeUndefined()
    expect(treeFooterPack(createElement("g", { "data-footer-pack": "start" }))).toBeUndefined()
  })
})
