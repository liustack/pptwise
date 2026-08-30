import type React from "react"
import type { Component } from "@/ir"
import { Icon } from "../../render/icons"
import type { FormKnobs } from "../form-assignments"
import type { ComponentBox, ComponentCtx } from "../types"
import {
  boardTypeScale,
  capFormBody,
  formGridCols,
  formLineHeight,
  formTextClipMarker,
  formTextOmissionMarker,
  layoutFormBody,
  layoutFormTitle,
  linesThatFit,
} from "./legibility"

type IconCardsComponent = Extract<Component, { type: "icon_cards" }>
type IconCardItem = IconCardsComponent["items"][number]

const GAP = 16
/**
 * Inner pad. 24px keeps a line of air above the icon and below the last
 * body line. 18px read as flush once a wide cell upscaled type to the
 * shell (academic p03).
 */
const PAD = 24
const TEXT_LINE_HEIGHT_RATIO = 1.4
const GAP_ICON_TITLE = 14
const GAP_TITLE_TEXT = 10
const ICON_SIZE = 32
/**
 * Card body vs card title. 0.55 is one typographic step: the title stays
 * the item name, the body stays supporting copy. The shared 0.6 form cap
 * still read as the same size on academic p03 after width upscale
 * (41 / 24.6). Title caps at 28 so 0.55×title (15.4) sits on the existing
 * 15px body floor without moving that global constant.
 */
const CARD_BODY_TITLE_RATIO = 0.55
const CARD_TITLE_MAX = 28

function layoutItemText(
  item: IconCardItem,
  contentW: number,
  ctx: ComponentCtx,
  titleSize: number,
  bodySize: number,
  titleMaxLines: number,
  bodyMaxLines: number,
) {
  const title = layoutFormTitle(item.title, {
    maxWidth: contentW,
    fontSize: titleSize,
    fontFamily: ctx.fonts.heading,
    maxLines: Math.max(1, titleMaxLines),
  })
  const text =
    bodyMaxLines > 0
      ? layoutFormBody(item.text, {
          maxWidth: contentW,
          fontSize: bodySize,
          titleSize,
          maxLines: bodyMaxLines,
          lineHeightRatio: TEXT_LINE_HEIGHT_RATIO,
          fontFamily: ctx.fonts.body,
        })
      : { lines: [] as string[], fontSize: bodySize, lineHeight: 0, truncated: false }
  return { title, text }
}

function shellRadius(knobs: FormKnobs, ctx: ComponentCtx): number {
  if (knobs.radius === "square") return 0
  if (knobs.radius === "round") return ctx.shape?.radius ?? 16
  if (knobs.radius === "soft") return ctx.shape?.radius ?? 8
  return 0
}

function cellFill(knobs: FormKnobs, ctx: ComponentCtx): string {
  return knobs.nodeFill === "surface" ? ctx.colors.surface : "none"
}

function cellStrokeWidth(knobs: FormKnobs): number {
  return knobs.paletteStroke ? 2.5 : 1
}

function cellStroke(knobs: FormKnobs, ctx: ComponentCtx, index: number): string {
  if (knobs.paletteStroke) {
    const palette = ctx.colors.chartPalette
    if (palette.length > 0) return palette[index % palette.length]!
  }
  if (knobs.nodeStroke === "primary") return ctx.colors.primary
  if (knobs.nodeStroke === "border") return ctx.colors.border ?? ctx.colors.muted
  return ctx.colors.border ?? ctx.colors.primary
}

function iconInk(knobs: FormKnobs, ctx: ComponentCtx): string {
  if (knobs.iconInk === "accent") return ctx.colors.accent
  if (knobs.iconInk === "text") return ctx.colors.text
  return ctx.colors.primary
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

function blockHeight(layout: ReturnType<typeof layoutItemText>): number {
  return (
    ICON_SIZE +
    GAP_ICON_TITLE +
    layout.title.lines.length * layout.title.lineHeight +
    GAP_TITLE_TEXT +
    layout.text.lines.length * layout.text.lineHeight
  )
}

function geometry(
  component: IconCardsComponent,
  w: number,
  ctx: ComponentCtx,
  boxH?: number,
) {
  const n = component.items.length
  const cols = formGridCols(n)
  const rows = Math.ceil(n / cols)
  const cellW = (w - GAP * (cols - 1)) / cols
  const contentW = Math.max(24, cellW - PAD * 2)
  const start = boardTypeScale(cellW)
  const titleSize = Math.min(start.title, CARD_TITLE_MAX)
  const bodySize = capFormBody(titleSize, titleSize * CARD_BODY_TITLE_RATIO)
  const extraAbove = ICON_SIZE + GAP_ICON_TITLE
  const naturalInner =
    extraAbove +
    formLineHeight(titleSize) +
    GAP_TITLE_TEXT +
    2 * formLineHeight(bodySize)
  const naturalCellH = PAD * 2 + naturalInner
  const naturalMeasured = rows * naturalCellH + (rows - 1) * GAP
  const cellH =
    boxH === undefined
      ? naturalCellH
      : Math.max(1, (boxH - GAP * (rows - 1)) / rows)
  const innerH = Math.max(1, cellH - PAD * 2)
  const fit = linesThatFit({
    innerH,
    titleSize,
    bodySize,
    gap: GAP_TITLE_TEXT,
    extraAbove,
    titleMax: 2,
    bodyMax: 4,
  })
  const layouts = component.items.map((item) =>
    layoutItemText(
      item,
      contentW,
      ctx,
      titleSize,
      bodySize,
      fit.titleMaxLines,
      fit.bodyMaxLines,
    ),
  )
  const measuredH = boxH === undefined ? naturalMeasured : Math.min(boxH, rows * cellH + (rows - 1) * GAP)
  return {
    cols,
    rows,
    cellW,
    contentW,
    layouts,
    cellH,
    measuredH,
  }
}

export function measureOutlineGrid(
  component: IconCardsComponent,
  w: number,
  ctx: ComponentCtx,
  _knobs: FormKnobs,
): number {
  return geometry(component, w, ctx).measuredH
}

export function renderOutlineGrid(
  component: IconCardsComponent,
  box: ComponentBox,
  ctx: ComponentCtx,
  knobs: FormKnobs,
): React.ReactElement {
  const g = geometry(component, box.w, ctx, box.h)
  const rx = shellRadius(knobs, ctx)
  const fill = cellFill(knobs, ctx)
  const sw = cellStrokeWidth(knobs)
  const ink = iconInk(knobs, ctx)
  const rowPitch = g.cellH + GAP

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      {component.items.map((item, i) => {
        const col = i % g.cols
        const row = Math.floor(i / g.cols)
        const cellX = col * (g.cellW + GAP)
        const cellY = row * rowPitch
        const cx = cellX + g.cellW / 2
        const layout = g.layouts[i]!
        const blockH = blockHeight(layout)
        const blockTop = cellY + (g.cellH - blockH) / 2
        const titleTop = blockTop + ICON_SIZE + GAP_ICON_TITLE
        const textTop =
          titleTop + layout.title.lines.length * layout.title.lineHeight + GAP_TITLE_TEXT
        return (
          <g
            key={i}
            data-truncated={formTextOmissionMarker(item.text, layout.text)}
            data-audit-box={`${box.x + cellX},${box.y + cellY},${g.cellW}`}
          >
            <rect
              x={cellX + sw / 2}
              y={cellY + sw / 2}
              width={g.cellW - sw}
              height={g.cellH - sw}
              rx={rx}
              fill={fill}
              stroke={cellStroke(knobs, ctx, i)}
              strokeWidth={sw}
            />
            {renderGlyph(
              item.icon,
              cx - ICON_SIZE / 2,
              blockTop,
              ICON_SIZE,
              ink,
            )}
            {layout.title.lines.map((line, li) => (
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
              </text>
            ))}
            {layout.text.lines.map((line, li) => (
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
              </text>
            ))}
          </g>
        )
      })}
    </g>
  )
}
