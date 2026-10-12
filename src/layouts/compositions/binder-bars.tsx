import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { blockTag } from "./shared"
import { Lead, binderBaseline, binderInks, binderText, binderWidth, fitBinder, leadGap, paintBinder, paintBinderIcon, paintBinderLine, splitSentence } from "./binder"

type Callout = Extract<Component, { type: "callout" }>

/*
 * The lines a binder page closes its body with, from a `callout`, set the
 * way a printed page sets a note: a line of the text ink after a grey
 * outline icon, with no box and no fill (a callout's title runs in bold
 * before its text), and a closing line under a 2px rule of petrol, its first
 * sentence bold and the rest grey. None of them sets a callout's tag.
 */

/** A note's line: 14px words after a 16px grey icon, 10px apart. */
const NOTE = { size: 14, lineHeight: 24, icon: { y: 4, size: 16 }, padLeft: 26 } as const

/** The height a fitted note takes. */
export function noteHeight(text: EmphasisHeadingLayout): number {
  return text.lines.length * NOTE.lineHeight
}

/** The callout's title and text fitted after its icon in `w`, up to `maxLines`, or `null` when they do not fit or the callout has a tag. */
export function fitPlainLine(callout: Callout, w: number, ctx: ComponentCtx, maxLines = 1): EmphasisHeadingLayout | null {
  if (callout.tag) return null
  const title = callout.title?.trim()
  const text = title ? `**${title}**${leadGap(title)}${callout.text.trim()}` : callout.text
  return fitBinder(text, { width: w - (callout.icon ? NOTE.padLeft : 0), size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines }, ctx)
}

/** The note: its icon in the grey, its words in the text ink, its title bold. `lead` lights the icon and the title in the brick red, the one thing the page is about. */
export function BinderPlainLine({ callout, text, x, y, ctx, lead = false }: { callout: Callout; text: EmphasisHeadingLayout; x: number; y: number; ctx: ComponentCtx; lead?: boolean }): React.ReactElement {
  const inks = binderInks(ctx)
  const icon = callout.icon ? paintBinderIcon(callout.icon, x, y + NOTE.icon.y, NOTE.icon.size, lead ? inks.fireText : inks.muted, inks.ground) : null
  const body = (
    <>
      {icon}
      {paintBinder(text, { ctx, x: x + (callout.icon ? NOTE.padLeft : 0), top: y, fill: binderText(inks.ink, inks.ground, NOTE.size), runInk: binderText(lead ? inks.fireText : inks.ink, inks.ground, NOTE.size), runWeight: "700" })}
    </>
  )
  return (
    <g {...blockTag(ctx, callout)} data-binder-plain-line="">
      {lead ? <Lead id="note">{body}</Lead> : body}
    </g>
  )
}

/** The closing line under a 2px rule of petrol: its first sentence bold, the rest after it in the grey. */
const CLOSING = { rule: 2, lineHeight: 48, size: 16 } as const

export interface FittedClosing {
  lead: string
  rest: string
  /** Where the rest starts after the lead: past a space when the sentence ended on one (". "). */
  restX: number
}

export function fitClosingLine(callout: Callout, w: number, ctx: ComponentCtx): FittedClosing | null {
  if (callout.title || callout.tag || callout.icon) return null
  const split = splitSentence(callout.text)
  const lead = split ? `${split.lead}${split.sep.trim()}` : callout.text.trim()
  const rest = split?.rest ?? ""
  const space = split && split.sep.endsWith(" ") ? binderWidth("a b", CLOSING.size, ctx) - binderWidth("ab", CLOSING.size, ctx) : 0
  const restX = binderWidth(lead, CLOSING.size, ctx, true) + space
  const restW = rest ? binderWidth(rest, CLOSING.size, ctx) : 0
  return restX + restW <= w ? { lead, rest, restX } : null
}

export function BinderClosingLine({ callout, fitted, x, y, w, ctx }: { callout: Callout; fitted: FittedClosing; x: number; y: number; w: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = binderInks(ctx)
  const top = y + CLOSING.rule
  return (
    <g {...blockTag(ctx, callout)} data-binder-closing="">
      <rect x={x} y={y} width={w} height={CLOSING.rule} fill={inks.deep} />
      {paintBinderLine(fitted.lead, { ctx, x, top, lineHeight: CLOSING.lineHeight, size: CLOSING.size, bold: true, fill: binderText(inks.ink, inks.ground, CLOSING.size) })}
      {fitted.rest ? paintBinderLine(fitted.rest, { ctx, x: x + fitted.restX, baseline: binderBaseline(top, CLOSING.lineHeight, CLOSING.size), size: CLOSING.size, fill: binderText(inks.muted, inks.ground, CLOSING.size) }) : null}
    </g>
  )
}
