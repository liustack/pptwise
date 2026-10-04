import type { Component } from "@/ir"
import { kpiValueText } from "../../components/kpi"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"
import { baselineIn, consoleInks, consoleText, fitBanner, fitMono, monoWidth, paintBanner, paintIcon, paintMono, toneInk } from "./console"

type ImageGrid = Extract<Component, { type: "image_grid" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * plates: pictures in a row, each over its figure, the console setting's way
 * of showing a few events side by side. terminal's 2026-10 board, its
 * physical failures page (p08): three photographs of single-region failures,
 * each with where and when in mono, its figure set large and what happened,
 * and a banner under them saying what the three have in common.
 *
 * Each column is a photograph cropped to fill its frame inside a 1px edge,
 * then the picture's caption in 12px mono, the figure of the same place in
 * the `kpi_cards` set in bold mono at 44px, and the figure's label at 17px
 * under it. The figure the author marks takes the mark, a figure with a tone
 * its ink. A closing callout is a banner across the foot: a tip on the mark's
 * tint inside an edge of it, its icon at the left.
 *
 * Takes, in the console setting: an `image_grid` of two to four pictures,
 * then a `kpi_cards` of as many items with a value and a label and nothing
 * else, then optionally a `callout`.
 *
 * Declines: any other shape, counts that differ, a caption or a figure wider
 * than its column, a label past two lines, and photographs shorter than 160px.
 *
 * Reads: the console inks (`./console.tsx`), the images the face hands in,
 * `fonts.body`, `fonts.mono`.
 */

const GAP = 16
const CAPTION = { gap: 14, box: 20, size: 12, icon: 14, iconGap: 6 } as const
const FIGURE = { gap: 6, box: 52, size: 44 } as const
const LABEL = { gap: 6, size: 17, lineHeight: 26, maxLines: 2 } as const
const BANNER_BOX = { gap: 24, h: 64, foot: 8 } as const
const MIN_IMAGE_H = 160

export const platesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "console") return null
  const [grid, kpis, note, ...rest] = components
  if (grid?.type !== "image_grid" || kpis?.type !== "kpi_cards" || rest.length > 0) return null
  if (note && note.type !== "callout") return null
  return drawPlates(grid, kpis, note as Callout | undefined, { ctx, rect })
}

function drawPlates(grid: ImageGrid, kpis: KpiCards, note: Callout | undefined, { ctx, rect }: Pick<Parameters<Composition>[0], "ctx" | "rect">) {
  const n = grid.items.length
  if (n < 2 || n > 4 || kpis.items.length !== n || grid.emphasis === "first") return null
  if (kpis.items.some((item) => item.icon || item.delta || item.tag || item.source?.trim() || item.note?.trim())) return null
  const w = (rect.w - GAP * (n - 1)) / n
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const columns = grid.items.map((item, i) => {
    const kpi = kpis.items[i]!
    const { text, marked } = kpiValueText(kpi.value)
    const value = kpi.unit?.trim() ? `${text} ${kpi.unit.trim()}` : text
    const captionW = w - (item.icon ? CAPTION.icon + CAPTION.iconGap : 0)
    const caption = item.caption?.trim() ? fitMono(item.caption, { width: captionW, size: CAPTION.size, lineHeight: CAPTION.box, maxLines: 1 }) : null
    const label = fitFixed(kpi.label, { width: w, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines, fontFamily: ctx.fonts.body, bold: false })
    return { item, kpi, marked, value, caption, label, fits: monoWidth(value, FIGURE.size) <= w && label !== null && (!item.caption?.trim() || caption !== null) }
  })
  if (columns.some((c) => !c.fits)) return null
  const labelLines = Math.max(...columns.map((c) => c.label!.lines.length))
  const textBlock = CAPTION.gap + CAPTION.box + FIGURE.gap + FIGURE.box + LABEL.gap + labelLines * LABEL.lineHeight
  const banner = note ? fitBanner(note, rect.w, ctx) : null
  if (note && !banner) return null
  const bannerH = banner ? BANNER_BOX.h + (banner.lines.length - 1) * 28 : 0
  const imageH = rect.h - textBlock - (banner ? BANNER_BOX.gap + bannerH + BANNER_BOX.foot : BANNER_BOX.foot)
  if (imageH < MIN_IMAGE_H) return null
  return (
    <g {...compositionTag("plates")}>
      <g {...blockTag(ctx, grid)}>
        {columns.map(({ item }, i) => {
          const x = rect.x + i * (w + GAP)
          const src = ctx.images?.[item.asset_id]?.src
          const alt = ctx.images?.[item.asset_id]?.alt
          return (
            <g key={i} data-plate={item.asset_id}>
              {src ? (
                <image href={src} x={x} y={rect.y} width={w} height={imageH} preserveAspectRatio="xMidYMid slice" aria-label={alt || undefined} />
              ) : (
                <rect x={x} y={rect.y} width={w} height={imageH} fill={inks.surface} />
              )}
              <rect x={x + 0.5} y={rect.y + 0.5} width={w - 1} height={imageH - 1} fill="none" stroke={inks.edge} strokeWidth={1} />
            </g>
          )
        })}
        {columns.map(({ item, caption }, i) => {
          if (!caption) return null
          const x = rect.x + i * (w + GAP)
          const top = rect.y + imageH + CAPTION.gap
          return (
            <g key={`caption-${i}`}>
              {item.icon ? paintIcon(item.icon, x, top + (CAPTION.box - CAPTION.icon) / 2, CAPTION.icon, inks.muted, ground) : null}
              {paintMono(caption, { ctx, x: x + (item.icon ? CAPTION.icon + CAPTION.iconGap : 0), y: baselineIn(top, CAPTION.box, CAPTION.size), fill: consoleText(inks.muted, ground, CAPTION.size), ground })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, kpis)}>
        {columns.map(({ kpi, marked, value, label }, i) => {
          const x = rect.x + i * (w + GAP)
          const figureTop = rect.y + imageH + CAPTION.gap + CAPTION.box + FIGURE.gap
          const ink = marked ? inks.mark : (toneInk(inks, kpi.tone) ?? inks.text)
          return (
            <g key={`figure-${i}`} data-plate-figure={marked ? "marked" : (kpi.tone ?? "")}>
              <text x={x} y={baselineIn(figureTop, FIGURE.box, FIGURE.size)} fontFamily={ctx.fonts.mono} fontSize={FIGURE.size} fontWeight="700" fill={consoleText(ink, ground, FIGURE.size)} dominantBaseline="alphabetic" xmlSpace="preserve">
                {value}
              </text>
              {paintLines(label!, {
                ctx,
                x,
                y: baselineIn(figureTop + FIGURE.box + LABEL.gap, LABEL.lineHeight, LABEL.size),
                fill: consoleText(inks.body, ground, LABEL.size),
                fontFamily: ctx.fonts.body,
                fontWeight: "400",
              })}
            </g>
          )
        })}
      </g>
      {note && banner ? paintBanner(note, banner, { x: rect.x, y: rect.y + rect.h - BANNER_BOX.foot - bannerH, w: rect.w, h: bannerH }, ctx, blockTag(ctx, note)) : null}
    </g>
  )
}
