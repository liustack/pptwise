import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { DecorPiece } from "../motifs/decor-piece"
import { PitchScrim } from "./compositions/pitch"
import { Confetti, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, ticketWidths, type Box } from "./compositions/marquee"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"
import { MarqueeBigTitle, Pills, pillItems, pillsFit, pillsWhole } from "./cover-marquee-cover"
import { MarqueeTicket, sectionTicket } from "./marquee-shared"

/**
 * marquee-chapter：活动策划案的分区页，按 rally 2026-10 定稿的设计系统画（定稿
 * 样例没有分区页，几何沿用封面）。
 *
 * 幕布深紫上（或页面自己的满版照片，从下往上压暗，同结尾页），左上一张票根：
 * 洋红票面上是这一分区的编号，侧幕紫票身上是分区名（页面的 `kicker`，与内容页
 * 同一套编号，分区名第一次出现的顺序）。标题 72px 特粗，末行基线落在 y475；
 * 下面 26px 洋红一行副题（这一分区回答什么）；最下可以有一排描边胶囊（页面的
 * `row_cards`，每项一个洋红图标和一个名字）。右上撒一大把纸屑：(860,120) 起
 * 380×260 十四枚，种子是页号，落在字上的不画。
 *
 * 不画 motif，页脚不画（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const TICKET = { top: 64 } as const
const TITLE = { foot: 490, size: 72, lineHeight: 86, minPt: 48, w: 1100 } as const
const SUB = { top: 498, size: 26, lineHeight: 40, maxLines: 2, w: 1100 } as const
const PILLS_TOP = 576
const BURST = { region: { x: 860, y: 120, w: 380, h: 260 }, count: 14 } as const
const SCRIM = [
  { offset: "0%", opacity: 0.95 },
  { offset: "50%", opacity: 0.6 },
  { offset: "100%", opacity: 0.3 },
] as const

export function MarqueeChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = marqueeInks(ctx)
  const photo = slide.background?.kind === "asset"
  const ticket = sectionTicket(ir, slide)
  const sub = slide.subheading?.trim() ? fitMarquee(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, bold: true }, ctx) : null
  const pills = pillItems(slide)
  const pillsDrawn = pills !== null && pillsWhole(pills.block) && pillsFit(pills.items, ctx) && (sub?.lines.length ?? 0) < 2
  const keepOff: Box[] = []
  if (ticket) {
    const w = ticketWidths(ticket, ctx)
    keepOff.push({ x: LEFT - 6, y: TICKET.top - 6, w: w.stamp + w.label + 12, h: 42 })
  }
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  title.lines.forEach((line, i) => keepOff.push({ x: LEFT, y: TITLE.foot - (title.lines.length - i) * title.lineHeight, w: marqueeWidth(line, title.fontSize, ctx, true), h: title.lineHeight }))
  if (sub) keepOff.push({ x: LEFT, y: SUB.top, w: Math.max(...sub.lines.map((l) => marqueeWidth(l, SUB.size, ctx, true))), h: sub.lines.length * SUB.lineHeight })
  return (
    <>
      {photo ? <PitchScrim id={`marquee-chapter-scrim-${index}`} ink={inks.ground} axis="y" stops={SCRIM} /> : null}
      <DecorPiece id="confetti" role="identity">
        <Confetti throws={[{ seed: index + 1, region: BURST.region, count: BURST.count }]} colors={inks.confetti} keepOff={keepOff} />
      </DecorPiece>
      <MarqueeTicket text={ticket} ctx={ctx} y={TICKET.top} />
      <MarqueeBigTitle heading={slide.heading} ctx={ctx} inks={inks} foot={TITLE.foot} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} w={TITLE.w} />
      {sub ? <g data-marquee-chapter-sub="">{paintMarquee(sub, { ctx, x: LEFT, top: SUB.top, bold: true, fill: marqueeText(inks.fire, inks.ground, SUB.size), ground: inks.ground })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {pills ? pillsDrawn ? <Pills items={pills.items} block={pills.block} ctx={ctx} inks={inks} top={PILLS_TOP} /> : <g data-dropped={pills.items.length} data-dropped-kind="item" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-marquee-chapter.tsx: rally's section page. The section's ticket
  // stub, its title huge with what it answers in the accent, optionally its
  // facts as pills, and a burst of confetti at the top right.
  id: "marquee-chapter",
  kind: "standard",
  story: {
    name: "Marquee Chapter",
    story: "A ticket stub numbers the section and names it, the title stands huge over a line in the lead colour saying what the section answers, and a burst of confetti lands at the top right.",
    positioning: "Opens a section of a campaign or event proposal. Choose it when the room should feel the plan move to its next act.",
    audience: "Managers following a campaign proposal section by section.",
    notFor: "A report's numbered chapter, which wants a quieter break.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["row_cards", "bullets"], capacity: 1, itemCapacity: 5 },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
