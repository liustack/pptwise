import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * cut-panel-cover（第八波 pinOnly）：斜切选手席面板承题，灯带贴在切边上。
 * 构图抄 `.issues/design-boards/wave8/b3/Arena.dc.html` 封面：kicker y150、
 * 面板 polygon 0,236 748,236 688,484 0,484、灯带 748,236→688,484 宽 5、
 * 标题 y352 / 96px、副题 y440、底句 y662。
 *
 * 进共享池，不是 arena 专用。零 theme id、零 baked hex。斜切面板与灯带
 * 是版式结构件，能量条归 motif。标题锁在面板内，右侧大块留白必须留着，
 * 不要把短标题拉满全页。空 heading 不编造点火句。CJK 不加 letter-spacing。
 */

const PANEL_POINTS = "0,236 748,236 688,484 0,484"
const STRIP_X1 = 748
const STRIP_Y1 = 236
const STRIP_X2 = 688
const STRIP_Y2 = 484
const STRIP_W = 5

const TITLE_X = 96
const TITLE_Y = 352
const TITLE_SIZE = 96
const TITLE_MIN_PT = 36
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 600

const KICKER_X = 96
const KICKER_Y = 150
const KICKER_SIZE = 17
const KICKER_TRACKING = 6
const KICKER_MAX_W = 960

const SUB_X = 96
const SUB_Y = 440
const SUB_SIZE = 26
const SUB_MAX_W = 560
const SUB_MIN_PT = 16

const FOOT_X = 96
const FOOT_Y = 662
const FOOT_SIZE = 17
const FOOT_MAX_W = 960
const FOOT_MIN_PT = 16

function withoutFitEllipsis(text: string): string {
  return text.replace(/…+$/u, "").replace(/\.{3}$/, "")
}

export function CutPanelCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const panel = colors.surface
  const org = (ir.meta.organization ?? "").trim()
  const date = (ir.meta.date ?? "").trim()
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const subheading = stripEmphasis(slide.subheading ?? "").trim()
  const footSource = date || subheading
  const panelSubSource = subheading && subheading !== footSource ? subheading : ""

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.accent, panel, title.fontSize)

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

  const panelSub = panelSubSource
    ? fitSvgLine(panelSubSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null

  const foot = footSource
    ? fitSvgLine(footSource, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: FOOT_MIN_PT,
        fontFamily: fonts.body,
      })
    : null

  return (
    <>
      <polygon points={PANEL_POINTS} fill={panel} />
      <line
        x1={STRIP_X1}
        y1={STRIP_Y1}
        x2={STRIP_X2}
        y2={STRIP_Y2}
        stroke={colors.accent}
        strokeWidth={STRIP_W}
      />

      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kicker.truncated ? withoutFitEllipsis(kicker.text) : kicker.text}
        </text>
      )}

      {showTitle &&
        title.lines.map((line, i) => {
          const painted = title.truncated && i === title.lines.length - 1 ? withoutFitEllipsis(line) : line
          if (!painted) return null
          return (
            <text
              key={i}
              data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * (title.lineHeight || title.fontSize)}
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={titleInk}
              dominantBaseline="alphabetic"
            >
              {painted}
            </text>
          )
        })}

      {panelSub && (
        <text
          data-contrast-tier="meta"
          data-truncated={panelSub.truncated ? "1" : undefined}
          x={SUB_X}
          y={SUB_Y}
          fontFamily={fonts.body}
          fontSize={panelSub.fontSize}
          fill={accessibleInk(colors.text, panel, panelSub.fontSize)}
          dominantBaseline="alphabetic"
        >
          {panelSub.truncated ? withoutFitEllipsis(panelSub.text) : panelSub.text}
        </text>
      )}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {foot.truncated ? withoutFitEllipsis(foot.text) : foot.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-cut-panel-cover.tsx: pinOnly cut player-bench panel carrying
  // the title, accent light-strip on the cut. Motif owns the energy bar.
  // Empty heading invents no ignition line. Title stays inside the panel.
  id: "cut-panel-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "panel", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
  },
} satisfies LayoutDefinition
