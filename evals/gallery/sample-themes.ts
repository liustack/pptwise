/** Self-contained public theme-file examples used by the gallery. */

import { registerBrandThemeFile } from "@/themes/brand-theme-file"
import { THEME_DEFINITIONS } from "@/themes/definitions"
import type { ThemeFile } from "@/themes/schema"

export const GALLERY_TIDE_THEME_ID = "gallery-tide"
export const GALLERY_STUDIO_THEME_ID = "gallery-studio"
export const GALLERY_SAMPLE_THEME_IDS = [GALLERY_TIDE_THEME_ID, GALLERY_STUDIO_THEME_ID] as const

const brief = THEME_DEFINITIONS.brief.style

function publicStyle(
  id: string,
  colors: Partial<ThemeFile["style"]["colors"]> & {
    bg: string
    surface: string
    primary: string
    accent: string
    text: string
    muted: string
    chartPalette: string[]
  },
): ThemeFile["style"] {
  return {
    id,
    colors: { ...brief.colors, ...colors },
    fonts: {
      heading: [...brief.fonts.heading],
      body: [...brief.fonts.body],
      ...(brief.fonts.mono ? { mono: [...brief.fonts.mono] } : {}),
    },
    shape: {
      radius: brief.shape?.radius,
      gapScale: brief.shape?.gapScale,
      typeScale: brief.shape?.typeScale,
    },
    defaultBackgrounds: {
      cover: { kind: "color", value: colors.bg },
      chapter: { kind: "color", value: colors.primary },
      content: { kind: "color", value: colors.bg },
      ending: { kind: "color", value: colors.bg },
    },
  }
}

export const GALLERY_TIDE_THEME: ThemeFile = {
  version: 2,
  id: GALLERY_TIDE_THEME_ID,
  label: "Tide Consulting",
  occasions: ["business"],
  identity: "medium",
  style: publicStyle(GALLERY_TIDE_THEME_ID, {
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
  menu: {
    cover: { face: "poster-center" },
    chapter: { face: "masthead-chapter" },
    content: { points: { face: "two-column" }, data: { face: "gauge-stats" } },
    ending: { face: "poster-ending" },
  },
}

export const GALLERY_STUDIO_THEME: ThemeFile = {
  version: 2,
  id: GALLERY_STUDIO_THEME_ID,
  label: "Studio Proof",
  occasions: ["event"],
  identity: "high",
  style: publicStyle(GALLERY_STUDIO_THEME_ID, {
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
  menu: {
    cover: { face: "poster-center", decor: { kind: "motif", id: "poster-motif" } },
    chapter: { face: "one-word-chapter", decor: { kind: "motif", id: "poster-motif" } },
    content: {
      points: { face: "two-column" },
      statement: { face: "statement", decor: { kind: "silent" } },
    },
    ending: { face: "poster-ending", decor: { kind: "motif", id: "poster-motif" } },
  },
}

export const GALLERY_SAMPLE_THEMES: readonly ThemeFile[] = [GALLERY_TIDE_THEME, GALLERY_STUDIO_THEME]

export function registerGallerySampleThemes(): void {
  for (const theme of GALLERY_SAMPLE_THEMES) registerBrandThemeFile(theme)
}
