import type React from "react"
import type { ComponentCtx } from "../../components/types"
import {
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
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
      fontWeight: spec.fontWeight,
      fontFamily: spec.fontFamily,
      bold,
      bg: spec.bg,
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
