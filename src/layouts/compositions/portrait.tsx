import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { blendOver, graphicInk, metaInk, readableBlock, readableOn } from "../../render/ink"
import { CroppedImage, type Crop } from "../../render/cropped-image"
import { Icon } from "../../render/icons"
import { dataUriDimensions } from "../../lib/image-size"
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
  type LineupPaint,
  type LineupTextSpec,
} from "./lineup"

/*
 * The portrait setting: a magazine profile of one person, profile's 2026-10
 * board (`design/rounds/2026-10-12-profile/`).
 *
 * One person tells a panel who they are in a few minutes. White paper and a
 * lot of air, the name, the claims and the figures in the heading serif and
 * set bold, the rest in the body sans. Nothing sits on a card: a black
 * hairline heads a column or a table, pale hairlines part its rows, and the
 * person's portrait comes back page after page, half the cover, a column
 * beside their own words, a round picture on the closing card. The theme's
 * accent goes to the short rule before each page's section, to the one
 * result or row a page is about and to at most one block a page filled
 * whole, whose words take white or the ink, whichever reads
 * (`readableBlock`). Gaps are set beside the wins, in the same type.
 *
 * The board's small type (12 to 15px labels, notes, dates, a legend and the
 * footer) is under the 16px floor and carries the `portrait-spec` exemption
 * the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way. The text fitting and painting are the lineup
 * setting's, set with this setting's exemption, and its marked runs bold in
 * the accent.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const PORTRAIT_SPEC = { "data-font-floor-exempt": "portrait-spec" } as const

/** Meta-information set quiet on purpose (a date, a note, the footer): held to 3:1 rather than the body's 4.5:1. */
export const PORTRAIT_META = { "data-contrast-tier": "meta" } as const

/** `PORTRAIT_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function portraitSmall(size: number): Record<string, string> {
  return size < 16 ? { ...PORTRAIT_SPEC } : {}
}

export interface PortraitInks {
  /** The paper. */
  ground: string
  /** Words, figures and the hairline that heads a column. */
  ink: string
  /** Running text a step quieter than the ink: a row's gloss, a column's words. */
  body: string
  /** What is quieter still: labels, dates, notes, the footer. */
  muted: string
  /** Hairlines between rows. Never words. */
  line: string
  /** A bar that is not the one the page is about. Never words. */
  bar: string
  /** The accent: the section's rule, the lit result, the one block. */
  lead: string
  /** A pale wash of the accent under the row a page is about. */
  tint: string
  /** A pale band of the paper's own warmth: the closing check under a table. */
  band: string
}

/** #4A4540 on the board: the ink most of the way to the grey. */
const BODY_MIX = 0.57
/** The row a page is about sits on the accent at 8% over the paper. */
const TINT_MIX = 0.08

export function portraitInks(ctx: ComponentCtx): PortraitInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  return {
    ground,
    ink: colors.text,
    body: blendOver(colors.muted, colors.text, BODY_MIX),
    muted: colors.muted,
    line: colors.border ?? blendOver(colors.muted, ground, 0.25),
    bar: colors.chartPalette[2] ?? blendOver(colors.muted, ground, 0.5),
    lead: colors.accent,
    tint: blendOver(colors.accent, ground, TINT_MIX),
    band: colors.surface,
  }
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the readable ink when it falls short. */
export function portraitText(ink: string, ground: string, size: number): string {
  return lineupText(ink, ground, size)
}

/** Quiet text (a date, a note, the footer) held to the 3:1 a meta line needs. */
export function portraitMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a rule that carries meaning, an icon, a bar) held to 3:1 on `ground`. */
export function portraitMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

/**
 * The one block a page fills whole in the accent, and the ink its words take:
 * the accent as it is when white or the ink reads on it at `size`, otherwise
 * the accent moved toward whichever reads better until it does
 * (`readableBlock`).
 */
export function portraitBlock(ctx: ComponentCtx, size: number): { fill: string; ink: string; quiet: string } {
  const fill = readableBlock(ctx.colors.accent, size)
  const ink = readableOn(fill)
  return { fill, ink, quiet: blendOver(ink, fill, 0.45) }
}

// ── Text ────────────────────────────────────────────────────────────────

export type PortraitTextSpec = LineupTextSpec

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitPortrait(text: string | undefined, spec: PortraitTextSpec, ctx: Pick<ComponentCtx, "fonts">): EmphasisHeadingLayout | null {
  return fitLineup(text, spec, ctx)
}

/** Several lines of words fitted one after another as one block, each starting a line of its own, or `null` when any does not fit or all take more than `spec.maxLines`. */
export function fitPortraitLines(texts: readonly string[], spec: PortraitTextSpec, ctx: Pick<ComponentCtx, "fonts">): EmphasisHeadingLayout | null {
  const parts = texts.map((t) => fitPortrait(t, spec, ctx))
  if (parts.length === 0 || parts.some((p) => !p)) return null
  const lines = parts.flatMap((p) => p!.lines)
  if (lines.length > spec.maxLines) return null
  return { ...parts[0]!, lines, segments: parts.flatMap((p) => p!.segments) }
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function portraitWidth(text: string, size: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupWidth(text, size, ctx, opts)
}

/** The tracked width of `text`, as `paintPortraitTracked` sets it. */
export function portraitTrackedWidth(text: string, size: number, tracking: number, ctx: Pick<ComponentCtx, "fonts">, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return lineupTrackedWidth(text, size, tracking, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function portraitBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return lineupBaseline(top, lineHeight, size, serif)
}

/** A fitted block painted one `<text>` a line, its `**…**` runs bold in the accent. */
export function paintPortrait(layout: EmphasisHeadingLayout, opts: LineupPaint): React.ReactNode {
  return paintLineup(layout, { litBold: true, ...opts, attrs: { ...portraitSmall(layout.fontSize), ...opts.attrs } })
}

/** One line known to fit, its marks bold in the accent. */
export function paintPortraitLine(text: string, opts: Omit<LineupPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  return paintLineupLine(text, { ...opts, attrs: { ...portraitSmall(opts.size), ...opts.attrs } })
}

/** `text` with `tracking` px between its characters. */
export function paintPortraitTracked(opts: Parameters<typeof paintLineupTracked>[0]): React.ReactElement {
  return paintLineupTracked({ ...opts, attrs: { ...portraitSmall(opts.size), ...opts.attrs } })
}

export { lineupChinese as portraitChinese, paintLineupRule as paintPortraitRule }

// ── Figures ─────────────────────────────────────────────────────────────

/** A figure set bold in the heading serif, its unit after it in the same serif at its regular weight, smaller. */
export interface PortraitFigureSpec {
  size: number
  unit: number
  /** The gap between the figure and its unit. */
  gap: number
  /** 900 for the board's heaviest figures (27%, 9.8%), 700 otherwise. */
  weight?: 700 | 900
}

/** A figure's value and unit, as an author writes them in one field: 「13.4 万」 is 13.4 and 万, 「27%」 stays whole. */
export function splitFigure(value: string, unit?: string): { value: string; unit?: string } {
  const plain = stripEmphasis(value).trim()
  if (unit?.trim()) return { value: plain, unit: unit.trim() }
  const m = /^([+\-−]?[\d.,]+(?:\s*[→-]\s*[\d.,]+)?)\s+(\S.{0,5})$/u.exec(plain)
  return m ? { value: m[1]!, unit: m[2]! } : { value: plain }
}

/** The width a figure and its unit take, as `paintPortraitFigure` sets them. */
export function portraitFigureWidth(value: string, unit: string | undefined, spec: PortraitFigureSpec, ctx: Pick<ComponentCtx, "fonts">): number {
  const w = portraitWidth(value, spec.size, ctx, { serif: true, bold: true })
  return unit ? w + spec.gap + portraitWidth(unit, spec.unit, ctx, { serif: true }) : w
}

/** A figure on `baseline` from `x`, its unit after it. */
export function paintPortraitFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; spec: PortraitFigureSpec; fill: string; anchor?: "start" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const { ctx, spec } = opts
  const valueW = portraitWidth(opts.value, spec.size, ctx, { serif: true, bold: true })
  const total = portraitFigureWidth(opts.value, opts.unit, spec, ctx)
  const x = opts.anchor === "end" ? opts.x - total : opts.x
  return (
    <g data-portrait-figure="">
      <text {...opts.attrs} x={x} y={opts.baseline} fontFamily={ctx.fonts.heading} fontSize={spec.size} fontWeight={String(spec.weight ?? 700)} fill={opts.fill} dominantBaseline="alphabetic" xmlSpace={opts.value.includes(" ") ? "preserve" : undefined}>
        {opts.value}
      </text>
      {opts.unit ? (
        <text {...portraitSmall(spec.unit)} x={x + valueW + spec.gap} y={opts.baseline} fontFamily={ctx.fonts.heading} fontSize={spec.unit} fill={opts.fill} dominantBaseline="alphabetic" xmlSpace={opts.unit.includes(" ") ? "preserve" : undefined}>
          {opts.unit}
        </text>
      ) : null}
    </g>
  )
}

// ── The section line ────────────────────────────────────────────────────

/** The short rule and the section over a page's claim: 28 by 2 in the accent, 12px of air, 16px serif bold tracked a tenth. */
export const SECTION = { rule: 28, ruleH: 2, gap: 12, size: 16, lineHeight: 24, tracking: 1.6 } as const

/** The section's width, rule included. */
export function sectionWidth(text: string, ctx: Pick<ComponentCtx, "fonts">): number {
  return SECTION.rule + SECTION.gap + portraitTrackedWidth(text, SECTION.size, SECTION.tracking, ctx, { serif: true, bold: true })
}

/** The rule and the section from `x`, the line's box from `top`. */
export function PortraitSection({ text, ctx, x, top, ground }: { text: string; ctx: ComponentCtx; x: number; top: number; ground?: string }): React.ReactElement {
  const inks = portraitInks(ctx)
  const on = ground ?? inks.ground
  const ink = portraitText(inks.lead, on, SECTION.size)
  const mid = top + SECTION.lineHeight / 2
  return (
    <g data-portrait-section={text}>
      <rect x={x} y={mid - SECTION.ruleH / 2} width={SECTION.rule} height={SECTION.ruleH} fill={portraitMark(inks.lead, on)} />
      {paintPortraitTracked({ ctx, text, x: x + SECTION.rule + SECTION.gap, y: portraitBaseline(top, SECTION.lineHeight, SECTION.size, true), size: SECTION.size, tracking: SECTION.tracking, serif: true, bold: true, fill: ink })}
    </g>
  )
}

// ── Photographs ─────────────────────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * The part of a picture that fills `box` with the picture's point
 * (`fx`, `fy`, fractions across and down) kept as near the frame's centre as
 * the picture allows, the way CSS `object-position` places it: a portrait
 * keeps its face when the frame is wider than the picture. `undefined` when
 * the picture's size cannot be read.
 */
export function focusCrop(src: string, box: { w: number; h: number }, fx: number, fy: number): Crop | undefined {
  const natural = dataUriDimensions(src)
  if (!natural || natural.w <= 0 || natural.h <= 0 || box.w <= 0 || box.h <= 0) return undefined
  const frame = box.w / box.h
  const picture = natural.w / natural.h
  const w = frame >= picture ? 1 : frame / picture
  const h = frame >= picture ? picture / frame : 1
  const round = (v: number) => Math.round(v * 10000) / 10000
  return [round((1 - w) * fx), round((1 - h) * fy), round(w), round(h)]
}

/**
 * A photograph filling `box`: cropped to the part the author named, or held
 * on the point (`focus`) the board keeps in view. `round` cuts it by the
 * circle inside its frame, drawn in the export as an oval picture. A grey
 * field stands in where the deck has no such asset.
 */
export function paintPortraitPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { crop?: Crop; focus?: readonly [number, number]; round?: boolean; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  if (!asset?.src) {
    const fill = blendOver(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, 0.2)
    return opts.round ? (
      <ellipse key={opts.key} data-portrait-photo={assetId} cx={box.x + box.w / 2} cy={box.y + box.h / 2} rx={box.w / 2} ry={box.h / 2} fill={fill} />
    ) : (
      <rect key={opts.key} data-portrait-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={fill} />
    )
  }
  const crop = opts.crop ?? (opts.focus ? focusCrop(asset.src, box, opts.focus[0], opts.focus[1]) : undefined)
  // A crop draws the whole picture under a clip, so a band as wide as the
  // page (stations' strip) paints an image larger than the canvas, which the
  // depth split takes for a backdrop and lifts out of the composition. The
  // photograph is the page's content: it stays in the body layer.
  return (
    <g key={opts.key} data-portrait-photo={assetId} data-depth="fg">
      <CroppedImage src={asset.src} box={box} crop={crop} alt={asset.alt} assetKey={assetId} round={opts.round} />
    </g>
  )
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintPortraitIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-portrait-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} strokeWidth={opts.stroke} />
    </g>
  )
}

// ── The frame a composition places ──────────────────────────────────────

/** Where a composition places the page's section line: `x` and `top` on the page, `w` the room it has. */
export interface PortraitKickerColumn {
  x: number
  top: number
  w: number
}

/** Where a composition places the page's claim: its measure, the top of its first line, and the most lines it may take. */
export interface PortraitClaimColumn {
  x: number
  w: number
  top?: number
  maxLines?: number
}

/** Where a composition places the page's source: on its own line from `top`, or in the footer row after the deck's label, `x` to `x + w` the row's measure. */
export interface PortraitSourceColumn {
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

export const placePortraitKicker = place<PortraitKickerColumn>
export const placePortraitClaim = place<PortraitClaimColumn>
export const placePortraitSource = place<PortraitSourceColumn>

/** Whether `rect` is the whole page: the compositions that set a page by its board's coordinates take nothing smaller. */
export function wholePage(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.w >= 1280 && rect.h >= 720
}

/** The board's measure: x80 to x1200. */
export const PORTRAIT_LEFT = 80
export const PORTRAIT_RIGHT = 1200
export const PORTRAIT_W = PORTRAIT_RIGHT - PORTRAIT_LEFT

/** The section line's top and the gap under it to the claim's first line, on a page whose body starts under the claim. */
export const HEAD = { top: 64, gap: 14 } as const

/** The source on a line of its own, 13/20 in the grey from y640. */
export const SOURCE_LINE = { top: 640, size: 13, lineHeight: 20 } as const

/**
 * The lowest a body may reach beside the source `credit` a composition
 * placed with `footer: true`: `bottom` when the credit joined the footer row
 * or the page has none, else clear of the source's own line.
 */
export function portraitBodyBottom(credit: React.ReactElement | null, bottom: number): number {
  const ownLine = credit !== null && (credit.props as Record<string, unknown>)["data-portrait-credit"] === undefined
  return ownLine ? Math.min(bottom, SOURCE_LINE.top - 16) : bottom
}

/** The claim's line box: 34/48 bold in the heading serif. */
export const CLAIM_LINE = 48

/**
 * The section line and the claim under it from `top` in a column at `x` of
 * `w`: the claim on one line when it fits, on two otherwise, `gap` between
 * them (14px, 18px beside a photograph). `bottom` is where the claim's last
 * line box ends. `null` when the claim does not fit the column on two lines
 * or the section line does not fit it on one.
 */
export function placePortraitHead(
  kicker: ((column: PortraitKickerColumn) => React.ReactElement | null) | undefined,
  claim: ((column: PortraitClaimColumn) => React.ReactElement | null) | undefined,
  at: { x: number; top: number; w: number; gap?: number; maxLines?: number },
): { node: React.ReactElement; bottom: number; lines: number } | null {
  const section = placePortraitKicker(kicker, { x: at.x, top: at.top, w: at.w })
  if (section === false) return null
  const claimTop = at.top + SECTION.lineHeight + (at.gap ?? HEAD.gap)
  let lines = 1
  let head = placePortraitClaim(claim, { x: at.x, w: at.w, top: claimTop, maxLines: 1 })
  for (let n = 2; head === false && n <= (at.maxLines ?? 2); n++) {
    lines = n
    head = placePortraitClaim(claim, { x: at.x, w: at.w, top: claimTop, maxLines: n })
  }
  if (head === false || head === null) return null
  return {
    node: (
      <>
        {section}
        {head}
      </>
    ),
    bottom: claimTop + lines * CLAIM_LINE,
    lines,
  }
}
