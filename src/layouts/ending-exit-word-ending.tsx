import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { DecorPiece } from "../motifs/decor-piece"

/**
 * exit-word-ending（第八波 pinOnly）：观展动线出口。居中收束句取 heading，
 * 导览动线取 subheading，中轴铜金短线依附标题簇，底句取 org 与 date。
 * 构图抄 `.issues/design-boards/wave8/b4/Museum.dc.html` ending：标题
 * y300 / 46px、副题 y380 / 21px、短线 y450 宽 160、底句 y560 / 17px。
 *
 * 进共享池。零 theme id、零 baked hex。无 Thank you。空 heading 不编造
 * 「看完了」。短线不是角落 tick。CJK 不加 letter-spacing。渲染不画省略号。
 */

const CENTER_X = 640
const TITLE_MAX_W = 960

const TITLE_Y = 300
const TITLE_SIZE = 46
const TITLE_MIN_PT = 28
const TITLE_MAX_LINES = 2
const TITLE_LINE_HEIGHT = 56

const SUB_Y = 380
const SUB_SIZE = 21
const SUB_DROP = 80
const SUB_MAX_W = 960
const SUB_MIN_PT = 16

const RULE_Y = 450
const RULE_W = 160
const RULE_STROKE = 1.5
const RULE_AFTER_TITLE = RULE_Y - TITLE_Y
const RULE_AFTER_SUB = RULE_Y - SUB_Y

const FOOT_Y = 560
const FOOT_SIZE = 17
const FOOT_MAX_W = 960

function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function footSource(meta: SvgTemplateProps["ir"]["meta"]): string | null {
  const org = meta.organization?.trim()
  const date = meta.date?.trim()
  const parts = [org, date].filter((v): v is string => Boolean(v))
  return parts.length > 0 ? parts.join(" · ") : null
}

export function ExitWordEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const subSource = stripEmphasis(slide.subheading ?? "").trim()

  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const headingLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const subY = showTitle && title.lines.length > 1 ? headingLastY + SUB_DROP : SUB_Y

  const subtitle = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.heading,
      })
    : null
  const subPainted = subtitle ? cutMarks(subtitle.text) : ""

  const ruleY = showTitle ? (subPainted ? subY + RULE_AFTER_SUB : headingLastY + RULE_AFTER_TITLE) : RULE_Y

  const footRaw = footSource(ir.meta)
  const foot = footRaw
    ? fitSvgLine(footRaw, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null
  const footPainted = foot ? cutMarks(foot.text) : ""

  return (
    <>
      {showTitle &&
        title.lines.map((line, i) => {
          const painted = cutMarks(line)
          if (!painted) return null
          return (
            <text
              key={i}
              data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
              x={CENTER_X}
              y={TITLE_Y + i * title.lineHeight}
              textAnchor="middle"
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

      {subtitle && subPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={CENTER_X}
          y={subY}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={subtitle.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {subPainted}
        </text>
      )}

      {showTitle && (
        <DecorPiece id="exit-rule">
          <line
            data-depth="mid"
            x1={CENTER_X - RULE_W / 2}
            y1={ruleY}
            x2={CENTER_X + RULE_W / 2}
            y2={ruleY}
            stroke={colors.accent}
            strokeWidth={RULE_STROKE}
          />
        </DecorPiece>
      )}

      {foot && footPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={FOOT_Y}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {footPainted}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-exit-word-ending.tsx: pinOnly centered close, tour line,
  // accent rule under the title cluster, org/date foot. No thank-you
  // and no invented 看完了.
  id: "exit-word-ending",
  kind: "standard",
  pinOnly: true,
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
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
