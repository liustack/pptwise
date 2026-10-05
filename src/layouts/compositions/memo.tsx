import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { attachEmphasis, emphasisRunInk, fitEmphasisHeading, stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk, blendOver, metaInk, readableOn, resolveSemanticColor } from "../../render/ink"
import { inkToward } from "../../components/tag"
import { allowsLineBreakBetween, measureTextUnits } from "../../lib/svg-text-layout"
import { fitMono, monoWidth } from "./console"
import { chineseNumeral } from "./numerals"
import { fitFixed, paintLines } from "./type"

/*
 * The memo setting: a typed memorandum on paper. Settled on memo's 2026-10
 * board (`design/rounds/2026-10-05-memo/`).
 *
 * The page is a decision written down. Titles, item numbers and the figures a
 * page argues from are set in the heading face (memo's Song, with its Latin
 * in Times New Roman), sentences in the body face, and the typewriter's mono
 * face carries labels, dates, sources, sums and quoted originals. Items are
 * numbered in the deck's own numerals, 「一、」 in a Chinese deck. Rules are
 * hairlines in the border ink and 2px rules in the ink under a table's
 * headers. The thing a page lands on sits on a pale tint of the mark, its
 * words in the mark. Good news is the theme's success ink and bad news the
 * mark itself: a memo prints in one red. Photographs are pasted in as
 * exhibits (`./exhibit.tsx`) and a decision carries a stamp (`./stamp.tsx`).
 *
 * The board's small type (12 and 13px labels, 14 and 15px notes) is under the
 * 16px floor and carries the `memo-spec` exemption the L1 audit knows, as
 * terminal's carries `console-spec`.
 *
 * Every ink reads the theme's tokens, so a fork recolours it and any theme can
 * set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const MEMO_SPEC = { "data-font-floor-exempt": "memo-spec" } as const

/** `MEMO_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function memoSmall(size: number): Record<string, string> {
  return size < 16 ? { ...MEMO_SPEC } : {}
}

export interface MemoInks {
  /** The page. */
  ground: string
  /** A panel: the paper lifted a step. */
  paper: string
  /** Words, rules under headers, a verdict's banner. */
  ink: string
  /** The one mark: the claim's red, item numbers, what a page lands on. */
  mark: string
  /** Labels, notes, sources. */
  muted: string
  /** Hairlines between rows and around panels. Never words. */
  line: string
  /** The mark's pale tint, under the row a page lands on. */
  tint: string
  /** What steps back: the other group's line, the figure set against the mark. */
  quiet: string
  /** Good news. */
  good: string
  /** Bad news: the mark, since a memo prints in one red. */
  bad: string
}

/** The mark's tint over the page: the board's #F1E1DA over its #F6F1E7. */
const TINT_MIX = 0.08
/** How far the quiet grey sits from the page toward the muted ink: the board's #B9AE9C. */
const QUIET_MIX = 0.45

export function memoInks(ctx: ComponentCtx): MemoInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const mark = emphasisRunInk(colors)
  return {
    ground,
    paper: colors.surface,
    ink: colors.text,
    mark,
    muted: colors.muted,
    line: colors.border ?? blendOver(colors.muted, ground, 0.2),
    tint: blendOver(mark, ground, TINT_MIX),
    quiet: blendOver(colors.muted, ground, QUIET_MIX),
    good: resolveSemanticColor("success", colors),
    bad: mark,
  }
}

/**
 * The inks unmarked series, bars and tags take, in order: the chart palette
 * without its lead (the ink) and without the mark, from the quiet end (memo's
 * kraft brown, then its archive slate), then the lead.
 */
export function memoQuietInks(ctx: ComponentCtx): string[] {
  const palette = ctx.colors.chartPalette
  const mark = emphasisRunInk(ctx.colors).toUpperCase()
  const lead = palette[0]
  const rest = palette.slice(1).filter((color) => color.toUpperCase() !== mark).reverse()
  return lead ? [...rest, lead] : rest
}

/** `ink` held to the contrast `size` needs on `ground`. */
export function memoText(ink: string, ground: string, size: number): string {
  return accessibleInk(ink, ground, size)
}

/**
 * `ink` where it reads on `ground` at `size`, otherwise the least step of it
 * toward the text ink that does: a quiet grey stays as light as contrast
 * lets it, rather than falling back to black.
 */
export function memoStepped(ink: string, toward: string, ground: string, size: number): string {
  return inkToward(ink, toward, ground, size)
}

/** Quiet text (a source, a label) held to the 3:1 a meta line needs. */
export function memoMeta(ink: string, ground: string): string {
  return metaInk(ink, ground)
}

/** The readable ink on a block filled with `fill`. */
export function memoOn(fill: string, preferred: string, size: number): string {
  return accessibleInk(preferred, fill, size) === preferred ? preferred : readableOn(fill)
}

/** The three faces a memo page sets type in. */
export type MemoFace = "song" | "body" | "mono"

/**
 * Where each face's baseline sits below the middle of its line box, as a
 * fraction of its size: Songti and PingFang as the board's browser set them
 * (0.358 and 0.35), Courier New with its deep descent (0.25).
 */
const BASELINE_RATIO: Record<MemoFace, number> = { song: 0.358, body: 0.35, mono: 0.25 }

/** The baseline of a `size` line in `face`, in a `lineHeight` box whose top is `top`. */
export function memoBaseline(top: number, lineHeight: number, size: number, face: MemoFace): number {
  return Math.round(top + lineHeight / 2 + size * BASELINE_RATIO[face])
}

/** The family a face sets in. */
export function memoFamily(ctx: ComponentCtx, face: MemoFace): string {
  return face === "song" ? ctx.fonts.heading : face === "mono" ? ctx.fonts.mono : ctx.fonts.body
}

/** Whether the deck counts in Chinese, read off its headings (`ctx.figures`). */
export function memoChinese(ctx: ComponentCtx): boolean {
  return ctx.figures?.chinese ?? false
}

/**
 * The `index`-th item's number (from 0) as a memo numbers a clause: 「一、」 in
 * a Chinese deck and "1." in any other, or the bare numeral with `bare`.
 */
export function memoNumeral(index: number, chinese: boolean, bare = false): string {
  if (chinese) return `${chineseNumeral(index + 1)}${bare ? "" : "、"}`
  return `${index + 1}${bare ? "" : "."}`
}

export interface MemoTextSpec {
  width: number
  size: number
  lineHeight: number
  maxLines: number
  face: MemoFace
  bold?: boolean
  balance?: boolean
}

/** `text` set at exactly `spec.size` in `spec.face`, or `null` when it does not fit whole. */
export function fitMemo(text: string | undefined, spec: MemoTextSpec, ctx: ComponentCtx): EmphasisHeadingLayout | null {
  if (spec.face === "mono") return fitMono(text, { width: spec.width, size: spec.size, lineHeight: spec.lineHeight, maxLines: spec.maxLines })
  return fitFixed(text, {
    width: spec.width,
    size: spec.size,
    lineHeight: spec.lineHeight,
    maxLines: spec.maxLines,
    fontFamily: memoFamily(ctx, spec.face),
    bold: spec.bold === true,
    balance: spec.balance,
  })
}

/** Paints a fitted block whose first line box starts at `top`, one `<text>` per line. */
export function paintMemo(
  layout: EmphasisHeadingLayout,
  opts: {
    ctx: ComponentCtx
    x: number
    top: number
    face: MemoFace
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    ground?: string
    italic?: boolean
    attrs?: Record<string, string>
    lastAttrs?: Record<string, string>
  },
): React.ReactNode {
  const size = layout.fontSize
  return paintLines(layout, {
    ctx: opts.ctx,
    x: opts.x,
    y: memoBaseline(opts.top, layout.lineHeight, size, opts.face),
    fill: opts.fill,
    fontFamily: memoFamily(opts.ctx, opts.face),
    fontWeight: opts.bold ? "700" : "400",
    anchor: opts.anchor,
    bg: opts.ground,
    attrs: { ...memoSmall(size), ...(opts.italic ? { fontStyle: "italic" } : {}), ...opts.attrs },
    lastAttrs: opts.lastAttrs,
  })
}

/** One line of text that is known to fit, painted at its line box's `top`, or on `baseline` when given. */
export function paintMemoLine(
  text: string,
  opts: {
    ctx: ComponentCtx
    x: number
    top: number
    baseline?: number
    lineHeight: number
    size: number
    face: MemoFace
    fill: string
    bold?: boolean
    anchor?: "start" | "middle" | "end"
    attrs?: Record<string, string>
    key?: string
  },
): React.ReactElement {
  return (
    <text
      key={opts.key}
      {...memoSmall(opts.size)}
      {...opts.attrs}
      x={opts.x}
      y={opts.baseline ?? memoBaseline(opts.top, opts.lineHeight, opts.size, opts.face)}
      textAnchor={opts.anchor && opts.anchor !== "start" ? opts.anchor : undefined}
      fontFamily={memoFamily(opts.ctx, opts.face)}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      xmlSpace="preserve"
    >
      {text}
    </text>
  )
}

/** The width `text` takes on one line in `face` at `size`. */
export function memoWidth(text: string, size: number, face: MemoFace, ctx: ComponentCtx, bold = false): number {
  if (face === "mono") return monoWidth(text, size)
  return measureTextUnits(stripEmphasis(text), { fontFamily: memoFamily(ctx, face), bold }) * size
}

/** A memo's small tag: a word or two in bold at 12px in a square outline 24px tall, as the board types a source's kind. */
export const MEMO_TAG = { size: 12, height: 24, padX: 10 } as const

/** A tag's width for `text`: a full em for a CJK character, the mono advance for a Latin one, and its padding. */
export function memoTagWidth(text: string): number {
  return Math.ceil(monoWidth(text, MEMO_TAG.size) + MEMO_TAG.padX * 2)
}

/** Paints a square tag outlined in `ink`, or filled with it and lettered in `ground` (`filled`). */
export function paintMemoTag(opts: {
  ctx: ComponentCtx
  text: string
  x: number
  y: number
  ink: string
  ground: string
  filled?: boolean
  key?: string
}): React.ReactElement {
  const w = memoTagWidth(opts.text)
  const words = opts.filled ? memoOn(opts.ink, opts.ground, MEMO_TAG.size) : memoText(opts.ink, opts.ground, MEMO_TAG.size)
  return (
    <g key={opts.key} data-memo-tag={opts.filled ? "filled" : ""}>
      {opts.filled ? (
        <rect x={opts.x} y={opts.y} width={w} height={MEMO_TAG.height} fill={opts.ink} />
      ) : (
        <rect x={opts.x + 0.5} y={opts.y + 0.5} width={w - 1} height={MEMO_TAG.height - 1} fill="none" stroke={opts.ink} strokeWidth={1} />
      )}
      {paintMemoLine(opts.text, {
        ctx: opts.ctx,
        x: opts.x + w / 2,
        top: opts.y,
        lineHeight: MEMO_TAG.height,
        size: MEMO_TAG.size,
        face: "body",
        fill: words,
        bold: true,
        anchor: "middle",
      })}
    </g>
  )
}

/**
 * `text` set with `tracking` px between its characters, written as a
 * `<tspan dx>` before each one after the first so the export carries the
 * spacing as character spacing (`svg2pptx/text.ts`). Anchored by its whole
 * tracked width from `x` at the `anchor` it names, so the preview and the
 * export agree on where it stands.
 */
export function paintTracked(opts: {
  ctx: ComponentCtx
  text: string
  x: number
  y: number
  size: number
  face: MemoFace
  tracking: number
  fill: string
  bold?: boolean
  anchor?: "start" | "middle" | "end"
  attrs?: Record<string, string>
  key?: string
}): React.ReactElement {
  const chars = Array.from(opts.text)
  const width = memoWidth(opts.text, opts.size, opts.face, opts.ctx, opts.bold) + Math.max(0, chars.length - 1) * opts.tracking
  const start = opts.anchor === "middle" ? opts.x - width / 2 : opts.anchor === "end" ? opts.x - width : opts.x
  return (
    <text
      key={opts.key}
      {...memoSmall(opts.size)}
      {...opts.attrs}
      x={start}
      y={opts.y}
      fontFamily={memoFamily(opts.ctx, opts.face)}
      fontSize={opts.size}
      fontWeight={opts.bold ? "700" : undefined}
      fill={opts.fill}
      dominantBaseline="alphabetic"
      data-tracking={opts.tracking}
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

/** The tracked width of `text`, as `paintTracked` sets it. */
export function trackedWidth(text: string, size: number, face: MemoFace, tracking: number, ctx: ComponentCtx, bold = false): number {
  return memoWidth(text, size, face, ctx, bold) + Math.max(0, Array.from(text).length - 1) * tracking
}

const WIDE_CHAR = /[\u2E80-\u9FFF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u3000-\u303F]/u
/** Where a line may end on a clause: after Chinese clause punctuation, or after a Latin one before a space. */
const CJK_CLAUSE_END = /[，、：；。！？）」』]$/u
const LATIN_CLAUSE_END = /[.,:;!?)"”]$/u

/**
 * A title fitted the way a memo types it: on one line whenever it fits the
 * measure, and when it does not, on two lines whose first is as full as it
 * can be, ending on the last clause punctuation that lets both lines fit
 * (「试行每周四天、32 小时，薪酬不变，」+「触发停止条件即叫停」), or where the
 * line runs out when no clause seam fits. It is never broken early to even
 * the lines. Too long for two lines at `minPt`, it falls back to the shared
 * heading fit, which cuts it and says so.
 */
export function fitMemoTitle(
  text: string | undefined,
  opts: {
    maxWidth: number
    fontSize: number
    minPt: number
    lineHeight: number
    fontFamily: string
    bold?: boolean
  },
): EmphasisHeadingLayout {
  const plain = stripEmphasis(text ?? "").trim()
  const weight = { fontFamily: opts.fontFamily, bold: opts.bold ?? true }
  const ratio = opts.lineHeight / opts.fontSize
  const units = (s: string) => measureTextUnits(s, weight)
  const done = (lines: string[], size: number) =>
    attachEmphasis(text, {
      lines,
      fontSize: size,
      lineHeight: Math.round(size * ratio),
      truncated: false,
    })
  if (!plain) return done([], opts.fontSize)
  const chars = Array.from(plain)
  for (let size = opts.fontSize; size >= opts.minPt; size -= 1) {
    const room = opts.maxWidth / size
    if (units(plain) <= room) return done([plain], size)
    let latestSeam = 0
    let latest = 0
    for (let i = 1; i < chars.length; i += 1) {
      const before = chars[i - 1]!
      const after = chars[i]!
      const space = after === " "
      if (!space && !WIDE_CHAR.test(before) && !WIDE_CHAR.test(after)) continue
      if (!space && !allowsLineBreakBetween(before, after)) continue
      const first = chars.slice(0, i).join("").trimEnd()
      const second = chars.slice(i).join("").trimStart()
      if (!first || !second || units(first) > room || units(second) > room) continue
      latest = i
      if (CJK_CLAUSE_END.test(first) || (space && LATIN_CLAUSE_END.test(first))) latestSeam = i
    }
    const at = latestSeam || latest
    if (at > 0) return done([chars.slice(0, at).join("").trimEnd(), chars.slice(at).join("").trimStart()], size)
  }
  return fitEmphasisHeading(text, {
    maxWidth: opts.maxWidth,
    fontSize: opts.fontSize,
    maxLines: 2,
    minPt: opts.minPt,
    lineHeightRatio: ratio,
    fontFamily: opts.fontFamily,
    bold: opts.bold ?? true,
  })
}
