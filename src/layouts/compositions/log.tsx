import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"
import { baselineIn, consoleInks, consoleText, fitMono, monoWidth, paintIcon, paintMono, paintPanel, toneInk } from "./console"

type Timeline = Extract<Component, { type: "timeline" }>

/*
 * log: a timeline set as an incident log, the console setting's way of
 * telling what happened when. terminal's 2026-10 board, its cascade page
 * (p06): six timestamps down one rule, a dot at each in the ink for what kind
 * of turn it was.
 *
 * The log is a panel named in mono by the timeline's `title`. Each milestone
 * is a row: its date in mono at 17px, a dot on a rule down the panel in the
 * milestone's tone (`danger`, `warning` or `success`, the muted ink without
 * one), its title bold at 18px and its description at 14px in the muted ink.
 * The milestone the author highlights stands on the mark's tint, its date
 * bold and its title in the mark. A milestone's icon replaces its dot, in a
 * ring of the dot's ink.
 *
 * Takes, in the console setting: a `timeline` of two to seven milestones on
 * no lanes, then up to three more components, which stand in a 428px column
 * beside the log, drawn by whichever composition takes them (`handOn`):
 * durations to scale and a note, as the board drew them, is `span`.
 *
 * Declines: a timeline on lanes, a title or description past one line, more
 * milestones than the panel holds at a 56px pitch, and a column nobody takes.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.body`, `fonts.heading`,
 * `fonts.mono`.
 */

const SIDE = { w: 428, gap: 24 } as const
const PANEL = { pad: 24, header: { top: 14, box: 20, size: 13 }, first: 52, foot: 20 } as const
const ROW = { pitch: 66, minPitch: 56, date: { top: 4, box: 24, size: 17 }, dot: { y: 16, r: 6 }, title: { top: 2, box: 26, size: 18 }, desc: { top: 28, box: 22, size: 14 }, band: { inset: 6, top: 6, h: 62 } } as const
const AXIS = { min: 94, gap: 24, stroke: 1.5, textGap: 24 } as const

export const logComposition: Composition = ({ components, ctx, rect, setting, handOn }) => {
  if (setting !== "console") return null
  const [timeline, ...rest] = components
  if (timeline?.type !== "timeline" || rest.length > 3) return null
  return drawLog(timeline, rest, { components, ctx, rect, setting, handOn })
}

function drawLog(timeline: Timeline, rest: readonly Component[], props: Parameters<Composition>[0]) {
  const { ctx, rect, handOn } = props
  const milestones = timeline.milestones
  if (milestones.length < 2 || milestones.length > 7 || milestones.some((m) => m.lane !== undefined)) return null
  const side = rest.length > 0 ? { x: rect.x + rect.w - SIDE.w, y: rect.y, w: SIDE.w, h: rect.h } : null
  const column = side && handOn ? handOn(rest, side) : null
  if (side && !column) return null
  const panel = { x: rect.x, y: rect.y, w: side ? rect.w - SIDE.w - SIDE.gap : rect.w, h: rect.h }
  const inks = consoleInks(ctx)
  const ground = inks.surface
  const dateW = Math.max(...milestones.map((m) => monoWidth(m.date, ROW.date.size)))
  const axisX = panel.x + PANEL.pad + Math.max(AXIS.min, dateW + AXIS.gap)
  const textX = axisX + AXIS.textGap
  const textW = panel.x + panel.w - PANEL.pad - textX
  const pitch = Math.min(ROW.pitch, Math.floor((panel.h - PANEL.first - PANEL.foot) / milestones.length))
  if (pitch < ROW.minPitch) return null
  const header = timeline.title?.trim() ? fitMono(timeline.title, { width: panel.w - PANEL.pad * 2, size: PANEL.header.size, lineHeight: PANEL.header.box, maxLines: 1 }) : null
  if (timeline.title?.trim() && !header) return null
  const rows = milestones.map((m) => ({
    m,
    title: fitFixed(m.title, { width: textW, size: ROW.title.size, lineHeight: ROW.title.box, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true }),
    desc: m.desc?.trim() ? fitFixed(m.desc, { width: textW, size: ROW.desc.size, lineHeight: ROW.desc.box, maxLines: 1, fontFamily: ctx.fonts.body, bold: false }) : null,
  }))
  if (rows.some((r) => r.title === null || (r.m.desc?.trim() && r.desc === null))) return null
  const firstTop = panel.y + PANEL.first
  const lastTop = firstTop + (milestones.length - 1) * pitch
  return (
    <g {...compositionTag("log")}>
      <g {...blockTag(ctx, timeline)}>
        {paintPanel(panel, inks.surface, inks.edge)}
        {header
          ? paintMono(header, { ctx, x: panel.x + PANEL.pad, y: baselineIn(panel.y + PANEL.header.top, PANEL.header.box, PANEL.header.size), fill: consoleText(inks.muted, ground, PANEL.header.size), ground })
          : null}
        {rows.map(({ m }, i) =>
          m.highlight ? (
            <rect key={`band-${i}`} data-log-marked="" x={panel.x + ROW.band.inset} y={firstTop + i * pitch - ROW.band.top} width={panel.w - ROW.band.inset * 2} height={ROW.band.h} fill={inks.tint} />
          ) : null,
        )}
        <line x1={axisX} y1={firstTop + 4} x2={axisX} y2={lastTop + 58} stroke={inks.edge} strokeWidth={AXIS.stroke} />
        {rows.map(({ m, title, desc }, i) => {
          const top = firstTop + i * pitch
          const marked = m.highlight === true
          const rowGround = marked ? inks.tint : ground
          const dotInk = toneInk(inks, m.tone) ?? (marked ? inks.mark : inks.muted)
          const cy = top + ROW.dot.y
          return (
            <g key={i} data-log-row={m.tone ?? ""}>
              <text
                x={panel.x + PANEL.pad}
                y={baselineIn(top + ROW.date.top, ROW.date.box, ROW.date.size)}
                fontFamily={ctx.fonts.mono}
                fontSize={ROW.date.size}
                fontWeight={marked ? "700" : undefined}
                fill={consoleText(marked ? inks.mark : inks.muted, rowGround, ROW.date.size)}
                dominantBaseline="alphabetic"
              >
                {m.date}
              </text>
              {m.icon ? (
                <g data-log-icon={m.icon}>
                  <circle cx={axisX} cy={cy} r={11} fill={rowGround} stroke={dotInk} strokeWidth={1.5} />
                  {paintIcon(m.icon, axisX - 7, cy - 7, 14, dotInk, rowGround)}
                </g>
              ) : (
                <circle cx={axisX} cy={cy} r={ROW.dot.r} fill={dotInk} />
              )}
              {paintLines(title!, {
                ctx,
                x: textX,
                y: baselineIn(top + ROW.title.top, ROW.title.box, ROW.title.size),
                fill: consoleText(marked ? inks.mark : inks.text, rowGround, ROW.title.size),
                fontFamily: ctx.fonts.heading,
                fontWeight: "700",
                bg: rowGround,
              })}
              {desc
                ? paintLines(desc, {
                    ctx,
                    x: textX,
                    y: baselineIn(top + ROW.desc.top, ROW.desc.box, ROW.desc.size),
                    fill: consoleText(inks.muted, rowGround, ROW.desc.size),
                    fontFamily: ctx.fonts.body,
                    fontWeight: "400",
                    bg: rowGround,
                    attrs: { "data-font-floor-exempt": "console-spec" },
                  })
                : null}
            </g>
          )
        })}
      </g>
      {column}
    </g>
  )
}
