import type React from "react"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { fitFixed, paintLines } from "./type"
import { baselineIn, consoleInks, consoleText, fitMono, paintCard, paintIcon, paintMono, toneInk } from "./console"

/*
 * checklist: the things a page asks the room to do, as boxes still to tick.
 * terminal's 2026-10 board, its ending (p16): each item a card with an
 * unticked 「[ ]」 in bold mono in the mark, when it is due in mono, what it is
 * bold at 22px, and what it takes at 17px. An item the author marks sits on
 * the mark's tint inside an edge of it, its title in the mark. An item's icon
 * stands before its title, and its tone colours its box and its icon.
 *
 * A face calls it with its items and a band, and gets every item drawn whole
 * or `null`: an item past its room, or more items than the band holds with
 * cards 60px tall, leaves the page without a list rather than with part of
 * one. Cards are 72px tall and 86px apart, shorter and closer for a long list.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.heading`, `fonts.body`,
 * `fonts.mono`.
 */

export interface ChecklistItem {
  /** When it is due, such as 「2026 Q4」. */
  due?: string
  /** What it is. */
  title: string
  /** What it takes. */
  gloss?: string
  /** The separator the author wrote between title and gloss, when the face split one line into both. */
  glossBreak?: string
  /** The one item the page is about: its card on the mark's tint inside an edge of the mark, its title in the mark. */
  marked?: boolean
  /** A symbol before its title, 20px, in the muted ink or the tone's. */
  icon?: string
  /** What kind of news it is: its box and its icon in the tone's ink. */
  tone?: "danger" | "warning" | "success"
}

/** Cards are 72px tall and 14px apart, down to 60px tall and 10px apart for a long list. */
const CARD = { h: 72, pitch: 86, minH: 60, gap: 10, pad: 24 } as const
const BOX = { box: 28, size: 20, w: 62 } as const
const DUE = { size: 17, box: 28, w: 150 } as const
const TITLE = { size: 22, box: 32, w: 320 } as const
const ICON = { size: 20, gap: 10 } as const
const GLOSS = { size: 17, box: 26, lineHeight: 22 } as const

export function drawChecklist({ items, ctx, rect }: { items: readonly ChecklistItem[]; ctx: ComponentCtx; rect: ContentRect }): React.ReactElement | null {
  if (items.length === 0) return null
  const pitch = Math.min(CARD.pitch, Math.floor((rect.h + CARD.gap) / items.length))
  const cardH = Math.min(CARD.h, pitch - CARD.gap)
  if (cardH < CARD.minH) return null
  const inks = consoleInks(ctx)
  const dated = items.some((item) => item.due?.trim())
  const dueX = CARD.pad + BOX.w
  const titleX = dueX + (dated ? DUE.w : 0)
  const glossX = titleX + TITLE.w
  const glossW = rect.w - glossX - CARD.pad
  const fitted: { due: EmphasisHeadingLayout | null; title: EmphasisHeadingLayout; gloss: EmphasisHeadingLayout | null; item: ChecklistItem }[] = []
  for (const item of items) {
    const due = item.due?.trim() ? fitMono(item.due, { width: DUE.w - 12, size: DUE.size, lineHeight: DUE.box, maxLines: 1 }) : null
    const title = fitFixed(item.title, { width: TITLE.w - 20 - (item.icon ? ICON.size + ICON.gap : 0), size: TITLE.size, lineHeight: TITLE.box, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true })
    const gloss = item.gloss?.trim() ? fitFixed(item.gloss, { width: glossW, size: GLOSS.size, lineHeight: GLOSS.lineHeight, maxLines: 2, fontFamily: ctx.fonts.body, bold: false }) : null
    if ((item.due?.trim() && !due) || !title || (item.gloss?.trim() && !gloss)) return null
    fitted.push({ due, title, gloss, item })
  }
  return (
    <g data-checklist={items.length}>
      {fitted.map(({ due, title, gloss, item }, i) => {
        const y = rect.y + i * pitch
        const box = { x: rect.x, y, w: rect.w, h: cardH }
        const marked = item.marked === true
        const ground = marked ? inks.tint : inks.surface
        const toned = toneInk(inks, item.tone)
        const iconW = item.icon ? ICON.size + ICON.gap : 0
        const glossTop = y + (cardH - (gloss ? gloss.lines.length : 1) * GLOSS.lineHeight) / 2
        return (
          <g key={i} data-checklist-item={marked ? "marked" : (item.tone ?? "")}>
            {paintCard(box, inks, marked)}
            <text x={rect.x + CARD.pad} y={baselineIn(y + (cardH - BOX.box) / 2, BOX.box, BOX.size)} fontFamily={ctx.fonts.mono} fontSize={BOX.size} fontWeight="700" fill={consoleText(toned && !marked ? toned : inks.mark, ground, BOX.size)} dominantBaseline="alphabetic" xmlSpace="preserve">
              [ ]
            </text>
            {due ? paintMono(due, { ctx, x: rect.x + dueX, y: baselineIn(y + (cardH - DUE.box) / 2, DUE.box, DUE.size), fill: consoleText(inks.muted, ground, DUE.size), ground }) : null}
            {item.icon ? paintIcon(item.icon, rect.x + titleX, y + (cardH - ICON.size) / 2, ICON.size, marked ? inks.mark : (toned ?? inks.muted), ground) : null}
            {paintLines(title, {
              ctx,
              x: rect.x + titleX + iconW,
              y: baselineIn(y + (cardH - TITLE.box) / 2, TITLE.box, TITLE.size),
              fill: consoleText(marked ? inks.mark : inks.text, ground, TITLE.size),
              fontFamily: ctx.fonts.heading,
              fontWeight: "700",
              bg: ground,
              ...(item.glossBreak ? { lastAttrs: { "data-gloss-break": item.glossBreak } } : {}),
            })}
            {gloss
              ? paintLines(gloss, {
                  ctx,
                  x: rect.x + glossX,
                  y: baselineIn(glossTop, GLOSS.lineHeight, GLOSS.size),
                  fill: consoleText(inks.body, ground, GLOSS.size),
                  fontFamily: ctx.fonts.body,
                  fontWeight: "400",
                  bg: ground,
                })
              : null}
          </g>
        )
      })}
    </g>
  )
}
