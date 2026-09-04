/**
 * What a slide lost, and in what unit.
 *
 * Recorded, never painted. The visible overflow count this used to draw was a
 * maintainer's debug affordance that reached customer slides (visual review
 * 2026-08-15) and nobody outside this repo can read it. A slide tells its
 * story with the least language it can: it carries no count of what it left
 * out, no trailing sign, no bookkeeping of any kind. So the drop is
 * invisible on the page, which is exactly why the export refuses to ship it
 * (`checkContentDropGate`, `../pptx/generate.ts`).
 *
 * `data-dropped` is the whole protocol, and it means both things at once:
 * content was lost, and the slide does not say so. There is no second,
 * gentler category — every component that cuts its own items declares the
 * same way and stops the same export (`components/bullets.tsx`,
 * `data-table.tsx`, `timeline.tsx` and the rest). Visible truncation of the
 * text itself stays separate and stays allowed: that is `data-truncated`.
 *
 * `data-dropped-kind` says what the count counts. One attribute for every
 * loss meant one noun for every loss, and "14 content blocks" was simply
 * untrue of a chart that had dropped 14 series names from its legend: an
 * author told to look for fourteen blocks on a one-component page is being
 * sent to the wrong place. Every declaration names its own unit, and the
 * export error repeats it back.
 */

/** The unit a `data-dropped` count is counted in. */
export type DropKind =
  | "component"
  | "item"
  | "row"
  | "card"
  | "step"
  | "source"
  | "event"
  | "stat"
  | "label"
  | "series-name"
  | "value-label"
  | "stage-name"
  | "title-character"

const DROP_UNITS: Record<DropKind, readonly [singular: string, plural: string]> = {
  component: ["content block", "content blocks"],
  item: ["item", "items"],
  row: ["row", "rows"],
  card: ["card", "cards"],
  step: ["step", "steps"],
  source: ["source", "sources"],
  event: ["event", "events"],
  stat: ["stat", "stats"],
  label: ["label", "labels"],
  "series-name": ["series name", "series names"],
  "value-label": ["value label", "value labels"],
  "stage-name": ["stage name", "stage names"],
  "title-character": ["title character", "title characters"],
}

/** `14 series names`, `1 content block` — the phrase an error message uses. */
export function dropPhrase(kind: DropKind, count: number): string {
  const unit = DROP_UNITS[kind] ?? DROP_UNITS.component
  return `${count} ${count === 1 ? unit[0] : unit[1]}`
}

/** A kind read back off markup, falling back to the page-level unit. */
export function parseDropKind(raw: string | null | undefined): DropKind {
  return raw !== null && raw !== undefined && raw in DROP_UNITS ? (raw as DropKind) : "component"
}

/**
 * Page-level content loss: `layoutContentFit` could not fit `count` blocks
 * into the content area and left them out entirely.
 */
export function DroppedContentMarker({ count, kind = "component" }: { count: number; kind?: DropKind }) {
  if (count <= 0) return null
  return <g data-dropped={count} data-dropped-kind={kind} />
}
