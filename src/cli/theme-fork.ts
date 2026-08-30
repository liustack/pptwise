import type { BackgroundSpec } from "../ir"
import { PptwiseError } from "../errors"
import { assertContrastFloor } from "../themes/definitions"
import { deriveMuted } from "../themes/extract/brand-extract"
import { ThemeFileSchema, type ThemeFile } from "../themes/schema"

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

function normHex(hex: string): string {
  return hex.toUpperCase()
}

function remapHex(hex: string, map: Map<string, string>): string {
  return map.get(normHex(hex)) ?? hex
}

function remapBackground(spec: BackgroundSpec, map: Map<string, string>): BackgroundSpec {
  if (spec.kind === "color") return { ...spec, value: remapHex(spec.value, map) }
  if (spec.kind === "gradient") {
    return { ...spec, from: remapHex(spec.from, map), to: remapHex(spec.to, map) }
  }
  if (spec.overlay !== undefined) {
    return {
      ...spec,
      overlay: { ...spec.overlay, color: remapHex(spec.overlay.color, map) },
    }
  }
  return spec
}

function buildForkedTheme(source: ThemeFile, anchors: ForkThemeAnchors, identity: ForkThemeIdentity): ThemeFile {
  const bg = anchors.bg ?? source.style.colors.bg
  const primary = anchors.primary
  const accent = anchors.accent ?? source.style.colors.accent
  const text = anchors.text ?? source.style.colors.text
  const surface = anchors.surface ?? source.style.colors.surface
  const muted = deriveMuted(text, bg, surface)

  const map = new Map<string, string>()
  map.set(normHex(source.style.colors.bg), bg)
  map.set(normHex(source.style.colors.surface), surface)
  map.set(normHex(source.style.colors.text), text)
  map.set(normHex(source.style.colors.accent), accent)
  map.set(normHex(source.style.colors.primary), primary)

  const sourceColors = source.style.colors
  const colors: ThemeFile["style"]["colors"] = {
    ...sourceColors,
    bg,
    primary,
    accent,
    text,
    surface,
    muted,
    chartPalette: anchors.chartPalette ?? sourceColors.chartPalette.map((hex) => remapHex(hex, map)),
  }
  if (sourceColors.accentPool !== undefined) {
    colors.accentPool = sourceColors.accentPool.map((hex) => remapHex(hex, map))
  }
  if (sourceColors.panel !== undefined) colors.panel = remapHex(sourceColors.panel, map)
  if (sourceColors.border !== undefined) colors.border = remapHex(sourceColors.border, map)
  if (sourceColors.cardStroke !== undefined) colors.cardStroke = remapHex(sourceColors.cardStroke, map)
  if (sourceColors.danger !== undefined) colors.danger = sourceColors.danger
  if (sourceColors.warning !== undefined) colors.warning = sourceColors.warning
  if (sourceColors.success !== undefined) colors.success = sourceColors.success

  const defaultBackgrounds = {
    cover: remapBackground(source.style.defaultBackgrounds.cover, map),
    chapter: remapBackground(source.style.defaultBackgrounds.chapter, map),
    content: remapBackground(source.style.defaultBackgrounds.content, map),
    ending: remapBackground(source.style.defaultBackgrounds.ending, map),
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
  const file = buildForkedTheme(source, anchors, identity)
  assertContrastFloor(file.id, file.style)
  return file
}

/** Same as {@link forkTheme} but contrast failure is the caller's to handle. */
export function forkThemeUnchecked(
  source: ThemeFile,
  anchors: ForkThemeAnchors,
  identity: ForkThemeIdentity,
): ThemeFile {
  return buildForkedTheme(source, anchors, identity)
}

export function contrastFloorError(id: string, style: ThemeFile["style"]): string | undefined {
  try {
    assertContrastFloor(id, style)
    return undefined
  } catch (error) {
    return error instanceof PptwiseError || error instanceof Error ? error.message : String(error)
  }
}
