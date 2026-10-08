import type React from "react"
import type { ComponentCtx } from "../../components/types"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { stripEmphasis } from "../../render/emphasis"
import { blendOver, graphicInk, metaInk, relativeLuminance } from "../../render/ink"
import { CroppedImage, type Crop } from "../../render/cropped-image"
import { Icon } from "../../render/icons"
import {
  fitLineup,
  lineupBaseline,
  lineupFigureWidth,
  lineupText,
  lineupTrackedWidth,
  lineupWidth,
  paintLineup,
  paintLineupFigure,
  paintLineupLine,
  paintLineupRule,
  paintLineupTracked,
  type LineupFigureSpec,
  type LineupPaint,
  type LineupTextSpec,
} from "./lineup"
import { fitMemoTitle } from "./memo"

/*
 * The placard setting: an exhibition label in a darkened gallery, museum's
 * 2026-10 board (`design/rounds/2026-10-08-museum/`).
 *
 * A dark hall, a lifted board for each label and room, warm paper words, an
 * old paper grey for what is quieter and a dimmer one for captions and
 * sources, seams for what divides, and copper (the theme's accent) on the
 * one thing a page is about. The exhibits stand in a pool of warm light (a
 * radial glow, which PowerPoint draws as a round gradient) and a round
 * photograph sits in it like an object under a lamp. Titles, names, figures
 * and the lines a label reads aloud are set in the heading serif at its
 * regular weight, labels and captions small in the body sans, labels tracked
 * wide.
 *
 * The board's small type (10 to 15px captions, labels, the hall sign and the
 * source) is under the 16px floor and carries the `placard-spec` exemption
 * the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way. The text fitting and painting are the lineup
 * setting's, set with this setting's exemption.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const PLACARD_SPEC = { "data-font-floor-exempt": "placard-spec" } as const

/** Meta-information set quiet on purpose (a caption, the source, the folio): held to 3:1 rather than the body's 4.5:1. */
export const PLACARD_META = { "data-contrast-tier": "meta" } as const

/** `PLACARD_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function placardSmall(size: number): Record<string, string> {
  return size < 16 ? { ...PLACARD_SPEC } : {}
}

export interface PlacardInks {
  /** The hall: the page. */
  ground: string
  /** A label's board, a room on the plan. */
  board: string
  /** A case: what is drawn a step darker than a board, such as a large quantity's square. */
  vitrine: string
  /** Words: the warm paper. */
  ink: string
  /** What is quieter: old paper. */
  muted: string
  /** Captions, sources, the deck's label: old paper in the dark. */
  dim: string
  /** Seams between rows and around a room. Never words. */
  line: string
  /** The copper of a label's number: the one thing a page is about. */
  copper: string
  /** The copper lit a step toward the light, for a name or a date under it. */
  lit: string
  /** The warm light a pool of light is drawn in. */
  glow: string
}

/** #8F8268 on the board: old paper about two thirds of the way from the hall. */
const DIM_MIX = 0.68
/** The warm light: the paper with a quarter of the copper in it. */
const GLOW_MIX = 0.25

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
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0").toUpperCase()
  return `#${to(r)}${to(g)}${to(b)}`
}

/** The copper a step toward the light: lighter on a dark hall, darker on a pale one. #D9A15A over #BE7A28 on the board. */
function litCopper(accent: string, ground: string): string {
  const [h, s, l] = hexToHsl(accent)
  const dark = relativeLuminance(ground) < 0.18
  return hslToHex(h, s, Math.min(0.9, Math.max(0.1, l + (dark ? 0.15 : -0.12))))
}

export function placardInks(ctx: ComponentCtx): PlacardInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  return {
    ground,
    board: colors.surface,
    vitrine: colors.primary,
    ink: colors.text,
    muted: colors.muted,
    dim: blendOver(colors.muted, ground, DIM_MIX),
    line: colors.border ?? blendOver(colors.muted, ground, 0.25),
    copper: colors.accent,
    lit: litCopper(colors.accent, ground),
    glow: blendOver(colors.accent, colors.text, GLOW_MIX),
  }
}

/** `ink` held to the contrast `size` needs on `ground`. */
export function placardText(ink: string, ground: string, size: number): string {
  return lineupText(ink, ground, size)
}

/** Quiet text (a caption, the source, the folio) held to the 3:1 a meta line needs. */
export function placardMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a rule that carries meaning, an icon, a bar) held to 3:1 on `ground`. */
export function placardMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text ────────────────────────────────────────────────────────────────

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitPlacard(text: string | undefined, spec: LineupTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitLineup(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function placardWidth(text: string, size: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupWidth(text, size, ctx, opts)
}

/** The tracked width of `text`, as `paintPlacardTracked` sets it. */
export function placardTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupTrackedWidth(text, size, tracking, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function placardBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return lineupBaseline(top, lineHeight, size, serif)
}

const spec = (size: number, attrs?: Record<string, string>) => ({ ...placardSmall(size), ...attrs })

/** Paints a fitted block, one `<text>` a line, its `**…**` runs in copper. */
export function paintPlacard(layout: EmphasisHeadingLayout, opts: LineupPaint): React.ReactNode {
  return paintLineup(layout, { ...opts, attrs: spec(layout.fontSize, opts.attrs) })
}

/** One line known to fit, its marks in copper. */
export function paintPlacardLine(text: string, opts: Omit<LineupPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  return paintLineupLine(text, { ...opts, attrs: spec(opts.size, opts.attrs) })
}

/** `text` with `tracking` px between its characters. */
export function paintPlacardTracked(opts: Parameters<typeof paintLineupTracked>[0]): React.ReactElement {
  return paintLineupTracked({ ...opts, attrs: spec(opts.size, opts.attrs) })
}

/** A figure in the heading serif with its unit after it, smaller. */
export function paintPlacardFigure(opts: Parameters<typeof paintLineupFigure>[0]): React.ReactElement {
  return paintLineupFigure({ ...opts, attrs: spec(opts.unit ? opts.spec.unit : opts.spec.size, opts.attrs) })
}

export { lineupFigureWidth as placardFigureWidth, paintLineupRule as paintPlacardRule }
export type { LineupFigureSpec as PlacardFigureSpec }

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintPlacardIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-placard-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} strokeWidth={opts.stroke} />
    </g>
  )
}

// ── Light and objects ───────────────────────────────────────────────────

/**
 * A pool of warm light: a disc of the glow fading from `strength` at its
 * centre to nothing at its rim. PowerPoint draws it as a round gradient.
 * `id` names the gradient, unique on the page.
 */
export function PlacardGlow({ id, cx, cy, r, strength, ctx }: { id: string; cx: number; cy: number; r: number; strength: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = placardInks(ctx)
  return (
    <g data-placard-glow="">
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

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A photograph filling `box`, cropped to the part the author named, cut round when `round`. A board stands in where the deck has no such asset. */
export function paintPlacardPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { crop?: Crop; round?: boolean; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  if (!asset?.src) {
    const fill = placardInks(ctx).board
    return opts.round ? <circle key={opts.key} data-placard-photo={assetId} cx={box.x + box.w / 2} cy={box.y + box.h / 2} r={Math.min(box.w, box.h) / 2} fill={fill} /> : <rect key={opts.key} data-placard-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
  }
  return (
    <g key={opts.key} data-placard-photo={assetId}>
      <CroppedImage src={asset.src} box={box} crop={opts.crop} alt={asset.alt} assetKey={assetId} round={opts.round} />
    </g>
  )
}

// ── The claim and the source a composition places ──────────────────────

/** Where a composition places the page's claim: its measure, and optionally its size, line box, the foot its last line ends on, how many lines it may take and whether it is centred. */
export interface PlacardClaimColumn {
  x: number
  w: number
  size?: number
  lineHeight?: number
  foot?: number
  maxLines?: number
  align?: "center" | "start"
}

/** The page's claim in `column`: the drawing, `null` when the face handed none, or `false` when it does not fit the column whole. */
export function placePlacardClaim(claim: ((column: PlacardClaimColumn) => React.ReactElement | null) | undefined, column: PlacardClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/** Where a composition places the page's source: its column, the top of its first line, its line box, whether it is centred, and what it sits on. */
export interface PlacardSourceColumn {
  x: number
  w: number
  top?: number
  lineHeight?: number
  align?: "center"
  ground?: string
}

/** The page's source in `column`: the drawing, `null` when the page has none, or `false` when it does not fit. */
export function placePlacardSource(source: ((column: PlacardSourceColumn) => React.ReactElement | null) | undefined, column: PlacardSourceColumn): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}

/** A caption under a photograph: 10/16 in the dim, tracked half a pixel. */
export const PLACARD_CAPTION = { size: 10, lineHeight: 16, tracking: 0.5 } as const

/** A caption fitted to `w` on one line, or `null` when it does not fit. */
export function fitPlacardCaption(text: string | undefined, w: number, ctx: ComponentCtx): string | null {
  const t = text ? stripEmphasis(text).trim() : ""
  if (!t) return null
  return placardTrackedWidth(t, PLACARD_CAPTION.size, PLACARD_CAPTION.tracking, ctx) <= w ? t : null
}

/** A caption on one line from `x` (or centred on it, or ending at it), its box from `top`. */
export function paintPlacardCaption(text: string, opts: { ctx: ComponentCtx; x: number; top: number; anchor?: "start" | "middle" | "end"; ground?: string; key?: string | number }): React.ReactElement {
  const inks = placardInks(opts.ctx)
  return (
    <g key={opts.key} data-placard-caption="">
      {paintPlacardTracked({ ctx: opts.ctx, text, x: opts.x, y: placardBaseline(opts.top, PLACARD_CAPTION.lineHeight, PLACARD_CAPTION.size), size: PLACARD_CAPTION.size, tracking: PLACARD_CAPTION.tracking, fill: placardMeta(inks.dim, opts.ground ?? inks.ground), anchor: opts.anchor, attrs: { ...PLACARD_META } })}
    </g>
  )
}

/** Whether `rect` is the whole page: the compositions that set a page by its board's coordinates take nothing smaller. */
export function wholePage(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.w >= 1280 && rect.h >= 720
}

/** Whether the deck writes in Chinese: the deck's own figure style, or the words handed in when a page is drawn alone. */
export { lineupChinese as placardChinese, wholeLit } from "./lineup"

/**
 * A line read aloud, fitted at exactly `size`: on one line when it fits,
 * else on two broken at the last comma or colon that lets both fit (a label
 * breaks 「月球的火山活动，」 over 「比此前已知的又延续了约 8 至 9 亿年」), else
 * filled line by line up to `maxLines`. `null` when it does not fit whole.
 */
export function fitPlacardSentence(text: string | undefined, spec: LineupTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  if (!text?.trim()) return null
  if (!text.includes("\n")) {
    const seamed = fitMemoTitle(text, { maxWidth: spec.width, fontSize: spec.size, minPt: spec.size, lineHeight: spec.lineHeight, fontFamily: spec.serif ? ctx.fonts.heading : ctx.fonts.body, bold: spec.bold === true })
    if (!seamed.truncated && seamed.lines.length <= Math.min(2, spec.maxLines)) return { ...seamed, lineHeight: spec.lineHeight }
  }
  return fitPlacard(text, spec, ctx)
}
