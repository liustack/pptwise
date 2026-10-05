import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { fitEmphasisHeading, type EmphasisHeadingLayout } from "../../render/emphasis"
import { memoBaseline, memoFamily, memoInks, memoText } from "./memo"
import { paintLines } from "./type"

/*
 * The margin: a label set in the left margin beside a page's heading, the
 * way a typed memo marks each section in the gutter (「决定」, 「理由」,
 * "Evidence"). Settled on memo's 2026-10 board, where every content page and
 * the close carry one and the heading and body start right of it.
 *
 * The label is the page's `kicker`, bold in the heading face at 22/30 in the
 * mark, over a 24 by 2 bar of the mark. It takes up to two lines of its
 * column, shrinking toward 18px before it is cut, and the bar follows its
 * last line. Any face can set one: it reads the theme's mark and heading
 * face.
 */

export const MARGIN = {
  /** The label's first line box, and its size. */
  size: 22,
  lineHeight: 30,
  minPt: 18,
  maxLines: 2,
  /** The bar under the label: its gap below the last line box, and its size. */
  bar: { gap: 4, w: 24, h: 2 },
} as const

export function fitMargin(label: string, w: number, ctx: ComponentCtx): EmphasisHeadingLayout {
  return fitEmphasisHeading(label, {
    maxWidth: w,
    fontSize: MARGIN.size,
    minPt: MARGIN.minPt,
    maxLines: MARGIN.maxLines,
    lineHeightRatio: MARGIN.lineHeight / MARGIN.size,
    fontFamily: memoFamily(ctx, "song"),
    bold: true,
  })
}

/** Paints a margin label whose first line box starts at `(x, top)`, `w` wide, and its bar. */
export function paintMargin(label: string, x: number, top: number, w: number, ctx: ComponentCtx): React.ReactElement {
  const inks = memoInks(ctx)
  const layout = fitMargin(label, w, ctx)
  const lines = Math.max(1, layout.lines.length)
  const ink = memoText(inks.mark, inks.ground, layout.fontSize)
  const barY = top + lines * MARGIN.lineHeight + MARGIN.bar.gap
  return (
    <g data-memo-margin="">
      {paintLines(layout, {
        ctx,
        x,
        y: memoBaseline(top, MARGIN.lineHeight, layout.fontSize, "song"),
        fill: ink,
        fontFamily: memoFamily(ctx, "song"),
        fontWeight: "700",
        ...(layout.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
      })}
      <rect x={x} y={barY} width={MARGIN.bar.w} height={MARGIN.bar.h} fill={memoText(inks.mark, inks.ground, 18)} />
    </g>
  )
}
