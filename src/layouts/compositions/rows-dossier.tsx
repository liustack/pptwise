import type React from "react"
import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import {
  dossierInks,
  dossierOn,
  dossierText,
  dossierTrackedWidth,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  paintDossierTracked,
  dossierBaseline,
} from "./dossier"
import { blockTag, compositionTag, type CompositionProps } from "./shared"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type RowCards = Extract<Component, { type: "row_cards" }>

/*
 * rows in the dossier setting: the proposals a submission asks a committee
 * to adopt, clinic's 2026-10 board (the proposal page, p02). Each item is a
 * card across the body: its number after the page's section (「提议 1」,
 * tracked, small and bold in the mark), its icon large under that, its title
 * bold and its text muted right of them, and at the right a capsule with the
 * item's `sub` (where the evidence for it is, 「依据见第 5 至 13 页」). The
 * item the page lands on (`emphasis`) is the card filled with the mark, its
 * words reversed out of it.
 *
 * The other form is a column of duties, each with its symbol, beside a
 * photograph (the pharmacist page, p16): a `row_cards` whose every item has
 * an icon, one a row, the icon on a disc of the mark's tint, the title bold
 * and the text muted under it, hairlines between the rows.
 *
 * Takes, in the dossier setting: `[numbered_cards]` of two or three items,
 * or `[row_cards]` of three to five items with icons and no sub, tone or
 * highlight.
 *
 * Declines: a title past one line, text past two lines, a capsule wider than
 * its column, and cards or rows taller than the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the body and heading faces, and
 * the page's section (`section`).
 */

const MAX_ITEMS = 3
const CARD = { top: 14, h: 132, pitch: 146, r: 12 } as const
const LABEL = { x: 28, top: 24, size: 13, lineHeight: 20, tracking: 2 } as const
const ICON = { x: 28, top: 58, size: 40 } as const
const TITLE = { x: 136, top: 22, size: 24, lineHeight: 34 } as const
const TEXT = { top: 66, size: 16, lineHeight: 24, maxLines: 2 } as const
const SUB = { right: 26, top: 54, h: 24, minW: 190, padX: 14, size: 13, gap: 40 } as const
/** The marked card's pale words: the board's #CFE6DE label, #DCEEE8 text, #9FD0C2 capsule edge. */
const ON_MARK = { label: 0.8, text: 0.86, edge: 0.63 } as const

const DUTY = { top: 10, pitch: 104, rule: 8, disc: { cx: 24, cy: 32, r: 24, icon: 24 }, textX: 64, title: { top: 6, size: 19, lineHeight: 28 }, text: { top: 40, size: 15, lineHeight: 24, maxLines: 2 } } as const

function dutyRows(list: RowCards, { ctx, rect }: CompositionProps): React.ReactElement | null {
  const items = list.items
  if (items.length < 3 || items.length > 5 || items.some((item) => !item.icon || item.sub?.trim() || item.tone || item.highlight)) return null
  if (DUTY.top + (items.length - 1) * DUTY.pitch + DUTY.text.top + DUTY.text.lineHeight > rect.h) return null
  const inks = dossierInks(ctx)
  const w = rect.w - DUTY.textX
  const fitted = items.map((item) => ({
    title: fitDossier(item.title, { width: w, size: DUTY.title.size, lineHeight: DUTY.title.lineHeight, maxLines: 1, bold: true }, ctx),
    text: item.text?.trim() ? fitDossier(item.text, { width: w, size: DUTY.text.size, lineHeight: DUTY.text.lineHeight, maxLines: DUTY.text.maxLines }, ctx) : null,
  }))
  if (fitted.some((f, i) => !f.title || (items[i]!.text?.trim() && !f.text))) return null
  if (fitted.some((f) => DUTY.text.top + (f.text?.lines.length ?? 0) * DUTY.text.lineHeight > DUTY.pitch - DUTY.rule - 4)) return null
  return (
    <g {...compositionTag("rows")} {...blockTag(ctx, list)} data-dossier-duties="">
      {items.map((item, i) => {
        const y = rect.y + DUTY.top + i * DUTY.pitch
        const f = fitted[i]!
        return (
          <g key={i}>
            {i > 0 ? <rect x={rect.x} y={y - DUTY.rule} width={rect.w} height={1} fill={inks.line} /> : null}
            <circle cx={rect.x + DUTY.disc.cx} cy={y + DUTY.disc.cy} r={DUTY.disc.r} fill={inks.tint} />
            {paintDossierIcon(item.icon!, rect.x + DUTY.disc.cx - DUTY.disc.icon / 2, y + DUTY.disc.cy - DUTY.disc.icon / 2, DUTY.disc.icon, inks.mark, inks.tint)}
            {paintDossier(f.title!, { ctx, x: rect.x + DUTY.textX, top: y + DUTY.title.top, bold: true, fill: dossierText(inks.ink, inks.ground, DUTY.title.size) })}
            {f.text ? paintDossier(f.text, { ctx, x: rect.x + DUTY.textX, top: y + DUTY.text.top, fill: dossierText(inks.muted, inks.ground, DUTY.text.size) }) : null}
          </g>
        )
      })}
    </g>
  )
}

export function rowsDossier(props: CompositionProps): React.ReactElement | null {
  const { components, ctx, rect, section } = props
  const [cards, ...rest] = components
  if (cards?.type === "row_cards" && rest.length === 0) return dutyRows(cards as RowCards, props)
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const list = cards as NumberedCards
  const n = list.items.length
  if (n < 2 || n > MAX_ITEMS) return null
  if (CARD.top + (n - 1) * CARD.pitch + CARD.h > rect.h) return null
  const inks = dossierInks(ctx)
  const subs = list.items.map((item) => item.sub?.trim() ?? "")
  const subW = Math.max(SUB.minW, ...subs.map((sub) => (sub ? Math.ceil(dossierWidth(sub, SUB.size, ctx) + SUB.padX * 2) : 0)))
  const subX = rect.x + rect.w - SUB.right - subW
  const anySub = subs.some(Boolean)
  const textW = (anySub ? subX - SUB.gap : rect.x + rect.w - SUB.right) - (rect.x + TITLE.x)
  const fitted = list.items.map((item) => ({
    title: fitDossier(item.title, { width: textW, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: 1, bold: true }, ctx),
    text: item.text?.trim() ? fitDossier(item.text, { width: textW, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines }, ctx) : null,
  }))
  if (fitted.some((f, i) => !f.title || (list.items[i]!.text?.trim() && !f.text))) return null
  const name = section?.trim()
  const labelOf = (i: number) => (name ? `${name} ${i + 1}` : String(i + 1).padStart(2, "0"))
  if (list.items.some((_, i) => dossierTrackedWidth(labelOf(i), LABEL.size, LABEL.tracking, ctx, true) > TITLE.x - LABEL.x - 8)) return null

  return (
    <g {...compositionTag("rows")} {...blockTag(ctx, list)} data-dossier-rows="">
      {list.items.map((item, i) => {
        const top = rect.y + CARD.top + i * CARD.pitch
        const marked = item.emphasis === true
        const fill = marked ? inks.mark : inks.paper
        const words = marked ? dossierOn(fill, TITLE.size) : dossierText(inks.ink, fill, TITLE.size)
        const { title, text } = fitted[i]!
        const sub = subs[i]
        const edge = marked ? blendOver(dossierOn(fill, SUB.size), fill, ON_MARK.edge) : inks.line
        return (
          <g key={i} data-dossier-card={marked ? "marked" : ""}>
            {paintDossierCard({ x: rect.x, y: top, w: rect.w, h: CARD.h }, inks, { r: CARD.r, fill, stroke: marked ? fill : inks.line })}
            {paintDossierTracked({
              ctx,
              text: labelOf(i),
              x: rect.x + LABEL.x,
              y: dossierBaseline(top + LABEL.top, LABEL.lineHeight, LABEL.size),
              size: LABEL.size,
              tracking: LABEL.tracking,
              bold: true,
              fill: marked ? dossierOn(fill, LABEL.size, ON_MARK.label) : dossierText(inks.mark, fill, LABEL.size),
            })}
            {item.icon ? paintDossierIcon(item.icon, rect.x + ICON.x, top + ICON.top, ICON.size, marked ? dossierOn(fill, ICON.size) : inks.mark, fill) : null}
            {paintDossier(title!, { ctx, x: rect.x + TITLE.x, top: top + TITLE.top, fill: words, bold: true, ground: fill })}
            {text ? paintDossier(text, { ctx, x: rect.x + TITLE.x, top: top + TEXT.top, fill: marked ? dossierOn(fill, TEXT.size, ON_MARK.text) : dossierText(inks.muted, fill, TEXT.size), ground: fill }) : null}
            {sub ? (
              <g data-dossier-ref="">
                <rect x={subX + 0.5} y={top + SUB.top + 0.5} width={subW - 1} height={SUB.h - 1} rx={(SUB.h - 1) / 2} fill="none" stroke={edge} strokeWidth={1} />
                {paintDossierLine(sub, {
                  ctx,
                  x: subX + subW / 2,
                  top: top + SUB.top,
                  lineHeight: SUB.h,
                  size: SUB.size,
                  anchor: "middle",
                  fill: marked ? dossierOn(fill, SUB.size) : dossierText(inks.muted, fill, SUB.size),
                })}
              </g>
            ) : null}
          </g>
        )
      })}
    </g>
  )
}
