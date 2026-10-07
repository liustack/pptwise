import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { groupDigits } from "../../lib/quantity-format"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  DrawnBox,
  boardY,
  crayonFigureWidth,
  crayonInks,
  crayonText,
  crayonTint,
  crayonWidth,
  fitCrayon,
  inkOn,
  paintCrayon,
  paintCrayonFigure,
  paintCrayonIcon,
  paintCrayonLine,
  crayonBaseline,
  placeCrayonClaim,
  placeCrayonSource,
} from "./crayonbox"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>
type Waterfall = Extract<Component, { type: "waterfall" }>

/*
 * waiver: what a rule covers and what it does not, with its reach and a
 * worked example, crayon's 2026-10 board (p04). Two cards drawn by hand side
 * by side: what is in, in the leaf green with its symbol in a green disc and
 * its name in green, and what is out, in the tangerine with its symbol in an
 * orange disc. Each line the author wrote into a card is a point of its own.
 * Under them a sunny yellow block with the reach set large (`kpi_cards` of
 * one), and a white block with the example worked out as a sum across it
 * (`waterfall`): its title, then each figure with what it is under it, the
 * figures taken away in the leaf green, the amount left in the burnt orange,
 * with a minus or a plus between them and an equals before the total.
 *
 * Takes, in the crayonbox setting: an untitled `icon_cards` of two, each
 * card with a symbol and one to three lines, a `kpi_cards` of one with a
 * label, and a titled `waterfall` of two to four items, its last a total.
 *
 * Declines: a card with a tag or a tone, a line or a figure past its room,
 * a figure card with a note, a tag, a delta, a source or a symbol, a
 * waterfall with notes or marks, or whose items do not add up to its total.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const CARDS = { top: 190, h: 290, w: 520, gap: 32, r: 22 } as const
const DISC = { x: 46, y: 46, r: 26, icon: 28 } as const
const NAME = { x: 86, top: 26, size: 26, lineHeight: 40 } as const
const POINT = { x: 32, top: 100, size: 18, lineHeight: 26, gap: 32, inset: 18 } as const
const BLOCKS = { top: 500, h: 120, r: 22 } as const
const REACH = { w: 300, inset: 22, figure: { top: 12, lineHeight: 56, size: 44, unit: 18 }, label: { top: 72, size: 13, lineHeight: 20, maxLines: 2, w: 270 } } as const
const SUM = { gap: 26, inset: 24, title: { top: 12, size: 14, lineHeight: 24 }, figure: { top: 40, lineHeight: 44, size: 34, w: 150 }, sign: { w: 40, size: 30 }, label: { top: 86, size: 12, lineHeight: 20 } } as const

/** A figure as the sum prints it: its digits grouped the deck's way, its unit after a space. */
function sumFigure(value: number, unit: string | undefined, chinese: boolean): string {
  const v = Math.abs(value)
  const whole = Number.isInteger(v) ? groupDigits(String(v), chinese) : String(v)
  return unit?.trim() ? `${whole} ${unit.trim()}` : whole
}

export const waiverComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [cards, kpi, bridge, ...rest] = components
  if (cards?.type !== "icon_cards" || kpi?.type !== "kpi_cards" || bridge?.type !== "waterfall" || rest.length > 0) return null
  const c = cards as IconCards
  if (c.title?.trim() || c.items.length !== 2 || c.items.some((it) => it.tag || it.tone)) return null
  const reach = (kpi as Kpi).items
  if (reach.length !== 1 || reach.some((it) => it.note || it.tag || it.delta || it.tone || it.source || it.icon || !it.label.trim())) return null
  const w = bridge as Waterfall
  const title = w.title?.trim()
  if (!title || w.emphasis_label || w.items.some((it) => it.note || it.emphasis)) return null
  const steps = w.items
  if (steps.length < 2 || steps.length > 4 || steps[steps.length - 1]!.kind !== "total" || steps.slice(0, -1).some((s) => s.kind === "total")) return null
  const total = steps[steps.length - 1]!.value
  const running = steps.slice(0, -1).reduce((sum, s) => sum + s.value, 0)
  if (Math.abs(running - total) > 1e-9 || steps[0]!.value < 0) return null

  const cardW = (rect.w - 16 - CARDS.gap) / 2 >= CARDS.w ? CARDS.w : (rect.w - 16 - CARDS.gap) / 2
  const pointW = cardW - POINT.x - POINT.inset
  const names = c.items.map((it) => fitCrayon(it.title, { width: cardW - NAME.x - 20, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, weight: 900 }, ctx))
  if (names.some((n) => !n)) return null
  const points = c.items.map((it) => {
    const lines = it.text.split(/\n+/u).map((l) => l.trim()).filter(Boolean)
    if (lines.length < 1 || lines.length > 3) return null
    const fitted = lines.map((l) => fitCrayon(`· ${l}`, { width: pointW, size: POINT.size, lineHeight: POINT.lineHeight, maxLines: 2, weight: 600 }, ctx))
    if (fitted.some((f) => !f)) return null
    const height = fitted.reduce((sum, f) => sum + f!.lines.length * POINT.lineHeight + POINT.gap, -POINT.gap)
    return POINT.top + height <= CARDS.h - 16 ? fitted.map((f) => f!) : null
  })
  if (points.some((p) => !p)) return null

  const chinese = /\p{Script=Han}/u.test(title + steps.map((s) => s.label).join(""))
  const figures = steps.map((s) => sumFigure(s.value, w.unit, chinese))
  const sumW = rect.w - 16 - REACH.w - SUM.gap - (rect.w - 16 - 2 * cardW - CARDS.gap)
  // Each figure stands in a slot of the board's 150px, wider when a figure or its label needs it and the sum still fits.
  const slotW = Math.max(SUM.figure.w, ...figures.map((f) => crayonWidth(f, SUM.figure.size, ctx, { weight: 900, heading: true }) + 10), ...steps.map((s) => crayonWidth(s.label, SUM.label.size, ctx, { weight: 600 }) - 8))
  if (steps.length * slotW + (steps.length - 1) * SUM.sign.w > sumW - SUM.inset * 2) return null
  if (crayonWidth(title, SUM.title.size, ctx, { weight: 800 }) > sumW - SUM.inset * 2) return null
  const reachItem = reach[0]!
  if (crayonFigureWidth(reachItem.value, reachItem.unit, REACH.figure.size, REACH.figure.unit, ctx) > REACH.w - REACH.inset * 2) return null
  const reachLabel = fitCrayon(reachItem.label, { width: REACH.label.w, size: REACH.label.size, lineHeight: REACH.label.lineHeight, maxLines: REACH.label.maxLines, weight: 700 }, ctx)
  if (!reachLabel) return null

  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52, top: boardY(rect, 640) })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const sides = [
    { line: inks.leaf, fill: crayonTint(inks.green, inks), disc: inks.leaf, name: inks.leaf },
    { line: inks.orange, fill: crayonTint(inks.orange, inks), disc: inks.orange, name: inks.ink },
  ]
  const top = boardY(rect, CARDS.top)
  const blocks = boardY(rect, BLOCKS.top)
  const sumX = rect.x + REACH.w + SUM.gap
  const reachFill = inks.yellow
  return (
    <g {...compositionTag("waiver")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {c.items.map((it, i) => {
          const side = sides[i]!
          const x = rect.x + i * (cardW + CARDS.gap)
          let y = top + POINT.top
          return (
            <g key={i} data-crayon-side={stripEmphasis(it.title).trim()}>
              <DrawnBox box={{ x, y: top, w: cardW, h: CARDS.h }} color={side.line} fill={side.fill} r={CARDS.r} />
              <circle cx={x + DISC.x} cy={top + DISC.y} r={DISC.r} fill={side.disc} />
              {paintCrayonIcon(it.icon, x + DISC.x - DISC.icon / 2, top + DISC.y - DISC.icon / 2, DISC.icon, inkOn(side.disc, inks, 16), side.disc, { stroke: 3 })}
              {paintCrayon(names[i]!, { ctx, x: x + NAME.x, top: top + NAME.top, weight: 900, heading: true, fill: crayonText(side.name, side.fill, NAME.size), ground: side.fill })}
              {points[i]!.map((p, k) => {
                const at = y
                y += p.lines.length * POINT.lineHeight + POINT.gap
                return <g key={k}>{paintCrayon(p, { ctx, x: x + POINT.x, top: at, weight: 600, fill: crayonText(inks.ink, side.fill, POINT.size), ground: side.fill })}</g>
              })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, kpi)} data-crayon-reach="">
        <rect x={rect.x} y={blocks} width={REACH.w} height={BLOCKS.h} rx={BLOCKS.r} fill={reachFill} />
        {paintCrayonFigure({ ctx, value: reachItem.value, unit: reachItem.unit, x: rect.x + REACH.inset, baseline: crayonBaseline(blocks + REACH.figure.top, REACH.figure.lineHeight, REACH.figure.size), size: REACH.figure.size, unitSize: REACH.figure.unit, fill: inkOn(reachFill, inks, REACH.figure.unit) })}
        {paintCrayon(reachLabel, { ctx, x: rect.x + REACH.inset, top: blocks + REACH.label.top, weight: 700, fill: inkOn(reachFill, inks, REACH.label.size), ground: reachFill })}
      </g>
      <g {...blockTag(ctx, bridge)} data-crayon-sum="">
        <rect x={sumX} y={blocks} width={sumW} height={BLOCKS.h} rx={BLOCKS.r} fill={inks.card} />
        {paintCrayonLine(title, { ctx, x: sumX + SUM.inset, top: blocks + SUM.title.top, lineHeight: SUM.title.lineHeight, size: SUM.title.size, weight: 800, fill: crayonText(inks.muted, inks.card, SUM.title.size), ground: inks.card })}
        {steps.map((s, i) => {
          const x = sumX + SUM.inset + i * (slotW + SUM.sign.w)
          const last = i === steps.length - 1
          const ink = last ? inks.rust : i > 0 && s.value < 0 ? inks.leaf : inks.ink
          const sign = i === 0 ? null : last ? "=" : s.value < 0 ? "−" : "+"
          return (
            <g key={i} data-crayon-term={s.label}>
              {sign ? paintCrayonLine(sign, { ctx, x: x - SUM.sign.w / 2, top: blocks + SUM.figure.top, lineHeight: SUM.figure.lineHeight, size: SUM.sign.size, weight: 900, anchor: "middle", fill: crayonText(inks.muted, inks.card, SUM.sign.size), ground: inks.card }) : null}
              {paintCrayonLine(figures[i]!, { ctx, x: x + slotW / 2, top: blocks + SUM.figure.top, lineHeight: SUM.figure.lineHeight, size: SUM.figure.size, weight: 900, heading: true, anchor: "middle", fill: crayonText(ink, inks.card, SUM.figure.size), ground: inks.card })}
              {paintCrayonLine(s.label, { ctx, x: x + slotW / 2, top: blocks + SUM.label.top, lineHeight: SUM.label.lineHeight, size: SUM.label.size, weight: 600, anchor: "middle", fill: crayonText(inks.muted, inks.card, SUM.label.size), ground: inks.card })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
