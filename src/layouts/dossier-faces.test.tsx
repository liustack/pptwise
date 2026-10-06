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
 * clinic's faces, drawn to its 2026-10 board (`design/rounds/2026-10-05-clinic/`):
 * the assessment file's cover with its header lines and photograph, the
 * sheet's frame round every content page, and the ballot.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "clinic.pptx",
    theme: { id: "clinic" },
    meta: { organization: "药学部", date: "2026 年 10 月" },
    footer: { page_number: true, organization: true, label: "GLP-1 类减重药进院评估 · 药事会审议" },
    assets: { images: { pen: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover: Slide = {
  type: "cover",
  heading: "GLP-1 类减重药进院评估与院内管理方案",
  subheading: "提请药事管理与药物治疗学委员会审议",
  fields: [
    { label: "议题", value: "进院品种 · 开具范围 · 审核规则" },
    { label: "依据", value: "临床试验 · 药品说明书 · 国家文件 · 医保目录" },
    { label: "日期", value: "2026 年 10 月" },
  ],
  components: [{ type: "image", asset_id: "pen", fit: "cover" }],
} as Slide

const sheet = (heading: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "背景", heading, components: [{ type: "paragraph", text: "正文。" }], footnote: "国家卫生健康委 2025", ...extra }) as Slide

const ending: Slide = {
  type: "ending",
  kicker: "表决",
  heading: "请委员会表决三项",
  fields: [
    { label: "提请", value: "药学部" },
    { label: "日期", value: "2026 年 10 月" },
  ],
  ballot: { choices: ["同意", "不同意", "弃权"], signature: "委员会主任委员签字" },
  components: [
    {
      type: "bullets",
      items: ["品种：纳入替尔泊肽、诺和盈，玛仕度肽临时采购", "范围：体重管理门诊、内分泌科、临床营养科", "规则：前置审核，减重自费，上线 6 个月首评"],
    },
  ],
} as Slide

const root = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const textsOf = (el: Element) => Array.from(el.querySelectorAll("text")).map((t) => (t.textContent ?? "").trim())
const byText = (el: Element, text: string) => Array.from(el.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)

describe("dossier cover", () => {
  it("heads the page with the office and what it asks, then the title, the heartbeat, the header lines and the photograph", () => {
    const ir = deck([cover])
    expect(resolveEffectiveFace(ir, cover, getThemeDefinition("clinic"))).toMatchObject({ route: "layout", layoutId: "dossier-cover" })
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 0)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("dossier-cover")
    const all = textsOf(page)
    for (const words of ["提请药事管理与药物治疗学委员会审议", "议题", "进院品种 · 开具范围 · 审核规则", "日期", "2026 年 10 月"]) expect(all).toContain(words)
    // The office is tracked out letter by letter.
    expect(page.querySelector("[data-dossier-cover-head]")!.textContent).toContain("药")
    expect(page.querySelector("[data-dossier-cover-photo] image")).not.toBeNull()
    const beat = page.querySelector("[data-dossier-heartbeat]")!.getAttribute("points")!
    expect(beat.startsWith("64,410")).toBe(true)
    expect(beat.endsWith("704,410")).toBe(true)
  })

  it("sets a title on one line when it fits and on two when it does not, its last line on the same baseline", () => {
    const short = root(deck([{ ...cover, heading: "进院评估" } as Slide]), 0)
    const long = root(deck([cover]), 0)
    const line = (page: Element, text: string) => Number(byText(page, text)!.getAttribute("y"))
    expect(line(short, "进院评估")).toBe(line(long, "院内管理方案"))
    expect(line(long, "GLP-1 类减重药进院评估与")).toBeLessThan(line(long, "院内管理方案"))
  })

  it("sets the photograph's caption small at the foot of the left column", () => {
    const captioned = { ...cover, components: [{ type: "image", asset_id: "pen", fit: "cover", caption: "示意图：注射笔（AI 生成）" }] } as Slide
    const page = root(deck([captioned]), 0)
    const caption = byText(page, "示意图：注射笔（AI 生成）")!
    expect([caption.getAttribute("x"), caption.getAttribute("font-size")]).toEqual(["64", "12"])
    expect(Number(caption.getAttribute("y"))).toBeGreaterThan(670)
    expect(caption.closest("[data-dossier-cover-photo]")).not.toBeNull()
  })

  it("runs the heartbeat to the page's edge when there is no photograph", () => {
    const page = root(deck([{ ...cover, components: [] } as Slide]), 0)
    expect(page.querySelector("[data-dossier-heartbeat]")!.getAttribute("points")!.endsWith("1280,410")).toBe(true)
  })
})

describe("dossier sheet", () => {
  it("frames a content page: the section beside the heartbeat, the claim over a hairline and a bar of the mark, the source at the foot", () => {
    const page = root(deck([cover, sheet("体重管理门诊今年必须开")]), 1)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("dossier-sheet")
    const label = byText(page, "背景")!
    expect(Number(label.getAttribute("x"))).toBeGreaterThan(100)
    expect(Number(label.getAttribute("y"))).toBeLessThan(50)
    const claim = byText(page, "体重管理门诊今年必须开")!
    expect(Number(claim.getAttribute("x"))).toBe(64)
    expect(Number(claim.getAttribute("font-size"))).toBe(30)
    expect(Number(byText(page, "国家卫生健康委 2025")!.getAttribute("y"))).toBeGreaterThan(650)
    // The motif's folio: the office at the left, the page and the total at the right.
    for (const words of ["药学部", "2", "/ 2", "GLP-1 类减重药进院评估 · 药事会审议"]) expect(textsOf(page)).toContain(words)
  })

  it("sets a page's tag as a capsule over the body, and starts the body under it", () => {
    const tagged = sheet("证据", { tag: { text: "RCT · NEJM 2025", evidence: "trial" } } as Partial<Slide>)
    const ir = deck([cover, tagged])
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 1)
    expect(byText(page, "RCT · NEJM 2025")).toBeDefined()
    // The body's band starts under the tag's room.
    const band = byText(page, "正文。")!.closest("[data-audit-rect]")!.getAttribute("data-audit-rect")!
    expect(band.split(",").map(Number)).toEqual([64, 186 + 40, 1152, 640 - 186 - 40])
  })

  it("refuses a ballot on a content page, which has no place for one", () => {
    const result = validateIr(deck([cover, sheet("理由", { ballot: { choices: ["同意", "不同意"] } } as Partial<Slide>)]))
    expect(result.ok).toBe(false)
  })
})

describe("dossier ballot", () => {
  it("numbers the items, names their kinds, gives each a box per choice, and leaves a line to sign", () => {
    const ir = deck([cover, ending])
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 1)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("dossier-ending")
    const all = textsOf(page)
    for (const words of ["表决", "1", "2", "3", "品种", "纳入替尔泊肽、诺和盈，玛仕度肽临时采购", "同意", "不同意", "弃权", "提请：药学部", "日期：2026 年 10 月", "委员会主任委员签字："]) {
      expect(all).toContain(words)
    }
    expect(page.querySelectorAll("[data-dossier-motion]")).toHaveLength(3)
    expect(page.querySelectorAll("[data-dossier-tickbox]")).toHaveLength(9)
    // The colon between an item's kind and the item is the break, not a glyph.
    expect(page.querySelector("[data-dossier-motion] [data-tracking]")!.getAttribute("data-gloss-break")).toBe("：")
  })

  it("sets a subheading under the rule and moves the items down for it", () => {
    const plain = root(deck([cover, ending]), 1)
    const sub = root(deck([cover, { ...ending, subheading: "三项逐项表决，过半数通过" } as Slide]), 1)
    expect(byText(sub, "三项逐项表决，过半数通过")).toBeDefined()
    const top = (page: Element) => Number(page.querySelector("[data-dossier-motion] rect")!.getAttribute("y"))
    expect(top(sub)).toBeGreaterThan(top(plain))
  })

  it("leaves the boxes out when the page carries no ballot", () => {
    const page = root(deck([cover, { ...ending, ballot: undefined } as Slide]), 1)
    expect(page.querySelectorAll("[data-dossier-tickbox]")).toHaveLength(0)
    expect(page.querySelectorAll("[data-dossier-motion]")).toHaveLength(3)
  })

  it("declares a ballot with boxes of an item's own dropped: its boxes stand in shared columns", () => {
    const own = { ...ending, ballot: { ...(ending as Slide).ballot!, item_choices: [{ item: 2, choices: ["纳入", "暂缓"] }] } } as Slide
    const page = root(deck([cover, own]), 1)
    expect(page.querySelector("[data-dropped]")).not.toBeNull()
  })

  it("refuses a ballot on a cover, which has no place for one", () => {
    const result = validateIr(deck([{ ...cover, ballot: { choices: ["同意", "不同意"] } } as Slide]))
    expect(result.ok).toBe(false)
  })
})
