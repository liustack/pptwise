import type React from "react"
import type { Component, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import { kpiValueText } from "../components/kpi"
import type { findImageSelection } from "./find-image"
import { measureTextUnits } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { SvgContent } from "../render/svg-content"
import { bodySlotDropsContent } from "../render/step-aside"
import { panelFigureItem, panelInks, serifBaseline } from "./compositions/panel"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"
import { PanelHead, PanelSource, fitPanelSource, type PanelSourceLayout } from "./panel-shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

/*
 * The panel column of `image-split`: ledger's 2026-10 photo page (p12). The
 * photograph takes the left 600px under the status bar, edge to edge down
 * to the foot. Beside it the claim in the heading face at 30/42, set on its
 * last line at y136, and under it the figures the photograph is about as a
 * ledger: one `kpi_cards` item a row, 116px apart over a hairline, its label
 * at 14px, the figure at 40px in the heading face and its note to the right
 * at 15px. The figure the author marked (`**…**`) takes the mark (ledger's
 * amber). Anything else the column carries is drawn by the component
 * renderer, and the source sits at the foot of the column in the frame's
 * 13px. A caption the author gave the photograph sits right above the
 * source in the same 13px, so the photograph itself stays clean.
 */

const COLUMN = {
  imageW: 600,
  /** The status bar's height: the photograph starts under it. */
  imageTop: 32,
  textX: 640,
  right: 64,
  /** The claim's last line ends at y136, at 30/42. */
  headFoot: 136,
  headSize: 30,
  /** The first row's hairline. */
  rowsTop: 156,
  pitch: 116,
  label: { top: 16, box: 20, size: 14 },
  value: { top: 40, box: 48, size: 40 },
  /** The note stands right of the figure, 300px into the row. */
  note: { x: 300, top: 48, size: 15, lineHeight: 20, maxLines: 2 },
  foot: 640,
  /** Air added to the line pitch between the caption's last line and the source under it. */
  captionGap: 8,
} as const
const W = CANVAS_W_PX
const H = CANVAS_H_PX

function figureRows(
  kpis: KpiCards,
  x: number,
  w: number,
  ctx: ComponentCtx,
  bottom: number,
): React.ReactElement | null {
  const n = kpis.items.length
  if (n < 2 || n > 5 || !kpis.items.every(panelFigureItem)) return null
  const pitch = Math.min(COLUMN.pitch, (bottom - COLUMN.rowsTop) / n)
  if (pitch < 92) return null
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const inks = panelInks(ctx)
  const valueW = COLUMN.note.x - 20
  const nodes: React.ReactNode[] = []
  for (const [i, item] of kpis.items.entries()) {
    const top = COLUMN.rowsTop + i * pitch
    const { text: value, marked } = kpiValueText(item.value)
    if (measureTextUnits(value, { fontFamily: fonts.heading }) * COLUMN.value.size > valueW) return null
    const label = fitFixed(item.label, { width: w, size: COLUMN.label.size, lineHeight: COLUMN.label.box, maxLines: 1, fontFamily: fonts.body, bold: false })
    const caption = [item.unit?.trim(), item.note?.trim()].filter(Boolean).join(ctx.figures?.chinese === false ? ", " : "，")
    const note = caption
      ? fitFixed(caption, { width: w - COLUMN.note.x, size: COLUMN.note.size, lineHeight: COLUMN.note.lineHeight, maxLines: COLUMN.note.maxLines, fontFamily: fonts.body, bold: false })
      : null
    if (!label || (caption && !note)) return null
    nodes.push(
      <g key={i} data-figure-row={i + 1}>
        <rect x={x} y={top} width={w} height={1} fill={inks.edge} />
        {paintLines(label, {
          ctx,
          x,
          y: centredBaseline(top + COLUMN.label.top, COLUMN.label.box, COLUMN.label.size),
          fill: accessibleInk(colors.muted, bg, COLUMN.label.size),
          fontFamily: fonts.body,
          fontWeight: "400",
          attrs: { "data-font-floor-exempt": "panel-spec" },
        })}
        <text
          x={x}
          y={serifBaseline(top + COLUMN.value.top, COLUMN.value.box, COLUMN.value.size)}
          fontFamily={fonts.heading}
          fontSize={COLUMN.value.size}
          fill={accessibleInk(marked ? inks.mark : colors.text, bg, COLUMN.value.size)}
          dominantBaseline="alphabetic"
        >
          {value}
        </text>
        {note &&
          paintLines(note, {
            ctx,
            x: x + COLUMN.note.x,
            y: centredBaseline(top + COLUMN.note.top, COLUMN.note.lineHeight, COLUMN.note.size),
            fill: accessibleInk(colors.muted, bg, COLUMN.note.size),
            fontFamily: fonts.body,
            fontWeight: "400",
            attrs: { "data-font-floor-exempt": "panel-spec" },
          })}
      </g>,
    )
  }
  return <g data-figure-rows="">{nodes}</g>
}

/** The photograph's caption, set like the source and stacked right above it. */
function captionAbove(
  text: string | undefined,
  source: PanelSourceLayout | null,
  ctx: ComponentCtx,
  page: Parameters<typeof fitPanelSource>[2],
  w: number,
): PanelSourceLayout | null {
  const caption = fitPanelSource({ footnote: text }, ctx, page, w)
  if (!caption || !source) return caption
  const lastBaseline = caption.firstBaseline + (caption.layout.lines.length - 1) * caption.layout.lineHeight
  const lift = lastBaseline - (source.firstBaseline - caption.layout.lineHeight - COLUMN.captionGap)
  return { ...caption, firstBaseline: caption.firstBaseline - lift, top: caption.top - lift }
}

/**
 * The panel column, or `null` when the page is not one photograph beside
 * what this column can hold: the caller then draws it as a panel sheet.
 */
export function PanelSplitPage({
  slide,
  ctx,
  page,
  imageSelection,
}: {
  slide: Slide
  ctx: ComponentCtx
  page?: Parameters<typeof fitPanelSource>[2]
  imageSelection: NonNullable<ReturnType<typeof findImageSelection>>
}): React.ReactElement | null {
  const { image, source: imageSource } = imageSelection
  const rightSide = slide.image_side === "right"
  const imgX = rightSide ? W - COLUMN.imageW : 0
  const textX = rightSide ? COLUMN.right : COLUMN.textX
  const textW = rightSide ? W - COLUMN.imageW - (COLUMN.textX - COLUMN.imageW) - COLUMN.right : W - COLUMN.textX - COLUMN.right
  const rest = slide.components.filter((component) => component !== imageSource)
  const source = fitPanelSource(slide, ctx, page, textW)
  const caption = captionAbove(image.caption, source, ctx, page, textW)
  const foot = caption ?? source
  const bottom = foot ? foot.top - 12 : COLUMN.foot
  const kpis = rest.length === 1 && rest[0]!.type === "kpi_cards" ? rest[0]! : null
  let body = kpis ? figureRows(kpis, textX, textW, ctx, bottom) : null
  if (!body && rest.length > 0) {
    const rect = { x: textX, y: COLUMN.rowsTop, w: textW, h: bottom - COLUMN.rowsTop }
    if (bodySlotDropsContent(rest, rect, ctx)) return null
    body = <SvgContent components={rest} rect={rect} ctx={ctx} />
  }
  const src = ctx.images?.[image.asset_id]?.src
  const alt = ctx.images?.[image.asset_id]?.alt
  return (
    <g data-split-column="panel">
      {src ? (
        <image
          href={src}
          x={imgX}
          y={COLUMN.imageTop}
          width={COLUMN.imageW}
          height={H - COLUMN.imageTop}
          preserveAspectRatio="xMidYMid slice"
          aria-label={alt || undefined}
        />
      ) : (
        <rect x={imgX} y={COLUMN.imageTop} width={COLUMN.imageW} height={H - COLUMN.imageTop} fill={ctx.colors.surface} />
      )}
      <PanelHead heading={slide.heading} ctx={ctx} x={textX} maxWidth={textW} foot={COLUMN.headFoot} size={COLUMN.headSize} />
      {body}
      {caption && (
        <g data-image-caption="">
          <PanelSource source={caption} ctx={ctx} x={textX} />
        </g>
      )}
      <PanelSource source={source} ctx={ctx} x={textX} />
    </g>
  )
}
