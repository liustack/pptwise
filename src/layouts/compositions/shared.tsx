import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { blendOver, readableOn } from "../../render/ink"

/*
 * Compositions: hand-set arrangements of one content shape, shared by any
 * face that wants them.
 *
 * The ordinary component renderer stacks components in a band and draws each
 * one its own way. A composition draws a whole page body by hand instead: a
 * short list as ruled numbered rows, a comparison as an open table with the
 * pick lifted out, a roadmap as phase columns under colour bars, a two-level
 * team as an owner block over cards, a trend chart with a change column
 * beside it. They were drawn for brief's 2026-10 board, and nothing in them is
 * brief's: each one reads only the band its face hands it and the theme's
 * tokens, so the face keeps its own heading, source line and footer.
 *
 * The contract every composition keeps:
 *
 * - It recognises one content shape and declines everything else by
 *   returning `null`. The face then draws the page another way, normally
 *   with the ordinary component renderer in the same band.
 * - It never takes part of a page. It draws every component it was handed
 *   whole, at the sizes it states, or it declines. No text is shrunk past
 *   its stated size, cut, or marked `data-truncated`.
 * - It stays inside `rect`, and declines when `rect` is narrower or shorter
 *   than it needs.
 * - Its outer group carries `data-gauge-module="<id>"` (see
 *   `compositionTag`), so tests and audits can tell which one drew a page.
 *
 * The settled boards, with what each looks like and why, are archived under
 * `design/compositions/<id>/`.
 */

export type CompositionId = "rows" | "table" | "waves" | "tree" | "rail"

export interface CompositionProps {
  /** The page's components, in the order the author wrote them. */
  components: readonly Component[]
  /** The paint context: theme colours, fonts and emphasis stroke, as the face hands them. */
  ctx: ComponentCtx
  /** The body band the face leaves for its content. */
  rect: ContentRect
  /** Starting inks a face supplies where its board names a colour the theme tokens do not carry. */
  inks?: CompositionInks
}

export interface CompositionInks {
  /**
   * The starting colour for a quiet second line set on a `primary` block
   * (the role under the owner's name in `tree`). Contrast still decides: the
   * line keeps this colour only where it reads on `primary`. Without it the
   * composition derives one from the tokens, see `quietInkOn`.
   */
  quietOnPrimary?: string
}

/**
 * A composition draws one content shape by hand, or returns `null` to say it
 * does not take these components.
 */
export type Composition = (props: CompositionProps) => React.ReactElement | null

/**
 * The tag on a composition's outer group.
 *
 * The attribute keeps the name it had while these compositions lived inside
 * brief's gauge faces. Renaming it would change the bytes of every brief page
 * that carries one, so it waits for a round that re-records the gallery for
 * its own reasons.
 */
export function compositionTag(id: CompositionId): { "data-gauge-module": CompositionId } {
  return { "data-gauge-module": id }
}

/** The ink a hairline between rows takes. */
export function ruleInk(ctx: ComponentCtx): string {
  return ctx.colors.border ?? ctx.colors.muted
}

/**
 * How far the quiet line on a `primary` block sits from the block's own
 * readable ink toward the block. Brief's board grey on its navy, #B7BBC4,
 * sits about 68% of the way from navy to white, so a theme without a board
 * colour of its own gets the same step.
 */
const QUIET_ON_PRIMARY_MIX = 0.68

/**
 * The starting ink for a quiet second line on a block filled with `fill`:
 * the face's own colour when it hands one in, otherwise the block's readable
 * ink blended part of the way back toward the block. The caller still runs it
 * through `accessibleInk` against `fill`.
 */
export function quietInkOn(fill: string, preferred: string | undefined): string {
  return preferred ?? blendOver(readableOn(fill), fill, QUIET_ON_PRIMARY_MIX)
}

/**
 * The `data-blk` tag a component drawn by hand needs.
 *
 * A component drawn through `renderComponent` is tagged there, and the
 * per-component entrance animation (`meta.animation.elements: "auto"`) finds
 * its shapes by that tag. A composition draws its components itself, so each
 * one tags the group it draws a component into, the way the bento grid tags
 * its exploded cards. Empty when animation is off.
 */
export function blockTag(ctx: ComponentCtx, component: Component): { "data-blk"?: number } {
  const index = ctx.blockIndex?.get(component)
  return index != null ? { "data-blk": index } : {}
}
