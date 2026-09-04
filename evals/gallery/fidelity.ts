/**
 * Corpus-level content-fidelity scan.
 *
 * The rule a face lives by: it renders authored content completely, or it
 * declines the page. It never takes part of a component and drops the rest,
 * and it never conscripts `slide.heading` / `slide.subheading` to stand in
 * for content an author wrote into a component.
 *
 * This module states that rule in a form a machine can re-check on every
 * commit. For one rendered page it collects every text an author wrote into
 * a component, then asks of each one:
 *
 *   1. does some block of the page paint it, or
 *   2. does that block paint its opening and say on its own element that the
 *      rest was cut (`data-truncated`, an ellipsis a reader can see), or
 *   3. did the component that wrote it declare the loss (`data-dropped`, and
 *      `checkContentDropGate` refuses to export the deck)?
 *
 * Anything else is content that left the author's hands and reached nobody,
 * with no trace on the page and no error anywhere. That is the failure this
 * scan exists to make impossible to reintroduce.
 *
 * The comparison deliberately normalizes hard (case, whitespace, the marks
 * a fit chain adds): a face is free to uppercase a label, wrap a sentence
 * over three lines, or set a quote one glyph per column. What it is not free
 * to do is lose the words.
 *
 * Three things a scan of this shape gets wrong if it is written the obvious
 * way, and how each is answered here. All three were live defects, proven on
 * constructed pages, before this file was rewritten to close them.
 *
 *   - **The heading is not evidence.** Flattening the page into one string
 *     makes `heading: "Same conclusion"` vouch for a paragraph reading
 *     "Same conclusion" that no face ever drew, which is the exact
 *     substitution the rule exists to forbid. `consumeChrome` below spends
 *     one rendering of the heading and one of the subheading against the
 *     elements that drew them, and what is spent leaves the haystack.
 *
 *   - **A declaration belongs to a component.** One `data-dropped` anywhere
 *     used to excuse every loss on the page, so a chart that declared three
 *     cut labels also covered a paragraph that reached nobody. A marker now
 *     speaks for the block it sits in (`licenses`).
 *
 *   - **Blocks do not add up.** `<text>A</text>` in the footer and
 *     `<text>BC</text>` in the body used to prove an authored `ABC` had been
 *     painted. Matching now runs against one block's own text
 *     (`paintedBlocks`), never a page-wide concatenation.
 */

import type { Component, PptxIR, Slide } from "@/ir"
import type { LayoutDefinition } from "@/layouts/registry"
import { stripEmphasis } from "@/render/emphasis"
import { resolveEffectiveFace } from "@/render/layout-selection"
import { getPlatform } from "@/platform/registry"

/**
 * Component keys whose string value is machinery, not prose: a discriminator,
 * an asset handle, an icon name, a node id an edge points at, the lookup key
 * a table cell is stored under, or alt text (which reaches the page as an
 * accessibility attribute, never as painted glyphs).
 *
 * Everything not named here is treated as authored text and must reach the
 * page. Adding a key is a decision to stop checking it, so each one carries
 * its reason.
 */
const NON_TEXT_KEYS = new Set([
  // Fixed-vocabulary switches. Every one of these is a `z.enum` (or the
  // `z.literal` discriminator) in `src/ir/components/*.ts`: the author picks
  // one of a handful of words and the renderer answers with an arrow, a tint,
  // a crop, or a shape. The word itself is never meant to reach the page.
  "type",
  "kind",
  "tone",
  "style",
  "variant",
  "layout",
  "direction",
  "emphasis",
  "align",
  "delta",
  "fit",
  "intensity",
  "position",
  "elements",
  "transition",
  "image_side",
  "device",
  "chart_type",
  // Handles and pointers, not prose.
  "asset_id", // asset handle
  "icon", // icon name from a fixed set
  "alt", // accessibility attribute, carried as aria-label, never painted
  "url", // link target
  "ref", // citation ref, painted only where a face opts in
  "from", // flowchart edge endpoint: a node id
  "to", // flowchart edge endpoint: a node id
  "key", // data_table column key: the cell lookup, not the header text
  "id", // any identity field
  "language", // code highlighter switch, not a line of the listing
])

export interface AuthoredText {
  /** Where in the slide's components this string was written. */
  readonly path: string
  /** The author's text, emphasis markers stripped. */
  readonly text: string
  /** Index into `slide.components` of the component that wrote it. */
  readonly component: number
}

function walk(value: unknown, path: string, component: number, out: AuthoredText[]): void {
  if (typeof value === "string") {
    const text = stripEmphasis(value).trim()
    if (text.length > 0) out.push({ path, text, component })
    return
  }
  if (Array.isArray(value)) {
    value.forEach((entry, i) => walk(entry, `${path}[${i}]`, component, out))
    return
  }
  if (value !== null && typeof value === "object") {
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      if (NON_TEXT_KEYS.has(key)) continue
      walk(entry, `${path}.${key}`, component, out)
    }
  }
}

/** Every authored string in one slide's components, with its IR path. */
export function authoredTexts(slide: Slide): AuthoredText[] {
  const out: AuthoredText[] = []
  slide.components.forEach((component: Component, i) => {
    walk(component, `components[${i}](${component.type})`, i, out)
  })
  return out
}

/**
 * Fold away every difference a face is allowed to introduce: letter case,
 * any whitespace (a wrap turns one space into a line break), the ellipsis a
 * fit chain appends, and the quotation furniture a quote face paints around
 * the words it was given.
 *
 * The one punctuation mark folded away is the fullwidth comma. Classical
 * vertical setting carries it as the break between columns rather than as a
 * glyph, so a column reading 春风 / 得意 has not lost the mark an author
 * typed between them. That is typography, not a lost word.
 *
 * Nothing else goes. A full stop, an enumeration comma, a colon, an
 * exclamation and a question mark each change what a line says: a face that
 * answers a question with an assertion, or drops the question mark
 * altogether, has not reproduced what its author wrote, and an exception
 * built for one column break must not cover for it.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/…/g, "")
    .replace(/[“”‘’"']/g, "")
    .replace(/，/g, "")
}

/**
 * `normalize` for a field it would otherwise erase entirely.
 *
 * A field written as nothing but the mark `normalize` folds has no normalized
 * form to look for, and calling an empty needle "found" is a pass no page
 * earned. Such a field is checked on its case- and whitespace-folded text
 * instead, punctuation and all.
 */
function needleOf(text: string): string {
  const folded = normalize(text)
  return folded.length > 0 ? folded : text.toLowerCase().replace(/\s+/g, "")
}

export interface PageFidelity {
  /** Authored texts with no trace on the page. */
  readonly missing: readonly AuthoredText[]
  readonly authored: number
}

function elementText(el: Element): string {
  return el.textContent ?? ""
}

/**
 * The elements that drew `slide.heading` and `slide.subheading`, spent one
 * rendering each.
 *
 * A face sets a heading as one `<text>`, as one per wrapped line, or as one
 * per glyph down a column, so the elements are matched against the heading in
 * document order and consumed until it is accounted for. Two rules cover
 * every shape the corpus draws: an element that is the next chunk of the
 * heading is spent whole, and an element that carries the rest of the heading
 * inside a longer line (a kicker joining heading and subheading with a
 * separator) gives up that much of itself and stays in the haystack for the
 * remainder.
 *
 * Spending exactly one rendering is what keeps this from over-reaching. A
 * page that paints the subheading in the header *and* a component field that
 * happens to read the same still has one element left over for the component,
 * which is what "the component reached the page" means.
 */
function consumeChrome(texts: readonly Element[], slide: Slide): Set<Element> {
  const spent = new Set<Element>()
  const available = new Map<Element, string>(texts.map((el) => [el, normalize(elementText(el))]))
  const chrome = [slide.heading, slide.subheading]
    .map((value) => normalize(stripEmphasis(value ?? "")))
    .filter((value) => value.length > 0)

  /** Try to spell `needle` out of the elements from `start` onwards, unbroken. */
  function runFrom(start: number, needle: string): number | null {
    let rest = needle
    let i = start
    for (; i < texts.length && rest.length > 0; i += 1) {
      const have = available.get(texts[i]!) ?? ""
      if (have.length === 0) return null
      if (rest.startsWith(have)) {
        rest = rest.slice(have.length)
        continue
      }
      // The element carried the rest of the heading inside a longer line: a
      // kicker joining heading and subheading with a separator. It gives up
      // that much of itself and stays on the page for the remainder.
      if (have.includes(rest)) return i
      // A cut heading paints its opening and marks the cut; the rest of it
      // was never on the page to spend.
      if (rest.startsWith(have.slice(0, -1)) && texts[i]!.hasAttribute("data-truncated")) return i
      return null
    }
    return rest.length === 0 ? i - 1 : null
  }

  for (const needle of chrome) {
    for (let start = 0; start < texts.length; start += 1) {
      if ((available.get(texts[start]!) ?? "").length === 0) continue
      const end = runFrom(start, needle)
      if (end === null) continue
      let rest = needle
      for (let i = start; i <= end; i += 1) {
        const el = texts[i]!
        const have = available.get(el) ?? ""
        const at = have.indexOf(rest)
        if (rest.length > 0 && at >= 0 && !rest.startsWith(have)) {
          available.set(el, have.slice(0, at) + have.slice(at + rest.length))
          rest = ""
        } else {
          rest = rest.slice(have.length)
          available.set(el, "")
        }
        if ((available.get(el) ?? "").length === 0) spent.add(el)
      }
      break
    }
  }
  return spent
}

/** Nearest ancestor-or-self carrying `data-audit-box`: one placed component. */
function boxOf(el: Element | null): Element | null {
  for (let node = el; node; node = node.parentElement) {
    if (node.hasAttribute?.("data-audit-box")) return node
  }
  return null
}

function ancestors(el: Element): Element[] {
  const chain: Element[] = []
  for (let node: Element | null = el; node; node = node.parentElement) chain.push(node)
  return chain.reverse()
}

/** Deepest element containing every one of `els`. */
function commonAncestor(els: readonly Element[]): Element | null {
  if (els.length === 0) return null
  let chain = ancestors(els[0]!)
  for (const el of els.slice(1)) {
    const other = ancestors(el)
    let i = 0
    while (i < chain.length && i < other.length && chain[i] === other[i]) i += 1
    chain = chain.slice(0, i)
  }
  const deepest = chain[chain.length - 1]
  if (!deepest) return null
  // A block of one element is the element itself; the marker a component
  // leaves is its sibling, not its child, so the block is the parent.
  return els.length === 1 && deepest === els[0] ? (deepest.parentElement ?? deepest) : deepest
}

function contains(scope: Element, el: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (node === scope) return true
  }
  return false
}

/**
 * One block of the page: an element, and the authored-side text under it.
 *
 * `all` is every text element in the subtree; `content` leaves out a
 * renderer's own counting. `code`'s line-number gutter prints a number before
 * each line of a listing, so the block reads "1const a = 12const b = 2" and a
 * six-line listing would be reported lost on every page that carries one, 28
 * of them, none a real loss. A gutter says so on its own elements
 * (`data-gutter`), so each block is read both ways and a needle found in
 * either reading has reached the page; a line actually dropped from the
 * listing is in neither.
 */
interface Block {
  readonly el: Element
  readonly all: readonly Element[]
  readonly content: readonly Element[]
}

/**
 * Every block whose text may be read as one run.
 *
 * A block that also contains a heading or subheading element is not one:
 * reading it as a run is what let page chrome vouch for component content.
 * The blocks that survive are the subtrees below the heading, which on a
 * rendered page are the face's own regions and, inside them, one
 * `data-audit-box` per placed component.
 */
function block(el: Element, texts: readonly Element[]): Block {
  return { el, all: texts, content: texts.filter((t) => !t.hasAttribute("data-gutter")) }
}

/**
 * The type signature of one painted text: family, size and anchor.
 *
 * Two neighbouring elements set in the same face at the same size are one
 * passage being wrapped. Two set differently are two different things on the
 * page, and reading them as one run is what let a footer glyph and a body
 * line spell out an authored string neither of them carried.
 */
function typeSignature(el: Element): string {
  return [
    el.getAttribute("font-size") ?? "",
    el.getAttribute("font-family") ?? "",
    el.getAttribute("text-anchor") ?? "",
  ].join("|")
}

function textsUnder(el: Element): Element[] {
  if (el.tagName === "text") return [el]
  return Array.from(el.querySelectorAll("text")) as Element[]
}

/**
 * Runs of neighbouring siblings a face set as one passage.
 *
 * Faces that paint a field beside their own heading rather than inside a
 * region of its own are ordinary: `ink`'s pull-quote sets a quote as one `<g>`
 * per vertical column and its attribution as loose glyphs, all siblings of
 * the heading's own glyphs. The subtree that holds a whole such field also
 * holds the heading, so subtree blocks alone cannot see it.
 *
 * A run is therefore built from what a renderer must keep constant across one
 * passage and cannot keep constant across two: the type signature above, one
 * `data-audit-box` (a run never spans two placed components), and no heading
 * or subheading element in the middle of it.
 */
function runBlocks(parent: Element, spent: ReadonlySet<Element>, out: Block[]): void {
  let run: Element[] = []
  let signature: string | null = null
  let box: Element | null | undefined
  const flush = () => {
    if (run.length > 1) out.push(block(parent, run))
    run = []
    signature = null
    box = undefined
  }
  for (const child of Array.from(parent.children) as Element[]) {
    const texts = textsUnder(child)
    // Decoration with no text of its own neither joins a run nor breaks one.
    if (texts.length === 0) continue
    // Page chrome ends the passage: a run may not read across the heading.
    if (texts.some((t) => spent.has(t))) {
      flush()
      continue
    }
    const signatures = new Set(texts.map(typeSignature))
    const boxes = new Set(texts.map((t) => boxOf(t)))
    if (signatures.size !== 1 || boxes.size !== 1) {
      flush()
      continue
    }
    const [ownSignature] = signatures
    const [ownBox] = boxes
    if ((signature !== null && signature !== ownSignature) || (box !== undefined && box !== ownBox)) {
      flush()
    }
    signature = ownSignature!
    box = ownBox!
    run.push(...texts)
  }
  flush()
}

function paintedBlocks(root: Element, spent: ReadonlySet<Element>): Block[] {
  const blocks: Block[] = []
  function visit(el: Element): { texts: Element[]; chrome: boolean } {
    if (el.tagName === "text") {
      const chrome = spent.has(el)
      return { texts: chrome ? [] : [el], chrome }
    }
    const texts: Element[] = []
    let chrome = false
    for (const child of Array.from(el.children) as Element[]) {
      const seen = visit(child)
      texts.push(...seen.texts)
      chrome = chrome || seen.chrome
    }
    if (!chrome && texts.length > 0) blocks.push(block(el, texts))
    if (chrome) runBlocks(el, spent, blocks)
    return { texts, chrome }
  }
  visit(root)
  // Every unspent text element is also a block of one, so a face that paints
  // a field as a lone `<text>` beside its heading is still read.
  for (const el of Array.from(root.querySelectorAll("text")) as Element[]) {
    if (spent.has(el)) continue
    blocks.push(block(el, [el]))
  }
  // A run cut inside a line of several is a block of its own: it is that one
  // field's opening, and reading it as part of the whole line would compare
  // the cut against text belonging to the runs beside it.
  for (const el of Array.from(root.querySelectorAll("tspan[data-truncated]")) as Element[]) {
    blocks.push(block(el, [el]))
  }
  return blocks
}

function joined(els: readonly Element[]): string {
  return normalize(els.map(elementText).join(""))
}

/**
 * Does this element say a cut ends here?
 *
 * A one-line fit marks its own `<text>`. A painter that measures several runs
 * into one line marks the run it cut, which is a `<tspan>` inside that text
 * (`architecture`'s layer items), so the mark is looked for underneath too.
 */
function isCut(el: Element): boolean {
  return el.hasAttribute("data-truncated") || el.querySelector("[data-truncated]") !== null
}

/** The two readings of one block, plus whether each ends on a declared cut. */
function readings(block: Block): { text: string; cut: boolean }[] {
  const forms: { text: string; cut: boolean }[] = []
  for (const els of [block.all, block.content]) {
    if (els.length === 0) continue
    forms.push({ text: joined(els), cut: isCut(els[els.length - 1]!) })
  }
  return forms
}

/**
 * Checks one rendered page against the texts its slide authored.
 *
 * `svg` must be the real render-chain output for `slide`. A page rendered any
 * other way proves nothing about what ships.
 */
export function checkPageFidelity(svg: string, slide: Slide): PageFidelity {
  const Parser = getPlatform().domParser ?? globalThis.DOMParser
  if (!Parser) throw new Error("DOMParser unavailable")
  const root = new Parser().parseFromString(svg, "image/svg+xml").documentElement

  const texts = Array.from(root.querySelectorAll("text")) as Element[]
  const spent = consumeChrome(texts, slide)
  const blocks = paintedBlocks(root, spent)
  const drops = Array.from(root.querySelectorAll("[data-dropped]")) as Element[]

  const authored = authoredTexts(slide)
  const unresolved: AuthoredText[] = []
  /** Elements that proved a field of this component reached the page. */
  const footprint = new Map<number, Element[]>()

  /**
   * Elements already standing as one field's visible cut.
   *
   * A cut element shows the opening of the one field it cut. Letting it also
   * vouch for a second field is how a paragraph fitted to "The first…" used
   * to prove that a callout reading "The first warning never drawn" had
   * reached the page: both needles open the same way, and neither the
   * fragment nor the page says which field it came from. One element, one
   * field.
   */
  const claimedCuts = new Set<Element>()

  /** The tightest block holding `needle` outright, if any block does. */
  function paintedIn(needle: string): Block | undefined {
    let found: Block | undefined
    for (const block of blocks) {
      if (!readings(block).some((form) => form.text.includes(needle))) continue
      // Prefer the tightest block that holds it: that is the one whose own
      // declarations speak for this component.
      if (!found || block.all.length < found.all.length) found = block
    }
    return found
  }

  /**
   * The tightest block that paints this field's opening and says on its own
   * last element that the rest was cut. A cut keeps the head, so a fragment
   * that is not this field's opening is not this field's cut.
   */
  function cutIn(needle: string): Block | undefined {
    let found: Block | undefined
    for (const block of blocks) {
      const tail = block.all[block.all.length - 1]
      if (!tail || claimedCuts.has(tail)) continue
      const shows = readings(block).some(
        (form) => form.cut && form.text.length >= 2 && needle.startsWith(form.text),
      )
      if (!shows) continue
      if (!found || block.all.length < found.all.length) found = block
    }
    return found
  }

  for (const entry of authored) {
    const needle = needleOf(entry.text)
    if (needle.length === 0) continue
    const painted = paintedIn(needle)
    const cut = painted ? undefined : cutIn(needle)
    const found = painted ?? cut
    if (!found) {
      unresolved.push(entry)
      continue
    }
    // Only a field that leant on the cut spends it. A field found painted in
    // full leaves the cut for whichever field it actually cut.
    if (cut) claimedCuts.add(cut.all[cut.all.length - 1]!)
    const seen = footprint.get(entry.component) ?? []
    seen.push(...found.all)
    footprint.set(entry.component, seen)
  }

  const scopes = new Map<number, Element | null>()
  for (const [component, els] of footprint) scopes.set(component, commonAncestor(els))

  /**
   * Which component each `data-audit-box` belongs to.
   *
   * `SvgContent` gives every component it places a box of its own, but the
   * box does not name it, and a short field can be found in a neighbour's
   * text by coincidence (a `numbered_cards` whose "第三季度" also appears in
   * the callout beside it). The box goes to whichever component put strictly
   * the most text in it, so one borrowed word does not make a component look
   * placed.
   */
  const owner = new Map<Element, number>()
  /** Every box that holds at least one painted field, whoever it belongs to. */
  const inked = new Set<Element>()
  {
    const ink = new Map<Element, Map<number, number>>()
    for (const [component, els] of footprint) {
      for (const el of els) {
        const box = boxOf(el)
        if (!box) continue
        const counts = ink.get(box) ?? new Map<number, number>()
        counts.set(component, (counts.get(component) ?? 0) + 1)
        ink.set(box, counts)
        inked.add(box)
      }
    }
    for (const [box, counts] of ink) {
      const ranked = Array.from(counts).sort((a, b) => b[1] - a[1])
      if (ranked.length === 1 || (ranked[0]![1] > ranked[1]![1])) owner.set(box, ranked[0]![0])
    }
  }

  /**
   * Does a declaration on this page answer for this component's loss?
   *
   * A marker speaks for where it sits, which is the whole of the attribution
   * the SVG supports and all it needs to be. A component placed by
   * `SvgContent` gets a `data-audit-box`, and a marker inside that box is
   * that component saying what it could not hold: `flowchart`'s edge label
   * with nowhere legible to sit, `bullets`' overflowing items. A component
   * that was never placed has no box, and the marker `layoutContentFit`
   * leaves for it sits outside every box, at the page's own level.
   *
   * A component that painted nothing at all is the third case, and the one
   * that has no footprint to reason from: `SvgContent` still gave it a box,
   * the box holds its declaration, and no text in it belongs to anybody. An
   * empty box that declares a loss is the component that was meant to fill
   * it saying it drew none of itself — a 16-series line chart declining in a
   * 328px band used to be reported as fifty separately unexplained fields.
   * Each such box speaks once: two vanished components need two of them, so
   * one decline cannot cover for a second.
   *
   * What it stops is the blanket: one chart declaring three cut labels used
   * to excuse every other loss on its page, a paragraph that reached nobody
   * included.
   */
  /**
   * Boxes that declare a loss and hold no painted field of anyone's — one
   * entry per box, spent by the first component that claims it.
   */
  const vacantDeclarations = drops
    .map((drop) => boxOf(drop))
    .filter((box): box is Element => box !== null && !owner.has(box) && !inked.has(box))

  function licenses(component: number): boolean {
    const owned = Array.from(owner)
      .filter(([, c]) => c === component)
      .map(([box]) => box)
    if (owned.length > 0) return owned.some((box) => drops.some((drop) => boxOf(drop) === box))
    // A face that paints its components itself has no boxes to own, so the
    // subtree its painted fields share is the block that speaks for it.
    const scope = scopes.get(component)
    if (scope && drops.some((drop) => boxOf(drop) === null && contains(scope, drop))) return true
    // Painted nothing anywhere: an empty box declaring a loss is this
    // component's own decline, and it answers for exactly one component.
    if (!scope && vacantDeclarations.length > 0) {
      vacantDeclarations.shift()
      return true
    }
    // Nothing of this component is anywhere on the page, so the declaration
    // that covers it is the page's own.
    return drops.some((drop) => boxOf(drop) === null)
  }

  const licensed = new Map<number, boolean>()
  const missing = unresolved.filter((entry) => {
    if (!licensed.has(entry.component)) licensed.set(entry.component, licenses(entry.component))
    return !licensed.get(entry.component)
  })
  return { missing, authored: authored.length }
}

/** The slide a gallery job points at. */
export function jobSlide(ir: PptxIR, slideIndex: number): Slide {
  const slide = ir.slides[slideIndex]
  if (!slide) throw new Error(`slide ${slideIndex} missing`)
  return slide
}

/**
 * Which pages this scan speaks for.
 *
 * A face whose every slot names the component types it takes has decided to
 * read those components field by field: it is the face, not a shared
 * renderer, that chose what to paint and what to leave out. Those are the
 * faces this rule is about, and they are identifiable from the registry
 * rather than from a hand-kept list that would rot: no slot accepting
 * `"any"`.
 *
 * A face with an `"any"` slot hands its components to `SvgContent`, whose own
 * losses run through a different, already-instrumented mechanism: the
 * density gate, `data-dropped`, `deck-audit`, and an export that refuses to
 * ship the deck. Those losses are worth fixing too, and several are real
 * (chart legends, image-grid captions, `numbered_cards.sub`); they are a
 * different rule with a different fix, and folding them in here would trade
 * a check that is green and enforceable for a backlog that is neither.
 */
export function scanned(layout: LayoutDefinition | undefined): boolean {
  if (!layout) return false
  return !layout.slots.some((slot) => slot.accepts === "any")
}

/** The face a page actually renders through, or undefined when unresolved. */
export function faceOf(ir: PptxIR, slide: Slide): LayoutDefinition | undefined {
  return resolveEffectiveFace(ir, slide).layout
}

/**
 * Fields this scan speaks for on *every* page, `"any"`-slot faces included.
 *
 * `scanned` above draws the line at field-picking faces because that is
 * where the rule was enforceable when it was written. The shared component
 * renderers behind an `"any"` slot had their own losses, and the honest way
 * to bring one under this scan is to fix it first and then name the field
 * here, so the fix cannot rot: green on the whole corpus today, red the
 * moment the field stops reaching the page.
 *
 * Only a field whose corpus-wide loss count is zero belongs here. A field
 * still losing content on some other face would make this list a wish rather
 * than a check, and one red entry would hide every other one.
 *
 * `(chart).series[].name` on SINGLE-series charts is the one path ruled out
 * by design rather than pending a fix (author ruling 2026-09-01): a chart
 * with one series never draws a legend, and a one-entry legend or a header
 * caption would restate what the page heading already says while reflowing
 * most chart pages by a header row. The series identity is absorbed by the
 * declared page semantics. The narrower loss stays caught, and by the
 * component the author actually wrote rather than by the shape of its path:
 * `when` below reads the chart and claims `series[].name` the moment there
 * are two or more of them, which is exactly when the renderer owes a legend.
 *
 * That set-aside no longer covers line and area. Their names now travel with
 * the line — a label in the end gutter, `name value`, one per series
 * whatever the count — so there is somewhere to put a lone series' name that
 * costs no header row and restates nothing. Those two types are claimed at
 * every series count.
 */
export interface WidenedPath {
  /** Substring of the authored text's IR path. */
  readonly path: string
  /**
   * Extra condition on the component that wrote the text. Omitted means the
   * path alone claims the field.
   */
  readonly when?: (component: Component) => boolean
  /** What used to be lost here, and what now keeps it on the page. */
  readonly reason: string
}

export const WIDENED_PATHS: readonly WidenedPath[] = [
  {
    path: "(numbered_cards).items",
    reason:
      "items[].sub was in the schema and in no renderer: 122 authored qualifiers across 31 pages were painted nowhere. numbered-cards.tsx now sets it on the pill, taking its width out of the title column.",
  },
  {
    path: "(kpi_cards).items",
    reason:
      "bento's exploded card never read items[].source (23 pages), and show-figures fitted value+unit as one string so the cut landed on the unit. Both fields now have their own place and their own room.",
  },
  {
    path: "(architecture).layers",
    reason:
      "layers[].items were joined with ' · ' and fitted as one line, so a single data-truncated stood for an unknowable number of lost items. They are now measured run by run: what fits is painted whole, what is cut says so on its own element, and what is left over is declared with data-dropped.",
  },
  {
    path: "(insight_panel)",
    reason:
      "the nine theme faces behind one-evidence found their component with pickEvidence, which knows only EVIDENCE_TYPES, so a panel reached no frame at all: 12 pages drew a heading over nothing. The face now steps aside for content its single frame cannot place (`evidenceExact`).",
  },
  {
    path: "(citation).sources",
    reason:
      "same one-evidence swallow as insight_panel, 5 pages. The guard covers every construction on that face, not just the one that happened to be reported. The statement, pull-quote and stat-hero families then had their own half of it: each read sources[0] and left every later source unpainted, which is why the source line now sets all of them.",
  },
  {
    path: "(code).code",
    reason:
      "two separate faults met on the same 28 pages. 12 were the one-evidence swallow above. The other 16 were the scan's own: the line-number gutter prints a number between every pair of lines, so the page-wide text join read '1const a = 12const b = 2' and no listing could be found in it. The gutter now says what it is (`data-gutter`) and each block is read a second time without it.",
  },
  {
    path: "(image_grid).items",
    reason:
      "the takeover image faces reduced a grid to its first picture through findImageSelection and the rest left with their captions, 55 losses over 22 pages. All four takeovers now step aside for a picture set they cannot hold (`singlePictureExact`), and the ordinary renderer paints every item.",
  },
  {
    path: "(image_compare)",
    reason:
      "the same reduction took a compare's left half and dropped the right one entirely, 31 losses. Both sides now reach the page through the same guard.",
  },
  {
    path: "(image).caption",
    reason:
      "image-top drew the picture and never its caption, 19 pages of photographs whose authored line was painted nowhere, plus show-spotlight's, which lost to insight_panel.title over one shared kicker slot. image-top now carries the same scrim caption band image-split and image-bottom already had, and spotlight's caption hangs under its own frame.",
  },
  {
    path: "(device_mockup).caption",
    reason: "same missing caption band on image-top, 9 pages.",
  },
  {
    path: "(flowchart)",
    reason:
      "two label losses on the same component. A diamond's label was wrapped to two fixed lines and the overflow discarded silently (主理人致辞 shipped as 主理/人致); the wrap is cosmetic, so it now declines rather than cut, and the node's own fit marks any cut it makes. An edge label with nowhere legible to sit is still omitted, but the omission is declared with data-dropped instead of being invisible.",
  },
  {
    path: ".data[",
    reason:
      "a chart data point's own name, the donut's slices. The ring drew colored arcs with a total in the middle and named none of its parts, 104 losses over 27 pages. renderDonut now runs the pie's own label gutter (`layoutRadialSlices`), leader lines, column stacking, radius yield and all.",
  },
  {
    path: "(chart).series",
    when: (component) =>
      component.type === "chart" &&
      (component.series.length >= 2 ||
        component.chart_type === "line" ||
        component.chart_type === "area"),
    reason:
      "the other half of the single-series ruling above. Two or more series get a legend (`legendApplicable`), so their names are content this scan holds every face to. Claimed by reading the authored chart rather than by path shape: `.data[` alone let both names of a two-series bar chart disappear with the legend and kept the scan green. Line and area charts are claimed at *any* series count: they no longer draw a legend at all, and instead name each series where its own line ends (`renderSeriesGutterLabels`), so even a one-series line puts its name on the page — the narrow case the single-series ruling above set aside for want of anywhere to put it.",
  },
]

/** True when this field is checked on every page, whatever face drew it. */
export function widened(path: string, slide: Slide): boolean {
  const index = Number(/^components\[(\d+)\]/.exec(path)?.[1] ?? NaN)
  const component = slide.components[index]
  return WIDENED_PATHS.some(
    (entry) => path.includes(entry.path) && (!entry.when || (!!component && entry.when(component))),
  )
}

/**
 * Faces whose absorption of one field is the page's declared semantic.
 *
 * The bar is deliberately high, and it is not "we have not got to this one
 * yet". An entry states which face, which single field path, and why that
 * loss is what the page means rather than what the page failed at, and it
 * must leave a narrower loss of the same shape still detectable, so the
 * exemption cannot quietly grow into a licence.
 *
 * The table is empty. Every entry it used to carry, statement's cited
 * source, the two point faces' quote text, image-annotate's grids and
 * compares, was a defect wearing a reason, and each is now fixed rather
 * than excused. Adding an entry is a design decision, not a way past a red
 * scan: a face that cannot hold what it was given renders it anyway,
 * declines the page, or marks the loss.
 */
export interface FidelityExemption {
  /** Face id the exemption applies to. */
  readonly face: string
  /** Substring of the authored text's IR path, e.g. `"(citation).sources"`. */
  readonly path: string
  readonly reason: string
}

export const FIDELITY_EXEMPTIONS: readonly FidelityExemption[] = []

/** True when this face is already known to drop this path. */
export function exempt(faceId: string | undefined, path: string): boolean {
  if (!faceId) return false
  return FIDELITY_EXEMPTIONS.some((entry) => entry.face === faceId && path.includes(entry.path))
}
