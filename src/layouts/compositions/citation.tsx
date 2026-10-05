import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { blendOver } from "../../render/ink"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { splitNote } from "./console"
import { fitMemo, memoInks, memoMeta, memoText, memoWidth, paintMemo, paintMemoLine, type MemoInks } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type Blockquote = Extract<Component, { type: "blockquote" }>
type Callout = Extract<Component, { type: "callout" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * citation: a quoted original typed as written, then what it means, memo's
 * 2026-10 board (the revenue page, p06). A large faint opening quote mark,
 * the original in the mono face as a typewriter copies it, who said it in
 * small mono under it, a hairline, and the meaning set large in the heading
 * face after its label in the mark (「意为」, "Meaning").
 *
 * Beside it the figures the quote is read against may stand in a panel: its
 * label in the mark, each figure large in the heading face over its label,
 * the marked one in the mark, and a note at the foot.
 *
 * Takes, in the memo setting: a `blockquote`, then optionally a `callout`
 * written "Label: meaning", then optionally a `kpi_cards` of two or three
 * items with no icon, delta or tag, then optionally a `callout` written
 * "Panel label: note".
 *
 * Declines: a quote past five lines, a meaning past two lines, figures that
 * do not fit the panel, any other component.
 *
 * Reads: the memo inks (`./memo.tsx`), the mono, heading and body faces.
 */

const PANEL = {
  w: 296,
  gap: 40,
  top: 14,
  h: 400,
  pad: 22,
  label: { top: 18, size: 13, lineHeight: 22 },
  first: 56,
  figure: { size: 46, lineHeight: 56 },
  name: { gap: 6, size: 15, lineHeight: 24, maxLines: 2 },
  rule: 16,
  note: { size: 13, lineHeight: 20, maxLines: 2, foot: 20 },
} as const
const MARK = { x: -8, top: 22, r: 12, gap: 32, mix: 0.25 } as const
const QUOTE = { top: 70, size: 24, lineHeight: 36, maxLines: 5, minBlock: 130 } as const
const SAID = { gap: 20, size: 14, lineHeight: 22 } as const
const RULE_GAP = 46
const MEANING = { label: { top: 24, size: 14, lineHeight: 26 }, top: 18, x: 60, size: 26, lineHeight: 38, maxLines: 2 } as const

interface CitationShape {
  quote: Blockquote
  meaning?: Callout
  kpis?: KpiCards
  panelNote?: Callout
}

function citationShape(components: readonly Component[]): CitationShape | null {
  const [quote, ...rest] = components
  if (quote?.type !== "blockquote") return null
  const shape: CitationShape = { quote }
  let i = 0
  if (rest[i]?.type === "callout") shape.meaning = rest[i++] as Callout
  if (rest[i]?.type === "kpi_cards") shape.kpis = rest[i++] as KpiCards
  if (shape.kpis && rest[i]?.type === "callout") shape.panelNote = rest[i++] as Callout
  return i === rest.length ? shape : null
}

/** The large opening quote mark, drawn as two shapes: a stroke of type set faint would be text no one can read. */
function quoteMark(x: number, y: number, fill: string): React.ReactElement {
  const { r } = MARK
  const one = (cx: number) => {
    const cy = y
    return `M${cx - r} ${cy} Q${cx - r} ${cy - 2.3 * r} ${cx + 0.7 * r} ${cy - 2.7 * r} L${cx + 0.85 * r} ${cy - 2.3 * r} Q${cx - 0.15 * r} ${cy - 2 * r} ${cx} ${cy - r} A${r} ${r} 0 1 1 ${
      cx - r
    } ${cy} Z`
  }
  return <path data-memo-quote-mark="" d={`${one(x + r)} ${one(x + r + MARK.gap)}`} fill={fill} />
}

export const citationComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const shape = citationShape(components)
  if (!shape) return null
  const inks = memoInks(ctx)
  const leftW = shape.kpis ? rect.w - PANEL.w - PANEL.gap : rect.w
  const quote = fitMemo(shape.quote.text, { width: leftW, size: QUOTE.size, lineHeight: QUOTE.lineHeight, maxLines: QUOTE.maxLines, face: "mono" }, ctx)
  if (!quote) return null
  const said = shape.quote.attribution?.trim() ? fitMemo(shape.quote.attribution, { width: leftW, size: SAID.size, lineHeight: SAID.lineHeight, maxLines: 1, face: "mono" }, ctx) : null
  if (shape.quote.attribution?.trim() && !said) return null
  const split = shape.meaning ? splitNote(shape.meaning.text) : null
  const labelW = split?.label ? memoWidth(split.label, MEANING.label.size, "mono", ctx, true) : 0
  const meaningX = split?.label ? Math.max(MEANING.x, Math.ceil(labelW + 14)) : 0
  const meaning = split ? fitMemo(split.text, { width: leftW - meaningX, size: MEANING.size, lineHeight: MEANING.lineHeight, maxLines: MEANING.maxLines, face: "song", bold: true }, ctx) : null
  if (split && !meaning) return null

  const quoteTop = rect.y + QUOTE.top
  const saidTop = quoteTop + Math.max(QUOTE.minBlock, quote.lines.length * QUOTE.lineHeight) + SAID.gap
  const ruleY = saidTop + RULE_GAP
  const bottom = meaning ? ruleY + MEANING.top + meaning.lines.length * MEANING.lineHeight : ruleY
  if (bottom > rect.y + rect.h) return null
  const panel = shape.kpis ? fitPanel(shape.kpis, shape.panelNote, ctx, inks) : null
  if (shape.kpis && !panel) return null
  return (
    <g {...compositionTag("citation")}>
      <g {...blockTag(ctx, shape.quote)}>
        {quoteMark(rect.x + MARK.x, rect.y + MARK.top + 2.7 * MARK.r, blendOver(inks.mark, inks.ground, MARK.mix))}
        {paintMemo(quote, { ctx, x: rect.x, top: quoteTop, face: "mono", fill: memoText(inks.ink, inks.ground, QUOTE.size) })}
        {said ? paintMemo(said, { ctx, x: rect.x, top: saidTop, face: "mono", fill: memoMeta(inks.muted, inks.ground) }) : null}
      </g>
      <rect x={rect.x} y={ruleY} width={leftW} height={1} fill={inks.line} />
      {shape.meaning && meaning ? (
        <g {...blockTag(ctx, shape.meaning)} data-memo-meaning="">
          {split?.label
            ? paintMemoLine(split.label, {
                ctx,
                x: rect.x,
                top: ruleY + MEANING.label.top,
                lineHeight: MEANING.label.lineHeight,
                size: MEANING.label.size,
                face: "mono",
                bold: true,
                fill: memoText(inks.mark, inks.ground, MEANING.label.size),
                ...(split.glossBreak ? { attrs: { "data-gloss-break": split.glossBreak } } : {}),
              })
            : null}
          {paintMemo(meaning, { ctx, x: rect.x + meaningX, top: ruleY + MEANING.top, face: "song", bold: true, fill: memoText(inks.ink, inks.ground, MEANING.size) })}
        </g>
      ) : null}
      {panel && shape.kpis ? panel(rect.x + rect.w - PANEL.w, rect.y + PANEL.top, [shape.kpis, shape.panelNote]) : null}
    </g>
  )
}

function fitPanel(kpis: KpiCards, note: Callout | undefined, ctx: ComponentCtx, inks: MemoInks) {
  const items = kpis.items
  if (items.length < 2 || items.length > 3 || items.some((item) => item.icon || item.delta || item.tag || item.note?.trim() || item.source?.trim())) return null
  const inner = PANEL.w - PANEL.pad * 2
  const split = note ? splitNote(note.text) : null
  const label = split?.label ? fitMemo(split.label, { width: inner, size: PANEL.label.size, lineHeight: PANEL.label.lineHeight, maxLines: 1, face: "mono", bold: true }, ctx) : null
  if (split?.label && !label) return null
  const foot: EmphasisHeadingLayout | null = split?.text
    ? fitMemo(split.text, { width: inner, size: PANEL.note.size, lineHeight: PANEL.note.lineHeight, maxLines: PANEL.note.maxLines, face: "body" }, ctx)
    : null
  if (split?.text && !foot) return null
  const footH = foot ? foot.lines.length * PANEL.note.lineHeight + PANEL.note.foot : 0
  const pitch = Math.floor((PANEL.h - PANEL.first - footH) / items.length)
  const figures = items.map((item) => {
    const { text, marked, unit } = kpiFigure(item.value, item.unit)
    return { value: joinUnit(text, unit?.trim() || undefined), marked }
  })
  if (figures.some((f) => memoWidth(f.value, PANEL.figure.size, "song", ctx, true) > inner)) return null
  const names = items.map((item) => fitMemo(item.label, { width: inner, size: PANEL.name.size, lineHeight: PANEL.name.lineHeight, maxLines: PANEL.name.maxLines, face: "body" }, ctx))
  if (names.some((name) => !name || PANEL.figure.lineHeight + PANEL.name.gap + name.lines.length * PANEL.name.lineHeight > pitch - PANEL.rule)) return null
  const ground = inks.paper
  return (x: number, y: number, blocks: readonly (Component | undefined)[]) => (
    <g data-memo-figure-panel="">
      <rect x={x + 0.5} y={y + 0.5} width={PANEL.w - 1} height={PANEL.h - 1} fill={ground} stroke={inks.line} strokeWidth={1} />
      <g {...(blocks[1] ? blockTag(ctx, blocks[1]) : {})}>
        {label
          ? paintMemo(label, {
              ctx,
              x: x + PANEL.pad,
              top: y + PANEL.label.top,
              face: "mono",
              bold: true,
              fill: memoText(inks.mark, ground, PANEL.label.size),
              ...(split?.glossBreak ? { lastAttrs: { "data-gloss-break": split.glossBreak } } : {}),
            })
          : null}
        {foot
          ? paintMemo(foot, {
              ctx,
              x: x + PANEL.pad,
              top: y + PANEL.h - PANEL.note.foot - foot.lines.length * PANEL.note.lineHeight,
              face: "body",
              fill: memoText(inks.muted, ground, PANEL.note.size),
            })
          : null}
      </g>
      <g {...blockTag(ctx, blocks[0]!)}>
        {figures.map(({ value, marked }, i) => {
          const top = y + PANEL.first + i * pitch
          return (
            <g key={i} data-memo-figure={marked ? "marked" : ""}>
              {i > 0 ? <rect x={x + PANEL.pad} y={top - PANEL.rule} width={inner} height={1} fill={inks.line} /> : null}
              {paintMemoLine(value, {
                ctx,
                x: x + PANEL.pad,
                top,
                lineHeight: PANEL.figure.lineHeight,
                size: PANEL.figure.size,
                face: "song",
                bold: true,
                fill: memoText(marked ? inks.mark : inks.ink, ground, PANEL.figure.size),
              })}
              {paintMemo(names[i]!, { ctx, x: x + PANEL.pad, top: top + PANEL.figure.lineHeight + PANEL.name.gap, face: "body", fill: memoText(inks.muted, ground, PANEL.name.size) })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
