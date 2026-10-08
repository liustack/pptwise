import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { fitLineupClaim } from "./lineup-shared"
import { PLACARD_META, PlacardGlow, paintPlacard, paintPlacardRule, paintPlacardTracked, placardBaseline, placardInks, placardMark, placardMeta, placardText, placardTrackedWidth } from "./compositions/placard"
import { PlacardHall } from "./placard-shared"

/**
 * placard-ending：展厅熄灯，只剩一张展签亮着，museum 2026-10 定稿（p18）。
 * 厅堂色底，正中一圈暖光，左上是页面的 `kicker`（「周末科普讲座」）和 y58
 * 的接缝，结束语（`heading`）64px 衬线常规字重、字距 4px 居中，一行放不下
 * 在逗号或冒号处折成两行，下面一道 80px 的铜色短线，再下面是副题
 * （`subheading`）16px 旧纸色、字距 4px 居中，作者折的行照折，每行一行，
 * 最下面是日期（deck 的 `meta.date`）13px 衬线、字距 6px。
 *
 * 不画 motif，不画页脚。零 theme id、零 hex。
 */

const LIGHT = { cx: 640, cy: 360, r: 320, strength: 0.14 } as const
const WORDS = { foot: 360, size: 64, lineHeight: 90, minPt: 48, tracking: 4, w: 1152 } as const
const RULE = { y: 392, w: 80, stroke: 1.4 } as const
const SUB = { top: 416, size: 16, lineHeight: 28, tracking: 4, w: 1152, maxLines: 3 } as const
const DATE = { top: 600, size: 13, lineHeight: 20, tracking: 6, w: 1152 } as const

export function PlacardEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = placardInks(ctx)
  const ground = inks.ground
  const plain = stripEmphasis(slide.heading ?? "").trim()
  const oneLine = plain && !plain.includes("\n") && placardTrackedWidth(plain, WORDS.size, WORDS.tracking, ctx, { serif: true }) <= WORDS.w
  const broken = plain && !oneLine ? fitLineupClaim(slide.heading, ctx, WORDS.w, WORDS.size, WORDS.lineHeight, 2) : null
  const wordsFit = !plain || oneLine || (broken && !broken.truncated && broken.lines.length <= 2 && broken.fontSize >= WORDS.minPt)
  // The author's own breaks are kept, a line of its own each.
  const subLines = (slide.subheading ?? "").split(/\n+/u).map((line) => stripEmphasis(line).trim()).filter(Boolean)
  const subFits = subLines.length <= SUB.maxLines && subLines.every((line) => placardTrackedWidth(line, SUB.size, SUB.tracking, ctx) <= SUB.w)
  const date = stripEmphasis(ir.meta?.date ?? "").trim()
  const dateFits = !date || placardTrackedWidth(date, DATE.size, DATE.tracking, ctx, { serif: true }) <= DATE.w
  return (
    <>
      <rect data-placard-hall="" x={0} y={0} width={1280} height={720} fill={ground} />
      <PlacardGlow id="placard-ending-light" cx={LIGHT.cx} cy={LIGHT.cy} r={LIGHT.r} strength={LIGHT.strength} ctx={ctx} />
      <PlacardHall ctx={ctx} hall={slide.kicker} />
      {oneLine ? (
        <g data-placard-ending-words="">{paintPlacardTracked({ ctx, text: plain, x: 640, y: placardBaseline(WORDS.foot - WORDS.lineHeight, WORDS.lineHeight, WORDS.size, true), size: WORDS.size, tracking: WORDS.tracking, serif: true, anchor: "middle", fill: placardText(inks.ink, ground, WORDS.size) })}</g>
      ) : broken && wordsFit ? (
        <g data-placard-ending-words="">{paintPlacard(broken, { ctx, x: 640, anchor: "middle", top: WORDS.foot - WORDS.lineHeight * broken.lines.length, fill: placardText(inks.ink, ground, broken.fontSize), serif: true })}</g>
      ) : null}
      {paintPlacardRule(640 - RULE.w / 2, 640 + RULE.w / 2, RULE.y, placardMark(inks.copper, ground), RULE.stroke)}
      {subFits
        ? subLines.map((line, i) => (
            <g key={i} data-placard-ending-sub="">
              {paintPlacardTracked({ ctx, text: line, x: 640, y: placardBaseline(SUB.top + i * SUB.lineHeight, SUB.lineHeight, SUB.size), size: SUB.size, tracking: SUB.tracking, anchor: "middle", fill: placardText(inks.muted, ground, SUB.size) })}
            </g>
          ))
        : null}
      {date && dateFits ? <g data-placard-ending-date={date}>{paintPlacardTracked({ ctx, text: date, x: 640, y: placardBaseline(DATE.top, DATE.lineHeight, DATE.size, true), size: DATE.size, tracking: DATE.tracking, serif: true, anchor: "middle", fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}</g> : null}
      {!wordsFit || !subFits || !dateFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-placard-ending.tsx: museum's close. The gallery's lights go down
  // and one label stays lit: a pool of warm light, the closing words in the
  // serif, a short copper rule, a tracked line and the date.
  id: "placard-ending",
  kind: "standard",
  story: {
    name: "Placard Ending",
    story: "The gallery's lights go down and one label stays lit: a pool of warm light in the middle of a dark hall, the closing words in a quiet serif, a short copper rule, a line of thanks tracked wide and the date.",
    positioning: "Closes an exhibition talk, a curator's tour or a science lecture. Choose it when the last page should leave one sentence in the room and open the floor.",
    audience: "Visitors at the end of a talk, about to ask their questions.",
    notFor: "A close that must ask for a decision or list next steps.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker"],
  suppressMotif: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: WORDS.w, fontSize: WORDS.size, maxLines: 2, minPt: WORDS.minPt, bold: false, lineHeightRatio: WORDS.lineHeight / WORDS.size },
} satisfies LayoutDefinition
