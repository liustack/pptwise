import type React from "react"
import type { Component } from "@/ir"
import { kpiValueText } from "../../components/kpi"
import { blendOver, readableOn } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"
import {
  CONSOLE_SPEC,
  baselineIn,
  consoleInks,
  consoleSeriesInk,
  consoleText,
  fitMono,
  fitNotePanel,
  monoWidth,
  paintMono,
  paintNotePanel,
  paintPanel,
  splitNote,
  toneInk,
} from "./console"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * span: two or three lengths of time to scale, the console setting's way of
 * showing how much longer one stretch ran than another. terminal's 2026-10
 * board, its cascade page (p06): DynamoDB was down 2h52m, the whole event ran
 * 14h32m.
 *
 * Each figure is a bar under its label, all on one scale, the longest across
 * the panel. The figure the author marks (`**…**` around its value) is a solid
 * bar in the mark. A figure with a tone (`danger`, `warning`, `success`) is an
 * outline in the tone's ink, with the marked bar's length echoed inside it as
 * a tint of that ink, so the eye reads how much of the longer stretch the
 * marked one is. Any other figure is a solid bar in the chart palette after
 * its lead. The value stands after its bar in mono, or inside the bar's end
 * when the panel has no room past it.
 *
 * Takes, in the console setting: a `kpi_cards` of two or three items whose
 * values are lengths of time written as a console prints them ("2h52m",
 * "14h32m", "22h 06m", "45m", "3d 4h"), with no unit, icon, delta, tag or
 * source; then optionally an `info` callout, which heads the panel with its
 * label when it is written 「标签：说明」 and closes it with its text; then
 * optionally one more callout, set as a note panel of its own under the first
 * (`fitNotePanel`), its text in mono when it is a quoted line.
 *
 * Declines: any other shape, a value that is not a length of time, a label or
 * a note past its lines, and a band too short for both panels.
 *
 * Reads: the console inks (`./console.tsx`), the chart palette, `fonts.body`,
 * `fonts.mono`.
 */

const PANEL = { pad: 24, header: { top: 14, box: 20, size: 13 }, gap: 16 } as const
const ROW = { first: 60, pitch: 84, labelSize: 14, bar: 12, barH: 30, valueSize: 16, valueGap: 10 } as const
const NOTE = { size: 14, lineHeight: 20, maxLines: 2, below: 44, foot: 30 } as const

const UNIT_MINUTES: Record<string, number> = { d: 1440, h: 60, m: 1, s: 1 / 60 }

/** A length of time written as a console prints it ("2h52m", "22h 06m"), in minutes, or `null`. */
export function parseDuration(text: string): number | null {
  const plain = text.trim()
  if (!/^(\d+(\.\d+)?\s*[dhms]\s*)+$/u.test(plain)) return null
  let minutes = 0
  for (const match of plain.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gu)) minutes += Number(match[1]) * UNIT_MINUTES[match[2]!]!
  return minutes > 0 ? minutes : null
}

interface SpanShape {
  kpis: KpiCards
  info: Callout | undefined
  note: Callout | undefined
}

function spanShape(components: readonly Component[]): SpanShape | null {
  const [kpis, ...rest] = components
  if (kpis?.type !== "kpi_cards" || rest.length > 2) return null
  if (rest.some((c) => c.type !== "callout")) return null
  const callouts = rest as Callout[]
  const info = callouts[0]?.variant === "info" ? callouts[0] : undefined
  const note = info ? callouts[1] : callouts[0]
  if (callouts.length === 2 && !info) return null
  return { kpis, info, note }
}

export const spanComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "console") return null
  const shape = spanShape(components)
  if (!shape) return null
  const { kpis, info, note } = shape
  if (kpis.items.length < 2 || kpis.items.length > 3) return null
  if (kpis.items.some((item) => item.unit || item.icon || item.delta || item.tag || item.source?.trim() || item.note?.trim())) return null
  const values = kpis.items.map((item) => kpiValueText(item.value))
  const minutes = values.map((v) => parseDuration(v.text))
  if (minutes.some((m) => m === null)) return null
  const longest = Math.max(...(minutes as number[]))
  const inks = consoleInks(ctx)
  const inner = rect.w - PANEL.pad * 2
  const split = info ? splitNote(info.text) : null
  const header = split?.label ? fitMono(split.label, { width: inner, size: PANEL.header.size, lineHeight: PANEL.header.box, maxLines: 1 }) : null
  if (split?.label && !header) return null
  const noteText = split ? fitFixed(split.text, { width: inner, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines, fontFamily: ctx.fonts.body, bold: false }) : null
  if (split && !noteText) return null
  const labels = kpis.items.map((item) => fitFixed(item.label, { width: inner, size: ROW.labelSize, lineHeight: 20, maxLines: 1, fontFamily: ctx.fonts.body, bold: false }))
  if (labels.some((l) => l === null)) return null
  const first = header ? ROW.first : ROW.first - 30
  const barsFoot = first + ROW.bar + (kpis.items.length - 1) * ROW.pitch + ROW.barH
  const panelH = noteText ? barsFoot + NOTE.below + (noteText.lines.length - 1) * NOTE.lineHeight + NOTE.foot : barsFoot + PANEL.pad
  if (panelH > rect.h) return null
  const panel = { x: rect.x, y: rect.y, w: rect.w, h: panelH }
  const noteBox = note ? { x: rect.x, y: rect.y + panelH + PANEL.gap, w: rect.w, h: rect.h - panelH - PANEL.gap } : null
  const fittedNote = note && noteBox ? fitNotePanel(note, noteBox.w, ctx, 6) : null
  if (note && (!fittedNote || !noteBox || fittedNote.need > noteBox.h)) return null
  const ground = inks.surface
  const markedIndex = values.findIndex((v) => v.marked)
  const markedW = markedIndex >= 0 ? (inner * minutes[markedIndex]!) / longest : 0
  const bars = kpis.items.map((item, i) => {
    const marked = values[i]!.marked
    const tone = marked ? undefined : toneInk(inks, item.tone)
    const ink = marked ? inks.mark : (tone ?? consoleSeriesInk(ctx, i))
    const w = Math.max(3, (inner * minutes[i]!) / longest)
    const top = rect.y + first + ROW.bar + i * ROW.pitch
    const valueW = monoWidth(values[i]!.text, ROW.valueSize)
    const after = rect.x + PANEL.pad + w + ROW.valueGap + valueW <= rect.x + rect.w - PANEL.pad
    return { item, marked, tone, ink, w, top, after, i }
  })
  return (
    <g {...compositionTag("span")} {...blockTag(ctx, kpis)}>
      {paintPanel(panel, inks.surface, inks.edge)}
      {header ? paintMono(header, { ctx, x: rect.x + PANEL.pad, y: baselineIn(rect.y + PANEL.header.top, PANEL.header.box, PANEL.header.size), fill: consoleText(inks.muted, ground, PANEL.header.size), ground, ...(split?.glossBreak ? { lastAttrs: { "data-gloss-break": split.glossBreak } } : {}) }) : null}
      {bars.map((bar) => {
        const x = rect.x + PANEL.pad
        const value = values[bar.i]!.text
        // Past the bar the value takes the bar's ink; inside a solid bar's end, the ink that reads on it.
        const valueInk = bar.after || bar.tone ? consoleText(bar.ink, ground, ROW.valueSize) : readableOn(bar.ink)
        return (
          <g key={bar.i} data-span-bar={bar.marked ? "marked" : bar.tone ? "toned" : ""}>
            {paintLines(labels[bar.i]!, {
              ctx,
              x,
              y: bar.top - ROW.bar,
              fill: consoleText(bar.ink, ground, ROW.labelSize),
              fontFamily: ctx.fonts.body,
              fontWeight: "400",
              bg: ground,
              attrs: { ...CONSOLE_SPEC },
            })}
            {bar.tone ? (
              <>
                {markedW > 0 && markedW < bar.w ? <rect x={x} y={bar.top} width={markedW} height={ROW.barH} fill={blendOver(bar.ink, ground, 0.25)} /> : null}
                <rect x={x + 1} y={bar.top + 1} width={bar.w - 2} height={ROW.barH - 2} fill="none" stroke={bar.ink} strokeWidth={2} />
              </>
            ) : (
              <rect x={x} y={bar.top} width={bar.w} height={ROW.barH} fill={bar.ink} />
            )}
            <text
              x={bar.after ? x + bar.w + ROW.valueGap : x + bar.w - 2}
              y={baselineIn(bar.top, ROW.barH, ROW.valueSize)}
              textAnchor={bar.after ? undefined : "end"}
              fontFamily={ctx.fonts.mono}
              fontSize={ROW.valueSize}
              fontWeight="700"
              fill={valueInk}
              dominantBaseline="alphabetic"
            >
              {value}
            </text>
          </g>
        )
      })}
      {noteText && info
        ? paintLines(noteText, {
            ctx,
            x: rect.x + PANEL.pad,
            y: rect.y + barsFoot + NOTE.below,
            fill: consoleText(inks.muted, ground, NOTE.size),
            fontFamily: ctx.fonts.body,
            fontWeight: "400",
            bg: ground,
            attrs: { ...CONSOLE_SPEC },
          })
        : null}
      {note && fittedNote && noteBox ? paintNotePanel(note, fittedNote, noteBox, ctx, blockTag(ctx, note)) : null}
    </g>
  ) as React.ReactElement
}
