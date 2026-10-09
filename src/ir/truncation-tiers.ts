import type { Slide } from "./index"

/**
 * What a cut costs the reader, by the field the cut text came from.
 *
 * A face that cannot fit a line cuts it and says so (`data-truncated`).
 * That declaration used to be the whole answer, whatever was cut. It is
 * enough for furniture: a kicker over a heading, a tag in a card's corner,
 * a stamp. It is not enough for the words a reader has to have whole: a
 * heading that stops at "the board should", a source line that loses the
 * study it names, a sentence in a card that ends on an ellipsis.
 *
 * So the fields fall in two tiers, and this is the one list of them:
 *
 * - **hard**: the page's heading, subheading and source line (`footnote`),
 *   and every word a component carries except its tags. A face that cuts
 *   one of these gives the page to the shared step-aside sheet
 *   (`render/step-aside.tsx`), which draws the heading on up to two lines,
 *   the source on up to two and the components in the whole body, when
 *   that sheet draws every hard field whole and loses nothing
 *   (`stepAsideForCut`, asked by `slideToSvgMarkup` in
 *   `render/render-slide.tsx`). When it cannot either, and on a cover,
 *   chapter or ending page, which no shared sheet draws, the face keeps the
 *   page and the cut stays declared.
 * - **declared**: `kicker`, `fields`, `stamp`, `tag`, `ballot`, `stage` and
 *   `decor`, and a component's tag. A cut there stays a declaration. The
 *   step-aside sheet has no place for these page fields at all, so stepping
 *   aside could only lose more of them: a page that carries one keeps its
 *   face whatever is cut.
 *
 * Text a face sets that is not one of the page's own fields (a section name
 * taken from the chapter before, the organization, a page number) is the
 * face's furniture and declared too.
 *
 * The audit reads the same tiers (`content-truncated` names the field and
 * its tier, `audit/deck-audit.ts`), through `render/cut-fields.ts`, which
 * matches each cut line on a rendered page against {@link truncationSources}.
 */
export type TruncationTier = "hard" | "declared"

/** The page fields, each with its tier. `years` holds numbers only, and `notes` is never painted. */
export const PAGE_FIELD_TIERS = {
  heading: "hard",
  subheading: "hard",
  footnote: "hard",
  kicker: "declared",
  fields: "declared",
  stamp: "declared",
  tag: "declared",
  ballot: "declared",
  stage: "declared",
  decor: "declared",
} as const satisfies Record<string, TruncationTier>

/** The page fields the step-aside sheet has no place for. A page that carries one keeps its face. */
export const FIELDS_THE_SHEET_CANNOT_DRAW = ["kicker", "fields", "stamp", "tag", "ballot", "stage", "years"] as const

/** A component field's tier: hard, except the words of a tag (`items[].tag.text`, `matrix.items[].tag`). */
export function componentFieldTier(path: readonly (string | number)[]): TruncationTier {
  return path.includes("tag") ? "declared" : "hard"
}

/** One piece of text a page's author wrote, where it sits in the slide, and its tier. */
export interface TruncationSource {
  /** The field's path in the slide, such as `heading` or `components.1.items.0.text`. */
  readonly field: string
  readonly tier: TruncationTier
  readonly text: string
}

/** Every string in `value`, with its path below `path`. */
function strings(value: unknown, path: (string | number)[], out: { path: (string | number)[]; text: string }[]): void {
  if (typeof value === "string") {
    if (value.trim() !== "") out.push({ path, text: value })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => strings(item, [...path, i], out))
    return
  }
  if (value !== null && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) strings(item, [...path, key], out)
  }
}

/** Keys that hold an identifier or a choice from a list, never words a reader sees. */
const NOT_WORDS = new Set(["type", "kind", "asset_id", "logo_asset_id", "icon", "variant", "chart_type", "direction", "key", "id", "fit", "status", "style", "tone", "basis", "evidence", "plot", "axis", "side", "arrangement", "image_side", "intensity"])

/**
 * Every piece of text `slide` carries that a face may set, with its tier:
 * the page fields in {@link PAGE_FIELD_TIERS}, then each component's words.
 */
export function truncationSources(slide: Slide): TruncationSource[] {
  const out: TruncationSource[] = []
  const page = slide as unknown as Record<string, unknown>
  for (const [name, tier] of Object.entries(PAGE_FIELD_TIERS)) {
    const found: { path: (string | number)[]; text: string }[] = []
    strings(page[name], [name], found)
    for (const { path, text } of found) {
      if (NOT_WORDS.has(String(path[path.length - 1]))) continue
      out.push({ field: path.join("."), tier, text })
    }
  }
  slide.components.forEach((component, c) => {
    const found: { path: (string | number)[]; text: string }[] = []
    strings(component, [], found)
    for (const { path, text } of found) {
      if (NOT_WORDS.has(String(path[path.length - 1]))) continue
      out.push({ field: ["components", c, ...path].join("."), tier: componentFieldTier(path), text })
    }
  })
  return out
}
