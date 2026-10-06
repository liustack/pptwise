import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  Aside,
  fitAside,
  fitManuscript,
  manuscriptBaseline,
  manuscriptChipWidth,
  manuscriptInks,
  manuscriptSmall,
  manuscriptText,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptCard,
  paintManuscriptChip,
  paintManuscriptIcon,
  splitMiddleDot,
  stripMarks,
  type AsideSpec,
} from "./manuscript"

type Kpis = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * findings: studies side by side, each in its own unit, thesis's 2026-10
 * board (p10). A card a study in a grid of two columns: its icon in
 * emerald, what it measures in the heading serif, the unit its result is in
 * as a chip of pale emerald at the top right, its authors in the heading
 * serif with the journal after them in italics, its data and method in the
 * muted ink, and its result set large in emerald. The cards are not
 * numbered or ranked: their units differ. A closing line with a gold bar.
 *
 * Takes, in the manuscript setting: a `kpi_cards` of two to four, each with
 * an icon, a label (what it measures), a tag (the unit), a source written
 * "authors · journal", a note (data and method) and a value, then
 * optionally a `callout` with no title, icon or tag.
 *
 * Declines: a line past its card's width, a closing line past one line.
 *
 * Reads: the manuscript inks (`./manuscript.tsx`).
 */

const GRID = { pitchX: 584, pitchY: 196, w: 568, h: 182 } as const
const CARD = { pad: 22, icon: { dy: 22, size: 22 }, topic: { dx: 54, dy: 18, size: 19, h: 30, w: 300 }, chip: { dy: 22, size: 11, h: 22 }, source: { dy: 58, size: 14, h: 22 }, note: { dy: 82, size: 13, h: 22 }, result: { dy: 116, size: 26, h: 44 } } as const
const CLOSE = { gap: 22, h: 44 } as const
const CLOSE_SPEC: AsideSpec = { size: 15, lineHeight: 44, maxLines: 1, pad: 0 }

export const findingsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "manuscript") return null
  const [cards, close, ...rest] = components
  if (cards?.type !== "kpi_cards" || rest.length > 0 || (close && close.type !== "callout")) return null
  const k = cards as Kpis
  const cl = close as Callout | undefined
  if (k.items.length < 2 || k.items.length > 4) return null
  if (k.items.some((it) => !it.icon || !it.tag || !it.source?.trim() || !it.note?.trim() || it.unit || it.delta || it.tone)) return null
  if (cl && (cl.title || cl.icon || cl.tag)) return null
  const rows = Math.ceil(k.items.length / 2)
  const gridH = (rows - 1) * GRID.pitchY + GRID.h
  if (rect.w < GRID.pitchX + GRID.w || rect.h < gridH + (cl ? CLOSE.gap + CLOSE.h : 0)) return null
  const inks = manuscriptInks(ctx)
  const card = inks.card
  const textW = GRID.w - CARD.pad * 2
  const fitted = k.items.map((it) => {
    const src = splitMiddleDot(it.source!.trim())
    const chipW = manuscriptChipWidth(it.tag!.text, CARD.chip.size, ctx)
    const authors = src ? src.name : it.source!.trim()
    const journal = src?.rest ?? ""
    const sourceFits = manuscriptWidth(authors, CARD.source.size, ctx, { serif: true, bold: true }) + (journal ? manuscriptWidth(`\u3000${journal}`, CARD.source.size, ctx, { serif: true }) : 0) <= textW
    return {
      it,
      authors,
      journal,
      sourceFits,
      topic: fitManuscript(it.label, { width: Math.min(CARD.topic.w, GRID.w - CARD.topic.dx - CARD.pad - chipW - 12), size: CARD.topic.size, lineHeight: CARD.topic.h, maxLines: 1, serif: true, bold: true }, ctx),
      note: fitManuscript(it.note!, { width: textW, size: CARD.note.size, lineHeight: CARD.note.h, maxLines: 1 }, ctx),
      result: fitManuscript(stripMarks(it.value), { width: textW, size: CARD.result.size, lineHeight: CARD.result.h, maxLines: 1, serif: true, bold: true }, ctx),
    }
  })
  if (fitted.some((f) => !f.topic || !f.note || !f.result || !f.sourceFits)) return null
  const closing = cl ? fitAside(cl.text, rect.w, CLOSE_SPEC, ctx) : null
  if (cl && !closing) return null
  return (
    <g {...compositionTag("findings")}>
      <g {...blockTag(ctx, k)}>
        {fitted.map((f, i) => {
          const x = rect.x + (i % 2) * GRID.pitchX
          const y = rect.y + Math.floor(i / 2) * GRID.pitchY
          const chipW = manuscriptChipWidth(f.it.tag!.text, CARD.chip.size, ctx)
          const sourceY = manuscriptBaseline(y + CARD.source.dy, CARD.source.h, CARD.source.size, true)
          return (
            <g key={i} data-manuscript-study={f.it.label}>
              {paintManuscriptCard({ x, y, w: GRID.w, h: GRID.h }, inks)}
              {paintManuscriptIcon(f.it.icon!, x + CARD.pad, y + CARD.icon.dy, CARD.icon.size, inks.deep, card)}
              {paintManuscript(f.topic!, { ctx, x: x + CARD.topic.dx, top: y + CARD.topic.dy, serif: true, bold: true, fill: manuscriptText(inks.ink, card, CARD.topic.size), ground: card })}
              {paintManuscriptChip(f.it.tag!.text, x + GRID.w - CARD.pad - chipW, y + CARD.chip.dy, { size: CARD.chip.size, h: CARD.chip.h, fg: inks.deep, bg: inks.deepPale }, ctx).node}
              {/* The authors bold and the journal after them in italics, a full-width space apart: the middle dot the author wrote is declared on the authors rather than printed. */}
              <text {...manuscriptSmall(CARD.source.size)} x={x + CARD.pad} y={sourceY} fontFamily={ctx.fonts.heading} fontSize={CARD.source.size} fontWeight="700" fill={manuscriptText(inks.ink, card, CARD.source.size)} dominantBaseline="alphabetic" {...(f.journal ? { "data-gloss-break": " · " } : {})}>
                {f.authors}
              </text>
              {f.journal ? (
                <text {...manuscriptSmall(CARD.source.size)} x={x + CARD.pad + manuscriptWidth(`${f.authors}\u3000`, CARD.source.size, ctx, { serif: true, bold: true })} y={sourceY} fontFamily={ctx.fonts.heading} fontSize={CARD.source.size} fontStyle="italic" fill={manuscriptText(inks.muted, card, CARD.source.size)} dominantBaseline="alphabetic">
                  {f.journal}
                </text>
              ) : null}
              {paintManuscript(f.note!, { ctx, x: x + CARD.pad, top: y + CARD.note.dy, fill: manuscriptText(inks.muted, card, CARD.note.size), ground: card })}
              {paintManuscript(f.result!, { ctx, x: x + CARD.pad, top: y + CARD.result.dy, serif: true, bold: true, fill: manuscriptText(inks.deep, card, CARD.result.size), ground: card })}
            </g>
          )
        })}
      </g>
      {cl && closing ? (
        <g {...blockTag(ctx, cl)}>
          <Aside layout={closing} x={rect.x} y={rect.y + gridH + CLOSE.gap} w={rect.w} h={CLOSE.h} spec={CLOSE_SPEC} ctx={ctx} />
        </g>
      ) : null}
    </g>
  )
}
