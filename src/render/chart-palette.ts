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
 * entries the same one. On `consulting` the accent *is* chart-palette slot 1,
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
