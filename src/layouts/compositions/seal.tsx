import type React from "react"
import type { ComponentCtx } from "../../components/types"
import { inkToward, type Tag, type TagInks, type TagSpec } from "../../components/tag"
import { emphasisRunInk } from "../../render/emphasis"
import { accessibleInk, blendOver, readableOn, resolveSemanticColor } from "../../render/ink"
import { itemNumeral } from "./numerals"
import { centredBaseline } from "./type"

/*
 * The seal setting: a formal report's page, the way a document set on paper
 * reads. Settled on vermilion's 2026-10 board (`design/rounds/2026-10-04-vermilion/`).
 *
 * Items are numbered in the deck's own numerals (一、二、三 in a Chinese deck)
 * inside small squares of the mark colour, white on it, the way a seal is
 * pressed into a page. The theme's emphasis ink (vermilion's red) is spent
 * once a page: a whole row reversed out of it, a row on its pale tint, or a
 * figure in it. The accent (vermilion's gold) only draws: rules, arrows, a
 * ring's progress, a range's tint, the outline of a tag that says something
 * changed. Data nobody marked steps back in the chart palette after its lead,
 * nearest the mark first, and panels are the surface with a hairline edge.
 *
 * Tables are open: a 2px rule in the mark under their headers, hairlines
 * between rows, no fills but the marked row's. Headers, legends and labels
 * are 15px and tags 14px, the board's sizes, under the 16px floor, and carry
 * the `seal-spec` exemption the L1 audit knows.
 *
 * Everything here reads the theme's tokens, so a fork recolours it and any
 * theme can set its pages this way.
 */

/** The exemption the L1 audit knows the board's small type by. */
export const SEAL_SPEC = { "data-font-floor-exempt": "seal-spec" } as const

/** `SEAL_SPEC` when `size` is under the 16px floor, nothing otherwise. */
export function sealSmall(size: number): Record<string, string> {
  return size < 16 ? { ...SEAL_SPEC } : {}
}

/** The board's type sizes. */
export const SEAL_TYPE = {
  /** Table headers, legends, figure labels, units. */
  label: 15,
  /** A tag's words. */
  tag: 14,
  /** Body text and glosses. */
  body: 18,
} as const

export interface SealInks {
  /** The page's one mark: a reversed row, a marked row's words, a marked figure. */
  mark: string
  /** What reads on the mark. */
  onMark: string
  /** A gloss reversed out of the mark: the readable ink most of the way back toward the mark. */
  onMarkQuiet: string
  /** The pale tint a marked row sits on. */
  tint: string
  /** The accent: rules, arrows, a ring's progress, outlines. Never words. */
  accent: string
  /** Ink and the quiet ink, as the theme names them. */
  ink: string
  muted: string
  /** A hairline between rows, a panel's edge. */
  rule: string
  /** A panel's fill. */
  panel: string
  /** A ring's track. */
  track: string
  /** A marked value range across a plot, and its label's ink. */
  band: string
  bandText: string
  /** The page's ground. */
  ground: string
}

export function sealInks(ctx: ComponentCtx): SealInks {
  const { colors } = ctx
  const ground = ctx.defaultBg ?? colors.bg
  const mark = emphasisRunInk(colors)
  const onMark = readableOn(mark)
  const rule = colors.border ?? colors.muted
  const band = blendOver(colors.accent, ground, 0.14)
  return {
    mark,
    onMark,
    onMarkQuiet: inkToward(blendOver(onMark, mark, 0.9), onMark, mark, SEAL_TYPE.body),
    tint: blendOver(mark, colors.surface, 0.11),
    accent: colors.accent,
    ink: colors.text,
    muted: colors.muted,
    rule,
    panel: colors.surface,
    track: blendOver(rule, ground, 0.5),
    band,
    bandText: inkToward(resolveSemanticColor("warning", colors), colors.text, band, SEAL_TYPE.label),
    ground,
  }
}

/** Text of `size` in `ink` on `ground`, held to the contrast its size needs. */
export function sealText(ink: string, ground: string, size: number): string {
  return accessibleInk(ink, ground, size)
}

/**
 * The colour of the `k`-th series the author did not mark, counted from the
 * one nearest the mark: the chart palette after its lead, in order.
 */
export function sealSeriesInk(ctx: ComponentCtx, k: number): string {
  const palette = ctx.colors.chartPalette
  const rest = palette.length > 1 ? palette.slice(1) : palette
  return rest[k % rest.length]!
}

/** Whether the deck counts in Chinese numerals. */
export function sealChinese(ctx: ComponentCtx): boolean {
  return ctx.figures?.chinese ?? false
}

/**
 * A numbered square: the item's number in the deck's numerals, white on the
 * mark, or the mark on white when its row is itself reversed out of the mark.
 */
export function paintNumeral(opts: {
  ctx: ComponentCtx
  index: number
  x: number
  y: number
  size: number
  /** The row is reversed out of the mark: the square turns white. */
  inverse?: boolean
  key?: string
}): React.ReactElement {
  const inks = sealInks(opts.ctx)
  const fill = opts.inverse ? inks.onMark : inks.mark
  const numeral = itemNumeral(opts.index, sealChinese(opts.ctx))
  const fontSize = Math.round(opts.size * (numeral.length > 1 ? 0.42 : 0.5))
  return (
    <g key={opts.key} data-seal-numeral="">
      <rect x={opts.x} y={opts.y} width={opts.size} height={opts.size} fill={fill} />
      <text
        x={opts.x + opts.size / 2}
        y={centredBaseline(opts.y, opts.size, fontSize)}
        textAnchor="middle"
        fontFamily={opts.ctx.fonts.body}
        fontSize={fontSize}
        fontWeight="700"
        fill={opts.inverse ? inks.mark : inks.onMark}
        dominantBaseline="alphabetic"
      >
        {numeral}
      </text>
    </g>
  )
}

/** A tag at the board's size: 14px words in a 26px label. */
export function sealTagSpec(ctx: ComponentCtx): TagSpec {
  return { size: SEAL_TYPE.tag, height: 26, padX: 12, fontFamily: ctx.fonts.body }
}

/**
 * The inks a tag paints with on a seal page: filled in the mark on the row
 * the page marks, outlined in the muted ink when it says nothing changed, and
 * otherwise outlined in the accent with its words a step toward the ink.
 */
export function sealTagInks(ctx: ComponentCtx, tag: Tag, marked: boolean, ground: string): TagInks {
  const inks = sealInks(ctx)
  if (marked) return { fill: inks.mark, stroke: inks.mark, text: inks.onMark }
  const line = tag.quiet ? inks.muted : inks.accent
  return { fill: null, stroke: line, text: inkToward(line, inks.ink, ground, SEAL_TYPE.tag) }
}

/** The seal setting's open-table header rule: 2px in the mark. */
export const SEAL_HEADER_RULE = 2

/** A note panel's measures: the surface with a hairline edge, 18/28 text 24px in. */
export const SEAL_NOTE = { size: 18, lineHeight: 28, padX: 24, padY: 18, maxLines: 2 } as const
