import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { PptxIR } from "@/ir"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine, layoutSvgText } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import { stripEmphasis } from "../emphasis"

/**
 * red-head-cover（第八波 pinOnly）：红头文件封面。居中。org 正红大字作红头，
 * 其下红杠 4px + 金线 1px（primary + accent）是结构件，由本版式画。标题
 * 公文墨，副题档案灰，底呈送行取 date + 作者。构图抄
 * `.issues/design-boards/wave8/b3/Vermilion.dc.html` 封面：红头 y150 /
 * 44px，双杠 y196/206 x200–1080，标题 y380 / 52px，副题 y450，呈送 y620。
 *
 * 进共享池，不是 vermilion 专用。零 theme id、零 baked hex。motif 封面
 * 整页退让，避免顶缘金双线再叠四条线。不自绘满版，纸底走主题
 * `defaultBackgrounds.cover`。`branding: "none"`。
 *
 * 板上做不到、最近落地：
 *   1. CJK 不加 letter-spacing。
 *   2. 空 heading 不编造封面句。无 org 不编造机关名。
 *   3. 呈送行不写死领导小组。缺 date / authors 就少画。
 *   4. accent 2.26:1 只给金线，绝不当文字色。
 */

const CENTER_X = 640

const ORG_Y = 150
const ORG_SIZE = 44
const ORG_MIN_PT = 18
const ORG_MAX_W = 880

const RULE_X1 = 200
const RULE_X2 = 1080
const RED_RULE_Y = 196
const RED_RULE_STROKE = 4
const GOLD_RULE_Y = 206
const GOLD_RULE_STROKE = 1

const TITLE_Y = 380
const TITLE_SIZE = 52
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 880
const TITLE_LINE_HEIGHT = 68

const SUB_Y = 450
const SUB_GAP = SUB_Y - TITLE_Y
const SUB_SIZE = 22
const SUB_MAX_W = 880

const FOOT_Y = 620
const FOOT_SIZE = 19
const FOOT_MAX_W = 880

function withoutOverflowMark(text: string): string {
  return text.replace(/(?:\.{3}|…)+$/u, "")
}

function authorNames(authors: PptxIR["meta"]["authors"]): string | null {
  if (!authors || authors.length === 0) return null
  const names = authors.map((author) => author.name).filter(Boolean)
  return names.length > 0 ? names.join(" · ") : null
}

function presentationLine(meta: PptxIR["meta"]): string | null {
  const date = meta.date?.trim() || null
  const authors = authorNames(meta.authors)
  const parts = [date, authors].filter((v): v is string => Boolean(v))
  return parts.length > 0 ? parts.join(" · ") : null
}

export function RedHeadCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const orgSource = (ir.meta.organization ?? "").trim()
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const footSource = presentationLine(ir.meta)

  const org = orgSource
    ? fitSvgLine(orgSource, {
        maxWidth: ORG_MAX_W,
        fontSize: ORG_SIZE,
        minFontSize: ORG_MIN_PT,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const orgText = org ? withoutOverflowMark(org.text) : ""

  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLines = title.lines.map(withoutOverflowMark).filter(Boolean)
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const titleLastY = TITLE_Y + Math.max(0, titleLines.length - 1) * title.lineHeight
  const subY = showTitle && titleLines.length > 0 ? titleLastY + SUB_GAP : SUB_Y

  const subtitle = layoutSvgText(slide.subheading || "", {
    maxWidth: SUB_MAX_W,
    fontSize: SUB_SIZE,
    maxLines: 2,
    lineHeightRatio: 1.25,
    fontFamily: fonts.body,
  })

  const foot = footSource
    ? fitSvgLine(footSource, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 12,
        fontFamily: fonts.body,
      })
    : null
  const footText = foot ? withoutOverflowMark(foot.text) : ""

  return (
    <>
      {org && orgText && (
        <text
          data-truncated={org.truncated ? "1" : undefined}
          x={CENTER_X}
          y={ORG_Y}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={org.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.primary, bg, org.fontSize)}
          dominantBaseline="alphabetic"
        >
          {orgText}
        </text>
      )}

      <line
        x1={RULE_X1}
        y1={RED_RULE_Y}
        x2={RULE_X2}
        y2={RED_RULE_Y}
        stroke={colors.primary}
        strokeWidth={RED_RULE_STROKE}
      />
      <line
        data-depth="mid"
        x1={RULE_X1}
        y1={GOLD_RULE_Y}
        x2={RULE_X2}
        y2={GOLD_RULE_Y}
        stroke={colors.accent}
        strokeWidth={GOLD_RULE_STROKE}
      />

      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === titleLines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={TITLE_Y + i * title.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {subtitle.lines.map((line, i) => {
        const painted = withoutOverflowMark(line)
        if (!painted) return null
        return (
          <text
            key={`sub-${i}`}
            data-contrast-tier="meta"
            data-truncated={subtitle.truncated && i === subtitle.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={subY + i * subtitle.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.body}
            fontSize={subtitle.fontSize}
            fill={metaInk(colors.muted, bg)}
            dominantBaseline="alphabetic"
          >
            {painted}
          </text>
        )
      })}

      {foot && footText && (
        <text
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={FOOT_Y}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={accessibleInk(colors.text, bg, foot.fontSize)}
          dominantBaseline="alphabetic"
        >
          {footText}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // cover-red-head-cover.tsx: centered red-head cover, org in primary, a
  // 4px primary rule plus 1px accent rule, document-ink title. Motif
  // yields on cover. Empty heading draws no title. Missing org skips the
  // red-head line, not a fake agency name.
  id: "red-head-cover",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
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
