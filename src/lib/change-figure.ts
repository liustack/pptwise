import { isPercentUnit } from "./quantity-format"

/**
 * The change from `first` to `last` a chart states between two of its bars
 * (`chart.changes`): a whole percent for most units ("+11%", "−24%"), and a
 * change in points to one decimal when the value axis is in percent
 * ("−4.5 个百分点", "−4.5 pts"), the same words `rail` uses for a rate. Every
 * renderer that draws a change, the chart component and the hand-set plots
 * alike, prints it from here, so one change reads the same on every theme.
 */
export function changeText(first: number, last: number, unit: string | undefined, chinese: boolean): string {
  if (isPercentUnit(unit)) {
    const tenths = Math.round((last - first) * 10)
    const figure = tenths === 0 ? "0.0" : `${tenths > 0 ? "+" : "−"}${(Math.abs(tenths) / 10).toFixed(1)}`
    return `${figure} ${chinese ? "个百分点" : "pts"}`
  }
  const pct = Math.round(((last - first) / first) * 100)
  return pct === 0 ? "0%" : `${pct > 0 ? "+" : "−"}${Math.abs(pct)}%`
}
