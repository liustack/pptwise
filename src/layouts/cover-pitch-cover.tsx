import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { stripEmphasis } from "../render/emphasis"
import { boundarySlotBlock, drawableItems } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import { fitPitch, paintPitch, paintPitchLine, paintPitchTracked, paintWedge, PitchScrim, pitchBaseline, pitchInks, pitchText, pitchTrackedWidth, pitchWidth } from "./compositions/pitch"
import { PitchTitle } from "./pitch-shared"

type Bullets = Extract<Component, { type: "bullets" }>

/**
 * pitch-cover：路演的封面，ember 2026-10 定稿（p01）重画。
 *
 * 一张满版照片（页面自己的 `background` 资产）铺在底下，从下往上压一层页面
 * 底色的渐暗（96% → 42% 处 70% → 75% 处 5%），字都站在下面暗的那一截。
 * 左上角一枚 88px 的火橙角楔，楔右一行场合和日期（页面的 `kicker` 与
 * `meta.date`，「种子轮路演 · 2026 年 10 月」），米白粗体、字距 4px。标题
 * 64/76 粗体，一行放得下就一行，放不下在逗号处折两行，底对齐在 y540；下面
 * 副题 21/32 暖灰；最下一排描边胶囊（页面的 `bullets`，「医疗 + 社区」），
 * 米白粗体压炭卡色。
 *
 * 没有照片时，同样的字排在炭黑底上，角楔照画。不画 motif，不画段落导轨：
 * 路演还没开始。火橙只亮在角楔上。零 theme id、零 hex。
 */

const WEDGE = 88
const HEAD = { x: 104, top: 64, size: 14, lineHeight: 22, tracking: 4 } as const
const TITLE = { foot: 540, size: 64, lineHeight: 76, minPt: 44, w: 1100 } as const
const SUB = { top: 556, size: 21, lineHeight: 32, maxLines: 1, w: 1100 } as const
const CHIPS = { top: 612, h: 30, size: 14, padX: 13, gap: 10, w: 1152, card: 0.8 } as const
const LEFT = 64
const SCRIM = [
  { offset: "0%", opacity: 0.96 },
  { offset: "42%", opacity: 0.7 },
  { offset: "75%", opacity: 0.05 },
] as const

export function PitchCover({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = pitchInks(ctx)
  const photo = slide.background?.kind === "asset"
  const head = [slide.kicker?.trim(), ir.meta.date?.trim()].filter((part): part is string => Boolean(part)).join(" · ")
  const headFits = !head || (head === stripEmphasis(head) && pitchTrackedWidth(head, HEAD.size, HEAD.tracking, ctx, true) <= 1216 - HEAD.x)
  const sub = slide.subheading?.trim() ? fitPitch(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const block = boundarySlotBlock(slide, ["bullets"]) as Bullets | undefined
  const chips = block ? drawableItems(block.items).map((item) => stripEmphasis(item).trim()) : []
  const chipW = chips.map((chip) => Math.ceil(pitchWidth(chip, CHIPS.size, ctx, true)) + CHIPS.padX * 2)
  const chipsFit = chipW.reduce((sum, w) => sum + w, 0) + CHIPS.gap * Math.max(0, chips.length - 1) <= CHIPS.w
  let cursor = LEFT
  return (
    <>
      {photo ? <PitchScrim id={`pitch-cover-scrim-${index}`} ink={inks.ground} axis="y" stops={SCRIM} /> : null}
      {paintWedge(WEDGE, inks)}
      {head ? (
        headFits ? (
          <g data-pitch-cover-head="">
            {paintPitchTracked({ ctx, text: head, x: HEAD.x, y: pitchBaseline(HEAD.top, HEAD.lineHeight, HEAD.size), size: HEAD.size, tracking: HEAD.tracking, bold: true, fill: pitchText(inks.ink, inks.ground, HEAD.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <PitchTitle heading={slide.heading} ctx={ctx} width={TITLE.w} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} foot={TITLE.foot} />
      {sub ? <g data-pitch-cover-sub="">{paintPitch(sub, { ctx, x: LEFT, top: SUB.top, fill: pitchText(inks.muted, inks.ground, SUB.size), ground: inks.ground })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {block ? (
        chipsFit ? (
          <g {...blockTag(ctx, block)} data-pitch-chips="">
            {chips.map((chip, i) => {
              const x = cursor
              cursor += chipW[i]! + CHIPS.gap
              return (
                <g key={i}>
                  <rect x={x + 0.5} y={CHIPS.top + 0.5} width={chipW[i]! - 1} height={CHIPS.h - 1} rx={(CHIPS.h - 1) / 2} fill={inks.card} fillOpacity={CHIPS.card} stroke={inks.line} strokeWidth={1} />
                  {paintPitchLine(chip, { ctx, x: x + chipW[i]! / 2, top: CHIPS.top, lineHeight: CHIPS.h - 2, size: CHIPS.size, bold: true, anchor: "middle", fill: pitchText(inks.ink, inks.card, CHIPS.size) })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={chips.length} data-dropped-kind="item" />
        )
      ) : null}
    </>
  )
}

export const layoutDef = {
  // cover-pitch-cover.tsx: ember's pitch cover. A photograph darkened up
  // from the foot, the fire's wedge in the corner with the occasion and the
  // date, the title large, the subtitle and the pitch's facts as pills.
  id: "pitch-cover",
  kind: "standard",
  story: {
    name: "Pitch Cover",
    story: "A photograph darkens toward the foot of the page, where the title stands large over a line of what the pitch proves and its facts as pills. A wedge of the single fire colour in the corner carries the occasion and the date.",
    positioning: "Opens a pitch. Choose it when the first page should already show the room what the company does and what the next minutes will prove.",
    audience: "Investors or partners about to hear a founder out.",
    notFor: "A report or a briefing, which wants a cover with no stage lighting.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: 5 },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  suppressMotif: true,
  // Over the occasion's line, right of the wedge.
  coverMark: { x: HEAD.x, y: 44 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
