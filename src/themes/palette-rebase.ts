/**
 * Moving a colour from one palette onto another by where it sits between the
 * palette's plane and its text, the derivation `theme fork` rebuilds a whole
 * palette with (`cli/theme-fork.ts`). Lightness keeps its share of the way
 * from plane to text, hue keeps its offset from the plane's hue, saturation
 * keeps its difference from the plane's. The renderer moves a painted page's
 * neutral tokens with the same hue and saturation step
 * (`render/page-palette.ts`).
 */
import { HexTokenSchema } from "./hex"

export interface Hsl {
  h: number
  s: number
  l: number
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

export function hexToRgb(hex: string): [number, number, number] {
  const canonical = HexTokenSchema.parse(hex)
  const n = Number.parseInt(canonical.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function hexToHsl(hex: string): Hsl {
  const [r, g, b] = hexToRgb(hex)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  const l = (max + min) / 2
  if (delta === 0) return { h: 0, s: 0, l }
  const s = delta / (1 - Math.abs(2 * l - 1))
  let h = 0
  if (max === r) h = 60 * (((g - b) / delta) % 6)
  else if (max === g) h = 60 * ((b - r) / delta + 2)
  else h = 60 * ((r - g) / delta + 4)
  return { h: (h + 360) % 360, s, l }
}

export function hslToHex({ h, s, l }: Hsl): string {
  const hue = ((h % 360) + 360) % 360
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const segment = hue / 60
  const x = chroma * (1 - Math.abs((segment % 2) - 1))
  const [r1, g1, b1] =
    segment < 1 ? [chroma, x, 0]
      : segment < 2 ? [x, chroma, 0]
        : segment < 3 ? [0, chroma, x]
          : segment < 4 ? [0, x, chroma]
            : segment < 5 ? [x, 0, chroma]
              : [chroma, 0, x]
  const m = l - chroma / 2
  const channel = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, "0")
  return `#${channel(r1)}${channel(g1)}${channel(b1)}`.toUpperCase()
}

export function hueDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

/**
 * The hue and saturation `color` takes when its plane moves from
 * `sourcePlane` to `targetPlane`: the hue keeps its offset from a saturated
 * plane's hue (a neutral plane leaves it where it is), and the saturation
 * keeps its difference from the plane's.
 */
export function rebasedHueSaturation(color: string, sourcePlane: string, targetPlane: string): { h: number; s: number } {
  const value = hexToHsl(color)
  const source = hexToHsl(sourcePlane)
  const target = hexToHsl(targetPlane)
  const offset = source.s > 0.02 && value.s > 0.02
    ? hueDelta(source.h, value.h)
    : 0
  const hue = target.s > 0.02 ? target.h + offset : value.h
  const saturation = clamp(target.s + value.s - source.s)
  return { h: hue, s: saturation }
}

export function rebaseRelativeColor(
  color: string,
  sourcePlane: string,
  targetPlane: string,
  sourceText: string,
  targetText: string,
): string {
  const value = hexToHsl(color)
  const source = hexToHsl(sourcePlane)
  const target = hexToHsl(targetPlane)
  const oldText = hexToHsl(sourceText)
  const newText = hexToHsl(targetText)
  const sourceRange = oldText.l - source.l
  const progress = Math.abs(sourceRange) < 1e-6
    ? 0
    : (value.l - source.l) / sourceRange
  const lightness = clamp(target.l + progress * (newText.l - target.l))
  return hslToHex({ ...rebasedHueSaturation(color, sourcePlane, targetPlane), l: lightness })
}

function linearChannel(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** A color in OKLab: lightness, then the green-red and blue-yellow axes. */
export function hexToOklab(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(linearChannel) as [number, number, number]
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** How different two colors look: their distance in OKLab. */
export function oklabDistance(a: string, b: string): number {
  const x = hexToOklab(a)
  const y = hexToOklab(b)
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

/**
 * Chroma in OKLCH: how far a color sits from the grey of the same
 * lightness, measured the way the eye sees it. HSL saturation runs high on
 * near-black colors (a warm ink black reads 0.13), so it cannot tell a deep
 * petrol from an ink black. OKLCH chroma can.
 */
export function oklchChroma(hex: string): number {
  const [, a, b] = hexToOklab(hex)
  return Math.hypot(a, b)
}
