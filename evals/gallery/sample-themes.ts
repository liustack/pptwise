/**
 * Two public theme-file examples kept inside the gallery as permanent
 * visual regression surfaces. They enter through the same parser and
 * registration seam as a user's theme.json.
 */

import { registerBrandThemeFile } from "@/themes/brand-theme-file"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import type { CompleteThemeFile, PartialThemeFile, ThemeFile } from "@/themes/schema"

export const GALLERY_PARTIAL_THEME_ID = "gallery-partial-tide"
export const GALLERY_COMPLETE_THEME_ID = "gallery-complete-studio"
export const GALLERY_SAMPLE_THEME_IDS = [GALLERY_PARTIAL_THEME_ID, GALLERY_COMPLETE_THEME_ID] as const

const consulting = THEME_DEFINITIONS.consulting.style

function publicStyle(
  id: string,
  colors: Partial<PartialThemeFile["style"]["colors"]> & {
    bg: string
    surface: string
    primary: string
    accent: string
    text: string
    muted: string
    chartPalette: string[]
  },
): PartialThemeFile["style"] {
  return {
    id,
    colors: { ...consulting.colors, ...colors },
    fonts: {
      heading: [...consulting.fonts.heading],
      body: [...consulting.fonts.body],
      ...(consulting.fonts.mono ? { mono: [...consulting.fonts.mono] } : {}),
    },
    shape: {
      radius: consulting.shape?.radius,
      gapScale: consulting.shape?.gapScale,
      typeScale: consulting.shape?.typeScale,
    },
    defaultBackgrounds: {
      cover: { kind: "color", value: colors.bg },
      chapter: { kind: "color", value: colors.primary },
      content: { kind: "color", value: colors.bg },
      ending: { kind: "color", value: colors.bg },
    },
  }
}

export const GALLERY_PARTIAL_THEME: PartialThemeFile = {
  version: 1,
  id: GALLERY_PARTIAL_THEME_ID,
  label: "Tide Consulting",
  base: "consulting",
  occasions: ["business"],
  identity: "medium",
  style: publicStyle(GALLERY_PARTIAL_THEME_ID, {
    bg: "#F2F6F4",
    surface: "#FFFFFF",
    primary: "#124E57",
    accent: "#D56F45",
    text: "#172427",
    muted: "#53676A",
    border: "#C7D6D1",
    danger: "#A33E36",
    warning: "#866600",
    success: "#23694F",
    chartPalette: ["#124E57", "#D56F45", "#3D7691", "#7B8C67"],
  }),
}

export const GALLERY_COMPLETE_THEME: CompleteThemeFile = {
  version: 1,
  id: GALLERY_COMPLETE_THEME_ID,
  label: "Studio Proof",
  occasions: ["event"],
  identity: "high",
  style: publicStyle(GALLERY_COMPLETE_THEME_ID, {
    bg: "#F7F2E9",
    surface: "#FFFDF8",
    primary: "#27364A",
    accent: "#BC503B",
    text: "#1B2630",
    muted: "#5B6670",
    border: "#D1C7B8",
    danger: "#A03931",
    warning: "#886400",
    success: "#286847",
    chartPalette: ["#27364A", "#BC503B", "#C48B33", "#71816B"],
  }),
  faces: {
    cover: ["poster-center"],
    chapter: ["one-word-chapter"],
    content: ["two-column"],
    ending: ["poster-ending"],
  },
  motif: { id: "poster-motif", params: { intensity: "subtle" } },
  sparse: ["statement"],
}

export const GALLERY_SAMPLE_THEMES: readonly ThemeFile[] = [GALLERY_PARTIAL_THEME, GALLERY_COMPLETE_THEME]

export function registerGallerySampleThemes(): void {
  for (const theme of GALLERY_SAMPLE_THEMES) registerBrandThemeFile(theme)
}
