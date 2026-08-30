// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from "vitest"
import { render } from "@testing-library/react"
import { FullSlideSvg, resolveBackgroundHex, resolveOverrideBackgroundHex } from "./full-slide-svg"
import { renderSvgMarkup, parseSvgRoot } from "./serialize"
import { assertSubset } from "./subset-validate"
import { svgToOps } from "../pptx/svg2pptx/dispatch"
import { MOTIFS } from "../motifs"
import { __resetRegisteredThemes, THEME_DEFINITIONS } from "../themes/definitions"
import { registerTestTheme, type TestThemeFaces } from "../themes/test-fixtures"
import { accessibleInk, blendOver, contrastRatio, readableOn } from "./ink"
import { resolveStyle } from "../themes"
import {
  CONTENT_DECOR_CONTRAST_CEILING,
  effectivePaintOpacity,
  hexSaturation,
  skipsMidgroundCeiling,
  leafPaint,
  midgroundSaturationCeiling,
  paintedLeaves,
} from "../motifs/decor-budget"
import { textInkBox } from "./depth-contract/geometry"
import { resolveMotifId } from "./motif-selection"
import type { PptxIR, Slide } from "@/ir"

let testThemeSerial = 0

function irWithFace(
  slide: Slide,
  sourceThemeId: Parameters<typeof registerTestTheme>[1],
  faces: TestThemeFaces,
): PptxIR {
  const themeId = registerTestTheme(`full-slide-svg-${testThemeSerial++}`, sourceThemeId, faces)
  return { ...ir([slide]), theme: { id: themeId } }
}

afterEach(() => {
  __resetRegisteredThemes()
})

function ir(slides: Slide[]): PptxIR {
  return {
    version: "5",
    filename: "deck.pptx",
    theme: { id: "academic" },
    meta: { organization: "ACME", confidentiality: "internal", version: "v1", date: "2026" },
    assets: { images: {} },
    slides,
  }
}

const coverSlide: Slide = { type: "cover", heading: "年度战略回顾", subheading: "增长与韧性", components: [] }
const contentSlide: Slide = {
  type: "content",
  kind: "points",
  heading: "三大支柱",
  components: [
    { type: "paragraph", text: "我们围绕三个方向推进。" },
    { type: "bullets", items: ["效率", "增长", "韧性"], style: "default" },
    { type: "kpi_cards", items: [{ value: "37", unit: "%", label: "增长", delta: "up" }] },
  ],
  footnote: "数据来源：内部",
}

describe("FullSlideSvg", () => {
  it("renders a single svg root with no foreignObject", () => {
    const { container } = render(<FullSlideSvg ir={ir([coverSlide])} slide={coverSlide} index={0} />)
    const svgs = container.querySelectorAll("svg")
    expect(svgs.length).toBe(1)
    expect(container.querySelector("foreignObject")).toBeNull()
    // background rect + heading text present
    expect(container.querySelector("rect")).not.toBeNull()
    expect(container.textContent).toContain("年度战略回顾")
  })

  it("emits one bg, mid, and fg group in fixed paint order", () => {
    const doc: PptxIR = { ...irWithFace(contentSlide, "academic", {}), branding: "full" }
    const { container } = render(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
    const groups = Array.from(container.querySelectorAll("svg > g[data-depth]"))

    expect(groups.map((group) => group.getAttribute("data-depth"))).toEqual(["bg", "mid", "fg"])
    expect(container.querySelector("[data-decor]")?.closest("[data-depth]")?.getAttribute("data-depth")).toBe(
      "mid",
    )
    expect(container.querySelector("[data-archetype]")?.closest("[data-depth]")?.getAttribute("data-depth")).toBe(
      "fg",
    )
    expect(groups[2]!.querySelector('line[y1="664"]')).not.toBeNull()
  })

  it("routes a menu-face-owned ghost chapter number to mid without moving the heading out of fg", () => {
    const chapter: Slide = {
      type: "chapter",
      heading: "第一部分：市场洞察",
      components: [],
    }
    const doc = irWithFace(chapter, "academic", { chapter: "masthead-chapter" })
    const { container } = render(<FullSlideSvg ir={doc} slide={chapter} index={0} />)
    const ghost = Array.from(container.querySelectorAll("text")).find(
      (text) => text.textContent === "01" && Number(text.getAttribute("font-size")) >= 160,
    )
    const heading = Array.from(container.querySelectorAll("text")).find((text) =>
      text.textContent?.includes("第一部分：市场洞察"),
    )

    expect(container.querySelector('[data-archetype="masthead-chapter"]')).not.toBeNull()
    expect(ghost?.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
    expect(heading?.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
  })

  it("strips menu-face-declared data-depth after routing so the page keeps exactly three groups", () => {
    const chapter: Slide = {
      type: "chapter",
      heading: "第一部分：市场洞察",
      components: [],
    }
    const doc = irWithFace(chapter, "consulting", { chapter: "masthead-chapter" })
    const { container } = render(<FullSlideSvg ir={doc} slide={chapter} index={0} />)
    const depths = Array.from(container.querySelectorAll("[data-depth]")).map((el) => el.getAttribute("data-depth"))
    expect(depths).toEqual(["bg", "mid", "fg"])
    const ghost = Array.from(container.querySelectorAll("text")).find(
      (text) => text.textContent === "01" && Number(text.getAttribute("font-size")) >= 140,
    )
    expect(ghost?.hasAttribute("data-depth")).toBe(false)
    expect(ghost?.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
  })

  it("enforces the shared contrast and saturation ceilings on final midground paint", () => {
    const slide: Slide = { type: "cover", heading: "封面", components: [] }
    const doc = irWithFace(slide, "campaign", {})
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const tokens = resolveStyle("campaign")
    const ground = resolveBackgroundHex(tokens.defaultBackgrounds.cover, tokens.colors.surface)
    const mid = container.querySelector('[data-depth="mid"]')!
    const leaves = paintedLeaves(mid).filter((leaf) => leafPaint(leaf) !== null)

    expect(leaves.length).toBeGreaterThan(0)
    for (const leaf of leaves) {
      if (skipsMidgroundCeiling(leaf)) continue
      const paint = leafPaint(leaf)!
      const opacity = effectivePaintOpacity(leaf, paint.kind)
      expect(hexSaturation(paint.color), leaf.outerHTML).toBeLessThanOrEqual(
        midgroundSaturationCeiling(tokens.colors) + 0.001,
      )
      expect(contrastRatio(blendOver(paint.color, ground, opacity), ground), leaf.outerHTML).toBeLessThan(
        CONTENT_DECOR_CONTRAST_CEILING,
      )
    }
  })

  it("paints the swiss red bar in the foreground at the theme accent", () => {
    const slide: Slide = { type: "cover", heading: "年度战略回顾", components: [] }
    const doc = irWithFace(slide, "swiss", {})
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const accent = resolveStyle("swiss").colors.accent
    const bar = container.querySelector('[data-decor-piece="red-bar"] rect')!
    expect(bar.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    expect(bar.getAttribute("fill")).toBe(accent)
    expect(bar.getAttribute("opacity")).toBeNull()
    expect(bar.closest("[data-decor-piece]")?.getAttribute("data-decor-role")).toBe("structure")
  })

  it("keeps the ink vermilion seal at the theme accent, unfaded", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "一句留白",
      components: [{ type: "paragraph", text: "正文" }],
    }
    const doc: PptxIR = {
      ...irWithFace(slide, "ink", {}),
      meta: { organization: "云觅", date: "2026-08-15" },
    }
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const accent = resolveStyle("ink").colors.accent
    const seals = Array.from(container.querySelectorAll('[data-depth="mid"] [data-identity] rect'))
    expect(seals.length).toBeGreaterThan(0)
    for (const seal of seals) {
      expect(seal.getAttribute("fill")).toBe(accent)
      expect(seal.getAttribute("opacity")).toBeNull()
      expect(seal.getAttribute("fill-opacity")).toBeNull()
    }
  })

  it("paints the memo masthead in the foreground at the theme accent", () => {
    const slide: Slide = { type: "content", kind: "points", heading: "决定", components: [{ type: "paragraph", text: "正文" }] }
    const doc = irWithFace(slide, "memo", {})
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const piece = container.querySelector('[data-decor-piece="masthead"]')!
    expect(piece.getAttribute("data-decor-role")).toBe("structure")
    expect(piece.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    const accent = resolveStyle("memo").colors.accent
    for (const line of Array.from(piece.querySelectorAll("line"))) {
      expect(line.getAttribute("stroke")).toBe(accent)
      expect(line.getAttribute("opacity")).toBeNull()
    }
  })

  it("paints the luxe invitation frame in the foreground at the theme accent", () => {
    const slide: Slide = { type: "cover", heading: "封面", components: [] }
    const doc = irWithFace(slide, "luxe", {})
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const piece = container.querySelector('[data-decor-piece="invitation"]')!
    expect(piece.getAttribute("data-decor-role")).toBe("structure")
    expect(piece.closest("[data-depth]")?.getAttribute("data-depth")).toBe("fg")
    const accent = resolveStyle("luxe").colors.accent
    for (const line of Array.from(piece.querySelectorAll("line"))) {
      expect(line.getAttribute("stroke")).toBe(accent)
    }
  })

  it("keeps the pulse heartbeat in midground at the theme accent", () => {
    const slide: Slide = { type: "cover", heading: "封面", components: [] }
    const doc = irWithFace(slide, "pulse", {})
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const piece = container.querySelector('[data-decor-piece="heartbeat"]')!
    expect(piece.getAttribute("data-decor-role")).toBe("identity")
    expect(piece.closest("[data-depth]")?.getAttribute("data-depth")).toBe("mid")
    const line = piece.querySelector("polyline")!
    expect(line.getAttribute("stroke")).toBe(resolveStyle("pulse").colors.accent)
    expect(line.getAttribute("opacity")).toBeNull()
  })

  it("brings a consulting ghost index fully inside the canvas and removes its bleed exemption", () => {
    const chapter: Slide = { type: "chapter", heading: "第一部分", components: [] }
    const content: Slide = {
      type: "content",
      kind: "points",
      heading: "市场洞察",
      components: [{ type: "paragraph", text: "正文" }],
    }
    const doc: PptxIR = { ...ir([chapter, content]), theme: { id: "consulting" } }
    const { container } = render(<FullSlideSvg ir={doc} slide={content} index={1} />)
    const ghost = Array.from(container.querySelectorAll('[data-depth="mid"] text')).find(
      (text) => text.textContent === "01" && Number(text.getAttribute("font-size")) >= 200,
    )!
    const box = textInkBox({
      content: ghost.textContent ?? "",
      x: Number(ghost.getAttribute("x")),
      y: Number(ghost.getAttribute("y")),
      fontSize: Number(ghost.getAttribute("font-size")),
      fontFamily: ghost.getAttribute("font-family") ?? "",
      fontWeight: ghost.getAttribute("font-weight"),
      textAnchor: ghost.getAttribute("text-anchor") ?? "start",
    })

    expect(ghost.hasAttribute("data-bleed")).toBe(false)
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.y).toBeGreaterThanOrEqual(0)
    expect(box.x + box.w).toBeLessThanOrEqual(1280)
    expect(box.y + box.h).toBeLessThanOrEqual(720)
  })

  it("renders content components for a content slide (omitted branding draws no footer)", () => {
    const doc = ir([contentSlide])
    const { container } = render(
      <FullSlideSvg ir={doc} slide={contentSlide} index={0} />,
    )
    expect(container.textContent).toContain("三大支柱")
    // bullets markers + kpi card present
    expect(container.querySelectorAll("circle").length).toBeGreaterThanOrEqual(3)
    // 页码已删（2026-07-09 用户裁决）：页脚不再出现 x / y
    expect(container.textContent).not.toContain("1 / 1")
    expect(container.querySelector('line[y1="664"]')).toBeNull()
  })

  it("serializes to an export-safe svg that round-trips to ops", () => {
    const doc = ir([contentSlide])
    const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
    expect(markup).not.toContain("foreignObject")
    const root = parseSvgRoot(markup)
    expect(() => assertSubset(root)).not.toThrow()
    const ops = svgToOps(root)
    expect(ops.length).toBeGreaterThan(5)
    expect(new Set(ops.map((o) => o.kind)).has("text")).toBe(true)
  })

  it("omits the page number for export (native slide number takes over)", () => {
    const doc = ir([contentSlide])
    const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
    expect(markup).not.toContain("1 / 1")
  })

  // Wave-C S3: `data-blk` is the anchor svg2pptx's `dispatch.ts` walks to tag
  // ops with `blockIndex`, which `render.ts` then folds into the exported
  // shape's objectName. It must only ever appear when the deck explicitly
  // opts in — this is the SVG-layer half of the "static render stays
  // byte-identical by default" contract (`ComponentCtx.blockIndex`'s doc comment).
  describe("data-blk tagging (wave-C S3)", () => {
    it("never emits data-blk when meta.animation is unset", () => {
      const doc = ir([contentSlide])
      const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
      expect(markup).not.toContain("data-blk")
    })

    it('never emits data-blk when meta.animation.elements is "none"', () => {
      const doc: PptxIR = { ...ir([contentSlide]), meta: { animation: { elements: "none" } } }
      const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
      expect(markup).not.toContain("data-blk")
    })

    it('tags each component\'s content with data-blk="{index}" when elements is "auto"', () => {
      const doc: PptxIR = { ...ir([contentSlide]), meta: { animation: { elements: "auto" } } }
      const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
      // contentSlide has 3 components (paragraph, bullets, kpi_cards) at indices 0-2.
      expect(markup).toContain('data-blk="0"')
      expect(markup).toContain('data-blk="1"')
      expect(markup).toContain('data-blk="2"')
    })

    it("does not tag the slide heading/subheading (S3: 标题/副题句 不动画)", () => {
      const doc: PptxIR = { ...ir([contentSlide]), meta: { animation: { elements: "auto" } } }
      const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
      const root = parseSvgRoot(markup)
      const headingText = Array.from(root.querySelectorAll("text")).find((t) =>
        (t.textContent ?? "").includes("三大支柱"),
      )
      expect(headingText).toBeDefined()
      // Neither the heading's own <text> nor any of its ancestors up to <svg>
      // carry data-blk.
      let el: Element | null = headingText!
      while (el && el.tagName.toLowerCase() !== "svg") {
        expect(el.getAttribute("data-blk")).toBeNull()
        el = el.parentElement
      }
    })

    it("round-trips through svg2pptx: exported shapes carry a blk-marker-shaped blockIndex", () => {
      const doc: PptxIR = { ...ir([contentSlide]), meta: { animation: { elements: "auto" } } }
      const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={contentSlide} index={0} />)
      const ops = svgToOps(parseSvgRoot(markup))
      const blockIndices = new Set(ops.map((o) => o.blockIndex).filter((b) => b != null))
      expect(blockIndices).toEqual(new Set([0, 1, 2]))
    })
  })
})

describe("asset background auto scrim (image-layouts P1)", () => {
  const bgSlide: Slide = {
    type: "cover",
    heading: "压图封面",
    components: [],
    background: {
      kind: "asset",
      asset_id: "bg1",
      overlay: { color: "#000000", opacity: 0.3 },
    },
  }
  const withAsset = (themeId: string): PptxIR => ({
    ...ir([bgSlide]),
    theme: { id: themeId as PptxIR["theme"]["id"] },
    assets: { images: { bg1: { src: "data:image/png;base64,AAAA" } } },
  })

  it("design theme cover: dark-scrim takeover with white heading (polish 2026-07-09)", () => {
    // cover 压图页由 ImageCoverPage 接管：暗遮罩（低透，图清晰可辨）+ 白字，
    // 模型的 overlay 被忽略，P1 的雾面 scrim 不再用于 cover/chapter。
    const { container } = render(
      <FullSlideSvg ir={withAsset("academic")} slide={bgSlide} index={0} />,
    )
    const rects = Array.from(container.querySelectorAll("rect"))
    expect(rects.some((r) => r.getAttribute("fill") === "#000000")).toBe(false)
    const dark = rects.filter((r) => r.getAttribute("fill") === "#0A0E14")
    expect(dark.length).toBeGreaterThanOrEqual(2)
    for (const r of dark) {
      expect(Number(r.getAttribute("fill-opacity"))).toBeLessThanOrEqual(0.35)
    }
    const whiteTitle = Array.from(container.querySelectorAll("text")).find(
      (t) => t.textContent === "压图封面" && t.getAttribute("fill") === "#FFFFFF",
    )
    expect(whiteTitle).not.toBeUndefined()
  })

  it("design theme content page keeps the frosted page-color scrim", () => {
    const contentBg: Slide = {
      type: "content",
      kind: "points",
      heading: "正文压图",
      components: [{ type: "paragraph", text: "文" }],
      background: { kind: "asset", asset_id: "bg1" },
    }
    const ir2: PptxIR = { ...withAsset("academic"), slides: [contentBg] }
    const { container } = render(
      <FullSlideSvg ir={ir2} slide={contentBg} index={0} />,
    )
    const scrims = Array.from(container.querySelectorAll("rect")).filter((r) => {
      const o = r.getAttribute("fill-opacity")
      // 0.66（2026-07-09 用户裁决 0.8 看不清背景，同 background.test 边界）
      return o !== null && Number(o) >= 0.6 && Number(o) < 0.75
    })
    expect(scrims).toHaveLength(1)
  })

})

describe("resolveOverrideBackgroundHex (post-v0.3 W8 fix round, backlog item 1)", () => {
  it("passes a color spec through unchanged, same as resolveBackgroundHex", () => {
    // surfaceFallback/paintedFallback both supplied but distinct from the
    // spec's own value and from each other — proves a color spec ignores
    // both fallback arguments rather than happening to match one of them.
    expect(resolveOverrideBackgroundHex({ kind: "color", value: "#123456" }, "#FFFFFF", "#000000")).toBe("#123456")
  })

  it("reduces a gradient to its exact midpoint blend (t=0.5), not the from stop", () => {
    // Same non-vacuity discipline as the color case above — neither
    // fallback argument matches "#808080", so a pass proves the midpoint
    // policy actually ran rather than coincidentally returning a fallback.
    expect(
      resolveOverrideBackgroundHex({ kind: "gradient", from: "#FFFFFF", to: "#000000" }, "#FFFFFF", "#000000"),
    ).toBe("#808080")
    // Direction-independent — the from/to labels don't privilege either end.
    expect(
      resolveOverrideBackgroundHex({ kind: "gradient", from: "#000000", to: "#FFFFFF" }, "#FFFFFF", "#000000"),
    ).toBe("#808080")
  })

  // Final-review Major finding (whole-branch review of fix/post-v03-backlog,
  // independently discovered, not caught by task 2's own review): the asset
  // branch used to fall back to `surfaceFallback` (`resolveBackgroundHex`'s
  // own asset policy) — silently wrong for a *per-slide override*, since
  // `tokens.colors.surface` is not what an asset-background content/ending
  // slide actually paints behind text (the auto-scrim, colored
  // `themeDefaultBg` — see `background.tsx`/`full-slide-svg.tsx`'s own
  // `autoScrimColor`). Fixed by threading the caller's `themeDefaultBg`
  // through as a third `paintedFallback` argument, consulted instead of
  // `surfaceFallback` for exactly this branch — see
  // `resolveOverrideBackgroundHex`'s own "Asset policy rationale" doc
  // comment for the full paint-path justification.
  it("resolves an asset spec to paintedFallback (the actually-painted scrim color), not surfaceFallback", () => {
    expect(resolveOverrideBackgroundHex({ kind: "asset", asset_id: "x" }, "#ABCDEF", "#112233")).toBe("#112233")
  })

  it("does not fall back to surfaceFallback for an asset spec even when it differs from paintedFallback", () => {
    // Distinguishing assertion: a pre-fix implementation (`resolveBackgroundHex`'s
    // asset policy, returning `surfaceFallback`) would return "#ABCDEF" here,
    // not "#112233" — this is red-pre-fix-by-construction evidence, not just
    // a happy-path pin.
    const result = resolveOverrideBackgroundHex({ kind: "asset", asset_id: "x" }, "#ABCDEF", "#112233")
    expect(result).not.toBe("#ABCDEF")
    expect(result).toBe("#112233")
  })
})

// backlog item 1 (`.issues/notes/engineering-history.md` #1):
// `ctx.defaultBg` used to be blind to `slide.background`, always resolving
// to `tokens.defaultBackgrounds[slide.type]` regardless of any per-slide
// override — a layout that paints no panel of its own and relies on
// `ctx.defaultBg` to pick readable ink (e.g. `chapter-rail-chapter.tsx`'s
// `ink = readableOn(defaultBg)`) could measure contrast against a
// background the slide never actually painted. classroom is still the
// demonstrator. Wave 8 batch 2 put its chapter default on fog paper
// `#ECF0F2` (dark ink). The flip that proves the override is really read
// now uses a dark `#4A6B8A` override to pick white ink.
describe("ctx.defaultBg prefers slide.background (post-v0.3 W8 fix round, backlog item 1)", () => {
  const classroomIr = (slide: Slide): PptxIR =>
    slide.type === "chapter"
      ? irWithFace(slide, "classroom", { chapter: "rail-chapter" })
      : { ...ir([slide]), theme: { id: "classroom" } }
  const HEADING = "背景覆盖探针"
  const railChapter = (background?: Slide["background"]): Slide =>
    ({
      type: "chapter",
      heading: HEADING,
      components: [],
      ...(background ? { background } : {}),
    }) as Slide
  const headingFill = (markup: string): string | null => {
    const root = parseSvgRoot(markup)
    const heading = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === HEADING)
    return heading?.getAttribute("fill") ?? null
  }

  it("invariant: a slide with no background override still picks the theme's own default-background ink (byte-identical to before this fix)", () => {
    const slide = railChapter()
    const markup = renderSvgMarkup(<FullSlideSvg ir={classroomIr(slide)} slide={slide} index={0} />)
    // readableOn("#ECF0F2") — classroom's paper chapter default after wave 8 batch 2.
    expect(headingFill(markup)).toBe(readableOn("#ECF0F2"))
    expect(headingFill(markup)).toBe("#0A0E14")
  })

  it("a color slide.background override changes the picked ink to match the real painted background, not the theme default", () => {
    // A dark override against classroom's paper chapter default: the pick has
    // to flip to white, which it only can if the override is really read.
    const slide = railChapter({ kind: "color", value: "#4A6B8A" })
    const markup = renderSvgMarkup(<FullSlideSvg ir={classroomIr(slide)} slide={slide} index={0} />)
    expect(readableOn("#ECF0F2")).not.toBe(readableOn("#4A6B8A"))
    expect(headingFill(markup)).toBe(readableOn("#4A6B8A"))
    expect(headingFill(markup)).toBe("#FFFFFF")
  })

  it("a gradient slide.background override resolves ctx.defaultBg via the midpoint blend, not the from stop (from and midpoint disagree here)", () => {
    // from "#000000" alone would pick white ink (readableOn("#000000") ===
    // "#FFFFFF") — the midpoint "#808080" picks dark ink instead
    // (readableOn("#808080") === "#0A0E14"), so this only passes if the
    // render path actually goes through the midpoint, not `.from`.
    expect(readableOn("#000000")).toBe("#FFFFFF")
    expect(readableOn("#808080")).toBe("#0A0E14")
    const slide = railChapter({ kind: "gradient", from: "#000000", to: "#FFFFFF" })
    const markup = renderSvgMarkup(<FullSlideSvg ir={classroomIr(slide)} slide={slide} index={0} />)
    expect(headingFill(markup)).toBe("#0A0E14")
  })

  it("an asset slide.background override does not change autoScrimColor's own theme-default source (out of this fix's scope, see full-slide-svg.tsx's own comment)", () => {
    // content (not cover/chapter) so imageCoverTakeover doesn't take over
    // and the P1 frosted auto-scrim still applies.
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: HEADING,
      components: [{ type: "paragraph", text: "文" }],
      background: { kind: "asset", asset_id: "bg1" },
    } as Slide
    const doc: PptxIR = { ...classroomIr(slide), assets: { images: { bg1: { src: "data:image/png;base64,AAAA" } } } }
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    // classroom's own content default background, resolveBackgroundHex-reduced — unchanged scrim source.
    const scrim = Array.from(container.querySelectorAll("rect")).find(
      (r) => r.getAttribute("fill") === "#ECF0F2" && Number(r.getAttribute("fill-opacity")) > 0.6,
    )
    expect(scrim).not.toBeUndefined()
  })

  // Final-review Major finding (whole-branch review of fix/post-v03-backlog):
  // the test above only pins that `autoScrimColor` itself (what's actually
  // painted) stayed put — it says nothing about whether `ctx.defaultBg` (what
  // ink decisions are measured against) agrees with that painted color. This
  // is the actual regression: luxe's colors.accent ("#A67B45") measures
  // 4.42:1 against colors.surface ("#211D18", the pre-fix — wrong —
  // ctx.defaultBg for an asset override) but 4.88:1 against the real painted
  // scrim (luxe's own content default background, "#161310") — independently
  // computed via `contrastRatio` below, not assumed. 4.5:1 is the body-text
  // floor, and content-narrow-column.tsx's subheading renders at 22px (body
  // tier, confirmed in that file's own `fitEmphasisLine` call) via
  // `accessibleInk(colors.accent, ctx.defaultBg, 22)` — so this flip is live
  // today, not latent.
  it("an asset slide.background override changes ctx.defaultBg-driven ink to match the real painted scrim, not colors.surface (final-review Major finding)", () => {
    expect(contrastRatio("#A67B45", "#211D18")).toBeLessThan(4.5)
    expect(contrastRatio("#A67B45", "#161310")).toBeGreaterThanOrEqual(4.5)

    const SUBHEADING = "背景覆盖探针副题"
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: HEADING,
      subheading: SUBHEADING,
      components: [{ type: "paragraph", text: "文" }],
      background: { kind: "asset", asset_id: "bg1" },
    } as Slide
    const doc: PptxIR = {
      version: "5",
      filename: "deck.pptx",
      theme: { id: "classroom" },
      meta: {},
      assets: { images: { bg1: { src: "data:image/png;base64,AAAA" } } },
      slides: [slide],
    }
    const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const root = parseSvgRoot(markup)
    const subheadingText = Array.from(root.querySelectorAll("text")).find((t) => t.textContent === SUBHEADING)
    expect(subheadingText).toBeDefined()
    // Post-fix: ctx.defaultBg is the real painted scrim color, so
    // accessibleInk keeps the theme's own accent token instead of wrongly
    // falling back to neutral ink.
    //
    // 2026-08-19 深底组皮肤重设计 changed luxe's accent to `#C6A15B`, which
    // clears 4.5:1 against *both* the old-wrong source (`colors.surface`,
    // now `#14110E`, 7.75:1) and the right one (the painted scrim, 8.19:1).
    // So this render assertion no longer discriminates pre-fix from post-fix
    // on its own — the two literal `contrastRatio` pins above are what keep
    // the original defect on the record, and they are theme-independent
    // arithmetic, so they stay true regardless of luxe's palette. The live
    // probe uses classroom (unassigned, so the native narrow-column
    // subheading still consumes accessibleInk(accent, ctx.defaultBg)).
    const tokens = resolveStyle("classroom")
    const scrim = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.bg)
    expect(subheadingText!.getAttribute("fill")).toBe(accessibleInk(tokens.colors.accent, scrim, 22))
  })
})

describe("image_grid / image_compare export round-trip (image-layouts P2)", () => {
  const assets: PptxIR["assets"] = {
    images: {
      g1: { src: "data:image/png;base64,AAAA" },
      g2: { src: "data:image/png;base64,BBBB" },
    },
  }
  const roundTrip = (slide: Slide) => {
    const doc: PptxIR = { ...ir([slide]), assets }
    const markup = renderSvgMarkup(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    const root = parseSvgRoot(markup)
    expect(() => assertSubset(root)).not.toThrow()
    return svgToOps(root)
  }

  it("image_grid serializes to an export-safe svg with 2 image ops", () => {
    const ops = roundTrip({
      type: "content",
      kind: "points",
      heading: "图片网格",
      components: [
        {
          type: "image_grid",
          items: [
            { asset_id: "g1", caption: "样例一" },
            { asset_id: "g2", caption: "样例二" },
          ],
        },
      ],
    })
    expect(ops.filter((o) => o.kind === "image")).toHaveLength(2)
  })

  it("image_compare serializes with 2 image ops and label text", () => {
    const ops = roundTrip({
      type: "content",
      kind: "points",
      heading: "前后对比",
      components: [
        {
          type: "image_compare",
          left: { asset_id: "g1", label: "改造前" },
          right: { asset_id: "g2", label: "改造后" },
          style: "before_after",
        },
      ],
    })
    expect(ops.filter((o) => o.kind === "image")).toHaveLength(2)
    const texts = ops.filter((o) => o.kind === "text").map((o) => JSON.stringify(o))
    expect(texts.some((t) => t.includes("BEFORE"))).toBe(true)
  })
})

describe("theme menu cover dispatch", () => {
  const coverSlide: Slide = { type: "cover", heading: "标题", components: [] } as Slide
  const mkIr = (theme: string): PptxIR =>
    ({ version: "5", filename: "m.pptx", theme: { id: theme }, meta: {}, assets: { images: {} }, slides: [coverSlide] }) as unknown as PptxIR

  it("consulting cover 命中菜单唯一脸", () => {
    const { container } = render(<FullSlideSvg ir={mkIr("consulting")} slide={coverSlide} index={0} />)
    const g = container.querySelector("[data-archetype]")
    expect(g).not.toBeNull()
    expect(g!.getAttribute("data-archetype")).toBe(THEME_DEFINITIONS.consulting.menu.cover.face)
  })
  it("tech cover 命中菜单唯一脸", () => {
    const { container } = render(<FullSlideSvg ir={mkIr("tech")} slide={coverSlide} index={0} />)
    const id = container.querySelector("[data-archetype]")?.getAttribute("data-archetype")
    expect(id).toBe(THEME_DEFINITIONS.tech.menu.cover.face)
  })
  it("asset 背景 cover 仍走 ImageCoverPage 接管（优先级高于 manifest）", () => {
    const bgCover: Slide = { ...coverSlide, background: { kind: "asset", asset_id: "a" } } as Slide
    const ir = { ...mkIr("consulting"), assets: { images: { a: { src: "data:image/png;base64,iVBORw0KGgo=" } } }, slides: [bgCover] } as unknown as PptxIR
    const { container } = render(<FullSlideSvg ir={ir} slide={bgCover} index={0} />)
    expect(container.querySelector("image")).not.toBeNull()
  })
  it("content photo 菜单脸为 image-split 时走图文版式接管", () => {
    const splitContent: Slide = {
      type: "content",
      kind: "photo",
      heading: "图片页",
      components: [{ type: "image", asset_id: "a", fit: "cover" }],
    }
    const doc = {
      ...mkIr("consulting"),
      assets: { images: { a: { src: "data:image/png;base64,iVBORw0KGgo=" } } },
      slides: [splitContent],
    } as unknown as PptxIR
    const { container } = render(<FullSlideSvg ir={doc} slide={splitContent} index={0} />)
    expect(container.querySelector("[data-archetype]")).toBeNull()
    expect(container.querySelector("image")).not.toBeNull()
  })
})

describe("主题菜单四页型分发", () => {
  const mkIr = (theme: string, slide: Slide): PptxIR =>
    ({
      version: "5",
      filename: "m.pptx",
      theme: { id: theme },
      meta: {},
      assets: { images: {} },
      slides: [slide],
    }) as unknown as PptxIR

  it("chapter 命中 academic 菜单唯一脸", () => {
    const chapterSlide: Slide = { type: "chapter", heading: "第一章", components: [] } as Slide
    const { container } = render(
      <FullSlideSvg ir={mkIr("academic", chapterSlide)} slide={chapterSlide} index={0} />,
    )
    const id = container.querySelector("[data-archetype]")?.getAttribute("data-archetype")
    expect(id).toBe(THEME_DEFINITIONS.academic.menu.chapter.face)
  })

  it("content 命中 tech 对应 kind 的菜单脸", () => {
    const contentSlide2: Slide = {
      type: "content",
      kind: "points",
      heading: "内容页",
      components: [{ type: "paragraph", text: "正文" }],
    } as Slide
    const { container } = render(
      <FullSlideSvg ir={mkIr("tech", contentSlide2)} slide={contentSlide2} index={0} />,
    )
    const id = container.querySelector("[data-archetype]")?.getAttribute("data-archetype")
    expect(id).toBe(THEME_DEFINITIONS.tech.menu.content.points?.face)
  })

  it("ending 命中 journal 菜单唯一脸", () => {
    const endingSlide: Slide = { type: "ending", heading: "谢谢", components: [] } as Slide
    const { container } = render(
      <FullSlideSvg ir={mkIr("journal", endingSlide)} slide={endingSlide} index={0} />,
    )
    const id = container.querySelector("[data-archetype]")?.getAttribute("data-archetype")
    expect(id).toBe(THEME_DEFINITIONS.journal.menu.ending.face)
  })

  it("motif 命中：Decor 优先取 THEME_DEFINITIONS 对应主题的 motif 对应的 MOTIFS 组件（consulting → gauge-motif）", () => {
    // MOTIFS 是模块单例对象，spy 其上的属性能直接证明 FullSlideSvg
    // 内部确实调用了这张注册表（而不是巧合产出等价 markup——strangler 抽取
    // 本就要求新旧输出逐字节等价，纯 DOM diff 无法区分调用来源）。
    const spy = vi.spyOn(MOTIFS, "gauge-motif")
    const slide: Slide = { type: "cover", heading: "标题", components: [] } as Slide
    const doc = irWithFace(slide, "consulting", {})
    render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe("content kind 确定性菜单分发", () => {
  const mkIr = (theme: string, slide: Slide): PptxIR =>
    ({
      version: "5",
      filename: "m.pptx",
      theme: { id: theme },
      meta: {},
      assets: { images: {} },
      slides: [slide],
    }) as unknown as PptxIR

  it("同一种 kind 的相邻页始终命中同一菜单脸", () => {
    const slides: Slide[] = ["内容一", "内容二", "内容三"].map((heading) => ({
      type: "content",
      kind: "points",
      heading,
      components: [{ type: "paragraph", text: "正文" }],
    }))
    const doc: PptxIR = { ...ir(slides), theme: { id: "academic" } }
    const ids = slides.map((slide, index) => {
      const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={index} />)
      return container.querySelector("[data-archetype]")?.getAttribute("data-archetype")
    })
    expect(ids).toEqual(Array(3).fill(THEME_DEFINITIONS.academic.menu.content.points?.face))
  })

  it.each([
    ["points", "narrow-column"],
    ["list", "bento-panel"],
    ["comparison", "two-column"],
    ["process", "rail-numbered"],
    ["data", "split-band"],
  ] as const)("academic 的 %s kind 命中 %s", (kind, face) => {
    const slide: Slide = {
      type: "content",
      kind,
      heading: "标题",
      components: [{ type: "paragraph", text: "正文" }],
    }
    const { container } = render(<FullSlideSvg ir={mkIr("academic", slide)} slide={slide} index={0} />)
    expect(container.querySelector(`[data-archetype="${face}"]`)).not.toBeNull()
  })
})

describe("registered theme menu faces", () => {
  it("通过 cover 菜单承载指定边界脸", () => {
    const slide: Slide = { type: "cover", heading: "标题", components: [] }
    const doc = irWithFace(slide, "consulting", { cover: "poster-center" })
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    expect(container.querySelector('[data-archetype="poster-center"]')).not.toBeNull()
  })

  it("通过 content kind 菜单承载源主题菜单外的指定脸", () => {
    const slide: Slide = {
      type: "content",
      kind: "points",
      heading: "标题",
      components: [{ type: "paragraph", text: "正文" }],
    }
    const doc = irWithFace(slide, "luxe", { content: { points: "split-band" } })
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    expect(container.querySelector('[data-archetype="split-band"]')).not.toBeNull()
  })
})

// W4 task 3 fix round (review Major finding): the review proved this
// production seam was completely unguarded — `full-slide-svg.tsx` resolves
// `PACING_BUDGETS[resolveNarrative(ir.narrative).pacing].bodyBaselinePx`
// and threads it as `buildCtx`'s 5th (optional) argument. If a future edit
// ever drops that argument, `buildCtx` silently falls back to its own
// default (`PACING_BUDGETS.balanced.bodyBaselinePx` = 24) — every
// consumer of `ctx.bodyFontPx` would render 24px regardless of what
// `ir.narrative` said, and the reviewer's mutation-check found that all
// 1206 `src/render` tests stayed green when this exact regression was
// simulated, because `balanced`/24px is *both* the narrative default and
// `buildCtx`'s own fallback. This block renders THROUGH `FullSlideSvg` (the
// real production entry point, not a direct `paragraph.render(...)` call)
// so it exercises the one and only call site the seam lives at. Both renders
// use the same `points` menu face, so only `bodyFontPx` differs between the
// two assertions.
describe("pacing bodyFontPx injection seam (W4 task 3 fix round — Major)", () => {
  const PROBE_TEXT = "档位注入回归探针段落"
  const probeSlide: Slide = {
    type: "content",
    kind: "points",
    heading: "缝隙回归探针",
    components: [{ type: "paragraph", text: PROBE_TEXT }],
  } as Slide

  function renderProbeFontSize(narrative: Record<string, unknown>): string | null {
    const doc: PptxIR = { ...ir([probeSlide]), narrative }
    const { container } = render(<FullSlideSvg ir={doc} slide={probeSlide} index={0} />)
    const probeText = Array.from(container.querySelectorAll("text")).find(
      (t) => t.textContent === PROBE_TEXT,
    )
    return probeText?.getAttribute("font-size") ?? null
  }

  it("dense pacing renders the paragraph body at 24px through the real render entry point", () => {
    expect(renderProbeFontSize({ pacing: "dense" })).toBe("24")
  })

  it("spacious pacing renders the paragraph body at 32px through the real render entry point", () => {
    expect(renderProbeFontSize({ pacing: "spacious" })).toBe("32")
  })
})

describe("menu decoration determinism", () => {
  function decorMarkup(themeId: string, pageId: string): string | null {
    const doc: PptxIR = { ...ir([]), theme: { id: themeId } } as PptxIR
    const slide: Slide = { type: "content", kind: "points", id: pageId, heading: "x", components: [] } as Slide
    doc.slides = [slide]
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    return container.querySelector("[data-decor]")?.innerHTML ?? null
  }

  it("consulting 的 points 菜单装饰不随页面 id 改变", () => {
    const themeId = registerTestTheme(`full-slide-svg-${testThemeSerial++}`, "consulting")
    const markups = new Set(
      Array.from({ length: 8 }, (_, i) => decorMarkup(themeId, `page-${i}`)),
    )
    expect(markups.size).toBe(1)
    expect([...markups][0]).not.toBeNull()
  })

  it("runway 的静默菜单条目不渲染装饰", () => {
    for (let i = 0; i < 10; i++) {
      expect(decorMarkup("runway", `page-${i}`)).toBeNull()
    }
  })

  it("campaign 的菜单装饰 id 不随页面 id 改变", () => {
    const ids = new Set(
      Array.from({ length: 10 }, (_, i) => {
        const doc: PptxIR = { ...ir([]), theme: { id: "campaign" } } as PptxIR
        const slide: Slide = { type: "content", kind: "points", id: `page-${i}`, heading: "x", components: [] } as Slide
        doc.slides = [slide]
        return resolveMotifId(doc, slide, 0)
      }),
    )
    expect(ids).toEqual(new Set(["campaign-motif"]))
  })

  it("campaign 的同一菜单条目重复渲染字节一致", () => {
    const themeId = registerTestTheme(`full-slide-svg-${testThemeSerial++}`, "campaign")
    const markups = new Set(
      Array.from({ length: 20 }, () => {
        const doc: PptxIR = { ...ir([]), theme: { id: themeId } } as PptxIR
        const slide: Slide = {
          type: "content",
          kind: "points",
          id: "same-page",
          heading: "x",
          components: [],
        } as Slide
        doc.slides = [slide]
        return render(<FullSlideSvg ir={doc} slide={slide} index={0} />).container.querySelector("[data-decor]")?.innerHTML
      }),
    )
    expect(markups.size, "campaign decor varied across repeated renders").toBe(1)
  })

  it("same (ir, slide, index) renders byte-identical decor markup across repeated renders (double-render determinism)", () => {
    const themeId = registerTestTheme(`full-slide-svg-${testThemeSerial++}`, "heritage")
    const doc: PptxIR = { ...ir([]), theme: { id: themeId } } as PptxIR
    const slide: Slide = { type: "chapter", id: "p1", heading: "x", components: [] } as Slide
    doc.slides = [slide]
    const first = render(<FullSlideSvg ir={doc} slide={slide} index={0} />).container.querySelector(
      "[data-decor]",
    )?.innerHTML
    const second = render(<FullSlideSvg ir={doc} slide={slide} index={0} />).container.querySelector(
      "[data-decor]",
    )?.innerHTML
    expect(first).toBe(second)
  })
})

describe("chart palette determinism", () => {
  const RUNWAY_CHART_PALETTE = ["#141414", "#B0483C", "#8A8A84", "#C4C0B4"]

  const pieSlide: Slide = {
    type: "content",
    kind: "points",
    heading: "图表色板轮换探针",
    components: [
      {
        type: "chart",
        chart_type: "pie",
        series: [
          {
            name: "S1",
            data: [
              { x: "A", y: 10 },
              { x: "B", y: 20 },
              { x: "C", y: 30 },
              { x: "D", y: 15 },
            ],
          },
        ],
      },
    ],
  } as Slide

  function pieFills(): string[] {
    const doc: PptxIR = { ...ir([pieSlide]), theme: { id: "runway" } } as PptxIR
    const { container } = render(<FullSlideSvg ir={doc} slide={pieSlide} index={0} />)
    return Array.from(container.querySelectorAll("path"))
      .map((p) => p.getAttribute("fill"))
      .filter((f): f is string => !!f && RUNWAY_CHART_PALETTE.includes(f))
  }

  it("四个扇区保持主题色板的循环顺序", () => {
    const fills = pieFills()
    expect(fills).toHaveLength(4)
    expect([...fills].sort()).toEqual([...RUNWAY_CHART_PALETTE].sort())
    const start = RUNWAY_CHART_PALETTE.indexOf(fills[0]!)
    expect(fills).toEqual([...RUNWAY_CHART_PALETTE.slice(start), ...RUNWAY_CHART_PALETTE.slice(0, start)])
  })

  it("重复渲染得到相同扇区颜色", () => {
    expect(pieFills()).toEqual(pieFills())
  })

  it("同一 deck 的每页图表使用相同色板顺序", () => {
    const twoPageDeck: Slide[] = [
      { ...pieSlide, id: "p0" } as Slide,
      { ...pieSlide, id: "p1", heading: "第二页" } as Slide,
    ]
    const doc: PptxIR = { ...ir(twoPageDeck), theme: { id: "runway" } } as PptxIR
    const fillsFor = (index: number) => {
      const { container } = render(<FullSlideSvg ir={doc} slide={doc.slides[index]!} index={index} />)
      return Array.from(container.querySelectorAll("path"))
        .map((p) => p.getAttribute("fill"))
        .filter((f): f is string => !!f && RUNWAY_CHART_PALETTE.includes(f))
    }
    expect(fillsFor(0)).toEqual(fillsFor(1))
  })
})

describe("layouts that paint their own full-bleed field (LayoutDefinition.paintsOwnBackground)", () => {
  /** Every rect covering the whole canvas, in paint order. */
  const fullBleedFills = (container: HTMLElement) =>
    Array.from(container.querySelectorAll("rect"))
      .filter(
        (r) =>
          Number(r.getAttribute("x") ?? 0) <= 0 &&
          Number(r.getAttribute("y") ?? 0) <= 0 &&
          Number(r.getAttribute("width") ?? 0) >= 1280 &&
          Number(r.getAttribute("height") ?? 0) >= 720,
      )
      .map((r) => r.getAttribute("fill"))

  // Two full-bleed rects of different colours share one canvas edge, and a
  // browser antialiases the SVG viewport clip whenever the mounted slide's box
  // misses the device pixel grid — so the covered colour survives in the edge
  // column as a pale hairline. `ink`'s cover was reported for exactly that in
  // the 2026-08-20 review.
  const CASES = [
    ["fashion-masthead", "cover"],
    ["fashion-chapter", "chapter"],
    ["fashion-ending", "ending"],
    ["mono-bleed", "content"],
  ] as const

  for (const [layout, type] of CASES) {
    it(`${layout} is the only full-bleed paint on the page`, () => {
      const slide =
        type === "content"
          ? ({ type, kind: "statement", heading: "标题", components: [] } satisfies Slide)
          : ({ type, heading: "标题", components: [] } satisfies Slide)
      // ink does not offer mono-bleed (boarded faces are statement /
      // stat-hero / pull-quote). playbill does, and its face still paints
      // one full-bleed field, which is what this paintsOwnBackground check needs.
      const theme = layout === "mono-bleed" ? "playbill" : "ink"
      const faces: TestThemeFaces =
        type === "content" ? { content: { statement: layout } } : { [type]: layout }
      const doc = irWithFace(slide, theme, faces)
      const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
      expect(container.querySelector(`[data-archetype="${layout}"]`)).not.toBeNull()
      expect(fullBleedFills(container)).toHaveLength(1)
    })
  }

  it("an ordinary layout still gets the theme background under it", () => {
    const slide: Slide = { type: "cover", heading: "标题", components: [] }
    const doc = irWithFace(slide, "ink", { cover: "poster-center" })
    const { container } = render(<FullSlideSvg ir={doc} slide={slide} index={0} />)
    expect(fullBleedFills(container)).toContain("#F7F2E7")
  })
})

describe("deck branding posture vs theme motif", () => {
  const pinnedContent: Slide = {
    type: "content",
    kind: "points",
    heading: "三大支柱",
    components: [{ type: "paragraph", text: "我们围绕三个方向推进。" }],
  }

  it("cover-only leaves the theme motif on a content page (motif is not brand frame)", () => {
    const doc: PptxIR = { ...ir([pinnedContent]), branding: "cover-only" }
    const { container } = render(<FullSlideSvg ir={doc} slide={pinnedContent} index={0} />)
    expect(container.querySelector("[data-decor]")).not.toBeNull()
    expect(container.textContent).toContain("三大支柱")
    expect(container.querySelector('line[y1="664"]')).toBeNull()
  })

  it("omitted branding and explicit cover-only serialize to the same content-page SVG", () => {
    const omitted = ir([pinnedContent])
    const coverOnly: PptxIR = { ...omitted, branding: "cover-only" }
    const a = renderSvgMarkup(<FullSlideSvg ir={omitted} slide={pinnedContent} index={0} />)
    const b = renderSvgMarkup(<FullSlideSvg ir={coverOnly} slide={pinnedContent} index={0} />)
    expect(a).toBe(b)
  })

  it("explicit branding full still draws the content-page footer rule", () => {
    const full: PptxIR = { ...ir([pinnedContent]), branding: "full" }
    const markup = renderSvgMarkup(<FullSlideSvg ir={full} slide={pinnedContent} index={0} />)
    expect(markup).toContain('y1="664"')
    expect(markup).toContain("ACME")
  })
})
