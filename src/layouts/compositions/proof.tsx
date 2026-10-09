import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { isCurrencyUnit, isMagnitudeUnit, isMultiplierUnit, isPercentUnit, joinUnit } from "../../lib/quantity-format"
import { stripEmphasis } from "../../render/emphasis"
import { accessibleInk, readableOn } from "../../render/ink"
import { manuscriptChinese } from "./manuscript"
import { axisInk, quietMarkFill, rowTint } from "./notice"
import { chartFigures, forecastWords, markPaint, niceCeil, paintMark, plotNumber, pointDecimals, reportedDecimals, textWidth, type MarkPaint } from "./plot"
import { statusWords } from "../../render/mark-status"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, fitKeepAll, paintLines } from "./type"

type Chart = Extract<Component, { type: "chart" }>
type Point = Chart["series"][number]["data"][number]
type DataTable = Extract<Component, { type: "data_table" }>
type Paragraph = Extract<Component, { type: "paragraph" }>
type Bullets = Extract<Component, { type: "bullets" }>

/*
 * proof: one exhibit and how to read it, bulletin's 2026-10 evidence board
 * (`design/rounds/2026-10-09-bulletin-kinds/`). Under the face's claim
 * header, a white card down the left holds the exhibit with its number and
 * title (「图 1 乘用车国内零售，万辆」, 「表 1」, "Exhibit 1"), and one
 * rounded ring in primary goes round the place in it that proves the claim: a
 * group of bars in a chart, a row in a table. A leader runs level from the
 * ring to a numbered disc, and beside the disc, under a small 「怎么看」 ("How
 * to read it"), the reading in primary bold and up to three notes between
 * hairlines.
 *
 * Where the ring goes is the author's: the chart's one marked bar
 * (`data[].emphasis`), whose category the ring takes whole, or the table's
 * highlighted row (`emphasis: "highlight"`). The marked bar's series is drawn
 * in primary and the other in the receded grey, as the board draws this year
 * against last; the ring, not a colour, says which bar the page is about.
 *
 * Takes, in the notice setting: a titled upright `bar` chart of one or two
 * series over two to five categories with one marked bar, or a titled
 * `data_table` of two to four columns and up to six rows with one
 * highlighted row; then a `paragraph`, the reading, of up to three lines at
 * 21px in the 292px column; then up to three notes, each up to two lines
 * at 17px, written as a `paragraph` each or as one `bullets`.
 *
 * Declines: any other setting or shape, a chart with no marked bar, a
 * negative value, a note, a change, a band or a reference on the chart, an
 * estimate, a table with a total row, a row icon or tag, a column icon or
 * emphasis, or a source of its own, words past their lines, and a column
 * that cannot stand level with the ring.
 *
 * Band: the notice body, x80 to x1200 from y196, at least 420px tall. The
 * card is 740 by 420, the column starts at x908.
 *
 * Reads: `surface` (the card), `primary` (the ring, the leader, the disc, the
 * reading, the marked series and row), `text`, `muted`, `border` or `muted`
 * (hairlines), the notice setting's receded grey, axis and row tint
 * (`./notice.ts`), `bg` or `defaultBg`, `fonts.body`.
 */

export const PROOF = {
  card: { w: 740, h: 420, inset: 24 },
  caption: { top: 18, box: 22, size: 15 },
  legend: { top: 56, swatch: 14, gap: 8, after: 28, size: 15 },
  plot: { base: 376, height: 270, value: 17, valueGap: 10, category: 16, categoryGap: 28, barW: 70, barGap: 8, groupShare: 0.65 },
  table: { header: 76, rule: 90, row: 46, baseline: 30, size: 19, headSize: 16, indent: 16, colW: 240, endPad: 36 },
  ring: { radius: 10, stroke: 2.5, aside: 46, over: 18, under: 36 },
  column: { x: 828, label: { box: 22, size: 16 }, reading: { offset: 10, size: 21, lineHeight: 32, maxLines: 3, box: 108 }, note: { pitch: 90, top: 14, size: 17, lineHeight: 27, maxLines: 2 }, minTop: 40 },
  badge: { r: 13, size: 16, before: 24, dy: 16 },
  leader: 1.5,
} as const
const MIN_W = 1120
const MAX_NOTES = 3

/** The exhibit's number and title, the way the deck's language writes it. */
export function exhibitCaption(kind: "figure" | "table", n: number, chinese: boolean): string {
  return chinese ? `${kind === "figure" ? "图" : "表"} ${n}` : `Exhibit ${n}`
}

/** The words over the reading column. */
export function readingLabel(chinese: boolean): string {
  return chinese ? "怎么看" : "How to read it"
}

interface Ring {
  x: number
  y: number
  w: number
  h: number
}

interface Drawn {
  node: React.ReactElement
  ring: Ring
  /** What the caption says after the number. */
  title: string
}

interface Card {
  x: number
  y: number
  w: number
  h: number
}

const SMALL = { "data-font-floor-exempt": "notice-spec" } as const

/** A unit printed with every value ("12%", "1.83m") rather than once in the caption. */
function gluedUnit(unit: string | undefined): boolean {
  return unit !== undefined && (isPercentUnit(unit) || isMagnitudeUnit(unit) || isMultiplierUnit(unit) || isCurrencyUnit(unit))
}

const CHART_KEYS = new Set(["type", "chart_type", "title", "axes", "series", "direction"])
const AXES_KEYS = new Set(["y_unit", "y_title", "show_grid"])
const SERIES_KEYS = new Set(["name", "data"])
const POINT_KEYS = new Set(["x", "y", "status", "emphasis"])

/** The bar chart this composition sets whole, or `null`: its categories, and which series and category the author marked. */
function chartShape(chart: Chart): { categories: string[]; lead: number; marked: string } | null {
  if (chart.chart_type !== "bar" || chart.direction === "horizontal" || !chart.title?.trim()) return null
  if (Object.keys(chart).some((key) => !CHART_KEYS.has(key))) return null
  if (chart.axes && Object.keys(chart.axes).some((key) => !AXES_KEYS.has(key))) return null
  if (chart.series.length < 1 || chart.series.length > 2) return null
  if (chart.series.some((s) => Object.keys(s).some((key) => !SERIES_KEYS.has(key)))) return null
  const categories = chart.series[0]!.data.map((point) => String(point.x))
  if (categories.length < 2 || categories.length > 5) return null
  let lead = -1
  let marked = ""
  for (const [si, s] of chart.series.entries()) {
    if (s.data.length !== categories.length || s.data.some((point, i) => String(point.x) !== categories[i])) return null
    for (const point of s.data) {
      if (Object.keys(point).some((key) => !POINT_KEYS.has(key))) return null
      if (!(Number.isFinite(point.y) && point.y >= 0) || point.status === "estimate") return null
      if (point.emphasis === true) {
        if (lead >= 0) return null
        lead = si
        marked = String(point.x)
      }
    }
  }
  return lead < 0 ? null : { categories, lead, marked }
}

function drawChart(chart: Chart, ctx: ComponentCtx, card: Card): Drawn | null {
  const shape = chartShape(chart)
  if (!shape) return null
  const { colors, fonts } = ctx
  const { plot, legend: L, ring: R } = PROOF
  const body = fonts.body
  const left = card.x + PROOF.card.inset
  const right = card.x + card.w - PROOF.card.inset
  const unit = chart.axes?.y_unit?.trim() || undefined
  const glued = gluedUnit(unit)
  const title = [chart.title!.trim(), chart.axes?.y_title?.trim(), unit && !glued ? unit : undefined].filter(Boolean).join(manuscriptChinese(ctx, [chart.title!]) ? "，" : ", ")
  const figures = chartFigures(chart, ctx)
  const whole = reportedDecimals(chart)
  const chinese = figures.chinese
  const leadInk = colors.primary
  const seriesInk = (si: number) => (si === shape.lead ? leadInk : quietMarkFill(ctx))
  const surface = colors.surface

  // The legend: each series, then what a hatched or outlined bar means.
  const entries: { name: string; paint: MarkPaint }[] = chart.series.map((s, si) => ({ name: s.name, paint: { kind: "solid", fill: seriesInk(si) } }))
  for (const status of ["forecast", "target"] as const) {
    const si = chart.series.findIndex((s) => s.data.some((point) => point.status === status))
    if (si >= 0) entries.push({ name: status === "forecast" ? forecastWords(chinese).legend : statusWords(chinese).target, paint: markPaint(ctx, seriesInk(si), status) })
  }
  const legendBaseline = card.y + L.top + L.swatch - 2
  let cursor = left
  const legendItems = entries.map((entry) => {
    const at = cursor
    cursor += L.swatch + L.gap + textWidth(entry.name, L.size, body) + L.after
    return { entry, x: at }
  })
  if (cursor - L.after > right) return null

  const base = card.y + plot.base
  const top = base - plot.height
  const n = shape.categories.length
  const s = chart.series.length
  const slot = (right - left) / n
  const barW = Math.min(plot.barW, Math.floor((slot * plot.groupShare - plot.barGap * (s - 1)) / s))
  if (barW < 24) return null
  const groupW = s * barW + (s - 1) * plot.barGap
  const ceiling = niceCeil(Math.max(...chart.series.flatMap((ser) => ser.data.map((point) => point.y))))
  const valueText = (point: Point) => joinUnit(plotNumber(point.y, figures, pointDecimals(point, whole)), glued ? unit : undefined)

  const bars: React.ReactElement[] = []
  const labels: React.ReactElement[] = []
  let ringIndex = -1
  let tallestLabelTop = base
  for (const [ci, category] of shape.categories.entries()) {
    const cx = left + slot * (ci + 0.5)
    if (textWidth(category, plot.category, body) > slot - 8) return null
    for (const [si, ser] of chart.series.entries()) {
      const point = ser.data[ci]!
      const x = cx - groupW / 2 + si * (barW + plot.barGap)
      const h = (point.y / ceiling) * plot.height
      const color = seriesInk(si)
      bars.push(<g key={`${ci}-${si}`}>{paintMark(markPaint(ctx, color, point.status), { x, y: base - h, w: barW, h })}</g>)
      const text = valueText(point)
      const lead = si === shape.lead
      if (textWidth(text, plot.value, body, lead) > barW + plot.barGap * 2) return null
      const baseline = base - h - plot.valueGap
      tallestLabelTop = Math.min(tallestLabelTop, baseline - plot.value * 0.82)
      labels.push(
        <text key={`v${ci}-${si}`} x={x + barW / 2} y={baseline} textAnchor="middle" fontFamily={body} fontSize={plot.value} fontWeight={lead ? "700" : undefined} fill={accessibleInk(lead ? leadInk : colors.muted, surface, plot.value)} dominantBaseline="alphabetic">
          {text}
        </text>,
      )
    }
    labels.push(
      <text key={`c${ci}`} x={cx} y={base + plot.categoryGap} textAnchor="middle" fontFamily={body} fontSize={plot.category} fill={accessibleInk(colors.text, surface, plot.category)} dominantBaseline="alphabetic">
        {category}
      </text>,
    )
    if (category === shape.marked) ringIndex = ci
  }
  const cx = left + slot * (ringIndex + 0.5)
  const ringTop = Math.min(top - R.over, tallestLabelTop - 8)
  if (ringTop < legendBaseline + 8) return null
  const ring = { x: cx - groupW / 2 - R.aside, y: ringTop, w: groupW + 2 * R.aside, h: base + R.under - ringTop }
  // The ring stays in the card and clear of the bars beside it.
  if (ring.x < card.x + 8 || ring.x + ring.w > card.x + card.w - 8) return null
  if (ringIndex > 0 && ring.x < cx - slot + groupW / 2 + 12) return null
  if (ringIndex < n - 1 && ring.x + ring.w > cx + slot - groupW / 2 - 12) return null

  const legendInk = accessibleInk(colors.muted, surface, L.size)
  const node = (
    <g {...blockTag(ctx, chart)} data-notice-proof-chart="">
      <g data-plot-legend="">
        {legendItems.map(({ entry, x }, i) => {
          const swatch = { x, y: legendBaseline - L.swatch + 2, w: L.swatch, h: L.swatch }
          const paint: MarkPaint = entry.paint.kind === "target" ? { kind: "solid", fill: entry.paint.ground } : entry.paint
          return (
            <g key={i}>
              {paintMark(paint, swatch)}
              <text {...SMALL} x={x + L.swatch + L.gap} y={legendBaseline} fontFamily={body} fontSize={L.size} fill={legendInk} dominantBaseline="alphabetic">
                {entry.name}
              </text>
            </g>
          )
        })}
      </g>
      <rect x={left} y={base - 0.5} width={right - left} height={1} fill={axisInk(ctx)} />
      {bars}
      {labels}
    </g>
  )
  return { node, ring, title }
}

const TABLE_COLUMN_KEYS = new Set(["key", "label", "align"])
const TABLE_ROW_KEYS = new Set(["cells", "emphasis"])

function drawTable(table: DataTable, ctx: ComponentCtx, card: Card): Drawn | null {
  const T = PROOF.table
  if (!table.title?.trim() || table.source?.trim()) return null
  const columns = table.columns
  if (columns.length < 2 || columns.length > 4 || columns.some((c) => Object.keys(c).some((key) => !TABLE_COLUMN_KEYS.has(key)))) return null
  if (table.rows.length > 6 || table.rows.some((r) => Object.keys(r).some((key) => !TABLE_ROW_KEYS.has(key)) || r.emphasis === "total")) return null
  const marked = table.rows.flatMap((r, i) => (r.emphasis === "highlight" ? [i] : []))
  if (marked.length !== 1) return null
  const rowsTop = card.y + T.rule
  if (rowsTop + table.rows.length * T.row > card.y + card.h - PROOF.card.inset) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const surface = colors.surface
  const left = card.x + PROOF.card.inset
  const right = card.x + card.w - PROOF.card.inset
  const cell = (row: DataTable["rows"][number], key: string) => String(row.cells[key] ?? "").trim()
  const cellW = (text: string, bold: boolean) => textWidth(text, T.size, body, bold)
  const firstW = Math.max(textWidth(columns[0]!.label, T.headSize, body), ...table.rows.map((r, i) => cellW(cell(r, columns[0]!.key), i === marked[0]) + T.indent))
  const trailing = columns.length - 1
  const lastRight = right - T.endPad
  const colW = Math.min(T.colW, Math.floor((lastRight - left - firstW - 24) / trailing))
  for (const column of columns.slice(1)) {
    const need = Math.max(textWidth(column.label, T.headSize, body), ...table.rows.map((r, i) => cellW(cell(r, column.key), i === marked[0])))
    if (need > colW - 24) return null
  }
  const place = (k: number): { x: number; anchor: "start" | "middle" | "end" } => {
    if (k === 0) return { x: left, anchor: "start" }
    const edge = lastRight - (trailing - k) * colW
    const align = columns[k]!.align
    if (align === "right") return { x: edge, anchor: "end" }
    if (align === "center") return { x: edge - colW / 2 + 12, anchor: "middle" }
    return { x: edge - colW + 24, anchor: "start" }
  }
  const headInk = accessibleInk(colors.muted, surface, T.headSize)
  const ink = accessibleInk(colors.text, surface, T.size)
  const tint = rowTint(ctx)
  const markInk = accessibleInk(colors.primary, tint, T.size)
  const markedTop = rowsTop + marked[0]! * T.row
  const node = (
    <g {...blockTag(ctx, table)} data-notice-proof-table="">
      {columns.map((column, k) => {
        const at = place(k)
        return (
          <text key={`h${k}`} x={at.x} y={card.y + T.header} textAnchor={at.anchor === "start" ? undefined : at.anchor} fontFamily={body} fontSize={T.headSize} fill={headInk} dominantBaseline="alphabetic">
            {column.label}
          </text>
        )
      })}
      <rect x={left} y={rowsTop - 0.5} width={right - left} height={1} fill={axisInk(ctx)} />
      <rect x={left} y={markedTop} width={right - left} height={T.row} fill={tint} />
      {table.rows.map((row, i) => {
        const top = rowsTop + i * T.row
        const lit = i === marked[0]
        return (
          <g key={i} data-notice-proof-row={lit ? "marked" : ""}>
            {columns.map((column, k) => {
              const at = place(k)
              const text = cell(row, column.key)
              if (!text) return null
              return (
                <text key={k} x={k === 0 ? at.x + T.indent : at.x} y={top + T.baseline} textAnchor={at.anchor === "start" ? undefined : at.anchor} fontFamily={body} fontSize={T.size} fontWeight={lit ? "700" : undefined} fill={lit ? markInk : ink} dominantBaseline="alphabetic">
                  {text}
                </text>
              )
            })}
            <rect x={left} y={top + T.row - 0.5} width={right - left} height={1} fill={ruleInk(ctx)} />
          </g>
        )
      })}
    </g>
  )
  return { node, ring: { x: left, y: markedTop, w: right - left, h: T.row }, title: table.title.trim() }
}

export const proofComposition: Composition = ({ components, ctx, rect, setting, exhibitNumber }) => {
  if (setting !== "notice" || rect.w < MIN_W || rect.h < PROOF.card.h) return null
  const [exhibit, reading, ...rest] = components
  if (reading?.type !== "paragraph") return null
  // The notes: one `bullets`, or a `paragraph` each.
  const listed = rest.length === 1 && rest[0]!.type === "bullets" ? (rest[0] as Bullets) : null
  if (!listed && rest.some((c) => c.type !== "paragraph")) return null
  const noteItems = listed ? listed.items : (rest as Paragraph[]).map((p) => p.text)
  if (noteItems.length > MAX_NOTES || (listed && noteItems.length === 0)) return null
  const { colors, fonts } = ctx
  const card = { x: rect.x, y: rect.y, w: PROOF.card.w, h: PROOF.card.h }
  const kind = exhibit?.type === "chart" ? "figure" : exhibit?.type === "data_table" ? "table" : null
  if (!kind) return null
  const drawn = kind === "figure" ? drawChart(exhibit as Chart, ctx, card) : drawTable(exhibit as DataTable, ctx, card)
  if (!drawn) return null
  const chinese = manuscriptChinese(ctx, [drawn.title, (reading as Paragraph).text])
  const body = fonts.body
  const C = PROOF.caption
  // The number and the title a full-width space apart, on one line, set as written: a wrap would turn the space into a word space.
  const caption = `${exhibitCaption(kind, exhibitNumber ?? 1, chinese)}\u3000${stripEmphasis(drawn.title)}`
  if (textWidth(caption, C.size, body) > card.w - 2 * PROOF.card.inset) return null

  // The column: its label at the top of the band, the reading level with the ring, the notes under it.
  const col = PROOF.column
  const colX = rect.x + col.x
  const colW = rect.x + rect.w - colX
  const label = fitFixed(readingLabel(chinese), { width: colW, size: col.label.size, lineHeight: col.label.box, maxLines: 1, fontFamily: body, bold: false })
  const lines = fitKeepAll((reading as Paragraph).text, { width: colW, size: col.reading.size, lineHeight: col.reading.lineHeight, maxLines: col.reading.maxLines, fontFamily: body, bold: true })
  if (label === null || lines === null || lines.lines.length === 0) return null
  const fitted = []
  for (const item of noteItems) {
    const note = fitKeepAll(item, { width: colW, size: col.note.size, lineHeight: col.note.lineHeight, maxLines: col.note.maxLines, fontFamily: body, bold: false })
    if (note === null || note.lines.length === 0) return null
    fitted.push(note)
  }
  const span = fitted.length > 0 ? col.reading.box + (fitted.length - 1) * col.note.pitch + col.note.top + fitted[fitted.length - 1]!.lines.length * col.note.lineHeight : lines.lines.length * col.reading.lineHeight
  const ring = drawn.ring
  let readTop = ring.y + col.reading.offset
  readTop = Math.min(readTop, rect.y + rect.h - span)
  if (readTop < rect.y + col.minTop) return null
  const badgeY = readTop + PROOF.badge.dy
  if (badgeY < ring.y + 12 || badgeY > ring.y + ring.h - 12) return null

  const bg = ctx.defaultBg ?? colors.bg
  const primary = colors.primary
  const rule = ruleInk(ctx)
  const badgeX = colX - PROOF.badge.before
  return (
    <g {...compositionTag("proof")}>
      <rect data-notice-proof-card="" x={card.x + 0.5} y={card.y + 0.5} width={card.w - 1} height={card.h - 1} fill={colors.surface} stroke={rule} strokeWidth={1} />
      <g data-notice-proof-caption="">
        <text {...SMALL} xmlSpace="preserve" x={card.x + PROOF.card.inset} y={centredBaseline(card.y + C.top, C.box, C.size)} fontFamily={body} fontSize={C.size} fill={accessibleInk(colors.muted, colors.surface, C.size)} dominantBaseline="alphabetic">
          {caption}
        </text>
      </g>
      {drawn.node}
      <g data-notice-proof-ring="">
        <rect x={ring.x} y={ring.y} width={ring.w} height={ring.h} rx={PROOF.ring.radius} fill="none" stroke={primary} strokeWidth={PROOF.ring.stroke} />
        <line x1={ring.x + ring.w} y1={badgeY} x2={badgeX - PROOF.badge.r + 1} y2={badgeY} stroke={primary} strokeWidth={PROOF.leader} />
        <circle cx={badgeX} cy={badgeY} r={PROOF.badge.r} fill={primary} />
        <text x={badgeX} y={badgeY + 6} textAnchor="middle" fontFamily={body} fontSize={PROOF.badge.size} fontWeight="700" fill={readableOn(primary)} dominantBaseline="alphabetic">
          1
        </text>
      </g>
      {paintLines(label, { ctx, x: colX, y: centredBaseline(rect.y, col.label.box, col.label.size), fill: accessibleInk(colors.muted, bg, col.label.size), fontFamily: body, fontWeight: "400" })}
      <g {...blockTag(ctx, reading)} data-notice-proof-reading="">
        {paintLines(lines, { ctx, x: colX, y: centredBaseline(readTop, col.reading.lineHeight, col.reading.size), fill: accessibleInk(primary, bg, col.reading.size), fontFamily: body, fontWeight: "700" })}
      </g>
      {fitted.length > 0 ? (
        <g {...(listed ? blockTag(ctx, listed) : {})} data-notice-proof-notes="">
          {fitted.map((note, i) => {
            const top = readTop + col.reading.box + i * col.note.pitch
            return (
              <g key={i} {...(listed ? {} : blockTag(ctx, rest[i]!))}>
                <rect x={colX} y={top} width={colW} height={1} fill={rule} />
                {paintLines(note, { ctx, x: colX, y: centredBaseline(top + col.note.top, col.note.lineHeight, col.note.size), fill: accessibleInk(colors.text, bg, col.note.size), fontFamily: body, fontWeight: "400" })}
              </g>
            )
          })}
        </g>
      ) : null}
    </g>
  )
}
