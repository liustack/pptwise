import type React from "react"
import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { PANEL, fitPanelBar, paintPanel, panelInks, panelText, serifBaseline, type PanelBar } from "./panel"
import { blockTag, compositionTag, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"
import { tilesSeal } from "./tiles-seal"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

/*
 * tiles: numbered cards as numbered panels. Each item is a panel whose title
 * bar carries its number ("01") and, when the author wrote one, its `sub` on
 * the right; under the bar its title at 28px in the heading face and its
 * text at 19px. Four items stand two by two, three in a row. The item the
 * author marked (`emphasis`) takes the mark for its edge, its number and its
 * title, and its text steps up to the full ink. ledger's 2026-10 conclusion
 * page (p02).
 *
 * The panel setting only: the other settings set numbered cards as rows.
 *
 * Takes: one `numbered_cards` of three or four items, alone.
 *
 * Declines: five items or more, a title past two lines of its panel at
 * 28px, a text past three lines at 19px, or a panel too short for its words.
 *
 * Band: four items need 488px of height for the board's 236px panels, and
 * any band at least 600px wide.
 *
 * Reads: `surface` (panels), `border` (edges, dividers), the emphasis ink
 * (the marked panel), `text` and `muted` (titles, texts, numbers),
 * `fonts.heading` (titles), `fonts.body`.
 */

/** The board's panel height for a two-by-two set, and the gap between panels. */
const TILE_H = 236
const GAP = PANEL.gap
/** Text stands 24px into the panel. */
const PAD = 24
const TITLE = { top: 60, size: 28, lineHeight: 40, maxLines: 2 } as const
const TEXT = { gap: 16, size: 19, lineHeight: 30, maxLines: 3 } as const
/** Air kept under the last line of text. */
const FOOT = 20
const MIN_W = 600

interface Tile {
  item: NumberedCards["items"][number]
  index: number
  bar: PanelBar
  title: EmphasisHeadingLayout
  text: EmphasisHeadingLayout | null
}

function tilesShape(components: readonly Component[]): NumberedCards | null {
  if (components.length !== 1) return null
  const cards = components[0]!
  if (cards.type !== "numbered_cards") return null
  if (cards.items.length < 3 || cards.items.length > 4) return null
  return cards
}

export const tilesComposition: Composition = (props) => {
  if (props.setting === "seal") return tilesSeal(props)
  const { components, ctx, rect, setting } = props
  if (setting !== "panel") return null
  const cards = tilesShape(components)
  if (!cards || rect.w < MIN_W) return null
  const n = cards.items.length
  const cols = n === 4 ? 2 : n
  const rows = n === 4 ? 2 : 1
  const w = (rect.w - GAP * (cols - 1)) / cols
  const h = rows === 2 ? Math.min(TILE_H, (rect.h - GAP) / 2) : rect.h
  const inner = w - PAD * 2

  const tiles: Tile[] = []
  for (const [index, item] of cards.items.entries()) {
    const bar = fitPanelBar(String(index + 1).padStart(2, "0"), item.sub, w, ctx)
    const title = fitFixed(item.title, { width: inner, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, fontFamily: ctx.fonts.heading, bold: false })
    const text = item.text?.trim()
      ? fitFixed(item.text, { width: inner, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines, fontFamily: ctx.fonts.body, bold: false })
      : null
    if (!bar || !title || (item.text?.trim() && !text)) return null
    const foot = TITLE.top + title.lines.length * TITLE.lineHeight + (text ? TEXT.gap + text.lines.length * TEXT.lineHeight : 0) + FOOT
    if (foot > h) return null
    tiles.push({ item, index, bar, title, text })
  }

  const inks = panelInks(ctx)
  const nodes: React.ReactNode[] = tiles.map((tile) => {
    const x = rect.x + (tile.index % cols) * (w + GAP)
    const y = rect.y + Math.floor(tile.index / cols) * (h + GAP)
    const marked = tile.item.emphasis === true
    const titleTop = y + TITLE.top
    const textTop = titleTop + tile.title.lines.length * TITLE.lineHeight + TEXT.gap
    return (
      <g key={tile.index} data-tile={tile.index + 1}>
        {paintPanel({ x, y, w, h }, ctx, { bar: tile.bar, marked })}
        {paintLines(tile.title, {
          ctx,
          x: x + PAD,
          y: serifBaseline(titleTop, TITLE.lineHeight, TITLE.size),
          fill: panelText(marked ? inks.mark : ctx.colors.text, inks.surface, TITLE.size),
          fontFamily: ctx.fonts.heading,
          fontWeight: "400",
          bg: inks.surface,
        })}
        {tile.text &&
          paintLines(tile.text, {
            ctx,
            x: x + PAD,
            y: centredBaseline(textTop, TEXT.lineHeight, TEXT.size),
            fill: panelText(marked ? ctx.colors.text : inks.body, inks.surface, TEXT.size),
            fontFamily: ctx.fonts.body,
            fontWeight: "400",
            bg: inks.surface,
          })}
      </g>
    )
  })

  return (
    <g {...compositionTag("tiles")}>
      <g {...blockTag(ctx, cards)}>{nodes}</g>
    </g>
  )
}
