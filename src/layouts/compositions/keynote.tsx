import type React from "react"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { parseEmphasis, stripEmphasis } from "../../render/emphasis"
import { blendOver, graphicInk, metaInk, relativeLuminance } from "../../render/ink"
import { CroppedImage, type Crop } from "../../render/cropped-image"
import { Icon } from "../../render/icons"
import {
  LineupWash,
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
  type LineupPaint,
  type LineupTextSpec,
} from "./lineup"

/*
 * The keynote setting: a talk on a dark stage, stage's 2026-10 board
 * (`design/rounds/2026-10-08-stage/`).
 *
 * The house lights go down and one sentence is left: a cold black field,
 * words in a warm paper white set large and bold, what is quieter in a warm
 * sand, captions and sources a dimmer sand, hairlines and axes in a cool grey
 * a few steps up from the black, and a matte silver (the theme's accent) on
 * the one thing a page is about. A sentence or a figure that carries a page
 * alone stands in a faint round spill of light, like a follow spot. Nothing
 * sits on a card but a door: rules, air and size order the page.
 *
 * The board's small type (11 to 15px captions, labels, the chapter's name,
 * the source and the count) is under the 16px floor and carries the
 * `keynote-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way. The text fitting and painting are the lineup
 * setting's, set with this setting's exemption, and its marked runs in
 * silver.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const KEYNOTE_SPEC = { "data-font-floor-exempt": "keynote-spec" } as const

/** Meta-information set quiet on purpose (the source, the count, a caption): held to 3:1 rather than the body's 4.5:1. */
export const KEYNOTE_META = { "data-contrast-tier": "meta" } as const

/** `KEYNOTE_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function keynoteSmall(size: number): Record<string, string> {
  return size < 16 ? { ...KEYNOTE_SPEC } : {}
}

export interface KeynoteInks {
  /** The house: the page. */
  ground: string
  /** A door, the one shape a page fills: the theme's surface. */
  door: string
  /** Words: the paper white. */
  ink: string
  /** What is quieter: the sand. */
  muted: string
  /** Captions, sources, a reading's ticks: the sand two thirds of the way into the dark. */
  dim: string
  /** The one thing a page is about. */
  silver: string
  /** Hairlines between rows. Never words. */
  rule: string
  /** Axes, the clicker's track, a door's edge. Never words. */
  track: string
  /** A dot of a count that is not lit. */
  unlit: string
  /** A bar that steps back. */
  quiet: string
  /** The largest bar when it is not the one the page is about: the paper a breath into the dark. */
  paper: string
  /** The light a follow spot is drawn in. */
  glow: string
}

/** #7E786C on the board: the sand about two thirds of the way from the house. */
const DIM_MIX = 0.69
/** #E8E3DA on the board: the paper white a breath into the dark. */
const PAPER_MIX = 0.95

/**
 * The cool greys the board draws its lines and unlit marks in are the house
 * itself a few steps toward the light (#2A2A30, #26262C, #3A3A42, #4A4A52 over
 * #0F0F12): the same hue and saturation, lighter by these steps of lightness.
 * On a pale page they step toward the dark instead.
 */
const STEP = { rule: 0.111, unlit: 0.096, track: 0.178, quiet: 0.241 } as const

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16)
  const [r, g, b] = [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, "0").toUpperCase()
  return `#${to(r)}${to(g)}${to(b)}`
}

/** The house `step` toward the light, or toward the dark on a pale page. */
function shade(ground: string, step: number): string {
  const [h, s, l] = hexToHsl(ground)
  const dark = relativeLuminance(ground) < 0.18
  return hslToHex(h, s, Math.min(0.95, Math.max(0.05, l + (dark ? step : -step))))
}

export function keynoteInks(ctx: ComponentCtx): KeynoteInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  return {
    ground,
    door: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    dim: blendOver(colors.muted, ground, DIM_MIX),
    silver: colors.accent,
    rule: shade(ground, STEP.rule),
    track: shade(ground, STEP.track),
    unlit: shade(ground, STEP.unlit),
    quiet: shade(ground, STEP.quiet),
    paper: blendOver(colors.text, ground, PAPER_MIX),
    glow: colors.text,
  }
}

/** `ink` held to the contrast `size` needs on `ground`. */
export function keynoteText(ink: string, ground: string, size: number): string {
  return lineupText(ink, ground, size)
}

/** Quiet text (the source, the count, a tick) held to the 3:1 a meta line needs. */
export function keynoteMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a line that carries meaning, an icon, a bar) held to 3:1 on `ground`. */
export function keynoteMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text ────────────────────────────────────────────────────────────────

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitKeynote(text: string | undefined, spec: LineupTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitLineup(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function keynoteWidth(text: string, size: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupWidth(text, size, ctx, opts)
}

/** The tracked width of `text`, as `paintKeynoteTracked` sets it. */
export function keynoteTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupTrackedWidth(text, size, tracking, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function keynoteBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return lineupBaseline(top, lineHeight, size, serif)
}

const spec = (size: number, attrs?: Record<string, string>) => ({ ...keynoteSmall(size), ...attrs })

/** Paints a fitted block, one `<text>` a line, its `**…**` runs in silver. */
export function paintKeynote(layout: EmphasisHeadingLayout, opts: LineupPaint): React.ReactNode {
  return paintLineup(layout, { ...opts, lit: opts.lit ?? keynoteInks(opts.ctx).silver, attrs: spec(layout.fontSize, opts.attrs) })
}

/** One line known to fit, its marks in silver. */
export function paintKeynoteLine(text: string, opts: Omit<LineupPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  return paintLineupLine(text, { ...opts, lit: opts.lit ?? keynoteInks(opts.ctx).silver, attrs: spec(opts.size, opts.attrs) })
}

/** `text` with `tracking` px between its characters. */
export function paintKeynoteTracked(opts: Parameters<typeof paintLineupTracked>[0]): React.ReactElement {
  return paintLineupTracked({ ...opts, attrs: spec(opts.size, opts.attrs) })
}

export { lineupChinese as keynoteChinese, paintLineupRule as paintKeynoteRule, LineupWash as KeynoteWash }

// ── Figures ─────────────────────────────────────────────────────────────

/** A figure set large and bold in the heading face, closed up by `tracking` (negative), its unit after it smaller and untracked. */
export interface KeynoteFigureSpec {
  size: number
  unit: number
  tracking?: number
}

/** The width a figure and its unit take, as `paintKeynoteFigure` sets them. */
export function keynoteFigureWidth(value: string, unit: string | undefined, spec: KeynoteFigureSpec, ctx: ComponentCtx): number {
  const v = stripEmphasis(value).trim()
  const w = keynoteWidth(v, spec.size, ctx, { serif: true, bold: true }) + Math.max(0, Array.from(v).length - 1) * (spec.tracking ?? 0)
  const u = unit?.trim()
  return u ? w + keynoteWidth(` ${u}`, spec.unit, ctx, { serif: true, bold: true }) : w
}

/** A figure on `baseline` from `x` (or centred on it, or ending at it), bold, its unit after it. */
export function paintKeynoteFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; spec: KeynoteFigureSpec; fill: string; anchor?: "start" | "middle" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const value = stripEmphasis(opts.value).trim()
  const chars = Array.from(value)
  const u = opts.unit?.trim()
  const tracking = opts.spec.tracking ?? 0
  return (
    <text
      {...keynoteSmall(u ? opts.spec.unit : opts.spec.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.baseline}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={opts.spec.size}
      fontWeight="700"
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={u || value.includes(" ") ? "preserve" : undefined}
      data-tracking={tracking || undefined}
    >
      {tracking && chars.length > 1 ? (
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
        <tspan fontSize={opts.spec.unit}>
          {` ${u}`}
        </tspan>
      ) : null}
    </text>
  )
}

/** Whether a figure is marked: the author lit the whole of it (`**30.22%**`). */
export function keynoteLit(text: string): boolean {
  const segments = parseEmphasis(text.trim()).filter((s) => s.text.trim())
  return segments.length > 0 && segments.every((s) => s.emphasized)
}

/**
 * A number as the board prints it: thousands grouped with commas, and as
 * many decimals as the most precise value beside it (`15.10` beside
 * `49.96`), so a column of figures reads as one.
 */
export function keynoteNumber(value: number, decimals = 0): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

/** The most decimals any of `values` is written with. */
export function keynoteDecimals(values: readonly number[]): number {
  return Math.max(0, ...values.map((v) => (Number.isInteger(v) ? 0 : (String(v).split(".")[1]?.length ?? 0))))
}

/** A value and its unit as one label: a percent sign closes up, any other unit stands after a space. */
export function keynoteWithUnit(value: string, unit: string | undefined): string {
  const u = unit?.trim()
  if (!u) return value
  return u === "%" || u === "％" ? `${value}${u}` : `${value} ${u}`
}

// ── Light ───────────────────────────────────────────────────────────────

/**
 * A follow spot: a disc of the paper white fading from `strength` at its
 * centre to nothing at its rim, a faint spill of light on the black.
 * PowerPoint draws it as a round gradient. `id` names the gradient, unique on
 * the page.
 */
export function KeynoteSpot({ id, cx, cy, r, strength, ctx }: { id: string; cx: number; cy: number; r: number; strength: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = keynoteInks(ctx)
  return (
    <g data-keynote-spot="">
      <defs>
        <radialGradient id={id}>
          <stop offset="0%" stopColor={inks.glow} stopOpacity={strength} />
          <stop offset="100%" stopColor={inks.glow} stopOpacity={0} />
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${id})`} />
    </g>
  )
}

// ── Photographs and symbols ─────────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A photograph filling `box`, cropped to the part the author named. The theme's surface stands in where the deck has no such asset. */
export function paintKeynotePhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { crop?: Crop; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  if (!asset?.src) return <rect key={opts.key} data-keynote-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={keynoteInks(ctx).door} />
  return (
    <g key={opts.key} data-keynote-photo={assetId}>
      <CroppedImage src={asset.src} box={box} crop={opts.crop} alt={asset.alt} assetKey={assetId} />
    </g>
  )
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintKeynoteIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-keynote-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} strokeWidth={opts.stroke} />
    </g>
  )
}

// ── The claim, the chapter and the source a composition places ─────────

/**
 * Where a composition places the page's claim: its measure, the top of its
 * first line, and optionally its size, line box, how many lines it may take
 * and whether it is centred. The claim is set bold in the heading face.
 */
export interface KeynoteClaimColumn {
  x: number
  w: number
  /** The top of the first line's box: y76 when omitted. */
  top?: number
  size?: number
  lineHeight?: number
  maxLines?: number
  align?: "center" | "start"
  /** The claim's ink: the paper white unless the board sets it quieter. */
  tone?: "ink" | "muted"
  /** The claim's weight: bold unless the board sets it regular (a muted claim is always regular). */
  weight?: "bold" | "regular"
  /** The size below which the claim will not shrink to stay on one line. */
  minPt?: number
}

/** The page's claim in `column`: the drawing, `null` when the face handed none, or `false` when it does not fit the column whole. */
export function placeKeynoteClaim(claim: ((column: KeynoteClaimColumn) => React.ReactElement | null) | undefined, column: KeynoteClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/** Where a composition places the page's source: its column, the foot its last line may not pass, and whether it is centred. */
export interface KeynoteSourceColumn {
  x: number
  w: number
  /** The top of the first line: y626 when omitted. */
  top?: number
  /** The lowest its last line may end: the source rises a line when it takes two. */
  foot?: number
  align?: "center"
}

/** The page's source in `column`: the drawing, `null` when the page has none, or `false` when it does not fit. */
export function placeKeynoteSource(source: ((column: KeynoteSourceColumn) => React.ReactElement | null) | undefined, column: KeynoteSourceColumn): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}

/** Where a composition places the page's chapter (`kicker`): its left, its top and the room it has. */
export interface KeynoteKickerColumn {
  x: number
  top: number
  w: number
}

/** The page's chapter in `column`: the drawing, `null` when the page has none, or `false` when it does not fit. */
export function placeKeynoteKicker(kicker: ((column: KeynoteKickerColumn) => React.ReactElement | null) | undefined, column: KeynoteKickerColumn): React.ReactElement | null | false {
  if (!kicker) return null
  return kicker(column) ?? false
}

/** Whether `rect` is the whole page from its top left corner: the compositions set a page by its board's coordinates and take nothing else. */
export function wholePage(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.x === 0 && rect.y === 0 && rect.w >= 1280 && rect.h >= 720
}

// ── The places the board sets the frame in ──────────────────────────────

/** The chapter at the top left. */
export const KICKER_AT: KeynoteKickerColumn = { x: 64, top: 40, w: 900 }

/** The claim across the measure from y76, on one line. */
export const CLAIM_AT: KeynoteClaimColumn = { x: 64, w: 1152, top: 76, size: 40, lineHeight: 50, maxLines: 1 }

/** The claim centred over two figures face to face, from y110. */
export const CLAIM_CENTRED: KeynoteClaimColumn = { x: 64, w: 1152, top: 110, size: 40, lineHeight: 50, maxLines: 1, align: "center" }

/** One sentence alone: 72/96 centred, its first line from y230. */
export const CLAIM_HUSH: KeynoteClaimColumn & { lineHeight: number; top: number } = { x: 64, w: 1152, top: 230, size: 72, lineHeight: 96, align: "center" }

/** The source at the foot from y626, its last line by y664. */
export const SOURCE_AT: KeynoteSourceColumn = { x: 64, w: 1152, top: 626 }

/** The same, centred. */
export const SOURCE_CENTRED: KeynoteSourceColumn = { ...SOURCE_AT, align: "center" }

/**
 * A round value-axis ceiling over `max`: `max` with `headroom` above it,
 * raised to the next multiple of a step one `steps`-th of its power of ten
 * (204.55 with 7% headroom in steps of 20 is 220, 32.31 with 10% in steps
 * of 2 is 36).
 */
export function keynoteCeiling(max: number, headroom: number, steps: number): number {
  if (!(max > 0)) return 1
  const step = 10 ** Math.floor(Math.log10(max)) / steps
  return Math.ceil((max * (1 + headroom)) / step - 1e-9) * step
}
