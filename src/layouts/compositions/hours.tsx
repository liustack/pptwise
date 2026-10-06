import type { Component } from "@/ir"
import { contrastRatio, blendOver } from "../../render/ink"
import { heatmapLabelShown, heatmapStepOf } from "../../components/heatmap"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderMeta, binderText, binderWidth, fitBinder, glossBreak, paintBinder, paintBinderIcon, paintBinderLine, splitName, type BinderInks } from "./binder"

type Heatmap = Extract<Component, { type: "heatmap" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/*
 * hours: a day's tariff bands, proposal's 2026-10 board (p04). A row a place:
 * its name and the document it rests on at the left, then the day as one
 * band of runs, each run as wide as its hours and coloured by its step, its
 * short name written in it when the run is two hours or more, and at the
 * right the row's figure and its prices. A run of hours the page is about
 * (the heat grid's `bands`) is framed across the rows in a dashed outline of
 * the tangerine, named over it in the darker tangerine with its icon. Under
 * the rows the hours' ticks, a label every so many hours, and a key naming
 * every step beside the grid's own note at the right.
 *
 * The steps run from the sky's tint through the sky and the second petrol to
 * petrol, so the day reads from cheap to dear in one hue.
 *
 * Takes, in the binder setting: a `heatmap` of two or three rows, twelve to
 * 24 columns and two to five named steps, its rows named "place：document"
 * (the document optional), with no values printed, no axis titles but
 * `x_title` and at most one band; then a `kpi_cards` with one figure a row,
 * no icon, unit, delta, tag, tone or source.
 *
 * Declines: a row name or document past its column, a figure or its note past
 * the right column, a step whose short name no run has room for, a band name
 * past one line and a key wider than its row.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const ROWS = { top: 54, pitch: 100, h: 64, name: { dy: 6, size: 18, lineHeight: 28, w: 220 }, doc: { dy: 36, size: 12, lineHeight: 20, w: 230 } } as const
const BAND = { x: 236, w: 672, gap: 1, r: 4, short: { size: 13, dy: 37, minW: 56 } } as const
const RIGHT = { x: 932, w: 200, figure: { dy: 4, size: 17, lineHeight: 26 }, note: { dy: 34, size: 12, lineHeight: 17, maxLines: 2 } } as const
const FRAME = { pad: 3, over: 26, stroke: 2.5, dash: "7 5", r: 8, label: { top: 2, size: 13, lineHeight: 22, icon: { dx: 21, dy: 4, size: 18 }, dx: 45 } } as const
const TICKS = { top: 34, short: 6, long: 10, label: 62, size: 13 } as const
const KEY = { top: 94, swatch: 16, r: 3, gap: 8, pitch: 86, size: 13, lineHeight: 20 } as const

/** The colour of step `i` of `n`, from the sky's tint through the sky and the second petrol to petrol. */
function stepFill(i: number, n: number, inks: BinderInks): string {
  const ramp = [inks.skyPale, inks.sky, inks.data, inks.deep]
  const t = n <= 1 ? 0 : (i / (n - 1)) * (ramp.length - 1)
  const at = Math.min(ramp.length - 2, Math.floor(t))
  const frac = t - at
  return frac < 1e-9 ? ramp[at]! : blendOver(ramp[at + 1]!, ramp[at]!, frac)
}

export const hoursComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [grid, figures, ...rest] = components
  if (grid?.type !== "heatmap" || figures?.type !== "kpi_cards" || rest.length > 0) return null
  const h = grid as Heatmap
  const k = figures as Kpis
  const rows = h.y_labels.length
  const cols = h.x_labels.length
  const steps = h.steps
  if (!steps || rows < 2 || rows > 3 || cols < 12 || cols > 24 || h.show_values || h.y_title || (h.bands?.length ?? 0) > 1) return null
  if (k.items.length !== rows || k.items.some((it) => it.icon || it.unit || it.delta || it.tag || it.tone || it.source)) return null
  const lastBottom = ROWS.top + (rows - 1) * ROWS.pitch + ROWS.h
  if (rect.w < 1132 || rect.h < lastBottom + KEY.top + KEY.lineHeight) return null
  const inks = binderInks(ctx)
  const hw = BAND.w / cols
  const x0 = rect.x + BAND.x

  const names = h.y_labels.map((label) => {
    const split = splitName(label)
    const name = fitBinder(split ? split.name : label, { width: ROWS.name.w, size: ROWS.name.size, lineHeight: ROWS.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const doc = split ? fitBinder(split.rest, { width: ROWS.doc.w, size: ROWS.doc.size, lineHeight: ROWS.doc.lineHeight, maxLines: 1 }, ctx) : null
    return name && (!split || doc) ? { name, doc, sep: split?.sep } : null
  })
  if (names.some((n) => !n)) return null

  // Each row's runs: hours in a row that fall in one step.
  const runs = h.values.map((row) => {
    const out: { from: number; to: number; step: number }[] = []
    row.forEach((v, c) => {
      const step = heatmapStepOf(v, steps)
      const last = out[out.length - 1]
      if (last && last.step === step) last.to = c + 1
      else out.push({ from: c, to: c + 1, step })
    })
    return out
  })
  const written = new Set(runs.flatMap((row) => row.filter((r) => (r.to - r.from) * hw >= BAND.short.minW).map((r) => r.step)))
  if (steps.some((s, i) => s.short?.trim() && !written.has(i))) return null

  const right = k.items.map((it) => {
    const figure = fitBinder(`${it.label.trim()} ${it.value.trim()}`, { width: RIGHT.w, size: RIGHT.figure.size, lineHeight: RIGHT.figure.lineHeight, maxLines: 1, bold: true }, ctx)
    const note = it.note?.trim() ? fitBinder(it.note, { width: RIGHT.w, size: RIGHT.note.size, lineHeight: RIGHT.note.lineHeight, maxLines: RIGHT.note.maxLines }, ctx) : null
    return figure && (!it.note?.trim() || note) ? { figure, note } : null
  })
  if (right.some((r) => !r)) return null

  const band = h.bands?.[0]
  const span = band ? { from: h.x_labels.findIndex((x) => x.trim() === band.from.trim()), to: h.x_labels.findIndex((x) => x.trim() === band.to.trim()) } : null
  const bandIcon = (band as { icon?: string } | undefined)?.icon
  const bandName = band ? fitBinder(band.label, { width: rect.w - (BAND.x + (span?.from ?? 0) * hw + FRAME.label.dx), size: FRAME.label.size, lineHeight: FRAME.label.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (band && (!bandName || !span || span.from < 0 || span.to < 0)) return null

  const key = steps.map((s, i) => ({ label: s.label.trim(), fill: stepFill(i, steps.length, inks), w: Math.max(KEY.pitch, KEY.swatch + KEY.gap + binderWidth(s.label, KEY.size, ctx) + 16) }))
  const keyW = key.reduce((sum, item) => sum + item.w, 0)
  const note = h.x_title?.trim() ? fitBinder(h.x_title, { width: rect.w - BAND.x - keyW, size: KEY.size, lineHeight: KEY.lineHeight, maxLines: 1 }, ctx) : null
  if (BAND.x + keyW > rect.w || (h.x_title?.trim() && !note)) return null

  const rowTop = (r: number) => rect.y + ROWS.top + r * ROWS.pitch
  const ticksTop = rect.y + lastBottom + TICKS.top
  const every = h.label_every ?? 1
  const shortInk = (fill: string) => (contrastRatio(inks.deep, fill) >= 4.5 ? inks.deep : binderText(inks.onDeep, fill, BAND.short.size))

  return (
    <g {...compositionTag("hours")}>
      <g {...blockTag(ctx, h)}>
        {names.map((n, r) => {
          const y = rowTop(r)
          return (
            <g key={r} data-binder-hours-row={r}>
              {paintBinder(n!.name, { ctx, x: rect.x, top: y + ROWS.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, ROWS.name.size), attrs: glossBreak(n!.sep) })}
              {n!.doc ? paintBinder(n!.doc, { ctx, x: rect.x, top: y + ROWS.doc.dy, fill: binderText(inks.muted, inks.ground, ROWS.doc.size) }) : null}
              {runs[r]!.map((run, j) => {
                const x = x0 + run.from * hw + BAND.gap
                const w = (run.to - run.from) * hw - BAND.gap * 2
                const fill = stepFill(run.step, steps.length, inks)
                const short = steps[run.step]!.short?.trim()
                return (
                  <g key={j} data-binder-run={steps[run.step]!.label}>
                    <rect data-plot-mark="1" x={x} y={y} width={w} height={ROWS.h} rx={BAND.r} fill={fill} />
                    {short && (run.to - run.from) * hw >= BAND.short.minW
                      ? paintBinderLine(short, { ctx, x: x0 + ((run.from + run.to) / 2) * hw, baseline: y + BAND.short.dy, size: BAND.short.size, bold: true, anchor: "middle", fill: shortInk(fill) })
                      : null}
                  </g>
                )
              })}
            </g>
          )
        })}
        {span && bandName ? (
          <Lead id="band">
            <rect
              data-binder-band={band!.label}
              x={x0 + span.from * hw - FRAME.pad}
              y={rowTop(0) - FRAME.over}
              width={(span.to - span.from + 1) * hw + FRAME.pad * 2}
              height={lastBottom - ROWS.top + FRAME.over * 2}
              rx={FRAME.r}
              fill="none"
              stroke={inks.fire}
              strokeWidth={FRAME.stroke}
              strokeDasharray={FRAME.dash}
            />
            {bandIcon ? paintBinderIcon(bandIcon, x0 + span.from * hw + FRAME.label.icon.dx - FRAME.pad, rect.y + FRAME.label.icon.dy, FRAME.label.icon.size, inks.fireText, inks.ground) : null}
            {paintBinder(bandName, { ctx, x: x0 + span.from * hw - FRAME.pad + (bandIcon ? FRAME.label.dx : FRAME.label.icon.dx), top: rect.y + FRAME.label.top, bold: true, fill: binderText(inks.fireText, inks.ground, FRAME.label.size) })}
          </Lead>
        ) : null}
        <g data-binder-ticks="">
          {Array.from({ length: cols + 1 }, (_, c) => (
            <line key={c} x1={x0 + c * hw} y1={ticksTop} x2={x0 + c * hw} y2={ticksTop + (c % every === 0 && every > 1 ? TICKS.long : TICKS.short)} stroke={inks.tick} strokeWidth={1} />
          ))}
          {h.x_labels.map((label, c) =>
            heatmapLabelShown(h, c) ? paintBinderLine(label.trim(), { ctx, key: c, x: x0 + c * hw, baseline: rect.y + lastBottom + TICKS.label, size: TICKS.size, anchor: "middle", fill: binderText(inks.muted, inks.ground, TICKS.size) }) : null,
          )}
        </g>
        <g data-heatmap-key="">
          {key.map((item, i) => {
            const x = x0 + key.slice(0, i).reduce((sum, it) => sum + it.w, 0)
            const top = rect.y + lastBottom + KEY.top
            return (
              <g key={i}>
                <rect x={x} y={top} width={KEY.swatch} height={KEY.swatch} rx={KEY.r} fill={item.fill} />
                {paintBinderLine(item.label, { ctx, x: x + KEY.swatch + KEY.gap, baseline: top + 13, size: KEY.size, fill: binderText(inks.ink, inks.ground, KEY.size) })}
              </g>
            )
          })}
          {note ? paintBinder(note, { ctx, x: rect.x + rect.w, top: rect.y + lastBottom + KEY.top - 2, anchor: "end", fill: binderMeta(inks.muted, inks.ground) }) : null}
        </g>
      </g>
      <g {...blockTag(ctx, k)}>
        {right.map((r, i) => {
          const y = rowTop(i)
          return (
            <g key={i} data-binder-hours-figure={i}>
              {paintBinder(r!.figure, { ctx, x: rect.x + RIGHT.x, top: y + RIGHT.figure.dy, bold: true, fill: binderText(inks.deep, inks.ground, RIGHT.figure.size) })}
              {r!.note ? paintBinder(r!.note, { ctx, x: rect.x + RIGHT.x, top: y + RIGHT.note.dy, fill: binderText(inks.muted, inks.ground, RIGHT.note.size) }) : null}
            </g>
          )
        })}
      </g>
    </g>
  )
}

