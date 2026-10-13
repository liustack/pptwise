import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { graphicInk } from "../../render/ink"
import { binderInks, binderText, binderWidth, fitBinder, paintBinder, paintBinderIcon, paintBinderLine, paintCheckbox } from "./binder"
import { BinderClosingLine, fitClosingLine } from "./binder-bars"
import type { Recipe } from "./recipe"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * papers: what a client is asked to hand over, as a checklist, proposal's
 * 2026-10 print board (p18). Two columns of rows parted by hairlines, each a
 * paper: an empty box to tick, its icon in petrol, its name bold, what it is
 * used for in grey, and who holds it in small grey at the row's right (the
 * item's tag). Under the rows, the closing line under a 2px rule of petrol,
 * its first sentence bold and the rest grey.
 *
 * Takes, in the binder setting: an `icon_cards` of two to six with no title
 * or tone, each with a tag; then optionally a `callout` with no title, icon
 * or tag.
 *
 * Declines: a name past one line beside its tag, a text past one line, and
 * a closing line past one line.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const ROW = { top: 6, gap: 48, h: 80, step: 92, box: { x: 0, dy: 22, size: 18 }, icon: { x: 30, dy: 20, size: 22 }, name: { x: 64, dy: 16, size: 18, lineHeight: 30 }, text: { x: 64, dy: 50, size: 14, lineHeight: 22 }, tag: { dy: 20, size: 13, lineHeight: 22, gap: 12 } } as const
const CLOSING_GAP = 24

/** What an author writes to get this drawing (`./recipe.ts`). */
export const papersRecipe: Recipe = {
  look: "What a client is asked to hand over, as a checklist",
  kinds: ["list"],
  shapes: [{ parts: [{ type: "icon_cards", count: [2, 6], needs: ["items[*].tag"] }, { type: "callout", optional: true }] }],
}

export const papersComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [cards, note, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0 || (note && note.type !== "callout")) return null
  const ic = cards as IconCards & { title?: string }
  const n = ic.items.length
  if (ic.title || n < 2 || n > 6 || ic.items.some((it) => !it.tag || (it as { tone?: string }).tone)) return null
  const rows = Math.ceil(n / 2)
  const bottom = ROW.top + rows * ROW.step
  if (rect.w < 1132 || rect.h < bottom + (note ? CLOSING_GAP + 50 : 0)) return null
  const inks = binderInks(ctx)
  const w = (rect.w - ROW.gap) / 2
  const items = ic.items.map((it) => {
    const tagW = binderWidth(it.tag!.text, ROW.tag.size, ctx)
    const name = fitBinder(it.title, { width: w - ROW.name.x - tagW - ROW.tag.gap, size: ROW.name.size, lineHeight: ROW.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(it.text, { width: w - ROW.text.x, size: ROW.text.size, lineHeight: ROW.text.lineHeight, maxLines: 1 }, ctx)
    return name && text ? { it, name, text } : null
  })
  if (items.some((item) => !item)) return null
  const callout = note as Callout | undefined
  const closing = callout ? fitClosingLine(callout, rect.w, ctx) : null
  if (callout && !closing) return null
  const boxInk = graphicInk(inks.ink, inks.ground)

  return (
    <g {...compositionTag("papers")}>
      <g {...blockTag(ctx, ic)}>
        {[0, 1].map((c) => (
          <rect key={`r-${c}`} x={rect.x + c * (w + ROW.gap)} y={rect.y + ROW.top} width={w} height={1} fill={inks.line} />
        ))}
        {items.map((item, i) => {
          const { it, name, text } = item!
          const x = rect.x + (i % 2) * (w + ROW.gap)
          const y = rect.y + ROW.top + Math.floor(i / 2) * ROW.step
          return (
            <g key={i} data-binder-paper={stripEmphasis(it.title)}>
              {paintCheckbox(x + ROW.box.x, y + ROW.box.dy, ROW.box.size, boxInk)}
              {paintBinderIcon(it.icon, x + ROW.icon.x, y + ROW.icon.dy, ROW.icon.size, inks.deep, inks.ground)}
              {paintBinder(name, { ctx, x: x + ROW.name.x, top: y + ROW.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, ROW.name.size) })}
              {paintBinder(text, { ctx, x: x + ROW.text.x, top: y + ROW.text.dy, fill: binderText(inks.muted, inks.ground, ROW.text.size) })}
              <g data-binder-holder="">{paintBinderLine(it.tag!.text, { ctx, x: x + w, top: y + ROW.tag.dy, lineHeight: ROW.tag.lineHeight, size: ROW.tag.size, anchor: "end", fill: binderText(inks.muted, inks.ground, ROW.tag.size) })}</g>
              <rect x={x} y={y + ROW.step} width={w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      {callout && closing ? <BinderClosingLine callout={callout} fitted={closing} x={rect.x} y={rect.y + bottom + CLOSING_GAP} w={rect.w} ctx={ctx} /> : null}
    </g>
  )
}
