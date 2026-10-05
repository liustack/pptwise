import type React from "react"
import type { Component } from "@/ir"
import type { Tag } from "../../components/tag"
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
  | "cards"
  | "listing"
  | "log"
  | "span"
  | "plates"
  | "paths"
  | "screen"
  | "annex"
  | "tallies"
  | "slopes"
  | "diverging"
  | "citation"
  | "scales"
  | "catalog"
  | "rota"
  | "sum"
  | "schedule"
  | "checks"
  | "readings"
  | "inset"
  | "docket"
  | "controlled"
  | "duel"
  | "forest"
  | "multiples"
  | "fork"
  | "ruler"
  | "dumbbells"
  | "gate"
  | "watch"
  | "motion"
  | "calendar"
  | "horizon"
  | "formula"
  | "errata"
  | "breakdown"
  | "benchmark"
  | "paired"
  | "procedure"
  | "magnitude"
  | "segments"
  | "survey"
  | "outlook"
  | "phases"

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
 * - `console`: terminal's 2026-10 board. An incident console: square panels
 *   on a dark page, figures, times, labels and the source in a mono face, the
 *   mark spent once a page on a card or row set on its dark tint inside an
 *   edge of it, and the theme's danger, warning and success inks only for
 *   what kind of news a line is. A composition offered this setting also
 *   takes the shapes that board drew and no other did: HUD cards with icons,
 *   a code listing as a terminal window, a timeline as a log, durations to
 *   scale, pictures over their figures, a question's failure points beside
 *   their fixes, a device beside its log lines. See `./console.tsx`.
 *
 * - `memo`: memo's 2026-10 board. A typed memorandum on paper: titles,
 *   item numbers and the figures a page argues from in the heading face,
 *   labels, dates, sums and quoted originals in the typewriter's mono face,
 *   items numbered 「一、」 in the deck's own numerals, open tables under a
 *   2px rule of ink, the thing a page lands on on a pale tint of the mark,
 *   good news in the success ink and bad news in the mark itself, and
 *   photographs pasted in as turned exhibits. A composition offered this
 *   setting also takes the shapes that board drew and no other did: figures
 *   beside an exhibit, a slope chart of two groups, bars that diverge from
 *   the middle, a quoted original and what it means, a weighing in two
 *   columns, options under their photographs, a rota, a sum on ruled paper,
 *   a calendar over its dates, a checklist of stop conditions. See
 *   `./memo.tsx`.
 *
 * - `dossier`: clinic's 2026-10 board. A clinical assessment file: figures
 *   on rounded cards over hairlines, each source named in a rounded capsule
 *   outlined in the ink its kind of source takes, the thing a page is about
 *   in the mark (on its pale tint when it is a row), what it is read against
 *   (a placebo, a control) drawn as an outline, a hollow dot or a tick, the
 *   accent kept for lines and dots, and risk and cost reminders in the
 *   warning ink. A composition offered this setting also takes the shapes
 *   that board drew and no other did: figure cards over a share bar, cases
 *   beside a photograph, bars against their controls, a head-to-head, a
 *   forest plot, small multiples of rates, a trajectory that forks, ranges
 *   on a scale, before-and-after dumbbells, a gated process and a
 *   monitoring plan. See `./dossier.tsx`.
 *
 * - `yearbook`: almanac's 2026-10 board. A long-term account kept year by
 *   year: figures on flat cards over hairlines, figures, years, dates and
 *   formulas in the mono face, every figure that is not a settled fact
 *   marked by a small pill (a § before a provision of law, a dash around an
 *   estimate, a pending figure, a proposed rule or a company's claim), the
 *   mark for what the page settles on and the accent once a page for the
 *   money that comes due. A composition offered this setting draws the
 *   shapes that board drew and no other did: background beside a decision
 *   card, a calendar laid to scale, long curves over a table of years, a
 *   bridge beside its formula, a wrong sum beside the right one, a whole cut
 *   into amounts with a bracket, bars against a benchmark, paired columns, a
 *   procedure over its table, one figure set huge, a whole cut in two with
 *   what each part means, three routes under their photographs, rules on a
 *   year axis and phases with their budget lines. See `./yearbook.tsx`.
 *
 * A setting is the face's choice, not the theme's: the face that offers the
 * compositions names the setting its own frame was drawn with.
 */
export type CompositionSetting = "board" | "notice" | "grid" | "panel" | "seal" | "console" | "memo" | "dossier" | "yearbook"

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
   * The number the page's first exhibit takes (「附图 N」), counted across the
   * deck by the face that sets the page: one more than the pictures on the
   * pages before it. 1 when omitted. Only the memo setting numbers exhibits.
   */
  exhibitNumber?: number
  /**
   * The section the page sits in (its `kicker`), handed down by a face that
   * numbers a page's items after it: the dossier setting labels proposals
   * 「提议 1」 on a page whose section is 「提议」.
   */
  section?: string
  /**
   * The height a face's page tag (`Slide.tag`) takes at the top left of the
   * band, from `rect.y`, when the face sets one there. A composition that
   * knows the tag keeps its left column clear of it. 0 or omitted when the
   * page has none.
   */
  tagBand?: number
  /**
   * The page's own tag (`Slide.tag`), handed to a setting that sets it inside
   * the body where its board drew it: the yearbook cites the law a page rests
   * on under the figures it governs. A page with one is offered only to the
   * compositions that place it; the face sets it itself otherwise.
   */
  pageTag?: Tag
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
