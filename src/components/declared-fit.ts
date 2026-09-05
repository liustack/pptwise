/**
 * A drawing that would have to cut an author's words declines instead.
 *
 * The shared fit helpers shrink a line toward {@link FORM_BODY_FLOOR} and,
 * once there, start removing characters — which is right for a card whose
 * neighbours carry the rest of the sentence, and wrong for these drawings.
 * A tree node reading "客户成功中心负…" is not a smaller version of the
 * node; it is a different word, and the reader has no way to know which. So
 * every fit in this family is checked before anything is painted: if any of
 * them took the truncate branch, nothing is drawn and the loss is declared,
 * which sends the page to a rendering with more room and stops the export if
 * none exists (AGENTS.md, "a face has two legal postures").
 *
 * Visible shrinking down to the floor is still fine — that is the fit doing
 * its job, and every word survives.
 */

/** The shape every shared fit helper returns, reduced to the one question asked here. */
export interface MaybeCut {
  readonly truncated: boolean
}

/** Whether any fit had to remove characters to make its line fit. */
export function anyCut(fits: readonly (MaybeCut | null | undefined)[]): boolean {
  return fits.some((fit) => fit?.truncated === true)
}

/**
 * Whether a stack of lines fits the height it was given.
 *
 * Height is the axis a fit helper knows nothing about: `fitFormLine` answers
 * "does this line fit this width" and will happily hand back a 17px line for
 * a 19px box. Each caller measures its own stack against its own box and
 * declines when the ink would cross the edge.
 */
export function fitsHeight(lineHeights: readonly number[], available: number, padding = 0): boolean {
  return lineHeights.reduce((total, h) => total + h, 0) + padding <= available
}
