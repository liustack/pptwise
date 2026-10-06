import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, fitMarquee, marqueeInks, marqueeText, marqueeWidth, paintMarquee, paintMarqueeIcon, paintMarqueeLine, splitName, type MarqueeInks } from "./marquee"

type Heatmap = Extract<Component, { type: "heatmap" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * season: where in the year things peak, rally's 2026-10 board (the
 * calendar page, p05). A row of rounded cells a column, a row a kind of
 * show: each cell the row's colour at a strength set by its value, the
 * highest cells full with a flame on them, the empty ones a faint violet.
 * The run of columns the plan is built around (the heat grid's `bands`) is
 * framed across every row by a dashed outline in the accent, its name under
 * it in the accent. Under the grid a key, a swatch of each row's colour with
 * the line the author wrote for that row, and a grey note.
 *
 * The first row takes the accent, the next the confetti colour furthest from
 * it in hue, and so on, so two rows never read as one.
 *
 * Takes, in the marquee setting: a `heatmap` of one to three rows and four to
 * twelve columns with no titles, no values printed, no named steps and every
 * column label printed, at most one band;
 * then one `callout` a row whose text starts with the row's name and a colon
 * (「演唱会：8、9 月场次见顶」), in the rows' order; then optionally one more
 * `callout`, the note. Callouts with no title, icon or tag.
 *
 * Declines: a column name wider than its cell, a row name past its column,
 * a band's name past one line, a key line past its half of the measure and
 * a note past one line.
 *
 * Reads: the marquee inks (`./marquee.tsx`), the body and heading faces.
 */

const GRID = { x: 156, cw: 80, inset: 4, labels: { baseline: 44, size: 13 }, top: 64, rowName: { x: 16, size: 18 }, r: 8 } as const
const ROWS: Record<number, { h: number; pitch: number }> = { 1: { h: 88, pitch: 104 }, 2: { h: 88, pitch: 104 }, 3: { h: 60, pitch: 70 } }
const FRAME = { pad: 4, top: 18, below: 32, r: 10, w: 2, dash: "6 5" } as const
const BAND_NAME = { gap: 10, size: 16, lineHeight: 30 } as const
const KEY = { top: 356, pitch: 576, swatch: { dy: 4, size: 14, r: 3 }, x: 24, size: 15, lineHeight: 24, w: 540 } as const
const NOTE = { top: 402, size: 13, lineHeight: 24 } as const
const FLAME = { size: 22, dy: 32 } as const
/** The cell strength at the lowest value above the floor and at the peak, with the empty cells' faint violet. */
const STRENGTH = { floor: 0.175, span: 0.825, empty: 0.35 } as const

/** A colour's hue in degrees. */
function hue(hex: string): number {
  const n = parseInt(hex.replace("#", ""), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}

/** The rows' colours: the accent first, then each next the confetti colour furthest in hue from those already taken. */
export function rowInks(n: number, inks: MarqueeInks): string[] {
  const out = [inks.fire]
  const pool = inks.confetti.filter((c) => c.toUpperCase() !== inks.fire.toUpperCase())
  const gap = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b))
  while (out.length < n && pool.length > 0) {
    let best = 0
    let bestGap = -1
    pool.forEach((c, i) => {
      const nearest = Math.min(...out.map((o) => gap(hue(c), hue(o))))
      if (nearest > bestGap) {
        bestGap = nearest
        best = i
      }
    })
    out.push(pool.splice(best, 1)[0]!)
  }
  return out
}

export const seasonComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "marquee") return null
  const [grid, ...notes] = components
  if (grid?.type !== "heatmap") return null
  const h = grid as Heatmap
  const rows = h.y_labels.length
  const cols = h.x_labels.length
  // Named steps print their names in the cells and a key, and a sparse
  // axis prints every few labels: the ordinary grid draws both.
  if (rows < 1 || rows > 3 || cols < 4 || cols > 12 || h.show_values || h.x_title || h.y_title || h.steps || h.label_every !== undefined || (h.bands?.length ?? 0) > 1) return null
  if (notes.some((n) => n.type !== "callout" || n.title || n.icon || n.tag)) return null
  const callouts = notes as Callout[]
  const keyed = callouts.slice(0, rows).map((c, i) => {
    const split = splitName(c.text)
    return split && split.name === h.y_labels[i]!.trim() ? c : null
  })
  if (keyed.some((k) => k === null) || callouts.length > rows + 1) return null
  const note = callouts[rows]
  const row = ROWS[rows]!
  const gridBottom = GRID.top + rows * row.pitch - (row.pitch - row.h)
  const inks = marqueeInks(ctx)
  const colors = rowInks(rows, inks)
  const flat = h.values.flat()
  const lo = h.domain?.min ?? Math.min(...flat)
  const hi = h.domain?.max ?? Math.max(...flat)
  if (!(hi > lo)) return null
  const cw = Math.min(GRID.cw, (rect.w - GRID.x) / cols)
  const cellW = cw - GRID.inset * 2
  if (h.x_labels.some((l) => marqueeWidth(l, GRID.labels.size, ctx, true) > cw - 4)) return null
  if (h.y_labels.some((l) => marqueeWidth(l, GRID.rowName.size, ctx, true) > GRID.x - GRID.rowName.x - 8)) return null
  const at = (label: string) => h.x_labels.findIndex((x) => x.trim() === label.trim())
  const band = h.bands?.[0]
  const span = band ? { from: at(band.from), to: at(band.to) } : null
  const bandName = band ? fitMarquee(band.label, { width: rect.w, size: BAND_NAME.size, lineHeight: BAND_NAME.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (band && !bandName) return null
  const keyFits = keyed.map((k) => fitMarquee(k!.text, { width: KEY.w, size: KEY.size, lineHeight: KEY.lineHeight, maxLines: 1 }, ctx))
  if (keyFits.some((k) => !k)) return null
  const noteFit = note ? fitMarquee(note.text, { width: rect.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  if (note && !noteFit) return null
  const frameBottom = gridBottom + FRAME.below
  const nameTop = frameBottom + BAND_NAME.gap
  if (nameTop + BAND_NAME.lineHeight > KEY.top || rect.h < NOTE.top + NOTE.lineHeight) return null

  const x = (dx: number) => rect.x + dx
  const y = (dy: number) => rect.y + dy
  const colX = (i: number) => x(GRID.x) + i * cw
  return (
    <g {...compositionTag("season")}>
      <g {...blockTag(ctx, h)} data-marquee-season="">
        {h.x_labels.map((label, i) =>
          paintMarqueeLine(label.trim(), { key: `m-${i}`, ctx, x: colX(i) + cw / 2, baseline: y(GRID.labels.baseline), size: GRID.labels.size, bold: true, anchor: "middle", fill: marqueeText(inks.muted, inks.ground, GRID.labels.size) }),
        )}
        {h.y_labels.map((label, r) =>
          paintMarqueeLine(label.trim(), { key: `r-${r}`, ctx, x: x(GRID.rowName.x), top: y(GRID.top + r * row.pitch), lineHeight: row.h, size: GRID.rowName.size, bold: true, fill: marqueeText(inks.ink, inks.ground, GRID.rowName.size) }),
        )}
        {h.values.map((values, r) =>
          values.map((v, i) => {
            const t = (v - lo) / (hi - lo)
            const off = !(t > 0)
            const fill = off ? blendOver(inks.dim, inks.ground, STRENGTH.empty) : blendOver(colors[r]!, inks.ground, Math.min(1, STRENGTH.floor + STRENGTH.span * t))
            const peak = v >= hi
            const cx = colX(i) + GRID.inset
            const cy = y(GRID.top + r * row.pitch)
            const cell = <rect x={cx} y={cy} width={cellW} height={row.h} rx={GRID.r} fill={fill} />
            return (
              <g key={`c-${r}-${i}`} data-heat={off ? 0 : Math.round(t * 100) / 100}>
                {peak && r === 0 ? <Lead id="peak">{cell}</Lead> : cell}
                {peak ? paintMarqueeIcon("flame", cx + cellW / 2 - FLAME.size / 2, cy + Math.min(FLAME.dy, (row.h - FLAME.size) / 2), FLAME.size, inks.onFire, fill) : null}
              </g>
            )
          }),
        )}
        {span && bandName ? (
          <Lead id="season">
            <rect
              x={colX(span.from) - FRAME.pad}
              y={y(FRAME.top)}
              width={colX(span.to + 1) - colX(span.from) + FRAME.pad * 2}
              height={frameBottom - FRAME.top}
              rx={FRAME.r}
              fill="none"
              stroke={inks.fire}
              strokeWidth={FRAME.w}
              strokeDasharray={FRAME.dash}
            />
            {paintMarquee(bandName, { ctx, x: (colX(span.from) + colX(span.to + 1)) / 2, top: y(nameTop), bold: true, anchor: "middle", fill: marqueeText(inks.fire, inks.ground, BAND_NAME.size), ground: inks.ground })}
          </Lead>
        ) : null}
      </g>
      {keyed.map((k, i) => (
        <g key={`k-${i}`} {...blockTag(ctx, k!)} data-marquee-key={h.y_labels[i]}>
          <rect x={x(i * KEY.pitch)} y={y(KEY.top + KEY.swatch.dy)} width={KEY.swatch.size} height={KEY.swatch.size} rx={KEY.swatch.r} fill={colors[i]} />
          {paintMarquee(keyFits[i]!, { ctx, x: x(i * KEY.pitch + KEY.x), top: y(KEY.top), fill: marqueeText(inks.ink, inks.ground, KEY.size), ground: inks.ground })}
        </g>
      ))}
      {note && noteFit ? <g {...blockTag(ctx, note)} data-marquee-note="">{paintMarquee(noteFit, { ctx, x: x(0), top: y(NOTE.top), fill: marqueeText(inks.muted, inks.ground, NOTE.size), ground: inks.ground })}</g> : null}
    </g>
  )
}
