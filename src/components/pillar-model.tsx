import type { Component } from "@/ir"
import { measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk, readableOn } from "../render/ink"
import { mixHex } from "./color-mix"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine, layoutFormBody } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type PillarModelComponent = Extract<Component, { type: "pillar_model" }>

/**
 * 梁—柱—基座：目标写在横梁上，每根柱子一个名字加一个数字，共同前提写在基座上。
 * 三件都跟盒子的左右边对齐，第一根柱子贴左、最后一根贴右，柱间留出柱宽四成
 * 的空当——门廊是柱子之间透光，不是几张卡片之间开洞。
 *
 * 只有横梁是整块 primary 填充，字反白——这是全图唯一的强调，柱子和基座都是
 * 纸面白卡加发丝边。
 */

const BEAM_H = 68
const BASE_H = 68
const PILLAR_MIN_W = 120
/**
 * How much air stands between two columns, as a share of a column's own
 * width. A portico is columns with daylight between them, not cards with
 * holes between them: at parity the eye reads three separate cards, and the
 * beam stops looking like it rests on anything. The columns are laid flush
 * with the box on both sides, so this ratio and the count decide the width —
 * `n·w + (n-1)·0.4w = boxW`.
 */
const PILLAR_GAP_RATIO = 0.4
const NATURAL_PILLAR_H = 272
const MIN_PILLAR_H = 150
const PAD_X = 28
const GOAL_PX = 24
const BASE_PX = 18
const TITLE_PX = 21
const VALUE_PX = 38
const UNIT_PX = 17
const TITLE_TO_VALUE = 14
const LINE_RATIO = 1.28
const COLUMN_PAD_Y = 12

function hairline(ctx: ComponentCtx): string {
  return ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
}

export const pillarModel: SvgComponent<PillarModelComponent> = {
  measure() {
    return BEAM_H + NATURAL_PILLAR_H + BASE_H
  },

  render(component, box, ctx) {
    const n = component.pillars.length
    const h = box.h ?? BEAM_H + NATURAL_PILLAR_H + BASE_H
    const pillarW = box.w / (n + PILLAR_GAP_RATIO * (n - 1))
    const radius = ctx.shape?.radius ?? 2
    const rule = hairline(ctx)
    const surface = ctx.colors.surface
    const beamInk = readableOn(ctx.colors.primary)

    const goal = layoutFormBody(component.goal, {
      maxWidth: box.w - PAD_X * 2,
      fontSize: GOAL_PX,
      maxLines: 2,
      bold: true,
      fontFamily: ctx.fonts.body,
    })
    const base = layoutFormBody(component.base, {
      maxWidth: box.w - PAD_X * 2,
      fontSize: BASE_PX,
      maxLines: 2,
      fontFamily: ctx.fonts.body,
    })
    const beamH = Math.max(BEAM_H, goal.lines.length * goal.lineHeight + 26)
    const baseH = Math.max(BASE_H, base.lines.length * base.lineHeight + 26)
    const pillarH = h - beamH - baseH

    if (pillarW < PILLAR_MIN_W || pillarH < MIN_PILLAR_H) {
      return <DroppedContentMarker count={n + 2} kind="item" />
    }

    const pillarY = beamH
    const baseY = h - baseH
    const step = n === 1 ? 0 : (box.w - pillarW) / (n - 1)

    // Every line is fitted before anything is painted. A goal cut to
    // "续约率稳定在九成三，中小客…" is not a shorter goal, it is a different
    // one, so a cut anywhere takes the whole drawing off the page instead.
    const inner = pillarW - 24
    const columns = component.pillars.map((pillar) => {
      const title = fitFormLine(pillar.title, {
        maxWidth: inner,
        fontSize: TITLE_PX,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      })
      const value = fitFormLine(pillar.value, {
        maxWidth: pillar.unit ? inner * 0.66 : inner,
        fontSize: VALUE_PX,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.heading,
      })
      const unit = pillar.unit
        ? fitFormLine(pillar.unit, {
            maxWidth: inner * 0.32,
            fontSize: UNIT_PX,
            floor: FORM_BODY_FLOOR,
            fontFamily: ctx.fonts.body,
          })
        : null
      const valueW = measureTextUnits(value.text, { bold: true, fontFamily: ctx.fonts.heading }) * value.fontSize
      const unitW = unit ? measureTextUnits(unit.text, { fontFamily: ctx.fonts.body }) * unit.fontSize : 0
      return { title, value, unit, valueW, unitW }
    })

    const tallestStack = Math.max(
      ...columns.map((c) => c.title.fontSize * LINE_RATIO + TITLE_TO_VALUE + c.value.fontSize * LINE_RATIO),
    )
    // The unit is painted to the right of the figure, so the pair has to
    // clear the column's own inner edge — a check the width fits above cannot
    // make, because each was fitted against its own share of the column.
    const widestRow = Math.max(...columns.map((c) => c.valueW + (c.unit ? c.unitW + 6 : 0)))
    if (
      anyCut([goal, base, ...columns.flatMap((c) => [c.title, c.value, c.unit])]) ||
      tallestStack > pillarH - COLUMN_PAD_Y * 2 ||
      widestRow > inner
    ) {
      return <DroppedContentMarker count={n + 2} kind="item" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <rect x={0} y={0} width={box.w} height={beamH} rx={radius} fill={ctx.colors.primary} />
        {goal.lines.map((line, i) => (
          <text
            key={`g${i}`}
            x={PAD_X}
            y={beamH / 2 - (goal.lines.length * goal.lineHeight) / 2 + (i + 1) * goal.lineHeight - goal.lineHeight * 0.25}
            fontSize={goal.fontSize}
            fontWeight="bold"
            fill={beamInk}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

        {columns.map(({ title, value, unit, valueW }, i) => {
          const x = i * step
          const stack = title.fontSize + TITLE_TO_VALUE + value.fontSize
          const titleY = pillarY + (pillarH - stack) / 2 + title.fontSize
          const valueY = titleY + TITLE_TO_VALUE + value.fontSize
          return (
            <g key={`p${i}`}>
              <rect
                x={x}
                y={pillarY}
                width={pillarW}
                height={pillarH}
                rx={radius}
                fill={surface}
                stroke={rule}
                strokeWidth={1}
              />
              <text
                x={x + 12}
                y={titleY}
                fontSize={title.fontSize}
                fontWeight="bold"
                fill={accessibleInk(ctx.colors.primary, surface, title.fontSize)}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {title.text}
              </text>
              <text
                x={x + 12}
                y={valueY}
                fontSize={value.fontSize}
                fontWeight="bold"
                fill={accessibleInk(ctx.colors.primary, surface, value.fontSize)}
                fontFamily={ctx.fonts.heading}
                dominantBaseline="alphabetic"
              >
                {value.text}
              </text>
              {unit ? (
                <text
                  x={x + 12 + valueW + 6}
                  y={valueY}
                  fontSize={unit.fontSize}
                  fill={accessibleInk(ctx.colors.muted, surface, unit.fontSize)}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {unit.text}
                </text>
              ) : null}
            </g>
          )
        })}

        <rect
          x={0}
          y={baseY}
          width={box.w}
          height={baseH}
          rx={radius}
          fill={surface}
          stroke={rule}
          strokeWidth={1}
        />
        {base.lines.map((line, i) => (
          <text
            key={`b${i}`}
            x={PAD_X}
            y={baseY + baseH / 2 - (base.lines.length * base.lineHeight) / 2 + (i + 1) * base.lineHeight - base.lineHeight * 0.25}
            fontSize={base.fontSize}
            fill={ctx.colors.text}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<PillarModelComponent> = {
  type: "pillar_model",
  measure: pillarModel.measure,
  render: pillarModel.render,
}
