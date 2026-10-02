import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { accessibleInk, readableOn } from "../render/ink"
import {
  fitEmphasisHeading,
  fitEmphasisLine,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  renderEmphasisText,
  stripEmphasis,
} from "../render/emphasis"
import { centredBaseline } from "./compositions/type"
import { FieldHeadingLine, fieldInk } from "./field-type"

/**
 * signoff-ending：满版 primary 场上的收口页。2026-10 bulletin 样例改版
 * （`design/rounds/2026-10-03-bulletin/`）重画：
 *
 *   - 上方一行小字（`subheading`，如「需要管理层拍板」）18px，白色 78%。
 *   - 标题 56/74 粗体，场的可读墨，y196 起最多两行，宽 1000：要拍板的那一
 *     件事。`**…**` 标出的词在场上换不出强调色，改为同色直线下划
 *     （`field-type.tsx`）。旧版把标题先剥掉强调再画，标出的词就丢了。
 *   - y404 一根 40% 的白色细线，标题无论一行两行都停在它上面 60px 以外，
 *     英文标题折成两行也不会贴住下面的要点。
 *   - 线下第一个 bullets 的条目排成等宽列：20px 粗体编号（白色 70%），
 *     24/34 的正文，每条最多三行。两到四条。
 *   - 不画落款：机构名在封面上方那一行，这一页只留要拍板的事和下一步。
 *
 * 进共享池，不是 bulletin 专用。零 theme id、零 baked hex。不致谢：heading
 * 缺省不兜底 "Thank you."。空 components 一列都不画，不编造预览文案。满版色
 * 场由本文件自己铺（`paintsOwnBackground`），主题 `defaultBackgrounds.ending`
 * 保持浅底。
 */

const LEFT = 80
const RIGHT = 1200
const KICKER = { top: 96, size: 18, box: 26, share: 0.78, maxW: 900 }
const TITLE = { top: 196, size: 56, box: 74, minPt: 36, maxLines: 2, maxW: 1000 }
const RULE = { y: 404, share: 0.4 }
const ITEM_MAX = 4
/** Columns stand on the pitch the cover's facts would, 376px for three. Each item's text stops 46px short of the next. */
const ITEM_PITCH_GAP = 8
const ITEM_GUTTER = 46
const NUMBER = { top: 432, size: 20, box: 30, share: 0.7 }
const ITEM = { top: 470, size: 24, box: 34, maxLines: 3 }

export function SignoffEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const field = colors.primary
  const ink = readableOn(field)

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

  const kickerSource = slide.subheading?.trim()
  const kicker = kickerSource
    ? fitEmphasisLine(kickerSource, { maxWidth: KICKER.maxW, fontSize: KICKER.size, minFontSize: 16, fontFamily: fonts.body })
    : null
  const kickerInk = fieldInk(ctx, KICKER.share, KICKER.size)

  const items = boundaryBulletItems(slide, ITEM_MAX)
  const pitch = items.length > 0 ? (RIGHT - LEFT + ITEM_PITCH_GAP) / Math.max(3, items.length) : 0
  const itemW = pitch - ITEM_GUTTER
  const itemLayouts = items.map((item) =>
    fitEmphasisText(item, {
      maxWidth: itemW,
      fontSize: ITEM.size,
      maxLines: ITEM.maxLines,
      minPt: 18,
      lineHeightRatio: ITEM.box / ITEM.size,
      fontFamily: fonts.body,
    }),
  )
  const numberInk = fieldInk(ctx, NUMBER.share, NUMBER.size)


  return (
    <>
      <rect x={0} y={0} width={1280} height={720} fill={field} />

      {kicker &&
        renderEmphasisText(
          kicker.segments,
          headingEmphasisPaint(ctx, kicker, { baseFill: kickerInk, accent: ink, fontFamily: fonts.body, bold: false, bg: field }),
          <text
            data-contrast-tier="meta"
            data-truncated={kicker.truncated ? "1" : undefined}
            x={LEFT}
            y={centredBaseline(KICKER.top, KICKER.box, kicker.fontSize)}
            fontFamily={fonts.body}
            fontSize={kicker.fontSize}
            fill={kickerInk}
            dominantBaseline="alphabetic"
          />,
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

      {items.length > 0 && (
        <rect x={LEFT} y={RULE.y} width={RIGHT - LEFT} height={1} fill={ink} fillOpacity={RULE.share} />
      )}

      {itemLayouts.map((layout, i) => {
        const x = LEFT + i * pitch
        return (
          <g key={i}>
            <text
              x={x}
              y={centredBaseline(NUMBER.top, NUMBER.box, NUMBER.size)}
              fontFamily={fonts.body}
              fontSize={NUMBER.size}
              fontWeight="700"
              fill={numberInk}
              dominantBaseline="alphabetic"
            >
              {String(i + 1).padStart(2, "0")}
            </text>
            {renderEmphasisHeading(
              layout,
              headingEmphasisPaint(ctx, layout, { baseFill: ink, accent: ink, fontWeight: "700", fontFamily: fonts.body, bold: false, bg: field }),
              (_line, k) => (
                <text
                  key={k}
                  data-truncated={layout.truncated && k === layout.lines.length - 1 ? "1" : undefined}
                  x={x}
                  y={centredBaseline(ITEM.top, ITEM.box, layout.fontSize) + k * layout.lineHeight}
                  fontFamily={fonts.body}
                  fontSize={layout.fontSize}
                  fill={ink}
                  dominantBaseline="alphabetic"
                />
              ),
            )}
          </g>
        )
      })}

    </>
  )
}

export const layoutDef = {
  branding: "none",
  // ending-signoff-ending.tsx: full-bleed primary field, a small line over
  // the action heading, a hairline, and the first bullets' items as numbered
  // columns, with a colophon at the foot. Empty heading does not fall back to
  // a thank-you. Empty components draw no preview list.
  id: "signoff-ending",
  kind: "standard",
  story: {
    name: "Field Roster",
    story: "A full-bleed main-colour field covers the page. A small line names who must act and the decision sits left in large bold type, with up to four next steps in numbered columns under a fine rule.",
    positioning: "The closing page for one decision and up to four next steps on a bold colored ground. Not a thank-you page.",
    audience: "Projected screens where the colored field and white text read from the back of a room.",
    notFor: "Endings where the background should stay neutral, which belong in Next Steps Pad on paper-colored ground.",
  },
  paintsOwnBackground: true,
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
  ],
  headingFit: {
    maxWidth: TITLE.maxW,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.box / TITLE.size,
  },
} satisfies LayoutDefinition
