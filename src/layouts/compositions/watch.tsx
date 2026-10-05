import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { PHOTO_CAPTION, paintPhoto } from "./inset"
import {
  dossierInks,
  dossierMeta,
  dossierText,
  dossierWidth,
  fitDossier,
  paintDossier,
  paintDossierCard,
  paintDossierIcon,
  paintDossierLine,
  type DossierInks,
} from "./dossier"
import { blockTag, compositionTag, type Composition } from "./shared"

type RowCards = Extract<Component, { type: "row_cards" }>
type Image = Extract<Component, { type: "image" }>
type Timeline = Extract<Component, { type: "timeline" }>

/*
 * watch: what to check, and when to look again, clinic's 2026-10 board (the
 * monitoring page, p17). Across the top, a card for each kind of check, its
 * icon and its title, and under them the checks themselves with a box to
 * tick, one sentence of the card's text a check, its full stop the break
 * after it (`data-gloss-break`); at the right of the cards a photograph, its
 * caption under it in 12px muted type when it has one, the picture shortened
 * to keep its foot level with the cards'. Under them the review dates along
 * one axis, each a dot with its date over it and what happens under it, the
 * date the page is about (`highlight`) a filled dot in the mark, its words in
 * the mark too, the timeline's title naming the axis at its left.
 *
 * Takes, in the dossier setting: a `row_cards` of two to four items with
 * icons, an `image`, and a horizontal `timeline` of three to six milestones
 * with no lanes, icons, tones or descriptions, in that order.
 *
 * Declines: a check past two lines or more than three in a card, a title
 * past one line, a caption past one line, a date or a label wider than its
 * share of the axis, and anything past the band.
 *
 * Reads: the dossier inks (`./dossier.tsx`), the images the face hands in,
 * the body and heading faces.
 */

const TOP = 10
const PHOTO = { w: 360, gap: 28 } as const
const CARD = { h: 248, gap: 16, r: 10, icon: { x: 20, top: 20, size: 24 }, title: { x: 54, top: 18, size: 19, lineHeight: 28 } } as const
const CHECK = { top: 64, pitch: 58, max: 3, box: { x: 20, top: 4, size: 14 }, x: 44, size: 14, lineHeight: 22, maxLines: 2, trail: 14 } as const
const AXIS = { inset: 76, at: 350, w: 2 } as const
const NODE = { r: 7, marked: 9, stroke: 2 } as const
const DATE = { baseline: 330, size: 16 } as const
const LABEL = { baseline: 382, size: 14 } as const
const NAME = { baseline: 298, size: 13 } as const

/**
 * A card's text read as its checks: one a sentence, the sentence's full stop
 * left off. `glossBreak` is the stop as the author wrote it, set as the break
 * after every check but the last.
 */
export function checksOf(text: string | undefined): { text: string; glossBreak: string }[] {
  return (text ?? "")
    .split(/(?<=[。！？!?]|\.(?=\s))\s*/u)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const stop = /[。.]$/u.exec(s)?.[0] ?? ""
      return { text: s.slice(0, s.length - stop.length).trim(), glossBreak: stop }
    })
    .filter((c) => c.text.length > 0)
}

export const watchComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "dossier") return null
  const [cards, image, timeline, ...rest] = components
  if (cards?.type !== "row_cards" || image?.type !== "image" || timeline?.type !== "timeline" || rest.length > 0) return null
  const rc = cards as RowCards
  const tl = timeline as Timeline
  const n = rc.items.length
  if (n < 2 || n > 4 || rc.items.some((item) => !item.icon || item.sub?.trim() || item.tone || item.highlight)) return null
  if (tl.layout === "vertical" || tl.lanes || tl.milestones.length < 3 || tl.milestones.length > 6) return null
  if (tl.milestones.some((m) => m.lane || m.icon || m.tone || m.desc?.trim())) return null
  if (LABEL.baseline + 4 > rect.h) return null
  const inks = dossierInks(ctx)
  const cardsW = rect.w - PHOTO.w - PHOTO.gap
  const w = (cardsW - CARD.gap * (n - 1)) / n
  const plans = rc.items.map((item) => {
    const checks = checksOf(item.text)
    return {
      item,
      title: fitDossier(item.title, { width: w - CARD.title.x - 12, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      checks: checks.map((c) => fitDossier(c.text, { width: w - CHECK.x - CHECK.trail, size: CHECK.size, lineHeight: CHECK.lineHeight, maxLines: CHECK.maxLines }, ctx)),
      breaks: checks.map((c, j) => (j < checks.length - 1 ? c.glossBreak : "")),
    }
  })
  if (plans.some((p) => !p.title || p.checks.length === 0 || p.checks.length > CHECK.max || p.checks.some((c) => !c))) return null
  const ax0 = rect.x + AXIS.inset
  const ax1 = rect.x + rect.w - AXIS.inset
  const ms = tl.milestones
  const step = (ax1 - ax0) / (ms.length - 1)
  for (const m of ms) {
    if (dossierWidth(m.date, DATE.size, ctx, true) > step - 12) return null
    if (dossierWidth(m.title, LABEL.size, ctx, m.highlight === true) > step - 12) return null
  }
  const title = tl.title?.trim() ?? ""
  const img = image as Image
  const caption = img.caption?.trim() ? fitDossier(img.caption, { width: PHOTO.w, size: PHOTO_CAPTION.size, lineHeight: PHOTO_CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  if (img.caption?.trim() && !caption) return null
  const captionH = caption ? PHOTO_CAPTION.gap + PHOTO_CAPTION.lineHeight : 0
  const photo = { x: rect.x + rect.w - PHOTO.w, y: rect.y + TOP, w: PHOTO.w, h: CARD.h - captionH }

  return (
    <g {...compositionTag("watch")}>
      <g {...blockTag(ctx, rc)}>
        {plans.map((p, i) => {
          const x = rect.x + i * (w + CARD.gap)
          const y = rect.y + TOP
          return (
            <g key={i} data-dossier-watch="">
              {paintDossierCard({ x, y, w, h: CARD.h }, inks, { r: CARD.r })}
              {paintDossierIcon(p.item.icon!, x + CARD.icon.x, y + CARD.icon.top, CARD.icon.size, inks.mark, inks.paper)}
              {paintDossier(p.title!, { ctx, x: x + CARD.title.x, top: y + CARD.title.top, bold: true, fill: dossierText(inks.ink, inks.paper, CARD.title.size), ground: inks.paper })}
              {p.checks.map((c, j) => paintCheck(c!, p.breaks[j]!, x, y + CHECK.top + j * CHECK.pitch, inks, ctx, j))}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, image)} data-dossier-photo="">
        {paintPhoto(img, photo, ctx)}
        {caption ? paintDossier(caption, { ctx, x: photo.x, top: photo.y + photo.h + PHOTO_CAPTION.gap, fill: dossierMeta(inks.muted, inks.ground) }) : null}
      </g>
      <g {...blockTag(ctx, tl)} data-dossier-reviews="">
        {title ? paintDossierLine(title, { ctx, x: rect.x, top: 0, lineHeight: 0, baseline: rect.y + NAME.baseline, size: NAME.size, bold: true, fill: dossierText(inks.mark, inks.ground, NAME.size) }) : null}
        <rect x={ax0} y={rect.y + AXIS.at - AXIS.w / 2} width={ax1 - ax0} height={AXIS.w} fill={inks.ink} />
        {ms.map((m, i) => {
          const x = ax0 + i * step
          const marked = m.highlight === true
          return (
            <g key={i} data-dossier-review={marked ? "marked" : ""}>
              <circle cx={x} cy={rect.y + AXIS.at} r={marked ? NODE.marked : NODE.r} fill={marked ? inks.mark : inks.ground} stroke={inks.mark} strokeWidth={NODE.stroke} />
              {paintDossierLine(m.date, { ctx, x, top: 0, lineHeight: 0, baseline: rect.y + DATE.baseline, size: DATE.size, bold: true, anchor: "middle", fill: dossierText(marked ? inks.mark : inks.ink, inks.ground, DATE.size) })}
              {paintDossierLine(m.title, { ctx, x, top: 0, lineHeight: 0, baseline: rect.y + LABEL.baseline, size: LABEL.size, bold: marked, anchor: "middle", fill: dossierText(marked ? inks.mark : inks.muted, inks.ground, LABEL.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}

/** One check: an empty box to tick in the mark, and the check beside it. */
function paintCheck(text: NonNullable<ReturnType<typeof fitDossier>>, glossBreak: string, x: number, top: number, inks: DossierInks, ctx: ComponentCtx, key: number): React.ReactElement {
  return (
    <g key={key} data-dossier-check="">
      <rect x={x + CHECK.box.x + 0.75} y={top + CHECK.box.top + 0.75} width={CHECK.box.size - 1.5} height={CHECK.box.size - 1.5} rx={2} fill="none" stroke={inks.mark} strokeWidth={1.5} />
      {paintDossier(text, { ctx, x: x + CHECK.x, top, fill: dossierText(inks.ink, inks.paper, CHECK.size), ground: inks.paper, ...(glossBreak ? { lastAttrs: { "data-gloss-break": glossBreak } } : {}) })}
    </g>
  )
}
