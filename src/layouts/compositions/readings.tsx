import type React from "react"
import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { isShareBar, shareCaption, shareParts } from "../../components/share-bar"
import { joinUnit, writtenDecimals } from "../../lib/quantity-format"
import {
  chipInk,
  chipWidth,
  dossierInks,
  dossierOn,
  dossierSolid,
  dossierText,
  dossierTone,
  dossierWidth,
  fitDossier,
  paintChip,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  paintTopEdge,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"
import type { ComponentCtx } from "../../components/types"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Chart = Extract<Component, { type: "chart" }>

/*
 * readings: why now, in two or four figures and the whole they sit in,
 * clinic's 2026-10 board (the background page, p03). The figures stand on
 * cards in a row: each card its icon, the capsule naming its source at the
 * top right (the item's `tag`, outlined in its evidence kind's ink), the
 * figure large and bold, its label bold under it and its note muted under
 * that. The figure the page argues from (`**…**` around its value) is in the
 * mark, its card's top edge a 3px rule of the mark; the others' top edges
 * are the hairline's ink.
 *
 * Under the cards a share bar may stand: one whole across the body cut into
 * its parts (a `stacked` chart on its side with one category), the
 * category's name over it in bold, each part's name and share inside it, and
 * under it the total of the parts the author marks (`emphasis` on their
 * series), the board's 「超重和肥胖合计 50.7%」. Marked parts take the mark
 * and then the accent, made dark enough for white words; the rest step back
 * to the mark's pale tint with muted words.
 *
 * Takes, in the dossier setting: one `kpi_cards` of two to four items, each
 * with an icon and none with a delta or a source, then optionally one share
 * bar of two to four parts.
 *
 * Declines: a figure wider than its card, a label or note past two lines, a
 * capsule that meets the icon, a part whose name and share do not fit inside
 * it, and a share bar with anything over it but its unit.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces, the
 * deck's figures (`ctx.figures`).
 */

const GAP = 24
const CARD = { top: 10, h: 250, pad: 24, r: 10 } as const
const ICON = { top: 24, size: 26 } as const
const TAG = { top: 26 } as const
const VALUE = { top: 66, size: 54, lineHeight: 66 } as const
const LABEL = { top: 140, size: 17, lineHeight: 26, maxLines: 2 } as const
const NOTE = { top: 200, size: 14, lineHeight: 22, maxLines: 2 } as const
const SHARE = {
  caption: { top: 296, size: 16, lineHeight: 24 },
  bar: { top: 358, h: 52, gap: 2, inset: 14, trail: 8 },
  part: { size: 16, lineHeight: 22 },
  total: { top: 418, size: 13, lineHeight: 20 },
} as const

interface FittedCard {
  item: KpiCards["items"][number]
  value: string
  marked: boolean
  label: NonNullable<ReturnType<typeof fitDossier>>
  note: ReturnType<typeof fitDossier>
}

function fitCards(kpis: KpiCards, w: number, ctx: ComponentCtx): FittedCard[] | null {
  const inner = w - CARD.pad * 2
  const cards: FittedCard[] = []
  for (const item of kpis.items) {
    const { text, marked, unit } = kpiFigure(item.value, item.unit)
    const value = joinUnit(text, unit?.trim() || undefined)
    if (dossierWidth(value, VALUE.size, ctx, true) > inner) return null
    const label = fitDossier(item.label, { width: inner, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines, bold: true }, ctx)
    const note = item.note?.trim() ? fitDossier(item.note, { width: inner, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx) : null
    if (!label || (item.note?.trim() && !note)) return null
    if (item.tag && chipWidth(item.tag.text, ctx) > inner - ICON.size - 16) return null
    cards.push({ item, value, marked, label, note })
  }
  return cards
}

interface SharePlan {
  caption: string
  parts: { name: string; text: string; fill: string; words: string; x: number; w: number; marked: boolean }[]
  total: string | null
}

function planShare(chart: Chart, x: number, w: number, ctx: ComponentCtx, inks: DossierInks): SharePlan | null {
  if (!isShareBar(chart) || chart.tag || chart.changes?.length || chart.bands?.length) return null
  if (chart.axes?.x_title?.trim() || chart.axes?.y_title?.trim()) return null
  const parts = shareParts(chart)
  if (!parts || parts.length < 2 || parts.length > 4) return null
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  if (!(total > 0) || parts.some((p) => !(p.value >= 0))) return null
  const unit = chart.axes?.y_unit?.trim() || undefined
  const decimals = Math.max(0, ...parts.map((p) => writtenDecimals(p.value)))
  const fmt = (v: number) => joinUnit(v.toFixed(decimals), unit)
  const markFills = [{ fill: inks.mark, words: dossierOn(inks.mark, SHARE.part.size) }, dossierSolid(inks.accent, inks.mark, SHARE.part.size)]
  let cursor = x
  let k = 0
  const planned: SharePlan["parts"] = []
  for (const part of parts) {
    const span = (part.value / total) * w
    const text = `${part.name} ${fmt(part.value)}`
    const solid = part.marked ? markFills[Math.min(k++, markFills.length - 1)]! : null
    const fill = solid?.fill ?? inks.tint
    const words = solid?.words ?? dossierText(inks.muted, fill, SHARE.part.size)
    if (dossierWidth(text, SHARE.part.size, ctx, true) + SHARE.bar.inset + SHARE.bar.trail > span - SHARE.bar.gap) return null
    planned.push({ name: part.name, text, fill, words, x: cursor, w: span - SHARE.bar.gap, marked: part.marked })
    cursor += span
  }
  const marked = parts.filter((p) => p.marked)
  const chinese = ctx.figures?.chinese ?? false
  let totalText: string | null = null
  if (marked.length >= 2) {
    const names = marked.map((p) => p.name)
    const run = names.length === 2 ? names.join(chinese ? "和" : " and ") : `${names.slice(0, -1).join(chinese ? "、" : ", ")}${chinese ? "和" : " and "}${names[names.length - 1]}`
    const sum = fmt(marked.reduce((s, p) => s + p.value, 0))
    totalText = chinese ? `${run}合计 ${sum}` : `${run} together ${sum}`
  }
  return { caption: shareCaption(chart), parts: planned, total: totalText }
}

export const readingsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [kpis, chart, ...rest] = components
  if (kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (chart !== undefined && chart.type !== "chart") return null
  const items = kpis.items
  if (items.length < 2 || items.length > 4) return null
  if (items.some((item) => !item.icon || item.delta || item.source?.trim())) return null
  const inks = dossierInks(ctx)
  const w = (rect.w - GAP * (items.length - 1)) / items.length
  const cards = fitCards(kpis, w, ctx)
  if (!cards) return null
  const share = chart ? planShare(chart as Chart, rect.x, rect.w, ctx, inks) : null
  if (chart && !share) return null
  const bottom = share ? SHARE.total.top + SHARE.total.lineHeight : CARD.top + CARD.h
  if (bottom > rect.h) return null
  const top = rect.y + CARD.top
  return (
    <g {...compositionTag("readings")}>
      <g {...blockTag(ctx, kpis)}>
        {cards.map(({ item, value, marked, label, note }, i) => {
          const x = rect.x + i * (w + GAP)
          return (
            <g key={i} data-dossier-reading={marked ? "marked" : ""}>
              {paintDossierCard({ x, y: top, w, h: CARD.h }, inks, { r: CARD.r })}
              {paintTopEdge({ x, y: top, w }, marked ? inks.mark : inks.line, CARD.r)}
              {paintDossierIcon(item.icon!, x + CARD.pad, top + ICON.top, ICON.size, dossierTone(inks, item.tone) ?? inks.mark, inks.paper)}
              {item.tag
                ? paintChip({ ctx, text: item.tag.text, ink: chipInk(item.tag, ctx, inks), x: x + w - CARD.pad - chipWidth(item.tag.text, ctx), y: top + TAG.top, ground: inks.paper })
                : null}
              {paintDossierLine(value, {
                ctx,
                x: x + CARD.pad,
                top: top + VALUE.top,
                lineHeight: VALUE.lineHeight,
                size: VALUE.size,
                bold: true,
                fill: dossierText(marked ? inks.mark : inks.ink, inks.paper, VALUE.size),
              })}
              {paintDossier(label, { ctx, x: x + CARD.pad, top: top + LABEL.top, bold: true, fill: dossierText(inks.ink, inks.paper, LABEL.size), ground: inks.paper })}
              {note ? paintDossier(note, { ctx, x: x + CARD.pad, top: top + NOTE.top, fill: dossierText(inks.muted, inks.paper, NOTE.size), ground: inks.paper }) : null}
            </g>
          )
        })}
      </g>
      {share && chart ? (
        <g {...blockTag(ctx, chart)} data-dossier-share="">
          {paintDossierLine(share.caption, {
            ctx,
            x: rect.x,
            top: rect.y + SHARE.caption.top,
            lineHeight: SHARE.caption.lineHeight,
            size: SHARE.caption.size,
            bold: true,
            fill: dossierText(inks.ink, inks.ground, SHARE.caption.size),
          })}
          {share.parts.map((part, i) => (
            <g key={i} data-dossier-part={part.marked ? "marked" : ""}>
              <rect x={part.x} y={rect.y + SHARE.bar.top} width={part.w} height={SHARE.bar.h} fill={part.fill} />
              {paintDossierLine(part.text, {
                ctx,
                x: part.x + SHARE.bar.inset,
                top: rect.y + SHARE.bar.top + (SHARE.bar.h - SHARE.part.lineHeight) / 2,
                lineHeight: SHARE.part.lineHeight,
                size: SHARE.part.size,
                bold: true,
                fill: part.words,
              })}
            </g>
          ))}
          {share.total
            ? paintDossierLine(share.total, {
                ctx,
                x: rect.x,
                top: rect.y + SHARE.total.top,
                lineHeight: SHARE.total.lineHeight,
                size: SHARE.total.size,
                fill: dossierText(inks.muted, inks.ground, SHARE.total.size),
              })
            : null}
        </g>
      ) : null}
    </g>
  )
}
