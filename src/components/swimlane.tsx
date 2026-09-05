import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk, graphicInk } from "../render/ink"
import { mixHex } from "./color-mix"
import { DroppedContentMarker } from "../render/drop-marker"
import {
  FORM_BODY_FLOOR,
  fitFormLine,
  fitFormTitleLine,
  formHighlightFill,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type SwimlaneComponent = Extract<Component, { type: "swimlane" }>

/**
 * 泳道：左边一列角色名，右边 2-4 条横带，流程从左到右一步一格。步与步之间
 * 只走直角折线；换泳道的那一根用 primary 加粗，因为「在哪里换了人」就是这
 * 张图要说的事。最后一步整块反色填满（formHighlightFill）。箭头用 polygon
 * 画，不用 marker——svg2pptx 会跳过 marker。
 */

/** Natural height. Under an ordinary content rect on purpose — see decision-tree.tsx. */
const MAX_H = 330
const LANE_GAP = 14
const BOX_GAP = 18
const ARROW = 7
/** No room at all for a note: not even the first two characters would land. */
const NOTE_FLOOR = 60

interface Lane {
  y: number
  h: number
}

interface StepBox {
  i: number
  lane: number
  x: number
  y: number
  w: number
  h: number
}

interface Geometry {
  labelW: number
  lanes: Lane[]
  boxes: StepBox[]
  h: number
}

function resolve(component: SwimlaneComponent, w: number, budgetH?: number): Geometry {
  const laneCount = component.lanes.length
  const budget = budgetH !== undefined && budgetH > 0 ? Math.min(MAX_H, budgetH) : MAX_H
  const laneH = Math.floor(Math.min(126, (budget - LANE_GAP * (laneCount - 1)) / laneCount))
  const h = Math.round(laneH * laneCount + LANE_GAP * (laneCount - 1))
  const lanes: Lane[] = component.lanes.map((_, i) => ({
    y: Math.round(i * (laneH + LANE_GAP)),
    h: Math.round(laneH),
  }))
  const labelW = Math.round(Math.min(200, Math.max(120, w * 0.16)))
  const trackX = labelW + 24
  const colW = (w - trackX) / component.steps.length
  const stepH = Math.round(Math.min(84, laneH - 32))
  const laneOf = (label: string) => Math.max(0, component.lanes.findIndex((lane) => lane.label === label))
  const boxes: StepBox[] = component.steps.map((step, i) => {
    const lane = laneOf(step.lane)
    return {
      i,
      lane,
      x: Math.round(trackX + i * colW + BOX_GAP / 2),
      y: Math.round(lanes[lane]!.y + (lanes[lane]!.h - stepH) / 2),
      w: Math.round(colW - BOX_GAP),
      h: stepH,
    }
  })
  return { labelW, lanes, boxes, h }
}

/** Orthogonal connector: out of `a`'s right edge, across, then into `b`'s left edge. */
function connector(a: StepBox, b: StepBox): { d: string; tipY: number } {
  const ay = a.y + a.h / 2
  const by = b.y + b.h / 2
  const ax = a.x + a.w
  const bx = b.x - ARROW
  if (a.lane === b.lane) return { d: `M ${ax} ${ay} L ${bx} ${ay}`, tipY: ay }
  const mid = Math.round((ax + bx) / 2)
  return { d: `M ${ax} ${ay} L ${mid} ${ay} L ${mid} ${by} L ${bx} ${by}`, tipY: by }
}

function arrowHead(x: number, y: number, color: string, scale: number): ReactElement {
  const s = ARROW * scale
  return <polygon points={`${x},${y - s * 0.62} ${x + s},${y} ${x},${y + s * 0.62}`} fill={color} />
}

export const swimlane: SvgComponent<SwimlaneComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolve(component, box.w, box.h)
    const border = ctx.colors.border ?? ctx.colors.muted
    // The lane band is a tint of the page, not a card: it groups the boxes
    // sitting on it without becoming a second surface behind them.
    const bandFill = mixHex(ctx.colors.bg, border, 0.45)
    const highlight = formHighlightFill(ctx.colors)
    const last = component.steps.length - 1
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const radius = ctx.shape?.radius ?? 4

    // The first arrow that leaves its lane is the handover this drawing exists
    // to point at, so it is the one that carries the note and the heavy stroke.
    const crossing = g.boxes.findIndex((b, i) => i > 0 && b.lane !== g.boxes[i - 1]!.lane)
    const note: string = component.handoff_note?.trim() ?? ""
    let noteFit: { text: string; fontSize: number; truncated: boolean } | null = null
    let noteX = 0
    let noteY = 0
    if (note && crossing > 0) {
      const from = g.boxes[crossing - 1]!
      const to = g.boxes[crossing]!
      noteX = Math.round((from.x + from.w + to.x - ARROW) / 2) + 14
      noteY = from.y + from.h / 2
      // The note lives in the source lane, so it runs until the next box in
      // that same lane starts — or to the drawing's right edge if there is none.
      const nextInLane = g.boxes.find((b) => b.i > from.i && b.lane === from.lane)
      const room = (nextInLane ? nextInLane.x - 14 : box.w) - noteX
      // A handover note is a sentence about a handover. Half of it beside the
      // arrow says less than nothing, so a note that will not fit whole is
      // declared dropped rather than cut — the export gate then refuses the
      // deck instead of shipping a page that lost a line without saying so.
      const fitted =
        room >= NOTE_FLOOR
          ? fitFormLine(note, { maxWidth: room, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
          : null
      noteFit = fitted && !fitted.truncated ? fitted : null
    }
    const noteDeclined = note !== "" && crossing > 0 && noteFit === null ? 1 : 0

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {g.lanes.map((lane, i) => (
          <rect key={`band-${i}`} x={g.labelW + 12} y={lane.y} width={box.w - g.labelW - 12} height={lane.h} fill={bandFill} />
        ))}
        {component.lanes.map((lane, i) => {
          const band = g.lanes[i]!
          const label = fitFormTitleLine(lane.label, {
            maxWidth: g.labelW,
            fontSize: 20,
            fontFamily: ctx.fonts.body,
          })
          const role = lane.role?.trim()
          const roleFit = role
            ? fitFormLine(role, { maxWidth: g.labelW, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
            : null
          const blockH = label.fontSize + (roleFit ? roleFit.fontSize + 8 : 0)
          const top = band.y + band.h / 2 - blockH / 2
          return (
            <g key={`lane-${i}`}>
              <text
                data-truncated={label.truncated ? "1" : undefined}
                x={0}
                y={top + label.fontSize * 0.9}
                fontFamily={ctx.fonts.body}
                fontSize={label.fontSize}
                fontWeight="700"
                fill={accessibleInk(ctx.colors.primary, pageBg, label.fontSize)}
              >
                {label.text}
              </text>
              {roleFit ? (
                <text
                  data-truncated={roleFit.truncated ? "1" : undefined}
                  x={0}
                  y={top + label.fontSize + 8 + roleFit.fontSize * 0.9}
                  fontFamily={ctx.fonts.body}
                  fontSize={roleFit.fontSize}
                  fill={accessibleInk(ctx.colors.muted, pageBg, roleFit.fontSize)}
                >
                  {roleFit.text}
                </text>
              ) : null}
            </g>
          )
        })}
        {g.boxes.slice(1).map((to, k) => {
          const from = g.boxes[k]!
          const crosses = to.lane !== from.lane
          // The crossing arrow is routed through `graphicInk` against the band
          // it lands on: a dark theme's primary is a near-black on a near-black
          // band, and the handover arrow is the one line this drawing cannot
          // afford to lose. The in-lane hairline keeps the theme's own border
          // token, which is a rule, not a graphic, and is drawn to be quiet.
          const color = crosses ? graphicInk(ctx.colors.primary, bandFill) : border
          const { d, tipY } = connector(from, to)
          return (
            <g key={`arrow-${k}`}>
              <path d={d} fill="none" stroke={color} strokeWidth={crosses ? 3 : 1.25} />
              {arrowHead(to.x - ARROW, tipY, color, crosses ? 1.3 : 1)}
            </g>
          )
        })}
        {g.boxes.map((b) => {
          const step = component.steps[b.i]!
          const filled = b.i === last
          const fill = filled ? highlight : ctx.colors.surface
          const pad = 12
          const inner = b.w - pad * 2
          // A step box is a node on a track, not a card: seven boxes share one
          // slide width, so the label sits against FORM_BODY_FLOOR the way
          // cycle's in-circle labels do, shrinking on one line rather than
          // wrapping a four-word title into a two-line stack.
          const title = fitFormLine(step.title, {
            maxWidth: inner,
            fontSize: 20,
            bold: true,
            fontFamily: ctx.fonts.body,
          })
          const detail = step.detail?.trim()
          const detailFit = detail
            ? fitFormLine(detail, { maxWidth: inner, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
            : null
          const blockH = title.fontSize + (detailFit ? detailFit.fontSize + 8 : 0)
          const top = b.y + b.h / 2 - blockH / 2
          return (
            <g key={`box-${b.i}`}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={radius}
                fill={fill}
                stroke={filled ? highlight : border}
                strokeWidth={1}
              />
              <text
                data-truncated={title.truncated ? "1" : undefined}
                x={b.x + pad}
                y={top + title.fontSize * 0.9}
                fontFamily={ctx.fonts.body}
                fontSize={title.fontSize}
                fontWeight="700"
                fill={accessibleInk(filled ? ctx.colors.surface : ctx.colors.text, fill, title.fontSize)}
              >
                {title.text}
              </text>
              {detailFit ? (
                <text
                  data-truncated={detailFit.truncated ? "1" : undefined}
                  x={b.x + pad}
                  y={top + title.fontSize + 8 + detailFit.fontSize * 0.9}
                  fontFamily={ctx.fonts.body}
                  fontSize={detailFit.fontSize}
                  fill={accessibleInk(filled ? ctx.colors.surface : ctx.colors.muted, fill, detailFit.fontSize)}
                >
                  {detailFit.text}
                </text>
              ) : null}
            </g>
          )
        })}
        {noteFit ? (
          <text
            data-truncated={noteFit.truncated ? "1" : undefined}
            x={noteX}
            y={noteY + noteFit.fontSize * 0.35}
            fontFamily={ctx.fonts.body}
            fontSize={noteFit.fontSize}
            fill={accessibleInk(ctx.colors.text, bandFill, noteFit.fontSize)}
          >
            {noteFit.text}
          </text>
        ) : null}
        <DroppedContentMarker count={noteDeclined} kind="label" />
      </g>
    )
  },
}

export const renderDef: RenderDef<SwimlaneComponent> = {
  type: "swimlane",
  measure: swimlane.measure,
  render: swimlane.render,
}
