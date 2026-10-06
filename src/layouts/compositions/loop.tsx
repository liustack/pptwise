import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeCard, paintMarqueeIcon, paintMarqueeLine } from "./marquee"

type Chevron = Extract<Component, { type: "chevron_process" }>
type Callout = Extract<Component, { type: "callout" }>
type Table = Extract<Component, { type: "data_table" }>

/*
 * loop: a chain of steps whose last brings its results back to the first,
 * rally's 2026-10 board (the attribution page, p11). A card a step in a row,
 * each numbered 01, 02… with its icon at the top right, its name and a line
 * of what happens; the first, where the loop starts, a card of the accent
 * with the dark ink on it; small arrows of the accent between the cards.
 * From under the last card a dashed line runs back to under the first and
 * points up at it, the author's line for the return on it. Under the loop an
 * open table, a row a touchpoint with its icon in the accent: headers small
 * and grey over a 2px rule of the light ink, the first column bold, a marked
 * column (`columns[].emphasis`) bold in the accent, the last column grey, a
 * hairline under each row.
 *
 * The first column and the marked one are as wide as their words and a
 * gutter; the others share what is left.
 *
 * Takes, in the marquee setting: a `chevron_process` of three to six stages;
 * then optionally a `callout` with no title, icon or tag, the line for the
 * return; then a `data_table` of two to five columns with no icon, at most
 * one marked, and two to four rows with no tag, mark or highlight.
 *
 * Declines: a stage's name past one line or its line past two, the return's
 * line wider than the run back, a header or a cell past its column.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const STAGES = { top: 8, h: 160, run: 1160, gap: 20, pad: 20, number: { baseline: 34, size: 14 }, icon: { right: 44, top: 16, size: 26 }, name: { top: 48, size: 22, lineHeight: 32 }, text: { top: 88, size: 14, lineHeight: 22, maxLines: 2, w: 176 }, arrow: { dy: 74, w: 12, h: 12 } } as const
const RETURN = { from: 174, back: 212, left: 66, rightIn: 178, r: 40, w: 2, dash: "5 5", head: 6, label: { baseline: 204, size: 13 } } as const
const TABLE = { header: { top: 236, size: 12, lineHeight: 20 }, rule: { y: 260, h: 2 }, top: 262, row: 54, inset: 8, gutter: 96, icon: { x: 8, size: 20, dy: 16 }, iconRoom: 38, cell: { top: 14, size: 15, lineHeight: 26 }, first: { size: 16 } } as const

export const loopComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  let i = 0
  const chain = components[i++]
  if (chain?.type !== "chevron_process") return null
  const back = components[i]?.type === "callout" ? (components[i++] as Callout) : undefined
  const table = components[i++]
  if (table?.type !== "data_table" || i !== components.length) return null
  const c = chain as Chevron
  const t = table as Table
  if (c.items.length < 3 || c.items.length > 6) return null
  if (back && (back.title || back.icon || back.tag)) return null
  if (t.title || t.source || t.columns.length < 2 || t.columns.length > 5 || t.rows.length < 2 || t.rows.length > 4) return null
  if (t.columns.some((col) => col.icon || col.align === "right") || t.columns.filter((col) => col.emphasis).length > 1) return null
  if (t.rows.some((row) => row.tag || row.emphasis)) return null
  if (rect.h < TABLE.top + t.rows.length * TABLE.row) return null
  const inks = marqueeInks(ctx)
  const n = c.items.length
  const pitch = STAGES.run / n
  const cardW = pitch - STAGES.gap
  const textW = Math.min(STAGES.text.w, cardW - STAGES.pad * 2)
  const stages = c.items.map((it, k) => ({
    it,
    k,
    name: fitMarquee(it.title, { width: cardW - STAGES.pad * 2, size: STAGES.name.size, lineHeight: STAGES.name.lineHeight, maxLines: 1, bold: true }, ctx),
    text: it.text?.trim() ? fitMarquee(it.text, { width: textW, size: STAGES.text.size, lineHeight: STAGES.text.lineHeight, maxLines: STAGES.text.maxLines }, ctx) : null,
  }))
  if (stages.some((s) => !s.name || (s.it.text?.trim() && !s.text))) return null

  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy
  const leftX = x(RETURN.left)
  const rightX = x((n - 1) * pitch + RETURN.rightIn)
  const backLabel = back ? fitMarquee(back.text, { width: rightX - leftX - 80, size: RETURN.label.size, lineHeight: RETURN.label.size, maxLines: 1, bold: true }, ctx) : null
  if (back && !backLabel) return null

  // The table's columns: the first and the marked one as wide as their words and a gutter, the rest sharing what is left.
  const iconRoom = t.rows.some((row) => row.icon) ? TABLE.iconRoom : TABLE.inset
  const cellW = (key: string, k: number) =>
    Math.max(
      marqueeWidth(t.columns[k]!.label, TABLE.header.size, ctx, true) + TABLE.inset,
      ...t.rows.map((row) => marqueeWidth(String(row.cells[key] ?? ""), k === 0 ? TABLE.first.size : TABLE.cell.size, ctx, k === 0 || t.columns[k]!.emphasis === true) + (k === 0 ? iconRoom : TABLE.inset)),
    )
  const hug = t.columns.map((col, k) => k === 0 || col.emphasis === true)
  const widths = t.columns.map((col, k) => (hug[k] ? cellW(col.key, k) + TABLE.gutter : 0))
  const free = t.columns.length - hug.filter(Boolean).length
  const rest = rect.w - widths.reduce((a, b) => a + b, 0)
  if (free === 0 || rest <= 0) return null
  t.columns.forEach((col, k) => {
    if (!hug[k]) widths[k] = rest / free
  })
  const starts = widths.map((_, k) => widths.slice(0, k).reduce((a, b) => a + b, 0))
  const cells = t.rows.map((row) =>
    t.columns.map((col, k) => {
      const text = String(row.cells[col.key] ?? "").trim()
      const room = widths[k]! - (k === 0 ? iconRoom : TABLE.inset) - 12
      return text ? fitMarquee(text, { width: room, size: k === 0 ? TABLE.first.size : TABLE.cell.size, lineHeight: TABLE.cell.lineHeight, maxLines: 1, bold: k === 0 || col.emphasis === true }, ctx) : null
    }),
  )
  if (cells.some((row, r) => row.some((cell, k) => !cell && String(t.rows[r]!.cells[t.columns[k]!.key] ?? "").trim()))) return null
  if (t.columns.some((col, k) => marqueeWidth(col.label, TABLE.header.size, ctx, true) > widths[k]! - TABLE.inset - 4)) return null
  const last = t.columns.length - 1

  const run = `M ${rightX} ${y(RETURN.from)} C ${rightX} ${y(RETURN.back)}, ${rightX} ${y(RETURN.back)}, ${rightX - RETURN.r} ${y(RETURN.back)} L ${leftX + RETURN.r} ${y(RETURN.back)} C ${leftX} ${y(RETURN.back)}, ${leftX} ${y(RETURN.back)}, ${leftX} ${y(RETURN.from)}`
  return (
    <g {...compositionTag("loop")}>
      <g {...blockTag(ctx, c)} data-marquee-loop="">
        {stages.map((s) => {
          const cx = x(s.k * pitch)
          const lit = s.k === 0
          const ground = lit ? inks.fire : inks.card
          const words = (ink: string, size: number) => marqueeText(lit ? inks.onFire : ink, ground, size)
          const card = paintMarqueeCard({ x: cx, y: y(STAGES.top), w: cardW, h: STAGES.h }, inks, { fill: ground })
          return (
            <g key={s.k} data-stage={s.it.title}>
              {lit ? <Lead id="start">{card}</Lead> : card}
              {paintMarqueeLine(String(s.k + 1).padStart(2, "0"), { ctx, x: cx + STAGES.pad, baseline: y(STAGES.top + STAGES.number.baseline), size: STAGES.number.size, bold: true, fill: words(inks.muted, STAGES.number.size) })}
              {s.it.icon ? paintMarqueeIcon(s.it.icon, cx + cardW - STAGES.icon.right, y(STAGES.top + STAGES.icon.top), STAGES.icon.size, lit ? inks.onFire : inks.fire, ground) : null}
              {paintMarquee(s.name!, { ctx, x: cx + STAGES.pad, top: y(STAGES.top + STAGES.name.top), bold: true, fill: words(inks.ink, STAGES.name.size), ground })}
              {s.text ? paintMarquee(s.text, { ctx, x: cx + STAGES.pad, top: y(STAGES.top + STAGES.text.top), fill: words(inks.muted, STAGES.text.size), ground }) : null}
              {s.k < n - 1 ? (
                <polygon points={`${cx + cardW + 4},${y(STAGES.top + STAGES.arrow.dy)} ${cx + cardW + 4 + STAGES.arrow.w},${y(STAGES.top + STAGES.arrow.dy + STAGES.arrow.h / 2)} ${cx + cardW + 4},${y(STAGES.top + STAGES.arrow.dy + STAGES.arrow.h)}`} fill={inks.fire} />
              ) : null}
            </g>
          )
        })}
        <g data-marquee-return="">
          <path d={run} fill="none" stroke={inks.muted} strokeWidth={RETURN.w} strokeDasharray={RETURN.dash} />
          <polygon points={`${leftX - RETURN.head},${y(RETURN.from + RETURN.head)} ${leftX},${y(RETURN.from - RETURN.head)} ${leftX + RETURN.head},${y(RETURN.from + RETURN.head)}`} fill={inks.muted} />
        </g>
      </g>
      {back && backLabel ? <g {...blockTag(ctx, back)} data-marquee-return-line="">{paintMarquee(backLabel, { ctx, x: (leftX + rightX) / 2, baseline: y(RETURN.label.baseline), bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, RETURN.label.size), ground: inks.ground })}</g> : null}
      <g {...blockTag(ctx, t)} data-marquee-codes="">
        {t.columns.map((col, k) => paintMarqueeLine(col.label.trim(), { key: `h-${k}`, ctx, x: x(starts[k]! + TABLE.inset), top: y(TABLE.header.top), lineHeight: TABLE.header.lineHeight, size: TABLE.header.size, bold: true, fill: marqueeText(inks.muted, inks.ground, TABLE.header.size) }))}
        <rect x={x(0)} y={y(TABLE.rule.y)} width={rect.w} height={TABLE.rule.h} fill={inks.ink} />
        {t.rows.map((row, r) => {
          const top = TABLE.top + r * TABLE.row
          return (
            <g key={r} data-row={String(row.cells[t.columns[0]!.key] ?? "")}>
              {row.icon ? paintMarqueeIcon(row.icon, x(TABLE.icon.x), y(top + TABLE.icon.dy), TABLE.icon.size, inks.fire, inks.ground) : null}
              {cells[r]!.map((cell, k) => {
                if (!cell) return null
                const marked = t.columns[k]!.emphasis === true
                const ink = marked ? inks.fire : k === last && k > 0 ? inks.muted : inks.ink
                const text = paintMarquee(cell, { ctx, x: x(starts[k]! + (k === 0 ? iconRoom : TABLE.inset)), top: y(top + TABLE.cell.top), bold: k === 0 || marked, fill: marqueeText(ink, inks.ground, cell.fontSize), ground: inks.ground })
                return <g key={k}>{marked && r === 0 ? <Lead id="column">{text}</Lead> : text}</g>
              })}
              <rect x={x(0)} y={y(top + TABLE.row - 1)} width={rect.w} height={1} fill={inks.line} />
            </g>
          )
        })}
      </g>
    </g>
  )
}
