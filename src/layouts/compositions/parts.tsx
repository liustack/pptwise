import type { Component } from "@/ir"
import { basisUnsettled } from "../../components/tag"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderIcon, paintBinderLine, paintBinderPhoto, splitName } from "./binder"
import type { Recipe } from "./recipe"

type ImageGrid = Extract<Component, { type: "image_grid" }>

/*
 * parts: what a solution is made of, proposal's 2026-10 print board (p11). A
 * column a part, side by side: its photograph across the column's top; under
 * it a line with its number in two digits bold in petrol (the first in the
 * brick red when the grid leads with it, `emphasis: "first"`) and its tag in
 * small grey at the right; a hairline; then its icon and name in petrol and a
 * few lines on it. A part whose tag is not settled yet (a `basis` of
 * estimate, pending or proposal, such as 「选配」) has that hairline dashed.
 *
 * A caption is written "name：what" (「屋顶光伏：按屋顶承重…」). The colon is
 * declared on the name's line (`data-gloss-break`), not printed.
 *
 * Takes, in the binder setting: an `image_grid` of two to four pictures, each
 * with an icon and a caption written that way, tags allowed.
 *
 * Declines: a name past one line, a text past three lines and a number and
 * tag wider than their column.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const CARD = { top: 4, gap: 24, h: 400, photo: { h: 236 }, dash: "6 5", number: { dy: 250, size: 15, lineHeight: 24 }, tag: { size: 13 }, rule: 282, icon: { x: 0, dy: 298, size: 22 }, name: { x: 32, dy: 294, size: 19, lineHeight: 30 }, text: { x: 0, dy: 332, size: 14, lineHeight: 23, maxLines: 3 } } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const partsRecipe: Recipe = {
  look: "What a solution is made of",
  kinds: ["list"],
  shapes: [{ parts: [{ type: "image_grid", count: [2, 4], needs: ["items[*].caption", "items[*].icon", "items[*].caption~colon"] }] }],
}

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
  const items = g.items.map((it, i) => {
    const split = splitName(it.caption!)
    if (!split) return null
    const name = fitBinder(split.name, { width: w - CARD.name.x, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(split.rest, { width: w, size: CARD.text.size, lineHeight: CARD.text.lineHeight, maxLines: CARD.text.maxLines }, ctx)
    const tag = (it as { tag?: { text: string; basis?: "law" | "estimate" | "pending" | "proposal" } }).tag
    if (!name || !text) return null
    if (tag && binderWidth(number(i), CARD.number.size, ctx, true) + 16 + binderWidth(tag.text, CARD.tag.size, ctx) > w) return null
    return { it, split, name, text, tag, open: tag ? basisUnsettled(tag.basis) : false }
  })
  if (items.some((item) => !item)) return null

  return (
    <g {...compositionTag("parts")} {...blockTag(ctx, g)}>
      {items.map((item, i) => {
        const { it, split, name, text, tag, open } = item!
        const x = rect.x + i * (w + CARD.gap)
        const y = rect.y + CARD.top
        const lit = g.emphasis === "first" && i === 0
        const num = (
          <g data-binder-part-number={i + 1}>
            {paintBinderLine(number(i), { ctx, x, top: y + CARD.number.dy, lineHeight: CARD.number.lineHeight, size: CARD.number.size, bold: true, fill: binderText(lit ? inks.fireText : inks.deep, inks.ground, CARD.number.size) })}
          </g>
        )
        return (
          <g key={i} data-binder-part={split.name}>
            {paintBinderPhoto(it.asset_id, { x, y, w, h: CARD.photo.h }, ctx, inks)}
            {lit ? <Lead id="part">{num}</Lead> : num}
            {tag ? (
              <g data-binder-part-tag="">
                {paintBinderLine(tag.text, { ctx, x: x + w, top: y + CARD.number.dy, lineHeight: CARD.number.lineHeight, size: CARD.tag.size, anchor: "end", fill: binderText(inks.muted, inks.ground, CARD.tag.size) })}
              </g>
            ) : null}
            {open ? (
              <line data-binder-part-open="" x1={x} y1={y + CARD.rule + 0.5} x2={x + w} y2={y + CARD.rule + 0.5} stroke={inks.tick} strokeWidth={1} strokeDasharray={CARD.dash} />
            ) : (
              <rect x={x} y={y + CARD.rule} width={w} height={1} fill={inks.line} />
            )}
            {paintBinderIcon(it.icon!, x + CARD.icon.x, y + CARD.icon.dy, CARD.icon.size, inks.deep, inks.ground)}
            {paintBinder(name, { ctx, x: x + CARD.name.x, top: y + CARD.name.dy, bold: true, fill: binderText(inks.deep, inks.ground, CARD.name.size), lastAttrs: glossBreak(split.sep) })}
            {paintBinder(text, { ctx, x: x + CARD.text.x, top: y + CARD.text.dy, fill: binderText(inks.ink, inks.ground, CARD.text.size) })}
          </g>
        )
      })}
    </g>
  )
}

const number = (i: number): string => String(i + 1).padStart(2, "0")
