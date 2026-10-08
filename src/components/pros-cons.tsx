import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import { Icon } from "../render/icons"
import { FORM_BODY_FLOOR, fitFormLine } from "./legibility"
import { layoutSvgText } from "../lib/svg-text-layout"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type ProsConsComponent = Extract<Component, { type: "pros_cons" }>
type Side = ProsConsComponent["pros"]

/**
 * 支持与反对两栏，每条一个记号加一行论点，底下一条通栏结论。
 *
 * 两个记号是勾和叉——形状本身承担区分，因为主题里没有语义化的红绿 token，
 * 也不该有：`swot` 早就立过这条规矩（颜色只从主题 token 里来）。勾用
 * primary，叉用 muted，两边的标题一样重，页面不预先替读者站队。
 *
 * 结论是一条整块 primary 填色、文字反白的横幅：强调只用整块填色，不用边条。
 *
 * 行距是唯一会被压缩的量。两栏各五条又都带一行说明时，自然高度会超过内容
 * 区的最窄一档，所以行距先让步（到 0 为止），字号不动——字号有可读下限，
 * 呼吸没有。
 *
 * A point that will not fit one line, even at the floor, takes a second line
 * at its own size rather than costing the whole weighing: the row grows by a
 * line and the rows under it move down, the other column's row moving with
 * it so the two sides stay level. A point that needs a third line is still
 * declared, and the page steps aside.
 */

const COL_GAP = 32
const PAD_X = 24
const PAD_Y = 16
const HEADER_H = 40
const MARK = 18
const MARK_GAP = 14
const LABEL_LH = 22
const NOTE_LH = 20
const ROW_GAP_MAX = 12
const VERDICT_H = 52
const VERDICT_GAP = 14
const CARD_RADIUS = 2
const MAX_H = 350

function hasNotes(side: Side): boolean {
  return side.items.some((item) => item.note?.trim())
}

/** The sizes a point's label is set at. */
const LABEL_SIZE = Math.max(FORM_BODY_FLOOR, 17)

/** The width a point's words have beside its mark. */
function labelWidth(colW: number): number {
  return colW - PAD_X * 2 - MARK - MARK_GAP
}

/**
 * A point's label as it is set: on one line when it fits there at the floor
 * or above, as before, and otherwise on two lines at its own size. `truncated`
 * when two lines do not hold it either.
 */
function fitLabel(label: string, maxWidth: number, ctx: ComponentCtx | undefined): { lines: string[]; fontSize: number; truncated: boolean } {
  const fontFamily = ctx?.fonts.body
  const one = fitFormLine(label, { maxWidth, fontSize: LABEL_SIZE, floor: FORM_BODY_FLOOR, bold: true, fontFamily })
  if (!one.truncated) return { lines: [one.text], fontSize: one.fontSize, truncated: false }
  const two = layoutSvgText(label, { maxWidth, fontSize: LABEL_SIZE, minPt: LABEL_SIZE, maxLines: 2, bold: true, fontFamily })
  return { lines: two.lines, fontSize: two.fontSize, truncated: two.truncated }
}

function resolveProsCons(component: ProsConsComponent, w: number, ctx?: ComponentCtx) {
  const colW = (w - COL_GAP) / 2
  const rows = Math.max(component.pros.items.length, component.cons.items.length)
  const noted = hasNotes(component.pros) || hasNotes(component.cons)
  const rowH = LABEL_LH + (noted ? NOTE_LH : 0)
  // A row is as tall as the taller of its two points: a label on two lines adds a line.
  const lineCount = (side: Side, i: number) => {
    const item = side.items[i]
    return item ? Math.max(1, Math.min(2, fitLabel(item.label, labelWidth(colW), ctx).lines.length)) : 1
  }
  const rowHeights = Array.from({ length: rows }, (_, i) => rowH + (Math.max(lineCount(component.pros, i), lineCount(component.cons, i)) - 1) * LABEL_LH)
  const cardBudget = MAX_H - VERDICT_H - VERDICT_GAP
  const fixed = PAD_Y * 2 + HEADER_H + rowHeights.reduce((sum, h) => sum + h, 0)
  const rowGap = rows > 1 ? Math.max(0, Math.min(ROW_GAP_MAX, (cardBudget - fixed) / (rows - 1))) : 0
  const cardH = fixed + rowGap * Math.max(0, rows - 1)
  const rowTops = rowHeights.map((_, i) => PAD_Y + HEADER_H + rowHeights.slice(0, i).reduce((sum, h) => sum + h, 0) + i * rowGap)
  return { colW, rows, noted, rowH, rowGap, rowTops, cardH, h: cardH + VERDICT_GAP + VERDICT_H }
}

export const prosCons: SvgComponent<ProsConsComponent> = {
  measure(component, w, ctx) {
    return resolveProsCons(component, w, ctx).h
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const g = resolveProsCons(component, box.w, ctx)
    const border = ctx.colors.border ?? ctx.colors.muted
    const titleSize = Math.max(FORM_BODY_FLOOR, 19)
    const labelSize = LABEL_SIZE
    const noteSize = FORM_BODY_FLOOR
    const innerW = g.colW - PAD_X * 2
    const textW = innerW - MARK - MARK_GAP

    // Both columns are fitted before either is painted. A point cut to
    // "存量合同需要重" is a different point, and a weighing that quietly loses
    // half of one side is not a weighing, so one cut declines the page
    // (`./declared-fit.ts`).
    const fits = [component.pros, component.cons].flatMap((side) => [
      fitFormLine(side.title, {
        maxWidth: innerW,
        fontSize: titleSize,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.heading,
      }),
      ...side.items.flatMap((item) => [
        fitLabel(item.label, textW, ctx),
        item.note?.trim()
          ? fitFormLine(item.note, {
              maxWidth: textW,
              fontSize: noteSize,
              floor: FORM_BODY_FLOOR,
              fontFamily: ctx.fonts.body,
            })
          : null,
      ]),
    ])
    const verdictFit = fitFormLine(component.verdict, {
      maxWidth: box.w - PAD_X * 2,
      fontSize: labelSize,
      floor: FORM_BODY_FLOOR,
      bold: true,
      fontFamily: ctx.fonts.heading,
    })
    if (anyCut([...fits, verdictFit]) || (box.h != null && g.h > box.h + 1)) {
      return (
        <DroppedContentMarker
          count={component.pros.items.length + component.cons.items.length}
          kind="row"
        />
      )
    }
    const noteInk = accessibleInk(ctx.colors.muted, ctx.colors.surface, noteSize)
    const verdictInk = accessibleInk(ctx.colors.surface, ctx.colors.primary, labelSize)

    const cardInk = accessibleInk(ctx.colors.text, ctx.colors.surface, labelSize)
    const column = (side: Side, x: number, mark: "check" | "x", key: string): ReactElement => {
      const title = fitFormLine(side.title, {
        maxWidth: innerW,
        fontSize: titleSize,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.heading,
      })
      // Same reason as the equation's figure: on a dark theme `colors.primary`
      // sits next to `colors.surface`, and the tick disappeared on arena.
      const markColor = accessibleInk(
        mark === "check" ? ctx.colors.primary : ctx.colors.muted,
        ctx.colors.surface,
        MARK,
      )
      return (
        <g key={key}>
          <rect
            x={x}
            y={0}
            width={g.colW}
            height={g.cardH}
            rx={ctx.shape?.radius ?? CARD_RADIUS}
            fill={ctx.colors.surface}
            stroke={border}
            strokeWidth={1}
          />
          <text
            x={x + PAD_X}
            y={PAD_Y + title.fontSize}
            fontFamily={ctx.fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={cardInk}
          >
            {title.text}
          </text>
          <line
            x1={x + PAD_X}
            y1={PAD_Y + HEADER_H - 12}
            x2={x + g.colW - PAD_X}
            y2={PAD_Y + HEADER_H - 12}
            stroke={border}
            strokeWidth={1}
          />
          {side.items.map((item, i) => {
            const top = g.rowTops[i]!
            const label = fitLabel(item.label, textW, ctx)
            const labelBottom = (label.lines.length - 1) * LABEL_LH
            const note = item.note?.trim()
              ? fitFormLine(item.note, {
                  maxWidth: textW,
                  fontSize: noteSize,
                  floor: FORM_BODY_FLOOR,
                  fontFamily: ctx.fonts.body,
                })
              : null
            return (
              <g key={`row-${i}`}>
                <Icon name={mark} x={x + PAD_X} y={top + 2} size={MARK} color={markColor} />
                {label.lines.map((line, j) => (
                  <text
                    key={j}
                    x={x + PAD_X + MARK + MARK_GAP}
                    y={top + j * LABEL_LH + label.fontSize}
                    fontFamily={ctx.fonts.body}
                    fontSize={label.fontSize}
                    fontWeight="700"
                    fill={cardInk}
                  >
                    {line}
                  </text>
                ))}
                {note ? (
                  <text
                    x={x + PAD_X + MARK + MARK_GAP}
                    y={top + labelBottom + LABEL_LH + note.fontSize}
                    fontFamily={ctx.fonts.body}
                    fontSize={note.fontSize}
                    fill={noteInk}
                  >
                    {note.text}
                  </text>
                ) : null}
              </g>
            )
          })}
        </g>
      )
    }

    const verdict = verdictFit

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {column(component.pros, 0, "check", "pros")}
        {column(component.cons, g.colW + COL_GAP, "x", "cons")}
        <rect
          x={0}
          y={g.cardH + VERDICT_GAP}
          width={box.w}
          height={VERDICT_H}
          rx={ctx.shape?.radius ?? CARD_RADIUS}
          fill={ctx.colors.primary}
        />
        <text
          x={PAD_X}
          y={g.cardH + VERDICT_GAP + VERDICT_H / 2 + verdict.fontSize * 0.35}
          fontFamily={ctx.fonts.heading}
          fontSize={verdict.fontSize}
          fontWeight="700"
          fill={verdictInk}
        >
          {verdict.text}
        </text>
      </g>
    )
  },
}

export const renderDef: RenderDef<ProsConsComponent> = {
  type: "pros_cons",
  measure: prosCons.measure,
  render: prosCons.render,
}
