import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { coverConfidentiality, showsDocumentMeta } from "../render/document-meta"
import { fitEmphasisHeading, fitEmphasisText, stripEmphasis } from "../render/emphasis"
import { centredBaseline } from "./compositions/type"
import { FittedLines } from "./grid-shared"

/**
 * institutional-block：瑞士制度腔封面。2026-10 swiss 样例改版
 * （`design/rounds/2026-10-03-swiss/`）重画：
 *
 *   - 顶部一行 16px：左边机构名粗体（`meta.organization`，封面文案，总是印），
 *     右边日期（`meta.date`，deck 要印文档信息时）和密级（deck 的页脚要求
 *     封面印密级时，`coverMark: "face"`），右对齐。下面一根 1px 黑细线，
 *     x80–1200，y104。
 *   - 标题 88/106 粗体黑字，整行宽 1120，最多两行，以最后一行为基准压在下
 *     半页：末行行框底在 y530。一行标题不会把下面的东西拽上去，两行标题的
 *     第一行往上长。
 *   - 标题下一根 120×8 的强调色（瑞士红）短条，y558。
 *   - 副标题 26/36 正文色，y590 起最多两行。
 *   - 顶边红条归 motif（`swiss-motif`），本版式不画。
 *
 * 零 theme id、零 baked hex，颜色走 ctx token。空 heading 不编造封面句，也
 * 不画短条。板上标题 -1px 字距不画：导出不映射 letter-spacing。
 */

const LEFT = 80
const RIGHT = 1200
const META = { top: 72, box: 24, size: 16, gap: 24 }
const META_RULE = { y: 104, h: 1 }
const TITLE = { size: 88, lineHeight: 106, foot: 530, maxLines: 2, minPt: 56 }
const BAR = { y: 558, w: 120, h: 8 }
const SUBTITLE = { top: 590, size: 26, lineHeight: 36, maxLines: 2 }

const TITLE_FIT = {
  maxWidth: RIGHT - LEFT,
  fontSize: TITLE.size,
  maxLines: TITLE.maxLines,
  minPt: TITLE.minPt,
  lineHeightRatio: TITLE.lineHeight / TITLE.size,
} as const

export function InstitutionalBlockCover({ ir, slide, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const metaBaseline = centredBaseline(META.top, META.box, META.size)

  // The top line: what speaks on the left, when and how restricted on the right.
  const rightParts = [coverConfidentiality(page, ir), showsDocumentMeta(page, ir) ? ir.meta.date?.trim() : undefined].filter(
    (part): part is string => Boolean(part),
  )
  const rightText = rightParts.join("  ")
  const rightW = rightText ? measureTextUnits(rightText, { fontFamily: fonts.body }) * META.size : 0
  const orgSource = ir.meta.organization?.trim() ?? ""
  const org = orgSource
    ? fitSvgLine(orgSource, {
        maxWidth: RIGHT - LEFT - (rightW ? rightW + META.gap : 0),
        fontSize: META.size,
        minFontSize: META.size,
        fontFamily: fonts.body,
        bold: true,
      })
    : null
  const right = rightText
    ? fitSvgLine(rightText, { maxWidth: RIGHT - LEFT, fontSize: META.size, minFontSize: META.size, fontFamily: fonts.body })
    : null

  const title = fitEmphasisHeading(slide.heading, { ...TITLE_FIT, fontFamily: fonts.heading, typeScale: ctx.shape?.typeScale })
  const showTitle = stripEmphasis(slide.heading ?? "").trim().length > 0
  const lastBaseline = centredBaseline(TITLE.foot - TITLE.lineHeight, TITLE.lineHeight, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight
  const subtitle = fitEmphasisText(slide.subheading, {
    maxWidth: RIGHT - LEFT,
    fontSize: SUBTITLE.size,
    minPt: SUBTITLE.size,
    maxLines: SUBTITLE.maxLines,
    lineHeightRatio: SUBTITLE.lineHeight / SUBTITLE.size,
    fontFamily: fonts.body,
    bold: false,
  })

  return (
    <>
      {org && (
        <text
          data-truncated={org.truncated ? "1" : undefined}
          x={LEFT}
          y={metaBaseline}
          fontFamily={fonts.body}
          fontSize={org.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, META.size)}
          dominantBaseline="alphabetic"
        >
          {org.text}
        </text>
      )}
      {right && (
        <text
          data-contrast-tier="meta"
          data-truncated={right.truncated ? "1" : undefined}
          x={RIGHT}
          y={metaBaseline}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={right.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {right.text}
        </text>
      )}
      {(org || right) && <rect x={LEFT} y={META_RULE.y} width={RIGHT - LEFT} height={META_RULE.h} fill={accessibleInk(colors.text, bg, META.size)} />}
      {showTitle && (
        <FittedLines layout={title} ctx={ctx} x={LEFT} y={firstBaseline} fill={accessibleInk(colors.text, bg, title.fontSize)} bold />
      )}
      {showTitle && <rect x={LEFT} y={BAR.y} width={BAR.w} height={BAR.h} fill={colors.accent} />}
      {subtitle.lines.length > 0 && (
        <FittedLines
          layout={{ ...subtitle, lineHeight: SUBTITLE.lineHeight }}
          ctx={ctx}
          x={LEFT}
          y={centredBaseline(SUBTITLE.top, SUBTITLE.lineHeight, subtitle.fontSize)}
          fill={accessibleInk(colors.text, bg, subtitle.fontSize)}
        />
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  // The confidentiality words sit in the face's own top line, before the date.
  coverMark: "face",
  // cover-institutional-block.tsx: an institutional report's cover. The
  // organization and the date over a black hairline, the title large and
  // bold on the lower half, a short accent bar, the subtitle. Motif owns the
  // red bar on the top edge.
  id: "institutional-block",
  kind: "standard",
  story: {
    name: "Block Title",
    story: "The organization and the date run along a black hairline at the top. The title sits large and bold on the lower half of the page over a short bar in the signal colour, with the subtitle under it.",
    positioning: "Opens a deck that carries institutional weight: an annual report, an audit, a policy review. The title and its subtitle own the page.",
    audience: "A boardroom or auditorium, where the title is legible from the last row and the organization from the front.",
    notFor: "Openings that need a photograph or a warmer tone, which suit Serif Masthead or colophon.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "decor", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: TITLE_FIT,
}
