import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitLesson,
  lessonInks,
  lessonText,
  lessonWidth,
  paintLesson,
  paintLessonCard,
  paintLessonEdge,
  paintLessonIcon,
  paintLessonLine,
  fillUnderWhite,
  glossBreak,
  splitLead,
  type LessonInks,
} from "./lesson"

type Pyramid = Extract<Component, { type: "pyramid" }>
type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * tiers: levels from the most guarded down, each with what to do with it,
 * homeroom's 2026-10 board (the information grades page, p16). A pyramid on
 * the left, a band a level widening downward, each in its tone's ink (red,
 * amber, green, `layers[].tone`) or, with no tones, in the mark stepping
 * paler, its name in white on it. From each band a dashed line in its ink
 * runs right to a card, the card of the `icon_cards` in the same place: a
 * 4px edge in the band's ink down its left, its icon and what to do bold in
 * that ink, then 「例如」 ("For example") muted over the examples, when the
 * card's text is written 「例如：…」.
 *
 * Takes, in the lesson setting: a `pyramid` of two to four levels with no
 * notes, then an `icon_cards` with one card per level.
 *
 * Declines: a level's name wider than its band, what to do past one line,
 * the examples past one line (or a text with no lead past two), and levels
 * taller than the band.
 *
 * Reads: the lesson inks (`./lesson.tsx`), the body and heading faces.
 */

const BANDS = { top: 4, pitch: 136, h: 124, cx: 256, topW: 200, grow: 110, label: { baseline: 70, size: 17 } } as const
const LINK = { dy: 62, gap: 10, end: 536 } as const
const CARD = { x: 546, pad: 20, icon: { top: 22, size: 24 }, action: { x: 56, top: 20, size: 20, lineHeight: 30 }, lead: { top: 62, size: 12, lineHeight: 20 }, text: { top: 82, size: 15, lineHeight: 24 } } as const

function tierInk(layer: Pyramid["layers"][number], i: number, n: number, inks: LessonInks): string {
  if (layer.tone) return inks[layer.tone]
  return blendOver(inks.ghost, inks.mark, n <= 1 ? 0 : (i / (n - 1)) * 0.6)
}

export const tiersComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "lesson") return null
  const [pyramid, cards, ...rest] = components
  if (pyramid?.type !== "pyramid" || cards?.type !== "icon_cards" || rest.length > 0) return null
  const p = pyramid as Pyramid
  const c = cards as IconCards
  const n = p.layers.length
  if (n < 2 || n > 4 || c.items.length !== n || p.layers.some((l) => l.note?.trim()) || c.items.some((item) => item.tag)) return null
  if (BANDS.top + (n - 1) * BANDS.pitch + BANDS.h > rect.h || rect.w < CARD.x + 420) return null
  const inks = lessonInks(ctx)
  const cardX = rect.x + CARD.x
  const cardW = rect.x + rect.w - cardX
  const inner = cardW - CARD.pad * 2
  const tiers = p.layers.map((layer, i) => {
    const ink = tierInk(layer, i, n, inks)
    const item = c.items[i]!
    const split = splitLead(item.text)
    return {
      layer,
      item,
      ink,
      fill: fillUnderWhite(ink, BANDS.label.size),
      topW: BANDS.topW + i * BANDS.grow,
      labelFits: lessonWidth(layer.label, BANDS.label.size, ctx, true) <= BANDS.topW + i * BANDS.grow - 24,
      action: fitLesson(item.title, { width: cardW - CARD.action.x - CARD.pad, size: CARD.action.size, lineHeight: CARD.action.lineHeight, maxLines: 1, bold: true }, ctx),
      lead: split?.lead ?? null,
      sep: split?.sep,
      text: fitLesson(split?.rest ?? item.text, { width: inner, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: split ? 1 : 2 }, ctx),
    }
  })
  if (tiers.some((t) => !t.labelFits || !t.action || !t.text || (t.lead && lessonWidth(t.lead, CARD.lead.size, ctx, true) > inner))) return null
  // The board centres the pyramid at x320; a base wider than that leaves the band, so the pyramid moves right just enough to stay in it.
  const cx = rect.x + Math.max(BANDS.cx, (BANDS.topW + n * BANDS.grow) / 2)

  return (
    <g {...compositionTag("tiers")}>
      <g {...blockTag(ctx, p)} data-lesson-pyramid="">
        {tiers.map((t, i) => {
          const y = rect.y + BANDS.top + i * BANDS.pitch
          const bottomW = t.topW + BANDS.grow
          return (
            <g key={i} data-lesson-tier={t.layer.tone ?? ""}>
              <polygon points={`${cx - t.topW / 2},${y} ${cx + t.topW / 2},${y} ${cx + bottomW / 2},${y + BANDS.h} ${cx - bottomW / 2},${y + BANDS.h}`} fill={t.fill} />
              {paintLessonLine(t.layer.label, { ctx, x: cx, baseline: y + BANDS.label.baseline, size: BANDS.label.size, bold: true, anchor: "middle", fill: lessonText("#FFFFFF", t.fill, BANDS.label.size) })}
              <line x1={cx + (t.topW + BANDS.grow / 2) / 2 + LINK.gap} y1={y + LINK.dy} x2={rect.x + LINK.end} y2={y + LINK.dy} stroke={t.ink} strokeWidth={1.5} strokeDasharray="4 3" />
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, c)}>
        {tiers.map((t, i) => {
          const y = rect.y + BANDS.top + i * BANDS.pitch
          const box = { x: cardX, y, w: cardW, h: BANDS.h }
          return (
            <g key={i} data-lesson-grade="">
              {paintLessonCard(box, inks)}
              {paintLessonEdge(box, t.ink, { side: "left" })}
              {paintLessonIcon(t.item.icon, cardX + CARD.pad, y + CARD.icon.top, CARD.icon.size, t.ink, inks.paper)}
              {paintLesson(t.action!, { ctx, x: cardX + CARD.action.x, top: y + CARD.action.top, bold: true, fill: lessonText(t.ink, inks.paper, CARD.action.size), ground: inks.paper })}
              {t.lead ? paintLessonLine(t.lead, { ctx, x: cardX + CARD.pad, top: y + CARD.lead.top, lineHeight: CARD.lead.lineHeight, size: CARD.lead.size, bold: true, fill: lessonText(inks.muted, inks.paper, CARD.lead.size), attrs: glossBreak(t.sep) }) : null}
              {paintLesson(t.text!, { ctx, x: cardX + CARD.pad, top: y + (t.lead ? CARD.text.top : CARD.lead.top), fill: lessonText(inks.ink, inks.paper, CARD.text.size), ground: inks.paper })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
