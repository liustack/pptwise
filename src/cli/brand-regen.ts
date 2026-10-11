/**
 * A theme repainted around a brand color: `pptwise theme fork --brand` and
 * `pptwise brand extract`. A second color, the company's own pairing, may
 * come with it.
 *
 * The theme stays the theme. Its ground, text, surface, and everything
 * derived from them (panel, border, card stroke, muted, status colors) are
 * kept as they are. Only its colored tokens move, by three rules.
 *
 * 1. The brand goes in as it is, and the words around it change ink. The
 *    brand takes the slot the theme shows most (its face, measured in
 *    `./brand-face.ts`). A slot that fills a page as a ground takes it
 *    unchanged: the layouts set the words on it in an ink that reads on it.
 *    A slot that writes the deck's headings takes the brand only when the
 *    headings still read in it at their size (`requiredContrastRatio`).
 *    When they would not, that slot keeps the theme's own color and the
 *    brand goes to the theme's other colored slot, the rules and marks.
 * 2. A slot that draws marks takes the brand as it is when it stands off
 *    the ground as well as the theme's own color did, up to 3:1. When it
 *    does not, its lightness moves just far enough, its hue kept and its
 *    OKLCH chroma never above the brand's own. The chart's brand series
 *    is held to 3:1 the same way. Nothing goes neon on a dark page.
 * 3. Every other colored token is drawn from the brand, not turned by a
 *    hue step: the theme's own lightness and chroma for that token (chroma
 *    no higher than the brand's), the brand's hue, and a neighbouring hue
 *    within 30 degrees only when one hue cannot give enough distinct
 *    shades. The chart leads with the brand, then its shades, then the
 *    theme's neutrals. A chart that is one color among inks and greys
 *    (swiss, ink, journal, memo) stays that way. A color from outside the
 *    brand's family appears only when the company names its second color,
 *    which takes the theme's second colored slot and the chart's second
 *    series under the same rules.
 */
import type { BackgroundSpec } from "../ir"
import { PptwiseError } from "../errors"
import { contrastRatio, requiredContrastRatio } from "../render/ink"
import { assertContrastFloor } from "../themes/definitions"
import { isTabooPair } from "../themes/chart-taboo"
import { HexTokenSchema } from "../themes/hex"
import { hexToOklch, oklabDistance, oklchToHex, type Oklch } from "../themes/palette-rebase"
import { ThemeFileSchema, type ThemeFile } from "../themes/schema"
import { isChromatic, measureBrandFace, type BrandFace, type BrandSlot } from "./brand-face"

/** Contrast a slot that sets body-size words needs against the ground. */
export const BODY_TEXT_RATIO = 4.5
/** Contrast a mark, a chart series, or display-size words need. */
export const MARK_RATIO = 3

/**
 * OKLab distance from the ground below which a color is part of the ground:
 * a panel or a shade of the page, not a color the page shows. rally's plum
 * primary sits 0.03 from its plum page, terminal's navy 0.12 from its
 * console black. brief's yellow, the faintest slot that does show, sits 0.21
 * from its paper.
 */
export const GROUND_DISTANCE = 0.15

/** Share of the page one rectangle of a slot must fill for the slot to count as a ground. */
export const FIELD_SHARE = 0.5

/** OKLab distance the theme's second colored slot keeps from the brand: a shade clearly lighter or darker. */
export const SHADE_STEP = 0.12

/** OKLab distance any two chart series keep, so neighbouring bars stay apart. */
export const SERIES_DISTANCE = 0.1

/** OKLCH chroma from which a chart color counts as a real color rather than a tinted ink. */
export const VIVID_CHROMA = 0.08

/** Hue offsets tried for a shade, in order: the brand's own hue, then neighbours. 25 at most, so rounding to a hex never carries one past 30. */
const NEIGHBOUR_HUES = [0, 12, -12, 25, -25] as const

/** Lightness moves tried for a shade, nearest first, up to `reach` either way. */
function lightnessSteps(reach: number): number[] {
  const steps = [0]
  for (let d = 0.04; d <= reach + 1e-9; d += 0.04) steps.push(d, -d)
  return steps
}
/** A chart series moves this far in lightness at most before a neighbouring hue is tried. */
const SERIES_LIGHTNESS_REACH = 0.12
/** The second slot may move further: it is one color, and a hue of its own would read as a new color. */
const SLOT_LIGHTNESS_REACH = 0.32
/** How far from the theme's own lightness a shade may go when nothing nearer stands apart. */
const FALLBACK_LIGHTNESS_REACH = 0.3
/** Shades stay inside this lightness band, so none turns into a near-white or a near-black. */
const SHADE_LIGHTNESS_BAND = [0.15, 0.92] as const

export interface BrandColors {
  /** The brand color. */
  brand: string
  /** The company's own second color, when it has one. */
  second?: string
}

/** Where one asked-for color ended up. */
export interface PlacedColor {
  /** The color asked for. */
  color: string
  /** The slot it was written into, or null when it is in the chart only. */
  slot: BrandSlot | null
  /** What was written into the slot: the color itself unless `lifted` says otherwise. */
  written: string | null
  /** The slot fills a page as a ground, and words set on it take an ink that reads on it. */
  ground: boolean
  /** Its lightness was moved to reach `need` on the ground, where it read `ratio`. */
  lifted?: { need: number; ratio: number }
  /** A slot that writes the headings kept the theme's own color because this one does not read there. */
  passedOver?: { slot: BrandSlot; need: number; ratio: number }
  /** Why it has no slot. */
  noSlot?: "neutral" | "one-color" | "headings"
  /** The chart series drawn in it. */
  chart: string
}

export interface BrandPlacement {
  /** The theme's ground every ratio is measured against. */
  bg: string
  /** The theme's measured face. */
  face: BrandSlot
  brand: PlacedColor
  second?: PlacedColor
}

export interface BrandRegenResult {
  file: ThemeFile
  placement: BrandPlacement
}

const upper = (hex: string) => hex.toUpperCase()

function otherSlot(slot: BrandSlot): BrandSlot {
  return slot === "primary" ? "accent" : "primary"
}

/** A color the page shows: it has chroma and it stands off the ground. */
function showsAsColor(hex: string, bg: string): boolean {
  return isChromatic(hex) && oklabDistance(hex, bg) >= GROUND_DISTANCE
}

/**
 * `color` when it reaches `need` on `bg`, else the same hue at the nearest
 * lightness that does, lighter on a dark ground and darker on a light one.
 * Chroma never rises: gamut mapping only lowers it.
 */
export function liftToContrast(color: string, bg: string, need: number): string {
  if (contrastRatio(color, bg) >= need) return upper(color)
  const c = hexToOklch(color)
  const lighter = contrastRatio("#FFFFFF", bg) > contrastRatio("#000000", bg)
  for (let step = 1; step <= 1000; step++) {
    const L = c.L + (lighter ? step : -step) / 1000
    if (L < 0 || L > 1) break
    const hex = oklchToHex({ L, C: c.C, h: c.h })
    if (contrastRatio(hex, bg) >= need) return hex
  }
  throw new PptwiseError(
    `cannot fit ${upper(color)} onto the theme's ground (${bg}): no lightness of its hue reaches ${need.toFixed(1)}:1`,
  )
}

/**
 * A shade of the brand standing in for one of the theme's colors: that
 * color's lightness and chroma (chroma no higher than `chromaCap`), the
 * brand's hue. Lightness moves, then the hue moves to a neighbour within 30
 * degrees, until the shade reads `need` on `bg` and stands `distance` away
 * from every color in `taken`.
 */
function shadeOf(
  target: Oklch,
  hue: number,
  chromaCap: number,
  bg: string,
  need: number,
  taken: readonly string[],
  distance: number,
  reach = SERIES_LIGHTNESS_REACH,
): string {
  const C = Math.min(target.C, chromaCap)
  for (const dh of NEIGHBOUR_HUES) {
    for (const dL of lightnessSteps(reach)) {
      const L = target.L + dL
      if (L < SHADE_LIGHTNESS_BAND[0] || L > SHADE_LIGHTNESS_BAND[1]) continue
      const hex = oklchToHex({ L, C, h: hue + dh })
      if (contrastRatio(hex, bg) < need) continue
      if (taken.some((t) => oklabDistance(t, hex) < distance)) continue
      return hex
    }
  }
  // Nothing that near stands far enough apart: the readable shade anywhere
  // in the band and the neighbouring hues that stands furthest from the rest.
  let best: { hex: string; gap: number } | undefined
  for (const dh of NEIGHBOUR_HUES) {
    for (let L = SHADE_LIGHTNESS_BAND[0]; L <= SHADE_LIGHTNESS_BAND[1] + 1e-9; L += 0.02) {
      const hex = oklchToHex({ L, C, h: hue + dh })
      if (contrastRatio(hex, bg) < need) continue
      // Still the color it stands for: a shade too near black or white to hold its chroma is not.
      if (hexToOklch(hex).C < 0.6 * C || Math.abs(L - target.L) > FALLBACK_LIGHTNESS_REACH) continue
      const gap = Math.min(...taken.map((t) => oklabDistance(t, hex)))
      if (best === undefined || gap > best.gap) best = { hex, gap }
    }
  }
  return best?.hex ?? liftToContrast(oklchToHex({ L: target.L, C, h: hue }), bg, need)
}

/** What a slot does on the sample pages, as the placement rules read it. */
function slotRoles(face: BrandFace, own: Record<BrandSlot, string>, bg: string) {
  const writesHeadings = (s: BrandSlot) => face.use[s].headings > 0 && face.use[s].headings * 2 >= face.headingRuns
  return {
    writesHeadings,
    headingNeed: (s: BrandSlot) => requiredContrastRatio(face.use[s].headingPx),
    isGround: (s: BrandSlot) => face.use[s].field >= FIELD_SHARE,
    /** Marks need 3:1, never more than the theme's own color had. */
    markNeed: (s: BrandSlot) => Math.min(MARK_RATIO, contrastRatio(own[s], bg)),
    /** A derived color in the slot: body contrast when it sets body words, never more than the theme's own had. */
    shadeNeed: (s: BrandSlot) => Math.min(face.use[s].bodyText > 0 ? BODY_TEXT_RATIO : MARK_RATIO, contrastRatio(own[s], bg)),
    isColor: (s: BrandSlot) => showsAsColor(own[s], bg),
  }
}

/**
 * Repaint `source` around `colors.brand` (and `colors.second`). `face` is
 * the source's measured face, passed in by a caller that already has it,
 * measured here otherwise.
 */
export function regenerateFromBrand(
  source: ThemeFile,
  colors: BrandColors,
  identity: { id: string; label?: string; fonts?: ThemeFile["style"]["fonts"] },
  face: BrandFace = measureBrandFace(source),
): BrandRegenResult {
  const B = upper(HexTokenSchema.parse(colors.brand))
  const B2 = colors.second === undefined ? undefined : upper(HexTokenSchema.parse(colors.second))
  const src = source.style.colors
  const bg = src.bg
  const F = face.slot
  const own: Record<BrandSlot, string> = { primary: upper(src.primary), accent: upper(src.accent) }
  const oneColor = own.primary === own.accent
  const roles = slotRoles(face, own, bg)
  const brandHue = hexToOklch(B)

  /** The value `x` is written as in slot `s`, or undefined when `s` writes headings `x` cannot. */
  const fit = (x: string, s: BrandSlot): Pick<PlacedColor, "written" | "ground" | "lifted"> | undefined => {
    const ratio = contrastRatio(x, bg)
    if (roles.writesHeadings(s)) return ratio >= roles.headingNeed(s) ? { written: x, ground: false } : undefined
    if (roles.isGround(s)) return { written: x, ground: true }
    const need = roles.markNeed(s)
    if (ratio >= need) return { written: x, ground: false }
    return { written: liftToContrast(x, bg, need), ground: false, lifted: { need, ratio } }
  }

  // 1. The brand.
  let brandSlot: BrandSlot = F
  let brandFit = fit(B, F)
  let passedOver: PlacedColor["passedOver"]
  if (brandFit === undefined) {
    const O = otherSlot(F)
    const inOther = !oneColor && roles.isColor(O) ? fit(B, O) : undefined
    if (inOther !== undefined) {
      brandSlot = O
      brandFit = inOther
      passedOver = { slot: F, need: roles.headingNeed(F), ratio: contrastRatio(B, bg) }
    } else {
      const need = roles.headingNeed(F)
      brandFit = { written: liftToContrast(B, bg, need), ground: false, lifted: { need, ratio: contrastRatio(B, bg) } }
    }
  }
  const slots: Record<BrandSlot, string> = { ...own }
  slots[brandSlot] = brandFit.written!
  if (oneColor) slots[otherSlot(brandSlot)] = brandFit.written!

  // 2. The second slot: the company's second color, or a shade of the brand.
  const S2 = otherSlot(brandSlot)
  let second: PlacedColor | undefined
  if (B2 !== undefined) {
    const free = !oneColor && roles.isColor(S2)
    const secondFit = free ? fit(B2, S2) : undefined
    if (secondFit !== undefined) slots[S2] = secondFit.written!
    second = {
      color: B2,
      slot: secondFit === undefined ? null : S2,
      written: secondFit?.written ?? null,
      ground: secondFit?.ground ?? false,
      ...(secondFit?.lifted ? { lifted: secondFit.lifted } : {}),
      ...(secondFit === undefined ? { noSlot: oneColor ? "one-color" : free ? "headings" : "neutral" } : {}),
      chart: liftToContrast(B2, bg, MARK_RATIO),
    } as PlacedColor
  } else if (brandSlot === F && !oneColor && roles.isColor(S2)) {
    slots[S2] = shadeOf(hexToOklch(own[S2]), brandHue.h, brandHue.C, bg, roles.shadeNeed(S2), [slots[F]], SHADE_STEP, SLOT_LIGHTNESS_REACH)
  }
  const repainted = (hex: string): string | undefined => {
    const key = upper(hex)
    for (const s of ["primary", "accent"] as const) if (key === own[s] && slots[s] !== own[s]) return slots[s]
    return undefined
  }

  // 3. The chart.
  const chartBrand = liftToContrast(B, bg, MARK_RATIO)
  const shade = (hex: string, taken: readonly string[]) =>
    shadeOf(hexToOklch(hex), brandHue.h, brandHue.C, bg, Math.min(MARK_RATIO, contrastRatio(hex, bg)), taken, SERIES_DISTANCE)
  const tint = (hex: string) => oklchToHex({ ...hexToOklch(hex), h: brandHue.h })
  const chartPalette = deriveSeries(src.chartPalette.map(upper), {
    lead: chartBrand,
    second: second?.chart,
    slotEntries: { [own[brandSlot]]: chartBrand, ...(second?.slot ? { [own[second.slot]]: second.chart } : {}) },
    repainted,
    shade,
    tint,
    bg,
  })

  const out: ThemeFile["style"]["colors"] = { ...src, primary: slots.primary, accent: slots.accent, chartPalette }
  if (src.accentPool !== undefined) {
    out.accentPool = deriveSeries(src.accentPool.map(upper), {
      lead: chartBrand,
      second: second?.chart,
      slotEntries: {},
      repainted,
      shade,
      tint,
      bg,
      keepOrder: true,
    })
  }
  if (src.emphasisInk !== undefined) {
    const e = upper(src.emphasisInk)
    const base =
      repainted(e) ??
      (e !== own.primary && e !== own.accent && isChromatic(e)
        ? shadeOf(hexToOklch(e), brandHue.h, brandHue.C, bg, 0, [], 0)
        : undefined)
    out.emphasisInk = base === undefined ? e : liftToContrast(base, bg, BODY_TEXT_RATIO)
  }

  const ground = (hex: string) => repainted(hex) ?? hex
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
      colors: out,
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
    placement: {
      bg,
      face: F,
      brand: {
        color: B,
        slot: brandSlot,
        written: brandFit.written,
        ground: brandFit.ground,
        ...(brandFit.lifted ? { lifted: brandFit.lifted } : {}),
        ...(passedOver ? { passedOver } : {}),
        chart: chartBrand,
      },
      ...(second ? { second } : {}),
    },
  }
}

/**
 * Whether a palette is one color among inks and greys: at most one real
 * color in it, and at least one entry with no chroma. swiss, ink, journal,
 * memo, ledger, luxe, runway, and stage draw their charts this way.
 */
export function isSingleColorPalette(palette: readonly string[]): boolean {
  return palette.filter((hex) => hexToOklch(hex).C >= VIVID_CHROMA).length <= 1 && palette.some((hex) => !isChromatic(hex))
}

/**
 * A chart palette (or a cycling pool) drawn from the brand. A single-color
 * palette keeps its order and its neutrals: its colored positions take the
 * brand (where the theme's slot color stood) and shades of it. Any other
 * palette leads with the brand, then the second color, then shades of the
 * brand for the theme's other colors, then the theme's neutrals. A pool
 * keeps its order either way, so its sections keep their places.
 */
function deriveSeries(
  palette: readonly string[],
  opts: {
    lead: string
    second?: string
    /** Source entries that were a slot color the brand or the second color took, and what they become. */
    slotEntries: Record<string, string>
    repainted: (hex: string) => string | undefined
    shade: (hex: string, taken: readonly string[]) => string
    keepOrder?: boolean
    /** The same lightness and chroma in the brand's hue. */
    tint: (hex: string) => string
    bg: string
  },
): string[] {
  const neutral = (hex: string) => !isChromatic(hex)
  if (opts.keepOrder || isSingleColorPalette(palette)) {
    const fixed: (string | null)[] = palette.map((hex) => opts.slotEntries[hex] ?? opts.repainted(hex) ?? (neutral(hex) ? hex : null))
    const pending = [opts.lead, ...(opts.second ? [opts.second] : [])].filter((c) => !fixed.includes(c))
    const out: string[] = []
    for (let i = 0; i < palette.length; i++) {
      const value = fixed[i] ?? pending.shift() ?? opts.shade(palette[i]!, [...out, ...fixed.slice(i + 1).filter((v): v is string => v !== null)])
      out.push(value)
    }
    // A lead with no colored position left to take stands right after the brand.
    for (const lead of pending) {
      const at = out.indexOf(opts.lead)
      out.splice(at < 0 ? 0 : at + 1, 0, lead)
    }
    return dedupe(keepTaboo(separateNeutrals(out, palette, opts.bg), palette, opts))
  }
  const leads = [opts.lead, ...(opts.second ? [opts.second] : [])]
  const out = [...leads]
  const neutrals = palette.filter(neutral)
  // The theme colors the leads stand in for: the slot entries they took,
  // else the first colors still free, so the palette keeps its length.
  const replaced = new Set(palette.filter((hex) => opts.slotEntries[hex] !== undefined))
  for (const lead of leads) {
    if (palette.some((hex) => opts.slotEntries[hex] === lead)) continue
    const free = palette.find((hex) => !neutral(hex) && !replaced.has(hex))
    if (free !== undefined) replaced.add(free)
  }
  for (const hex of palette) {
    if (neutral(hex) || replaced.has(hex)) continue
    const repainted = opts.repainted(hex)
    const taken = [...out, ...neutrals]
    out.push(repainted !== undefined && taken.every((t) => oklabDistance(t, repainted) >= SERIES_DISTANCE) ? repainted : opts.shade(hex, taken))
  }
  return dedupe(keepTaboo(separateNeutrals([...out, ...neutrals], palette, opts.bg), palette, opts))
}

/**
 * A neutral the theme keeps (an ink, a slate) moves its lightness, its hue
 * and chroma kept, when a brand color landed too close to it to tell the
 * two series apart: ledger's slate beside a deep blue brand.
 */
function separateNeutrals(colors: string[], source: readonly string[], bg: string): string[] {
  const out = [...colors]
  for (let i = 0; i < out.length; i++) {
    const hex = out[i]!
    if (!source.includes(hex) || isChromatic(hex)) continue
    const others = () => out.filter((_, k) => k !== i && !source.includes(out[k]!))
    if (others().every((other) => oklabDistance(other, hex) >= SERIES_DISTANCE)) continue
    const c = hexToOklch(hex)
    const need = Math.min(MARK_RATIO, contrastRatio(hex, bg))
    for (const dL of lightnessSteps(SLOT_LIGHTNESS_REACH).slice(1)) {
      const moved = oklchToHex({ ...c, L: c.L + dL })
      if (contrastRatio(moved, bg) < need) continue
      if (out.some((other, k) => k !== i && oklabDistance(other, moved) < SERIES_DISTANCE)) continue
      out[i] = moved
      break
    }
  }
  return out
}

/**
 * The blue-with-orange ban (`../themes/chart-taboo.ts`). Colors drawn from
 * one brand cannot break it among themselves, but a neutral the theme keeps
 * can read as orange by the ban's measure beside a blue brand (luxe's cream
 * is a pale, warm grey at HSL saturation 0.45). Such a neutral takes the
 * brand's hue at its own lightness and chroma, so it stays a neutral. A
 * company that names both a blue and an orange has paired them itself, and
 * its palette is left as it chose.
 */
function keepTaboo(colors: string[], source: readonly string[], opts: { second?: string; tint: (hex: string) => string }): string[] {
  if (opts.second !== undefined) return colors
  return colors.map((hex) =>
    source.includes(hex) && colors.some((other) => other !== hex && isTabooPair(hex, other)) ? opts.tint(hex) : hex,
  )
}

function dedupe(colors: readonly string[]): string[] {
  return [...new Set(colors.map(upper))]
}

/** The lines `theme fork --brand` and `brand extract` print about where the colors went. */
export function describePlacement(placement: BrandPlacement): string[] {
  const { bg } = placement
  const describe = (label: string, p: PlacedColor): string[] => {
    const lines: string[] = []
    if (p.slot === null) {
      const why =
        p.noSlot === "one-color"
          ? "this theme paints primary and accent as one color"
          : p.noSlot === "headings"
            ? "the free slot writes the headings and the color does not read there"
            : "the theme's other slot is an ink, not a color"
      lines.push(`  ${label}: ${p.color} is the chart's second series only: ${why}`)
    } else if (p.lifted !== undefined) {
      lines.push(
        `  ${label}: ${p.color} changed to ${p.written} for colors.${p.slot}: same hue, chroma no higher, lightness moved to reach ${p.lifted.need.toFixed(1)}:1 on bg ${bg} (it read ${p.lifted.ratio.toFixed(2)}:1)`,
      )
    } else {
      lines.push(`  ${label}: ${p.color} is colors.${p.slot}${label === "brand" && p.passedOver === undefined ? ", the color this theme shows most" : ""}`)
    }
    if (p.passedOver !== undefined) {
      const o = p.passedOver
      lines.push(
        `    colors.${o.slot} keeps the theme's own color: it writes the headings, which need ${o.need.toFixed(1)}:1 on bg ${bg}, and ${p.color} reads ${o.ratio.toFixed(2)}:1`,
      )
    }
    if (p.ground && p.slot !== null) {
      lines.push(`    colors.${p.slot} fills whole pages here, and the words on it take an ink that reads on ${p.color}`)
    }
    if (p.chart !== p.color && p.chart !== p.written) {
      lines.push(`    the chart draws it ${p.chart}, lightness moved to reach ${MARK_RATIO.toFixed(1)}:1 on bg ${bg}`)
    }
    return lines
  }
  return [...describe("brand", placement.brand), ...(placement.second ? describe("second", placement.second) : [])]
}

/**
 * `--brand`'s value: one hex, or the brand and the company's second color
 * joined by a comma (`#156082,#E97132`).
 */
export function parseBrandOption(value: string): BrandColors {
  const parts = value.split(",").map((part) => part.trim())
  const check = (part: string | undefined) => {
    const parsed = part === undefined ? undefined : HexTokenSchema.safeParse(part)
    if (!parsed?.success) {
      throw new PptwiseError(`--brand takes a hex color, or two joined by a comma (#156082,#E97132), not "${value}"`)
    }
    return upper(parsed.data)
  }
  if (parts.length > 2) throw new PptwiseError(`--brand takes at most two colors, the brand and its second color, not "${value}"`)
  return parts.length === 2 ? { brand: check(parts[0]), second: check(parts[1]) } : { brand: check(parts[0]) }
}
