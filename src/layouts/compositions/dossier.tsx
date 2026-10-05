import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { evidenceInk, inkToward, type Tag } from "../../components/tag"
import { emphasisRunInk, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { accessibleInk, blendOver, contrastRatio, graphicInk, metaInk, readableOn, requiredContrastRatio, resolveSemanticColor } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Tone = NonNullable<Extract<Component, { type: "timeline" }>["milestones"][number]["tone"]>

/*
 * The dossier setting: a clinical assessment file, the way a pharmacy and
 * therapeutics committee reads a submission. Settled on clinic's 2026-10
 * board (`design/rounds/2026-10-05-clinic/`).
 *
 * The page is evidence laid out for a decision. Figures sit on rounded
 * cards, the surface over a 1px hairline, and every figure says where it
 * comes from in a small rounded capsule outlined in the ink its kind of
 * source takes (`evidenceInk`): a journal's trial apart from a label, a
 * company's own figures, a press report, a draft out for comment. The thing
 * a page is about is set in the mark (the theme's emphasis ink), on its pale
 * tint when it is a row. What is read against it, a placebo or a control,
 * is drawn as an outline, a hollow dot or a tick, never as a solid bar of
 * its own. The theme's accent only draws lines and dots: the heartbeat, a
 * connector, a step's number. Risk and cost reminders take the warning ink,
 * a breach the danger ink. Everything is set in the body face, bold for
 * titles and figures.
 *
 * The board's small type (12 and 13px labels, sources, capsules and the
 * running head, 14 and 15px notes) is under the 16px floor and carries the
 * `dossier-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const DOSSIER_SPEC = { "data-font-floor-exempt": "dossier-spec" } as const

/** `DOSSIER_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function dossierSmall(size: number): Record<string, string> {
  return size < 16 ? { ...DOSSIER_SPEC } : {}
}

export interface DossierInks {
  /** The page. */
  ground: string
  /** A card's face. */
  paper: string
  /** Words, the rule under a table's headers. */
  ink: string
  /** Labels, notes, sources. */
  muted: string
  /** Hairlines between rows and around cards. Never words. */
  line: string
  /** The one mark: what the page is about. */
  mark: string
  /** Lines and dots only: the heartbeat, a connector, a step's number. */
  accent: string
  /** The mark's pale tint, under the row a page lands on. */
  tint: string
  /** What is read against the mark: a control's outline, a hollow dot. */
  ghost: string
  /** The accent's pale tint: a band that steps back beside a solid one. */
  pale: string
  /** A quiet fill: the ground a final no stands on. */
  hush: string
  /** The kinds of news. */
  danger: string
  warning: string
  success: string
}

/** The mark's tint over the page: the board's #E3EFEA over its #F2F7F4. */
const TINT_MIX = 0.06
/** How far the ghost sits from the page toward the muted ink: the board's #B9C7C1. */
const GHOST_MIX = 0.36
/** The accent over the page: the board's #BFDDD3. */
const PALE_MIX = 0.28
/** The muted ink over the page: the board's #E2E9E6. */
const HUSH_MIX = 0.1

export function dossierInks(ctx: ComponentCtx): DossierInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const mark = emphasisRunInk(colors)
  return {
    ground,
    paper: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    line: colors.border ?? blendOver(colors.muted, ground, 0.2),
    mark,
    accent: colors.accent,
    tint: blendOver(mark, ground, TINT_MIX),
    ghost: blendOver(colors.muted, ground, GHOST_MIX),
    pale: blendOver(colors.accent, ground, PALE_MIX),
    hush: blendOver(colors.muted, ground, HUSH_MIX),
    danger: resolveSemanticColor("danger", colors),
    warning: resolveSemanticColor("warning", colors),
    success: resolveSemanticColor("success", colors),
  }
}

/**
 * The inks a page's series and groups take, in order: the chart palette
 * without the accent, which only draws lines, and without the mark when the
 * mark is not its lead. clinic's teal, vein blue and slate.
 */
export function dossierSeries(ctx: ComponentCtx): string[] {
  const accent = ctx.colors.accent.toUpperCase()
  const palette = ctx.colors.chartPalette.filter((c) => c.toUpperCase() !== accent)
  return palette.length > 0 ? palette : [emphasisRunInk(ctx.colors)]
}

/** The ink of a tone, or `undefined` for none. */
export function dossierTone(inks: DossierInks, tone: Tone | undefined): string | undefined {
  return tone ? inks[tone] : undefined
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink, so a
 * series' vein blue or the warning's brown that is too light for small words
 * prints a darker blue or brown rather than turning black.
 */
export function dossierText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** `ink` where it reads on `ground` at `size`, otherwise the least step of it toward the text ink that does. */
export function dossierStepped(ink: string, toward: string, ground: string, size: number): string {
  return inkToward(ink, toward, ground, size)
}

/** Quiet text (a source, a label) held to the 3:1 a meta line needs. */
export function dossierMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/**
 * The readable ink on a block filled with `fill`, laid over it at `alpha` so
 * a quieter line steps back toward the fill where it still reads at `size`:
 * the board's pale label (80%) and text (86%) on a teal card. At full alpha,
 * or where the paler ink would not read, the readable ink itself.
 */
export function dossierOn(fill: string, size: number, alpha = 1): string {
  const on = readableOn(fill)
  const preferred = alpha < 1 ? blendOver(on, fill, alpha) : on
  return accessibleInk(preferred, fill, size) === preferred ? preferred : on
}

/**
 * A solid fill that carries words of `size`, and the words: the neutral ink
 * that reads on `toward` (white on clinic, toward its dark text ink), and
 * `fill` itself when those words read on it, otherwise the least step of it
 * toward `toward` they do. The board set white words on the accent and the
 * warning ink, which neither carries at 14 to 16px. On a dark page `toward`
 * is light and the words are dark, the same treatment turned over.
 */
export function dossierSolid(fill: string, toward: string, size: number): { fill: string; words: string } {
  const words = readableOn(toward)
  const floor = requiredContrastRatio(size)
  for (let step = 0; step <= 20; step++) {
    const candidate = step === 0 ? fill : blendOver(toward, fill, step / 20)
    if (contrastRatio(words, candidate) >= floor) return { fill: candidate, words }
  }
  return { fill: toward, words }
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function dossierBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface DossierTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitDossier(text: string | undefined, spec: DossierTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
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
export function paintDossier(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    top: number
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    ground?: string
    attrs?: Record<string, string>
  },
): React.ReactNode {
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: dossierBaseline(opts.top, layout.lineHeight, layout.fontSize),
    fill: opts.fill,
    fontFamily: opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    attrs: { ...dossierSmall(layout.fontSize), ...opts.attrs },
  })
}

/** One line of text known to fit, painted in a `lineHeight` box whose top is `top`. */
export function paintDossierLine(
  text: string,
  opts: {
    ctx: ComponentCtx
    x: number
    top: number
    lineHeight: number
    size: number
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string
    baseline?: number
  },
): React.ReactElement {
  return (
    <text
      key={opts.key}
      {...dossierSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.baseline ?? dossierBaseline(opts.top, opts.lineHeight, opts.size)}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line at `size`. */
export function dossierWidth(text: string, size: number, ctx: ComponentCtx, bold = false): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintDossierTracked(opts: {
  ctx: ComponentCtx
  text: string
  x: number
  y: number
  size: number
  tracking: number
  fill: string
  bold?: boolean
  attrs?: Record<string, string>
  key?: string
}): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      key={opts.key}
      {...dossierSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
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

/** The tracked width of `text`, as `paintDossierTracked` sets it. */
export function dossierTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return dossierWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/**
 * The evidence capsule: a few words in bold 12px inside a rounded 1px outline
 * 22px tall, outlined and lettered in the ink its kind of source takes. A
 * capsule with no kind is outlined in the mark, a quiet one in the muted
 * ink.
 */
export const CHIP = { size: 12, height: 22, padX: 11 } as const

const WIDE_CHAR = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u3000-\u303F]/u

/**
 * A capsule's width for `text`: a full em for each wide character and 0.6em
 * for any other, the board's allowance, a little wider than the words so
 * Latin capsules keep the same air as Chinese ones, and never narrower than
 * the words themselves.
 */
export function chipWidth(text: string, ctx: ComponentCtx): number {
  const allowance = Array.from(text).reduce((w, ch) => w + (WIDE_CHAR.test(ch) ? 1 : 0.6) * CHIP.size, 0)
  return Math.ceil(Math.max(allowance, dossierWidth(text, CHIP.size, ctx, true)) + CHIP.padX * 2)
}

/** The ink a tag's capsule takes. */
export function chipInk(tag: Tag, ctx: ComponentCtx, inks: DossierInks): string {
  if (tag.tone) return inks[tag.tone]
  if (tag.evidence) return evidenceInk(ctx.colors, tag.evidence)
  return tag.quiet ? inks.muted : inks.mark
}

/** Paints a capsule with its left edge at `x` and its top at `y`, on `ground`. */
export function paintChip(opts: {
  ctx: ComponentCtx
  text: string
  ink: string
  x: number
  y: number
  ground: string
  width?: number
  height?: number
  size?: number
  key?: string
}): React.ReactElement {
  const h = opts.height ?? CHIP.height
  const size = opts.size ?? CHIP.size
  const w = opts.width ?? chipWidth(opts.text, opts.ctx)
  return (
    <g key={opts.key} data-dossier-chip="">
      <rect
        x={opts.x + 0.5}
        y={opts.y + 0.5}
        width={w - 1}
        height={h - 1}
        rx={(h - 1) / 2}
        fill="none"
        stroke={graphicInk(opts.ink, opts.ground)}
        strokeWidth={1}
      />
      {paintDossierLine(opts.text, {
        ctx: opts.ctx,
        x: opts.x + w / 2,
        top: opts.y,
        lineHeight: h,
        size,
        bold: true,
        anchor: "middle",
        fill: dossierStepped(opts.ink, opts.ctx.colors.text, opts.ground, size),
      })}
    </g>
  )
}

/** A card: the surface inside a 1px hairline, its corners rounded `r`. */
export function paintDossierCard(
  box: { x: number; y: number; w: number; h: number },
  inks: DossierInks,
  opts: { r?: number; fill?: string; stroke?: string; key?: string; attrs?: Record<string, string> } = {},
): React.ReactElement {
  const r = opts.r ?? 10
  return (
    <rect
      key={opts.key}
      {...opts.attrs}
      x={box.x + 0.5}
      y={box.y + 0.5}
      width={box.w - 1}
      height={box.h - 1}
      rx={r}
      fill={opts.fill ?? inks.paper}
      stroke={opts.stroke ?? inks.line}
      strokeWidth={1}
    />
  )
}

/**
 * A 3px edge along a card's top, following its rounded corners down into the
 * hairline: the board's `border-top: 3px` on a 10px-rounded card.
 */
export function paintTopEdge(box: { x: number; y: number; w: number }, color: string, r = 10, key?: string): React.ReactElement {
  const t = 1.5
  const x0 = box.x + t
  const x1 = box.x + box.w - t
  const y = box.y + t
  const rr = r - t
  return (
    <path
      key={key}
      data-dossier-edge=""
      d={`M ${x0} ${y + rr} A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y} L ${x1 - rr} ${y} A ${rr} ${rr} 0 0 1 ${x1} ${y + rr}`}
      fill="none"
      stroke={color}
      strokeWidth={3}
    />
  )
}

/**
 * An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on
 * `ground`. A `quiet` icon keeps its pale ink: it only steps back beside
 * words that say the same, as a ghosted symbol on an option that is not
 * taken.
 */
export function paintDossierIcon(name: string, x: number, y: number, size: number, color: string, ground: string, key?: string, quiet = false): React.ReactElement {
  return (
    <g key={key} data-dossier-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={quiet ? color : graphicInk(color, ground)} />
    </g>
  )
}

/** The short heartbeat the board draws: a flat line with one beat in it, `at` of the way along. */
export function heartbeatPoints(x: number, y: number, w: number, at: number): string {
  const bx = x + w * at
  const points: [number, number][] = [
    [x, y],
    [bx, y],
    [bx + 6, y - 10],
    [bx + 12, y + 14],
    [bx + 18, y - 22],
    [bx + 24, y + 6],
    [bx + 30, y],
    [x + w, y],
  ]
  return points.map(([px, py]) => `${Math.round(px * 10) / 10},${Math.round(py * 10) / 10}`).join(" ")
}

/** A signed figure as the board writes it: a true minus sign, a plus for a rise. */
export function signed(value: number, decimals: number, unit = ""): string {
  const body = Math.abs(value).toFixed(decimals)
  const sign = value < 0 ? "−" : value > 0 ? "+" : ""
  return `${sign}${body}${unit}`
}
