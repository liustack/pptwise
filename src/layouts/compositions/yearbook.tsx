import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { evidenceInk, inkToward, type Tag } from "../../components/tag"
import { joinUnit } from "../../lib/quantity-format"
import { emphasisRunInk, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, graphicInk, metaInk, readableOn, resolveSemanticColor } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { fitMono, monoWidth } from "./console"
import { centredBaseline, fitFixed, paintLines } from "./type"

/*
 * The yearbook setting: a long-term account kept year by year, the way a
 * sustainability office reports to a board that has to decide what to do
 * about rules that run for a decade. Settled on almanac's 2026-10 board
 * (`design/rounds/2026-10-05-almanac/`).
 *
 * The page is a year in a long run. Figures sit on flat cards, the surface
 * over a 1px hairline rounded 6px, their icons in the mark; figures, dates,
 * years and formulas are set in the mono face; every figure that is not a
 * settled fact says so in a small rounded pill (`yearbookPill`): a § before
 * a provision of law, a dash around an estimate, a figure still to be filled
 * in, a rule only proposed, or a company's own claim. The mark (the
 * theme's primary, olive on almanac) is what the page settles on: the
 * card the committee decides, the line the page follows. The accent (ochre)
 * is spent at most once a page, on the money that comes due or the figure
 * the page argues from, and on what is only proposed or estimated. A quieter
 * series ink (khaki) carries clauses, drafts and claims; a ghost of it draws
 * what a page reads against.
 *
 * The board's small type (11px years, 12 and 13px labels, pills, sources,
 * the running head and the folio, 14 and 15px notes) is under the 16px floor
 * and carries the `yearbook-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const YEARBOOK_SPEC = { "data-font-floor-exempt": "yearbook-spec" } as const

/** `YEARBOOK_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function yearbookSmall(size: number): Record<string, string> {
  return size < 16 ? { ...YEARBOOK_SPEC } : {}
}

export interface YearbookInks {
  /** The page. */
  ground: string
  /** A card's face. */
  paper: string
  /** Words. */
  ink: string
  /** Labels, notes, sources. */
  muted: string
  /** Hairlines and card edges. Never words. */
  line: string
  /** What the page settles on: the decision card, the followed line, a lit year. */
  mark: string
  /** The money that comes due, the figure argued from, what is only proposed or estimated. Once a page. */
  accent: string
  /** Clauses, drafts, claims and the second series: the palette's quietest ink. */
  quiet: string
  /** The palette's other quiet ink: a further series. */
  second: string
  /** What a page reads against: a ghost of the quiet ink. */
  ghost: string
  /** The mark's pale tint over a card: a decided column, a year that is counted. */
  tint: string
  /** The accent's pale tint over a card: a year that is paid, the phase the page is about. */
  warm: string
  /** A card one step under the page: an answer that is wrong. */
  hush: string
  danger: string
  warning: string
  success: string
}

/** The board's ghost #C9BFA8: its khaki over the page at 38%. */
const GHOST_MIX = 0.38
/** The board's olive tint #DFE2CF: the mark over a card at 13.5%. */
const TINT_MIX = 0.135
/** The board's ochre tint #EFDCCD: the accent over a card at 15%. */
const WARM_MIX = 0.15
/** The board's sunken card #F1EDE3: the muted ink over a card at 4%. */
const HUSH_MIX = 0.04

/**
 * The palette's quieter inks, the ones that are neither the primary, the
 * accent nor the emphasis ink: almanac's deep lake and khaki. The last is
 * the quietest and takes clauses and drafts.
 */
function quieterInks(ctx: ComponentCtx): string[] {
  const { colors } = ctx
  const taken = new Set([colors.primary, colors.accent, colors.emphasisInk].filter((c): c is string => Boolean(c)).map((c) => c.toUpperCase()))
  return colors.chartPalette.filter((c) => !taken.has(c.toUpperCase()))
}

export function yearbookInks(ctx: ComponentCtx): YearbookInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const quieter = quieterInks(ctx)
  const quiet = quieter[quieter.length - 1] ?? colors.muted
  const second = quieter.length > 1 ? quieter[0]! : colors.muted
  return {
    ground,
    paper: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    line: colors.border ?? blendOver(colors.muted, ground, 0.2),
    mark: colors.primary,
    accent: colors.accent,
    quiet,
    second,
    ghost: blendOver(quiet, ground, GHOST_MIX),
    tint: blendOver(colors.primary, colors.surface, TINT_MIX),
    warm: blendOver(colors.accent, colors.surface, WARM_MIX),
    hush: blendOver(colors.muted, colors.surface, HUSH_MIX),
    danger: resolveSemanticColor("danger", colors),
    warning: resolveSemanticColor("warning", colors),
    success: resolveSemanticColor("success", colors),
  }
}

/** The ink a `**…**` run takes on a yearbook page: the theme's emphasis ink. */
export function yearbookRunInk(ctx: ComponentCtx): string {
  return emphasisRunInk(ctx.colors)
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink, so an
 * ochre or a khaki too light for small words prints a darker ochre or khaki
 * rather than turning black.
 */
export function yearbookText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a folio) held to the 3:1 a meta line needs. */
export function yearbookMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function yearbookBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface YearbookTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size` in the body face, or `null` when it does not fit whole. */
export function fitYearbook(text: string | undefined, spec: YearbookTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(text, {
    width: spec.width,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: spec.bold ? ctx.fonts.heading : ctx.fonts.body,
    bold: spec.bold === true,
  })
}

/** `text` set at exactly `spec.size` in the mono face, or `null` when it does not fit whole. */
export function fitYearbookMono(text: string | undefined, spec: Omit<YearbookTextSpec, "bold">): EmphasisHeadingLayout | null {
  return fitMono(text, { width: spec.width, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines })
}

/** Paints a fitted block whose first line box starts at `top`, one `<text>` per line. */
export function paintYearbook(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    /** The first line box's top; or give the first line's `baseline` instead. */
    top?: number
    baseline?: number
    fill: string
    bold?: boolean
    mono?: boolean
    anchor?: "start" | "middle" | "end"
    ground?: string
    attrs?: Record<string, string>
    lastAttrs?: Record<string, string>
    runInk?: string
    runWeight?: "700"
  },
): React.ReactNode {
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: opts.baseline ?? yearbookBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize),
    runInk: opts.runInk,
    runWeight: opts.runWeight,
    fill: opts.fill,
    fontFamily: opts.mono ? opts.ctx.fonts.mono : opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    attrs: { ...yearbookSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text known to fit, painted on `baseline`, or centred in a `lineHeight` box whose top is `top`. */
export function paintYearbookLine(
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
    mono?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string
  },
): React.ReactElement {
  const y = opts.baseline ?? yearbookBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...yearbookSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.mono ? opts.ctx.fonts.mono : opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line at `size`, in the body face, or the mono face when `mono`. */
export function yearbookWidth(text: string, size: number, ctx: ComponentCtx, bold = false, mono = false): number {
  if (mono) return monoWidth(text, size)
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintYearbookTracked(opts: {
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
      {...yearbookSmall(opts.size)}
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

/** The tracked width of `text`, as `paintYearbookTracked` sets it. */
export function yearbookTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return yearbookWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** A card's corner, the board's 6px. */
export const CARD_R = 6

/** A card: the surface inside a 1px hairline, dashed when what it holds is not settled. */
export function paintYearbookCard(
  box: { x: number; y: number; w: number; h: number },
  inks: YearbookInks,
  opts: { fill?: string; fillOpacity?: number; stroke?: string; dashed?: boolean; strokeWidth?: number; r?: number; key?: string; attrs?: Record<string, string> } = {},
): React.ReactElement {
  const sw = opts.strokeWidth ?? 1
  return (
    <rect
      key={opts.key}
      {...opts.attrs}
      x={box.x + sw / 2}
      y={box.y + sw / 2}
      width={box.w - sw}
      height={box.h - sw}
      rx={opts.r ?? CARD_R}
      fill={opts.fill ?? inks.paper}
      fillOpacity={opts.fillOpacity}
      stroke={opts.stroke ?? inks.line}
      strokeWidth={sw}
      strokeDasharray={opts.dashed ? CARD_DASH : undefined}
    />
  )
}

/** The dash of a card, a box or a band that holds what is not settled. */
export const CARD_DASH = "4 3"

/**
 * An edge `width` px thick along a card's top, following its rounded corners
 * down into the hairline: the board's `border-top: 3px` on a 6px card.
 * Dashed when the card holds what is not settled.
 */
export function paintYearbookEdge(box: { x: number; y: number; w: number }, color: string, opts: { width?: number; dashed?: boolean; r?: number; key?: string } = {}): React.ReactElement {
  const t = (opts.width ?? 3) / 2
  const r = opts.r ?? CARD_R
  const x0 = box.x + t
  const x1 = box.x + box.w - t
  const y = box.y + t
  const rr = Math.max(0, r - t)
  return (
    <path
      key={opts.key}
      data-yearbook-edge=""
      d={`M ${x0} ${y + rr} A ${rr} ${rr} 0 0 1 ${x0 + rr} ${y} L ${x1 - rr} ${y} A ${rr} ${rr} 0 0 1 ${x1} ${y + rr}`}
      fill="none"
      stroke={color}
      strokeWidth={opts.width ?? 3}
      strokeDasharray={opts.dashed ? CARD_DASH : undefined}
    />
  )
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintYearbookIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-yearbook-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

/**
 * The pill: a few words in bold 12px inside a rounded 1px outline 22px tall,
 * the board's 口径 tag. Its ink and its dash say how firm what it marks is
 * (`pillLook`), and a provision of law is cited after a section sign.
 */
export const PILL = { size: 12, height: 22, padX: 11 } as const

const WIDE_CHAR = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u3000-\u303F]/u

/** The words a pill prints: a law's citation after a section sign. */
export function pillText(tag: Pick<Tag, "text" | "basis">): string {
  const text = tag.text.trim()
  return tag.basis === "law" && !text.startsWith("§") ? `§ ${text}` : text
}

/**
 * A pill's width for `text`: a full em for each wide character and 0.6em for
 * any other, the board's allowance, and never narrower than the words.
 */
export function pillWidth(text: string, ctx: ComponentCtx): number {
  const allowance = Array.from(text).reduce((w, ch) => w + (WIDE_CHAR.test(ch) ? 1 : 0.6) * PILL.size, 0)
  return Math.ceil(Math.max(allowance, yearbookWidth(text, PILL.size, ctx, true)) + PILL.padX * 2)
}

/** Whether a tag says what it marks is not settled: a basis other than the law, or a source that is a draft, a claim or a report. */
export function pillUnsettled(tag: Tag): boolean {
  if (tag.basis !== undefined) return tag.basis !== "law"
  return tag.evidence === "draft" || tag.evidence === "company" || tag.evidence === "press"
}

/**
 * How a pill looks on a yearbook page. The law, every kind of source, a
 * pending figure and a draft in the quiet ink; an estimate and a proposal in
 * the accent; a tone in its own ink; any other tag in the mark, a quiet one
 * in the muted ink. Dashed when what it marks is not settled.
 */
export function pillLook(tag: Tag, inks: YearbookInks): { ink: string; dashed: boolean } {
  const dashed = pillUnsettled(tag)
  if (tag.tone) return { ink: inks[tag.tone], dashed }
  if (tag.basis === "estimate" || tag.basis === "proposal") return { ink: inks.accent, dashed }
  if (tag.basis !== undefined || tag.evidence !== undefined) return { ink: inks.quiet, dashed }
  return { ink: tag.quiet ? inks.muted : inks.mark, dashed }
}

/** The ink a tag's source would take elsewhere, for a theme whose palette has no quiet ink to spare. */
export function sourceInk(tag: Tag, ctx: ComponentCtx): string | undefined {
  return tag.evidence ? evidenceInk(ctx.colors, tag.evidence) : undefined
}

/** Paints a pill with its left edge at `x` and its top at `y`, on `ground`, in `ink` unless the tag's own look is wanted. */
export function paintPill(opts: {
  ctx: ComponentCtx
  tag: Tag
  x: number
  y: number
  ground: string
  inks: YearbookInks
  /** An ink to draw it in rather than its own: the ink of the box it stands in. */
  ink?: string
  key?: string
}): React.ReactElement {
  const look = pillLook(opts.tag, opts.inks)
  const ink = opts.ink ?? look.ink
  const text = pillText(opts.tag)
  const w = pillWidth(text, opts.ctx)
  return (
    <g key={opts.key} data-yearbook-pill={opts.tag.basis ?? opts.tag.evidence ?? ""}>
      <rect
        x={opts.x + 0.5}
        y={opts.y + 0.5}
        width={w - 1}
        height={PILL.height - 1}
        rx={(PILL.height - 1) / 2}
        fill="none"
        stroke={graphicInk(ink, opts.ground)}
        strokeWidth={1}
        strokeDasharray={look.dashed ? PILL_DASH : undefined}
      />
      {paintYearbookLine(text, {
        ctx: opts.ctx,
        x: opts.x + w / 2,
        top: opts.y,
        lineHeight: PILL.height,
        size: PILL.size,
        bold: true,
        anchor: "middle",
        fill: inkToward(ink, opts.ctx.colors.text, opts.ground, PILL.size),
      })}
    </g>
  )
}

/** A pill's dash: short, so it still reads as one label. */
export const PILL_DASH = "3 2"

/** A year as the strip and the axes print it, from a date written 2026, 2026-04 or 2026-04-07. */
export function yearOf(date: string): number | null {
  const match = /^\s*(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?\s*$/.exec(date)
  return match ? Number(match[1]) : null
}

/**
 * Where a date written 2026, 2026-04 or 2026-04-07 falls, in months from
 * the start of 2000, the day counting as a share of its month: the scale a
 * calendar lays its milestones on. `null` for any other way of writing a date.
 */
export function monthsOf(date: string): number | null {
  const match = /^\s*(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?\s*$/.exec(date)
  if (!match) return null
  const year = Number(match[1])
  const month = match[2] ? Number(match[2]) : 1
  const day = match[3] ? Number(match[3]) : 1
  if (month < 1 || month > 12 || day < 1 || day > 31) return null
  return (year - 2000) * 12 + (month - 1) + (day - 1) / 30
}

/** The strip of years at the top right of a page: its ends, and the dot and label sizes the board drew. */
export const STRIP = { x0: 860, x1: 1216, y: 36, on: 5, off: 3.5, stroke: 1.5, label: { size: 11, rise: 10 } } as const

/**
 * The run of years a page follows, `from` to `to`, a dot on a hairline for
 * each, the years the page is about (`marked`) lit: a larger dot filled in
 * the mark and its year over it in bold. The first and the last year are
 * always named, in the muted ink when they are not lit. Every other year is
 * a small hollow dot in the ghost ink.
 */
export function YearStrip({ years, ctx, x0 = STRIP.x0, x1 = STRIP.x1, y = STRIP.y }: { years: { from: number; to: number; marked: readonly number[] }; ctx: ComponentCtx; x0?: number; x1?: number; y?: number }): React.ReactElement {
  const inks = yearbookInks(ctx)
  const count = years.to - years.from + 1
  const step = count > 1 ? (x1 - x0) / (count - 1) : 0
  const lit = new Set(years.marked)
  return (
    <g data-yearbook-strip="">
      <line x1={x0} y1={y} x2={x1} y2={y} stroke={inks.line} strokeWidth={STRIP.stroke} />
      {Array.from({ length: count }, (_, i) => {
        const year = years.from + i
        const x = x0 + i * step
        const on = lit.has(year)
        const named = on || i === 0 || i === count - 1
        return (
          <g key={year} data-year={year} data-year-lit={on ? "1" : undefined}>
            <circle
              cx={x}
              cy={y}
              r={on ? STRIP.on : STRIP.off}
              fill={on ? inks.mark : inks.ground}
              stroke={on ? inks.mark : inks.ghost}
              strokeWidth={STRIP.stroke}
            />
            {named
              ? paintYearbookLine(String(year), {
                  ctx,
                  x,
                  baseline: y - STRIP.label.rise,
                  size: STRIP.label.size,
                  mono: true,
                  bold: on,
                  anchor: "middle",
                  fill: on ? yearbookText(inks.mark, inks.ground, STRIP.label.size) : yearbookMeta(inks.muted, inks.ground),
                })
              : null}
          </g>
        )
      })}
    </g>
  )
}

/** The sprout the board sets before a page's section: the theme's mark, an 18px icon. */
export function Sprout({ ctx, x, y, size = 18 }: { ctx: ComponentCtx; x: number; y: number; size?: number }): React.ReactElement {
  const inks = yearbookInks(ctx)
  return paintYearbookIcon("sprout", x, y, size, inks.mark, inks.ground)
}

type KpiItem = Extract<Component, { type: "kpi_cards" }>["items"][number]

/**
 * A figure card, the board's `kpi()`: its icon in the mark at the top left,
 * the figure bold and large under it, in the accent when the author marked
 * it (`**…**`), its label bold under that and its note muted under the
 * label. A tag says how firm the figure is: a pill in the note's line when
 * the card has no note, otherwise at the card's top right. A figure still
 * pending is drawn on a dashed card.
 */
export const FIGURE_CARD = {
  pad: 20,
  icon: { top: 18, size: 20 },
  value: { top: 44, size: 34, lineHeight: 44 },
  label: { top: 88, size: 13, lineHeight: 20, maxLines: 1 },
  note: { top: 106, size: 12, lineHeight: 18, maxLines: 1 },
  pill: { top: 108 },
  corner: { top: 16 },
} as const

export interface FittedFigure {
  item: KpiItem
  value: EmphasisHeadingLayout
  marked: boolean
  label: EmphasisHeadingLayout
  note: EmphasisHeadingLayout | null
  /** Where the tag stands: in the note's line, or at the card's top right. */
  pillAt: "note" | "corner" | null
  /** How far the card's words reach under its top. */
  depth: number
}

/** The figure card's words fitted to a card `w` wide, or `null` when one does not fit whole. */
export function fitFigureCard(item: KpiItem, w: number, ctx: ComponentCtx, opts: { valueSize?: number; labelLines?: number; noteLines?: number } = {}): FittedFigure | null {
  if (item.delta || item.tone || item.source?.trim()) return null
  const inner = w - FIGURE_CARD.pad * 2
  const { text, marked, unit } = kpiFigure(item.value, item.unit)
  const valueSize = opts.valueSize ?? FIGURE_CARD.value.size
  const value = fitFixed(joinUnit(text, unit), { width: inner, size: valueSize, lineHeight: Math.round(valueSize * 1.3), maxLines: 1, fontFamily: ctx.fonts.heading, bold: true })
  const label = fitYearbook(item.label, { width: inner, size: FIGURE_CARD.label.size, lineHeight: FIGURE_CARD.label.lineHeight, maxLines: opts.labelLines ?? FIGURE_CARD.label.maxLines, bold: true }, ctx)
  const note = item.note?.trim() ? fitYearbook(item.note, { width: inner, size: FIGURE_CARD.note.size, lineHeight: FIGURE_CARD.note.lineHeight, maxLines: opts.noteLines ?? FIGURE_CARD.note.maxLines }, ctx) : null
  if (!value || !label || (item.note?.trim() && !note)) return null
  const extra = (label.lines.length - 1) * FIGURE_CARD.label.lineHeight
  let pillAt: FittedFigure["pillAt"] = null
  if (item.tag) {
    const pw = pillWidth(pillText(item.tag), ctx)
    if (!note && pw <= inner) pillAt = "note"
    else if (pw <= inner - (item.icon ? FIGURE_CARD.icon.size + 16 : 0)) pillAt = "corner"
    else return null
  }
  const noteH = note ? note.lines.length * FIGURE_CARD.note.lineHeight : pillAt === "note" ? PILL.height + 2 : 0
  return { item, value, marked, label, note, pillAt, depth: FIGURE_CARD.note.top + extra + noteH }
}

/** Whether a figure's tag says it is still pending, which dashes its card. */
export function figurePending(item: KpiItem): boolean {
  return item.tag?.basis === "pending"
}

/** Paints a fitted figure card at `box`, on `inks.ground`. */
export function paintFigureCard(f: FittedFigure, box: { x: number; y: number; w: number; h: number }, ctx: ComponentCtx, inks: YearbookInks, key?: string): React.ReactElement {
  const x = box.x + FIGURE_CARD.pad
  const extra = (f.label.lines.length - 1) * FIGURE_CARD.label.lineHeight
  const valueInk = yearbookText(f.marked ? inks.accent : inks.ink, inks.paper, f.value.fontSize)
  return (
    <g key={key} data-yearbook-figure={f.marked ? "marked" : ""}>
      {paintYearbookCard(box, inks, { dashed: figurePending(f.item) })}
      {f.item.icon ? paintYearbookIcon(f.item.icon, x, box.y + FIGURE_CARD.icon.top, FIGURE_CARD.icon.size, inks.mark, inks.paper) : null}
      {paintYearbook(f.value, { ctx, x, top: box.y + FIGURE_CARD.value.top + (FIGURE_CARD.value.lineHeight - f.value.lineHeight) / 2, bold: true, fill: valueInk, ground: inks.paper, runInk: valueInk })}
      {paintYearbook(f.label, { ctx, x, top: box.y + FIGURE_CARD.label.top, bold: true, fill: yearbookText(inks.ink, inks.paper, FIGURE_CARD.label.size), ground: inks.paper })}
      {f.note ? paintYearbook(f.note, { ctx, x, top: box.y + FIGURE_CARD.note.top + extra, fill: yearbookText(inks.muted, inks.paper, FIGURE_CARD.note.size), ground: inks.paper }) : null}
      {f.item.tag && f.pillAt === "note" ? paintPill({ ctx, tag: f.item.tag, x, y: box.y + FIGURE_CARD.pill.top + extra, ground: inks.paper, inks }) : null}
      {f.item.tag && f.pillAt === "corner"
        ? paintPill({ ctx, tag: f.item.tag, x: box.x + box.w - FIGURE_CARD.pad - pillWidth(pillText(f.item.tag), ctx), y: box.y + FIGURE_CARD.corner.top, ground: inks.paper, inks })
        : null}
    </g>
  )
}
