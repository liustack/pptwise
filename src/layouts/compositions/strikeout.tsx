import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkUnder,
  SOURCE_AT,
  chalkBaseline,
  chalkChinese,
  chalkLit,
  chalkMark,
  chalkMeta,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
  chalkboardSmall,
} from "./chalkboard"

type Kpi = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * strikeout: figures written large, and the figure people quote wrongly
 * struck out under them, lecture's 2026-10 board (p16). Two to four figures
 * across the page in the serif, each with its unit after it small and what
 * it counts in the grey under it. The figure the author marks (written
 * wholly `**…**`) is in yellow with one stroke of yellow chalk under it.
 * Under them a dashed box of the board: the misquoted figure dim and struck
 * through with a line of yellow chalk, and beside it what it really counts.
 * A line in the grey under the box, then the source.
 *
 * Takes, in the chalkboard setting: a `kpi_cards` of two to four items,
 * each a value, a unit and a label, a note optional, at most one marked;
 * then a warning `callout` whose title is the misquoted figure (it holds a
 * digit) and whose text says what it counts; then optionally a
 * `paragraph`.
 *
 * Declines: an item with a delta, an icon, a tag, a tone or a source, a
 * figure that does not fit its column at 36px, a label past one line, a
 * callout with an icon or a tag, a struck figure past its room, the text
 * beside it past two lines, a closing line past two lines.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const FIGURES = { x: 64, w: 1152, gap: 24, top: 196, lineHeight: 90, size: 54, minSize: 36, unit: 22 } as const
const LABEL = { top: 292, size: 16, lineHeight: 26 } as const
const BOX = { x: 64, y: 388, w: 1152, h: 96 } as const
const STRUCK = { x: 88, top: 404, w: 340, size: 44, lineHeight: 60 } as const
const BESIDE = { x: 440, top: 408, w: 760, size: 16, lineHeight: 28, maxLines: 2 } as const
const CLOSE = { top: 520, size: 15, lineHeight: 26, maxLines: 2 } as const

export const strikeoutComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [figures, warning, close, ...rest] = components
  if (figures?.type !== "kpi_cards" || warning?.type !== "callout" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const items = (figures as Kpi).items
  const n = items.length
  if (n < 2 || n > 4 || items.some((item) => item.delta || item.icon || item.tag || item.tone || item.source?.trim() || !item.label.trim())) return null
  if (items.filter((item) => chalkLit(item.value)).length > 1) return null
  const w = (FIGURES.w - (n - 1) * FIGURES.gap) / n
  const c = warning as Callout
  if (c.variant !== "warn" || c.icon || c.tag || !c.title?.trim() || !/\d/u.test(c.title)) return null
  const chinese = chalkChinese(ctx, items.map((item) => item.label))
  const widthAt = (s: number, value: string, unit: string | undefined) => chalkWidth(stripEmphasis(value).trim(), s, ctx, { serif: true }) + (unit?.trim() ? chalkWidth(` ${unit.trim()}`, (FIGURES.unit * s) / FIGURES.size, ctx, { serif: true }) : 0)
  let size: number = FIGURES.size
  while (items.some((item) => widthAt(size, item.value, item.unit) > w) && size > FIGURES.minSize) size -= 1
  if (items.some((item) => widthAt(size, item.value, item.unit) > w)) return null
  const unitSize = Math.round((FIGURES.unit * size) / FIGURES.size)
  const labels = items.map((item) => fitChalk(item.note?.trim() ? `${item.label}${chinese ? "，" : ", "}${item.note}` : item.label, { width: w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1 }, ctx))
  if (labels.some((l) => !l)) return null
  const struck = stripEmphasis(c.title).trim()
  if (chalkWidth(struck, STRUCK.size, ctx, { serif: true }) > STRUCK.w) return null
  const beside = fitChalk(c.text, { width: BESIDE.w, size: BESIDE.size, lineHeight: BESIDE.lineHeight, maxLines: BESIDE.maxLines }, ctx)
  if (!beside) return null
  const closing = close ? fitChalk((close as Paragraph).text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: CLOSE.maxLines }, ctx) : undefined
  if (closing === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const baseline = chalkBaseline(FIGURES.top, FIGURES.lineHeight, size, true)
  const struckW = chalkWidth(struck, STRUCK.size, ctx, { serif: true })
  const struckBase = chalkBaseline(STRUCK.top, STRUCK.lineHeight, STRUCK.size, true)
  return (
    <g {...compositionTag("strikeout")}>
      {head}
      <g {...blockTag(ctx, figures)} data-chalk-figures="">
        {items.map((item, i) => {
          const x = FIGURES.x + i * (w + FIGURES.gap)
          const lit = chalkLit(item.value)
          const value = stripEmphasis(item.value).trim()
          const fill = chalkText(lit ? inks.yellow : inks.chalk, ground, unitSize)
          return (
            <g key={i} data-chalk-figure={value} data-chalk-lit={lit ? "" : undefined}>
              <text {...chalkboardSmall(item.unit?.trim() ? unitSize : size)} x={x} y={baseline} fontFamily={ctx.fonts.heading} fontSize={size} fill={fill} dominantBaseline="alphabetic" xmlSpace="preserve">
                {value}
                {item.unit?.trim() ? <tspan fontSize={unitSize}>{` ${item.unit.trim()}`}</tspan> : null}
              </text>
              {lit ? <ChalkUnder x1={x} x2={x + chalkWidth(value, size, ctx, { serif: true })} y={LABEL.top - 2} ink={inks.yellow} width={5} /> : null}
              {paintChalk(labels[i]!, { ctx, x, top: LABEL.top, fill: chalkText(inks.muted, ground, LABEL.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, warning)} data-chalk-struck={struck}>
        <rect x={BOX.x} y={BOX.y} width={BOX.w} height={BOX.h} fill={inks.panel} stroke={chalkMark(inks.muted, inks.panel)} strokeWidth={1.5} strokeDasharray="6 4" />
        <text x={STRUCK.x} y={struckBase} fontFamily={ctx.fonts.heading} fontSize={STRUCK.size} fill={chalkMeta(inks.dim, inks.panel)} data-contrast-tier="meta" dominantBaseline="alphabetic" xmlSpace={struck.includes(" ") ? "preserve" : undefined}>
          {struck}
        </text>
        <path d={`M ${STRUCK.x - 4} ${struckBase - STRUCK.size * 0.3} L ${STRUCK.x + struckW + 4} ${struckBase - STRUCK.size * 0.32}`} stroke={chalkMark(inks.yellow, inks.panel)} strokeWidth={3} strokeLinecap="round" fill="none" />
        {paintChalk(beside, { ctx, x: BESIDE.x, top: BESIDE.top, ground: inks.panel, fill: chalkText(inks.chalk, inks.panel, BESIDE.size) })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: CLOSE.top, fill: chalkText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
