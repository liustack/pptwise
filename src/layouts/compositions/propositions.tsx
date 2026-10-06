import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Aside,
  ILLUSTRATION_CAPTION,
  fitAside,
  fitManuscript,
  glossBreak,
  manuscriptChipWidth,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  paintManuscript,
  paintManuscriptCard,
  paintManuscriptChip,
  paintManuscriptIcon,
  paintManuscriptPhoto,
  splitLabel,
  type AsideSpec,
} from "./manuscript"

type Cards = Extract<Component, { type: "icon_cards" }>
type Image = Extract<Component, { type: "image" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * propositions: the hypotheses a study tests, thesis's 2026-10 board (p12).
 * A card a hypothesis down the left: its label set large in emerald in the
 * heading serif (「H1」), its direction as a gold icon, its claim in the
 * heading serif, the sign it is expected to take as a chip of pale emerald
 * at the right, then what it says and, under it in the muted ink, what it
 * rests on. A photograph that illustrates the page at the right with its
 * plain caption, and a closing line with a gold bar under the cards.
 *
 * Takes, in the manuscript setting: an `icon_cards` of two to four with no
 * title or tone, each titled "label：claim", tagged with its expected sign,
 * its text one or more sentences of which the last is what it rests on,
 * then an `image` and optionally a `callout` with no title, icon or tag.
 *
 * Declines: a label wider than 80px, a line past its card.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const CARDS = { w: 820, h: 118, pitch: 130, label: { dx: 20, dy: 18, size: 40, h: 60, w: 80 }, icon: { dx: 108, dy: 30, size: 22 }, title: { dx: 140, dy: 22, size: 20, h: 30 }, chip: { pad: 22, dy: 24, size: 12, h: 24 }, text: { dx: 140, dy: 56, size: 14, h: 22, w: 650 }, basis: { dy: 84, size: 12, h: 20 } } as const
const PHOTO = { dx: 840, w: 312 } as const
const CLOSE = { gap: 22, h: 40 } as const
const CLOSE_SPEC: AsideSpec = { size: 14, lineHeight: 40, maxLines: 1, pad: 0 }

/** Splits a text at its last sentence end into what it says and what it rests on. */
function splitLast(text: string): { say: string; sep: string; basis: string } | null {
  const t = text.trim()
  const at = Math.max(t.lastIndexOf("。"), t.lastIndexOf(". "))
  if (at <= 0) return null
  const sep = t.slice(at, at + (t[at] === "。" ? 1 : 2))
  const say = t.slice(0, at).trim()
  const basis = t.slice(at + sep.length).trim()
  return say && basis ? { say, sep, basis } : null
}

export const propositionsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [cards, image, close, ...rest] = components
  if (cards?.type !== "icon_cards" || image?.type !== "image" || rest.length > 0 || (close && close.type !== "callout")) return null
  const k = cards as Cards
  const img = image as Image
  const cl = close as Callout | undefined
  if (k.title?.trim() || k.items.length < 2 || k.items.length > 4 || k.items.some((it) => !it.tag || it.tone)) return null
  if (cl && (cl.title || cl.icon || cl.tag)) return null
  const cardsH = (k.items.length - 1) * CARDS.pitch + CARDS.h
  if (rect.w < PHOTO.dx + PHOTO.w || rect.h < cardsH + (cl ? CLOSE.gap + CLOSE.h : 0)) return null
  const inks = manuscriptInks(ctx)
  const card = inks.card
  const fitted = k.items.map((it) => {
    const name = splitLabel(it.title)
    const parts = splitLast(it.text)
    if (!name) return null
    const chipW = manuscriptChipWidth(it.tag!.text, CARDS.chip.size, ctx)
    const label = fitManuscript(name.name, { width: CARDS.label.w, size: CARDS.label.size, lineHeight: CARDS.label.h, maxLines: 1, serif: true, bold: true }, ctx)
    const title = fitManuscript(name.rest, { width: CARDS.w - CARDS.title.dx - CARDS.chip.pad - chipW - 12, size: CARDS.title.size, lineHeight: CARDS.title.h, maxLines: 1, serif: true, bold: true }, ctx)
    const say = fitManuscript(parts ? parts.say : it.text, { width: CARDS.text.w, size: CARDS.text.size, lineHeight: CARDS.text.h, maxLines: 1 }, ctx)
    const basis = parts ? fitManuscript(parts.basis, { width: CARDS.text.w, size: CARDS.basis.size, lineHeight: CARDS.basis.h, maxLines: 1 }, ctx) : null
    return label && title && say && (!parts || basis) ? { it, name, parts, label, title, say, basis } : null
  })
  if (fitted.some((f) => !f)) return null
  const caption = img.caption?.trim() ? fitManuscript(img.caption, { width: PHOTO.w, size: ILLUSTRATION_CAPTION.size, lineHeight: ILLUSTRATION_CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !caption) return null
  const closing = cl ? fitAside(cl.text, CARDS.w, CLOSE_SPEC, ctx) : null
  if (cl && !closing) return null
  // The photograph stands as tall as the cards, its caption under it.
  const photoTop = rect.y
  const photoHeight = cardsH
  return (
    <g {...compositionTag("propositions")}>
      <g {...blockTag(ctx, k)}>
        {fitted.map((f, i) => {
          const y = rect.y + i * CARDS.pitch
          const chipW = manuscriptChipWidth(f!.it.tag!.text, CARDS.chip.size, ctx)
          return (
            <g key={i} data-manuscript-hypothesis={f!.name.name}>
              {paintManuscriptCard({ x: rect.x, y, w: CARDS.w, h: CARDS.h }, inks)}
              <g {...glossBreak(f!.name.sep)}>{paintManuscript(f!.label!, { ctx, x: rect.x + CARDS.label.dx, top: y + CARDS.label.dy, serif: true, bold: true, fill: manuscriptText(inks.deep, card, CARDS.label.size), ground: card })}</g>
              {paintManuscriptIcon(f!.it.icon, rect.x + CARDS.icon.dx, y + CARDS.icon.dy, CARDS.icon.size, inks.gold, card)}
              {paintManuscript(f!.title!, { ctx, x: rect.x + CARDS.title.dx, top: y + CARDS.title.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, card, CARDS.title.size), ground: card })}
              {paintManuscriptChip(f!.it.tag!.text, rect.x + CARDS.w - CARDS.chip.pad - chipW, y + CARDS.chip.dy, { size: CARDS.chip.size, h: CARDS.chip.h, fg: inks.deep, bg: inks.deepPale }, ctx).node}
              <g {...glossBreak(f!.parts?.sep)}>{paintManuscript(f!.say!, { ctx, x: rect.x + CARDS.text.dx, top: y + CARDS.text.dy, fill: manuscriptText(inks.ink, card, CARDS.text.size), ground: card })}</g>
              {f!.basis ? paintManuscript(f!.basis, { ctx, x: rect.x + CARDS.text.dx, top: y + CARDS.basis.dy, fill: manuscriptText(inks.muted, card, CARDS.basis.size), ground: card }) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, img)}>
        {paintManuscriptPhoto(img.asset_id, { x: rect.x + PHOTO.dx, y: photoTop, w: PHOTO.w, h: photoHeight }, ctx)}
        {caption ? <g data-manuscript-illustration="">{paintManuscript(caption, { ctx, x: rect.x + PHOTO.dx, top: photoTop + photoHeight + 4, fill: manuscriptMeta(inks.muted, inks.ground) })}</g> : null}
      </g>
      {cl && closing ? (
        <g {...blockTag(ctx, cl)}>
          <Aside layout={closing} x={rect.x} y={rect.y + cardsH + CLOSE.gap} w={CARDS.w} h={CLOSE.h} spec={CLOSE_SPEC} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}
