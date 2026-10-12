import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { parseEmphasis, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { blendOver, contrastRatio, liftedGraphicInk, metaInk, readableBlock, readableOn } from "../../render/ink"
import { Icon } from "../../render/icons"
import { measureTextUnits } from "../../lib/svg-text-layout"
import {
  fitLineup,
  lineupBaseline,
  lineupChinese,
  lineupText,
  lineupTrackedWidth,
  lineupWidth,
  paintLineup,
  paintLineupLine,
  paintLineupRule,
  paintLineupTracked,
  wholeLit,
  type LineupPaint,
  type LineupTextSpec,
} from "./lineup"

/*
 * The account setting: one person accounting for their year to the people
 * who review it, recap's 2026-10 board (`design/rounds/2026-10-13-recap/`).
 *
 * A review panel reads a year-end report for three things: did the promise
 * hold, how much of it was the speaker's own doing, and what they want next.
 * So the page is a ledger. White paper, the claim black and heavy in the
 * body sans, the figures in a condensed DIN cut (the theme's `figure` font),
 * columns opened by a 2px rule of the ink and parted by pale hairlines. The
 * accent goes to what the speaker led and to the one figure a page is about,
 * and the danger red to what went wrong, always with a shape beside it (a
 * cross, a struck bar) so a recoloured accent never reads as a loss.
 *
 * Who did what is told in a small legend vocabulary set before a word:
 * a filled accent square for the speaker's own part, a hollow grey square
 * for the team's, a red cross for a miss, a tick for what is done and a
 * hollow square in the deep accent for what still waits for approval. A
 * decision is printed as empty boxes to tick, never as a button.
 *
 * The board's small type (12 to 15px labels, notes, legends and the footer)
 * is under the 16px floor and carries the `account-spec` exemption the L1
 * audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way. The text fitting and painting are the lineup
 * setting's, with this setting's exemption, and its marked runs bold in the
 * accent.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const ACCOUNT_SPEC = { "data-font-floor-exempt": "account-spec" } as const

/** Meta-information set quiet on purpose (a unit, a note, the footer): held to 3:1 rather than the body's 4.5:1. */
export const ACCOUNT_META = { "data-contrast-tier": "meta" } as const

/** `ACCOUNT_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function accountSmall(size: number): Record<string, string> {
  return size < 16 ? { ...ACCOUNT_SPEC } : {}
}

export interface AccountInks {
  /** The paper. */
  ground: string
  /** Words, figures and the 2px rule that opens a column. */
  ink: string
  /** Running text a step quieter than the ink. */
  body: string
  /** Labels, units, notes, the footer. */
  muted: string
  /** Hairlines between rows. Never words. */
  line: string
  /** A bar that is the team's or last year's. Never words. */
  bar: string
  /** A pale bar or track that stands behind the one the page is about. Never words. */
  pale: string
  /** The accent: what the speaker led, the figure the page is about. */
  lead: string
  /** The accent darkened a quarter: the section number, the words of a lit legend. */
  deep: string
  /** A pale wash of the accent under the row a page is about. */
  tint: string
  /** What went wrong. Always beside a shape. */
  danger: string
  /** A pale wash of the danger red under the row that missed. */
  dangerTint: string
}

/** #2E353D on the board: the ink most of the way to the grey. */
const BODY_MIX = 0.8
/** #9AA3AE and #E7E9EC on the board: the grey most of the way to the paper. */
const BAR_MIX = 0.55
const PALE_MIX = 0.15
/** The row a page is about sits on the accent at 10% over the paper. */
const TINT_MIX = 0.1
/** The row that missed sits on the danger red at 7% over the paper. */
const DANGER_TINT_MIX = 0.07
/** The deep accent: each channel of the accent at three quarters. */
const DEEP_SHADE = 0.75

/** `hex` with each channel scaled by `factor`. */
export function shadeHex(hex: string, factor: number): string {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16)
  const channel = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)))
    .toString(16)
    .padStart(2, "0")
  return `#${channel((n >> 16) & 255)}${channel((n >> 8) & 255)}${channel(n & 255)}`.toUpperCase()
}

export function accountInks(ctx: ComponentCtx): AccountInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const muted = colors.muted
  // On a dark ground the deep accent is the accent itself: darkening it would lose it.
  const dark = contrastRatio("#FFFFFF", ground) > contrastRatio("#000000", ground)
  const danger = colors.danger ?? "#B42318"
  return {
    ground,
    ink: colors.text,
    body: blendOver(colors.text, muted, BODY_MIX),
    muted,
    line: colors.border ?? blendOver(muted, ground, 0.25),
    bar: blendOver(muted, ground, BAR_MIX),
    pale: blendOver(muted, ground, PALE_MIX),
    lead: colors.accent,
    deep: dark ? colors.accent : shadeHex(colors.accent, DEEP_SHADE),
    tint: blendOver(colors.accent, ground, TINT_MIX),
    danger,
    dangerTint: blendOver(danger, ground, DANGER_TINT_MIX),
  }
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the readable ink when it falls short. */
export function accountText(ink: string, ground: string, size: number): string {
  return lineupText(ink, ground, size)
}

/** Quiet text (a unit, a note, the footer) held to the 3:1 a meta line needs. */
export function accountMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/**
 * A graphic (a rule that carries meaning, an icon, a bar, a legend square)
 * held to 3:1 on `ground`, darkened by the least that clears it so a light
 * brand colour (an orange) keeps its hue rather than turning to the ink.
 */
export function accountMark(ink: string, ground: string): string {
  return liftedGraphicInk(ink, ground)
}

/**
 * The one block a page fills whole in the accent (the close's panel), and the
 * ink its words take: the accent as it is when white or the ink reads on it
 * at `size`, otherwise moved just far enough that one does (`readableBlock`).
 */
export function accountBlock(ctx: ComponentCtx, size: number): { fill: string; ink: string } {
  const fill = readableBlock(ctx.colors.accent, size)
  return { fill, ink: readableOn(fill) }
}

// ── Text ────────────────────────────────────────────────────────────────

export type AccountTextSpec = LineupTextSpec

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitAccount(text: string | undefined, spec: AccountTextSpec, ctx: Pick<ComponentCtx, "fonts">): EmphasisHeadingLayout | null {
  return fitLineup(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function accountWidth(text: string, size: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupWidth(text, size, ctx, opts)
}

/** The tracked width of `text`, as `paintAccountTracked` sets it. */
export function accountTrackedWidth(text: string, size: number, tracking: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupTrackedWidth(text, size, tracking, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function accountBaseline(top: number, lineHeight: number, size: number): number {
  return lineupBaseline(top, lineHeight, size, false)
}

/** A fitted block painted one `<text>` a line, its `**…**` runs bold in the accent. */
export function paintAccount(layout: EmphasisHeadingLayout, opts: LineupPaint): React.ReactNode {
  return paintLineup(layout, { litBold: true, ...opts, attrs: { ...accountSmall(layout.fontSize), ...opts.attrs } })
}

/** One line known to fit, its marks in the accent. */
export function paintAccountLine(text: string, opts: Omit<LineupPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  return paintLineupLine(text, { ...opts, attrs: { ...accountSmall(opts.size), ...opts.attrs } })
}

/** `text` with `tracking` px between its characters. */
export function paintAccountTracked(opts: Parameters<typeof paintLineupTracked>[0]): React.ReactElement {
  return paintLineupTracked({ ...opts, attrs: { ...accountSmall(opts.size), ...opts.attrs } })
}

/** A rule from `x1` to `x2`, `width` thick, its top at `y - width / 2`. */
export function paintAccountRule(x1: number, x2: number, y: number, ink: string, width: number, opts: { key?: string | number } = {}): React.ReactElement {
  return paintLineupRule(x1, x2, y, ink, width, opts)
}

export { lineupChinese as accountChinese, wholeLit }

// ── Figures ─────────────────────────────────────────────────────────────

/**
 * The characters a figure takes from the body face rather than the figure
 * face: the minus sign and the arrow, which Bahnschrift does not carry, and
 * any letter or Chinese a figure writes (「27 → 6」, 「36 万元/年」).
 */
const BODY_RUN = /[^0-9.,+\-%/:\s$€£¥]/u

/** A figure's runs: the digits and their marks in the figure face, the rest in the body face. */
export function figureRuns(value: string): { text: string; body: boolean }[] {
  const runs: { text: string; body: boolean }[] = []
  for (const ch of Array.from(value)) {
    const body = BODY_RUN.test(ch)
    const last = runs[runs.length - 1]
    if (last && last.body === body) last.text += ch
    else runs.push({ text: ch, body })
  }
  return runs
}

/** A figure set in the theme's figure face, its unit after it in the body face, smaller. */
export interface AccountFigureSpec {
  size: number
  unit: number
  /** The gap between the figure and its unit. */
  gap: number
  /** 600 for the board's ordinary figures, 700 for the ones it sets heavier. */
  weight?: 600 | 700
  /** The unit's weight: the board sets most units at 500, a few at 700. */
  unitWeight?: 500 | 700
}

/** The width a figure's value takes, its body runs measured in the body face. */
export function figureValueWidth(value: string, size: number, ctx: Pick<ComponentCtx, "fonts">, bold = true): number {
  return figureRuns(value).reduce((w, run) => w + measureTextUnits(run.text, { fontFamily: run.body ? ctx.fonts.body : ctx.fonts.figure, bold }) * size, 0)
}

/** The width a figure and its unit take, as `paintAccountFigure` sets them. */
export function accountFigureWidth(value: string, unit: string | undefined, spec: AccountFigureSpec, ctx: Pick<ComponentCtx, "fonts">): number {
  const w = figureValueWidth(stripEmphasis(value).trim(), spec.size, ctx)
  return unit ? w + spec.gap + accountWidth(unit, spec.unit, ctx, { bold: (spec.unitWeight ?? 500) >= 700 }) : w
}

/** A figure on `baseline` from `x` (or ending at it, or centred on it), its unit after it. */
export function paintAccountFigure(opts: {
  ctx: ComponentCtx
  value: string
  unit?: string
  x: number
  baseline: number
  spec: AccountFigureSpec
  fill: string
  anchor?: "start" | "middle" | "end"
  attrs?: Record<string, string>
}): React.ReactElement {
  const { ctx, spec } = opts
  const value = stripEmphasis(opts.value).trim()
  const total = accountFigureWidth(value, opts.unit, spec, ctx)
  const x = opts.anchor === "end" ? opts.x - total : opts.anchor === "middle" ? opts.x - total / 2 : opts.x
  const runs = figureRuns(value)
  const weight = String(spec.weight ?? 600)
  return (
    <g data-account-figure={value}>
      <text {...opts.attrs} {...accountSmall(spec.size)} x={x} y={opts.baseline} fontFamily={ctx.fonts.figure} fontSize={spec.size} fontWeight={weight} fill={opts.fill} dominantBaseline="alphabetic" xmlSpace={value.includes(" ") ? "preserve" : undefined}>
        {runs.length === 1 && !runs[0]!.body
          ? value
          : runs.map((run, i) =>
              run.body ? (
                <tspan key={i} fontFamily={ctx.fonts.body}>
                  {run.text}
                </tspan>
              ) : (
                <tspan key={i}>{run.text}</tspan>
              ),
            )}
      </text>
      {opts.unit ? (
        <text {...opts.attrs} {...accountSmall(spec.unit)} x={x + figureValueWidth(value, spec.size, ctx) + spec.gap} y={opts.baseline} fontFamily={ctx.fonts.body} fontSize={spec.unit} fontWeight={(spec.unitWeight ?? 500) >= 700 ? "700" : undefined} fill={opts.fill} dominantBaseline="alphabetic" xmlSpace={opts.unit.includes(" ") ? "preserve" : undefined}>
          {opts.unit}
        </text>
      ) : null}
    </g>
  )
}

/** Where a figure of `size` sits in a line box `lineHeight` tall from `top`. */
export function figureBaseline(top: number, lineHeight: number, size: number): number {
  return lineupBaseline(top, lineHeight, size, false)
}

/** A signed figure's sign: `-1` for a loss written with a minus, `1` for a gain, `0` for none. */
export function figureSign(value: string): -1 | 0 | 1 {
  const v = stripEmphasis(value).trim()
  if (/^[−-]\s*\d/u.test(v)) return -1
  if (/^\+\s*\d/u.test(v)) return 1
  return 0
}

/** The number a figure writes, its grouping commas and sign read: 「−7.5%」 is -7.5, 「1,280 元」 is 1280. `null` when it writes none. */
export function figureNumber(value: string): number | null {
  const m = /([+\-−]?)\s*(\d[\d,]*(?:\.\d+)?)/u.exec(stripEmphasis(value))
  if (!m) return null
  const n = Number(m[2]!.replace(/,/g, ""))
  return m[1] === "-" || m[1] === "−" ? -n : n
}

/** `n` written the way the deck writes figures: grouped by thousands, a real minus sign, a plus when `signed`. */
export function formatFigure(n: number, opts: { signed?: boolean; decimals?: number } = {}): string {
  const abs = Math.abs(n)
  const decimals = opts.decimals ?? (Number.isInteger(abs) ? 0 : 1)
  const body = abs.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  if (n < 0) return `−${body}`
  return opts.signed && n > 0 ? `+${body}` : body
}

// ── The legend vocabulary ───────────────────────────────────────────────

/**
 * What a small mark before a word says:
 * - `lead`: the speaker's own part, a filled accent square, the word bold in the deep accent.
 * - `quiet`: the team's part, a hollow grey square, the word in the grey.
 * - `miss`: what went wrong, a red cross, the word bold in red.
 * - `done`: what is finished, a tick, the word bold in the deep accent.
 * - `held`: a target met, a tick in the grey, the word in the grey.
 * - `pending`: what still waits for a decision, a hollow square in the deep accent, the word bold in it.
 */
export type AccountMarkKind = "lead" | "quiet" | "miss" | "done" | "held" | "pending"

/** The mark a tag asks for: its tone first, then whether it steps back. */
export function markOfTag(tag: { quiet?: boolean; tone?: "danger" | "warning" | "success" }): AccountMarkKind {
  if (tag.tone === "danger") return "miss"
  if (tag.tone === "success") return tag.quiet ? "held" : "done"
  if (tag.tone === "warning") return "pending"
  return tag.quiet ? "quiet" : "lead"
}

/** The mark a row asks for from its tone and whether it is lit, or `quiet` when it says neither. */
export function markOfRow(row: { highlight?: boolean; tone?: "danger" | "warning" | "success" }): AccountMarkKind {
  if (row.tone) return markOfTag({ tone: row.tone })
  return row.highlight ? "lead" : "quiet"
}

/** Whether the word beside `kind` is bold. */
function markBold(kind: AccountMarkKind): boolean {
  return kind !== "quiet" && kind !== "held"
}

/** The size of the square or the glyph a mark draws for a word of `size`. */
export function markSize(size: number): number {
  return Math.round(size * 0.78)
}

/** The gap between the mark and its word. */
export function markGap(size: number): number {
  return Math.round(size * 0.45)
}

/** The width a mark and its word take. */
export function accountMarkWidth(text: string, kind: AccountMarkKind, size: number, ctx: Pick<ComponentCtx, "fonts">): number {
  return markSize(size) + markGap(size) + accountWidth(text, size, ctx, { bold: markBold(kind) })
}

/** The ink a mark and its word take on `ground`. */
export function markInk(kind: AccountMarkKind, inks: AccountInks, ground: string, size: number): { mark: string; word: string; fill?: string } {
  switch (kind) {
    case "lead":
      return { mark: accountMark(inks.lead, ground), word: accountText(inks.deep, ground, size), fill: accountMark(inks.lead, ground) }
    case "quiet":
      return { mark: accountMark(inks.muted, ground), word: accountText(inks.muted, ground, size) }
    case "miss":
      return { mark: accountMark(inks.danger, ground), word: accountText(inks.danger, ground, size) }
    case "done":
    case "pending":
      return { mark: accountMark(inks.deep, ground), word: accountText(inks.deep, ground, size) }
    case "held":
      return { mark: accountMark(inks.muted, ground), word: accountText(inks.muted, ground, size) }
  }
}

/** The mark alone, its box `s` square from `x`, `y`. */
export function paintMarkGlyph(kind: AccountMarkKind, x: number, y: number, s: number, ink: { mark: string; fill?: string }): React.ReactElement {
  if (kind === "lead") return <rect data-account-mark={kind} x={x} y={y} width={s} height={s} fill={ink.fill ?? ink.mark} />
  if (kind === "quiet" || kind === "pending") {
    return <rect data-account-mark={kind} x={x + 0.75} y={y + 0.75} width={s - 1.5} height={s - 1.5} fill="none" stroke={ink.mark} strokeWidth={1.5} />
  }
  if (kind === "miss") {
    const p = s * 0.12
    return <path data-account-mark={kind} d={`M${x + p} ${y + p}L${x + s - p} ${y + s - p}M${x + s - p} ${y + p}L${x + p} ${y + s - p}`} fill="none" stroke={ink.mark} strokeWidth={Math.max(1.6, s * 0.2)} strokeLinecap="round" />
  }
  return <path data-account-mark={kind} d={`M${x + s * 0.12} ${y + s * 0.52}L${x + s * 0.4} ${y + s * 0.8}L${x + s * 0.9} ${y + s * 0.22}`} fill="none" stroke={ink.mark} strokeWidth={Math.max(1.6, s * 0.18)} strokeLinecap="round" strokeLinejoin="round" />
}

/** A mark and its word on `baseline` from `x` (or centred on it). */
export function paintAccountMark(opts: { ctx: ComponentCtx; kind: AccountMarkKind; text: string; x: number; baseline: number; size: number; ground?: string; anchor?: "start" | "middle" | "end"; key?: string | number }): React.ReactElement {
  const inks = accountInks(opts.ctx)
  const ground = opts.ground ?? inks.ground
  const ink = markInk(opts.kind, inks, ground, opts.size)
  const s = markSize(opts.size)
  const w = accountMarkWidth(opts.text, opts.kind, opts.size, opts.ctx)
  const x = opts.anchor === "middle" ? opts.x - w / 2 : opts.anchor === "end" ? opts.x - w : opts.x
  // The square sits on the word's middle: its centre a third of the size over the baseline.
  const y = opts.baseline - opts.size * 0.35 - s / 2
  return (
    <g key={opts.key} data-account-legend={opts.text} data-account-kind={opts.kind}>
      {paintMarkGlyph(opts.kind, x, y, s, ink)}
      <text {...accountSmall(opts.size)} x={x + s + markGap(opts.size)} y={opts.baseline} fontFamily={opts.ctx.fonts.body} fontSize={opts.size} fontWeight={markBold(opts.kind) ? "700" : undefined} fill={ink.word} dominantBaseline="alphabetic" xmlSpace={opts.text.includes(" ") ? "preserve" : undefined}>
        {opts.text}
      </text>
    </g>
  )
}

/** An empty box to tick, printed in the ink: a decision, never a button. */
export function paintAccountBox(x: number, y: number, s: number, ink: string, opts: { key?: string | number; fill?: string } = {}): React.ReactElement {
  return <rect key={opts.key} data-account-box="" x={x + 0.75} y={y + 0.75} width={s - 1.5} height={s - 1.5} fill={opts.fill ?? "none"} stroke={ink} strokeWidth={1.5} />
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintAccountIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-account-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={liftedGraphicInk(color, ground)} strokeWidth={opts.stroke} />
    </g>
  )
}

// ── Lines with figures in them ──────────────────────────────────────────

/**
 * A line of words whose marked runs are figures set large in the figure face
 * (「人和钱合计每年 **296** 万元」): the plain words at `size` in the body face,
 * each marked run at `figureSize` and bold, in the ink, and when the line
 * marks several, the last in the accent: the one the line lands on. Its
 * width, or the painted line on `baseline` from `x`.
 */
export function figureLineWidth(text: string, size: number, figureSize: number, ctx: Pick<ComponentCtx, "fonts">): number {
  return parseEmphasis(text).reduce((w, seg) => w + (seg.emphasized ? figureValueWidth(seg.text, figureSize, ctx, true) : measureTextUnits(seg.text, { fontFamily: ctx.fonts.body }) * size), 0)
}

export function paintFigureLine(opts: { ctx: ComponentCtx; text: string; x: number; baseline: number; size: number; figureSize: number; ink: string; lit: string; attrs?: Record<string, string> }): React.ReactElement {
  const segments = parseEmphasis(opts.text)
  const marked = segments.filter((s) => s.emphasized).length
  // A lone marked figure is the line's own figure, in the ink; of several, the last is the one the line lands on.
  const lastLit = marked > 1 ? segments.map((s) => s.emphasized).lastIndexOf(true) : -1
  let x = opts.x
  return (
    <g data-account-figure-line="">
      {segments.map((seg, i) => {
        const at = x
        if (seg.emphasized) {
          x += figureValueWidth(seg.text, opts.figureSize, opts.ctx, true)
          return (
            <text key={i} {...opts.attrs} x={at} y={opts.baseline} fontFamily={opts.ctx.fonts.figure} fontSize={opts.figureSize} fontWeight="700" fill={i === lastLit ? opts.lit : opts.ink} dominantBaseline="alphabetic">
              {seg.text}
            </text>
          )
        }
        x += measureTextUnits(seg.text, { fontFamily: opts.ctx.fonts.body }) * opts.size
        return (
          <text key={i} {...opts.attrs} {...accountSmall(opts.size)} x={at} y={opts.baseline} fontFamily={opts.ctx.fonts.body} fontSize={opts.size} fill={opts.ink} dominantBaseline="alphabetic" xmlSpace="preserve">
            {seg.text}
          </text>
        )
      })}
    </g>
  )
}

// ── The frame a composition places ──────────────────────────────────────

/** The board's measure: x80 to x1200. */
export const ACCOUNT_LEFT = 80
export const ACCOUNT_RIGHT = 1200
export const ACCOUNT_W = ACCOUNT_RIGHT - ACCOUNT_LEFT

/** The section line: the part's number at 16px in the figure face, bold, in the deep accent, 10px of air, its name at 14px tracked 0.14em in the grey; its baseline on y72. */
export const SECTION = { top: 56, baseline: 72, number: 16, size: 14, tracking: 1.96, gap: 10 } as const

/** The source on a line of its own, 13px in the grey from y640. */
export const SOURCE_LINE = { top: 640, size: 13, lineHeight: 20 } as const

/** The claim: 32/45 heavy in the body sans from y84. */
export const CLAIM_LINE = { top: 84, size: 32, lineHeight: 45 } as const

/** Whether `rect` is the whole page: the compositions that set a page by its board's coordinates take nothing smaller. */
export function wholePage(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.w >= 1280 && rect.h >= 720
}

/** Where a composition places the page's section line: `x` and `top` on the page, `w` the room it has. */
export interface AccountKickerColumn {
  x: number
  top: number
  w: number
}

/** Where a composition places the page's claim: its measure, the top of its first line, and the most lines it may take. */
export interface AccountClaimColumn {
  x: number
  w: number
  top?: number
  maxLines?: number
  size?: number
  lineHeight?: number
}

/** Where a composition places the page's source: on its own line from `top`, or in the footer row after the deck's label, `x` to `x + w` the row's measure. */
export interface AccountSourceColumn {
  x: number
  w: number
  top?: number
  footer?: boolean
}

/** A placer's answer: the drawing, `null` when the page has none, or `false` when it does not fit and the composition declines. */
function place<C>(placer: ((column: C) => React.ReactElement | null) | undefined, column: C): React.ReactElement | null | false {
  if (!placer) return null
  return placer(column) ?? false
}

export const placeAccountKicker = place<AccountKickerColumn>
export const placeAccountClaim = place<AccountClaimColumn>
export const placeAccountSource = place<AccountSourceColumn>

/**
 * The section line and the claim under it in a column at `x` of `w`: the
 * section line on y56, the claim from y84, on one line when it fits, more
 * otherwise up to `maxLines`. `bottom` is where the claim's last line box
 * ends. `null` when either does not fit.
 */
export function placeAccountHead(
  kicker: ((column: AccountKickerColumn) => React.ReactElement | null) | undefined,
  claim: ((column: AccountClaimColumn) => React.ReactElement | null) | undefined,
  at: { x: number; w: number; maxLines?: number; top?: number; size?: number; lineHeight?: number },
): { node: React.ReactElement; bottom: number; lines: number } | null {
  const section = placeAccountKicker(kicker, { x: at.x, top: SECTION.top, w: at.w })
  if (section === false) return null
  const top = at.top ?? CLAIM_LINE.top
  const lineHeight = at.lineHeight ?? CLAIM_LINE.lineHeight
  let lines = 1
  let head = placeAccountClaim(claim, { x: at.x, w: at.w, top, maxLines: 1, size: at.size, lineHeight })
  for (let n = 2; head === false && n <= (at.maxLines ?? 2); n++) {
    lines = n
    head = placeAccountClaim(claim, { x: at.x, w: at.w, top, maxLines: n, size: at.size, lineHeight })
  }
  if (head === false || head === null) return null
  return {
    node: (
      <>
        {section}
        {head}
      </>
    ),
    bottom: top + lines * lineHeight,
    lines,
  }
}

/** How far a page's body moves down when the claim takes more than its one line: the board sets the body for a claim of one. */
export function claimDrop(head: { bottom: number }): number {
  return Math.max(0, head.bottom - (CLAIM_LINE.top + CLAIM_LINE.lineHeight))
}

/**
 * The lowest a body may reach beside the source `credit` a composition
 * placed with `footer: true`: `bottom` when the credit joined the footer row
 * or the page has none, else clear of the source's own line.
 */
export function accountBodyBottom(credit: React.ReactElement | null, bottom: number): number {
  const ownLine = credit !== null && (credit.props as Record<string, unknown>)["data-account-credit"] === undefined
  return ownLine ? Math.min(bottom, SOURCE_LINE.top - 16) : bottom
}

/** Whether `text`, its marks and spaces aside, is a figure and a short unit and nothing else: 「3,100 万元」, 「52 → 34 天」, 「81.3%」, "RMB 31m". */
export function isFigure(text: string): boolean {
  return /^(?:[A-Z]{2,3}\s?)?[+\-−]?[\d.,]+%?(?:\s*→\s*[\d.,]+%?)?(?:\s*\S{1,5})?$/u.test(stripEmphasis(text).trim())
}

type Chart = Extract<Component, { type: "chart" }>

/**
 * Whether `chart` is a plain bar chart of `series` series the account pages
 * redraw as their own bars: bars either way, every series the same categories,
 * no value under zero, and none of the chart's own furniture (a title, a tag,
 * changes, bands, a reference, markers, gaps, a second axis, a point's note
 * or range) that a redrawing would have to drop.
 */
export function plainBars(chart: Chart, series: { min: number; max: number }): boolean {
  if (chart.chart_type !== "bar") return false
  if (chart.title || chart.tag || chart.changes?.length || chart.bands?.length || chart.emphasis_label || chart.reference || chart.markers?.length || chart.gaps?.length) return false
  const s = chart.series
  if (s.length < series.min || s.length > series.max) return false
  if (s.some((one) => one.plot || one.axis || one.steps || one.tone)) return false
  const xs = s[0]!.data.map((p) => String(p.x))
  return s.every((one) => one.data.length === xs.length && one.data.every((p, i) => String(p.x) === xs[i] && p.y >= 0 && p.note === undefined && p.upper === undefined && p.size === undefined))
}

/** The words over the plot: the unit, and the floor when the axis does not start from nothing. */
export function unitWords(unit: string | undefined, floor: number, chinese: boolean): string | null {
  const parts: string[] = []
  if (unit?.trim()) parts.push(chinese ? `单位：${unit.trim()}` : `Unit: ${unit.trim()}`)
  if (floor > 0) parts.push(chinese ? `纵轴从 ${formatFigure(floor)} 起` : `axis from ${formatFigure(floor)}`)
  if (!parts.length) return null
  return parts.join(chinese ? "　" : ", ")
}
