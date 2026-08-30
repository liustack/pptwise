import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { PptxIR } from "@/ir"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { hasCjk, trackingPx } from "./minimal-shared"
import {
  parseEmphasis,
  renderEmphasisText,
  sliceEmphasisForLines,
  stripEmphasis,
} from "../render/emphasis"

/**
 * gilt-word-ending（第八波 pinOnly）：金框回环收场。居中两行收束取 heading，
 * 金只落在 `**强调**` 的一个词上，走 `renderEmphasisText`。落款取 org 或
 * authors。金框归 motif，本版式不画框。构图抄
 * `.issues/design-boards/wave8/b3/Luxe.dc.html` ending：首行 y330 / 44px、
 * 次行 y404、落款 y560。
 *
 * 进共享池，不是 luxe 专用。零 theme id、零 baked hex。不致谢，不兜底
 * Thank you。空 heading 不编造收束句。
 */

const CENTER_X = 640

const TITLE_Y = 330
const TITLE_SIZE = 44
const TITLE_MIN_PT = 28
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 960
const TITLE_LINE_HEIGHT = 74

const FOOT_Y = 560
const FOOT_SIZE = 16
const FOOT_TRACKING_EM = 0.2
const FOOT_MAX_W = 1000

function cutMarks(text: string): string {
  return text.replaceAll("…", "").replaceAll("...", "")
}

function authorLine(authors: PptxIR["meta"]["authors"] | undefined): string | null {
  const author = authors?.[0]
  if (!author) return null
  const text = [author.name, author.role].filter(Boolean).join(" · ")
  return text || null
}

function footSource(meta: PptxIR["meta"]): string | null {
  const org = meta.organization?.trim()
  if (org) return org
  return authorLine(meta.authors)
}

export function GiltWordEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const headingSource = slide.heading ?? ""
  const plainHeading = stripEmphasis(headingSource)
  const showTitle = plainHeading.trim().length > 0
  const headingSegs = parseEmphasis(headingSource)

  const title = fitHeadingLines(plainHeading, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
    bold: false,
  })
  const titleLines = title.lines.map(cutMarks)
  const lineSegs = sliceEmphasisForLines(headingSegs, titleLines)
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const accentInk = accessibleInk(colors.accent, bg, title.fontSize)

  const footRaw = footSource(ir.meta)
  const footTracking = footRaw && !hasCjk(footRaw) ? trackingPx(FOOT_SIZE, FOOT_TRACKING_EM) : undefined
  const foot = footRaw
    ? fitSvgLine(footRaw, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        letterSpacing: footTracking,
        fontFamily: fonts.heading,
      })
    : null

  return (
    <>
      {showTitle &&
        titleLines.map((line, i) =>
          renderEmphasisText(
            lineSegs[i] ?? [{ text: line, emphasized: false }],
            {
              accent: accentInk,
              padFill: colors.accent,
              baseFill: titleInk,
              fontWeight: "400",
              themeId: ctx.themeId,
              measureWeight: { bold: false, fontFamily: fonts.heading },
            },
            <text
              key={i}
              data-truncated={title.truncated && i === titleLines.length - 1 ? "1" : undefined}
              x={CENTER_X}
              y={TITLE_Y + i * title.lineHeight}
              textAnchor="middle"
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fill={titleInk}
              dominantBaseline="alphabetic"
            />,
          ),
        )}

      {foot && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={FOOT_Y}
          textAnchor="middle"
          fontFamily={fonts.heading}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, bg)}
          letterSpacing={footTracking}
          dominantBaseline="alphabetic"
        >
          {cutMarks(foot.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-gilt-word-ending.tsx: pinOnly two-line close, gilt only on
  // **emphasis**. Footer from org or authors. Motif owns the double frame.
  // Empty heading invents no thank-you.
  id: "gilt-word-ending",
  kind: "archetype",
  pinOnly: true,
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    bold: false,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
