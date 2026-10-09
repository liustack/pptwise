import { parseEmphasis, sliceEmphasisForLines, stripEmphasis } from "../../render/emphasis"
import { fitHeadingLines } from "../../render/heading-fit"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"
import type { PptxIR, Slide } from "@/ir"
import { deckWritesChinese } from "../../lib/conf-labels"
import type { EmphasisSegment } from "../../render/emphasis"
import { heroSourceParts, pullQuoteSourceParts, statementLines } from "../minimal-shared"
import { fitSourceBlock, type SourceBlock, type SourceFitOptions } from "../source-lines"

export function pad2(n: number): string {
  return String(n).padStart(2, "0")
}

/**
 * A skin's own label word in the deck's language: `zh` in a deck whose
 * headings are Chinese (`deckWritesChinese`), `en` in any other. An evidence
 * page's label used to be one Chinese word on every deck, so an English deck
 * printed 「案卷 · 13」 over its exhibit.
 */
export function deckWord(ir: Pick<PptxIR, "slides">, zh: string, en: string): string {
  return deckWritesChinese(ir) ? zh : en
}

/**
 * Four-digit year + non-digit separator + 1–2 digit month.
 * Same shape as motif-poster-motif's `quarterLabel`. Unreadable dates
 * return undefined so a guessed quarter never prints.
 */
export function yearQuarter(date: string | undefined): { year: string; quarter: string } | undefined {
  const m = /^(\d{4})\D+(\d{1,2})(?:\D|$)/.exec(date ?? "")
  if (!m) return undefined
  const month = Number(m[2])
  if (month < 1 || month > 12) return undefined
  return { year: m[1], quarter: `Q${Math.floor((month - 1) / 3) + 1}` }
}

export function splitTrailingPercent(value: string): { body: string; percent: boolean } {
  const trimmed = value.trim()
  if (trimmed.endsWith("%")) return { body: trimmed.slice(0, -1), percent: true }
  return { body: trimmed, percent: false }
}

/**
 * The hero figure's type size, with whatever the skin sets after it on the
 * same line, or `null` when the figure cannot be set whole.
 *
 * Every skin draws the figure and its trailing runs as one `<text>`: the
 * author's unit as a `<tspan>` (see `heroUnitMark`), and on thesis and stage
 * a percent sign shrunk to `percentScale` of the figure. Fitting the figure
 * on its own gave it the whole measure and then hung the unit past it: swiss'
 * "1142.6" filled its 1100px and "万元" ran 180px further, to x=1255 on a
 * page whose margin is 1192. So the size is the largest one at which all of
 * it fits, with the trailing runs scaling alongside the figure.
 *
 * A figure is never cut. A shortened number is not a smaller version of the
 * author's number, it is a different one, and nothing on the slide would say
 * so. When the whole line does not fit even at the floor size, the unit gives
 * first: it shrinks toward `HERO_UNIT_MIN_PX` while the figure holds its
 * floor. When that is still not enough, or the figure alone is wider than the
 * measure at its floor, this returns `null`, and the skin hands its page to
 * `StatHeroFallbackContent`, which draws the component whole.
 *
 * `text` is always `value`, untouched. A figure with nothing after it fits
 * exactly as a plain line fit would size it.
 */
export function fitHeroLine(
  value: string,
  opts: {
    maxWidth: number
    fontSize: number
    fontFamily: string
    bold: boolean
    /** The unit `<tspan>` the skin sets after the figure. */
    unit?: string
    /** A trailing `%` set at this share of the figure's size. */
    percentScale?: number
    /**
     * The unit mark the skin sets at a given figure size. Defaults to
     * `heroUnitMark`. A skin whose board sets the unit at its own proportion
     * passes that here, so the line is measured as it is drawn.
     */
    unitMark?: (heroFontSize: number) => HeroUnitMark
  },
): HeroLine | null {
  const markFor = opts.unitMark ?? heroUnitMark
  const minFontSize = Math.max(48, Math.round(opts.fontSize * (64 / 180)))
  const weight = { bold: opts.bold, fontFamily: opts.fontFamily }
  const valueUnits = measureTextUnits(value, weight)
  const unitUnits = opts.unit ? measureTextUnits(opts.unit, weight) : 0
  const percentUnits = opts.percentScale ? measureTextUnits("%", weight) : 0
  const lineWidth = (size: number, unitMark: HeroUnitMark) =>
    valueUnits * size +
    (opts.unit ? unitMark.dx + unitUnits * unitMark.fontSize : 0) +
    (opts.percentScale ? percentUnits * Math.round(size * opts.percentScale) : 0)

  const largest = valueUnits > 0 ? Math.min(opts.fontSize, Math.floor(opts.maxWidth / valueUnits)) : opts.fontSize
  for (let size = largest; size >= minFontSize; size--) {
    const unitMark = markFor(size)
    if (lineWidth(size, unitMark) <= opts.maxWidth) return { text: value, fontSize: size, unitMark }
  }
  if (opts.unit && largest >= minFontSize) {
    const { dx, fontSize: unitStart } = markFor(minFontSize)
    for (let unitSize = unitStart - 1; unitSize >= HERO_UNIT_MIN_PX; unitSize--) {
      const unitMark = { fontSize: unitSize, dx }
      if (lineWidth(minFontSize, unitMark) <= opts.maxWidth) return { text: value, fontSize: minFontSize, unitMark }
    }
  }
  return null
}

/**
 * Bake a CSS-clockwise rotated rect into polygon points (y-down). Positive
 * `cssDeg` is SVG/CSS clockwise. The y-down matrix already turns a positive
 * angle clockwise (same as the bill-head date chip at +4°), so the
 * angle is not negated.
 */
export function rotateRectPolygon(
  cx: number,
  cy: number,
  width: number,
  height: number,
  cssDeg: number,
): string {
  const a = (cssDeg * Math.PI) / 180
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const hw = width / 2
  const hh = height / 2
  const round1 = (v: number) => Math.round(v * 10) / 10
  const corners: [number, number][] = [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ]
  return corners
    .map(([lx, ly]) => `${round1(cx + lx * ca - ly * sa)},${round1(cy + lx * sa + ly * ca)}`)
    .join(" ")
}

/**
 * The closing lines every `statement` skin sets under the claim.
 *
 * The claim is the heading. Under it a small line says where the claim came
 * from, and it carries the author's own words: the source they cited, the
 * speaker they quoted, the sentence they wrote. The page's `footnote` stands
 * under that line on lines of its own (`fitSourceBlock`).
 *
 * Eighteen skins used to close the page with a line this repository invented
 * — a masthead, a stamp, an aphorism, a session tag. On a slide there is
 * nothing to tell an audience that "The Operations Review" is furniture and
 * not the deck's own byline, which is what made it a fidelity defect and not
 * a style choice: the author's cited source went unpainted and a stranger's
 * sentence took its place.
 *
 * A skin still owns the register — family, size, colour, tracking, where on
 * the page the lines sit. What it no longer owns is whose words go there.
 *
 * Returns null when the page has no source to set, and the skin then closes
 * on its own rule or glyph.
 */
export function fitStatementSource(slide: Slide, opts: SourceFitOptions): SourceBlock | null {
  const { quote, source } = statementLines(slide)
  return fitSourceBlock(source ?? quote, slide.footnote, opts)
}

/** The lines under a hero figure (`heroSourceParts`), fitted the way a statement's are. */
export function fitHeroSource(slide: Slide, opts: SourceFitOptions): SourceBlock | null {
  const { primary, footnote } = heroSourceParts(slide)
  return fitSourceBlock(primary, footnote, opts)
}

/**
 * The lines under a quote: its attribution after the skin's own `lead`
 * (「—— 」, 「[1] 」), and the page's footnote under it on lines of its own.
 * With no attribution the footnote takes the lead, as it always has.
 */
export function fitPullQuoteSource(slide: Slide, opts: SourceFitOptions, lead = ""): SourceBlock | null {
  const { attribution, footnote } = pullQuoteSourceParts(slide)
  if (attribution) return fitSourceBlock(lead + attribution, footnote, opts)
  return fitSourceBlock(undefined, footnote ? lead + footnote : undefined, opts)
}

/**
 * The lowest a skin's source may set its last baseline: the foot of the type
 * area, where the footer row begins. A block that would pass it hands the
 * page to the shared face, which sets every text whole.
 */
export const SOURCE_FOOT = 676

/**
 * Whether a source block set down from `y` takes a line past `SOURCE_FOOT`.
 * Its first line stands where the skin has always set its one line, so only
 * the lines it adds are held to the foot.
 */
export function sourcePastFoot(block: SourceBlock | null, y: number): boolean {
  return block !== null && block.lines.length > 1 && y + (block.lines.length - 1) * block.lineHeight > SOURCE_FOOT
}

/**
 * Whether the small line a skin sets over its quote (`pullQuoteContext`)
 * stands whole at the skin's own size on its measure. A skin that cannot set
 * it whole hands the page to the shared face (`PullQuoteContent`), which
 * fits the line and marks what it still has to cut.
 */
export function contextFits(context: string | undefined, opts: { maxWidth: number; fontSize: number; fontFamily: string }): boolean {
  return context === undefined || !fitSvgLine(context, { ...opts, minFontSize: opts.fontSize }).truncated
}

export function evidenceSource(slide: Slide): string | undefined {
  return slide.footnote?.trim() || undefined
}

const CJK_STOP = /[，。；、]/

/** Split on CJK stops, keeping the stop on the phrase it closed. */
export function splitCjkPhrases(plain: string): string[] {
  const parts: string[] = []
  let buf = ""
  for (const ch of Array.from(plain)) {
    buf += ch
    if (CJK_STOP.test(ch) && buf.trim()) {
      parts.push(buf)
      buf = ""
    }
  }
  if (buf) parts.push(buf)
  return parts.filter((p) => p.trim().length > 0)
}

function phraseWrap(
  plain: string,
  opts: { maxWidth: number; fontSize: number; maxLines: number; fontFamily: string; bold: boolean },
): string[] | null {
  const parts = splitCjkPhrases(plain)
  if (parts.length < 2 || parts.length > opts.maxLines) return null
  const weight = { bold: opts.bold, fontFamily: opts.fontFamily }
  const fits = parts.every((p) => measureTextUnits(p, weight) * opts.fontSize <= opts.maxWidth)
  return fits ? parts : null
}

export function fitSparseHeading(
  heading: string | undefined,
  opts: {
    maxWidth: number
    fontSize: number
    maxLines: number
    minPt: number
    lineHeightRatio: number
    fontFamily: string
    bold: boolean
  },
): {
  fontSize: number
  lineHeight: number
  lines: string[]
  truncated: boolean
  lineSegs: EmphasisSegment[][]
  hasEmphasis: boolean
} {
  const source = heading ?? ""
  const segments = parseEmphasis(source)
  const plain = stripEmphasis(source)
  const phrases = phraseWrap(plain, opts)
  if (phrases) {
    return {
      fontSize: opts.fontSize,
      lineHeight: Math.round(opts.fontSize * opts.lineHeightRatio),
      lines: phrases,
      truncated: false,
      lineSegs: sliceEmphasisForLines(segments, phrases),
      hasEmphasis: segments.some((s) => s.emphasized),
    }
  }
  const layout = fitHeadingLines(plain, {
    maxWidth: opts.maxWidth,
    fontSize: opts.fontSize,
    maxLines: opts.maxLines,
    minPt: opts.minPt,
    lineHeightRatio: opts.lineHeightRatio,
    fontFamily: opts.fontFamily,
    bold: opts.bold,
  })
  return {
    fontSize: layout.fontSize,
    lineHeight: layout.lineHeight,
    lines: layout.lines,
    truncated: layout.truncated,
    lineSegs: sliceEmphasisForLines(segments, layout.lines),
    hasEmphasis: segments.some((s) => s.emphasized),
  }
}

/** Pixel box of the first emphasized run, for chalk arcs and underlines. */
export function firstEmphasisRun(
  lineSegs: EmphasisSegment[][],
  opts: { originX: number; firstY: number; lineHeight: number; fontSize: number; fontFamily: string; bold: boolean },
): { x: number; y: number; w: number; lineIndex: number } | null {
  for (let i = 0; i < lineSegs.length; i++) {
    let x = opts.originX
    for (const seg of lineSegs[i]) {
      const w = measureTextUnits(seg.text, { bold: opts.bold, fontFamily: opts.fontFamily }) * opts.fontSize
      if (seg.emphasized && seg.text.length > 0) {
        return { x, y: opts.firstY + i * opts.lineHeight, w, lineIndex: i }
      }
      x += w
    }
  }
  return null
}

/**
 * How many lines a sparse quote skin gives the quote itself.
 *
 * An authored quote is a sentence, not a title. The corpus' own quotes run
 * to about forty-five CJK characters, and their English counterparts to a
 * couple of clauses — that is the normal case, not the pathological one. Two
 * lines could only hold them by shrinking to a whisper, so the quote gets
 * four and `fitSparseHeading`'s phrase wrap breaks it at the author's own
 * commas whenever they fall in reachable places, which is how a quote wants
 * to be set anyway.
 */
export const QUOTE_MAX_LINES = 4

/** Floor for a quote's type size: below this it stops reading as the page's voice. */
export const QUOTE_MIN_PT = 26

/**
 * The one fit every `pull-quote` skin runs its quote through, so the policy
 * above lives in one place instead of eight. Each skin still owns its own
 * measure, size, family and furniture — what it does not own is how far the
 * quote may shrink or how many lines it may take.
 */
export function fitSparseQuote(
  quote: string,
  opts: { maxWidth: number; fontSize: number; fontFamily: string; lineHeightRatio?: number },
): ReturnType<typeof fitSparseHeading> {
  return fitSparseHeading(quote, {
    maxWidth: opts.maxWidth,
    fontSize: opts.fontSize,
    maxLines: QUOTE_MAX_LINES,
    minPt: QUOTE_MIN_PT,
    lineHeightRatio: opts.lineHeightRatio ?? 1.42,
    fontFamily: opts.fontFamily,
    bold: false,
  })
}

/**
 * First-line baseline that keeps a quote block optically centred on `midY`
 * whatever its line count. A fixed top baseline was fine while the quote was
 * a one-or-two-line heading; an authored quote runs one to four lines, and a
 * fixed top leaves a short one hanging above a hole.
 */
export function quoteBlockBaseline(
  midY: number,
  block: { lines: readonly string[]; lineHeight: number; fontSize: number },
): number {
  const span = Math.max(0, block.lines.length - 1) * block.lineHeight
  return Math.round(midY - span / 2 + block.fontSize * 0.34)
}

/**
 * Type size and lead-in for the unit mark trailing a hero numeral.
 *
 * `kpi_cards[0].unit` is a text the author wrote, and until this existed no
 * theme skin painted it: the page showed `8.4` where the deck said `8.4pp`.
 * A unit is set small and tight against its figure, which is what these two
 * numbers are — a quarter of the numeral's size, a hair of air before it.
 */
export function heroUnitMark(heroFontSize: number): HeroUnitMark {
  return {
    fontSize: Math.max(HERO_UNIT_MIN_PX, Math.round(heroFontSize * 0.26)),
    dx: Math.max(2, Math.round(heroFontSize * 0.04)),
  }
}

/** The smallest a hero's unit mark is ever set, and where it stops giving way to the figure. */
export const HERO_UNIT_MIN_PX = 20

export interface HeroUnitMark {
  fontSize: number
  dx: number
}

/** A hero line that fits: the figure whole, at `fontSize`, and its unit mark. */
export interface HeroLine {
  text: string
  fontSize: number
  unitMark: HeroUnitMark
}
