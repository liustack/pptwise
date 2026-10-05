import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { CALLOUT_ICON, paintIcon, splitNote } from "./console"
import { fitMemo, memoInks, memoOn, memoText, memoWidth, paintMemo, paintMemoLine } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type RowCards = Extract<Component, { type: "row_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * checks: the conditions that stop a pilot, as a checklist, memo's 2026-10
 * board (the stop conditions page, p14). Each condition is a panel of the
 * paper: an empty box to tick, its icon in the mark, its kind in the heading
 * face in the mark and what is measured in bold (a row titled 「客户：首次响
 * 应时间」 splits at its colon), then the threshold after a typed 「IF」 in
 * the mark. What happens once one trips closes the page as a banner of the
 * mark, its icon and its words lettered in the paper.
 *
 * Takes, in the memo setting: one `row_cards` of three to six rows with no
 * `sub`, tone or highlight, every row with a `text` (the threshold), then
 * optionally a `callout`.
 *
 * The kind's column is the board's 86px, wider when a kind needs it (up to
 * 160px), the measure's and the threshold's moving right with it.
 *
 * Declines: a kind, a measure or a threshold that does not fit its column,
 * a banner past two lines, rows taller than the band.
 *
 * Reads: the memo inks (`./memo.tsx`), the heading, body and mono faces.
 */

const ROWS = { top: 6, h: 74, pitch: 86 } as const
const BOX = { x: 18, top: 24, size: 24, stroke: 2 } as const
const ICON = { x: 64, top: 24, size: 24 } as const
/** The kind's column: 86px as the board drew it, wider for a longer kind ("Customers"), up to 160px. */
const KIND = { x: 104, w: 86, maxW: 160, pad: 16, size: 20, lineHeight: 30, top: 22 } as const
const MEASURE = { w: 230, size: 17, lineHeight: 28, top: 23 } as const
/** The typed 「IF」 and its threshold, past the measure's column. */
const RULE = { after: 10, size: 17, lineHeight: 28, top: 23, gap: 16, word: "IF" } as const
const BANNER = { h: 84, foot: 8, pad: 28, icon: 30, gap: 14, size: 19, lineHeight: 24, maxLines: 2 } as const

export const checksComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [cards, note, ...rest] = components
  if (cards?.type !== "row_cards" || rest.length > 0) return null
  if (note && note.type !== "callout") return null
  const rows = (cards as RowCards).items
  if (rows.length < 3 || rows.length > 6 || rows.some((row) => row.sub?.trim() || row.tone || row.highlight || !row.text?.trim())) return null
  const inks = memoInks(ctx)
  const ifW = memoWidth(RULE.word, RULE.size, "mono", ctx)
  const fitted: { icon?: string; kind: EmphasisHeadingLayout | null; measure: EmphasisHeadingLayout; threshold: EmphasisHeadingLayout; glossBreak?: string }[] = []
  const splits = rows.map((row) => splitNote(row.title))
  const widestKind = Math.max(0, ...splits.map((split) => (split.label ? memoWidth(split.label, KIND.size, "song", ctx, true) : 0)))
  const kindW = Math.min(KIND.maxW, Math.max(KIND.w, Math.ceil(widestKind) + KIND.pad))
  const measureX = KIND.x + kindW
  const ruleX = measureX + MEASURE.w + RULE.after
  const thresholdW = rect.w - ruleX - ifW - RULE.gap - 16
  for (const [r, row] of rows.entries()) {
    const split = splits[r]!
    const kind = split.label ? fitMemo(split.label, { width: kindW, size: KIND.size, lineHeight: KIND.lineHeight, maxLines: 1, face: "song", bold: true }, ctx) : null
    const measure = fitMemo(
      split.label ? split.text : row.title,
      { width: split.label ? MEASURE.w : measureX + MEASURE.w - KIND.x, size: MEASURE.size, lineHeight: MEASURE.lineHeight, maxLines: 1, face: "body", bold: true },
      ctx,
    )
    const threshold = fitMemo(row.text, { width: thresholdW, size: RULE.size, lineHeight: RULE.lineHeight, maxLines: 1, face: "body" }, ctx)
    if ((split.label && !kind) || !measure || !threshold) return null
    fitted.push({ icon: row.icon, kind, measure, threshold, ...(split.glossBreak ? { glossBreak: split.glossBreak } : {}) })
  }
  const banner = note
    ? fitMemo(
        (note as Callout).text,
        { width: rect.w - BANNER.pad * 2 - BANNER.icon - BANNER.gap, size: BANNER.size, lineHeight: BANNER.lineHeight, maxLines: BANNER.maxLines, face: "song", bold: true },
        ctx,
      )
    : null
  if (note && !banner) return null
  const bannerTop = rect.y + rect.h - BANNER.foot - BANNER.h
  const rowsBottom = rect.y + ROWS.top + (rows.length - 1) * ROWS.pitch + ROWS.h
  if (rowsBottom > (banner ? bannerTop - 12 : rect.y + rect.h)) return null
  const bannerInk = memoOn(inks.mark, inks.paper, BANNER.size)
  return (
    <g {...compositionTag("checks")}>
      <g {...blockTag(ctx, cards)}>
        {fitted.map(({ icon, kind, measure, threshold, glossBreak }, i) => {
          const top = rect.y + ROWS.top + i * ROWS.pitch
          const ground = inks.paper
          return (
            <g key={i} data-memo-check={i}>
              <rect x={rect.x + 0.5} y={top + 0.5} width={rect.w - 1} height={ROWS.h - 1} fill={ground} stroke={inks.line} strokeWidth={1} />
              <rect
                data-memo-tickbox=""
                x={rect.x + BOX.x + BOX.stroke / 2}
                y={top + BOX.top + BOX.stroke / 2}
                width={BOX.size - BOX.stroke}
                height={BOX.size - BOX.stroke}
                fill="none"
                stroke={inks.ink}
                strokeWidth={BOX.stroke}
              />
              {icon ? paintIcon(icon, rect.x + ICON.x, top + ICON.top, ICON.size, inks.mark, ground) : null}
              {kind
                ? paintMemo(kind, {
                    ctx,
                    x: rect.x + KIND.x,
                    top: top + KIND.top,
                    face: "song",
                    bold: true,
                    fill: memoText(inks.mark, ground, KIND.size),
                    ...(glossBreak ? { lastAttrs: { "data-gloss-break": glossBreak } } : {}),
                  })
                : null}
              {paintMemo(measure, { ctx, x: rect.x + (kind ? measureX : KIND.x), top: top + MEASURE.top, face: "body", bold: true, fill: memoText(inks.ink, ground, MEASURE.size) })}
              {paintMemoLine(RULE.word, {
                ctx,
                x: rect.x + ruleX,
                top: top + RULE.top,
                lineHeight: RULE.lineHeight,
                size: RULE.size,
                face: "mono",
                fill: memoText(inks.mark, ground, RULE.size),
                attrs: { "data-memo-if": "" },
              })}
              {paintMemo(threshold, { ctx, x: rect.x + ruleX + ifW + RULE.gap, top: top + RULE.top, face: "body", fill: memoText(inks.ink, ground, RULE.size) })}
            </g>
          )
        })}
      </g>
      {note && banner ? (
        <g {...blockTag(ctx, note)} data-memo-stop-banner="">
          <rect x={rect.x} y={bannerTop} width={rect.w} height={BANNER.h} fill={inks.mark} />
          {paintIcon((note as Callout).icon ?? CALLOUT_ICON[(note as Callout).variant], rect.x + BANNER.pad - 6, bannerTop + (BANNER.h - BANNER.icon) / 2, BANNER.icon, bannerInk, inks.mark)}
          {paintMemo(banner, {
            ctx,
            x: rect.x + BANNER.pad + BANNER.icon + BANNER.gap,
            top: bannerTop + (BANNER.h - banner.lines.length * BANNER.lineHeight) / 2,
            face: "song",
            bold: true,
            fill: bannerInk,
            ground: inks.mark,
          })}
        </g>
      ) : null}
    </g>
  )
}
