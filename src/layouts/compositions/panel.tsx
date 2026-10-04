import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiValueText } from "../../components/kpi"
import { measureTextUnits } from "../../lib/svg-text-layout"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { emphasisRunInk, parseEmphasis } from "../../render/emphasis"
import { accessibleInk, blendOver, contrastRatio, resolveSemanticColor } from "../../render/ink"
import { splitRow } from "./rows"
import { blockTag } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
export type KpiItem = KpiCards["items"][number]
type Callout = Extract<Component, { type: "callout" }>

/*
 * The panel setting: data set in dark panels, the way a market screen sets
 * its quotes. Settled on ledger's 2026-10 board
 * (`design/rounds/2026-10-04-ledger/`).
 *
 * A panel is a surface-coloured rectangle with a 1px edge in the border ink
 * and square corners. Its top 36px is a title bar: the panel's name on the
 * left and its unit on the right, both at 13px in the muted ink, over a 1px
 * divider. A panel the author marked takes the theme's emphasis ink (ledger's
 * amber) for its edge and its name. Below the bar the panel holds one thing:
 * a chart, a table, a timeline, a figure.
 *
 * Colours mean one thing each. The emphasis ink is spent once a page, on what
 * the author marked. The theme's success and danger inks (ledger's green and
 * red) say only which way a value moved, never whether that is good, and are
 * never a series colour. Unmarked series take the chart palette after its
 * lead, nearest the mark first, so a theme that lists receding tiers there
 * (ledger's three slate blues) steps them back in order.
 *
 * Everything here reads the theme's tokens only, so a fork recolours it. The
 * small type the board sets (labels at 14 and 15px, the title bar at 13px)
 * carries the `panel-spec` font-floor exemption the L1 audit knows, as
 * bulletin's and swiss's 14px source lines carry theirs.
 */

/** The title bar and the panel's inner margins, from the board. */
export const PANEL = {
  /** The title bar's height, its divider on the last pixel row. */
  barH: 36,
  /** Text stands this far in from the panel's left and right edges. */
  padX: 18,
  /** The title bar's 13px text in an 18px box from 9px down. */
  labelTop: 9,
  labelBox: 18,
  labelSize: 13,
  /** The divider's row. */
  dividerY: 35,
  /** Air between two panels side by side or one over another. */
  gap: 16,
} as const

/** The exemption the L1 audit knows the board's small panel type by. */
export const PANEL_SPEC = { "data-font-floor-exempt": "panel-spec" } as const

/** The inks a panel page paints with, every one from the theme's tokens. */
export interface PanelInks {
  /** A panel's fill. */
  surface: string
  /** A panel's edge, the title bar's divider, a table's rules. */
  edge: string
  /** The one thing the author marked: its edge, its name, its figure. */
  mark: string
  /** A value that went up, and one that went down. Only ever a direction. */
  up: string
  down: string
  /** The dark tint under a marked row or a recommended column. */
  tint: string
  /** Body text a step quieter than the headline ink, for sentences in a panel. */
  body: string
  /** Body text one more step back, for the options a table does not recommend. */
  quiet: string
}

export function panelInks(ctx: ComponentCtx): PanelInks {
  const { colors } = ctx
  const mark = emphasisRunInk(colors)
  return {
    surface: colors.surface,
    edge: colors.border ?? colors.muted,
    mark,
    up: resolveSemanticColor("success", colors),
    down: resolveSemanticColor("danger", colors),
    tint: blendOver(mark, colors.bg, 0.12),
    body: blendOver(colors.text, colors.muted, 0.7),
    quiet: blendOver(colors.text, colors.muted, 0.45),
  }
}

/**
 * The colour of the `k`-th series the author did not mark, counted from the
 * one nearest the mark: the chart palette after its lead, in order.
 */
export function panelSeriesInk(ctx: ComponentCtx, k: number): string {
  const palette = ctx.colors.chartPalette
  const rest = palette.length > 1 ? palette.slice(1) : palette
  return rest[k % rest.length]!
}

/**
 * The ring of a hollow marker and the stroke of an unmarked node: of the
 * palette colours after the lead, the one that stands out most from the
 * panel, so a ring reads on the surface without taking the mark's colour.
 */
export function panelOutlineInk(ctx: ComponentCtx): string {
  const palette = ctx.colors.chartPalette
  const rest = palette.length > 1 ? palette.slice(1) : palette
  return [...rest].sort((a, b) => contrastRatio(b, ctx.colors.surface) - contrastRatio(a, ctx.colors.surface))[0]!
}

/** Text of `size` on `ground` in `ink`, held to the contrast its size needs. */
export function panelText(ink: string, ground: string, size: number): string {
  return accessibleInk(ink, ground, size)
}

/** A rectangle on the page. */
export interface Place {
  x: number
  y: number
  w: number
  h: number
}

/** The title bar's two texts, fitted to one line each, or `null` when they do not fit side by side. */
export interface PanelBar {
  label: EmphasisHeadingLayout | null
  meta: EmphasisHeadingLayout | null
  /** The separator the author wrote after the label, when the bar took the label off a longer text. */
  glossBreak?: string
}

/**
 * Fits a title bar's name and unit into a panel `w` wide. Both stay on one
 * line, with at least 24px between them, or the panel declines.
 */
export function fitPanelBar(label: string | undefined, meta: string | undefined, w: number, ctx: ComponentCtx): PanelBar | null {
  const inner = w - PANEL.padX * 2
  const fit = (text: string | undefined, width: number) =>
    text?.trim()
      ? fitFixed(text, { width, size: PANEL.labelSize, lineHeight: PANEL.labelBox, maxLines: 1, fontFamily: ctx.fonts.body, bold: false })
      : null
  const metaFit = fit(meta, inner)
  if (meta?.trim() && !metaFit) return null
  const metaW = metaFit ? measureTextUnits(metaFit.lines[0] ?? "", { fontFamily: ctx.fonts.body }) * PANEL.labelSize : 0
  const labelFit = fit(label, inner - (metaW > 0 ? metaW + 24 : 0))
  if (label?.trim() && !labelFit) return null
  return { label: labelFit, meta: metaFit }
}

/**
 * Paints a panel: its fill and edge, and when `bar` is given, its title bar
 * and divider. A marked panel takes the mark for its edge and its name.
 */
export function paintPanel(
  place: Place,
  ctx: ComponentCtx,
  opts: { bar?: PanelBar | null; marked?: boolean; key?: string } = {},
): React.ReactElement {
  const inks = panelInks(ctx)
  const { x, y, w, h } = place
  const edge = opts.marked ? inks.mark : inks.edge
  const baseline = centredBaseline(y + PANEL.labelTop, PANEL.labelBox, PANEL.labelSize)
  const bar = opts.bar
  return (
    <g key={opts.key} data-panel={opts.marked ? "marked" : ""}>
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} fill={inks.surface} stroke={edge} strokeWidth={1} />
      {bar && (
        <>
          {bar.label && (
            <g {...PANEL_SPEC_GROUP}>
              {paintBarText(bar.label, {
                ctx,
                x: x + PANEL.padX,
                y: baseline,
                fill: panelText(opts.marked ? inks.mark : ctx.colors.muted, inks.surface, PANEL.labelSize),
                glossBreak: bar.glossBreak,
              })}
            </g>
          )}
          {bar.meta && (
            <g {...PANEL_SPEC_GROUP}>
              {paintBarText(bar.meta, {
                ctx,
                x: x + w - PANEL.padX,
                y: baseline,
                fill: panelText(ctx.colors.muted, inks.surface, PANEL.labelSize),
                anchor: "end",
              })}
            </g>
          )}
          <rect x={x + 1} y={y + PANEL.dividerY} width={w - 2} height={1} fill={inks.edge} />
        </>
      )}
    </g>
  )
}

/** The group a title bar's texts sit in, so tests can find them. */
const PANEL_SPEC_GROUP = { "data-panel-bar": "" } as const

/** Paints one fitted line of the title bar, its `<text>` carrying the panel exemption. */
function paintBarText(
  layout: EmphasisHeadingLayout,
  spec: { ctx: ComponentCtx; x: number; y: number; fill: string; anchor?: "start" | "end"; glossBreak?: string },
): React.ReactNode {
  return paintLines(layout, {
    ctx: spec.ctx,
    x: spec.x,
    y: spec.y,
    fill: spec.fill,
    fontFamily: spec.ctx.fonts.body,
    fontWeight: "400",
    anchor: spec.anchor,
    bg: spec.ctx.colors.surface,
    attrs: PANEL_SPEC,
    ...(spec.glossBreak ? { lastAttrs: { "data-gloss-break": spec.glossBreak } } : {}),
  })
}

/**
 * A small line the panel setting sets under 16px, at the board's size: a
 * legend entry, a category, a table header, a date. One `<text>`, exempt.
 */
export function SmallText({
  text,
  x,
  y,
  size,
  fill,
  ctx,
  bold = false,
  anchor = "start",
  fontFamily,
}: {
  text: string
  x: number
  y: number
  size: number
  fill: string
  ctx: ComponentCtx
  bold?: boolean
  anchor?: "start" | "middle" | "end"
  fontFamily?: string
}) {
  return (
    <text
      {...(size < 16 ? PANEL_SPEC : {})}
      x={x}
      y={y}
      textAnchor={anchor === "start" ? undefined : anchor}
      fontFamily={fontFamily ?? ctx.fonts.body}
      fontSize={size}
      fontWeight={bold ? "700" : undefined}
      fill={fill}
      dominantBaseline="alphabetic"
    >
      {text}
    </text>
  )
}

/**
 * The baseline of a serif figure of `size` set in a `lineHeight` box whose
 * top is `top`, the way a browser sets Georgia (ascent 0.917, descent
 * 0.219): the board's figures are Georgia boxes.
 */
export function serifBaseline(top: number, lineHeight: number, size: number): number {
  return Math.round(top + (lineHeight - size * 1.136) / 2 + size * 0.917)
}

// ── Figure panels ─────────────────────────────────────────────────────────

/** The figure sizes a figure panel tries, largest first. */
export const FIGURE_SIZES = [56, 48, 40, 34] as const

/** A figure panel's geometry, from the board: the figure's box 14px under the bar, its note under it. */
const FIGURE = {
  /** The figure's box starts this far into the panel. */
  top: 50,
  /** The figure's box is its size plus this. */
  boxExtra: 8,
  /** The note starts this far under the figure's box top, plus the size. */
  noteDrop: 58,
  noteSize: 15,
  noteLine: 22,
  noteMaxLines: 2,
  /** Air kept under the last note line. */
  foot: 12,
  /** A figure is no larger than this share of its panel's height. */
  heightShare: 0.22,
  /** The arrow after a figure, and the air before it. */
  arrowSize: 20,
  arrowGap: 10,
} as const

/** Whether a value is itself a change, written with its sign. */
export function signedValue(text: string): "up" | "down" | null {
  const t = text.trim()
  if (/^\+/.test(t)) return "up"
  if (/^[−-]/.test(t)) return "down"
  return null
}

/** The arrow that says which way a figure moved. */
export function deltaGlyph(delta: "up" | "down" | "flat"): string {
  return delta === "up" ? "▲" : delta === "down" ? "▼" : "▶"
}

export interface FigurePanel {
  item: KpiItem
  bar: PanelBar
  marked: boolean
  value: string
  size: number
  valueInk: string
  arrow: { glyph: string; ink: string } | null
  note: EmphasisHeadingLayout | null
}

/** The line under a figure: its unit, then its note, in the deck's punctuation. */
export function figureCaption(item: KpiItem, chinese: boolean): string {
  const parts = [item.unit?.trim(), item.note?.trim()].filter((part): part is string => Boolean(part))
  return parts.join(chinese ? "，" : ", ")
}

/** The figure's ink: the mark when the author marked it, a direction's colour when the figure is itself a change, the ink otherwise. */
export function figureInk(ctx: ComponentCtx, item: KpiItem, marked: boolean, value: string): string {
  const inks = panelInks(ctx)
  if (marked) return inks.mark
  const sign = signedValue(value)
  if (sign && item.delta === sign) return sign === "up" ? inks.up : inks.down
  return ctx.colors.text
}

/**
 * Fits one kpi_cards item into a figure panel `place`: its label as the
 * title bar's name, the figure at the largest of `FIGURE_SIZES` its width and
 * height allow, an arrow after it for its `delta`, and its unit and note under
 * it at 15px within two lines. `null` when the panel cannot hold it whole.
 */
export function fitFigurePanel(item: KpiItem, place: Place, ctx: ComponentCtx, chinese: boolean, sizes: readonly number[] = FIGURE_SIZES): FigurePanel | null {
  if (item.icon !== undefined || item.source !== undefined || item.tag !== undefined || item.tone !== undefined) return null
  const { text: value, marked } = kpiValueText(item.value)
  if (!value.trim()) return null
  const bar = fitPanelBar(item.label, undefined, place.w, ctx)
  if (!bar) return null
  const inner = place.w - PANEL.padX * 2
  const arrow = item.delta && item.delta !== "flat" ? deltaGlyph(item.delta) : null
  const arrowW = arrow ? FIGURE.arrowGap + measureTextUnits(arrow, { fontFamily: ctx.fonts.body }) * FIGURE.arrowSize : 0
  const caption = figureCaption(item, chinese)
  const note = caption
    ? fitFixed(caption, { width: inner, size: FIGURE.noteSize, lineHeight: FIGURE.noteLine, maxLines: FIGURE.noteMaxLines, fontFamily: ctx.fonts.body, bold: false })
    : null
  if (caption && !note) return null
  const noteH = (note?.lines.length ?? 0) * FIGURE.noteLine
  const size = sizes.find(
    (s) =>
      s <= place.h * FIGURE.heightShare &&
      measureTextUnits(value, { fontFamily: ctx.fonts.heading }) * s + arrowW <= inner &&
      FIGURE.noteDrop + s + noteH + FIGURE.foot <= place.h,
  )
  if (size === undefined) return null
  const inks = panelInks(ctx)
  return {
    item,
    bar,
    marked,
    value,
    size,
    valueInk: panelText(figureInk(ctx, item, marked, value), inks.surface, size),
    arrow: arrow ? { glyph: arrow, ink: panelText(item.delta === "up" ? inks.up : inks.down, inks.surface, FIGURE.arrowSize) } : null,
    note,
  }
}

/** Paints a fitted figure panel at `place`. */
export function paintFigurePanel(layout: FigurePanel, place: Place, ctx: ComponentCtx, key?: string): React.ReactElement {
  const inks = panelInks(ctx)
  const { x, y } = place
  const boxTop = y + FIGURE.top
  const baseline = serifBaseline(boxTop, layout.size + FIGURE.boxExtra, layout.size)
  const valueW = measureTextUnits(layout.value, { fontFamily: ctx.fonts.heading }) * layout.size
  const noteTop = y + FIGURE.noteDrop + layout.size
  return (
    <g key={key} data-figure-panel="">
      {paintPanel(place, ctx, { bar: layout.bar, marked: layout.marked })}
      <text
        x={x + PANEL.padX}
        y={baseline}
        fontFamily={ctx.fonts.heading}
        fontSize={layout.size}
        fill={layout.valueInk}
        dominantBaseline="alphabetic"
      >
        {layout.value}
      </text>
      {layout.arrow && (
        <text
          data-figure-delta=""
          x={x + PANEL.padX + valueW + FIGURE.arrowGap}
          y={baseline}
          fontFamily={ctx.fonts.body}
          fontSize={FIGURE.arrowSize}
          fill={layout.arrow.ink}
          dominantBaseline="alphabetic"
        >
          {layout.arrow.glyph}
        </text>
      )}
      {layout.note &&
        paintLines(layout.note, {
          ctx,
          x: x + PANEL.padX,
          y: centredBaseline(noteTop, FIGURE.noteLine, FIGURE.noteSize),
          fill: panelText(ctx.colors.muted, inks.surface, FIGURE.noteSize),
          fontFamily: ctx.fonts.body,
          fontWeight: "400",
          bg: inks.surface,
          attrs: PANEL_SPEC,
        })}
    </g>
  )
}

/** Whether a kpi_cards item can stand in a figure panel. */
export function panelFigureItem(item: KpiItem): boolean {
  return item.icon === undefined && item.source === undefined && item.tag === undefined && item.tone === undefined && kpiValueText(item.value).text.trim() !== ""
}

// ── Note panels ───────────────────────────────────────────────────────────

/** A note panel's measures: 19/30 text, the board's margins with and without a title bar. */
const NOTE = { size: 19, lineHeight: 30, maxLines: 3, padX: 24, topBare: 28, topTitled: 46, footBare: 34, footTitled: 40 } as const

export interface NotePanel {
  callout: Callout
  bar: PanelBar | null
  text: EmphasisHeadingLayout
  height: number
}

/**
 * A callout set as a panel under the page's chart, table or timeline. A
 * callout written "表外安排：…" ("Label: …", the label at most 24 characters)
 * names its panel: the label goes into the title bar and the rest into the
 * panel at 19px. One without such a label is a bare panel. A warning is a
 * note like any other here: the panel has no icon, and the colours stay
 * with the data.
 */
export function fitNotePanel(callout: Callout, w: number, ctx: ComponentCtx): NotePanel | null {
  if (callout.icon !== undefined) return null
  const { label, gloss } = splitRow(callout.text)
  const bar = label ? fitPanelBar(label, undefined, w, ctx) : null
  if (label && !bar) return null
  const glossBreak = label ? callout.text.trim().slice(label.length, callout.text.trim().length - gloss.length).trim() : undefined
  const marked = parseEmphasis(gloss).some((segment) => segment.emphasized)
  const text = fitFixed(gloss, {
    width: w - NOTE.padX * 2,
    size: NOTE.size,
    lineHeight: NOTE.lineHeight,
    maxLines: NOTE.maxLines,
    fontFamily: ctx.fonts.body,
    bold: marked,
  })
  if (!text || text.lines.length === 0) return null
  const height = (bar ? NOTE.topTitled + NOTE.footTitled : NOTE.topBare + NOTE.footBare) + text.lines.length * NOTE.lineHeight
  return { callout, bar: bar ? { ...bar, glossBreak } : null, text, height }
}

/** Paints a fitted note panel with its top-left corner at `x`, `y`. */
export function paintNotePanel(layout: NotePanel, place: { x: number; y: number; w: number }, ctx: ComponentCtx): React.ReactElement {
  const inks = panelInks(ctx)
  const top = place.y + (layout.bar ? NOTE.topTitled : NOTE.topBare)
  return (
    <g {...blockTag(ctx, layout.callout)} data-note-panel="">
      {paintPanel({ ...place, h: layout.height }, ctx, { bar: layout.bar })}
      {paintLines(layout.text, {
        ctx,
        x: place.x + NOTE.padX,
        y: centredBaseline(top, NOTE.lineHeight, NOTE.size),
        fill: panelText(ctx.colors.text, inks.surface, NOTE.size),
        fontFamily: ctx.fonts.body,
        fontWeight: "400",
        bg: inks.surface,
      })}
    </g>
  )
}
