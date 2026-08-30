import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * ticket-cta-ending（第八波 pinOnly）：满版 primary 硬黑收口，票根的另一面。
 * 黄字标题、浅色副题、黄钮结构 CTA、底句取 org。构图抄
 * `.issues/design-boards/wave8/b4/Playbill.dc.html` ending：标题 y300 /
 * 88px，副题 y390 / 26px，钮 rect 96,460 330×72，钮字居中 y508，底句 y640。
 *
 * 进共享池。零 theme id、零 baked hex。满版色场由本文件自己铺
 * （`paintsOwnBackground`），主题 `defaultBackgrounds.ending` 保持纸色，
 * 避免 contrast floor 拿深字压深底。钮文取 contact.name，缺了才用一句短
 * subheading，不写死「扫码抢票」。空 heading 不编造票价。无 Thank you。
 * 无日期贴片（motif ending 退让）。CJK 不加 letter-spacing。88px 展示级
 * 巨号不要乘 typeScale。渲染不画省略号。
 */

const FIELD_W = 1280
const FIELD_H = 720

const TITLE_X = 96
const TITLE_Y = 300
const TITLE_SIZE = 88
const TITLE_MIN_PT = 40
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 1088

const SUB_X = 96
const SUB_Y = 390
const SUB_SIZE = 26
const SUB_MAX_W = 1088
const SUB_MIN_PT = 16

const CTA_X = 96
const CTA_Y = 460
const CTA_W = 330
const CTA_H = 72
const CTA_TEXT_X = CTA_X + CTA_W / 2
const CTA_TEXT_Y = 508
const CTA_SIZE = 26
const CTA_MIN_PT = 16
const CTA_MAX_W = 282

const FOOT_X = 96
const FOOT_Y = 640
const FOOT_SIZE = 18
const FOOT_MAX_W = 1088
const FOOT_MIN_PT = 16

function dropOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})+$/u, "")
}

function shortLine(text: string): string {
  return text.split(/\n+/)[0]?.trim() ?? ""
}

export function TicketCtaEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const subRaw = stripEmphasis(slide.subheading ?? "").trim()
  const contactName = (ir.meta.contact?.name ?? "").trim()
  const ctaSource = contactName || shortLine(subRaw)
  const subtitleSource = contactName && subRaw ? subRaw : ""
  const org = (ir.meta.organization ?? "").trim()

  // 88px 是展示级巨号。不要乘 typeScale。
  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
  })
  const titleInk = accessibleInk(colors.bg, field, title.fontSize)

  const subtitle = subtitleSource
    ? fitSvgLine(subtitleSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const subPaint = subtitle ? dropOverflowMark(subtitle.text) : ""

  const cta = ctaSource
    ? fitSvgLine(ctaSource, {
        maxWidth: CTA_MAX_W,
        fontSize: CTA_SIZE,
        minFontSize: CTA_MIN_PT,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const ctaPaint = cta ? dropOverflowMark(cta.text) : ""
  const ctaFill = colors.bg
  const ctaInk = readableOn(ctaFill)

  const foot = org
    ? fitSvgLine(org, {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: FOOT_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const footPaint = foot ? dropOverflowMark(foot.text) : ""

  return (
    <>
      <rect x={0} y={0} width={FIELD_W} height={FIELD_H} fill={field} />

      {showTitle &&
        title.lines.map((line, i) => {
          const paint = dropOverflowMark(line)
          if (!paint) return null
          return (
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
              {paint}
            </text>
          )
        })}

      {subtitle && subPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUB_X}
          y={SUB_Y}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={readableOn(field)}
          dominantBaseline="alphabetic"
        >
          {subPaint}
        </text>
      )}

      {cta && ctaPaint && (
        <>
          <rect x={CTA_X} y={CTA_Y} width={CTA_W} height={CTA_H} fill={ctaFill} />
          <text
            data-truncated={cta.truncated ? "1" : undefined}
            x={CTA_TEXT_X}
            y={CTA_TEXT_Y}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={cta.fontSize}
            fontWeight="700"
            fill={ctaInk}
            dominantBaseline="alphabetic"
          >
            {ctaPaint}
          </text>
        </>
      )}

      {foot && footPaint && (
        <text
          data-contrast-tier="meta"
          data-truncated={foot.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={foot.fontSize}
          fill={metaInk(colors.muted, field)}
          dominantBaseline="alphabetic"
        >
          {footPaint}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-ticket-cta-ending.tsx: full-bleed primary field, inverted
  // title, paper-color CTA rect. Label from contact.name, else a short
  // subheading. pinOnly. paintsOwnBackground. Empty heading invents no
  // price and no canned ticket CTA.
  id: "ticket-cta-ending",
  kind: "standard",
  pinOnly: true,
  paintsOwnBackground: true,
  slideTypes: ["ending"],
  slots: [
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
