import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine, paintedWidthCeiling } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type PositioningMapComponent = Extract<Component, { type: "positioning_map" }>

/**
 * 两条细轴把画面切成四格，每个主体落在自己的坐标上，其中一个可以被点名。
 *
 * 标签的碰撞处理是这个组件唯一的算法，而它先要知道障碍是什么：四个象限名、
 * 四个轴端名、以及**全部**的点——不只是已经排过的那几个。早先的版本把点的
 * 占位放在它自己的标签之后才加入，于是先写的标签能盖住后写的点；象限名更是
 * 排完才生成，从头到尾不在障碍集合里。现在先把所有固定墨迹量出来，再按作者
 * 顺序逐个安置标签，十二个位置都被占了才把这一条标签让出去，并用 `data-dropped`
 * （kind=label）声明。点还在，位置还在，少的是名字，页面上不留「还有几个」的
 * 记号——导出会因为这条声明拒绝出片。
 *
 * 名字本身一个字都不许少：任何一条标签、象限名或轴端名需要裁字才能放下时，
 * 整幅图声明退让（`./declared-fit.ts`）。
 */

/** Ring of margin kept clear of the plot so a label near the edge still lands inside. */
const INSET = 44
/** Rows the quadrant names sit in, above and below the plot. */
const CORNER_ROW = 26
const DOT_R = 5
const EMPHASIS_DOT_R = 7.5
const LABEL_GAP = 9
const MIN_H = 230
const MAX_H = 350
/** How tall the map wants to be relative to the width it is given. */
const ASPECT = 0.42

interface Box {
  x: number
  y: number
  w: number
  h: number
}

function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

function mapHeight(w: number): number {
  return Math.max(MIN_H, Math.min(MAX_H, w * ASPECT))
}

export const positioningMap: SvgComponent<PositioningMapComponent> = {
  measure(_component, w) {
    return mapHeight(w)
  },

  render(component, box, ctx: ComponentCtx): ReactElement {
    const h = mapHeight(box.w)
    // The map draws its own height; a shorter allocation would clip the lower
    // quadrant names with nothing on the page to say so.
    if (box.h != null && h > box.h + 1) {
      return <DroppedContentMarker count={component.points.length} kind="item" />
    }
    const axisColor = ctx.colors.border ?? ctx.colors.muted
    const metaSize = FORM_BODY_FLOOR
    const labelSize = Math.max(FORM_BODY_FLOOR, 17)
    const plotTop = CORNER_ROW + 6
    const plotBottom = h - CORNER_ROW - 6
    const axisY = (plotTop + plotBottom) / 2
    const axisX = box.w / 2
    const left = INSET
    const right = box.w - INSET
    const top = plotTop + 14
    const bottom = plotBottom - 14
    const metaInk = accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, metaSize)

    const fitMeta = (text: string, maxWidth: number) =>
      fitFormLine(text, { maxWidth, fontSize: metaSize, floor: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
    // Collision boxes are sized by what a line will really paint: the
    // estimate reads short on a face with no exact width table, and a label
    // that measured clear then painted over its neighbour is exactly the
    // failure this placement exists to prevent.
    const widthOf = (text: string, bold: boolean, size: number) =>
      paintedWidthCeiling(text, size, { bold, fontFamily: ctx.fonts.body })

    const xLow = fitMeta(`${component.x_axis.title} ${component.x_axis.low}`, box.w * 0.4)
    const xHigh = fitMeta(`${component.x_axis.title} ${component.x_axis.high}`, box.w * 0.4)
    const yHigh = fitMeta(`${component.y_axis.title} ${component.y_axis.high}`, box.w * 0.4)
    const yLow = fitMeta(`${component.y_axis.title} ${component.y_axis.low}`, box.w * 0.4)

    const cornerText = component.quadrants
      ? [
          component.quadrants.top_left,
          component.quadrants.top_right,
          component.quadrants.bottom_left,
          component.quadrants.bottom_right,
        ]
      : []
    const corners = cornerText.map((text) => fitMeta(text, box.w * 0.4))

    const labels = component.points.map((point) =>
      fitFormLine(point.label, {
        maxWidth: Math.max(120, box.w * 0.26),
        fontSize: labelSize,
        floor: FORM_BODY_FLOOR,
        bold: point.emphasis === true,
        fontFamily: ctx.fonts.body,
      }),
    )

    if (anyCut([xLow, xHigh, yHigh, yLow, ...corners, ...labels])) {
      return <DroppedContentMarker count={component.points.length} kind="item" />
    }

    // Every piece of fixed ink first: the four axis end names, the four
    // quadrant names, and every dot — including the dots whose own label has
    // not been placed yet.
    const dots = component.points.map((point) => {
      const r = point.emphasis ? EMPHASIS_DOT_R : DOT_R
      return {
        cx: left + (point.x / 100) * (right - left),
        cy: bottom - (point.y / 100) * (bottom - top),
        r,
      }
    })
    const cornerBoxes: Box[] = corners.map((fit, i) => {
      const w = widthOf(fit.text, false, fit.fontSize)
      const bottomRow = i >= 2
      const rightSide = i % 2 === 1
      return {
        x: rightSide ? box.w - w : 0,
        y: bottomRow ? h - metaSize - 6 : CORNER_ROW - 8 - metaSize,
        w,
        h: metaSize + 6,
      }
    })
    const taken: Box[] = [
      { x: axisX + 8, y: plotTop - 4, w: widthOf(yHigh.text, false, metaSize) + 8, h: metaSize + 8 },
      { x: axisX + 8, y: plotBottom - metaSize - 4, w: widthOf(yLow.text, false, metaSize) + 8, h: metaSize + 8 },
      { x: 0, y: axisY + 4, w: widthOf(xLow.text, false, metaSize) + 8, h: metaSize + 8 },
      {
        x: box.w - widthOf(xHigh.text, false, metaSize) - 8,
        y: axisY + 4,
        w: widthOf(xHigh.text, false, metaSize) + 8,
        h: metaSize + 8,
      },
      ...cornerBoxes,
      ...dots.map((d) => ({ x: d.cx - d.r, y: d.cy - d.r, w: d.r * 2, h: d.r * 2 })),
    ]

    interface Placed {
      label?: { x: number; y: number; anchor: "start" | "end"; text: string; fontSize: number }
    }
    const placed: Placed[] = []
    let droppedLabels = 0

    component.points.forEach((point, i) => {
      const dot = dots[i]!
      const fitted = labels[i]!
      const textW = widthOf(fitted.text, point.emphasis === true, fitted.fontSize)
      const textH = fitted.fontSize * 1.2
      const rightOf = (dy: number) => ({
        box: { x: dot.cx + dot.r + LABEL_GAP, y: dot.cy + dy - textH / 2, w: textW, h: textH },
        x: dot.cx + dot.r + LABEL_GAP,
        y: dot.cy + dy + fitted.fontSize * 0.35,
        anchor: "start" as const,
      })
      const leftOf = (dy: number) => ({
        box: { x: dot.cx - dot.r - LABEL_GAP - textW, y: dot.cy + dy - textH / 2, w: textW, h: textH },
        x: dot.cx - dot.r - LABEL_GAP,
        y: dot.cy + dy + fitted.fontSize * 0.35,
        anchor: "end" as const,
      })
      const above = {
        box: { x: dot.cx - textW / 2, y: dot.cy - dot.r - LABEL_GAP - textH, w: textW, h: textH },
        x: dot.cx - textW / 2,
        y: dot.cy - dot.r - LABEL_GAP - textH * 0.2,
        anchor: "start" as const,
      }
      const below = {
        box: { x: dot.cx - textW / 2, y: dot.cy + dot.r + LABEL_GAP, w: textW, h: textH },
        x: dot.cx - textW / 2,
        y: dot.cy + dot.r + LABEL_GAP + fitted.fontSize * 0.9,
        anchor: "start" as const,
      }
      const rise = textH + 4
      // Right of the dot first, then left, then above and below, then the
      // same four again one and two rows off — the order a person labelling
      // by hand would try, and fixed, so the same map lands the same way.
      const candidates = [
        rightOf(0),
        leftOf(0),
        above,
        below,
        rightOf(-rise),
        rightOf(rise),
        leftOf(-rise),
        leftOf(rise),
        rightOf(-2 * rise),
        rightOf(2 * rise),
        leftOf(-2 * rise),
        leftOf(2 * rise),
      ]
      const spot = candidates.find(
        (candidate) =>
          candidate.box.x >= 0 &&
          candidate.box.x + candidate.box.w <= box.w &&
          candidate.box.y >= 0 &&
          candidate.box.y + candidate.box.h <= h &&
          !taken.some((t) => overlaps(t, candidate.box)),
      )
      if (spot) {
        taken.push(spot.box)
        placed.push({
          label: { x: spot.x, y: spot.y, anchor: spot.anchor, text: fitted.text, fontSize: fitted.fontSize },
        })
      } else {
        droppedLabels += 1
        placed.push({})
      }
    })

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <line x1={0} y1={axisY} x2={box.w} y2={axisY} stroke={axisColor} strokeWidth={1} />
        <line x1={axisX} y1={plotTop} x2={axisX} y2={plotBottom} stroke={axisColor} strokeWidth={1} />
        {corners.map((fit, i) => (
          <text
            key={`corner-${i}`}
            x={i % 2 === 1 ? box.w : 0}
            y={i >= 2 ? h - 6 : CORNER_ROW - 8}
            textAnchor={i % 2 === 1 ? "end" : "start"}
            fontFamily={ctx.fonts.body}
            fontSize={fit.fontSize}
            fill={metaInk}
          >
            {fit.text}
          </text>
        ))}
        <text x={0} y={axisY + metaSize + 8} fontFamily={ctx.fonts.body} fontSize={xLow.fontSize} fill={metaInk}>
          {xLow.text}
        </text>
        <text
          x={box.w}
          y={axisY + metaSize + 8}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={xHigh.fontSize}
          fill={metaInk}
        >
          {xHigh.text}
        </text>
        <text x={axisX + 10} y={plotTop + metaSize} fontFamily={ctx.fonts.body} fontSize={yHigh.fontSize} fill={metaInk}>
          {yHigh.text}
        </text>
        <text x={axisX + 10} y={plotBottom - 4} fontFamily={ctx.fonts.body} fontSize={yLow.fontSize} fill={metaInk}>
          {yLow.text}
        </text>
        {dots.map((dot, i) => (
          <circle
            key={`dot-${i}`}
            cx={dot.cx}
            cy={dot.cy}
            r={dot.r}
            fill={component.points[i]!.emphasis ? ctx.colors.primary : ctx.colors.muted}
          />
        ))}
        {placed.map((p, i) =>
          p.label ? (
            <text
              key={`point-label-${i}`}
              x={p.label.x}
              y={p.label.y}
              textAnchor={p.label.anchor}
              fontFamily={ctx.fonts.body}
              fontSize={p.label.fontSize}
              fontWeight={component.points[i]!.emphasis ? "700" : undefined}
              fill={ctx.colors.text}
            >
              {p.label.text}
            </text>
          ) : null,
        )}
        <DroppedContentMarker count={droppedLabels} kind="label" />
      </g>
    )
  },
}

export const renderDef: RenderDef<PositioningMapComponent> = {
  type: "positioning_map",
  measure: positioningMap.measure,
  render: positioningMap.render,
}
