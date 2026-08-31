import type { Component } from "@/ir"
import { parseProgressRatio } from "@/ir/components/progress-donuts"
import { PptwiseError } from "../errors"
import { Icon } from "../render/icons"
import { accessibleInk, groupValueInks } from "../render/ink"
import { FORM_BODY_FLOOR, fitFormLine } from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type ProgressDonutsComponent = Extract<Component, { type: "progress_donuts" }>

/**
 * 一组完成度圆环：每个指标画一圈轨道 + 一段从 12 点顺时针的进度弧，
 * 圆心是数值本身，环下是标签与可选来源。弧长由 schema 已校验过的 0-100
 * 值决定，渲染期不做数据嗅探。
 */

const PAD = 8
const MIN_CELL = 168
const LABEL_BAND = 36
const SOURCE_BAND = 20
const BASELINE_FUDGE = 0.35
const FULL_T = 0.9999

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100)
}

/**
 * Progress arc from 12 o'clock, clockwise. SVG y-down: start is `(cx, cy-r)`,
 * sweep-flag=1. `t` is clamped to `[0, 1]`. t=0 returns `""` (caller skips
 * the path). t=1 uses 359.9° so the A command's start and end do not coincide.
 */
export function donutArcPath(cx: number, cy: number, r: number, t: number): string {
  if (t <= 0 || r <= 0) return ""
  const tt = t >= 1 ? FULL_T : t
  const sx = cx
  const sy = cy - r
  const angle = -Math.PI / 2 + tt * 2 * Math.PI
  const ex = cx + r * Math.cos(angle)
  const ey = cy + r * Math.sin(angle)
  const large = tt > 0.5 ? 1 : 0
  return `M ${fmt(sx)} ${fmt(sy)} A ${fmt(r)} ${fmt(r)} 0 ${large} 1 ${fmt(ex)} ${fmt(ey)}`
}

/**
 * The schema already proved every value parses (`parseProgressRatio`). A
 * component that reaches the renderer without it skipped `validateIr`, the
 * same class of bypass `components/index.tsx`'s `getRenderDef` guards.
 */
function ratioOf(item: ProgressDonutsComponent["items"][number]): number {
  const t = parseProgressRatio(item.value, item.unit)
  if (t === null) {
    throw new PptwiseError(
      `progress_donuts value "${item.value}" is not a completion rate between 0 and 100 — this IR was not accepted by validateIr`,
    )
  }
  return t
}

function splitValue(value: string, unit: string | undefined): { head: string; tail: string | null } {
  const u = unit?.trim()
  const deduped = u && value.trim().endsWith(u) ? undefined : u
  if (value.endsWith("%") && !deduped) {
    return { head: value.slice(0, -1), tail: "%" }
  }
  return { head: value, tail: deduped ?? null }
}

function grid(n: number, w: number, h?: number) {
  const cols = Math.max(1, Math.min(n, Math.max(1, Math.floor((w + 8) / MIN_CELL))))
  const rows = Math.max(1, Math.ceil(n / cols))
  const cellW = w / cols
  const source = SOURCE_BAND
  const naturalCellH = Math.min(cellW * 1.15, 280)
  const cellH = h != null ? h / rows : naturalCellH
  const r = Math.max(
    36,
    Math.min(95, (cellW - PAD * 2) * 0.32, (cellH - LABEL_BAND - source - PAD * 2) * 0.42),
  )
  const strokeW = Math.max(8, Math.min(16, r * 0.14))
  const naturalH = rows * (2 * r + LABEL_BAND + source + PAD * 2 + strokeW)
  return { cols, rows, cellW, cellH, r, strokeW, naturalH }
}

export const progressDonuts: SvgComponent<ProgressDonutsComponent> = {
  measure(component, w) {
    return grid(component.items.length, w).naturalH
  },

  render(component, box, ctx) {
  const n = component.items.length
  const natural = grid(n, box.w).naturalH
  const h = box.h ?? natural
  const G = grid(n, box.w, h)
  const arc = ctx.colors.accent
  const track = ctx.colors.muted
  const pageBg = ctx.defaultBg ?? ctx.colors.bg

  const values = component.items.map((item, i) => {
    const col = i % G.cols
    const row = Math.floor(i / G.cols)
    const x0 = col * G.cellW
    const y0 = row * G.cellH
    const cx = x0 + G.cellW / 2
    const cy = y0 + PAD + G.r + G.strokeW / 2
    const t = ratioOf(item)
    const d = t > 0 ? donutArcPath(cx, cy, G.r, t) : ""
    const { head, tail } = splitValue(item.value, item.unit)
    const innerW = Math.max(8, (G.r - G.strokeW) * 1.5)
    const rawValue = tail ? `${head}${tail}` : head
    const preferred = Math.max(FORM_BODY_FLOOR, Math.min(40, G.r * 0.55))
    const lineOpts = {
      maxWidth: innerW,
      fontSize: preferred,
      floor: FORM_BODY_FLOOR,
      bold: true,
      fontFamily: ctx.fonts.heading,
    }
    const valueFit = fitFormLine(rawValue, lineOpts)
    const stackUnit = Boolean(tail && valueFit.truncated)
    const headFit = stackUnit ? fitFormLine(head, lineOpts) : valueFit
    const tailFit = stackUnit
      ? fitFormLine(tail!, {
          maxWidth: innerW,
          fontSize: FORM_BODY_FLOOR,
          floor: FORM_BODY_FLOOR,
          bold: true,
          fontFamily: ctx.fonts.heading,
        })
      : null
    return {
      item,
      cx,
      cy,
      d,
      headFit,
      tailFit,
      valueSize: headFit.fontSize,
    }
  })
  const valueInks = groupValueInks(
    values.map(({ valueSize }) => ({
      preferredFill: arc,
      backgroundFill: pageBg,
      fontSizePx: valueSize,
    })),
    ctx.colors.text,
  )

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      {values.map(({ item, cx, cy, d, headFit, tailFit, valueSize }, i) => {
        const valueInk = valueInks[i]!
        const label = fitFormLine(item.label, {
          maxWidth: G.cellW - 16,
          fontSize: 16,
          floor: FORM_BODY_FLOOR,
          bold: true,
          fontFamily: ctx.fonts.body,
        })
        const source = item.source
          ? fitFormLine(item.source, { maxWidth: G.cellW - 16, fontSize: 16, floor: 16, fontFamily: ctx.fonts.body })
          : null
        const labelY = cy + G.r + G.strokeW / 2 + 22
        const iconSize = 14
        const showIcon = Boolean(item.icon) && G.r >= 48
        return (
          <g key={i}>
            <circle
              cx={cx}
              cy={cy}
              r={G.r}
              fill="none"
              stroke={track}
              strokeWidth={G.strokeW}
            />
            {d ? (
              <path d={d} fill="none" stroke={arc} strokeWidth={G.strokeW} strokeLinecap="butt" />
            ) : null}
            {showIcon && item.icon ? (
              <Icon
                name={item.icon}
                x={cx - iconSize / 2}
                y={cy - G.r * 0.55}
                size={iconSize}
                color={accessibleInk(ctx.colors.primary, pageBg, iconSize)}
              />
            ) : null}
            {tailFit ? (
              <>
                <text
                  x={cx}
                  y={cy - tailFit.fontSize * 0.35 + valueSize * BASELINE_FUDGE}
                  textAnchor="middle"
                  fontSize={valueSize}
                  fontWeight="bold"
                  fill={valueInk}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {headFit.text}
                </text>
                <text
                  x={cx}
                  y={cy + tailFit.fontSize * 0.95}
                  textAnchor="middle"
                  fontSize={tailFit.fontSize}
                  fontWeight="bold"
                  fill={valueInk}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {tailFit.text}
                </text>
              </>
            ) : (
              <text
                x={cx}
                y={cy + valueSize * BASELINE_FUDGE}
                textAnchor="middle"
                fontSize={valueSize}
                fontWeight="bold"
                fill={valueInk}
                fontFamily={ctx.fonts.heading}
                dominantBaseline="alphabetic"
              >
                {headFit.text}
              </text>
            )}
            <text
              data-truncated={label.truncated ? "1" : undefined}
              x={cx}
              y={labelY}
              textAnchor="middle"
              fontSize={label.fontSize}
              fontWeight="bold"
              fill={ctx.colors.text}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {label.text}
            </text>
            {source ? (
              <text
                data-truncated={source.truncated ? "1" : undefined}
                x={cx}
                y={labelY + 18}
                textAnchor="middle"
                fontSize={source.fontSize}
                fill={accessibleInk(ctx.colors.muted, pageBg, source.fontSize)}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {source.text}
              </text>
            ) : null}
          </g>
        )
      })}
    </g>
  )
  },
}

export const renderDef: RenderDef<ProgressDonutsComponent> = {
  type: "progress_donuts",
  measure: progressDonuts.measure,
  render: progressDonuts.render,
}
