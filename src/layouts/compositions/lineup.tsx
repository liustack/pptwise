import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { parseEmphasis, stripEmphasis, type EmphasisHeadingLayout, type EmphasisSegment } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, contrastRatio, graphicInk, metaInk, readableOn } from "../../render/ink"
import { CroppedImage, type Crop } from "../../render/cropped-image"
import { fitManuscript, keepsSpaces, manuscriptBaseline, manuscriptChinese, manuscriptFamily, manuscriptWidth, type ManuscriptTextSpec } from "./manuscript"

/*
 * The lineup setting: a fashion show's running order, runway's 2026-10 board
 * (`design/rounds/2026-10-08-runway/`).
 *
 * Show-white paper, the ink of the type for every word, rule and numeral,
 * a stone grey for what is quieter, hairlines for what divides, and one
 * drop of crimson (the theme's accent) a page, on the one figure or word
 * the page is about. Nothing sits on a card: rules, air and large serif
 * numerals order the page. The pictures argue and the words caption them,
 * small, grey and tracked. Titles, numerals, figures and names are set in
 * the heading serif at its regular weight, labels and captions in the body
 * sans.
 *
 * The board's small type (10 to 15px captions, labels, the masthead and the
 * source) is under the 16px floor and carries the `lineup-spec` exemption
 * the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const LINEUP_SPEC = { "data-font-floor-exempt": "lineup-spec" } as const

/** Meta-information set quiet on purpose (a caption, the source, the folio): held to 3:1 rather than the body's 4.5:1. */
export const LINEUP_META = { "data-contrast-tier": "meta" } as const

/** `LINEUP_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function lineupSmall(size: number): Record<string, string> {
  return size < 16 ? { ...LINEUP_SPEC } : {}
}

export interface LineupInks {
  /** The paper. */
  ground: string
  /** Words, rules and numerals: the ink of the type. */
  ink: string
  /** What is quieter: labels, notes, captions. */
  muted: string
  /** Hairlines between rows. Never words. */
  line: string
  /** The one drop of crimson a page. */
  crimson: string
  /** The stage a dark page stands on: the bow, a scrim over a photograph. */
  stage: string
  /** Words on the stage. */
  light: string
  /** Quieter words on the stage. */
  lightQuiet: string
}

/** #E4E1D9 on the board: the paper most of the way to the stage. */
const LIGHT_QUIET_MIX = 0.84

export function lineupInks(ctx: ComponentCtx): LineupInks {
  const { colors } = ctx
  const ground = colors.bg
  const stage = colors.primary
  // The paper on the stage, as the board sets the bow's words, where it reads there.
  const light = contrastRatio(ground, stage) >= 4.5 ? ground : readableOn(stage)
  return {
    ground,
    ink: colors.text,
    muted: colors.muted,
    line: colors.border ?? blendOver(colors.muted, ground, 0.25),
    crimson: colors.accent,
    stage,
    light,
    lightQuiet: blendOver(light, stage, LIGHT_QUIET_MIX),
  }
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the readable ink when it falls short. */
export function lineupText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a caption, the source, the folio) held to the 3:1 a meta line needs. */
export function lineupMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a rule that carries meaning, an icon, a bar) held to 3:1 on `ground`. */
export function lineupMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text ────────────────────────────────────────────────────────────────

export type LineupTextSpec = ManuscriptTextSpec

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitLineup(text: string | undefined, spec: LineupTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitManuscript(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function lineupWidth(text: string, size: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptWidth(text, size, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function lineupBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return manuscriptBaseline(top, lineHeight, size, serif)
}

/** The family a run is set in: the heading serif or the body sans. */
export function lineupFamily(ctx: ComponentCtx, serif: boolean): string {
  return manuscriptFamily(ctx, serif)
}

export interface LineupPaint {
  ctx: ComponentCtx
  x: number
  /** The top of the first line's box, or the first baseline. */
  top?: number
  baseline?: number
  fill: string
  serif?: boolean
  bold?: boolean
  anchor?: "start" | "middle" | "end"
  /** What the text sits on, for the marked runs' ink. The paper when omitted. */
  ground?: string
  /** The ink a `**…**` run takes before contrast holds it: the crimson when omitted. */
  lit?: string
  /** A marked run set in the heading serif, at this size, as the board sets 「25%」 inside a line of sans. */
  litSerif?: boolean
  litSize?: number
  attrs?: Record<string, string>
  lastAttrs?: Record<string, string>
}

function paintRuns(segments: readonly EmphasisSegment[], opts: { lit: string; litFamily?: string; litSize?: number }): React.ReactNode {
  if (segments.every((s) => !s.emphasized)) return segments.map((s) => s.text).join("")
  return segments.map((s, i) =>
    s.emphasized ? (
      <tspan key={i} fill={opts.lit} fontFamily={opts.litFamily} fontSize={opts.litSize} data-lineup-lit="">
        {s.text}
      </tspan>
    ) : (
      s.text
    ),
  )
}

/** Paints a fitted block, one `<text>` a line, its `**…**` runs in crimson at the same weight. */
export function paintLineup(layout: EmphasisHeadingLayout, opts: LineupPaint): React.ReactNode {
  const inks = lineupInks(opts.ctx)
  const ground = opts.ground ?? inks.ground
  const lit = lineupText(opts.lit ?? inks.crimson, ground, opts.litSize ?? layout.fontSize)
  const first = opts.baseline ?? lineupBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize, opts.serif === true)
  return layout.lines.map((line, i) => (
    <text
      key={i}
      {...lineupSmall(layout.fontSize)}
      {...opts.attrs}
      {...(i === layout.lines.length - 1 ? opts.lastAttrs : undefined)}
      x={opts.x}
      y={first + i * layout.lineHeight}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={lineupFamily(opts.ctx, opts.serif === true)}
      fontSize={layout.fontSize}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={keepsSpaces(line) ? "preserve" : undefined}
    >
      {paintRuns(layout.segments[i] ?? [{ text: line, emphasized: false }], { lit, litFamily: opts.litSerif ? opts.ctx.fonts.heading : undefined, litSize: opts.litSize })}
    </text>
  ))
}

/** One line known to fit, its marks in crimson. */
export function paintLineupLine(text: string, opts: Omit<LineupPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  const inks = lineupInks(opts.ctx)
  const ground = opts.ground ?? inks.ground
  const y = opts.baseline ?? lineupBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size, opts.serif === true)
  return (
    <text
      key={opts.key}
      {...lineupSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={lineupFamily(opts.ctx, opts.serif === true)}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={keepsSpaces(text) ? "preserve" : undefined}
    >
      {paintRuns(parseEmphasis(text), { lit: lineupText(opts.lit ?? inks.crimson, ground, opts.litSize ?? opts.size), litFamily: opts.litSerif ? opts.ctx.fonts.heading : undefined, litSize: opts.litSize })}
    </text>
  )
}

/**
 * The tracking a line takes. Chinese and capitals keep the board's (4px
 * between 毕 and 业, 6px between the letters of LOOK). A line with lower-case
 * Latin is tracked a quarter as wide, since a sentence spaced 4px a letter
 * reads as spaced-out capitals.
 */
export function lineupTracking(text: string, tracking: number): number {
  return /[a-z]/u.test(text) && !/[㐀-鿿]/u.test(text) ? Math.round(tracking * 25) / 100 : tracking
}

/** `text` with `tracking` px between its characters, written as `<tspan dx>` so the export carries it as character spacing. */
export function paintLineupTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; serif?: boolean; bold?: boolean; anchor?: "start" | "middle" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const tracking = lineupTracking(opts.text, opts.tracking)
  const chars = Array.from(opts.text)
  return (
    <text
      {...lineupSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={lineupFamily(opts.ctx, opts.serif === true)}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      data-tracking={tracking || undefined}
      xmlSpace={opts.text.includes(" ") || keepsSpaces(opts.text) ? "preserve" : undefined}
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
        opts.text
      )}
    </text>
  )
}

/** The tracked width of `text`, as `paintLineupTracked` sets it. */
export function lineupTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupWidth(text, size, ctx, opts) + Math.max(0, Array.from(text).length - 1) * lineupTracking(text, tracking)
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintLineupIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-lineup-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} strokeWidth={opts.stroke} />
    </g>
  )
}

/** Whether the deck writes in Chinese: the deck's own figure style, or the words handed in when a page is drawn alone. */
export function lineupChinese(ctx: ComponentCtx, words: readonly string[]): boolean {
  return manuscriptChinese(ctx, words)
}

/** The `index`-th numeral from 0, two figures like an exit number: 01, 02 … 10. */
export function lineupNumeral(index: number): string {
  return String(index + 1).padStart(2, "0")
}

/** Whether `text`, its marks and spaces aside, is all marked: the author lit the whole of it. */
export function wholeLit(text: string): boolean {
  const segments = parseEmphasis(text.trim()).filter((s) => s.text.trim())
  return segments.length > 0 && segments.every((s) => s.emphasized)
}

// ── Figures ─────────────────────────────────────────────────────────────

/** A figure set large in the heading serif, its unit after it in the body sans, smaller, in the figure's ink. */
export interface LineupFigureSpec {
  size: number
  unit: number
  /** Px between the figure's characters (the board closes large figures up). */
  tracking?: number
}

/** The width a figure and its unit take, as `paintLineupFigure` sets them. */
export function lineupFigureWidth(value: string, unit: string | undefined, spec: LineupFigureSpec, ctx: ComponentCtx): number {
  const v = stripEmphasis(value).trim()
  const w = lineupWidth(v, spec.size, ctx, { serif: true }) + Math.max(0, Array.from(v).length - 1) * (spec.tracking ?? 0)
  const u = unit?.trim()
  return u ? w + lineupWidth(` ${u}`, spec.unit, ctx) : w
}

/** A figure on `baseline` from `x` (or centred on it, or ending at it), its unit after it. */
export function paintLineupFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; spec: LineupFigureSpec; fill: string; anchor?: "start" | "middle" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const value = stripEmphasis(opts.value).trim()
  const chars = Array.from(value)
  const u = opts.unit?.trim()
  const tracking = opts.spec.tracking ?? 0
  return (
    <text
      {...lineupSmall(u ? opts.spec.unit : opts.spec.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.baseline}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={opts.spec.size}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={u || value.includes(" ") ? "preserve" : undefined}
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
      {u ? (
        <tspan fontSize={opts.spec.unit} fontFamily={opts.ctx.fonts.body}>
          {` ${u}`}
        </tspan>
      ) : null}
    </text>
  )
}

// ── Photographs ─────────────────────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A photograph filling `box`, cropped to the part the author named. A grey field stands in where the deck has no such asset. */
export function paintLineupPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { crop?: Crop; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  if (!asset?.src) return <rect key={opts.key} data-lineup-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={blendOver(ctx.colors.muted, ctx.colors.bg, 0.2)} />
  return (
    <g key={opts.key} data-lineup-photo={assetId}>
      <CroppedImage src={asset.src} box={box} crop={opts.crop} alt={asset.alt} assetKey={assetId} />
    </g>
  )
}

/**
 * A wash of `ink` over `box`, its opacity running through `stops` across
 * (`axis: "x"`, left to right) or down (`"y"`, top to bottom). `id` names
 * the gradient, unique on the page.
 */
export function LineupWash({ id, box, ink, axis, stops }: { id: string; box: Box; ink: string; axis: "x" | "y"; stops: readonly { offset: string; opacity: number }[] }): React.ReactElement {
  return (
    <g data-lineup-wash="">
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

/** A rule from `x1` to `x2` on `y`, as a thin rectangle the export keeps whole. */
export function paintLineupRule(x1: number, x2: number, y: number, ink: string, width: number, opts: { key?: string | number } = {}): React.ReactElement {
  return <rect key={opts.key} x={Math.min(x1, x2)} y={y - width / 2} width={Math.abs(x2 - x1)} height={width} fill={ink} />
}

// ── The claim and the source a composition places ──────────────────────

/**
 * Where a composition places the page's claim: its measure, and optionally
 * its size, line box, the foot its last line ends on, and how many lines it
 * may take. The claim is set from the left in the heading serif.
 */
export interface LineupClaimColumn {
  x: number
  w: number
  size?: number
  lineHeight?: number
  foot?: number
  maxLines?: number
}

/**
 * The page's claim in `column`, as the face hands it down: the drawing,
 * `null` when the face handed none, or `false` when it does not fit the
 * column whole, in which case the composition declines.
 */
export function placeLineupClaim(claim: ((column: LineupClaimColumn) => React.ReactElement | null) | undefined, column: LineupClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/** Where a composition places the page's source: its column and the top of its first line. */
export interface LineupSourceColumn {
  x: number
  w: number
  top?: number
}

/** The page's source in `column`: the drawing, `null` when the page has none, or `false` when it does not fit. */
export function placeLineupSource(source: ((column: LineupSourceColumn) => React.ReactElement | null) | undefined, column: LineupSourceColumn): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}

/** Whether `rect` is the whole page: the compositions that set a page by its board's coordinates take nothing smaller. */
export function wholePage(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.w >= 1280 && rect.h >= 720
}

/** A caption under a photograph: 10/16 in the stone grey, tracked half a pixel. */
export const LINEUP_CAPTION = { size: 10, lineHeight: 16, tracking: 0.5 } as const

/** A caption fitted to `w` on one line, or `null` when it does not fit. */
export function fitLineupCaption(text: string | undefined, w: number, ctx: ComponentCtx): string | null {
  const t = text ? stripEmphasis(text).trim() : ""
  if (!t) return null
  return lineupTrackedWidth(t, LINEUP_CAPTION.size, LINEUP_CAPTION.tracking, ctx) <= w ? t : null
}

/** A caption on one line from `x` (or ending at it), its box from `top`. */
export function paintLineupCaption(text: string, opts: { ctx: ComponentCtx; x: number; top: number; fill: string; anchor?: "start" | "end"; key?: string | number }): React.ReactElement {
  return (
    <g key={opts.key} data-lineup-caption="">
      {paintLineupTracked({ ctx: opts.ctx, text, x: opts.x, y: lineupBaseline(opts.top, LINEUP_CAPTION.lineHeight, LINEUP_CAPTION.size), size: LINEUP_CAPTION.size, tracking: LINEUP_CAPTION.tracking, fill: opts.fill, anchor: opts.anchor, attrs: { ...LINEUP_META } })}
    </g>
  )
}
