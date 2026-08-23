import type { ReactElement } from "react"
import { fitSvgLine } from "../../lib/svg-text-layout"

/**
 * Shared axis-title pair for every cartesian / grid component.
 *
 * Both captions sit outside the plot, stacked, left-aligned, always
 * horizontal. The y-axis name carries "  ↑", the x-axis name carries
 * "  →". Character-column stacking is forbidden here even for CJK —
 * `stacksVertically` stays for ink headings, not for axis titles.
 */
export const AXIS_TITLE_SIZE = 13
export const AXIS_TITLE_MIN_SIZE = 10
export const AXIS_TITLE_BAND_H = 24
export const AXIS_TITLE_BASELINE = AXIS_TITLE_SIZE + 4
export const X_AXIS_ARROW = "  →"
export const Y_AXIS_ARROW = "  ↑"

export function axisTitlePairHeight(xTitle?: string, yTitle?: string): number {
  return (yTitle ? AXIS_TITLE_BAND_H : 0) + (xTitle ? AXIS_TITLE_BAND_H : 0)
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

export function renderAxisTitlePair(opts: {
  x: number
  y: number
  width: number
  xTitle?: string
  yTitle?: string
  fill: string
  fontFamily: string
}): ReactElement | null {
  const yFit = opts.yTitle
    ? fitAxisTitle(opts.yTitle, Y_AXIS_ARROW, opts.width, opts.fontFamily)
    : null
  const xFit = opts.xTitle
    ? fitAxisTitle(opts.xTitle, X_AXIS_ARROW, opts.width, opts.fontFamily)
    : null
  if (!yFit && !xFit) return null
  const yBand = yFit ? AXIS_TITLE_BAND_H : 0
  return (
    <g>
      {yFit ? (
        <text
          data-axis-title="y"
          data-truncated={yFit.truncated ? "1" : undefined}
          x={opts.x}
          y={opts.y + AXIS_TITLE_BASELINE}
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
          x={opts.x}
          y={opts.y + yBand + AXIS_TITLE_BASELINE}
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
