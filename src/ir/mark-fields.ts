/**
 * The component fields a `**…**` mark is drawn in.
 *
 * A mark is the author saying "this run matters", and a field that draws it
 * sets the run in the theme's emphasis. Most fields draw their text as
 * written, and there a mark came out as four asterisks around the phrase, in
 * steps, icon cards, insight panels, gantt and kpi labels, tables and
 * timelines alike, with nothing on the page to say a renderer had missed it.
 * Which fields draw a mark is one list, here: validate refuses a mark in any
 * other component field (`markOutsideMarkedField`), the deck audit and the
 * gallery's L1 report one that reaches a page anyway (`printed-marks.ts`),
 * and docs/ir.md and the skill's component reference name the same fields.
 *
 * A field joins this list when every face and composition that draws it
 * paints its marks, never before: half a list is how the asterisks got onto
 * the page.
 *
 * Keys are a component type and the path to the field inside it, an array
 * index written `[]`.
 */
export const MARKED_COMPONENT_FIELDS: ReadonlySet<string> = new Set([
  "paragraph.text",
  "bullets.items.[]",
  "callout.text",
  "blockquote.text",
  "comparison.rows.[].label",
  "comparison.rows.[].cells.[]",
  "numbered_cards.items.[].title",
  "numbered_cards.items.[].text",
  "verdict_banner.text",
  "kpi_cards.items.[].value",
  "image.caption",
  "image_grid.items.[].caption",
  "steps.items.[].title",
  "steps.items.[].text",
  "icon_cards.items.[].title",
  "icon_cards.items.[].text",
  "kpi_cards.items.[].note",
  "insight_panel.title",
])

/** A mark that paints: two asterisks, a run that starts with a non-space, two asterisks. */
const MARK = /\*\*(?=\S)[\s\S]*?\*\*/u

/** Whether `text` carries a `**…**` mark. */
export function carriesMark(text: string): boolean {
  return MARK.test(text)
}

/** The key of the field at `path` inside a component of `type`: `kpi_cards.items.[].label`. */
export function markFieldKey(type: string, path: readonly string[]): string {
  return [type, ...path.map((segment) => (/^\d+$/.test(segment) ? "[]" : segment))].join(".")
}

/** Whether a field of a component draws a mark it carries. */
export function fieldDrawsMarks(type: string, path: readonly string[]): boolean {
  return MARKED_COMPONENT_FIELDS.has(markFieldKey(type, path))
}
