import type { Component } from "@/ir"
import { basisInk } from "../../components/tag"
import { resolveSemanticColor } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, marqueeInks, marqueeText, paintMarquee, paintMarqueeCard, paintMarqueeIcon } from "./marquee"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * scoreboard: the measures a plan will be judged by, before anyone has a
 * figure for them, rally's 2026-10 board (the KPI page, p15). Panels three
 * to a row on the stage's dark, each outlined by a hairline: the measure's
 * icon (the first in the accent, the rest grey) and its name, then three
 * short bars in the dim violet where its figure will stand, the line that
 * says when its target is set (the card's tag, in the ink of its tone or
 * basis), and how the measure is counted in grey. On the band's floor a bold
 * closing line, so a page with a source line keeps it clear of the source.
 *
 * The three bars are the empty slot of a scoreboard, not a figure: the
 * engine draws them because the measures have none yet, and every card's tag
 * must say so (`tone: "warning"` or `basis: "pending"`).
 *
 * Takes, in the marquee setting: an `icon_cards` of three to six, each with
 * a tag whose tone is warning or whose basis is pending; then optionally a
 * `callout` with no title, icon or tag.
 *
 * Declines: a name past one line, a tag's line past one line, how it is
 * counted past two lines, and the closing line past one line.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const PANELS = { top: 4, col: 392, row: 214, w: 368, h: 198, pad: 20, line: 1, icon: { y: 20, size: 22 }, name: { x: 54, top: 18, size: 17, lineHeight: 26, w: 290 }, slot: { top: 88.5, x: 20, pitch: 69.5, w: 29, h: 5 }, tag: { top: 120, size: 12, lineHeight: 18 }, text: { top: 144, size: 13, lineHeight: 20, maxLines: 2, w: 328 } } as const
/** The closing line sits on the band's floor (y624 on the board's 648), at least `gap` under the panels. */
const CLOSE = { size: 14, lineHeight: 24, gap: 12 } as const

export const scoreboardComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [cards, close, ...rest] = components
  if (cards?.type !== "icon_cards" || rest.length > 0) return null
  if (close !== undefined && (close.type !== "callout" || close.title || close.icon || close.tag)) return null
  const ic = cards as IconCards
  if (ic.items.length < 3 || ic.items.length > 6) return null
  if (ic.items.some((it) => !it.tag || !(it.tag.tone === "warning" || it.tag.basis === "pending") || it.tag.evidence || it.tag.settled)) return null
  const panelsFoot = PANELS.top + (Math.ceil(ic.items.length / 3) - 1) * PANELS.row + PANELS.h
  const closeTop = rect.h - CLOSE.lineHeight
  if (rect.w < PANELS.col * 2 + PANELS.w || rect.h < panelsFoot || (close && closeTop < panelsFoot + CLOSE.gap)) return null
  const inks = marqueeInks(ctx)
  const panels = ic.items.map((it, i) => {
    const name = fitMarquee(it.title, { width: PANELS.name.w, size: PANELS.name.size, lineHeight: PANELS.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const tag = fitMarquee(it.tag!.text, { width: PANELS.text.w, size: PANELS.tag.size, lineHeight: PANELS.tag.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = it.text.trim() ? fitMarquee(it.text, { width: PANELS.text.w, size: PANELS.text.size, lineHeight: PANELS.text.lineHeight, maxLines: PANELS.text.maxLines }, ctx) : null
    const tagInk = it.tag!.tone ? resolveSemanticColor(it.tag!.tone, ctx.colors) : basisInk(ctx.colors, it.tag!.basis!)
    return { it, i, name, tag, text, tagInk }
  })
  if (panels.some((p) => !p.name || !p.tag || (p.it.text.trim() && !p.text))) return null
  const closeFit = close?.type === "callout" ? fitMarquee(close.text, { width: rect.w, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (close && !closeFit) return null

  return (
    <g {...compositionTag("scoreboard")}>
      <g {...blockTag(ctx, ic)} data-marquee-scoreboard="">
        {panels.map((p) => {
          const x = rect.x + (p.i % 3) * PANELS.col
          const y = rect.y + PANELS.top + Math.floor(p.i / 3) * PANELS.row
          const lit = p.i === 0
          const icon = paintMarqueeIcon(p.it.icon, x + PANELS.pad, y + PANELS.icon.y, PANELS.icon.size, lit ? inks.fire : inks.muted, inks.deep)
          return (
            <g key={p.i} data-measure={p.it.title}>
              {paintMarqueeCard({ x, y, w: PANELS.w, h: PANELS.h }, inks, { fill: inks.deep, stroke: inks.line, strokeWidth: PANELS.line })}
              {lit ? <Lead id="measure">{icon}</Lead> : icon}
              {paintMarquee(p.name!, { ctx, x: x + PANELS.name.x, top: y + PANELS.name.top, bold: true, fill: marqueeText(inks.ink, inks.deep, PANELS.name.size), ground: inks.deep })}
              <g data-marquee-empty-figure="">
                {[0, 1, 2].map((k) => (
                  <rect key={k} x={x + PANELS.slot.x + k * PANELS.slot.pitch} y={y + PANELS.slot.top} width={PANELS.slot.w} height={PANELS.slot.h} fill={inks.dim} />
                ))}
              </g>
              {paintMarquee(p.tag!, { ctx, x: x + PANELS.pad, top: y + PANELS.tag.top, bold: true, fill: marqueeText(p.tagInk, inks.deep, PANELS.tag.size), ground: inks.deep })}
              {p.text ? paintMarquee(p.text, { ctx, x: x + PANELS.pad, top: y + PANELS.text.top, fill: marqueeText(inks.muted, inks.deep, PANELS.text.size), ground: inks.deep }) : null}
            </g>
          )
        })}
      </g>
      {close && closeFit ? <g {...blockTag(ctx, close as Callout)} data-marquee-close="">{paintMarquee(closeFit, { ctx, x: rect.x, top: rect.y + closeTop, bold: true, fill: marqueeText(inks.ink, inks.ground, CLOSE.size), ground: inks.ground })}</g> : null}
    </g>
  )
}
