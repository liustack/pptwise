import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import type { ComponentCtx } from "../components/types"
import { stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { stepAside } from "../render/step-aside"
import { DecorPiece } from "../motifs/decor-piece"
import { blockTag } from "./compositions/shared"
import { Confetti, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeIcon, ticketWidths, type Box } from "./compositions/marquee"
import { fitMarqueeSource, MARQUEE_LEFT, MARQUEE_TICKET_TOP, MARQUEE_W, MarqueeHead, MarqueeSource, MarqueeTicket, sectionTicket } from "./marquee-shared"
import { measureTextUnits } from "../lib/svg-text-layout"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/**
 * marquee-statement：活动策划案的一句话方案页，rally 2026-10 定稿（p02）重画。
 *
 * 没有标题栏：标题就是这一页。左上照样一张票根（分区编号和分区名，页面的
 * `kicker`）。标题在最后一个逗号处分成两截：前一截是 28px 幕影紫灰的引子
 * （「2027 年夏天，我们不进场馆抢冠名，」），逗号照印；后一截 72px 灯光白特粗，
 * 作者在里面换行（`\n`）就按作者的行断开，`**…**` 的词用洋红（「开场前」
 * 「散场后」）。大字最多两行。下面一条幕缝线，线下一排触点（页面的
 * `icon_cards`，洋红图标、20px 名字、15px 说明），或一段 20px 的话（`paragraph`）。
 *
 * 纸屑：上下各撒一带，上带 (60,40) 起 1160×120 十四枚，下带 (60,560) 起
 * 1160×120 十枚，种子是页号和页号加 20，落在字上的不画。右上那一小撮是
 * motif 的，这一页让掉（`decorKeepOut`）。页脚照样由 motif 印。
 *
 * 放不下（引子超过一行、大字超过两行、触点超过四个或说明超过两行，或者页上
 * 有触点和一段话以外的东西）就让位给通用页，通用页也放不下就声明丢弃。
 * 零 theme id、零 hex。
 */

const LEAD = { top: 196, size: 28, lineHeight: 40 } as const
const BIG = { top: 248, size: 72, lineHeight: 100, pitch: 112, maxLines: 2 } as const
const RULE = { y: 500, h: 1 } as const
const POINTS = { top: 528, max: 4, icon: { dy: 4, size: 26 }, x: 40, name: { size: 20, lineHeight: 30 }, desc: { top: 34, size: 15, lineHeight: 24, maxLines: 2 }, gap: 32, gutter: 24 } as const
const PARAGRAPH = { top: 528, size: 20, lineHeight: 30, maxLines: 3 } as const
const BANDS = [
  { region: { x: 60, y: 40, w: 1160, h: 120 }, count: 14, offset: 0 },
  { region: { x: 60, y: 560, w: 1160, h: 120 }, count: 10, offset: 20 },
] as const
/** Where the motif's fistful would land: this page throws its own. */
const PILE_KEEP_OUT = { x: 1080, y: 0, w: 200, h: 76 } as const

/** The heading cut at its last comma into the lead-in and the claim, the claim in the author's own lines. */
export function splitStatement(heading: string | undefined): { lead: string | null; lines: string[] } {
  const text = (heading ?? "").trim()
  const firstBreak = text.indexOf("\n")
  const head = firstBreak < 0 ? text : text.slice(0, firstBreak)
  let at = -1
  for (const m of head.matchAll(/，|, /gu)) at = m.index! + m[0].length
  const lead = at > 0 && head.slice(at).trim() ? text.slice(0, at).trim() : null
  const claim = lead ? text.slice(at).trim() : text
  return { lead, lines: claim.split("\n").map((line) => line.trim()).filter(Boolean) }
}

/** The claim's lines at 72px: each author's line wrapped to the measure, or `null` past two lines. */
function fitClaim(lines: readonly string[], ctx: ComponentCtx): EmphasisHeadingLayout[] | null {
  const out: EmphasisHeadingLayout[] = []
  for (const line of lines) {
    const fit = fitMarquee(line, { width: MARQUEE_W, size: BIG.size, lineHeight: BIG.pitch, maxLines: BIG.maxLines, bold: true }, ctx)
    if (!fit) return null
    out.push(fit)
  }
  return out.reduce((n, f) => n + f.lines.length, 0) <= BIG.maxLines ? out : null
}

function lineBox(text: string, x: number, top: number, size: number, lineHeight: number, ctx: ComponentCtx, bold: boolean): Box {
  return { x, y: top + (lineHeight - size) / 2, w: measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size, h: size * 1.1 }
}

export function MarqueeStatementContent(props: SvgTemplateProps) {
  const { ir, slide, ctx, index } = props
  const inks = marqueeInks(ctx)
  const { lead, lines } = splitStatement(slide.heading)
  const leadFit = lead ? fitMarquee(lead, { width: MARQUEE_W, size: LEAD.size, lineHeight: LEAD.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const claim = lines.length > 0 ? fitClaim(lines, ctx) : []
  const cards = slide.components.find((c): c is IconCards => c.type === "icon_cards")
  const paragraph = slide.components.find((c): c is Paragraph => c.type === "paragraph")
  const points = cards?.items ?? []
  // The board's three touchpoints stand 392px apart, the measure and one gutter shared out.
  const pitch = (MARQUEE_W + POINTS.gutter) / Math.max(3, points.length)
  const colW = pitch - POINTS.x - POINTS.gap
  const fitted = points.map((p) => ({
    p,
    name: fitMarquee(p.title, { width: colW, size: POINTS.name.size, lineHeight: POINTS.name.lineHeight, maxLines: 1, bold: true }, ctx),
    desc: p.text.trim() ? fitMarquee(p.text, { width: colW, size: POINTS.desc.size, lineHeight: POINTS.desc.lineHeight, maxLines: POINTS.desc.maxLines }, ctx) : null,
  }))
  const para = paragraph ? fitMarquee(paragraph.text, { width: MARQUEE_W, size: PARAGRAPH.size, lineHeight: PARAGRAPH.lineHeight, maxLines: PARAGRAPH.maxLines }, ctx) : null
  const fits =
    slide.components.length <= 1 &&
    slide.components.every((c) => c === cards || c === paragraph) &&
    (lead === null || leadFit !== null) &&
    claim !== null &&
    (!cards || (!cards.title?.trim() && points.length <= POINTS.max && fitted.every((f) => f.name && (f.desc || !f.p.text.trim()) && !f.p.tag && !f.p.tone))) &&
    (!paragraph || para !== null)
  if (!fits) {
    // This face draws one shape only, so anything else goes to the sheet,
    // and a page the sheet cannot hold either is declined here.
    return (
      stepAside({ face: "marquee-statement", slide, ctx, cramped: true }) ?? (
        <>
          <MarqueeHead ir={ir} slide={slide} ctx={ctx} />
          <g data-dropped={Math.max(1, slide.components.length)} data-dropped-kind="component" />
        </>
      )
    )
  }
  const source = fitMarqueeSource(slide, ctx)
  const ticket = sectionTicket(ir, slide)
  const keepOff: Box[] = []
  if (ticket) {
    const w = ticketWidths(ticket, ctx)
    keepOff.push({ x: MARQUEE_LEFT - 6, y: MARQUEE_TICKET_TOP - 6, w: w.stamp + w.label + 12, h: 42 })
  }
  if (lead) keepOff.push(lineBox(lead, MARQUEE_LEFT, LEAD.top, LEAD.size, LEAD.lineHeight, ctx, true))
  let row = 0
  for (const f of claim ?? []) {
    for (const line of f.lines) keepOff.push(lineBox(line, MARQUEE_LEFT, BIG.top + row++ * BIG.pitch, BIG.size, BIG.lineHeight, ctx, true))
  }
  fitted.forEach((f, i) => {
    const x = MARQUEE_LEFT + i * pitch
    keepOff.push({ x, y: POINTS.top, w: POINTS.x + Math.max(f.name ? marqueeWidth(f.p.title, POINTS.name.size, ctx, true) : 0, ...(f.desc?.lines ?? []).map((l) => marqueeWidth(l, POINTS.desc.size, ctx))), h: POINTS.desc.top + (f.desc?.lines.length ?? 0) * POINTS.desc.lineHeight })
  })
  if (para) keepOff.push({ x: MARQUEE_LEFT, y: PARAGRAPH.top, w: MARQUEE_W, h: para.lines.length * PARAGRAPH.lineHeight })
  if (source) keepOff.push({ x: MARQUEE_LEFT, y: 650, w: 1000, h: source.lines.length * 16 })
  const pageNo = index + 1
  let bigRow = 0
  return (
    <>
      <DecorPiece id="confetti" role="identity">
        <Confetti throws={BANDS.map((band) => ({ seed: pageNo + band.offset, region: band.region, count: band.count }))} colors={inks.confetti} keepOff={keepOff} />
      </DecorPiece>
      <MarqueeTicket text={ticket} ctx={ctx} />
      <g data-marquee-statement="">
        {leadFit ? <g data-marquee-lead-in="">{paintMarquee(leadFit, { ctx, x: MARQUEE_LEFT, top: LEAD.top, bold: true, fill: marqueeText(inks.muted, inks.ground, LEAD.size), ground: inks.ground })}</g> : null}
        {(claim ?? []).map((f, i) => {
          const top = BIG.top + bigRow * BIG.pitch
          bigRow += f.lines.length
          return (
            <g key={i} data-marquee-claim-line={i}>
              {paintMarquee(f, { ctx, x: MARQUEE_LEFT, baseline: marqueeBaselineOf(top), bold: true, fill: marqueeText(inks.ink, inks.ground, BIG.size), ground: inks.ground, runInk: marqueeText(inks.fire, inks.ground, BIG.size), lastAttrs: i < (claim?.length ?? 0) - 1 ? { "data-author-break": "1" } : undefined })}
            </g>
          )
        })}
      </g>
      {cards || paragraph ? <rect x={MARQUEE_LEFT} y={RULE.y} width={MARQUEE_W} height={RULE.h} fill={inks.line} /> : null}
      {cards ? (
        <g {...blockTag(ctx, cards)} data-marquee-points="">
          {fitted.map((f, i) => {
            const x = MARQUEE_LEFT + i * pitch
            return (
              <g key={i}>
                {paintMarqueeIcon(f.p.icon, x, POINTS.top + POINTS.icon.dy, POINTS.icon.size, inks.fire, inks.ground)}
                {f.name ? paintMarquee(f.name, { ctx, x: x + POINTS.x, top: POINTS.top, bold: true, fill: marqueeText(inks.ink, inks.ground, POINTS.name.size), ground: inks.ground }) : null}
                {f.desc ? paintMarquee(f.desc, { ctx, x: x + POINTS.x, top: POINTS.top + POINTS.desc.top, fill: marqueeText(inks.muted, inks.ground, POINTS.desc.size), ground: inks.ground }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
      {paragraph && para ? <g {...blockTag(ctx, paragraph)}>{paintMarquee(para, { ctx, x: MARQUEE_LEFT, top: PARAGRAPH.top, fill: marqueeText(inks.muted, inks.ground, PARAGRAPH.size), ground: inks.ground })}</g> : null}
      <MarqueeSource source={source} ctx={ctx} />
    </>
  )
}

/** The baseline of a 72px claim line in its 100px box, as the board's browser set it. */
function marqueeBaselineOf(top: number): number {
  return Math.round(top + BIG.lineHeight / 2 + BIG.size * 0.385)
}

export const layoutDef = {
  // marquee-statement: rally's one-line plan. No title bar: the heading is
  // the page, cut at its last comma into a grey lead-in and the claim set
  // huge, the author's marked words in the accent, then a rule and the
  // touchpoints under it. Confetti thrown in two bands above and below.
  id: "marquee-statement",
  kind: "standard",
  story: {
    name: "Marquee Statement",
    story:
      "The whole plan in one sentence: a grey lead-in, then the claim set huge in two lines with its key words in the lead colour, a rule, and the few touchpoints that carry it out, under two bands of confetti.",
    positioning: "States a campaign's idea before the case for it. Choose it for the page a room should be able to repeat after the meeting.",
    audience: "Managers hearing a campaign proposal for the first time.",
    notFor: "A finding or a figure, which belongs on a page that shows its evidence.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "body", accepts: ["icon_cards", "paragraph"], capacity: 1, itemCapacity: POINTS.max },
  ],
  pageFields: ["kicker"],
  subheading: { none: "fold it into the heading before its last comma, where this face sets its grey lead-in, or remove it" },
  decorKeepOut: [PILE_KEEP_OUT],
  headingFit: { maxWidth: MARQUEE_W, fontSize: BIG.size, maxLines: 3, minPt: LEAD.size, bold: true, lineHeightRatio: BIG.pitch / BIG.size },
} satisfies LayoutDefinition
