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
 * terminal's console faces, drawn to its 2026-10 board
 * (`design/rounds/2026-10-05-terminal/`): the cover and the chapter over their
 * own photographs, the content sheet's frame, and the checklist close.
 */

const PHOTO = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

function deck(slides: Slide[], extra: Partial<PptxIR> = {}): PptxIR {
  return {
    version: "5",
    filename: "console.pptx",
    theme: { id: "terminal" },
    meta: { organization: "基础架构组 · 技术评审", date: "2026-10" },
    assets: { images: { aisle: { src: PHOTO } } },
    slides,
    ...extra,
  } as PptxIR
}

const cover: Slide = {
  type: "cover",
  heading: "云中断复盘：高可用先补什么",
  subheading: "13 起云中断的官方记录",
  kicker: "13 起事故 · 2025-06 → 2026-09",
  background: { kind: "asset", asset_id: "aisle" },
  components: [],
}
const chapter: Slide = { type: "chapter", heading: "复盘：13 起中断说了什么", background: { kind: "asset", asset_id: "aisle" }, components: [] }
const page = (heading: string): Slide => ({ type: "content", kind: "points", heading, components: [{ type: "paragraph", text: "正文。" }], footnote: "四家厂商官方复盘" })
const ending = (components: Slide["components"]): Slide => ({ type: "ending", heading: "多区域做到**温备**，先补限流退避", components })

const texts = (svg: string) => Array.from(parseSvgRoot(svg).querySelectorAll("text")).map((t) => (t.textContent ?? "").trim())

describe("console cover and chapter over their own photographs", () => {
  it("keeps the face on a photo cover, so its kicker is drawn and allowed", () => {
    const ir = deck([cover])
    expect(resolveEffectiveFace(ir, cover, getThemeDefinition("terminal"))).toMatchObject({ route: "layout", layoutId: "console-cover" })
    expect(validateIr(ir).ok).toBe(true)
    const svg = renderSlideSvg(ir, 0)
    expect(svg).toContain('data-face="console-cover"')
    expect(svg).toContain("data-photo-scrim")
    expect(texts(svg)).toContain("13 起事故 · 2025-06 → 2026-09")
    expect(texts(svg).some((t) => t.startsWith("00 / 基础架构组 · 技术评审"))).toBe(true)
  })

  it("lays the photograph down with no fog of its own, the face's darkening over it", () => {
    const svg = renderSlideSvg(deck([cover]), 0)
    const root = parseSvgRoot(svg)
    expect(root.querySelector("[data-depth='bg'] image")).not.toBeNull()
    expect(root.querySelector("linearGradient")).not.toBeNull()
    expect(root.querySelectorAll("[data-depth='bg'] rect[fill-opacity]")).toHaveLength(0)
  })

  it("lists the chapter's pages under its number, and names the pages after it by its lead", () => {
    const ir = deck([cover, chapter, page("8 起重大中断里 5 起是同一类：一次变更推到全部"), page("复盘原话：坏配置几秒内推到全部")])
    const svg = renderSlideSvg(ir, 1)
    const all = texts(svg)
    expect(all).toContain("01")
    expect(all).toContain("├─ 03")
    expect(all).toContain("8 起重大中断里 5 起是同一类：一次变更推到全部")
    expect(all.some((t) => t.startsWith("01 / 章节"))).toBe(true)
    expect(texts(renderSlideSvg(ir, 3)).some((t) => t.startsWith("01 / 复盘"))).toBe(true)
  })
})

describe("console sheet", () => {
  it("frames every content page with its crumb, its claim and its mono source", () => {
    const ir = deck([page("结论：多区域做到温备")])
    const svg = renderSlideSvg(ir, 0)
    const root = parseSvgRoot(svg)
    expect(root.querySelector("[data-console-head]")).not.toBeNull()
    expect(texts(svg)).toContain("src:")
    expect(texts(svg)).toContain("四家厂商官方复盘")
    expect(texts(svg).some((t) => t.startsWith("00 / 结论"))).toBe(true)
  })

  it("leaves the page number to a footer row that prints it", () => {
    expect(texts(renderSlideSvg(deck([page("结论：多区域做到温备")]), 0)).some((t) => /P01/.test(t))).toBe(true)
    const ir = deck([page("结论：多区域做到温备")], { footer: { page_number: true } } as Partial<PptxIR>)
    expect(texts(renderSlideSvg(ir, 0)).some((t) => /P01/.test(t))).toBe(false)
  })
})

describe("console ending", () => {
  it("ticks off a timeline as a dated checklist", () => {
    const ir = deck([
      ending([
        {
          type: "timeline",
          milestones: [
            { date: "2026 Q4", title: "限流与退避", desc: "重试退避、队列限流" },
            { date: "2027 Q1", title: "独立备用路径", desc: "入口、身份各留一条路" },
          ],
        },
      ]),
    ])
    expect(validateIr(ir).ok).toBe(true)
    const all = texts(renderSlideSvg(ir, 0))
    expect(all.filter((t) => t === "[ ]")).toHaveLength(2)
    expect(all).toContain("2026 Q4")
    expect(all.some((t) => t.startsWith("EOF"))).toBe(true)
  })

  it("keeps every field a milestone carries: its lane before its date, its highlight, its icon", () => {
    const ir = deck([
      ending([
        {
          type: "timeline",
          lanes: ["平台", "业务"],
          milestones: [
            { date: "2026 Q4", title: "限流与退避", lane: "平台", highlight: true, icon: "repeat" },
            { date: "2027 Q1", title: "独立备用路径", lane: "业务" },
          ],
        },
      ]),
    ])
    expect(validateIr(ir).ok).toBe(true)
    const svg = renderSlideSvg(ir, 0)
    const all = texts(svg)
    expect(all).toContain("平台 · 2026 Q4")
    expect(all).toContain("业务 · 2027 Q1")
    expect(svg).toContain('data-checklist-item="marked"')
    expect(svg).toContain('data-console-icon="repeat"')
  })

  it("splits a bullet written 「标签：说明」 at its colon", () => {
    const all = texts(renderSlideSvg(deck([ending([{ type: "bullets", items: ["限流与退避：重试退避、队列限流"] }])]), 0))
    expect(all).toContain("限流与退避")
    expect(all).toContain("重试退避、队列限流")
  })

  it("declares a timeline's spans lost, a checklist having no axis to divide", () => {
    const ir = deck([
      ending([
        {
          type: "timeline",
          periods: [{ from: "2026 Q4", to: "2027 Q1", label: "第一阶段" }],
          milestones: [
            { date: "2026 Q4", title: "限流与退避" },
            { date: "2027 Q1", title: "独立备用路径" },
          ],
        },
      ]),
    ])
    const svg = renderSlideSvg(ir, 0)
    expect(svg).toMatch(/data-dropped="1" data-dropped-kind="label"/)
  })

  it("refuses more milestones than the checklist draws", () => {
    const milestones = Array.from({ length: 5 }, (_, i) => ({ date: `Q${i + 1}`, title: `第 ${i + 1} 项` }))
    const v = validateIr(deck([ending([{ type: "timeline", milestones }])]))
    expect(v.ok).toBe(false)
    expect(v.errors.map((e) => e.message).join("\n")).toMatch(/console-ending.*at most 4/)
  })
})
