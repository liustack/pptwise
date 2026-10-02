import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { parseEmphasis } from "../../render/emphasis"
import { accessibleInk, readableOn } from "../../render/ink"
import { panelFill } from "./notice"
import { blockTag } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Callout = Extract<Component, { type: "callout" }>

/*
 * The closing block: a page's one-line "so what", reversed out of a
 * full-width `primary` block under the body. brief's rows page settled it
 * (p05 of the first board), and the tea board carries the same block under
 * a timeline and under a table, each at its own size.
 *
 * The block takes a `callout` that is `info` or `tip` and has no icon. A
 * warning is not a conclusion and the block has no place for an icon, so a
 * composition that meets either declines the page.
 *
 * A marked run (`**…**`) turns bold rather than taking the theme's emphasis
 * stroke: the stroke is the highlight colour, and on `primary` it has no
 * contrast to give.
 */

export interface ClosingSpec {
  size: number
  /** Distance between baselines. */
  lineHeight: number
  /** Air left and right of the text inside the block. */
  padX: number
  /** Air above the first line box and below the last. */
  padY: number
  maxLines: number
}

export interface ClosingLayout {
  callout: Callout
  text: EmphasisHeadingLayout
  /** The block's height. */
  height: number
}

/** The callout a closing block can set, or `null` for one it cannot. */
export function closingCallout(component: Component | undefined): Callout | null {
  if (component?.type !== "callout") return null
  if (component.variant === "warn" || component.icon !== undefined) return null
  return component
}

/** `callout` set whole at `spec` in a block `width` wide, or `null` when it does not fit. */
export function fitClosing(callout: Callout, width: number, spec: ClosingSpec, ctx: ComponentCtx): ClosingLayout | null {
  const marked = parseEmphasis(callout.text.trim()).some((segment) => segment.emphasized)
  const text = fitFixed(callout.text, {
    width: width - spec.padX * 2,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: ctx.fonts.body,
    // A marked run turns bold, so a marked block is measured wide.
    bold: marked,
  })
  if (text === null || text.lines.length === 0) return null
  return { callout, text, height: text.lines.length * spec.lineHeight + spec.padY * 2 }
}

/**
 * Georgia's ascent and descent, which the boards' line boxes were resolved
 * with: the baseline of a `size` line centred in its `lineHeight` box.
 */
function baselineInBox(size: number, lineHeight: number): number {
  return Math.round((lineHeight - size * (0.917 + 0.219)) / 2 + size * 0.917)
}

/** Paints a fitted closing block with its top-left corner at `x`, `y`. */
export function paintClosing(
  layout: ClosingLayout,
  place: { x: number; y: number; w: number },
  spec: ClosingSpec,
  ctx: ComponentCtx,
): React.ReactElement {
  const ink = readableOn(ctx.colors.primary)
  const baseline = baselineInBox(spec.size, spec.lineHeight)
  return (
    <g {...blockTag(ctx, layout.callout)}>
      <rect x={place.x} y={place.y} width={place.w} height={layout.height} fill={ctx.colors.primary} />
      {layout.text.lines.map((_line, index) => (
        <text
          key={index}
          x={place.x + spec.padX}
          y={place.y + spec.padY + baseline + index * spec.lineHeight}
          fontFamily={ctx.fonts.body}
          fontSize={spec.size}
          fill={ink}
          dominantBaseline="alphabetic"
        >
          {(layout.text.segments[index] ?? []).map((segment, at) => (
            <tspan key={at} fontWeight={segment.emphasized ? "700" : undefined}>
              {segment.text}
            </tspan>
          ))}
        </text>
      ))}
    </g>
  )
}

/*
 * The notice setting's closing note: the page's "so what" on a light panel
 * rather than a primary block, since bulletin keeps its primary for the one
 * thing a page marks. A warning carries a stroked circle with an exclamation
 * mark before its words; a note or a tip carries none. Text at 20px on 28px
 * lines, up to two lines, with the theme's emphasis on a marked run.
 * bulletin's 2026-10 table and timeline pages (p07, p11).
 *
 * Takes any `callout` without an icon of its own.
 */

const NOTICE_CLOSING = { size: 20, lineHeight: 28, padY: 18, padX: 24, iconPadX: 60, maxLines: 2 }
const NOTICE_ICON = { r: 11, stroke: 2, cx: 33 }

export interface NoticeClosingLayout {
  callout: Callout
  text: EmphasisHeadingLayout
  warn: boolean
  height: number
}

/** The callout a notice closing note can set, or `null`. */
export function noticeClosingCallout(component: Component | undefined): Callout | null {
  if (component?.type !== "callout" || component.icon !== undefined) return null
  return component
}

/** `callout` set whole as a notice closing note `width` wide, or `null` when it does not fit. */
export function fitNoticeClosing(callout: Callout, width: number, ctx: ComponentCtx): NoticeClosingLayout | null {
  const warn = callout.variant === "warn"
  const padLeft = warn ? NOTICE_CLOSING.iconPadX : NOTICE_CLOSING.padX
  const marked = parseEmphasis(callout.text.trim()).some((segment) => segment.emphasized)
  const text = fitFixed(callout.text, {
    width: width - padLeft - NOTICE_CLOSING.padX,
    size: NOTICE_CLOSING.size,
    lineHeight: NOTICE_CLOSING.lineHeight,
    maxLines: NOTICE_CLOSING.maxLines,
    fontFamily: ctx.fonts.body,
    bold: marked,
  })
  if (text === null || text.lines.length === 0) return null
  return { callout, text, warn, height: text.lines.length * NOTICE_CLOSING.lineHeight + NOTICE_CLOSING.padY * 2 }
}

/** Paints a fitted notice closing note with its top-left corner at `x`, `y`. */
export function paintNoticeClosing(
  layout: NoticeClosingLayout,
  place: { x: number; y: number; w: number },
  ctx: ComponentCtx,
): React.ReactElement {
  const fill = panelFill(ctx)
  const ink = accessibleInk(ctx.colors.text, fill, NOTICE_CLOSING.size)
  const padLeft = layout.warn ? NOTICE_CLOSING.iconPadX : NOTICE_CLOSING.padX
  const firstBaseline = centredBaseline(place.y + NOTICE_CLOSING.padY, NOTICE_CLOSING.lineHeight, NOTICE_CLOSING.size)
  const cy = place.y + layout.height / 2
  const cx = place.x + NOTICE_ICON.cx
  return (
    <g {...blockTag(ctx, layout.callout)} data-closing="notice">
      <rect x={place.x} y={place.y} width={place.w} height={layout.height} fill={fill} />
      {layout.warn && (
        <g data-closing-icon="warn">
          <circle cx={cx} cy={cy} r={NOTICE_ICON.r} fill="none" stroke={ink} strokeWidth={NOTICE_ICON.stroke} />
          <rect x={cx - 1.2} y={cy - 7} width={2.4} height={9} fill={ink} />
          <rect x={cx - 1.2} y={cy + 5} width={2.4} height={2.6} fill={ink} />
        </g>
      )}
      {paintLines(layout.text, {
        ctx,
        x: place.x + padLeft,
        y: firstBaseline,
        fill: ink,
        fontFamily: ctx.fonts.body,
        fontWeight: "400",
        bg: fill,
      })}
    </g>
  )
}
