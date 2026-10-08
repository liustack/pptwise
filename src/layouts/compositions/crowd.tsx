import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  KICKER_AT,
  SOURCE_AT,
  fitKeynote,
  keynoteBaseline,
  keynoteFigureWidth,
  keynoteInks,
  keynoteMark,
  keynoteText,
  paintKeynote,
  paintKeynoteFigure,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type Kpi = Extract<Component, { type: "kpi_cards" }>

/*
 * crowd: a share as a hundred people, stage's 2026-10 board (p12). At the
 * left the share set huge and bold (「约 ¼」), the page's claim under it as
 * what the share is of, and the item's label under that in the sand, saying
 * how it was counted. At the right a field of a hundred dots, ten by ten, the
 * share of them lit in silver from the top left, one dot a hundredth.
 *
 * The figure is written as a fraction (「约 ¼」, 「1/4」, 「1 in 4」). How many dots are
 * lit is the share the item states exactly: the one percentage in its label
 * (「平均 24.2%」 lights 24) when it has one, else the fraction itself (25).
 *
 * Takes, in the keynote setting: a `kpi_cards` of one item whose value is
 * written as a fraction between 0 and 1, on a page with a claim.
 *
 * Declines: an item with a note, an icon, a tag, a delta, a tone or a source,
 * a figure wider than its column, a claim or label past two lines, a value
 * that is not a fraction.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const FIGURE = { x: 64, top: 150, size: 200, lineHeight: 230, unit: 72, tracking: -4, w: 560 } as const
const CLAIM = { x: 64, w: 560, top: 400, size: 24, lineHeight: 38 } as const
const LABEL = { x: 64, top: 490, size: 14, lineHeight: 24, w: 560, maxLines: 2 } as const
const DOTS = { x: 730, y: 160, step: 46, r: 15, side: 10 } as const

const FRACTIONS: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875, "⅒": 0.1 }

/** The share a figure states, between 0 and 1: a percentage, a fraction glyph or a written fraction (「1/4」, 「1 in 4」). `null` when it states none. */
export function shareOf(text: string): number | null {
  const t = stripEmphasis(text)
  const percent = t.match(/(\d+(?:\.\d+)?)\s*[%％]/u)
  if (percent) {
    const v = Number(percent[1]) / 100
    return v >= 0 && v <= 1 ? v : null
  }
  const glyph = Array.from(t).find((ch) => FRACTIONS[ch] !== undefined)
  if (glyph) return FRACTIONS[glyph]!
  const written = t.match(/(\d+)\s*(?:\/|\s+in\s+)\s*(\d+)/u)
  if (written && Number(written[2]) > 0) {
    const v = Number(written[1]) / Number(written[2])
    return v >= 0 && v <= 1 ? v : null
  }
  return null
}

/** The fraction a figure is written as (「约 ¼」, 「1/4」), between 0 and 1, or `null` when it is not written as a fraction. */
export function fractionOf(value: string): number | null {
  const t = stripEmphasis(value)
  return /[%％]/u.test(t) ? null : shareOf(t)
}

/**
 * The dots a figure written as a fraction lights out of a hundred: the one
 * percentage its label states when it states one (the exact value behind a
 * rounded fraction), else the fraction itself. `null` for a figure that is
 * not a fraction: a percentage alone may be a rate of growth, not a share of
 * a whole, and is left to a plain figure.
 */
export function litDots(value: string, label: string): number | null {
  const fraction = fractionOf(value)
  if (fraction === null) return null
  const stated = stripEmphasis(label).match(/\d+(?:\.\d+)?\s*[%％]/gu) ?? []
  const share = stated.length === 1 ? shareOf(stated[0]!) : fraction
  return share === null ? null : Math.round(share * 100)
}

export const crowdComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect) || !claim) return null
  const [kpi, ...rest] = components
  if (kpi?.type !== "kpi_cards" || rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length !== 1) return null
  const item = items[0]!
  if (item.note || item.icon || item.tag || item.delta || item.tone || item.source) return null
  const lit = litDots(item.value, item.label)
  if (lit === null) return null
  if (keynoteFigureWidth(item.value, item.unit, FIGURE, ctx) > FIGURE.w) return null
  const head = placeKeynoteClaim(claim, { ...CLAIM, maxLines: 2, weight: "regular" })
  if (head === false) return null
  const label = item.label.trim() ? fitKeynote(item.label, { width: LABEL.w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines }, ctx) : undefined
  if (label === null) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, { ...SOURCE_AT, top: 636 })
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const silver = keynoteMark(inks.silver, ground)
  return (
    <g {...compositionTag("crowd")}>
      {chapter}
      <g {...blockTag(ctx, kpi)} data-keynote-crowd={lit}>
        {paintKeynoteFigure({ ctx, value: item.value, unit: item.unit, x: FIGURE.x, baseline: keynoteBaseline(FIGURE.top, FIGURE.lineHeight, FIGURE.size, true), spec: FIGURE, fill: keynoteText(inks.ink, ground, FIGURE.unit) })}
        <g data-keynote-dots="">
          {Array.from({ length: DOTS.side * DOTS.side }, (_, i) => {
            const row = Math.floor(i / DOTS.side)
            const col = i % DOTS.side
            return <circle key={i} cx={DOTS.x + col * DOTS.step} cy={DOTS.y + row * DOTS.step} r={DOTS.r} fill={i < lit ? silver : inks.unlit} data-keynote-dot={i < lit ? "lit" : undefined} />
          })}
        </g>
        {label ? <g data-keynote-crowd-label="">{paintKeynote(label, { ctx, x: LABEL.x, top: LABEL.top, fill: keynoteText(inks.muted, ground, LABEL.size) })}</g> : null}
      </g>
      {head}
      {foot}
    </g>
  )
}
