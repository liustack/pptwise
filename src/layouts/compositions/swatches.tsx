import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CRAYON, boardY, crayonAt, crayonInks, crayonMark, crayonText, crayonTint, fitCrayon, inkOn, paintCrayon, paintCrayonIcon, paintCrayonLine, placeCrayonClaim, placeCrayonSource } from "./crayonbox"

type FromTo = Extract<Component, { type: "from_to" }>

/*
 * swatches: how several things change from one stage to the next, a card of
 * its own colour each, crayon's 2026-10 board (p07). A tall pale card a
 * thing, its top a band of the full crayon with the thing's symbol and name
 * on it; under it the first stage's name small and grey and what it looks
 * like then, a chevron in the card's crayon pointing down, the second
 * stage's name and what it looks like by then, a little heavier. Each card
 * takes its own crayon: red, tangerine, yellow, green, sky.
 *
 * Takes, in the crayonbox setting: a `from_to` of three to six rows, every
 * row with a symbol, a label, and words for both stages, its stages named.
 *
 * Declines: a header over the rows' labels (`label_column`), a span, a row
 * with a note, a unit, a change, a tag or a mark, a stage's
 * name or a row's words past their room.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const CARD = { top: 186, h: 430, w: 214, pitch: 230, r: 24, band: 86 } as const
const ICON = { x: 22, y: 22, size: 30 } as const
const NAME = { x: 62, top: 18, size: 28, lineHeight: 40 } as const
const STAGE = { x: 18, from: 104, to: 284, size: 13, lineHeight: 22 } as const
const WORDS = { x: 18, from: 128, to: 308, size: 17, lineHeight: 27, maxLines: 3, inset: 16 } as const
const CHEVRON = { y: 244, w: 15, h: 22, stroke: 4 } as const
/** The board's crayon for each card in turn: red, orange, yellow, green, sky. */
const ORDER = [CRAYON.red, CRAYON.orange, CRAYON.yellow, CRAYON.green, CRAYON.sky, CRAYON.purple] as const

/** A stage's name as one line: 「小班 3～4 岁」, "Nursery · ages 3 to 4". */
function stageName(stage: { kicker?: string; title: string }): string {
  const kicker = stripEmphasis(stage.kicker ?? "").trim()
  const title = stripEmphasis(stage.title).trim()
  if (!kicker) return title
  return /\p{Script=Han}/u.test(kicker + title) ? `${kicker} ${title}` : `${kicker} · ${title}`
}

export const swatchesComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "crayonbox") return null
  const [table, ...rest] = components
  if (table?.type !== "from_to" || rest.length > 0) return null
  const t = table as FromTo
  const rows = t.rows
  if (rows.length < 3 || rows.length > 6 || t.span || t.label_column) return null
  if (rows.some((r) => !r.icon || !r.label.trim() || !r.from?.trim() || !r.to?.trim() || r.note || r.unit || r.change || r.tag || r.emphasis)) return null
  const n = rows.length
  const pitch = Math.min(CARD.pitch, (rect.w - 18 + 16) / n)
  const w = pitch - 16
  const inner = w - WORDS.x - WORDS.inset
  const from = stageName(t.from)
  const to = stageName(t.to)
  const stageFits = [from, to].every((s) => fitCrayon(s, { width: inner, size: STAGE.size, lineHeight: STAGE.lineHeight, maxLines: 1, weight: 800 }, ctx))
  if (!stageFits) return null
  const names = rows.map((r) => fitCrayon(r.label, { width: w - NAME.x - 8, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, weight: 900 }, ctx))
  const befores = rows.map((r) => fitCrayon(r.from, { width: inner, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, weight: 600 }, ctx))
  const afters = rows.map((r) => fitCrayon(r.to, { width: inner, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, weight: 800 }, ctx))
  if ([...names, ...befores, ...afters].some((x) => !x)) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const top = boardY(rect, CARD.top)
  return (
    <g {...compositionTag("swatches")}>
      {head}
      <g {...blockTag(ctx, table)}>
        {rows.map((r, i) => {
          const color = crayonAt(inks, ORDER, i)
          const fill = crayonTint(color, inks)
          const x = rect.x + i * pitch
          const cx = x + w / 2
          const chevron = crayonMark(color, fill)
          return (
            <g key={i} data-crayon-swatch={stripEmphasis(r.label).trim()}>
              <rect x={x} y={top} width={w} height={CARD.h} rx={CARD.r} fill={fill} />
              <rect x={x} y={top} width={w} height={CARD.band} rx={CARD.r} fill={color} />
              <rect x={x} y={top + CARD.band - 22} width={w} height={22} fill={color} />
              {paintCrayonIcon(r.icon!, x + ICON.x, top + ICON.y, ICON.size, inkOn(color, inks, 16), color, { stroke: 2.4 })}
              {paintCrayon(names[i]!, { ctx, x: x + NAME.x, top: top + NAME.top, weight: 900, heading: true, fill: inkOn(color, inks, NAME.size), ground: color })}
              {paintCrayonLine(from, { ctx, x: x + STAGE.x, top: top + STAGE.from, lineHeight: STAGE.lineHeight, size: STAGE.size, weight: 800, fill: crayonText(inks.muted, fill, STAGE.size), ground: fill })}
              {paintCrayon(befores[i]!, { ctx, x: x + WORDS.x, top: top + WORDS.from, weight: 600, fill: crayonText(inks.ink, fill, WORDS.size), ground: fill })}
              <path d={`M ${cx - CHEVRON.w} ${top + CHEVRON.y} L ${cx} ${top + CHEVRON.y + CHEVRON.h} L ${cx + CHEVRON.w} ${top + CHEVRON.y}`} fill="none" stroke={chevron} strokeWidth={CHEVRON.stroke} strokeLinecap="round" strokeLinejoin="round" />
              {paintCrayonLine(to, { ctx, x: x + STAGE.x, top: top + STAGE.to, lineHeight: STAGE.lineHeight, size: STAGE.size, weight: 800, fill: crayonText(inks.muted, fill, STAGE.size), ground: fill })}
              {paintCrayon(afters[i]!, { ctx, x: x + WORDS.x, top: top + WORDS.to, weight: 800, fill: crayonText(inks.ink, fill, WORDS.size), ground: fill })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
