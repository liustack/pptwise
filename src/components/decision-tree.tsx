import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk, graphicInk } from "../render/ink"
import { measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import {
  FORM_BODY_FLOOR,
  fitFormLine,
  fitFormUnit,
  boxTooShort,
  formHighlightFill,
  formTextClipMarker,
  layoutAtSize,
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
 * 因此拦下这一页。窄到 MIN_W 以下（双栏脸的一半）时整幅退场，同样声明：
 * 三列挤在 480px 里画出来的不是决策树，是一堆两个字的残句。
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
/**
 * Gutter between two columns. Wide enough to hold a condition on its own: a
 * label that cannot reach back over the column behind it has only this gap to
 * stand in, and a narrow one leaves "62%" showing as "%".
 */
const COL_GAP = 92
const CARD_MAX = 84
const CARD_MIN = 32
/**
 * Narrower than this and the drawing stops being one.
 *
 * Three columns and two gutters share the width, so an outcome card gets
 * barely half of it: at 480px a four-word ending is cut to two characters and
 * a percentage on a line to a bare `%`. The tree declines the box instead —
 * a page that says nothing is honest, a page that says "手三" is not.
 */
const MIN_W = 700
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
  rootLines: number
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
  const rootW = Math.round(w * 0.21)
  const branchW = Math.round(w * 0.21)
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
  // The question is the one card that stands alone in its column, so it takes
  // half a row more than an outcome does — a decision worth drawing a tree for
  // is rarely four words, and one line of it is a stub.
  const rootH = Math.min(h, Math.round(cardH * 1.5))
  const root = {
    x: 0,
    y: Math.round(centerOf(outcomes.flat()) - rootH / 2),
    w: rootW,
    h: rootH,
  }
  const pad = cardH >= DETAIL_FLOOR ? 12 : 8
  const titleSize = Math.max(FORM_BODY_FLOOR, Math.min(21, Math.round(cardH * 0.26)))
  return {
    root,
    branches,
    outcomes,
    cardH,
    titleSize,
    // However many lines of the question the root box can actually hold.
    rootLines: Math.max(1, Math.min(3, Math.floor((rootH - pad * 2) / Math.round(titleSize * 1.4)))),
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
    // An outcome card is `outcomeW` wide; a unit with no room left beside its
    // number there leaves the drawing whole and says so, the same as a detail
    // line that cannot be set.
    const outcomeW = box.w - Math.round(box.w * 0.21) * 2 - COL_GAP * 2
    const unitless = g.showDetail
      ? component.branches.reduce(
          (n, branch) =>
            n +
            branch.outcomes.filter(
              (outcome) =>
                (outcome.value ?? "").trim() !== "" &&
                (outcome.unit ?? "").trim() !== "" &&
                fitFormUnit(outcome.unit!, {
                  room: outcomeW * 0.22,
                  fontSize: FORM_BODY_FLOOR,
                  fontFamily: ctx.fonts.body,
                }) === null,
            ).length,
          0,
        )
      : 0
    const dropped = g.showDetail
      ? unitless
      : component.branches.flatMap((branch) => [
          branch.detail?.trim() ? 1 : 0,
          ...branch.outcomes.map((o) => ((o.detail?.trim() ? 1 : 0) + (o.value?.trim() ? 1 : 0) > 0 ? 1 : 0)),
        ]).reduce((n: number, v: number) => n + v, 0)

    /**
     * The condition on a line, set above the run into its target and ending
     * just before the elbow turns — left of the vertical, so a digit never
     * has a connector drawn through it.
     *
     * Where it may stand depends on whether the source card is beside it. A
     * label whose own line clears the source card top or bottom runs back over
     * that column, which is what gives a root condition like "already runs
     * one · 61%" the room to be a phrase. A label level with the source card
     * stands in the gutter after the elbow instead, and a long one truncates
     * there rather than printing over the card.
     */
    const edgeLabel = (
      text: string | undefined,
      from: Node,
      to: Node,
      spine: number,
      tipY: number,
      key: string,
    ): ReactElement | null => {
      const value = text?.trim()
      if (!value) return null
      // The line the label occupies, so "does it clear the card" is asked of
      // the text's own band and not of a point on it.
      const top = tipY - 7 - edgeSize
      const bottom = tipY - 7
      const clear = bottom < from.y || top > from.y + from.h
      const right = clear ? spine - 6 : to.x - ARROW - 6
      // Clear of its card, a label may run back across that card's whole
      // column: a condition like "Opening automation · 39%" is a phrase, and
      // stopping it halfway across left it at "Opening automation".
      const left = clear ? from.x : spine + 5
      const fit = fitFormLine(value, {
        maxWidth: Math.max(24, right - left),
        fontSize: edgeSize,
        fontFamily: ctx.fonts.body,
      })
      // The topmost row's line sits close enough to the top edge that a label
      // set above it would hang off the drawing. It drops to the first
      // baseline that keeps its own ascent inside instead.
      const baseline = Math.max(tipY - 7, edgeSize + 1)
      return (
        <text
          key={key}
          data-truncated={fit.truncated ? "1" : undefined}
          x={right}
          y={baseline}
          textAnchor="end"
          fontFamily={ctx.fonts.body}
          fontSize={fit.fontSize}
          fill={accessibleInk(ctx.colors.muted, pageBg, fit.fontSize)}
        >
          {fit.text}
        </text>
      )
    }

    /** The number and unit a card sets at its right edge, and the width left for its words. */
    const figures = (node: Node, rawValue?: string, rawUnit?: string) => {
      const value = g.showDetail ? rawValue?.trim() : undefined
      const unit = value ? rawUnit?.trim() : undefined
      const valueSize = Math.min(32, Math.round(g.cardH * 0.4))
      const unitSize = Math.max(FORM_BODY_FLOOR, Math.round(valueSize * 0.5))
      // The unit ends at the card's own inner edge rather than starting after
      // the number: a right-anchored run cannot reach past the boundary it is
      // anchored to, whatever the width estimate thought it would take. The
      // room it may claim is fitted through `fitFormUnit`, which carries the
      // headroom the estimator's own bias needs.
      const unitFit = unit ? fitFormUnit(unit, { room: node.w * 0.22, fontSize: unitSize, fontFamily: ctx.fonts.body }) : null
      const unitW = unitFit ? unitFit.width + 5 : 0
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
      return { valueFit, unitFit, unitW, textW }
    }

    const detailLayout = (detail: string, textW: number, lines: number) =>
      lines > 1
        ? layoutAtSize(detail, { maxWidth: textW, fontSize: FORM_BODY_FLOOR, maxLines: lines, fontFamily: ctx.fonts.body })
        : (() => {
            const fit = fitFormLine(detail, { maxWidth: textW, fontSize: FORM_BODY_FLOOR, fontFamily: ctx.fonts.body })
            return { lines: [fit.text], fontSize: fit.fontSize, lineHeight: 0, truncated: fit.truncated }
          })()

    /** How tall a card's words stand: title lines, then the detail under a 7px gap. */
    const wordsHeight = (
      title: { lines: string[]; lineHeight: number },
      detail: { lines: string[]; fontSize: number; lineHeight: number } | null,
    ): number =>
      title.lines.length * title.lineHeight +
      (detail ? detail.fontSize + 7 + (detail.lines.length - 1) * detail.lineHeight : 0)

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
        /** The question gets two lines; every other card is one. */
        lines?: number
        /** A branch card grown to its outcomes' height wraps its detail too. */
        detailLines?: number
        /** One size for a whole column, when one of its titles needs less. */
        titleSize?: number
      },
    ): ReactElement => {
      const filled = opts.filled === true
      const fill = filled ? highlight : ctx.colors.surface
      const { valueFit, unitFit, unitW, textW } = figures(node, opts.value, opts.unit)
      const title = layoutAtSize(opts.title, {
        maxWidth: textW,
        fontSize: opts.titleSize ?? g.titleSize,
        maxLines: opts.lines ?? 1,
        bold: true,
        fontFamily: ctx.fonts.body,
      })
      const detail = g.showDetail ? opts.detail?.trim() : undefined
      const detailFit = detail ? detailLayout(detail, textW, opts.detailLines ?? 1) : null
      const titleH = title.lines.length * title.lineHeight
      const blockH = wordsHeight(title, detailFit)
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
          {title.lines.map((line, li) => (
            <text
              key={`title-${li}`}
              data-truncated={formTextClipMarker(title, li)}
              x={node.x + g.pad}
              y={top + li * title.lineHeight + title.fontSize * 0.9}
              fontFamily={ctx.fonts.body}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={ink(ctx.colors.text, title.fontSize)}
            >
              {line}
            </text>
          ))}
          {detailFit?.lines.map((line, li) => (
            <text
              key={`detail-${li}`}
              data-truncated={formTextClipMarker(detailFit, li)}
              x={node.x + g.pad}
              y={top + titleH + 7 + li * detailFit.lineHeight + detailFit.fontSize * 0.9}
              fontFamily={ctx.fonts.body}
              fontSize={detailFit.fontSize}
              fill={ink(ctx.colors.muted, detailFit.fontSize)}
            >
              {line}
            </text>
          ))}
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
          {valueFit && unitFit ? (
            <text
              data-truncated={unitFit.truncated ? "1" : undefined}
              x={node.x + node.w - g.pad}
              y={node.y + node.h / 2 + valueFit.fontSize * 0.35}
              textAnchor="end"
              fontFamily={ctx.fonts.body}
              fontSize={unitFit.fontSize}
              fill={ink(ctx.colors.muted, unitFit.fontSize)}
            >
              {unitFit.text}
            </text>
          ) : null}
        </g>
      )
    }

    /**
     * A branch card stands alone beside the outcomes it leads to, so it may
     * be as tall as they are together. It stays one row high while its name
     * and detail each fit a line, and grows around its own centre into that
     * height when they need a second one.
     */
    const branchCards = g.branches.map((node, b) => {
      const branch = component.branches[b]!
      const detail = g.showDetail ? branch.detail?.trim() : undefined
      const textW = Math.max(24, node.w - g.pad * 2)
      const oneTitle = layoutAtSize(branch.title, {
        maxWidth: textW,
        fontSize: g.titleSize,
        maxLines: 1,
        bold: true,
        fontFamily: ctx.fonts.body,
      })
      const oneDetail = detail ? detailLayout(detail, textW, 1) : null
      if (!g.showDetail || (!oneTitle.truncated && !oneDetail?.truncated)) {
        return { node, lines: 1, detailLines: 1 }
      }
      const group = g.outcomes[b]!
      const span = group[group.length - 1]!.y + group[group.length - 1]!.h - group[0]!.y
      const title = layoutAtSize(branch.title, {
        maxWidth: textW,
        fontSize: g.titleSize,
        maxLines: 2,
        bold: true,
        fontFamily: ctx.fonts.body,
      })
      const detailFit = detail ? detailLayout(detail, textW, 2) : null
      const h = Math.min(span, Math.max(node.h, Math.ceil(wordsHeight(title, detailFit) + g.pad * 2)))
      const centre = node.y + node.h / 2
      return { node: { ...node, y: Math.round(centre - h / 2), h }, lines: 2, detailLines: 2 }
    })

    /**
     * Outcome names share one size. A name too long for the room its number
     * leaves takes the column down together, as far as the floor, rather
     * than losing its last words.
     */
    const outcomeTitleSize = Math.min(
      g.titleSize,
      ...g.outcomes.flatMap((group, b) =>
        group.map((node, o) => {
          const outcome = component.branches[b]!.outcomes[o]!
          const { textW } = figures(node, outcome.value, outcome.unit)
          return fitFormLine(outcome.title, {
            maxWidth: textW,
            fontSize: g.titleSize,
            bold: true,
            fontFamily: ctx.fonts.body,
          }).fontSize
        }),
      ),
    )

    if (box.w < MIN_W || boxTooShort(g.h, box.h)) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {branchCards.map(({ node: branch }, b) => {
          const { d, tipY, spine } = elbow(g.root, branch, ARROW)
          return (
            <g key={`root-edge-${b}`}>
              <path d={d} fill="none" stroke={line} strokeWidth={1.25} />
              {arrowHead(branch.x - ARROW, tipY, line)}
              {edgeLabel(component.branches[b]!.edge, g.root, branch, spine, tipY, `root-label-${b}`)}
            </g>
          )
        })}
        {g.outcomes.flatMap((group, b) =>
          group.map((outcome, o) => {
            const from = branchCards[b]!.node
            const { d, tipY, spine } = elbow(from, outcome, ARROW)
            return (
              <g key={`edge-${b}-${o}`}>
                <path d={d} fill="none" stroke={line} strokeWidth={1.25} />
                {arrowHead(outcome.x - ARROW, tipY, line)}
                {edgeLabel(component.branches[b]!.outcomes[o]!.edge, from, outcome, spine, tipY, `label-${b}-${o}`)}
              </g>
            )
          }),
        )}
        {card(g.root, "root", { title: component.question, strong: true, lines: g.rootLines })}
        {branchCards.map(({ node, lines, detailLines }, b) =>
          card(node, `branch-${b}`, {
            title: component.branches[b]!.title,
            detail: component.branches[b]!.detail,
            lines,
            detailLines,
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
              titleSize: outcomeTitleSize,
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
