import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { Component } from "@/ir"
import { stripEmphasis } from "../render/emphasis"
import { boundarySlotBlock } from "./boundary-content"
import { blockTag } from "./compositions/shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, paintWedge, pitchInks, pitchText, pitchWidth } from "./compositions/pitch"
import { PitchTitle } from "./pitch-shared"

type Timeline = Extract<Component, { type: "timeline" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/**
 * pitch-ending：路演的收尾，ember 2026-10 定稿（p16）重画。
 *
 * 炭黑底，左上角一枚 88px 的火橙角楔。标题 64/80 米白粗体，底对齐在 y360，
 * 一行放得下就一行；副题 20/32 暖灰。下面一排三步回顾（页面的 `timeline`，
 * 每步一个暖灰图标、灰色粗体的时点、一行米白粗体的事），再下面一枚火橙钮，
 * 钮上的字是作者写的（页面的 `paragraph`，「约个时间聊」），深墨粗体。钮的
 * 字作者没写就不画钮，引擎不替作者编一句。
 *
 * 火橙只亮在角楔和钮上：两样都是这一页的「开口」。不画 motif，页脚不画
 * （共享页脚只上内容页）。零 theme id、零 hex。
 */

const WEDGE = 88
const LEFT = 64
const TITLE = { foot: 360, size: 64, lineHeight: 80, minPt: 44, w: 1100 } as const
const SUB = { top: 392, size: 20, lineHeight: 32, maxLines: 2, w: 1100 } as const
const STEPS = { top: 466, pitch: 260, max: 4, icon: { dy: 4, size: 22 }, x: 34, date: { size: 14, lineHeight: 24 }, title: { top: 28, size: 19, lineHeight: 30, w: 220 } } as const
const BUTTON = { top: 580, h: 56, minW: 220, padX: 40, size: 20 } as const

export function PitchEnding({ slide, ctx }: SvgTemplateProps) {
  const inks = pitchInks(ctx)
  const sub = slide.subheading?.trim() ? fitPitch(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const steps = boundarySlotBlock(slide, ["timeline"]) as Timeline | undefined
  const milestones = steps?.milestones ?? []
  const fitted = milestones.map((m) => ({
    m,
    date: fitPitch(m.date, { width: STEPS.title.w, size: STEPS.date.size, lineHeight: STEPS.date.lineHeight, maxLines: 1, bold: true }, ctx),
    title: fitPitch(m.title, { width: STEPS.title.w, size: STEPS.title.size, lineHeight: STEPS.title.lineHeight, maxLines: 1, bold: true }, ctx),
  }))
  const stepsFit =
    milestones.length <= STEPS.max &&
    fitted.every((f) => f.date && f.title && !f.m.desc?.trim() && !f.m.tag && !f.m.source && !f.m.highlight && !f.m.tone && !f.m.lane && !f.m.status) &&
    !steps?.lanes &&
    !steps?.periods &&
    !steps?.title
  const ask = boundarySlotBlock(slide, ["paragraph"]) as Paragraph | undefined
  const askText = ask ? stripEmphasis(ask.text).trim() : ""
  const askW = Math.max(BUTTON.minW, Math.ceil(pitchWidth(askText, BUTTON.size, ctx, true)) + BUTTON.padX * 2)
  const askFits = askW <= 1152
  return (
    <>
      {paintWedge(WEDGE, inks)}
      <PitchTitle heading={slide.heading} ctx={ctx} width={TITLE.w} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} foot={TITLE.foot} />
      {sub ? <g data-pitch-ending-sub="">{paintPitch(sub, { ctx, x: LEFT, top: SUB.top, fill: pitchText(inks.muted, inks.ground, SUB.size), ground: inks.ground })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {steps ? (
        stepsFit ? (
          <g {...blockTag(ctx, steps)} data-pitch-recap="">
            {fitted.map((f, i) => {
              const x = LEFT + i * STEPS.pitch
              return (
                <g key={i}>
                  {f.m.icon ? paintPitchIcon(f.m.icon, x, STEPS.top + STEPS.icon.dy, STEPS.icon.size, inks.muted, inks.ground) : null}
                  {paintPitch(f.date!, { ctx, x: x + (f.m.icon ? STEPS.x : 0), top: STEPS.top, bold: true, fill: pitchText(inks.muted, inks.ground, STEPS.date.size), ground: inks.ground })}
                  {paintPitch(f.title!, { ctx, x: x + (f.m.icon ? STEPS.x : 0), top: STEPS.top + STEPS.title.top, bold: true, fill: pitchText(inks.ink, inks.ground, STEPS.title.size), ground: inks.ground })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={milestones.length} data-dropped-kind="item" />
        )
      ) : null}
      {ask && askText ? (
        askFits ? (
          <g {...blockTag(ctx, ask)}>
            <Fire id="ask">
              {paintPitchCard({ x: LEFT, y: BUTTON.top, w: askW, h: BUTTON.h }, inks, { fill: inks.fire })}
              {paintPitchLine(askText, { ctx, x: LEFT + askW / 2, top: BUTTON.top, lineHeight: BUTTON.h, size: BUTTON.size, bold: true, anchor: "middle", fill: pitchText(inks.onFire, inks.fire, BUTTON.size) })}
            </Fire>
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
    </>
  )
}

export const layoutDef = {
  // ending-pitch-ending.tsx: ember's close. The fire's wedge in the corner,
  // the closing line large, the steps the round pays for, and a button of
  // the fire with the author's own words.
  id: "pitch-ending",
  kind: "standard",
  story: {
    name: "Pitch Close",
    story: "A wedge of the single fire colour in the corner, the closing line large, the steps the round pays for in a row, and one button of the fire with the founder's own words on it.",
    positioning: "Closes a pitch on its ask. Choose it when the last page should repeat what the money buys and leave the room with one thing to do.",
    audience: "Investors at the end of a pitch, deciding whether to take the next meeting.",
    notFor: "A thank-you page or a list of contacts, which want a quieter close.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "body", accepts: ["timeline", "paragraph"], capacity: 2, itemCapacity: STEPS.max },
  ],
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
