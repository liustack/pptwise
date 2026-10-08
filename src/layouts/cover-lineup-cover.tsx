import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { fitMemoTitle } from "./compositions/memo"
import {
  LINEUP_META,
  LineupWash,
  fitLineup,
  lineupBaseline,
  lineupInks,
  lineupMeta,
  lineupText,
  lineupTrackedWidth,
  lineupWidth,
  paintLineup,
  paintLineupPhoto,
  paintLineupRule,
  paintLineupTracked,
} from "./compositions/lineup"

type Image = Extract<Component, { type: "image" }>

/**
 * lineup-cover：秀场出场单的封面，runway 2026-10 定稿（p01）。像杂志封面：
 * 页面自己的照片（第一个 `image` 组件，可带 `crop`）铺满整版，左侧压一层
 * 秀场黑由深到浅的渐隐（0% 82%，46% 35%，70% 起透明）。左上一行 `kicker`
 * （「毕业设计、服装设计 · 本科」）11px 粗体、字距 8px，下面一根米白细线，
 * 系列名（`heading`）150px 衬线压在图上，一行放不下先缩到 96，再放不下就
 * 在逗号或冒号处折成两行（96 到 64），副题（`subheading`）17px、字距
 * 2px，再下一行绯红小字（页面的 `tag`，「七个造型」）字距 6px，右下角是
 * 图注（`footnote`，「LOOK 01（AI 生成示意）」），页脚压一道由浅到深的
 * 秀场黑，让图注在任何照片上都看得清。没有照片时整版是秀场黑。
 *
 * 不画 motif，不画页脚。零 theme id、零 hex。
 */

const FADE = [
  { offset: "0%", opacity: 0.82 },
  { offset: "46%", opacity: 0.35 },
  { offset: "70%", opacity: 0 },
  { offset: "100%", opacity: 0 },
] as const
/** A fade of the stage along the foot, so the caption reads on any photograph. */
const FLOOR = { top: 600, stops: [{ offset: "0%", opacity: 0 }, { offset: "100%", opacity: 0.62 }] } as const
const KICKER = { x: 64, top: 48, size: 11, lineHeight: 18, tracking: 8, rule: { y: 76, right: 560 } } as const
const TITLE = { x: 56, top: 300, size: 150, minPt: 96, twoLineMin: 64, lineHeight: 180, lead: 1.1, tracking: -2, w: 1160 } as const
const SUB = { x: 64, top: 500, size: 17, lineHeight: 26, tracking: 2, w: 600, maxLines: 2 } as const
const TAG = { x: 64, gap: 18, size: 11, lineHeight: 18, tracking: 6 } as const
const NOTE = { right: 1216, top: 690, size: 10, lineHeight: 16, tracking: 0.5, w: 600 } as const

/**
 * The title at the largest size from 150 down to 96 that keeps it on one
 * line, or else on two lines broken at a comma or a colon, from 96 down to 64.
 * `null` when two lines at 64 do not hold it.
 */
function fitTitle(text: string, ctx: SvgTemplateProps["ctx"]): { lines: string[]; size: number } | null {
  const width = (line: string, size: number) => lineupWidth(line, size, ctx, { serif: true }) + Math.max(0, Array.from(line).length - 1) * TITLE.tracking
  for (let size = TITLE.size; size >= TITLE.minPt; size -= 2) if (width(text, size) <= TITLE.w) return { lines: [text], size }
  for (let size = TITLE.minPt; size >= TITLE.twoLineMin; size -= 2) {
    const layout = fitMemoTitle(text, { maxWidth: TITLE.w, fontSize: size, minPt: size, lineHeight: size, fontFamily: ctx.fonts.heading, bold: false })
    if (!layout.truncated && layout.lines.length <= 2 && layout.lines.every((l) => width(l, size) <= TITLE.w)) return { lines: layout.lines, size }
  }
  return null
}

export function LineupCover({ slide, ctx }: SvgTemplateProps) {
  const inks = lineupInks(ctx)
  const stage = inks.stage
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const title = stripEmphasis(slide.heading ?? "").trim()
  const fitted = title ? fitTitle(title, ctx) : null
  const sub = slide.subheading?.trim() ? fitLineup(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : undefined
  const tag = stripEmphasis(slide.tag?.text ?? "").trim()
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const kickerFits = !kicker || lineupTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx, { bold: true }) <= KICKER.rule.right - KICKER.x + 200
  const tagFits = !tag || lineupTrackedWidth(tag, TAG.size, TAG.tracking, ctx, { bold: true }) <= SUB.w
  const noteFits = !note || lineupTrackedWidth(note, NOTE.size, NOTE.tracking, ctx) <= NOTE.w
  const light = lineupText(inks.light, stage, SUB.size)
  const subBottom = SUB.top + (sub?.lines.length ?? 1) * SUB.lineHeight
  return (
    <>
      <rect data-lineup-stage="" x={0} y={0} width={1280} height={720} fill={stage} />
      {image ? (
        <g data-lineup-cover-photo="">
          {paintLineupPhoto(image.asset_id, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image.crop })}
          <LineupWash id="lineup-cover-fade" box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={stage} axis="x" stops={FADE} />
          {note ? <LineupWash id="lineup-cover-floor" box={{ x: 0, y: FLOOR.top, w: 1280, h: 720 - FLOOR.top }} ink={stage} axis="y" stops={FLOOR.stops} /> : null}
        </g>
      ) : null}
      {kicker && kickerFits ? (
        <g data-lineup-cover-kicker={kicker}>
          {paintLineupTracked({ ctx, text: kicker, x: KICKER.x, y: lineupBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, bold: true, fill: lineupText(inks.light, stage, KICKER.size) })}
          {paintLineupRule(KICKER.x, KICKER.rule.right, KICKER.rule.y, lineupText(inks.light, stage, KICKER.size), 1)}
        </g>
      ) : null}
      {fitted ? (
        <g data-lineup-cover-title="">
          {fitted.lines.map((line, i) => {
            // The last line stands where a title of one line stands. A first line rises over it.
            const baseline = lineupBaseline(TITLE.top, TITLE.lineHeight, fitted.size, true) - (fitted.lines.length - 1 - i) * Math.round(fitted.size * TITLE.lead)
            return <g key={i}>{paintLineupTracked({ ctx, text: line, x: TITLE.x, y: baseline, size: fitted.size, tracking: TITLE.tracking, serif: true, fill: lineupText(inks.light, stage, fitted.size) })}</g>
          })}
        </g>
      ) : null}
      {sub ? <g data-lineup-cover-sub="">{paintLineup(sub, { ctx, x: SUB.x, top: SUB.top, fill: light, ground: stage })}</g> : null}
      {tag && tagFits ? <g data-lineup-cover-tag={tag}>{paintLineupTracked({ ctx, text: tag, x: TAG.x, y: lineupBaseline(subBottom + TAG.gap, TAG.lineHeight, TAG.size), size: TAG.size, tracking: TAG.tracking, bold: true, fill: lineupMeta(inks.crimson, stage), attrs: { ...LINEUP_META } })}</g> : null}
      {note && noteFits ? <g data-lineup-cover-note="">{paintLineupTracked({ ctx, text: note, x: NOTE.right, y: lineupBaseline(NOTE.top - NOTE.lineHeight / 2, NOTE.lineHeight, NOTE.size), size: NOTE.size, tracking: NOTE.tracking, anchor: "end", fill: lineupMeta(inks.lightQuiet, stage), attrs: { ...LINEUP_META } })}</g> : null}
      {(kicker && !kickerFits) || (title && !fitted) || (slide.subheading?.trim() && !sub) || (tag && !tagFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-lineup-cover.tsx: runway's cover. A fashion magazine's cover: the
  // page's photograph across the whole page fading to black at its left,
  // the occasion tracked wide over a hairline, the collection's name set huge
  // in the serif over the picture, its line, a crimson tag and the
  // photograph's caption.
  id: "lineup-cover",
  kind: "standard",
  story: {
    name: "Lineup Cover",
    story: "A fashion magazine's cover: one photograph across the whole page fading to black at its left, the occasion tracked wide over a hairline, the collection's name set huge in a serif over the picture, its line under it and one word of crimson.",
    positioning: "Opens a collection, a lookbook or a portfolio review. Choose it when one photograph of the work should be the first thing the audience sees.",
    audience: "An audience that came to see the work before hearing about it.",
    notFor: "A report or a briefing with no picture worth a whole page.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["kicker", "footnote", "tag"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  // Over the photograph's dark left edge, above the occasion.
  coverMark: { x: 64, y: 24 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.twoLineMin, bold: false, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
