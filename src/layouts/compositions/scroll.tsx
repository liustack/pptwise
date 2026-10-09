import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { sealStudioGlyph } from "../minimal-shared"
import { inkToward } from "../../components/tag"
import { parseEmphasis, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, graphicInk, metaInk, readableOn } from "../../render/ink"
import { CHINESE_FIGURES, groupDigits } from "../../lib/quantity-format"
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
 * The scroll setting: a public lecture hung as a scroll, ink's 2026-10 board
 * (`design/rounds/2026-10-07-ink/`).
 *
 * Rice paper, ink for the words and the darkest marks, a ramp of four greys
 * down from the ink to the paper for everything that is told apart by depth
 * (the tiers of a pyramid, the age groups of a share bar), and cinnabar, the
 * theme's accent, spent once a page on large type, a seal, or the one thing
 * the page is about. Titles, figures, names and the lines a page reads aloud
 * are set in the heading face (kaishu, with Times New Roman for Latin and
 * figures), labels, notes and sources in the body sans. Nothing is slanted:
 * a Chinese face has no italic, and what has to be told apart takes a colour
 * or the other face instead.
 *
 * Chinese can stand upright down a column, a character a cell, read from the
 * right: `fitVertical` breaks a text into columns of a fixed length, keeps a
 * column from starting on a comma or ending on an opening bracket, and
 * `paintVertical` sets the punctuation the way vertical type does (a comma or
 * a full stop in the upper right of its cell, brackets in their vertical
 * forms). Latin never stands upright letter by letter: a label down a column
 * is turned a quarter to read from the top (`fitColumnLabel`), and a line
 * meant to be read is set across the page by the face instead.
 *
 * The board's small type (11 to 15px labels, notes, sources, the margins and
 * the folio) is under the 16px floor and carries the `scroll-spec` exemption
 * the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const SCROLL_SPEC = { "data-font-floor-exempt": "scroll-spec" } as const

/**
 * Meta-information set quiet on purpose (the margins' hall and date, the
 * folio, where a passage comes from): the audit holds it to the 3:1 a meta
 * line needs rather than the body's 4.5:1. Every text painted in
 * `scrollMeta` carries it.
 */
export const SCROLL_META = { "data-contrast-tier": "meta" } as const

/** `SCROLL_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function scrollSmall(size: number): Record<string, string> {
  return size < 16 ? { ...SCROLL_SPEC } : {}
}

export interface ScrollInks {
  /** The paper. */
  ground: string
  /** A card, a slip, a mount: the paper a step whiter. */
  card: string
  /** Words. */
  ink: string
  /** The ink a step toward the paper: second figures, lines read aloud. */
  ink2: string
  /** Labels, notes, the source. */
  muted: string
  /** Hairlines, the scroll's edges. Never words. */
  line: string
  /** The darkest mark: a bar the page leans on, the deepest tier. */
  lead: string
  /** Cinnabar: large type, a seal, the one thing a page is about. */
  cinnabar: string
  /** The chart palette's third ink: quiet bars, icons, the margins' words. */
  taupe: string
  /** The chart palette's fourth ink. */
  gold: string
  /** The hairline half over the paper: the palest tier, a quiet band, an aside's ground. */
  wash: string
  /** The taupe a little over the hairline: the bars a page does not lead with. */
  faint: string
}

/** #3A3530 on the board: the ink at 88% over the paper. */
const INK2_MIX = 0.88
/** #E9E2D3 on the board: the hairline at half over the paper. */
const WASH_MIX = 0.5
/** #C8BFAE on the board: the taupe at 23% over the hairline. */
const FAINT_MIX = 0.23

export function scrollInks(ctx: ComponentCtx): ScrollInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const line = colors.border ?? blendOver(colors.muted, ground, 0.25)
  const palette = colors.chartPalette
  const taupe = palette[2] ?? colors.muted
  return {
    ground,
    card: colors.surface,
    ink: colors.text,
    ink2: blendOver(colors.primary, ground, INK2_MIX),
    muted: colors.muted,
    line,
    lead: colors.primary,
    cinnabar: colors.accent,
    taupe,
    gold: palette[3] ?? taupe,
    wash: blendOver(line, ground, WASH_MIX),
    faint: blendOver(taupe, line, FAINT_MIX),
  }
}

/**
 * The ramp a page tells depth by, darkest first: the ink, the ink a step
 * toward the paper, the taupe, the faint taupe, the wash. `n` steps taken
 * evenly from it, so four tiers are the board's ink, ink2, taupe and faint
 * and five age groups run from the wash to the ink.
 */
export function scrollRamp(inks: ScrollInks, n: number, opts: { palest?: boolean } = {}): string[] {
  const ramp = opts.palest ? [inks.lead, inks.ink2, inks.taupe, inks.faint, inks.wash] : [inks.lead, inks.ink2, inks.taupe, inks.faint]
  if (n <= 1) return [ramp[0]!]
  if (n === ramp.length) return [...ramp]
  return Array.from({ length: n }, (_, i) => {
    const at = (i / (n - 1)) * (ramp.length - 1)
    const lo = Math.floor(at)
    const hi = Math.min(ramp.length - 1, lo + 1)
    return at === lo ? ramp[lo]! : blendOver(ramp[hi]!, ramp[lo]!, at - lo)
  })
}

/** `ink` held to the contrast `size` needs on `ground`, stepped toward the readable ink when it falls short. */
export function scrollText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a margin, the folio, the source) held to the 3:1 a meta line needs. */
export function scrollMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A graphic (a bar, an icon, a rule that carries meaning) held to the 3:1 a mark needs on `ground`. */
export function scrollMark(ink: string, ground: string): string {
  return graphicInk(ink, ground)
}

// ── Text across the page ────────────────────────────────────────────────

export type ScrollTextSpec = ManuscriptTextSpec

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. `serif` is the heading face. */
export function fitScroll(text: string | undefined, spec: ScrollTextSpec, ctx: Pick<ComponentCtx, "fonts">): EmphasisHeadingLayout | null {
  return fitManuscript(text, spec, ctx)
}

/** The width `text` takes on one line at `size`, its marks stripped. */
export function scrollWidth(text: string, size: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptWidth(text, size, ctx, opts)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`. */
export function scrollBaseline(top: number, lineHeight: number, size: number, serif = false): number {
  return manuscriptBaseline(top, lineHeight, size, serif)
}

export type ScrollPaint = Omit<ManuscriptPaint, "lit" | "italic">

/** Paints a fitted block, one `<text>` a line, its `**…**` runs lit in cinnabar. */
export function paintScroll(layout: EmphasisHeadingLayout, opts: ScrollPaint): React.ReactNode {
  const inks = scrollInks(opts.ctx)
  return paintManuscript(layout, { ...opts, lit: inks.cinnabar, attrs: { ...scrollSmall(layout.fontSize), ...opts.attrs } })
}

/** One line known to fit, its marks lit in cinnabar. */
export function paintScrollLine(text: string, opts: Omit<ScrollPaint, "lastAttrs"> & { size: number; lineHeight?: number; key?: string | number }): React.ReactElement {
  const inks = scrollInks(opts.ctx)
  return paintManuscriptLine(text, { ...opts, lit: inks.cinnabar, attrs: { ...scrollSmall(opts.size), ...opts.attrs } })
}

/** `text` with `tracking` px between its characters, written as character spacing. */
export function paintScrollTracked(opts: Parameters<typeof paintManuscriptTracked>[0]): React.ReactElement {
  return paintManuscriptTracked({ ...opts, attrs: { ...scrollSmall(opts.size), ...opts.attrs } })
}

/** The tracked width of `text`, as `paintScrollTracked` sets it. */
export function scrollTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, opts: { serif?: boolean; bold?: boolean } = {}): number {
  return manuscriptTrackedWidth(text, size, tracking, ctx, opts)
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintScrollIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-scroll-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

/**
 * A value the engine prints for a chart, as the deck prints its figures: its
 * whole part grouped the deck's way (「1082」 in a Chinese deck that leaves
 * four digits whole, "1,082" in English), its decimals as written.
 */
export function scrollValue(value: number, ctx: ComponentCtx): string {
  return groupDigits(String(value), ctx.figures ?? CHINESE_FIGURES)
}

/** Whether `text`, its marks and spaces aside, is all marked: the author lit the whole of it. */
export function wholeLit(text: string): boolean {
  const segments = parseEmphasis(text.trim()).filter((s) => s.text.trim())
  return segments.length > 0 && segments.every((s) => s.emphasized)
}

// ── Upright down a column ───────────────────────────────────────────────

/**
 * How a column is set: the type size, the space between two cells (a cell is
 * one em tall, so a character stands every `size + tracking` px), how many
 * cells a column holds, the distance between two columns' centres and how
 * many columns there may be. The columns are read from the right.
 */
export interface VerticalSpec {
  size: number
  tracking: number
  capacity: number
  pitch: number
  maxColumns: number
}

/** One cell of a column: the character the author wrote, and whether it is in a marked run. */
export interface VerticalGlyph {
  ch: string
  lit: boolean
}

export type VerticalColumns = VerticalGlyph[][]

/** The distance from one cell's top to the next. */
export function verticalAdvance(spec: Pick<VerticalSpec, "size" | "tracking">): number {
  return spec.size + spec.tracking
}

/** How far down from its top a column of `cells` reaches: the last cell's foot. */
export function verticalLength(cells: number, spec: Pick<VerticalSpec, "size" | "tracking">): number {
  return cells <= 0 ? 0 : (cells - 1) * verticalAdvance(spec) + spec.size
}

/** A Latin letter or digit: Latin never stands upright letter by letter. */
const LATIN = /[A-Za-z0-9]/u

/**
 * A name and its count as one label: after a space in Chinese
 * (「40 岁以下 7 人」), after a colon when the name is in Latin letters
 * ("Under 40: 7"), where a bare space would run the two figures together.
 */
export function nameAndCount(name: string, count: string): string {
  return /[A-Za-z]/u.test(name) ? `${name}: ${count}` : `${name} ${count}`
}

/** Whether `text` can stand upright: Chinese, with no Latin letter or digit in it. */
export function uprightText(text: string): boolean {
  const plain = stripEmphasis(text).trim()
  return plain.length > 0 && !LATIN.test(plain)
}

/** Characters a column may not start with: what closes or follows. */
const NO_START = new Set(Array.from("，。、；：！？）」』》〉】〕…—·・”’"))
/** Characters a column may not end with: what opens. */
const NO_END = new Set(Array.from("（「『《〈【〔“‘"))

/**
 * `text` broken into columns of at most `spec.capacity` cells, or `null` when
 * it needs more than `spec.maxColumns` or cannot stand upright. A line break
 * the author wrote starts a new column. A full-width space takes a cell, as
 * it does across the page; a Latin space takes none. A column never starts
 * with a comma, a full stop or a closing bracket and never ends with an
 * opening one: the character before moves down with it instead, so no
 * column runs past its length.
 */
export function fitVertical(text: string | undefined, spec: VerticalSpec): VerticalColumns | null {
  const source = text?.trim() ?? ""
  if (!source || !uprightText(source)) return null
  const columns: VerticalColumns = []
  for (const paragraph of source.split(/\n/u)) {
    const glyphs: VerticalGlyph[] = []
    for (const segment of parseEmphasis(paragraph.trim())) {
      for (const ch of Array.from(segment.text)) {
        if (ch === " " || ch === "\t") continue
        glyphs.push({ ch, lit: segment.emphasized })
      }
    }
    if (glyphs.length === 0) continue
    let at = 0
    while (at < glyphs.length) {
      let end = Math.min(glyphs.length, at + spec.capacity)
      if (end < glyphs.length) {
        // Pull characters down until the next column starts on something that may start one.
        while (end > at + 1 && (NO_START.has(glyphs[end]!.ch) || NO_END.has(glyphs[end - 1]!.ch))) end -= 1
      }
      columns.push(glyphs.slice(at, end))
      at = end
    }
  }
  if (columns.length === 0 || columns.length > spec.maxColumns) return null
  return columns
}

/** How many cells the longest column takes. */
export function verticalDepth(columns: VerticalColumns): number {
  return Math.max(0, ...columns.map((c) => c.length))
}

/**
 * Where a character sits in its cell, as vertical type sets it.
 *
 * A comma, an enumeration comma and a full stop sit in the upper right of
 * the cell, not the lower left they take across the page: the same glyph,
 * moved. Brackets and quotation marks take their vertical forms, which every
 * Chinese face the theme names carries. A dash and an ellipsis turn a
 * quarter. Everything else stands as it is.
 */
const VERTICAL_FORMS: Readonly<Record<string, string>> = {
  "「": "﹁",
  "」": "﹂",
  "『": "﹃",
  "』": "﹄",
  "《": "︽",
  "》": "︾",
  "〈": "︿",
  "〉": "﹀",
  "（": "︵",
  "）": "︶",
  "【": "︻",
  "】": "︼",
  "〔": "︹",
  "〕": "︺",
  "“": "﹃",
  "”": "﹄",
  "‘": "﹁",
  "’": "﹂",
  "—": "︱",
}
/** Moved to the upper right of the cell, by these fractions of the size. */
const SHIFTED = new Set(Array.from("，、。．"))
const SHIFT = { dx: 0.56, dy: -0.58 } as const
/** Turned a quarter in the middle of the cell. */
const TURNED = new Set(Array.from("…～"))

/** The character as the column sets it, and where: its vertical form, a shift in its cell, or a quarter turn. */
export function verticalForm(ch: string): { ch: string; dx: number; dy: number; turn: boolean } {
  const form = VERTICAL_FORMS[ch]
  if (form) return { ch: form, dx: 0, dy: 0, turn: false }
  if (SHIFTED.has(ch)) return { ch, dx: SHIFT.dx, dy: SHIFT.dy, turn: false }
  return { ch, dx: 0, dy: 0, turn: TURNED.has(ch) }
}

/** Each vertical form back to the mark it stands for. Where two marks share a
 *  form (『 and “ both stand as ﹃), the first one listed is read back. */
const HORIZONTAL_FORMS: ReadonlyMap<string, string> = new Map(
  Object.entries(VERTICAL_FORMS)
    .reverse()
    .map(([from, to]) => [to, from]),
)

/** The character a vertical form stands for, so a reader of the page reads it back as written. */
export function horizontalForm(ch: string): string {
  return HORIZONTAL_FORMS.get(ch) ?? ch
}

const ANY_VERTICAL_FORM = new RegExp(`[${[...HORIZONTAL_FORMS.keys()].join("")}]`, "gu")

/** A text with every vertical form in it read back as the mark it stands for. */
export function horizontalText(text: string): string {
  return text.replace(ANY_VERTICAL_FORM, horizontalForm)
}

/** Where a CJK cell's baseline sits below its top, as a fraction of the size. */
const CELL_BASELINE = 0.82

export interface VerticalPaint {
  ctx: ComponentCtx
  /** The centre of the first (rightmost) column. */
  x: number
  /** The top of the first cell. */
  top: number
  spec: Pick<VerticalSpec, "size" | "tracking" | "pitch">
  fill: string
  /** The ink a marked run takes, cinnabar when omitted. */
  lit?: string
  /** The heading face (the default) or the body sans. */
  serif?: boolean
  bold?: boolean
  attrs?: Record<string, string>
  /** Columns step left (the default, read from the right) or right. */
  step?: "left" | "right"
}

/**
 * Columns painted a character a cell, the first column at `x` and each next
 * one `pitch` to its left. Each column is one group (`data-scroll-column`)
 * carrying the words it holds as written, so a reader of the page reads the
 * column back as one line.
 */
export function paintVertical(columns: VerticalColumns, opts: VerticalPaint): React.ReactElement {
  const { ctx, spec } = opts
  const inks = scrollInks(ctx)
  const family = opts.serif === false ? ctx.fonts.body : ctx.fonts.heading
  const lit = opts.lit ?? inks.cinnabar
  const advance = verticalAdvance(spec)
  const dir = opts.step === "right" ? 1 : -1
  return (
    <g data-scroll-vertical="">
      {columns.map((column, c) => {
        const cx = opts.x + dir * c * spec.pitch
        return (
          <g key={c} data-scroll-column={column.map((g) => g.ch).join("")}>
            {column.map((glyph, i) => {
              if (glyph.ch === "\u3000") return null
              const form = verticalForm(glyph.ch)
              const cellTop = opts.top + i * advance
              const x = Math.round((cx + form.dx * spec.size) * 100) / 100
              const y = Math.round((cellTop + CELL_BASELINE * spec.size + form.dy * spec.size) * 100) / 100
              const centre = Math.round((cellTop + spec.size / 2) * 100) / 100
              return (
                <text
                  key={i}
                  {...scrollSmall(spec.size)}
                  {...opts.attrs}
                  x={x}
                  y={form.turn ? Math.round((centre + spec.size * 0.35) * 100) / 100 : y}
                  transform={form.turn ? `rotate(90 ${x} ${centre})` : undefined}
                  textAnchor="middle"
                  fontFamily={family}
                  fontSize={spec.size}
                  fontWeight={opts.bold ? "700" : undefined}
                  fill={glyph.lit ? lit : opts.fill}
                  dominantBaseline="alphabetic"
                >
                  {form.ch}
                </text>
              )
            })}
          </g>
        )
      })}
    </g>
  )
}

// ── Turned a quarter down a column ──────────────────────────────────────

export interface TurnedSpec {
  size: number
  /** How long the column runs, from its top. */
  length: number
  /** The width a line takes across the column. */
  lineHeight: number
  maxLines: number
  serif?: boolean
  bold?: boolean
  tracking?: number
}

/** Latin text turned to read down a column: fitted across `length`, or `null`. */
export function fitTurned(text: string | undefined, spec: TurnedSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  if (spec.tracking) {
    const plain = stripEmphasis(text ?? "").trim()
    if (!plain || plain.includes("\n")) return null
    if (scrollTrackedWidth(plain, spec.size, spec.tracking, ctx, { serif: spec.serif !== false, bold: spec.bold }) > spec.length) return null
  }
  return fitScroll(text, { width: spec.length, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines, serif: spec.serif !== false, bold: spec.bold }, ctx)
}

/**
 * A fitted block turned a quarter clockwise to read from the top, its first
 * line's box against `right` and each next line to its left, as a column
 * reads from the right. Turned about the column's top right corner, a line
 * laid out at `top + k * lineHeight` across the page lands `k` lines left of
 * `right` down the page, its letters' tops facing right.
 */
export function paintTurned(layout: EmphasisHeadingLayout, opts: { ctx: ComponentCtx; right: number; top: number; fill: string; serif?: boolean; bold?: boolean; tracking?: number; attrs?: Record<string, string> }): React.ReactElement {
  const serif = opts.serif !== false
  return (
    <g data-scroll-turned="" transform={`rotate(90 ${opts.right} ${opts.top})`}>
      {opts.tracking
        ? layout.lines.map((line, k) => (
            <g key={k}>{paintScrollTracked({ ctx: opts.ctx, text: line, x: opts.right, y: scrollBaseline(opts.top + k * layout.lineHeight, layout.lineHeight, layout.fontSize, serif), size: layout.fontSize, tracking: opts.tracking!, serif, bold: opts.bold, fill: opts.fill, attrs: opts.attrs })}</g>
          ))
        : paintScroll(layout, { ctx: opts.ctx, x: opts.right, top: opts.top, fill: opts.fill, serif, bold: opts.bold, attrs: opts.attrs })}
    </g>
  )
}

// ── A label down a column ───────────────────────────────────────────────

/**
 * How a label stands down a margin or a slip: upright a character a cell in
 * Chinese, turned a quarter in Latin. `length` is how far the column runs,
 * `lineHeight` how wide it is (the width a turned line takes, and the step
 * between two upright columns).
 */
export interface ColumnLabelSpec {
  size: number
  tracking: number
  length: number
  lineHeight: number
  maxColumns: number
  /** The tracking a turned label takes, the Latin's own (much narrower than the upright cells'). */
  latinTracking?: number
  serif?: boolean
  bold?: boolean
}

export type FittedColumnLabel = { kind: "upright"; columns: VerticalColumns; spec: ColumnLabelSpec } | { kind: "turned"; layout: EmphasisHeadingLayout; spec: ColumnLabelSpec }

/** A label fitted down a column of `spec.length`, upright or turned, or `null` when it does not fit whole. */
export function fitColumnLabel(text: string | undefined, spec: ColumnLabelSpec, ctx: ComponentCtx): FittedColumnLabel | null {
  const plain = text?.trim() ?? ""
  if (!plain) return null
  if (uprightText(plain)) {
    const capacity = Math.floor((spec.length - spec.size) / (spec.size + spec.tracking)) + 1
    const columns = fitVertical(plain, { size: spec.size, tracking: spec.tracking, capacity, pitch: spec.lineHeight, maxColumns: spec.maxColumns })
    return columns ? { kind: "upright", columns, spec } : null
  }
  const layout = fitTurned(plain, { size: spec.size, length: spec.length, lineHeight: spec.lineHeight, maxLines: spec.maxColumns, serif: spec.serif, bold: spec.bold, tracking: spec.latinTracking }, ctx)
  return layout ? { kind: "turned", layout, spec } : null
}

/** How many columns a fitted label takes across. */
export function columnLabelWidth(label: FittedColumnLabel): number {
  return (label.kind === "upright" ? label.columns.length : label.layout.lines.length) * label.spec.lineHeight
}

/** A fitted label down the column whose box's right edge is `right`, from `top`. */
export function paintColumnLabel(label: FittedColumnLabel, opts: { ctx: ComponentCtx; right: number; top: number; fill: string; attrs?: Record<string, string> }): React.ReactElement {
  const { spec } = label
  if (label.kind === "upright") {
    return paintVertical(label.columns, { ctx: opts.ctx, x: opts.right - spec.lineHeight / 2, top: opts.top, spec: { size: spec.size, tracking: spec.tracking, pitch: spec.lineHeight }, fill: opts.fill, serif: spec.serif, bold: spec.bold, attrs: opts.attrs })
  }
  return paintTurned(label.layout, { ctx: opts.ctx, right: opts.right, top: opts.top, fill: opts.fill, serif: spec.serif, bold: spec.bold, tracking: spec.latinTracking, attrs: opts.attrs })
}

/**
 * Two labels joined for one column, the way the board joins the hall and the
 * date: a full-width space between two Chinese ones, a spaced middle dot
 * between two Latin ones.
 */
export function joinColumnLabels(parts: readonly (string | null | undefined)[]): string {
  const words = parts.map((p) => (p ? stripEmphasis(p).trim() : "")).filter(Boolean)
  if (words.length <= 1) return words[0] ?? ""
  return words.every(uprightText) ? words.join("\u3000") : words.join(" · ")
}

// ── The seal ────────────────────────────────────────────────────────────

/** A seal's corner and its character's size against the seal's. */
const SEAL = { r: 3, glyph: 0.62 } as const

/**
 * The character a seal is cut with: the page's `stamp` when the seal holds
 * it whole, one character with no date line, and otherwise the hall's first
 * character, as on a page without a stamp. A seal used to print a stamp's
 * first character and never its date, so 「已决定」 came out as 「已」 with
 * nothing to say so. `dropped` is true for a stamp the seal cannot hold,
 * which the face declares (`data-dropped`) instead of printing part of it.
 */
export function sealOf(stamp: Slide["stamp"], organization: string | undefined): { glyph: string | undefined; dropped: boolean } {
  const text = stamp ? stripEmphasis(stamp.text).trim() : ""
  if (stamp && Array.from(text).length === 1 && !stamp.date?.trim()) return { glyph: text, dropped: false }
  return { glyph: sealStudioGlyph(organization), dropped: stamp !== undefined }
}

/**
 * A square seal in cinnabar with one character cut in white, the way a
 * scroll is signed: on the title slip and at the colophon. A seal with no
 * character is a plain square.
 */
export function paintSeal(x: number, y: number, size: number, glyph: string | undefined, ctx: ComponentCtx): React.ReactElement {
  const inks = scrollInks(ctx)
  const fill = inks.cinnabar
  const ch = glyph ? Array.from(stripEmphasis(glyph).trim())[0] : undefined
  const glyphSize = Math.round(size * SEAL.glyph)
  return (
    <g data-scroll-seal={ch ?? ""}>
      <rect x={x} y={y} width={size} height={size} rx={SEAL.r} fill={fill} />
      {ch ? (
        <text x={x + size / 2} y={Math.round((y + size / 2 + glyphSize * 0.35) * 100) / 100} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={glyphSize} fontWeight="700" fill={readableOn(fill)} dominantBaseline="alphabetic">
          {ch}
        </text>
      ) : null}
    </g>
  )
}

// ── Figures ─────────────────────────────────────────────────────────────

/** A figure set large in the heading face, its unit small after a space in the grey. */
export interface FigureSpec {
  size: number
  unit: number
  /** Px between the figure's characters, negative to close them up as the board does at 120px. */
  tracking?: number
}

/**
 * The baseline of a figure set large in a `lineHeight` box whose top is
 * `top`: a little higher in the box than a line of words, where the board's
 * figures stand.
 */
export function figureBaseline(top: number, lineHeight: number, size: number): number {
  return Math.round(top + lineHeight / 2 + size * 0.33)
}

/** The width a figure and its unit take, as `paintScrollFigure` sets them. */
export function scrollFigureWidth(value: string, unit: string | undefined, spec: FigureSpec, ctx: ComponentCtx): number {
  const v = stripEmphasis(value).trim()
  const w = scrollWidth(v, spec.size, ctx, { serif: true }) + Math.max(0, Array.from(v).length - 1) * (spec.tracking ?? 0)
  const u = unit?.trim()
  return u ? w + scrollWidth(` ${u}`, spec.unit, ctx) : w
}

/** A figure on `baseline` from `x`, its unit after it in the grey. */
export function paintScrollFigure(opts: { ctx: ComponentCtx; value: string; unit?: string; x: number; baseline: number; spec: FigureSpec; fill: string; ground: string; attrs?: Record<string, string> }): React.ReactElement {
  const inks = scrollInks(opts.ctx)
  const value = stripEmphasis(opts.value).trim()
  const chars = Array.from(value)
  const u = opts.unit?.trim()
  const tracking = opts.spec.tracking ?? 0
  return (
    <text
      {...scrollSmall(u ? opts.spec.unit : opts.spec.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.baseline}
      fontFamily={opts.ctx.fonts.heading}
      fontSize={opts.spec.size}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={u ? "preserve" : undefined}
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
        <tspan fontSize={opts.spec.unit} fontFamily={opts.ctx.fonts.body} fill={scrollText(inks.muted, opts.ground, opts.spec.unit)}>
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

/** A photograph's note, 11px in white on a band of ink laid over the photograph's foot. */
export const PHOTO_NOTE = { size: 11, lineHeight: 20, pad: 10, band: 44, from: 0, to: 0.55 } as const

/** A photograph filling `box`, cropped to it. The card's white stands in where the deck has no such asset. */
export function paintScrollPhoto(assetId: string, box: Box, ctx: ComponentCtx, opts: { key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const inks = scrollInks(ctx)
  if (!asset?.src) return <rect key={opts.key} data-scroll-photo={assetId} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.card} stroke={inks.line} />
  return (
    <g key={opts.key} data-scroll-photo={assetId}>
      <image href={asset.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
    </g>
  )
}

/** A photograph's note fitted to one line inside it, or `null`. An empty note fits as nothing. */
export function fitPhotoNote(note: string | undefined, w: number, ctx: ComponentCtx): EmphasisHeadingLayout | null | undefined {
  if (!note?.trim()) return undefined
  return fitScroll(note, { width: w - PHOTO_NOTE.pad * 2, size: PHOTO_NOTE.size, lineHeight: PHOTO_NOTE.lineHeight, maxLines: 1 }, ctx)
}

/**
 * A photograph and its note in white at its foot, over a band of the ink
 * that fades in from the photograph so the note reads on any picture. `id`
 * names the band's gradient, unique on the page.
 */
export function ScrollPhoto({ assetId, box, note, ctx, id }: { assetId: string; box: Box; note: EmphasisHeadingLayout | null | undefined; ctx: ComponentCtx; id: string }): React.ReactElement {
  const inks = scrollInks(ctx)
  const band = { x: box.x, y: box.y + box.h - PHOTO_NOTE.band, w: box.w, h: PHOTO_NOTE.band }
  return (
    <g>
      {paintScrollPhoto(assetId, box, ctx)}
      {note ? (
        <g data-scroll-photo-note="">
          <ScrollWash id={id} box={band} ink={inks.lead} axis="y" stops={[{ offset: "0%", opacity: PHOTO_NOTE.from }, { offset: "100%", opacity: PHOTO_NOTE.to }]} />
          {paintScroll(note, { ctx, x: box.x + PHOTO_NOTE.pad, top: box.y + box.h - PHOTO_NOTE.lineHeight, fill: readableOn(inks.lead), ground: inks.lead })}
        </g>
      ) : null}
    </g>
  )
}

/**
 * A wash of `ink` over `box`, its opacity running through `stops` across
 * (`axis: "x"`, left to right) or down (`"y"`, top to bottom). `id` names
 * the gradient, unique on the page.
 */
export function ScrollWash({ id, box, ink, axis, stops }: { id: string; box: Box; ink: string; axis: "x" | "y"; stops: readonly { offset: string; opacity: number }[] }): React.ReactElement {
  return (
    <g data-scroll-wash="">
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

/** Where a composition places the page's claim: its column, and the size and foot a column beside a photograph takes. */
export interface ClaimColumn {
  x: number
  w: number
  size?: number
  foot?: number
}

/**
 * The page's claim in `column`, as the face hands it down (`claim`): the
 * drawing, `null` when the face handed none, or `false` when it does not fit
 * the column whole, in which case the composition declines.
 */
export function placeScrollClaim(claim: ((column: ClaimColumn) => React.ReactElement | null) | undefined, column: ClaimColumn): React.ReactElement | null | false {
  if (!claim) return null
  return claim(column) ?? false
}

/**
 * The page's source in `column`, as the face hands it down (`source`): the
 * drawing, `null` when the page has none, or `false` when it does not fit
 * the column, in which case the composition declines.
 */
export function placeScrollSource(source: ((column: { x: number; w: number }) => React.ReactElement | null) | undefined, column: { x: number; w: number }): React.ReactElement | null | false {
  if (!source) return null
  return source(column) ?? false
}
