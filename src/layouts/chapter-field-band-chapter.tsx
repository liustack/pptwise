import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { formatChapterLabel, headingIsCjk } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * field-band-chapter（第八波 pinOnly）：满版 primary 橄榄上的左齐章首。
 * kicker 走 `formatChapterLabel("part")`。反白标题与副题。零装饰。motif
 * 章节退让。本文件自绘满版（`paintsOwnBackground`），主题
 * `defaultBackgrounds.chapter` 保持橄榄，避免 contrast floor 拿深字压深底。
 *
 * 构图抄 `.issues/design-boards/wave8/b3/Terra.dc.html` 章节：kicker y300 /
 * 19px，标题 y392 / 56px，副题 y448 / 20px。进共享池。零 theme id、零
 * baked hex。CJK 不加 letter-spacing。空 heading 不编造章名。
 */

const TITLE_X = 96
const TITLE_Y = 392
const TITLE_SIZE = 56
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 68

const KICKER_X = 96
const KICKER_Y = 300
const KICKER_SIZE = 19
const KICKER_TRACKING = 8
const KICKER_MAX_W = 1088

const SUB_SIZE = 20
const SUB_DROP = 56
const SUB_MAX_W = 1088

function dropOverflowMarks(text: string): string {
  return text.replace(/…/g, "").replace(/\.{3}/g, "")
}

export function FieldBandChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading, slide.subheading)
  const kickerLabel = formatChapterLabel("part", chNum, cjk)
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0

  const kickerTracking = !hasCjk(kickerLabel) ? KICKER_TRACKING : undefined
  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.body,
  })
  const kickerText = dropOverflowMarks(kicker.text)

  const heading = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLines = heading.lines.map(dropOverflowMarks).filter((line) => line.length > 0)
  const headingLastY = TITLE_Y + Math.max(0, titleLines.length - 1) * heading.lineHeight
  const titleInk = accessibleInk(colors.bg, field, heading.fontSize)

  const subheading = slide.subheading
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subText = subheading ? dropOverflowMarks(subheading.text) : ""

  return (
    <>
      <rect x={0} y={0} width={1280} height={720} fill={field} />

      {kickerText && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.bg, field)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kickerText}
        </text>
      )}

      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === titleLines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subheading && subText && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={TITLE_X}
          y={headingLastY + SUB_DROP}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.bg, field)}
          dominantBaseline="alphabetic"
        >
          {subText}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-field-band-chapter.tsx: full-bleed primary field,
  // "part" kicker, left inverted title. Zero decoration. Motif recedes.
  // Empty heading draws no title.
  id: "field-band-chapter",
  kind: "standard",
  story: {
    name: "Color Field",
    story: "The entire page fills with the primary color, and the chapter title appears in reversed type on the left, with a part kicker above. Nothing else is on the page.",
    positioning: "A full-immersion break that floods the screen between sections. This is the loudest section page in the set, a curtain rather than a beat.",
    audience: "Viewers in a darkened auditorium or at a projector who feel the color hit as a physical shift.",
    notFor: "Decks that need a subtle pause between topics, which suit gilt-ordinal-chapter or ghost-rule-chapter.",
  },
  paintsOwnBackground: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
