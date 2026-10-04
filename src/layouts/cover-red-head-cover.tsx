import type React from "react"
import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { PptxIR } from "@/ir"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { centredBaseline } from "./compositions/type"

/**
 * red-head-cover：红头文件封面，vermilion 2026-10 定稿（p01）重画。
 *
 * 居中排：顶上是署名机关（`meta.organization`），52px 正红粗体，中文字与字
 * 之间拉开 12px（逐字 `<tspan dx>`，导出落成字符间距，所以 PPTX 里同样拉开；
 * 拉丁文不拉，免得英文成了「S t r a t e g y」）。其下一粗一细两道红线（4px
 * 加 1px，x80 到 1200）。标题 56/72 公文墨粗体，占整行宽，放不下才折两行，
 * 折行时均衡（中文在逗号处断），末行落在 y400 的框底。副题 22px、日期与
 * 作者 18px 档案灰。底缘金双线是主题 motif（`vermilion-motif`），不归本版式。
 *
 * 进共享池，不是 vermilion 专用。零 theme id、零 baked hex。无 org 不编造
 * 机关名，缺 date / authors 就少画。accent 只给线，绝不当文字色。
 */

const CENTER_X = 640
const MEASURE = 1120
const LEFT = 80

const ORG = { top: 92, box: 64, size: 52, minPt: 32, tracking: 12 } as const
const RULES = { thick: { y: 184, h: 4 }, thin: { y: 194, h: 1 } } as const
const TITLE = { size: 56, lineHeight: 72, foot: 400, minPt: 40, maxLines: 2 } as const
const SUB = { top: 428, size: 22, lineHeight: 30, maxLines: 2 } as const
const FOOT = { top: 590, size: 18, lineHeight: 26 } as const

function authorNames(authors: PptxIR["meta"]["authors"]): string | null {
  if (!authors || authors.length === 0) return null
  const names = authors.map((author) => author.name).filter(Boolean)
  return names.length > 0 ? names.join(" · ") : null
}

function presentationLine(meta: PptxIR["meta"]): string | null {
  const parts = [meta.date?.trim() || null, authorNames(meta.authors)].filter((v): v is string => Boolean(v))
  return parts.length > 0 ? parts.join(" · ") : null
}

const CJK = /[㐀-鿿]/

/**
 * The organization as one `<text>`: each Chinese character after the first
 * moved `tracking` px along by a `<tspan dx>`, Latin left as written. Fits
 * the measure with the tracking paid for, shrinking toward 32px.
 */
function OrgLine({ org, ctx }: { org: string; ctx: SvgTemplateProps["ctx"] }): React.ReactElement | null {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const chars = Array.from(org)
  const tracked = chars.every((ch) => CJK.test(ch) || /\s/.test(ch))
  const gaps = tracked ? Math.max(0, chars.length - 1) : 0
  const fit = fitSvgLine(org, { maxWidth: MEASURE - gaps * ORG.tracking, fontSize: ORG.size, minFontSize: ORG.minPt, fontFamily: fonts.heading, bold: true })
  const tracking = tracked ? Math.round((ORG.tracking * fit.fontSize) / ORG.size) : 0
  const y = centredBaseline(ORG.top, ORG.box, ORG.size)
  const ink = accessibleInk(colors.primary, bg, fit.fontSize)
  if (!tracked || fit.truncated) {
    return (
      <text
        data-truncated={fit.truncated ? "1" : undefined}
        x={CENTER_X}
        y={y}
        textAnchor="middle"
        fontFamily={fonts.heading}
        fontSize={fit.fontSize}
        fontWeight="700"
        fill={ink}
        dominantBaseline="alphabetic"
      >
        {fit.text}
      </text>
    )
  }
  // Centred by its whole tracked width: the anchor sits at the start, half
  // that width left of the centre, so the preview and the export agree.
  const width = measureTextUnits(org, { fontFamily: fonts.heading, bold: true }) * fit.fontSize + gaps * tracking
  return (
    <text x={CENTER_X - width / 2} y={y} fontFamily={fonts.heading} fontSize={fit.fontSize} fontWeight="700" fill={ink} dominantBaseline="alphabetic" data-tracking={tracking}>
      {chars[0]}
      {chars.slice(1).map((ch, i) => (
        <tspan key={i} dx={tracking}>
          {ch}
        </tspan>
      ))}
    </text>
  )
}

export function RedHeadCover({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const org = (ir.meta.organization ?? "").trim()
  const footSource = presentationLine(ir.meta)

  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: MEASURE,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const titleLast = centredBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const titleFirst = titleLast - Math.max(0, title.lines.length - 1) * title.lineHeight

  const subtitle = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: MEASURE, fontSize: SUB.size, minPt: 16, maxLines: SUB.maxLines, lineHeightRatio: SUB.lineHeight / SUB.size, fontFamily: fonts.body })
    : null
  const subInk = metaInk(colors.muted, bg)
  const foot = footSource ? fitSvgLine(footSource, { maxWidth: MEASURE, fontSize: FOOT.size, minFontSize: 16, fontFamily: fonts.body }) : null

  return (
    <>
      {org && <OrgLine org={org} ctx={ctx} />}
      <g data-decor-role="structure">
        <rect x={LEFT} y={RULES.thick.y} width={MEASURE} height={RULES.thick.h} fill={colors.primary} />
        <rect x={LEFT} y={RULES.thin.y} width={MEASURE} height={RULES.thin.h} fill={colors.primary} />
      </g>
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: fonts.heading, bold: true }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={titleFirst + i * title.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {subtitle &&
        renderEmphasisHeading(
          subtitle,
          headingEmphasisPaint(ctx, subtitle, { baseFill: subInk, fontFamily: fonts.body, bold: false }),
          (_line, i) => (
            <text
              key={`sub-${i}`}
              data-contrast-tier="meta"
              data-truncated={subtitle.truncated && i === subtitle.lines.length - 1 ? "1" : undefined}
              x={CENTER_X}
              y={centredBaseline(SUB.top, SUB.lineHeight, SUB.size) + i * SUB.lineHeight}
              textAnchor="middle"
              fontFamily={fonts.body}
              fontSize={subtitle.fontSize}
              fill={subInk}
              dominantBaseline="alphabetic"
            />
          ),
        )}
      {foot && (
        <text
          data-truncated={foot.truncated ? "1" : undefined}
          x={CENTER_X}
          y={centredBaseline(FOOT.top, FOOT.lineHeight, FOOT.size)}
          textAnchor="middle"
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={accessibleInk(colors.muted, bg, foot.fontSize)}
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
  // cover-red-head-cover.tsx: the red-head letterhead. The issuing body in
  // large tracked red type, a thick and a thin red rule, the title centred
  // across the full measure, the subtitle and the date. Empty heading draws
  // no title. Missing org skips the red-head line, not a fake agency name.
  id: "red-head-cover",
  kind: "standard",
  story: {
    name: "Red Seal",
    story: "The issuing body spans the top in large, widely spaced red type over a thick and a thin red rule. The document title sits centred in bold ink under them, then the subtitle and the date.",
    positioning: "Opens a deck that names an issuing body and a document title beneath a pair of red rules. A formal dispatch page with no image and no body text.",
    audience: "A printed memo or a projected briefing where the red header signals the page is issued under a name.",
    notFor: "Covers that omit the issuing body or use left-aligned type, which belong on Rule and Type.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  headingFit: {
    maxWidth: MEASURE,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
  },
} satisfies LayoutDefinition
