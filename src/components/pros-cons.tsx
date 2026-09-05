import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import { Icon } from "../render/icons"
import { FORM_BODY_FLOOR, fitFormLine } from "./legibility"
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

function resolveProsCons(component: ProsConsComponent, w: number) {
  const colW = (w - COL_GAP) / 2
  const rows = Math.max(component.pros.items.length, component.cons.items.length)
  const noted = hasNotes(component.pros) || hasNotes(component.cons)
  const rowH = LABEL_LH + (noted ? NOTE_LH : 0)
  const cardBudget = MAX_H - VERDICT_H - VERDICT_GAP
  const fixed = PAD_Y * 2 + HEADER_H + rows * rowH
  const rowGap = rows > 1 ? Math.max(0, Math.min(ROW_GAP_MAX, (cardBudget - fixed) / (rows - 1))) : 0
  const cardH = fixed + rowGap * Math.max(0, rows - 1)
  return { colW, rows, noted, rowH, rowGap, cardH, h: cardH + VERDICT_GAP + VERDICT_H }
}

export const prosCons: SvgComponent<ProsConsComponent> = {
  measure(component, w) {
    return resolveProsCons(component, w).h
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const g = resolveProsCons(component, box.w)
    const border = ctx.colors.border ?? ctx.colors.muted
    const titleSize = Math.max(FORM_BODY_FLOOR, 19)
    const labelSize = Math.max(FORM_BODY_FLOOR, 17)
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
        fitFormLine(item.label, {
          maxWidth: textW,
          fontSize: labelSize,
          floor: FORM_BODY_FLOOR,
          bold: true,
          fontFamily: ctx.fonts.body,
        }),
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
            const top = PAD_Y + HEADER_H + i * (g.rowH + g.rowGap)
            const label = fitFormLine(item.label, {
              maxWidth: textW,
              fontSize: labelSize,
              floor: FORM_BODY_FLOOR,
              bold: true,
              fontFamily: ctx.fonts.body,
            })
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
                <text
                  x={x + PAD_X + MARK + MARK_GAP}
                  y={top + label.fontSize}
                  fontFamily={ctx.fonts.body}
                  fontSize={label.fontSize}
                  fontWeight="700"
                  fill={cardInk}
                >
                  {label.text}
                </text>
                {note ? (
                  <text
                    x={x + PAD_X + MARK + MARK_GAP}
                    y={top + LABEL_LH + note.fontSize}
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
