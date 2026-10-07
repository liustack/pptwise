import type React from "react"
import type { Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import type { ContentRect } from "../render/layout"
import { measureTextUnits } from "../lib/svg-text-layout"
import { fitMemoTitle } from "./compositions/memo"
import {
  INVITATION_META,
  INVITATION_SPEC,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  paintDiamond,
  paintInvitationTracked,
  paintRule,
  type InvitationClaimColumn,
  type InvitationSourceColumn,
} from "./compositions/invitation"

/*
 * The card stock: what every luxe content page wears, settled on luxe's
 * 2026-10 board (`design/rounds/2026-10-08-luxe/`).
 *
 * A hairline frame inset 24px from the edge in the border ink (the motif's).
 * At the top, centred, the chapter the page belongs to in small tracked type
 * in old gold between two short gold rules (the page's `kicker`, 「第一章
 * 顾客变了」, the face's). Under it the claim, centred, in the heading serif at
 * 30px in gold, on one line across the measure (x120 to x1160) whenever it
 * fits, a point or two smaller if that keeps it there, and broken at a comma
 * or a colon when it does not, its last line's box ending on y142, so a
 * claim of one line and a claim of two end on the same line. A gold diamond
 * between two short rules stands 14px under the last line, wherever it ends.
 * The source stands at the foot from y628, 11/15 in the dimmer gold. The
 * occasion at the bottom left and the folio struck as a hallmark at the
 * bottom right are the motif's.
 */

export const INVITATION_LEFT = 64
export const INVITATION_RIGHT = 1216
export const INVITATION_W = INVITATION_RIGHT - INVITATION_LEFT

/** The chapter over the claim: 12px tracked 3px, the line box from y40, a short gold rule each side 28px from the words. */
export const CHAPTER = { top: 40, size: 12, lineHeight: 18, tracking: 3, gap: 28, rule: 28, ruleW: 0.8 } as const

/**
 * The claim: 30px gold serif centred across x120 to x1160, its last line's
 * 38px box ending on y142. It gives up at most a twentieth of its size to
 * stay on one line before it breaks.
 */
export const CLAIM = { x: 120, w: 1040, size: 30, lineHeight: 38, foot: 142, minPt: 26, oneLineFloor: 0.95, maxLines: 2 } as const

/** The diamond under the claim: 14px under its last line's box, a 24px rule each side 8px from its points. */
export const MARK = { gap: 14, r: 4, rule: 24, ruleGap: 8, ruleW: 0.6 } as const

/** The source: 11/15 in the dimmer gold from y628, one line or two. */
export const SOURCE = { x: 64, top: 628, w: 1100, size: 11, lineHeight: 15, maxLines: 2 } as const

/** Where a body set under the claim by the ordinary renderer starts and ends. */
export const BODY = { top: 186, bottom: 616 } as const

/** The heading fit the claim runs over the whole measure, in the shape `LayoutDefinition.headingFit` takes. */
export const INVITATION_HEAD_FIT = { maxWidth: CLAIM.w, fontSize: CLAIM.size, maxLines: CLAIM.maxLines, minPt: CLAIM.minPt, bold: true, lineHeightRatio: CLAIM.lineHeight / CLAIM.size } as const

// ── The chapter ─────────────────────────────────────────────────────────

/** The chapter's words fitted to one line of `width`, or `null` when they do not fit. */
function chapterWords(text: string | null | undefined, width: number, ctx: ComponentCtx, tracking: number): string | null {
  const words = text ? stripEmphasis(text).trim() : ""
  if (!words || words.includes("\n")) return null
  return invitationTrackedWidth(words, CHAPTER.size, tracking, ctx) <= width ? words : null
}

/**
 * The page's chapter in small tracked old gold: centred between two short
 * gold rules on `cx`, or set from `x` with no rules. A drop the audit can
 * find when it does not fit its line.
 */
export function InvitationChapter({ text, ctx, cx, x, top = CHAPTER.top, width = CLAIM.w, tracking = CHAPTER.tracking }: { text: string | null | undefined; ctx: ComponentCtx; cx?: number; x?: number; top?: number; width?: number; tracking?: number }): React.ReactElement | null {
  const raw = text ? stripEmphasis(text).trim() : ""
  if (!raw) return null
  const words = chapterWords(raw, width, ctx, tracking)
  if (!words) return <g data-dropped={1} data-dropped-kind="label" />
  const inks = invitationInks(ctx)
  const y = invitationBaseline(top, CHAPTER.lineHeight, CHAPTER.size)
  const fill = invitationText(inks.muted, inks.ground, CHAPTER.size)
  if (cx !== undefined) {
    const w = invitationTrackedWidth(words, CHAPTER.size, tracking, ctx)
    const ruleY = top + CHAPTER.lineHeight / 2
    const gold = invitationMark(inks.gold, inks.ground)
    const left = cx - w / 2
    return (
      <g data-invitation-chapter={words}>
        {paintRule(left - CHAPTER.gap - CHAPTER.rule, left - CHAPTER.gap, ruleY, gold, CHAPTER.ruleW)}
        {paintInvitationTracked({ ctx, text: words, x: cx, y, size: CHAPTER.size, tracking, fill, anchor: "middle" })}
        {paintRule(left + w + CHAPTER.gap, left + w + CHAPTER.gap + CHAPTER.rule, ruleY, gold, CHAPTER.ruleW)}
      </g>
    )
  }
  return <g data-invitation-chapter={words}>{paintInvitationTracked({ ctx, text: words, x: x ?? INVITATION_LEFT, y, size: CHAPTER.size, tracking, fill })}</g>
}

// ── The claim ───────────────────────────────────────────────────────────

/**
 * The claim fitted to a column of `width` at `size`: on one line whenever it
 * fits, down to 95% of its size, and otherwise on two lines broken at the
 * last comma or colon that lets both fit. A claim the author broke in two
 * keeps the author's break.
 */
export function fitInvitationClaim(heading: string | undefined, ctx: ComponentCtx, width: number = CLAIM.w, size: number = CLAIM.size, lineHeight: number = CLAIM.lineHeight): EmphasisHeadingLayout {
  const plain = stripEmphasis(heading ?? "").trim()
  const floor = Math.round(size * CLAIM.oneLineFloor)
  const parts = (heading ?? "").split(/\n+/u).map((part) => part.trim()).filter(Boolean)
  if (parts.length === 2) {
    for (let s = size; s >= CLAIM.minPt; s -= 1) {
      const fitted = parts.map((part) => fitMemoTitle(part, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily: ctx.fonts.heading, bold: true }))
      if (fitted.every((f) => f.lines.length === 1 && !f.truncated)) {
        return { ...fitted[0]!, lines: fitted.flatMap((f) => f.lines), segments: fitted.flatMap((f) => f.segments), lineHeight }
      }
    }
  }
  if (plain && !plain.includes("\n")) {
    const units = measureTextUnits(plain, { fontFamily: ctx.fonts.heading, bold: true })
    for (let s = size; s >= floor; s -= 1) {
      if (units * s <= width) return { ...fitMemoTitle(heading, { maxWidth: width, fontSize: s, minPt: s, lineHeight, fontFamily: ctx.fonts.heading, bold: true }), lineHeight }
    }
  }
  const layout = fitMemoTitle(heading, { maxWidth: width, fontSize: size, minPt: Math.min(size, CLAIM.minPt), lineHeight, fontFamily: ctx.fonts.heading, bold: true })
  return { ...layout, lineHeight }
}

/**
 * The claim painted in its column, centred on it or set from its left, with
 * its last line's box ending on `foot`, the diamond following it. A claim too
 * long for two lines is cut and says so.
 */
export function InvitationClaim({ heading, ctx, column, layout }: { heading: string | undefined; ctx: ComponentCtx; column: InvitationClaimColumn; layout?: EmphasisHeadingLayout }): React.ReactElement {
  const inks = invitationInks(ctx)
  const lineHeight = column.lineHeight ?? CLAIM.lineHeight
  const title = layout ?? fitInvitationClaim(heading, ctx, column.w, column.size ?? CLAIM.size, lineHeight)
  const foot = column.foot ?? CLAIM.foot
  const align = column.align ?? "center"
  const ink = invitationText(inks.gold, inks.ground, title.fontSize)
  const first = invitationBaseline(foot - lineHeight * title.lines.length, lineHeight, title.fontSize, true)
  const x = align === "center" ? column.x + column.w / 2 : column.x
  const mark = column.mark ?? (align === "center" ? "center" : "none")
  const markY = foot + (column.markGap ?? MARK.gap)
  const gold = invitationMark(inks.gold, inks.ground)
  const markX = align === "center" ? x : column.x + MARK.r
  return (
    <g data-invitation-claim="">
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: ink, accent: invitationText(inks.ivory, inks.ground, title.fontSize), fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: inks.ground }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={x}
          y={first + i * lineHeight}
          textAnchor={align === "center" ? "middle" : undefined}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
      {mark === "none" ? null : (
        <g data-invitation-mark="">
          {paintDiamond(markX, markY, MARK.r, gold)}
          {mark === "center" ? paintRule(markX - MARK.r - MARK.ruleGap - MARK.rule, markX - MARK.r - MARK.ruleGap, markY, gold, MARK.ruleW) : null}
          {paintRule(markX + MARK.r + MARK.ruleGap, markX + MARK.r + MARK.ruleGap + (mark === "center" ? MARK.rule : MARK.rule + 12), markY, gold, MARK.ruleW)}
        </g>
      )}
    </g>
  )
}

/**
 * The claim and the chapter over it a composition places in a column of its
 * own, or `null` when the claim would not fit that column whole: the
 * composition then declines the page.
 */
export function invitationClaimIn(slide: Pick<Slide, "heading" | "kicker">, ctx: ComponentCtx): (column: InvitationClaimColumn) => React.ReactElement | null {
  return (column) => {
    if (!stripEmphasis(slide.heading ?? "").trim()) return null
    const lineHeight = column.lineHeight ?? CLAIM.lineHeight
    const layout = fitInvitationClaim(slide.heading, ctx, column.w, column.size ?? CLAIM.size, lineHeight)
    if (layout.truncated || layout.lines.length > CLAIM.maxLines) return null
    const centred = (column.align ?? "center") === "center"
    const tracking = column.labelTracking ?? CHAPTER.tracking
    if (slide.kicker?.trim() && !chapterWords(slide.kicker, column.w, ctx, tracking)) return null
    return (
      <g data-invitation-head="">
        <InvitationChapter text={slide.kicker} ctx={ctx} {...(centred ? { cx: column.x + column.w / 2 } : { x: column.x })} top={column.labelTop ?? CHAPTER.top} width={column.w} tracking={tracking} />
        <InvitationClaim heading={slide.heading} ctx={ctx} column={column} layout={layout} />
      </g>
    )
  }
}

// ── The source ─────────────────────────────────────────────────────────

/** The page's source fitted to a column of `width`: the author's own line breaks kept, two lines at most, or `null` when there is none. */
export function fitInvitationSource(slide: Pick<Slide, "footnote">, ctx: ComponentCtx, width: number = SOURCE.w): EmphasisHeadingLayout | null {
  const parts = (slide.footnote ?? "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (parts.length === 0) return null
  const fit = (text: string, maxLines: number) =>
    fitEmphasisText(text, { maxWidth: width, fontSize: SOURCE.size, minPt: SOURCE.size, maxLines, lineHeightRatio: SOURCE.lineHeight / SOURCE.size, fontFamily: ctx.fonts.body, bold: false })
  if (parts.length === 1) return { ...fit(parts[0]!, SOURCE.maxLines), lineHeight: SOURCE.lineHeight }
  const first = fit(parts[0]!, 1)
  const second = fit(parts.slice(1).join(" "), 1)
  return { ...first, lines: [...first.lines, ...second.lines], segments: [...first.segments, ...second.segments], lineHeight: SOURCE.lineHeight, truncated: first.truncated || second.truncated }
}

export function InvitationSource({ source, ctx, x = SOURCE.x, top = SOURCE.top }: { source: EmphasisHeadingLayout | null; ctx: ComponentCtx; x?: number; top?: number }): React.ReactElement | null {
  if (!source) return null
  const inks = invitationInks(ctx)
  const ink = invitationMeta(inks.dim, inks.ground)
  return (
    <g data-invitation-source="">
      {renderEmphasisHeading(source, headingEmphasisPaint(ctx, source, { baseFill: ink, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
        <text
          key={i}
          {...INVITATION_SPEC}
          {...INVITATION_META}
          data-truncated={source.truncated && i === source.lines.length - 1 ? "1" : undefined}
          x={x}
          y={invitationBaseline(top + i * SOURCE.lineHeight, SOURCE.lineHeight, SOURCE.size)}
          fontFamily={ctx.fonts.body}
          fontSize={SOURCE.size}
          fill={ink}
          dominantBaseline="alphabetic"
        />
      ))}
    </g>
  )
}

/**
 * The source a composition places in a column of its own, or `undefined`
 * when the page has none. The placer answers `null` when the source would
 * not fit the column whole.
 */
export function invitationSourceIn(slide: Pick<Slide, "footnote">, ctx: ComponentCtx): ((column: InvitationSourceColumn) => React.ReactElement | null) | undefined {
  if (!slide.footnote?.trim()) return undefined
  return ({ x, w, top }) => {
    const source = fitInvitationSource(slide, ctx, w)
    if (!source || source.truncated) return null
    return <InvitationSource source={source} ctx={ctx} x={x} top={top ?? SOURCE.top} />
  }
}

// ── The bands ──────────────────────────────────────────────────────────

/** The band a composition is handed: the whole card, which it sets by its board's coordinates. */
export function invitationBandRect(): ContentRect {
  return { x: 0, y: 0, w: 1280, h: 720 }
}

/** The band the ordinary renderer sets a body in, under the claim and its diamond. */
export function invitationBodyRect(): ContentRect {
  return { x: INVITATION_LEFT, y: BODY.top, w: INVITATION_W, h: BODY.bottom - BODY.top }
}
