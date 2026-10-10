import { markedLineSegments, paintMarkedLine, stripEmphasis } from "../render/emphasis"
import type React from "react"
import type { Component } from "@/ir"
import { Icon } from "../render/icons"
import { DroppedContentMarker } from "../render/drop-marker"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"
import { ordinaryTagSpec, paintTag, tagInks, tagWidth } from "./tag"
import { withBlockTitle } from "./block-title"
import { OmittedText } from "./omitted-text"
import { graphicInk, resolveSemanticColor } from "../render/ink"
import {
  boardTypeScale,
  fillCardType,
  formIconColumnCols,
  formLineHeight,
  formTextClipMarker,
  formTextOmission,
  layoutFormBody,
  layoutFormTitle,
  linesThatFit,
} from "./legibility"

type IconCardsComponent = Extract<Component, { type: "icon_cards" }>
type IconCardItem = IconCardsComponent["items"][number]

const GAP = 16
const TITLE_LINE_HEIGHT_RATIO = 1.4
const TEXT_LINE_HEIGHT_RATIO = 1.4
const GAP_NODE_TITLE = 18
const GAP_TITLE_TEXT = 10
const COL_INSET = 16
/** The row a card's tag (`items[].tag`) takes under its node: the ordinary tag's 28px label and 10px of air. */
const TAG_ROW = 38

function layoutItemText(
  item: IconCardItem,
  contentW: number,
  ctx: ComponentCtx,
  titleSize: number,
  bodySize: number,
  titleMaxLines: number,
  bodyMaxLines: number,
) {
  const title = layoutFormTitle(stripEmphasis(item.title), {
    maxWidth: contentW,
    fontSize: titleSize,
    fontFamily: ctx.fonts.heading,
    maxLines: Math.max(1, titleMaxLines),
  })
  const text =
    bodyMaxLines > 0
      ? layoutFormBody(stripEmphasis(item.text), {
          maxWidth: contentW,
          fontSize: bodySize,
          titleSize,
          maxLines: bodyMaxLines,
          lineHeightRatio: TEXT_LINE_HEIGHT_RATIO,
          fontFamily: ctx.fonts.body,
        })
      : // No line left for a text the card has is the whole text cut, and
        // says so: `geometry` reads `truncated` to decide whether the node
        // should give up height first.
        { lines: [] as string[], fontSize: bodySize, lineHeight: 0, truncated: item.text.trim().length > 0 }
  return { title, text }
}

const NODE_R_MIN = 28

function nodeRadius(colW: number): number {
  return Math.round(Math.min(44, Math.max(NODE_R_MIN, colW * 0.16)))
}

function stackHeight(layout: ReturnType<typeof layoutItemText>, nodeSize: number, tagRow = 0): number {
  return (
    nodeSize +
    GAP_NODE_TITLE +
    tagRow +
    layout.title.lines.length * layout.title.lineHeight +
    GAP_TITLE_TEXT +
    layout.text.lines.length * layout.text.lineHeight
  )
}

function renderGlyph(
  name: string,
  x: number,
  y: number,
  size: number,
  color: string,
): React.ReactElement {
  if (!name) {
    return (
      <circle
        cx={x + size / 2}
        cy={y + size / 2}
        r={Math.max(3, size / 6)}
        fill={color}
      />
    )
  }
  return <Icon name={name} x={x} y={y} size={size} color={color} />
}

function geometry(
  component: IconCardsComponent,
  w: number,
  ctx: ComponentCtx,
  boxH?: number,
) {
  const n = component.items.length
  const cols = formIconColumnCols(n, w, COL_INSET)
  const rows = Math.ceil(n / cols)
  const colW = w / cols
  const settled = columnsAt(component, w, ctx, cols, rows, colW, nodeRadius(colW), boxH)
  // The icon is the one thing in a column that is not content. When the box
  // is too short for every title and text at the node's natural size, the
  // node gives up height first, as far as its own floor, before a word goes.
  const cut = (layouts: typeof settled.layouts) => layouts.some((l) => l.title.truncated || l.text.truncated)
  // A column always keeps its icon and a line of title, so a short enough
  // row can be overrun by the stack even with no word cut.
  const tooTall = (res: typeof settled) => res.layouts.some((l) => stackHeight(l, res.nodeSize, res.tagRow) > res.rowH + 1)
  // A cut text keeps its opening and marks the cut. A text with no line
  // left keeps nothing of itself: a tag row under the node can take the
  // height a row of cards had for it.
  const textless = (res: typeof settled) =>
    res.layouts.some((l, i) => l.text.lines.length === 0 && component.items[i]!.text.trim().length > 0)
  if (boxH !== undefined && (cut(settled.layouts) || tooTall(settled))) {
    let shortest: typeof settled | undefined
    for (let r = settled.nodeR - 1; r >= NODE_R_MIN; r--) {
      const smaller = columnsAt(component, w, ctx, cols, rows, colW, r, boxH)
      if (!cut(smaller.layouts) && !tooTall(smaller)) return { ...smaller, declined: false }
      if (!shortest && !tooTall(smaller) && !textless(smaller)) shortest = smaller
    }
    if (!tooTall(settled) && !textless(settled)) return { ...settled, declined: false }
    // Even the smallest icon leaves a column taller than its row, or a card
    // with not one line of its text: the cards decline the box rather than
    // drawing above and below it, or drawing a title over a missing text.
    return shortest ? { ...shortest, declined: false } : { ...settled, declined: true }
  }
  return { ...settled, declined: false }
}

function columnsAt(
  component: IconCardsComponent,
  w: number,
  ctx: ComponentCtx,
  cols: number,
  rows: number,
  colW: number,
  nodeR: number,
  boxH?: number,
) {
  const nodeSize = nodeR * 2
  const contentW = Math.max(24, colW - COL_INSET)
  // Every card keeps the tag row when any card has a tag, so the titles in a
  // row stay level.
  const tagRow = component.items.some((item) => item.tag) ? TAG_ROW : 0
  const slotH = boxH != null ? Math.max(1, (boxH - GAP * (rows - 1)) / rows) : undefined
  const start = boardTypeScale(colW, slotH)
  const extraAbove = nodeSize + GAP_NODE_TITLE + tagRow
  const naturalInner =
    extraAbove +
    formLineHeight(start.title) +
    GAP_TITLE_TEXT +
    2 * formLineHeight(start.body)
  const naturalMeasured = rows * naturalInner + (rows - 1) * GAP
  const rowH =
    boxH === undefined
      ? naturalInner
      : Math.max(1, (boxH - GAP * (rows - 1)) / rows)
  const innerH = Math.max(1, rowH)
  const filled = fillCardType({
    innerH: Math.max(1, innerH - extraAbove),
    contentW,
    titleSize: start.title,
    bodySize: start.body,
    gap: GAP_TITLE_TEXT,
    longestBody: component.items.map((it) => it.text).sort((a, b) => b.length - a.length)[0],
    titles: component.items.map((it) => it.title),
    fonts: { heading: ctx.fonts.heading, body: ctx.fonts.body },
    titleLhRatio: TITLE_LINE_HEIGHT_RATIO,
    bodyLhRatio: TEXT_LINE_HEIGHT_RATIO,
  })
  const fit = linesThatFit({
    innerH,
    titleSize: filled.titleSize,
    bodySize: filled.bodySize,
    gap: GAP_TITLE_TEXT,
    extraAbove,
    // As many title lines as the titles take at the size just chosen, the
    // count that size was chosen against, so the body keeps the rest.
    titleMax: filled.titleMaxLines,
    bodyMax: Math.max(2, filled.bodyMaxLines),
  })
  const layouts = component.items.map((item) =>
    layoutItemText(
      item,
      contentW,
      ctx,
      filled.titleSize,
      filled.bodySize,
      fit.titleMaxLines,
      fit.bodyMaxLines,
    ),
  )
  const measuredH = boxH === undefined ? naturalMeasured : Math.min(boxH, rows * rowH + (rows - 1) * GAP)
  return { cols, rows, colW, nodeR, nodeSize, contentW, layouts, rowH, measuredH, tagRow }
}

function measureIconColumns(component: IconCardsComponent, w: number, ctx: ComponentCtx): number {
  return geometry(component, w, ctx).measuredH
}

export const iconCards: SvgComponent<IconCardsComponent> = {
  measure: measureIconColumns,

  render(component, box, ctx): React.ReactElement {
  const g = geometry(component, box.w, ctx, box.h)
  if (g.declined) {
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <DroppedContentMarker count={1} kind="component" />
      </g>
    )
  }
  const fill = ctx.colors.surface
  const ink = ctx.colors.accent
  const iconSize = Math.round(g.nodeR * 0.85)
  const strokeProps = { stroke: ctx.colors.border ?? ctx.colors.muted, strokeWidth: 1 }
  // One top per row: the row's tallest stack is centred in the row, and
  // every column in it starts where that one does. Centring each column on
  // its own height put a short body's icon below its longer neighbour's,
  // so icons and titles stepped across the row.
  const rowStackH = Array.from({ length: g.rows }, (_, row) =>
    Math.max(...g.layouts.slice(row * g.cols, (row + 1) * g.cols).map((l) => stackHeight(l, g.nodeSize, g.tagRow))),
  )

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      {component.items.map((item, i) => {
        const col = i % g.cols
        const row = Math.floor(i / g.cols)
        const cx = col * g.colW + g.colW / 2
        const rowY = row * (g.rowH + GAP)
        const layout = g.layouts[i]!
        const stackTop = rowY + (g.rowH - rowStackH[row]!) / 2
        const cy = stackTop + g.nodeR
        const titleTop = stackTop + g.nodeSize + GAP_NODE_TITLE + g.tagRow
        const textTop =
          titleTop + layout.title.lines.length * layout.title.lineHeight + GAP_TITLE_TEXT
        return (
          <g key={i} data-audit-box={`${col * g.colW},${rowY},${g.colW}`}>
            <OmittedText text={formTextOmission(item.text, layout.text)} />
            <circle cx={cx} cy={cy} r={g.nodeR} fill={fill} {...strokeProps} />
            {renderGlyph(
              item.icon,
              cx - iconSize / 2,
              cy - iconSize / 2,
              iconSize,
              // A card that says what kind of news it is draws its icon in the theme's ink for it.
              item.tone ? graphicInk(resolveSemanticColor(item.tone, ctx.colors), fill) : ink,
            )}
            {item.tag ? paintCardTag(item.tag, cx, stackTop + g.nodeSize + GAP_NODE_TITLE, g.contentW, ctx) : null}
            {layout.title.lines.map((line, li) =>
              paintMarkedLine(
                ctx,
                markedLineSegments(item.title, layout.title.lines)[li]!,
                { baseFill: ctx.colors.text, fontWeight: "700", fontFamily: ctx.fonts.heading, bg: fill },
                <text
                  key={`t-${li}`}
                  data-truncated={formTextClipMarker(layout.title, li)}
                  x={cx}
                  y={titleTop + li * layout.title.lineHeight + layout.title.fontSize}
                  textAnchor="middle"
                  fontSize={layout.title.fontSize}
                  fontWeight="700"
                  fill={ctx.colors.text}
                  fontFamily={ctx.fonts.heading}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>,
              ),
            )}
            {layout.text.lines.map((line, li) =>
              paintMarkedLine(
                ctx,
                markedLineSegments(item.text, layout.text.lines)[li]!,
                { baseFill: ctx.colors.muted, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false, bg: fill },
                <text
                  key={li}
                  data-truncated={formTextClipMarker(layout.text, li)}
                  x={cx}
                  y={textTop + li * layout.text.lineHeight + layout.text.fontSize}
                  textAnchor="middle"
                  fontSize={layout.text.fontSize}
                  fill={ctx.colors.muted}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {line}
                </text>,
              ),
            )}
          </g>
        )
      })}
    </g>
  )
  },
}

/**
 * A card's tag, centred in its row under the node, at the ordinary size and
 * in the ordinary inks. A tag wider than the card is declared dropped rather
 * than cut.
 */
function paintCardTag(tag: NonNullable<IconCardItem["tag"]>, cx: number, top: number, contentW: number, ctx: ComponentCtx): React.ReactElement {
  const spec = ordinaryTagSpec(ctx)
  const w = tagWidth(tag.text, spec)
  if (w > contentW) return <g data-dropped={1} data-dropped-kind="label" />
  return paintTag({ tag, x: cx - w / 2, y: top, spec, inks: tagInks(ctx, tag, false, ctx.defaultBg ?? ctx.colors.bg, spec.size) })
}

// A title, when the cards carry one, is set over them as on a table.
export const renderDef: RenderDef<IconCardsComponent> = withBlockTitle({
  type: "icon_cards",
  measure: iconCards.measure,
  render: iconCards.render,
})
