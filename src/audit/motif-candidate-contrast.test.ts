// @vitest-environment node
//
// Production motif contrast: each built-in theme's actual motif (menu
// decor, otherwise the theme default) is rendered on cover/chapter/content/
// ending. No seed lottery. Face choice is the theme menu.
import { beforeAll, describe, expect, it } from "vitest"
import type { PageKind, PptxIR, Slide } from "@/ir"
import { renderSlideSvg } from "@/api"
import { auditDeck, type AuditFinding } from "./deck-audit"
import { installNodePlatform } from "../platform/node"
import { CANONICAL_THEME_IDS, resolveStyle } from "../themes"
import { getThemeDefinition } from "../themes/definitions"
import { resolveBackgroundHex } from "../render/full-slide-svg"
import { parseSvgRoot } from "../render/serialize"
import { contrastRatio } from "../render/ink"

beforeAll(() => {
  installNodePlatform()
})

const HEADING = "候选贴纸对比度回归探针"
const SUBHEADING = "候选贴纸对比度回归探针副标题"

function firstContentKind(themeId: string): PageKind {
  const content = getThemeDefinition(themeId).menu.content
  const kind = (Object.keys(content) as PageKind[]).find((entryKind) => content[entryKind] !== undefined)
  if (kind === undefined) throw new Error(`theme "${themeId}" offers no content kind`)
  return kind
}

function deckFor(themeId: string, slide: Slide): PptxIR {
  return {
    version: "5",
    filename: "motif-candidate-contrast-fixture",
    theme: { id: themeId },
    meta: {},
    assets: { images: {} },
    slides: [slide],
  }
}

function slidesFor(themeId: string): Slide[] {
  return [
    { type: "cover", id: "0", heading: HEADING, components: [] } as Slide,
    { type: "chapter", id: "0", heading: HEADING, subheading: SUBHEADING, components: [] } as Slide,
    {
      type: "content",
      kind: firstContentKind(themeId),
      id: "0",
      heading: HEADING,
      subheading: SUBHEADING,
      components: [
        { type: "paragraph", text: "示例正文段落，用于占满 body 插槽验证排版不崩。" },
        { type: "bullets", items: ["要点一", "要点二", "要点三"] },
      ],
    } as Slide,
    { type: "ending", id: "0", heading: HEADING, components: [] } as Slide,
  ]
}

/**
 * The `fashion-chapter` layout's own decorative chapter-number watermark
 * (`chapter-fashion-chapter.tsx`'s own header calls it decorative by
 * design) — already adjudicated and blanket-allowlisted for all 13 themes
 * in `full-matrix-contrast.test.ts`'s own `ALLOWLIST` (ratio band
 * [1.2, 1.8], 1-2 digit text, current 13-theme spread 1.24-1.75).
 */
function isKnownFashionChapterWatermark(f: AuditFinding): boolean {
  if (f.code !== "low-contrast") return false
  const detail = f.detail as { text?: string; ratio?: number } | undefined
  return !!detail?.text && /^\d{1,2}$/.test(detail.text) && !!detail.ratio && detail.ratio >= 1.2 && detail.ratio <= 1.8
}

function auditFindings(ir: PptxIR): AuditFinding[] {
  return auditDeck(ir).findings.filter(
    (f) =>
      (f.code === "low-contrast" || f.code === "overflow" || f.code === "out-of-bounds") &&
      !isKnownFashionChapterWatermark(f),
  )
}

// Zero-delta white-on-white is 1.0000. The faintest production cover mark
// (bulletin's 0.28 white rect on paper) measures ~1.018.
const VISIBILITY_FLOOR = 1.01

/** Same alpha-composite math as `../render/ink.ts`'s own (private) `blendOver`. */
function blendOver(fg: string, bg: string, alpha: number): string {
  const toRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.replace("#", ""), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }
  const [fr, fgc, fb] = toRgb(fg)
  const [br, bgc, bb] = toRgb(bg)
  const mix = (f: number, b: number) => Math.round(f * alpha + b * (1 - alpha))
  const toHex = (v: number) => v.toString(16).padStart(2, "0")
  return `#${toHex(mix(fr, br))}${toHex(mix(fgc, bgc))}${toHex(mix(fb, bb))}`
}

function shapeOpacity(el: Element): number {
  const read = (attr: string): number => {
    const v = el.getAttribute(attr)
    return v === null ? 1 : Number(v)
  }
  return read("opacity") * read("fill-opacity") * read("stroke-opacity")
}

function shapeColor(el: Element): string | null {
  const fill = el.getAttribute("fill")
  if (fill?.startsWith("#")) return fill
  const stroke = el.getAttribute("stroke")
  if (stroke?.startsWith("#")) return stroke
  return null
}

const DECOR_SHAPE_SELECTOR = "line, path, rect, circle, ellipse"

describe("builtin theme motif contrast (production menu/theme motif)", () => {
  for (const themeId of CANONICAL_THEME_IDS) {
    it(`${themeId}: zero contrast/overflow/out-of-bounds findings across cover/chapter/content/ending`, () => {
      const failures: string[] = []
      for (const slide of slidesFor(themeId)) {
        const ir = deckFor(themeId, slide)
        const findings = auditFindings(ir)
        for (const f of findings) failures.push(`${slide.type}: ${f.code} ${JSON.stringify(f.detail)}`)
      }
      expect(failures).toEqual([])
    })
  }
})

describe("builtin theme motif decor-visibility (production menu/theme motif)", () => {
  it("at least one builtin theme paints a hex-colored decor shape", () => {
    let sawAnyShape = false
    for (const themeId of CANONICAL_THEME_IDS) {
      for (const slide of slidesFor(themeId)) {
        const ir = deckFor(themeId, slide)
        const markup = renderSlideSvg(ir, 0)
        const root = parseSvgRoot(markup)
        const decorRoot = root.querySelector("[data-decor]")
        const shapes = decorRoot ? Array.from(decorRoot.querySelectorAll(DECOR_SHAPE_SELECTOR)) : []
        if (shapes.some((shape) => shapeColor(shape))) {
          sawAnyShape = true
          break
        }
      }
      if (sawAnyShape) break
    }
    expect(sawAnyShape).toBe(true)
  })

  for (const themeId of CANONICAL_THEME_IDS) {
    it(`${themeId}: every decor shape it actually renders clears a small but nonzero visibility floor against its own real background`, () => {
      const tokens = resolveStyle(themeId)
      const failures: string[] = []

      for (const slide of slidesFor(themeId)) {
        const ir = deckFor(themeId, slide)
        const markup = renderSlideSvg(ir, 0)
        const root = parseSvgRoot(markup)
        const decorRoot = root.querySelector("[data-decor]")
        const shapes = decorRoot ? Array.from(decorRoot.querySelectorAll(DECOR_SHAPE_SELECTOR)) : []
        if (shapes.length === 0) continue

        const bgHex = resolveBackgroundHex(tokens.defaultBackgrounds[slide.type], tokens.colors.surface)
        let maxRatio = 0
        let maxRatioDetail = ""
        for (const shape of shapes) {
          const color = shapeColor(shape)
          if (!color) continue
          const opacity = shapeOpacity(shape)
          const blended = opacity >= 1 ? color : blendOver(color, bgHex, opacity)
          const ratio = contrastRatio(blended, bgHex)
          if (ratio > maxRatio) {
            maxRatio = ratio
            maxRatioDetail = `${shape.tagName} color=${color} opacity=${opacity} bg=${bgHex} blended=${blended}`
          }
        }
        if (maxRatio > 0 && maxRatio < VISIBILITY_FLOOR) {
          failures.push(
            `${slide.type}: every decor shape is near-invisible — best ratio ${maxRatio.toFixed(4)} (floor ${VISIBILITY_FLOOR}) from ${maxRatioDetail}`,
          )
        }
      }

      expect(failures).toEqual([])
    })
  }
})
