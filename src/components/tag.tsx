import type React from "react"
import type { Component } from "@/ir"
import { measureTextUnits } from "../lib/svg-text-layout"
import { emphasisRunInk } from "../render/emphasis"
import { blendOver, contrastRatio, readableOn, requiredContrastRatio, resolveSemanticColor } from "../render/ink"
import type { StyleColors } from "../themes/tokens"
import type { ComponentCtx } from "./types"

/** A row's or a figure's tag (`TagSchema`): a few words and whether it steps back. */
export type Tag = NonNullable<Extract<Component, { type: "comparison" }>["rows"][number]["tag"]>

/** What kind of source a tag names (`EvidenceKindSchema`). */
export type EvidenceKind = NonNullable<Tag["evidence"]>

/*
 * The tag a row or a figure carries: a few words in a small rounded label,
 * such as 「改为区间」, 「不变」, 「新增」. Every renderer that prints one goes
 * through this file, so a tag reads the same in an ordinary table, a theme's
 * hand-set table and beside a headline figure.
 *
 * Its colour says how much it matters, never what it says:
 *
 * - on the row or figure the page marks, the tag fills in the theme's
 *   emphasis ink with the readable ink on it, the page's one mark;
 * - a `settled` tag, a verdict that is final, fills the same way, or in a
 *   pale grey with muted words when it is also `quiet` (a final no);
 * - a tag that says what kind of news it is (`tone`) is outlined in the
 *   theme's ink for that news, a breach in its danger ink;
 * - a tag that names its source (`evidence`) is outlined in the ink that kind
 *   of source takes (`evidenceInk`), the same kind in the same ink across a
 *   deck;
 * - a `quiet` tag, one that says nothing changed, is outlined in the muted
 *   ink and steps back;
 * - any other tag is outlined in the theme's accent.
 *
 * An outline's words take the outline's colour where it reads on the ground
 * at their size, and otherwise the nearest step of it toward the text ink
 * that does (`inkToward`), so a light gold accent prints a darker gold rather
 * than falling back to black.
 */

export interface TagSpec {
  /** Type size of the words. */
  size: number
  /** The label's height. Its ends are fully round. */
  height: number
  /** Air between the words and the label's ends. */
  padX: number
  fontFamily: string
}

/** The ordinary size: 16px words in a 28px label, the floor every theme's body type keeps. */
export function ordinaryTagSpec(ctx: ComponentCtx): TagSpec {
  return { size: 16, height: 28, padX: 12, fontFamily: ctx.fonts.body }
}

/** The label's width for `text` at `spec`. */
export function tagWidth(text: string, spec: TagSpec): number {
  return Math.ceil(measureTextUnits(text, { bold: true, fontFamily: spec.fontFamily }) * spec.size) + spec.padX * 2
}

export interface TagInks {
  /** The label's fill, or `null` for an outline. */
  fill: string | null
  stroke: string
  text: string
}

/**
 * `preferred` where it reads on `ground` at `size`, otherwise the least step of
 * it toward `toward` that does, and `toward`'s own readable fallback past
 * twenty steps.
 */
export function inkToward(preferred: string, toward: string, ground: string, size: number): string {
  const need = requiredContrastRatio(size)
  if (contrastRatio(preferred, ground) >= need) return preferred
  for (let step = 1; step <= 20; step++) {
    const candidate = blendOver(toward, preferred, step / 20)
    if (contrastRatio(candidate, ground) >= need) return candidate
  }
  return readableOn(ground)
}

/**
 * The chart palette's inks that are neither the theme's primary nor its
 * accent nor its emphasis ink, in order: the quieter series colours a theme
 * keeps for things that are not the page's lead.
 */
function secondaryInks(colors: Pick<StyleColors, "chartPalette" | "primary" | "accent" | "emphasisInk">): string[] {
  const taken = new Set([colors.primary, colors.accent, colors.emphasisInk].filter((c): c is string => Boolean(c)).map((c) => c.toUpperCase()))
  return colors.chartPalette.filter((c) => !taken.has(c.toUpperCase()))
}

/**
 * The ink a kind of source takes, read from the theme's tokens so a fork
 * recolours it: a trial in a journal and an official document in the
 * primary, the strongest ink the theme keeps for marks; a product label and
 * a trial registry in the first of the palette's quieter series colours; a
 * draft out for comment in the next; a company's own figures in the warning
 * ink, a claim to read with care; a press report in the muted ink.
 */
export function evidenceInk(
  colors: Pick<StyleColors, "chartPalette" | "primary" | "accent" | "emphasisInk" | "muted" | "text" | "danger" | "warning" | "success">,
  kind: EvidenceKind,
): string {
  const quieter = secondaryInks(colors)
  switch (kind) {
    case "trial":
    case "official":
      return colors.primary
    case "label":
    case "registry":
      return quieter[0] ?? colors.primary
    case "draft":
      return quieter[1] ?? colors.text
    case "company":
      return resolveSemanticColor("warning", colors)
    case "press":
      return colors.muted
  }
}

/** How much of the muted ink a settled quiet tag's grey fill takes over its ground. */
const SETTLED_QUIET_FILL = 0.12

/** The inks a tag paints with on `ground`. `marked` is the row or figure the page marks. */
export function tagInks(ctx: ComponentCtx, tag: Tag, marked: boolean, ground: string, size: number): TagInks {
  const { colors } = ctx
  if (marked || (tag.settled && !tag.quiet)) {
    const fill = emphasisRunInk(colors)
    return { fill, stroke: fill, text: readableOn(fill) }
  }
  if (tag.settled) {
    const fill = blendOver(colors.muted, ground, SETTLED_QUIET_FILL)
    return { fill, stroke: fill, text: inkToward(colors.muted, colors.text, fill, size) }
  }
  const line = tag.tone
    ? resolveSemanticColor(tag.tone, colors)
    : tag.evidence
      ? evidenceInk(colors, tag.evidence)
      : tag.quiet
        ? colors.muted
        : colors.accent
  return { fill: null, stroke: line, text: inkToward(line, colors.text, ground, size) }
}

/**
 * Paints a tag with its left edge at `x` and its top at `y`. The words are
 * centred in the label, the way the boards set them.
 */
export function paintTag(opts: {
  tag: Tag
  x: number
  y: number
  spec: TagSpec
  inks: TagInks
  width?: number
  /** Attributes the words' `<text>` carries, such as a font-floor exemption. */
  attrs?: Record<string, string>
  key?: string
}): React.ReactElement {
  const { tag, x, y, spec, inks } = opts
  const w = opts.width ?? tagWidth(tag.text, spec)
  const r = spec.height / 2
  return (
    <g key={opts.key} data-tag={tag.quiet ? (inks.fill ? "settled-quiet" : "quiet") : inks.fill ? "marked" : ""}>
      <rect
        x={x + (inks.fill ? 0 : 0.5)}
        y={y + (inks.fill ? 0 : 0.5)}
        width={w - (inks.fill ? 0 : 1)}
        height={spec.height - (inks.fill ? 0 : 1)}
        rx={r}
        fill={inks.fill ?? "none"}
        stroke={inks.fill ? undefined : inks.stroke}
        strokeWidth={inks.fill ? undefined : 1}
      />
      <text
        {...opts.attrs}
        x={x + w / 2}
        y={Math.round(y + spec.height / 2 + spec.size * 0.385)}
        textAnchor="middle"
        fontFamily={spec.fontFamily}
        fontSize={spec.size}
        fontWeight="700"
        fill={inks.text}
        dominantBaseline="alphabetic"
      >
        {tag.text}
      </text>
    </g>
  )
}

/**
 * Whether any of `rows` carries a tag or the page's mark. A table that has no
 * place for either declines such rows, and the ordinary table sets them.
 */
export function rowsCarryMarks(rows: readonly { tag?: Tag; emphasis?: boolean }[]): boolean {
  return rows.some((row) => row.tag !== undefined || row.emphasis === true)
}
