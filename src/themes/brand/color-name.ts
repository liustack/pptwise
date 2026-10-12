/**
 * The everyday name a reader would give a color, read off OKLCH. A repaint
 * derives lighter and darker shades of a brand. A shade that the eye names
 * as another color (a light red is pink, a pale orange is peach, a dark
 * orange is brown, a pale yellow is cream) has stopped being the brand, so
 * `./brand-regen.ts` does not use it.
 *
 * The bands are deliberately coarse. Hue alone names most colors: a light
 * blue is still blue and a dark green still green. The warm hues are the
 * exception, where lightness changes the name.
 *
 * | name | OKLCH |
 * | --- | --- |
 * | `neutral` | chroma below 0.04 (an ink, a grey, a paper) |
 * | `pink` | hue 345 to 10, any lightness (raspberry, rose) |
 * | `red` / `pink` | hue 10 to 45: `pink` from lightness 0.62 up |
 * | `brown` / `orange` / `peach` | hue 45 to 75: `brown` below lightness 0.6, `peach` from 0.82 up |
 * | `olive` / `yellow` / `cream` | hue 75 to 115: `olive` below lightness 0.6, `cream` from 0.9 up |
 * | `green` | hue 115 to 175 |
 * | `teal` | hue 175 to 215 |
 * | `blue` | hue 215 to 290 |
 * | `purple` | hue 290 to 345 |
 *
 * The lines sit where the shades a repaint wrote in October 2026 turned:
 * Office red's `#DC6B6A` (lightness 0.66) and `#FFB5B1` (0.84) read pink
 * and the brand `#C8102E` (0.53) red. Berlin orange's `#FFCA97` (0.87) is
 * peach and homeroom's board `#A66500` (0.57) brown, while `#C67800`
 * (0.64) is still orange.
 */
import { hexToOklch } from "../palette-rebase"
import { CHROMA_FLOOR } from "./brand-face"

export type ColorName = "neutral" | "pink" | "red" | "brown" | "orange" | "peach" | "olive" | "yellow" | "cream" | "green" | "teal" | "blue" | "purple"

/** Lightness from which a red reads pink. */
export const PINK_FROM = 0.62
/** Lightness below which an orange reads brown and a yellow olive. */
export const BROWN_BELOW = 0.6
/** Lightness from which an orange reads peach. */
export const PEACH_FROM = 0.82
/** Lightness from which a yellow reads cream. */
export const CREAM_FROM = 0.9

export function colorName(hex: string): ColorName {
  const { L, C, h } = hexToOklch(hex)
  if (C < CHROMA_FLOOR) return "neutral"
  if (h >= 345 || h < 10) return "pink"
  if (h < 45) return L >= PINK_FROM ? "pink" : "red"
  if (h < 75) return L < BROWN_BELOW ? "brown" : L >= PEACH_FROM ? "peach" : "orange"
  if (h < 115) return L < BROWN_BELOW ? "olive" : L >= CREAM_FROM ? "cream" : "yellow"
  if (h < 175) return "green"
  if (h < 215) return "teal"
  if (h < 290) return "blue"
  return "purple"
}

/** Whether `shade` still carries `source`'s name. */
export function keepsName(shade: string, source: string): boolean {
  return colorName(shade) === colorName(source)
}
