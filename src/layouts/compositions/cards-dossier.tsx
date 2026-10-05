import type React from "react"
import type { Component } from "@/ir"
import {
  dossierInks,
  dossierText,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
} from "./dossier"
import { blockTag, compositionTag, type CompositionProps } from "./shared"

type IconCards = Extract<Component, { type: "icon_cards" }>

/*
 * cards in the dossier setting: a few parallel rules, each a card, clinic's
 * 2026-10 board (the scope page, p14, beside its photograph). Two cards a
 * row: an icon on a disc of the mark's tint, a title bold under it, a line or
 * two muted under that. The cards may come as one `icon_cards` or as two, one
 * a row; either way they read across and then down.
 *
 * Takes, in the dossier setting: one `icon_cards` of two to four items, or
 * two of two items each, none with a tag.
 *
 * Declines: a title past one line, text past two lines, and cards taller
 * than the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces.
 */

const GAP = 16
const TOP = 10
const CARD = { maxH: 196, r: 10 } as const
const DISC = { cx: 46, cy: 48, r: 24, icon: 24 } as const
const TITLE = { x: 22, top: 90, size: 19, lineHeight: 28 } as const
const TEXT = { top: 124, size: 15, lineHeight: 24, maxLines: 2, foot: 18 } as const

export function cardsDossier({ components, ctx, rect }: CompositionProps): React.ReactElement | null {
  if (components.length < 1 || components.length > 2 || components.some((c) => c.type !== "icon_cards")) return null
  const blocks = components as IconCards[]
  if (blocks.length === 2 && blocks.some((b) => b.items.length !== 2)) return null
  const items = blocks.flatMap((b) => b.items.map((item) => ({ item, block: b })))
  if (items.length < 2 || items.length > 4 || items.some(({ item }) => item.tag)) return null
  const rows = Math.ceil(items.length / 2)
  const w = (rect.w - GAP) / 2
  const h = Math.min(CARD.maxH, (rect.h - TOP - GAP * (rows - 1)) / rows)
  const inks = dossierInks(ctx)
  const textW = w - TITLE.x * 2
  const fitted = items.map(({ item }) => ({
    title: fitDossier(item.title, { width: textW, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, bold: true }, ctx),
    text: item.text?.trim() ? fitDossier(item.text, { width: textW, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx) : null,
  }))
  if (fitted.some((f, i) => !f.title || (items[i]!.item.text?.trim() && !f.text))) return null
  if (fitted.some((f) => TEXT.top + (f.text?.lines.length ?? 0) * TEXT.lineHeight + TEXT.foot > h)) return null
  const groups = blocks.map((block) => (
    <g key={blocks.indexOf(block)} {...blockTag(ctx, block)}>
      {items.map(({ item, block: b }, i) => {
        if (b !== block) return null
        const x = rect.x + (i % 2) * (w + GAP)
        const y = rect.y + TOP + Math.floor(i / 2) * (h + GAP)
        const f = fitted[i]!
        return (
          <g key={i} data-dossier-rule="">
            {paintDossierCard({ x, y, w, h }, inks, { r: CARD.r })}
            <circle cx={x + DISC.cx} cy={y + DISC.cy} r={DISC.r} fill={inks.tint} />
            {paintDossierIcon(item.icon, x + DISC.cx - DISC.icon / 2, y + DISC.cy - DISC.icon / 2, DISC.icon, inks.mark, inks.tint)}
            {paintDossier(f.title!, { ctx, x: x + TITLE.x, top: y + TITLE.top, bold: true, fill: dossierText(inks.ink, inks.paper, TITLE.size), ground: inks.paper })}
            {f.text ? paintDossier(f.text, { ctx, x: x + TITLE.x, top: y + TEXT.top, fill: dossierText(inks.muted, inks.paper, TEXT.size), ground: inks.paper }) : null}
          </g>
        )
      })}
    </g>
  ))
  return <g {...compositionTag("cards")}>{groups}</g>
}
