import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { casualHan, headingIsCjk } from "../render/heading-treatments/labels"
import { trackingPx } from "./minimal-shared"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText, stripEmphasis } from "../render/emphasis"

/**
 * mirror-volume-chapter（第八波 pinOnly）：中轴对镜。muted 卷号在上，
 * 标题居中，对杠夹一点（accent 线 + primary 圆点）依附标题簇，不是角落
 * tick。构图抄 `.issues/design-boards/wave8/b2/Heritage.dc.html` 章节：
 * 卷号 y290、标题 y396 / 64px、对杠与圆点 y450、副题 y520。
 *
 * 卷号 CJK「卷」+ 汉数字，Latin `VOL.`。进共享池，零 theme id、零 baked hex。
 * 底色走主题 `defaultBackgrounds.chapter`，本文件不自绘满版。
 *
 * 对杠只夹副题。没有副题就不画线（空槽不画容器）。不画中轴孤立圆点。
 */

const CENTER_X = 640
const CONTENT_MAX_W = 920

const VOLUME_Y = 290
const VOLUME_SIZE = 20
const VOLUME_TRACKING_LATIN_EM = 0.22

const TITLE_Y = 396
const TITLE_SIZE = 64
const TITLE_MIN_PT = 36
const TITLE_MAX_LINES = 2
const TITLE_LINE_HEIGHT = 76

const BAR_STROKE = 1.5
const BAR_LEN = 80
const BAR_GAP = 20
const BAR_MIN_X = 96
const BAR_MAX_X = 1184

const SUB_SIZE = 19
const SUB_GAP = 124

function volumeLabel(n: number, cjk: boolean): string {
  const index = Math.max(1, n)
  return cjk ? `卷${casualHan(index)}` : `VOL. ${index}`
}

export function MirrorVolumeChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const defaultBg = ctx.defaultBg ?? colors.bg
  const chNum = chapterNumberFor(ir.slides, index)
  const cjk = headingIsCjk(slide.heading)
  const volumeSource = volumeLabel(chNum, cjk)
  const volumeTracking = cjk ? undefined : trackingPx(VOLUME_SIZE, VOLUME_TRACKING_LATIN_EM)
  const volume = fitSvgLine(volumeSource, {
    maxWidth: CONTENT_MAX_W,
    fontSize: VOLUME_SIZE,
    minFontSize: 16,
    letterSpacing: volumeTracking,
    fontFamily: fonts.body,
  })

  const plainHeading = stripEmphasis(slide.heading ?? "")
  const showTitle = plainHeading.trim().length > 0
  const heading = fitHeadingLines(plainHeading, {
    maxWidth: CONTENT_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingLastY = showTitle
    ? TITLE_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight
    : TITLE_Y

  const subheading = slide.subheading
    ? fitEmphasisLine(slide.subheading, {
        maxWidth: CONTENT_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subY = headingLastY + SUB_GAP
  const subWidth = subheading
    ? measureTextUnits(subheading.segments.map((segment) => segment.text).join(""), { fontFamily: fonts.body }) * subheading.fontSize
    : 0
  const leftBarX2 = CENTER_X - subWidth / 2 - BAR_GAP
  const rightBarX1 = CENTER_X + subWidth / 2 + BAR_GAP
  const showBars =
    Boolean(subheading) && leftBarX2 - BAR_LEN >= BAR_MIN_X && rightBarX1 + BAR_LEN <= BAR_MAX_X
  const barY = subY - SUB_SIZE * 0.35

  return (
    <>
      <text
        data-contrast-tier="meta"
        data-truncated={volume.truncated ? "1" : undefined}
        x={CENTER_X}
        y={VOLUME_Y}
        textAnchor="middle"
        fontFamily={fonts.body}
        fontSize={volume.fontSize}
        fill={metaInk(colors.muted, defaultBg)}
        letterSpacing={volumeTracking}
        dominantBaseline="alphabetic"
      >
        {volume.text}
      </text>

      {showTitle &&
        heading.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={TITLE_Y + i * heading.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.text, defaultBg, heading.fontSize)}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {showBars && (
        <g>
          <line
            x1={leftBarX2 - BAR_LEN}
            y1={barY}
            x2={leftBarX2}
            y2={barY}
            stroke={colors.accent}
            strokeWidth={BAR_STROKE}
          />
          <line
            x1={rightBarX1}
            y1={barY}
            x2={rightBarX1 + BAR_LEN}
            y2={barY}
            stroke={colors.accent}
            strokeWidth={BAR_STROKE}
          />
        </g>
      )}

      {subheading && renderEmphasisText(
        subheading.segments,
        headingEmphasisPaint(ctx, subheading, {
          baseFill: metaInk(colors.muted, defaultBg),
          fontWeight: "600",
          fontFamily: fonts.body,
          bold: false,
        }),
            <text
              data-contrast-tier="meta"
              data-truncated={subheading.truncated ? "1" : undefined}
              x={CENTER_X}
              y={subY}
              textAnchor="middle"
              fontFamily={fonts.body}
              fontSize={subheading.fontSize}
              fill={metaInk(colors.muted, defaultBg)}
              dominantBaseline="alphabetic"
              />
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-mirror-volume-chapter.tsx: mirrored volume open.
  // Muted volume kicker, centered title, paired accent bars only when a
  // subtitle sits between them. CJK 卷 + numeral, Latin VOL. N. Theme
  // paints the chapter field.
  id: "mirror-volume-chapter",
  kind: "standard",
  story: {
    name: "Mirror Volume",
    story: "A soft grey volume kicker centers above the title, and when a subtitle appears a pair of short highlight bars flanks it on either side. Everything sits on a center axis, symmetrical and still.",
    positioning: "A ceremonial break that treats each section as a named volume. The mirrored bars appear only when a subtitle is present, keeping an empty page clean.",
    audience: "Readers in a boardroom or lecture hall who read the centered title as a deliberate pause in the argument.",
    notFor: "Decks that need an informal or fast-paced transition, which suit Issue Line.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: CONTENT_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
