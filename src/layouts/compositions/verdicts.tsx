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
  portraitTrackedWidth,
  portraitText,
  portraitWidth,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Comparison = Extract<Component, { type: "comparison" }>
type Row = Comparison["rows"][number]

/*
 * verdicts: what a role asks for against what the speaker has done, with a
 * verdict a row, profile's 2026-10 board (p04). An open table across the
 * measure under the section line and the claim: a header of small grey
 * words tracked wide over a 2px rule of the ink (the label column, the
 * columns, the tag column), and a row each 76px tall under a pale hairline.
 * In a row: the row's icon at 22px and its label bold in the heading serif
 * at 19px, the first column's words a step quieter, the second's in the
 * ink, and the verdict (the row's tag) after a 20px symbol for its kind of
 * news: a ringed tick in the ink for good news (`tone: "success"`), a dashed
 * ring in the grey for something still to do (`"warning"`), a ringed cross
 * for a risk (`"danger"`). The row the page is about (`emphasis`) sits on a
 * pale tint of the accent, its icon, verdict and marked words in the accent.
 *
 * Takes, in the portrait setting: a `comparison` of one or two columns and
 * two to six rows, every row tagged.
 *
 * Declines: a title, a recommended column, a row without a tag, a cell past
 * two lines, a label past one line, rows that run into the footer.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces.
 */

const HEAD = { x: 80, top: 64, w: 1120 } as const
const TABLE = {
  x: 80,
  w: 1120,
  below: 46,
  gap: 24,
  label: 230,
  first: 360,
  tag: 120,
  header: { size: 13, lineHeight: 19, tracking: 1.56, pad: 10, rule: 2 },
  row: 76,
  rule: 1,
  icon: 22,
  iconGap: 12,
  labelSize: 19,
  cell: { size: 16, lineHeight: 23, maxLines: 2 },
  verdict: { icon: 20, gap: 8, stroke: 1.8 },
  tint: 16,
  bottom: 650,
} as const

/** The symbol a verdict's kind of news takes, or none for a verdict with no tone. */
export function verdictIcon(tag: NonNullable<Row["tag"]>): string | undefined {
  if (tag.tone === "success") return "circle-check"
  if (tag.tone === "warning") return "circle-dashed"
  if (tag.tone === "danger") return "circle-x"
  return undefined
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const verdictsRecipe: Recipe = {
  look: "What a role asks for against what the speaker has done, with a verdict a row",
  kinds: ["comparison"],
  shapes: [{ parts: [{ type: "comparison", count: [2, 5], needs: ["rows[*].tag"] }] }],
}

export const verdictsComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 1) return null
  const table = components[0]
  if (table?.type !== "comparison") return null
  const cmp = table as Comparison
  if (cmp.title?.trim() || cmp.recommended !== undefined || cmp.columns.length < 1 || cmp.columns.length > 2) return null
  if (cmp.rows.length < 2 || cmp.rows.length > 6 || cmp.rows.filter((r) => r.emphasis).length > 1) return null
  if (cmp.rows.some((r) => !r.tag || r.cells.length !== cmp.columns.length)) return null
  const two = cmp.columns.length === 2
  const cols = two ? [TABLE.first, TABLE.w - TABLE.label - TABLE.first - TABLE.tag - TABLE.gap * 3] : [TABLE.w - TABLE.label - TABLE.tag - TABLE.gap * 2]
  const xs = [TABLE.x + TABLE.label + TABLE.gap, ...(two ? [TABLE.x + TABLE.label + TABLE.gap * 2 + TABLE.first] : [])]
  const tagX = TABLE.x + TABLE.w - TABLE.tag
  const headers = [cmp.label_column ?? "", ...cmp.columns, cmp.tag_column ?? ""].map((h) => stripEmphasis(h).trim())
  const headerXs = [TABLE.x, ...xs, tagX]
  const headerWs = [TABLE.label, ...cols, TABLE.tag]
  if (headers.some((h, i) => h && portraitTrackedWidth(h, TABLE.header.size, TABLE.header.tracking, ctx) > headerWs[i]!)) return null
  const labelW = TABLE.label - TABLE.icon - TABLE.iconGap
  const rows = cmp.rows.map((r) => ({
    r,
    labelFits: portraitWidth(r.label, TABLE.labelSize, ctx, { serif: true, bold: true }) <= (r.icon ? labelW : TABLE.label),
    cells: r.cells.map((c, i) => fitPortrait(c, { width: cols[i]!, size: TABLE.cell.size, lineHeight: TABLE.cell.lineHeight, maxLines: TABLE.cell.maxLines }, ctx)),
    verdictFits: portraitWidth(r.tag!.text, TABLE.cell.size, ctx, { bold: true }) + (verdictIcon(r.tag!) ? TABLE.verdict.icon + TABLE.verdict.gap : 0) <= TABLE.tag,
  }))
  if (rows.some((x) => !x.labelFits || !x.verdictFits || x.cells.some((c) => !c))) return null
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head) return null
  const top = head.bottom + TABLE.below
  const headRule = top + TABLE.header.lineHeight + TABLE.header.pad
  const first = headRule + TABLE.header.rule
  const pitch = TABLE.row + TABLE.rule
  if (first + rows.length * pitch > TABLE.bottom) return null
  const foot = placePortraitSource(source, { x: TABLE.x, w: TABLE.w })
  if (foot === false) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("verdicts")}>
      {head.node}
      <g {...blockTag(ctx, cmp)} data-portrait-verdicts="">
        {headers.map((h, i) =>
          h ? <g key={`h${i}`}>{paintPortraitTracked({ ctx, text: h, x: headerXs[i]!, y: portraitBaseline(top, TABLE.header.lineHeight, TABLE.header.size), size: TABLE.header.size, tracking: TABLE.header.tracking, fill: portraitText(inks.muted, ground, TABLE.header.size) })}</g> : null,
        )}
        {paintPortraitRule(TABLE.x, TABLE.x + TABLE.w, headRule + TABLE.header.rule / 2, inks.ink, TABLE.header.rule)}
        {rows.map((x, i) => {
          const y = first + i * pitch
          const lit = x.r.emphasis === true
          const on = lit ? inks.tint : ground
          const mid = y + TABLE.row / 2
          const icon = verdictIcon(x.r.tag!)
          const verdictInk = lit ? inks.lead : icon === "circle-check" || !icon ? inks.ink : inks.muted
          const textX = TABLE.x + (x.r.icon ? TABLE.icon + TABLE.iconGap : 0)
          return (
            <g key={i} data-portrait-verdict={stripEmphasis(x.r.label)} data-lit={lit ? "" : undefined}>
              {lit ? <rect x={TABLE.x - TABLE.tint} y={y} width={TABLE.w + TABLE.tint * 2} height={TABLE.row} fill={on} /> : null}
              {paintPortraitRule(lit ? TABLE.x - TABLE.tint : TABLE.x, lit ? TABLE.x + TABLE.w + TABLE.tint : TABLE.x + TABLE.w, y + TABLE.row + TABLE.rule / 2, inks.line, TABLE.rule)}
              {x.r.icon ? paintPortraitIcon(x.r.icon, TABLE.x, mid - TABLE.icon / 2, TABLE.icon, lit ? inks.lead : inks.ink, on, { stroke: 1.6 }) : null}
              {paintPortraitLine(x.r.label, { ctx, x: textX, baseline: portraitBaseline(mid - 14, 28, TABLE.labelSize, true), size: TABLE.labelSize, serif: true, bold: true, fill: portraitText(inks.ink, on, TABLE.labelSize), ground: on, lit: inks.lead })}
              {x.cells.map((c, j) => {
                const h = c!.lines.length * TABLE.cell.lineHeight
                return <g key={j}>{paintPortrait(c!, { ctx, x: xs[j]!, top: mid - h / 2, fill: portraitText(two && j === 0 ? inks.body : inks.ink, on, TABLE.cell.size), ground: on, lit: inks.lead })}</g>
              })}
              <g data-portrait-tag={x.r.tag!.text}>
                {icon ? paintPortraitIcon(icon, tagX, mid - TABLE.verdict.icon / 2, TABLE.verdict.icon, verdictInk, on, { stroke: TABLE.verdict.stroke }) : null}
                {paintPortraitLine(x.r.tag!.text, { ctx, x: tagX + (icon ? TABLE.verdict.icon + TABLE.verdict.gap : 0), baseline: portraitBaseline(mid - TABLE.cell.lineHeight / 2, TABLE.cell.lineHeight, TABLE.cell.size), size: TABLE.cell.size, bold: lit, fill: portraitText(verdictInk, on, TABLE.cell.size), ground: on })}
              </g>
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}

