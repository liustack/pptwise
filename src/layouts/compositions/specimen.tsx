import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  PlacardGlow,
  fitPlacard,
  fitPlacardCaption,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardCaption,
  paintPlacardPhoto,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardInks,
  placardMark,
  placardText,
  placardTrackedWidth,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Image = Extract<Component, { type: "image" }>
type Kpi = Extract<Component, { type: "kpi_cards" }>
type Bullets = Extract<Component, { type: "bullets" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * specimen: one exhibit in its pool of light beside its label, museum's
 * 2026-10 board (p06, p10). The claim over the page. At the left the
 * exhibit's photograph cut round, 420px across, standing in a pool of warm
 * light with a seam drawn round it, its caption small under it. At the
 * right the label on a lifted board with a copper edge along its top: the
 * exhibit's number small and tracked in copper (「展品 1」), its name in the
 * serif, its age or date in a lit copper under it, a few lines of fact in
 * old paper, a seam, a small copper label and the line the exhibit reads
 * aloud in the serif (「它让我们知道」 and what it tells us), and the source
 * at the label's foot.
 *
 * Takes, in the placard setting: an `image`, then a `kpi_cards` of one item
 * whose label names the exhibit, whose value and unit are its age or date
 * and whose tag is its number, then optionally a `bullets` of one to three
 * facts, then optionally a `paragraph`, the line it reads aloud, which may
 * open with a short label and a colon (「它让我们知道：」, "What it tells
 * us:") set small over it.
 *
 * Declines: a name past one line, a fact past one line, the line it reads
 * aloud past three lines, a label that runs into the source.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const LIGHT = { cx: 330, cy: 420, r: 300, strength: 0.2 } as const
const LENS = { x: 120, y: 190, d: 420, ring: 214 } as const
const CAPTION = { top: 626 } as const
const CARD = { x: 660, y: 182, w: 556, h: 470, pad: 26, edge: 2 } as const
const NUMBER = { dy: 20, size: 11, lineHeight: 18, tracking: 4 } as const
const NAME = { dy: 44, size: 26, lineHeight: 36 } as const
const ERA = { dy: 86, size: 15, lineHeight: 22 } as const
const FACT = { dy: 122, size: 13, lineHeight: 22, pitch: 24, max: 3 } as const
const LEARN = { gap: 10, label: { dy: 12, size: 11, lineHeight: 18, tracking: 2 }, line: { dy: 36, size: 22, lineHeight: 34, maxLines: 3 } } as const
const SOURCE = { up: 40, lineHeight: 15 } as const

/** A line led by a short label and a colon: the label and the rest, or `null` when it opens no such way. */
export function ledLine(text: string): { label: string; line: string } | null {
  const m = /^([^：:。.!?！？\n]{1,24})[：:]\s*([\s\S]+)$/u.exec(text.trim())
  return m ? { label: m[1]!.trim(), line: m[2]!.trim() } : null
}

export const specimenComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect)) return null
  const [image, kpi, ...rest] = components
  if (image?.type !== "image" || kpi?.type !== "kpi_cards") return null
  const bullets = rest[0]?.type === "bullets" ? (rest.shift() as Bullets) : undefined
  const close = rest[0]?.type === "paragraph" ? (rest.shift() as Paragraph) : undefined
  if (rest.length > 0) return null
  const items = (kpi as Kpi).items
  if (items.length !== 1) return null
  const item = items[0]!
  if (item.icon || item.note || item.source || item.delta || item.tone) return null
  const facts = bullets?.items ?? []
  if (facts.length > FACT.max) return null
  const inks = placardInks(ctx)
  const board = inks.board
  const inner = CARD.w - CARD.pad * 2
  const number = stripEmphasis(item.tag?.text ?? "").trim()
  if (number && placardTrackedWidth(number, NUMBER.size, NUMBER.tracking, ctx, { bold: true }) > inner) return null
  const name = fitPlacard(item.label, { width: inner, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx)
  const eraText = [stripEmphasis(item.value).trim(), item.unit?.trim()].filter(Boolean).join(" ")
  const era = eraText ? fitPlacard(eraText, { width: inner, size: ERA.size, lineHeight: ERA.lineHeight, maxLines: 1, serif: true }, ctx) : undefined
  const lines = facts.map((f) => fitPlacard(f, { width: inner, size: FACT.size, lineHeight: FACT.lineHeight, maxLines: 1 }, ctx))
  if (!name || era === null || lines.some((l) => !l)) return null
  const led = close ? ledLine((close as Paragraph).text) : null
  const learnLabel = led?.label
  if (learnLabel && placardTrackedWidth(learnLabel, LEARN.label.size, LEARN.label.tracking, ctx, { bold: true }) > inner) return null
  const said = close ? fitPlacardSentence(led?.line ?? (close as Paragraph).text, { width: inner, size: LEARN.line.size, lineHeight: LEARN.line.lineHeight, maxLines: LEARN.line.maxLines, serif: true }, ctx) : undefined
  if (said === null) return null
  const caption = (image as Image).caption?.trim() ? fitPlacardCaption((image as Image).caption, LENS.d + 120, ctx) : undefined
  if (caption === null) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const top = rect.y + CARD.y
  const seam = top + FACT.dy + facts.length * FACT.pitch + LEARN.gap
  const saidBottom = said ? seam + LEARN.line.dy + said.lines.length * LEARN.line.lineHeight : seam
  const foot = placePlacardSource(source, { x: rect.x + CARD.x + CARD.pad, w: inner, top: top + CARD.h - SOURCE.up, lineHeight: SOURCE.lineHeight, ground: board })
  if (foot === false) return null
  if (foot && saidBottom > top + CARD.h - SOURCE.up - 8) return null
  if (saidBottom > top + CARD.h - 16) return null
  const x = rect.x + CARD.x + CARD.pad
  const cx = rect.x + LENS.x + LENS.d / 2
  const cy = rect.y + LENS.y + LENS.d / 2
  return (
    <g {...compositionTag("specimen")}>
      {head}
      <g {...blockTag(ctx, image)} data-placard-specimen="">
        <PlacardGlow id="placard-specimen-light" cx={rect.x + LIGHT.cx} cy={rect.y + LIGHT.cy} r={LIGHT.r} strength={LIGHT.strength} ctx={ctx} />
        {paintPlacardPhoto((image as Image).asset_id, { x: rect.x + LENS.x, y: rect.y + LENS.y, w: LENS.d, h: LENS.d }, ctx, { crop: (image as Image).crop, round: true })}
        <circle cx={cx} cy={cy} r={LENS.ring} fill="none" stroke={inks.line} strokeWidth={1} />
        {caption ? paintPlacardCaption(caption, { ctx, x: cx, top: rect.y + CAPTION.top, anchor: "middle" }) : null}
      </g>
      <g {...blockTag(ctx, kpi)} data-placard-label="">
        <rect x={rect.x + CARD.x} y={top} width={CARD.w} height={CARD.h} fill={board} />
        {paintPlacardRule(rect.x + CARD.x, rect.x + CARD.x + CARD.w, top + CARD.edge / 2, placardMark(inks.copper, inks.ground), CARD.edge)}
        {number ? <g data-placard-number={number}>{paintPlacardTracked({ ctx, text: number, x, y: placardBaseline(top + NUMBER.dy, NUMBER.lineHeight, NUMBER.size), size: NUMBER.size, tracking: NUMBER.tracking, bold: true, fill: placardText(inks.copper, board, NUMBER.size) })}</g> : null}
        {paintPlacard(name, { ctx, x, top: top + NAME.dy, fill: placardText(inks.ink, board, NAME.size), serif: true, ground: board })}
        {era ? <g data-placard-era="">{paintPlacard(era, { ctx, x, top: top + ERA.dy, fill: placardText(inks.lit, board, ERA.size), serif: true, ground: board })}</g> : null}
      </g>
      {bullets ? (
        <g {...blockTag(ctx, bullets)} data-placard-facts="">
          {lines.map((l, i) => (
            <g key={i}>{paintPlacard(l!, { ctx, x, top: top + FACT.dy + i * FACT.pitch, fill: placardText(inks.muted, board, FACT.size), ground: board })}</g>
          ))}
        </g>
      ) : null}
      {close ? (
        <g {...blockTag(ctx, close)} data-placard-learn="">
          {paintPlacardRule(x, x + inner, seam, inks.line, 1)}
          {learnLabel ? paintPlacardTracked({ ctx, text: learnLabel, x, y: placardBaseline(seam + LEARN.label.dy, LEARN.label.lineHeight, LEARN.label.size), size: LEARN.label.size, tracking: LEARN.label.tracking, bold: true, fill: placardText(inks.copper, board, LEARN.label.size) }) : null}
          {said ? paintPlacard(said, { ctx, x, top: seam + (learnLabel ? LEARN.line.dy : LEARN.label.dy), fill: placardText(inks.ink, board, LEARN.line.size), serif: true, ground: board }) : null}
        </g>
      ) : null}
      {foot}
    </g>
  )
}

