import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { attachEmphasis, emphasisRunInk, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { accessibleInk, blendOver, graphicInk, metaInk, resolveSemanticColor } from "../../render/ink"
import { centredBaseline, fitFixed, paintLines } from "./type"

type Tone = NonNullable<Extract<Component, { type: "timeline" }>["milestones"][number]["tone"]>

/*
 * The console setting: an incident console, the way an on-call screen sets
 * what it knows. Settled on terminal's 2026-10 board
 * (`design/rounds/2026-10-05-terminal/`).
 *
 * Evidence sits in square panels, the surface with a 1px edge, and the one
 * thing the author marks sits on the mark's dark tint inside an edge of the
 * mark. A card may carry HUD brackets, four short corner strokes just inside
 * its edge. Figures, times, labels, tags and sources are set in the mono face,
 * the way a log prints them; claims, titles and sentences stay in the body
 * face. The theme's danger, warning and success inks say what kind of news a
 * line is (a dot on a log line, a label, an outline), never which line the
 * page is about: that is the mark, spent once a page.
 *
 * Small mono type is the board's own: 12 and 13px labels, tags and the
 * source line. It is under the 16px floor and carries the `console-spec`
 * exemption the L1 audit knows, as vermilion's 14px source carries
 * `seal-spec`.
 *
 * Everything here reads the theme's tokens, so a fork recolours it and any
 * theme can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small mono type by. */
export const CONSOLE_SPEC = { "data-font-floor-exempt": "console-spec" } as const

/** `CONSOLE_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function consoleSmall(size: number): Record<string, string> {
  return size < 16 ? { ...CONSOLE_SPEC } : {}
}

/** The board's small sizes. */
export const CONSOLE_TYPE = {
  /** A panel's mono label, a table's headers. */
  label: 13,
  /** A tag's words, a caption over a picture. */
  tag: 12,
} as const

export interface ConsoleInks {
  /** The page. */
  ground: string
  /** A well sunk into the page: a listing's ground, a device's screen bezel. */
  well: string
  /** A panel's fill. */
  surface: string
  /** A panel's edge, hairlines between rows. */
  edge: string
  /** Quiet strokes: brackets, an icon box's edge, an unmarked arrow. Never words. */
  dim: string
  /** Headline ink. */
  text: string
  /** Sentences in a panel: a step back from the headline ink. */
  body: string
  /** A list on a photograph: half a step back. */
  bright: string
  /** Labels, notes, timestamps. */
  muted: string
  /** The one thing the author marked. */
  mark: string
  /** The mark's dark tint, under a marked card or row. */
  tint: string
  /** The three kinds of news. */
  danger: string
  warning: string
  success: string
}

export function consoleInks(ctx: ComponentCtx): ConsoleInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const edge = colors.border ?? colors.muted
  const mark = emphasisRunInk(colors)
  return {
    ground,
    well: blendOver("#000000", ground, 0.3),
    surface: colors.surface,
    edge,
    dim: blendOver(colors.muted, edge, 0.22),
    text: colors.text,
    body: blendOver(colors.text, colors.muted, 0.62),
    bright: blendOver(colors.text, colors.muted, 0.77),
    muted: colors.muted,
    mark,
    tint: blendOver(mark, ground, 0.12),
    danger: resolveSemanticColor("danger", colors),
    warning: resolveSemanticColor("warning", colors),
    success: resolveSemanticColor("success", colors),
  }
}

/** The ink for a tone, or `undefined` for none. */
export function toneInk(inks: ConsoleInks, tone: Tone | undefined): string | undefined {
  return tone ? inks[tone] : undefined
}

/**
 * The colour of the `k`-th series the author did not mark, counted from the
 * one nearest the mark: the chart palette after its lead, in order.
 */
export function consoleSeriesInk(ctx: ComponentCtx, k: number): string {
  const palette = ctx.colors.chartPalette
  const rest = palette.length > 1 ? palette.slice(1) : palette
  return rest[k % rest.length]!
}

/** Text of `size` in `ink` on `ground`, held to the contrast its size needs. */
export function consoleText(ink: string, ground: string, size: number): string {
  return accessibleInk(ink, ground, size)
}

/** Quiet text (a line number, an index) in `ink` on `ground`, held to the 3:1 a meta line needs. */
export function consoleMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** A rectangle on the page. */
export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/**
 * A square panel: `fill` inside a 1px `stroke` drawn on its inner pixel row,
 * so its outer edge lands on `box` the way a bordered box does.
 */
export function paintPanel(box: Box, fill: string, stroke: string, key?: string, attrs?: Record<string, string>): React.ReactElement {
  return <rect key={key} {...attrs} x={box.x + 0.5} y={box.y + 0.5} width={box.w - 1} height={box.h - 1} fill={fill} stroke={stroke} strokeWidth={1} />
}

/** A card's panel: the mark's tint inside an edge of the mark when marked, the surface inside the edge ink otherwise. */
export function paintCard(box: Box, inks: ConsoleInks, marked: boolean, key?: string, edge?: string): React.ReactElement {
  return paintPanel(box, marked ? inks.tint : inks.surface, marked ? inks.mark : (edge ?? inks.edge), key)
}

/** HUD brackets: four `len`px corner strokes just inside `box`, 1.5px. */
export function paintBrackets(box: Box, color: string, len = 10, key?: string): React.ReactElement {
  const { x, y, w, h } = box
  const corner = (cx: number, cy: number, dx: number, dy: number) => `M${cx} ${cy + dy * len} V${cy} H${cx + dx * len}`
  const d = [corner(x, y, 1, 1), corner(x + w, y, -1, 1), corner(x, y + h, 1, -1), corner(x + w, y + h, -1, -1)].join(" ")
  return <path key={key} data-hud-brackets="" d={d} fill="none" stroke={color} strokeWidth={1.5} />
}

/**
 * An icon of `size` with its top left at `(x, y)`, its stroke held to the 3:1
 * a graphic needs on `ground`, or left in `color` as it is when `quiet`: a
 * connector or an ornament the board draws in the dim ink on purpose.
 */
export function paintIcon(name: string, x: number, y: number, size: number, color: string, ground: string, key?: string, quiet = false): React.ReactElement {
  return (
    <g key={key} data-console-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={quiet ? color : graphicInk(color, ground)} />
    </g>
  )
}

const WIDE = /[\u2e80-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef\u3000-\u303f]/u

/**
 * The widest Latin advance of the mono faces a page is drawn in: Consolas,
 * which PowerPoint prints, is 0.5498em, and Menlo, which a Mac previews it
 * in, 0.6021em. A console measures every mono line at the wider of the two,
 * so a line that fits fits in both and the preview never runs past a panel.
 */
const MONO_FIT_ADVANCE = 1233 / 2048

/** The width `text` takes in the mono face at `size`: the wider mono advance for Latin, a full em for CJK. */
export function monoWidth(text: string, size: number): number {
  return monoUnits(stripEmphasis(text)) * size
}

function monoUnits(text: string): number {
  return Array.from(text).reduce((sum, char) => sum + (WIDE.test(char) ? 1 : MONO_FIT_ADVANCE), 0)
}

const NO_LINE_START = /^[，。、；：！？）」』》〉,.;:!?)\]]/u

/**
 * Wraps `text` greedily into lines of at most `units` mono advances, breaking
 * between words and between CJK characters, never before closing
 * punctuation. `null` when one word alone is wider than the line.
 */
function wrapMono(text: string, units: number): string[] | null {
  const tokens = text.match(/\s+|[\u2e80-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef\u3000-\u303f]|[^\s\u2e80-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef\u3000-\u303f]+/gu) ?? []
  const lines: string[] = []
  let line = ""
  for (const token of tokens) {
    if (/^\s+$/u.test(token)) {
      if (line && monoUnits(line + token) <= units) line += token
      continue
    }
    if (monoUnits(line + token) <= units) {
      line += token
      continue
    }
    if (!line) return null
    if (NO_LINE_START.test(token)) {
      // Closing punctuation stays with the character before it.
      const last = Array.from(line.trimEnd()).pop() ?? ""
      if (!WIDE.test(last) || line.trimEnd().length < 2) return null
      lines.push(line.trimEnd().slice(0, -last.length).trimEnd())
      line = last + token
      continue
    }
    lines.push(line.trimEnd())
    if (monoUnits(token) > units) return null
    line = token
  }
  if (line.trim()) lines.push(line.trimEnd())
  return lines
}

export interface MonoSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
}

/**
 * `text` set in the mono face at exactly `spec.size`, wrapped into at most
 * `spec.maxLines` lines of `spec.width`, its `**marked**` runs kept for the
 * paint, or `null` when it does not fit whole. Measured with the mono face's
 * own advances, which the ordinary fit does not know.
 */
export function fitMono(text: string | undefined, spec: MonoSpec): EmphasisHeadingLayout | null {
  const plain = stripEmphasis(text ?? "").trim()
  const lines = plain ? wrapMono(plain, spec.width / spec.size) : []
  if (lines === null || lines.length > spec.maxLines) return null
  return attachEmphasis(text?.trim() ?? "", { lines, fontSize: spec.size, lineHeight: spec.lineHeight, truncated: false })
}

/** Paints a mono block fitted by `fitMono`: one `<text>` per line, the small-type exemption where it is small. */
export function paintMono(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    y: number
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    lastAttrs?: Record<string, string>
    ground?: string
  },
): React.ReactNode {
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: opts.y,
    fill: opts.fill,
    fontFamily: opts.ctx.fonts.mono,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    attrs: { ...consoleSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** The baseline of a `size` line centred in a `box`-tall line box whose top is `top`. */
export const baselineIn = centredBaseline

/** A tag at the board's size: 12px mono words, bold, in a 22px square label. */
export const CONSOLE_TAG = { size: 12, height: 22, padX: 9 } as const

/**
 * A tag's width for `text`: 0.7em a Latin character and 13/12em a CJK one, the
 * board's own measure, which leaves the words air inside their outline in
 * either mono face.
 */
export function consoleTagWidth(text: string): number {
  const units = Array.from(stripEmphasis(text)).reduce((sum, char) => sum + (WIDE.test(char) ? 13 / 12 : 0.7), 0)
  return Math.round(units * CONSOLE_TAG.size + CONSOLE_TAG.padX * 2)
}

/**
 * A square tag: `text` in bold mono, outlined in `ink`, or filled with it and
 * lettered in the ground (`filled`), the way a console stamps a line.
 */
export function paintConsoleTag(opts: {
  ctx: ComponentCtx
  text: string
  x: number
  y: number
  ink: string
  ground: string
  filled?: boolean
  key?: string
}): React.ReactElement {
  const w = consoleTagWidth(opts.text)
  const words = opts.filled ? accessibleInk(opts.ground, opts.ink, CONSOLE_TAG.size) : accessibleInk(opts.ink, opts.ground, CONSOLE_TAG.size)
  return (
    <g key={opts.key} data-console-tag={opts.filled ? "filled" : ""}>
      {opts.filled ? (
        <rect x={opts.x} y={opts.y} width={w} height={CONSOLE_TAG.height} fill={opts.ink} />
      ) : (
        <rect x={opts.x + 0.5} y={opts.y + 0.5} width={w - 1} height={CONSOLE_TAG.height - 1} fill="none" stroke={opts.ink} strokeWidth={1} />
      )}
      <text
        {...CONSOLE_SPEC}
        x={opts.x + w / 2}
        y={centredBaseline(opts.y, CONSOLE_TAG.height, CONSOLE_TAG.size)}
        textAnchor="middle"
        fontFamily={opts.ctx.fonts.mono}
        fontSize={CONSOLE_TAG.size}
        fontWeight="700"
        fill={words}
        dominantBaseline="alphabetic"
      >
        {opts.text}
      </text>
    </g>
  )
}

/** A segmented meter: `total` cells of `cell` by `h`, `gap` apart, the first `filled` in `ink`, the rest in `rest`. */
export function paintMeter(opts: { x: number; y: number; filled: number; total: number; ink: string; rest: string; cell?: number; h?: number; gap?: number; key?: string }): React.ReactElement {
  const cell = opts.cell ?? 46
  const h = opts.h ?? 8
  const gap = opts.gap ?? 6
  return (
    <g key={opts.key} data-console-meter={`${opts.filled}/${opts.total}`}>
      {Array.from({ length: opts.total }, (_, i) => (
        <rect key={i} x={opts.x + i * (cell + gap)} y={opts.y} width={cell} height={h} fill={i < opts.filled ? opts.ink : opts.rest} />
      ))}
    </g>
  )
}

/**
 * A note written 「标签：说明」 or "Label: text" split at its first colon,
 * the label to head the note and the text under it. `null` label when the
 * note has no colon, or one longer than a label: past 16 Chinese characters
 * or 32 Latin ones.
 */
export function splitNote(text: string, maxLabel = 32): { label: string | null; text: string; glossBreak?: string } {
  const match = /^(.{1,40}?)\s*([：:])\s*(.+)$/su.exec(text.trim())
  const units = (s: string) => Array.from(stripEmphasis(s)).reduce((sum, char) => sum + (WIDE.test(char) ? 2 : 1), 0)
  if (!match || units(match[1]!) > maxLabel) return { label: null, text: text.trim() }
  return { label: match[1]!.trim(), text: match[3]!.trim(), glossBreak: match[2]! }
}

type Callout = Extract<Component, { type: "callout" }>

/** The icon a callout carries when its author gave it none. */
export const CALLOUT_ICON: Record<Callout["variant"], string> = { info: "info", tip: "lightbulb", warn: "triangle-alert" }

/**
 * How a note panel is dressed: a tip is the way forward, on the mark's tint
 * inside an edge of the mark; a warning sits on the surface inside an edge of
 * the warning ink, its icon and label in that ink; anything else is a plain
 * panel with its icon in the mark.
 */
export function noteDress(callout: Callout, inks: ConsoleInks): { fill: string; edge: string; ink: string } {
  if (callout.variant === "tip") return { fill: inks.tint, edge: inks.mark, ink: inks.mark }
  if (callout.variant === "warn") return { fill: inks.surface, edge: inks.warning, ink: inks.warning }
  return { fill: inks.surface, edge: inks.edge, ink: inks.mark }
}

/** Whether a note's text is a quoted line: it opens with a quotation mark, and a console sets it in mono. */
export function quotedNote(text: string): boolean {
  return /^["“'‘「『]/u.test(stripEmphasis(text).trimStart())
}

/** A note panel's measures: an icon and a mono label on one line, the text under them. */
export const NOTE_PANEL = {
  pad: 24,
  icon: { top: 20, size: 22 },
  label: { top: 18, box: 24, size: 14, gap: 10 },
  text: { top: 56, size: 17, lineHeight: 27 },
  foot: 18,
} as const

export interface FittedNotePanel {
  label: EmphasisHeadingLayout | null
  glossBreak?: string
  text: EmphasisHeadingLayout
  mono: boolean
  need: number
}

/** Fits a callout as a note panel `w` wide, its text in at most `maxLines`, or `null` when it does not fit. */
export function fitNotePanel(callout: Callout, w: number, ctx: ComponentCtx, maxLines: number): FittedNotePanel | null {
  const inner = w - NOTE_PANEL.pad * 2
  const split = splitNote(callout.text)
  const labelW = inner - NOTE_PANEL.icon.size - NOTE_PANEL.label.gap
  const label = split.label ? fitMono(split.label, { width: labelW, size: NOTE_PANEL.label.size, lineHeight: NOTE_PANEL.label.box, maxLines: 1 }) : null
  if (split.label && !label) return null
  const mono = quotedNote(split.text)
  const spec = { width: inner, size: NOTE_PANEL.text.size, lineHeight: NOTE_PANEL.text.lineHeight, maxLines }
  const text = mono ? fitMono(split.text, spec) : fitFixedBody(split.text, spec, ctx)
  if (!text) return null
  return { label, glossBreak: split.glossBreak, text, mono, need: NOTE_PANEL.text.top + text.lines.length * NOTE_PANEL.text.lineHeight + NOTE_PANEL.foot }
}

function fitFixedBody(text: string, spec: MonoSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(text, { width: spec.width, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines, fontFamily: ctx.fonts.body, bold: false })
}

/** Paints a fitted note panel in `box`. */
export function paintNotePanel(callout: Callout, f: FittedNotePanel, box: Box, ctx: ComponentCtx, attrs?: Record<string, unknown>): React.ReactElement {
  const inks = consoleInks(ctx)
  const dress = noteDress(callout, inks)
  const ground = dress.fill
  const x = box.x + NOTE_PANEL.pad
  const textY = baselineIn(box.y + (f.label ? NOTE_PANEL.text.top : NOTE_PANEL.label.top), NOTE_PANEL.text.lineHeight, NOTE_PANEL.text.size)
  const textInk = consoleText(inks.text, ground, NOTE_PANEL.text.size)
  return (
    <g data-console-note={callout.variant} {...attrs}>
      {paintPanel(box, dress.fill, dress.edge)}
      {paintIcon(callout.icon ?? CALLOUT_ICON[callout.variant], x, box.y + NOTE_PANEL.icon.top, NOTE_PANEL.icon.size, dress.ink, ground)}
      {f.label
        ? paintMono(f.label, {
            ctx,
            x: x + NOTE_PANEL.icon.size + NOTE_PANEL.label.gap,
            y: baselineIn(box.y + NOTE_PANEL.label.top, NOTE_PANEL.label.box, NOTE_PANEL.label.size),
            fill: consoleText(dress.ink, ground, NOTE_PANEL.label.size),
            ground,
            ...(f.glossBreak ? { lastAttrs: { "data-gloss-break": f.glossBreak } } : {}),
          })
        : null}
      {f.mono
        ? paintMono(f.text, { ctx, x, y: textY, fill: textInk, ground })
        : paintLines(f.text, { ctx, x, y: textY, fill: textInk, fontFamily: ctx.fonts.body, fontWeight: "400", bg: ground })}
    </g>
  )
}

/** A banner's measures: one row across, its icon at the left, its text centred on the row. */
export const BANNER = { pad: 24, icon: 24, gap: 12, size: 19, lineHeight: 28 } as const

/** Fits a callout as a banner `w` wide, in at most two lines, or `null`. */
export function fitBanner(callout: Callout, w: number, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(callout.text, { width: w - BANNER.pad * 2 - BANNER.icon - BANNER.gap, size: BANNER.size, lineHeight: BANNER.lineHeight, maxLines: 2, fontFamily: ctx.fonts.body, bold: false })
}

/** Paints a fitted banner in `box`, its icon and its lines centred on the row. */
export function paintBanner(callout: Callout, text: EmphasisHeadingLayout, box: Box, ctx: ComponentCtx, attrs?: Record<string, unknown>): React.ReactElement {
  const inks = consoleInks(ctx)
  const dress = noteDress(callout, inks)
  const ground = dress.fill
  const textX = box.x + BANNER.pad + BANNER.icon + BANNER.gap
  const first = Math.round(box.y + box.h / 2 - ((text.lines.length - 1) * BANNER.lineHeight) / 2 + BANNER.size * 0.385)
  return (
    <g data-console-banner={callout.variant} {...attrs}>
      {paintPanel(box, dress.fill, dress.edge)}
      {paintIcon(callout.icon ?? CALLOUT_ICON[callout.variant], box.x + BANNER.pad, box.y + (box.h - BANNER.icon) / 2, BANNER.icon, dress.ink, ground)}
      {paintLines(text, { ctx, x: textX, y: first, fill: consoleText(inks.text, ground, BANNER.size), fontFamily: ctx.fonts.body, fontWeight: "400", bg: ground })}
    </g>
  )
}
