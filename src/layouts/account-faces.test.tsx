// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { parseSvgRoot } from "../render/serialize"
import { validateIr } from "../validate-core"
import type { ComponentCtx } from "../components/types"
import { AccountFooterSource, FOOTER } from "./account-shared"
import { accountWidth } from "./compositions/account"
import { testCtx } from "./compositions/__fixtures__/kit"

await installNodePlatform()

/*
 * recap's faces, drawn to its 2026-10 board (`design/rounds/2026-10-13-recap/`):
 * the cover with the photograph across the top, the year's conclusion, the
 * speaker's particulars and three figures, a chapter numbered from the
 * course, the sheet's section line and claim over the ordinary renderer
 * when no composition takes the page, and the close with the asks to tick;
 * and the motif's footer row with the speaker and the occasion.
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
    filename: "recap.pptx",
    theme: { id: "recap" },
    meta: { date: "2027 年 1 月", authors: [{ name: "周启航", role: "华东区渠道销售经理", org: "某消费电子品牌华东区渠道部" }] },
    footer: { page_number: true, label: LABEL },
    course: { stages: [{ label: "今年的账" }, { label: "今年做的事" }, { label: "明年" }] },
    assets: { images: { city: { src: pngOf(1920, 640) }, shelves: { src: pngOf(1280, 1920) } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "cover",
    kicker: "2026 年度述职",
    heading: "全年完成 105%，增量主要来自两条新渠道",
    background: { kind: "asset", asset_id: "city" },
    fields: [
      { label: "述职人", value: "周启航" },
      { label: "岗位", value: "华东区渠道销售经理" },
    ],
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: "4.41 亿元", label: "全年出货" },
          { value: "105.0%", label: "目标完成率" },
          { value: "**4,950 万元**", label: "两条新渠道", tag: { text: "我牵头" } },
        ],
      },
    ],
    ...extra,
  }) as Slide

const sheet = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", stage, heading: "三件事里，两件是我牵头做成的", components: [{ type: "bullets", items: ["连锁卖场进了 120 家店", "运营商渠道做到 210 个营业厅", "周度补货看板压低渠道库存"] }], ...extra }) as Slide

const chapter = (stage: string, extra: Partial<Slide> = {}): Slide =>
  ({
    type: "chapter",
    stage,
    heading: "三件我做成的事",
    subheading: "每件分清哪些是我做的，哪些是团队做的",
    background: { kind: "asset", asset_id: "shelves" },
    components: [
      {
        type: "row_cards",
        items: [
          { title: "连锁卖场进了 120 家店", text: "3,100 万元", sub: "我牵头", highlight: true },
          { title: "运营商渠道做到 210 个营业厅", text: "1,850 万元", sub: "我牵头", highlight: true },
          { title: "周度补货看板压低渠道库存", text: "52 → 34 天", sub: "我牵头", highlight: true },
        ],
      },
    ],
    ...extra,
  }) as unknown as Slide

const ending = (extra: Partial<Slide> = {}): Slide =>
  ({
    type: "ending",
    heading: "5 亿元的目标我接下，三项支持请今天定",
    subheading: "需要评审小组确认",
    components: [{ type: "bullets", style: "checklist", items: ["运营商、苏北各增 1 个编制", "", "卖场费用提到 880 万元", "苏北分销账期放到 45 天"] }],
    ...extra,
  }) as Slide

const page = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const flat = (root: Element) => (root.textContent ?? "").replace(/\s/g, "")

describe("the account faces on recap", () => {
  const ir = deck([cover(), sheet("今年的账"), chapter("今年做的事"), sheet("今年做的事"), ending()])

  it("validate the sample's page fields", () => {
    const v = validateIr(ir)
    expect(v.ok, JSON.stringify(v.errors)).toBe(true)
  })

  it("cover: the photograph from the top edge, the occasion and the date, the conclusion, the particulars and three figures", () => {
    const root = page(ir, 0)
    expect(root.querySelector("[data-face='account-cover']")).not.toBeNull()
    expect(root.querySelector("[data-account-occasion]")!.getAttribute("data-account-occasion")).toBe("2026 年度述职")
    expect(root.querySelector("[data-account-date]")!.getAttribute("data-account-date")).toBe("2027 年 1 月")
    expect(root.querySelectorAll("[data-account-field]")).toHaveLength(2)
    expect(root.querySelectorAll("[data-account-fact]")).toHaveLength(3)
    expect(root.querySelectorAll("[data-account-fact][data-lit]")).toHaveLength(1)
    expect(flat(root)).toContain("我牵头")
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("cover: sets a subheading under the conclusion and leaves a strip of paper above the photograph for a classification", () => {
    const marked = deck([cover({ subheading: "董事会审议稿" })], { meta: { ...ir.meta, classification: "秘密★1年" } } as Partial<PptxIR>)
    const root = page(marked, 0)
    expect(flat(root.querySelector("[data-account-cover-sub]")!)).toBe("董事会审议稿")
    const mark = root.querySelector('[data-cover-mark="classification"]')!
    expect(mark.textContent).toBe("秘密★1年")
    expect(Number(mark.getAttribute("y"))).toBeLessThan(72)
    const clip = root.querySelector("clipPath rect")
    if (clip) expect(Number(clip.getAttribute("y"))).toBe(72)
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("chapter: the number from the course with the stage's name beside it, the title, and the rows with their figures", () => {
    const root = page(ir, 2)
    expect(root.querySelector("[data-face='account-chapter']")).not.toBeNull()
    expect(root.querySelector("[data-account-chapter-number]")!.getAttribute("data-account-chapter-number")).toBe("02")
    expect(root.querySelector("[data-account-chapter-stage]")!.getAttribute("data-account-chapter-stage")).toBe("今年做的事")
    expect(root.querySelector("[data-account-chapter-title]")).not.toBeNull()
    expect(root.querySelector("[data-account-chapter-sub]")).not.toBeNull()
    expect(root.querySelectorAll("[data-account-chapter-row]")).toHaveLength(3)
    expect(flat(root)).toContain("3,100")
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("chapter: without a photograph the title takes the whole measure", () => {
    const wide = deck([chapter("今年做的事", { background: undefined, heading: "今年做成的三件事，以及每一件里哪一部分是我自己做的" } as Partial<Slide>)])
    expect(validateIr(wide).ok).toBe(true)
    const root = page(wide, 0)
    expect(root.querySelector("[data-account-chapter-title]")).not.toBeNull()
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("sheet: the stage's section line and the claim over the ordinary renderer, and the motif's footer row", () => {
    const root = page(ir, 3)
    expect(root.querySelector("[data-face='account-sheet']")).not.toBeNull()
    expect(flat(root)).toContain("02今年做的事")
    expect(flat(root)).toContain("三件事里，两件是我牵头做成的")
    expect(root.querySelector("[data-account-label]")!.textContent).toBe(LABEL)
    expect(root.querySelector("[data-account-speaker]")!.textContent).toBe("周启航 · 2026 年度述职")
    const folio = root.querySelector("[data-account-folio]")!
    expect(folio.textContent).toBe("4")
    expect(folio.getAttribute("data-field")).toBe("slidenum")
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })

  it("ending: the commitment on the block, an empty box beside each ask with words, and the signature", () => {
    const root = page(ir, 4)
    expect(root.querySelector("[data-face='account-ending']")).not.toBeNull()
    expect(root.querySelector("[data-account-block]")).not.toBeNull()
    const asks = Array.from(root.querySelectorAll("[data-account-ask]")).map((a) => a.getAttribute("data-account-ask"))
    expect(asks).toEqual(["运营商、苏北各增 1 个编制", "卖场费用提到 880 万元", "苏北分销账期放到 45 天"])
    expect(flat(root.querySelector("[data-account-signature]")!)).toBe("周启航华东区渠道销售经理·某消费电子品牌华东区渠道部")
    expect(root.querySelector("[data-dropped]")).toBeNull()
  })
})

describe("the account footer's source", () => {
  it("follows a Chinese label after an ideographic space and a Latin one after the wider pack gap", () => {
    const { ctx } = testCtx("recap")
    const at = (label: string, footnote: string) => {
      const el = AccountFooterSource({ slide: { footnote }, ctx: ctx as ComponentCtx, x: 80, w: 1120, label, endWidth: 0 })!
      return Number((el.props as { x: number }).x) - 80 - accountWidth(label, FOOTER.size, ctx)
    }
    expect(at(LABEL, "图为示意图")).toBeCloseTo(FOOTER.gap, 6)
    expect(at("Fictional example: the person and figures are invented", "Illustrative image")).toBeCloseTo(FOOTER.packGap, 6)
  })
})
