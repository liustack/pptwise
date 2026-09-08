import type { Component, PptxIR } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { resolveStyle, type StyleTokens } from "../../themes"
import { resolveThemeEmphasis } from "../../themes/definitions"
import { buildCtx } from "../full-slide-svg"

/**
 * A component context built from a theme id, with everything that travels
 * on the theme definition bound the way an entry point would bind it.
 *
 * `buildCtx` takes style tokens plus the theme's declared emphasis stroke,
 * because the render chain carries the definition by value and never looks
 * one up. Style tokens alone cannot answer the emphasis question — `brief`
 * paints a pad behind a `**marked**` run and `lecture` draws an underline,
 * and a context built without that says neither. A test that only holds an
 * id calls this instead of assembling the pair itself. A test that draws
 * with edited tokens passes them last: the tokens are its own, the
 * emphasis stroke still comes from the theme it names.
 */
export function boundThemeCtx(
  themeId: string,
  images: PptxIR["assets"]["images"] = {},
  components?: Component[],
  defaultBg?: string,
  bodyFontPx?: number,
  chartPaletteOffset?: number,
  tokens: StyleTokens = resolveStyle(themeId),
): ComponentCtx {
  return buildCtx(
    tokens,
    images,
    components,
    defaultBg,
    bodyFontPx,
    chartPaletteOffset,
    resolveThemeEmphasis(themeId),
  )
}
