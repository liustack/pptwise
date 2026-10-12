import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, parseEmphasis, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { stageIndex } from "../render/course-marks"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitKeynoteClaim } from "./keynote-shared"
import { portraitFooterLabel } from "./portrait-shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_META,
  ACCOUNT_RIGHT,
  ACCOUNT_SPEC,
  ACCOUNT_W,
  CLAIM_LINE,
  SECTION,
  SOURCE_LINE,
  accountInks,
  accountMark,
  accountMeta,
  accountText,
  accountTrackedWidth,
  accountWidth,
  figureValueWidth,
  paintAccount,
  paintAccountTracked,
  type AccountClaimColumn,
  type AccountKickerColumn,
  type AccountSourceColumn,
} from "./compositions/account"

/*
 * The account frame: what every recap content page wears, settled on
 * recap's 2026-10 board (`design/rounds/2026-10-13-recap/`).
 *
 * Over the claim a small line names the part of the report the page is in:
 * the part's number, two figures in the deep accent (「01」), then its name
 * tracked in the grey (「今年的账」, "This year's numbers"). The number is
 * the place of the page's `stage` in the deck's `course`; a page that names
 * no stage prints its `kicker` alone. Under it the claim heavy in the body
 * sans at 32/45 across the measure (x80 to x1200, or the column beside a
 * photograph), on one line whenever it fits, broken at a comma or a colon
 * when it does not. A run the author marked in the claim is underlined with
 * a 4px rule in the danger red: what the reviewers must not miss in a year's
 * account is what went wrong. The source on a line of its own in the grey at
 * 13px from y640, or, when it credits a photograph, in the footer after the
 * deck's label.
 *
 * Along the foot of every content page the footer row on y688: the deck's
 * label at the left at 12px in the grey, the speaker's name and the occasion
 * (the deck's first author and the cover's kicker, 「周启航 · 2026 年度述职」)
 * and the page number in the figure face at the right. The motif paints it
 * (`motifs/motif-recap-motif.tsx`). The cover, the chapters and the close
 * paint their own.
 */

export { ACCOUNT_LEFT, ACCOUNT_RIGHT, ACCOUNT_W }

/** The claim: 32/45 heavy in the body sans, its first line's box from y84, two lines at most. */
export const CLAIM = { x: ACCOUNT_LEFT, w: ACCOUNT_W, top: CLAIM_LINE.top, size: CLAIM_LINE.size, lineHeight: CLAIM_LINE.lineHeight, maxLines: 2 } as const

/** The source on its own line: 13/20 in the grey from y640, two lines at most, its last ending by y664. */
export const SOURCE = { ...SOURCE_LINE, maxLines: 2, foot: 664 } as const

/** The footer row: 12px words in the grey and the page number at 14px in the figure face, on y688, from x80 to x1200. */
export const FOOTER = { baseline: 688, size: 12, number: 14, x1: ACCOUNT_LEFT, x2: ACCOUNT_RIGHT, gap: 12, packGap: 24 } as const

/** Where a body set under the claim by the ordinary renderer starts (40px under the claim) and ends. */
export const BODY = { gap: 40, bottom: 620 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const ACCOUNT_HEAD_FIT = { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.size, bold: true, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The section line ────────────────────────────────────────────────────

/** The section line's two parts: the part's number (「01」), or `null` when the page names no stage, and its name. */
export interface AccountSectionText {
  number: string | null
  label: string
}

/**
 * The words of the page's section line: the stage of the deck's course the
 * page names, after its two-figure number, then the page's kicker when it
 * writes one too, or the kicker alone when the page names no stage, or `null`.
 */
export function accountSectionText(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage" | "kicker">): AccountSectionText | null {
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const course = ir.course
  const at = course && slide.stage ? stageIndex(course, slide.stage) : -1
  if (!course || at < 0) return kicker ? { number: null, label: kicker } : null
  const label = stripEmphasis(course.stages[at]!.label).trim()
  return { number: String(at + 1).padStart(2, "0"), label: kicker ? `${label} · ${kicker}` : label }
}

/** The section line's width. */
export function accountSectionWidth(section: AccountSectionText, ctx: Pick<ComponentCtx, "fonts">): number {
  const number = section.number ? figureValueWidth(section.number, SECTION.number, ctx) + SECTION.gap : 0
  return number + accountTrackedWidth(section.label, SECTION.size, SECTION.tracking, ctx)
}

/** The section line from `x`, its baseline 16px under `top`. */
export function AccountSection({ section, ctx, x, top = SECTION.top }: { section: AccountSectionText; ctx: ComponentCtx; x: number; top?: number }): React.ReactElement {
  const inks = accountInks(ctx)
  const baseline = top + (SECTION.baseline - SECTION.top)
  const numberW = section.number ? figureValueWidth(section.number, SECTION.number, ctx) : 0
  return (
    <g data-account-section={section.label}>
      {section.number ? (
        <text x={x} y={baseline} fontFamily={ctx.fonts.figure} fontSize={SECTION.number} fontWeight="700" fill={accountText(inks.deep, inks.ground, SECTION.number)} dominantBaseline="alphabetic">
          {section.number}
        </text>
      ) : null}
      {paintAccountTracked({ ctx, text: section.label, x: x + (section.number ? numberW + SECTION.gap : 0), y: baseline, size: SECTION.size, tracking: SECTION.tracking, fill: accountText(inks.muted, inks.ground, SECTION.size) })}
    </g>
  )
}

/** The section line a composition places in a column of its own, or `undefined` when the page has none. The placer answers `null` when it does not fit. */
export function accountKickerIn(ir: Pick<PptxIR, "course">, slide: Pick<Slide, "stage" | "kicker">, ctx: ComponentCtx): ((column: AccountKickerColumn) => React.ReactElement | null) | undefined {
  const section = accountSectionText(ir, slide)
  if (!section) return undefined
  return (column) => (accountSectionWidth(section, ctx) > column.w ? null : AccountSection({ section, ctx, x: column.x, top: column.top }))
}

// ── The claim ───────────────────────────────────────────────────────────

/** The claim fitted heavy to a column: on one line when it fits, else broken at a comma or a colon. */
export function fitAccountClaim(heading: string | undefined, ctx: Pick<ComponentCtx, "fonts">, width: number = CLAIM.w, maxLines: number = CLAIM.maxLines, size: number = CLAIM.size, lineHeight: number = CLAIM.lineHeight): EmphasisHeadingLayout {
  // The claim keeps its size and wraps, as the board sets it, rather than shrinking onto one line.
  return fitKeynoteClaim(heading, ctx, width, size, lineHeight, maxLines, size)
}

/** The underline under a marked run of the claim: 4px of the danger red, 8px under the baseline. */
const MARK_RULE = { h: 4, drop: 8 } as const

/** The claim painted from its column's left, its first line's box from `top`, a marked run underlined in the danger red. */
export function AccountClaim({ ctx, layout, x, top }: { ctx: ComponentCtx; layout: EmphasisHeadingLayout; x: number; top: number }): React.ReactElement {
  const inks = accountInks(ctx)
  const ink = accountText(inks.ink, inks.ground, layout.fontSize)
  const first = top + layout.lineHeight / 2 + layout.fontSize * 0.35
  const rules: React.ReactElement[] = []
  layout.lines.forEach((line, i) => {
    let at = x
    for (const seg of layout.segments[i] ?? [{ text: line, emphasized: false }]) {
      const w = measureTextUnits(seg.text, { fontFamily: ctx.fonts.heading, bold: true }) * layout.fontSize
      if (seg.emphasized && seg.text.trim()) rules.push(<rect key={`${i}-${at}`} data-account-claim-mark="" x={at} y={Math.round(first + i * layout.lineHeight + MARK_RULE.drop)} width={w} height={MARK_RULE.h} fill={accountMark(inks.danger, inks.ground)} />)
      at += w
    }
  })
  return (
    <g data-account-claim="">
      {paintAccount(layout, { ctx, x, top, fill: ink, lit: inks.ink, serif: true, bold: true, lastAttrs: layout.truncated ? { "data-truncated": "1" } : undefined })}
      {rules}
    </g>
  )
}

/** The claim a composition places in a column of its own, or `null` when it would not fit that column whole. */
export function accountClaimIn(slide: Pick<Slide, "heading">, ctx: ComponentCtx): (column: AccountClaimColumn) => React.ReactElement | null {
  return (column) => {
    if (!stripEmphasis(slide.heading ?? "").trim()) return null
    const maxLines = column.maxLines ?? CLAIM.maxLines
    const size = column.size ?? CLAIM.size
    const lineHeight = column.lineHeight ?? CLAIM.lineHeight
    const layout = fitAccountClaim(slide.heading, ctx, column.w, maxLines, size, lineHeight)
    if (layout.truncated || layout.lines.length > maxLines) return null
    return <AccountClaim ctx={ctx} layout={layout} x={column.x} top={column.top ?? CLAIM.top} />
  }
}

/** Whether the claim writes a marked run. */
export function claimMarked(heading: string | undefined): boolean {
  return parseEmphasis(heading ?? "").some((s) => s.emphasized)
}

// ── The footer row ──────────────────────────────────────────────────────

/** The deck's marks at the left of the footer row: profile's label, joined by a middle dot. */
export const accountFooterLabel = portraitFooterLabel

/** The occasion the deck is: the cover's kicker (「2026 年度述职」), or `null`. */
export function accountOccasion(ir: Pick<PptxIR, "slides">): string | null {
  const cover = ir.slides.find((s) => s.type === "cover")
  const kicker = cover?.kicker ? stripEmphasis(cover.kicker).trim() : ""
  return kicker || null
}

/** Who the report is by and what it is, at the right of the footer row: 「周启航 · 2026 年度述职」, or `null`. */
export function accountSpeakerLine(ir: Pick<PptxIR, "meta" | "slides">): string | null {
  const name = ir.meta.authors?.[0]?.name ? stripEmphasis(ir.meta.authors[0].name).trim() : ""
  const parts = [name, accountOccasion(ir) ?? ""].filter(Boolean)
  return parts.length ? parts.join(" · ") : null
}

/** The width the right of the row takes: the speaker line, its gap and the page number. */
export function accountFooterEndWidth(ctx: ComponentCtx, speaker: string | null, folio: number | null): number {
  const speakerW = speaker ? accountWidth(speaker, FOOTER.size, ctx) : 0
  const folioW = folio != null ? figureValueWidth(String(folio), FOOTER.number, ctx) : 0
  return speakerW + folioW + (speaker && folio != null ? FOOTER.gap : 0)
}

/**
 * The footer row from `x1` to `x2`: the label at the left, the speaker line
 * and the page number (PowerPoint's slide-number field, so it keeps counting
 * when a page moves) at the right. `light` sets the words in `light` (on the
 * close's accent panel). A label that does not fit beside the rest is
 * declared dropped.
 */
export function AccountFooter({ ctx, label, speaker, folio, x1 = FOOTER.x1, x2 = FOOTER.x2, pack, ground }: { ctx: ComponentCtx; label: string | null; speaker: string | null; folio: number | null; x1?: number; x2?: number; pack?: "end"; ground?: string }): React.ReactElement | null {
  if (!label && !speaker && folio == null) return null
  const inks = accountInks(ctx)
  const on = ground ?? inks.ground
  const quiet = accountMeta(inks.muted, on)
  const endW = accountFooterEndWidth(ctx, speaker, folio)
  const labelW = label ? accountWidth(label, FOOTER.size, ctx) : 0
  const room = x2 - x1 - endW - (endW > 0 ? FOOTER.packGap : 0)
  const labelFits = !label || labelW <= room
  const labelX = pack === "end" ? x2 - endW - (endW > 0 ? FOOTER.packGap : 0) - labelW : x1
  const folioW = folio != null ? figureValueWidth(String(folio), FOOTER.number, ctx) : 0
  return (
    <g data-account-footer="">
      {label && labelFits ? (
        <text {...ACCOUNT_SPEC} {...ACCOUNT_META} data-account-label="" x={labelX} y={FOOTER.baseline} fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={quiet} dominantBaseline="alphabetic">
          {label}
        </text>
      ) : null}
      {label && !labelFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {speaker ? (
        <text {...ACCOUNT_SPEC} {...ACCOUNT_META} data-account-speaker="" x={x2 - folioW - (folio != null ? FOOTER.gap : 0)} y={FOOTER.baseline} textAnchor="end" fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={quiet} dominantBaseline="alphabetic">
          {speaker}
        </text>
      ) : null}
      {folio != null ? (
        <text {...ACCOUNT_SPEC} {...ACCOUNT_META} data-field={SLIDE_NUMBER_FIELD} data-account-folio="" x={x2} y={FOOTER.baseline} textAnchor="end" fontFamily={ctx.fonts.figure} fontSize={FOOTER.number} fontWeight="600" fill={accountText(inks.ink, on, FOOTER.number)} dominantBaseline="alphabetic">
          {String(folio)}
        </text>
      ) : null}
    </g>
  )
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitAccountSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = ACCOUNT_W, maxLines: number = SOURCE.maxLines): EmphasisHeadingLayout | null {
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
export function AccountSource({ source, ctx, x = ACCOUNT_LEFT, top = SOURCE.top }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = accountInks(ctx)
  const from = Math.min(top, SOURCE.foot - source.lines.length * source.lineHeight)
  return <g data-account-source="">{paintAccount(source, { ctx, x, top: from, fill: accountMeta(inks.muted, inks.ground), attrs: { ...ACCOUNT_SPEC, ...ACCOUNT_META }, lastAttrs: source.truncated ? { "data-truncated": "1" } : undefined })}</g>
}

/**
 * The source in the footer row, after the deck's label and an ideographic
 * space (a wider gap in a Latin deck), as the board credits a photograph there (「图为示意图」), when it
 * fits on one line before the speaker line and the page number. `null`
 * otherwise.
 */
export function AccountFooterSource({ slide, ctx, x, w, label, endWidth }: { slide: Pick<Slide, "footnote">; ctx: ComponentCtx; x: number; w: number; label: string | null; endWidth: number }): React.ReactElement | null {
  const text = stripEmphasis(slide.footnote ?? "").trim()
  if (!text || text.includes("\n")) return null
  const inks = accountInks(ctx)
  // An ideographic space parts two Chinese notes. A Latin note has no such
  // space to borrow, so the credit stands off by the footer's wider pack gap.
  const apart = /\p{Script=Han}/u.test(`${label ?? ""}${text}`) ? FOOTER.gap : FOOTER.packGap
  const at = x + (label ? accountWidth(label, FOOTER.size, ctx) + apart : 0)
  const room = x + w - at - (endWidth > 0 ? endWidth + FOOTER.packGap : 0)
  if (accountWidth(text, FOOTER.size, ctx) > room) return null
  return (
    <text {...ACCOUNT_SPEC} {...ACCOUNT_META} data-account-source="" data-account-credit="" x={at} y={FOOTER.baseline} fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={accountMeta(inks.muted, inks.ground)} dominantBaseline="alphabetic">
      {text}
    </text>
  )
}

/** The footer row a content page draws, as the face hands it to the source placer. */
export interface AccountRow {
  label: string | null
  speaker: string | null
  folio: number | null
  drawn: boolean
}

/**
 * The source a composition places, or `undefined` when the page has none:
 * on its own line in its column, or in the footer row when the composition
 * asks and the source fits after the label there, or alone in the row when
 * the deck has no footer. The placer answers `null` when it does not fit.
 */
export function accountSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, row: AccountRow): ((column: AccountSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top, footer }) => {
    const credit = !footer ? null : row.drawn ? AccountFooterSource({ slide, ctx, x, w, label: row.label, endWidth: accountFooterEndWidth(ctx, row.speaker, row.folio) }) : AccountFooterSource({ slide, ctx, x, w, label: null, endWidth: 0 })
    if (credit) return credit
    const source = fitAccountSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <AccountSource source={source} ctx={ctx} x={x} top={top ?? SOURCE.top} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole page, which it sets by its board's coordinates. */
export function accountBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under a claim of `claimLines` lines. */
export function accountBodyRect(claimLines = 1, source = false): ContentRect {
  const top = CLAIM.top + claimLines * CLAIM.lineHeight + BODY.gap
  const bottom = source ? SOURCE.top - 20 : BODY.bottom + 30
  return { x: ACCOUNT_LEFT, y: top, w: ACCOUNT_W, h: bottom - top }
}
