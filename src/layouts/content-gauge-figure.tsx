import type { Component } from "@/ir"
import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { measureTextUnits } from "../lib/svg-text-layout"
import { stripEmphasis } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { stepAside } from "../render/step-aside"
import { GAUGE_HEAD_FIT, GAUGE_LEFT, GAUGE_RIGHT, GaugeHead, GaugeSource, gaugeBodyRect } from "./gauge-shared"
import { sheetFrame } from "./gauge-sheet/frame"
import { GaugeSheetPage, composeSheet } from "./gauge-sheet/sheet"
import { fitFixed, paintLines } from "./compositions"
import { fitFigure, paintFigure, plainFigure, type FittedFigure } from "./compositions/figure"
import { heroCaption, heroUnit, heroValue } from "./minimal-shared"
import { fitHeroLine, type HeroUnitMark } from "./sparse/shared"
import type { EmphasisHeadingLayout } from "../render/emphasis"

type KpiItem = Extract<Component, { type: "kpi_cards" }>["items"][number]

/*
 * gauge-figure: the brief board's prize page (p09). Under the usual heading
 * band, one figure at 176px regular in primary with its unit small and muted
 * after it, a 10px highlight bar exactly as wide as the figure, the line that
 * says what the figure is, and the figure's own source under that.
 *
 * The tea board (p10) adds one or two supporting figures: the kpi_cards'
 * second and third items stand right of a hairline at x760, each a figure at
 * 52px and the line that says what it counts, and the lead figure's caption
 * steps down to 28px on a 580px measure to make room.
 *
 * Geometry is the approved boards (2026-10-02), resolved for Georgia.
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

/** The side column (tea board p10): a hairline at x760, figures from x800. */
const SIDE_DIVIDER_X = 760
const SIDE_X = 800
/** The lead figure keeps this much air left of the hairline. */
const SIDE_GAP = 40
const SIDE_MAX = 2
/** The divider runs from 12px into the band to 12px above its foot. */
const SIDE_DIVIDER_INSET = 12
/** The first side figure's 64px line box starts 32px into the band (y232). */
const SIDE_FIRST = 32
const SIDE_PITCH = 196
/** The rule between two side figures sits this far above the lower one's line box. */
const SIDE_RULE_ABOVE = 24
const SIDE_FIGURE_SIZE = 52
/** Baseline of a 52px figure in its 64px box. */
const SIDE_FIGURE_BASELINE = 50
const SIDE_LABEL_SIZE = 17
const SIDE_LABEL_LINE_HEIGHT = 26
const SIDE_LABEL_MAX_LINES = 2
/** Baseline of the label's first line: its 26px box starts 72px below the figure's box. */
const SIDE_LABEL_BASELINE = 91
/** With figures beside it, the lead figure's caption on the board's narrower measure. */
const SIDE_CAPTION_SIZE = 28
const SIDE_CAPTION_W = 580

function unitMarkFor(size: number): HeroUnitMark {
  return { fontSize: Math.round(size * UNIT_RATIO), dx: Math.round(size * UNIT_GAP_RATIO) }
}

/**
 * The figures this page is built for: a single `kpi_cards` whose first item
 * is the lead figure and whose second and third, when there are any, stand
 * beside it. A delta arrow, an icon or a note on the lead, or anything but a
 * value and its label on a side figure, is something the author wrote that
 * this page has nowhere to set, so such a page goes to the sheet with the
 * rest.
 */
function figureItems(slide: SvgTemplateProps["slide"]): { hero: KpiItem; side: KpiItem[] } | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]!
  if (only.type !== "kpi_cards" || only.items.length < 1 || only.items.length > 1 + SIDE_MAX) return null
  const [hero, ...side] = only.items
  if (!hero!.value.trim() || hero!.delta !== undefined || hero!.icon !== undefined || hero!.note?.trim() || hero!.tag || hero!.tone) return null
  if (side.some((item) => !plainFigure(item) || item.note?.trim())) return null
  return { hero: hero!, side }
}

interface SideFigure {
  figure: FittedFigure
  label: EmphasisHeadingLayout
}

/** The side figures set at the board's sizes, or `null` when one does not fit its column. */
function fitSide(items: readonly KpiItem[], fonts: { heading: string; body: string }): SideFigure[] | null {
  const width = GAUGE_RIGHT - SIDE_X
  const side: SideFigure[] = []
  for (const item of items) {
    const figure = fitFigure(item, SIDE_FIGURE_SIZE, width, fonts.heading)
    const label = fitFixed(item.label, {
      width,
      size: SIDE_LABEL_SIZE,
      lineHeight: SIDE_LABEL_LINE_HEIGHT,
      maxLines: SIDE_LABEL_MAX_LINES,
      fontFamily: fonts.body,
      bold: false,
    })
    if (figure === null || label === null) return null
    side.push({ figure, label })
  }
  return side
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
  const items = figureItems(slide)
  if (!items) return GaugeFigureSheet({ slide, ctx })
  const item = items.hero
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const side = items.side.length > 0 ? fitSide(items.side, fonts) : []
  if (side === null) return GaugeFigureSheet({ slide, ctx })
  const beside = side.length > 0
  const textW = beside ? SIDE_CAPTION_W : TEXT_W
  const value = stripEmphasis(heroValue(slide))
  const unit = heroUnit(slide)
  const figure = fitHeroLine(value, {
    maxWidth: beside ? SIDE_DIVIDER_X - SIDE_GAP - GAUGE_LEFT : gaugeBodyRect(slide).w,
    fontSize: FIGURE_SIZE,
    fontFamily: fonts.heading,
    bold: false,
    unit,
    unitMark: unitMarkFor,
  })
  const captionSize = beside ? SIDE_CAPTION_SIZE : CAPTION_SIZE
  const caption = fitFixed(heroCaption(slide), {
    width: textW,
    size: captionSize,
    lineHeight: CAPTION_LINE_HEIGHT,
    maxLines: CAPTION_MAX_LINES,
    fontFamily: fonts.body,
    bold: false,
  })
  const source = fitFixed(item.source, {
    width: textW,
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
  const sideTop = (i: number) => rect.y + SIDE_FIRST + i * SIDE_PITCH
  const sideFoot = beside
    ? sideTop(side.length - 1) +
      SIDE_LABEL_BASELINE +
      (side[side.length - 1]!.label.lines.length - 1) * SIDE_LABEL_LINE_HEIGHT +
      DESCENT
    : 0
  if (beside && sideFoot > rect.y + rect.h) return GaugeFigureSheet({ slide, ctx })

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
        fill: accessibleInk(colors.text, bg, captionSize),
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
      {beside && (
        <g data-figure-side="">
          <line
            x1={SIDE_DIVIDER_X}
            y1={rect.y + SIDE_DIVIDER_INSET}
            x2={SIDE_DIVIDER_X}
            y2={rect.y + rect.h - SIDE_DIVIDER_INSET}
            stroke={colors.border ?? colors.muted}
            strokeWidth={1}
          />
          {side.map((entry, i) => (
            <g key={i}>
              {i > 0 && (
                <line
                  x1={SIDE_X}
                  y1={sideTop(i) - SIDE_RULE_ABOVE}
                  x2={GAUGE_RIGHT}
                  y2={sideTop(i) - SIDE_RULE_ABOVE}
                  stroke={colors.border ?? colors.muted}
                  strokeWidth={1}
                />
              )}
              {paintFigure(
                entry.figure,
                { x: SIDE_X, y: sideTop(i) + SIDE_FIGURE_BASELINE, ink: accessibleInk(colors.primary, bg, SIDE_FIGURE_SIZE) },
                ctx,
              )}
              {paintLines(entry.label, {
                ctx,
                x: SIDE_X,
                y: sideTop(i) + SIDE_LABEL_BASELINE,
                fill: accessibleInk(colors.text, bg, SIDE_LABEL_SIZE),
                fontFamily: fonts.body,
                fontWeight: "400",
              })}
            </g>
          ))}
        </g>
      )}
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
    story: "A regular-weight claim on a navy rule, then one figure set very large over a highlight bar exactly its width and the line that says what it counts. Up to two supporting figures may stand right of a hairline beside it.",
    positioning: "Serves fact at one figure, and the fact page of the Brief preset uses it. Choose it for the single number a decision rests on.",
    audience: "A room that will remember one number and needs to trust it.",
    notFor: "Several figures of equal weight side by side, which belong in Gauge Sheet.",
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
