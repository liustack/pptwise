import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  paintScroll,
  paintScrollFigure,
  paintScrollIcon,
  placeScrollClaim,
  placeScrollSource,
  figureBaseline,
  scrollFigureWidth,
  scrollInks,
  scrollText,
  wholeLit,
} from "./scroll"

type Kpi = Extract<Component, { type: "kpi_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * opening: the figures a lecture opens on, ink's 2026-10 board (p02). The
 * claim over the page; under it two to four figures side by side, each in a
 * column of its own past a hairline: its symbol, the figure set large in the
 * heading face with its unit small after it, what it counts and, in the grey,
 * when and by whom. The figure the author marks (`**…**` on its value) and
 * its symbol are in cinnabar. Under a hairline across the page the line the
 * speaker reads, in the heading face.
 *
 * Takes, in the scroll setting: a `kpi_cards` of two to four with labels,
 * each with a symbol or none, then optionally a `paragraph`.
 *
 * Declines: a card with a tag, a delta, a tone or a source, more than one
 * marked figure, a figure, label, note or line past its room.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const COLS = { pitch: 360, top: 144, rule: { top: 144, bottom: 414 }, pad: 24, w: 320 } as const
const ICON = { dy: 154, size: 22 } as const
const FIGURE = { top: 190, lineHeight: 120, big: 120, size: 110, short: 2, unit: 24, tracking: -2 } as const
const LABEL = { top: 322, size: 19, lineHeight: 26 } as const
const NOTE = { top: 352, size: 12, lineHeight: 22 } as const
const LINE = { top: 450, pad: 18, size: 22, lineHeight: 38, maxLines: 2 } as const

export const openingComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [kpi, paragraph, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  if (paragraph && paragraph.type !== "paragraph") return null
  const items = (kpi as Kpi).items
  if (items.length < 2 || items.length > 4) return null
  if (items.some((it) => it.tag || it.delta || it.tone || it.source || !it.label.trim())) return null
  const iconed = items.some((it) => it.icon)
  if (iconed && items.some((it) => !it.icon)) return null
  const lit = items.map((it) => wholeLit(it.value))
  if (lit.filter(Boolean).length > 1) return null
  const pitch = Math.min(COLS.pitch, Math.floor((rect.w + COLS.pitch - COLS.w - COLS.pad) / items.length))
  const figures = items.map((it) => {
    const size = Array.from(stripEmphasis(it.value).trim()).length <= FIGURE.short ? FIGURE.big : FIGURE.size
    return { size, w: scrollFigureWidth(it.value, it.unit, { size, unit: FIGURE.unit, tracking: FIGURE.tracking }, ctx) }
  })
  if (figures.some((f) => f.w > COLS.w)) return null
  const labels = items.map((it) => fitScroll(it.label, { width: COLS.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1, serif: true }, ctx))
  const notes = items.map((it) => (it.note?.trim() ? fitScroll(it.note, { width: COLS.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (labels.some((l) => !l) || notes.some((n) => n === null)) return null
  const line = paragraph ? fitScroll((paragraph as Paragraph).text, { width: rect.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines, serif: true }, ctx) : undefined
  if (line === null) return null
  if (line && LINE.top + LINE.pad + line.lines.length * LINE.lineHeight > rect.h + 8) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("opening")}>
      {head}
      <g {...blockTag(ctx, kpi)}>
        {items.map((it, i) => {
          const x = rect.x + i * pitch
          const ink = lit[i] ? inks.cinnabar : inks.ink
          return (
            <g key={i} data-scroll-figure={stripEmphasis(it.value).trim()} {...(lit[i] ? { "data-scroll-lead": "figure" } : {})}>
              {i > 0 ? <rect x={x - 0.5} y={rect.y + COLS.rule.top} width={1} height={COLS.rule.bottom - COLS.rule.top} fill={inks.line} /> : null}
              {it.icon ? paintScrollIcon(it.icon, x + COLS.pad, rect.y + ICON.dy, ICON.size, lit[i] ? inks.cinnabar : inks.taupe, ground) : null}
              {paintScrollFigure({ ctx, value: it.value, unit: it.unit, x: x + COLS.pad, baseline: figureBaseline(rect.y + FIGURE.top, FIGURE.lineHeight, figures[i]!.size), spec: { size: figures[i]!.size, unit: FIGURE.unit, tracking: FIGURE.tracking }, fill: scrollText(ink, ground, figures[i]!.size), ground })}
              {paintScroll(labels[i]!, { ctx, x: x + COLS.pad, top: rect.y + LABEL.top, serif: true, fill: scrollText(inks.ink, ground, LABEL.size) })}
              {notes[i] ? paintScroll(notes[i]!, { ctx, x: x + COLS.pad, top: rect.y + NOTE.top, fill: scrollText(inks.muted, ground, NOTE.size) }) : null}
            </g>
          )
        })}
      </g>
      {line && paragraph ? (
        <g {...blockTag(ctx, paragraph)} data-scroll-read="">
          <rect x={rect.x} y={rect.y + LINE.top} width={rect.w} height={1} fill={inks.line} />
          {paintScroll(line, { ctx, x: rect.x, top: rect.y + LINE.top + LINE.pad, serif: true, fill: scrollText(inks.ink2, ground, LINE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
