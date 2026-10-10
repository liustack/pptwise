/**
 * What a content page loses when it is drawn, and what an author could take
 * off to keep the rest, asked by drawing it.
 *
 * A content face that cannot hold a page steps aside to the shared sheet
 * (`./step-aside.tsx`), and the sheet takes the page only when it draws it
 * whole. When neither can, the face keeps the page and leaves the loss
 * declared: a `data-dropped` mark the export refuses, or a hard field cut
 * (`../ir/truncation-tiers.ts`) the audit names. validate used to pass such
 * a page. A body slot that takes any block declares no room: how much a
 * page holds moves with the face's band, the heading's lines, the words in
 * each card and the count of them, and no number beside the face could say
 * that without drawing the page again in other code.
 *
 * So validate asks the drawing the export reads, through the same
 * {@link drawnLoss} the cover, chapter and ending gates ask
 * (`./boundary-loss.ts`): `slideToSvgMarkup`, step-aside included, read
 * with `droppedIn` and `cutLines`. A content page validate passes is one its
 * face, or the sheet it steps aside to, draws whole, by construction.
 *
 * Content pages are most of a deck, so what to tell the author is found
 * with one more drawing of a page at most ({@link contentRemedy}). When that
 * drawing does not settle it, the message says what the page would lose and
 * stops there.
 */
import type { PptxIR, Slide } from "@/ir"
import { componentJsonSchema } from "../ir/json-schema"
import { prefixOf } from "../layouts/text-room"
import type { ThemeDefinition } from "../themes/definitions"
import { drawnLoss, withBlockText, type PageLoss } from "./boundary-loss"
import type { DropKind } from "./drop-marker"

/** Whether a drawing lost anything an author wrote: a declared drop, or a cut in a field a reader needs whole. */
export function losesContent(loss: PageLoss): boolean {
  return loss.dropped > 0 || loss.hardCut.length > 0
}

/** Draw content page `index` of `ir` as the export will, the step-aside included, and read what it lost. */
export function contentLoss(ir: PptxIR, index: number, theme: ThemeDefinition): PageLoss {
  return drawnLoss(ir, index, theme)
}

/**
 * Lists a block holds that refer to one another by position or by id: a
 * flowchart's nodes and the edges between them, a table's columns and every
 * row's cells. Taking items off one of these draws a different block, not a
 * shorter one, so a page is never told to keep fewer of them.
 */
const LINKED_LISTS = new Set(["nodes", "edges", "links", "columns", "x_labels", "y_labels", "values", "lanes", "criteria", "axis_labels", "bands", "markers", "changes", "gaps", "periods", "highlight_lines", "operands", "sets", "series", "data"])

/** Units a block counts its own list in: a drop in one of these is the list running longer than the page draws. */
const LIST_UNITS = new Set<DropKind>(["item", "row", "card", "step", "event", "stat", "source"])

/** What an author can take off to keep the rest of the page whole, found by drawing the page without it. */
export type ContentRemedy =
  /** Texts the page cuts, which it sets whole at their first character or word: they are too long. */
  | { kind: "shorten"; fields: readonly string[] }
  /** A list the page draws `keep` of. */
  | { kind: "list"; field: string; type: string; key: string; count: number; keep: number }
  /** Blocks the page leaves off: it draws the first `keep` of its `count`. */
  | { kind: "blocks"; keep: number; count: number }
  /** Page fields the face has no place for beside the rest of the page. */
  | { kind: "fields"; fields: readonly string[] }

/** The page fields a face declares it could not set, by the unit it declares them in. */
export const PAGE_FIELD_DROPS: Partial<Record<DropKind, "stamp" | "tag" | "footnote">> = { stamp: "stamp", tag: "tag", footnote: "footnote" }

/** The fewest items each list of a block's schema allows, by block type, read from its JSON schema once. */
const LIST_FLOORS = new Map<string, Readonly<Record<string, number>>>()

function listFloors(type: string): Readonly<Record<string, number>> {
  let floors = LIST_FLOORS.get(type)
  if (floors === undefined) {
    const schema = componentJsonSchema(type) as { properties?: Record<string, { minItems?: number }> }
    floors = Object.fromEntries(Object.entries(schema.properties ?? {}).map(([key, prop]) => [key, prop.minItems ?? 1]))
    LIST_FLOORS.set(type, floors)
  }
  return floors
}

/** One list on the page that could run shorter by `by` items and stay a list its block's schema accepts. */
function shortenableLists(slide: Slide, by: number): { c: number; key: string; length: number }[] {
  const out: { c: number; key: string; length: number }[] = []
  slide.components.forEach((component, c) => {
    const floors = listFloors(component.type)
    for (const [key, value] of Object.entries(component)) {
      if (!Array.isArray(value) || LINKED_LISTS.has(key)) continue
      const floor = Math.max(1, floors[key] ?? 1)
      if (value.length - by >= floor) out.push({ c, key, length: value.length })
    }
  })
  return out
}

/** `ir` with page `index` replaced by `slide`. */
function withSlide(ir: PptxIR, index: number, slide: Slide): PptxIR {
  return { ...ir, slides: ir.slides.map((s, i) => (i === index ? slide : s)) }
}

/**
 * What would keep the page whole, asked with one more drawing of it at most,
 * or undefined when that drawing does not settle it.
 *
 * - A page that only cuts texts is drawn with each of them cut to its first
 *   character or word. When that page is whole, their length is the cost.
 * - A page that only leaves off page fields its face has no place for (a
 *   stamp, a tag, a source line) is drawn without them. When that page is
 *   whole, those fields are the cost.
 * - A page that only leaves whole blocks off is drawn without as many of
 *   its last blocks. When that page is whole, it holds the blocks before.
 * - A page that only leaves items of a list off, with one list on it that
 *   could run that much shorter, is drawn with that list shorter. When that
 *   page is whole, the list is longer than the page draws.
 *
 * Anything else (a drop and a cut together, a drop in units no list counts,
 * two lists either of which could be the one) is not guessed at.
 */
export function contentRemedy(ir: PptxIR, index: number, theme: ThemeDefinition, loss: PageLoss): ContentRemedy | undefined {
  const slide = ir.slides[index]!
  if (loss.dropped === 0) {
    const short = loss.hardCut.reduce((deck, field) => withBlockText(deck, index, field, prefixOf(textAt(slide, field), 1)), ir)
    return losesContent(drawnLoss(short, index, theme)) ? undefined : { kind: "shorten", fields: loss.hardCut }
  }
  if (loss.hardCut.length > 0) return undefined
  if (loss.drops.every(({ kind }) => PAGE_FIELD_DROPS[kind] !== undefined)) {
    const fields = [...new Set(loss.drops.map(({ kind }) => PAGE_FIELD_DROPS[kind]!))]
    const without = { ...slide } as Record<string, unknown>
    for (const field of fields) delete without[field]
    return losesContent(drawnLoss(withSlide(ir, index, without as unknown as Slide), index, theme)) ? undefined : { kind: "fields", fields }
  }
  if (loss.drops.every(({ kind }) => kind === "component")) {
    const count = slide.components.length
    const keep = count - loss.dropped
    if (keep < 1) return undefined
    const fewer = withSlide(ir, index, { ...slide, components: slide.components.slice(0, keep) })
    return losesContent(drawnLoss(fewer, index, theme)) ? undefined : { kind: "blocks", keep, count }
  }
  if (!loss.drops.every(({ kind }) => LIST_UNITS.has(kind))) return undefined
  const lists = shortenableLists(slide, loss.dropped)
  if (lists.length !== 1) return undefined
  const { c, key, length } = lists[0]!
  const keep = length - loss.dropped
  const component = slide.components[c]!
  const shorter = { ...component, [key]: (component as unknown as Record<string, unknown[]>)[key]!.slice(0, keep) } as unknown as Slide["components"][number]
  const page = withSlide(ir, index, { ...slide, components: slide.components.map((other, k) => (k === c ? shorter : other)) })
  if (losesContent(drawnLoss(page, index, theme))) return undefined
  return { kind: "list", field: `components.${c}.${key}`, type: component.type, key, count: length, keep }
}

/** The text at `field` of `slide` (`heading`, `components.0.items.2.label`). */
function textAt(slide: Slide, field: string): string {
  let at: unknown = slide
  for (const key of field.split(".")) at = (at as Record<string, unknown>)[key]
  return at as string
}
