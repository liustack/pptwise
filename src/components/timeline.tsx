import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "../lib/svg-text-layout"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"
import { accessibleInk, contrastRatio, graphicInk, requiredContrastRatio, resolveSemanticColor } from "../render/ink"
import { Icon } from "../render/icons"
import { DroppedContentMarker } from "../render/drop-marker"
import { withBlockTitle } from "./block-title"

type TimelineComponent = Extract<Component, { type: "timeline" }>

const AXIS_Y = 100
const PAD = 20
/** Reserved gap on each side of a milestone label before it would collide
 * with its neighbor's label. */
const LABEL_GAP = 12
const MIN_FONT_SIZE = 16
const TITLE_SIZE = 16
const DESC_SIZE = 16
const TITLE_TOP = AXIS_Y + 28
const BOTTOM_PAD = 18

type Anchor = "start" | "middle" | "end"

type Milestone = TimelineComponent["milestones"][number]

/**
 * The dot a milestone gets, from the authored facts that change it:
 * `highlight`, the turn the author marked, and `tone`, the kind of news it
 * is. A marked node grows and takes the accent, an unmarked one stays the
 * quieter primary, and a tone paints the dot in the theme's own ink for it
 * (danger, warning or success) at either size.
 *
 * Both layouts read the fields through here. The horizontal row used to
 * ignore `highlight` outright — every dot came out `r=8` in the accent, so a
 * deck that named its turning point got a row of identical circles and the
 * reader was left to guess which one it was.
 */
function milestoneDot(
  m: Pick<Milestone, "highlight" | "tone">,
  baseR: number,
  colors: ComponentCtx["colors"],
  ground: string,
): { r: number; fill: string } {
  const r = m.highlight ? baseR + 3 : baseR
  if (m.tone) return { r, fill: graphicInk(resolveSemanticColor(m.tone, colors), ground) }
  return { r, fill: m.highlight ? colors.accent : colors.primary }
}

/** The ring a milestone with an icon is drawn in, its radius on the axis. */
const ICON_NODE = { r: 13, size: 16 } as const

/**
 * A milestone's node: its dot, or, when the author gave it an icon, the icon
 * in a ring of the dot's colour on the page, so the axis still reads as one
 * line of nodes.
 */
function MilestoneNode({ m, cx, cy, baseR, ctx }: { m: Milestone; cx: number; cy: number; baseR: number; ctx: ComponentCtx }) {
  const ground = ctx.defaultBg ?? ctx.colors.bg
  const dot = milestoneDot(m, baseR, ctx.colors, ground)
  if (!m.icon) return <circle cx={cx} cy={cy} r={dot.r} fill={dot.fill} />
  const ink = graphicInk(dot.fill, ground)
  return (
    <g data-milestone-icon={m.icon}>
      <circle cx={cx} cy={cy} r={ICON_NODE.r} fill={ground} stroke={ink} strokeWidth={m.highlight ? 2 : 1.5} />
      <Icon name={m.icon} x={cx - ICON_NODE.size / 2} y={cy - ICON_NODE.size / 2} size={ICON_NODE.size} color={ink} />
    </g>
  )
}

function inkWithTextFallback(
  preferredFill: string,
  textFill: string,
  bgHex: string,
  fontSizePx: number,
): string {
  return contrastRatio(preferredFill, bgHex) >= requiredContrastRatio(fontSizePx)
    ? preferredFill
    : accessibleInk(textFill, bgHex, fontSizePx)
}

/**
 * Per-milestone label 布局（度量与渲染共用）。首/尾节点贴 box 边缘，居中
 * 排布会把宽度压到 2×PAD≈40px（2026-07-09 真机实测首尾 label 竖条化）——
 * 改为首节点左对齐、尾节点右对齐，宽度按邻距算。
 */
function labelPlacement(
  i: number,
  x: number,
  n: number,
  w: number,
  step: number,
): { maxWidth: number; anchor: Anchor; tx: number } {
  const distToNeighbor = n > 1 ? step - LABEL_GAP : w - 2 * PAD
  if (n > 1 && i === 0) {
    return { maxWidth: Math.max(1, Math.min(distToNeighbor, w - x - PAD)), anchor: "start", tx: x - 8 }
  }
  if (n > 1 && i === n - 1) {
    return { maxWidth: Math.max(1, Math.min(distToNeighbor, x - PAD)), anchor: "end", tx: x + 8 }
  }
  const distToBoxEdge = 2 * Math.min(x, w - x)
  return { maxWidth: Math.max(1, Math.min(distToBoxEdge, distToNeighbor)), anchor: "middle", tx: x }
}

/**
 * title 2 行 / desc 3 行换行排布（2026-07-09 用户反馈：版面宽却单行截断
 * 加省略号——所有主题共用本块，一处修复全主题生效）。
 */
/** How many lines a milestone's title and description may take. */
interface LineCaps {
  title: number
  desc: number
}
const FULL_CAPS: LineCaps = { title: 2, desc: 3 }

function milestoneLayout(component: TimelineComponent, w: number, fontFamily: string, caps: LineCaps = FULL_CAPS) {
  const n = component.milestones.length
  const span = w - 2 * PAD
  const step = n > 1 ? span / (n - 1) : 0
  const lay = (m: TimelineComponent["milestones"][number], i: number, x: number, maxWidth: number, anchor: Anchor, tx: number) => {
    const title = layoutSvgText(m.title, {
      maxWidth,
      fontSize: TITLE_SIZE,
      maxLines: caps.title,
      lineHeightRatio: 1.25,
    })
    const desc = m.desc
      ? layoutSvgText(m.desc, {
          maxWidth,
          fontSize: DESC_SIZE,
          maxLines: caps.desc,
          lineHeightRatio: 1.3,
        })
      : null
    const titleH = title.lines.length * title.lineHeight
    const descH = desc ? desc.lines.length * desc.lineHeight + 6 : 0
    // The ink the label actually spans, not the room it was offered.
    const inkW = Math.max(
      0,
      ...title.lines.map((line) => measureTextUnits(line, { bold: true, fontFamily }) * title.fontSize),
      ...(desc?.lines ?? []).map((line) => measureTextUnits(line, { fontFamily }) * desc!.fontSize),
    )
    const left = anchor === "start" ? tx : anchor === "end" ? tx - inkW : tx - inkW / 2
    return { m, i, x, maxWidth, anchor, tx, title, desc, belowH: 28 + titleH + descH, left, right: left + inkW }
  }
  const rows = component.milestones.map((m, i) => {
    const x = n === 1 ? w / 2 : PAD + i * step
    const { maxWidth, anchor, tx } = labelPlacement(i, x, n, w, step)
    return lay(m, i, x, maxWidth, anchor, tx)
  })
  // An end label is offered a whole step, and its centred neighbour half a
  // step on either side, so the two offers overlap by half a step. Where the
  // words actually meet there, the end label wraps short of its neighbour's
  // first glyph instead of running under it.
  if (n > 1) {
    const first = rows[0]!
    const next = rows[1]!
    if (first.right > next.left - LABEL_GAP) {
      rows[0] = lay(first.m, 0, first.x, Math.max(1, next.left - LABEL_GAP - first.tx), first.anchor, first.tx)
    }
    const last = rows[n - 1]!
    const prev = rows[n - 2]!
    if (last.left < prev.right + LABEL_GAP) {
      rows[n - 1] = lay(last.m, n - 1, last.x, Math.max(1, last.tx - prev.right - LABEL_GAP), last.anchor, last.tx)
    }
  }
  return rows
}

// ── 竖排版式（2026-07-11 用户借鉴编辑部竖排时间线）：左 date 右对齐、
// 中轴竖线圆点、右 title/desc，highlight 节点 accent 色 + 大圆点。──
const V_DATE_COL_W = 118
const V_AXIS_GAP = 26
const V_AXIS_X = V_DATE_COL_W + V_AXIS_GAP
const V_TEXT_GAP = 30
const V_TEXT_X = V_AXIS_X + V_TEXT_GAP
const V_TITLE_SIZE = 18
const V_DESC_SIZE = 14
const V_ROW_GAP = 26
const V_TOP_PAD = 8

function verticalLayout(component: TimelineComponent, w: number) {
  const textW = Math.max(1, w - V_TEXT_X)
  return component.milestones.map((m) => {
    const title = fitSvgLine(m.title, {
      maxWidth: textW,
      fontSize: V_TITLE_SIZE,
      minFontSize: 16,
    })
    const desc = m.desc
      ? layoutSvgText(m.desc, {
          maxWidth: textW,
          fontSize: V_DESC_SIZE,
          maxLines: 2,
          lineHeightRatio: 1.35,
        })
      : null
    const rowH =
      Math.round(V_TITLE_SIZE * 1.3) +
      (desc ? desc.lines.length * desc.lineHeight + 4 : 0)
    return { m, title, desc, rowH }
  })
}

/**
 * How many leading rows of `rows` fit within `truncBudget` px (group-
 * relative, same space `rowTops[i] + rows[i].rowH` is measured in), with no
 * headroom held back: a row that fits is drawn. This comment used to claim
 * ~20px was reserved for the overflow line the component painted. That line is
 * gone (`render/drop-marker.tsx`) and the reservation was never in the loop
 * below to begin with. At least 1 row, matching row-cards.tsx's "never
 * render zero visible units" precedent.
 */
function visibleVerticalRowCount(
  rowTops: number[],
  rows: ReadonlyArray<{ rowH: number }>,
  truncBudget: number,
): number {
  if (truncBudget === Number.POSITIVE_INFINITY) return rows.length
  let visible = 0
  for (let i = 0; i < rows.length; i++) {
    if (rowTops[i] + rows[i].rowH > truncBudget) break
    visible = i + 1
  }
  return visible
}

/** A timeline given a box it cannot draw even its first milestone in. */
function declined(box: ComponentBox): React.ReactElement {
  return (
    <g transform={`translate(${box.x},${box.y})`}>
      <DroppedContentMarker count={1} kind="component" />
    </g>
  )
}

function renderVertical(
  component: TimelineComponent,
  box: ComponentBox,
  ctx: ComponentCtx,
): React.ReactElement {
  const allRows = verticalLayout(component, box.w)
  const allRowTops: number[] = []
  let cursor = V_TOP_PAD
  for (const r of allRows) {
    allRowTops.push(cursor)
    cursor += r.rowH + V_ROW_GAP
  }
  // Vertical graceful landing (P0 hardening, robustness deep-review D1,
  // family-sweep sibling of bullets.tsx): `milestones` has no schema
  // ceiling, and this layout mode stacks one row per milestone with no cap
  // of its own. `box.h` is only ever set on this non-stretchable component
  // by `layoutContentFit`'s overflow-defense branch (`layout.ts`), so its
  // presence always means "cap to this budget" (row-cards.tsx's own
  // precedent for the convention below).
  const truncBudget = box.h ?? Number.POSITIVE_INFINITY
  const visibleCount = visibleVerticalRowCount(allRowTops, allRows, truncBudget)
  // Not even the first milestone fits: the timeline declines the box rather
  // than drawing that one below it.
  if (visibleCount === 0 && allRows.length > 0) return declined(box)
  const hiddenCount = allRows.length - visibleCount
  const rows = allRows.slice(0, visibleCount)
  const rowTops = allRowTops.slice(0, visibleCount)
  const axisTop = rowTops[0] + 8
  const axisBottom = rowTops[rowTops.length - 1] + 8
  return (
    <g transform={`translate(${box.x},${box.y})`}>
      {rows.length > 1 && (
        <line
          x1={V_AXIS_X}
          y1={axisTop}
          x2={V_AXIS_X}
          y2={axisBottom}
          stroke={ctx.colors.border ?? ctx.colors.muted}
          strokeWidth={2}
        />
      )}
      {rows.map(({ m, title, desc }, i) => {
        const top = rowTops[i]
        const nodeCy = top + 8
        const hl = Boolean(m.highlight)
        const pageBg = ctx.defaultBg ?? ctx.colors.bg
        const date = fitSvgLine(m.date, {
          maxWidth: V_DATE_COL_W,
          fontSize: 20,
          minFontSize: MIN_FONT_SIZE,
        })
        const titleInk = accessibleInk(ctx.colors.text, pageBg, title.fontSize)
        const dateInk = hl
          ? titleInk
          : inkWithTextFallback(ctx.colors.muted, ctx.colors.text, pageBg, date.fontSize)
        return (
          <g key={i}>
            <text
              data-truncated={date.truncated ? "1" : undefined}
              x={V_DATE_COL_W}
              y={nodeCy + 7}
              textAnchor="end"
              fontSize={date.fontSize}
              fontWeight="bold"
              fill={dateInk}
              fontFamily={ctx.fonts.heading}
              dominantBaseline="alphabetic"
            >
              {date.text}
            </text>
            {/* 高亮只落在圆点。日期与标题统一从 muted/text 推导，避免
                身份色与正文墨在同一高亮项里混用。 */}
            <MilestoneNode m={m} cx={V_AXIS_X} cy={nodeCy} baseR={7} ctx={ctx} />
            <text
              data-truncated={title.truncated ? "1" : undefined}
              x={V_TEXT_X}
              y={nodeCy + 7}
              fontSize={title.fontSize}
              fontWeight="bold"
              fill={titleInk}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {title.text}
            </text>
            {desc
              ? desc.lines.map((line, li) => (
                  <text
                    key={li}
                    x={V_TEXT_X}
                    y={nodeCy + 7 + Math.round(V_TITLE_SIZE * 1.3) + li * desc.lineHeight}
                    fontSize={desc.fontSize}
                    fill={ctx.colors.muted}
                    fontFamily={ctx.fonts.body}
                    dominantBaseline="alphabetic"
                  >
                    {line}
                  </text>
                ))
              : null}
          </g>
        )
      })}
      {hiddenCount > 0 && <g data-dropped={hiddenCount} data-dropped-kind="event" />}
    </g>
  )
}

function measureDefault(component: TimelineComponent, w: number, fontFamily: string): number {
  if (component.layout === "vertical") {
    const rows = verticalLayout(component, w)
    const total = rows.reduce((sum, r) => sum + r.rowH + V_ROW_GAP, V_TOP_PAD)
    return total - V_ROW_GAP + BOTTOM_PAD
  }
  const rows = milestoneLayout(component, w, fontFamily)
  const maxBelow = rows.reduce((mx, r) => Math.max(mx, r.belowH), 48)
  return AXIS_Y + maxBelow + BOTTOM_PAD
}

export const timeline: SvgComponent<TimelineComponent> = {
  measure(component, w, ctx) {
    return measureDefault(component, w, ctx.fonts.body)
  },
  render(component, box, ctx) {
    if (component.layout === "vertical") return renderVertical(component, box, ctx)
    // Side by side, every milestone hangs its words under one axis, so a box
    // shorter than the tallest of them gives lines back from the bottom:
    // description lines first, then a title's second line, each cut marked.
    // With one line of each still too tall, the timeline declines the box.
    const depth = (r: ReturnType<typeof milestoneLayout>) =>
      AXIS_Y + r.reduce((mx, row) => Math.max(mx, row.belowH), 48)
    let rows = milestoneLayout(component, box.w, ctx.fonts.body)
    if (box.h !== undefined && box.h > 0 && depth(rows) + BOTTOM_PAD > box.h) {
      const ladder: LineCaps[] = [
        { title: 2, desc: 2 },
        { title: 2, desc: 1 },
        { title: 1, desc: 1 },
      ]
      for (const caps of ladder) {
        if (depth(rows) <= box.h) break
        rows = milestoneLayout(component, box.w, ctx.fonts.body, caps)
      }
      if (depth(rows) > box.h) return declined(box)
    }
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <line
          x1={PAD}
          y1={AXIS_Y}
          x2={box.w - PAD}
          y2={AXIS_Y}
          stroke={ctx.colors.border ?? ctx.colors.muted}
          strokeWidth={2}
        />
        {rows.map(({ m, x, maxWidth, anchor, tx, title, desc }, i) => {
          // A milestone on a lane names it with its date: one row has no
          // second side of the axis for the lane to run on.
          const date = fitSvgLine(m.lane?.trim() ? `${m.lane.trim()} · ${m.date}` : m.date, {
            maxWidth,
            fontSize: 16,
            minFontSize: MIN_FONT_SIZE,
          })
          const descTop = TITLE_TOP + title.lines.length * title.lineHeight + 2
          return (
            <g key={i}>
              <MilestoneNode m={m} cx={x} cy={AXIS_Y} baseR={8} ctx={ctx} />
              <text
                data-truncated={date.truncated ? "1" : undefined}
                x={tx}
                y={AXIS_Y - 24}
                textAnchor={anchor}
                fill={inkWithTextFallback(
                  ctx.colors.muted,
                  ctx.colors.text,
                  ctx.defaultBg ?? ctx.colors.bg,
                  date.fontSize,
                )}
                fontSize={date.fontSize}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {date.text}
              </text>
              {title.lines.map((line, li) => (
                <text
                  key={li}
                  data-truncated={title.truncated && li === title.lines.length - 1 ? "1" : undefined}
                  x={tx}
                  y={TITLE_TOP + li * title.lineHeight}
                  textAnchor={anchor}
                  fill={ctx.colors.text}
                  fontSize={title.fontSize}
                  fontWeight="bold"
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>
              ))}
              {desc
                ? desc.lines.map((line, li) => (
                    <text
                      key={li}
                      data-truncated={desc.truncated && li === desc.lines.length - 1 ? "1" : undefined}
                      x={tx}
                      y={descTop + li * desc.lineHeight}
                      textAnchor={anchor}
                      fill={ctx.colors.muted}
                      fontSize={desc.fontSize}
                      fontFamily={ctx.fonts.body}
                      dominantBaseline="alphabetic"
                    >
                      {line}
                    </text>
                  ))
                : null}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<TimelineComponent> = withBlockTitle({ type: "timeline", measure: timeline.measure, render: timeline.render })
