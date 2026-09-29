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
 * 排完才生成，从头到尾不在障碍集合里。两条轴线也曾不在障碍里，落在中线附近
 * 的点，名字就压在轴线上，像被划掉一样。现在名字必须待在自己那个点所在的
 * 象限里，离两条轴线都留出空隙。先把所有固定墨迹量出来，再按作者顺序逐个
 * 安置标签。某条标签无处可放时，回头改前面标签的位置再试，确实没有一种摆法
 * 能放下全部名字，才把放不下的标签让出去，并用 `data-dropped`（kind=label）
 * 声明。点还在，位置还在，少的是名字，页面上不留「还有几个」的记号——导出会
 * 因为这条声明拒绝出片。
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
/**
 * Air a point's name keeps from either axis rule. The rules are ink like
 * everything else on the map, and a name laid across one reads as struck
 * through; one just grazing it reads as underlined.
 */
const AXIS_CLEAR = 8
/**
 * Air a point's name keeps beside any other ink on the map. Sized by its
 * real width, a name can otherwise end exactly where the next one starts,
 * and two names set on one line read as one.
 */
const LABEL_AIR = 6
/**
 * Air a name keeps above and below any other words on the map, ink to ink.
 *
 * Beside is not enough. Two names stacked a line apart and overlapping
 * across read as one name wrapped onto two lines: brief's English map set
 * "Yunshan School" 2px over "Dongqi Fund", and homeroom's "本班平均" sat on
 * "年级平均" the same way. A wrapped line in this repo sits at most half an
 * em of leading below the one above it (0.3em of air at the 17px names
 * here), and a stacked list keeps 8px more between two entries than between
 * the lines of one: `rings.tsx`'s `ROW_CLEAR`, set for the same 16–17px rows.
 * So a name keeps 8px from any word above or below it, clearly more than
 * the lines of one name would have.
 */
const NAME_STACK_AIR = 8
/**
 * Spots the label search may try before it settles for dropping a name. A
 * map whose first pass fits costs one try per label, and the densest gallery
 * maps settle within a few hundred. The cap only stops a map that has no
 * arrangement from trying every combination.
 */
const PLACEMENT_BUDGET = 20000
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

/** A label's box widened by the air it keeps on either side. */
function airy(b: Box): Box {
  return { x: b.x - LABEL_AIR, y: b.y, w: b.w + LABEL_AIR * 2, h: b.h }
}

/** A name's box widened by the air it keeps from another name, above and below as well as beside. */
function apart(b: Box): Box {
  return { x: b.x - LABEL_AIR, y: b.y - NAME_STACK_AIR, w: b.w + LABEL_AIR * 2, h: b.h + NAME_STACK_AIR * 2 }
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
    // failure this placement exists to prevent. A Chinese name, and an
    // English one in a face with an advance table, is boxed at its real width
    // (`paintedWidthCeiling`): padding it by half again made a crowded map
    // look full while there was still room beside a dot for the name to sit.
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
    // not been placed yet. The two axis rules are kept clear by the side
    // rule below.
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
    const dotBoxes: Box[] = dots.map((d) => ({ x: d.cx - d.r, y: d.cy - d.r, w: d.r * 2, h: d.r * 2 }))
    // An axis end name sits under its rule (the x axis) or to the right of
    // it (the y axis). A subject near that end of the scale can land its dot
    // right on the name, and the dot is data where the name is not: the name
    // crosses to the other side of the rule when that side is clear.
    const onDot = (b: Box) => dotBoxes.some((d) => overlaps(d, b))
    const xEnd = (text: string, atRight: boolean) => {
      const w = widthOf(text, false, metaSize) + 8
      const x = atRight ? box.w - widthOf(text, false, metaSize) - 8 : 0
      const under: Box = { x, y: axisY + 4, w, h: metaSize + 8 }
      const over: Box = { x, y: axisY - 12 - metaSize, w, h: metaSize + 8 }
      const up = onDot(under) && !onDot(over)
      return { box: up ? over : under, y: up ? axisY - 10 : axisY + metaSize + 8 }
    }
    const yEnd = (text: string, atTop: boolean) => {
      const w = widthOf(text, false, metaSize) + 8
      const y = atTop ? plotTop - 4 : plotBottom - metaSize - 4
      const right: Box = { x: axisX + 8, y, w, h: metaSize + 8 }
      const left: Box = { x: axisX - 8 - w, y, w, h: metaSize + 8 }
      const flip = onDot(right) && !onDot(left)
      return { box: flip ? left : right, x: flip ? axisX - 10 : axisX + 10, anchor: flip ? ("end" as const) : undefined }
    }
    const xLowEnd = xEnd(xLow.text, false)
    const xHighEnd = xEnd(xHigh.text, true)
    const yHighEnd = yEnd(yHigh.text, true)
    const yLowEnd = yEnd(yLow.text, false)
    const fixed: Box[] = [yHighEnd.box, yLowEnd.box, xLowEnd.box, xHighEnd.box, ...cornerBoxes, ...dotBoxes]
    // The words among them, which a name keeps `NAME_STACK_AIR` from above
    // and below as well. A dot is not a word, and a name sits right above or
    // below its own.
    const fixedText: Box[] = [yHighEnd.box, yLowEnd.box, xLowEnd.box, xHighEnd.box, ...cornerBoxes]

    interface Spot {
      box: Box
      x: number
      y: number
      anchor: "start" | "end"
    }
    // Every spot each label could take on its own (inside the map, on its
    // own dot's side of both axis rules, and clear of the fixed ink), in the
    // order a person labelling by hand would try them.
    const spots: Spot[][] = component.points.map((point, i) => {
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
      const rise = textH + 4
      // A label stacked over or under the dot: its box centred on the dot,
      // or hung off the dot's right or left edge. `rows` steps it one more
      // line away.
      const aboveAt = (x: number, anchor: "start" | "end", rows = 0) => ({
        box: {
          x: anchor === "start" ? x : x - textW,
          y: dot.cy - dot.r - LABEL_GAP - textH - rows * rise,
          w: textW,
          h: textH,
        },
        x,
        y: dot.cy - dot.r - LABEL_GAP - textH * 0.2 - rows * rise,
        anchor,
      })
      const belowAt = (x: number, anchor: "start" | "end", rows = 0) => {
        const top = dot.cy + dot.r + LABEL_GAP + rows * rise
        return {
          box: { x: anchor === "start" ? x : x - textW, y: top, w: textW, h: textH },
          x,
          y: top + fitted.fontSize * 0.9,
          anchor,
        }
      }
      const centred = dot.cx - textW / 2
      // Right of the dot first, then left, then above and below, then the
      // same four again one and two rows off — the order a person labelling
      // by hand would try, and fixed, so the same map lands the same way.
      // Only once all of those are taken does a label try the finer steps: a
      // half row off to either side, hung off a corner of the dot, or a row
      // further up or down. A subject sitting near the crossing has both
      // axis rules to stay off as well as its neighbours, and the whole-row
      // steps alone leave it nowhere to go.
      const candidates = [
        rightOf(0),
        leftOf(0),
        aboveAt(centred, "start"),
        belowAt(centred, "start"),
        rightOf(-rise),
        rightOf(rise),
        leftOf(-rise),
        leftOf(rise),
        rightOf(-2 * rise),
        rightOf(2 * rise),
        leftOf(-2 * rise),
        leftOf(2 * rise),
        rightOf(-rise / 2),
        rightOf(rise / 2),
        leftOf(-rise / 2),
        leftOf(rise / 2),
        aboveAt(dot.cx, "start"),
        aboveAt(dot.cx, "end"),
        belowAt(dot.cx, "start"),
        belowAt(dot.cx, "end"),
        aboveAt(centred, "start", 1),
        belowAt(centred, "start", 1),
        // With air kept above and below every name, a cluster of subjects
        // needs spots the whole-row steps skip: a row and a half off, a
        // hung spot one row further, a centred spot two rows further.
        rightOf(-1.5 * rise),
        rightOf(1.5 * rise),
        leftOf(-1.5 * rise),
        leftOf(1.5 * rise),
        aboveAt(dot.cx, "start", 1),
        aboveAt(dot.cx, "end", 1),
        belowAt(dot.cx, "start", 1),
        belowAt(dot.cx, "end", 1),
        aboveAt(centred, "start", 2),
        belowAt(centred, "start", 2),
      ]
      // A name belongs in its subject's quadrant: across an axis rule it
      // reads as a claim about the other quadrant, and on the rule it reads
      // as struck through.
      // A subject sitting exactly on a rule may be named from either side.
      const leftOfRule = (b: Box) => b.x + b.w <= axisX - AXIS_CLEAR
      const rightOfRule = (b: Box) => b.x >= axisX + AXIS_CLEAR
      const aboveRule = (b: Box) => b.y + b.h <= axisY - AXIS_CLEAR
      const belowRule = (b: Box) => b.y >= axisY + AXIS_CLEAR
      const ownSide = (b: Box) =>
        (dot.cx < axisX ? leftOfRule(b) : dot.cx > axisX ? rightOfRule(b) : leftOfRule(b) || rightOfRule(b)) &&
        (dot.cy < axisY ? aboveRule(b) : dot.cy > axisY ? belowRule(b) : aboveRule(b) || belowRule(b))
      return candidates.filter(
        (candidate) =>
          ownSide(candidate.box) &&
          candidate.box.x >= 0 &&
          candidate.box.x + candidate.box.w <= box.w &&
          candidate.box.y >= 0 &&
          candidate.box.y + candidate.box.h <= h &&
          !fixed.some((t) => overlaps(t, airy(candidate.box))) &&
          !fixedText.some((t) => overlaps(t, apart(candidate.box))),
      )
    })

    // Author order, each label in the first spot still free. When that
    // leaves a label nowhere to go, an earlier label may have taken the one
    // spot it had while other spots were open to it, so the search steps
    // back and tries the earlier labels' later spots before giving any name
    // up. A map whose first pass fits is never searched further, and the
    // budget keeps a hopeless map from searching forever.
    //
    // Each spot taken also strikes the spots it crowds from every later
    // label's list, and a spot that leaves some later label with none is
    // passed over at once. That finds the same arrangement stepping back
    // would, without walking every dead end first: once names kept air above
    // and below and had more spots to try, clinic's map spent the whole
    // budget on dead ends and dropped a name that had a spot.
    const chosen: (Spot | undefined)[] = new Array(spots.length).fill(undefined)
    let budget = PLACEMENT_BUDGET
    const clear = (a: Spot, b: Spot) => !overlaps(apart(a.box), b.box)
    const fits = (i: number, open: Spot[][]): boolean => {
      if (i === spots.length) return true
      for (const spot of open[i]!) {
        if (budget-- <= 0) return false
        // Taking a spot is only worth trying if every later label still has
        // somewhere to go beside it.
        const rest = open.map((options, j) => (j > i ? options.filter((other) => clear(spot, other)) : options))
        if (rest.some((options, j) => j > i && options.length === 0)) continue
        chosen[i] = spot
        if (fits(i + 1, rest)) return true
      }
      chosen[i] = undefined
      return false
    }
    if (!fits(0, spots)) {
      // No arrangement names every subject: the first free spot in author
      // order, and a declared drop for each label left without one.
      chosen.fill(undefined)
      spots.forEach((options, i) => {
        chosen[i] = options.find((spot) => !chosen.some((c) => c !== undefined && overlaps(apart(c.box), spot.box)))
      })
    }
    const droppedLabels = chosen.filter((c) => c === undefined).length
    const placed = chosen.map((spot, i) =>
      spot
        ? { label: { x: spot.x, y: spot.y, anchor: spot.anchor, text: labels[i]!.text, fontSize: labels[i]!.fontSize } }
        : {},
    )

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
        <text x={0} y={xLowEnd.y} fontFamily={ctx.fonts.body} fontSize={xLow.fontSize} fill={metaInk}>
          {xLow.text}
        </text>
        <text
          x={box.w}
          y={xHighEnd.y}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={xHigh.fontSize}
          fill={metaInk}
        >
          {xHigh.text}
        </text>
        <text
          x={yHighEnd.x}
          y={plotTop + metaSize}
          textAnchor={yHighEnd.anchor}
          fontFamily={ctx.fonts.body}
          fontSize={yHigh.fontSize}
          fill={metaInk}
        >
          {yHigh.text}
        </text>
        <text
          x={yLowEnd.x}
          y={plotBottom - 4}
          textAnchor={yLowEnd.anchor}
          fontFamily={ctx.fonts.body}
          fontSize={yLow.fontSize}
          fill={metaInk}
        >
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
