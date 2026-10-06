import type React from "react"
import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { ComponentCtx } from "../components/types"
import { stripEmphasis } from "../render/emphasis"
import { DecorPiece } from "../motifs/decor-piece"
import { PitchScrim } from "./compositions/pitch"
import { blockTag } from "./compositions/shared"
import { Confetti, fitMarquee, marqueeBaseline, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeIcon, paintMarqueeLine, ticketWidths, type Box, type MarqueeInks } from "./compositions/marquee"
import { boundarySlotBlock, drawableItems } from "./boundary-content"
import { MarqueeTicket } from "./marquee-shared"
import { fitDossierTitle } from "./dossier-shared"
import { headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"

type Bullets = Extract<Component, { type: "bullets" }>
type RowCards = Extract<Component, { type: "row_cards" }>

/**
 * marquee-cover：活动策划案的封面，rally 2026-10 定稿（p01）重画。
 *
 * 一张满版照片（页面自己的 `background` 资产）铺在底下，从下往上压一层页面
 * 底色的渐暗（97% → 40% 处 75% → 72% 处 10%），字都站在下面暗的那一截。左上
 * 一张票根：洋红票面上是页面的 `kicker`（「提案」），侧幕紫票身上是发文单位
 * 和日期（`meta.organization`、`meta.date`，「市场部 · 2026 年 10 月」）。标题
 * 72px 特粗，一行放得下就一行，末行基线落在 y475；下面一行 26px 洋红副题；
 * 最下一排描边胶囊（页面的 `row_cards`，每项一个洋红图标和一个名字；或者
 * `bullets`，没有图标）。右下撒一把纸屑：(900,380) 起 340×200 十二枚，种子
 * 是页号，落在字上的不画。
 *
 * 没有照片时，同样的字排在幕布深紫上。不画 motif，页脚不画（共享页脚只上
 * 内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const TICKET = { top: 64 } as const
const TITLE = { foot: 490, size: 72, lineHeight: 86, minPt: 48, w: 1100 } as const
const SUB = { top: 498, size: 26, lineHeight: 40, maxLines: 1, w: 1100 } as const
const PILLS = { top: 576, h: 40, size: 15, border: 1.5, icon: { x: 14, dy: 10, size: 18 }, padIcon: 42, pad: 18, gap: 12, max: 5, w: 1152 } as const
const BURST = { region: { x: 900, y: 380, w: 340, h: 200 }, count: 12 } as const
const SCRIM = [
  { offset: "0%", opacity: 0.97 },
  { offset: "40%", opacity: 0.75 },
  { offset: "72%", opacity: 0.1 },
] as const

/** The cover's or the close's title: bold, on one line whenever it fits and broken at a comma when not, its last line box ending at `foot`. */
export function MarqueeBigTitle({ heading, ctx, inks, foot, size, lineHeight, minPt, w }: { heading: string | undefined; ctx: ComponentCtx; inks: MarqueeInks; foot: number; size: number; lineHeight: number; minPt: number; w: number }): React.ReactElement {
  const title = fitDossierTitle(heading, ctx, size, lineHeight, minPt, w)
  const ink = marqueeText(inks.ink, inks.ground, title.fontSize)
  const last = marqueeBaseline(foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  return (
    <g data-marquee-title="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: inks.ground, accent: marqueeText(inks.fire, inks.ground, title.fontSize) }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/** The pills a cover or a chapter sets: from a `row_cards` with a title and an icon each, or a plain `bullets`. */
export function pillItems(slide: SvgTemplateProps["slide"]): { block: Bullets | RowCards; items: { text: string; icon?: string }[] } | null {
  const block = boundarySlotBlock(slide, ["row_cards", "bullets"]) as Bullets | RowCards | undefined
  if (!block) return null
  if (block.type === "bullets") return { block, items: drawableItems(block.items).map((text) => ({ text: stripEmphasis(text).trim() })) }
  return { block, items: block.items.map((item) => ({ text: stripEmphasis(item.title).trim(), icon: item.icon })) }
}

/** Whether a `row_cards` carries only what a pill can show: a title and an icon. */
export function pillsWhole(block: Bullets | RowCards): boolean {
  return block.type === "bullets" || block.items.every((item) => !item.text?.trim() && !item.sub?.trim() && !item.highlight && !item.tone)
}

export function Pills({ items, block, ctx, inks, top }: { items: { text: string; icon?: string }[]; block: Bullets | RowCards; ctx: ComponentCtx; inks: MarqueeInks; top: number }): React.ReactElement {
  const widths = items.map((item) => Math.round(marqueeWidth(item.text, PILLS.size, ctx, true) + (item.icon ? PILLS.padIcon : PILLS.pad) + PILLS.pad))
  let cursor = LEFT
  return (
    <g {...blockTag(ctx, block)} data-marquee-pills="">
      {items.map((item, i) => {
        const x = cursor
        const w = widths[i]!
        cursor += w + PILLS.gap
        return (
          <g key={i}>
            <rect x={x + PILLS.border / 2} y={top + PILLS.border / 2} width={w - PILLS.border} height={PILLS.h - PILLS.border} rx={(PILLS.h - PILLS.border) / 2} fill="none" stroke={inks.line} strokeWidth={PILLS.border} />
            {item.icon ? paintMarqueeIcon(item.icon, x + PILLS.icon.x, top + PILLS.icon.dy, PILLS.icon.size, inks.fire, inks.ground) : null}
            {paintMarqueeLine(item.text, { ctx, x: x + (item.icon ? PILLS.padIcon : PILLS.pad), top: top + PILLS.border, lineHeight: PILLS.h - 3, size: PILLS.size, bold: true, fill: marqueeText(inks.ink, inks.ground, PILLS.size) })}
          </g>
        )
      })}
    </g>
  )
}

/** Whether `items` fit their row as pills. */
export function pillsFit(items: { text: string; icon?: string }[], ctx: ComponentCtx): boolean {
  if (items.length === 0 || items.length > PILLS.max) return false
  const total = items.reduce((sum, item) => sum + Math.round(marqueeWidth(item.text, PILLS.size, ctx, true) + (item.icon ? PILLS.padIcon : PILLS.pad) + PILLS.pad), 0)
  return total + PILLS.gap * (items.length - 1) <= PILLS.w
}

export function MarqueeCover({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = marqueeInks(ctx)
  const photo = slide.background?.kind === "asset"
  const label = [ir.meta.organization?.trim(), ir.meta.date?.trim()].filter((part): part is string => Boolean(part)).join(" · ")
  const ticket = slide.kicker?.trim() || label ? { stamp: slide.kicker?.trim() || undefined, label: label || undefined } : null
  const sub = slide.subheading?.trim() ? fitMarquee(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, bold: true }, ctx) : null
  const pills = pillItems(slide)
  const pillsDrawn = pills !== null && pillsWhole(pills.block) && pillsFit(pills.items, ctx)
  const keepOff: Box[] = []
  if (ticket) {
    const w = ticketWidths(ticket, ctx)
    keepOff.push({ x: LEFT - 6, y: TICKET.top - 6, w: w.stamp + w.label + 12, h: 42 })
  }
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  title.lines.forEach((line, i) => keepOff.push({ x: LEFT, y: TITLE.foot - (title.lines.length - i) * title.lineHeight, w: marqueeWidth(line, title.fontSize, ctx, true), h: title.lineHeight }))
  if (sub) keepOff.push({ x: LEFT, y: SUB.top, w: Math.max(...sub.lines.map((l) => marqueeWidth(l, SUB.size, ctx, true))), h: SUB.lineHeight })
  if (pillsDrawn) keepOff.push({ x: LEFT, y: PILLS.top, w: PILLS.w, h: PILLS.h })
  return (
    <>
      {photo ? <PitchScrim id={`marquee-cover-scrim-${index}`} ink={inks.ground} axis="y" stops={SCRIM} /> : null}
      <DecorPiece id="confetti" role="identity">
        <Confetti throws={[{ seed: index + 1, region: BURST.region, count: BURST.count }]} colors={inks.confetti} keepOff={keepOff} />
      </DecorPiece>
      <MarqueeTicket text={ticket} ctx={ctx} y={TICKET.top} />
      <MarqueeBigTitle heading={slide.heading} ctx={ctx} inks={inks} foot={TITLE.foot} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} w={TITLE.w} />
      {sub ? <g data-marquee-cover-sub="">{paintMarquee(sub, { ctx, x: LEFT, top: SUB.top, bold: true, fill: marqueeText(inks.fire, inks.ground, SUB.size), ground: inks.ground })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {pills ? pillsDrawn ? <Pills items={pills.items} block={pills.block} ctx={ctx} inks={inks} top={PILLS.top} /> : <g data-dropped={pills.items.length} data-dropped-kind="item" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-marquee-cover.tsx: rally's campaign cover. A photograph darkened
  // up from the foot, a ticket stub with what the deck is and who brings it
  // when, the title huge, the campaign's line in the accent and its facts as
  // pills, a burst of confetti at the right.
  id: "marquee-cover",
  kind: "standard",
  story: {
    name: "Marquee Cover",
    story: "A photograph darkens toward the foot, where the title stands huge over the campaign's line in the lead colour and its facts as pills. A ticket stub names what the deck is and who brings it when, and confetti lands at the right.",
    positioning: "Opens a campaign or event proposal. Choose it when the first page should already feel like the night the plan is for.",
    audience: "Managers about to hear a campaign, launch or event proposal.",
    notFor: "A report or a briefing, which wants a cover without a crowd and confetti.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "body", accepts: ["row_cards", "bullets"], capacity: 1, itemCapacity: PILLS.max },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  suppressMotif: true,
  // Over the ticket.
  coverMark: { x: LEFT, y: 44 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
