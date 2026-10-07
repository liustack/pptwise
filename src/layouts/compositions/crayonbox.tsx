import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { parseEmphasis, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, contrastRatio, liftedInk, metaInk, readableOn, accessibleInk } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { fitFixed } from "./type"

/*
 * The crayonbox setting: a box of crayons on drawing paper, crayon's 2026-10
 * board (`design/rounds/2026-10-08-crayon/`).
 *
 * Warm drawing paper, words in a deep navy ink, and five crayons that colour
 * the deck's sections in order (sky, grass green, tangerine, red and purple),
 * with sunny yellow beside them for what is only drawn and never carries a
 * word. Cards are rounded and outlined twice, the second pass a little off
 * and half seen, as if traced by hand; a page's title is underlined with one
 * stroke of crayon in three passes; a filled crayon carries the navy ink, or
 * white where the navy will not read (the purple). Where a colour has to
 * carry words on the paper it is lifted toward the ink until it reads: the
 * tangerine's words are a burnt orange, the green's a deep leaf green.
 *
 * Everything is set in one rounded, heavy sans (the board's Yuanti, falling
 * back to PingFang bold in the preview and Microsoft YaHei bold in
 * PowerPoint) at the weights the board names. The board's small type (11 to
 * 15px notes, labels, sources and the folio) is under the 16px floor and
 * carries the `crayonbox-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens: the five crayons are the theme's
 * `accentPool` in section order, sunny yellow its chart palette's fourth, the
 * leaf green its `success`, the burnt orange its `emphasisInk`, so a fork recolours the box and any theme can set
 * its pages this way (a theme with no pool of five takes its chart palette,
 * its accent, its danger ink and its primary).
 */

/** The exemption the L1 audit knows the board's small type by. */
export const CRAYON_SPEC = { "data-font-floor-exempt": "crayonbox-spec" } as const

/** Meta-information set quiet on purpose (the folio's line, a photograph's note): held to 3:1, not 4.5:1. */
export const CRAYON_META = { "data-contrast-tier": "meta" } as const

/** `CRAYON_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function crayonSmall(size: number): Record<string, string> {
  return size < 16 ? { ...CRAYON_SPEC } : {}
}

export interface CrayonInks {
  /** The drawing paper. */
  ground: string
  /** A card's white. */
  card: string
  /** Words. */
  ink: string
  /** Notes, labels, sources. */
  muted: string
  /** A fold in the card: dotted rules, a chart's base line. Never words. */
  line: string
  sky: string
  green: string
  orange: string
  red: string
  purple: string
  /** Sunny yellow: drawn, never carries a word. */
  yellow: string
  /** The five crayons in section order. */
  box: readonly string[]
  /** The green deepened until it carries words: what is free, what is a rule, a tick. */
  leaf: string
  /** The tangerine lifted until it carries words on the paper. */
  rust: string
  /** The theme's own blue: a date set large. */
  blue: string
}

export function crayonInks(ctx: ComponentCtx): CrayonInks {
  const { colors } = ctx
  const palette = colors.chartPalette
  const ground = colors.bg
  const pool = colors.accentPool && colors.accentPool.length >= 5 ? colors.accentPool : null
  const sky = pool?.[0] ?? palette[0] ?? colors.primary
  const green = pool?.[1] ?? palette[2] ?? palette[1] ?? colors.primary
  const orange = pool?.[2] ?? colors.accent
  const red = pool?.[3] ?? colors.danger ?? palette[1] ?? colors.accent
  const purple = pool?.[4] ?? colors.primary
  const yellow = palette[3] ?? palette[1] ?? colors.accent
  return {
    ground,
    card: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    line: colors.border ?? blendOver(colors.muted, ground, 0.25),
    sky,
    green,
    orange,
    red,
    purple,
    yellow,
    box: [sky, green, orange, red, purple],
    leaf: liftedInk(colors.success ?? green, ground, 16),
    rust: colors.emphasisInk ?? liftedInk(orange, ground, 16),
    blue: colors.primary,
  }
}

/** How much of a crayon tints a card: the board's pale sticky notes and card grounds. */
const TINT_SHARE = 0.16

/** A crayon laid pale over the card's white. */
export function crayonTint(color: string, inks: CrayonInks): string {
  return blendOver(color, inks.card, TINT_SHARE)
}

/** The words a crayon fill carries: the navy ink, or white where it will not read. */
export function inkOn(fill: string, inks: CrayonInks, size: number): string {
  return accessibleInk(inks.ink, fill, size)
}

/** `ink` held to the contrast `size` needs on `ground`, lifted toward the readable ink when it falls short. */
export function crayonText(ink: string, ground: string, size: number): string {
  return liftedInk(ink, ground, size)
}

/** Quiet text held to the 3:1 a meta line needs. */
export function crayonMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A mark that carries meaning (an icon, a tick) held to 3:1 on `ground`, lifted toward the readable ink in its own hue. */
export function crayonMark(color: string, ground: string): string {
  if (contrastRatio(color, ground) >= 3) return color
  const toward = readableOn(ground)
  for (let step = 1; step < 20; step++) {
    const ink = blendOver(toward, color, step / 20)
    if (contrastRatio(ink, ground) >= 3) return ink
  }
  return toward
}

// ── Sections ────────────────────────────────────────────────────────────

/**
 * The section a page sits in and the crayon it wears. A section is named by
 * a content page's `kicker` or by a chapter's heading, and the deck's sections take the crayons in the order
 * they first appear. A page with no name of its own sits in the last section
 * named before it; a page before any section takes the first crayon. The
 * close wears the last section's crayon.
 */
export function crayonSectionIndex(slides: readonly Slide[], index: number): number {
  const names: string[] = []
  let current = -1
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!
    if (slide.type === "ending" && i === index) return Math.max(0, names.length - 1)
    const raw = slide.type === "chapter" ? slide.heading : slide.type === "content" ? slide.kicker : undefined
    const name = raw ? stripEmphasis(raw).trim() : ""
    if (name) {
      let at = names.indexOf(name)
      if (at < 0) {
        names.push(name)
        at = names.length - 1
      }
      current = at
    }
    if (i === index) return Math.max(0, current)
  }
  return Math.max(0, current)
}

/** The crayon of the section page `index` sits in. */
export function crayonSectionColor(slides: readonly Slide[], index: number, inks: CrayonInks): string {
  return inks.box[crayonSectionIndex(slides, index) % inks.box.length]!
}

// ── Text ────────────────────────────────────────────────────────────────

export type CrayonWeight = 400 | 500 | 600 | 700 | 800 | 900

export interface CrayonTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  weight?: CrayonWeight
  /** The heading face, for titles and figures. The body face otherwise. */
  heading?: boolean
}

function family(ctx: ComponentCtx, heading: boolean | undefined): string {
  return heading ? ctx.fonts.heading : ctx.fonts.body
}

/** Whether a weight is drawn bold, as the export reads it. */
export function heavy(weight: CrayonWeight | undefined): boolean {
  return (weight ?? 400) >= 600
}

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. A break the author wrote is kept. */
export function fitCrayon(text: string | undefined, spec: CrayonTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(text, { width: spec.width, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines, fontFamily: family(ctx, spec.heading), bold: heavy(spec.weight) })
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function crayonWidth(text: string, size: number, ctx: ComponentCtx, opts: { weight?: CrayonWeight; heading?: boolean } = {}): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: family(ctx, opts.heading), bold: heavy(opts.weight) }) * size
}

/** Where a sans's baseline sits below the middle of its line box, as a fraction of its size: PingFang as the board's browser set it. */
const BASELINE_RATIO = 0.35

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function crayonBaseline(top: number, lineHeight: number, size: number): number {
  return Math.round(top + lineHeight / 2 + size * BASELINE_RATIO)
}

export interface CrayonPaint {
  ctx: ComponentCtx
  x: number
  /** The top of the first line's box, or the first baseline. */
  top?: number
  baseline?: number
  fill: string
  weight?: CrayonWeight
  heading?: boolean
  anchor?: "start" | "middle" | "end"
  /** What the text sits on, for a marked run's ink. The paper when omitted. */
  ground?: string
  attrs?: Record<string, string>
  /** Attributes the last line's `<text>` carries as well, such as `data-truncated`. */
  lastAttrs?: Record<string, string>
}

function runs(text: string, lit: string, weight: CrayonWeight | undefined): React.ReactNode {
  const segments = parseEmphasis(text)
  if (segments.every((s) => !s.emphasized)) return segments.map((s) => s.text).join("")
  return segments.map((s, i) =>
    s.emphasized ? (
      <tspan key={i} fill={lit} fontWeight={String(Math.max(700, weight ?? 400))} data-crayon-lit="">
        {s.text}
      </tspan>
    ) : (
      s.text
    ),
  )
}

/** The ink a marked run takes: the burnt orange, held to the size's contrast on `ground`. */
function litInk(ctx: ComponentCtx, ground: string, size: number): string {
  return crayonText(crayonInks(ctx).rust, ground, size)
}

/** Paints a fitted block, one `<text>` a line, its `**…**` runs in the burnt orange. */
export function paintCrayon(layout: EmphasisHeadingLayout, opts: CrayonPaint): React.ReactNode {
  const ground = opts.ground ?? crayonInks(opts.ctx).ground
  const first = opts.baseline ?? crayonBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize)
  const lit = litInk(opts.ctx, ground, layout.fontSize)
  return layout.lines.map((line, i) => (
    <text
      key={i}
      {...crayonSmall(layout.fontSize)}
      {...opts.attrs}
      {...(i === layout.lines.length - 1 ? opts.lastAttrs : undefined)}
      x={opts.x}
      y={first + i * layout.lineHeight}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={family(opts.ctx, opts.heading)}
      fontSize={layout.fontSize}
      fontWeight={opts.weight && opts.weight !== 400 ? String(opts.weight) : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
    >
      {runs(layout.segments[i] ? layout.segments[i]!.map((s) => (s.emphasized ? `**${s.text}**` : s.text)).join("") : line, lit, opts.weight)}
    </text>
  ))
}

/** One line known to fit, in a `lineHeight` box whose top is `top`, or on `baseline`. */
export function paintCrayonLine(text: string, opts: CrayonPaint & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  const ground = opts.ground ?? crayonInks(opts.ctx).ground
  const y = opts.baseline ?? crayonBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...crayonSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={family(opts.ctx, opts.heading)}
      fontSize={opts.size}
      fontWeight={opts.weight && opts.weight !== 400 ? String(opts.weight) : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
    >
      {runs(text, litInk(opts.ctx, ground, opts.size), opts.weight)}
    </text>
  )
}

/**
 * A figure set large with its unit small after it on one baseline (「1400 万名」,
 * 「350～500 克」): the unit's size and the gap before it as the board sets
 * them, both in `fill`.
 */
export function paintCrayonFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; size: number; unitSize: number; fill: string; weight?: CrayonWeight; anchor?: "start" | "middle" | "end" }): React.ReactElement {
  const unit = opts.unit?.trim()
  const weight = String(opts.weight ?? 900)
  return (
    <text
      x={opts.x}
      y={opts.baseline}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={opts.size}
      fontWeight={weight}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace="preserve"
    >
      {stripEmphasis(opts.value).trim()}
      {unit ? (
        <tspan fontSize={opts.unitSize} {...crayonSmall(opts.unitSize)}>
          {` ${unit}`}
        </tspan>
      ) : null}
    </text>
  )
}

/** The width a figure and its unit take, as `paintCrayonFigure` sets them. */
export function crayonFigureWidth(value: string, unit: string | undefined, size: number, unitSize: number, ctx: ComponentCtx): number {
  const u = unit?.trim()
  return crayonWidth(value, size, ctx, { weight: 900, heading: true }) + (u ? crayonWidth(` ${u}`, unitSize, ctx, { weight: 900, heading: true }) : 0)
}

// ── Drawing ─────────────────────────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** An icon of `size` at `x`, `y` in `color`, lifted to read at 3:1 on `ground`, at the board's heavier stroke. */
export function paintCrayonIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-crayon-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={crayonMark(color, ground)} strokeWidth={opts.stroke ?? 2.2} />
    </g>
  )
}

/** The three passes of a crayon stroke: their offset across, how opaque, and how wide against the stroke. */
const CRAYON_PASSES = [
  { dy: 0, opacity: 0.95, w: 1 },
  { dy: -2, opacity: 0.45, w: 0.6 },
  { dy: 2, opacity: 0.35, w: 0.5 },
] as const

/**
 * A stroke of crayon from `x1` to `x2` along `y`: three passes a little apart
 * and less opaque each time, bowed up 3px in the middle, the way wax catches
 * paper.
 */
export function CrayonLine({ x1, x2, y, color, width = 8 }: { x1: number; x2: number; y: number; color: string; width?: number }): React.ReactElement {
  return (
    <g data-crayon-line="">
      {CRAYON_PASSES.map((pass, i) => (
        <path
          key={i}
          d={`M ${x1} ${y + pass.dy} Q ${(x1 + x2) / 2} ${y + pass.dy - 3} ${x2} ${y + pass.dy + 1}`}
          fill="none"
          stroke={color}
          strokeWidth={Math.round(width * pass.w * 10) / 10}
          strokeLinecap="round"
          opacity={pass.opacity}
        />
      ))}
    </g>
  )
}

/** A card outlined twice: once at full strength, then again a little off and half seen, as if traced by hand. */
export function DrawnBox({ box, color, fill, r = 22, stroke = 2.6, attrs }: { box: Box; color: string; fill: string; r?: number; stroke?: number; attrs?: Record<string, string> }): React.ReactElement {
  return (
    <g data-crayon-card="" {...attrs}>
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={r} fill={fill} stroke={color} strokeWidth={stroke} />
      <rect x={box.x + 2} y={box.y + 1.5} width={box.w - 3} height={box.h - 2} rx={r + 2} fill="none" stroke={color} strokeWidth={Math.round(stroke * 0.7 * 10) / 10} opacity={0.35} />
    </g>
  )
}

/** A sun drawn in crayon: a ring and eight short rays. */
export function Sun({ cx, cy, r, color, stroke = 4 }: { cx: number; cy: number; r: number; color: string; stroke?: number }): React.ReactElement {
  const rays = Array.from({ length: 8 }, (_, k) => {
    const a = (k * Math.PI) / 4
    const c = Math.cos(a)
    const s = Math.sin(a)
    const round = (v: number) => Math.round(v * 10) / 10
    return { x1: round(cx + c * (r + 8)), y1: round(cy + s * (r + 8)), x2: round(cx + c * (r + 18)), y2: round(cy + s * (r + 18)) }
  })
  return (
    <g data-crayon-sun="">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke} />
      {rays.map((ray, i) => (
        <line key={i} {...ray} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      ))}
    </g>
  )
}

/** A five-pointed star sticker. */
export function Star({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }): React.ReactElement {
  const points = Array.from({ length: 10 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 5
    const rr = k % 2 === 0 ? r : r * 0.45
    return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`
  }).join(" ")
  return <polygon data-crayon-star="" points={points} fill={color} />
}

/**
 * A photograph filling `box`, cropped to it, its corners rounded `r` by four
 * small pieces of `ground` laid over them (PowerPoint keeps a picture
 * square), and, with a `frame`, a 5px crayon frame drawn round it. The card's
 * white stands in where the deck has no such asset.
 */
export function CrayonPhoto({ assetId, box, ctx, r = 22, frame, ground, frameWidth = 5 }: { assetId: string; box: Box; ctx: ComponentCtx; r?: number; frame?: string; ground?: string; frameWidth?: number }): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const inks = crayonInks(ctx)
  const paper = ground ?? inks.ground
  const { x, y, w, h } = box
  const corners = [
    `M ${x} ${y} L ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} Z`,
    `M ${x + w} ${y} L ${x + w} ${y + r} A ${r} ${r} 0 0 0 ${x + w - r} ${y} Z`,
    `M ${x + w} ${y + h} L ${x + w - r} ${y + h} A ${r} ${r} 0 0 0 ${x + w} ${y + h - r} Z`,
    `M ${x} ${y + h} L ${x} ${y + h - r} A ${r} ${r} 0 0 0 ${x + r} ${y + h} Z`,
  ]
  const half = frameWidth / 2
  return (
    <g data-crayon-photo={assetId}>
      {asset?.src ? (
        <>
          <image href={asset.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
          {r > 0 ? corners.map((d, i) => <path key={i} data-photo-corner="" d={d} fill={paper} />) : null}
        </>
      ) : (
        <rect x={x} y={y} width={w} height={h} rx={r} fill={inks.card} />
      )}
      {frame ? <rect data-crayon-frame="" x={x - half} y={y - half} width={w + frameWidth} height={h + frameWidth} rx={r + half} fill="none" stroke={frame} strokeWidth={frameWidth} /> : null}
    </g>
  )
}

/** A photograph's note under it: 11/18 in the grey, one line. */
export const PHOTO_NOTE = { gap: 10, size: 11, lineHeight: 18 } as const

/** A photograph's note fitted to `width`, `undefined` when there is none, `null` when it does not fit one line. */
export function fitPhotoNote(caption: string | undefined, width: number, ctx: ComponentCtx): EmphasisHeadingLayout | null | undefined {
  if (!caption?.trim()) return undefined
  return fitCrayon(caption, { width, size: PHOTO_NOTE.size, lineHeight: PHOTO_NOTE.lineHeight, maxLines: 1, weight: 600 }, ctx)
}

export function PhotoNote({ layout, x, top, ctx }: { layout: EmphasisHeadingLayout; x: number; top: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = crayonInks(ctx)
  return <g data-crayon-photo-note="">{paintCrayon(layout, { ctx, x, top, fill: crayonText(inks.muted, inks.ground, PHOTO_NOTE.size), weight: 600, attrs: { ...CRAYON_META } })}</g>
}

// ── The claim and the source a composition places ──────────────────────

/** Where a composition places the page's claim: its column, and the size, line box and foot a larger claim takes. */
export interface ClaimColumn {
  x: number
  w: number
  size?: number
  foot?: number
  lineHeight?: number
  /** The most lines the claim may take there; it declines past them. */
  maxLines?: number
  /** The stroke of crayon under it: its length, its gap under the foot and its width. */
  underline?: { w: number; gap: number; stroke: number }
}

/**
 * The page's claim in `column`, as the face hands it down (`claim`): the
 * drawing, `null` when the face handed none, or `false` when it does not fit
 * the column whole, in which case the composition declines.
 */
export function placeCrayonClaim(claim: ((column: ClaimColumn) => React.ReactElement | null) | undefined, column: ClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/** The page's source in `column` (`source`): the drawing, `null` when the page has none, `false` when it does not fit. */
export function placeCrayonSource(source: ((column: { x: number; w: number; top?: number }) => React.ReactElement | null) | undefined, column: { x: number; w: number; top?: number }): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}

/** The crayon a composition takes for its `i`th piece from `order`, read as indexes into the box with yellow at 5. */
export function crayonAt(inks: CrayonInks, order: readonly number[], i: number): string {
  const k = order[i % order.length]!
  return k === 5 ? inks.yellow : inks.box[k % inks.box.length]!
}

/** A board coordinate `v` (the board's body starts at y186) in the band a face hands a composition. */
export function boardY(rect: { y: number }, v: number): number {
  return rect.y + v - 186
}

/** The board's crayon indexes: sky 0, green 1, orange 2, red 3, purple 4, yellow 5. */
export const CRAYON = { sky: 0, green: 1, orange: 2, red: 3, purple: 4, yellow: 5 } as const
