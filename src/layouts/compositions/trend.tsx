import { trendSeal } from "./plot-seal"
import { compositionTag, type Composition } from "./shared"

/*
 * trend: one series as a line over its value axis, a marked value range
 * (`bands`) tinted behind it, every point printing its value and the last
 * filled. Vermilion's 2026-10 growth page (p09) sets it beside its figures
 * through `rail`; alone on a page it takes the whole band. See `trendSeal`
 * in `./plot-seal.tsx`.
 *
 * Takes: one `line` chart of one series with two to twelve points and at
 * most one band. The seal setting only.
 */
export const trendComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "seal" || components.length !== 1) return null
  const [chart] = components
  if (chart?.type !== "chart") return null
  const drawn = trendSeal(chart, rect, ctx)
  return drawn ? <g {...compositionTag("trend")}>{drawn}</g> : null
}
