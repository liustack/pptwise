import type React from "react"
import type { Component } from "@/ir"
import { paintNumeral, sealInks, sealText } from "./seal"
import { blockTag, compositionTag, type CompositionProps } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>

/*
 * tiles in the seal setting: vermilion's 2026-10 implications page (p14).
 * Numbered cards as panels two by two: the surface with a hairline edge and a
 * 4px bar along the top in the accent, a numbered square, the title bold at
 * 22px and its gloss at 18px. The card the author marks (`emphasis`) takes the
 * mark for its top bar and its title.
 *
 * Takes: one `numbered_cards` of two, four or six items with no `sub`.
 *
 * Declines: an odd count, a `sub`, a title past two lines or a gloss past two
 * lines of the panel's text column, and panels taller than the band.
 *
 * Band: two panels across with 16px between, each at least 440px wide. A
 * panel is 200px tall when its title and gloss leave room.
 */

const GAP = 16
const PANEL_H = 200
const BAR_H = 4
const SQUARE = { size: 40, inset: 24, top: 30 }
const TEXT = { inset: 84, trail: 28 }
const TITLE = { size: 22, lineHeight: 32, top: 34, maxLines: 2 }
const GLOSS = { size: 18, lineHeight: 28, gap: 18, maxLines: 2 }
const FOOT = 28
const MIN_PANEL_W = 440

function tilesShape(components: readonly Component[]): NumberedCards | null {
  const [only, ...rest] = components
  if (only?.type !== "numbered_cards" || rest.length > 0) return null
  const n = only.items.length
  if (n % 2 !== 0 || n < 2 || n > 6 || only.items.some((item) => item.sub?.trim() || item.icon)) return null
  return only
}

export function tilesSeal({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  const cards = tilesShape(components)
  if (!cards) return null
  const w = (rect.w - GAP) / 2
  if (w < MIN_PANEL_W) return null
  const body = ctx.fonts.body
  const textW = w - TEXT.inset - TEXT.trail
  const fitted = []
  for (const item of cards.items) {
    const title = fitFixed(item.title, { width: textW, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, fontFamily: body, bold: true })
    const gloss = item.text?.trim()
      ? fitFixed(item.text, { width: textW, size: GLOSS.size, lineHeight: GLOSS.lineHeight, maxLines: GLOSS.maxLines, fontFamily: body, bold: false })
      : undefined
    if (title === null || gloss === null) return null
    fitted.push({ item, title, gloss, marked: item.emphasis === true })
  }
  const need = Math.max(
    ...fitted.map((card) => TITLE.top + card.title.lines.length * TITLE.lineHeight + (card.gloss ? GLOSS.gap + card.gloss.lines.length * GLOSS.lineHeight : 0) + FOOT),
  )
  const rows = cards.items.length / 2
  const h = Math.max(PANEL_H, need)
  if (rows * h + (rows - 1) * GAP > rect.h) return null

  const inks = sealInks(ctx)
  return (
    <g {...compositionTag("tiles")}>
      <g {...blockTag(ctx, cards)}>
        {fitted.map((card, i) => {
          const x = rect.x + (i % 2) * (w + GAP)
          const y = rect.y + Math.floor(i / 2) * (h + GAP)
          return (
            <g key={i} data-panel={card.marked ? "marked" : ""}>
              <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} fill={inks.panel} stroke={inks.rule} strokeWidth={1} />
              <rect x={x} y={y} width={w} height={BAR_H} fill={card.marked ? inks.mark : inks.accent} />
              {paintNumeral({ ctx, index: i, x: x + SQUARE.inset, y: y + SQUARE.top, size: SQUARE.size })}
              {paintLines(card.title, {
                ctx,
                x: x + TEXT.inset,
                y: centredBaseline(y + TITLE.top, TITLE.lineHeight, TITLE.size),
                fill: sealText(card.marked ? inks.mark : inks.ink, inks.panel, TITLE.size),
                fontFamily: body,
                fontWeight: "700",
                bg: inks.panel,
              })}
              {card.gloss &&
                paintLines(card.gloss, {
                  ctx,
                  x: x + TEXT.inset,
                  y: centredBaseline(y + TITLE.top + card.title.lines.length * TITLE.lineHeight + GLOSS.gap, GLOSS.lineHeight, GLOSS.size),
                  fill: sealText(inks.muted, inks.panel, GLOSS.size),
                  fontFamily: body,
                  fontWeight: "400",
                  bg: inks.panel,
                })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
