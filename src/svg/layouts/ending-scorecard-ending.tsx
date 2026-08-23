import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitHeadingLines } from "../heading-fit"
import { fitSvgLine } from "../../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../ink"
import {
  parseEmphasis,
  renderEmphasisText,
  sliceEmphasisForLines,
  stripEmphasis,
} from "../emphasis"

/**
 * scorecard-ending（第八波 pinOnly）：对表三项。优先 bullets 前三项。数字 /
 * `**强调**` 走 primary 橄榄加粗，不要用赭石当正文。落款取 subheading，
 * 不写死鉴证句。无 Thank you。
 *
 * 构图抄 `.issues/design-boards/wave8/b3/Terra.dc.html` ending：标题 y160 /
 * 44px，三条 y290/370/450 / 24px，落款 y580 / 19px。进共享池。零 theme
 * id、零 baked hex。CJK 不加 letter-spacing。空文案不编造进度句。
 */

const TITLE_X = 96
const TITLE_Y = 160
const TITLE_SIZE = 44
const TITLE_MIN_PT = 28
const TITLE_MAX_LINES = 2
const TITLE_MAX_W = 1088
const TITLE_LINE_HEIGHT = 54

const ITEM_X = 96
const ITEM_YS = [290, 370, 450] as const
const ITEM_SIZE = 24
const ITEM_MIN_PT = 16
const ITEM_MAX_W = 1088

const FOOT_X = 96
const FOOT_Y = 580
const FOOT_SIZE = 19
const FOOT_MAX_W = 1088

function dropOverflowMarks(text: string): string {
  return text.replace(/…/g, "").replace(/\.{3}/g, "")
}

function coverBulletItems(slide: SvgTemplateProps["slide"]): string[] {
  const block = slide.components.find((c) => c.type === "bullets")
  if (!block || block.type !== "bullets") return []
  return block.items.slice(0, 3)
}

export function ScorecardEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const items = coverBulletItems(slide)

  const title = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
    fontFamily: fonts.heading,
    typeScale: ctx.shape?.typeScale,
  })
  const titleLines = title.lines.map(dropOverflowMarks).filter((line) => line.length > 0)
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const itemInk = accessibleInk(colors.text, bg, ITEM_SIZE)
  const itemAccentInk = accessibleInk(colors.primary, bg, ITEM_SIZE)

  const lines = items.map((item, i) => {
    const fitted = fitSvgLine(stripEmphasis(item), {
      maxWidth: ITEM_MAX_W,
      fontSize: ITEM_SIZE,
      minFontSize: ITEM_MIN_PT,
      fontFamily: fonts.body,
    })
    const visible = dropOverflowMarks(fitted.text)
    const segments =
      sliceEmphasisForLines(parseEmphasis(item), [visible])[0] ?? [{ text: visible, emphasized: false }]
    return {
      y: ITEM_YS[i]!,
      fontSize: fitted.fontSize,
      truncated: fitted.truncated,
      visible,
      segments,
    }
  })

  const signoffSource = (slide.subheading ?? "").trim()
  const signoff = signoffSource
    ? fitSvgLine(stripEmphasis(signoffSource), {
        maxWidth: FOOT_MAX_W,
        fontSize: FOOT_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const signoffText = signoff ? dropOverflowMarks(signoff.text) : ""

  return (
    <>
      {showTitle &&
        titleLines.map((line, i) => (
          <text
            key={`title-${i}`}
            data-truncated={title.truncated && i === titleLines.length - 1 ? "1" : undefined}
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

      {lines.map((line, i) =>
        line.visible
          ? renderEmphasisText(
              line.segments,
              {
                accent: itemAccentInk,
                padFill: colors.primary,
                baseFill: itemInk,
                fontWeight: "700",
                themeId: ctx.themeId,
                measureWeight: { fontFamily: fonts.body },
              },
              <text
                key={i}
                data-truncated={line.truncated ? "1" : undefined}
                x={ITEM_X}
                y={line.y}
                fontFamily={fonts.body}
                fontSize={line.fontSize}
                fill={itemInk}
                dominantBaseline="alphabetic"
              />,
            )
          : null,
      )}

      {signoff && signoffText && (
        <text
          data-contrast-tier="meta"
          data-truncated={signoff.truncated ? "1" : undefined}
          x={FOOT_X}
          y={FOOT_Y}
          fontFamily={fonts.body}
          fontSize={signoff.fontSize}
          fill={metaInk(colors.muted, bg)}
          dominantBaseline="alphabetic"
        >
          {signoffText}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  // ending-scorecard-ending.tsx: pinOnly three-row scorecard. Bullets fill
  // the rows. **emphasis** tints primary, not accent. Subheading is the
  // sign-off. No thank-you. No hardcoded attestation.
  id: "scorecard-ending",
  kind: "archetype",
  pinOnly: true,
  branding: "none",
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1 },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    lineHeightRatio: TITLE_LINE_HEIGHT / TITLE_SIZE,
  },
} satisfies LayoutDefinition
