import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { emphasisRunInk, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, contrastRatio, graphicInk, metaInk, readableOn } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { centredBaseline, fitFixed, paintLines } from "./type"

/*
 * The binder setting: a proposal handed to a client's management in a ring
 * binder. Settled on proposal's 2026-10 board
 * (`design/rounds/2026-10-06-proposal/`) and set as print in its second round.
 *
 * White paper set as print is: hairlines and 2px ink rules part the rows and
 * columns, no cards, chips or tabs. The petrol of the primary carries
 * titles, figures and the running head, a second petrol and a pale sky from
 * the chart palette carry bars and steps, and the accent, a brick red, is
 * on one thing a page: the figure the page lands on, the row it leads with,
 * the numbers of the decisions. Small words in the accent take the theme's
 * emphasis ink, on proposal the brick red itself, which reads on the paper.
 *
 * The board's small type (11 to 15px labels, notes, the source and the
 * folio) is under the 16px floor and carries the `binder-spec` exemption the
 * L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const BINDER_SPEC = { "data-font-floor-exempt": "binder-spec" } as const

/** `BINDER_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function binderSmall(size: number): Record<string, string> {
  return size < 16 ? { ...BINDER_SPEC } : {}
}

export interface BinderInks {
  /** The paper: the page. */
  ground: string
  /** The theme's surface, white like the paper: the inside of the frame where a photograph is missing. */
  card: string
  /** Petrol: titles, figures, the running head, the chapter's half. */
  deep: string
  /** The second petrol: bars, a peak step. */
  data: string
  /** Sky: a reference bar, a flat step. */
  sky: string
  /** Sky at a tint over the paper: a valley step. */
  skyPale: string
  /** Words. */
  ink: string
  /** Labels, notes, the source. */
  muted: string
  /** A figure that was: the muted ink lifted toward the paper. */
  fade: string
  /** Hairlines. Never words. */
  line: string
  /** A bar's outline: the hairline a step darker. */
  rule: string
  /** Ticks and a blank to fill: the hairline two steps darker. */
  tick: string
  /** The brick red: the accent. */
  fire: string
  /** Small words in the brick red: the theme's emphasis ink, on proposal the brick red itself. */
  fireText: string
  /** Words on petrol and on a photograph darkened with it. */
  onDeep: string
  /** A lesson learned the hard way: the theme's danger ink. */
  danger: string
  /** A remedy: the theme's success ink. */
  success: string
}

/** #D6E6EF on the board: the sky at 36% over the paper. */
const SKY_PALE_MIX = 0.36
/** #8A949C on the board: the muted ink 28% of the way to the paper. */
const FADE_MIX = 0.28
/** #CFC8BC and #B9B3A8 on the board: the hairline toward the text ink. */
const RULE_MIX = 0.1
const TICK_MIX = 0.2

export function binderInks(ctx: ComponentCtx): BinderInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const line = colors.border ?? blendOver(colors.muted, ground, 0.25)
  const palette = colors.chartPalette
  const data = palette[0] ?? colors.primary
  const sky = palette[2] ?? blendOver(data, ground, 0.5)
  const fireText = emphasisRunInk(colors)
  return {
    ground,
    card: colors.surface,
    deep: colors.primary,
    data,
    sky,
    skyPale: blendOver(sky, ground, SKY_PALE_MIX),
    ink: colors.text,
    muted: colors.muted,
    fade: blendOver(ground, colors.muted, FADE_MIX),
    line,
    rule: blendOver(colors.text, line, RULE_MIX),
    tick: blendOver(colors.text, line, TICK_MIX),
    fire: colors.accent,
    fireText: contrastRatio(fireText, ground) >= 4.5 ? fireText : inkToward(colors.accent, readableOn(ground), ground, 12),
    onDeep: readableOn(colors.primary),
    danger: colors.danger ?? colors.accent,
    success: colors.success ?? colors.primary,
  }
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink.
 */
export function binderText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a folio) held to the 3:1 a meta line needs. */
export function binderMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function binderBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface BinderTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitBinder(text: string | undefined, spec: BinderTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(text, {
    width: spec.width,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: spec.bold ? ctx.fonts.heading : ctx.fonts.body,
    bold: spec.bold === true,
  })
}

/** Paints a fitted block whose first line box starts at `top`, one `<text>` per line. */
export function paintBinder(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    top?: number
    baseline?: number
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    ground?: string
    runInk?: string
    runWeight?: "700"
    attrs?: Record<string, string>
    lastAttrs?: Record<string, string>
  },
): React.ReactNode {
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: opts.baseline ?? binderBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize),
    fill: opts.fill,
    fontFamily: opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    runInk: opts.runInk,
    runWeight: opts.runWeight,
    attrs: { ...binderSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text known to fit, centred in a `lineHeight` box whose top is `top`, or on `baseline`. */
export function paintBinderLine(
  text: string,
  opts: {
    ctx: ComponentCtx
    x: number
    size: number
    fill: string
    top?: number
    lineHeight?: number
    baseline?: number
    bold?: boolean
    italic?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string | number
  },
): React.ReactElement {
  const y = opts.baseline ?? binderBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...binderSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fontStyle={opts.italic ? "italic" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={text.includes("  ") ? "preserve" : undefined}
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line at `size`. */
export function binderWidth(text: string, size: number, ctx: ComponentCtx, bold = false): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintBinderTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; bold?: boolean; anchor?: "start" | "middle" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      {...binderSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      data-tracking={opts.tracking}
      xmlSpace={opts.text.includes(" ") ? "preserve" : undefined}
    >
      {chars[0]}
      {chars.slice(1).map((ch, i) => (
        <tspan key={i} dx={opts.tracking}>
          {ch}
        </tspan>
      ))}
    </text>
  )
}

/** The tracked width of `text`, as `paintBinderTracked` sets it. */
export function binderTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return binderWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintBinderIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-binder-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Boxes and the lead ──────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The lead on a page. Every shape a composition paints in the brick red sits
 * inside one of these groups, so a test can find what the page lights.
 */
export function Lead({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  return <g data-binder-lead={id}>{children}</g>
}

/**
 * A photograph filling `box`, cropped to it, its top corners (or all four)
 * rounded `r` by small pieces of `ground` laid over them, so PowerPoint, which
 * keeps a picture square, shows the same rounded photograph the preview does.
 * Where the deck has no such asset, the card's surface inside a frame of
 * the hairline stands in for it.
 */
export function paintBinderPhoto(assetId: string, box: Box, ctx: ComponentCtx, inks: BinderInks, opts: { r?: number; ground?: string; corners?: "top" | "all"; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const r = opts.r ?? 0
  const ground = opts.ground ?? inks.ground
  const { x, y, w, h } = box
  if (!asset?.src) return <rect key={opts.key} data-binder-photo={assetId} x={x} y={y} width={w} height={h} fill={inks.card} stroke={inks.line} strokeWidth={1} />
  const top = [
    `M ${x} ${y} L ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} Z`,
    `M ${x + w} ${y} L ${x + w} ${y + r} A ${r} ${r} 0 0 0 ${x + w - r} ${y} Z`,
  ]
  const bottom = [
    `M ${x + w} ${y + h} L ${x + w - r} ${y + h} A ${r} ${r} 0 0 0 ${x + w} ${y + h - r} Z`,
    `M ${x} ${y + h} L ${x} ${y + h - r} A ${r} ${r} 0 0 0 ${x + r} ${y + h} Z`,
  ]
  const corners = r > 0 ? (opts.corners === "all" ? [...top, ...bottom] : top) : []
  return (
    <g key={opts.key} data-binder-photo={assetId}>
      <image href={asset.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
      {corners.map((d, i) => (
        <path key={i} data-photo-corner="" d={d} fill={ground} />
      ))}
    </g>
  )
}

/** A box to tick as on a printed form: `size` square, square cornered, outlined 1.5px in `stroke`, empty. */
export function paintCheckbox(x: number, y: number, size: number, stroke: string, opts: { key?: string | number } = {}): React.ReactElement {
  const w = CHECKBOX_STROKE
  return <rect key={opts.key} data-binder-box="" x={x + w / 2} y={y + w / 2} width={size - w} height={size - w} fill="none" stroke={stroke} strokeWidth={w} />
}

const CHECKBOX_STROKE = 1.5

// ── Reading the author's words ─────────────────────────────────────────

/**
 * Splits `text` at its first sentence end (「。」 or ". ") into the sentence
 * and the rest, with the end the author wrote, or `null` when it is one
 * sentence.
 */
export function splitSentence(text: string): { lead: string; sep: string; rest: string } | null {
  const m = /^(.+?)(。|\. )(.+)$/su.exec(text.trim())
  return m ? { lead: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/**
 * Splits `text` at its first colon (「：」 or ": ") into the name before it and
 * the rest, or `null` when it has none.
 */
export function splitName(text: string): { name: string; sep: string; rest: string } | null {
  const m = /^(.+?)(：|: )(.+)$/su.exec(text.trim())
  return m && m[1]!.trim() && m[3]!.trim() ? { name: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** Splits `text` at its first " · " into the name and what follows, or `null`. */
export function splitDot(text: string): { name: string; rest: string } | null {
  const at = text.indexOf(" · ")
  return at > 0 ? { name: text.slice(0, at).trim(), rest: text.slice(at + 3).trim() } : null
}

/**
 * Splits a trailing parenthetical off `text` (「约 0.76（示意）」, "0.76 (indicative)")
 * into the words and what the brackets hold, or `null` when it has none.
 */
export function splitAside(text: string): { main: string; aside: string; open: string; close: string } | null {
  const m = /^(.+?)\s*(（|\()([^（）()]+)(）|\))$/su.exec(text.trim())
  return m && m[1]!.trim() ? { main: m[1]!.trim(), open: m[2]!, aside: m[3]!.trim(), close: m[4]! } : null
}

/**
 * The space set between a bold lead and the words that run on after it on
 * its line: none after a Chinese character or full-width mark (「这些回收期都还
 * 没扣：」), a word space after anything else ("None of these paybacks deduct:").
 */
export function leadGap(lead: string): string {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]$/u.test(lead.trim()) ? "" : " "
}

/** The attribute that says a separator stood after this line: `data-gloss-break`. */
export function glossBreak(sep: string | undefined): Record<string, string> {
  return sep ? { "data-gloss-break": sep } : {}
}

/** Whether `text` is wholly marked, `**…**`: the cell or line the author lights. */
export function wholeMark(text: string): boolean {
  return /^\*\*[^*]+\*\*$/u.test(text.trim())
}

/** Whether `text` is a blank to fill: nothing but dashes and spaces (「— — —」). */
export function blankToFill(text: string): boolean {
  const t = text.trim()
  return t.length > 0 && /^[\s—–\-－]+$/u.test(t)
}
