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
 * 2. A slot that draws marks (rules, short lines, icons) takes the brand
 *    as it is when it stands off the ground as well as the theme's own
 *    color did, up to 3:1. When it does not, its lightness moves just far
 *    enough, its hue kept and its OKLCH chroma never above the brand's
 *    own. Nothing goes neon on a dark page. A chart fills bars and areas,
 *    so its series take the brand and the second color as they are.
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
import type { BackgroundSpec } from "../../ir"
import { PptwiseError } from "../../errors"
import { contrastRatio, requiredContrastRatio } from "../../render/ink"
import { assertContrastFloor } from "../definitions"
import { isTabooPair } from "../chart-taboo"
import { HexTokenSchema } from "../hex"
import { hexToOklch, oklabDistance, oklchToHex, type Oklch } from "../palette-rebase"
import { ThemeFileSchema, type ThemeFile } from "../schema"
import { isChromatic, measureBrandFace, paintedField, type BrandFace, type BrandSlot } from "./brand-face"
import { keepsName } from "./color-name"

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

/**
 * OKLab distance from the brand beyond which a field the pages work out from
 * a slot no longer reads as the brand. homeroom darkens its primary into a
 * blackboard: its own blue-grey moves 0.06, Office blue 0.05, a deep red
 * 0.07, while Berlin's orange turns brown 0.20 away.
 */
export const FIELD_DRIFT = 0.1

/** Share of a slot's painted area that must be fields of color (bars, blocks) for the slot to count as a fill rather than a mark. */
export const FILL_SHARE = 0.5

/** OKLab distance the theme's second colored slot keeps from the brand: a shade clearly lighter or darker. */
export const SHADE_STEP = 0.12

/** OKLab distance any two chart series keep, so neighbouring bars stay apart. */
export const SERIES_DISTANCE = 0.1

/** OKLCH chroma from which a chart color counts as a real color rather than a tinted ink. */
export const VIVID_CHROMA = 0.08

/** The most chroma a neutral keeps when it is re-tinted toward the brand: under `CHROMA_FLOOR`, so it is still a neutral. */
const NEUTRAL_TINT_CHROMA = 0.035

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
  /** The slot is mostly fields of color (bars, blocks) rather than marks, so it takes the color as it is. */
  fills?: boolean
  /** Its lightness was moved to reach `need` on the ground, where it read `ratio`. */
  lifted?: { need: number; ratio: number }
  /** The face kept the theme's own color, and why: this color does not read in its headings, or the pages work the face into a field that would not look like this color. */
  passedOver?: { slot: BrandSlot } & Refusal
  /** Why it has no slot. */
  noSlot?: "neutral" | "one-color" | "headings" | "repainted"
  /** The brand has no chroma (a grey, a black or a white), so the theme comes out grey: it was asked for no colored brand. */
  neutral?: true
  /** The chart series drawn in it: the color as it is, since a chart fills its bars and areas with it. Null when the chart stays one color among inks and leaves it out. */
  chart: string | null
}

/** Why a slot will not take a color. */
export type Refusal =
  | { why: "headings"; need: number; ratio: number }
  | { why: "repainted"; painted: string; distance: number }

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
 * from every color in `taken`. A shade the eye would name as another color
 * than `name` (a light red is pink, `./color-name.ts`) is never one.
 *
 * Undefined when there is none: when a shade that reads and stands apart
 * exists but only under another color's name, or when nothing reads and
 * stands apart at all. The caller then takes one of the theme's own
 * neutrals instead.
 */
function shadeOf(
  target: Oklch,
  hue: number,
  chromaCap: number,
  bg: string,
  need: number,
  taken: readonly string[],
  distance: number,
  name: string,
  reach = SERIES_LIGHTNESS_REACH,
): string | undefined {
  const C = Math.min(target.C, chromaCap)
  let renamedOnly = false
  for (const dh of NEIGHBOUR_HUES) {
    for (const dL of lightnessSteps(reach)) {
      const L = target.L + dL
      if (L < SHADE_LIGHTNESS_BAND[0] || L > SHADE_LIGHTNESS_BAND[1]) continue
      const hex = oklchToHex({ L, C, h: hue + dh })
      if (contrastRatio(hex, bg) < need) continue
      if (taken.some((t) => oklabDistance(t, hex) < distance)) continue
      if (!keepsName(hex, name)) {
        renamedOnly = true
        continue
      }
      return hex
    }
  }
  if (renamedOnly) return undefined
  // Nothing that near stands far enough apart: the readable shade anywhere
  // in the band and the neighbouring hues that stands furthest from the rest.
  let best: { hex: string; gap: number } | undefined
  for (const dh of NEIGHBOUR_HUES) {
    for (let L = SHADE_LIGHTNESS_BAND[0]; L <= SHADE_LIGHTNESS_BAND[1] + 1e-9; L += 0.02) {
      const hex = oklchToHex({ L, C, h: hue + dh })
      if (contrastRatio(hex, bg) < need || !keepsName(hex, name)) continue
      // Still the color it stands for: a shade too near black or white to hold its chroma is not.
      if (hexToOklch(hex).C < 0.6 * C || Math.abs(L - target.L) > FALLBACK_LIGHTNESS_REACH) continue
      const gap = Math.min(...taken.map((t) => oklabDistance(t, hex)))
      if (best === undefined || gap > best.gap) best = { hex, gap }
    }
  }
  return best !== undefined && best.gap >= distance ? best.hex : undefined
}

/**
 * The theme's own neutrals: the greys and inks of its chart and pool, then
 * its text and muted inks, which count even when tinted (rally's lavender
 * whites), since they are the inks the theme already writes in.
 */
function themeNeutrals(src: ThemeFile["style"]["colors"]): string[] {
  const greys = [...src.chartPalette, ...(src.accentPool ?? [])].map(upper).filter((hex) => !isChromatic(hex))
  return [...new Set([...greys, upper(src.text), upper(src.muted)])]
}

/**
 * The theme's own neutral standing in where no shade of the brand keeps its
 * name: the one nearest `target`'s lightness that reads `need` on `bg` and
 * stands `distance` from every color in `taken`, else the nearest that reads.
 */
function neutralFor(target: string, neutrals: readonly string[], bg: string, need: number, taken: readonly string[], distance: number): string {
  const L = hexToOklch(target).L
  const reads = neutrals.filter((hex) => contrastRatio(hex, bg) >= need && !taken.includes(hex))
  const byLightness = (list: string[]) => [...list].sort((a, b) => Math.abs(hexToOklch(a).L - L) - Math.abs(hexToOklch(b).L - L))
  const apart = reads.filter((hex) => taken.every((t) => oklabDistance(t, hex) >= distance))
  // Every neutral that reads is in use already: the nearest repeats, and the
  // palette comes out one shorter once repeats are dropped.
  const pick = byLightness(apart)[0] ?? byLightness(reads)[0] ?? byLightness(neutrals.filter((hex) => contrastRatio(hex, bg) >= need))[0]
  if (pick !== undefined) return pick
  throw new PptwiseError(`no neutral of the theme reads ${need.toFixed(1)}:1 on its ground (${bg})`)
}

/** What a slot does on the sample pages, as the placement rules read it. */
function slotRoles(face: BrandFace, own: Record<BrandSlot, string>, bg: string) {
  const writesHeadings = (s: BrandSlot) => face.use[s].headings > 0 && face.use[s].headings * 2 >= face.headingRuns
  return {
    writesHeadings,
    headingNeed: (s: BrandSlot) => requiredContrastRatio(face.use[s].headingPx),
    isGround: (s: BrandSlot) => face.use[s].field >= FIELD_SHARE,
    /** Mostly bars and blocks, not rules and strokes: a field of color takes the brand as it is. */
    fills: (s: BrandSlot) => face.use[s].area > 0 && face.use[s].filled / face.use[s].area >= FILL_SHARE,
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
  const neutrals = themeNeutrals(src)

  type Fitted = Pick<PlacedColor, "written" | "ground" | "fills" | "lifted">
  const refused = (f: Fitted | Refusal): f is Refusal => "why" in f
  /**
   * The value `x` is written as in slot `s`, or why `s` will not take it:
   * `s` writes headings `x` cannot, or (when `checkField`) the pages work
   * `s` into a field of the page that would not look like `x`.
   */
  const fit = (x: string, s: BrandSlot, checkField = true): Fitted | Refusal => {
    const ratio = contrastRatio(x, bg)
    let fitted: Fitted
    if (roles.writesHeadings(s)) {
      const need = roles.headingNeed(s)
      if (ratio < need) return { why: "headings", need, ratio }
      fitted = { written: x, ground: false }
    } else if (roles.isGround(s)) fitted = { written: x, ground: true }
    else if (roles.fills(s)) fitted = { written: x, ground: false, fills: true }
    else {
      const need = roles.markNeed(s)
      fitted = ratio >= need ? { written: x, ground: false } : { written: liftToContrast(x, bg, need), ground: false, lifted: { need, ratio } }
    }
    const field = face.use[s].derivedField
    if (checkField && field !== undefined && field.share >= FIELD_SHARE) {
      const painted = paintedField(source, s, fitted.written!, field)
      const distance = oklabDistance(painted, x)
      if (distance > FIELD_DRIFT) return { why: "repainted", painted, distance }
    }
    return fitted
  }

  // 1. The brand.
  let brandSlot: BrandSlot = F
  const inFace = fit(B, F)
  let brandFit: Fitted
  let passedOver: PlacedColor["passedOver"]
  if (!refused(inFace)) brandFit = inFace
  else {
    const O = otherSlot(F)
    const inOther = !oneColor && roles.isColor(O) ? fit(B, O) : undefined
    if (inOther !== undefined && !refused(inOther)) {
      brandSlot = O
      brandFit = inOther
      passedOver = { slot: F, ...inFace }
    } else if (inFace.why === "headings") {
      brandFit = { written: liftToContrast(B, bg, inFace.need), ground: false, lifted: { need: inFace.need, ratio: inFace.ratio } }
    } else {
      // Nowhere else to go: the face takes it, worked into its field as the theme works its own color.
      const kept = fit(B, F, false)
      brandFit = refused(kept) ? { written: liftToContrast(B, bg, MARK_RATIO), ground: false } : kept
    }
  }
  const slots: Record<BrandSlot, string> = { ...own }
  slots[brandSlot] = brandFit.written!
  if (oneColor) slots[otherSlot(brandSlot)] = brandFit.written!

  // 2. The second slot: the company's second color, or a shade of the brand.
  const S2 = otherSlot(brandSlot)
  // A chart drawn as one color among inks (swiss, ink, journal, memo) stays
  // so: a second color goes to the theme's marks outside the chart only.
  const oneColorChart = isSingleColorPalette(src.chartPalette.map(upper))
  let second: PlacedColor | undefined
  if (B2 !== undefined) {
    const free = !oneColor && roles.isColor(S2)
    const tried = free ? fit(B2, S2) : undefined
    const secondFit = tried !== undefined && !refused(tried) ? tried : undefined
    if (secondFit !== undefined) slots[S2] = secondFit.written!
    second = {
      color: B2,
      slot: secondFit === undefined ? null : S2,
      written: secondFit?.written ?? null,
      ground: secondFit?.ground ?? false,
      ...(secondFit?.fills ? { fills: true } : {}),
      ...(secondFit?.lifted ? { lifted: secondFit.lifted } : {}),
      ...(secondFit === undefined ? { noSlot: oneColor ? "one-color" : tried !== undefined && refused(tried) ? tried.why : "neutral" } : {}),
      chart: oneColorChart ? null : secondFit !== undefined && src.chartPalette.map(upper).includes(own[S2]) ? secondFit.written! : B2,
    } as PlacedColor
  } else if (brandSlot === F && !oneColor && roles.isColor(S2)) {
    const need = roles.shadeNeed(S2)
    slots[S2] =
      shadeOf(hexToOklch(own[S2]), brandHue.h, brandHue.C, bg, need, [slots[F]], SHADE_STEP, B, SLOT_LIGHTNESS_REACH) ??
      neutralFor(own[S2], neutrals, bg, need, [slots[F]], SHADE_STEP)
  }
  const repainted = (hex: string): string | undefined => {
    const key = upper(hex)
    for (const s of ["primary", "accent"] as const) if (key === own[s] && slots[s] !== own[s]) return slots[s]
    return undefined
  }
  // What the chart takes for a slot's own color: the second color stays out of a one-color chart.
  const chartRepainted = (hex: string): string | undefined =>
    second?.slot && second.chart === null && upper(hex) === own[second.slot] ? undefined : repainted(hex)

  // 3. The chart.
  // Bars, areas, and slices are fields of color: the chart fills them with
  // the brand as it is, and a value set on one takes an ink that reads on it.
  // Where the chart's entry is the slot's own color it stays the slot's
  // value exactly, so a face that keeps that slot out of its charts
  // (`paletteWithoutAccent`, `paletteAfterMark`) still finds it.
  const ownPalette = new Set(src.chartPalette.map(upper))
  const chartBrand = ownPalette.has(own[brandSlot]) ? slots[brandSlot] : B
  const shade = (hex: string, taken: readonly string[]) => {
    const need = Math.min(MARK_RATIO, contrastRatio(hex, bg))
    return shadeOf(hexToOklch(hex), brandHue.h, brandHue.C, bg, need, taken, SERIES_DISTANCE, B) ?? neutralFor(hex, neutrals, bg, need, taken, SERIES_DISTANCE)
  }
  // A neutral re-tinted in the brand's hue stays a neutral: its chroma is held under the floor a color starts at.
  const tint = (hex: string) => {
    const c = hexToOklch(hex)
    return oklchToHex({ ...c, C: Math.min(c.C, NEUTRAL_TINT_CHROMA), h: brandHue.h })
  }
  const chartPalette = deriveSeries(src.chartPalette.map(upper), {
    lead: chartBrand,
    second: second?.chart ?? undefined,
    slotEntries: { [own[brandSlot]]: chartBrand, ...(second?.slot && second.chart !== null ? { [own[second.slot]]: second.chart } : {}) },
    repainted: chartRepainted,
    shade,
    tint,
    bg,
    neutrals,
  })

  const out: ThemeFile["style"]["colors"] = { ...src, primary: slots.primary, accent: slots.accent, chartPalette }
  if (src.accentPool !== undefined) {
    out.accentPool = deriveSeries(src.accentPool.map(upper), {
      lead: chartBrand,
      second: second?.chart ?? undefined,
      slotEntries: {},
      repainted: chartRepainted,
      shade,
      tint,
      bg,
      neutrals,
      keepOrder: true,
    })
  }
  if (src.emphasisInk !== undefined) {
    const e = upper(src.emphasisInk)
    const base =
      repainted(e) ??
      (e !== own.primary && e !== own.accent && isChromatic(e)
        ? shadeOf(hexToOklch(e), brandHue.h, brandHue.C, bg, 0, [], 0, B)
        : undefined)
    const ink = base === undefined ? e : liftToContrast(base, bg, BODY_TEXT_RATIO)
    // Lifted to read as body text, the brand or a shade of it can cross into
    // another color's name (Berlin's orange turns brown): marked words then
    // keep the theme's own ink, as headings do when the brand does not read.
    out.emphasisInk = ink === e || keepsName(ink, B) ? ink : e
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
        ...(brandFit.fills ? { fills: true } : {}),
        ...(brandFit.lifted ? { lifted: brandFit.lifted } : {}),
        ...(passedOver ? { passedOver } : {}),
        ...(isChromatic(B) ? {} : { neutral: true as const }),
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
    /** The theme's own neutrals, which may stand in for a shade. */
    neutrals: readonly string[]
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
    return dedupe(keepTaboo(separateNeutrals(out, palette, opts.bg), [...palette, ...opts.neutrals], opts))
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
  return dedupe(keepTaboo(separateNeutrals([...out, ...neutrals], palette, opts.bg), [...palette, ...opts.neutrals], opts))
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
 * brand's hue at its own lightness and chroma, so it stays a neutral. The
 * theme's text and muted inks standing in for a shade are such neutrals too
 * (crayon's navy text beside an orange brand). A
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

/**
 * The lines `theme fork --brand` and `brand extract` print about where the
 * colors went. `brandSource` names where the brand color came from, for the
 * line that says a brand with no color in it repaints the theme in grey.
 */
export function describePlacement(placement: BrandPlacement, brandSource = "the brand color"): string[] {
  const { bg } = placement
  const describe = (label: string, p: PlacedColor): string[] => {
    const lines: string[] = []
    if (p.slot === null) {
      const why =
        p.noSlot === "one-color"
          ? "this theme paints primary and accent as one color"
          : p.noSlot === "headings"
            ? "the free slot writes the headings and the color does not read there"
            : p.noSlot === "repainted"
              ? "the pages work the free slot into a field that would not look like it"
              : "the theme's other slot is an ink, not a color"
      lines.push(
        p.chart === null
          ? `  ${label}: ${p.color} is not used: ${why}, and this theme keeps its charts one color among inks`
          : `  ${label}: ${p.color} is the chart's second series only: ${why}`,
      )
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
        o.why === "headings"
          ? `    colors.${o.slot} keeps the theme's own color: it writes the headings, which need ${o.need.toFixed(1)}:1 on bg ${bg}, and ${p.color} reads ${o.ratio.toFixed(2)}:1`
          : `    colors.${o.slot} keeps the theme's own color: the pages work it into a larger field, which would come out ${o.painted} for ${p.color} (${o.distance.toFixed(2)} away in OKLab), no longer the brand`,
      )
    }
    if (p.ground && p.slot !== null) {
      lines.push(`    colors.${p.slot} fills whole pages here, and the words on it take an ink that reads on ${p.color}`)
    }
    if (p.slot !== null && p.chart === null) {
      lines.push(`    the charts leave it out: this theme keeps them one color among inks`)
    }
    if (p.fills && p.slot !== null) {
      lines.push(`    colors.${p.slot} is mostly bars and blocks here, so it keeps ${p.color} as it is, and the words on it take an ink that reads on it`)
    }
    return lines
  }
  const neutral = placement.brand.neutral
    ? [`  ${brandSource} ${placement.brand.color} has no color in it (a grey, a black or a white), so the theme is repainted in grey`]
    : []
  return [...neutral, ...describe("brand", placement.brand), ...(placement.second ? describe("second", placement.second) : [])]
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
