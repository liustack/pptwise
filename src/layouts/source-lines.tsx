import { fitSvgLine, layoutSvgText } from "../lib/svg-text-layout"

/**
 * The lines under a claim that say where it came from, fitted and painted
 * the one way every sparse face and the shared claim faces set them.
 *
 * A statement, a pull quote or a hero figure sets a small line under its
 * claim: the speaker it quotes, the sentence the author wrote under it, the
 * figure's own source. The page's `footnote` is a source too, and it used to
 * be joined onto that line after a middle dot and fitted to one line with it.
 * A cited source runs long, so at about seventy characters the line was cut,
 * and what it cut was the source, the one part an author cannot do without.
 *
 * So the footnote stands on its own, under the line it used to be joined to,
 * on up to two lines of its own, and only past two is it cut, with the cut
 * declared. The line above it is fitted as it always was. A page with only
 * one of the two sets exactly the line it set before.
 */

/** One painted line of a source block. */
export interface SourceLine {
  readonly text: string
  readonly fontSize: number
  readonly truncated: boolean
  /**
   * Whether the line is set with the face's tracking. A face tracks its one
   * short line; a source wrapped to a second line, or set under that line,
   * is prose and is set untracked, since tracking a sentence wide enough to
   * wrap spends its measure on air.
   */
  readonly tracked: boolean
}

/** The lines of a source block, top to bottom, and the distance between their baselines. */
export interface SourceBlock {
  readonly lines: readonly SourceLine[]
  readonly lineHeight: number
}

/** How many lines a page's footnote may take under its claim before it is cut. */
export const SOURCE_MAX_LINES = 2
/** Baseline to baseline, as a share of the type size. */
const SOURCE_LINE_RATIO = 1.45

export interface SourceFitOptions {
  maxWidth: number
  fontSize: number
  minFontSize?: number
  letterSpacing?: number
  fontFamily?: string
  bold?: boolean
  /** Case or furniture the face's register asks for, e.g. `latinUpper`. */
  transform?: (text: string) => string
}

/**
 * A source on up to `SOURCE_MAX_LINES` lines: on one when it fits on one,
 * exactly as `fitSvgLine` sets it, and otherwise wrapped at the face's own
 * size, shrinking toward the floor, cut only past the last line.
 */
export function fitSourceLines(text: string, opts: SourceFitOptions): SourceLine[] {
  const content = opts.transform ? opts.transform(text) : text
  const minFontSize = opts.minFontSize ?? Math.min(16, opts.fontSize)
  const weight = { fontFamily: opts.fontFamily, bold: opts.bold }
  const one = fitSvgLine(content, { maxWidth: opts.maxWidth, fontSize: opts.fontSize, minFontSize, letterSpacing: opts.letterSpacing, ...weight })
  if (!one.truncated) return [{ ...one, tracked: true }]
  const wrapped = layoutSvgText(content, {
    maxWidth: opts.maxWidth,
    fontSize: Math.max(opts.fontSize, minFontSize),
    minPt: minFontSize,
    maxLines: SOURCE_MAX_LINES,
    ...weight,
  })
  return wrapped.lines.map((line, i) => ({
    text: line,
    fontSize: wrapped.fontSize,
    truncated: wrapped.truncated && i === wrapped.lines.length - 1,
    tracked: false,
  }))
}

/**
 * The block under a claim: the face's own line (`primary`), fitted to one
 * line as it always was, and the page's footnote under it on lines of its
 * own. `null` when the page has neither.
 */
export function fitSourceBlock(primary: string | undefined, footnote: string | undefined, opts: SourceFitOptions): SourceBlock | null {
  const lines: SourceLine[] = []
  const first = primary?.trim()
  if (first) {
    lines.push({
      ...fitSvgLine(opts.transform ? opts.transform(first) : first, {
        maxWidth: opts.maxWidth,
        fontSize: opts.fontSize,
        minFontSize: opts.minFontSize ?? Math.min(16, opts.fontSize),
        letterSpacing: opts.letterSpacing,
        fontFamily: opts.fontFamily,
        bold: opts.bold,
      }),
      tracked: true,
    })
  }
  const note = footnote?.trim()
  // Under a line of the face's own, the footnote is prose and set untracked.
  if (note) lines.push(...fitSourceLines(note, first ? { ...opts, letterSpacing: undefined } : opts))
  if (lines.length === 0) return null
  const size = Math.max(...lines.map((line) => line.fontSize))
  return { lines, lineHeight: Math.round(size * SOURCE_LINE_RATIO) }
}

/**
 * A source block painted from `y`: down from it, or, with `rise`, up to it,
 * so a block set at the foot of a page grows toward the claim rather than
 * off the bottom. Every line carries the attributes a face set on its one
 * line, in the same order, so a one-line block paints the bytes it did.
 */
export function SourceLines({
  block,
  x,
  y,
  rise = false,
  textAnchor,
  fontFamily,
  fontStyle,
  fill,
  letterSpacing,
}: {
  block: SourceBlock | null
  x: number
  y: number
  rise?: boolean
  textAnchor?: "start" | "middle" | "end"
  fontFamily?: string
  fontStyle?: string
  fill: string | ((fontSize: number) => string)
  letterSpacing?: number
}) {
  if (!block) return null
  const last = block.lines.length - 1
  return (
    <>
      {block.lines.map((line, i) => (
        <text
          key={i}
          data-truncated={line.truncated ? "1" : undefined}
          x={x}
          y={rise ? y - (last - i) * block.lineHeight : y + i * block.lineHeight}
          textAnchor={textAnchor}
          fontFamily={fontFamily}
          fontSize={line.fontSize}
          fontStyle={fontStyle}
          fill={typeof fill === "function" ? fill(line.fontSize) : fill}
          letterSpacing={line.tracked ? letterSpacing : undefined}
          dominantBaseline="alphabetic"
        >
          {line.text}
        </text>
      ))}
    </>
  )
}
