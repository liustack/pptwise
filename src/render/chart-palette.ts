import { blendOver, contrastRatio, graphicInk } from "./ink"

/**
 * Cyclic rotation of a chart series palette. Applied only at the chart
 * render seam (`components/chart.tsx`, `components/sankey.tsx`) from
 * `ctx.chartPaletteOffset` — `ctx.colors.chartPalette` itself stays in
 * the theme's declared order so motifs that pick decorative fills by
 * fixed index do not drift. The renderer always passes offset 0, so
 * series colors follow the declared `chartPalette` order.
 *
 * Contrast safety: no chart renderer in `chart-svg.tsx` derives any
 * `<text>` fill from `palette[i]` — every label reads a fixed theme token
 * (`ctx.colors.text`/`muted`/`accent`, never the palette array itself; the
 * one exception, `renderBar`'s tallest-bar highlight, reads `accentColor`
 * directly, also not the palette).
 */

/**
 * Cyclic left-rotation: `result[0] === palette[offset % palette.length]`
 * (negative offsets wrap correctly too — `((offset % n) + n) % n`). An
 * `offset` that's a multiple of `palette.length` (including `0`) — or an
 * empty `palette` — returns a same-*values* copy: the identity rotation,
 * never the same array *reference*, so a caller can always safely treat the
 * return value as a fresh array without special-casing "did rotation
 * actually happen".
 */
export function rotateChartPalette(palette: readonly string[], offset: number): string[] {
  if (palette.length === 0) return [...palette]
  const n = ((offset % palette.length) + palette.length) % palette.length
  return [...palette.slice(n), ...palette.slice(0, n)]
}

/**
 * The series palette a face gets when it reserves the theme's accent for one
 * emphasis of its own.
 *
 * Two faces do this: `gauge-stats` keeps the highlight yellow for the single
 * "so what" its grammar allows, and the `show` family keeps the crimson for
 * its own one mark. Both used to do it by mapping the accent entry onto
 * `primary`, which does not remove a colour from the palette — it makes two
 * entries the same one. On `brief` the accent *is* chart-palette slot 1,
 * so a two-series bar chart painted both series `#1E2A4A` and read as one
 * series, in the bars and in the legend alike.
 *
 * Dropping the entry is what the two faces meant. The remaining colours keep
 * their order and stay distinct, and a series that used to land on the accent
 * lands on the next real colour instead. The last entry is never removed:
 * a palette of one is still a palette, and an empty one would paint nothing.
 */
export function paletteWithoutAccent(palette: readonly string[], accent: string): string[] {
  const kept = palette.filter((color) => color.toUpperCase() !== accent.toUpperCase())
  return kept.length > 0 ? kept : [...palette]
}

/** WCAG 2.1 SC 1.4.11's non-text floor, which a receded mark still owes. */
const RECEDED_MARK_CONTRAST = 3
/** Steps from the page background toward `muted` the receding grey walks. */
const RECEDED_MARK_STEPS = 32

/**
 * The grey every unmarked series or bar recedes to when the author singles
 * one out (chart `series[].emphasis`, waterfall `items[].emphasis`).
 *
 * Receding is the whole job, so this is the lightest blend of the theme's own
 * `muted` over the background the marks stand on that still clears the 3:1 a
 * graphic owes the page: quiet enough to step back, never so pale it stops
 * being a mark. A brand palette's own grey is not reached for, because most
 * palettes have none, and one that does (brief's `#797D86`) lands within a
 * step of this anyway.
 *
 * A theme whose `muted` cannot clear 3:1 on that background falls back to
 * `graphicInk`'s neutral ink, the same answer every icon stroke gets.
 */
export function recededMarkFill(mutedHex: string, bgHex: string): string {
  if (contrastRatio(mutedHex, bgHex) < RECEDED_MARK_CONTRAST) return graphicInk(mutedHex, bgHex)
  for (let step = 1; step < RECEDED_MARK_STEPS; step++) {
    const candidate = blendOver(mutedHex, bgHex, step / RECEDED_MARK_STEPS)
    if (contrastRatio(candidate, bgHex) >= RECEDED_MARK_CONTRAST) return candidate
  }
  return mutedHex
}

/**
 * The series palette when one series is singled out: that series takes the
 * lead color (`palette[0]`, after any rotation), and every other series the
 * receded grey. Indexed by series, the way every cartesian renderer reads it
 * (`palette[seriesIndex % palette.length]`), so the legend swatches that read
 * the same array agree with the marks.
 */
export function emphasisSeriesPalette(
  palette: readonly string[],
  seriesCount: number,
  markedIndex: number,
  recededFill: string,
): string[] {
  return Array.from({ length: seriesCount }, (_, i) => (i === markedIndex ? palette[0]! : recededFill))
}
