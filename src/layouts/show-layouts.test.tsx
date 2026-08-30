// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import type { PptxIR, Slide } from "@/ir"
import { resolveStyle } from "../themes"
import { contrastRatio } from "../render/ink"
import { FullSlideSvg } from "../render/full-slide-svg"
import { __resetRegisteredThemes } from "../themes/definitions"
import { registerTestTheme, type TestThemeFaces } from "../themes/test-fixtures"

const slides: Slide[] = [
  {
    type: "cover",
    heading: "破界",
    subheading: "年度战略发布",
    components: [],
  },
  {
    type: "chapter",
    heading: "增长引擎",
    subheading: "从共识走向行动",
    components: [],
  },
  {
    type: "content",
    kind: "photo",
    heading: "六个关键场景",
    subheading: "从真实场景中提炼可复制的方法",
    components: [
      {
        type: "image_grid",
        items: Array.from({ length: 6 }, (_, index) => ({
          asset_id: `gallery-${index + 1}`,
          caption: `场景 ${index + 1}`,
        })),
      },
    ],
  },
  {
    type: "content",
    kind: "photo",
    heading: "旗舰方案",
    subheading: "把复杂约束压缩成一条清晰路径",
    components: [
      { type: "image", asset_id: "spotlight", fit: "cover", caption: "核心场景" },
      {
        type: "insight_panel",
        title: "FOCUS 01",
        rows: [
          { label: "目标", text: "高价值客户" },
          { label: "方法", text: "端到端协同" },
          { label: "结果", text: "增长可复制" },
        ],
      },
    ],
  },
  {
    type: "content",
    kind: "statement",
    heading: "真正的增长来自\n持续创造不可替代性",
    components: [
      {
        type: "numbered_cards",
        items: [
          { title: "看见", text: "识别关键变化", sub: "找到真实机会" },
          { title: "选择", text: "集中有限资源", sub: "形成明确取舍" },
          { title: "行动", text: "缩短反馈周期", sub: "持续修正路径" },
        ],
      },
    ],
  },
  {
    type: "content",
    kind: "data",
    heading: "关键数字",
    subheading: "三项指标共同验证增长质量",
    components: [
      {
        type: "kpi_cards",
        items: [
          { value: "38%", label: "收入增速", source: "同比" },
          { value: "2.4×", label: "转化效率", delta: "up", source: "核心渠道" },
          { value: "91", unit: "%", label: "客户留存", source: "十二个月" },
        ],
      },
    ],
  },
  {
    type: "ending",
    heading: "谢谢",
    subheading: "THE SHOW GOES ON",
    components: [],
  },
]

const ir: PptxIR = {
  version: "5",
  filename: "runway-show.pptx",
  theme: { id: "runway" },
  meta: {
    organization: "RUNWAY",
    authors: [{ name: "SHOW TEAM" }],
    version: "FINALE",
    date: "2026-08-26",
    confidentiality: "confidential",
  },
  assets: { images: {} },
  slides,
} as PptxIR

const FACE_BY_INDEX = [
  "show-headline",
  "show-plate",
  "show-gallery",
  "show-spotlight",
  "show-statement",
  "show-figures",
  "show-finale",
] as const
let themeSerial = 0

afterEach(() => {
  __resetRegisteredThemes()
})

function draw(index: number, slide: Slide = slides[index]!) {
  const face = FACE_BY_INDEX[index]!
  const faces: TestThemeFaces =
    slide.type === "content" ? { content: { [slide.kind]: face } } : { [slide.type]: face }
  const themeId = registerTestTheme(`show-layout-${themeSerial++}`, "runway", faces)
  const doc = { ...ir, theme: { id: themeId }, slides: slide === slides[index] ? slides : [slide] }
  return render(
    <FullSlideSvg ir={doc} slide={slide} index={slide === slides[index] ? index : 0} />,
  ).container
}

function textBy(root: ParentNode, value: string): Element {
  const text = Array.from(root.querySelectorAll("text")).find((node) => node.textContent === value)
  if (!text) throw new Error(`missing text ${value}`)
  return text
}

function attrs(node: Element, names: string[]): (string | null)[] {
  return names.map((name) => node.getAttribute(name))
}

describe("runway show layouts", () => {
  it("places show-headline on the approved split field", () => {
    const root = draw(0)
    const tokens = resolveStyle("runway")
    const field = root.querySelector('[data-show-accent="true"] rect')!
    expect(attrs(field, ["x", "y", "width", "height", "fill"])).toEqual([
      "704", "0", "576", "720", tokens.colors.accent,
    ])
    expect(attrs(textBy(root, "RUNWAY"), ["x", "y", "font-size", "letter-spacing"])).toEqual([
      "56", "208", "76", "8",
    ])
    expect(attrs(textBy(root, "破界"), ["x", "y", "font-size", "font-weight"])).toEqual([
      "56", "452", "132", "700",
    ])
    expect(attrs(textBy(root, "2026"), ["x", "y", "font-size", "text-anchor"])).toEqual([
      "992", "404", "104", "middle",
    ])
    expect(attrs(textBy(root, "CONFIDENTIAL"), ["x", "y", "font-size", "text-anchor"])).toEqual([
      "992", "70", "12", "middle",
    ])
    expect(attrs(root.querySelector('[data-show-rule="headline"]')!, ["x1", "y1", "x2", "y2", "stroke-width"])).toEqual([
      "56", "240", "648", "240", "2",
    ])
    expect(root.querySelectorAll('[data-decor-piece="show-headline-corners"] line')).toHaveLength(8)
  })

  it("places show-plate on the approved image and numeral split", () => {
    const root = draw(1)
    const tokens = resolveStyle("runway")
    expect(attrs(root.querySelector('[data-show-image-frame="true"]')!, ["x", "y", "width", "height", "fill"])).toEqual([
      "0", "0", "700", "720", "#D8D4C8",
    ])
    expect(attrs(root.querySelector('[data-show-accent="true"] rect')!, ["x", "y", "width", "height"])).toEqual([
      "0", "44", "132", "36",
    ])
    expect(attrs(textBy(root, "01"), ["x", "y", "font-size", "letter-spacing", "fill"])).toEqual([
      "744", "392", "240", "-6", tokens.colors.primary,
    ])
    expect(attrs(root.querySelector('[data-show-rule="plate"]')!, ["x", "y", "width", "height", "fill"])).toEqual([
      "752", "430", "120", "4", tokens.colors.primary,
    ])
    expect(attrs(textBy(root, "增长引擎"), ["x", "y", "font-size", "font-weight"])).toEqual([
      "752", "548", "48", "700",
    ])
  })

  it("places show-gallery on the approved six-column grid", () => {
    const root = draw(2)
    const frames = Array.from(root.querySelectorAll('[data-show-image-frame="true"]'))
    expect(frames.map((frame) => attrs(frame, ["x", "y", "width", "height"]))).toEqual(
      [64, 260, 456, 652, 848, 1044].map((x) => [String(x), "222", "172", "322"]),
    )
    expect(attrs(textBy(root, "六个关键场景"), ["x", "y", "font-size", "font-weight"])).toEqual([
      "64", "156", "40", "700",
    ])
    expect(["01", "02", "03", "04", "05", "06"].map((value) => attrs(textBy(root, value), ["x", "y", "font-size"]))).toEqual(
      [64, 260, 456, 652, 848, 1044].map((x) => [String(x), "588", "26"]),
    )
    expect(attrs(textBy(root, "场景 1"), ["y", "font-size", "letter-spacing"])).toEqual(["614", "12", "2"])
    expect(attrs(textBy(root, "从真实场景中提炼可复制的方法"), ["x", "y", "font-size"])).toEqual([
      "64", "672", "14",
    ])
  })

  it("places show-spotlight on the approved image and parameter columns", () => {
    const root = draw(3)
    expect(attrs(root.querySelector('[data-show-image-frame="true"]')!, ["x", "y", "width", "height"])).toEqual([
      "64", "104", "600", "540",
    ])
    expect(attrs(root.querySelector('[data-show-accent="true"] rect')!, ["x", "y", "width", "height"])).toEqual([
      "64", "58", "128", "34",
    ])
    expect(attrs(textBy(root, "旗舰方案"), ["x", "y", "font-size", "font-weight"])).toEqual([
      "720", "248", "56", "700",
    ])
    expect(["目标", "方法", "结果"].map((value) => attrs(textBy(root, value), ["x", "y", "font-size", "letter-spacing"]))).toEqual([
      ["720", "346", "12", "3"],
      ["720", "428", "12", "3"],
      ["720", "510", "12", "3"],
    ])
    expect(["高价值客户", "端到端协同", "增长可复制"].map((value) => attrs(textBy(root, value), ["x", "y", "font-size"]))).toEqual([
      ["720", "376", "22"],
      ["720", "458", "22"],
      ["720", "540", "22"],
    ])
    expect(attrs(root.querySelector('[data-show-rule="spotlight"]')!, ["x", "y", "width", "height"])).toEqual([
      "720", "588", "120", "4",
    ])
  })

  it("places show-statement on the approved assertion and three-column grid", () => {
    const root = draw(4)
    const tokens = resolveStyle("runway")
    expect(attrs(root.querySelector('[data-show-kicker="true"]')!, ["x", "y", "width", "height", "fill"])).toEqual([
      "64", "88", "12", "12", tokens.colors.primary,
    ])
    expect(Array.from(root.querySelectorAll('[data-show-statement-line="true"]')).map((line) => attrs(line, ["x", "y", "font-size"]))).toEqual([
      ["64", "248", "62"],
      ["64", "330", "62"],
    ])
    expect(attrs(root.querySelector('[data-show-accent="true"] rect')!, ["x", "y", "width", "height"])).toEqual([
      "64", "352", "232", "7",
    ])
    expect(["01", "02", "03"].map((value) => attrs(textBy(root, value), ["x", "y", "font-size"]))).toEqual([
      ["64", "498", "40"],
      ["464", "498", "40"],
      ["864", "498", "40"],
    ])
  })

  it("places show-figures on the approved three-stat grid and accents the first delta item", () => {
    const root = draw(5)
    const tokens = resolveStyle("runway")
    expect(["38%", "2.4×", "91%"].map((value) => attrs(textBy(root, value), ["x", "y", "font-size", "fill"]))).toEqual([
      ["64", "392", "140", tokens.colors.primary],
      ["512", "392", "140", tokens.colors.accent],
      ["960", "392", "140", tokens.colors.primary],
    ])
    expect(Array.from(root.querySelectorAll('[data-show-divider="figures"]')).map((line) => attrs(line, ["x1", "y1", "x2", "y2"]))).toEqual([
      ["448", "300", "448", "470"],
      ["896", "300", "896", "470"],
    ])
    expect(attrs(textBy(root, "三项指标共同验证增长质量"), ["x", "y", "font-size"])).toEqual([
      "64", "642", "14",
    ])
  })

  it("places show-finale on the approved black field and runway perspective", () => {
    const root = draw(6)
    expect(attrs(textBy(root, "谢谢"), ["x", "y", "font-size", "font-weight", "text-anchor"])).toEqual([
      "640", "272", "96", "700", "middle",
    ])
    expect(attrs(textBy(root, "THE SHOW GOES ON"), ["x", "y", "font-size", "letter-spacing"])).toEqual([
      "640", "322", "22", "8",
    ])
    const runway = root.querySelector('[data-decor-piece="show-finale-runway"]')!
    expect(Array.from(runway.querySelectorAll("line")).map((line) => attrs(line, ["x1", "y1", "x2", "y2", "stroke-width"]))).toEqual([
      ["430", "700", "628", "446", "1.5"],
      ["850", "700", "652", "446", "1.5"],
      ["513", "620", "767", "620", "1"],
      ["472", "672", "808", "672", "1"],
      ["640", "450", "640", "700", "2.5"],
    ])
  })

  it("keeps one accent group, no text opacity, and at most three decorations on every face", () => {
    const accent = resolveStyle("runway").colors.accent.toLowerCase()
    for (const [index, slide] of slides.entries()) {
      const root = draw(index)
      const groups = root.querySelectorAll('[data-show-accent="true"]')
      expect(groups, (slide as unknown as { layout?: string }).layout).toHaveLength(1)
      const redLeaves = Array.from(root.querySelectorAll("rect, line, path, circle, text")).filter((node) =>
        [node.getAttribute("fill"), node.getAttribute("stroke")].some((paint) => paint?.toLowerCase() === accent),
      )
      expect(redLeaves.length, (slide as unknown as { layout?: string }).layout).toBeGreaterThan(0)
      expect(redLeaves.every((node) => node.closest('[data-show-accent="true"]') === groups[0]), (slide as unknown as { layout?: string }).layout).toBe(true)
      expect(root.querySelectorAll("text[fill-opacity]"), (slide as unknown as { layout?: string }).layout).toHaveLength(0)
      expect(root.querySelectorAll("[data-decor-piece]").length, (slide as unknown as { layout?: string }).layout).toBeLessThanOrEqual(3)
    }
  })

  it("derives every gray-placeholder label above the body contrast floor", () => {
    const tokens = resolveStyle("runway")
    for (const index of [1, 2, 3]) {
      const root = draw(index)
      const placeholders = Array.from(root.querySelectorAll('[data-show-placeholder="true"]'))
      expect(placeholders.length, (slides[index]! as unknown as { layout?: string }).layout).toBeGreaterThan(0)
      for (const placeholder of placeholders) {
        const ink = placeholder.getAttribute("fill")!
        expect(contrastRatio(ink, "#D8D4C8"), (slides[index]! as unknown as { layout?: string }).layout).toBeGreaterThanOrEqual(4.5)
        expect(ink, (slides[index]! as unknown as { layout?: string }).layout).not.toBe(tokens.colors.muted)
      }
    }
  })

  it("falls back without losing content when a gated content face receives the wrong component shape", () => {
    const cases: Array<{ index: number; slide: Slide }> = [
      { index: 2, slide: {
        type: "content",
        kind: "photo",
        heading: "三图不走六格",
        components: [{ type: "paragraph", text: "画廊回退正文" }],
      } },
      { index: 3, slide: {
        type: "content",
        kind: "photo",
        heading: "无图不走焦点",
        components: [{ type: "paragraph", text: "焦点回退正文" }],
      } },
      { index: 4, slide: {
        type: "content",
        kind: "statement",
        heading: "四点不走观点",
        components: [{ type: "bullets", items: ["一", "二", "三", "观点回退正文"] }],
      } },
      { index: 5, slide: {
        type: "content",
        kind: "data",
        heading: "非指标不走数字",
        components: [{ type: "paragraph", text: "数字回退正文" }],
      } },
    ]
    for (const { index, slide } of cases) {
      const root = draw(index, slide)
      expect(root.querySelector('[data-show-mode="fallback"]'), FACE_BY_INDEX[index]).not.toBeNull()
      expect(root.textContent, FACE_BY_INDEX[index]).toContain("回退正文")
      expect(root.querySelectorAll('[data-show-accent="true"]'), FACE_BY_INDEX[index]).toHaveLength(1)
    }
  })
})
