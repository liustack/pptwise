/**
 * What a cover, chapter or ending page loses when its face draws it, asked
 * by drawing it.
 *
 * A boundary face has no step-aside sheet to give a page to. What it cannot
 * set it cuts and marks (`data-truncated`) or leaves off and marks
 * (`data-dropped`), and the author used to learn of either from the audit
 * or the export, after the deck was written. The heading has a declared fit
 * of its own (`../layouts/heading-set.ts`). The rest of what a face sets
 * does not, and how much room it gets moves with everything else on the
 * page: a subheading sits beside a button whose width is the author's own
 * words, a row of cards stands under however many lines the heading took.
 * No number declared beside the face could say that without drawing the
 * page again in other code.
 *
 * So validate asks the face's own drawing, the same one the export reads
 * (`slideToSvgMarkup`), with the marks the export and the audit read
 * (`cutLines`, `data-dropped`). A page validate passes is then one the face
 * draws without those marks, by construction.
 *
 * A content page is asked the same drawing through {@link drawnLoss}, the
 * step-aside included (`./content-loss.ts`).
 */
import type { PptxIR, Slide } from "@/ir"
import { truncationSources } from "../ir/truncation-tiers"
import { prefixOf } from "../layouts/text-room"
import type { ThemeDefinition } from "../themes/definitions"
import { cutLines } from "./cut-fields"
import { droppedIn, slideToSvgMarkup, type SlideDrops } from "./render-slide"
import { parseSvgRoot } from "./serialize"

/** What one drawing of a page lost: how much it declared dropped and in what units, and which of the page's fields it cut. */
export interface PageLoss {
  dropped: number
  drops: SlideDrops["drops"]
  /** The slide fields a cut line came from (`heading`, `subheading`, `components.0.items.2`). */
  cut: readonly string[]
  /** Those of them a reader needs whole (`../ir/truncation-tiers.ts`), once each. */
  hardCut: readonly string[]
}

/**
 * What each page of a deck object lost, by page and theme. validate's gates
 * ask the same page more than once (a heading's room and a block's loss
 * both start from the page as written, and a subheading is asked as
 * written), and a deck object here is never changed after it is drawn:
 * validate draws the deck it parsed, and every variant it asks about is a
 * new object (`withPageFields`, `withBlockText`). So each page is drawn
 * once per deck object.
 */
const DRAWN = new WeakMap<PptxIR, Map<number, Map<ThemeDefinition, PageLoss>>>()

/** Draw page `index` of `ir` and read what it lost. */
export function drawnLoss(ir: PptxIR, index: number, theme: ThemeDefinition): PageLoss {
  let pages = DRAWN.get(ir)
  if (pages === undefined) DRAWN.set(ir, (pages = new Map()))
  let themes = pages.get(index)
  if (themes === undefined) pages.set(index, (themes = new Map()))
  const known = themes.get(theme)
  if (known !== undefined) return known
  const loss = drawPageLoss(ir, index, theme)
  themes.set(theme, loss)
  return loss
}

const WHOLE: PageLoss = { dropped: 0, drops: [], cut: [], hardCut: [] }

function drawPageLoss(ir: PptxIR, index: number, theme: ThemeDefinition): PageLoss {
  const slide = ir.slides[index]!
  const markup = slideToSvgMarkup(ir, slide, index, theme)
  if (!markup.includes("data-dropped") && !markup.includes('data-truncated="1"')) return WHOLE
  const root = parseSvgRoot(markup)
  const lines = cutLines(root, slide)
  return {
    ...droppedIn(root),
    cut: lines.flatMap((line) => (line.field === undefined ? [] : [line.field])),
    hardCut: [...new Set(lines.flatMap((line) => (line.tier === "hard" && line.field !== undefined ? [line.field] : [])))],
  }
}


/** `ir` with page `index`'s own fields replaced, a field set to undefined taken off: `ir` itself when they are already so. */
export function withPageFields(ir: PptxIR, index: number, fields: Partial<Pick<Slide, "heading" | "subheading">>): PptxIR {
  const current = ir.slides[index]! as unknown as Record<string, unknown>
  if (Object.entries(fields).every(([key, value]) => current[key] === value && (value !== undefined || !(key in current)))) return ir
  const slides = ir.slides.map((slide, i) => {
    if (i !== index) return slide
    const next = { ...slide, ...fields } as Record<string, unknown>
    for (const [key, value] of Object.entries(fields)) if (value === undefined) delete next[key]
    return next as unknown as Slide
  })
  return { ...ir, slides }
}

/**
 * How a face sets a subheading on this page: whole, cut (a cut line from
 * the subheading), or declined (the page drops more with it than without
 * it).
 */
export type SubheadingVerdict = "whole" | "cut" | "declined"

/**
 * The page's subheading verdict for any text in its place, the rest of the
 * page as it stands. The page without a subheading is drawn at most once,
 * to tell what the subheading itself costs from what the page drops anyway.
 */
export function subheadingSet(ir: PptxIR, index: number, theme: ThemeDefinition): (text: string) => SubheadingVerdict {
  let bare: number | undefined
  return (text) => {
    const loss = drawnLoss(withPageFields(ir, index, { subheading: text }), index, theme)
    if (loss.cut.includes("subheading")) return "cut"
    if (loss.dropped === 0) return "whole"
    bare ??= drawnLoss(withPageFields(ir, index, { subheading: undefined }), index, theme).dropped
    return loss.dropped > bare ? "declined" : "whole"
  }
}

/**
 * Whether the page's heading takes room its face needs for the rest of the
 * page: a row of cards that stands under however many lines the heading
 * took, and is left off when a longer heading pushes it past the foot.
 *
 * Asked by drawing the page under the heading's first character or word.
 * When that drops less than the page as written, the heading's length is
 * what costs the rest, and the answer is a test for any heading in its
 * place: does the page drop no more than under that shortest one. Undefined
 * when the page drops nothing, or drops as much under any heading.
 */
export function headingCrowding(ir: PptxIR, index: number, theme: ThemeDefinition): ((heading: string) => boolean) | undefined {
  const heading = ir.slides[index]!.heading ?? ""
  const dropped = drawnLoss(ir, index, theme).dropped
  if (dropped === 0) return undefined
  const floor = drawnLoss(withPageFields(ir, index, { heading: prefixOf(heading, 1) }), index, theme).dropped
  if (floor >= dropped) return undefined
  return (text) => drawnLoss(withPageFields(ir, index, { heading: text }), index, theme).dropped <= floor
}

/** One piece of text a page's components carry, at its path in the slide (`components.0.items.2.text`). */
export interface BlockText {
  field: string
  text: string
}

/** `ir` with the text at `field` of page `index` replaced. */
export function withBlockText(ir: PptxIR, index: number, field: string, text: string): PptxIR {
  const slide = structuredClone(ir.slides[index]!) as unknown as Record<string, unknown>
  const path = field.split(".")
  let at: Record<string, unknown> = slide
  for (const key of path.slice(0, -1)) at = at[key] as Record<string, unknown>
  at[path[path.length - 1]!] = text
  return { ...ir, slides: ir.slides.map((s, i) => (i === index ? (slide as unknown as Slide) : s)) }
}

/** `ir` with each of `texts` of page `index` cut to its first character or word. */
function withShortTexts(ir: PptxIR, index: number, texts: readonly BlockText[]): PptxIR {
  return texts.reduce((deck, { field, text }) => withBlockText(deck, index, field, prefixOf(text, 1)), ir)
}

/**
 * The texts in the page's blocks that are too long for the face to draw
 * them, each with a test for any text in its place.
 *
 * A face that sets a list item as a one-line label, a button's words on one
 * pill, a card's line in its card, leaves the block off when a text does
 * not fit, and the mark it leaves says only that the block is gone. So the
 * page is drawn with every text of its blocks cut to its first character or
 * word. When that drops less, the words are what cost the block, and each
 * text that drops more on its own, every other one still cut short, is one
 * the face cannot hold. Undefined when the page drops nothing, or drops as
 * much with every text that short (the block's shape or count is what the
 * face turns away, not its words).
 */
export function blockTextCrowding(ir: PptxIR, index: number, theme: ThemeDefinition): { field: string; text: string; holds: (text: string) => boolean }[] | undefined {
  const slide = ir.slides[index]!
  const texts: BlockText[] = truncationSources(slide)
    .filter((source) => source.tier === "hard" && source.field.startsWith("components."))
    .map(({ field, text }) => ({ field, text }))
  if (texts.length === 0) return undefined
  const dropped = drawnLoss(ir, index, theme).dropped
  if (dropped === 0) return undefined
  const short = withShortTexts(ir, index, texts)
  const floor = drawnLoss(short, index, theme).dropped
  if (floor >= dropped) return undefined
  return texts.flatMap(({ field, text }) => {
    const holds = (candidate: string) => drawnLoss(withBlockText(short, index, field, candidate), index, theme).dropped <= floor
    return holds(text) ? [] : [{ field, text, holds }]
  })
}

/**
 * How much more page `index` drops with its blocks than without them: what
 * the face leaves off of the blocks themselves, or of what they push off
 * the page. A page field the face cannot set (a stamp, a kicker) drops as
 * much either way and is not counted.
 */
export function blocksLoss(ir: PptxIR, index: number, theme: ThemeDefinition): number {
  const dropped = drawnLoss(ir, index, theme).dropped
  if (dropped === 0) return 0
  const bare = { ...ir, slides: ir.slides.map((s, i) => (i === index ? { ...s, components: [] } : s)) }
  return dropped - drawnLoss(bare, index, theme).dropped
}

/** The page's own fields besides its heading, any of which a face may set beside the page's blocks. */
export const PAGE_FIELDS_BESIDE_BLOCKS = ["subheading", "kicker", "fields", "stamp", "tag", "ballot", "years", "stage", "footnote", "decor"] as const

/**
 * The page fields of page `index` that cost the face its blocks: with the
 * field taken off, the page leaves less of its blocks off. binder-ending,
 * say, draws its cards with a ballot's boxes but has no line for a
 * ballot's signature, and leaves the cards off when one is asked for.
 */
export function fieldsCrowdingBlocks(ir: PptxIR, index: number, theme: ThemeDefinition, loss: number): string[] {
  const slide = ir.slides[index]! as unknown as Record<string, unknown>
  return PAGE_FIELDS_BESIDE_BLOCKS.filter((field) => {
    if (slide[field] === undefined) return false
    const without = { ...slide }
    delete without[field]
    const deck = { ...ir, slides: ir.slides.map((s, i) => (i === index ? (without as unknown as Slide) : s)) }
    return blocksLoss(deck, index, theme) < loss
  })
}
