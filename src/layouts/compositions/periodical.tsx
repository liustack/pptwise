import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, graphicInk, metaInk, readableOn } from "../../render/ink"
import { isCjkSafeFace } from "../../render/fonts"
import {
  fitManuscript,
  manuscriptBaseline,
  manuscriptTrackedWidth,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptLine,
  paintManuscriptTracked,
  type ManuscriptPaint,
  type ManuscriptTextSpec,
} from "./manuscript"

/*
 * The periodical setting: a small magazine's own pages, journal's 2026-10
 * board (`design/rounds/2026-10-07-journal/`).
 *
 * Warm paper, the ink of the type for every bar and line the page does not
 * lead with, the theme's accent (journal's ochre red) for the one thing a
 * page is about, and two quiet inks after it: the chart palette's moss and
 * its linen grey, with a paler grey of the linen for outlines and the
 * smallest share. Figures are numbered across the deck (「图 3」) in the
 * accent before their titles, and an editor's comment follows each caption
 * in an italic serif. Photographs carry a plain italic caption under them.
 * Titles, figures, names and comments are set in the heading serif, labels
 * and sentences in the body sans.
 *
 * The text helpers are the manuscript setting's (`./manuscript.tsx`): text at
 * its exact size or none, tracking written as character spacing, a marked
 * run lit, here in the accent. The board's small type (11 to 15px labels,
 * captions, axis names, the source and the folio) is under the 16px floor
 * and carries the `periodical-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const PERIODICAL_SPEC = { "data-font-floor-exempt": "periodical-spec" } as const

/** `PERIODICAL_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function periodicalSmall(size: number): Record<string, string> {
  return size < 16 ? { ...PERIODICAL_SPEC } : {}
}

export interface PeriodicalInks {
  /** The paper. */
  ground: string
  /** A card: the inner page's white. */
  card: string
  /** Words. */
  ink: string
  /** Labels, notes, the source, comments. */
  muted: string
  /** Hairlines. Never words. */
  line: string
  /** The type's own ink: the rules, every bar and line the page does not lead with. */
  lead: string
  /** The accent: the one thing a page is about, a figure's number, the drop cap. */
  brick: string
  /** The chart palette's third ink, a quiet series. */
  moss: string
  /** The chart palette's fourth ink, the second line and the quiet bars. */
  taupe: string
  /** The linen grey lifted toward the hairline: an outline for what was not published, the smallest share. */
  ghost: string
}

/** #C9C2B1 on the board: the linen grey at 19% over the hairline. */
const GHOST_MIX = 0.19

export function periodicalInks(ctx: ComponentCtx): PeriodicalInks {
  const { colors } = ctx
  const ground = colors.bg
  const line = colors.border ?? blendOver(colors.muted, ground, 0.25)
  const palette = colors.chartPalette
  const taupe = palette[3] ?? colors.muted
  return {
    ground,
    card: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    line,
    lead: colors.primary,
    brick: colors.accent,
    moss: palette[2] ?? colors.primary,
    taupe,
    ghost: blendOver(taupe, line, GHOST_MIX),
  }
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the text ink when it falls short. */
export function periodicalText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (the source, the folio) held to the 3:1 a meta line needs. */
export function periodicalMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** Words set on a filled mark (a bar's segment): white or near black, whichever reads. */
export function periodicalOn(fill: string): string {
  return readableOn(fill)
}

/** A graphic (a bar, an icon, a dot) held to the 3:1 a mark needs on `ground`. */
export function periodicalMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text at its exact size ─────────────────────────────────────────────

export type PeriodicalTextSpec = ManuscriptTextSpec

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitPeriodical(text: string | undefined, spec: PeriodicalTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitManuscript(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function periodicalWidth(text: string, size: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptWidth(text, size, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function periodicalBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return manuscriptBaseline(top, lineHeight, size, serif)
}

export type PeriodicalPaint = Omit<ManuscriptPaint, "lit">

/** Paints a fitted block, one `<text>` a line, its `**…**` runs lit in the accent. */
export function paintPeriodical(layout: EmphasisHeadingLayout, opts: PeriodicalPaint): React.ReactNode {
  const inks = periodicalInks(opts.ctx)
  return paintManuscript(layout, { ...opts, lit: inks.brick, attrs: { ...periodicalSmall(layout.fontSize), ...opts.attrs } })
}

/** One line known to fit, its marks lit in the accent. */
export function paintPeriodicalLine(
  text: string,
  opts: Omit<PeriodicalPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number },
): React.ReactElement {
  const inks = periodicalInks(opts.ctx)
  return paintManuscriptLine(text, { ...opts, lit: inks.brick, attrs: { ...periodicalSmall(opts.size), ...opts.attrs } })
}

/** `text` with `tracking` px between its characters, written as character spacing. */
export function paintPeriodicalTracked(opts: Parameters<typeof paintManuscriptTracked>[0]): React.ReactElement {
  return paintManuscriptTracked({ ...opts, attrs: { ...periodicalSmall(opts.size), ...opts.attrs } })
}

/** The tracked width of `text`, as `paintPeriodicalTracked` sets it. */
export function periodicalTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptTrackedWidth(text, size, tracking, ctx, opts)
}

/** Whether `text` is set in Chinese characters only, its spaces aside: tracked wide, as the board sets 「十 年」. */
export function cjkOnly(text: string): boolean {
  return /^[\s\u3000-\u303F\u3400-\u9FFF\uF900-\uFAFF\uFF00-\uFFEF\u00B7]+$/u.test(text.trim())
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintPeriodicalIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-periodical-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Photographs and their captions ─────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A photograph's plain caption: 11/18 in the italic serif, in the grey. */
export const PHOTO_CAPTION = { size: 11, lineHeight: 18, gap: 4 } as const

/** A photograph filling `box`, cropped to it. The card's white stands in where the deck has no such asset. */
export function paintPeriodicalPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const inks = periodicalInks(ctx)
  if (!asset?.src) return <rect key={opts.key} data-periodical-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.card} stroke={inks.line} />
  return (
    <g key={opts.key} data-periodical-photo={assetId}>
      <image href={asset.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
    </g>
  )
}

/** A photograph's caption fitted to one line of `w`, or `null`. An empty caption fits as nothing. */
export function fitPhotoCaption(caption: string | undefined, w: number, ctx: ComponentCtx): EmphasisHeadingLayout | null | undefined {
  if (!caption?.trim()) return undefined
  return fitPeriodical(caption, { width: w, size: PHOTO_CAPTION.size, lineHeight: PHOTO_CAPTION.lineHeight, maxLines: 1, serif: true }, ctx)
}

/** The photograph and its italic caption under it. */
export function PeriodicalPhoto({ assetId, box, caption, ctx }: { assetId: string; box: Box; caption: EmphasisHeadingLayout | null | undefined; ctx: ComponentCtx }): React.ReactElement {
  const inks = periodicalInks(ctx)
  return (
    <g>
      {paintPeriodicalPhoto(assetId, box, ctx)}
      {caption ? (
        <g data-periodical-photo-caption="">{paintPeriodical(caption, { ctx, x: box.x, top: box.y + box.h + PHOTO_CAPTION.gap, serif: true, italic: true, fill: periodicalMeta(inks.muted, inks.ground) })}</g>
      ) : null}
    </g>
  )
}

// ── A figure's caption and the editor's comment ────────────────────────

/**
 * A figure's caption: its number in the accent bold, 1px apart, a full-width
 * space and its title at 12/20 in the ink; under it the editor's comment, one
 * line at 13/22 in the italic serif in the grey.
 */
export const FIG_CAPTION = { size: 12, lineHeight: 20, tracking: 1, gap: "　", comment: { dy: 22, size: 13, lineHeight: 22 } } as const

export interface FittedCaption {
  label: string
  title: string
  comment: EmphasisHeadingLayout | null
  /** How far the caption runs down from its top, comment included. */
  h: number
}

/** The callout a composition reads as the editor's comment on a figure: its words alone, or `null`. */
export function commentOf(component: Component | undefined): string | null {
  if (component?.type !== "callout" || component.title || component.icon || component.tag) return null
  return component.text.trim() || null
}

/**
 * A caption for `label` and `title` on one line of `w`, and `comment` on one
 * line under it, or `null` when either does not fit.
 */
export function fitFigCaption(label: string, title: string, comment: string | null, w: number, ctx: ComponentCtx): FittedCaption | null {
  const labelW = periodicalTrackedWidth(label, FIG_CAPTION.size, FIG_CAPTION.tracking, ctx, { bold: true })
  const gapW = periodicalWidth(FIG_CAPTION.gap, FIG_CAPTION.size, ctx)
  if (labelW + gapW + periodicalWidth(title.trim(), FIG_CAPTION.size, ctx) > w) return null
  const fitted = comment ? fitPeriodical(comment, { width: w, size: FIG_CAPTION.comment.size, lineHeight: FIG_CAPTION.comment.lineHeight, maxLines: 1, serif: true }, ctx) : null
  if (comment && !fitted) return null
  return { label, title: title.trim(), comment: fitted, h: fitted ? FIG_CAPTION.comment.dy + FIG_CAPTION.comment.lineHeight : FIG_CAPTION.lineHeight }
}

export function FigCaption({ caption, x, top, ctx }: { caption: FittedCaption; x: number; top: number; ctx: ComponentCtx }): React.ReactElement {
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const y = periodicalBaseline(top, FIG_CAPTION.lineHeight, FIG_CAPTION.size)
  const labelW = periodicalTrackedWidth(caption.label, FIG_CAPTION.size, FIG_CAPTION.tracking, ctx, { bold: true })
  const gapW = periodicalWidth(FIG_CAPTION.gap, FIG_CAPTION.size, ctx)
  return (
    <g data-periodical-caption={caption.label}>
      {paintPeriodicalTracked({ ctx, text: caption.label, x, y, size: FIG_CAPTION.size, tracking: FIG_CAPTION.tracking, bold: true, fill: periodicalText(inks.brick, ground, FIG_CAPTION.size) })}
      {paintPeriodicalLine(caption.title, { ctx, x: x + labelW + gapW, baseline: y, size: FIG_CAPTION.size, fill: periodicalText(inks.ink, ground, FIG_CAPTION.size) })}
      {caption.comment ? (
        <g data-periodical-comment="">
          {paintPeriodical(caption.comment, { ctx, x, top: top + FIG_CAPTION.comment.dy, serif: true, italic: true, fill: periodicalText(inks.muted, ground, FIG_CAPTION.comment.size) })}
        </g>
      ) : null}
    </g>
  )
}

/** The labels of several figures sharing one caption, in the deck's language: 「图 8、图 9」 or "Figures 8 and 9". */
export function jointLabel(labels: readonly string[], chinese: boolean): string {
  if (labels.length <= 1) return labels[0] ?? ""
  if (chinese) return labels.join("、")
  const numbers = labels.map((l) => l.replace(/^\D+/u, ""))
  const word = labels[0]!.replace(/\s*\d+$/u, "")
  return `${word}s ${numbers.slice(0, -1).join(", ")} and ${numbers[numbers.length - 1]}`
}

// ── Figures ─────────────────────────────────────────────────────────────

/**
 * A figure and its unit as the board sets them: the figure large in the
 * heading serif and the unit after it, small, as `unitStyle` says.
 */
export interface FigureSpec {
  size: number
  unit: number
  bold?: boolean
  /**
   * How the unit stands: `quiet` (the default) small after a space in the
   * grey, a percent sign included; `attached` in the figure's own ink, a
   * percent sign straight after the figure, as one figure set huge is.
   */
  unitStyle?: "quiet" | "attached"
}

/** The width a figure and its unit take, as `paintFigure` sets them. */
export function figureWidth(value: string, unit: string | undefined, spec: FigureSpec, ctx: ComponentCtx): number {
  const v = periodicalWidth(stripEmphasis(value).trim(), spec.size, ctx, { serif: true, bold: spec.bold !== false })
  const u = unit?.trim()
  if (!u) return v
  const attached = spec.unitStyle === "attached"
  const percent = attached && (u === "%" || u === "％")
  return v + periodicalWidth(percent ? u : ` ${u}`, spec.unit, ctx, { serif: attached, bold: attached && spec.bold !== false })
}

/** A figure on `baseline` from `x`, its unit after it, the figure in `fill`, a plain unit in the grey. */
export function paintFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; spec: FigureSpec; fill: string; ground: string; anchor?: "start" | "end"; tracking?: number; attrs?: Record<string, string> }): React.ReactElement {
  const inks = periodicalInks(opts.ctx)
  const value = stripEmphasis(opts.value).trim()
  const u = opts.unit?.trim()
  const attached = opts.spec.unitStyle === "attached"
  const percent = attached && (u === "%" || u === "％")
  const bold = opts.spec.bold !== false
  const width = figureWidth(opts.value, opts.unit, opts.spec, opts.ctx) + Math.max(0, Array.from(value).length - 1) * (opts.tracking ?? 0)
  const x = opts.anchor === "end" ? opts.x - width : opts.x
  return (
    <text
      {...periodicalSmall(Math.min(opts.spec.size, u ? opts.spec.unit : opts.spec.size))}
      {...opts.attrs}
      x={x}
      y={opts.baseline}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={opts.spec.size}
      fontWeight={bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={u && !percent ? "preserve" : undefined}
      data-tracking={opts.tracking}
    >
      {opts.tracking ? (
        <>
          {Array.from(value)[0]}
          {Array.from(value)
            .slice(1)
            .map((ch, i) => (
              <tspan key={i} dx={opts.tracking}>
                {ch}
              </tspan>
            ))}
        </>
      ) : (
        value
      )}
      {u ? (
        <tspan fontSize={opts.spec.unit} fontWeight={attached && bold ? "700" : "400"} fontFamily={attached ? opts.ctx.fonts.heading : opts.ctx.fonts.body} fill={attached ? opts.fill : periodicalText(inks.muted, opts.ground, opts.spec.unit)}>
          {percent ? u : ` ${u}`}
        </tspan>
      ) : null}
    </text>
  )
}

/**
 * The top a value axis runs to when its board draws no ticks: the smallest
 * round number at least 8% over the largest value, so the tallest bar never
 * touches the top and the run keeps the board's proportions (16 over 13.5,
 * 80 over 68.6, 1,400 over 1,286).
 */
export function niceTop(max: number): number {
  const target = Math.max(max, 1e-9) * 1.08
  const power = 10 ** Math.floor(Math.log10(target))
  for (const step of [1, 1.2, 1.4, 1.6, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    const top = Number((step * power).toPrecision(6))
    if (top >= target) return top
  }
  return 10 * power
}

/** A value as the author wrote it: the decimals its own figure carries, a true minus sign. */
export function writtenValue(value: number): string {
  const s = String(value)
  return value < 0 ? `−${s.slice(1)}` : s
}

/** How many decimals a run of values is written to: the most any of them carries. */
export function decimalsIn(values: readonly number[]): number {
  return Math.max(0, ...values.map((v) => (String(v).split(".")[1] ?? "").length))
}

/** A value to `decimals` places, a true minus sign, a plus when asked. */
export function fixedValue(value: number, decimals: number, opts: { plus?: boolean } = {}): string {
  const body = Math.abs(value).toFixed(decimals)
  if (value < 0 && Number(body) !== 0) return `−${body}`
  return `${opts.plus && value > 0 ? "+" : ""}${body}`
}

/** A unit as it follows a figure in a run of words: straight after a percent sign, after a space otherwise. */
export function withUnitText(figure: string, unit: string | undefined): string {
  const u = unit?.trim()
  if (!u) return figure
  return u === "%" || u === "％" ? `${figure}${u}` : `${figure} ${u}`
}

// ── The claim a composition places ─────────────────────────────────────

/**
 * The page's claim in `column`, as the face hands it down (`claim`): the
 * drawing, `null` when the face handed none (the composition then draws its
 * body alone), or `false` when the claim does not fit the column whole, in
 * which case the composition declines.
 */
export function placeClaim(claim: ((column: { x: number; w: number }) => React.ReactElement | null) | undefined, column: { x: number; w: number }): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/**
 * The family a quotation mark is set in: in a Chinese deck the heading's
 * East Asian face, whose 「“」 is the teardrop the board drew, and in any
 * other the heading serif itself.
 */
export function quoteMarkFamily(ctx: ComponentCtx, chinese: boolean): string {
  if (!chinese) return ctx.fonts.heading
  const faces = ctx.fonts.heading.split(",").map((face) => face.trim())
  const at = faces.findIndex((face) => isCjkSafeFace(face))
  return at > 0 ? faces.slice(at).join(", ") : ctx.fonts.heading
}
