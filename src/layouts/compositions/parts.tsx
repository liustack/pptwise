import type { Component } from "@/ir"
import { basisUnsettled } from "../../components/tag"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderCard, paintBinderIcon, paintBinderLine, paintBinderPhoto, paintChip, splitName } from "./binder"

type ImageGrid = Extract<Component, { type: "image_grid" }>

/*
 * parts: what a solution is made of, proposal's 2026-10 board (p11). A card
 * a part, side by side: its photograph across the card's top, its number in
 * a petrol disc on the photograph (the first in the tangerine when the grid
 * leads with it, `emphasis: "first"`), its tag as a white chip at the
 * photograph's right; under the photograph its icon and name in petrol and a
 * few lines on it. A part whose tag is not settled yet (a `basis` of
 * estimate, pending or proposal, such as 「选配」) is a card outlined dashed.
 *
 * A caption is written "name：what" (「屋顶光伏：按屋顶承重…」). The colon is
 * declared on the name's line (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: an `image_grid` of two to four pictures, each
 * with an icon and a caption written that way, tags allowed.
 *
 * Declines: a name past one line, a text past three lines and a tag wider than
 * its photograph.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CARD = { top: 4, gap: 12, h: 400, r: 12, photo: { h: 240, r: 10 }, dash: { w: 2, pattern: "8 6", inset: 2 }, disc: { x: 16, y: 16, d: 34, size: 16 }, chip: { right: 24, y: 20, h: 26, size: 12 }, icon: { x: 22, dy: 262, size: 22 }, name: { x: 54, dy: 258, size: 19, lineHeight: 30 }, text: { x: 22, dy: 298, size: 14, lineHeight: 23, maxLines: 3 } } as const

export const partsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [grid, ...rest] = components
  if (grid?.type !== "image_grid" || rest.length > 0) return null
  const g = grid as ImageGrid
  const n = g.items.length
  if (n < 2 || n > 4 || g.items.some((it) => !it.icon || !it.caption?.trim())) return null
  if (rect.w < 1132 || rect.h < CARD.top + CARD.h) return null
  const inks = binderInks(ctx)
  const w = (rect.w - CARD.gap * (n - 1)) / n
  const items = g.items.map((it) => {
    const split = splitName(it.caption!)
    if (!split) return null
    const name = fitBinder(split.name, { width: w - CARD.name.x - 12, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(split.rest, { width: w - CARD.text.x * 2 + 2, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx)
    const tag = (it as { tag?: { text: string; basis?: "law" | "estimate" | "pending" | "proposal" } }).tag
    if (!name || !text) return null
    if (tag && CARD.disc.x + CARD.disc.d + 12 + binderWidth(tag.text, CARD.chip.size, ctx, true) + 22 + CARD.chip.right > w) return null
    return { it, split, name, text, tag, open: tag ? basisUnsettled(tag.basis) : false }
  })
  if (items.some((item) => !item)) return null

  return (
    <g {...compositionTag("parts")} {...blockTag(ctx, g)}>
      {items.map((item, i) => {
        const { it, split, name, text, tag, open } = item!
        const x = rect.x + i * (w + CARD.gap)
        const y = rect.y + CARD.top
        const inset = open ? CARD.dash.inset : 0
        const lit = g.emphasis === "first" && i === 0
        const disc = (
          <g data-binder-part-number={i + 1}>
            <circle cx={x + CARD.disc.x + CARD.disc.d / 2} cy={y + CARD.disc.y + CARD.disc.d / 2} r={CARD.disc.d / 2} fill={lit ? inks.fire : inks.deep} />
            {paintBinderLine(String(i + 1), { ctx, x: x + CARD.disc.x + CARD.disc.d / 2, top: y + CARD.disc.y, lineHeight: CARD.disc.d, size: CARD.disc.size, bold: true, anchor: "middle", fill: binderText(lit ? inks.onFire : inks.onDeep, lit ? inks.fire : inks.deep, CARD.disc.size) })}
          </g>
        )
        return (
          <g key={i} data-binder-part={split.name}>
            {paintBinderCard({ x, y, w, h: CARD.h }, inks)}
            {paintBinderPhoto(it.asset_id, { x: x + inset, y: y + inset, w: w - inset * 2, h: CARD.photo.h - inset }, ctx, inks, { r: CARD.photo.r, corners: "top" })}
            {open ? paintBinderCard({ x, y, w, h: CARD.h }, inks, { fill: "none", stroke: inks.tick, strokeWidth: CARD.dash.w, dash: CARD.dash.pattern }) : null}
            {lit ? <Lead id="part">{disc}</Lead> : disc}
            {tag ? paintChip(tag.text, x + w - CARD.chip.right - (binderWidth(tag.text, CARD.chip.size, ctx, true) + 22), y + CARD.chip.y, { size: CARD.chip.size, h: CARD.chip.h, fg: inks.deep, bg: inks.ground }, ctx, inks).node : null}
            {paintBinderIcon(it.icon!, x + CARD.icon.x, y + CARD.icon.dy, CARD.icon.size, inks.deep, inks.card)}
            {paintBinder(name, { ctx, x: x + CARD.name.x, top: y + CARD.name.dy, bold: true, fill: binderText(inks.deep, inks.card, CARD.name.size), ground: inks.card, lastAttrs: glossBreak(split.sep) })}
            {paintBinder(text, { ctx, x: x + CARD.text.x, top: y + CARD.text.dy, fill: binderText(inks.ink, inks.card, CARD.text.size), ground: inks.card })}
          </g>
        )
      })}
    </g>
  )
}
