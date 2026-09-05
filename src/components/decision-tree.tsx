import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk, graphicInk } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import {
  FORM_BODY_FLOOR,
  fitFormLine,
  formHighlightFill,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type DecisionTreeComponent = Extract<Component, { type: "decision_tree" }>

/**
 * 决策树，从左到右两层：问题 → 2-3 条分支 → 每条分支 2-3 个结局。连线只走
 * 直角，条件/概率写在进入目标那一段的上方。被推荐的结局整块反色填满
 * （formHighlightFill），不在卡边上加色条。
 *
 * 结局最多 9 个，9 行挤进一屏时每张卡只剩一行的高度——这时 detail 与
 * value 不是被悄悄截掉，而是整行退场并 `data-dropped` 声明，导出闸门会
 * 因此拦下这一页。
 */

/**
 * Natural height at the widest shape.
 *
 * Set under the height an ordinary content rect grants rather than at it: a
 * face whose English heading takes a second line hands its body 350-odd
 * pixels, and a drawing measured taller than that is dropped whole by the
 * layout instead of drawn — which is how a component that fits every Chinese
 * page vanishes from every English one.
 */
const MAX_H = 330
const ROW_GAP = 10
const COL_GAP = 46
const CARD_MAX = 84
const CARD_MIN = 32
/** Below this a card holds its title and nothing else. */
const DETAIL_FLOOR = 62

interface Node {
  x: number
  y: number
  w: number
  h: number
}

interface Geometry {
  root: Node
  branches: Node[]
  outcomes: Node[][]
  cardH: number
  titleSize: number
  pad: number
  showDetail: boolean
  h: number
}

function resolve(component: DecisionTreeComponent, w: number, boxH?: number): Geometry {
  const counts = component.branches.map((branch) => branch.outcomes.length)
  const total = counts.reduce((n, c) => n + c, 0)
  // A face may hand over less than the natural height; the rows shrink into
  // whatever arrives rather than drawing past its bottom edge.
  const budget = boxH !== undefined && boxH > 0 ? Math.min(MAX_H, boxH) : MAX_H
  const cardH = Math.floor(
    Math.min(CARD_MAX, Math.max(CARD_MIN, (budget - ROW_GAP * (total - 1)) / total)),
  )
  const h = cardH * total + ROW_GAP * (total - 1)
  const rootW = Math.round(w * 0.23)
  const branchW = Math.round(w * 0.23)
  const outcomeX = rootW + branchW + COL_GAP * 2
  const outcomeW = w - outcomeX

  const outcomes: Node[][] = []
  let row = 0
  for (const count of counts) {
    outcomes.push(
      Array.from({ length: count }, () => {
        const node = { x: outcomeX, y: (row + 0) * (cardH + ROW_GAP), w: outcomeW, h: cardH }
        row += 1
        return node
      }),
    )
  }
  const centerOf = (nodes: Node[]) =>
    nodes.reduce((sum, node) => sum + node.y + node.h / 2, 0) / nodes.length
  const branchH = Math.min(CARD_MAX, Math.max(CARD_MIN, cardH))
  const branches = outcomes.map((group) => ({
    x: rootW + COL_GAP,
    y: Math.round(centerOf(group) - branchH / 2),
    w: branchW,
    h: branchH,
  }))
  const rootH = Math.min(CARD_MAX, Math.max(CARD_MIN, cardH))
  const root = {
    x: 0,
    y: Math.round(centerOf(outcomes.flat()) - rootH / 2),
    w: rootW,
    h: rootH,
  }
  const pad = cardH >= DETAIL_FLOOR ? 12 : 8
  return {
    root,
    branches,
    outcomes,
    cardH,
    titleSize: Math.max(FORM_BODY_FLOOR, Math.min(21, Math.round(cardH * 0.26))),
    pad,
    showDetail: cardH >= DETAIL_FLOOR,
    h: Math.round(h),
  }
}

/** Out of `from`'s right edge, across a shared spine, into `to`'s left edge. */
function elbow(from: Node, to: Node, arrow: number): { d: string; tipY: number; spine: number } {
  const ay = from.y + from.h / 2
  const by = to.y + to.h / 2
  const ax = from.x + from.w
  const bx = to.x - arrow
  const spine = Math.round((ax + bx) / 2)
  if (Math.abs(ay - by) < 0.5) return { d: `M ${ax} ${ay} L ${bx} ${ay}`, tipY: ay, spine }
  return { d: `M ${ax} ${ay} L ${spine} ${ay} L ${spine} ${by} L ${bx} ${by}`, tipY: by, spine }
}

const ARROW = 7

function arrowHead(x: number, y: number, color: string): ReactElement {
  return <polygon points={`${x},${y - ARROW * 0.6} ${x + ARROW},${y} ${x},${y + ARROW * 0.6}`} fill={color} />
}

export const decisionTree: SvgComponent<DecisionTreeComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolve(component, box.w, box.h)
    const border = ctx.colors.border ?? ctx.colors.muted
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const radius = ctx.shape?.radius ?? 4
    const highlight = formHighlightFill(ctx.colors)
    const line = graphicInk(border, pageBg)
    const edgeSize = FORM_BODY_FLOOR

    // A card too short for a second line loses its detail and its number
    // outright rather than clipping them into illegibility, and says so.
    const dropped = g.showDetail
      ? 0
      : component.branches.flatMap((branch) => [
          branch.detail?.trim() ? 1 : 0,
          ...branch.outcomes.map((o) => ((o.detail?.trim() ? 1 : 0) + (o.value?.trim() ? 1 : 0) > 0 ? 1 : 0)),
        ]).reduce((n: number, v: number) => n + v, 0)

    /**
     * The condition on a line, set above the run into its target and ending
     * just before the elbow turns — left of the vertical, so a digit never
     * has a connector drawn through it.
     *
     * How far left it may reach depends on where the target sits. A target on
     * a different row than its source leaves the page beside the source box
     * empty at that height, so the label runs back over the source column —
     * which is what gives a root condition like "already runs one · 61%" the
     * room to be a phrase. A target on the *same* row has the source box
     * directly to its left at exactly that height, so the label stays inside
     * the gap and a long one truncates rather than printing over a card.
     */
    const edgeLabel = (
      text: string | undefined,
      from: Node,
      spine: number,
      tipY: number,
      key: string,
    ): ReactElement | null => {
      const value = text?.trim()
      if (!value) return null
      const right = spine - 6
      const clear = Math.abs(tipY - (from.y + from.h / 2)) > edgeSize + 6
      const left = clear ? from.x + from.w * 0.45 : from.x + from.w + 4
      const fit = fitFormLine(value, {
        maxWidth: Math.max(24, right - left),
        fontSize: edgeSize,
        fontFamily: ctx.fonts.body,
      })
      return (
        <text
          key={key}
          data-truncated={fit.truncated ? "1" : undefined}
          x={right}
          y={tipY - 7}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={fit.fontSize}
          fill={accessibleInk(ctx.colors.muted, pageBg, fit.fontSize)}
        >
          {fit.text}
        </text>
      )
    }

    const card = (
      node: Node,
      key: string,
      opts: {
        title: string
        detail?: string
        value?: string
        unit?: string
        filled?: boolean
        strong?: boolean
      },
    ): ReactElement => {
      const filled = opts.filled === true
      const fill = filled ? highlight : ctx.colors.surface
      const value = g.showDetail ? opts.value?.trim() : undefined
      const unit = value ? opts.unit?.trim() : undefined
      const valueSize = Math.min(32, Math.round(g.cardH * 0.4))
      const unitSize = Math.max(FORM_BODY_FLOOR, Math.round(valueSize * 0.5))
      const unitW = unit ? measureTextUnits(unit, { fontFamily: ctx.fonts.body }) * unitSize + 5 : 0
      const valueFit = value
        ? fitFormLine(value, {
            maxWidth: node.w * 0.3,
            fontSize: valueSize,
            bold: true,
            fontFamily: ctx.fonts.heading,
          })
        : null
      const valueW = valueFit
        ? measureTextUnits(valueFit.text, { bold: true, fontFamily: ctx.fonts.heading }) * valueFit.fontSize
        : 0
      const textW = Math.max(24, node.w - g.pad * 2 - (valueFit ? valueW + unitW + 18 : 0))
      const title = fitFormLine(opts.title, {
        maxWidth: textW,
        fontSize: g.titleSize,
        bold: true,
        fontFamily: ctx.fonts.body,
      })
      const detail = g.showDetail ? opts.detail?.trim() : undefined
      const detailFit = detail
        ? fitFormLine(detail, { maxWidth: textW, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
        : null
      const blockH = title.fontSize + (detailFit ? detailFit.fontSize + 7 : 0)
      const top = node.y + node.h / 2 - blockH / 2
      const ink = (preferred: string, size: number) =>
        accessibleInk(filled ? ctx.colors.surface : preferred, fill, size)
      const valueRight = node.x + node.w - g.pad - unitW
      return (
        <g key={key}>
          <rect
            x={node.x}
            y={node.y}
            width={node.w}
            height={node.h}
            rx={radius}
            fill={fill}
            stroke={filled ? highlight : opts.strong ? ctx.colors.primary : border}
            strokeWidth={opts.strong ? 1.75 : 1}
          />
          <text
            data-truncated={title.truncated ? "1" : undefined}
            x={node.x + g.pad}
            y={top + title.fontSize * 0.9}
            fontFamily={ctx.fonts.body}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={ink(ctx.colors.text, title.fontSize)}
          >
            {title.text}
          </text>
          {detailFit ? (
            <text
              data-truncated={detailFit.truncated ? "1" : undefined}
              x={node.x + g.pad}
              y={top + title.fontSize + 7 + detailFit.fontSize * 0.9}
              fontFamily={ctx.fonts.body}
              fontSize={detailFit.fontSize}
              fill={ink(ctx.colors.muted, detailFit.fontSize)}
            >
              {detailFit.text}
            </text>
          ) : null}
          {valueFit ? (
            <text
              data-truncated={valueFit.truncated ? "1" : undefined}
              x={valueRight}
              y={node.y + node.h / 2 + valueFit.fontSize * 0.35}
              textAnchor="end"
              fontFamily={ctx.fonts.heading}
              fontSize={valueFit.fontSize}
              fontWeight="700"
              fill={ink(ctx.colors.primary, valueFit.fontSize)}
            >
              {valueFit.text}
            </text>
          ) : null}
          {valueFit && unit ? (
            <text
              x={valueRight + 5}
              y={node.y + node.h / 2 + valueFit.fontSize * 0.35}
              fontFamily={ctx.fonts.body}
              fontSize={unitSize}
              fill={ink(ctx.colors.muted, unitSize)}
            >
              {unit}
            </text>
          ) : null}
        </g>
      )
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {g.branches.map((branch, b) => {
          const { d, tipY, spine } = elbow(g.root, branch, ARROW)
          return (
            <g key={`root-edge-${b}`}>
              <path d={d} fill="none" stroke={line} strokeWidth={1.25} />
              {arrowHead(branch.x - ARROW, tipY, line)}
              {edgeLabel(component.branches[b]!.edge, g.root, spine, tipY, `root-label-${b}`)}
            </g>
          )
        })}
        {g.outcomes.flatMap((group, b) =>
          group.map((outcome, o) => {
            const { d, tipY, spine } = elbow(g.branches[b]!, outcome, ARROW)
            return (
              <g key={`edge-${b}-${o}`}>
                <path d={d} fill="none" stroke={line} strokeWidth={1.25} />
                {arrowHead(outcome.x - ARROW, tipY, line)}
                {edgeLabel(component.branches[b]!.outcomes[o]!.edge, g.branches[b]!, spine, tipY, `label-${b}-${o}`)}
              </g>
            )
          }),
        )}
        {card(g.root, "root", { title: component.question, strong: true })}
        {g.branches.map((branch, b) =>
          card(branch, `branch-${b}`, {
            title: component.branches[b]!.title,
            detail: component.branches[b]!.detail,
          }),
        )}
        {g.outcomes.flatMap((group, b) =>
          group.map((node, o) => {
            const outcome = component.branches[b]!.outcomes[o]!
            return card(node, `outcome-${b}-${o}`, {
              title: outcome.title,
              detail: outcome.detail,
              value: outcome.value,
              unit: outcome.unit,
              filled: outcome.recommended === true,
            })
          }),
        )}
        <DroppedContentMarker count={dropped} kind="label" />
      </g>
    )
  },
}

export const renderDef: RenderDef<DecisionTreeComponent> = {
  type: "decision_tree",
  measure: decisionTree.measure,
  render: decisionTree.render,
}
