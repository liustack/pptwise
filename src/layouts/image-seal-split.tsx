import type React from "react"
import type { Component, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { EmphasisHeadingLayout } from "../render/emphasis"
import type { findImageSelection } from "./find-image"
import { kpiValueText } from "../components/kpi"
import { joinUnit } from "../lib/quantity-format"
import { CANVAS_H_PX, CANVAS_W_PX } from "../constants"
import { SvgContent } from "../render/svg-content"
import { bodySlotDropsContent } from "../render/step-aside"
import { plainFigure } from "./compositions/figure"
import { SEAL_TYPE, sealInks, sealSmall, sealText } from "./compositions/seal"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"
import { SealHead, SealSource, fitSealSource, type SealSourceLayout } from "./seal-shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]

/*
 * The seal column of `image-split`: vermilion's 2026-10 photo page (p13).
 * The photograph takes the left 560px edge to edge (the right 560px when the
 * page asks for it there, the column mirrored). Beside it the column opens
 * with the theme's gold double rule, 40px off the photograph to the page's
 * 64px margin (the theme's menu keeps its motif off this page, and the column
 * draws the rule where the board does), the claim bold at 32/44 in the
 * primary colour set on its last line at y146, and a 64 by 2 bar in the
 * accent. Under it the figures the
 * photograph is about, one `kpi_cards` item a row, 128px apart over a
 * hairline: its label at 15px, the figure bold at 42px, the one the author
 * marks (`**…**`) in the mark, and its note at 16px to the right of the
 * figure. Anything else the column carries is drawn by the component
 * renderer, and the source sits at the column's foot in the frame's 14px.
 * A caption the author gave the photograph sits right above the source.
 */

const COLUMN = {
  imageW: 560,
  /** From the photograph to the rule, and from the rule's start to the text. */
  ruleGap: 40,
  textInset: 16,
  margin: 64,
  textW: 544,
  rules: { thick: 26, thin: 32, thickH: 2, thinH: 1 },
  headFoot: 146,
  headSize: 32,
  barY: 160,
  rowsTop: 196,
  pitch: 128,
  label: { size: SEAL_TYPE.label, lineHeight: 22 },
  value: { top: 28, size: 42, box: 52, w: 300 },
  note: { x: 324, top: 44, size: 16, lineHeight: 24, maxLines: 2 },
  ruleDrop: 100,
  sourceTop: 640,
} as const
const W = CANVAS_W_PX
const H = CANVAS_H_PX

interface FigureRow {
  item: KpiItem
  label: EmphasisHeadingLayout
  value: EmphasisHeadingLayout
  marked: boolean
  note: EmphasisHeadingLayout | undefined
}

function figureRows(kpis: KpiCards, x: number, w: number, bottom: number, ctx: ComponentCtx): FigureRow[] | null {
  const n = kpis.items.length
  if (n < 1 || n > 4 || !kpis.items.every(plainFigure)) return null
  if (COLUMN.rowsTop + (n - 1) * COLUMN.pitch + COLUMN.ruleDrop > bottom) return null
  const body = ctx.fonts.body
  const rows: FigureRow[] = []
  for (const item of kpis.items) {
    const { text, marked } = kpiValueText(item.value)
    const label = fitFixed(item.label, { width: w, size: COLUMN.label.size, lineHeight: COLUMN.label.lineHeight, maxLines: 1, fontFamily: body, bold: false })
    const value = fitFixed(joinUnit(text.trim(), item.unit?.trim() || undefined, " "), {
      width: COLUMN.value.w,
      size: COLUMN.value.size,
      lineHeight: COLUMN.value.box,
      maxLines: 1,
      fontFamily: ctx.fonts.heading,
      bold: true,
    })
    const note = item.note?.trim()
      ? fitFixed(item.note, { width: w - COLUMN.note.x, size: COLUMN.note.size, lineHeight: COLUMN.note.lineHeight, maxLines: COLUMN.note.maxLines, fontFamily: body, bold: false })
      : undefined
    if (!label || !value || note === null) return null
    rows.push({ item, label, value, marked, note })
  }
  return rows
}

/** The photograph's caption, set like the source and stacked right above it. */
function captionAbove(text: string | undefined, source: SealSourceLayout | null, ctx: ComponentCtx, w: number): SealSourceLayout | null {
  const caption = fitSealSource({ footnote: text }, ctx, undefined, w, COLUMN.sourceTop)
  if (!caption || !source) return caption
  const lastBaseline = caption.firstBaseline + (caption.layout.lines.length - 1) * caption.layout.lineHeight
  const lift = lastBaseline - (source.firstBaseline - caption.layout.lineHeight - 4)
  return { ...caption, firstBaseline: caption.firstBaseline - lift, top: caption.top - lift }
}

/**
 * The seal column, or `null` when the page is not one photograph beside what
 * this column can hold: the caller then draws it as a seal sheet.
 */
export function SealSplitPage({
  slide,
  ctx,
  page,
  imageSelection,
}: {
  slide: Slide
  ctx: ComponentCtx
  page?: Parameters<typeof fitSealSource>[2]
  imageSelection: NonNullable<ReturnType<typeof findImageSelection>>
}): React.ReactElement | null {
  const { image, source: imageSource } = imageSelection
  // No place for a subheading between the claim and the figures.
  if (slide.subheading?.trim()) return null
  const onRight = slide.image_side === "right"
  const imageX = onRight ? W - COLUMN.imageW : 0
  const ruleX = onRight ? COLUMN.margin : COLUMN.imageW + COLUMN.ruleGap
  const ruleRight = onRight ? imageX - COLUMN.ruleGap : W - COLUMN.margin
  const textX = ruleX + COLUMN.textInset
  const textW = COLUMN.textW
  const rest = slide.components.filter((component) => component !== imageSource)
  const source = fitSealSource(slide, ctx, page, textW, COLUMN.sourceTop)
  const caption = captionAbove(image.caption, source, ctx, textW)
  const foot = caption ?? source
  const bottom = foot ? foot.top - 12 : 648
  const kpis = rest.length === 1 && rest[0]!.type === "kpi_cards" ? rest[0]! : null
  const rows = kpis ? figureRows(kpis, textX, textW, bottom, ctx) : null
  let body: React.ReactElement | null = null
  if (!rows && rest.length > 0) {
    const rect = { x: textX, y: COLUMN.rowsTop, w: textW, h: bottom - COLUMN.rowsTop }
    if (bodySlotDropsContent(rest, rect, ctx)) return null
    body = <SvgContent components={rest} rect={rect} ctx={ctx} />
  }
  const inks = sealInks(ctx)
  const src = ctx.images?.[image.asset_id]?.src
  const alt = ctx.images?.[image.asset_id]?.alt
  const body16 = ctx.fonts.body
  return (
    <g data-split-column="seal">
      {src ? (
        <image href={src} x={imageX} y={0} width={COLUMN.imageW} height={H} preserveAspectRatio="xMidYMid slice" aria-label={alt || undefined} />
      ) : (
        <rect x={imageX} y={0} width={COLUMN.imageW} height={H} fill={ctx.colors.surface} />
      )}
      <g data-decor-piece="gold-rules" data-decor-role="structure">
        <rect x={ruleX} y={COLUMN.rules.thick} width={ruleRight - ruleX} height={COLUMN.rules.thickH} fill={ctx.colors.accent} />
        <rect x={ruleX} y={COLUMN.rules.thin} width={ruleRight - ruleX} height={COLUMN.rules.thinH} fill={ctx.colors.accent} />
      </g>
      <SealHead heading={slide.heading} ctx={ctx} x={textX} maxWidth={ruleRight - textX} foot={COLUMN.headFoot} size={COLUMN.headSize} anchor="start" barY={COLUMN.barY} />
      {rows && (
        <g data-figure-rows="">
          {rows.map((row, i) => {
            const top = COLUMN.rowsTop + i * COLUMN.pitch
            return (
              <g key={i} data-figure-row={i + 1}>
                {paintLines(row.label, {
                  ctx,
                  x: textX,
                  y: centredBaseline(top, COLUMN.label.lineHeight, COLUMN.label.size),
                  fill: sealText(inks.muted, inks.ground, COLUMN.label.size),
                  fontFamily: body16,
                  fontWeight: "400",
                  attrs: sealSmall(COLUMN.label.size),
                })}
                {paintLines(row.value, {
                  ctx,
                  x: textX,
                  y: centredBaseline(top + COLUMN.value.top, COLUMN.value.box, COLUMN.value.size),
                  fill: sealText(row.marked ? inks.mark : inks.ink, inks.ground, COLUMN.value.size),
                  fontFamily: ctx.fonts.heading,
                  fontWeight: "700",
                })}
                {row.note &&
                  paintLines(row.note, {
                    ctx,
                    x: textX + COLUMN.note.x,
                    y: centredBaseline(top + COLUMN.note.top, COLUMN.note.lineHeight, COLUMN.note.size),
                    fill: sealText(inks.ink, inks.ground, COLUMN.note.size),
                    fontFamily: body16,
                    fontWeight: "400",
                  })}
                <rect x={textX} y={top + COLUMN.ruleDrop} width={textW} height={1} fill={inks.rule} />
              </g>
            )
          })}
        </g>
      )}
      {body}
      {caption && (
        <g data-image-caption="">
          <SealSource source={caption} ctx={ctx} x={textX} />
        </g>
      )}
      <SealSource source={source} ctx={ctx} x={textX} />
    </g>
  )
}
