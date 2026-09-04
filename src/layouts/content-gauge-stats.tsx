import type { Component } from "@/ir"
import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sectionNameFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { SvgContent } from "../render/svg-content"
import { accessibleInk, resolveSemanticColor } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"
import { GaugeMeta, withoutOverflowMark } from "./gauge-shared"

type KpiCards = Extract<Component, { type: "kpi_cards" }>

const MARK_X = 160
const MARK_Y = 139
const MARK_SIZE = 12
const SECTION_X = 186
const SECTION_Y = 150
const SECTION_SIZE = 16
const SECTION_TRACKING = 2

const TITLE_X = 160
const TITLE_Y = 214
const TITLE_SIZE = 40
const TITLE_MIN_PT = 24
const TITLE_MAX_W = 970

const RULE_X1 = 160
const RULE_X2 = 1130
const RULE_Y = 300
const DIVIDER_X = [402, 644, 886] as const
const DIVIDER_Y1 = 312
const DIVIDER_Y2 = 470

const STAT_X = [160, 426, 668, 910] as const
const STAT_W = [218, 194, 194, 220] as const
const VALUE_Y = 384
const VALUE_SIZE = 52
const LABEL_Y = 420
const LABEL_SIZE = 16
const NOTE_Y = 452
const NOTE_SIZE = 15

const CONCLUSION_X = 160
const CONCLUSION_Y = 560
const CONCLUSION_SIZE = 20
const CONCLUSION_MAX_W = 970

/**
 * Where the conclusion line and the rule sit on the *fallback* composition —
 * the branch that hands arbitrary components to `SvgContent` instead of
 * painting the four-column stats grid.
 *
 * On the stats grid the conclusion is a closing line under the numbers, at
 * `CONCLUSION_Y`. That put the content band between the rule and the
 * conclusion, 208px of it, and 208px is less than any cartesian chart's own
 * measured minimum. The band was a constant: it never asked what it was
 * about to hold, so a chart handed 208px drew its 316px anyway and painted
 * straight through the conclusion and the footnote (16 pages of the review
 * corpus, every one of them this face).
 *
 * So on the fallback the conclusion reads as a standfirst instead — under
 * the headline, above the rule, which is where a one-pager puts the sentence
 * that frames the exhibit below it. The rule then closes the header block
 * rather than floating between two halves of it, and the exhibit gets one
 * band, 328px, whatever the page carries.
 *
 * **What 328 guarantees**, measured against `chart.measure` rather than
 * asserted: every legend-bearing cartesian chart (a bar or scatter costs
 * 52 for the legend row + 28 for the axis-title pair + the flat 240 body =
 * 320), and a directly-labelled line or area chart up to 12 series with axis
 * titles, 13 without — those two grow with the series count, because each
 * series needs a line of the label column (`directLabelBodyH`). A 13-series
 * line with axis titles measures 344 and does not fit.
 *
 * It is not widened to cover that, because it cannot be: the band already
 * runs from the rule to 620, and 620 is where the footnote's own ink starts.
 * The bound is the page, not a number someone picked. Past it the exhibit
 * declines and declares (`data-dropped`), which stops the export
 * rather than painting a chart through the footnote — the behaviour this
 * face's own history is about. A 13-series line chart is legal IR
 * (`ir-quality` only warns past 8), so that path is reachable and is meant
 * to be loud.
 */
const STANDFIRST_Y = 252
const FALLBACK_RULE_Y = 280

const FOOTNOTE_X = 160
const FOOTNOTE_Y = 636
const FOOTNOTE_SIZE = 16
const FOOTNOTE_MAX_W = 970

const FALLBACK_Y = FALLBACK_RULE_Y + 12
/** Just clear of the footnote's own ink — see `FOOTNOTE_Y`. */
const FALLBACK_BOTTOM = 620

function exactKpiBlock(slide: SvgTemplateProps["slide"]): KpiCards | null {
  if (slide.components.length !== 1) return null
  const only = slide.components[0]
  return only?.type === "kpi_cards" ? only : null
}

function labelWithUnit(item: KpiCards["items"][number]): string {
  const unit = item.unit?.trim()
  return unit ? `${item.label} · ${unit}` : item.label
}

function noteSource(item: KpiCards["items"][number]): string {
  const source = item.source?.trim()
  if (source) return source
  if (item.delta === "up") return "↑"
  if (item.delta === "down") return "↓"
  if (item.delta === "flat") return "→"
  return ""
}

/**
 * gauge-stats：四列满密度统计页。只有一个 `kpi_cards` 时启用定稿的统计
 * 构图。作为自动池成员遇到其他合法内容时，沿同一 x160 内容轴交给
 * `SvgContent`，避免无声丢失模型已经写入的组件。
 */
export function GaugeStatsContent({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const border = colors.border ?? colors.muted
  const sectionSource = sectionNameFor(ir.slides, index)
  const section = sectionSource
    ? fitSvgLine(sectionSource, {
        maxWidth: 944,
        fontSize: SECTION_SIZE,
        minFontSize: SECTION_SIZE,
        letterSpacing: SECTION_TRACKING,
        fontFamily: fonts.body,
      })
    : null
  const title = slide.heading
    ? fitSvgLine(stripEmphasis(slide.heading), {
        maxWidth: TITLE_MAX_W,
        fontSize: TITLE_SIZE,
        minFontSize: TITLE_MIN_PT,
        fontFamily: fonts.heading,
        bold: true,
      })
    : null
  const conclusionSource = slide.subheading?.trim() ?? ""
  const conclusion = conclusionSource
    ? fitSvgLine(stripEmphasis(conclusionSource), {
        maxWidth: CONCLUSION_MAX_W,
        fontSize: CONCLUSION_SIZE,
        minFontSize: 16,
        fontFamily: fonts.body,
      })
    : null
  const footnoteSource = slide.footnote?.trim() ?? ""
  const footnote = footnoteSource
    ? fitSvgLine(footnoteSource, {
        maxWidth: FOOTNOTE_MAX_W,
        fontSize: FOOTNOTE_SIZE,
        minFontSize: FOOTNOTE_SIZE,
        fontFamily: fonts.body,
      })
    : null
  const kpis = exactKpiBlock(slide)
  const fallbackCtx = {
    ...ctx,
    colors: {
      ...colors,
      accent: colors.primary,
      chartPalette: colors.chartPalette.map((color) => color === colors.accent ? colors.primary : color),
    },
  }
  const droppedStats = kpis ? Math.max(0, kpis.items.length - 4) : 0
  const stats = (kpis?.items.slice(0, 4) ?? []).map((item, itemIndex) => ({
    x: STAT_X[itemIndex]!,
    value: fitSvgLine(item.value, {
      maxWidth: STAT_W[itemIndex]!,
      fontSize: VALUE_SIZE,
      minFontSize: 32,
      fontFamily: fonts.heading,
      bold: true,
    }),
    label: fitSvgLine(labelWithUnit(item), {
      maxWidth: STAT_W[itemIndex]!,
      fontSize: LABEL_SIZE,
      minFontSize: LABEL_SIZE,
      fontFamily: fonts.body,
    }),
    note: noteSource(item)
      ? fitSvgLine(noteSource(item), {
          maxWidth: STAT_W[itemIndex]!,
          fontSize: NOTE_SIZE,
          minFontSize: NOTE_SIZE,
          fontFamily: fonts.body,
        })
      : null,
    decline: item.delta === "down",
  }))
  const danger = resolveSemanticColor("danger", colors)
  const fallbackArrangement = "single" as const

  return (
    <>
      <GaugeMeta ir={ir} ctx={ctx} tone="light" />
      <rect x={MARK_X} y={MARK_Y} width={MARK_SIZE} height={MARK_SIZE} fill={colors.accent} />
      {section && (
        <text
          data-truncated={section.truncated ? "1" : undefined}
          x={SECTION_X}
          y={SECTION_Y}
          fontFamily={fonts.body}
          fontSize={section.fontSize}
          fill={accessibleInk(colors.muted, bg, section.fontSize)}
          letterSpacing={SECTION_TRACKING}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(section.text)}
        </text>
      )}
      {title && (
        <text
          data-truncated={title.truncated ? "1" : undefined}
          x={TITLE_X}
          y={TITLE_Y}
          fontFamily={fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, bg, title.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(title.text)}
        </text>
      )}

      {conclusion && !kpis && (
        <text
          data-truncated={conclusion.truncated ? "1" : undefined}
          x={CONCLUSION_X}
          y={STANDFIRST_Y}
          fontFamily={fonts.body}
          fontSize={conclusion.fontSize}
          fill={accessibleInk(colors.text, bg, conclusion.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(conclusion.text)}
        </text>
      )}

      <line
        x1={RULE_X1}
        y1={kpis ? RULE_Y : FALLBACK_RULE_Y}
        x2={RULE_X2}
        y2={kpis ? RULE_Y : FALLBACK_RULE_Y}
        stroke={border}
        strokeWidth={1}
      />

      {kpis ? (
        <g
          data-dropped={droppedStats > 0 ? droppedStats : undefined}
          data-dropped-kind={droppedStats > 0 ? "stat" : undefined}
        >
          {DIVIDER_X.map((x) => (
            <line key={x} x1={x} y1={DIVIDER_Y1} x2={x} y2={DIVIDER_Y2} stroke={border} strokeWidth={1} />
          ))}
          {stats.map((stat, statIndex) => (
            <g key={statIndex}>
              <text
                data-truncated={stat.value.truncated ? "1" : undefined}
                x={stat.x}
                y={VALUE_Y}
                fontFamily={fonts.heading}
                fontSize={stat.value.fontSize}
                fontWeight="700"
                fill={accessibleInk(colors.primary, bg, stat.value.fontSize)}
                dominantBaseline="alphabetic"
              >
                {withoutOverflowMark(stat.value.text)}
              </text>
              <text
                data-truncated={stat.label.truncated ? "1" : undefined}
                x={stat.x}
                y={LABEL_Y}
                fontFamily={fonts.body}
                fontSize={stat.label.fontSize}
                fill={accessibleInk(colors.muted, bg, stat.label.fontSize)}
                dominantBaseline="alphabetic"
              >
                {withoutOverflowMark(stat.label.text)}
              </text>
              {stat.note && (
                <text
                  data-font-floor-exempt="gauge-spec"
                  data-truncated={stat.note.truncated ? "1" : undefined}
                  x={stat.x}
                  y={NOTE_Y}
                  fontFamily={fonts.body}
                  fontSize={stat.note.fontSize}
                  fill={accessibleInk(stat.decline ? danger : colors.muted, bg, stat.note.fontSize)}
                  dominantBaseline="alphabetic"
                >
                  {withoutOverflowMark(stat.note.text)}
                </text>
              )}
            </g>
          ))}
        </g>
      ) : (
        <SvgContent
          arrangement={fallbackArrangement}
          components={slide.components}
          rect={{ x: RULE_X1, y: FALLBACK_Y, w: RULE_X2 - RULE_X1, h: FALLBACK_BOTTOM - FALLBACK_Y }}
          ctx={fallbackCtx}
        />
      )}

      {conclusion && kpis && (
        <text
          data-truncated={conclusion.truncated ? "1" : undefined}
          x={CONCLUSION_X}
          y={CONCLUSION_Y}
          fontFamily={fonts.body}
          fontSize={conclusion.fontSize}
          fill={accessibleInk(colors.text, bg, conclusion.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(conclusion.text)}
        </text>
      )}

      {footnote && (
        <text
          data-contrast-tier="meta"
          data-truncated={footnote.truncated ? "1" : undefined}
          x={FOOTNOTE_X}
          y={FOOTNOTE_Y}
          fontFamily={fonts.body}
          fontSize={footnote.fontSize}
          fill={accessibleInk(colors.muted, bg, footnote.fontSize)}
          dominantBaseline="alphabetic"
        >
          {withoutOverflowMark(footnote.text)}
        </text>
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  id: "gauge-stats",
  kind: "standard",
  slideTypes: ["content"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: "any", capacity: 4 },
    { name: "rule", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  // `pinOnly` keeps consulting's own face out of `fullLayoutSet`, the pool
  // every other builtin auto-picks from. consulting reaches it by *listing*
  // it in `layouts.content`, which `resolveLayoutId` honours for a listed
  // id (see its Wave 8 board-lock comment). Without this the gauge
  // face leaks into all 24 themes.
}
