import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { ContentRect } from "../render/layout"
import { pickEvidence } from "../render/component-traits"
import { fitEmphasisHeading, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { SvgContent } from "../render/svg-content"
import { stepAside } from "../render/step-aside"
import { renderFittedEvidence } from "./fitted-evidence"
import { sparseFace } from "./sparse/registry"

/**
 * 未注册的 (themeId, layoutId) 与自定义主题仍走此脸。
 *
 * one-evidence 通用脸：整句断言 + 独占一张图或一个表。容量 1。菜单可用
 * silent 同时关掉 motif 与页级品牌。
 * 证据挑选复用 `pickEvidence`（和 `assertion_evidence` 同一份优先级）。没有
 * 命中证据类型时本脸退位，整页交给通用组件渲染（见 `evidenceExact`）。
 * 等比缩小以适配剩余框，不放大。
 *
 * 纪律：本文件禁 theme id、禁颜色 hex 字面量，颜色 / 字体全部来自 ctx。
 */

const HEADING_X = 80
const HEADING_Y = 72
const HEADING_MAX_W = 1120
const EVIDENCE_X = 160
const EVIDENCE_TOP = 180
const EVIDENCE_W = 960
const EVIDENCE_BOTTOM = 640
const FOOTNOTE_Y = 656
const FOOTNOTE_SIZE = 12

/**
 * Whether this page is the one thing this face can draw: a single piece of
 * evidence.
 *
 * Every construction on this face — the generic one below and the nine theme
 * faces in `sparse/` — puts exactly one component in exactly one frame, and
 * finds it with `pickEvidence`. `pickEvidence` knows `EVIDENCE_TYPES` and
 * nothing else, so an `insight_panel`, a `code` listing or a `citation`
 * returned `undefined` and the theme faces rendered no component at all: 29
 * gallery pages shipped as a kicker and a heading over an empty frame, with
 * no ellipsis, no `data-dropped`, and no validate error. Drawing none of one
 * and saying nothing about it is the posture the face discipline forbids.
 *
 * So the face steps aside and the ordinary component renderer draws the page,
 * which paints every component it is given whatever its type. A page with no
 * components has nothing this face can fail to draw, so it keeps the face.
 *
 * Same guard shape as `stat-hero`, `image-annotate` and `show-spotlight`:
 * this repository has no re-selection pass a null return could fall through
 * to, so "step aside" is a second render inside the same face rather than a
 * second trip through the menu.
 */
function evidenceExact(slide: SvgTemplateProps["slide"]): boolean {
  if (slide.components.length === 0) return true
  return slide.components.length === 1 && pickEvidence(slide.components) !== undefined
}

export function OneEvidenceContent(props: SvgTemplateProps) {
  if (!evidenceExact(props.slide)) return OneEvidenceFallbackContent(props)
  const Face = sparseFace("one-evidence", props.ir.theme.id)
  if (Face) return Face(props)
  return GenericOneEvidenceContent(props)
}

/**
 * First heading baseline on the fallback page.
 *
 * Lower than the face's own `HEADING_Y`, and for a reason a raster showed:
 * the nine theme faces this fallback stands in for keep their heading well
 * inside the page (consulting's starts at x=224), and their themes decorate
 * the corner those faces leave empty — a `locator-corner` runs an arm along
 * y=56 out to x=128. A heading on this page's own left margin at y=72 has
 * that arm drawn through its first two glyphs. Starting below the corner's
 * own extent (y=128) clears every one of them, and reads as an ordinary
 * content page on a theme that draws nothing there.
 */
const FALLBACK_HEADING_Y = 168

/** The whole page, drawn plainly, when the single-evidence frame cannot hold it. */
function OneEvidenceFallbackContent({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg

  const heading = fitEmphasisHeading(slide.heading, {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingBottom =
    FALLBACK_HEADING_Y +
    Math.max(0, heading.lines.length - 1) * heading.lineHeight +
    heading.fontSize * 0.25
  const bodyTop = Math.ceil(headingBottom + 24)

  const footnoteSource = slide.footnote?.trim()
  const footnote = footnoteSource
    ? fitSvgLine(footnoteSource, { maxWidth: HEADING_MAX_W, fontSize: FOOTNOTE_SIZE, minFontSize: 16 })
    : null

  // This page is already a fallback and it can still come up short. Its
  // floor is 640 against the sheet's 612, which reads like more room until
  // the heading is set: `bodyTop` follows a two-line title down, and the
  // sheet's own title is 34px where this one is display size. Sixteen
  // citations measure 1120x439 here and 1104x477 there.
  const bodyRect = { x: HEADING_X, y: bodyTop, w: HEADING_MAX_W, h: Math.max(80, EVIDENCE_BOTTOM - bodyTop) }
  const aside = stepAside({ face: "one-evidence", slide, ctx, bodyRect })
  if (aside) return aside

  return (
    <g data-evidence-mode="fallback">
      {renderEmphasisHeading(
        heading,
        headingEmphasisPaint(ctx, heading, {
          baseFill: accessibleInk(colors.text, defaultBg, heading.fontSize),
          fontWeight: "600",
          fontFamily: fonts.heading,
        }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={HEADING_X}
            y={FALLBACK_HEADING_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="600"
            fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <SvgContent
        components={slide.components}
        rect={bodyRect}
        ctx={ctx}
      />
      {footnote && (
        <text
          data-truncated={footnote.truncated ? "1" : undefined}
          x={HEADING_X}
          y={FOOTNOTE_Y}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={accessibleInk(colors.muted, defaultBg, footnote.fontSize)}
          dominantBaseline="alphabetic"
        >
          {footnote.text}
        </text>
      )}
    </g>
  )
}

function GenericOneEvidenceContent({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg

  const heading = fitEmphasisHeading(slide.heading, {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })

  // `evidenceExact` has already established that this is a component
  // `pickEvidence` recognizes, or that there is no component at all — the
  // old `?? slide.components[0]` fallthrough is what used to let a component
  // no construction on this face could place reach the page as a shrunken
  // guess, and the guard replaces it.
  const evidence = pickEvidence(slide.components)
  const headingBottom =
    HEADING_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight + heading.fontSize * 0.25
  const evidenceY = Math.max(EVIDENCE_TOP, Math.ceil(headingBottom + 16))
  const evidenceRect: ContentRect = {
    x: EVIDENCE_X,
    y: evidenceY,
    w: EVIDENCE_W,
    h: EVIDENCE_BOTTOM - evidenceY,
  }

  const footnoteSource = slide.footnote?.trim()
  const footnote = footnoteSource
    ? fitSvgLine(footnoteSource, {
        maxWidth: HEADING_MAX_W,
        fontSize: FOOTNOTE_SIZE,
        minFontSize: 16,
      })
    : null

  return (
    <>
      <g
        data-text-rect={`${HEADING_X},${HEADING_Y - heading.fontSize},${HEADING_MAX_W},${headingBottom - (HEADING_Y - heading.fontSize)}`}
      >
        {renderEmphasisHeading(
          heading,
          headingEmphasisPaint(ctx, heading, { baseFill: accessibleInk(colors.text, defaultBg, heading.fontSize), fontWeight: "600", fontFamily: fonts.heading }),
          (_line, i) => (
            <text
              key={i}
              data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
              x={HEADING_X}
              y={HEADING_Y + i * heading.lineHeight}
              fontFamily={fonts.heading}
              fontSize={heading.fontSize}
              fontWeight="600"
              fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
              dominantBaseline="alphabetic"
              />
          ),
        )}
      </g>

      {evidence && renderFittedEvidence(evidence, evidenceRect, ctx)}

      {footnote && (
        <text
          data-truncated={footnote.truncated ? "1" : undefined}
          x={HEADING_X}
          y={FOOTNOTE_Y}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={accessibleInk(colors.muted, defaultBg, footnote.fontSize)}
          dominantBaseline="alphabetic"
        >
          {footnote.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // content-one-evidence.tsx: a assertion + single evidence page.
  // Heading is a full-sentence claim. Body capacity 1 is the evidence
  // (chart / table / image / whatever pickEvidence returns, else the sole
  // component). Page decor and branding posture belong to the menu entry.
  id: "one-evidence",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: "any", capacity: 1 },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: HEADING_MAX_W,
    fontSize: 36,
    maxLines: 3,
    minPt: 22,
    lineHeightRatio: 1.2,
  },
} satisfies LayoutDefinition
