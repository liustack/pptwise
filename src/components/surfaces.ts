import type { ComponentCtx } from "./types"
import { mixHex } from "./color-mix"
import { accessibleInk, graphicInk } from "../render/ink"

/**
 * The theme's answer to `shape.surfaces` (`themes/tokens.ts`): whether the
 * shared components set a page as print rather than as a web page.
 *
 * Every renderer that lays a card, a tinted cell, a filled node or a badge
 * asks this one question and keeps its filled drawing, untouched, when the
 * answer is no. A theme that leaves the token out therefore renders byte
 * for byte as it did before the token existed.
 *
 * Under `"ruled"` the components share four rules, so a deck reads as one
 * printed document whichever renderer drew a page:
 *   - a card has no fill and no rounded corner: a hairline over it (or
 *     beside it, between columns) and its own white space hold the shape;
 *   - nothing is tinted with the accent or the primary: what a page leads
 *     with is set in weight and ink, with one 2px rule of the accent;
 *   - a number is the figure itself, never a disc around it, and a block
 *     that was solid becomes an outline or a rule;
 *   - a table runs on rules: an ink rule under the head, hairlines between
 *     rows, no tinted row.
 * Charts keep their marks: only the furniture around them changes.
 */
export function isRuled(ctx: Pick<ComponentCtx, "shape">): boolean {
  return ctx.shape?.surfaces === "ruled"
}

/** The paper under the page: what a ruled card's words sit on. */
export function paperOf(ctx: Pick<ComponentCtx, "colors" | "defaultBg">): string {
  return ctx.defaultBg ?? ctx.colors.bg
}

/**
 * What a card's words sit on: the card's `surface` in a filled theme, the
 * paper itself in a ruled one, where no card is laid. Contrast is judged
 * against this, so an ink chosen for a card stays right when the card is
 * a hairline instead.
 */
export function cardGround(ctx: Pick<ComponentCtx, "colors" | "defaultBg" | "shape">): string {
  return isRuled(ctx) ? paperOf(ctx) : ctx.colors.surface
}

/**
 * The hairline a ruled page divides its parts with: the theme's `border`,
 * else its `cardStroke`, else the ink a fifth of the way from the paper.
 * Only ever a line, never a ground for words.
 */
export function hairlineInk(ctx: Pick<ComponentCtx, "colors" | "defaultBg">): string {
  return ctx.colors.border ?? ctx.colors.cardStroke ?? mixHex(paperOf(ctx), ctx.colors.text, 0.2)
}

/**
 * The ink of an outline that is a mark in its own right, such as the ring
 * that stands for a face with no photograph. A hairline only parts things
 * and may be faint, but a mark has to be seen, so this is the muted ink at
 * the 3:1 a graphic owes the paper.
 */
export function markInk(ctx: Pick<ComponentCtx, "colors" | "defaultBg">): string {
  return graphicInk(ctx.colors.muted, paperOf(ctx))
}

/** A hairline's weight. */
export const HAIRLINE = 1
/** The ink rule under a table's head, and the accent rule over what a page leads with. */
export const RULE = 2

/**
 * A ruled node's outline: a hairline round an ordinary node, a 1.5px line
 * of the primary round the one a diagram leads with (its root, its result,
 * the step it lands on). A rule where a fill used to be.
 */
export function ruledFrame(ctx: Pick<ComponentCtx, "colors" | "defaultBg">, lead: boolean): { stroke: string; strokeWidth: number } {
  return lead ? { stroke: graphicInk(ctx.colors.primary, paperOf(ctx)), strokeWidth: LEAD_FRAME } : { stroke: hairlineInk(ctx), strokeWidth: HAIRLINE }
}

/**
 * The outline of a ruled shape with nothing inside it to show it is there,
 * such as a ring of a layered model or a wedge of a wheel, whose labels sit
 * outside it on leader lines. A hairline is only fit to part things that
 * hold words, and drawn in one such a shape all but vanishes, so the plain
 * ones take the mark ink (`markInk`) and the lead keeps its frame.
 */
export function figureFrame(ctx: Pick<ComponentCtx, "colors" | "defaultBg">, lead: boolean): { stroke: string; strokeWidth: number } {
  return lead ? ruledFrame(ctx, true) : { stroke: markInk(ctx), strokeWidth: HAIRLINE }
}

/** The weight of the outline round the node a ruled diagram leads with. */
export const LEAD_FRAME = 1.5

/**
 * The ink of the words a filled theme set reversed out of a lead block: on
 * a ruled page they sit on the paper, in the primary where it reads at
 * `fontSize`, the text ink where it does not.
 */
export function leadInk(ctx: Pick<ComponentCtx, "colors" | "defaultBg">, fontSize: number): string {
  return accessibleInk(ctx.colors.primary, paperOf(ctx), fontSize)
}
