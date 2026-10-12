/**
 * The blue-with-orange ban on chart palettes (round-4 review). A palette
 * must not put a vivid orange and a vivid blue in the same chart. The bands
 * and their reasons are written up in `chart-palette-taboo.test.ts`, which
 * sweeps every built-in palette with these same predicates. A palette that
 * `--brand` rederives is held to it too (`brand/brand-regen.ts`).
 */
import { hexToHsl } from "./palette-rebase"

/** Saturation at and above which an orange or a blue counts as vivid. */
export const VIVID_SATURATION = 0.35

/** Hue 15-50, vivid. Wide on purpose: gold and yellow fall in it too. */
export function isVividOrange(hex: string): boolean {
  const { h, s } = hexToHsl(hex)
  return s >= VIVID_SATURATION && h >= 15 && h <= 50
}

/** Hue 195-260, vivid. Teal below 195 and the slate grey-blues stay out. */
export function isVividBlue(hex: string): boolean {
  const { h, s } = hexToHsl(hex)
  return s >= VIVID_SATURATION && h >= 195 && h <= 260
}

/** Whether `a` and `b` are the banned pair, in either order. */
export function isTabooPair(a: string, b: string): boolean {
  return (isVividOrange(a) && isVividBlue(b)) || (isVividBlue(a) && isVividOrange(b))
}

/** Whether any two colors in `palette` are the banned pair. */
export function paletteBreaksTaboo(palette: readonly string[]): boolean {
  return palette.some((a, i) => palette.slice(i + 1).some((b) => isTabooPair(a, b)))
}
