import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ScrollPhoto,
  fitPhotoNote,
  fitScroll,
  paintScroll,
  paintScrollLine,
  placeScrollClaim,
  placeScrollSource,
  scrollBaseline,
  scrollInks,
  scrollText,
  scrollWidth,
} from "./scroll"

type Image = Extract<Component, { type: "image" }>
type Table = Extract<Component, { type: "data_table" }>
type Paragraph = Extract<Component, { type: "paragraph" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * daily: a small table that puts unlike periods on the same footing, beside
 * a photograph, ink's 2026-10 board (p15). A photograph runs the height of
 * the page at the left, its note in white at its foot. Beside it the claim,
 * larger, then an open table under a heavy rule: its first column in the
 * heading face, its other words in the second ink, its figures set large in
 * the heading face, hairlines between rows, and the figure the page turns on
 * in cinnabar (the row the author highlights, in the column the author marks
 * or else its last column of figures). Under it the reading in cinnabar in
 * the heading face (a `paragraph`) and an aside on a pale wash (a plain
 * `callout`): what must not be compared with it. The source stands under the
 * column.
 *
 * Takes, in the scroll setting: an `image`, a `data_table` of three to five
 * columns, at least one all figures, and one to four rows, then optionally a
 * `paragraph` and a `callout` with words alone, in that order.
 *
 * Declines: a table with a title, a source, a column's icon, a row's icon or
 * tag or a total row, a callout with a title, a symbol or a tag, a cell,
 * heading, reading or aside past its room, a claim that does not fit beside
 * the photograph.
 *
 * Reads: the scroll inks (`./scroll.tsx`).
 */

const PHOTO = { dy: 4, w: 420, h: 580 } as const
const COLUMN = { x: 470, w: 590, claim: { size: 40, foot: 114 } } as const
const TABLE = { head: { top: 140, size: 12, lineHeight: 22 }, rule: { y: 164, h: 1.4 }, rows: { top: 172, pitch: 70, max: 4 }, first: { w: 180, dy: 18, size: 18, lineHeight: 30 }, word: { w: 100, dy: 18, size: 15, lineHeight: 30 }, figure: { w: 160, dy: 8, size: 36, lineHeight: 50 } } as const
const READING = { gap: 20, size: 17, lineHeight: 30, maxLines: 2 } as const
const ASIDE = { gap: 22, pad: { x: 20, y: 16 }, size: 14, lineHeight: 24, maxLines: 4, minH: 120 } as const

const FIGURE = /^[−-]?[\d,.]+%?$/u

export const dailyComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "scroll") return null
  const [image, table, ...more] = components
  if (image?.type !== "image" || table?.type !== "data_table") return null
  let rest = more
  const reading = rest[0]?.type === "paragraph" ? (rest[0] as Paragraph) : undefined
  if (reading) rest = rest.slice(1)
  const aside = rest[0]?.type === "callout" ? (rest[0] as Callout) : undefined
  if (aside) rest = rest.slice(1)
  if (rest.length > 0) return null
  if (aside && (aside.title || aside.icon || aside.tag)) return null
  const t = table as Table
  if (t.title?.trim() || t.source?.trim() || t.columns.length < 3 || t.columns.length > 5 || t.rows.length < 1 || t.rows.length > TABLE.rows.max) return null
  if (t.columns.some((col) => col.icon) || t.rows.some((r) => r.icon || r.tag || r.emphasis === "total")) return null
  const cell = (r: Table["rows"][number], key: string) => String(r.cells[key] ?? "").trim()
  const numeric = t.columns.map((col, i) => i > 0 && t.rows.every((r) => FIGURE.test(cell(r, col.key))))
  if (!numeric.some(Boolean)) return null
  let at = 0
  const xs: number[] = []
  const widths = t.columns.map((_col, i) => {
    const w = i === 0 ? TABLE.first.w : i === t.columns.length - 1 ? COLUMN.w - at : numeric[i] ? TABLE.figure.w : TABLE.word.w
    xs.push(at)
    at += w
    return w
  })
  if (widths[widths.length - 1]! < 60) return null
  const styleOf = (i: number) => (i === 0 ? TABLE.first : numeric[i] ? TABLE.figure : TABLE.word)
  for (let i = 0; i < t.columns.length; i++) {
    const col = t.columns[i]!
    if (scrollWidth(col.label, TABLE.head.size, ctx, { bold: true }) > widths[i]! - 6) return null
    const style = styleOf(i)
    for (const r of t.rows) if (scrollWidth(cell(r, col.key), style.size, ctx, { serif: i === 0 || numeric[i] }) > widths[i]! - 6) return null
  }
  const markedCol = t.columns.findIndex((col) => col.emphasis)
  const litCol = markedCol >= 0 ? markedCol : numeric.lastIndexOf(true)
  const x = rect.x + COLUMN.x
  const tableBottom = TABLE.rows.top + t.rows.length * TABLE.rows.pitch
  const readingLayout = reading ? fitScroll(reading.text, { width: COLUMN.w, size: READING.size, lineHeight: READING.lineHeight, maxLines: READING.maxLines, serif: true }, ctx) : undefined
  if (readingLayout === null) return null
  const readingTop = tableBottom + READING.gap
  const asideTop = readingLayout ? readingTop + readingLayout.lines.length * READING.lineHeight + ASIDE.gap : tableBottom + ASIDE.gap
  const asideLayout = aside ? fitScroll(aside.text, { width: COLUMN.w - ASIDE.pad.x * 2, size: ASIDE.size, lineHeight: ASIDE.lineHeight, maxLines: ASIDE.maxLines }, ctx) : undefined
  if (asideLayout === null) return null
  const asideH = asideLayout ? Math.max(ASIDE.minH, ASIDE.pad.y * 2 + asideLayout.lines.length * ASIDE.lineHeight) : 0
  if (asideTop + asideH > rect.h + 4) return null
  const note = fitPhotoNote((image as Image).caption, PHOTO.w, ctx)
  if (note === null) return null
  const head = placeScrollClaim(claim, { x, w: COLUMN.w, size: COLUMN.claim.size, foot: rect.y + COLUMN.claim.foot })
  if (head === false) return null
  const foot = placeScrollSource(source, { x, w: COLUMN.w })
  if (foot === false) return null
  const inks = scrollInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("daily")}>
      <g {...blockTag(ctx, image)}>
        <ScrollPhoto assetId={(image as Image).asset_id} box={{ x: rect.x, y: rect.y + PHOTO.dy, w: PHOTO.w, h: PHOTO.h }} note={note} ctx={ctx} id="scroll-daily-note" />
      </g>
      {head}
      <g {...blockTag(ctx, t)} data-scroll-daily="">
        {t.columns.map((col, i) => (
          <g key={`h${i}`}>{paintScrollLine(col.label, { ctx, x: x + xs[i]!, baseline: scrollBaseline(rect.y + TABLE.head.top, TABLE.head.lineHeight, TABLE.head.size), size: TABLE.head.size, bold: true, fill: scrollText(inks.muted, ground, TABLE.head.size) })}</g>
        ))}
        <rect x={x} y={rect.y + TABLE.rule.y - TABLE.rule.h / 2} width={COLUMN.w} height={TABLE.rule.h} fill={inks.lead} />
        {t.rows.map((r, ri) => {
          const top = rect.y + TABLE.rows.top + ri * TABLE.rows.pitch
          const rowLit = r.emphasis === "highlight"
          return (
            <g key={ri} data-scroll-day={cell(r, t.columns[0]!.key)}>
              {t.columns.map((col, i) => {
                const words = cell(r, col.key)
                if (!words) return null
                const style = styleOf(i)
                const lit = rowLit && i === litCol
                const ink = lit ? inks.cinnabar : i === 0 || numeric[i] ? inks.ink : inks.ink2
                return (
                  <g key={i} {...(lit ? { "data-scroll-lead": "figure" } : {})}>
                    {paintScrollLine(words, { ctx, x: x + xs[i]!, baseline: scrollBaseline(top + style.dy, style.lineHeight, style.size, i === 0 || numeric[i]), size: style.size, serif: i === 0 || numeric[i], fill: scrollText(ink, ground, style.size) })}
                  </g>
                )
              })}
              <rect x={x} y={top + TABLE.rows.pitch - 0.5} width={COLUMN.w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
      {readingLayout && reading ? <g {...blockTag(ctx, reading)} data-scroll-reading="">{paintScroll(readingLayout, { ctx, x, top: rect.y + readingTop, serif: true, fill: scrollText(inks.cinnabar, ground, READING.size) })}</g> : null}
      {asideLayout && aside ? (
        <g {...blockTag(ctx, aside)} data-scroll-aside="">
          <rect x={x} y={rect.y + asideTop} width={COLUMN.w} height={asideH} fill={inks.wash} />
          {paintScroll(asideLayout, { ctx, x: x + ASIDE.pad.x, top: rect.y + asideTop + ASIDE.pad.y, fill: scrollText(inks.ink2, inks.wash, ASIDE.size), ground: inks.wash })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
