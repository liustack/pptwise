import type React from "react"
import type { Course } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { inkToward, type Tag } from "../../components/tag"
import { coursePillWidth, COURSE_STRIP, stageIndex } from "../../render/course-marks"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { Icon } from "../../render/icons"
import { blendOver, contrastRatio, graphicInk, metaInk, readableOn, requiredContrastRatio, resolveSemanticColor } from "../../render/ink"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { centredBaseline, fitFixed, paintLines } from "./type"

/*
 * The lesson setting: a class taught from a handout, the way a training
 * team runs one session for the whole company. Settled on homeroom's 2026-10
 * board (`design/rounds/2026-10-06-homeroom/`).
 *
 * The page is one step of a lesson. Cards are the handout's paper, the
 * surface over a 1px hairline rounded 10px, their icons in the mark (the
 * theme's primary, misty blue on homeroom); a card a page is about takes a
 * 4px edge of the correcting pen (the accent). The pen is the teacher's red:
 * a wavy line under the claim, the numbers of the questions, the stamp on an
 * answer, what a page is about. The board is the primary darkened, a strip
 * of wood under it, chalk-pale words on it. Questions are set on ruled paper
 * with a red margin, notes on a slightly turned sticky note, and every study
 * says what kind of study it is in a small pill: a journal's in the success
 * ink, a working paper's or a vendor's in the warning ink, a law's in the pen.
 *
 * The board's small type (12 to 15px labels, pills, notes, the running head,
 * the folio and the source) is under the 16px floor and carries the
 * `lesson-spec` exemption the L1 audit knows.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme can
 * set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const LESSON_SPEC = { "data-font-floor-exempt": "lesson-spec" } as const

/** `LESSON_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function lessonSmall(size: number): Record<string, string> {
  return size < 16 ? { ...LESSON_SPEC } : {}
}

export interface LessonInks {
  /** The page. */
  ground: string
  /** A card's face, the handout's paper. */
  paper: string
  /** Words. */
  ink: string
  /** Labels, notes, sources. */
  muted: string
  /** Hairlines and card edges. Never words. */
  line: string
  /** The course, labels over a section, icons, the plain pill: the theme's primary. */
  mark: string
  /** The correcting pen: the wavy line, question numbers, stamps, what a page is about. */
  pen: string
  danger: string
  warning: string
  success: string
  /** The palette's first quieter ink: a closing stage, a third tier. */
  quiet: string
  /** What a page reads against: an unmarked bar, a stage the page is not in. */
  ghost: string
  /** The mark over the paper at 15%: a tip's box, an icon's disc, a range's track. */
  tint: string
  /** The pen over the paper at 18%: the reach of a range. */
  penTint: string
  /** A ruled card's lines. */
  rule: string
  /** A ruled card's margin, the pen gone pale. */
  margin: string
  /** The blackboard: the primary darkened. */
  board: string
  /** Pale words on the board. */
  chalk: string
  /** The pen in chalk: a wavy line on the board. */
  chalkPen: string
  /** The board's frame and the ledge under a band of board. */
  wood: string
  /** A sticky note. */
  note: string
}

/** The board #3E5A74: the primary toward black by 16%, and further where white words would not read on it. */
const BOARD_SHADE = 0.16
/** The chalk #D7E2EA: white over the board at 82%. */
const CHALK_MIX = 0.82
/** The chalk pen #E7B9AF: white over the pen at 55%. */
const CHALK_PEN_MIX = 0.55
/** The tint #DCE5EC: the mark over the paper at 15%. */
const TINT_MIX = 0.15
/** The pen's tint #F3E3DF: the pen over the paper at 18%. */
const PEN_TINT_MIX = 0.18
/** The ghost #B9C4CC: the mark and the muted ink, half and half, over the page at 33%. */
const GHOST_MIX = 0.33
/** The ruled lines #E3E9EE: the hairline over the paper at 55%. */
const RULE_MIX = 0.55
/** The margin #E8C9C2: the pen over the paper at 33%. */
const MARGIN_MIX = 0.33
/** The wood #8E7A5E: the warning ink and the ghost half and half, 15% toward black. */
const WOOD_SHADE = 0.15
/** The sticky note #FBF3D9: the warning ink's hue and saturation at 92% lightness. */
const NOTE_LIGHTNESS = 0.92

function quieterInks(ctx: ComponentCtx): string[] {
  const { colors } = ctx
  const taken = new Set([colors.primary, colors.accent, colors.emphasisInk].filter((c): c is string => Boolean(c)).map((c) => c.toUpperCase()))
  return colors.chartPalette.filter((c) => !taken.has(c.toUpperCase()))
}

/**
 * `hex` at lightness `l` (0 to 1) with its hue and saturation kept: a pale
 * paper of the same colour, where a blend toward white would grey it.
 */
export function atLightness(hex: string, l: number): string {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex)
  if (!m) return hex
  const [r, g, b] = [m[1], m[2], m[3]].map((c) => parseInt(c!, 16) / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l0 = (max + min) / 2
  const d = max - min
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l0 - 1))
  let h = 0
  if (d !== 0) h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const [r1, g1, b1] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x]
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v + l - c / 2)) * 255).toString(16).padStart(2, "0")
  return `#${to(r1)}${to(g1)}${to(b1)}`.toUpperCase()
}

export function lessonInks(ctx: ComponentCtx): LessonInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const warning = resolveSemanticColor("warning", colors)
  // Darker still where white words at the board's smallest size would not read on it.
  const board = fillUnderWhite(blendOver("#000000", colors.primary, BOARD_SHADE), 14)
  const ghost = blendOver(blendOver(colors.primary, colors.muted, 0.5), ground, GHOST_MIX)
  const line = colors.border ?? blendOver(colors.muted, ground, 0.2)
  return {
    ground,
    paper: colors.surface,
    ink: colors.text,
    muted: colors.muted,
    line,
    mark: colors.primary,
    pen: colors.accent,
    danger: resolveSemanticColor("danger", colors),
    warning,
    success: resolveSemanticColor("success", colors),
    quiet: quieterInks(ctx)[0] ?? colors.muted,
    ghost,
    tint: blendOver(colors.primary, colors.surface, TINT_MIX),
    penTint: blendOver(colors.accent, colors.surface, PEN_TINT_MIX),
    rule: blendOver(line, colors.surface, RULE_MIX),
    margin: blendOver(colors.accent, colors.surface, MARGIN_MIX),
    board,
    chalk: blendOver("#FFFFFF", board, CHALK_MIX),
    chalkPen: blendOver("#FFFFFF", colors.accent, CHALK_PEN_MIX),
    wood: blendOver("#000000", blendOver(warning, ghost, 0.5), WOOD_SHADE),
    note: atLightness(warning, NOTE_LIGHTNESS),
  }
}

/**
 * `ink` held to the contrast `size` needs on `ground`: the ink itself where
 * it reads, otherwise the least step of it toward the readable ink, so the
 * pen's red too light for small words prints a darker red rather than black.
 */
export function lessonText(ink: string, ground: string, size: number): string {
  return inkToward(ink, readableOn(ground), ground, size)
}

/** Quiet text (a source, a folio) held to the 3:1 a meta line needs. */
export function lessonMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The baseline of a `size` line in a `lineHeight` box whose top is `top`, as the board's browser set it. */
export function lessonBaseline(top: number, lineHeight: number, size: number): number {
  return centredBaseline(top, lineHeight, size)
}

export interface LessonTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  bold?: boolean
}

/** `text` set at exactly `spec.size` in the body face, or `null` when it does not fit whole. */
export function fitLesson(text: string | undefined, spec: LessonTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
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
export function paintLesson(
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
    y: opts.baseline ?? lessonBaseline(opts.top ?? 0, layout.lineHeight, layout.fontSize),
    fill: opts.fill,
    fontFamily: opts.bold ? opts.ctx.fonts.heading : opts.ctx.fonts.body,
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    runInk: opts.runInk,
    attrs: { ...lessonSmall(layout.fontSize), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text known to fit, centred in a `lineHeight` box whose top is `top`, or on `baseline`. */
export function paintLessonLine(
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
  const y = opts.baseline ?? lessonBaseline(opts.top ?? 0, opts.lineHeight ?? opts.size, opts.size)
  return (
    <text
      key={opts.key}
      {...lessonSmall(opts.size)}
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
export function lessonWidth(text: string, size: number, ctx: ComponentCtx, bold = false): number {
  return measureTextUnits(stripEmphasis(text), { fontFamily: bold ? ctx.fonts.heading : ctx.fonts.body, bold }) * size
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing.
 */
export function paintLessonTracked(opts: { ctx: ComponentCtx; text: string; x: number; y: number; size: number; tracking: number; fill: string; bold?: boolean; attrs?: Record<string, string> }): React.ReactElement {
  const chars = Array.from(opts.text)
  return (
    <text
      {...lessonSmall(opts.size)}
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

/** The tracked width of `text`, as `paintLessonTracked` sets it. */
export function lessonTrackedWidth(text: string, size: number, tracking: number, ctx: ComponentCtx, bold = false): number {
  return lessonWidth(text, size, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

/** An icon of `size` at `x`, `y` in `color`, held to a graphic's 3:1 on `ground`. */
export function paintLessonIcon(name: string, x: number, y: number, size: number, color: string, ground: string, opts: { key?: string | number } = {}): React.ReactElement {
  return (
    <g key={opts.key} data-lesson-icon={name}>
      <Icon name={name} x={x} y={y} size={size} color={graphicInk(color, ground)} />
    </g>
  )
}

// ── Cards, boxes and pills ─────────────────────────────────────────────

/** A card's corner, the board's 10px. */
export const LESSON_CARD_R = 10

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

/** A card: the paper inside a 1px hairline, rounded 10px. */
export function paintLessonCard(box: Box, inks: LessonInks, opts: { fill?: string; stroke?: string; r?: number; key?: string | number; attrs?: Record<string, string> } = {}): React.ReactElement {
  return (
    <rect
      key={opts.key}
      {...opts.attrs}
      x={box.x + 0.5}
      y={box.y + 0.5}
      width={box.w - 1}
      height={box.h - 1}
      rx={opts.r ?? LESSON_CARD_R}
      fill={opts.fill ?? inks.paper}
      stroke={opts.stroke ?? inks.line}
      strokeWidth={1}
    />
  )
}

/**
 * A 4px edge along a card's top, following its rounded corners down into
 * the hairline, the board's `border-top: 4px`; or along its left side
 * (`side: "left"`), the board's `border-left: 4px`.
 */
export function paintLessonEdge(box: Box, color: string, opts: { side?: "top" | "left"; width?: number; r?: number; key?: string | number } = {}): React.ReactElement {
  const t = (opts.width ?? 4) / 2
  const r = Math.max(0, (opts.r ?? LESSON_CARD_R) - t)
  if (opts.side === "left") {
    const x = box.x + t
    const y0 = box.y + t
    const y1 = box.y + box.h - t
    return (
      <path
        key={opts.key}
        data-lesson-edge="left"
        d={`M ${x + r} ${y0} A ${r} ${r} 0 0 0 ${x} ${y0 + r} L ${x} ${y1 - r} A ${r} ${r} 0 0 0 ${x + r} ${y1}`}
        fill="none"
        stroke={color}
        strokeWidth={opts.width ?? 4}
      />
    )
  }
  const x0 = box.x + t
  const x1 = box.x + box.w - t
  const y = box.y + t
  return (
    <path
      key={opts.key}
      data-lesson-edge="top"
      d={`M ${x0} ${y + r} A ${r} ${r} 0 0 1 ${x0 + r} ${y} L ${x1 - r} ${y} A ${r} ${r} 0 0 1 ${x1} ${y + r}`}
      fill="none"
      stroke={color}
      strokeWidth={opts.width ?? 4}
    />
  )
}

/**
 * The pill: a few words in bold 12px inside a 1px outline 22px tall,
 * rounded 4px, the board's tag. Its ink says what it marks: a law in the
 * pen; a study a journal has published, a label, an official file or a
 * registry in the success ink; a working paper, a vendor's or a company's
 * own figures, a draft or a press report in the warning ink; a tone in its
 * own ink; a quiet tag in the muted ink; any other in the mark.
 */
export const PILL = { size: 12, height: 22, padX: 10, r: 4 } as const

/** The dash of a pill whose basis is not settled yet: an estimate, a pending figure, a proposal. */
export const PILL_DASH = "3 2"

export function pillWidth(text: string, ctx: ComponentCtx): number {
  return Math.ceil(lessonWidth(text, PILL.size, ctx, true)) + PILL.padX * 2
}

export function pillInk(tag: Tag, inks: LessonInks): string {
  if (tag.tone) return inks[tag.tone]
  if (tag.basis === "law") return inks.pen
  if (tag.basis !== undefined) return inks.warning
  switch (tag.evidence) {
    case "trial":
    case "label":
    case "official":
    case "registry":
      return inks.success
    case "preprint":
    case "company":
    case "draft":
    case "press":
      return inks.warning
    case undefined:
      return tag.quiet ? inks.muted : inks.mark
  }
}

export function paintPill(opts: { ctx: ComponentCtx; tag: Tag; x: number; y: number; ground: string; inks: LessonInks; key?: string | number }): React.ReactElement {
  const ink = pillInk(opts.tag, opts.inks)
  const text = opts.tag.text.trim()
  const w = pillWidth(text, opts.ctx)
  const dashed = opts.tag.basis !== undefined && opts.tag.basis !== "law"
  return (
    <g key={opts.key} data-lesson-pill={opts.tag.basis ?? opts.tag.evidence ?? ""}>
      <rect
        x={opts.x + 0.5}
        y={opts.y + 0.5}
        width={w - 1}
        height={PILL.height - 1}
        rx={PILL.r}
        fill="none"
        stroke={graphicInk(ink, opts.ground)}
        strokeWidth={1}
        strokeDasharray={dashed ? PILL_DASH : undefined}
      />
      {paintLessonLine(text, {
        ctx: opts.ctx,
        x: opts.x + w / 2,
        top: opts.y,
        lineHeight: PILL.height,
        size: PILL.size,
        bold: true,
        anchor: "middle",
        fill: lessonText(ink, opts.ground, PILL.size),
      })}
    </g>
  )
}

/** A box to tick: an empty rounded square outlined in the mark on the paper. */
export function paintCheckbox(x: number, y: number, size: number, inks: LessonInks, ground: string, opts: { key?: string | number; stroke?: number } = {}): React.ReactElement {
  const sw = opts.stroke ?? 2
  return (
    <rect
      key={opts.key}
      data-lesson-checkbox=""
      x={x + sw / 2}
      y={y + sw / 2}
      width={size - sw}
      height={size - sw}
      rx={size >= 24 ? 4 : 3}
      fill={inks.paper}
      stroke={graphicInk(inks.mark, ground)}
      strokeWidth={sw}
    />
  )
}

/**
 * The pen's wavy line: quarter waves 12px long, 4px up and down, from `x`
 * across `w` on `y`, the way a teacher underlines what matters. Under every
 * claim at 108px, under the board's marked words in chalk.
 */
export function squigglePath(x: number, y: number, w: number): string {
  const n = Math.floor(w / 12)
  let d = `M ${x} ${y}`
  for (let i = 0; i < n; i++) {
    const x0 = x + i * 12
    d += ` Q ${x0 + 6} ${y + (i % 2 === 0 ? -4 : 4)} ${x0 + 12} ${y}`
  }
  return d
}

export function Squiggle({ x, y, w, color, width = 2.5 }: { x: number; y: number; w: number; color: string; width?: number }): React.ReactElement {
  return <path data-lesson-squiggle="" d={squigglePath(x, y, w)} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" />
}

// ── The course strip ───────────────────────────────────────────────────

/**
 * The course a lesson runs through, as a row of pills ending at `right` on
 * the line whose top is `top`: every stage in the deck's `course`, the
 * page's own (`stage`) filled in the mark with its name bold in the
 * readable ink, the others outlined in the ghost with their names in the
 * muted ink, a quiz stage dashed. Its geometry is `COURSE_STRIP`, the one
 * validate measures.
 */
export function CourseStrip({ course, stage, ctx, right, top }: { course: Course; stage: string; ctx: ComponentCtx; right: number; top: number }): React.ReactElement {
  const inks = lessonInks(ctx)
  const widths = course.stages.map((s) => coursePillWidth(s.label, ctx.fonts.body))
  const total = widths.reduce((a, b) => a + b, 0) + COURSE_STRIP.gap * (widths.length - 1)
  const lit = stageIndex(course, stage)
  const r = COURSE_STRIP.height / 2
  let x = right - total
  return (
    <g data-lesson-course="">
      {course.stages.map((s, i) => {
        const w = widths[i]!
        const on = i === lit
        const at = x
        x += w + COURSE_STRIP.gap
        const label = s.label.trim()
        return (
          <g key={i} data-stage={label} data-stage-lit={on ? "1" : undefined} data-stage-quiz={s.quiz ? "1" : undefined}>
            <rect
              x={at + 0.5}
              y={top + 0.5}
              width={w - 1}
              height={COURSE_STRIP.height - 1}
              rx={r - 0.5}
              fill={on ? inks.mark : "none"}
              stroke={on ? inks.mark : inks.ghost}
              strokeWidth={1}
              strokeDasharray={s.quiz && !on ? PILL_DASH : undefined}
            />
            {paintLessonLine(label, {
              ctx,
              x: at + w / 2,
              top,
              lineHeight: COURSE_STRIP.height,
              size: COURSE_STRIP.size,
              bold: on,
              anchor: "middle",
              fill: on ? lessonText(readableOn(inks.mark), inks.mark, COURSE_STRIP.size) : lessonText(inks.muted, inks.ground, COURSE_STRIP.size),
            })}
          </g>
        )
      })}
    </g>
  )
}

/** Where the strip starts, so a label at the left keeps clear of it. */
export function courseStripLeft(course: Course, ctx: ComponentCtx, right: number): number {
  const widths = course.stages.map((s) => coursePillWidth(s.label, ctx.fonts.body))
  return right - (widths.reduce((a, b) => a + b, 0) + COURSE_STRIP.gap * (widths.length - 1))
}

// ── Board, paper and notes ─────────────────────────────────────────────

/** The blackboard: the board ink inside a frame of wood `frame` px wide, rounded `r`. */
export function paintBoard(box: Box, inks: LessonInks, opts: { frame?: number; r?: number } = {}): React.ReactElement {
  const frame = opts.frame ?? 8
  const r = opts.r ?? 6
  return (
    <g data-lesson-board="">
      <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={r} fill={inks.wood} />
      <rect x={box.x + frame} y={box.y + frame} width={box.w - frame * 2} height={box.h - frame * 2} rx={Math.max(0, r - frame / 2)} fill={inks.board} />
    </g>
  )
}

/** The clearance the design brief keeps between any rule and a line of text. */
export const RULE_CLEAR = 4

/**
 * How far a line of writing's ink reaches from its baseline, as a share of
 * its size: a CJK character or a capital above, a descender below.
 */
const INK_REACH = { above: 0.88, below: 0.25 } as const

/** A line of writing on ruled paper: where its baseline sits and its size. */
export interface WrittenLine {
  baseline: number
  size: number
}

/** The lines of a block `paintLesson` sets with its first line box at `top`. */
export function writtenLines(layout: EmphasisHeadingLayout, top: number): WrittenLine[] {
  const first = lessonBaseline(top, layout.lineHeight, layout.fontSize)
  return layout.lines.map((_, i) => ({ baseline: first + i * layout.lineHeight, size: layout.fontSize }))
}

/** The first rule under `lines` (the first line of writing on the card): clear of the lowest descender by `RULE_CLEAR`. */
export function ruleUnder(lines: readonly WrittenLine[]): number {
  return Math.ceil(Math.max(...lines.map((l) => l.baseline + INK_REACH.below * l.size)) + RULE_CLEAR)
}

/**
 * Where ruled paper's rules fall: every `gap` px from `first` down to 6px
 * short of the paper's foot, leaving out a rule that would pass through a line
 * of `writing` or within `RULE_CLEAR` of its ink. The board set the words on
 * the rules; the design brief keeps every rule 4px clear of text, so the
 * engine sets each line of writing just above a rule, clear of its
 * descenders, and a rule the writing cannot clear is not drawn.
 */
export function ruleLines(box: Box, gap: number, first: number, writing: readonly WrittenLine[]): number[] {
  const out: number[] = []
  for (let y = first; y < box.y + box.h - 6; y += gap) {
    const hits = writing.some((l) => y > l.baseline - INK_REACH.above * l.size - RULE_CLEAR && y < l.baseline + INK_REACH.below * l.size + RULE_CLEAR)
    if (!hits) out.push(y)
  }
  return out
}

/** The upright box a `w` by `h` box turned `angle` degrees about its centre covers. */
export function turnedBounds(box: Box, angle: number): Box {
  const a = (Math.abs(angle) * Math.PI) / 180
  const w = box.w * Math.cos(a) + box.h * Math.sin(a)
  const h = box.w * Math.sin(a) + box.h * Math.cos(a)
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h }
}

/**
 * Ruled paper: the paper inside a hairline rounded 10px, ruled with a pale
 * line at each of `rules` (from `ruleLines`), and a red margin line `margin`
 * px in from its left. A rule stops `RULE_CLEAR` short of anything pressed on
 * the paper (`around`, such as a stamp) and goes on past it.
 */
export function paintRuled(box: Box, inks: LessonInks, opts: { rules: readonly number[]; around?: readonly Box[]; margin?: number | null; key?: string | number }): React.ReactElement {
  const margin = opts.margin === undefined ? 56 : opts.margin
  const left = box.x + 12
  const right = box.x + box.w - 12
  const runs = (y: number): [number, number][] => {
    const cuts = (opts.around ?? [])
      .filter((b) => y > b.y - RULE_CLEAR && y < b.y + b.h + RULE_CLEAR)
      .map((b) => [b.x - RULE_CLEAR, b.x + b.w + RULE_CLEAR] as const)
      .sort((a, b) => a[0] - b[0])
    const out: [number, number][] = []
    let from = left
    for (const [a, b] of cuts) {
      if (a > from) out.push([from, Math.min(a, right)])
      from = Math.max(from, b)
    }
    if (from < right) out.push([from, right])
    return out.filter(([a, b]) => b - a > 0)
  }
  return (
    <g key={opts.key} data-lesson-ruled="">
      {paintLessonCard(box, inks)}
      {opts.rules.flatMap((y) =>
        runs(y).map(([x1, x2]) => <line key={`${y}-${x1}`} x1={x1} y1={y} x2={x2} y2={y} stroke={inks.rule} strokeWidth={1} />),
      )}
      {margin !== null ? <line x1={box.x + margin} y1={box.y + 8} x2={box.x + margin} y2={box.y + box.h - 8} stroke={inks.margin} strokeWidth={1.5} /> : null}
    </g>
  )
}

/** How far a sticky note's flat shadow falls, and how dark it is over the page. */
const NOTE_SHADOW = { dx: 1, dy: 3, mix: 0.12 } as const

/** A sticky note: the note's paper turned `angle` degrees about its centre, over a flat shadow. */
export function paintNote(box: Box, inks: LessonInks, angle: number, children: React.ReactNode): React.ReactElement {
  const cx = box.x + box.w / 2
  const cy = box.y + box.h / 2
  return (
    <g data-lesson-note="" transform={`rotate(${angle} ${cx} ${cy})`}>
      <rect x={box.x + NOTE_SHADOW.dx} y={box.y + NOTE_SHADOW.dy} width={box.w} height={box.h} fill={blendOver(inks.ink, inks.ground, NOTE_SHADOW.mix)} />
      <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.note} />
      {children}
    </g>
  )
}

/** The stamp: a word and an optional symbol inside a 2.5px rounded outline 112 by 44, turned a few degrees. */
export const STAMP = { w: 112, h: 44, border: 2.5, r: 8, size: 20, icon: 18, gap: 4 } as const

export function paintStamp(opts: { ctx: ComponentCtx; x: number; y: number; text: string; icon?: string; color: string; ground: string; angle: number; w?: number }): React.ReactElement {
  const w = opts.w ?? STAMP.w
  const cx = opts.x + w / 2
  const cy = opts.y + STAMP.h / 2
  const ink = lessonText(opts.color, opts.ground, STAMP.size)
  const textW = lessonWidth(opts.text, STAMP.size, opts.ctx, true)
  const run = textW + (opts.icon ? STAMP.icon + STAMP.gap : 0)
  const left = cx - run / 2
  return (
    <g data-lesson-stamp="" transform={`rotate(${opts.angle} ${cx} ${cy})`}>
      <rect x={opts.x + STAMP.border / 2} y={opts.y + STAMP.border / 2} width={w - STAMP.border} height={STAMP.h - STAMP.border} rx={STAMP.r} fill="none" stroke={graphicInk(opts.color, opts.ground)} strokeWidth={STAMP.border} />
      {opts.icon ? <Icon name={opts.icon} x={left} y={cy - STAMP.icon / 2} size={STAMP.icon} color={ink} /> : null}
      {paintLessonLine(opts.text, { ctx: opts.ctx, x: left + (opts.icon ? STAMP.icon + STAMP.gap : 0), top: opts.y + 2, lineHeight: STAMP.h - 4, size: STAMP.size, bold: true, fill: ink })}
    </g>
  )
}

/** The width a stamp needs for `text` and a symbol: the board's 112, or more for longer words. */
export function stampWidth(text: string, ctx: ComponentCtx, icon: boolean): number {
  return Math.max(STAMP.w, Math.ceil(lessonWidth(text, STAMP.size, ctx, true) + (icon ? STAMP.icon + STAMP.gap : 0) + 28))
}

/**
 * A tip's box: the mark's tint rounded 10px, an icon in the mark at its
 * left, the words after it; or, `dashed`, a 1.5px dashed outline in the pen
 * with no fill and the icon in the pen, a caution.
 */
export function paintTipBox(box: Box, inks: LessonInks, opts: { dashed?: boolean } = {}): React.ReactElement {
  if (opts.dashed) {
    return <rect data-lesson-tip="dashed" x={box.x + 0.75} y={box.y + 0.75} width={box.w - 1.5} height={box.h - 1.5} rx={LESSON_CARD_R} fill="none" stroke={graphicInk(inks.pen, inks.ground)} strokeWidth={1.5} strokeDasharray="4 3" />
  }
  return <rect data-lesson-tip="" x={box.x} y={box.y} width={box.w} height={box.h} rx={LESSON_CARD_R} fill={inks.tint} />
}

/** The pen's ink for a tone: green for what went right, the danger red for what broke, the warning amber for what to wait on. */
export function toneInk(tone: "danger" | "warning" | "success", inks: LessonInks): string {
  return inks[tone]
}

/** The symbol a tone's stamp carries: a tick, a cross, a pause. */
export function toneIcon(tone: "danger" | "warning" | "success"): string {
  return tone === "success" ? "check" : tone === "danger" ? "x" : "pause"
}

/** Chinese numerals for numbering items in a Chinese deck: 一 to 十. */
export const CHINESE_NUMERALS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"] as const

/** An item's number as the deck writes it: 「一」 in a Chinese deck, "1" in any other. */
export function itemNumeral(i: number, ctx: ComponentCtx): string {
  return ctx.figures?.chinese ? (CHINESE_NUMERALS[i] ?? String(i + 1)) : String(i + 1)
}

/**
 * Splits `text` at its first 「：」 or ": " into a lead and the rest, with the
 * separator the author wrote, or `null` when it has none. A composition that
 * sets the lead apart says so on its last line (`glossBreak`), so a reader of
 * the page reads the separator back where it stood.
 */
export function splitLead(text: string): { lead: string; rest: string; sep: string } | null {
  const m = /^(.+?)(：|: )(.+)$/su.exec(text.trim())
  return m ? { lead: m[1]!.trim(), sep: m[2]!, rest: m[3]!.trim() } : null
}

/** The attribute that says a lead's separator stood after this line: `data-gloss-break`. */
export function glossBreak(sep: string | undefined): Record<string, string> {
  return sep ? { "data-gloss-break": sep } : {}
}

/**
 * A photograph filling `box`, cropped to it, square at its corners: a
 * rounded picture needs a clip path PowerPoint's shape subset does not keep.
 * The mark's tint stands in where the deck has no such asset.
 */
export function paintLessonPhoto(assetId: string, box: Box, ctx: ComponentCtx, inks: LessonInks, opts: { fit?: "cover" | "contain"; key?: string | number } = {}): React.ReactElement {
  const asset = ctx.images?.[assetId]
  return asset?.src ? (
    <image
      key={opts.key}
      data-lesson-photo=""
      href={asset.src}
      x={box.x}
      y={box.y}
      width={box.w}
      height={box.h}
      preserveAspectRatio={opts.fit === "contain" ? "xMidYMid meet" : "xMidYMid slice"}
      aria-label={asset.alt || undefined}
    />
  ) : (
    <rect key={opts.key} x={box.x} y={box.y} width={box.w} height={box.h} fill={inks.tint} />
  )
}

/**
 * `fill` darkened, in small steps toward black, until white words read on
 * it at `size`: the pen's disc under a white number, an amber band under a
 * white name. A fill that already reads comes back as it is.
 */
export function fillUnderWhite(fill: string, size: number): string {
  let out = fill
  for (let step = 0; step < 12 && contrastRatio("#FFFFFF", out) < requiredContrastRatio(size); step++) out = blendOver("#000000", out, 0.08)
  return out
}
