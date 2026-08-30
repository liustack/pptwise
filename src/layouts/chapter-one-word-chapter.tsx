import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { formatChapterLabel, headingIsCjk } from "../render/heading-treatments/labels"
import { hasCjk, trackingPx } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * one-word-chapter（第八波 pinOnly）：冷玄黑场上一个词满场。标题居中钉
 * 120px / weight 700，不乘 typeScale。幕次退成注脚：`formatChapterLabel("act")`
 * 与 subheading 用 ` · ` 拼一行。构图抄
 * `.issues/design-boards/wave8/b4/Stage.dc.html` 章节：标题 y410 / 120px
 * `text-anchor=middle`，注脚 y500 / 22px muted。
 *
 * 进共享池。零 theme id、零 baked hex。无装饰（stage / runway 的 decor=none
 * 身份）。空 heading 不编造「性能」。CJK 不加 letter-spacing。渲染不画省略
 * 号。右侧与四周留白必须留着，不要把 120px 放大铺满。
 */

const CENTER_X = 640
const CONTENT_MAX_W = 920

const TITLE_Y = 410
const TITLE_SIZE = 120
const TITLE_MIN_PT = 56
const TITLE_MAX_LINES = 1

const FOOT_Y = 500
const FOOT_SIZE = 22
const FOOT_TRACKING_LATIN_EM = 0.08
const FOOT_MAX_W = 920
const FOOT_MIN_PT = 16

/** Fit 链可能给末字补上省略号。渲染侧砍掉，不画 … 或 ...。 */
function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function footnoteSource(actLabel: string, subheading: string): string {
  if (!subheading) return actLabel
  if (!actLabel) return subheading
  return `${actLabel} · ${subheading}`
}

export function OneWordChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const cjk = headingIsCjk(slide.heading || slide.subheading)
  const actLabel = formatChapterLabel("act", chNum, cjk)
  const footRaw = footnoteSource(actLabel, subSource)
  const footTracking = footRaw && !hasCjk(footRaw) ? trackingPx(FOOT_SIZE, FOOT_TRACKING_LATIN_EM) : undefined

  const heading = fitHeadingLines(headingSource, {
    maxWidth: CONTENT_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
    bold: true,
  })

  const footnote = footRaw
    ? fitSvgLine(footRaw, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: FOOT_MIN_PT,
        letterSpacing: footTracking,
        fontFamily: fonts.body,
      })
    : null
  const footPaint = footnote ? cutMarks(footnote.text) : ""

  return (
    <>
      {showTitle &&
        heading.lines.map((line, i) => {
          const paint = cutMarks(line)
          if (!paint) return null
          return (
            <text
              key={i}
              data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
              x={CENTER_X}
              y={TITLE_Y + i * heading.lineHeight}
              textAnchor="middle"
              fontFamily={fonts.heading}
              fontSize={heading.fontSize}
              fontWeight="700"
              fill={accessibleInk(colors.text, pageBg, heading.fontSize)}
              dominantBaseline="alphabetic"
            >
              {paint}
            </text>
          )
        })}

      {footnote && footPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={footnote.truncated ? "1" : undefined}
          x={CENTER_X}
          y={FOOT_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          letterSpacing={footTracking}
          dominantBaseline="alphabetic"
        >
          {footPaint}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-one-word-chapter.tsx: pinOnly one-word keynote chapter.
  // Centered 120px title (no typeScale), act label + subheading as a
  // muted footnote. No decor. Empty heading invents no 性能.
  id: "one-word-chapter",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "kicker", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: CONTENT_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
  },
} satisfies LayoutDefinition
