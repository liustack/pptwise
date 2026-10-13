import type React from "react"
import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { paintPortraitPhoto, splitFigure } from "./portrait"
import {
  accountBaseline,
  accountBodyBottom,
  accountFigureWidth,
  accountInks,
  accountMark,
  accountText,
  accountWidth,
  figureBaseline,
  figureNumber,
  figureSign,
  paintAccountFigure,
  paintAccountLine,
  paintAccountRule,
  placeAccountHead,
  placeAccountSource,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Image = Extract<Component, { type: "image" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>
type People = Extract<Component, { type: "people_cards" }>

/*
 * headcount: how the speaker's team changed over the year and who grew in
 * it, beside a photograph of the team, recap's 2026-10 board (p09). The
 * photograph bleeds from x880 to the page's right edge the full height of the
 * page. In the column from x80 to x820: the section line and the claim, and
 * from y204, under a 2px rule of the ink, the headcount as figures in
 * columns: each its label at 13px in the grey over the figure at 48px in the
 * figure face, then, for every figure but the last, as many small person
 * marks as it counts (solid in the ink, a loss dashed in the grey with its
 * figure in the grey), then its note at 13px in the body ink, line for line
 * as the author broke it (straight under the figure where it has no marks). From y456 the people the year was about, in two
 * columns: each name at 20px heavy under a rule, the role at 16px and the
 * affiliation at 14px under it. A role that writes a move (「专员 → 运营商渠道
 * 主管」) sets where the person came from in the grey and where they went
 * bold in the deep accent, with an arrow between, under a 3px rule of the
 * accent; the others under a hairline of the ink. The footer keeps to the
 * column (`data-frame-right`), and a source that credits the photograph
 * follows the deck's label there.
 *
 * Takes, in the account setting: an `image`, a `kpi_cards` of three or four
 * items and a `people_cards` of two people, in any order.
 *
 * Declines: a caption, a people title, an item with an icon, a delta, a tag,
 * a tone or a source, a figure or a label wider than its column, a note line
 * wider than its column or past two lines, a name, a role or an affiliation
 * wider than its column, a column that runs into the footer.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces, the
 * image's crop or its centre.
 */

const PHOTO = { x: 880, y: 0, w: 400, h: 720 } as const
const COLUMN = { x: 80, w: 740 } as const
const STRIP = { top: 204, rule: 2, pad: 18, gap: 16, minCol: 140, iconsPad: 36, label: 13, labelH: 18, between: 8, figure: { size: 48, unit: 18, gap: 4 }, person: 20, personGap: 3, maxPeople: 12, note: 13, noteH: 20, noteLines: 2 } as const
const CREW = { top: 456, gap: 28, lead: 3, rule: 1, pad: 15, name: 20, nameH: 28, between: 8, role: 16, roleH: 24, org: 14, orgH: 20, arrow: { w: 22, h: 10, gap: 10 } } as const

/** A person mark of `s` from `x`, `y`: a head and shoulders, solid or dashed. */
function personMark(x: number, y: number, s: number, ink: string, dashed: boolean, key: number): React.ReactElement {
  const k = s / 24
  const dash = dashed ? { strokeDasharray: "3 2" } : {}
  return (
    <g key={key} data-account-person={dashed ? "gone" : "here"}>
      <circle cx={x + 12 * k} cy={y + 8 * k} r={5 * k} fill="none" stroke={ink} strokeWidth={2 * k} {...dash} />
      <path d={`M${x + 20 * k} ${y + 21 * k}A${8 * k} ${8 * k} 0 0 0 ${x + 4 * k} ${y + 21 * k}`} fill="none" stroke={ink} strokeWidth={2 * k} {...dash} />
    </g>
  )
}

/** The two sides of a role that writes a move, or `null`. */
export function roleMove(role: string): { from: string; to: string } | null {
  const parts = stripEmphasis(role).split("→")
  if (parts.length !== 2) return null
  const from = parts[0]!.trim()
  const to = parts[1]!.trim()
  return from && to ? { from, to } : null
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const headcountRecipe: Recipe = {
  look: "How the speaker's team changed over the year and who grew in it, beside a photograph of the team",
  kinds: ["photo"],
  shapes: [{ parts: [{ type: "image" }, { type: "kpi_cards", count: [3, 4] }, { type: "people_cards", count: [2, 2] }] }],
}

export const headcountComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 3) return null
  const image = components.find((c): c is Image => c.type === "image")
  const kpis = components.find((c): c is Kpis => c.type === "kpi_cards")
  const crew = components.find((c): c is People => c.type === "people_cards")
  if (!image || !kpis || !crew || image.caption?.trim() || crew.title?.trim() || crew.people.length !== 2) return null
  const items = kpis.items
  if (items.length < 3 || items.length > 4 || items.some((it) => it.icon || it.delta || it.tag || it.tone || it.source)) return null
  const inks = accountInks(ctx)
  const ground = inks.ground
  const n = items.length
  const counts = items.slice(0, -1).map((it) => {
    const v = figureNumber(it.value)
    return v !== null && Number.isInteger(v) && Math.abs(v) >= 1 && Math.abs(v) <= STRIP.maxPeople ? Math.abs(v) : null
  })
  const marks = counts.every((c) => c !== null)
  const iconsW = (c: number) => c * STRIP.person + (c - 1) * STRIP.personGap
  const widths = items.slice(0, -1).map((_, i) => (marks ? Math.max(STRIP.minCol, Math.ceil((iconsW(counts[i]!) + STRIP.iconsPad) / 10) * 10) : Math.floor((COLUMN.w - STRIP.gap * (n - 1)) / n)))
  const lastW = COLUMN.w - widths.reduce((a, b) => a + b, 0) - STRIP.gap * (n - 1)
  if (lastW < STRIP.minCol - 20) return null
  const colW = [...widths, lastW]
  const cells = items.map((it, i) => ({
    it,
    figure: splitFigure(it.value, it.unit),
    loss: figureSign(it.value) < 0,
    label: stripEmphasis(it.label).trim(),
    note: (it.note ?? "")
      .split(/\n/)
      .map((l) => stripEmphasis(l).trim())
      .filter(Boolean),
    w: colW[i]!,
  }))
  if (cells.some((c) => accountWidth(c.label, STRIP.label, ctx) > c.w || accountFigureWidth(c.figure.value, c.figure.unit, STRIP.figure, ctx) > c.w || c.note.length > STRIP.noteLines || c.note.some((l) => accountWidth(l, STRIP.note, ctx) > c.w))) return null
  const people = crew.people.map((p) => ({ name: stripEmphasis(p.name).trim(), role: p.role?.trim() ? stripEmphasis(p.role).trim() : null, move: p.role ? roleMove(p.role) : null, org: p.org?.trim() ? stripEmphasis(p.org).trim() : null }))
  const crewW = (COLUMN.w - CREW.gap) / 2
  const roleW = (p: (typeof people)[number]) => (p.move ? accountWidth(p.move.from, CREW.role, ctx) + CREW.arrow.gap * 2 + CREW.arrow.w + accountWidth(p.move.to, CREW.role, ctx, { bold: true }) : p.role ? accountWidth(p.role, CREW.role, ctx) : 0)
  if (people.some((p) => accountWidth(p.name, CREW.name, ctx, { bold: true }) > crewW || roleW(p) > crewW || (p.org && accountWidth(p.org, CREW.org, ctx) > crewW))) return null
  const head = placeAccountHead(kicker, claim, { x: COLUMN.x, w: COLUMN.w, maxLines: 2 })
  if (!head) return null
  const credit = placeAccountSource(source, { x: COLUMN.x, w: COLUMN.w, footer: true })
  if (credit === false) return null
  const stripTop = Math.max(STRIP.top, head.bottom + 75)
  const noteLines = Math.max(...cells.map((c) => c.note.length))
  const stripBottom = stripTop + STRIP.rule + STRIP.pad + STRIP.labelH + STRIP.between + STRIP.figure.size + (marks ? STRIP.between + STRIP.person : 0) + (noteLines ? STRIP.between + noteLines * STRIP.noteH : 0)
  const crewTop = Math.max(CREW.top, stripBottom + 40)
  const crewBottom = crewTop + CREW.lead + CREW.pad + CREW.nameH + CREW.between + CREW.roleH + (people.some((p) => p.org) ? CREW.between + CREW.orgH : 0)
  if (crewBottom > accountBodyBottom(credit, 660)) return null
  const figTop = stripTop + STRIP.rule + STRIP.pad + STRIP.labelH + STRIP.between
  const marksTop = figTop + STRIP.figure.size + STRIP.between
  const notesTop = marksTop + (marks ? STRIP.person + STRIP.between : 0)
  let x = COLUMN.x
  return (
    <g {...compositionTag("headcount")} data-frame-right={COLUMN.x + COLUMN.w}>
      {paintPortraitPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop, focus: [0.5, 0.5] })}
      {head.node}
      <g {...blockTag(ctx, kpis)} data-account-headcount="">
        {paintAccountRule(COLUMN.x, COLUMN.x + COLUMN.w, stripTop + STRIP.rule / 2, inks.ink, STRIP.rule)}
        {cells.map((c, i) => {
          const at = x
          x += c.w + STRIP.gap
          const count = marks && i < n - 1 ? counts[i]! : 0
          const personInk = c.loss ? accountMark(inks.bar, ground) : inks.ink
          return (
            <g key={i} data-account-cell={c.label}>
              {paintAccountLine(c.label, { ctx, x: at, baseline: accountBaseline(stripTop + STRIP.rule + STRIP.pad, STRIP.labelH, STRIP.label), size: STRIP.label, fill: accountText(inks.muted, ground, STRIP.label) })}
              {paintAccountFigure({ ctx, value: c.figure.value, unit: c.figure.unit, x: at, baseline: figureBaseline(figTop, STRIP.figure.size, STRIP.figure.size), spec: STRIP.figure, fill: accountText(c.loss ? inks.muted : inks.ink, ground, STRIP.figure.unit) })}
              {Array.from({ length: count }, (_, k) => personMark(at + k * (STRIP.person + STRIP.personGap), marksTop, STRIP.person, personInk, c.loss, k))}
              {c.note.map((l, k) => (
                <g key={`n${k}`}>{paintAccountLine(l, { ctx, x: at, baseline: accountBaseline((count > 0 ? notesTop : marksTop) + k * STRIP.noteH, STRIP.noteH, STRIP.note), size: STRIP.note, fill: accountText(inks.body, ground, STRIP.note) })}</g>
              ))}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, crew)} data-account-crew="">
        {people.map((p, i) => {
          const px = COLUMN.x + i * (crewW + CREW.gap)
          const rule = p.move ? CREW.lead : CREW.rule
          const nameTop = crewTop + rule + CREW.pad - (p.move ? 1 : 0)
          const roleTop = nameTop + CREW.nameH + CREW.between
          const roleBase = accountBaseline(roleTop, CREW.roleH, CREW.role)
          const fromW = p.move ? accountWidth(p.move.from, CREW.role, ctx) : 0
          const arrowX = px + fromW + CREW.arrow.gap
          const arrowY = roleTop + CREW.roleH / 2
          return (
            <g key={i} data-account-person-card={p.name} data-lit={p.move ? "" : undefined}>
              <rect x={px} y={crewTop} width={crewW} height={rule} fill={p.move ? accountMark(inks.lead, ground) : inks.ink} />
              {paintAccountLine(p.name, { ctx, x: px, baseline: accountBaseline(nameTop, CREW.nameH, CREW.name), size: CREW.name, bold: true, fill: accountText(inks.ink, ground, CREW.name) })}
              {p.move ? (
                <>
                  {paintAccountLine(p.move.from, { ctx, x: px, baseline: roleBase, size: CREW.role, fill: accountText(inks.muted, ground, CREW.role) })}
                  <path data-account-arrow="" d={`M${arrowX} ${arrowY}H${arrowX + CREW.arrow.w - 2}M${arrowX + CREW.arrow.w - 6} ${arrowY - 4}L${arrowX + CREW.arrow.w - 2} ${arrowY}L${arrowX + CREW.arrow.w - 6} ${arrowY + 4}`} fill="none" stroke={inks.ink} strokeWidth={1.5} />
                  {paintAccountLine(p.move.to, { ctx, x: arrowX + CREW.arrow.w + CREW.arrow.gap, baseline: roleBase, size: CREW.role, bold: true, fill: accountText(inks.deep, ground, CREW.role) })}
                </>
              ) : p.role ? (
                paintAccountLine(p.role, { ctx, x: px, baseline: roleBase, size: CREW.role, fill: accountText(inks.ink, ground, CREW.role) })
              ) : null}
              {p.org ? paintAccountLine(p.org, { ctx, x: px, baseline: accountBaseline(roleTop + CREW.roleH + CREW.between, CREW.orgH, CREW.org), size: CREW.org, fill: accountText(inks.body, ground, CREW.org) }) : null}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}
