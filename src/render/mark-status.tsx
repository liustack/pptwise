import type React from "react"
import { blendOver } from "./ink"

/*
 * How a bar says its value is not a reported figure (`chart` point
 * `status`), the one drawing every chart renderer and every hand-set plot
 * shares:
 *
 * - a forecast is hatched: 3px stripes of the bar's own colour, 8px apart
 *   across, rising left to right, over a pale tint of that colour.
 * - a target is a dashed outline in the bar's colour over the same tint.
 * - an estimate (a past value worked out from published ones) is the bar's
 *   colour laid pale, over half way toward the ground, inside a heavier
 *   dashed outline of the colour: a bar that was there, drawn from what
 *   was said about it.
 *
 * No pattern fill and no clip path: the stripes are one path clipped to the
 * bar by hand, so the export draws each as one editable shape.
 */

export type PointStatus = "forecast" | "target" | "estimate"

const HATCH_PERIOD = 8
const HATCH_STROKE = 3
const TARGET_STROKE = 2
const TARGET_DASH = "6 4"
/** An estimate's outline: heavier and longer-dashed than a target's, its fill the colour at this share over the ground. */
const ESTIMATE_STROKE = 3
const ESTIMATE_DASH = "8 6"
const ESTIMATE_SHARE = 0.55

/** The pale ground a hatched or outlined bar of `color` sits on: `share` of the colour over `surface`. */
export function statusGround(color: string, surface: string, share: number): string {
  return blendOver(color, surface, share)
}

/** 45-degree stripes clipped to the rectangle, as one path. */
export function hatchPath(x: number, y: number, w: number, h: number): string {
  const step = HATCH_PERIOD * Math.SQRT2
  const parts: string[] = []
  // Each stripe is the line x + y = c, from the rectangle's top-left sum to its bottom-right one.
  for (let c = x + y + step / 2; c < x + w + y + h; c += step) {
    const xa = Math.max(x, c - (y + h))
    const xb = Math.min(x + w, c - y)
    if (xb - xa < 0.5) continue
    parts.push(`M ${r1(xa)} ${r1(c - xa)} L ${r1(xb)} ${r1(c - xb)}`)
  }
  return parts.join(" ")
}

function r1(v: number): number {
  return Math.round(v * 10) / 10
}

/** A bar's rectangle drawn as a forecast or a target, in `color` over `ground`. */
export function StatusMark({
  status,
  color,
  ground,
  x,
  y,
  w,
  h,
  extra = {},
}: {
  status: PointStatus
  color: string
  ground: string
  x: number
  y: number
  w: number
  h: number
  extra?: Record<string, string>
}): React.ReactElement {
  if (status === "forecast") {
    return (
      <g data-mark-status="forecast" {...extra}>
        <rect x={x} y={y} width={w} height={h} fill={ground} />
        <path d={hatchPath(x, y, w, h)} fill="none" stroke={color} strokeWidth={HATCH_STROKE} />
      </g>
    )
  }
  if (status === "estimate") {
    // The ground handed in is the status tint; the estimate lays the colour heavier over it, so the bar still reads as a bar.
    const inset = ESTIMATE_STROKE / 2
    return (
      <rect
        data-mark-status="estimate"
        x={x + inset}
        y={y + inset}
        width={Math.max(1, w - ESTIMATE_STROKE)}
        height={Math.max(1, h - ESTIMATE_STROKE)}
        fill={blendOver(color, ground, ESTIMATE_SHARE)}
        stroke={color}
        strokeWidth={ESTIMATE_STROKE}
        strokeDasharray={ESTIMATE_DASH}
        {...extra}
      />
    )
  }
  const inset = TARGET_STROKE / 2
  return (
    <rect
      data-mark-status="target"
      x={x + inset}
      y={y + inset}
      width={Math.max(1, w - TARGET_STROKE)}
      height={Math.max(1, h - TARGET_STROKE)}
      fill={ground}
      stroke={color}
      strokeWidth={TARGET_STROKE}
      strokeDasharray={TARGET_DASH}
      {...extra}
    />
  )
}

/**
 * The words a forecast's label and a legend entry use, a target's legend
 * entry, and the entry for the reported bars beside them when one series
 * carries both.
 */
export function statusWords(chinese: boolean): { forecastSuffix: string; forecast: string; target: string; estimate: string; reported: string } {
  return chinese
    ? { forecastSuffix: "（预测）", forecast: "预测", target: "目标", estimate: "推算", reported: "实际" }
    : { forecastSuffix: " (forecast)", forecast: "Forecast", target: "Target", estimate: "Estimate", reported: "Actual" }
}
