import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { PptxIR } from "@/ir"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { hasCjk } from "./minimal-shared"
import { stripEmphasis } from "../render/emphasis"

/**
 * thesis-plate-cover（第八波 pinOnly）：象牙纸题名页。kicker 在开卷金线之上，
 * 两行衬线标题，primary 绿块承答辩属性（作者 / 院系 / 日期），底 border 线。
 * 构图抄 `.issues/design-boards/wave8/b2/Academic.dc.html` 封面。
 *
 * 进共享池，不是 academic 专用。零 theme id、零 baked hex。开卷金线归
 * motif（y120），本版式不画。空 heading 不编造封面句，缺 meta 就少画绿块。
 *
 * 板上做不到、最近落地：
 *   1. CJK kicker 不加 letter-spacing（导出会丢字）。
 *   2. 绿块白字走 `readableOn(primary)`，不烤白、不写死「答辩人」。
 */

const TITLE_X = 96
const TITLE_Y = 310
const TITLE_SIZE = 54
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 80

const KICKER_X = 96
const KICKER_Y = 102
const KICKER_SIZE = 16
const KICKER_TRACKING = 6
const KICKER_MAX_W = 1088

const PLATE_X = 96
const PLATE_Y = 470
const PLATE_W = 440
const PLATE_H = 88
const PLATE_TEXT_X = 124
const PLATE_TEXT_YS = [506, 538] as const
const PLATE_TEXT_SIZE = 17
const PLATE_TEXT_MAX_W = 384

const FOOT_X = 96
const FOOT_RULE_Y = 640
const FOOT_RULE_X2 = 1184

function authorLine(authors: NonNullable<PptxIR["meta"]["authors"]> | undefined): string | null {
  if (!authors || authors.length === 0) return null
  const parts = authors
    .map((author) => [author.name, author.role].filter(Boolean).join(" · "))
    .filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : null
}

function plateLines(meta: PptxIR["meta"]): string[] {
  const authors = authorLine(meta.authors)
  const dept = meta.authors?.map((author) => author.org).find(Boolean) ?? null
  const foot = [dept, meta.date].filter((v): v is string => Boolean(v)).join(" · ")
  return [authors, foot || null].filter((v): v is string => Boolean(v))
}

export function ThesisPlateCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = ir.meta.organization
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const plate = plateLines(ir.meta)
  const plateInk = readableOn(colors.primary)

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)

  const kickerTracking = org && !hasCjk(org) ? KICKER_TRACKING : undefined
  const kicker = org
    ? fitSvgLine(org, {
        maxWidth: KICKER_MAX_W,
        fontSize: KICKER_SIZE,
        minFontSize: 16,
        letterSpacing: kickerTracking,
        fontFamily: fonts.heading,
      })
    : null

  const plateRuns = plate.map((line) =>
    fitSvgLine(line, {
      maxWidth: PLATE_TEXT_MAX_W,
      fontSize: PLATE_TEXT_SIZE,
      minFontSize: 16,
      fontFamily: fonts.body,
    }),
  )

  return (
    <>
      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={kickerTracking}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

      {showTitle &&
        title.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={TITLE_X}
            y={TITLE_Y + i * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

      {plateRuns.length > 0 && (
        <>
          <rect x={PLATE_X} y={PLATE_Y} width={PLATE_W} height={PLATE_H} fill={colors.primary} />
          {plateRuns.map((run, i) => (
            <text
              key={`plate-${i}`}
              data-contrast-tier="meta"
              data-truncated={run.truncated ? "1" : undefined}
              x={PLATE_TEXT_X}
              y={PLATE_TEXT_YS[i] ?? PLATE_TEXT_YS[0]}
              fontFamily={fonts.body}
              fontSize={run.fontSize}
              fill={plateInk}
              dominantBaseline="alphabetic"
            >
              {run.text}
            </text>
          ))}
        </>
      )}

      <line
        x1={FOOT_X}
        y1={FOOT_RULE_Y}
        x2={FOOT_RULE_X2}
        y2={FOOT_RULE_Y}
        stroke={colors.border ?? colors.muted}
        strokeWidth={1}
      />
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // cover-thesis-plate-cover.tsx: ivory title plate, kicker above the
  // opening rule, two-line serif title, primary meta block, foot rule.
  // Motif owns the gold rule at y120. Empty heading draws no title.
  // Missing authors/date skips the plate.
  id: "thesis-plate-cover",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
