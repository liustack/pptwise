import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { sealStudioGlyph } from "./minimal-shared"

/**
 * seal-close-ending（第八波 pinOnly）：居中一句收束，下一讲取 subheading，
 * 中轴印章当句点。印文走 sealStudioGlyph，缺印文整印不画，不写死印文。
 * 不致谢，不兜底 Thank you。右下半山归 motif。
 *
 * 构图抄 `.issues/design-boards/wave8/b2/Ink.dc.html` ending：句 y300 /
 * 46px，下一讲 y380 / 21px，印 604,440 60×60。零 theme id、零 baked hex。
 */

const TITLE_X = 640
const TITLE_Y = 300
const TITLE_SIZE = 46
const TITLE_MIN_PT = 28
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 960
const TITLE_LINE_HEIGHT = 76

const SUB_SIZE = 21
const SUB_GAP = 80
const SUB_MAX_W = 960

const SEAL_X = 604
const SEAL_Y = 440
const SEAL_SIZE = 60
const SEAL_GLYPH_SIZE = 28
const SEAL_GLYPH_Y = 482
const SEAL_GAP = 60

export function SealCloseEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const sealGlyph = sealStudioGlyph(org)
  const sealFill = colors.accent
  const sealInk = readableOn(sealFill)

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * TITLE_LINE_HEIGHT
  const subY = showTitle ? titleLastY + SUB_GAP : TITLE_Y + SUB_GAP
  const sealY = showTitle ? (slide.subheading ? subY + SEAL_GAP : titleLastY + SUB_GAP + SEAL_GAP) : SEAL_Y
  const sealGlyphY = sealY === SEAL_Y ? SEAL_GLYPH_Y : Math.round(sealY + SEAL_SIZE / 2 + SEAL_GLYPH_SIZE * 0.35)

  const subheading = slide.subheading
    ? fitSvgLine(slide.subheading, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null

  return (
    <>
      {showTitle &&
        title.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * TITLE_LINE_HEIGHT}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.primary, bg, title.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subheading && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={TITLE_X}
          y={subY}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}

      {sealGlyph && (
        <>
          <rect x={SEAL_X} y={sealY} width={SEAL_SIZE} height={SEAL_SIZE} fill={sealFill} />
          <text
            x={SEAL_X + SEAL_SIZE / 2}
            y={sealGlyphY}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={SEAL_GLYPH_SIZE}
            fill={sealInk}
            dominantBaseline="alphabetic"
          >
            {sealGlyph}
          </text>
        </>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-seal-close-ending.tsx: centered close sentence, next-talk
  // line from subheading, axis seal as the period. Empty heading invents no
  // close copy and no thank-you. Motif owns the right remnant mountain.
  id: "seal-close-ending",
  kind: "standard",
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: true,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
