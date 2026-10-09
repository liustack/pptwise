import type React from "react"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { parseEmphasis, stripEmphasis } from "../../render/emphasis"
import { blendOver, graphicInk, metaInk } from "../../render/ink"
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
 * The chalkboard setting: a night class at a green board, lecture's 2026-10
 * board (`design/rounds/2026-10-08-lecture/`).
 *
 * The lights in the room are low and the board is lit: an ink-green field,
 * words written in chalk white, what is quieter in a chalk grey that has
 * been half wiped off, sources and captions dimmer still, ruled and dashed
 * lines in the grey a breath off the board, and one stroke of yellow chalk
 * (the theme's accent) a page under the thing that matters. Chalk is drawn
 * by hand: a line laid twice, the second pass thinner and skipping; boxes
 * whose edges skip a little; a ring around a word; braces under the terms of
 * a formula. Titles, terms, figures and the lines worked on the board are set
 * in the heading serif at its regular weight, notes and labels in the body
 * sans.
 *
 * The board's small type (10 to 15px captions, labels, the lesson's step,
 * the source and the stamp) is under the 16px floor and carries the
 * `chalkboard-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way. The text fitting and painting are the lineup
 * setting's, set with this setting's exemption and its marked runs in the
 * yellow.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const CHALKBOARD_SPEC = { "data-font-floor-exempt": "chalkboard-spec" } as const

/** Meta-information set quiet on purpose (the source, a caption, a tick): held to 3:1 rather than the body's 4.5:1. */
export const CHALKBOARD_META = { "data-contrast-tier": "meta" } as const

/** `CHALKBOARD_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function chalkboardSmall(size: number): Record<string, string> {
  return size < 16 ? { ...CHALKBOARD_SPEC } : {}
}

export interface ChalkboardInks {
  /** The board. */
  ground: string
  /** A box filled on the board: the theme's surface most of the way back to the board. */
  panel: string
  /** Words: the chalk white. */
  chalk: string
  /** What is quieter: notes, operators, a wiped-off grey. */
  muted: string
  /** Sources, captions, ticks: the grey most of the way into the board. */
  dim: string
  /** Ruled and dashed lines between rows. Never words. */
  line: string
  /** The one stroke of yellow chalk a page. */
  yellow: string
}

/** #7F9488 on the board: the chalk grey about seven tenths of the way from the board. */
const DIM_MIX = 0.72
/** #3A4A42 on the board: the chalk grey a fifth of the way from the board. */
const LINE_MIX = 0.22
/** #22302A on the board: the surface six tenths of the way from the board. */
const PANEL_MIX = 0.62

export function chalkboardInks(ctx: ComponentCtx): ChalkboardInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  return {
    ground,
    panel: blendOver(colors.surface, ground, PANEL_MIX),
    chalk: colors.text,
    muted: colors.muted,
    dim: blendOver(colors.muted, ground, DIM_MIX),
    line: blendOver(colors.muted, ground, LINE_MIX),
    yellow: colors.accent,
  }
}

/** `ink` held to the contrast `size` needs on `ground`. */
export function chalkText(ink: string, ground: string, size: number): string {
  return lineupText(ink, ground, size)
}

/** Quiet text (the source, a caption, a tick) held to the 3:1 a meta line needs. */
export function chalkMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a stroke that carries meaning, an icon, a bar's edge) held to 3:1 on `ground`. */
export function chalkMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text ────────────────────────────────────────────────────────────────

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitChalk(text: string | undefined, spec: LineupTextSpec, ctx: Pick<ComponentCtx, "fonts">): EmphasisHeadingLayout | null {
  return fitLineup(text, spec, ctx)
}

/**
 * `text` set at exactly `spec.size` with the author's own breaks kept: each
 * part the author wrote on a line of its own is fitted to the column, and
 * the parts together take no more than `spec.maxLines`. `null` when it does
 * not fit whole.
 */
export function fitChalkBroken(text: string | undefined, spec: LineupTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  const parts = (text ?? "")
    .split(/\n+/u)
    .map((part) => part.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fitted: EmphasisHeadingLayout[] = []
  let lines = 0
  for (const part of parts) {
    const layout = fitLineup(part, { ...spec, maxLines: spec.maxLines - lines }, ctx)
    if (!layout) return null
    lines += layout.lines.length
    fitted.push(layout)
  }
  return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments) }
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function chalkWidth(text: string, size: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupWidth(text, size, ctx, opts)
}

/** The tracked width of `text`, as `paintChalkTracked` sets it. */
export function chalkTrackedWidth(text: string, size: number, tracking: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupTrackedWidth(text, size, tracking, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function chalkBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return lineupBaseline(top, lineHeight, size, serif)
}

const spec = (size: number, attrs?: Record<string, string>) => ({ ...chalkboardSmall(size), ...attrs })

/** Paints a fitted block, one `<text>` a line, its `**…**` runs in the yellow. */
export function paintChalk(layout: EmphasisHeadingLayout, opts: LineupPaint): React.ReactNode {
  return paintLineup(layout, { ...opts, lit: opts.lit ?? chalkboardInks(opts.ctx).yellow, attrs: spec(layout.fontSize, opts.attrs) })
}

/** One line known to fit, its marks in the yellow. */
export function paintChalkLine(text: string, opts: Omit<LineupPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  return paintLineupLine(text, { ...opts, lit: opts.lit ?? chalkboardInks(opts.ctx).yellow, attrs: spec(opts.size, opts.attrs) })
}

/** `text` with `tracking` px between its characters. */
export function paintChalkTracked(opts: Parameters<typeof paintLineupTracked>[0]): React.ReactElement {
  return paintLineupTracked({ ...opts, attrs: spec(opts.size, opts.attrs) })
}

export { lineupChinese as chalkChinese, paintLineupRule as paintChalkRule, LineupWash as ChalkWash }

/** Whether `text`, its marks and spaces aside, is all marked: the author chalked the whole of it. */
export function chalkLit(text: string): boolean {
  const segments = parseEmphasis(text.trim()).filter((s) => s.text.trim())
  return segments.length > 0 && segments.every((s) => s.emphasized)
}

/** Whether any of `text` is marked. */
export function chalkMarked(text: string | undefined): boolean {
  return parseEmphasis(text ?? "").some((s) => s.emphasized && s.text.trim())
}

/** A line the author split in two with a line break: its first line and the rest. */
export function chalkHeadAndRest(text: string): { head: string; rest: string } {
  const [head = "", ...rest] = text.split(/\n/u)
  return { head: head.trim(), rest: rest.join("\n").trim() }
}

// ── Chalk ───────────────────────────────────────────────────────────────

interface Pt {
  x: number
  y: number
}

/**
 * A stroke that skips, as chalk does on a board: the path through `points`
 * walked along its length, drawn where the pattern is on (`[on, off, on,
 * off, …]` in px) and left bare where it is off. Written as one path of
 * separate runs, so the export draws exactly these runs rather than a dash
 * style of its own.
 */
export function skipPath(points: readonly Pt[], pattern: readonly number[], closed = false): string {
  const pts = closed && points.length > 0 ? [...points, points[0]!] : [...points]
  const runs: string[] = []
  let k = 0
  let left = pattern[0] ?? Infinity
  let on = true
  let current: Pt[] = pts.length > 0 ? [pts[0]!] : []
  const fmt = (p: Pt) => `${Math.round(p.x * 10) / 10} ${Math.round(p.y * 10) / 10}`
  const close = () => {
    if (current.length > 1) runs.push(`M ${fmt(current[0]!)} ${current.slice(1).map((p) => `L ${fmt(p)}`).join(" ")}`)
    current = []
  }
  for (let i = 1; i < pts.length; i += 1) {
    const a = pts[i - 1]!
    const b = pts[i]!
    const length = Math.hypot(b.x - a.x, b.y - a.y)
    let pos = 0
    while (length - pos > left) {
      pos += left
      const t = pos / length
      const cut = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
      if (on) {
        current.push(cut)
        close()
      } else current = [cut]
      on = !on
      k = (k + 1) % pattern.length
      left = pattern[k] ?? Infinity
    }
    left -= length - pos
    if (on) current.push(b)
  }
  if (on) close()
  return runs.join(" ")
}

/** Points along a quadratic curve from `a` through control `c` to `b`, `n` steps. */
function quadPoints(a: Pt, c: Pt, b: Pt, n = 24): Pt[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    const u = 1 - t
    return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
  })
}

/** The pattern a chalk outline skips by: a long run, a break, a shorter run, a shorter break. */
export const CHALK_SKIP = [80, 4, 40, 3] as const
/** The pattern the second, thinner pass of a chalk stroke breaks by. */
const UNDER_SKIP = [14, 6, 30, 5] as const
/** The pattern a ring around a word skips by. */
const RING_SKIP = [60, 4, 30, 3] as const

/**
 * One stroke of chalk under a word, from `x1` to `x2` on `y`: a line bowed
 * slightly up, laid twice, the second pass half as thick, lower and broken,
 * the way chalk skips on a board.
 */
export function ChalkUnder({ x1, x2, y, ink, width, marked = false }: { x1: number; x2: number; y: number; ink: string; width: number; marked?: boolean }): React.ReactElement {
  const mid = (x1 + x2) / 2
  const second = skipPath(quadPoints({ x: x1 + 6, y: y + 4 }, { x: mid, y: y + 1 }, { x: x2 - 4, y: y + 3 }), UNDER_SKIP)
  // `marked`: the stroke is the theme's emphasis underline under a run the author marked.
  return (
    <g data-chalk-under="" data-emphasis-underline={marked ? "" : undefined}>
      <path d={`M ${x1} ${y + 1} Q ${mid} ${y - 3} ${x2} ${y}`} stroke={ink} strokeWidth={width} fill="none" strokeLinecap="round" strokeOpacity={0.95} />
      <path d={second} stroke={ink} strokeWidth={width / 2} fill="none" strokeLinecap="round" strokeOpacity={0.5} />
    </g>
  )
}

/** A ring of chalk around a word, centred on `cx`, `cy`, tipped four degrees back and skipping as it goes round. */
export function ChalkRing({ cx, cy, rx, ry, ink }: { cx: number; cy: number; rx: number; ry: number; ink: string }): React.ReactElement {
  const turn = (-4 * Math.PI) / 180
  const pts = Array.from({ length: 73 }, (_, i) => {
    const a = (i / 72) * 2 * Math.PI
    const x = rx * Math.cos(a)
    const y = ry * Math.sin(a)
    return { x: cx + x * Math.cos(turn) - y * Math.sin(turn), y: cy + x * Math.sin(turn) + y * Math.cos(turn) }
  })
  return <path data-chalk-ring="" d={skipPath(pts, RING_SKIP)} stroke={ink} strokeWidth={2.6} fill="none" />
}

/** A box drawn in chalk, its edges skipping, filled with `fill` when given. */
export function ChalkBox({ x, y, w, h, ink, width, fill, pattern = CHALK_SKIP }: { x: number; y: number; w: number; h: number; ink: string; width: number; fill?: string; pattern?: readonly number[] }): React.ReactElement {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
  ]
  return (
    <g data-chalk-box="">
      {fill ? <rect x={x} y={y} width={w} height={h} fill={fill} /> : null}
      <path d={skipPath(corners, pattern, true)} stroke={ink} strokeWidth={width} fill="none" />
    </g>
  )
}

/** A curly brace under a term from `x1` to `x2`, opening down from `y`, its tip at the middle 20px below. */
export function ChalkBrace({ x1, x2, y, ink }: { x1: number; x2: number; y: number; ink: string }): React.ReactElement {
  const m = (x1 + x2) / 2
  const d = `M ${x1} ${y} Q ${x1} ${y + 10} ${x1 + 12} ${y + 10} L ${m - 10} ${y + 10} Q ${m} ${y + 10} ${m} ${y + 20} Q ${m} ${y + 10} ${m + 10} ${y + 10} L ${x2 - 12} ${y + 10} Q ${x2} ${y + 10} ${x2} ${y}`
  return <path data-chalk-brace="" d={d} fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
}

/** A cross in chalk, `size` square from `x`, `y`: a thing to get wrong. */
export function ChalkCross({ x, y, size, ink }: { x: number; y: number; size: number; ink: string }): React.ReactElement {
  return <path data-chalk-cross="" d={`M ${x} ${y} L ${x + size} ${y + size} M ${x + size} ${y} L ${x} ${y + size}`} stroke={ink} strokeWidth={3.4} strokeLinecap="round" fill="none" />
}

/** A ruled line from `x1` to `x2` on `y`, dashed `dash` when given. */
export function chalkLine(x1: number, y1: number, x2: number, y2: number, ink: string, width: number, opts: { dash?: string; key?: string | number } = {}): React.ReactElement {
  return <line key={opts.key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth={width} strokeLinecap="round" strokeDasharray={opts.dash} />
}

// ── Photographs, symbols and the stamp ──────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A photograph filling `box`, cropped to the part the author named. A panel of the board stands in where the deck has no such asset. */
export function paintChalkPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { crop?: Crop; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  if (!asset?.src) return <rect key={opts.key} data-chalk-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={chalkboardInks(ctx).panel} />
  return (
    <g key={opts.key} data-chalk-photo={assetId}>
      <CroppedImage src={asset.src} box={box} crop={opts.crop} alt={asset.alt} assetKey={assetId} />
    </g>
  )
}

/** A caption under a photograph: 10/16 in the dim grey. */
export const CHALK_CAPTION = { size: 10, lineHeight: 16 } as const

/** A caption on one line in `w`, or `null` when it does not fit. */
export function fitChalkCaption(text: string | undefined, w: number, ctx: ComponentCtx): string | null {
  const t = text ? stripEmphasis(text).trim() : ""
  if (!t) return null
  return chalkWidth(t, CHALK_CAPTION.size, ctx) <= w ? t : null
}

/** A caption from `x` (or ending at it), its box from `top`. */
export function paintChalkCaption(text: string, opts: { ctx: ComponentCtx; x: number; top: number; anchor?: "start" | "end" }): React.ReactElement {
  const inks = chalkboardInks(opts.ctx)
  return (
    <g data-chalk-caption="">
      {paintChalkLine(text, { ctx: opts.ctx, x: opts.x, anchor: opts.anchor, top: opts.top, lineHeight: CHALK_CAPTION.lineHeight, size: CHALK_CAPTION.size, fill: chalkMeta(inks.dim, inks.ground), attrs: { ...CHALKBOARD_META } })}
    </g>
  )
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintChalkIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-chalk-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} strokeWidth={opts.stroke} />
    </g>
  )
}

/** The stamp on an example: its words bold at 12px in the yellow inside a dashed yellow box, at least 150 wide and 24 high. */
export const CHALK_STAMP = { h: 24, minW: 150, pad: 14, size: 12, lineHeight: 21 } as const

/** The width the stamp takes for `text`. */
export function chalkStampWidth(text: string, ctx: ComponentCtx): number {
  return Math.max(CHALK_STAMP.minW, Math.ceil(chalkWidth(stripEmphasis(text).trim(), CHALK_STAMP.size, ctx, { bold: true }) + CHALK_STAMP.pad * 2))
}

/** The page's stamp from `x`, `y`, or ending at `x` when `anchor` is `"end"`. */
export function ChalkStamp({ ctx, text, x, y, anchor }: { ctx: ComponentCtx; text: string; x: number; y: number; anchor?: "end" }): React.ReactElement {
  const inks = chalkboardInks(ctx)
  const words = stripEmphasis(text).trim()
  const w = chalkStampWidth(words, ctx)
  const left = anchor === "end" ? x - w : x
  return (
    <g data-chalk-stamp={words}>
      <rect x={left} y={y} width={w} height={CHALK_STAMP.h} rx={4} fill="none" stroke={chalkMark(inks.yellow, inks.ground)} strokeWidth={1.5} strokeDasharray="5 3" />
      {paintChalkLine(words, { ctx, x: left + w / 2, anchor: "middle", top: y + 1.5, lineHeight: CHALK_STAMP.lineHeight, size: CHALK_STAMP.size, bold: true, fill: chalkText(inks.yellow, inks.ground, CHALK_STAMP.size) })}
    </g>
  )
}

// ── The claim and the source a composition places ──────────────────────

/**
 * Where a composition places the page's title: its measure, and the foot its
 * last line rests on (a title that breaks grows upward from it), or the top
 * of its first line. Optionally its size, line box, how many lines it may
 * take, a quieter ink and a tracking, for a board that sets the line over a
 * formula as a lead-in.
 */
export interface ChalkClaimColumn {
  x: number
  w: number
  /** The bottom of the last line's box: y142 at the head of an ordinary page. */
  foot?: number
  /** The top of the first line's box, for a title hung from the top instead. */
  top?: number
  size?: number
  lineHeight?: number
  maxLines?: number
  tone?: "ink" | "muted"
  /** Px between the characters, for a lead-in tracked wide. */
  tracking?: number
}

/** The page's title in `column`: the drawing, `null` when the face handed none, or `false` when it does not fit the column whole. */
export function placeChalkClaim(claim: ((column: ChalkClaimColumn) => React.ReactElement | null) | undefined, column: ChalkClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/** Where a composition places the page's source: its column, the top of its first line, the foot its last line may not pass, and whether it is centred or set a size up as a note. */
export interface ChalkSourceColumn {
  x: number
  w: number
  top?: number
  foot?: number
  align?: "center"
  /** Set as a note: 13/22 in the grey rather than 11/15 in the dim. */
  note?: boolean
}

/** The page's source in `column`: the drawing, `null` when the page has none, or `false` when it does not fit. */
export function placeChalkSource(source: ((column: ChalkSourceColumn) => React.ReactElement | null) | undefined, column: ChalkSourceColumn): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}

/** Whether `rect` is the whole page from its top left corner: the compositions set a page by its board's coordinates and take nothing else. */
export function wholePage(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.x === 0 && rect.y === 0 && rect.w >= 1280 && rect.h >= 720
}

/** The title at the head of the board, across the measure, its last line resting on y142. */
export const CLAIM_AT: ChalkClaimColumn = { x: 64, w: 1152, foot: 142 }

/** The source at the foot of the board from y646, its last line by y676, over the chalk ledge. */
export const SOURCE_AT: ChalkSourceColumn = { x: 64, w: 1152, top: 646, foot: 676 }

/** Where the stamp stands at the top right of the board, over the title's line. */
export const STAMP_TOP_RIGHT = { x: 1216, y: 74 } as const

/** A number written plainly on a Chinese board (1600) and grouped in thousands in English (1,600). */
export function chalkNumber(value: number, chinese: boolean): string {
  if (chinese) return String(value)
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 })
}

/**
 * The page's title with the stamp at the top right of the board: on one line
 * across the measure when it fits there (the stamp stands over the line's
 * box), or broken short of the stamp. `stampWidth` is 0 when the page has
 * no stamp.
 */
export function placeChalkClaimBesideStamp(claim: ((column: ChalkClaimColumn) => React.ReactElement | null) | undefined, stampWidth: number): React.ReactElement | null | false {
  if (!claim) return null
  if (stampWidth <= 0) return claim(CLAIM_AT) ?? false
  return claim({ ...CLAIM_AT, maxLines: 1 }) ?? claim({ ...CLAIM_AT, w: CLAIM_AT.w - stampWidth - 24 }) ?? false
}

// ── The frame and the ledge ─────────────────────────────────────────────

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
  const hue = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x]
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, "0").toUpperCase()
  return `#${to(r)}${to(g)}${to(b)}`
}

export interface ChalkboardLedge {
  /** The frame and the ledge: a dark stained wood. */
  wood: string
  /** The ledge's lit lip. */
  lip: string
  /** Words written on the ledge. */
  words: string
  /** The eraser's back. */
  eraser: string
  /** The eraser's felt. */
  felt: string
}

/**
 * The wood of the board's frame and its ledge, the theme's yellow chalk
 * turned a little toward red, two fifths as saturated and darkened to a
 * stain (#5A4632 from lecture's #E9C46A), with the ledge's lit lip, the
 * words written on it, and the eraser's back and felt in the same hue.
 */
export function chalkboardLedge(ctx: ComponentCtx): ChalkboardLedge {
  const [h, s] = hexToHsl(ctx.colors.accent)
  const hue = h - 12.5
  const sat = s * 0.385
  return {
    wood: hslToHex(hue, sat, 0.275),
    lip: hslToHex(hue, sat * 0.85, 0.35),
    words: hslToHex(hue + 8, sat, 0.7),
    eraser: hslToHex(hue + 18, 0.045, 0.22),
    felt: hslToHex(hue + 5.5, sat * 0.65, 0.46),
  }
}
