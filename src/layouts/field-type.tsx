import React from "react"
import type { ComponentCtx } from "../components/types"
import { paintedLineWidth, type EmphasisHeadingLayout } from "../render/emphasis"
import { accessibleInk, blendOver, readableOn } from "../render/ink"

/*
 * Type set on a full primary field: the cover and the ending that paint the
 * whole page in the theme's primary (`ikb-field-cover`, `signoff-ending`).
 *
 * Every word is the field's own readable ink. Quieter lines are that ink
 * blended part of the way back toward the field, the way bulletin's 2026-10
 * board sets them with white at 70 to 86 per cent, and each is checked
 * against the field it lands on.
 *
 * A marked run (`**…**`) cannot take the theme's emphasis colour here: on a
 * primary field it has no contrast to give. It keeps the heading's ink and
 * gets a straight underline in that ink instead, the same short-bar language
 * the field's own closing bar speaks.
 */

/** The field's readable ink at `share` of its strength, held to the contrast a line of `size` needs. */
export function fieldInk(ctx: ComponentCtx, share: number, size: number): string {
  const field = ctx.colors.primary
  const ink = readableOn(field)
  return share >= 1 ? ink : accessibleInk(blendOver(ink, field, share), field, size)
}

const UNDERLINE_DROP = 0.14
const UNDERLINE_RATIO = 0.06

/**
 * One line of a fitted heading on the field, with a straight bar under each
 * marked run. `x` is the line's start, `baseline` its baseline.
 */
export function FieldHeadingLine({
  layout,
  index,
  x,
  baseline,
  ink,
  ctx,
  weight = "700",
  truncated,
}: {
  layout: EmphasisHeadingLayout
  index: number
  x: number
  baseline: number
  ink: string
  ctx: ComponentCtx
  weight?: "400" | "700"
  truncated?: boolean
}) {
  const segments = layout.segments[index] ?? [{ text: layout.lines[index] ?? "", emphasized: false }]
  const size = layout.fontSize
  const measure = { fontSize: size, fontWeight: weight, measureWeight: { bold: weight === "700", fontFamily: ctx.fonts.heading } }
  const bars: React.ReactNode[] = []
  let cursor = x
  segments.forEach((segment, i) => {
    const width = paintedLineWidth([{ text: segment.text, emphasized: false }], measure)
    if (segment.emphasized && segment.text.trim()) {
      bars.push(
        <rect
          key={`mark-${i}`}
          data-field-mark=""
          x={Math.round(cursor * 10) / 10}
          y={Math.round((baseline + size * UNDERLINE_DROP) * 10) / 10}
          width={Math.round(width * 10) / 10}
          height={Math.max(2, Math.round(size * UNDERLINE_RATIO))}
          fill={ink}
        />,
      )
    }
    cursor += width
  })
  return (
    <>
      {bars}
      <text
        data-truncated={truncated ? "1" : undefined}
        x={x}
        y={baseline}
        fontFamily={ctx.fonts.heading}
        fontSize={size}
        fontWeight={weight}
        fill={ink}
        dominantBaseline="alphabetic"
      >
        {segments.map((segment) => segment.text).join("")}
      </text>
    </>
  )
}
