import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { measureTextUnits } from "../../lib/svg-text-layout"
import {
  attachEmphasis,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  stripEmphasis,
  type EmphasisHeadingLayout,
} from "../../render/emphasis"

/*
 * Type for the compositions. Every composition sets its text at the size the
 * board gives it and never shrinks or cuts it: a text that does not fit its
 * measure in its line budget makes the composition decline the page, so the
 * face draws it another way. That keeps the hand-set compositions honest
 * without a single `data-truncated` of their own.
 */

/**
 * The baseline of a `size` line centred in a `lineHeight` box whose top is
 * `top`, the way a browser sets a sans with Microsoft YaHei's metrics.
 * bulletin's 2026-10 board was drawn that way, and its baselines read off
 * the board at 14, 34 and 50px sit at the box's middle plus 0.385 of the
 * size. brief's boards were set in Georgia and keep their own constants.
 */
export function centredBaseline(top: number, lineHeight: number, size: number): number {
  return Math.round(top + lineHeight / 2 + size * 0.385)
}

export interface FixedTextSpec {
  /** The measure, in px. */
  width: number
  /** Type size, in px. The text is set at exactly this size or not at all. */
  size: number
  /** Distance between baselines, in px. */
  lineHeight: number
  maxLines: number
  fontFamily: string
  /** Whether the text is drawn at weight 600 or above, so it is measured wide. */
  bold: boolean
  /**
   * Even out the lines the way a heading's are (`balanceLines`), for display
   * text such as a quote set large. Off by default, so labels, notes and
   * closing lines keep the greedy fill.
   */
  balance?: boolean
}

/**
 * `text` set at `spec.size` in at most `spec.maxLines` lines of `spec.width`,
 * with its `**marked**` runs kept for the paint, or `null` when it does not
 * fit whole. An empty text fits as zero lines.
 */
export function fitFixed(text: string | undefined, spec: FixedTextSpec): EmphasisHeadingLayout | null {
  const layout = fitEmphasisText(text?.trim() ?? "", {
    maxWidth: spec.width,
    fontSize: spec.size,
    minPt: spec.size,
    maxLines: spec.maxLines,
    lineHeightRatio: spec.lineHeight / spec.size,
    fontFamily: spec.fontFamily,
    bold: spec.bold,
    balanceLines: spec.balance,
  })
  if (layout.truncated || layout.fontSize !== spec.size || layout.lines.length > spec.maxLines) return null
  return { ...layout, lineHeight: spec.lineHeight }
}

/**
 * The places a line may break when words are kept whole (CSS
 * `word-break: keep-all`): at a space, which the break swallows, or after a
 * Chinese clause or sentence mark (「，」「。」「：」「；」「！」「？」 and the
 * closing brackets). Never between two Chinese characters, never inside a
 * Latin word or a figure, and never after the enumeration comma 「、」, which
 * holds a list together (「吉利、长安、特斯拉中国」 stays on one line).
 */
const KEEP_ALL_BREAK_AFTER = /[，。：；！？）」』》〉]/u

/** `text` cut into the pieces a keep-all wrap never breaks inside, each with the space after it, if any. */
export function keepAllPieces(text: string): string[] {
  const pieces: string[] = []
  let piece = ""
  for (const ch of Array.from(text)) {
    if (/\s/u.test(ch)) {
      if (piece) pieces.push(`${piece} `)
      piece = ""
      continue
    }
    piece += ch
    if (KEEP_ALL_BREAK_AFTER.test(ch)) {
      pieces.push(piece)
      piece = ""
    }
  }
  if (piece) pieces.push(piece)
  return pieces
}

/**
 * `text` set at `spec.size` with every word kept whole: lines break only at
 * a space or after a Chinese clause mark (`keepAllPieces`), each line as full
 * as it can be, so a sentence reads in its own phrases (「份额在挪：比亚迪少了约
 * 4.5 个点，」 over 「拿走份额的是新势力」). `null` when the words need more than
 * `spec.maxLines` lines. A piece wider than the whole measure on its own (a
 * long run of Chinese with no mark in it) cannot be kept whole on any line,
 * so the text is wrapped the ordinary way instead (`fitFixed`). A line break
 * the author wrote is kept.
 */
export function fitKeepAll(text: string | undefined, spec: FixedTextSpec): EmphasisHeadingLayout | null {
  const source = text?.trim() ?? ""
  const plain = stripEmphasis(source)
  const weight = { fontFamily: spec.fontFamily, bold: spec.bold }
  const width = (line: string) => measureTextUnits(line.trimEnd(), weight) * spec.size
  // A line the author broke stays broken there.
  const paragraphs = plain.split(/\n/u).map((part) => keepAllPieces(part))
  if (paragraphs.some((pieces) => pieces.some((piece) => width(piece) > spec.width))) return fitFixed(text, spec)
  const lines: string[] = []
  for (const pieces of paragraphs) {
    let line = ""
    for (const piece of pieces) {
      if (line && width(line + piece) > spec.width) {
        lines.push(line.trimEnd())
        line = ""
      }
      line += piece
    }
    if (line.trimEnd()) lines.push(line.trimEnd())
  }
  if (lines.length > spec.maxLines) return null
  return attachEmphasis(source, { lines, fontSize: spec.size, lineHeight: spec.lineHeight, truncated: false })
}

export interface PaintSpec {
  ctx: ComponentCtx
  x: number
  /** Baseline of the first line. */
  y: number
  fill: string
  fontFamily: string
  fontWeight: "400" | "700"
  anchor?: "start" | "middle" | "end"
  /** The colour the text lands on, when it is not the page background. */
  bg?: string
  /** Attributes every line's `<text>` carries, such as a font-floor exemption. */
  attrs?: Record<string, string>
  /** Attributes the last line's `<text>` carries as well, such as `data-gloss-break`. */
  lastAttrs?: Record<string, string>
  /** The ink a `**…**` run takes, when a setting draws its marked runs in an ink of its own. */
  runInk?: string
  /** The weight a `**…**` run takes, when a setting sets its marked runs heavier than the line. */
  runWeight?: "700"
}

/**
 * Paints a fitted block, one `<text>` per line. A marked run takes the
 * theme's emphasis stroke (brief's is the highlighter pad), measured with the
 * same weight the block was fitted with.
 */
export function paintLines(layout: EmphasisHeadingLayout, spec: PaintSpec): React.ReactNode {
  const bold = spec.fontWeight === "700"
  return renderEmphasisHeading(
    layout,
    headingEmphasisPaint(spec.ctx, layout, {
      baseFill: spec.fill,
      fontWeight: spec.runWeight ?? spec.fontWeight,
      fontFamily: spec.fontFamily,
      bold,
      bg: spec.bg,
      ...(spec.runInk ? { accent: spec.runInk } : {}),
    }),
    (_line, index) => (
      <text
        key={index}
        {...spec.attrs}
        {...(index === layout.lines.length - 1 ? spec.lastAttrs : undefined)}
        x={spec.x}
        y={spec.y + index * layout.lineHeight}
        fontFamily={spec.fontFamily}
        fontSize={layout.fontSize}
        fontWeight={bold ? "700" : undefined}
        fill={spec.fill}
        textAnchor={spec.anchor && spec.anchor !== "start" ? spec.anchor : undefined}
        dominantBaseline="alphabetic"
      />
    ),
  )
}
