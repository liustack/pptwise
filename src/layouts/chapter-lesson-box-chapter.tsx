import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { casualHan } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * lesson-box-chapter（第八波 pinOnly）：浅底上的 primary 环节盒，盒内白字
 * 「环节 N」或 Latin `LESSON n`，标题左齐落在盒下。构图抄
 * `.issues/design-boards/wave8/b2/Classroom.dc.html` 章节：盒 (96,264,176×64)，
 * 号 y308，题 y416 / 52px，副题 y470。
 *
 * 进共享池，不是 classroom 专用。零 theme id、零 baked hex。两条横线簿格线
 * 归 motif，本版式不画。空 heading 不编造环节名。
 */

const BOX_X = 96
const BOX_Y = 264
const BOX_W = 176
const BOX_H = 64
const BOX_LABEL_SIZE = 26
const BOX_LABEL_Y = 308
const BOX_LABEL_MAX_W = 160

const TITLE_X = 96
const TITLE_Y = 416
const TITLE_SIZE = 52
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 62

const SUB_SIZE = 20
const SUB_Y = 470
const SUB_DROP = 54
const SUB_MAX_W = 1088

function lessonLabel(n: number, cjk: boolean): string {
  const index = Math.max(1, n)
  return cjk ? `环节${casualHan(index)}` : `LESSON ${index}`
}

export function LessonBoxChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const field = colors.primary
  const labelInk = readableOn(field)
  const chNum = chapterNumberFor(ir.slides, index)
  const cjk = hasCjk(slide.heading ?? slide.subheading ?? "")
  const labelSource = lessonLabel(chNum, cjk)
  const label = fitSvgLine(labelSource, {
    maxWidth: BOX_LABEL_MAX_W,
    fontSize: BOX_LABEL_SIZE,
    minFontSize: 16,
    fontFamily: fonts.heading,
  })

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const heading = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingLastY = TITLE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight
  const titleInk = accessibleInk(colors.text, pageBg, heading.fontSize)

  const subheading = slide.subheading
    ? fitSvgLine(stripEmphasis(slide.subheading), {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subY = heading.lines.length > 1 ? headingLastY + SUB_DROP : SUB_Y

  return (
    <>
      <rect x={BOX_X} y={BOX_Y} width={BOX_W} height={BOX_H} fill={field} />
      <text
        data-truncated={label.truncated ? "1" : undefined}
        x={BOX_X + BOX_W / 2}
        y={BOX_LABEL_Y}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={label.fontSize}
        fontWeight="700"
        fill={labelInk}
        dominantBaseline="alphabetic"
      >
        {label.text}
      </text>

      {plainHeading.trim() &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
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

      {subheading && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={TITLE_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // chapter-lesson-box-chapter.tsx: pinOnly lesson box with inverted
  // index, left-aligned title under the box. Notebook rules belong to
  // the motif. Theme paints the chapter paper.
  id: "lesson-box-chapter",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
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
