import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  paintScroll,
  paintScrollIcon,
  placeScrollClaim,
  placeScrollSource,
  scrollInks,
  scrollRamp,
  scrollText,
  scrollWidth,
  uprightText,
} from "./scroll"

type Pyramid = Extract<Component, { type: "pyramid" }>
type IconCards = Extract<Component, { type: "icon_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * strata: a system of tiers and what stands beside it, ink's 2026-10 board
 * (p04). The claim over the page; under it at the left a pyramid of three to
 * six tiers, the top in the ink and each one below a step paler, each tier's
 * name in its band with the figure it holds after it (the layer's `note`),
 * and under the pyramid a line in the heading face that sums it up. At the
 * right, the other parts of the system as ruled rows: a symbol, the part's
 * name in the heading face, and what it is in the grey.
 *
 * Takes, in the scroll setting: a `pyramid` of three to six layers, a
 * `icon_cards` of two to four items each with a symbol, then optionally a
 * `paragraph` (the line under the pyramid).
 *
 * Declines: a layer with a tone, cards with a title over them, a card with a
 * tone or a tag, a name or a line past its room.
 *
 * Reads: the scroll inks and their ramp (`./scroll.tsx`).
 */

/** The pyramid: centred 330px in, its base filling the measure's left 660px, tiers 78px tall on an 86px pitch from 144px down. */
const TIERS = { top: 144, centre: 330, half: 330, apex: 260 / 740, pitch: 86, gap: 8, height: 336, label: { size: 22, lineHeight: 42, pad: 20 } } as const
const SUM = { top: 496, w: 620, size: 18, lineHeight: 26 } as const
const SIDE = { x: 720, top: 144, pitch: 112, icon: { dy: 6, size: 22 }, name: { x: 36, size: 22, lineHeight: 34 }, text: { x: 36, dy: 38, size: 13, lineHeight: 22, maxLines: 2 }, rule: 96 } as const

/** A tier's words: its name, and the figure it holds after a full-width space, or a spaced middle dot in Latin. */
function tierWords(layer: Pyramid["layers"][number]): string {
  const name = stripEmphasis(layer.label).trim()
  const note = layer.note ? stripEmphasis(layer.note).trim() : ""
  if (!note) return name
  return uprightText(name) ? `${name}\u3000${note}` : `${name} · ${note}`
}

export const strataComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [pyramid, cards, sum, ...rest] = components
  if (pyramid?.type !== "pyramid" || cards?.type !== "icon_cards" || rest.length > 0) return null
  if (sum && sum.type !== "paragraph") return null
  const layers = (pyramid as Pyramid).layers
  if (layers.length < 3 || layers.length > 6 || layers.some((l) => l.tone)) return null
  const items = (cards as IconCards).items
  if ((cards as IconCards).title?.trim() || items.length < 2 || items.length > 4) return null
  if (items.some((it) => !it.icon || it.tone || it.tag || !it.title?.trim())) return null
  const n = layers.length
  const pitch = Math.min(TIERS.pitch, (TIERS.height + TIERS.gap) / n)
  const h = pitch - TIERS.gap
  if (h < TIERS.label.lineHeight) return null
  const apexHalf = TIERS.half * TIERS.apex
  const slope = (TIERS.half - apexHalf) / n
  const halfAt = (row: number) => apexHalf + slope * row
  const words = layers.map(tierWords)
  // A tier's words stand across its middle with 20px of air a side.
  const midWidth = (i: number) => halfAt(i) + halfAt(i + 1)
  if (words.some((w, i) => scrollWidth(w, TIERS.label.size, ctx, { serif: true }) > midWidth(i) - TIERS.label.pad * 2)) return null
  const summary = sum ? fitScroll((sum as Paragraph).text, { width: SUM.w, size: SUM.size, lineHeight: SUM.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  if (summary === null) return null
  const sideW = rect.w - SIDE.x - SIDE.name.x
  const names = items.map((it) => fitScroll(it.title, { width: sideW, size: SIDE.name.size, lineHeight: SIDE.name.lineHeight, maxLines: 1, serif: true }, ctx))
  const texts = items.map((it) => fitScroll(it.text, { width: sideW, size: SIDE.text.size, lineHeight: SIDE.text.lineHeight, maxLines: SIDE.text.maxLines }, ctx))
  if (names.some((x) => !x) || texts.some((x) => !x)) return null
  if (SIDE.top + items.length * SIDE.pitch > rect.h + 16) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const fills = scrollRamp(inks, n)
  const cx = rect.x + TIERS.centre
  return (
    <g {...compositionTag("strata")}>
      {head}
      <g {...blockTag(ctx, pyramid)} data-scroll-pyramid="">
        {layers.map((_layer, i) => {
          const top = rect.y + TIERS.top + i * pitch
          const fill = fills[i]!
          const ht = halfAt(i)
          const hb = halfAt(i + 1)
          return (
            <g key={i} data-scroll-tier={stripEmphasis(_layer.label).trim()}>
              <polygon points={`${cx - ht},${top} ${cx + ht},${top} ${cx + hb},${top + h} ${cx - hb},${top + h}`} fill={fill} />
              {paintScroll(fitScroll(words[i], { width: midWidth(i), size: TIERS.label.size, lineHeight: TIERS.label.lineHeight, maxLines: 1, serif: true }, ctx)!, { ctx, x: cx, top: top + (h - TIERS.label.lineHeight) / 2, anchor: "middle", serif: true, fill: scrollText(readableOn(fill), fill, TIERS.label.size), ground: fill })}
            </g>
          )
        })}
      </g>
      {summary && sum ? <g {...blockTag(ctx, sum)} data-scroll-sum="">{paintScroll(summary, { ctx, x: cx, top: rect.y + SUM.top, anchor: "middle", serif: true, fill: scrollText(inks.ink2, ground, SUM.size) })}</g> : null}
      <g {...blockTag(ctx, cards)}>
        {items.map((it, i) => {
          const top = rect.y + SIDE.top + i * SIDE.pitch
          const x = rect.x + SIDE.x
          return (
            <g key={i} data-scroll-part={stripEmphasis(it.title).trim()}>
              {paintScrollIcon(it.icon!, x, top + SIDE.icon.dy, SIDE.icon.size, inks.taupe, ground)}
              {paintScroll(names[i]!, { ctx, x: x + SIDE.name.x, top, serif: true, fill: scrollText(inks.ink, ground, SIDE.name.size) })}
              {paintScroll(texts[i]!, { ctx, x: x + SIDE.text.x, top: top + SIDE.text.dy, fill: scrollText(inks.muted, ground, SIDE.text.size) })}
              <rect x={x} y={top + SIDE.rule} width={rect.x + rect.w - x} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
