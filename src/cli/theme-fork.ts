import type { BackgroundSpec } from "../ir"
import { PptwiseError } from "../errors"
import { contrastRatio } from "../render/ink"
import { assertContrastFloor } from "../themes/definitions"
import { deriveMuted, deriveMutedUnchecked } from "../themes/extract/brand-extract"
import { HexTokenSchema, ThemeFileSchema, type ThemeFile } from "../themes/schema"

export interface ForkThemeAnchors {
  primary: string
  accent?: string
  bg?: string
  text?: string
  surface?: string
  chartPalette?: string[]
}

export interface ForkThemeIdentity {
  id: string
  label?: string
  fonts?: ThemeFile["style"]["fonts"]
}

interface Hsl {
  h: number
  s: number
  l: number
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value))
}

function hexToRgb(hex: string): [number, number, number] {
  const canonical = HexTokenSchema.parse(hex)
  const n = Number.parseInt(canonical.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

function hexToHsl(hex: string): Hsl {
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

function hslToHex({ h, s, l }: Hsl): string {
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

function hueDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180
}

function rebaseRelativeColor(
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
  const offset = source.s > 0.02 && value.s > 0.02
    ? hueDelta(source.h, value.h)
    : 0
  const hue = target.s > 0.02 ? target.h + offset : value.h
  const saturation = clamp(target.s + value.s - source.s)
  return hslToHex({ h: hue, s: saturation, l: lightness })
}

type AnchorRole = "bg" | "surface" | "text" | "primary" | "accent"
type SlideBackgroundRole = "cover" | "chapter" | "content" | "ending"
type FiveAnchors = Record<AnchorRole, string>

const ORDINARY_BACKGROUND_ANCHORS: readonly AnchorRole[] = ["bg", "surface", "primary", "accent", "text"]
const CHAPTER_BACKGROUND_ANCHORS: readonly AnchorRole[] = ["primary", "bg", "surface", "accent", "text"]

function rgbDistance(a: string, b: string): number {
  const [ar, ag, ab] = hexToRgb(a)
  const [br, bg, bb] = hexToRgb(b)
  return Math.hypot(ar - br, ag - bg, ab - bb)
}

function resolveBackgroundAnchor(
  color: string,
  slideRole: SlideBackgroundRole,
  source: FiveAnchors,
): AnchorRole {
  const roles = slideRole === "chapter" ? CHAPTER_BACKGROUND_ANCHORS : ORDINARY_BACKGROUND_ANCHORS
  let best = roles[0]!
  let bestDistance = rgbDistance(color, source[best])
  for (const role of roles.slice(1)) {
    const distance = rgbDistance(color, source[role])
    if (distance < bestDistance) {
      best = role
      bestDistance = distance
    }
  }
  return best
}

function deriveBackgroundColor(
  color: string,
  slideRole: SlideBackgroundRole,
  source: FiveAnchors,
  target: FiveAnchors,
): string {
  const role = resolveBackgroundAnchor(color, slideRole, source)
  return rebaseRelativeColor(color, source[role], target[role], source.text, target.text)
}

function deriveBackground(
  spec: BackgroundSpec,
  slideRole: SlideBackgroundRole,
  source: FiveAnchors,
  target: FiveAnchors,
): BackgroundSpec {
  if (spec.kind === "color") {
    return { ...spec, value: deriveBackgroundColor(spec.value, slideRole, source, target) }
  }
  if (spec.kind === "gradient") {
    return {
      ...spec,
      from: deriveBackgroundColor(spec.from, slideRole, source, target),
      to: deriveBackgroundColor(spec.to, slideRole, source, target),
    }
  }
  if (spec.overlay !== undefined) {
    return {
      ...spec,
      overlay: {
        ...spec.overlay,
        color: deriveBackgroundColor(spec.overlay.color, slideRole, source, target),
      },
    }
  }
  return spec
}

function rotatePaletteColor(color: string, sourceAnchor: string, targetAnchor: string): string {
  const value = hexToHsl(color)
  const source = hexToHsl(sourceAnchor)
  const target = hexToHsl(targetAnchor)
  if (value.s <= 0.02 || source.s <= 0.02 || target.s <= 0.02) {
    return hslToHex(value)
  }
  return hslToHex({ ...value, h: value.h + hueDelta(source.h, target.h) })
}

function derivePaletteSequence(
  sequence: readonly string[],
  sourceAnchor: string,
  targetAnchor: string,
): string[] {
  return [
    HexTokenSchema.parse(targetAnchor),
    ...sequence.slice(1).map((color) => rotatePaletteColor(color, sourceAnchor, targetAnchor)),
  ]
}

const STATUS_CONTRAST_RATIO = 4.5
const STATUS_LIGHTNESS_STEPS = 1000

function calibrateStatusColor(
  role: "danger" | "warning" | "success",
  color: string,
  bg: string,
  surface: string,
  unchecked: boolean,
): string {
  const source = hexToHsl(color)
  const original = hslToHex(source)
  const clearsFloor = (candidate: string) =>
    contrastRatio(candidate, bg) >= STATUS_CONTRAST_RATIO
    && contrastRatio(candidate, surface) >= STATUS_CONTRAST_RATIO
  if (clearsFloor(original)) return original

  let best: { color: string; distance: number } | undefined
  for (let step = 0; step <= STATUS_LIGHTNESS_STEPS; step++) {
    const lightness = step / STATUS_LIGHTNESS_STEPS
    const candidate = hslToHex({ ...source, l: lightness })
    if (!clearsFloor(candidate)) continue
    const distance = Math.abs(lightness - source.l)
    if (best === undefined || distance < best.distance) best = { color: candidate, distance }
  }
  if (best !== undefined) return best.color
  if (unchecked) return original
  throw new PptwiseError(
    `cannot calibrate colors.${role} to a ${STATUS_CONTRAST_RATIO.toFixed(1)}:1 contrast ratio against both colors.bg (${bg}) and colors.surface (${surface}) while preserving its hue`,
  )
}

function buildForkedTheme(
  source: ThemeFile,
  anchors: ForkThemeAnchors,
  identity: ForkThemeIdentity,
  unchecked: boolean,
): ThemeFile {
  const bg = HexTokenSchema.parse(anchors.bg ?? source.style.colors.bg)
  const primary = HexTokenSchema.parse(anchors.primary)
  const accent = HexTokenSchema.parse(anchors.accent ?? source.style.colors.accent)
  const text = HexTokenSchema.parse(anchors.text ?? source.style.colors.text)
  const surface = HexTokenSchema.parse(anchors.surface ?? source.style.colors.surface)
  const muted = unchecked
    ? deriveMutedUnchecked(text, bg, surface)
    : deriveMuted(text, bg, surface)

  const sourceColors = source.style.colors
  const sourceAnchors: FiveAnchors = {
    bg: sourceColors.bg,
    surface: sourceColors.surface,
    text: sourceColors.text,
    primary: sourceColors.primary,
    accent: sourceColors.accent,
  }
  const targetAnchors: FiveAnchors = { bg, surface, text, primary, accent }
  const chartPalette = anchors.chartPalette ?? sourceColors.chartPalette
  const chartAnchor = anchors.chartPalette === undefined ? sourceColors.primary : chartPalette[0]!
  const colors: ThemeFile["style"]["colors"] = {
    ...sourceColors,
    bg,
    primary,
    accent,
    text,
    surface,
    muted,
    chartPalette: derivePaletteSequence(chartPalette, chartAnchor, primary),
  }
  if (sourceColors.accentPool !== undefined) {
    colors.accentPool = derivePaletteSequence(sourceColors.accentPool, sourceColors.accent, accent)
  }
  if (sourceColors.panel !== undefined) {
    colors.panel = rebaseRelativeColor(sourceColors.panel, sourceColors.bg, bg, sourceColors.text, text)
  }
  if (sourceColors.border !== undefined) {
    colors.border = rebaseRelativeColor(sourceColors.border, sourceColors.surface, surface, sourceColors.text, text)
  }
  if (sourceColors.cardStroke !== undefined) {
    colors.cardStroke = rebaseRelativeColor(sourceColors.cardStroke, sourceColors.surface, surface, sourceColors.text, text)
  }
  if (sourceColors.danger !== undefined) {
    colors.danger = calibrateStatusColor("danger", sourceColors.danger, bg, surface, unchecked)
  }
  if (sourceColors.warning !== undefined) {
    colors.warning = calibrateStatusColor("warning", sourceColors.warning, bg, surface, unchecked)
  }
  if (sourceColors.success !== undefined) {
    colors.success = calibrateStatusColor("success", sourceColors.success, bg, surface, unchecked)
  }

  const defaultBackgrounds = {
    cover: deriveBackground(source.style.defaultBackgrounds.cover, "cover", sourceAnchors, targetAnchors),
    chapter: deriveBackground(source.style.defaultBackgrounds.chapter, "chapter", sourceAnchors, targetAnchors),
    content: deriveBackground(source.style.defaultBackgrounds.content, "content", sourceAnchors, targetAnchors),
    ending: deriveBackground(source.style.defaultBackgrounds.ending, "ending", sourceAnchors, targetAnchors),
  }

  const file = {
    version: 2 as const,
    id: identity.id,
    label: identity.label ?? source.label,
    style: {
      ...source.style,
      id: identity.id,
      colors,
      fonts: identity.fonts ?? source.style.fonts,
      defaultBackgrounds,
    },
    brand: source.brand,
    occasions: source.occasions,
    identity: source.identity,
    menu: structuredClone(source.menu),
  }
  return ThemeFileSchema.parse(file) as ThemeFile
}

export function forkTheme(
  source: ThemeFile,
  anchors: ForkThemeAnchors,
  identity: ForkThemeIdentity,
): ThemeFile {
  const file = buildForkedTheme(source, anchors, identity, false)
  assertContrastFloor(file.id, file.style)
  return file
}

/** Explicit bypass for emitting a file that will be repaired by hand. */
export function forkThemeUnchecked(
  source: ThemeFile,
  anchors: ForkThemeAnchors,
  identity: ForkThemeIdentity,
): ThemeFile {
  return buildForkedTheme(source, anchors, identity, true)
}

export function contrastFloorError(id: string, style: ThemeFile["style"]): string | undefined {
  try {
    assertContrastFloor(id, style)
    return undefined
  } catch (error) {
    return error instanceof PptwiseError || error instanceof Error ? error.message : String(error)
  }
}
