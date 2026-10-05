import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { Icon } from "../render/icons"
import { accessibleInk, graphicInk } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
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
 * 要素带 `icon` 时，图标画在面板文字栈的最上面，占一行 24px 加 10px 间距。
 *
 * `excluded` 是结果有意不收的那一样：等式下面隔 16px 一道虚线框，框里先是
 * 它的名字（灰色粗体），再是它的数字粗体加一道删除线，最后是灰色的说明。
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
/** A term's icon, at the top of its panel's text stack. */
const ICON = { size: 24, gap: 10 } as const
/** The strip under the equation that names what the result leaves out. */
const EXCLUDED = { gap: 16, padX: 24, padY: 16, icon: 24, iconGap: 14, label: 16, labelLH: 24, value: 22, valueLH: 32, note: 16, noteLH: 24 } as const

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
  icon?: string
  value?: { text: string; fontSize: number; truncated: boolean }
  label: ReturnType<typeof layoutFormTitle>
  note: ReturnType<typeof layoutFormBody> | null
}

function layoutTerm(
  term: { label: string; value?: string; note?: string; icon?: string },
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
    ...(term.icon ? { icon: term.icon } : {}),
    value: fittedValue && { text: fittedValue.text, fontSize: fittedValue.fontSize, truncated: fittedValue.truncated },
    label,
    note,
  }
}

function iconHeight(text: TermText): number {
  return text.icon ? ICON.size + ICON.gap : 0
}

function termHeight(text: TermText): number {
  const iconH = iconHeight(text)
  const valueH = text.value ? text.value.fontSize * 1.28 : 0
  const labelH = text.label.lines.length * text.label.lineHeight
  const noteH = text.note ? text.note.lines.length * text.note.lineHeight + 12 : 0
  return PAD_Y * 2 + iconH + valueH + labelH + noteH
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
  const excluded = component.excluded ? layoutExcluded(component.excluded, w, ctx) : null
  return { geom, terms, result, h, roomy, excluded }
}

interface ExcludedText {
  icon?: string
  label: ReturnType<typeof layoutFormBody>
  value: ReturnType<typeof fitFormLine>
  note: ReturnType<typeof layoutFormBody> | null
  h: number
}

function layoutExcluded(term: NonNullable<ConceptEquationComponent["excluded"]>, w: number, ctx: ComponentCtx): ExcludedText {
  const innerW = w - EXCLUDED.padX * 2 - (term.icon ? EXCLUDED.icon + EXCLUDED.iconGap : 0)
  const label = layoutFormBody(term.label, { maxWidth: innerW, fontSize: EXCLUDED.label, maxLines: 1, lineHeightRatio: EXCLUDED.labelLH / EXCLUDED.label, bold: true, fontFamily: ctx.fonts.body })
  const value = fitFormLine(term.value?.trim() ?? "", { maxWidth: innerW, fontSize: EXCLUDED.value, floor: EXCLUDED.value, bold: true, fontFamily: ctx.fonts.heading })
  const note = term.note?.trim()
    ? layoutFormBody(term.note, { maxWidth: innerW, fontSize: EXCLUDED.note, maxLines: 2, lineHeightRatio: EXCLUDED.noteLH / EXCLUDED.note, fontFamily: ctx.fonts.body })
    : null
  const h = EXCLUDED.padY * 2 + EXCLUDED.labelLH + EXCLUDED.valueLH + (note ? note.lines.length * EXCLUDED.noteLH : 0)
  return { ...(term.icon ? { icon: term.icon } : {}), label, value, note, h }
}

/** The row's height and, under it, the strip naming what the result leaves out. */
function totalHeight(resolved: ReturnType<typeof resolveEquation>): number {
  return resolved.h + (resolved.excluded ? EXCLUDED.gap + resolved.excluded.h : 0)
}

export const conceptEquation: SvgComponent<ConceptEquationComponent> = {
  measure(component, w, ctx) {
    return totalHeight(resolveEquation(component, w, ctx))
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const resolved = resolveEquation(component, box.w, ctx)
    const { geom, terms, result, h, roomy, excluded } = resolved
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
      ...(excluded ? [excluded.label, excluded.value, excluded.note] : []),
    ])
    const excludedEmptied = excluded !== null && (excluded.label.lines.length === 0 || !excluded.value.text || (component.excluded!.note?.trim() && (!excluded.note || excluded.note.lines.length === 0)))
    if (!roomy || cut || emptied || excludedEmptied || (box.h != null && totalHeight(resolved) > box.h + 1)) {
      return <DroppedContentMarker count={component.operands.length + 1 + (excluded ? 1 : 0)} kind="item" />
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
      const iconH = iconHeight(text)
      const valueH = text.value ? text.value.fontSize * 1.28 : 0
      const labelH = text.label.lines.length * text.label.lineHeight
      const noteH = text.note ? text.note.lines.length * text.note.lineHeight + 12 : 0
      let y = (h - (iconH + valueH + labelH + noteH)) / 2
      const left = slot.x + PAD_X
      const nodes: ReactElement[] = []
      if (text.icon) {
        // The icon is a graphic, so it needs 3:1 on its panel, not a text's 4.5:1.
        const iconInk = filled ? graphicInk(ctx.colors.surface, ground) : graphicInk(ctx.colors.primary, ground)
        nodes.push(
          <g key="icon" data-term-icon={text.icon}>
            <Icon name={text.icon} x={left} y={y} size={ICON.size} color={iconInk} />
          </g>,
        )
        y += iconH
      }
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
        {excluded ? <ExcludedStrip text={excluded} y={h + EXCLUDED.gap} w={box.w} ctx={ctx} /> : null}
      </g>
    )
  },
}

/**
 * What the result leaves out: a dashed outline on the page, its name in grey
 * bold, its figure bold with a line struck through it, and why in grey.
 */
function ExcludedStrip({ text, y, w, ctx }: { text: ExcludedText; y: number; w: number; ctx: ComponentCtx }): ReactElement {
  const ground = ctx.defaultBg ?? ctx.colors.bg
  const border = ctx.colors.border ?? ctx.colors.muted
  const left = EXCLUDED.padX + (text.icon ? EXCLUDED.icon + EXCLUDED.iconGap : 0)
  const muted = accessibleInk(ctx.colors.muted, ground, EXCLUDED.label)
  const ink = accessibleInk(ctx.colors.text, ground, EXCLUDED.value)
  const labelY = y + EXCLUDED.padY + EXCLUDED.labelLH / 2 + EXCLUDED.label * 0.35
  const valueY = y + EXCLUDED.padY + EXCLUDED.labelLH + EXCLUDED.valueLH / 2 + EXCLUDED.value * 0.35
  const strikeY = valueY - EXCLUDED.value * 0.32
  const valueW = measureTextUnits(text.value.text, { bold: true, fontFamily: ctx.fonts.heading }) * text.value.fontSize
  return (
    <g data-excluded="">
      <rect x={0.5} y={y + 0.5} width={w - 1} height={text.h - 1} rx={ctx.shape?.radius ?? CARD_RADIUS} fill="none" stroke={border} strokeWidth={1} strokeDasharray="5 4" />
      {text.icon ? (
        <g data-term-icon={text.icon}>
          <Icon name={text.icon} x={EXCLUDED.padX} y={y + EXCLUDED.padY} size={EXCLUDED.icon} color={graphicInk(ctx.colors.muted, ground)} />
        </g>
      ) : null}
      <text x={left} y={labelY} fontFamily={ctx.fonts.body} fontSize={text.label.fontSize} fontWeight="700" fill={muted}>
        {text.label.lines[0]}
      </text>
      <text x={left} y={valueY} fontFamily={ctx.fonts.heading} fontSize={text.value.fontSize} fontWeight="700" fill={ink}>
        {text.value.text}
      </text>
      <line data-strike="" x1={left} y1={strikeY} x2={left + valueW} y2={strikeY} stroke={muted} strokeWidth={1.5} />
      {text.note?.lines.map((line, i) => (
        <text key={i} x={left} y={y + EXCLUDED.padY + EXCLUDED.labelLH + EXCLUDED.valueLH + i * EXCLUDED.noteLH + EXCLUDED.noteLH / 2 + EXCLUDED.note * 0.35} fontFamily={ctx.fonts.body} fontSize={text.note!.fontSize} fill={muted}>
          {line}
        </text>
      ))}
    </g>
  )
}

export const renderDef: RenderDef<ConceptEquationComponent> = {
  type: "concept_equation",
  measure: conceptEquation.measure,
  render: conceptEquation.render,
}
