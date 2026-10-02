import type { ComponentCtx } from "../../components/types"
import { blendOver } from "../../render/ink"

/*
 * The colours the notice setting paints with, derived from the theme's own
 * tokens so the compositions stay theme-agnostic.
 *
 * bulletin's board keeps its primary for the one thing a page marks, so every
 * other mark needs a quiet colour the theme does not name: a light grey for
 * data that recedes, a mid grey for axes and totals, a pale tint of primary
 * behind a highlighted row, and a light panel behind a closing note. Each is
 * a blend of two tokens, at the share that reproduces the board's own value
 * on bulletin (`#C2C6CC`, `#8E939A`, `#E6ECF7`, `#D3DDF0`, `#EEEEE9`).
 *
 * The receded grey does not reach the 3:1 a lone graphic owes the page. The
 * plots that use it print every value on its mark, so the mark is never the
 * only carrier of the figure.
 */

/** Data that steps back when another series or bar is marked. */
export function quietMarkFill(ctx: ComponentCtx): string {
  return blendOver(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, 0.33)
}

/** A plot's baseline, a total bar, and a bracket that is not the marked one. */
export function axisInk(ctx: ComponentCtx): string {
  return blendOver(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, 0.68)
}

/** The pale primary behind a highlighted table row. */
export function rowTint(ctx: ComponentCtx): string {
  return blendOver(ctx.colors.primary, ctx.colors.surface, 0.1)
}

/** The deeper primary tint inside a forecast's hatching and a target's dashed box. */
export function markTint(ctx: ComponentCtx): string {
  return blendOver(ctx.colors.primary, ctx.colors.surface, 0.17)
}

/** The panel a closing note sits on. */
export function panelFill(ctx: ComponentCtx): string {
  return ctx.colors.panel ?? blendOver(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, 0.08)
}
