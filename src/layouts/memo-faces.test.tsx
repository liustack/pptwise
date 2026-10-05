// @vitest-environment node
import { describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "../api"
import { installNodePlatform } from "../platform/node"
import { resolveEffectiveFace } from "../render/layout-selection"
import { parseSvgRoot } from "../render/serialize"
import { getThemeDefinition } from "../themes/definitions"
import { validateIr } from "../validate-core"
import { exhibitNumberAt } from "./memo-shared"

await installNodePlatform()

/*
 * memo's faces, drawn to its 2026-10 board (`design/rounds/2026-10-05-memo/`):
 * the typed cover with its header lines, exhibit and stamp, the sheet's
 * frame round every content page, and the sign-off.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "memo.pptx",
    theme: { id: "memo" },
    meta: { organization: "管理层 · 人力资源部", date: "2026 年 10 月" },
    assets: { images: { office: { src: PHOTO }, desk: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover: Slide = {
  type: "cover",
  heading: "2027 年上半年，每周工作四天",
  subheading: "1 月 4 日起，为期六个月",
  fields: [
    { label: "致", value: "全体员工、各部门负责人" },
    { label: "发", value: "管理层 · 人力资源部" },
    { label: "日期", value: "2026 年 10 月" },
    { label: "事由", value: "试行每周 32 小时、薪酬不变的四天工作制" },
  ],
  stamp: { text: "已决定", date: "2026 · 10" },
  components: [{ type: "image", asset_id: "office", caption: "周五早晨空着的工位（示意）", fit: "cover" }],
} as Slide

const sheet = (heading: string, extra: Partial<Slide> = {}): Slide =>
  ({ type: "content", kind: "points", kicker: "理由", heading, components: [{ type: "paragraph", text: "正文。" }], footnote: "英国 4 Day Week 试点报告", ...extra } as Slide)

const ending: Slide = {
  type: "ending",
  kicker: "决定",
  heading: "试行每周四天、32 小时，薪酬不变，触发停止条件即叫停",
  fields: [
    { label: "签发", value: "管理层", note: "2026 年 10 月" },
    { label: "拟稿", value: "人力资源部" },
    { label: "抄送", value: "全体员工、各部门负责人" },
  ],
  stamp: { text: "已决定", date: "2026 · 10" },
  components: [{ type: "bullets", items: ["2027 年 1 月 4 日起试行每周 32 小时，薪酬不变", "触发停止条件即叫停，7 月公布去留"] }],
} as Slide

const root = (ir: PptxIR, index: number) => parseSvgRoot(renderSlideSvg(ir, index))
const textsOf = (el: Element) => Array.from(el.querySelectorAll("text")).map((t) => (t.textContent ?? "").trim())
const byText = (el: Element, text: string) => Array.from(el.querySelectorAll("text")).find((t) => (t.textContent ?? "").trim() === text)

describe("memo cover", () => {
  it("types the header lines, the title, the exhibit and the stamp, and validates its page fields", () => {
    const ir = deck([cover])
    expect(resolveEffectiveFace(ir, cover, getThemeDefinition("memo"))).toMatchObject({ route: "layout", layoutId: "memo-cover" })
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 0)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("memo-cover")
    const all = textsOf(page)
    for (const words of ["致：", "全体员工、各部门负责人", "事由：", "附图 1 · 周五早晨空着的工位（示意）", "已决定", "1 月 4 日起，为期六个月"]) expect(all).toContain(words)
    expect(page.querySelector("[data-exhibit='1']")!.getAttribute("transform")).toMatch(/^rotate\(/)
    expect(page.querySelector("[data-stamp]")!.getAttribute("transform")).toMatch(/^rotate\(-8 /)
  })

  it("sets a title on one line when it fits and on two when it does not, the last line on the same baseline", () => {
    const short = root(deck([{ ...cover, heading: "每周工作四天" } as Slide]), 0)
    const long = root(deck([cover]), 0)
    const line = (page: Element, text: string) => Number(byText(page, text)!.getAttribute("y"))
    expect(line(short, "每周工作四天")).toBe(line(long, "每周工作四天"))
    expect(line(long, "2027 年上半年，")).toBeLessThan(line(long, "每周工作四天"))
  })

  it("marks a stamp too wide for its place as dropped", () => {
    const page = root(deck([{ ...cover, stamp: { text: "已经由管理层正式批准并决定" } } as Slide]), 0)
    expect(page.querySelector("[data-dropped-kind='stamp']")).not.toBeNull()
  })
})

describe("memo sheet", () => {
  it("frames a content page: the label in the margin, the claim over a rule of ink, the source at the foot", () => {
    const page = root(deck([cover, sheet("五天变四天，凭什么")]), 1)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("memo-sheet")
    const label = byText(page, "理由")!
    expect(Number(label.getAttribute("x"))).toBe(64)
    const claim = byText(page, "五天变四天，凭什么")!
    expect(Number(claim.getAttribute("x"))).toBe(240)
    const rule = Array.from(page.querySelectorAll("[data-memo-head] rect")).at(-1)!
    expect([rule.getAttribute("x"), rule.getAttribute("y"), rule.getAttribute("height")]).toEqual(["240", "170", "1"])
    expect(Number(byText(page, "英国 4 Day Week 试点报告")!.getAttribute("y"))).toBeGreaterThan(650)
  })

  it("numbers its exhibits on from the pictures pasted in on the pages before it", () => {
    const withPicture = sheet("证据", {
      components: [
        { type: "paragraph", text: "正文。" },
        { type: "image", asset_id: "desk", caption: "工位（示意）", fit: "cover" },
      ],
    } as Partial<Slide>)
    const grid = sheet("三种排法", {
      components: [
        {
          type: "image_grid",
          items: [
            { asset_id: "desk", caption: "甲" },
            { asset_id: "desk", caption: "乙" },
          ],
        },
      ],
    } as Partial<Slide>)
    const ir = deck([cover, grid, withPicture])
    expect([0, 1, 2].map((i) => exhibitNumberAt(ir, i))).toEqual([1, 2, 4])
  })

  it("refuses header lines and a stamp on a content page, which has no place for them", () => {
    const result = validateIr(deck([cover, sheet("理由", { stamp: { text: "已决定" } } as Partial<Slide>)]))
    expect(result.ok).toBe(false)
  })
})

describe("memo sign-off", () => {
  it("numbers the decisions in the deck's numerals, types who signed it, and stamps it", () => {
    const ir = deck([cover, ending])
    expect(validateIr(ir).ok).toBe(true)
    const page = root(ir, 1)
    expect(page.querySelector("[data-face]")!.getAttribute("data-face")).toBe("memo-ending")
    const all = textsOf(page)
    for (const words of ["决定", "一、", "二、", "签发：", "管理层", "2026 年 10 月", "抄送：", "已决定"]) expect(all).toContain(words)
    expect(page.querySelector("[data-stamp]")!.getAttribute("transform")).toMatch(/^rotate\(-6 /)
  })

  it("breaks the decision at its last comma that keeps the first line full", () => {
    const page = root(deck([cover, ending]), 1)
    expect(byText(page, "试行每周四天、32 小时，薪酬不变，")).toBeDefined()
    expect(byText(page, "触发停止条件即叫停")).toBeDefined()
  })
})
