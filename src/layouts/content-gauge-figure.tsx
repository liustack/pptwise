import type { Component } from "@/ir"
import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { measureTextUnits } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { stepAside } from "../render/step-aside"
import { GAUGE_HEAD_FIT, GAUGE_LEFT, GaugeHead, GaugeSource, gaugeBodyRect } from "./gauge-shared"
import { sheetFrame } from "./gauge-sheet/frame"
import { GaugeSheetPage, composeSheet } from "./gauge-sheet/sheet"
import { fitFixed, paintLines } from "./compositions"
import { heroCaption, heroUnit, heroValue } from "./minimal-shared"
import { fitHeroLine, type HeroUnitMark } from "./sparse/shared"

type KpiItem = Extract<Component, { type: "kpi_cards" }>["items"][number]

/*
 * gauge-figure: the brief board's prize page (p09). Under the usual heading
 * band, one figure at 176px regular in primary with its unit small and muted
 * after it, a 10px highlight bar exactly as wide as the figure, the line that
 * says what the figure is, and the figure's own source under that.
 *
 * Geometry is the approved board (2026-10-02), resolved for Georgia.
 */

/** The figure's baseline: its 180px line box starts at y236. */
const FIGURE_Y = 387
const FIGURE_SIZE = 176
/** The board's unit is 44px with 20px of air before it, at 176px. */
const UNIT_RATIO = 44 / FIGURE_SIZE
const UNIT_GAP_RATIO = 20 / FIGURE_SIZE
/** The bar sits 43px under the baseline at 176px, just below old-style descenders. */
const BAR_DROP_RATIO = 43 / FIGURE_SIZE
const BAR_H = 10
/** From the bar's top to the caption's first baseline. */
const BAR_TO_CAPTION = 72
const CAPTION_SIZE = 30
const CAPTION_LINE_HEIGHT = 40
const CAPTION_MAX_LINES = 2
/** From the caption's last baseline to the source's first. */
const CAPTION_TO_SOURCE = 40
const SOURCE_SIZE = 20
const SOURCE_LINE_HEIGHT = 30
const SOURCE_MAX_LINES = 2
const TEXT_W = 900
const DESCENT = 6

function unitMarkFor(size: number): HeroUnitMark {
  return { fontSize: Math.round(size * UNIT_RATIO), dx: Math.round(size * UNIT_GAP_RATIO) }
}

/**
 * The one figure this page is built for: a single `kpi_cards` holding a
 * single item with a value, and nothing the hero line has no place for. A
 * delta arrow or an icon is something the author wrote, and this page has
 * nowhere to set it, so such an item goes to the sheet with the rest.
 */
function figureItem(slide: SvgTemplateProps["slide"]): KpiItem | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]!
  if (only.type !== "kpi_cards" || only.items.length !== 1) return null
  const item = only.items[0]!
  if (!item.value.trim() || item.delta !== undefined || item.icon !== undefined) return null
  return item
}

/**
 * The page this face draws when the hero line cannot hold what the author
 * wrote: the same heading band and source line as every other brief page,
 * with the components drawn whole in the band between them. A page that band
 * cannot hold steps aside, named as this face.
 */
function GaugeFigureSheet({ slide, ctx }: Pick<SvgTemplateProps, "slide" | "ctx">) {
  const sheet = composeSheet(slide, ctx)
  if (!sheet.composed) {
    const aside = stepAside({ face: "gauge-figure", slide, ctx, bodyRect: sheet.rect })
    if (aside) return aside
  }
  return (
    <g data-figure-mode="sheet">
      <GaugeSheetPage slide={slide} ctx={ctx} sheet={sheet} />
    </g>
  )
}

export function GaugeFigureContent({ slide, ctx }: SvgTemplateProps) {
  const item = figureItem(slide)
  if (!item) return GaugeFigureSheet({ slide, ctx })
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const value = stripEmphasis(heroValue(slide))
  const unit = heroUnit(slide)
  const figure = fitHeroLine(value, {
    maxWidth: gaugeBodyRect(slide).w,
    fontSize: FIGURE_SIZE,
    fontFamily: fonts.heading,
    bold: false,
    unit,
    unitMark: unitMarkFor,
  })
  const caption = fitFixed(heroCaption(slide), {
    width: TEXT_W,
    size: CAPTION_SIZE,
    lineHeight: CAPTION_LINE_HEIGHT,
    maxLines: CAPTION_MAX_LINES,
    fontFamily: fonts.body,
    bold: false,
  })
  const source = fitFixed(item.source, {
    width: TEXT_W,
    size: SOURCE_SIZE,
    lineHeight: SOURCE_LINE_HEIGHT,
    maxLines: SOURCE_MAX_LINES,
    fontFamily: fonts.body,
    bold: false,
  })
  // A figure, caption or source this page cannot set whole goes to the
  // sheet, which draws the card as written.
  if (!figure || !caption || !source) return GaugeFigureSheet({ slide, ctx })

  const barY = FIGURE_Y + Math.round(figure.fontSize * BAR_DROP_RATIO)
  const barW = Math.round(measureTextUnits(figure.text, { bold: false, fontFamily: fonts.heading }) * figure.fontSize)
  const captionY = barY + BAR_TO_CAPTION
  const captionLast = captionY + Math.max(0, caption.lines.length - 1) * CAPTION_LINE_HEIGHT
  const sourceY = (caption.lines.length > 0 ? captionLast : barY + BAR_H) + CAPTION_TO_SOURCE
  const lastBaseline =
    source.lines.length > 0 ? sourceY + (source.lines.length - 1) * SOURCE_LINE_HEIGHT : captionLast
  const { standfirst, rect } = sheetFrame(slide, ctx)
  const top = FIGURE_Y - Math.round(figure.fontSize * 0.75)
  if (lastBaseline + DESCENT > rect.y + rect.h || top < rect.y) return GaugeFigureSheet({ slide, ctx })

  const figureInk = accessibleInk(colors.primary, bg, figure.fontSize)
  const unitInk = accessibleInk(colors.muted, bg, figure.unitMark.fontSize)
  return (
    <>
      <GaugeHead heading={slide.heading} ctx={ctx} />
      {standfirst}
      <text
        x={GAUGE_LEFT}
        y={FIGURE_Y}
        fontFamily={fonts.heading}
        fontSize={figure.fontSize}
        fill={figureInk}
        dominantBaseline="alphabetic"
      >
        {figure.text}
        {unit && (
          <tspan dx={figure.unitMark.dx} fontSize={figure.unitMark.fontSize} fill={unitInk}>
            {unit}
          </tspan>
        )}
      </text>
      <rect x={GAUGE_LEFT} y={barY} width={barW} height={BAR_H} fill={colors.accent} />
      {paintLines(caption, {
        ctx,
        x: GAUGE_LEFT,
        y: captionY,
        fill: accessibleInk(colors.text, bg, CAPTION_SIZE),
        fontFamily: fonts.body,
        fontWeight: "400",
      })}
      {paintLines(source, {
        ctx,
        x: GAUGE_LEFT,
        y: sourceY,
        fill: accessibleInk(colors.muted, bg, SOURCE_SIZE),
        fontFamily: fonts.body,
        fontWeight: "400",
      })}
      <GaugeSource text={slide.footnote} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  branding: "none",
  id: "gauge-figure",
  kind: "standard",
  story: {
    name: "Gauge Figure",
    story: "A regular-weight claim on a navy rule, then one figure set very large with its unit small beside it. A highlight bar exactly as wide as the figure runs under it, above the line that says what it counts and where it comes from.",
    positioning: "Serves fact at one figure, and the fact page of the Brief preset uses it. Choose it for the single number a decision rests on.",
    audience: "A room that will remember one number and needs to trust it.",
    notFor: "Several figures side by side, which belong in Gauge Sheet.",
  },
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: ["kpi_cards", "paragraph"], capacity: 1 },
  ],
  headingFit: GAUGE_HEAD_FIT,
} satisfies LayoutDefinition
