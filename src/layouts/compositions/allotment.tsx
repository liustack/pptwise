import type { Component } from "@/ir"
import { isShareBar } from "@/ir/components/chart"
import { figureStyleOf, groupDigits, joinUnit, wholeValueDecimals, writtenFigure } from "../../lib/quantity-format"
import { mostlyChinese } from "../../lib/text-script"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, lighter, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine, type MarqueeInks } from "./marquee"

type Chart = Extract<Component, { type: "chart" }>
type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * allotment: a whole cut into shares, rally's 2026-10 board (the budget
 * page, p16). One tall bar across the page, each part as long as its share,
 * in the four confetti colours and then pale steps of the accent and the
 * grey, its share large in the dark ink at its top left. Under the run of
 * parts the page sets apart (the marked series) a bracket with end ticks and
 * the author's line for it (`emphasis_label`, 「单列 15%，不挪用」), and at the
 * left of that line, small and grey, the bar's own name (its category,
 * 「拟定比例」). A key three
 * to a row, each part's name and share, the set-apart ones bold. Under the
 * key a card or two with an icon (the first in the accent), a bold line and
 * a grey one.
 *
 * Takes, in the marquee setting: a share bar (`chart`, stacked, direction
 * horizontal) of two to eight parts with a run of adjacent parts marked and
 * an `emphasis_label`; then optionally an `icon_cards` of two or three
 * without tags.
 *
 * Declines: a share wider than its part at 20px, a key line past its third
 * of the measure, the bracket's line past one line or meeting the bar's
 * name, and a card's lines past one and two lines.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const BAR = { top: 32, h: 96, gap: 4, r: 6, share: { x: 14, baseline: 42, big: 26, small: 20, pad: 28, bigFrom: 150 } } as const
const BRACKET = { y: 142, tick: 6, w: 2, label: { baseline: 168, size: 14 }, caption: { size: 13 } } as const
const KEY = { top: 204, pitch: 40, col: 392, swatch: { dy: 6, size: 14, r: 3 }, x: 24, size: 15, lineHeight: 26 } as const
const CARDS = { top: 306, h: 110, gap: 32, pad: 24, icon: { y: 22, size: 24 }, title: { x: 60, top: 18, size: 20, lineHeight: 30 }, text: { x: 60, top: 54, size: 14, lineHeight: 22, maxLines: 2 } } as const
/** The shares past the four confetti colours: a pale step of the accent, then a pale lavender of the grey's own hue. */
const PALE = { fire: 0.5, lavender: { s: 0.56, l: 0.82 } } as const

/** `hex` in HSL, then back with its hue kept and the saturation and lightness given. */
function withHue(hex: string, s: number, l: number): string {
  const n = parseInt(hex.replace("#", ""), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => v / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  const h = d === 0 ? 0 : max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  const c = (1 - Math.abs(2 * l - 1)) * s
  const xx = c * (1 - Math.abs((h % 2) - 1))
  const m = l - c / 2
  const [r1, g1, b1] = h < 1 ? [c, xx, 0] : h < 2 ? [xx, c, 0] : h < 3 ? [0, c, xx] : h < 4 ? [0, xx, c] : h < 5 ? [xx, 0, c] : [c, 0, xx]
  const hex2 = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0")
  return `#${hex2(r1)}${hex2(g1)}${hex2(b1)}`.toUpperCase()
}

export function shareInks(n: number, inks: MarqueeInks): string[] {
  const pale = [lighter(inks.fire, PALE.fire), withHue(inks.muted, PALE.lavender.s, PALE.lavender.l)]
  return Array.from({ length: n }, (_, i) => (i < inks.confetti.length ? inks.confetti[i]! : pale[(i - inks.confetti.length) % pale.length]!))
}

export const allotmentComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [chart, cards, ...rest] = components
  if (chart?.type !== "chart" || rest.length > 0) return null
  if (cards !== undefined && (cards.type !== "icon_cards" || cards.items.length > 3 || cards.items.some((it) => it.tag))) return null
  const c = chart as Chart
  if (!isShareBar(c) || !c.emphasis_label?.trim() || c.series.length < 2 || c.series.length > 8) return null
  if (c.series.some((s) => s.tone || s.data.length !== 1 || !(s.data[0]!.y > 0) || s.data[0]!.note)) return null
  const marked = c.series.map((s) => s.emphasis === true)
  const from = marked.indexOf(true)
  const to = marked.lastIndexOf(true)
  if (from < 0 || marked.slice(from, to + 1).some((m) => !m)) return null
  if (rect.h < (cards ? CARDS.top + CARDS.h : KEY.top + Math.ceil(c.series.length / 3) * KEY.pitch)) return null
  const inks = marqueeInks(ctx)
  const fills = shareInks(c.series.length, inks)
  const unit = c.axes?.y_unit?.trim() || undefined
  const chinese = ctx.figures?.chinese ?? mostlyChinese(c.series.map((s) => s.name))
  const style = figureStyleOf(chinese)
  const total = c.series.reduce((sum, s) => sum + s.data[0]!.y, 0)
  const whole = wholeValueDecimals(c.series.map((s) => s.data[0]!.y))
  let cursor = rect.x
  const parts = c.series.map((s, i) => {
    const w = (s.data[0]!.y / total) * rect.w
    const share = joinUnit(groupDigits(writtenFigure(s.data[0]!.y, whole), style), unit)
    const room = w - BAR.gap - BAR.share.pad
    // A share stands at 26px on a part 150px wide or more, at 20px on a narrower one.
    const size = w >= BAR.share.bigFrom && marqueeWidth(share, BAR.share.big, ctx, true) <= room ? BAR.share.big : marqueeWidth(share, BAR.share.small, ctx, true) <= room ? BAR.share.small : 0
    const part = { name: s.name.trim(), share, x: cursor, w, size, fill: fills[i]!, i, marked: marked[i]! }
    cursor += w
    return part
  })
  if (parts.some((p) => p.size === 0)) return null
  const keyW = KEY.col - KEY.x - 16
  const keys = parts.map((p) => fitMarquee(`${p.name} · ${p.share}`, { width: keyW, size: KEY.size, lineHeight: KEY.lineHeight, maxLines: 1, bold: p.marked }, ctx))
  if (keys.some((k) => !k)) return null
  const runX0 = parts[from]!.x
  const runX1 = parts[to]!.x + parts[to]!.w - BAR.gap
  const label = fitMarquee(c.emphasis_label, { width: rect.w, size: BRACKET.label.size, lineHeight: BRACKET.label.size, maxLines: 1, bold: true }, ctx)
  if (!label) return null
  const labelW = marqueeWidth(c.emphasis_label, BRACKET.label.size, ctx, true)
  const labelX = Math.min(rect.x + rect.w - labelW / 2, Math.max(rect.x + labelW / 2, (runX0 + runX1) / 2))
  const caption = String(c.series[0]!.data[0]!.x).trim()
  const captionW = caption ? marqueeWidth(caption, BRACKET.caption.size, ctx) : 0
  if (caption && rect.x + captionW + 24 > Math.min(labelX - labelW / 2, runX0)) return null
  const ic = cards as IconCards | undefined
  const cardW = ic ? (rect.w - CARDS.gap * (ic.items.length - 1)) / ic.items.length : 0
  const cardFits = ic?.items.map((it) => ({
    it,
    title: fitMarquee(it.title, { width: cardW - CARDS.title.x - CARDS.pad, size: CARDS.title.size, lineHeight: CARDS.title.lineHeight, maxLines: 1, bold: true }, ctx),
    text: it.text.trim() ? fitMarquee(it.text, { width: cardW - CARDS.text.x - CARDS.pad, size: CARDS.text.size, lineHeight: CARDS.text.lineHeight, maxLines: CARDS.text.maxLines }, ctx) : null,
  }))
  if (cardFits?.some((f) => !f.title || (f.it.text.trim() && !f.text))) return null
  const y = (dy: number) => rect.y + dy

  return (
    <g {...compositionTag("allotment")}>
      <g {...blockTag(ctx, c)} data-marquee-allotment="">
        {parts.map((p) => {
          const part = <rect x={p.x} y={y(BAR.top)} width={Math.max(1, p.w - BAR.gap)} height={BAR.h} rx={BAR.r} fill={p.fill} />
          return (
            <g key={p.i} data-part={p.name}>
              {p.i === 0 ? <Lead id="part">{part}</Lead> : part}
              {paintMarqueeLine(p.share, { ctx, x: p.x + BAR.share.x, baseline: y(BAR.top + BAR.share.baseline), size: p.size, bold: true, fill: marqueeText(inks.onFire, p.fill, p.size) })}
            </g>
          )
        })}
        <g data-marquee-bracket="">
          <rect x={runX0} y={y(BRACKET.y) - BRACKET.w / 2} width={runX1 - runX0} height={BRACKET.w} fill={inks.ink} />
          <rect x={runX0 - BRACKET.w / 2} y={y(BRACKET.y - BRACKET.tick)} width={BRACKET.w} height={BRACKET.tick * 2} fill={inks.ink} />
          <rect x={runX1 - BRACKET.w / 2} y={y(BRACKET.y - BRACKET.tick)} width={BRACKET.w} height={BRACKET.tick * 2} fill={inks.ink} />
          {paintMarquee(label, { ctx, x: labelX, baseline: y(BRACKET.label.baseline), bold: true, anchor: "middle", fill: marqueeText(inks.ink, inks.ground, BRACKET.label.size), ground: inks.ground })}
        </g>
        {caption ? paintMarqueeLine(caption, { ctx, x: rect.x, baseline: y(BRACKET.label.baseline), size: BRACKET.caption.size, fill: marqueeText(inks.muted, inks.ground, BRACKET.caption.size) }) : null}
        {parts.map((p, i) => {
          const kx = rect.x + (i % 3) * KEY.col
          const ky = y(KEY.top + Math.floor(i / 3) * KEY.pitch)
          return (
            <g key={`k-${i}`}>
              <rect x={kx} y={ky + KEY.swatch.dy} width={KEY.swatch.size} height={KEY.swatch.size} rx={KEY.swatch.r} fill={p.fill} />
              {paintMarquee(keys[i]!, { ctx, x: kx + KEY.x, top: ky, bold: p.marked, fill: marqueeText(inks.ink, inks.ground, KEY.size), ground: inks.ground })}
            </g>
          )
        })}
      </g>
      {ic && cardFits ? (
        <g {...blockTag(ctx, ic)} data-marquee-terms="">
          {cardFits.map((f, i) => {
            const cx = rect.x + i * (cardW + CARDS.gap)
            const top = y(CARDS.top)
            return (
              <g key={i} data-term={f.it.title}>
                {paintMarqueeCard({ x: cx, y: top, w: cardW, h: CARDS.h }, inks)}
                {paintMarqueeIcon(f.it.icon, cx + CARDS.pad, top + CARDS.icon.y, CARDS.icon.size, i === 0 ? inks.fire : inks.muted, inks.card)}
                {paintMarquee(f.title!, { ctx, x: cx + CARDS.title.x, top: top + CARDS.title.top, bold: true, fill: marqueeText(inks.ink, inks.card, CARDS.title.size), ground: inks.card })}
                {f.text ? paintMarquee(f.text, { ctx, x: cx + CARDS.text.x, top: top + CARDS.text.top, fill: marqueeText(inks.muted, inks.card, CARDS.text.size), ground: inks.card }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
    </g>
  )
}
