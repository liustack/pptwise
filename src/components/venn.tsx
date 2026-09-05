import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, FORM_TITLE_FLOOR, fitFormLine, layoutFormTitle, paintedWidthCeiling } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type VennComponent = Extract<Component, { type: "venn" }>

/**
 * 两到三个半透明圆相交，交集处压一枚实心色片写共同点。
 *
 * 圆的填充来自 `colors.chartPalette`，`fill-opacity` 固定 0.38：两圆叠加的
 * 地方自然混出第三种色，这是韦恩图唯一的信息载体，所以透明度不随主题变化。
 * 导出保留 alpha（`svg2pptx/style.ts` 的 `elementOpacity` 读 `fill-opacity`）。
 * 描边留给圆自己，交集色片用 primary 实心加反白字——强调只用整块填色，不用
 * 边条，也不让 accent 承载文字。
 *
 * 几何在 r=100 的单位空间里写死，最后统一缩放：三集合是艺术板的等边三角
 * 布局（顶、左下、右下），两集合是左右并排。标签贴在各自圆的外侧，交集片
 * 落在圆心的形心上。
 */

/** Unit-space circle radius. Everything below is written against it. */
const R = 100
/** Centre-to-centre distance as a share of `R` — the overlap the drawing exists to show. */
const SPREAD_3 = 1.07
const SPREAD_2 = 1.1
/** Gap between a circle's edge and its own label band. */
const LABEL_GAP = 12
/** Unit-space label band height, and the width one label may claim. */
const LABEL_BAND = 30
const LABEL_W = 1.5 * R
/** Outward nudge that keeps the two lower labels off each other. */
const LOWER_LABEL_SHIFT = 0.41 * R

/**
 * Tallest the drawing may ask for. The tightest content rect a component page
 * gets on any theme, once an English heading takes a second line, is 362px
 * (`memo`/`playbill`/`runway`/`stage`) — a drawing that asks for more is
 * dropped whole rather than drawn small, so the cap sits below that.
 */
const MAX_H = 350
const MAX_UPSCALE = 1.12
const CHIP_PAD_X = 16
const CHIP_H = 34
const CHIP_RADIUS = 2

interface Disc {
  cx: number
  cy: number
  /** Where this set's own label sits, in unit space. */
  labelX: number
  labelY: number
  labelAbove: boolean
}

/** Unit-space disc centres and label anchors for 2 or 3 sets. */
function discs(n: number): Disc[] {
  if (n === 2) {
    const dx = SPREAD_2 * R
    return [
      { cx: -dx / 2, cy: 0, labelX: -dx / 2 - LOWER_LABEL_SHIFT, labelY: R, labelAbove: false },
      { cx: dx / 2, cy: 0, labelX: dx / 2 + LOWER_LABEL_SHIFT, labelY: R, labelAbove: false },
    ]
  }
  const d = SPREAD_3 * R
  // Equilateral triangle of centres, centroid at the origin.
  const top = { x: 0, y: -d / Math.sqrt(3) }
  const left = { x: -d / 2, y: d / (2 * Math.sqrt(3)) }
  const right = { x: d / 2, y: d / (2 * Math.sqrt(3)) }
  return [
    { cx: top.x, cy: top.y, labelX: top.x, labelY: top.y - R, labelAbove: true },
    { cx: left.x, cy: left.y, labelX: left.x - LOWER_LABEL_SHIFT, labelY: left.y + R, labelAbove: false },
    { cx: right.x, cy: right.y, labelX: right.x + LOWER_LABEL_SHIFT, labelY: right.y + R, labelAbove: false },
  ]
}

interface VennGeom {
  scale: number
  ox: number
  oy: number
  r: number
  discs: Disc[]
  h: number
}

function resolveVenn(component: VennComponent, w: number): VennGeom {
  const set = discs(component.sets.length)
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const d of set) {
    minX = Math.min(minX, d.cx - R, d.labelX - LABEL_W / 2)
    maxX = Math.max(maxX, d.cx + R, d.labelX + LABEL_W / 2)
    minY = Math.min(minY, d.cy - R, d.labelAbove ? d.labelY - LABEL_GAP - LABEL_BAND : d.cy - R)
    maxY = Math.max(maxY, d.cy + R, d.labelAbove ? d.cy + R : d.labelY + LABEL_GAP + LABEL_BAND)
  }
  const bboxW = maxX - minX
  const bboxH = maxY - minY
  const scale = Math.min(w / bboxW, MAX_H / bboxH, MAX_UPSCALE)
  const drawnW = bboxW * scale
  return {
    scale,
    ox: (w - drawnW) / 2 - minX * scale,
    oy: -minY * scale,
    r: R * scale,
    discs: set,
    h: bboxH * scale,
  }
}

export const venn: SvgComponent<VennComponent> = {
  measure(component, w) {
    return resolveVenn(component, w).h
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const g = resolveVenn(component, box.w)
    const { scale, ox, oy, r } = g
    const palette = ctx.colors.chartPalette
    const labelSize = Math.max(FORM_TITLE_FLOOR, Math.round(18 * scale))
    const chipSize = Math.max(FORM_BODY_FLOOR, Math.round(17 * scale))
    const chipInk = accessibleInk(ctx.colors.surface, ctx.colors.primary, chipSize)

    // Every word is fitted before anything is painted. A set called "客户数据"
    // cut to "客户数" is a different set, and the drawing has nowhere to say
    // that a name lost its tail, so one cut anywhere declines the whole
    // figure (`./declared-fit.ts`).
    // The chip takes two lines when the shared ground has a name rather than
    // a word — "三样齐全的方言点" is what a real page writes there, and a
    // one-line chip could only have cut it.
    const chip = layoutFormTitle(component.center, {
      maxWidth: r * 1.35,
      fontSize: chipSize,
      maxLines: 2,
      floor: FORM_BODY_FLOOR,
      fontFamily: ctx.fonts.heading,
    })
    const labels = component.sets.map((set) =>
      fitFormLine(set.label, {
        maxWidth: LABEL_W * scale,
        fontSize: labelSize,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      }),
    )
    // The chip is a box nothing may cross, so it is sized by what the line
    // will actually paint rather than by the estimate that fitted it.
    const chipTextW = Math.max(
      ...chip.lines.map((line) =>
        paintedWidthCeiling(line, chip.fontSize, { bold: true, fontFamily: ctx.fonts.heading }),
      ),
      0,
    )
    const chipW = Math.max(r * 0.5, chipTextW + CHIP_PAD_X * 2)
    const chipH = Math.max(chip.lines.length * chip.lineHeight + 10, CHIP_H * scale)

    // The height the drawing was actually given, which is not always the
    // height it asked for: `box.h` is a real allocation in a stretched or
    // shared column, and circles that run past it would be clipped by the
    // page with nothing to say so.
    const allowed = box.h ?? g.h
    if (anyCut([chip, ...labels]) || chip.lines.length === 0 || g.h > allowed + 1) {
      return <DroppedContentMarker count={component.sets.length + 1} kind="label" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {g.discs.map((d, i) => (
          <circle
            key={`disc-${i}`}
            cx={ox + d.cx * scale}
            cy={oy + d.cy * scale}
            r={r}
            fill={palette[i % palette.length] ?? ctx.colors.primary}
            fillOpacity={0.38}
          />
        ))}
        {g.discs.map((d, i) => {
          const label = labels[i]!
          const y = d.labelAbove
            ? oy + d.labelY * scale - LABEL_GAP * scale
            : oy + d.labelY * scale + LABEL_GAP * scale + label.fontSize * 0.9
          return (
            <text
              key={`label-${i}`}
              x={ox + d.labelX * scale}
              y={y}
              textAnchor="middle"
              fontFamily={ctx.fonts.body}
              fontSize={label.fontSize}
              fontWeight="700"
              fill={ctx.colors.text}
            >
              {label.text}
            </text>
          )
        })}
        <rect
          x={ox - chipW / 2}
          y={oy - chipH / 2}
          width={chipW}
          height={chipH}
          rx={ctx.shape?.radius ?? CHIP_RADIUS}
          fill={ctx.colors.primary}
        />
        {chip.lines.map((line, li) => (
          <text
            key={`chip-${li}`}
            x={ox}
            y={oy - (chip.lines.length * chip.lineHeight) / 2 + li * chip.lineHeight + chip.fontSize * 0.95}
            textAnchor="middle"
            fontFamily={ctx.fonts.heading}
            fontSize={chip.fontSize}
            fontWeight="700"
            fill={chipInk}
          >
            {line}
          </text>
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<VennComponent> = {
  type: "venn",
  measure: venn.measure,
  render: venn.render,
}
