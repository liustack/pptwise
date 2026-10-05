import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { fitFixed } from "./type"
import { fitMono } from "./console"
import { memoBaseline, memoFamily, memoInks, memoText, paintTracked, trackedWidth } from "./memo"

type Stamp = NonNullable<Slide["stamp"]>

/*
 * A stamp: the words a decision is stamped with, 「已决定」 or "Approved",
 * and a date under them, inside a square outline in the mark, turned a few
 * degrees and pressed a little faint, the way an ink stamp lands. Settled on
 * memo's 2026-10 board (its cover and its close).
 *
 * The words are bold in the heading face with their characters spaced, the
 * date in bold mono spaced a little. The stamp is 150 by 74 for the board's
 * three characters and grows to hold longer words, up to a width the face
 * gives it. The turn and the faintness are the export's own (a shape's
 * rotation, a fill's transparency), so the stamp stays editable.
 */

export const STAMP = {
  w: 150,
  h: 74,
  border: 3,
  padX: 14,
  text: { size: 30, lineHeight: 36, tracking: 6, top: 9 },
  date: { size: 12, lineHeight: 16, tracking: 2 },
  opacity: 0.88,
} as const

export interface FittedStamp {
  stamp: Stamp
  w: number
  h: number
}

/** Fits a stamp at most `maxW` wide, or `null` when its words do not fit one line. */
export function fitStamp(stamp: Stamp, maxW: number, ctx: ComponentCtx): FittedStamp | null {
  const text = stamp.text.trim()
  if (!fitFixed(text, { width: 4000, size: STAMP.text.size, lineHeight: STAMP.text.lineHeight, maxLines: 1, fontFamily: memoFamily(ctx, "song"), bold: true })) return null
  const date = stamp.date?.trim()
  if (date && !fitMono(date, { width: 4000, size: STAMP.date.size, lineHeight: STAMP.date.lineHeight, maxLines: 1 })) return null
  const inner = Math.max(
    trackedWidth(text, STAMP.text.size, "song", STAMP.text.tracking, ctx, true),
    date ? trackedWidth(date, STAMP.date.size, "mono", STAMP.date.tracking, ctx, true) : 0,
  )
  const w = Math.max(STAMP.w, Math.ceil(inner + STAMP.padX * 2 + STAMP.border * 2))
  if (w > maxW) return null
  const h = date ? STAMP.h : STAMP.h - STAMP.date.lineHeight
  return { stamp, w, h }
}

/** Paints a fitted stamp with its top left at `(x, y)` before its turn of `angle` degrees. */
export function paintStamp(fitted: FittedStamp, x: number, y: number, angle: number, ctx: ComponentCtx): React.ReactElement {
  const inks = memoInks(ctx)
  const ink = memoText(inks.mark, inks.ground, STAMP.date.size)
  const { w, h } = fitted
  const cx = x + w / 2
  const textTop = y + STAMP.text.top
  const date = fitted.stamp.date?.trim()
  return (
    <g data-stamp="" opacity={STAMP.opacity} transform={angle ? `rotate(${angle} ${cx} ${y + h / 2})` : undefined}>
      <rect x={x + STAMP.border / 2} y={y + STAMP.border / 2} width={w - STAMP.border} height={h - STAMP.border} fill="none" stroke={ink} strokeWidth={STAMP.border} />
      {paintTracked({
        ctx,
        text: fitted.stamp.text.trim(),
        x: cx,
        y: memoBaseline(textTop, STAMP.text.lineHeight, STAMP.text.size, "song"),
        size: STAMP.text.size,
        face: "song",
        tracking: STAMP.text.tracking,
        fill: ink,
        bold: true,
        anchor: "middle",
      })}
      {date
        ? paintTracked({
            ctx,
            text: date,
            x: cx,
            y: memoBaseline(textTop + STAMP.text.lineHeight, STAMP.date.lineHeight, STAMP.date.size, "mono"),
            size: STAMP.date.size,
            face: "mono",
            tracking: STAMP.date.tracking,
            fill: ink,
            bold: true,
            anchor: "middle",
          })
        : null}
    </g>
  )
}
