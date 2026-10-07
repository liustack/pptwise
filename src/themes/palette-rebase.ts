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
