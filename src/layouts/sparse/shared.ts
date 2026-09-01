import { parseEmphasis, sliceEmphasisForLines, stripEmphasis } from "../../render/emphasis"
import { fitHeadingLines } from "../../render/heading-fit"
import { fitSvgLine, measureTextUnits } from "../../lib/svg-text-layout"
import type { Slide } from "@/ir"
import type { EmphasisSegment } from "../../render/emphasis"
import { citationSources, statementAttribution } from "../minimal-shared"

export function pad2(n: number): string {
  return String(n).padStart(2, "0")
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

/** True when the hero value is a short signed number / percent, not a sentence. */
export function isNumericHero(value: string): boolean {
  return /^-?\d+(?:[.,]\d+)?%?$/.test(value.trim())
}

export function fitHeroLine(
  value: string,
  opts: { maxWidth: number; fontSize: number; fontFamily: string; bold: boolean },
): { text: string; fontSize: number } {
  const minFontSize = Math.max(48, Math.round(opts.fontSize * (64 / 180)))
  const fitted = fitSvgLine(value, {
    maxWidth: opts.maxWidth,
    fontSize: opts.fontSize,
    minFontSize,
    fontFamily: opts.fontFamily,
    bold: opts.bold,
  })
  return { text: fitted.text, fontSize: fitted.fontSize }
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
 * The closing line every `statement` skin sets under the claim.
 *
 * The claim is the heading. This is the small line beneath it that says
 * where the claim came from, and it carries the author's own words:
 * the source they cited, the speaker they quoted, the sentence they wrote.
 *
 * Eighteen skins used to close the page with a line this repository invented
 * — a masthead, a stamp, an aphorism, a session tag. On a slide there is
 * nothing to tell an audience that "The Operations Review" is furniture and
 * not the deck's own byline, which is what made it a fidelity defect and not
 * a style choice: the author's cited source went unpainted and a stranger's
 * sentence took its place.
 *
 * A skin still owns the register — family, size, colour, tracking, where on
 * the page the line sits. What it no longer owns is whose words go there.
 *
 * Returns null when the page has no source to set, and the skin then closes
 * on its own rule or glyph.
 */
export function fitStatementSource(
  slide: Slide,
  opts: {
    maxWidth: number
    fontSize: number
    minFontSize?: number
    letterSpacing?: number
    fontFamily?: string
    bold?: boolean
    /** Case or furniture the skin's register asks for, e.g. `latinUpper`. */
    transform?: (source: string) => string
  },
): { text: string; fontSize: number; truncated: boolean } | null {
  const source = statementAttribution(slide)
  if (!source) return null
  return fitSvgLine(opts.transform ? opts.transform(source) : source, {
    maxWidth: opts.maxWidth,
    fontSize: opts.fontSize,
    minFontSize: opts.minFontSize ?? Math.min(16, opts.fontSize),
    letterSpacing: opts.letterSpacing,
    fontFamily: opts.fontFamily,
    bold: opts.bold,
  })
}

export function evidenceSource(slide: Slide): string | undefined {
  const footnote = slide.footnote?.trim()
  if (footnote) return footnote
  const citation = slide.components.find((c) => c.type === "citation")
  if (citation) {
    const cited = citationSources(citation)
    if (cited) return cited
  }
  return undefined
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
export function heroUnitMark(heroFontSize: number): { fontSize: number; dx: number } {
  return {
    fontSize: Math.max(20, Math.round(heroFontSize * 0.26)),
    dx: Math.max(2, Math.round(heroFontSize * 0.04)),
  }
}
