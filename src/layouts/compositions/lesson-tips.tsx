import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { blockTag } from "./shared"
import { fitLesson, paintLesson, paintLessonIcon, paintTipBox, lessonText, type Box, type LessonInks } from "./lesson"

type Callout = Extract<Component, { type: "callout" }>

/*
 * The lesson's closing lines under a body, as the 2026-10 board sets them:
 *
 * - a tip in a box of the mark's tint, rounded 10px, its icon in the mark at
 *   the left and its words after it (`paintTip`), the classroom's rule or
 *   the page's one safety net;
 * - a caution in a dashed outline of the pen, its icon in the pen (a `warn`
 *   callout), such as "these figures cannot be added up";
 * - a bare line of words, in the pen or the mark, with no box (`paintLine`):
 *   what to do before the class ends, the order to judge in.
 *
 * Each takes a `callout` with no title and no tag: a composition that meets
 * one with either declines the page.
 */

export interface TipSpec {
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
  /** Where the words start from the box's left. */
  textX: number
  /** The icon's size and its left. */
  icon: { x: number; size: number }
  /** Centre the words in the box (one or two lines), or set them from `padTop`. */
  padTop?: number
}

export interface FittedTip {
  callout: Callout
  text: EmphasisHeadingLayout
}

/** Whether a callout is plain enough for a tip box or a line: no title, no tag. */
export function plainCallout(component: Component | undefined): component is Callout {
  return component?.type === "callout" && !component.title?.trim() && component.tag === undefined
}

export function fitTip(callout: Callout, w: number, spec: TipSpec, ctx: ComponentCtx): FittedTip | null {
  const text = fitLesson(callout.text, { width: w - spec.textX - 20, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines, bold: spec.bold }, ctx)
  return text ? { callout, text } : null
}

/** Paints a fitted tip in `box`: a tint box, or a dashed outline of the pen for a `warn` callout. */
export function paintTip(fitted: FittedTip, box: Box, spec: TipSpec, ctx: ComponentCtx, inks: LessonInks): React.ReactElement {
  const caution = fitted.callout.variant === "warn"
  const ground = caution ? inks.ground : inks.tint
  const iconInk = caution ? inks.pen : inks.mark
  const h = fitted.text.lines.length * spec.lineHeight
  const top = spec.padTop !== undefined ? box.y + spec.padTop : box.y + (box.h - h) / 2
  const iconTop = spec.padTop !== undefined ? box.y + spec.padTop + (spec.lineHeight - spec.icon.size) / 2 : box.y + (box.h - spec.icon.size) / 2
  return (
    <g {...blockTag(ctx, fitted.callout)} data-lesson-callout={caution ? "caution" : "tip"}>
      {paintTipBox(box, inks, { dashed: caution })}
      {fitted.callout.icon ? paintLessonIcon(fitted.callout.icon, box.x + spec.icon.x, iconTop, spec.icon.size, iconInk, ground) : null}
      {paintLesson(fitted.text, { ctx, x: box.x + spec.textX, top, bold: spec.bold, fill: lessonText(inks.ink, ground, spec.size), ground })}
    </g>
  )
}

/** A callout set as one bare line of words in `ink`, no box and no icon. */
export function fitLine(callout: Callout, w: number, size: number, lineHeight: number, ctx: ComponentCtx, maxLines = 1): EmphasisHeadingLayout | null {
  if (callout.icon) return null
  return fitLesson(callout.text, { width: w, size, lineHeight, maxLines, bold: true }, ctx)
}

export function paintLine(callout: Callout, layout: EmphasisHeadingLayout, x: number, top: number, ink: string, ctx: ComponentCtx, ground: string): React.ReactElement {
  return (
    <g {...blockTag(ctx, callout)} data-lesson-callout="line">
      {paintLesson(layout, { ctx, x, top, bold: true, fill: lessonText(ink, ground, layout.fontSize), ground })}
    </g>
  )
}
