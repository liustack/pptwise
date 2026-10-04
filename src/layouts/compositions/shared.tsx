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
 * team as an owner block over cards, a trend chart with a column of figures
 * beside it, a row of headline figures over a quote, a timeline on one rule,
 * a list of label and value pairs. They were drawn for brief's 2026-10
 * boards, and nothing in them is brief's: each one reads only the band its face hands it and the theme's
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

export type CompositionId =
  | "rows"
  | "table"
  | "waves"
  | "tree"
  | "rail"
  | "figures"
  | "track"
  | "pairs"
  | "columns"
  | "bars"
  | "bridge"
  | "records"
  | "stack"
  | "window"
  | "lanes"
  | "share"
  | "tiles"
  | "shifts"
  | "roster"
  | "scores"
  | "targets"
  | "trend"
  | "rings"

/**
 * The type a composition sets its page in.
 *
 * - `board`: brief's boards, where every composition was first drawn. Labels
 *   and figures in the primary colour at regular weight, closing lines
 *   reversed out of a primary block.
 * - `notice`: bulletin's 2026-10 board. Black bold labels and figures, the
 *   primary colour kept for the one thing an author marks (a `**…**` run, an
 *   item or series with `emphasis`, a highlighted row), and closing lines on
 *   a light panel. A composition offered this setting also takes the shapes
 *   that board drew and the first one did not, such as `numbered_cards` as
 *   rows with the marked item reversed out of a primary block.
 *
 * - `grid`: swiss's 2026-10 board. The notice shapes on the notice band,
 *   recoloured for a page whose data is black: unmarked data in the text
 *   ink, what steps back in two greys, and the theme's emphasis ink (its
 *   red) kept for the one thing an author marks, a forecast's hatching and
 *   the bracket that states the page's change. Blocks that carry text stay
 *   black, never red. See `./grid.ts`.
 *
 * - `panel`: ledger's 2026-10 board. Every shape set inside dark panels
 *   with a 36px title bar naming the panel and its unit, the theme's
 *   emphasis ink kept for the one thing an author marks, its success and
 *   danger inks only for a value's direction, and unmarked series in the
 *   chart palette after its lead. A composition offered this setting also
 *   takes the shapes that board drew and no other did: numbered panels, a
 *   before-and-after dot plot, a row of figure panels. See `./panel.tsx`.
 *
 * - `seal`: vermilion's 2026-10 board. A formal report on paper: items
 *   numbered in the deck's own numerals inside small squares of the mark,
 *   open tables under a 2px rule in the mark, the mark spent once a page on
 *   a reversed row, a tinted row or a figure, and the accent only drawing
 *   rules, rings and outlines. A composition offered this setting also takes
 *   the shapes that board drew and no other did: a two-column roster of ten
 *   items, a scorecard, targets beside the statement they rest on, a trend
 *   over a marked range, completion rings. See `./seal.tsx`.
 *
 * A setting is the face's choice, not the theme's: the face that offers the
 * compositions names the setting its own frame was drawn with.
 */
export type CompositionSetting = "board" | "notice" | "grid" | "panel" | "seal"

export interface CompositionProps {
  /** The page's components, in the order the author wrote them. */
  components: readonly Component[]
  /** The paint context: theme colours, fonts and emphasis stroke, as the face hands them. */
  ctx: ComponentCtx
  /** The body band the face leaves for its content. */
  rect: ContentRect
  /** Starting inks a face supplies where its board names a colour the theme tokens do not carry. */
  inks?: CompositionInks
  /** The type the page is set in. Omitted, `board`. */
  setting?: CompositionSetting
  /**
   * Draws other components in a band of their own, with the compositions the
   * face offered and in the same setting, or returns `null` when none takes
   * them. `compose` hands it to every composition, so one that draws part of
   * a page (a share bar over a chart and its figures) can pass the rest on.
   */
  handOn?: (components: readonly Component[], rect: ContentRect) => React.ReactElement | null
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
