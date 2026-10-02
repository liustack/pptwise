import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../../components/types"
import type { ContentRect } from "../../../render/layout"
import { buildCtx, resolveBackgroundHex } from "../../../render/full-slide-svg"
import { parseSvgRoot, renderSvgMarkup } from "../../../render/serialize"
import { resolveThemeEmphasis } from "../../../themes/definitions"
import { resolveStyle } from "../../../themes"
import type { Composition, CompositionInks, CompositionSetting } from "../shared"

/**
 * The band brief's content pages hand their body: the type area under the
 * heading rule, down to the footer clearance. The board's geometry is
 * measured in it, which is why most tests here use it.
 */
export const BAND: ContentRect = { x: 96, y: 200, w: 1088, h: 448 }
/** The same band on a page with a source line under it. */
export const BAND_ABOVE_SOURCE: ContentRect = { ...BAND, h: 412 }

/** The band bulletin's notice sheet hands its body: x80 to x1200, y196 down to the source line. */
export const NOTICE_BAND: ContentRect = { x: 80, y: 196, w: 1120, h: 444 }
/** The plot's share of it beside a column of figures (x80 to x760). */
export const NOTICE_PLOT: ContentRect = { x: 80, y: 196, w: 680, h: 444 }

/** A content-page context for `themeId`, built the way the page renderer builds one. */
export function testCtx(themeId = "brief"): { ctx: ComponentCtx; tokens: ReturnType<typeof resolveStyle> } {
  const tokens = resolveStyle(themeId)
  const bg = resolveBackgroundHex(tokens.defaultBackgrounds.content, tokens.colors.surface)
  return { tokens, ctx: buildCtx(tokens, {}, undefined, bg, undefined, undefined, resolveThemeEmphasis(themeId)) }
}

export function renderNode(node: React.ReactNode): { root: Element; markup: string } {
  const markup = renderSvgMarkup(
    <svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg">
      {node}
    </svg>,
  )
  return { root: parseSvgRoot(markup), markup }
}

export interface RenderOptions {
  theme?: string
  rect?: ContentRect
  inks?: CompositionInks
  /** The page type the face hands down, the brief board's own when left out. */
  setting?: CompositionSetting
  /** Applied to the theme's context before the composition sees it. */
  ctx?: (ctx: ComponentCtx) => ComponentCtx
}

/** One composition on `components`, in `rect` (brief's band by default), on `theme` (brief by default). */
export function renderComposition(composition: Composition, components: unknown[], options: RenderOptions = {}) {
  const { ctx: base, tokens } = testCtx(options.theme)
  const ctx = options.ctx ? options.ctx(base) : base
  const element = composition({
    components: components as Component[],
    ctx,
    rect: options.rect ?? BAND,
    inks: options.inks,
    setting: options.setting,
  })
  return { element, tokens, ctx, ...(element ? renderNode(element) : { root: null, markup: "" }) }
}

export const texts = (root: Element) => Array.from(root.querySelectorAll("text"))
export const textOf = (el: Element) => (el.textContent ?? "").replace(/\s+/g, " ").trim()
export const attrs = (el: Element, names: string[]) => names.map((name) => el.getAttribute(name))
export const byText = (root: Element, text: string) => texts(root).find((el) => textOf(el) === text)
