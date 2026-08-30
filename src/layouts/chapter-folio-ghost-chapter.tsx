import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { formatChapterLabel, headingIsCjk } from "../render/heading-treatments/labels"
import { textInkBox } from "../render/depth-contract/geometry"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { stripEmphasis } from "../render/emphasis"

/**
 * folio-ghost-chapter（第八波 pinOnly）：浅底章首。kicker「第三章」走
 * `formatChapterLabel("chapter")`，金短线 96×2 依附 kicker，标题左齐，
 * 5% 幽灵章号沉右下。构图抄 academic 设计板章节页。
 *
 * 进共享池。零 theme id、零 baked hex。金短线是标题簇起手，不是角落 tick。
 * 幽灵号显式 `data-depth="mid"`，量 `textInkBox`，出血内收。空 heading
 * 不编造章名。
 */

const TITLE_X = 96
const TITLE_Y = 428
const TITLE_SIZE = 52
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 64

const SUB_SIZE = 20
const SUB_DROP = 54

const KICKER_X = 96
const KICKER_Y = 330
const KICKER_SIZE = 19
const KICKER_TRACKING = 8
const KICKER_MAX_W = 720

const RULE_X = 96
const RULE_Y = 352
const RULE_W = 96
const RULE_H = 2

const GHOST_X = 1160
const GHOST_Y = 600
const GHOST_SIZE = 420
const GHOST_OPACITY = 0.05
const GHOST_PAD = 4

function placeGhost(
  content: string,
  fontFamily: string,
  fontWeight: string | number | null | undefined,
): { x: number; y: number } {
  let x = GHOST_X
  let y = GHOST_Y
  const measure = () =>
    textInkBox({
      content,
      x,
      y,
      fontSize: GHOST_SIZE,
      fontFamily,
      fontWeight,
      textAnchor: "end",
    })
  let box = measure()
  if (box.x < GHOST_PAD) x += GHOST_PAD - box.x
  if (box.y < GHOST_PAD) y += GHOST_PAD - box.y
  box = measure()
  if (box.x + box.w > CANVAS_W_PX - GHOST_PAD) x -= box.x + box.w - (CANVAS_W_PX - GHOST_PAD)
  if (box.y + box.h > CANVAS_H_PX - GHOST_PAD) y -= box.y + box.h - (CANVAS_H_PX - GHOST_PAD)
  return { x, y }
}

export function FolioGhostChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const cjk = headingIsCjk(slide.heading)
  const kickerLabel = formatChapterLabel("chapter", chNum, cjk)
  const ghostLabel = String(chNum)
  const ghostInk = readableOn(defaultBg)
  const ghostAt = placeGhost(ghostLabel, fonts.heading, undefined)
  const headingSource = stripEmphasis(slide.heading ?? "")

  const kickerTracking = cjk ? undefined : KICKER_TRACKING
  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: kickerTracking,
    fontFamily: fonts.heading,
  })

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
  const showTitle = headingSource.trim().length > 0
  const subheading = slide.subheading
    ? fitSvgLine(slide.subheading, {
        maxWidth: TITLE_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <text
        data-depth="mid"
        x={ghostAt.x}
        y={ghostAt.y}
        fontFamily={fonts.heading}
        fontSize={GHOST_SIZE}
        fill={ghostInk}
        opacity={GHOST_OPACITY}
        textAnchor="end"
        dominantBaseline="alphabetic"
      >
        {ghostLabel}
      </text>
      <text
        data-contrast-tier="meta"
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.heading}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.primary, defaultBg, kicker.fontSize)}
        letterSpacing={kickerTracking}
        dominantBaseline="alphabetic"
      >
        {kicker.text}
      </text>
      <rect x={RULE_X} y={RULE_Y} width={RULE_W} height={RULE_H} fill={colors.accent} />
      {showTitle &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * heading.lineHeight}
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
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
          y={headingLastY + SUB_DROP}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, defaultBg)}
          dominantBaseline="alphabetic"
        >
          {subheading.text}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // chapter-folio-ghost-chapter.tsx: pinOnly folio chapter open. Chapter
  // kicker plus a 96×2 accent rule, left title, bottom-right ghost numeral
  // kept inside the canvas. Theme paints the ivory field.
  id: "folio-ghost-chapter",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["chapter"],
  slots: [
    { name: "watermark", accepts: [] },
    { name: "kicker", accepts: [] },
    { name: "rule", accepts: [] },
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
}
