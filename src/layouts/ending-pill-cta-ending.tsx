import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems, boundarySlotBlock } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import type { Slide } from "@/ir"
import { fitEmphasisHeading, fitEmphasisLine, headingEmphasisPaint, renderEmphasisHeading, renderEmphasisText } from "../render/emphasis"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk, readableOn } from "../render/ink"

/**
 * pill-cta-ending layout（第八波批 1，新表达）：居中日期句 + 洋红胶囊 CTA。
 * 构图抄 rally 板 ending 页。进共享池，零 theme id、零 hex。胶囊圆角
 * 走 `shape.radius`，封顶半高，不烤板上的 31。CTA 文案取第一条 bullets
 * 项，没有就不画胶囊，不编造致谢。
 *
 * `pinOnly`。品牌静默由主题菜单条目声明。
 */

const CENTER_X = 640
const CONTENT_MAX_W = 1088
const HEADING_Y = 300
const SUB_SIZE = 21
const SUB_GAP = 68
const PILL_H = 62
const PILL_GAP = 72
const PILL_MIN_W = 280
const PILL_MAX_W = 640
const PILL_PAD_X = 74
const CTA_SIZE = 22

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 1

function ctaSource(slide: Slide): string | null {
  const item = boundaryBulletItems(slide, ITEM_MAX)[0]
  if (item) return item.trim()
  const para = boundarySlotBlock(slide, ["paragraph"])
  if (para?.type === "paragraph") {
    const text = para.text.trim()
    if (text) return text
  }
  return null
}

export function PillCtaEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const heading = fitEmphasisHeading(slide.heading || "", {
    ...layoutDef.headingFit,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const headingLastY =
    HEADING_Y + Math.max(0, heading.lines.length - 1) * heading.lineHeight
  const subheading = slide.subheading
    ? fitEmphasisLine(slide.subheading, {
        maxWidth: CONTENT_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const subY = headingLastY + SUB_GAP
  const ctaRaw = ctaSource(slide)
  const cta = ctaRaw
    ? fitSvgLine(ctaRaw, {
        maxWidth: PILL_MAX_W - PILL_PAD_X * 2,
        fontSize: CTA_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null
  const pillY = (subheading ? subY : headingLastY) + PILL_GAP
  const pillW = cta
    ? Math.min(
        PILL_MAX_W,
        Math.max(
          PILL_MIN_W,
          measureTextUnits(cta.text, { bold: true, fontFamily: fonts.heading }) * cta.fontSize +
            PILL_PAD_X * 2,
        ),
      )
    : 0
  const radius = ctx.shape?.radius ?? PILL_H / 2
  const rx = Math.min(PILL_H / 2, radius)
  const ctaFill = readableOn(colors.accent)
  const ctaBaseline = pillY + Math.round(PILL_H * 0.64)

  return (
    <>
      {renderEmphasisHeading(
        heading,
        headingEmphasisPaint(ctx, heading, { baseFill: accessibleInk(colors.text, bg, heading.fontSize), fontWeight: "700", fontFamily: fonts.heading }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
            x={CENTER_X}
            y={HEADING_Y + i * heading.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={heading.fontSize}
            fontWeight="700"
            fill={accessibleInk(colors.text, bg, heading.fontSize)}
            dominantBaseline="alphabetic"
            />
        ),
      )}

      {subheading && renderEmphasisText(
        subheading.segments,
        headingEmphasisPaint(ctx, subheading, {
          baseFill: accessibleInk(colors.muted, bg, subheading.fontSize),
          fontWeight: "600",
          fontFamily: fonts.body,
          bold: false,
        }),
            <text
              data-truncated={subheading.truncated ? "1" : undefined}
              x={CENTER_X}
              y={subY}
              textAnchor="middle"
              fontFamily={fonts.body}
              fontSize={subheading.fontSize}
              fill={accessibleInk(colors.muted, bg, subheading.fontSize)}
              dominantBaseline="alphabetic"
              />
      )}

      {cta && (
        <>
          <rect
            x={CENTER_X - pillW / 2}
            y={pillY}
            width={pillW}
            height={PILL_H}
            rx={rx}
            fill={colors.accent}
          />
          <text
            data-truncated={cta.truncated ? "1" : undefined}
            x={CENTER_X}
            y={ctaBaseline}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={cta.fontSize}
            fontWeight="700"
            fill={ctaFill}
            dominantBaseline="alphabetic"
          >
            {cta.text}
          </text>
        </>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-pill-cta-ending.tsx: centered date-line heading,
  // optional subheading, accent capsule CTA from the first bullets item.
  // Empty components draw no pill and invent no thank-you. The theme-menu entry owns brand silence.
  id: "pill-cta-ending",
  kind: "standard",
  story: {
    name: "Capsule Button",
    story: "A bold centered heading fills the upper half. Beneath it, a highlight-coloured capsule pill holds one call-to-action line drawn from the first bullet or paragraph.",
    positioning: "The closing page for a date or event line plus one CTA capsule. Holds one action item only.",
    audience: "Event screens and shared decks where the pill button needs to pop against a plain background.",
    notFor: "Closings that carry more than one action item, which belong in Next Steps Pad for a list of up to three.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets", "paragraph"], capacity: 1, itemCapacity: ITEM_MAX },
  ],
  headingFit: {
    maxWidth: CONTENT_MAX_W,
    fontSize: 52,
    maxLines: 2,
    minPt: 32,
    bold: true,
    lineHeightRatio: 1.18,
  },
} satisfies LayoutDefinition
