import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { blockTag } from "./shared"
import { binderBaseline, binderInks, binderText, binderWidth, fitBinder, leadGap, paintBinder, paintBinderIcon, paintBinderLine, splitSentence } from "./binder"

type Callout = Extract<Component, { type: "callout" }>

/*
 * The lines a binder page closes its body with, from a `callout`: a bar of
 * the pale petrol or the sand with the note's icon and one line (two at
 * 14px), a line under a hairline with a grey icon, a bare line with a grey
 * icon, and a closing line under a 2px rule of petrol, its first sentence
 * bold and the rest grey. A bar sets the callout's title bold on the same
 * line, before the text. None of them sets a callout's tag.
 */

export interface BarSpec {
  /** The bar's fill: the second petrol's tint, or the card's sand. */
  fill: "pale" | "card"
  h: number
  size: number
  lineHeight: number
  maxLines: number
  /** The text's top within the bar; centred in the bar when omitted. */
  padTop?: number
  /** The text's left within the bar. */
  padLeft: number
  icon: { x: number; y: number; size: number }
  /** Whether the text is set bold, as a bar that is the page's whole claim. */
  bold?: boolean
}

/** The bar most pages close on: 58px of the pale petrol, the icon at the left, one 15px line. */
export const BAR: BarSpec = { fill: "pale", h: 58, size: 15, lineHeight: 58, maxLines: 1, padLeft: 58, icon: { x: 22, y: 17, size: 24 } }

export interface FittedBar {
  title: { text: string; w: number } | null
  text: EmphasisHeadingLayout
}

/** The callout's title and text fitted to a bar `w` wide, or `null` when they do not fit or the callout has a tag. */
export function fitBinderBar(callout: Callout, w: number, ctx: ComponentCtx, spec: BarSpec = BAR): FittedBar | null {
  if (callout.tag) return null
  const room = w - spec.padLeft - 20
  const title = callout.title?.trim()
  if (title) {
    if (spec.maxLines !== 1) return null
    // The title runs on into the text with a word space after Latin letters.
    const gap = leadGap(title) ? binderWidth("a b", spec.size, ctx) - binderWidth("ab", spec.size, ctx) : 0
    const titleW = binderWidth(title, spec.size, ctx, true) + gap
    const text = fitBinder(callout.text, { width: room - titleW, size: spec.size, lineHeight: spec.lineHeight, maxLines: 1, bold: spec.bold }, ctx)
    return text ? { title: { text: title, w: titleW }, text } : null
  }
  const text = fitBinder(callout.text, { width: room, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines, bold: spec.bold }, ctx)
  return text ? { title: null, text } : null
}

export function BinderBar({ callout, fitted, x, y, w, ctx, spec = BAR }: { callout: Callout; fitted: FittedBar; x: number; y: number; w: number; ctx: ComponentCtx; spec?: BarSpec }): React.ReactElement {
  const inks = binderInks(ctx)
  const fill = spec.fill === "pale" ? inks.pale : inks.card
  const lines = fitted.text.lines.length
  const top = spec.padTop !== undefined ? y + spec.padTop : y + (spec.h - lines * spec.lineHeight) / 2
  const ink = binderText(inks.ink, fill, spec.size)
  const tx = x + spec.padLeft
  return (
    <g {...blockTag(ctx, callout)} data-binder-bar="">
      <rect x={x} y={y} width={w} height={spec.h} rx={10} fill={fill} />
      {callout.icon ? paintBinderIcon(callout.icon, x + spec.icon.x, y + spec.icon.y, spec.icon.size, inks.deep, fill) : null}
      {fitted.title ? paintBinderLine(fitted.title.text, { ctx, x: tx, top, lineHeight: spec.lineHeight, size: spec.size, bold: true, fill: ink }) : null}
      {paintBinder(fitted.text, { ctx, x: tx + (fitted.title?.w ?? 0), top, bold: spec.bold, fill: ink, ground: fill })}
    </g>
  )
}

/** A line under a hairline, its icon and words in the grey: what a sum leaves out. */
const RULE_LINE = { h: 52, size: 15, icon: { y: 18, size: 20 }, padLeft: 34 } as const

export function fitRuleLine(callout: Callout, w: number, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  if (callout.title || callout.tag) return null
  return fitBinder(callout.text, { width: w - RULE_LINE.padLeft, size: RULE_LINE.size, lineHeight: RULE_LINE.h, maxLines: 1 }, ctx)
}

export function BinderRuleLine({ callout, text, x, y, w, ctx }: { callout: Callout; text: EmphasisHeadingLayout; x: number; y: number; w: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = binderInks(ctx)
  return (
    <g {...blockTag(ctx, callout)} data-binder-rule-line="">
      <rect x={x} y={y} width={w} height={1} fill={inks.line} />
      {callout.icon ? paintBinderIcon(callout.icon, x, y + RULE_LINE.icon.y, RULE_LINE.icon.size, inks.muted, inks.ground) : null}
      {paintBinder(text, { ctx, x: x + RULE_LINE.padLeft, top: y, fill: binderText(inks.muted, inks.ground, RULE_LINE.size) })}
    </g>
  )
}

/** A bare line with a grey icon before it: what a page's figures do not say. */
const PLAIN_LINE = { lineHeight: 28, size: 15, icon: { y: 4, size: 20 }, padLeft: 30 } as const

export function fitPlainLine(callout: Callout, w: number, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  if (callout.title || callout.tag) return null
  return fitBinder(callout.text, { width: w - PLAIN_LINE.padLeft, size: PLAIN_LINE.size, lineHeight: PLAIN_LINE.lineHeight, maxLines: 1 }, ctx)
}

export function BinderPlainLine({ callout, text, x, y, ctx }: { callout: Callout; text: EmphasisHeadingLayout; x: number; y: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = binderInks(ctx)
  return (
    <g {...blockTag(ctx, callout)} data-binder-plain-line="">
      {callout.icon ? paintBinderIcon(callout.icon, x, y + PLAIN_LINE.icon.y, PLAIN_LINE.icon.size, inks.muted, inks.ground) : null}
      {paintBinder(text, { ctx, x: x + (callout.icon ? PLAIN_LINE.padLeft : 0), top: y, fill: binderText(inks.ink, inks.ground, PLAIN_LINE.size) })}
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
