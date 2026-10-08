import type React from "react"
import type { Course } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { inkToward } from "../../components/tag"
import { emphasisRunInk, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, contrastRatio, graphicInk, metaInk, readableOn } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { stageIndex } from "../../render/course-marks"
import { centredBaseline, fitFixed, paintLines } from "./type"

/*
 * The binder setting: a proposal handed to a client's management in a ring
 * binder. Settled on proposal's 2026-10 board
 * (`design/rounds/2026-10-06-proposal/`).
 *
 * White paper, cards of warm sand (the theme's surface) over no outline, the
 * petrol of the primary for titles, figures and the one dark block a page may
 * carry, a second petrol and a pale sky from the chart palette for bars and
 * steps, and the accent, a brick red, on one thing a page: the figure the
 * page lands on, the answer block, a chip, the box to tick. Words set on the
 * accent are in the text ink where it reads there and white where it does
 * not, which on the brick red is white. Small words in the accent take the
 * theme's emphasis ink, on proposal the brick red itself, which reads on the
 * paper and the sand. Down the right edge runs a column of binder tabs, one a
 * section of the proposal, the page's own sticking out in petrol.
 *
 * The board's small type (11 to 15px labels, chips, notes, the source and the
 * folio) is under the 16px floor and carries the `binder-spec` exemption the
 * L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme
 * can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const BINDER_SPEC = { "data-font-floor-exempt": "binder-spec" } as const

/** `BINDER_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function binderSmall(size: number): Record<string, string> {
  return size < 16 ? { ...BINDER_SPEC } : {}
}

export interface BinderInks {
  /** The paper: the page. */
  ground: string
  /** A card, warm sand. */
  card: string
  /** Petrol: titles, figures, a dark block, the lit tab. */
  deep: string
  /** The second petrol: bars, a peak step. */
  data: string
  /** The second petrol at a tint over the paper: a tip's bar, a quiet chip. */
  pale: string
  /** Sky: a reference bar, a flat step. */
  sky: string
  /** Sky at a tint over the paper: a valley step, a verdict chip. */
  skyPale: string
  /** Words. */
  ink: string
  /** Labels, notes, the source. */
  muted: string
  /** A figure that was: the muted ink lifted toward the paper. */
  fade: string
  /** Hairlines. Never words. */
  line: string
  /** A chip's outline: the hairline a step darker. */
  rule: string
  /** Ticks and a blank to fill: the hairline two steps darker. */
  tick: string
  /** The brick red: the accent. */
  fire: string
  /** Small words in the brick red: the theme's emphasis ink, on proposal the brick red itself. */
  fireText: string
  /** The brick red at a tint over the paper: a lead row. */
  firePale: string
  /** Words on the brick red: the text ink where it reads at 4.5, otherwise the readable ink, white on the brick red. */
  onFire: string
  /** Words on petrol and on a photograph darkened with it. */
  onDeep: string
  /** A lesson learned the hard way: the theme's danger ink. */
  danger: string
  /** A remedy: the theme's success ink. */
  success: string
}

/** #E4EDF2 on the board: the second petrol at 12% over the paper. */
const PALE_MIX = 0.12
/** #D6E6EF on the board: the sky at 36% over the paper. */
const SKY_PALE_MIX = 0.36
/** #8A949C on the board: the muted ink 28% of the way to the paper. */
const FADE_MIX = 0.28
/** The accent at 14% over the paper: #FDEBE2 under the board's tangerine, #F5E4E1 under the brick red. */
const FIRE_PALE_MIX = 0.14
/** #CFC8BC and #B9B3A8 on the board: the hairline toward the text ink. */
const RULE_MIX = 0.1
const TICK_MIX = 0.2

export function binderInks(ctx: ComponentCtx): BinderInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const line = colors.border ?? blendOver(colors.muted, ground, 0.25)
  const palette = colors.chartPalette
  const data = palette[0] ?? colors.primary
  const sky = palette[2] ?? blendOver(data, ground, 0.5)
  const fireText = emphasisRunInk(colors)
  return {
    ground,
    card: colors.surface,
    deep: colors.primary,
    data,
    pale: blendOver(data, ground, PALE_MIX),
    sky,
    skyPale: blendOver(sky, ground, SKY_PALE_MIX),
    ink: colors.text,
    muted: colors.muted,
    fade: blendOver(ground, colors.muted, FADE_MIX),
    line,
    rule: blendOver(colors.text, line, RULE_MIX),
    tick: blendOver(colors.text, line, TICK_MIX),
    fire: colors.accent,
    fireText: contrastRatio(fireText, ground) >= 4.5 ? fireText : inkToward(colors.accent, readableOn(ground), ground, 12),
    firePale: blendOver(colors.accent, ground, FIRE_PALE_MIX),
    onFire: contrastRatio(colors.text, colors.accent) >= 4.5 ? colors.text : readableOn(colors.accent),
    onDeep: readableOn(colors.primary),
    danger: colors.danger ?? colors.accent,
    success: colors.success ?? colors.primary,
  }
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink.
 */
export function binderText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a folio) held to the 3:1 a meta line needs. */
export function binderMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function binderBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface BinderTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size`, or `null` when it does not fit whole. */
export function fitBinder(text: string | undefined, spec: BinderTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
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
export function paintBinder(
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
    y: opts.baseline ?? binderBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize),
    fill: opts.fill,
    fontFamily: opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    runInk: opts.runInk,
    attrs: { ...binderSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text known to fit, centred in a `lineHeight` box whose top is `top`, or on `baseline`. */
export function paintBinderLine(
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
    italic?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string | number
  },
): React.ReactElement {
  const y = opts.baseline ?? binderBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...binderSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fontStyle={opts.italic ? "italic" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace={text.includes("  ") ? "preserve" : undefined}
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line at `size`. */
export function binderWidth(text: string, size: number, ctx: ComponentCtx, bold = false): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintBinderTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; bold?: boolean; anchor?: "start" | "middle" | "end"; attrs?: Record<string, string> }): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      {...binderSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.y}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
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

/** The tracked width of `text`, as `paintBinderTracked` sets it. */
export function binderTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return binderWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintBinderIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-binder-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Cards, chips and the lead ──────────────────────────────────────────

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A card's corner, the board's 12px. */
export const BINDER_CARD_R = 12

/** The edge a lead row carries (precedents, remedies): the bar's left side, `edge` px deep, following its rounded corners. */
export function edgePath(x: number, y: number, h: number, r: number, edge: number): string {
  return [
    `M ${x + r} ${y}`,
    `A ${r} ${r} 0 0 0 ${x} ${y + r}`,
    `L ${x} ${y + h - r}`,
    `A ${r} ${r} 0 0 0 ${x + r} ${y + h}`,
    `L ${x + r + edge} ${y + h}`,
    `A ${r} ${r} 0 0 1 ${x + edge} ${y + h - r}`,
    `L ${x + edge} ${y + r}`,
    `A ${r} ${r} 0 0 1 ${x + r + edge} ${y}`,
    "Z",
  ].join(" ")
}

/** A card: the surface, rounded 12px, no outline unless asked. */
export function paintBinderCard(
  box: Box,
  inks: BinderInks,
  opts: { fill?: string; r?: number; stroke?: string; strokeWidth?: number; dash?: string; key?: string | number; attrs?: Record<string, string> } = {},
): React.ReactElement {
  const sw = opts.stroke ? (opts.strokeWidth ?? 1) : 0
  // A stroke is drawn inside the card's box, as the board's border-box did.
  return (
    <rect
      key={opts.key}
      {...opts.attrs}
      x={box.x + sw / 2}
      y={box.y + sw / 2}
      width={box.w - sw}
      height={box.h - sw}
      rx={Math.max(0, (opts.r ?? BINDER_CARD_R) - sw / 2)}
      fill={opts.fill ?? inks.card}
      stroke={opts.stroke}
      strokeWidth={opts.stroke ? sw : undefined}
      strokeDasharray={opts.dash}
    />
  )
}

/**
 * The lead on a page. Every shape a composition paints in the brick red sits
 * inside one of these groups, so a test can find what the page lights.
 */
export function Lead({ id, children }: { id: string; children: React.ReactNode }): React.ReactElement {
  return <g data-binder-lead={id}>{children}</g>
}

export interface ChipStyle {
  /** The words' size. */
  size: number
  /** The chip's height. Its ends are fully round. */
  h: number
  /** The words' colour, before it is held to their size on the chip. */
  fg: string
  /** The chip's fill, or none for an outline. */
  bg?: string
  /** The outline, 1.5px, when the chip has one. */
  border?: string
  /** The outline dashed. */
  dash?: string
}

/** A chip's width: the words bold plus eleven pixels of air a side, as the board measured it. */
export function chipWidth(text: string, size: number, ctx: ComponentCtx): number {
  return Math.round(binderWidth(text, size, ctx, true) + 22)
}

/** A chip at `x`, `y`: a pill of `style.h`, its words bold and centred. Returns the shape and its width. */
export function paintChip(text: string, x: number, y: number, style: ChipStyle, ctx: ComponentCtx, inks: BinderInks, opts: { key?: string | number; attrs?: Record<string, string> } = {}): { node: React.ReactElement; w: number } {
  const words = stripEmphasis(text).trim()
  const w = chipWidth(words, style.size, ctx)
  const sw = style.border ? 1.5 : 0
  const ground = style.bg ?? inks.ground
  const node = (
    <g key={opts.key} data-binder-chip={words} {...opts.attrs}>
      <rect
        x={x + sw / 2}
        y={y + sw / 2}
        width={w - sw}
        height={style.h - sw}
        rx={(style.h - sw) / 2}
        fill={style.bg ?? "none"}
        stroke={style.border}
        strokeWidth={style.border ? sw : undefined}
        strokeDasharray={style.dash}
      />
      {paintBinderLine(words, { ctx, x: x + w / 2, top: y + sw, lineHeight: style.h - sw * 2, size: style.size, bold: true, anchor: "middle", fill: binderText(style.fg, ground, style.size) })}
    </g>
  )
  return { node, w }
}

/**
 * A photograph filling `box`, cropped to it, its top corners (or all four)
 * rounded `r` by small pieces of `ground` laid over them, so PowerPoint, which
 * keeps a picture square, shows the same rounded photograph the preview does.
 * The card's surface stands in where the deck has no such asset.
 */
export function paintBinderPhoto(assetId: string, box: Box, ctx: ComponentCtx, inks: BinderInks, opts: { r?: number; ground?: string; corners?: "top" | "all"; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  const r = opts.r ?? 0
  const ground = opts.ground ?? inks.ground
  const { x, y, w, h } = box
  if (!asset?.src) return <rect key={opts.key} data-binder-photo={assetId} x={x} y={y} width={w} height={h} fill={inks.card} />
  const top = [
    `M ${x} ${y} L ${x + r} ${y} A ${r} ${r} 0 0 0 ${x} ${y + r} Z`,
    `M ${x + w} ${y} L ${x + w} ${y + r} A ${r} ${r} 0 0 0 ${x + w - r} ${y} Z`,
  ]
  const bottom = [
    `M ${x + w} ${y + h} L ${x + w - r} ${y + h} A ${r} ${r} 0 0 0 ${x + w} ${y + h - r} Z`,
    `M ${x} ${y + h} L ${x} ${y + h - r} A ${r} ${r} 0 0 0 ${x + r} ${y + h} Z`,
  ]
  const corners = r > 0 ? (opts.corners === "all" ? [...top, ...bottom] : top) : []
  return (
    <g key={opts.key} data-binder-photo={assetId}>
      <image href={asset.src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" aria-label={asset.alt || undefined} />
      {corners.map((d, i) => (
        <path key={i} data-photo-corner="" d={d} fill={ground} />
      ))}
    </g>
  )
}

/** A box to tick, `size` square, rounded, outlined 2px in `stroke` over `fill`. */
export function paintCheckbox(x: number, y: number, size: number, stroke: string, fill: string, opts: { r?: number; key?: string | number } = {}): React.ReactElement {
  return <rect key={opts.key} data-binder-box="" x={x + 1} y={y + 1} width={size - 2} height={size - 2} rx={opts.r ?? 4} fill={fill} stroke={stroke} strokeWidth={2} />
}

// ── Reading the author's words ─────────────────────────────────────────

/**
 * Splits `text` at its first sentence end (「。」 or ". ") into the sentence
 * and the rest, with the end the author wrote, or `null` when it is one
 * sentence.
 */
export function splitSentence(text: string): { lead: string; sep: string; rest: string } | null {
  const m = /^(.+?)(。|\. )(.+)$/su.exec(text.trim())
  return m ? { lead: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/**
 * Splits `text` at its first colon (「：」 or ": ") into the name before it and
 * the rest, or `null` when it has none.
 */
export function splitName(text: string): { name: string; sep: string; rest: string } | null {
  const m = /^(.+?)(：|: )(.+)$/su.exec(text.trim())
  return m && m[1]!.trim() && m[3]!.trim() ? { name: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** Splits `text` at its first " · " into the name and what follows, or `null`. */
export function splitDot(text: string): { name: string; rest: string } | null {
  const at = text.indexOf(" · ")
  return at > 0 ? { name: text.slice(0, at).trim(), rest: text.slice(at + 3).trim() } : null
}

/**
 * Splits a trailing parenthetical off `text` (「约 0.76（示意）」, "0.76 (indicative)")
 * into the words and what the brackets hold, or `null` when it has none.
 */
export function splitAside(text: string): { main: string; aside: string; open: string; close: string } | null {
  const m = /^(.+?)\s*(（|\()([^（）()]+)(）|\))$/su.exec(text.trim())
  return m && m[1]!.trim() ? { main: m[1]!.trim(), open: m[2]!, aside: m[3]!.trim(), close: m[4]! } : null
}

/**
 * The space set between a bold lead and the words that run on after it on
 * its line: none after a Chinese character or full-width mark (「这些回收期都还
 * 没扣：」), a word space after anything else ("None of these paybacks deduct:").
 */
export function leadGap(lead: string): string {
  return /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef\u3000-\u303f]$/u.test(lead.trim()) ? "" : " "
}

/** The attribute that says a separator stood after this line: `data-gloss-break`. */
export function glossBreak(sep: string | undefined): Record<string, string> {
  return sep ? { "data-gloss-break": sep } : {}
}

/** Whether `text` is wholly marked, `**…**`: the cell or line the author lights. */
export function wholeMark(text: string): boolean {
  return /^\*\*[^*]+\*\*$/u.test(text.trim())
}

/** Whether `text` is a blank to fill: nothing but dashes and spaces (「— — —」). */
export function blankToFill(text: string): boolean {
  const t = text.trim()
  return t.length > 0 && /^[\s—–\-－]+$/u.test(t)
}

// ── The binder tabs ────────────────────────────────────────────────────

/**
 * The binder's index tabs down the right edge, one a stage of the deck's
 * `course`: from y118, 98px apart, 92px tall. The page's own stage sticks
 * out: 52px wide from x1228, petrol, its name at 15px bold in the readable
 * ink. The others sit back, 36px wide from x1244, the sand of a card (white
 * over a photograph), their names at 13px bold in the muted ink. A name in
 * Chinese stands one character under another with 6px between them; a name
 * in Latin letters is turned to read down the tab.
 */
export const TABS = {
  top: 118,
  pitch: 98,
  h: 92,
  right: 1280,
  lit: { w: 52, r: 8, size: 15 },
  idle: { w: 36, r: 6, size: 13 },
  tracking: 6,
  latinTracking: 1,
  max: 5,
} as const

const CJK = /[⺀-鿿豈-﫿＀-￯]/u

/** Whether a tab's name is set upright one character under another, rather than turned. */
export function tabUpright(label: string): boolean {
  return CJK.test(label)
}

/** The length a tab's name runs along its tab. */
export function tabRun(label: string, size: number, ctx: ComponentCtx): number {
  const text = label.trim()
  if (tabUpright(text)) {
    const n = Array.from(text).length
    return n * size + n * TABS.tracking
  }
  return binderTrackedWidth(text, size, TABS.latinTracking, ctx, true)
}

/** Whether every stage of `course` fits a tab: at most five, each name within its tab's length. */
export function tabsFit(course: Course, ctx: ComponentCtx): boolean {
  if (course.stages.length > TABS.max) return false
  return course.stages.every((stage) => tabRun(stage.label, TABS.lit.size, ctx) <= TABS.h - 12)
}

/** The tabs, the page's stage lit. `onPhoto` sets the others white over a photograph. */
export function BinderTabs({ course, stage, ctx, onPhoto = false }: { course: Course; stage: string; ctx: ComponentCtx; onPhoto?: boolean }): React.ReactElement | null {
  const inks = binderInks(ctx)
  const lit = stageIndex(course, stage)
  if (lit < 0) return null
  if (!tabsFit(course, ctx)) return <g data-dropped={course.stages.length} data-dropped-kind="label" />
  const idleFill = onPhoto ? blendOver("#FFFFFF", inks.deep, 0.86) : inks.card
  return (
    <g data-binder-tabs="">
      {course.stages.map((s, i) => {
        const on = i === lit
        const spec = on ? TABS.lit : TABS.idle
        const x = TABS.right - spec.w
        const y = TABS.top + i * TABS.pitch
        const fill = on ? inks.deep : idleFill
        const ink = on ? binderText(inks.onDeep, fill, spec.size) : binderText(inks.muted, fill, spec.size)
        const label = s.label.trim()
        const cx = x + spec.w / 2
        // Rounded only at the left: the tab runs on under the page's edge.
        const d = `M ${TABS.right} ${y} L ${x + spec.r} ${y} A ${spec.r} ${spec.r} 0 0 0 ${x} ${y + spec.r} L ${x} ${y + TABS.h - spec.r} A ${spec.r} ${spec.r} 0 0 0 ${x + spec.r} ${y + TABS.h} L ${TABS.right} ${y + TABS.h} Z`
        return (
          <g key={i} data-binder-tab={label} data-binder-tab-lit={on ? "1" : undefined}>
            <path d={d} fill={fill} />
            {tabUpright(label) ? (
              <TabUpright label={label} cx={cx} top={y} size={spec.size} fill={ink} ctx={ctx} />
            ) : (
              <TabTurned label={label} cx={cx} top={y} size={spec.size} fill={ink} ctx={ctx} />
            )}
          </g>
        )
      })}
    </g>
  )
}

/**
 * A Chinese tab name, one character under the next with the board's 6px
 * between them, centred on the tab the way the board's vertical writing set
 * it: the space after the last character counts toward the run.
 */
function TabUpright({ label, cx, top, size, fill, ctx }: { label: string; cx: number; top: number; size: number; fill: string; ctx: ComponentCtx }): React.ReactElement {
  const chars = Array.from(label)
  const step = size + TABS.tracking
  const first = top + (TABS.h - chars.length * step) / 2
  return (
    <g data-binder-tab-name={label}>
      {chars.map((ch, i) => (
        <text
          key={i}
          {...binderSmall(size)}
          {...(i < chars.length - 1 ? { "data-joins-next": "" } : {})}
          x={cx}
          y={Math.round((first + i * step + size * 0.88) * 100) / 100}
          textAnchor="middle"
          fontFamily={ctx.fonts.heading}
          fontSize={size}
          fontWeight="700"
          fill={fill}
          dominantBaseline="alphabetic"
        >
          {ch}
        </text>
      ))}
    </g>
  )
}

/** A Latin tab name, turned a quarter clockwise to read down the tab, centred on it. */
function TabTurned({ label, cx, top, size, fill, ctx }: { label: string; cx: number; top: number; size: number; fill: string; ctx: ComponentCtx }): React.ReactElement {
  const cy = top + TABS.h / 2
  // Turned clockwise, the baseline runs down the tab at the side away from the page.
  const baselineX = cx - size * 0.35
  return (
    <g data-binder-tab-name={label} transform={`rotate(90 ${baselineX} ${cy})`}>
      {paintBinderTracked({ ctx, text: label, x: baselineX, y: cy, size, tracking: TABS.latinTracking, bold: true, anchor: "middle", fill })}
    </g>
  )
}
