/**
 * A theme repainted around one brand color: `pptwise theme fork --brand`
 * and `pptwise brand extract`.
 *
 * The theme stays the theme. Its ground, text, surface, and everything
 * derived from them (panel, border, card stroke, muted, status colors) are
 * kept as they are. Only its colored slots move:
 *
 * 1. Placement. The brand goes, unchanged, into the slot the theme shows
 *    most (its face, measured in `./brand-face.ts`) when it reads there. If
 *    not, unchanged into the theme's other colored slot when it reads there,
 *    and the face keeps the theme's own color. If neither, into the face
 *    with its hue and saturation kept and its lightness moved to the face's
 *    own, then on to the nearest lightness that reads.
 * 2. Every other colored token turns by the hue step the placed slot took.
 *    Near blacks, greys, and shades of the ground itself stay.
 * 3. The chart palette keeps the theme's own shape: entries that were the
 *    theme's primary or accent become the new primary or accent, other
 *    colored entries turn by the same step, greys stay. Each entry reads on
 *    the ground at least as well as the theme's own did, up to 3:1, and the
 *    palette keeps the blue-with-orange ban.
 *
 * "Reads" means the contrast against `bg` a slot needs: 4.5:1 when the slot
 * sets body-size words on the sample pages, 3:1 otherwise, and never more
 * than the theme's own color had there.
 */
import type { BackgroundSpec } from "../ir"
import { PptwiseError } from "../errors"
import { contrastRatio } from "../render/ink"
import { assertContrastFloor } from "../themes/definitions"
import { isTabooPair } from "../themes/chart-taboo"
import { HexTokenSchema } from "../themes/hex"
import { hexToHsl, hslToHex, hueDelta, oklabDistance, type Hsl } from "../themes/palette-rebase"
import { ThemeFileSchema, type ThemeFile } from "../themes/schema"
import { isChromatic, measureBrandFace, type BrandFace, type BrandSlot } from "./brand-face"

/** Contrast a slot that sets body-size words needs against the ground. */
export const BODY_TEXT_RATIO = 4.5
/** Contrast a slot that only draws marks or display-size words needs. */
export const MARK_RATIO = 3

const LIGHTNESS_STEPS = 1000

/**
 * OKLab distance from the ground below which a color is part of the ground:
 * a panel or a shade of the page, not a color the page shows. rally's plum
 * primary sits 0.03 from its plum page, terminal's navy 0.12 from its
 * console black. brief's yellow, the faintest slot that does show, sits 0.21
 * from its paper.
 */
export const GROUND_DISTANCE = 0.15

/** A color the page shows: it has chroma and it stands off the ground. */
function showsAsColor(hex: string, bg: string): boolean {
  return isChromatic(hex) && oklabDistance(hex, bg) >= GROUND_DISTANCE
}

/**
 * OKLab distance a lightness change may move the brand and still count as
 * the brand: about what two printings of one swatch differ by. Within it,
 * the face takes the nudged brand before the other slot is tried.
 */
export const NUDGE_DISTANCE = 0.03

export type PlacementRoute =
  /** The brand reads in the face slot and went in unchanged. */
  | "face"
  /** It reads in the face slot one shade lighter or darker, too little to see. */
  | "nudged"
  /** It did not, but it reads in the theme's other colored slot. */
  | "other"
  /** It read in neither: its lightness was moved to fit the face slot. */
  | "lightness"

export interface BrandPlacement {
  /** The brand color asked for. */
  brand: string
  /** The theme's measured face. */
  face: BrandSlot
  /** The slot the brand was written into. */
  slot: BrandSlot
  /** The color written there: the brand itself unless `route` is `nudged` or `lightness`. */
  color: string
  route: PlacementRoute
  /** Contrast each slot needs against `bg`, and what the brand had there. */
  checks: { slot: BrandSlot; need: number; brandRatio: number; bodyText: boolean }[]
  /** The theme's ground the checks measured against. */
  bg: string
  /** Whether the slot that is not the face holds a color of its own. */
  otherIsColor: boolean
}

export interface BrandRegenResult {
  file: ThemeFile
  placement: BrandPlacement
}

const upper = (hex: string) => hex.toUpperCase()

function otherSlot(slot: BrandSlot): BrandSlot {
  return slot === "primary" ? "accent" : "primary"
}

/** The nearest lightness to `start` at which `hsl` clears `need` on `bg`. */
function nearestReadable(hsl: Hsl, start: number, bg: string, need: number): string | undefined {
  let best: { color: string; distance: number } | undefined
  for (let step = 0; step <= LIGHTNESS_STEPS; step++) {
    const l = step / LIGHTNESS_STEPS
    const candidate = hslToHex({ ...hsl, l })
    if (contrastRatio(candidate, bg) < need) continue
    const distance = Math.abs(l - start)
    if (best === undefined || distance < best.distance) best = { color: candidate, distance }
  }
  return best?.color
}

/** `color` as is when it clears `need` on `bg`, else its nearest readable lightness. */
function keepReadable(color: string, bg: string, need: number): string {
  if (contrastRatio(color, bg) >= need) return color
  const hsl = hexToHsl(color)
  return nearestReadable(hsl, hsl.l, bg, need) ?? color
}

/** What a theme's own color needs in a slot: the floor, but never more than it had. */
function slotNeed(own: string, bg: string, floor: number): number {
  return Math.min(floor, contrastRatio(own, bg))
}

/**
 * Remove the blue-with-orange pairs the rederived chart palette made. A pair
 * whose two entries the theme's own palette already paired as blue and
 * orange is the theme's ruled exception (brief's navy and yellow) and stays,
 * whatever color the brand turned them. Otherwise the later entry goes,
 * unless it is the brand, in which case the earlier one does. Repeated
 * colors are dropped after.
 */
function keepChartTaboo(palette: readonly string[], source: readonly string[], brand: string): string[] {
  let entries = palette.map((color, index) => ({ color, index }))
  const allowed = (a: number, b: number) => isTabooPair(source[a]!, source[b]!)
  for (;;) {
    let clash: [number, number] | undefined
    for (let i = 0; i < entries.length && clash === undefined; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i]!
        const b = entries[j]!
        if (isTabooPair(a.color, b.color) && !allowed(a.index, b.index)) {
          clash = [i, j]
          break
        }
      }
    }
    if (clash === undefined) break
    const [i, j] = clash
    const drop = upper(entries[j]!.color) === upper(brand) ? i : j
    entries = entries.filter((_, k) => k !== drop)
  }
  const seen = new Set<string>()
  return entries
    .map((entry) => entry.color)
    .filter((color) => {
      const key = upper(color)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

/**
 * Repaint `source` around `brand`. `face` is the source's measured face,
 * passed in by a caller that already has it, measured here otherwise.
 */
export function regenerateFromBrand(
  source: ThemeFile,
  brand: string,
  identity: { id: string; label?: string; fonts?: ThemeFile["style"]["fonts"] },
  face: BrandFace = measureBrandFace(source),
): BrandRegenResult {
  const brandHex = upper(HexTokenSchema.parse(brand))
  const src = source.style.colors
  const bg = src.bg
  const F = face.slot
  const O = otherSlot(F)
  const floorOf = (slot: BrandSlot) => (face.use[slot].bodyText > 0 ? BODY_TEXT_RATIO : MARK_RATIO)
  const need = { primary: slotNeed(src.primary, bg, floorOf("primary")), accent: slotNeed(src.accent, bg, floorOf("accent")) }
  const brandRatio = contrastRatio(brandHex, bg)
  const checks = [F, O].map((slot) => ({ slot, need: need[slot], brandRatio, bodyText: face.use[slot].bodyText > 0 }))

  // 1. Placement.
  const otherIsColor = showsAsColor(src[O], bg) && upper(src[O]) !== upper(src[F])
  let slot: BrandSlot
  let placed: string
  let route: PlacementRoute
  const brandHsl = hexToHsl(brandHex)
  const nudged = nearestReadable(brandHsl, brandHsl.l, bg, need[F])
  if (brandRatio >= need[F]) {
    slot = F
    placed = brandHex
    route = "face"
  } else if (nudged !== undefined && oklabDistance(nudged, brandHex) <= NUDGE_DISTANCE) {
    slot = F
    placed = nudged
    route = "nudged"
  } else if (otherIsColor && brandRatio >= need[O]) {
    slot = O
    placed = brandHex
    route = "other"
  } else {
    slot = F
    route = "lightness"
    const start = hexToHsl(src[F]).l
    const atFaceLightness = hslToHex({ ...brandHsl, l: start })
    const readable = contrastRatio(atFaceLightness, bg) >= need[F] ? atFaceLightness : nearestReadable(brandHsl, start, bg, need[F])
    if (readable === undefined) {
      throw new PptwiseError(
        `cannot fit brand color ${brandHex} into colors.${F}: no lightness of its hue reaches ${need[F].toFixed(1)}:1 against colors.bg (${bg})`,
      )
    }
    placed = readable
  }

  // 2. The hue step. A grey brand, or a grey slot, gives no step to take.
  const step = isChromatic(placed) && isChromatic(src[slot]) ? hueDelta(hexToHsl(src[slot]).h, hexToHsl(placed).h) : 0
  const turn = (hex: string) => {
    if (step === 0 || !showsAsColor(hex, bg)) return upper(hex)
    const hsl = hexToHsl(hex)
    return hslToHex({ ...hsl, h: hsl.h + step })
  }

  const slots: Record<BrandSlot, string> = { primary: upper(src.primary), accent: upper(src.accent) }
  slots[slot] = placed
  if (route !== "other") {
    // The other slot turns with the face. When the two were one color
    // (ember), they stay one. Route "other" keeps the face as the theme
    // painted it.
    slots[O] = upper(src[O]) === upper(src[F]) ? placed : keepReadable(turn(src[O]), bg, need[O])
  }

  /** A color the theme used: its slots map to the new slots, colors turn, greys stay. */
  const rederive = (hex: string, floor: number) => {
    if (upper(hex) === upper(src.primary)) return slots.primary
    if (upper(hex) === upper(src.accent)) return slots.accent
    const turned = turn(hex)
    if (turned === upper(hex)) return turned
    return keepReadable(turned, bg, slotNeed(hex, bg, floor))
  }

  // 3. Chart palette.
  const chartPalette = keepChartTaboo(
    src.chartPalette.map((hex) => rederive(hex, MARK_RATIO)),
    src.chartPalette,
    placed,
  )

  const colors: ThemeFile["style"]["colors"] = {
    ...src,
    primary: slots.primary,
    accent: slots.accent,
    chartPalette,
  }
  if (src.accentPool !== undefined) colors.accentPool = src.accentPool.map((hex) => rederive(hex, MARK_RATIO))
  if (src.emphasisInk !== undefined) colors.emphasisInk = rederive(src.emphasisInk, BODY_TEXT_RATIO)

  const ground = (hex: string) =>
    upper(hex) === upper(src.primary) ? slots.primary : upper(hex) === upper(src.accent) ? slots.accent : hex
  const background = (spec: BackgroundSpec): BackgroundSpec => {
    if (spec.kind === "color") return { ...spec, value: ground(spec.value) }
    if (spec.kind === "gradient") return { ...spec, from: ground(spec.from), to: ground(spec.to) }
    if (spec.overlay !== undefined) return { ...spec, overlay: { ...spec.overlay, color: ground(spec.overlay.color) } }
    return spec
  }
  const backgrounds = source.style.defaultBackgrounds

  const file = ThemeFileSchema.parse({
    ...source,
    id: identity.id,
    label: identity.label ?? source.label,
    style: {
      ...source.style,
      id: identity.id,
      colors,
      fonts: identity.fonts ?? source.style.fonts,
      defaultBackgrounds: {
        cover: background(backgrounds.cover),
        chapter: background(backgrounds.chapter),
        content: background(backgrounds.content),
        ending: background(backgrounds.ending),
      },
    },
    menu: structuredClone(source.menu),
  }) as ThemeFile
  assertContrastFloor(file.id, file.style)
  return {
    file,
    placement: { brand: brandHex, face: F, slot, color: placed, route, checks, bg, otherIsColor },
  }
}

/** The lines `theme fork --brand` and `brand extract` print about where the brand went. */
export function describePlacement(placement: BrandPlacement): string[] {
  const { brand, face, slot, color, route, checks, bg, otherIsColor } = placement
  const why = (s: BrandSlot) => {
    const c = checks.find((entry) => entry.slot === s)!
    const role = c.bodyText ? "sets body text" : "draws marks and display text"
    return `colors.${s} ${role} and needs ${c.need.toFixed(1)}:1 on bg ${bg}, the brand reads ${c.brandRatio.toFixed(2)}:1`
  }
  const other = otherSlot(face)
  if (route === "face") return [`  brand: ${brand} is colors.${slot}, the color this theme shows most`]
  if (route === "nudged") {
    return [`  brand: ${brand} is colors.${slot}, the color this theme shows most, written ${color}: a shade off so it reads, ${why(slot)}`]
  }
  if (route === "other") return [`  brand: ${brand} is colors.${slot}. colors.${face} keeps the theme's own color: ${why(face)}`]
  return [
    `  brand: ${brand} changed to ${color} for colors.${slot}: same hue and saturation, lightness moved so it reads on this theme's ground`,
    `    ${why(face)}`,
    otherIsColor ? `    ${why(other)}` : `    colors.${other} is not a color this theme shows, so it cannot take the brand`,
  ]
}
