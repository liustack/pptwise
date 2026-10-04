import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { parseEmphasis } from "../../render/emphasis"
import { SEAL_NOTE, sealInks, sealText } from "./seal"
import { blockTag } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Callout = Extract<Component, { type: "callout" }>

/*
 * The seal setting's note: a `callout` set under a page's rows, table or
 * timeline in a panel of the surface colour with a hairline edge, its text
 * at 18px in the ink, written as the author wrote it. A warning is a note
 * like any other here: the panel has no icon, and the page keeps its mark for
 * the data. Vermilion's 2026-10 tasks (p06) and policy (p11) pages.
 */

export interface SealNote {
  callout: Callout
  text: EmphasisHeadingLayout
  height: number
}

/** `callout` set whole in a note panel `w` wide, or `null` when it carries an icon or does not fit. */
export function fitSealNote(callout: Callout, w: number, ctx: ComponentCtx): SealNote | null {
  if (callout.icon !== undefined) return null
  const marked = parseEmphasis(callout.text).some((segment) => segment.emphasized)
  const text = fitFixed(callout.text, {
    width: w - SEAL_NOTE.padX * 2,
    size: SEAL_NOTE.size,
    lineHeight: SEAL_NOTE.lineHeight,
    maxLines: SEAL_NOTE.maxLines,
    fontFamily: ctx.fonts.body,
    bold: marked,
  })
  if (!text || text.lines.length === 0) return null
  return { callout, text, height: SEAL_NOTE.padY * 2 + text.lines.length * SEAL_NOTE.lineHeight }
}

/** Paints a fitted note panel with its top-left corner at `x`, `y`. */
export function paintSealNote(note: SealNote, place: { x: number; y: number; w: number }, ctx: ComponentCtx): React.ReactElement {
  const inks = sealInks(ctx)
  return (
    <g {...blockTag(ctx, note.callout)} data-seal-note="">
      <rect x={place.x + 0.5} y={place.y + 0.5} width={place.w - 1} height={note.height - 1} fill={inks.panel} stroke={inks.rule} strokeWidth={1} />
      {paintLines(note.text, {
        ctx,
        x: place.x + SEAL_NOTE.padX,
        y: centredBaseline(place.y + SEAL_NOTE.padY, SEAL_NOTE.lineHeight, SEAL_NOTE.size),
        fill: sealText(inks.ink, inks.panel, SEAL_NOTE.size),
        fontFamily: ctx.fonts.body,
        fontWeight: "400",
        bg: inks.panel,
      })}
    </g>
  )
}
