import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { PitchScrim } from "./compositions/pitch"
import { blockTag } from "./compositions/shared"
import { Lead, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeLine } from "./compositions/marquee"
import { boundarySlotBlock } from "./boundary-content"
import { MarqueeBigTitle } from "./cover-marquee-cover"
import { MarqueeTicket } from "./marquee-shared"
import { dossierTitleSet } from "./dossier-shared"

type Timeline = Extract<Component, { type: "timeline" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/**
 * marquee-ending：活动策划案的收尾，rally 2026-10 定稿（p18）重画。
 *
 * 满版照片（页面自己的 `background` 资产，纸屑落在舞台上），从下往上压一层
 * 页面底色的渐暗（95% → 50% 处 60% → 顶上 30%）。左上一张票根：洋红票面上
 * 是页面的 `kicker`（「下一步」），侧幕紫票身上是副题（页面的 `subheading`，
 * 「开场前，散场后 · 2027 夏季演唱会季」）。标题 72px 特粗，末行基线落在
 * y374。下面一排下一步（页面的 `timeline`，每步一个纸屑色圆点、18px 粗体
 * 时点、15px 灰字的事，圆点之间一条虚线，线从时点的字后面接起，不穿字），
 * 再下面一枚洋红钮，钮上的字是作者写的（页面的 `paragraph`，「拍板，开场」），
 * 深墨粗体。钮的字作者没写就不画钮。
 *
 * 不画 motif，页脚不画（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const TICKET_TOP = 64
const TITLE = { foot: 392, size: 72, lineHeight: 92, minPt: 48, w: 1150 } as const
const STEPS = { top: 456, pitch: 340, max: 4, dot: { dx: 8, dy: 14, r: 8 }, x: 28, date: { size: 18, lineHeight: 28 }, title: { top: 32, size: 15, lineHeight: 26 }, w: 300, rule: { gap: 12, dash: "3 6", w: 2 } } as const
const BUTTON = { top: 580, h: 56, minW: 260, pad: 80, size: 20 } as const
const SCRIM = [
  { offset: "0%", opacity: 0.95 },
  { offset: "50%", opacity: 0.6 },
  { offset: "100%", opacity: 0.3 },
] as const

export function MarqueeEnding({ slide, index, ctx }: SvgTemplateProps) {
  const inks = marqueeInks(ctx)
  const photo = slide.background?.kind === "asset"
  const kicker = slide.kicker?.trim()
  const subheading = slide.subheading?.trim()
  const ticket = kicker || subheading ? { stamp: kicker || undefined, label: subheading || undefined } : null
  const steps = boundarySlotBlock(slide, ["timeline"]) as Timeline | undefined
  const milestones = steps?.milestones ?? []
  const fitted = milestones.map((m) => ({
    m,
    date: fitMarquee(m.date, { width: STEPS.w, size: STEPS.date.size, lineHeight: STEPS.date.lineHeight, maxLines: 1, bold: true }, ctx),
    title: fitMarquee(m.title, { width: STEPS.w, size: STEPS.title.size, lineHeight: STEPS.title.lineHeight, maxLines: 1 }, ctx),
  }))
  const stepsFit =
    milestones.length <= STEPS.max &&
    fitted.every((f) => f.date && f.title && !f.m.desc?.trim() && !f.m.tag && !f.m.source && !f.m.highlight && !f.m.tone && !f.m.lane && !f.m.icon && !f.m.status) &&
    !steps?.lanes &&
    !steps?.periods &&
    !steps?.title
  const ask = boundarySlotBlock(slide, ["paragraph"]) as Paragraph | undefined
  const askText = ask ? stripEmphasis(ask.text).trim() : ""
  const askW = Math.max(BUTTON.minW, Math.ceil(marqueeWidth(askText, BUTTON.size, ctx, true)) + BUTTON.pad * 2)
  const askFits = askW <= 1152
  const dotY = STEPS.top + STEPS.dot.dy
  return (
    <>
      {photo ? <PitchScrim id={`marquee-ending-scrim-${index}`} ink={inks.ground} axis="y" stops={SCRIM} /> : null}
      <MarqueeTicket text={ticket} ctx={ctx} y={TICKET_TOP} />
      <MarqueeBigTitle heading={slide.heading} ctx={ctx} inks={inks} foot={TITLE.foot} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} w={TITLE.w} />
      {steps ? (
        stepsFit ? (
          <g {...blockTag(ctx, steps)} data-marquee-next="">
            {fitted.map((f, i) => {
              const x = LEFT + i * STEPS.pitch
              const nextDot = LEFT + (i + 1) * STEPS.pitch
              const dateEnd = x + STEPS.x + marqueeWidth(f.m.date, STEPS.date.size, ctx, true)
              return (
                <g key={i}>
                  {i < fitted.length - 1 ? (
                    <line x1={dateEnd + STEPS.rule.gap} y1={dotY} x2={nextDot - STEPS.rule.gap / 2} y2={dotY} stroke={inks.line} strokeWidth={STEPS.rule.w} strokeDasharray={STEPS.rule.dash} />
                  ) : null}
                  <circle cx={x + STEPS.dot.dx} cy={dotY} r={STEPS.dot.r} fill={inks.confetti[i % inks.confetti.length]} />
                  {paintMarquee(f.date!, { ctx, x: x + STEPS.x, top: STEPS.top, bold: true, fill: marqueeText(inks.ink, inks.ground, STEPS.date.size), ground: inks.ground })}
                  {paintMarquee(f.title!, { ctx, x: x + STEPS.x, top: STEPS.top + STEPS.title.top, fill: marqueeText(inks.muted, inks.ground, STEPS.title.size), ground: inks.ground })}
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
            <Lead id="ask">
              <rect x={LEFT} y={BUTTON.top} width={askW} height={BUTTON.h} rx={BUTTON.h / 2} fill={inks.fire} />
              {paintMarqueeLine(askText, { ctx, x: LEFT + askW / 2, top: BUTTON.top, lineHeight: BUTTON.h, size: BUTTON.size, bold: true, anchor: "middle", fill: marqueeText(inks.onFire, inks.fire, BUTTON.size) })}
            </Lead>
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
    </>
  )
}

export const layoutDef = {
  // ending-marquee-ending.tsx: rally's close. A photograph darkened up from
  // the foot, the ticket stub with what comes next and the campaign's name,
  // the closing line huge, the next steps on a dotted line in the confetti's
  // colours, and a button of the accent with the author's own words.
  id: "marquee-ending",
  kind: "standard",
  story: {
    name: "Marquee Close",
    story: "The closing line huge over a photograph darkened from the foot, a ticket stub naming what comes next, the next steps on a dotted line with a dot of confetti each, and one button in the lead colour with the author's own words.",
    positioning: "Closes a campaign or event proposal on its decision. Choose it when the last page should say what happens next and leave the room one thing to approve.",
    audience: "Managers at the end of a proposal, deciding whether to give the go-ahead.",
    notFor: "A thank-you page or a list of contacts, which want a quieter close.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["timeline", "paragraph"], capacity: 2, itemCapacity: STEPS.max },
  ],
  pageFields: ["kicker"],
  // It lays its own darkening over the page's photograph.
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
