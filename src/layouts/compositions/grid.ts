import type { ComponentCtx } from "../../components/types"
import { emphasisRunInk } from "../../render/emphasis"
import { blendOver, contrastRatio, requiredContrastRatio } from "../../render/ink"
import { axisInk, quietMarkFill } from "./notice"
import type { CompositionSetting } from "./shared"

/*
 * The colours the grid setting paints with, derived from the theme's own
 * tokens so the compositions stay theme-agnostic.
 *
 * swiss's board draws data black, in the theme's text ink, and spends its
 * red once a page. So where the notice setting has one colour for what is
 * marked (primary) and greys for everything else, the grid setting has
 * three: the text ink for data, two greys for what steps back (the notice
 * setting's own, `quietMarkFill` and `axisInk`), and the emphasis ink a
 * marked run of text already takes (`emphasisRunInk`, swiss's red) for the
 * marked thing, a forecast and the page's change. A pale tint of that ink
 * sits under a marked row and inside a forecast's hatching, at the shares
 * the notice setting gives primary.
 */

/** The one colour a grid page spends on what its author marked. */
export function gridMark(ctx: ComponentCtx): string {
  return emphasisRunInk(ctx.colors)
}

/** Data nothing marks: the text ink. */
export function gridData(ctx: ComponentCtx): string {
  return ctx.colors.text
}

/** What steps back furthest: an unmarked step of a bridge, a third part of a share bar. */
export function gridQuiet(ctx: ComponentCtx): string {
  return quietMarkFill(ctx)
}

/** A plot's baseline, a connector, an unmarked stem: the mid grey. */
export function gridRule(ctx: ComponentCtx): string {
  return axisInk(ctx)
}

/** The pale tint behind a highlighted row. */
export function gridRowTint(ctx: ComponentCtx): string {
  return blendOver(gridMark(ctx), ctx.colors.surface, 0.1)
}

/** The deeper tint inside a forecast's hatching. */
export function gridMarkTint(ctx: ComponentCtx): string {
  return blendOver(gridMark(ctx), ctx.colors.surface, 0.17)
}

/**
 * The colour a notice-family composition marks with in `setting`: primary in
 * the notice setting, the emphasis ink in the grid setting.
 */
export function markInk(ctx: ComponentCtx, setting: CompositionSetting | undefined): string {
  return setting === "grid" ? gridMark(ctx) : ctx.colors.primary
}

/**
 * The emphasis ink for text of `size` set on `ground`, such as the marked
 * row's tint: the emphasis ink itself where it reads there, otherwise the
 * least step of it toward the text ink that does, so a marked row stays red
 * rather than falling back to black. The board's red on its tint misses
 * 4.5:1 by a little, and this is that little.
 */
export function gridMarkOn(ctx: ComponentCtx, ground: string, size: number): string {
  const mark = gridMark(ctx)
  const need = requiredContrastRatio(size)
  if (contrastRatio(mark, ground) >= need) return mark
  for (let step = 1; step <= 20; step++) {
    const candidate = blendOver(ctx.colors.text, mark, step / 20)
    if (contrastRatio(candidate, ground) >= need) return candidate
  }
  return ctx.colors.text
}
