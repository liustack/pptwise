import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitIcon,
  paintPortraitLine,
  paintPortraitRule,
  paintPortraitTracked,
  placePortraitHead,
  placePortraitSource,
  portraitBaseline,
  portraitInks,
  portraitText,
  portraitTrackedWidth,
  portraitWidth,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Comparison = Extract<Component, { type: "comparison" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * shortfalls: the gaps the speaker names, how each will close and when the
 * proof is due, profile's 2026-10 board (p09). An open table across the
 * measure under the section line and the claim, its header small and grey
 * over a 2px rule of the ink, a row each under a pale hairline:
 *
 * - the gap: the row's label up to its colon bold in the heading serif at
 *   22px, what follows the colon under it at 15px a step quieter
 *   (「产品规划：没做过半年以上的路线图」);
 * - how it closes: the first column's words at 17/29;
 * - when, and what is handed in: the last column's words up to their colon
 *   set as a figure bold in the serif at 40px, what follows under it at
 *   15px (「第 90 天：交下半年路线图初稿」). The row the page is about
 *   (`emphasis`) has its figure in the accent.
 *
 * Under the table, the callout as the check that closes the page, on a band
 * of the paper's warmth: its icon at 28px, its title bold in the serif at
 * 20px, its words at 15/24.
 *
 * Takes, in the portrait setting: a `comparison` of two columns and two to
 * four rows whose labels and last cells each break at a colon, and
 * optionally one `callout` with a title.
 *
 * Declines: a table title, a recommended column, a row's icon or tag, a
 * figure wider than its column, rows and the band that run into the footer.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces.
 */

const HEAD = { x: 80, top: 64, w: 1120 } as const
const TABLE = { x: 80, w: 1120, below: 46, gap: 30, name: 340, when: 280, header: { size: 13, lineHeight: 19, tracking: 1.56, pad: 10, rule: 2 }, pad: 26, title: { size: 22, lineHeight: 32 }, between: 6, gloss: { size: 15, lineHeight: 22 }, how: { size: 17, lineHeight: 28.9, maxLines: 3 }, figure: { size: 40, lineHeight: 44 }, due: { size: 15, lineHeight: 22, between: 4 } } as const
const BAND = { below: 60, padY: 24, padX: 28, icon: 28, iconCol: 40, gap: 16, title: { size: 20, lineHeight: 29 }, between: 6, text: { size: 15, lineHeight: 24, maxLines: 2 } } as const
const BOTTOM = 650

/** `text` broken at its first colon into what leads and what follows, or `null` when it has none. */
export function colonSplit(text: string): { lead: string; rest: string } | null {
  const plain = stripEmphasis(text).trim()
  const m = /^([^：:]+)[：:]\s*(.+)$/u.exec(plain)
  return m ? { lead: m[1]!.trim(), rest: m[2]!.trim() } : null
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const shortfallsRecipe: Recipe = {
  look: "The gaps the speaker names, how each will close and when the proof is due",
  kinds: ["list"],
  shapes: [{ parts: [{ type: "comparison", count: [2, 2], needs: ["rows[*].cells[]~colon", "rows[*].label~colon"] }, { type: "callout", needs: ["title"], optional: true }] }],
}

export const shortfallsComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length < 1 || components.length > 2) return null
  const table = components.find((c): c is Comparison => c.type === "comparison")
  const check = components.find((c): c is Callout => c.type === "callout")
  if (!table || (components.length === 2 && !check) || (check && (!check.title?.trim() || check.tag))) return null
  if (table.title?.trim() || table.recommended !== undefined || table.columns.length !== 2) return null
  if (table.rows.length < 2 || table.rows.length > 4 || table.rows.some((r) => r.icon || r.tag || r.cells.length !== 2) || table.rows.filter((r) => r.emphasis).length > 1) return null
  const howX = TABLE.x + TABLE.name + TABLE.gap
  const howW = TABLE.w - TABLE.name - TABLE.when - TABLE.gap * 2
  const whenX = TABLE.x + TABLE.w - TABLE.when
  const rows = table.rows.map((r) => {
    const gap = colonSplit(r.label)
    const due = colonSplit(r.cells[1]!)
    return {
      r,
      gap,
      due,
      how: fitPortrait(r.cells[0], { width: howW, size: TABLE.how.size, lineHeight: TABLE.how.lineHeight, maxLines: TABLE.how.maxLines }, ctx),
    }
  })
  if (rows.some((x) => !x.gap || !x.due || !x.how)) return null
  if (rows.some((x) => portraitWidth(x.gap!.lead, TABLE.title.size, ctx, { serif: true, bold: true }) > TABLE.name || portraitWidth(x.gap!.rest, TABLE.gloss.size, ctx) > TABLE.name)) return null
  if (rows.some((x) => portraitWidth(x.due!.lead, TABLE.figure.size, ctx, { serif: true, bold: true }) > TABLE.when || portraitWidth(x.due!.rest, TABLE.due.size, ctx) > TABLE.when)) return null
  const headers = [table.label_column ?? "", ...table.columns].map((h) => stripEmphasis(h).trim())
  const headerXs = [TABLE.x, howX, whenX]
  const headerWs = [TABLE.name, howW, TABLE.when]
  if (headers.some((h, i) => h && portraitTrackedWidth(h, TABLE.header.size, TABLE.header.tracking, ctx) > headerWs[i]!)) return null
  const bandTextX = TABLE.x + BAND.padX + BAND.iconCol + BAND.gap
  const bandW = TABLE.x + TABLE.w - BAND.padX - bandTextX
  const bandTitle = check ? fitPortrait(check.title, { width: bandW, size: BAND.title.size, lineHeight: BAND.title.lineHeight, maxLines: 1, serif: true, bold: true }, ctx) : undefined
  const bandText = check?.text?.trim() ? fitPortrait(check.text, { width: bandW, size: BAND.text.size, lineHeight: BAND.text.lineHeight, maxLines: BAND.text.maxLines }, ctx) : undefined
  if (bandTitle === null || bandText === null) return null
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head) return null
  const top = head.bottom + TABLE.below
  const headRule = top + TABLE.header.lineHeight + TABLE.header.pad
  let y = headRule + TABLE.header.rule
  const heights = rows.map((x) => TABLE.pad * 2 + Math.max(TABLE.title.lineHeight + TABLE.between + TABLE.gloss.lineHeight, x.how!.lines.length * TABLE.how.lineHeight, TABLE.figure.lineHeight + TABLE.due.between + TABLE.due.lineHeight) + 1)
  const rowsEnd = y + heights.reduce((a, b) => a + b, 0)
  const bandTop = rowsEnd + BAND.below
  const bandH = check ? BAND.padY * 2 + BAND.title.lineHeight + (bandText ? BAND.between + bandText.lines.length * BAND.text.lineHeight : 0) : 0
  if ((check ? bandTop + bandH : rowsEnd) > BOTTOM) return null
  const foot = placePortraitSource(source, { x: TABLE.x, w: TABLE.w })
  if (foot === false) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("shortfalls")}>
      {head.node}
      <g {...blockTag(ctx, table)} data-portrait-shortfalls="">
        {headers.map((h, i) =>
          h ? <g key={`h${i}`}>{paintPortraitTracked({ ctx, text: h, x: headerXs[i]!, y: portraitBaseline(top, TABLE.header.lineHeight, TABLE.header.size), size: TABLE.header.size, tracking: TABLE.header.tracking, fill: portraitText(inks.muted, ground, TABLE.header.size) })}</g> : null,
        )}
        {paintPortraitRule(TABLE.x, TABLE.x + TABLE.w, headRule + TABLE.header.rule / 2, inks.ink, TABLE.header.rule)}
        {rows.map((x, i) => {
          const at = y
          y += heights[i]!
          const mid = at + (heights[i]! - 1) / 2
          const lit = x.r.emphasis === true
          const nameTop = mid - (TABLE.title.lineHeight + TABLE.between + TABLE.gloss.lineHeight) / 2
          const howTop = mid - (x.how!.lines.length * TABLE.how.lineHeight) / 2
          const dueTop = mid - (TABLE.figure.lineHeight + TABLE.due.between + TABLE.due.lineHeight) / 2
          return (
            <g key={i} data-portrait-shortfall={x.gap!.lead} data-lit={lit ? "" : undefined}>
              {paintPortraitLine(x.gap!.lead, { ctx, x: TABLE.x, top: nameTop, lineHeight: TABLE.title.lineHeight, size: TABLE.title.size, serif: true, bold: true, fill: portraitText(inks.ink, ground, TABLE.title.size), attrs: { "data-gloss-break": "：" } })}
              {paintPortraitLine(x.gap!.rest, { ctx, x: TABLE.x, top: nameTop + TABLE.title.lineHeight + TABLE.between, lineHeight: TABLE.gloss.lineHeight, size: TABLE.gloss.size, fill: portraitText(inks.body, ground, TABLE.gloss.size) })}
              {paintPortrait(x.how!, { ctx, x: howX, top: howTop, fill: portraitText(inks.ink, ground, TABLE.how.size) })}
              {paintPortraitLine(x.due!.lead, { ctx, x: whenX, top: dueTop, lineHeight: TABLE.figure.lineHeight, size: TABLE.figure.size, serif: true, bold: true, fill: portraitText(lit ? inks.lead : inks.ink, ground, TABLE.figure.size), attrs: { "data-gloss-break": "：" } })}
              {paintPortraitLine(x.due!.rest, { ctx, x: whenX, top: dueTop + TABLE.figure.lineHeight + TABLE.due.between, lineHeight: TABLE.due.lineHeight, size: TABLE.due.size, fill: portraitText(inks.ink, ground, TABLE.due.size) })}
              {paintPortraitRule(TABLE.x, TABLE.x + TABLE.w, at + heights[i]! - 0.5, inks.line, 1)}
            </g>
          )
        })}
      </g>
      {check && bandTitle ? (
        <g {...blockTag(ctx, check)} data-portrait-check="">
          <rect x={TABLE.x} y={bandTop} width={TABLE.w} height={bandH} fill={inks.band} />
          {check.icon ? paintPortraitIcon(check.icon, TABLE.x + BAND.padX, bandTop + BAND.padY, BAND.icon, inks.ink, inks.band, { stroke: 1.6 }) : null}
          {paintPortrait(bandTitle, { ctx, x: bandTextX, top: bandTop + BAND.padY, serif: true, bold: true, fill: portraitText(inks.ink, inks.band, BAND.title.size), ground: inks.band })}
          {bandText ? paintPortrait(bandText, { ctx, x: bandTextX, top: bandTop + BAND.padY + BAND.title.lineHeight + BAND.between, fill: portraitText(inks.body, inks.band, BAND.text.size), ground: inks.band }) : null}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
