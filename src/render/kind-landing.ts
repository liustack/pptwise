/**
 * Where a content page lands when the bound theme cannot draw it as its own
 * kind: the menu does not offer the kind, or offers it on a face that does
 * not take the page's components.
 *
 * A spec's `kind` is the author's meaning: what the page is doing. Which
 * kinds a theme serves, and on which faces, is the theme's business. When
 * the two disagree, the page is drawn by the nearest kind that can draw it, so a deck can move
 * to another theme by changing one name in its spec, without rewriting
 * pages. The page keeps its own kind in the spec and the IR: only the face
 * that draws it changes, and binding a theme that offers the kind draws it
 * on that kind's own face again.
 *
 * {@link KIND_LANDING} is the one table. Each kind lists, nearest first,
 * the kinds that may stand in for it. Every list ends at `points` or `list`,
 * which every built-in menu offers, so a page always has somewhere to land.
 *
 * Which entry a page takes depends on its components, never on chance:
 * {@link landKind} walks the kind itself and then its list, and takes the
 * first offered kind whose face takes every component the page carries
 * (each one accepted by a slot, every required slot filled, a full-body
 * component alone or with the companions the face declares). The page's
 * own kind is asked first and the same way: a theme that offers the kind
 * on a face too narrow for what the page holds hands it to the nearest
 * face that takes it, which is a face stepping aside so another can draw
 * the page whole. When no offered kind's face takes the page, it takes the
 * first offered kind, and validate says what that face cannot draw.
 *
 * Validation, capacity, and rendering all reach this through
 * `resolveEffectiveFace` (`./layout-selection.ts`), so the face validate
 * checks is the face render draws.
 */
import type { PageKind, Slide } from "@/ir"
import type { LayoutDefinition } from "../layouts/registry"
import type { Menu } from "../themes/schema"
import { FULL_BODY_TYPES } from "./component-traits"

/**
 * Nearest stand-ins for each kind, nearest first, tried after the kind's
 * own entry.
 *
 * - `quote` and `statement` are one sentence set large, someone else's or
 *   the author's own, so each stands in for the other before either falls
 *   back to an ordinary page.
 * - `fact` is one number, so it reads as `data` first, then as a statement
 *   of that number.
 * - `evidence` is a claim with one exhibit: a chart or a table reads as
 *   `data`, a picture as `photo`, anything else as `points`. The face
 *   check below picks between them by what the exhibit is.
 * - `hierarchy` is structure, which an ordinary page of `points` draws
 *   with the structure component itself, then `list`.
 * - The six kinds every built-in menu offers still name a stand-in, so a
 *   copied theme that trims its menu keeps every deck drawable.
 */
export const KIND_LANDING: Readonly<Record<PageKind, readonly PageKind[]>> = {
  points: ["list"],
  list: ["points"],
  comparison: ["points", "list"],
  process: ["points", "list"],
  data: ["evidence", "points", "list"],
  photo: ["evidence", "points", "list"],
  statement: ["quote", "points", "list"],
  quote: ["statement", "points", "list"],
  fact: ["data", "statement", "points", "list"],
  evidence: ["data", "photo", "points", "list"],
  hierarchy: ["points", "list"],
}

/** The offered kinds a page of `kind` may be drawn as, in the order {@link landKind} tries them: the kind itself first when offered. */
export function landingCandidates(kind: PageKind, menu: Menu): PageKind[] {
  return [kind, ...KIND_LANDING[kind]].filter((candidate) => menu.content[candidate] !== undefined)
}

/**
 * Whether `layout` takes every component `slide` carries: each accepted by
 * one of its slots, each required slot given a component, and a full-body
 * component either alone or beside the companions the face declares. The
 * same questions validate's slot gates ask of the face, asked here before a
 * face is chosen rather than after.
 *
 * How many blocks fit is not asked. Room is the face's own business once
 * it holds the page: validate's density advice, and the face's step-aside
 * to the shared sheet when the drawing comes up short, answer it exactly
 * as they do for a page on its own kind's face.
 */
export function faceHoldsComponents(layout: LayoutDefinition, slide: Pick<Slide, "components">): boolean {
  const components = slide.components
  for (const component of components) {
    if (!layout.slots.some((slot) => slot.accepts === "any" || slot.accepts.includes(component.type))) return false
  }
  for (const slot of layout.slots) {
    if (slot.required !== true || slot.accepts === "any") continue
    const accepts = slot.accepts
    if (!components.some((component) => accepts.includes(component.type))) return false
  }
  // A full-body component owns the page. Beside anything else it needs a
  // face that sets it with companions of exactly those types.
  const fullBody = components.filter((component) => FULL_BODY_TYPES.has(component.type))
  if (fullBody.length > 0 && components.length > 1) {
    const companions = layout.fullBodyCompanions
    if (companions === undefined || fullBody.length > 1) return false
    if (!components.every((component) => FULL_BODY_TYPES.has(component.type) || companions.includes(component.type))) return false
  }
  return true
}

/**
 * The kind whose menu entry draws a content page: the first of its own kind
 * and the stand-ins in {@link KIND_LANDING}, in that order and as the menu
 * offers them, whose face takes the page's components, otherwise the first
 * offered. Undefined only when the menu offers none of them.
 *
 * `faceOf` reads a menu entry's face from the registry, passed in so this
 * module stays a pure function of its arguments.
 */
export function landKind(
  kind: PageKind,
  slide: Pick<Slide, "components" | "placeholder">,
  menu: Menu,
  faceOf: (id: string) => LayoutDefinition | undefined,
): PageKind | undefined {
  const candidates = landingCandidates(kind, menu)
  // A page with no components yet (a placeholder, a page still being
  // written) gives nothing to choose by: it takes its own kind's face when
  // offered, else the nearest stand-in, and validate says what that face
  // still needs.
  if (slide.placeholder === true || slide.components.length === 0) return candidates[0]
  for (const candidate of candidates) {
    const layout = faceOf(menu.content[candidate]!.face)
    if (layout !== undefined && faceHoldsComponents(layout, slide)) return candidate
  }
  return candidates[0]
}
