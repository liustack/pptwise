import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { parseEmphasis, stripEmphasis, type EmphasisHeadingLayout, type EmphasisSegment } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, graphicInk, metaInk, readableOn } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { mostlyChinese } from "../../lib/text-script"
import { fitFixed } from "./type"

/*
 * The manuscript setting: a research proposal or a defense set as a page of
 * a thesis. Settled on thesis's 2026-10 board
 * (`design/rounds/2026-10-06-thesis/`).
 *
 * Ivory paper, emerald ink for the claim's evidence and the one thing a page
 * lands on, scholar's gold only as rules, dots and pale grounds, never small
 * words. Figures and tables carry their numbers as a paper does (「图 3」,
 * 「表 1」) in emerald bold before their titles; a source is a numbered
 * footnote, its number a superscript in the text (¹, ², ³) set in emerald.
 * Titles, figures and names are set in the heading serif, labels, notes and
 * sentences in the body sans.
 *
 * The board's small type (11 to 15px labels, captions, chips, notes and the
 * folio) is under the 16px floor and carries the `manuscript-spec`
 * exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const MANUSCRIPT_SPEC = { "data-font-floor-exempt": "manuscript-spec" } as const

/** `MANUSCRIPT_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function manuscriptSmall(size: number): Record<string, string> {
  return size < 16 ? { ...MANUSCRIPT_SPEC } : {}
}

export interface ManuscriptInks {
  /** The paper. */
  ground: string
  /** A card: manuscript white. */
  card: string
  /** Words. */
  ink: string
  /** Labels, notes, the source. */
  muted: string
  /** Hairlines and a card's outline. Never words. */
  line: string
  /** Emerald: figures, a figure's number, a superscript, the lead line. */
  deep: string
  /** Emerald at a tint over the card: a filled cell, a chip, a block. */
  deepPale: string
  /** Words on emerald. */
  onDeep: string
  /** Scholar's gold: rules, dots, a left bar, a dashed outline. */
  gold: string
  /** Gold at a tint over the card: a note's ground, the lead row. */
  goldPale: string
  /** Small words that must be gold, held to the contrast their size needs. */
  goldText: string
  /** The chart palette's indigo and pebble, the second and third lines. */
  indigo: string
  pebble: string
  /** Pebble lifted toward the paper: the last part of a bar, an outline for what was not found. */
  faint: string
  /** A bar's empty track: the hairline at a tint over the paper. */
  track: string
}

/** #E3EEE7 on the board: emerald at 9% over manuscript white. */
const DEEP_PALE_MIX = 0.095
/** #F1EAD2 on the board: gold at 15% over manuscript white. */
const GOLD_PALE_MIX = 0.15
/** #B9B4A3 on the board: pebble at 57% over the paper. */
const FAINT_MIX = 0.57
/** #E7E3D5 on the board: the hairline at 60% over the paper. */
const TRACK_MIX = 0.6

export function manuscriptInks(ctx: ComponentCtx): ManuscriptInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const card = colors.surface
  const line = colors.border ?? blendOver(colors.muted, ground, 0.25)
  const palette = colors.chartPalette
  const pebble = palette[3] ?? colors.muted
  return {
    ground,
    card,
    ink: colors.text,
    muted: colors.muted,
    line,
    deep: colors.primary,
    deepPale: blendOver(colors.primary, card, DEEP_PALE_MIX),
    onDeep: readableOn(colors.primary),
    gold: colors.accent,
    goldPale: blendOver(colors.accent, card, GOLD_PALE_MIX),
    goldText: inkToward(colors.accent, colors.text, ground, 12),
    indigo: palette[2] ?? colors.primary,
    pebble,
    faint: blendOver(pebble, ground, FAINT_MIX),
    track: blendOver(line, ground, TRACK_MIX),
  }
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the text ink when it falls short. */
export function manuscriptText(ink: string, ground: string, size: number, toward?: string): string {
  return inkToward(ink, toward ?? readableOn(ground), ground, size)
}

/** Quiet text (a note, the folio) held to the 3:1 a meta line needs. */
export function manuscriptMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/**
 * Where a face's baseline sits below the middle of its line box, as a
 * fraction of its size: Songti and PingFang as the board's browser set them,
 * the same as memo's board (0.358 and 0.35).
 */
const BASELINE_RATIO = { serif: 0.358, sans: 0.35 } as const

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function manuscriptBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return Math.round(top + lineHeight / 2 + size * (serif ? BASELINE_RATIO.serif : BASELINE_RATIO.sans))
}

/** The family a run is set in: the heading serif or the body sans. */
export function manuscriptFamily(ctx: ComponentCtx, serif: boolean): string {
  return serif ? ctx.fonts.heading : ctx.fonts.body
}

export interface ManuscriptTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  serif?: boolean
  bold?: boolean
}

/**
 * A full-width space the author set between two parts of a line (「设计一」 and 「旧阈值
 * 断点」), held through the line fitter as a full-width mark of the same
 * width, which the fitter would otherwise fold into a word space.
 */
const FULL_WIDTH_SPACE = "\u3000"
const HELD_SPACE = "\u25a1"

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitManuscript(text: string | undefined, spec: ManuscriptTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  const held = text?.includes(FULL_WIDTH_SPACE) ? text.split(FULL_WIDTH_SPACE).join(HELD_SPACE) : text
  const layout = fitFixed(held, {
    width: spec.width,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: manuscriptFamily(ctx, spec.serif === true),
    bold: spec.bold === true,
  })
  if (!layout || held === text) return layout
  const back = (s: string) => s.split(HELD_SPACE).join(FULL_WIDTH_SPACE)
  return { ...layout, lines: layout.lines.map(back), segments: layout.segments.map((line) => line.map((seg) => ({ ...seg, text: back(seg.text) }))) }
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function manuscriptWidth(text: string, size: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: manuscriptFamily(ctx, opts.serif === true), bold: opts.bold === true }) * size
}

// ── Superscripts and marks ──────────────────────────────────────────────

/** A note's number written as a superscript in the text: ¹ ² ³ … */
const SUPERSCRIPT = /[⁰¹²³⁴⁵⁶⁷⁸⁹]+/gu

interface Run {
  text: string
  /** A `**…**` run or a note's superscript: set in emerald, bold. */
  lit: boolean
}

/** A line's runs: its marked runs and its superscripts lit, the rest plain. */
function runsOf(segments: readonly EmphasisSegment[]): Run[] {
  const runs: Run[] = []
  for (const segment of segments) {
    if (segment.emphasized) {
      runs.push({ text: segment.text, lit: true })
      continue
    }
    let at = 0
    for (const m of segment.text.matchAll(SUPERSCRIPT)) {
      if (m.index! > at) runs.push({ text: segment.text.slice(at, m.index), lit: false })
      runs.push({ text: m[0], lit: true })
      at = m.index! + m[0].length
    }
    if (at < segment.text.length) runs.push({ text: segment.text.slice(at), lit: false })
  }
  return runs
}

/** Whether `text` carries a note's superscript. */
export function hasSuperscript(text: string): boolean {
  return new RegExp(SUPERSCRIPT.source, "u").test(text)
}

/** Whether a line carries spaces a renderer would collapse: two in a row, or a full-width one. */
export function keepsSpaces(text: string): boolean {
  return text.includes("  ") || text.includes("\u3000")
}

function paintRuns(runs: readonly Run[], lit: string): React.ReactNode {
  if (runs.every((r) => !r.lit)) return runs.map((r) => r.text).join("")
  return runs.map((r, i) =>
    r.lit ? (
      <tspan key={i} fill={lit} fontWeight="700" data-manuscript-lit="">
        {r.text}
      </tspan>
    ) : (
      r.text
    ),
  )
}

export interface ManuscriptPaint {
  ctx: ComponentCtx
  x: number
  /** The top of the first line's box, or the first baseline. */
  top?: number
  baseline?: number
  fill: string
  serif?: boolean
  bold?: boolean
  anchor?: "start" | "middle" | "end"
  /** What the text sits on, for the lit runs' ink. The paper when omitted. */
  ground?: string
  attrs?: Record<string, string>
  lastAttrs?: Record<string, string>
  italic?: boolean
  /** The ink a marked run and a superscript take before contrast holds it, emerald when omitted. */
  lit?: string
}

/**
 * Paints a fitted block, one `<text>` a line, its `**…**` runs and its
 * superscripts set in emerald bold.
 */
export function paintManuscript(layout: EmphasisHeadingLayout, opts: ManuscriptPaint): React.ReactNode {
  const inks = manuscriptInks(opts.ctx)
  const ground = opts.ground ?? inks.ground
  const lit = manuscriptText(opts.lit ?? inks.deep, ground, layout.fontSize)
  const first = opts.baseline ?? manuscriptBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize, opts.serif === true)
  return layout.lines.map((line, i) => (
    <text
      key={i}
      {...manuscriptSmall(layout.fontSize)}
      {...opts.attrs}
      {...(i === layout.lines.length - 1 ? opts.lastAttrs : undefined)}
      x={opts.x}
      y={first + i * layout.lineHeight}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={manuscriptFamily(opts.ctx, opts.serif === true)}
      fontSize={layout.fontSize}
      fontWeight={opts.bold ? "700" : undefined}
      fontStyle={opts.italic ? "italic" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={keepsSpaces(line) ? "preserve" : undefined}
    >
      {paintRuns(runsOf(layout.segments[i] ?? [{ text: line, emphasized: false }]), lit)}
    </text>
  ))
}

/** One line known to fit, in a `lineHeight` box whose top is `top`, or on `baseline`. Its marks and superscripts lit. */
export function paintManuscriptLine(
  text: string,
  opts: Omit<ManuscriptPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number },
): React.ReactElement {
  const inks = manuscriptInks(opts.ctx)
  const ground = opts.ground ?? inks.ground
  const y = opts.baseline ?? manuscriptBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size, opts.serif === true)
  return (
    <text
      key={opts.key}
      {...manuscriptSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={manuscriptFamily(opts.ctx, opts.serif === true)}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fontStyle={opts.italic ? "italic" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={keepsSpaces(text) ? "preserve" : undefined}
    >
      {paintRuns(runsOf(parseEmphasis(text)), manuscriptText(opts.lit ?? inks.deep, ground, opts.size))}
    </text>
  )
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintManuscriptTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; serif?: boolean; bold?: boolean; weight?: "700" | "800"; anchor?: "start" | "middle" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      {...manuscriptSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={manuscriptFamily(opts.ctx, opts.serif === true)}
      fontSize={opts.size}
      fontWeight={opts.weight ?? (opts.bold ? "700" : undefined)}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      data-tracking={opts.tracking}
      xmlSpace={opts.text.includes(" ") ? "preserve" : undefined}
    >
      {chars[0]}
      {chars.slice(1).map((ch, i) => (
        <tspan key={i} dx={opts.tracking}>
          {ch}
        </tspan>
      ))}
    </text>
  )
}

/** The tracked width of `text`, as `paintManuscriptTracked` sets it. */
export function manuscriptTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptWidth(text, size, ctx, opts) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintManuscriptIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-manuscript-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Cards, chips, captions and the closing lines ────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A card's corner, the board's 4px. */
export const MANUSCRIPT_CARD_R = 4

/** A card: manuscript white inside a hairline, rounded 4px. */
export function paintManuscriptCard(box: Box, inks: ManuscriptInks, opts: { key?: string | number; fill?: string; attrs?: Record<string, string> } = {}): React.ReactElement {
  return <rect key={opts.key} {...opts.attrs} x={box.x + 0.5} y={box.y + 0.5} width={box.w - 1} height={box.h - 1} rx={MANUSCRIPT_CARD_R - 0.5} fill={opts.fill ?? inks.card} stroke={inks.line} strokeWidth={1} />
}

export interface ChipStyle {
  size: number
  h: number
  fg: string
  bg?: string
  border?: string
}

/** A chip's width: its words bold plus nine pixels of air a side, as the board measured them. */
export function manuscriptChipWidth(text: string, size: number, ctx: ComponentCtx): number {
  return Math.round(manuscriptWidth(text, size, ctx, { bold: true }) + 18)
}

/** A chip at `x`, `y`: a rounded label on a pale ground or in an outline, its words bold and centred. */
export function paintManuscriptChip(text: string, x: number, y: number, style: ChipStyle, ctx: ComponentCtx, opts: { key?: string | number } = {}): { node: React.ReactElement; w: number } {
  const words = stripEmphasis(text).trim()
  const w = manuscriptChipWidth(words, style.size, ctx)
  const inks = manuscriptInks(ctx)
  const ground = style.bg ?? inks.ground
  const node = (
    <g key={opts.key} data-manuscript-chip={words}>
      <rect x={x + (style.border ? 0.5 : 0)} y={y + (style.border ? 0.5 : 0)} width={w - (style.border ? 1 : 0)} height={style.h - (style.border ? 1 : 0)} rx={3} fill={style.bg ?? "none"} stroke={style.border} strokeWidth={style.border ? 1 : undefined} />
      {paintManuscriptLine(words, { ctx, x: x + w / 2, top: y, lineHeight: style.h, size: style.size, bold: true, anchor: "middle", fill: manuscriptText(style.fg, ground, style.size) })}
    </g>
  )
  return { node, w }
}

/**
 * The word a figure or a table is numbered with, in the deck's language:
 * 「图 3」 and 「表 1」, or "Figure 3" and "Table 1".
 */
export function exhibitWord(kind: "figure" | "table", n: number, chinese: boolean): string {
  if (chinese) return `${kind === "figure" ? "图" : "表"} ${n}`
  return `${kind === "figure" ? "Figure" : "Table"} ${n}`
}

/** Whether the deck speaks Chinese, from the deck's figure style or the words given. */
export function manuscriptChinese(ctx: ComponentCtx, words: readonly string[]): boolean {
  return ctx.figures?.chinese ?? mostlyChinese(words)
}

/** A figure's or a table's caption: its number in emerald bold, a full-width space, its title at 13/20. */
export const CAPTION = { size: 13, lineHeight: 20, gap: "\u3000" } as const

/** The caption's title fitted after its number on one line of `w`, or `null`. */
export function fitCaption(label: string, title: string, w: number, ctx: ComponentCtx): string | null {
  const text = `${label}${CAPTION.gap}${title.trim()}`
  return manuscriptWidth(text, CAPTION.size, ctx) + manuscriptWidth(label, CAPTION.size, ctx, { bold: true }) - manuscriptWidth(label, CAPTION.size, ctx) <= w ? text : null
}

/** A caption at `top`, as `fitCaption` laid it: the number lit, the title's superscripts lit. */
export function Caption({ label, title, x, top, ctx, ground }: { label: string; title: string; x: number; top: number; ctx: ComponentCtx; ground?: string }): React.ReactElement {
  const inks = manuscriptInks(ctx)
  const on = ground ?? inks.ground
  const deep = manuscriptText(inks.deep, on, CAPTION.size)
  const runs = runsOf(parseEmphasis(title.trim()))
  return (
    <g data-manuscript-caption={label}>
      <text
        {...MANUSCRIPT_SPEC}
        x={x}
        y={manuscriptBaseline(top, CAPTION.lineHeight, CAPTION.size)}
        fontFamily={ctx.fonts.body}
        fontSize={CAPTION.size}
        fill={manuscriptText(inks.ink, on, CAPTION.size)}
        dominantBaseline="alphabetic"
        xmlSpace="preserve"
      >
        <tspan fill={deep} fontWeight="700">
          {label}
        </tspan>
        {CAPTION.gap}
        {paintRuns(runs, deep)}
      </text>
    </g>
  )
}

/**
 * A plain caption under an illustration: 11px in the muted ink, no number,
 * as the board captions the photographs that only illustrate a page.
 */
export const ILLUSTRATION_CAPTION = { size: 11, lineHeight: 18 } as const

/**
 * The line a page closes on: a 3px gold bar at its left and the words 16px
 * in from it, at the board's 14 to 15px. `tint` sets it on the gold's pale
 * ground, as a caveat under a table.
 */
export interface AsideSpec {
  size: number
  lineHeight: number
  maxLines: number
  pad: number
  tint?: boolean
  bold?: boolean
}

export const ASIDE = { bar: 3, pad: 16 } as const

export function fitAside(text: string, w: number, spec: AsideSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitManuscript(text, { width: w - ASIDE.bar - ASIDE.pad * 2, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines, bold: spec.bold }, ctx)
}

export function Aside({ layout, x, y, w, h, spec, ctx, attrs }: { layout: EmphasisHeadingLayout; x: number; y: number; w: number; h: number; spec: AsideSpec; ctx: ComponentCtx; attrs?: Record<string, string> }): React.ReactElement {
  const inks = manuscriptInks(ctx)
  const ground = spec.tint ? inks.goldPale : inks.ground
  // The words stand at the top of the bar, `spec.pad` in, as the board set them.
  return (
    <g data-manuscript-aside="" {...attrs}>
      {spec.tint ? <rect x={x} y={y} width={w} height={h} fill={inks.goldPale} /> : null}
      <rect data-manuscript-gold="" x={x} y={y} width={ASIDE.bar} height={h} fill={inks.gold} />
      {paintManuscript(layout, { ctx, x: x + ASIDE.bar + ASIDE.pad, top: y + spec.pad, fill: manuscriptText(inks.ink, ground, layout.fontSize), bold: spec.bold, ground })}
    </g>
  )
}

/**
 * A photograph filling `box`, cropped to it. The card's white stands in
 * where the deck has no such asset.
 */
export function paintManuscriptPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const inks = manuscriptInks(ctx)
  if (!asset?.src) return <rect key={opts.key} data-manuscript-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.card} stroke={inks.line} />
  return (
    <g key={opts.key} data-manuscript-photo={assetId}>
      <image href={asset.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
    </g>
  )
}

// ── Rules that stand clear of words ────────────────────────────────────

/** The ink a word covers on the page. */
export interface InkBox {
  x0: number
  x1: number
  y0: number
  y1: number
}

/** How far a hairline stands clear of the words it would cross. */
const RULE_CLEAR = 5

/** The ink a line of text at `size` covers from its baseline: the ascent over it, the descent under it. */
export function inkBox(text: string, x: number, baseline: number, size: number, ctx: ComponentCtx, opts: { anchor?: "start" | "middle" | "end"; serif?: boolean; bold?: boolean } = {}): InkBox {
  const w = manuscriptWidth(text, size, ctx, opts)
  const x0 = opts.anchor === "middle" ? x - w / 2 : opts.anchor === "end" ? x - w : x
  return { x0, x1: x0 + w, y0: baseline - size * 0.9, y1: baseline + size * 0.25 }
}

/**
 * A hairline at `at` running from `from` to `to` (down the page for
 * `"vertical"`, across it for `"horizontal"`), as the stretches left once it
 * is cut clear of every box of words it would cross or touch.
 */
export function cutRule(direction: "vertical" | "horizontal", at: number, from: number, to: number, boxes: readonly InkBox[]): [number, number][] {
  const across = (b: InkBox) => (direction === "vertical" ? [b.x0, b.x1] : [b.y0, b.y1])
  const along = (b: InkBox) => (direction === "vertical" ? [b.y0, b.y1] : [b.x0, b.x1])
  const cuts = boxes
    .filter((b) => at >= across(b)[0]! - RULE_CLEAR && at <= across(b)[1]! + RULE_CLEAR)
    .map((b) => [along(b)[0]! - RULE_CLEAR, along(b)[1]! + RULE_CLEAR] as const)
    .sort((a, b) => a[0] - b[0])
  const out: [number, number][] = []
  let start = from
  for (const [a, b] of cuts) {
    if (a > start) out.push([start, Math.min(a, to)])
    start = Math.max(start, b)
  }
  if (start < to) out.push([start, to])
  return out.filter(([a, b]) => b - a > 1)
}

// ── Reading the author's words ─────────────────────────────────────────

/** Splits `text` at its first colon (「：」 or ": ") into the name before it and the rest, or `null`. */
export function splitLabel(text: string): { name: string; sep: string; rest: string } | null {
  const m = /^(.+?)(：|: )(.+)$/su.exec(text.trim())
  return m && m[1]!.trim() && m[3]!.trim() ? { name: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** Splits `text` at its first sentence end (「。」 or ". ") into the sentence and the rest, or `null`. */
export function splitSentenceEnd(text: string): { lead: string; sep: string; rest: string } | null {
  const m = /^(.+?)(。|\. )(.+)$/su.exec(text.trim())
  return m ? { lead: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** Splits `text` at its first " · " into what comes before and after, or `null`. */
export function splitMiddleDot(text: string): { name: string; rest: string } | null {
  const at = text.indexOf(" · ")
  return at > 0 ? { name: text.slice(0, at).trim(), rest: text.slice(at + 3).trim() } : null
}

/** The attribute that says a separator stood after this line: `data-gloss-break`. */
export function glossBreak(sep: string | undefined): Record<string, string> {
  return sep ? { "data-gloss-break": sep } : {}
}

/** Whether `text` is wholly marked, `**…**`. */
export function wholeMark(text: string): boolean {
  return /^\*\*[^*]+\*\*$/u.test(text.trim())
}

// ── Fitting the board's line breaks, figures and captions ──────────────

/**
 * `text` on one line of `spec.width` when it fits, otherwise broken at its
 * first comma or colon (「，」「：」", " ": ", or the marks `breaks` names)
 * where both halves fit a line each, the mark declared rather than printed
 * (`sep`), otherwise wrapped as `fitManuscript` wraps it. `null` when none of
 * the three fits.
 */
export function fitBroken(text: string, spec: ManuscriptTextSpec, ctx: ComponentCtx, breaks: RegExp = /(，|：|, |: )/gu): { layout: EmphasisHeadingLayout; sep?: string } | null {
  const one = fitManuscript(text, { ...spec, maxLines: 1 }, ctx)
  if (one) return { layout: one }
  if (spec.maxLines >= 2) {
    for (const m of text.matchAll(new RegExp(breaks.source, "gu"))) {
      const head = text.slice(0, m.index).trim()
      const tail = text.slice(m.index! + m[0].length).trim()
      const a = head ? fitManuscript(head, { ...spec, maxLines: 1 }, ctx) : null
      const b = tail ? fitManuscript(tail, { ...spec, maxLines: 1 }, ctx) : null
      if (a && b) return { layout: { ...a, lines: [...a.lines, ...b.lines], segments: [...a.segments, ...b.segments] }, sep: m[0] }
    }
  }
  const wrapped = fitManuscript(text, spec, ctx)
  return wrapped ? { layout: wrapped } : null
}

/** How many decimals a run of values is written to: the most any of them carries. */
export function decimalsOf(values: readonly number[]): number {
  return Math.max(0, ...values.map((v) => (String(v).split(".")[1] ?? "").length))
}

/** A figure as the board prints it: `decimals` places, a true minus sign, a plus when asked. */
export function figureText(value: number, decimals: number, opts: { plus?: boolean } = {}): string {
  const body = Math.abs(value).toFixed(decimals)
  return value < 0 ? `−${body}` : `${opts.plus && value > 0 ? "+" : ""}${body}`
}

/** A figure and its unit, joined by a space unless the unit is a percent sign. */
export function withUnit(figure: string, unit: string | undefined): string {
  const u = unit?.trim()
  if (!u) return figure
  return u === "%" || u === "％" ? `${figure}${u}` : `${figure} ${u}`
}

/** `text` with its `**…**` marks taken off and its ends trimmed. */
export function stripMarks(text: string): string {
  return stripEmphasis(text).trim()
}
