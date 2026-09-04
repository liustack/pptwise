import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { casualHan, headingIsCjk } from "../render/heading-treatments/labels"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * hall-label-chapter（第八波 pinOnly）：展厅号当章号。kicker 铜金，标题与
 * 副题左齐，别无一物。构图抄
 * `.issues/design-boards/wave8/b4/Museum.dc.html` 章节：kicker y300 /
 * 19px、标题 y396 / 58px、副题 y456 / 20px。
 *
 * 进共享池。零 theme id、零 baked hex。无 motif、无角标 tick、无线、无框。
 * 铜金只给厅号。空 heading 不编造展厅名。CJK 不加 letter-spacing。标题
 * 装得下就用板上 58px，不放大铺满。
 */

const KICKER_X = 96
const KICKER_Y = 300
const KICKER_SIZE = 19
const KICKER_TRACKING = 10
const KICKER_MAX_W = 1088

const TITLE_X = 96
const TITLE_Y = 396
const TITLE_SIZE = 58
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 68

const SUB_X = 96
const SUB_Y = 456
const SUB_SIZE = 20
const SUB_DROP = 60
const SUB_MAX_W = 1088
const SUB_MIN_PT = 16

function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function hallLabel(n: number, cjk: boolean): string {
  const index = Math.max(1, n)
  return cjk ? `第${casualHan(index)}展厅` : `HALL ${index}`
}

export function HallLabelChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading)
  const kickerLabel = hallLabel(chNum, cjk)
  const kickerTracking = hasCjk(kickerLabel) ? undefined : KICKER_TRACKING
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0

  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
  })
  const kickerPainted = cutMarks(kicker.text)

  const heading = fitHeadingLines(headingSource, {
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

  const subSource = stripEmphasis(slide.subheading ?? "").trim()
  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.heading,
      })
    : null
  const subPainted = subheading ? cutMarks(subheading.text) : ""
  const subY = showTitle && heading.lines.length > 1 ? headingLastY + SUB_DROP : SUB_Y

  return (
    <>
      {kickerPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={accessibleInk(colors.accent, pageBg, kicker.fontSize)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kickerPainted}
        </text>
      )}
      {showTitle &&
        heading.lines.map((line, i) => {
          const painted = cutMarks(line)
          if (!painted) return null
          return (
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
              {painted}
            </text>
          )
        })}
      {subheading && subPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={SUB_X}
          y={subY}
          fontFamily={fonts.heading}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subPainted}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-hall-label-chapter.tsx: hall-number kicker in accent,
  // left title, no frame, no tick, no rule. Empty heading invents no hall
  // name. Copper gold is the hall label only.
  id: "hall-label-chapter",
  kind: "standard",
  story: {
    name: "Hall Label",
    story: "A small hall number in the highlight color sits above the left-aligned title, and the page carries no rules, frames, or marks. The highlight color belongs to the hall number alone.",
    positioning: "A gallery-walk break that numbers sections as halls. The emptiness around the title treats each chapter as a room to walk into.",
    audience: "Readers on a personal screen or printed guide, close enough to read the small hall number.",
    notFor: "Decks that need a structural mark or rule to anchor the break, which suit Subject Rule.",
  },
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
