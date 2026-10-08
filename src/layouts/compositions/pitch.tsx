import type React from "react"
import type { Course } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { coursePillWidth, COURSE_STRIP, stageIndex } from "../../render/course-marks"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, graphicInk, metaInk, readableOn } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { centredBaseline, fitFixed, paintLines } from "./type"

/*
 * The pitch setting: a founder on a dark stage asking a room for money or
 * belief. Settled on ember's 2026-10 board (`design/rounds/2026-10-06-ember/`).
 *
 * The page is one beat of a pitch. The ground is the stage (the theme's
 * page colour, charcoal on ember), cards a step lighter (its surface), words
 * in the ivory of its text and the warm grey of its muted ink. The theme's
 * accent is the one light on stage, and it lights one thing a page: a wedge
 * in the corner, the figure the page is about, the conclusion bar, the
 * button. Words on it are set in the dark ink that reads on it. Everything
 * else that has to be told apart steps down from the hairline toward the
 * ground (the grid, a track, the funnel's middle band) or takes the
 * palette's quietest ink (a bar that is not the page's).
 *
 * At the top of every page but the cover the pitch's running order (the
 * deck's `course`) as a rail of words, the page's own beat (`stage`) in the
 * ivory, bold, underlined, the rest in a dimmed grey.
 *
 * The board's small type (12 to 15px labels, the rail, notes, the source and
 * the folio) is under the 16px floor and carries the `pitch-spec` exemption
 * the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const PITCH_SPEC = { "data-font-floor-exempt": "pitch-spec" } as const

/** `PITCH_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function pitchSmall(size: number): Record<string, string> {
  return size < 16 ? { ...PITCH_SPEC } : {}
}

export interface PitchInks {
  /** The stage: the page. */
  ground: string
  /** A card, a step lighter than the stage. */
  card: string
  /** Words. */
  ink: string
  /** Labels, notes, sources: the warm grey. */
  muted: string
  /** Hairlines and the outlines of a frame. Never words. */
  line: string
  /** What sits furthest back: a grid's lines, a track, a row's separator. The hairline toward the stage. */
  dim: string
  /** A band one step up from the dim, such as the funnel's middle level. */
  deep: string
  /** The one light on stage: the theme's accent. */
  fire: string
  /** Words on the light: the dark ink that reads on it. */
  onFire: string
  /** A bar or a level that is not the page's: the palette's quietest ink. */
  quiet: string
  /** The rail's other beats: the warm grey dimmed as far as small words still read. */
  rail: string
}

/** The dim #4A3B30: the hairline over the stage at 54%. */
const DIM_MIX = 0.54
/** The deep band #5A4638: the hairline over the stage at 73%. */
const DEEP_MIX = 0.73
/** The rail's other beats #8C7A68 on the board: the warm grey over the stage at 65%, lifted until 12px reads. */
const RAIL_MIX = 0.65

function quieterInks(ctx: ComponentCtx): string[] {
  const { colors } = ctx
  const taken = new Set([colors.primary, colors.accent, colors.emphasisInk].filter((c): c is string => Boolean(c)).map((c) => c.toUpperCase()))
  return colors.chartPalette.filter((c) => !taken.has(c.toUpperCase()))
}

export function pitchInks(ctx: ComponentCtx): PitchInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const line = colors.border ?? blendOver(colors.muted, ground, 0.35)
  const quiet = quieterInks(ctx)
  return {
    ground,
    card: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    line,
    dim: blendOver(line, ground, DIM_MIX),
    deep: blendOver(line, ground, DEEP_MIX),
    fire: colors.accent,
    onFire: readableOn(colors.accent),
    quiet: quiet[quiet.length - 1] ?? colors.muted,
    rail: inkToward(blendOver(colors.muted, ground, RAIL_MIX), colors.muted, ground, RAIL.size),
  }
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink.
 */
export function pitchText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a folio) held to the 3:1 a meta line needs. */
export function pitchMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function pitchBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface PitchTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitPitch(text: string | undefined, spec: PitchTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  return fitFixed(text, {
    width: spec.width,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: spec.bold ? ctx.fonts.heading : ctx.fonts.body,
    bold: spec.bold === true,
  })
}

/** Paints a fitted block whose first line box starts at `top`, one `<text>` per line. */
export function paintPitch(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    top?: number
    baseline?: number
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    ground?: string
    runInk?: string
    attrs?: Record<string, string>
    lastAttrs?: Record<string, string>
  },
): React.ReactNode {
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: opts.baseline ?? pitchBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize),
    fill: opts.fill,
    fontFamily: opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    runInk: opts.runInk,
    attrs: { ...pitchSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text known to fit, centred in a `lineHeight` box whose top is `top`, or on `baseline`. */
export function paintPitchLine(
  text: string,
  opts: {
    ctx: ComponentCtx
    x: number
    size: number
    fill: string
    top?: number
    lineHeight?: number
    baseline?: number
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string | number
  },
): React.ReactElement {
  const y = opts.baseline ?? pitchBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...pitchSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={text.includes("  ") ? "preserve" : undefined}
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line at `size`. */
export function pitchWidth(text: string, size: number, ctx: ComponentCtx, bold = false): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintPitchTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; bold?: boolean; attrs?: Record<string, string> }): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      {...pitchSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
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

/** The tracked width of `text`, as `paintPitchTracked` sets it. */
export function pitchTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return pitchWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintPitchIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-pitch-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Cards, the wedge and the light ─────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A card's corner, the board's 4px. */
export const PITCH_CARD_R = 4

/** A card: the surface, rounded 4px, no outline. */
export function paintPitchCard(box: Box, inks: PitchInks, opts: { fill?: string; r?: number; key?: string | number; attrs?: Record<string, string> } = {}): React.ReactElement {
  return <rect key={opts.key} {...opts.attrs} x={box.x} y={box.y} width={box.w} height={box.h} rx={opts.r ?? PITCH_CARD_R} fill={opts.fill ?? inks.card} />
}

/**
 * The one light on a page. Every shape a composition paints in the fire
 * sits inside one of these groups, so a test can hold the page to the
 * board's rule: the light falls on one thing.
 */
export function Fire({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  return <g data-pitch-fire={id}>{children}</g>
}

/** The wedge: a right triangle of the fire in the top left corner, `size` along each leg. */
export function paintWedge(size: number, inks: PitchInks): React.ReactElement {
  return (
    <Fire id="wedge">
      <polygon data-pitch-wedge="" points={`0,0 ${size},0 0,${size}`} fill={inks.fire} />
    </Fire>
  )
}

// ── The rail ───────────────────────────────────────────────────────────

/**
 * The pitch's running order as a rail of words ending at `right`: 12px words
 * in boxes 20px tall, five pixels of air at each end of a word, fourteen
 * between them. The page's own beat in the ivory, bold, a 2px underline in
 * the ivory two pixels under its box; the rest in the rail's dimmed grey.
 * A word's box is as wide as the word set bold, so the rail does not move
 * between pages. It is never wider than the strip of pills validate
 * measures (`COURSE_STRIP`).
 */
export const RAIL = { size: 12, height: 20, pad: 5, gap: 14, underline: { gap: 2, h: 2 } } as const

function railWidth(label: string, ctx: ComponentCtx): number {
  // The strip validate measures gives each stage ten pixels of air a side
  // and four between; the rail gives five a side and fourteen between, so
  // its run is never longer than the one validate let through.
  return coursePillWidth(label, ctx.fonts.body) - (COURSE_STRIP.padX - RAIL.pad) * 2
}

/** Where the rail starts, so a label at the left keeps clear of it. */
export function railLeft(course: Course, ctx: ComponentCtx, right: number): number {
  const widths = course.stages.map((s) => railWidth(s.label, ctx))
  return right - (widths.reduce((a, b) => a + b, 0) + RAIL.gap * (widths.length - 1))
}

export function PitchRail({ course, stage, ctx, right, top }: { course: Course; stage: string; ctx: ComponentCtx; right: number; top: number }): React.ReactElement {
  const inks = pitchInks(ctx)
  const lit = stageIndex(course, stage)
  let x = railLeft(course, ctx, right)
  return (
    <g data-pitch-rail="">
      {course.stages.map((s, i) => {
        const w = railWidth(s.label, ctx)
        const at = x
        x += w + RAIL.gap
        const on = i === lit
        const label = s.label.trim()
        return (
          <g key={i} data-stage={label} data-stage-lit={on ? "1" : undefined}>
            {paintPitchLine(label, {
              ctx,
              x: at + w / 2,
              top,
              lineHeight: RAIL.height,
              size: RAIL.size,
              bold: on,
              anchor: "middle",
              fill: on ? pitchText(inks.ink, inks.ground, RAIL.size) : inks.rail,
            })}
            {on ? <rect x={at} y={top + RAIL.height + RAIL.underline.gap} width={w} height={RAIL.underline.h} fill={inks.ink} /> : null}
          </g>
        )
      })}
    </g>
  )
}

// ── Photographs ────────────────────────────────────────────────────────

/**
 * A photograph filling `box`, cropped to it, square at its corners. The
 * card's surface stands in where the deck has no such asset.
 */
export function paintPitchPhoto(assetId: string, box: Box, ctx: ComponentCtx, inks: PitchInks, opts: { key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  return asset?.src ? (
    <image key={opts.key} data-pitch-photo="" href={asset.src} x={box.x} y={box.y} width={box.w} height={box.h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
  ) : (
    <rect key={opts.key} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.card} />
  )
}

/**
 * The stage's darkness laid over a photograph: one linear gradient in the
 * page colour, its stops' opacities as the board gave them, along `axis`
 * (`"x"` from the left edge, `"y"` up from the foot). The export writes it as
 * one gradient fill with its alphas, so PowerPoint keeps it one shape.
 */
export function PitchScrim({ id, ink, axis, stops }: { id: string; ink: string; axis: "x" | "y"; stops: readonly { offset: string; opacity: number }[] }): React.ReactElement {
  return (
    <g data-pitch-scrim="">
      <defs>
        <linearGradient id={id} x1={0} y1={axis === "y" ? 1 : 0} x2={axis === "x" ? 1 : 0} y2={0}>
          {stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={ink} stopOpacity={stop.opacity} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={1280} height={720} fill={`url(#${id})`} />
    </g>
  )
}

/** Chinese numerals are not this setting's: items are counted 1, 2, 3 in every deck. */
export function pitchNumeral(i: number): string {
  return String(i + 1)
}

/**
 * Splits `text` at its first sentence end (「。」 or ". ") into the sentence
 * and the rest, with the end the author wrote, or `null` when it is one
 * sentence. A composition that sets the two apart prints no end and says so
 * on the sentence's last line (`data-gloss-break`), so a reader of the page
 * reads it back where it stood.
 */
export function splitSentence(text: string): { lead: string; sep: string; rest: string } | null {
  const m = /^(.+?)(。|\. )(.+)$/su.exec(text.trim())
  return m ? { lead: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** The attribute that says a separator stood after this line: `data-gloss-break`. */
export function glossBreak(sep: string | undefined): Record<string, string> {
  return sep ? { "data-gloss-break": sep } : {}
}
