import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { fitEmphasisLine, renderEmphasisText, stripEmphasis } from "../render/emphasis"

/**
 * chalk-band-cover（第八波 pinOnly）：通栏 primary 板书带承反白标题与副题。
 * 构图抄 `.issues/design-boards/wave8/b2/Classroom.dc.html` 封面：kicker
 * y128 在带上，带 (96,252,1088×176)，标题 x152/y332，副题 y392，带下课时
 * 行 y530，作者 y662。
 *
 * 进共享池，不是 homeroom 专用。零 theme id、零 baked hex。不要波浪，不要
 * 右上 mark。格线归 motif。课时/重点行取 `meta.date`，有 `**强调**` 时强调
 * 走 accent（批改红只给这一处）。空 heading 不编造课题，缺 date / 作者就少画。
 */

const BAND_X = 96
const BAND_Y = 252
const BAND_W = 1088
const BAND_H = 176

const TITLE_X = 152
const TITLE_Y = 332
const TITLE_SIZE = 56
const TITLE_MIN_PT = 36
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 976
const TITLE_LINE_HEIGHT = 60
const TITLE_TWO_LINE_Y = 308

const SUB_X = 152
const SUB_Y = 392
const SUB_SIZE = 22
const SUB_MAX_W = 976

const KICKER_X = 96
const KICKER_Y = 128
const KICKER_SIZE = 17
const KICKER_TRACKING = 6
const KICKER_MAX_W = 1088

const FOCUS_X = 96
const FOCUS_Y = 530
const FOCUS_SIZE = 19
const FOCUS_MAX_W = 1088
/** 课时行是 19px meta 档。accessibleInk 按字号走 4.5:1 会把 homeroom 自己的
 * 批改红换成中性墨。按大字 3:1 收，板上的 accent 才能留下。 */
const FOCUS_ACCENT_FLOOR_PX = 24

const AUTHOR_X = 96
const AUTHOR_Y = 662
const AUTHOR_SIZE = 16
const AUTHOR_MAX_W = 1088

export function ChalkBandCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const paper = ctx.defaultBg ?? colors.bg
  const field = colors.primary
  const onBand = readableOn(field)
  const org = ir.meta.organization
  const author = ir.meta.authors?.[0]
  const authorText = author ? [author.name, author.role].filter(Boolean).join(" · ") : null
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleY = title.lines.length > 1 ? TITLE_TWO_LINE_Y : TITLE_Y
  const titleLastY = titleY + Math.max(0, title.lines.length - 1) * title.lineHeight
  const titleInk = accessibleInk(onBand, field, title.fontSize)

  const kickerTracking = org && !hasCjk(org) ? KICKER_TRACKING : undefined
  const kicker = org
    ? fitSvgLine(org, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.body,
      })
    : null

  const subSource = stripEmphasis(slide.subheading ?? "")
  const subtitle = subSource.trim()
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subY = title.lines.length > 1 ? titleLastY + 44 : SUB_Y
  const bandBottom = BAND_Y + BAND_H
  const showSub = Boolean(subtitle) && subY <= bandBottom - 8
  const subInk = metaInk(colors.muted, field)

  const focus = fitEmphasisLine(ir.meta.date, {
    maxWidth: FOCUS_MAX_W,
    fontSize: FOCUS_SIZE,
    minFontSize: 16,
  })
  const focusBase = metaInk(colors.muted, paper)
  const focusAccent = accessibleInk(colors.accent, paper, FOCUS_ACCENT_FLOOR_PX)

  const foot = authorText
    ? fitSvgLine(authorText, {
        maxWidth: AUTHOR_MAX_W,
        fontSize: AUTHOR_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, paper)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

      <rect x={BAND_X} y={BAND_Y} width={BAND_W} height={BAND_H} fill={field} />

      {showTitle &&
        title.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={titleY + i * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {showSub && subtitle && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUB_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={subInk}
          dominantBaseline="alphabetic"
        >
          {subtitle.text}
        </text>
      )}

      {focus &&
        renderEmphasisText(
          focus.segments,
          {
            accent: focusAccent,
            baseFill: focusBase,
            fontWeight: "600",
            emphasis: ctx.emphasis,
            measureWeight: { fontFamily: fonts.body },
          },
          <text
            data-contrast-tier="meta"
            data-truncated={focus.truncated ? "1" : undefined}
            x={FOCUS_X}
            y={FOCUS_Y}
            fontFamily={fonts.body}
            fontSize={focus.fontSize}
            fill={focusBase}
            dominantBaseline="alphabetic"
          />,
        )}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={AUTHOR_X}
          y={AUTHOR_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, paper)}
          dominantBaseline="alphabetic"
        >
          {foot.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // cover-chalk-band-cover.tsx: inset primary chalk band, inverted title
  // and subtitle inside, lesson/focus row under the band. Motif owns the
  // notebook rules. Empty heading invents no lesson title.
  id: "chalk-band-cover",
  kind: "standard",
  story: {
    name: "Chalk Band",
    story: "A horizontal color band spans the page and holds the title in reversed ink. Above the band sits a quiet kicker, below it a date or focus line and an author foot.",
    positioning: "Opens a deck with a title, an optional subtitle inside the band, and a date or topic note underneath. No image, no columns.",
    audience: "A classroom projector or a shared display where the colored stripe catches the eye before anyone sits down.",
    notFor: "Covers that need a full-bleed field rather than a stripe, which belong on ikb-field-cover.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
