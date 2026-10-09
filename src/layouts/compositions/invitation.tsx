import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { parseEmphasis, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, graphicInk, metaInk, readableOn } from "../../render/ink"
import { CHINESE_FIGURES, groupDigits } from "../../lib/quantity-format"
import {
  fitManuscript,
  manuscriptBaseline,
  manuscriptChinese,
  manuscriptTrackedWidth,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptLine,
  paintManuscriptTracked,
  type ManuscriptPaint,
  type ManuscriptTextSpec,
} from "./manuscript"
import { fitMemoTitle } from "./memo"

/*
 * The invitation setting: a house's gilt invitation to guests it already
 * knows by name, luxe's 2026-10 board (`design/rounds/2026-10-08-luxe/`).
 *
 * Warm true black, champagne gold (the theme's accent) for lines, letters and
 * the one thing a page is about, ivory words (the text ink), old gold for
 * labels (the muted ink) and a dimmer gold for sources and captions. Gold is
 * never a solid card and nothing is filled ivory: a figure the page leans on
 * is set large in gold, a bar is gold, an earlier or quieter thing is drawn
 * as an outline. Titles, names, numerals and figures are set in the heading
 * face (a serif, with Times New Roman for the figures and the Latin), labels,
 * notes and sources in the body sans. A card is a gilt frame (a gold rule
 * and a fainter one 8px inside it), a divider a hairline in the border ink,
 * and a mark a small gold diamond between two short rules.
 *
 * The board's small type (10 to 15px labels, notes, sources and the folio)
 * is under the 16px floor and carries the `invitation-spec` exemption the L1
 * audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const INVITATION_SPEC = { "data-font-floor-exempt": "invitation-spec" } as const

/**
 * Meta-information set quiet on purpose (the folio, the occasion at the foot,
 * a source, a caption): the audit holds it to the 3:1 a meta line needs
 * rather than the body's 4.5:1.
 */
export const INVITATION_META = { "data-contrast-tier": "meta" } as const

/** `INVITATION_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function invitationSmall(size: number): Record<string, string> {
  return size < 16 ? { ...INVITATION_SPEC } : {}
}

export interface InvitationInks {
  /** The card stock. */
  ground: string
  /** Velvet: a ground a step above the stock. */
  card: string
  /** Words. */
  ivory: string
  /** Labels and notes: old gold. */
  muted: string
  /** Sources, captions, the occasion at the foot: old gold toward the stock. */
  dim: string
  /** Hairlines, the card stock's inner frame. Never words. */
  line: string
  /** Champagne gold: rules, letters, figures, the one thing a page is about. */
  gold: string
  /** Gold lifted toward the ivory: the figure a page lands on. */
  goldLight: string
  /** Bronze: what goes the other way, such as stores closed against stores opened. */
  bronze: string
}

/** #6F6555 on the board: old gold at 64% over the stock. */
const DIM_MIX = 0.64
/** #E2C891 on the board: gold half way to the ivory. */
const GOLD_LIGHT_MIX = 0.5
/** #8A6B3F on the board when the palette names no bronze: gold at 62% over the stock. */
const BRONZE_MIX = 0.62

export function invitationInks(ctx: ComponentCtx): InvitationInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const palette = colors.chartPalette
  return {
    ground,
    card: colors.surface,
    ivory: colors.text,
    muted: colors.muted,
    dim: blendOver(colors.muted, ground, DIM_MIX),
    line: colors.border ?? blendOver(colors.muted, ground, 0.25),
    gold: colors.accent,
    goldLight: blendOver(colors.text, colors.accent, GOLD_LIGHT_MIX),
    bronze: palette[2] ?? blendOver(colors.accent, ground, BRONZE_MIX),
  }
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the readable ink when it falls short. */
export function invitationText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a caption, the folio) held to the 3:1 a meta line needs. */
export function invitationMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a bar, an icon, a rule that carries meaning) held to the 3:1 a mark needs on `ground`. */
export function invitationMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text ────────────────────────────────────────────────────────────────

export type InvitationTextSpec = ManuscriptTextSpec

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitInvitation(text: string | undefined, spec: InvitationTextSpec, ctx: Pick<ComponentCtx, "fonts">): EmphasisHeadingLayout | null {
  return fitManuscript(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function invitationWidth(text: string, size: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptWidth(text, size, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function invitationBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return manuscriptBaseline(top, lineHeight, size, serif)
}

export type InvitationPaint = Omit<ManuscriptPaint, "lit" | "italic"> & { lit?: string }

/** Paints a fitted block, one `<text>` a line, its `**…**` runs lit in gold (or `lit`). */
export function paintInvitation(layout: EmphasisHeadingLayout, opts: InvitationPaint): React.ReactNode {
  const inks = invitationInks(opts.ctx)
  return paintManuscript(layout, { ...opts, lit: opts.lit ?? inks.gold, attrs: { ...invitationSmall(layout.fontSize), ...opts.attrs } })
}

/** One line known to fit, its marks lit in gold (or `lit`). */
export function paintInvitationLine(text: string, opts: Omit<InvitationPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  const inks = invitationInks(opts.ctx)
  return paintManuscriptLine(text, { ...opts, lit: opts.lit ?? inks.gold, attrs: { ...invitationSmall(opts.size), ...opts.attrs } })
}

/** Latin is tracked a quarter as wide as the board tracks Chinese: 8px between 年 and 度 is 2px between two letters. */
const LATIN_TRACKING = 0.25

/** The tracking `text` takes: the board's between Chinese characters, a quarter of it in a line with none. */
export function invitationTracking(text: string, tracking: number): number {
  return /[\u3400-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/u.test(text) ? tracking : Math.round(tracking * LATIN_TRACKING * 100) / 100
}

/** `text` with `tracking` px between its characters, written as character spacing. */
export function paintInvitationTracked(opts: Parameters<typeof paintManuscriptTracked>[0]): React.ReactElement {
  return paintManuscriptTracked({ ...opts, tracking: invitationTracking(opts.text, opts.tracking), attrs: { ...invitationSmall(opts.size), ...opts.attrs } })
}

/** The tracked width of `text`, as `paintInvitationTracked` sets it. */
export function invitationTrackedWidth(text: string, size: number, tracking: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptTrackedWidth(text, size, invitationTracking(text, tracking), ctx, opts)
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintInvitationIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-invitation-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

/**
 * A value the engine prints for a chart, as the deck prints its figures: its
 * whole part grouped the deck's way, its decimals as written.
 */
export function invitationValue(value: number, ctx: ComponentCtx, decimals?: number): string {
  const written = decimals === undefined ? String(value) : value.toFixed(decimals)
  return groupDigits(written.replace("-", "−"), ctx.figures ?? CHINESE_FIGURES)
}

/** How many decimals the values are written with, the most any one of them has. */
export function decimalsOf(values: readonly number[]): number {
  return Math.max(0, ...values.map((v) => (String(v).split(".")[1] ?? "").length))
}

/** Whether `text`, its marks and spaces aside, is all marked: the author lit the whole of it. */
export function wholeLit(text: string): boolean {
  const segments = parseEmphasis(text.trim()).filter((s) => s.text.trim())
  return segments.length > 0 && segments.every((s) => s.emphasized)
}

// ── Numerals ───────────────────────────────────────────────────────────

const FORMAL = ["壹", "贰", "叁", "肆", "伍", "陆", "柒", "捌", "玖", "拾"] as const
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"] as const

/**
 * The `index`-th item's numeral (from 0), as an invitation's programme
 * prints it: the formal numerals of a Chinese invitation (壹 贰 叁 肆), Roman
 * numerals in any other deck. Past ten, the Arabic figure.
 */
export function formalNumeral(index: number, chinese: boolean): string {
  const table = chinese ? FORMAL : ROMAN
  return table[index] ?? String(index + 1)
}

/** The `index`-th chapter's numeral (from 0): Roman in every deck, as an invitation numbers its parts. */
export function chapterNumeral(index: number): string {
  return ROMAN[index] ?? String(index + 1)
}

// ── Figures ─────────────────────────────────────────────────────────────

/** A figure set large in the heading face, and the size its unit takes. */
export interface FigureSpec {
  size: number
  /** A symbol unit (× or %) is set at this size right after the figure, in the figure's ink. */
  symbol: number
  /** A worded unit (吨, 亿元) is set at this size after a space, in the old gold of the labels. */
  word: number
  /** Px between the figure's characters. */
  tracking?: number
}

/** A unit that is a symbol rather than a word: it hangs on the figure. */
export function symbolUnit(unit: string | undefined): boolean {
  const u = unit?.trim() ?? ""
  return u.length > 0 && !/[\p{L}]/u.test(u.replace(/[×x]/gu, ""))
}

/** The width a figure and its unit take, as `paintInvitationFigure` sets them. */
export function invitationFigureWidth(value: string, unit: string | undefined, spec: FigureSpec, ctx: ComponentCtx): number {
  const v = stripEmphasis(value).trim()
  const w = invitationWidth(v, spec.size, ctx, { serif: true }) + Math.max(0, Array.from(v).length - 1) * (spec.tracking ?? 0)
  const u = unit?.trim()
  if (!u) return w
  return symbolUnit(u) ? w + invitationWidth(u, spec.symbol, ctx, { serif: true }) : w + invitationWidth(` ${u}`, spec.word, ctx)
}

/** A figure on `baseline` from `x` (or centred on it, or ending at it), its unit after it. */
export function paintInvitationFigure(opts: {
  ctx: ComponentCtx
  value: string
  unit?: string
  x: number
  baseline: number
  spec: FigureSpec
  fill: string
  ground: string
  anchor?: "start" | "middle" | "end"
  bold?: boolean
  attrs?: Record<string, string>
}): React.ReactElement {
  const inks = invitationInks(opts.ctx)
  const value = stripEmphasis(opts.value).trim()
  const chars = Array.from(value)
  const u = opts.unit?.trim()
  const tracking = opts.spec.tracking ?? 0
  const symbol = u ? symbolUnit(u) : false
  const smallest = u ? (symbol ? opts.spec.symbol : opts.spec.word) : opts.spec.size
  return (
    <text
      {...invitationSmall(smallest)}
      {...opts.attrs}
      x={opts.x}
      y={opts.baseline}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={opts.spec.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={u && !symbol ? "preserve" : undefined}
      data-tracking={tracking || undefined}
    >
      {tracking ? (
        <>
          {chars[0]}
          {chars.slice(1).map((ch, i) => (
            <tspan key={i} dx={tracking}>
              {ch}
            </tspan>
          ))}
        </>
      ) : (
        value
      )}
      {u && symbol ? (
        <tspan fontSize={opts.spec.symbol}>
          {u}
        </tspan>
      ) : u ? (
        <tspan fontSize={opts.spec.word} fontWeight="400" fontFamily={opts.ctx.fonts.body} fill={invitationText(inks.muted, opts.ground, opts.spec.word)}>
          {` ${u}`}
        </tspan>
      ) : null}
    </text>
  )
}

// ── Marks ───────────────────────────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** The gilt frame: a gold rule and a fainter one 8px inside it. */
export const GILT = { outer: 1.4, inner: 0.7, inset: 8, innerMix: 0.7 } as const

/** A gilt frame around `box`, drawn as four rules each so no filled shape stands behind the words inside. */
export function paintGiltFrame(box: Box, ctx: ComponentCtx, opts: { ground?: string; key?: string | number } = {}): React.ReactElement {
  const inks = invitationInks(ctx)
  const ground = opts.ground ?? inks.ground
  const inner = { x: box.x + GILT.inset, y: box.y + GILT.inset, w: box.w - GILT.inset * 2, h: box.h - GILT.inset * 2 }
  return (
    <g key={opts.key} data-invitation-gilt="">
      {paintOutline(box, invitationMark(inks.gold, ground), GILT.outer)}
      {paintOutline(inner, blendOver(inks.gold, ground, GILT.innerMix), GILT.inner)}
    </g>
  )
}

/** A plain outline of `box` in `ink`, as four rules. */
export function paintOutline(box: Box, ink: string, width: number, opts: { dash?: string } = {}): React.ReactElement {
  const { x, y, w, h } = box
  const x2 = x + w
  const y2 = y + h
  const lines: [number, number, number, number][] = [
    [x, y, x2, y],
    [x2, y, x2, y2],
    [x2, y2, x, y2],
    [x, y2, x, y],
  ]
  return (
    <g data-invitation-outline="">
      {lines.map(([x1, y1, xb, yb], i) => (
        <line key={i} x1={x1} y1={y1} x2={xb} y2={yb} stroke={ink} strokeWidth={width} strokeDasharray={opts.dash} />
      ))}
    </g>
  )
}

/** A gold diamond of half-width `r` centred on `cx`, `cy`. */
export function paintDiamond(cx: number, cy: number, r: number, ink: string): React.ReactElement {
  return <polygon data-invitation-diamond="" points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`} fill={ink} />
}

/** A short rule from `x1` to `x2` on `y`, as a thin rectangle the export keeps whole. */
export function paintRule(x1: number, x2: number, y: number, ink: string, width: number, opts: { key?: string | number } = {}): React.ReactElement {
  return <rect key={opts.key} x={Math.min(x1, x2)} y={y - width / 2} width={Math.abs(x2 - x1)} height={width} fill={ink} />
}

/** A dotted leader from `x1` to `x2` on `y`. */
export function paintLeader(x1: number, x2: number, y: number, ink: string, opts: { key?: string | number; dash?: string } = {}): React.ReactElement | null {
  if (x2 - x1 < 12) return null
  return <line key={opts.key} data-invitation-leader="" x1={x1} y1={y} x2={x2} y2={y} stroke={ink} strokeWidth={1} strokeDasharray={opts.dash ?? "1 6"} />
}

// ── Photographs ─────────────────────────────────────────────────────────

/** A photograph filling `box`, cropped to it. The velvet stands in where the deck has no such asset. */
export function paintInvitationPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const inks = invitationInks(ctx)
  if (!asset?.src) return <rect key={opts.key} data-invitation-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.card} stroke={inks.line} />
  return (
    <g key={opts.key} data-invitation-photo={assetId}>
      <image href={asset.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
    </g>
  )
}

/**
 * A wash of `ink` over `box`, its opacity running through `stops` across
 * (`axis: "x"`, left to right) or down (`"y"`). `id` names the gradient,
 * unique on the page.
 */
export function InvitationWash({ id, box, ink, axis, stops }: { id: string; box: Box; ink: string; axis: "x" | "y"; stops: readonly { offset: string; opacity: number }[] }): React.ReactElement {
  return (
    <g data-invitation-wash="">
      <defs>
        <linearGradient id={id} x1={0} y1={0} x2={axis === "x" ? 1 : 0} y2={axis === "y" ? 1 : 0}>
          {stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={ink} stopOpacity={stop.opacity} />
          ))}
        </linearGradient>
      </defs>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${id})`} />
    </g>
  )
}

// ── The claim and the source a composition places ──────────────────────

/**
 * Where a composition places the page's claim. By default the claim is
 * centred over the page with the page's chapter in small tracked type over
 * it between two gold rules and a gold diamond under its last line. A
 * composition that sets the claim in a column of its own (beside a
 * photograph, inside a card) names its measure, its size and line height,
 * the foot its last line's box ends on, whether it is set from the left,
 * where the chapter stands, and whether the diamond follows it.
 */
export interface InvitationClaimColumn {
  x: number
  w: number
  size?: number
  foot?: number
  lineHeight?: number
  align?: "center" | "start"
  /** Where the chapter's line box starts. */
  labelTop?: number
  /** The px between the chapter's characters, 3 when omitted. */
  labelTracking?: number
  /** How far under the last line's box the diamond's centre stands, 14 when omitted. */
  markGap?: number
  /** The diamond under the last line: centred with a rule each side, at the left with one rule after it, or none. */
  mark?: "center" | "start" | "none"
}

/**
 * The page's claim in `column`, as the face hands it down (`claim`): the
 * drawing, `null` when the face handed none, or `false` when it does not fit
 * the column whole, in which case the composition declines.
 */
export function placeInvitationClaim(claim: ((column: InvitationClaimColumn) => React.ReactElement | null) | undefined, column: InvitationClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/** Where a composition places the page's source: its column and the top of its first line. */
export interface InvitationSourceColumn {
  x: number
  w: number
  top?: number
}

/**
 * The page's source in `column`, as the face hands it down (`source`): the
 * drawing, `null` when the page has none, or `false` when it does not fit
 * the column, in which case the composition declines.
 */
export function placeInvitationSource(source: ((column: InvitationSourceColumn) => React.ReactElement | null) | undefined, column: InvitationSourceColumn): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}

/** The whole canvas, the band an invitation sheet hands its compositions. */
export const CANVAS = { w: 1280, h: 720 } as const

/** Whether `rect` is the whole canvas: the compositions that draw the page by its board's coordinates take nothing smaller. */
export function wholeCanvas(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.w >= CANVAS.w && rect.h >= CANVAS.h
}

/** 45-degree stripes `period` px apart clipped to the rectangle, as one path: the board's hatching for a figure of another basis. */
export function hatchPath(x: number, y: number, w: number, h: number, period: number): string {
  const step = period * Math.SQRT2
  const parts: string[] = []
  const r1 = (v: number) => Math.round(v * 10) / 10
  for (let c = x + y + step / 2; c < x + w + y + h; c += step) {
    const xa = Math.max(x, c - (y + h))
    const xb = Math.min(x + w, c - y)
    if (xb - xa < 0.5) continue
    parts.push(`M ${r1(xa)} ${r1(c - xa)} L ${r1(xb)} ${r1(c - xb)}`)
  }
  return parts.join(" ")
}

/** Whether the deck writes in Chinese: the deck's own figure style, or the words handed in when a page is drawn alone. */
export function invitationChinese(ctx: ComponentCtx, words: readonly string[]): boolean {
  return manuscriptChinese(ctx, words)
}

/** A fitted title's lines, or none when the fit cut its end off: a title is set whole or not at all. */
function wholeLines(layout: EmphasisHeadingLayout): string[] {
  return layout.truncated ? [] : layout.lines
}

/**
 * A boundary page's title set tracked in the serif: the author's own breaks
 * kept, each part on a line of its own, and otherwise one line or two broken
 * at a comma or a colon, at the largest size from `size` down to `minPt`
 * whose tracked lines all fit `width`. `null` when none does.
 */
export function fitTrackedTitle(text: string | undefined, spec: { width: number; size: number; minPt: number; lineHeight: number; tracking: number; maxLines: number; bold?: boolean }, ctx: Pick<ComponentCtx, "fonts">): { lines: string[]; size: number } | null {
  const plain = text?.trim() ?? ""
  if (!plain) return null
  const parts = plain.split(/\n+/u).map((p) => stripEmphasis(p).trim()).filter(Boolean)
  const bold = spec.bold !== false
  for (let size = spec.size; size >= spec.minPt; size -= 1) {
    // The break is found on the untracked line, so the measure gives the tracking back: a character an em wide takes its tracking more.
    const tracking = invitationTracking(plain, spec.tracking)
    const maxWidth = (spec.width * size) / (size + Math.max(0, tracking))
    const lines =
      parts.length > 1
        ? parts.flatMap((p) => fitMemoTitle(p, { maxWidth, fontSize: size, minPt: size, lineHeight: spec.lineHeight, fontFamily: ctx.fonts.heading, bold }).lines.map((l) => (l === p ? l : "\u0000")))
        : wholeLines(fitMemoTitle(parts[0], { maxWidth, fontSize: size, minPt: size, lineHeight: spec.lineHeight, fontFamily: ctx.fonts.heading, bold }))
    if (lines.length === 0 || lines.length > spec.maxLines || lines.some((l) => l === "\u0000")) continue
    if (lines.every((l) => invitationTrackedWidth(l, size, spec.tracking, ctx, { serif: true, bold }) <= spec.width)) return { lines: lines.map(stripEmphasis), size }
  }
  return null
}
