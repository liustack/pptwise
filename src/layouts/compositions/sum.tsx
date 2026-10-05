import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { drawableItems } from "../boundary-content"
import { splitNote } from "./console"
import { splitRow } from "./rows"
import { fitMemo, memoInks, memoText, memoWidth, paintMemo, paintMemoLine, type MemoInks } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type Bullets = Extract<Component, { type: "bullets" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * sum: a sum worked on ruled paper, memo's 2026-10 board (the arithmetic page,
 * p11). A panel of the paper ruled every 48px like a pad, the rules left out
 * behind the answer so none crosses its figure. Each line of the
 * working is a label in the muted mono and its figures in mono, one to a
 * ruled line. A 2px rule of ink closes the working, and under it the answer:
 * its label, and the figure set very large in the heading face in the mark.
 *
 * Beside the pad a note may stand behind a 2px rule of the mark down its left
 * edge: its label in the mark, what it says in the heading face, a short
 * rule of the mark, and what follows from it in the muted ink. The callout's
 * first paragraph is what it says, the next what follows.
 *
 * Takes, in the memo setting: a `bullets` of one to four items written
 * "Label: working", then a `kpi_cards` of one item (the answer and its
 * label), then optionally a `callout` written "Label: what it says" with an
 * optional second paragraph after a line break.
 *
 * Declines: a working past one line, an answer wider than the pad, a note
 * too long for its column.
 *
 * Reads: the memo inks (`./memo.tsx`), the mono and heading faces.
 */

const PAD = { top: 14, h: 420, ruled: 48, x: 30, figureX: 230, label: { size: 18 }, figure: { size: 24 } } as const
const ANSWER = { size: 110, lineHeight: 130, rise: 4 } as const
const NOTE = {
  w: 296,
  gap: 40,
  rule: 2,
  pad: 24,
  label: { top: 4, size: 13, lineHeight: 22 },
  said: { top: 36, size: 19, lineHeight: 30, maxLines: 4, minBlock: 130 },
  short: { gap: 14, w: 60 },
  then: { gap: 16, size: 15, lineHeight: 24, maxLines: 4 },
} as const

export const sumComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [bullets, kpis, note, ...rest] = components
  if (bullets?.type !== "bullets" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (note && note.type !== "callout") return null
  const answer = (kpis as KpiCards).items
  if (answer.length !== 1 || answer[0]!.icon || answer[0]!.delta || answer[0]!.tag || answer[0]!.note?.trim()) return null
  const items = drawableItems((bullets as Bullets).items).map((item) => ({ ...splitRow(item), colon: /[：:]/u.exec(item)?.[0] ?? "：" }))
  if (items.length < 1 || items.length > 4 || items.some((item) => !item.label)) return null
  const inks = memoInks(ctx)
  const padW = note ? rect.w - NOTE.w - NOTE.gap : rect.w
  const lineW = padW - PAD.figureX - 20
  const lines = items.map((item) => ({ label: item.label!, figure: item.gloss, colon: item.colon }))
  if (lines.some((l) => memoWidth(l.label, PAD.label.size, "mono", ctx) > PAD.figureX - PAD.x - 10 || memoWidth(l.figure, PAD.figure.size, "mono", ctx) > lineW)) return null
  const { text, unit } = kpiFigure(answer[0]!.value, answer[0]!.unit)
  const figure = joinUnit(text, unit?.trim() || undefined)
  if (memoWidth(figure, ANSWER.size, "song", ctx, true) > lineW) return null
  const answerLabel = answer[0]!.label
  if (memoWidth(answerLabel, PAD.label.size, "mono", ctx) > PAD.figureX - PAD.x - 10) return null
  const padTop = rect.y + PAD.top
  const rowsTop = padTop + PAD.ruled
  const answerTop = rowsTop + lines.length * PAD.ruled
  if (answerTop + ANSWER.lineHeight > padTop + PAD.h || padTop + PAD.h > rect.y + rect.h) return null
  const side = note ? fitNote(note as Callout, ctx, inks) : null
  if (note && !side) return null
  // The pad is ruled every 48px, but not across the answer: a rule through
  // a figure that tall reads as a line struck through it. The answer stands
  // in the clear band from the ink rule to the foot of its line box.
  const answerFoot = answerTop - ANSWER.rise + ANSWER.lineHeight
  const rulings: number[] = []
  for (let y = padTop + PAD.ruled - 1; y < padTop + PAD.h - 1; y += PAD.ruled) if (y < answerTop || y > answerFoot) rulings.push(y)
  return (
    <g {...compositionTag("sum")}>
      <g data-memo-pad="">
        <rect x={rect.x + 0.5} y={padTop + 0.5} width={padW - 1} height={PAD.h - 1} fill={inks.paper} stroke={inks.line} strokeWidth={1} />
        {rulings.map((y, i) => (
          <rect key={i} x={rect.x + 1} y={y} width={padW - 2} height={1} fill={inks.line} />
        ))}
        <g {...blockTag(ctx, bullets)}>
          {lines.map((line, i) => {
            const top = rowsTop + i * PAD.ruled
            return (
              <g key={i}>
                {paintMemoLine(line.label, {
                  ctx,
                  x: rect.x + PAD.x,
                  top,
                  lineHeight: PAD.ruled,
                  size: PAD.label.size,
                  face: "mono",
                  fill: memoText(inks.muted, inks.paper, PAD.label.size),
                  attrs: { "data-gloss-break": line.colon },
                })}
                {paintMemoLine(line.figure, { ctx, x: rect.x + PAD.figureX, top, lineHeight: PAD.ruled, size: PAD.figure.size, face: "mono", fill: memoText(inks.ink, inks.paper, PAD.figure.size) })}
              </g>
            )
          })}
        </g>
        <g {...blockTag(ctx, kpis)}>
          <rect x={rect.x + PAD.x} y={answerTop - 2} width={padW - PAD.x * 2 - 20} height={2} fill={inks.ink} />
          {paintMemoLine(answerLabel, { ctx, x: rect.x + PAD.x, top: answerTop, lineHeight: PAD.ruled, size: PAD.label.size, face: "mono", fill: memoText(inks.muted, inks.paper, PAD.label.size) })}
          {paintMemoLine(figure, {
            ctx,
            x: rect.x + PAD.figureX,
            top: answerTop - ANSWER.rise,
            lineHeight: ANSWER.lineHeight,
            size: ANSWER.size,
            face: "song",
            bold: true,
            fill: memoText(inks.mark, inks.paper, ANSWER.size),
          })}
        </g>
      </g>
      {note && side ? <g {...blockTag(ctx, note)}>{side(rect.x + rect.w - NOTE.w, padTop)}</g> : null}
    </g>
  )
}

/** The note beside the pad: label, what it says, a short rule, what follows. */
function fitNote(callout: Callout, ctx: ComponentCtx, inks: MemoInks): ((x: number, y: number) => React.ReactNode) | null {
  const inner = NOTE.w - NOTE.pad
  const split = splitNote(callout.text)
  const [said, ...then] = split.text
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (!said) return null
  const label = split.label ? fitMemo(split.label, { width: inner, size: NOTE.label.size, lineHeight: NOTE.label.lineHeight, maxLines: 1, face: "mono", bold: true }, ctx) : null
  if (split.label && !label) return null
  const saidLayout = fitMemo(said, { width: inner, size: NOTE.said.size, lineHeight: NOTE.said.lineHeight, maxLines: NOTE.said.maxLines, face: "song" }, ctx)
  const thenLayout: EmphasisHeadingLayout | null = then.length
    ? fitMemo(then.join(""), { width: inner, size: NOTE.then.size, lineHeight: NOTE.then.lineHeight, maxLines: NOTE.then.maxLines, face: "body" }, ctx)
    : null
  if (!saidLayout || (then.length && !thenLayout)) return null
  return (x, y) => {
    const tx = x + NOTE.pad
    const shortY = y + NOTE.said.top + Math.max(NOTE.said.minBlock, saidLayout.lines.length * NOTE.said.lineHeight) + NOTE.short.gap
    return (
      <g data-memo-side-note="">
        <rect x={x} y={y} width={NOTE.rule} height={PAD.h} fill={inks.mark} />
        {label
          ? paintMemo(label, {
              ctx,
              x: tx,
              top: y + NOTE.label.top,
              face: "mono",
              bold: true,
              fill: memoText(inks.mark, inks.ground, NOTE.label.size),
              ...(split.glossBreak ? { lastAttrs: { "data-gloss-break": split.glossBreak } } : {}),
            })
          : null}
        {paintMemo(saidLayout, { ctx, x: tx, top: y + NOTE.said.top, face: "song", fill: memoText(inks.ink, inks.ground, NOTE.said.size) })}
        {thenLayout ? <rect x={tx} y={shortY} width={NOTE.short.w} height={1} fill={inks.mark} /> : null}
        {thenLayout ? paintMemo(thenLayout, { ctx, x: tx, top: shortY + NOTE.then.gap, face: "body", fill: memoText(inks.muted, inks.ground, NOTE.then.size) }) : null}
      </g>
    )
  }
}
