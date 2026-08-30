import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"
import { accessibleInk, metaInk, readableOn } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * seat-cta-ending（第八波 pinOnly）：稀缺席位句 + 切角绿钮。构图抄
 * `.issues/design-boards/wave8/b3/Arena.dc.html` ending：标题 y280 / 56px、
 * 副题 y360、钮 polygon 96,440 396,440 396,482 374,504 96,504、落款 y620。
 *
 * 进共享池。零 theme id、零 baked hex。切角绿钮是结构 CTA，不是 motif。
 * 钮字取 contact.name，没有再取 subheading，不写死「约商务面聊」。
 * 底联络取 org / contact.email。无 Thank you。空 heading 不编造席位句。
 * 能量条归 motif。CJK 不加 letter-spacing。
 */

const TITLE_X = 96
const TITLE_Y = 280
const TITLE_SIZE = 56
const TITLE_MIN_PT = 32
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 68

const SUB_X = 96
const SUB_Y = 360
const SUB_SIZE = 22
const SUB_DROP = 80
const SUB_MAX_W = 1088
const SUB_MIN_PT = 16

const CTA_X = 96
const CTA_RIGHT = 396
const CTA_TOP = 440
const CTA_BOTTOM = 504
const CTA_NOTCH = 22
const CTA_TEXT_X = 238
const CTA_TEXT_Y = 482
const CTA_SIZE = 22
const CTA_MIN_PT = 16
const CTA_MAX_W = 260
const CTA_MAX_LINES = 2
const CTA_LINE_HEIGHT_RATIO = 1.25

const FOOT_X = 96
const FOOT_Y = 620
const FOOT_SIZE = 17
const FOOT_MAX_W = 960
const FOOT_MIN_PT = 16

function withoutFitEllipsis(text: string): string {
  return text.replace(/…+$/u, "").replace(/\.{3}$/, "")
}

export function SeatCtaEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const org = (ir.meta.organization ?? "").trim()
  const contactName = (ir.meta.contact?.name ?? "").trim()
  const contactEmail = (ir.meta.contact?.email ?? "").trim()
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const subheading = stripEmphasis(slide.subheading ?? "").trim()
  const ctaSource = contactName || subheading
  const subtitleSource = subheading && subheading !== ctaSource ? subheading : ""
  const footSource = [org, contactEmail].filter(Boolean).join(" · ")
  const ctaFill = colors.accent
  const ctaInk = readableOn(ctaFill)

  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLastY = TITLE_Y + Math.max(0, title.lines.length - 1) * title.lineHeight
  const subY = title.lines.length > 1 ? titleLastY + SUB_DROP : SUB_Y

  const subtitle = subtitleSource
    ? fitSvgLine(subtitleSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null

  const cta = ctaSource
    ? layoutSvgText(ctaSource, {
        maxWidth: CTA_MAX_W,
        fontSize: CTA_SIZE,
        minPt: CTA_MIN_PT,
        maxLines: CTA_MAX_LINES,
        lineHeightRatio: CTA_LINE_HEIGHT_RATIO,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const ctaExtra = cta ? Math.max(0, (cta.lines.length - 1) * cta.lineHeight) : 0
  const ctaBottom = CTA_BOTTOM + ctaExtra
  const ctaPoints = `${CTA_X},${CTA_TOP} ${CTA_RIGHT},${CTA_TOP} ${CTA_RIGHT},${ctaBottom - CTA_NOTCH} ${CTA_RIGHT - CTA_NOTCH},${ctaBottom} ${CTA_X},${ctaBottom}`
  const ctaFirstY = CTA_TEXT_Y - ctaExtra / 2

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
      {showTitle &&
        title.lines.map((line, i) => {
          const painted = title.truncated && i === title.lines.length - 1 ? withoutFitEllipsis(line) : line
          if (!painted) return null
          return (
            <text
              key={i}
              data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * title.lineHeight}
              fontFamily={fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={accessibleInk(colors.text, pageBg, title.fontSize)}
              dominantBaseline="alphabetic"
            >
              {painted}
            </text>
          )
        })}

      {subtitle && (
        <text
          data-contrast-tier="meta"
          data-truncated={subtitle.truncated ? "1" : undefined}
          x={SUB_X}
          y={subY}
          fontFamily={fonts.body}
          fontSize={subtitle.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subtitle.truncated ? withoutFitEllipsis(subtitle.text) : subtitle.text}
        </text>
      )}

      {cta && cta.lines.length > 0 && (
        <>
          <polygon points={ctaPoints} fill={ctaFill} />
          {cta.lines.map((line, i) => {
            const painted = cta.truncated && i === cta.lines.length - 1 ? withoutFitEllipsis(line) : line
            if (!painted) return null
            return (
              <text
                key={i}
                data-truncated={cta.truncated && i === cta.lines.length - 1 ? "1" : undefined}
                x={CTA_TEXT_X}
                y={ctaFirstY + i * cta.lineHeight}
                textAnchor="middle"
                fontFamily={fonts.heading}
                fontSize={cta.fontSize}
                fontWeight="700"
                fill={ctaInk}
                dominantBaseline="alphabetic"
              >
                {painted}
              </text>
            )
          })}
        </>
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
  branding: "none",
  // ending-seat-cta-ending.tsx: pinOnly scarce-seat close. Cut-corner
  // accent CTA. Label from contact.name, else subheading. No thank-you.
  // Motif owns the energy bar.
  id: "seat-cta-ending",
  kind: "standard",
  pinOnly: true,
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
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
