import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import type { DeckFooter } from "../render/footer-marks"
import { stageIndex } from "../render/course-marks"
import { chineseNumeral } from "./compositions/numerals"
import { fitKeynoteClaim } from "./keynote-shared"
import {
  HEAD,
  PORTRAIT_LEFT,
  PORTRAIT_META,
  PORTRAIT_RIGHT,
  PORTRAIT_SPEC,
  PORTRAIT_W,
  PortraitSection,
  SECTION,
  SOURCE_LINE,
  paintPortrait,
  portraitChinese,
  portraitInks,
  portraitMeta,
  portraitText,
  portraitWidth,
  sectionWidth,
  type PortraitClaimColumn,
  type PortraitKickerColumn,
  type PortraitSourceColumn,
} from "./compositions/portrait"

/*
 * The profile's frame: what every profile page wears, settled on profile's
 * 2026-10 board (`design/rounds/2026-10-12-profile/`).
 *
 * Over the claim a small line names the part of the talk the page is in: a
 * 28px rule of the accent, then the stage of the deck's `course` the page
 * names, numbered 「一\u3000我是谁」 ("1  Who"), or the page's `kicker` when it
 * names none, in the heading serif, bold, tracked a tenth, in the accent.
 * Under it the claim bold in the heading serif at 34/48 across the measure
 * (x80 to x1200, or the column beside a photograph), on one line whenever it
 * fits, a point or two smaller if that keeps it there, broken at a comma or
 * a colon when it does not. The source on a line of its own in the grey at
 * 13px from y640, or, when it credits a photograph, in the footer after the
 * deck's label.
 *
 * Along the foot of every page the footer row on y685: the deck's label at
 * the left at 12px in the grey, the speaker's name (the deck's first author)
 * and the page number in the serif at the right. The motif paints it on
 * content pages (`motifs/motif-profile-motif.tsx`). The cover and the close
 * paint their own.
 */

export { PORTRAIT_LEFT, PORTRAIT_RIGHT, PORTRAIT_W }

/** The claim: 34/48 bold in the heading serif, its first line's box from y102 under the section line, two lines at most. */
export const CLAIM = { x: PORTRAIT_LEFT, w: PORTRAIT_W, top: HEAD.top + SECTION.lineHeight + HEAD.gap, size: 34, lineHeight: 48, maxLines: 2 } as const

/** The source on its own line: 13/20 in the grey from y640, two lines at most, its last ending by y664. */
export const SOURCE = { ...SOURCE_LINE, maxLines: 2, foot: 664 } as const

/** The footer row: 12px words in the grey and the page number in the serif at 14px, on y685, from x80 to x1200. */
export const FOOTER = { baseline: 685, size: 12, number: 14, x1: PORTRAIT_LEFT, x2: PORTRAIT_RIGHT, gap: 12, packGap: 24 } as const

/** Where a body set under the claim by the ordinary renderer starts (46px under the claim) and ends. */
export const BODY = { gap: 46, bottom: 620 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const PORTRAIT_HEAD_FIT = { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.size, bold: true, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The section line ────────────────────────────────────────────────────

/**
 * The words of the page's section line: the stage of the deck's course the
 * page names, after its number (「一\u3000我是谁」, "1 Who"), then the page's
 * kicker when it writes one too (「一\u3000我是谁\u3000面试官提问」), or the kicker
 * alone when the page names no stage, or `null`.
 */
export function portraitSectionText(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage" | "kicker">, ctx: ComponentCtx): string | null {
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const course = ir.course
  const at = course && slide.stage ? stageIndex(course, slide.stage) : -1
  if (!course || at < 0) return kicker || null
  const label = stripEmphasis(course.stages[at]!.label).trim()
  const chinese = portraitChinese(ctx, [label])
  const stage = chinese ? `${chineseNumeral(at + 1)}\u3000${label}` : `${at + 1} ${label}`
  return kicker ? `${stage}${chinese ? "\u3000" : " · "}${kicker}` : stage
}

/** The section line in a column, or `null` when it does not fit its room. */
export function PortraitKicker({ ctx, text, column }: { ctx: ComponentCtx; text: string; column: PortraitKickerColumn }): React.ReactElement | null {
  if (sectionWidth(text, ctx) > column.w) return null
  return <PortraitSection text={text} ctx={ctx} x={column.x} top={column.top} />
}

/** The section line a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it does not fit. */
export function portraitKickerIn(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage" | "kicker">, ctx: ComponentCtx): ((column: PortraitKickerColumn) => React.ReactElement | null) | undefined {
  const text = portraitSectionText(ir, slide, ctx)
  if (!text) return undefined
  // Called, not mounted, so a section line that does not fit answers null to the placer.
  return (column) => PortraitKicker({ ctx, text, column })
}

// ── The claim ───────────────────────────────────────────────────────────

/** The claim fitted bold to a column: one line down to a twelfth under its size, else broken at a comma or a colon. */
export function fitPortraitClaim(heading: string | undefined, ctx: Pick<ComponentCtx, "fonts">, width: number = CLAIM.w, maxLines: number = CLAIM.maxLines, size: number = CLAIM.size, lineHeight: number = CLAIM.lineHeight): EmphasisHeadingLayout {
  // The claim keeps its size and wraps, as the board sets it, rather than shrinking onto one line.
  return fitKeynoteClaim(heading, ctx, width, size, lineHeight, maxLines, size)
}

/** The claim painted from its column's left, its first line's box from `top`. */
export function PortraitClaim({ ctx, layout, x, top }: { ctx: ComponentCtx; layout: EmphasisHeadingLayout; x: number; top: number }): React.ReactElement {
  const inks = portraitInks(ctx)
  return (
    <g data-portrait-claim="">
      {paintPortrait(layout, { ctx, x, top, fill: portraitText(inks.ink, inks.ground, layout.fontSize), serif: true, bold: true, lastAttrs: layout.truncated ? { "data-truncated": "1" } : undefined })}
    </g>
  )
}

/** The claim a composition places in a column of its own, or `null` when it would not fit that column whole. */
export function portraitClaimIn(slide: Pick<Slide, "heading">, ctx: ComponentCtx): (column: PortraitClaimColumn) => React.ReactElement | null {
  return (column) => {
    if (!stripEmphasis(slide.heading ?? "").trim()) return null
    const maxLines = column.maxLines ?? CLAIM.maxLines
    const layout = fitPortraitClaim(slide.heading, ctx, column.w, maxLines)
    if (layout.truncated || layout.lines.length > maxLines) return null
    return <PortraitClaim ctx={ctx} layout={layout} x={column.x} top={column.top ?? CLAIM.top} />
  }
}

/** How many lines the claim takes in a column of `w`: what a composition that moves its body by the claim reads. */
export function portraitClaimLines(heading: string | undefined, ctx: ComponentCtx, w: number = CLAIM.w): number {
  return fitPortraitClaim(heading, ctx, w).lines.length
}

// ── The footer row ──────────────────────────────────────────────────────

/** The deck's marks at the left of the footer row: the organization, the label, the notice and the draft and confidentiality marks, joined by a middle dot. The cover leaves the confidentiality mark out (`confidentiality: false`): its own mark prints it. */
export function portraitFooterLabel(footer: DeckFooter, opts: { confidentiality?: boolean } = {}): string {
  const mark = opts.confidentiality !== false && footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null
  return [footer.organization, footer.label, footer.notice, footer.draft, mark]
    .map((part) => (part ? stripEmphasis(part).trim() : ""))
    .filter(Boolean)
    .join(" · ")
}

/** The speaker the footer names: the deck's first author. */
export function portraitSpeaker(ir: Pick<PptxIR, "meta">): string | null {
  const name = ir.meta.authors?.[0]?.name
  return name ? stripEmphasis(name).trim() || null : null
}

/** The width the right of the row takes: the name, its gap and the page number. */
export function portraitFooterEndWidth(ctx: ComponentCtx, name: string | null, folio: number | null): number {
  const nameW = name ? portraitWidth(name, FOOTER.size, ctx) : 0
  const folioW = folio != null ? portraitWidth(String(folio), FOOTER.number, ctx, { serif: true }) : 0
  return nameW + folioW + (name && folio != null ? FOOTER.gap : 0)
}

/**
 * The footer row from `x1` to `x2`: the label at the left, the name and the
 * page number (PowerPoint's slide-number field, so it keeps counting when a
 * page moves) at the right. `pack: "end"` sets the label too at the right,
 * before the name, as a page whose bottom left holds a chart's legend asks.
 * A label that does not fit beside the rest is declared dropped.
 */
export function PortraitFooter({ ctx, label, name, folio, x1 = FOOTER.x1, x2 = FOOTER.x2, pack }: { ctx: ComponentCtx; label: string | null; name: string | null; folio: number | null; x1?: number; x2?: number; pack?: "end" }): React.ReactElement | null {
  if (!label && !name && folio == null) return null
  const inks = portraitInks(ctx)
  const quiet = portraitMeta(inks.muted, inks.ground)
  const endW = portraitFooterEndWidth(ctx, name, folio)
  const labelW = label ? portraitWidth(label, FOOTER.size, ctx) : 0
  const room = x2 - x1 - endW - (endW > 0 ? FOOTER.packGap : 0)
  const labelFits = !label || labelW <= room
  const labelX = pack === "end" ? x2 - endW - (endW > 0 ? FOOTER.packGap : 0) - labelW : x1
  const folioW = folio != null ? portraitWidth(String(folio), FOOTER.number, ctx, { serif: true }) : 0
  return (
    <g data-portrait-footer="">
      {label && labelFits ? (
        <text {...PORTRAIT_SPEC} {...PORTRAIT_META} data-portrait-label="" x={labelX} y={FOOTER.baseline} fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={quiet} dominantBaseline="alphabetic">
          {label}
        </text>
      ) : null}
      {label && !labelFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {name ? (
        <text {...PORTRAIT_SPEC} {...PORTRAIT_META} data-portrait-speaker="" x={x2 - folioW - (folio != null ? FOOTER.gap : 0)} y={FOOTER.baseline} textAnchor="end" fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={quiet} dominantBaseline="alphabetic">
          {name}
        </text>
      ) : null}
      {folio != null ? (
        <text {...PORTRAIT_SPEC} {...PORTRAIT_META} data-field={SLIDE_NUMBER_FIELD} data-portrait-folio="" x={x2} y={FOOTER.baseline} textAnchor="end" fontFamily={ctx.fonts.heading} fontSize={FOOTER.number} fill={portraitText(inks.ink, inks.ground, FOOTER.number)} dominantBaseline="alphabetic">
          {String(folio)}
        </text>
      ) : null}
    </g>
  )
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitPortraitSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = PORTRAIT_W, maxLines: number = SOURCE.maxLines): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, lines: number) =>
    fitEmphasisText(text, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines: lines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, maxLines), lineHeight: SOURCE.lineHeight }
  if (maxLines < 2) return { ...fit(parts.join(" "), 1), lineHeight: SOURCE.lineHeight, truncated: true }
  const first = fit(parts[0]!, 1)
  const second = fit(parts.slice(1).join(" "), 1)
  return { ...first, lines: [...first.lines, ...second.lines], segments: [...first.segments, ...second.segments], lineHeight: SOURCE.lineHeight, truncated: first.truncated || second.truncated }
}

/** The source from `top`, risen a line when it takes two and would pass the foot. */
export function PortraitSource({ source, ctx, x = PORTRAIT_LEFT, top = SOURCE.top }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = portraitInks(ctx)
  const from = Math.min(top, SOURCE.foot - source.lines.length * source.lineHeight)
  return <g data-portrait-source="">{paintPortrait(source, { ctx, x, top: from, fill: portraitMeta(inks.muted, inks.ground), attrs: { ...PORTRAIT_SPEC, ...PORTRAIT_META }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}</g>
}

/**
 * The source in the footer row, after the deck's label and a 12px space, as
 * the board credits a photograph there (「图为 AI 生成的示意图」), when it
 * fits on one line before the name and the page number. `null` otherwise.
 */
export function PortraitFooterSource({ slide, ctx, x, w, label, endWidth }: { slide: Pick<Slide, "footnote">; ctx: ComponentCtx; x: number; w: number; label: string | null; endWidth: number }): React.ReactElement | null {
  const text = stripEmphasis(slide.footnote ?? "").trim()
  if (!text || text.includes("\n")) return null
  const inks = portraitInks(ctx)
  const at = x + (label ? portraitWidth(label, FOOTER.size, ctx) + FOOTER.gap : 0)
  const room = x + w - at - (endWidth > 0 ? endWidth + FOOTER.packGap : 0)
  if (portraitWidth(text, FOOTER.size, ctx) > room) return null
  return (
    <text {...PORTRAIT_SPEC} {...PORTRAIT_META} data-portrait-source="" data-portrait-credit="" x={at} y={FOOTER.baseline} fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={portraitMeta(inks.muted, inks.ground)} dominantBaseline="alphabetic">
      {text}
    </text>
  )
}

/**
 * The source a composition places, or `undefined` when the page has none:
 * on its own line in its column, or in the footer row when the composition
 * asks and the source fits after the label there, or alone in the row when
 * the deck has no footer (else on its own line). The placer answers `null` when it does
 * not fit.
 */
export function portraitSourceIn(
  slide: Pick<Slide, "footnote">,
  ctx: ComponentCtx,
  row: { label: string | null; name: string | null; folio: number | null; drawn: boolean },
): ((column: PortraitSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top, footer }) => {
    // Called, not mounted: a credit too long for the footer row answers null
    // here, and goes on its own line over the row instead. A deck with no
    // footer leaves the row empty, and the credit takes it alone.
    const credit = !footer ? null : row.drawn ? PortraitFooterSource({ slide, ctx, x, w, label: row.label, endWidth: portraitFooterEndWidth(ctx, row.name, row.folio) }) : PortraitFooterSource({ slide, ctx, x, w, label: null, endWidth: 0 })
    if (credit) return credit
    const source = fitPortraitSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <PortraitSource source={source} ctx={ctx} x={x} top={top ?? SOURCE.top} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole page, which it sets by its board's coordinates. */
export function portraitBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under a claim of `claimLines` lines. */
export function portraitBodyRect(claimLines = 1, source = false): ContentRect {
  const top = CLAIM.top + claimLines * CLAIM.lineHeight + BODY.gap
  const bottom = source ? SOURCE.top - 20 : BODY.bottom + 30
  return { x: PORTRAIT_LEFT, y: top, w: PORTRAIT_W, h: bottom - top }
}
