import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { ChalkUnder, chalkBaseline, chalkText, chalkTrackedWidth, chalkWidth, chalkboardInks, fitChalk, paintChalk, paintChalkTracked } from "./compositions/chalkboard"
import { fitChalkClaim } from "./chalkboard-shared"

/**
 * chalkboard-chapter：课的下一段，lecture 2026-10 定稿的章节页（定稿没有
 * 章节页，按同一块黑板的写法补：p01 封面的讲次、衬线大字和那一道黄粉笔
 * 线）。左上一行这一段的序号（`kicker`，「二 算对」）13px 粉笔灰、字距
 * 6px，板中间偏上是这一段的名字（`heading`）衬线 72/90 粉笔白，一行放不下
 * 先缩到六成，再在逗号处折成两行，末行落在 y380，下面划一道两遍的黄粉笔
 * 线。名字下面一行（`subheading`）22/34 衬线粉笔灰，一到两行。
 *
 * motif 照画。零 theme id、零 hex。
 */

const KICKER = { x: 64, top: 64, size: 13, lineHeight: 20, tracking: 6, w: 1100 } as const
const TITLE = { x: 64, w: 1100, foot: 380, size: 72, lineHeight: 90, floor: 0.6, under: { gap: 16, dx: 6, tail: 32, width: 6 } } as const
const SUB = { x: 64, top: 430, w: 1000, size: 22, lineHeight: 34, maxLines: 2 } as const

export function ChalkboardChapter({ slide, ctx }: SvgTemplateProps) {
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const kickerFits = !kicker || chalkTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) <= KICKER.w
  const title = slide.heading?.trim() ? fitChalkClaim(slide.heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight, 2, Math.round(TITLE.size * TITLE.floor)) : null
  const titleFits = !title || (!title.truncated && title.lines.length <= 2)
  const sub = slide.subheading?.trim() ? fitChalk(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, serif: true }, ctx) : undefined
  const top = title ? TITLE.foot - title.lines.length * title.lineHeight : TITLE.foot
  const lastW = title ? chalkWidth(title.lines[title.lines.length - 1] ?? "", title.fontSize, ctx, { serif: true }) : 0
  return (
    <>
      <rect data-chalk-board="" x={0} y={0} width={1280} height={720} fill={ground} />
      {kicker && kickerFits ? (
        <g data-chalk-chapter-kicker={kicker}>{paintChalkTracked({ ctx, text: kicker, x: KICKER.x, y: chalkBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: chalkText(inks.muted, ground, KICKER.size) })}</g>
      ) : null}
      {title && titleFits ? (
        <g data-chalk-chapter-title="">
          {paintChalk(title, { ctx, x: TITLE.x, top, serif: true, fill: chalkText(inks.chalk, ground, title.fontSize) })}
          <ChalkUnder x1={TITLE.x + TITLE.under.dx} x2={TITLE.x + lastW + TITLE.under.tail} y={TITLE.foot + TITLE.under.gap} ink={inks.yellow} width={TITLE.under.width} />
        </g>
      ) : null}
      {sub ? <g data-chalk-chapter-sub="">{paintChalk(sub, { ctx, x: SUB.x, top: SUB.top, serif: true, fill: chalkText(inks.muted, ground, SUB.size) })}</g> : null}
      {(kicker && !kickerFits) || !titleFits || (slide.subheading?.trim() && !sub) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-chalkboard-chapter.tsx: lecture's chapter page. The board wiped
  // for the next part of the lesson: its number small, its name large in a
  // serif with one stroke of yellow chalk under it.
  id: "chalkboard-chapter",
  kind: "standard",
  story: {
    name: "Chalkboard Chapter",
    story: "The board wiped for the next part of the lesson: its number small in the corner, its name written large in a serif with one stroke of yellow chalk under it, and a line on what this part will teach.",
    positioning: "Opens a part of a lecture, an evening course or a training session. Choose it when the class moves from one question to the next.",
    audience: "Adults in a class after work, turning to a fresh page of their notes.",
    notFor: "A report's section divider, which wants no board.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker"],
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: Math.round(TITLE.size * TITLE.floor), bold: false, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
