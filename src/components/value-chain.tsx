import type { Component } from "@/ir"
import { measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, readableOn } from "../render/ink"
import { mixHex } from "./color-mix"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine, layoutFormBody } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type ValueChainComponent = Extract<Component, { type: "value_chain" }>

/**
 * 价值链：上方是横跨全链的支持活动带，下方是首尾相扣的基本活动箭头，右端可选
 * 一块利润楔形。箭头用真正的凹凸缺口互扣，不是并排的矩形加箭头图标。
 *
 * 序号是内容不是装饰：读者要知道这是第几环。强调只有一种，作者标 `emphasis`
 * 的那一环整块填 primary、字反白。
 */

const SUPPORT_H = 62
const SUPPORT_GAP = 8
const SECTION_GAP = 40
const CHEVRON_H = 144
const CHEVRON_H_MIN = 104
const NOTCH = 26
const MARGIN_W = 200
const MARGIN_GAP = 8
const MARGIN_TIP = 0.62
const CELL_MIN_W = 130
const MAIN_MIN_W = 400
const PAD_X = 24
const SUPPORT_TITLE_PX = 18
const SUPPORT_NOTE_PX = FORM_BODY_FLOOR
const INDEX_PX = FORM_BODY_FLOOR
const LABEL_PX = 20
const VALUE_PX = 26
const UNIT_PX = FORM_BODY_FLOOR
const MARGIN_LABEL_PX = 17
const MARGIN_VALUE_PX = 24
const LINE_RATIO = 1.28
const VALUE_GAP = 14
const CHEVRON_PAD_Y = 24
const SUPPORT_PAD_Y = 16

function naturalHeight(component: ValueChainComponent): number {
  const k = component.support.length
  return k * SUPPORT_H + (k - 1) * SUPPORT_GAP + SECTION_GAP + CHEVRON_H
}

function hairline(ctx: ComponentCtx): string {
  return ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
}

/** One link of the chain: a right-pointing block, notched on the left when it follows another. */
function chevronPoints(x: number, y: number, w: number, h: number, notched: boolean): string {
  const pts = [
    [x, y],
    [x + w - NOTCH, y],
    [x + w, y + h / 2],
    [x + w - NOTCH, y + h],
    [x, y + h],
  ]
  if (notched) pts.push([x + NOTCH, y + h / 2])
  return pts.map(([px, py]) => `${round(px!)},${round(py!)}`).join(" ")
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}

export const valueChain: SvgComponent<ValueChainComponent> = {
  measure(component) {
    return naturalHeight(component)
  },

  render(component, box, ctx) {
    const n = component.primary.length
    const k = component.support.length
    const h = box.h ?? naturalHeight(component)
    const mainW = component.margin ? box.w - MARGIN_W - MARGIN_GAP : box.w
    const supportTotal = k * SUPPORT_H + (k - 1) * SUPPORT_GAP
    const chevronH = h - supportTotal - SECTION_GAP
    const step = (mainW - NOTCH) / n
    const cellW = step + NOTCH

    if (mainW < MAIN_MIN_W || cellW < CELL_MIN_W || chevronH < CHEVRON_H_MIN) {
      return <DroppedContentMarker count={n + k + (component.margin ? 1 : 0)} kind="item" />
    }

    const rule = hairline(ctx)
    const surface = ctx.colors.surface
    const radius = ctx.shape?.radius ?? 2
    const filledInk = readableOn(ctx.colors.primary)
    const chevronY = supportTotal + SECTION_GAP
    const noteX = Math.min(280, mainW * 0.28)
    const inner = cellW - NOTCH - PAD_X - 16

    // Everything the drawing prints is fitted first and checked as a set. A
    // supporting band cut to "多租户平台 · 用量与健…" reads as a shorter list
    // rather than a cut one, which is exactly the loss the page must not make
    // silently, so a cut anywhere sends the whole chain off to a wider page.
    const supports = component.support.map((band) => ({
      band,
      title: fitFormLine(band.label, {
        maxWidth: noteX - PAD_X - 12,
        fontSize: SUPPORT_TITLE_PX,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      }),
      note: band.note
        ? fitFormLine(band.note, {
            maxWidth: mainW - noteX - PAD_X,
            fontSize: SUPPORT_NOTE_PX,
            floor: FORM_BODY_FLOOR,
            fontFamily: ctx.fonts.body,
          })
        : null,
    }))

    const links = component.primary.map((link) => {
      const label = fitFormLine(link.label, {
        maxWidth: inner,
        fontSize: LABEL_PX,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      })
      const value = link.value
        ? fitFormLine(link.value, {
            maxWidth: inner * 0.55,
            fontSize: VALUE_PX,
            floor: FORM_BODY_FLOOR,
            bold: true,
            fontFamily: ctx.fonts.heading,
          })
        : null
      const unit = link.unit
        ? fitFormLine(link.unit, {
            maxWidth: inner * 0.4,
            fontSize: UNIT_PX,
            floor: FORM_BODY_FLOOR,
            fontFamily: ctx.fonts.body,
          })
        : null
      const valueW = value
        ? measureTextUnits(value.text, { bold: true, fontFamily: ctx.fonts.heading }) * value.fontSize
        : 0
      const unitW = unit ? measureTextUnits(unit.text, { fontFamily: ctx.fonts.body }) * unit.fontSize : 0
      return { link, label, value, unit, valueW, unitW }
    })

    const wedge = component.margin
      ? {
          label: layoutFormBody(component.margin.label, {
            maxWidth: MARGIN_W * MARGIN_TIP - 12,
            fontSize: MARGIN_LABEL_PX,
            maxLines: 2,
            bold: true,
            fontFamily: ctx.fonts.body,
          }),
          value: component.margin.value
            ? fitFormLine(component.margin.value, {
                maxWidth: MARGIN_W * MARGIN_TIP - 12,
                fontSize: MARGIN_VALUE_PX,
                floor: FORM_BODY_FLOOR,
                bold: true,
                fontFamily: ctx.fonts.heading,
              })
            : null,
        }
      : null

    const linkStack = Math.max(
      ...links.map((l) => INDEX_PX + l.label.fontSize * LINE_RATIO + VALUE_GAP + (l.value?.fontSize ?? 0)),
    )
    const widestFigure = Math.max(0, ...links.map((l) => l.valueW + (l.unit ? l.unitW + 5 : 0)))
    const supportStack = Math.max(
      ...supports.map((b) => Math.max(b.title.fontSize, b.note?.fontSize ?? 0) * LINE_RATIO),
    )
    if (
      anyCut([
        ...supports.flatMap((b) => [b.title, b.note]),
        ...links.flatMap((l) => [l.label, l.value, l.unit]),
        wedge?.label,
        wedge?.value,
      ]) ||
      linkStack > chevronH - CHEVRON_PAD_Y ||
      widestFigure > inner ||
      supportStack + SUPPORT_PAD_Y > SUPPORT_H
    ) {
      return <DroppedContentMarker count={n + k + (component.margin ? 1 : 0)} kind="item" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {supports.map(({ title, note }, i) => {
          const y = i * (SUPPORT_H + SUPPORT_GAP)
          return (
            <g key={`s${i}`}>
              <rect
                x={0}
                y={y}
                width={mainW}
                height={SUPPORT_H}
                rx={radius}
                fill={surface}
                stroke={rule}
                strokeWidth={1}
              />
              <text
                x={PAD_X}
                y={y + SUPPORT_H / 2 + title.fontSize * 0.35}
                fontSize={title.fontSize}
                fontWeight="bold"
                fill={accessibleInk(ctx.colors.primary, surface, title.fontSize)}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {title.text}
              </text>
              {note ? (
                <text
                  x={noteX}
                  y={y + SUPPORT_H / 2 + note.fontSize * 0.35}
                  fontSize={note.fontSize}
                  fill={accessibleInk(ctx.colors.muted, surface, note.fontSize)}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {note.text}
                </text>
              ) : null}
            </g>
          )
        })}

        {links.map(({ link, label, value, unit, valueW }, i) => {
          const x = i * step
          const filled = link.emphasis === true
          const textX = x + (i === 0 ? PAD_X : PAD_X + NOTCH)
          const ordinal = String(i + 1).padStart(2, "0")
          const top = chevronY + chevronH * 0.24
          const labelY = top + label.fontSize
          const valueY = labelY + VALUE_GAP + (value?.fontSize ?? 0)
          const ink = filled ? filledInk : accessibleInk(ctx.colors.primary, surface, LABEL_PX)
          const softInk = filled
            ? accessibleInk(mixHex(filledInk, ctx.colors.primary, 0.3), ctx.colors.primary, INDEX_PX)
            : accessibleInk(ctx.colors.muted, surface, INDEX_PX)
          return (
            <g key={`p${i}`}>
              <polygon
                points={chevronPoints(x, chevronY, cellW, chevronH, i > 0)}
                fill={filled ? ctx.colors.primary : surface}
                stroke={filled ? "none" : rule}
                strokeWidth={filled ? 0 : 1}
              />
              <text
                x={textX}
                y={top - 10}
                fontSize={INDEX_PX}
                fill={softInk}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {ordinal}
              </text>
              <text
                x={textX}
                y={labelY}
                fontSize={label.fontSize}
                fontWeight="bold"
                fill={ink}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
              {value ? (
                <text
                  x={textX}
                  y={valueY}
                  fontSize={value.fontSize}
                  fontWeight="bold"
                  fill={filled ? filledInk : accessibleInk(ctx.colors.primary, surface, value.fontSize)}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {value.text}
                </text>
              ) : null}
              {value && unit ? (
                <text
                  x={textX + valueW + 5}
                  y={valueY}
                  fontSize={unit.fontSize}
                  fill={softInk}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {unit.text}
                </text>
              ) : null}
            </g>
          )
        })}

        {wedge ? (
          (() => {
            const mx = mainW + MARGIN_GAP
            const cx = mx + (MARGIN_W * MARGIN_TIP) / 2
            const cy = h / 2
            const { label, value } = wedge
            return (
              <g>
                <polygon
                  points={`${round(mx)},0 ${round(mx + MARGIN_W * MARGIN_TIP)},0 ${round(mx + MARGIN_W)},${round(cy)} ${round(mx + MARGIN_W * MARGIN_TIP)},${round(h)} ${round(mx)},${round(h)}`}
                  fill={ctx.colors.primary}
                />
                {label.lines.map((line, i) => (
                  <text
                    key={`m${i}`}
                    x={cx}
                    y={
                      (value ? cy - 10 : cy + label.fontSize * 0.35) -
                      (label.lines.length - 1 - i) * label.lineHeight
                    }
                    textAnchor="middle"
                    fontSize={label.fontSize}
                    fontWeight="bold"
                    fill={filledInk}
                    fontFamily={ctx.fonts.body}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))}
                {value ? (
                  <text
                    x={cx}
                    y={cy + value.fontSize + 2}
                    textAnchor="middle"
                    fontSize={value.fontSize}
                    fontWeight="bold"
                    fill={filledInk}
                    fontFamily={ctx.fonts.heading}
                    dominantBaseline="alphabetic"
                  >
                    {value.text}
                  </text>
                ) : null}
              </g>
            )
          })()
        ) : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<ValueChainComponent> = {
  type: "value_chain",
  measure: valueChain.measure,
  render: valueChain.render,
}
