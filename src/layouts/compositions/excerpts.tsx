import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitScroll,
  paintScroll,
  paintScrollIcon,
  placeScrollClaim,
  placeScrollSource,
  scrollInks,
  scrollText,
  wholeLit,
} from "./scroll"

type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * excerpts: findings quoted from the record, ink's 2026-10 board (p16). The
 * claim over the page; under it a ruled row a finding: its symbol and its
 * name in the heading face at the left, and at the right the record's own
 * words in the heading face in the second ink, with where they come from
 * under them, small in the grey (the card's tag). The finding the author
 * marks (its whole name written `**…**`) has its symbol and name in
 * cinnabar.
 *
 * Takes, in the scroll setting: an untitled `icon_cards` of two to four,
 * every card with a symbol, and a plain tag (the source) or none.
 *
 * Declines: cards with a title over them, a card with a tone, a tag with a
 * kind, a basis, a tone, a verdict or a quiet mark, a name, quote or source
 * past its room, more than one marked finding.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const ROWS = { top: 140, pitch: 108, max: 4, rule: 96 } as const
const ICON = { dy: 8, size: 22 } as const
const NAME = { x: 36, w: 300, size: 24, lineHeight: 36 } as const
const QUOTE = { x: 350, dy: 4, size: 17, lineHeight: 28, maxLines: 2 } as const
const SOURCE = { gap: 0, size: 11, lineHeight: 20 } as const

export const excerptsComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [cards, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0) return null
  const c = cards as IconCards
  const items = c.items
  if (c.title?.trim() || items.length < 2 || items.length > ROWS.max) return null
  if (items.some((it) => !it.icon || it.tone || !it.title?.trim() || !it.text?.trim())) return null
  if (items.some((it) => it.tag && (it.tag.evidence || it.tag.basis || it.tag.tone || it.tag.settled || it.tag.quiet))) return null
  const lit = items.map((it) => wholeLit(it.title))
  if (lit.filter(Boolean).length > 1) return null
  const quoteW = rect.w - QUOTE.x
  const names = items.map((it) => fitScroll(stripEmphasis(it.title), { width: NAME.w, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const quotes = items.map((it) => fitScroll(it.text, { width: quoteW, size: QUOTE.size, lineHeight: QUOTE.lineHeight, maxLines: QUOTE.maxLines, serif: true }, ctx))
  const sources = items.map((it) => (it.tag ? fitScroll(it.tag.text, { width: quoteW, size: SOURCE.size, lineHeight: SOURCE.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (names.some((n) => !n) || quotes.some((q) => !q) || sources.some((s) => s === null)) return null
  if (ROWS.top + items.length * ROWS.pitch > rect.h + 8) return null
  const head = placeScrollClaim(claim, { x: rect.x, w: rect.w })
  if (head === false) return null
  const foot = placeScrollSource(source, { x: rect.x, w: rect.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("excerpts")}>
      {head}
      <g {...blockTag(ctx, c)}>
        {items.map((it, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const sourceTop = top + QUOTE.dy + QUOTE.maxLines * QUOTE.lineHeight + SOURCE.gap
          return (
            <g key={i} data-scroll-excerpt={stripEmphasis(it.title).trim()} {...(lit[i] ? { "data-scroll-lead": "finding" } : {})}>
              {paintScrollIcon(it.icon!, rect.x, top + ICON.dy, ICON.size, lit[i] ? inks.cinnabar : inks.taupe, ground)}
              {paintScroll(names[i]!, { ctx, x: rect.x + NAME.x, top, serif: true, fill: scrollText(lit[i] ? inks.cinnabar : inks.ink, ground, NAME.size) })}
              {paintScroll(quotes[i]!, { ctx, x: rect.x + QUOTE.x, top: top + QUOTE.dy, serif: true, fill: scrollText(inks.ink2, ground, QUOTE.size) })}
              {sources[i] ? paintScroll(sources[i]!, { ctx, x: rect.x + QUOTE.x, top: sourceTop, fill: scrollText(inks.muted, ground, SOURCE.size) }) : null}
              <rect x={rect.x} y={top + ROWS.rule - 0.5} width={rect.w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
