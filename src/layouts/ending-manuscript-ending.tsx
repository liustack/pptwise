import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { boundaryBulletItems } from "./boundary-content"
import { chineseNumeral } from "./compositions/numerals"
import {
  fitManuscript,
  manuscriptBaseline,
  manuscriptChinese,
  manuscriptInks,
  manuscriptText,
  manuscriptTrackedWidth,
  paintManuscript,
  paintManuscriptLine,
  paintManuscriptTracked,
} from "./compositions/manuscript"
import { MANUSCRIPT_LEFT, MANUSCRIPT_W, ManuscriptTitle } from "./manuscript-shared"

/**
 * manuscript-ending：开题报告的结尾，thesis 2026-10 定稿（p18）。
 *
 * 左上一行 deck 的标签（`footer.label`），13px 灰色粗体、字距 4px，下面一条
 * 通栏学者金细线（y96）。y150 起一行 14px 祖母绿粗体、字距 3px 的小标题（页面
 * 的 `kicker`，「本报告要点」，作者自己写，不写死「结论」）。下面是页面
 * `bullets` 的三条要点，每条一行：左边 30px 衬线金色序号（中文 deck 是
 * 「一二三」，其他是「1 2 3」），右边 28/50 衬线粗体墨色。一条发丝线（y440）
 * 之后，标题 46/70 衬线粗体祖母绿（「恳请各位老师批评指正」）。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LABEL = { top: 64, lineHeight: 20, size: 13, tracking: 4 } as const
const TOP_RULE = { y: 96 } as const
const KICKER = { top: 150, lineHeight: 24, size: 14, tracking: 3 } as const
const POINTS = { top: 200, pitch: 70, h: 50, numeral: { size: 30 }, text: { x: 124, size: 28, w: 1000 }, max: 3 } as const
const RULE = { y: 440 } as const
const TITLE = { top: 480, size: 46, lineHeight: 70, minPt: 34 } as const

export function ManuscriptEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const label = resolveDeckFooter(ir).label
  const labelFits = label !== null && manuscriptTrackedWidth(label, LABEL.size, LABEL.tracking, ctx, { bold: true }) <= MANUSCRIPT_W
  const kicker = slide.kicker?.trim() ? stripEmphasis(slide.kicker).trim() : ""
  const kickerFits = !kicker || manuscriptTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx, { bold: true }) <= MANUSCRIPT_W
  const items = boundaryBulletItems(slide, POINTS.max)
  const chinese = manuscriptChinese(ctx, [slide.heading ?? "", ...items])
  const points = items.map((text) => ({ text, layout: fitManuscript(text, { width: POINTS.text.w, size: POINTS.text.size, lineHeight: POINTS.h, maxLines: 1, serif: true, bold: true }, ctx) }))
  return (
    <>
      {label ? (
        labelFits ? (
          <g data-manuscript-label="">
            {paintManuscriptTracked({ ctx, text: label, x: MANUSCRIPT_LEFT, y: manuscriptBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: manuscriptText(inks.muted, ground, LABEL.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <rect data-manuscript-rule="" x={MANUSCRIPT_LEFT} y={TOP_RULE.y} width={MANUSCRIPT_W} height={1} fill={inks.gold} />
      {kicker ? (
        kickerFits ? (
          <g data-manuscript-kicker="">
            {paintManuscriptTracked({ ctx, text: kicker, x: MANUSCRIPT_LEFT, y: manuscriptBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, bold: true, fill: manuscriptText(inks.deep, ground, KICKER.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {points.length > 0 ? (
        <g data-manuscript-points="">
          {points.map((p, i) => {
            const top = POINTS.top + i * POINTS.pitch
            return (
              <g key={i} data-manuscript-point={i + 1}>
                {paintManuscriptLine(chinese ? chineseNumeral(i + 1) : String(i + 1), { ctx, x: MANUSCRIPT_LEFT, top, lineHeight: POINTS.h, size: POINTS.numeral.size, serif: true, bold: true, fill: manuscriptText(inks.gold, ground, POINTS.numeral.size) })}
                {p.layout ? paintManuscript(p.layout, { ctx, x: POINTS.text.x, top, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, POINTS.text.size) }) : <g data-dropped={1} data-dropped-kind="item" />}
              </g>
            )
          })}
        </g>
      ) : null}
      <rect x={MANUSCRIPT_LEFT} y={RULE.y} width={MANUSCRIPT_W} height={1} fill={inks.line} />
      <ManuscriptTitle heading={slide.heading} ctx={ctx} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} top={TITLE.top} fill={inks.deep} />
    </>
  )
}

export const layoutDef = {
  // ending-manuscript-ending.tsx: thesis's close. The deck's label over a
  // gold rule, the author's own small title, three points numbered in gold,
  // a hairline and the closing line in emerald.
  id: "manuscript-ending",
  kind: "standard",
  story: {
    name: "Manuscript Ending",
    story: "The last page of a thesis talk: the points it leaves the room with, numbered in gold under the author's own small title, and under a hairline the closing line set large in emerald.",
    positioning: "Closes a proposal, a defense or a seminar. Choose it when the talk should end on what it established and a request for the committee's comments.",
    audience: "A committee about to give its comments.",
    notFor: "A sales close, where the page should end on a button or a next step.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: POINTS.max },
  ],
  pageFields: ["kicker"],
  suppressMotif: true,
  headingFit: { maxWidth: MANUSCRIPT_W, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
