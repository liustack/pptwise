import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  fitFormLine,
  layoutFormBody,
  layoutFormTitle,
} from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type ConceptEquationComponent = Extract<Component, { type: "concept_equation" }>

/**
 * 两三个要素并排，用加号连起来，等号之后是结果。
 *
 * 结果面板整块 primary 填色、文字反白，其余面板是 surface 卡片加一道
 * 发丝边——强调只用整块填色，不用边条，也不让 accent 承载文字。运算符是
 * 两个字形，画在面板之间的通道里，跟着面板一起缩放。
 *
 * 面板高度由最高的一块决定，三块用同一个高度，等号两边才是一条线上的东西。
 */

const GAP = 16
const OPERATOR_W = 56
const OPERATOR_SIZE = 40
const PAD_X = 28
const PAD_Y = 26
/** The result panel is wider than a term: it is where the reader stops. */
const RESULT_SHARE = 1.12
const CARD_RADIUS = 2
const MIN_H = 190
const MAX_H = 340

interface Slot {
  x: number
  w: number
}

function slots(n: number, w: number): { terms: Slot[]; result: Slot; operators: number[] } {
  const operatorCount = n
  const channels = OPERATOR_W * operatorCount + GAP * (n + operatorCount)
  const unitW = (w - channels) / (n + RESULT_SHARE)
  const terms: Slot[] = []
  const operators: number[] = []
  let x = 0
  for (let i = 0; i < n; i += 1) {
    terms.push({ x, w: unitW })
    x += unitW + GAP
    operators.push(x)
    x += OPERATOR_W + GAP
  }
  return { terms, result: { x, w: unitW * RESULT_SHARE }, operators }
}

interface TermText {
  value?: { text: string; fontSize: number; truncated: boolean }
  label: ReturnType<typeof layoutFormTitle>
  note: ReturnType<typeof layoutFormBody> | null
}

function layoutTerm(
  term: { label: string; value?: string; note?: string },
  innerW: number,
  ctx: ComponentCtx,
): TermText {
  const value = term.value?.trim()
  const fittedValue = value
    ? fitFormLine(value, {
        maxWidth: innerW,
        fontSize: 38,
        floor: FORM_TITLE_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.heading,
      })
    : undefined
  const label = layoutFormTitle(term.label, {
    maxWidth: innerW,
    fontSize: 18,
    maxLines: 2,
    fontFamily: ctx.fonts.body,
  })
  const note = term.note?.trim()
    ? layoutFormBody(term.note, {
        maxWidth: innerW,
        fontSize: 17,
        maxLines: 2,
        fontFamily: ctx.fonts.body,
      })
    : null
  return {
    value: fittedValue && { text: fittedValue.text, fontSize: fittedValue.fontSize, truncated: fittedValue.truncated },
    label,
    note,
  }
}

function termHeight(text: TermText): number {
  const valueH = text.value ? text.value.fontSize * 1.28 : 0
  const labelH = text.label.lines.length * text.label.lineHeight
  const noteH = text.note ? text.note.lines.length * text.note.lineHeight + 12 : 0
  return PAD_Y * 2 + valueH + labelH + noteH
}

/** The narrowest panel that can hold a word at the readable floor. */
const MIN_PANEL_TEXT_W = FORM_BODY_FLOOR * 2

function resolveEquation(component: ConceptEquationComponent, w: number, ctx: ComponentCtx) {
  const geom = slots(component.operands.length, w)
  const terms = component.operands.map((term, i) => layoutTerm(term, geom.terms[i]!.w - PAD_X * 2, ctx))
  const result = layoutTerm(component.result, geom.result.w - PAD_X * 2, ctx)
  const h = Math.max(MIN_H, Math.min(MAX_H, Math.max(...terms.map(termHeight), termHeight(result))))
  // Three operands and two operator channels can leave a panel with no text
  // column at all. The fit helpers answer an impossible width with an empty
  // line and no truncation flag, so the drawing used to print the operators
  // over four blank panels; the geometry itself has to refuse first.
  const roomy = geom.terms.every((slot) => slot.w - PAD_X * 2 >= MIN_PANEL_TEXT_W) &&
    geom.result.w - PAD_X * 2 >= MIN_PANEL_TEXT_W
  return { geom, terms, result, h, roomy }
}

export const conceptEquation: SvgComponent<ConceptEquationComponent> = {
  measure(component, w, ctx) {
    return resolveEquation(component, w, ctx).h
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const { geom, terms, result, h, roomy } = resolveEquation(component, box.w, ctx)
    // A term whose name, figure or note had to lose characters is a different
    // term, and a panel with no text column prints nothing at all — both
    // decline rather than paint (`./declared-fit.ts`, and `roomy` above).
    const all = [...terms, result]
    const emptied = all.some(
      (text, i) =>
        text.label.lines.length === 0 ||
        (([...component.operands, component.result][i]!.value?.trim() ?? "") !== "" && !text.value) ||
        (([...component.operands, component.result][i]!.note?.trim() ?? "") !== "" &&
          (text.note === null || text.note.lines.length === 0)),
    )
    const cut = anyCut([
      ...all.map((t) => t.value ?? null),
      ...all.map((t) => t.label),
      ...all.map((t) => t.note),
    ])
    if (!roomy || cut || emptied || (box.h != null && h > box.h + 1)) {
      return <DroppedContentMarker count={component.operands.length + 1} kind="item" />
    }
    const border = ctx.colors.border ?? ctx.colors.muted
    // The operators sit in the channel between panels, on the page's own
    // background rather than on any panel.
    const operatorInk = accessibleInk(ctx.colors.primary, ctx.defaultBg ?? ctx.colors.bg, OPERATOR_SIZE)

    const panel = (
      slot: Slot,
      text: TermText,
      filled: boolean,
      key: string,
    ): ReactElement => {
      const ground = filled ? ctx.colors.primary : ctx.colors.surface
      // `colors.primary` is the figure's preferred ink, but on a dark theme
      // primary and surface are neighbours — the number went missing on
      // ledger. Both postures route through the panel's real fill.
      const valueInk = filled
        ? accessibleInk(ctx.colors.surface, ground, text.value?.fontSize ?? 38)
        : accessibleInk(ctx.colors.primary, ground, text.value?.fontSize ?? 38)
      const labelInk = filled
        ? accessibleInk(ctx.colors.surface, ground, text.label.fontSize)
        : accessibleInk(ctx.colors.text, ground, text.label.fontSize)
      const noteInk = filled
        ? accessibleInk(ctx.colors.surface, ground, text.note?.fontSize ?? FORM_BODY_FLOOR)
        : accessibleInk(ctx.colors.muted, ctx.colors.surface, text.note?.fontSize ?? FORM_BODY_FLOOR)
      const valueH = text.value ? text.value.fontSize * 1.28 : 0
      const labelH = text.label.lines.length * text.label.lineHeight
      const noteH = text.note ? text.note.lines.length * text.note.lineHeight + 12 : 0
      let y = (h - (valueH + labelH + noteH)) / 2
      const left = slot.x + PAD_X
      const nodes: ReactElement[] = []
      if (text.value) {
        nodes.push(
          <text
            key="value"
            x={left}
            y={y + text.value.fontSize}
            fontFamily={ctx.fonts.heading}
            fontSize={text.value.fontSize}
            fontWeight="700"
            fill={valueInk}
          >
            {text.value.text}
          </text>,
        )
        y += valueH
      }
      text.label.lines.forEach((line, li) => {
        nodes.push(
          <text
            key={`label-${li}`}
            x={left}
            y={y + li * text.label.lineHeight + text.label.fontSize * 0.9}
            fontFamily={ctx.fonts.body}
            fontSize={text.label.fontSize}
            fontWeight={text.value ? undefined : "700"}
            fill={labelInk}
          >
            {line}
          </text>,
        )
      })
      y += labelH + (text.note ? 12 : 0)
      text.note?.lines.forEach((line, li) => {
        nodes.push(
          <text
            key={`note-${li}`}
            x={left}
            y={y + li * text.note!.lineHeight + text.note!.fontSize * 0.9}
            fontFamily={ctx.fonts.body}
            fontSize={text.note!.fontSize}
            fill={noteInk}
          >
            {line}
          </text>,
        )
      })
      return (
        <g key={key}>
          <rect
            x={slot.x}
            y={0}
            width={slot.w}
            height={h}
            rx={ctx.shape?.radius ?? CARD_RADIUS}
            fill={ground}
            stroke={filled ? ground : border}
            strokeWidth={1}
          />
          {nodes}
        </g>
      )
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {terms.map((text, i) => panel(geom.terms[i]!, text, false, `term-${i}`))}
        {panel(geom.result, result, true, "result")}
        {geom.operators.map((x, i) => (
          <text
            key={`op-${i}`}
            x={x + OPERATOR_W / 2}
            y={h / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily={ctx.fonts.heading}
            fontSize={OPERATOR_SIZE}
            fontWeight="700"
            fill={operatorInk}
          >
            {i === geom.operators.length - 1 ? "=" : "+"}
          </text>
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<ConceptEquationComponent> = {
  type: "concept_equation",
  measure: conceptEquation.measure,
  render: conceptEquation.render,
}
