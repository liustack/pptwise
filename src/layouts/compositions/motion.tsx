import type { Component } from "@/ir"
import { accessibleInk, blendOver, readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitYearbook,
  fitYearbookMono,
  paintYearbook,
  paintYearbookIcon,
  paintYearbookTracked,
  yearbookBaseline,
  yearbookInks,
  yearbookText,
  yearbookTrackedWidth,
} from "./yearbook"

type RowCards = Extract<Component, { type: "row_cards" }>
type Panel = Extract<Component, { type: "insight_panel" }>

/*
 * motion: what the committee is asked to decide, beside why, almanac's
 * 2026-10 board (the decision page, p02). On the left the background in two
 * to four rows, each its icon in the mark, a bold title and a muted line
 * under it, a hairline between rows. On the right the ask itself on a card
 * filled with the mark: its icon and its title tracked in a pale ink, then
 * each thing to decide numbered large in the mono face, its title bold in
 * the readable ink and a line under it, a pale hairline between them.
 *
 * Takes, in the yearbook setting: a `row_cards` of two to four items with no
 * highlight, tone or sub line, then an `insight_panel` of one to three rows
 * and no footnote.
 *
 * Declines: a title past one line, a row's text past two lines, an ask's
 * title past one line or its text past two, and rows taller than the band.
 *
 * Reads: the yearbook inks (`./yearbook.tsx`), the body, heading and mono
 * faces.
 */

const LIST = { w: 620, top: 10, pitch: 140, rule: 12, icon: 26, textX: 44, title: { size: 21, lineHeight: 30 }, text: { top: 38, size: 15, lineHeight: 26, maxLines: 2 } } as const
const CARD = { x: 660, top: 10, bottom: 12, pad: 32, r: 8 } as const
const HEAD = { top: 30, icon: 28, x: 40, size: 20, lineHeight: 30, tracking: 2 } as const
const ASK = { top: 104, pitch: 150, number: { size: 52, lineHeight: 60 }, x: 68, title: { top: 4, size: 26, lineHeight: 36 }, text: { top: 46, size: 15, lineHeight: 24, maxLines: 2 }, rule: 122 } as const
/** The pale words on the filled card: the readable ink over the mark at 88%, and the numbers at 70%. */
const PALE = 0.88
const NUMBER = 0.7

export const motionComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "yearbook") return null
  const [rows, panel, ...rest] = components
  if (rows?.type !== "row_cards" || panel?.type !== "insight_panel" || rest.length > 0) return null
  const r = rows as RowCards
  const p = panel as Panel
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => item.highlight || item.tone || item.sub?.trim())) return null
  if (p.rows.length < 1 || p.rows.length > 3 || p.footnote?.trim()) return null
  const inks = yearbookInks(ctx)
  const listW = LIST.w
  if (rect.w - CARD.x < 380) return null
  const pitch = Math.min(LIST.pitch, (rect.h - LIST.top) / n)
  const fitted = r.items.map((item) => ({
    title: fitYearbook(item.title, { width: listW - LIST.textX, size: LIST.title.size, lineHeight: LIST.title.lineHeight, maxLines: 1, bold: true }, ctx),
    text: item.text?.trim() ? fitYearbook(item.text, { width: listW - LIST.textX, size: LIST.text.size, lineHeight: LIST.text.lineHeight, maxLines: LIST.text.maxLines }, ctx) : null,
  }))
  if (fitted.some((f, i) => !f.title || (r.items[i]!.text?.trim() && !f.text))) return null
  if (fitted.some((f) => LIST.text.top + (f.text?.lines.length ?? 0) * LIST.text.lineHeight > pitch - LIST.rule)) return null

  const cardX = rect.x + CARD.x
  const cardW = rect.x + rect.w - cardX
  const cardTop = rect.y + CARD.top
  const cardH = rect.h - CARD.top - CARD.bottom
  const fill = inks.mark
  const on = readableOn(fill)
  const pale = (size: number) => accessibleInk(blendOver(on, fill, PALE), fill, size)
  const innerW = cardW - CARD.pad * 2
  const head = p.title.trim()
  const headX = cardX + CARD.pad + (p.icon ? HEAD.x : 0)
  if (yearbookTrackedWidth(head, HEAD.size, HEAD.tracking, ctx, true) > cardX + cardW - CARD.pad - headX) return null
  const asks = p.rows.map((row, i) => ({
    number: fitYearbookMono(String(i + 1), { width: ASK.x, size: ASK.number.size, lineHeight: ASK.number.lineHeight, maxLines: 1 }),
    title: fitYearbook(row.label, { width: innerW - ASK.x, size: ASK.title.size, lineHeight: ASK.title.lineHeight, maxLines: 1, bold: true }, ctx),
    text: fitYearbook(row.text, { width: innerW - ASK.x + 8, size: ASK.text.size, lineHeight: ASK.text.lineHeight, maxLines: ASK.text.maxLines }, ctx),
  }))
  if (asks.some((a) => !a.number || !a.title || !a.text)) return null
  const askPitch = Math.min(ASK.pitch, (cardH - ASK.top) / p.rows.length)
  if (asks.some((a) => ASK.text.top + a.text!.lines.length * ASK.text.lineHeight > askPitch)) return null

  return (
    <g {...compositionTag("motion")}>
      <g {...blockTag(ctx, r)}>
        {r.items.map((item, i) => {
          const y = rect.y + LIST.top + i * pitch
          const f = fitted[i]!
          return (
            <g key={i} data-yearbook-reason="">
              {i > 0 ? <rect x={rect.x} y={y - LIST.rule} width={listW} height={1} fill={inks.line} /> : null}
              {item.icon ? paintYearbookIcon(item.icon, rect.x, y + 4, LIST.icon, inks.mark, inks.ground) : null}
              {paintYearbook(f.title!, { ctx, x: rect.x + LIST.textX, top: y, bold: true, fill: yearbookText(inks.ink, inks.ground, LIST.title.size) })}
              {f.text ? paintYearbook(f.text, { ctx, x: rect.x + LIST.textX, top: y + LIST.text.top, fill: yearbookText(inks.muted, inks.ground, LIST.text.size) }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, p)} data-yearbook-motion="">
        <rect x={cardX} y={cardTop} width={cardW} height={cardH} rx={CARD.r} fill={fill} />
        {p.icon ? paintYearbookIcon(p.icon, cardX + CARD.pad, cardTop + HEAD.top, HEAD.icon, on, fill) : null}
        {paintYearbookTracked({ ctx, text: head, x: headX, y: yearbookBaseline(cardTop + HEAD.top, HEAD.lineHeight, HEAD.size), size: HEAD.size, tracking: HEAD.tracking, bold: true, fill: pale(HEAD.size) })}
        {asks.map((a, i) => {
          const y = cardTop + ASK.top + i * askPitch
          return (
            <g key={i} data-yearbook-ask="">
              {paintYearbook(a.number!, { ctx, x: cardX + CARD.pad, top: y, mono: true, bold: true, fill: accessibleInk(blendOver(on, fill, NUMBER), fill, ASK.number.size), ground: fill })}
              {paintYearbook(a.title!, { ctx, x: cardX + CARD.pad + ASK.x, top: y + ASK.title.top, bold: true, fill: accessibleInk(on, fill, ASK.title.size), ground: fill })}
              {paintYearbook(a.text!, { ctx, x: cardX + CARD.pad + ASK.x, top: y + ASK.text.top, fill: pale(ASK.text.size), ground: fill })}
              {i < asks.length - 1 ? <rect x={cardX + CARD.pad} y={y + ASK.rule} width={innerW - 4} height={1} fill={blendOver(on, fill, 0.25)} /> : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}
