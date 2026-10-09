import type { SvgTemplateProps } from "./types"
import { headedBulletRows, listRows, writesHeading } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { fitEmphasisLine, headingEmphasisPaint, renderEmphasisText, stripEmphasis } from "../render/emphasis"
import { hasCjk } from "./minimal-shared"
import type { HeadingCtx } from "./heading-set"

/**
 * defense-close-ending（第八波 pinOnly）：结论三行收口。kicker 公开英文
 * CONCLUSIONS。有 bullets 时 heading 占第一行（与 heading 当清单时同字号同位置），
 * bullets 接在后面，否则按换行或「一、/1.」切 heading。
 * 落款句取 subheading，不写死「恳请各位老师批评指正」。无 Thank you。
 *
 * 构图抄 thesis 设计板 ending：kicker y140（中文「结论」、拉丁 CONCLUSIONS），
 * 三条 y240/316/392，底线 y470，落款 y560。进共享池。零 theme id、零 baked hex。
 */

const KICKER_X = 96
const KICKER_Y = 140
const KICKER_SIZE = 19
const KICKER_TRACKING = 8

const ITEM_X = 96
const ITEM_YS = [240, 316, 392] as const
const ITEM_SIZE = 34
const ITEM_MIN_PT = 20
const ITEM_MAX_W = 1088

const FOOT_X = 96
const FOOT_RULE_Y = 470
const FOOT_RULE_X2 = 1184
const SIGNOFF_Y = 560
const SIGNOFF_SIZE = 26
const SIGNOFF_MAX_W = 1088

const CONCLUSIONS_KICKER_LATIN = "CONCLUSIONS"
const CONCLUSIONS_KICKER_CJK = "结论"

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

/** Every conclusion line the heading writes: by line break, by 「一、」 numbering, or by "1." numbering, else the heading as one line. */
function splitConclusionLinesAll(text: string): string[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const byNewline = trimmed.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  if (byNewline.length > 1) return byNewline
  const byCn = trimmed.split(/(?=[一二三四五六七八九十]+、)/).map((line) => line.trim()).filter(Boolean)
  if (byCn.length > 1) return byCn
  const byDot = trimmed.split(/(?=(?:^|\s)\d+[.、]\s*)/).map((line) => line.trim()).filter(Boolean)
  if (byDot.length > 1) return byDot
  return [trimmed]
}

function conclusionsKicker(slide: SvgTemplateProps["slide"], items: string[]): string {
  const corpus = [slide.heading, slide.subheading, ...items].join("")
  return hasCjk(corpus) ? CONCLUSIONS_KICKER_CJK : CONCLUSIONS_KICKER_LATIN
}

/** One conclusion, on one line in the heading face, its marks stripped. */
function fitItem(item: string, fonts: HeadingCtx["fonts"]) {
  return fitSvgLine(stripEmphasis(item), {
    maxWidth: ITEM_MAX_W,
    fontSize: ITEM_SIZE,
    minFontSize: ITEM_MIN_PT,
    fontFamily: fonts.heading,
  })
}

export function DefenseCloseEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const rows = headedBulletRows(slide, ITEM_MAX) ?? listRows(splitConclusionLinesAll(stripEmphasis(slide.heading ?? "")), ITEM_MAX)
  const items = rows.lines
  const signoffSource = (slide.subheading ?? "").trim()

  const kicker = fitSvgLine(conclusionsKicker(slide, items), {
    maxWidth: ITEM_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: 16,
    letterSpacing: KICKER_TRACKING,
    fontFamily: fonts.heading,
  })

  const lines = items.map((item, i) => ({
    y: ITEM_YS[i]!,
    body: fitItem(item, fonts),
  }))

  const signoff = signoffSource
    ? fitEmphasisLine(signoffSource, {
        maxWidth: SIGNOFF_MAX_W,
        fontSize: SIGNOFF_SIZE,
        minFontSize: 16,
        fontFamily: fonts.heading,
      })
    : null

  const itemInk = accessibleInk(colors.text, bg, ITEM_SIZE)
  const ruleStroke = colors.border ?? colors.muted

  return (
    <>
      <text
        data-contrast-tier="meta"
        data-truncated={kicker.truncated ? "1" : undefined}
        x={KICKER_X}
        y={KICKER_Y}
        fontFamily={fonts.heading}
        fontSize={kicker.fontSize}
        fill={accessibleInk(colors.primary, bg, kicker.fontSize)}
        letterSpacing={KICKER_TRACKING}
        dominantBaseline="alphabetic"
      >
        {kicker.text}
      </text>

      {lines.map((line, i) => (
        <text
          key={i}
          data-truncated={line.body.truncated ? "1" : undefined}
          x={ITEM_X}
          y={line.y}
          fontFamily={fonts.heading}
          fontSize={line.body.fontSize}
          fontWeight="700"
          fill={itemInk}
          dominantBaseline="alphabetic"
        >
          {line.body.text}
        </text>
      ))}

      {rows.dropped > 0 ? <g data-dropped={rows.dropped} data-dropped-kind="item" /> : null}

      <line
        x1={FOOT_X}
        y1={FOOT_RULE_Y}
        x2={FOOT_RULE_X2}
        y2={FOOT_RULE_Y}
        stroke={ruleStroke}
        strokeWidth={1}
      />

      {signoff && renderEmphasisText(
        signoff.segments,
        headingEmphasisPaint(ctx, signoff, {
          baseFill: metaInk(colors.muted, bg),
          fontWeight: "600",
          fontFamily: fonts.heading,
          bold: false,
        }),
            <text
              data-contrast-tier="meta"
              data-truncated={signoff.truncated ? "1" : undefined}
              x={FOOT_X}
              y={SIGNOFF_Y}
              fontFamily={fonts.heading}
              fontSize={signoff.fontSize}
              fill={metaInk(colors.muted, bg)}
              dominantBaseline="alphabetic"
              />
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-defense-close-ending.tsx: conclusions list, English
  // CONCLUSIONS kicker, foot rule, optional subheading sign-off. No
  // thank-you fallback. Optional bullets fill the list.
  id: "defense-close-ending",
  kind: "standard",
  story: {
    name: "Conclusions List",
    story: "A kicker labeled CONCLUSIONS tops the page, with up to three conclusion lines stacked below from bullets or the heading. A foot rule and optional sign-off close the bottom.",
    positioning: "The closing page for up to three conclusion points and a sign-off. Not a thank-you page.",
    audience: "Conference rooms and lecture halls where a panel reads the conclusions projected on screen.",
    notFor: "Closings that record a formal decision or resolution, which belong in Numbered Resolution or Recorded Decision.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX, headingRow: true },
    { name: "meta", accepts: [] },
  ],
  headingSet: ({ slide, ctx }) => {
    // With bullets the heading is the list's first row, set on one line like
    // a conclusion. Without, the heading is the list itself: a line per item,
    // each on one line, no more than the face draws.
    const headed = headedBulletRows(slide, ITEM_MAX)
    if (headed) return writesHeading(slide) && fitItem(headed.lines[0]!, ctx.fonts).truncated ? "cut" : "whole"
    const lines = splitConclusionLinesAll(stripEmphasis(slide.heading ?? ""))
    return lines.length > ITEM_MAX || lines.some((line) => fitItem(line, ctx.fonts).truncated) ? "cut" : "whole"
  },
}
