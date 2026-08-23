/**
 * Role → canvas-px floors for rendered SVG text.
 *
 * The numbers live in `src/constants.ts` next to the 96 px/in canvas
 * contract. This module is the role map L1, `fitSvgLine`, and component
 * shrink floors share, so a later raise cannot drift between them.
 */
import { BODY_FONT_FLOOR_PX, META_FONT_FLOOR_PX } from "../constants"

export const TEXT_ROLES = [
  "heading",
  "body",
  "label",
  "card-sub",
  "meta",
  "footnote",
  "caption",
  "tick",
  "badge",
  "decor",
] as const

export type TextRole = (typeof TEXT_ROLES)[number]

/** Canvas-px floor for each role. Decor is 0: L1 skips `data-decor`. */
export const FONT_FLOOR_PX = {
  heading: BODY_FONT_FLOOR_PX,
  body: BODY_FONT_FLOOR_PX,
  label: META_FONT_FLOOR_PX,
  "card-sub": META_FONT_FLOOR_PX,
  meta: META_FONT_FLOOR_PX,
  footnote: META_FONT_FLOOR_PX,
  caption: META_FONT_FLOOR_PX,
  tick: META_FONT_FLOOR_PX,
  badge: META_FONT_FLOOR_PX,
  decor: 0,
} as const satisfies Record<TextRole, number>

/** Never-below size for any non-decor `<text>`. Matches 12pt. */
export const ABSOLUTE_READABLE_FONT_FLOOR_PX = META_FONT_FLOOR_PX

export function floorForRole(role: TextRole): number {
  return FONT_FLOOR_PX[role]
}
