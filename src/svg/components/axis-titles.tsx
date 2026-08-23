import type { ReactElement } from "react"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"

/**
 * Shared axis-title pair for every cartesian / grid component.
 *
 * Both captions sit on **one horizontal line**, left-aligned, always
 * horizontal, **below** the plot or grid. The y-axis name comes first with
 * "  ↑", then a gap, then the x-axis name with "  →". Character-column
 * stacking is forbidden here even for CJK — `stacksVertically` stays for
 * ink headings, not for axis titles.
 *
 * Placement is the caller's job (always below the drawing):
 *  - cartesian plots (bar / line / area / scatter) put the pair under the
 *    x-axis, left-aligned to the plot origin (`renderCartesianAxisTitles`)
 *  - grid plots (heatmap / matrix) put the same pair under the grid
 */
export const AXIS_TITLE_SIZE = 13
export const AXIS_TITLE_MIN_SIZE = 10
export const AXIS_TITLE_BAND_H = 24
export const AXIS_TITLE_BASELINE = AXIS_TITLE_SIZE + 4
/** Gap between the y-title and the x-title on the shared line (design board `tspan dx`). */
export const AXIS_TITLE_GAP = 36
export const X_AXIS_ARROW = "  →"
export const Y_AXIS_ARROW = "  ↑"

export function axisTitlePairHeight(xTitle?: string, yTitle?: string): number {
  return xTitle || yTitle ? AXIS_TITLE_BAND_H : 0
}

export function fitAxisTitle(
  title: string,
  arrow: string,
  maxWidth: number,
  fontFamily?: string,
): ReturnType<typeof fitSvgLine> {
  return fitSvgLine(`${title}${arrow}`, {
    maxWidth,
    fontSize: AXIS_TITLE_SIZE,
    minFontSize: AXIS_TITLE_MIN_SIZE,
    fontFamily,
  })
}

function fittedWidth(fit: ReturnType<typeof fitSvgLine>, fontFamily?: string): number {
  return measureTextUnits(fit.text, { fontFamily }) * fit.fontSize
}

function fitTitlePair(
  xTitle: string | undefined,
  yTitle: string | undefined,
  width: number,
  fontFamily?: string,
): {
  yFit: ReturnType<typeof fitSvgLine> | null
  xFit: ReturnType<typeof fitSvgLine> | null
  yWidth: number
} {
  const yRaw = yTitle || undefined
  const xRaw = xTitle || undefined
  if (!yRaw && !xRaw) return { yFit: null, xFit: null, yWidth: 0 }
  if (yRaw && !xRaw) {
    const yFit = fitAxisTitle(yRaw, Y_AXIS_ARROW, width, fontFamily)
    return { yFit, xFit: null, yWidth: fittedWidth(yFit, fontFamily) }
  }
  if (xRaw && !yRaw) {
    return { yFit: null, xFit: fitAxisTitle(xRaw, X_AXIS_ARROW, width, fontFamily), yWidth: 0 }
  }
  const yNat = measureTextUnits(`${yRaw}${Y_AXIS_ARROW}`, { fontFamily }) * AXIS_TITLE_SIZE
  const xNat = measureTextUnits(`${xRaw}${X_AXIS_ARROW}`, { fontFamily }) * AXIS_TITLE_SIZE
  const yMax = yNat + AXIS_TITLE_GAP + xNat <= width ? yNat : Math.max(1, width - AXIS_TITLE_GAP) * (yNat / (yNat + xNat || 1))
  const yFit = fitAxisTitle(yRaw!, Y_AXIS_ARROW, Math.max(1, yMax), fontFamily)
  const yWidth = fittedWidth(yFit, fontFamily)
  const xFit = fitAxisTitle(xRaw!, X_AXIS_ARROW, Math.max(1, width - yWidth - AXIS_TITLE_GAP), fontFamily)
  return { yFit, xFit, yWidth }
}

export function renderAxisTitlePair(opts: {
  x: number
  y: number
  width: number
  xTitle?: string
  yTitle?: string
  fill: string
  fontFamily: string
}): ReactElement | null {
  const { yFit, xFit, yWidth } = fitTitlePair(opts.xTitle, opts.yTitle, opts.width, opts.fontFamily)
  if (!yFit && !xFit) return null
  const baseline = opts.y + AXIS_TITLE_BASELINE
  const xTitleX = yFit ? opts.x + yWidth + AXIS_TITLE_GAP : opts.x
  return (
    <g data-axis-title-pair="1">
      {yFit ? (
        <text
          data-axis-title="y"
          data-truncated={yFit.truncated ? "1" : undefined}
          x={opts.x}
          y={baseline}
          fontSize={yFit.fontSize}
          fill={opts.fill}
          fontFamily={opts.fontFamily}
          dominantBaseline="alphabetic"
        >
          {yFit.text}
        </text>
      ) : null}
      {xFit ? (
        <text
          data-axis-title="x"
          data-truncated={xFit.truncated ? "1" : undefined}
          x={xTitleX}
          y={baseline}
          fontSize={xFit.fontSize}
          fill={opts.fill}
          fontFamily={opts.fontFamily}
          dominantBaseline="alphabetic"
        >
          {xFit.text}
        </text>
      ) : null}
    </g>
  )
}

/** Cartesian placement: the pair sits under the x-axis, left-aligned to the plot origin. */
export function renderCartesianAxisTitles(opts: {
  plotX: number
  plotBottom: number
  plotW: number
  xTitle?: string
  yTitle?: string
  fill: string
  fontFamily: string
}): ReactElement | null {
  return renderAxisTitlePair({
    x: opts.plotX,
    y: opts.plotBottom,
    width: opts.plotW,
    xTitle: opts.xTitle,
    yTitle: opts.yTitle,
    fill: opts.fill,
    fontFamily: opts.fontFamily,
  })
}
