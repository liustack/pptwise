import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, readableOn } from "../render/ink"
import { showsDocumentMeta } from "../render/document-meta"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  stripEmphasis,
} from "../render/emphasis"
import { centredBaseline } from "./compositions/type"
import { FieldHeadingLine, fieldInk } from "./field-type"

/**
 * ikb-field-cover：满版 primary 场，左齐反白标题。2026-10 bulletin 样例改版
 * （`design/rounds/2026-10-03-bulletin/`）重画：
 *
 *   - 上方一行小字（`meta.organization`）18px，场上白色 78%，y96 起。
 *   - 标题 80/98 粗体，场的可读墨，y232 起最多两行，宽 960：中文标题在逗号
 *     处断成两行，不在词中间断。板上的字距（小字 +1、标题 -1）不画：导出
 *     不映射 letter-spacing（`svg2pptx/text.ts`），预览与 PowerPoint 要一致。
 *   - 标题末行之下 60px 一条 64×6 的白色短条收题。
 *   - 副标题（`subheading`）22/32，白色 86%，短条下 30px。旧版是 muted 灰字
 *     压蓝，对比度约 3:1，这一版取场墨往场色退 14%，对比度 6:1 以上。
 *   - 日期（`meta.date`，deck 要印文档信息时）16px，白色 70%，y616 起。
 *   - 右上大号白色方块阶归 motif（`bulletin-motif`），本版式不重画。
 *
 * 进共享池，不是 bulletin 专用。零 theme id、零 baked hex。满版色场由本文件
 * 自己铺（`paintsOwnBackground`），主题 `defaultBackgrounds.cover` 保持浅底。
 * 标题里的 `**…**` 在场上换不出强调色，改为同色直线下划（`field-type.tsx`）。
 * 空 heading 不编造封面句，也不画收题短条。
 */

const LEFT = 80
const KICKER = { top: 96, size: 18, box: 26, share: 0.78, maxW: 900 }
const TITLE = { top: 232, size: 80, box: 98, minPt: 48, maxLines: 2, maxW: 960 }
/** The closing bar: this far under the title's last baseline. */
const BAR = { drop: 60, w: 64, h: 6 }
const SUBTITLE = { gap: 30, size: 22, box: 32, share: 0.86, maxW: 900, maxLines: 2 }
const DATE = { top: 616, size: 16, box: 24, share: 0.7, maxW: 600 }

export function IkbFieldCover({ ir, slide, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const ink = readableOn(field)
  const org = ir.meta.organization?.trim()

  const title = fitEmphasisHeading(slide.heading ?? "", {
    maxWidth: TITLE.maxW,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.box / TITLE.size,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const showTitle = stripEmphasis(slide.heading ?? "").trim().length > 0
  const titleInk = accessibleInk(ink, field, title.fontSize)
  const firstBaseline = centredBaseline(TITLE.top, title.lineHeight, title.fontSize)
  const lastBaseline = firstBaseline + Math.max(0, title.lines.length - 1) * title.lineHeight
  const barY = lastBaseline + BAR.drop

  const kicker = org
    ? fitSvgLine(org, { maxWidth: KICKER.maxW, fontSize: KICKER.size, minFontSize: 16, fontFamily: fonts.body })
    : null
  const subtitle = fitEmphasisText(slide.subheading, {
    maxWidth: SUBTITLE.maxW,
    fontSize: SUBTITLE.size,
    maxLines: SUBTITLE.maxLines,
    lineHeightRatio: SUBTITLE.box / SUBTITLE.size,
    fontFamily: fonts.body,
  })
  const subtitleTop = (showTitle ? barY + BAR.h : TITLE.top) + SUBTITLE.gap
  const dateText = showsDocumentMeta(page, ir) ? ir.meta.date?.trim() : undefined
  const date = dateText ? fitSvgLine(dateText, { maxWidth: DATE.maxW, fontSize: DATE.size, minFontSize: 16, fontFamily: fonts.body }) : null

  const kickerInk = fieldInk(ctx, KICKER.share, KICKER.size)
  const subtitleInk = fieldInk(ctx, SUBTITLE.share, SUBTITLE.size)
  const dateInk = fieldInk(ctx, DATE.share, DATE.size)

  return (
    <>
      <rect x={0} y={0} width={1280} height={720} fill={field} />

      {kicker && (
        <text
          data-contrast-tier="meta"
          data-truncated={kicker.truncated ? "1" : undefined}
          x={LEFT}
          y={centredBaseline(KICKER.top, KICKER.box, kicker.fontSize)}
          fontFamily={fonts.body}
          fontSize={kicker.fontSize}
          fill={kickerInk}
          dominantBaseline="alphabetic"
        >
          {kicker.text}
        </text>
      )}

      {showTitle &&
        title.lines.map((_line, i) => (
          <FieldHeadingLine
            key={i}
            layout={title}
            index={i}
            x={LEFT}
            baseline={firstBaseline + i * title.lineHeight}
            ink={titleInk}
            ctx={ctx}
            truncated={title.truncated && i === title.lines.length - 1}
          />
        ))}

      {showTitle && <rect x={LEFT} y={barY} width={BAR.w} height={BAR.h} fill={ink} />}

      {renderEmphasisHeading(
        subtitle,
        headingEmphasisPaint(ctx, subtitle, {
          baseFill: subtitleInk,
          accent: ink,
          fontFamily: fonts.body,
          bold: false,
          // The field this face paints, not the page behind it.
          bg: field,
        }),
        (_line, i) => (
          <text
            key={`sub-${i}`}
            data-truncated={subtitle.truncated && i === subtitle.lines.length - 1 ? "1" : undefined}
            x={LEFT}
            y={centredBaseline(subtitleTop, SUBTITLE.box, subtitle.fontSize) + i * subtitle.lineHeight}
            fontFamily={fonts.body}
            fontSize={subtitle.fontSize}
            fill={subtitleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}

      {date && (
        <text
          data-contrast-tier="meta"
          data-truncated={date.truncated ? "1" : undefined}
          x={LEFT}
          y={centredBaseline(DATE.top, DATE.box, date.fontSize)}
          fontFamily={fonts.body}
          fontSize={date.fontSize}
          fill={dateInk}
          dominantBaseline="alphabetic"
        >
          {date.text}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // The shared top-left mark sits on the primary field this face paints.
  coverMark: { x: 80, y: 56, ground: "primary" },
  // cover-ikb-field-cover.tsx: full-bleed primary field, a small line over a
  // left-aligned inverted title, a short bar under its last line, the
  // subtitle and the date. Motif owns the square steps. Empty heading draws
  // no title and no bar.
  id: "ikb-field-cover",
  kind: "standard",
  story: {
    name: "Signal Field",
    story: "A single saturated field covers the page edge to edge. The title sits left in reversed ink, large and bold, under one small line of who is speaking, with a short bar underneath that closes the thought and the subtitle and date below it.",
    positioning: "Opens a deck whose title alone must carry the page, with a subtitle and a date in quieter reversed ink. There is no room for a byline beside the heading.",
    audience: "A projected wall or shared screen where one color and one sentence set the tone from across the room.",
    notFor: "Covers that need visible authorship beside the title, which belong on Report Card.",
  },
  paintsOwnBackground: true,
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE.maxW,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.box / TITLE.size,
  },
} satisfies LayoutDefinition
