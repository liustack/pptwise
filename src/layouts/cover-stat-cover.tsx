import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { boundarySlotBlock } from "./boundary-content"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
} from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { TICKER_ITEMS, drawTicker, tickerLeftOut } from "./compositions/ticker"
import { serifBaseline } from "./compositions/panel"
import { centredBaseline } from "./compositions/type"
import { PANEL_LEFT, PANEL_W } from "./panel-shared"

/**
 * stat-cover：行情屏封面。2026-10 ledger 样例改版
 * （`design/rounds/2026-10-04-ledger/`）重画：
 *
 *   - 顶部状态栏是 motif（`poster-motif`），机构名和日期都在那里，本版式不
 *     再印眉行和作者落款。
 *   - 一行 15px 强调色（ledger 的琥珀）小标签：页面的 `kicker`，如
 *     「投委会专题」，y214 起。没写就不画。
 *   - 标题 76/96，标题字体常规字重，正文墨，y250 起，一行放得下就一行，放
 *     不下先缩到 56px，再折成两行。`**…**` 那段走强调色。
 *   - 副题（`subheading`）24px 青灰，标题下 18px。
 *   - 第一个 `kpi_cards` 排成行情条（`drawTicker`）：y470 一根 border 细线，
 *     线下两到四格，每格标签、52px 数字、单位、涨跌或说明。不写 kpi_cards
 *     就只有标题区，细线也不画。
 *
 * 版式只读主题 token，零 hex。
 */

const KICKER = { top: 214, box: 22, size: 15 } as const
const TITLE = { top: 250, size: 76, lineHeight: 96, minPt: 56, maxLines: 2 } as const
const SUB = { gap: 18, size: 24, lineHeight: 32, maxLines: 2 } as const
const RULE_Y = 470
const TICKER = { top: 494, h: 150 } as const

export function StatCover({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const kicker = slide.kicker?.trim()
    ? fitEmphasisText(slide.kicker, { maxWidth: PANEL_W, fontSize: KICKER.size, minPt: KICKER.size, maxLines: 1, lineHeightRatio: KICKER.box / KICKER.size, fontFamily: fonts.body, bold: false })
    : null
  const fit = { maxWidth: PANEL_W, fontSize: TITLE.size, minPt: TITLE.minPt, lineHeightRatio: TITLE.lineHeight / TITLE.size, fontFamily: fonts.heading, bold: false } as const
  const oneLine = fitEmphasisHeading(slide.heading, { ...fit, maxLines: 1 })
  // A title that fits one line at 56px or more stays on one line; only one
  // that would be cut takes a second line.
  const title = oneLine.truncated ? fitEmphasisHeading(slide.heading, { ...fit, maxLines: TITLE.maxLines }) : oneLine
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const titleFoot = TITLE.top + Math.max(1, title.lines.length) * TITLE.lineHeight
  const sub = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: PANEL_W, fontSize: SUB.size, minPt: SUB.size, maxLines: SUB.maxLines, lineHeightRatio: SUB.lineHeight / SUB.size, fontFamily: fonts.body, bold: false })
    : null
  const subTop = titleFoot + SUB.gap
  const subInk = accessibleInk(colors.muted, bg, SUB.size)
  const kpis = boundarySlotBlock(slide, ["kpi_cards"])
  const ticker = kpis ? drawTicker({ components: [kpis], ctx, rect: { x: PANEL_LEFT, y: TICKER.top, w: PANEL_W, h: TICKER.h } }) : null

  return (
    <>
      {kicker &&
        renderEmphasisHeading(
          kicker,
          headingEmphasisPaint(ctx, kicker, { baseFill: accessibleInk(colors.accent, bg, KICKER.size), fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, i) => (
            <text
              key={i}
              data-font-floor-exempt="panel-spec"
              data-truncated={kicker.truncated ? "1" : undefined}
              x={PANEL_LEFT}
              y={centredBaseline(KICKER.top, KICKER.box, KICKER.size)}
              fontFamily={fonts.body}
              fontSize={kicker.fontSize}
              fill={accessibleInk(colors.accent, bg, KICKER.size)}
              dominantBaseline="alphabetic"
            />
          ),
        )}
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "400", fontFamily: fonts.heading, bold: false }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={PANEL_LEFT}
            y={serifBaseline(TITLE.top + i * TITLE.lineHeight, TITLE.lineHeight, title.fontSize)}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      {sub &&
        renderEmphasisHeading(
          sub,
          headingEmphasisPaint(ctx, sub, { baseFill: subInk, fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, i) => (
            <text
              key={i}
              data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
              x={PANEL_LEFT}
              y={centredBaseline(subTop + i * SUB.lineHeight, SUB.lineHeight, SUB.size)}
              fontFamily={fonts.body}
              fontSize={sub.fontSize}
              fill={subInk}
              dominantBaseline="alphabetic"
            />
          ),
        )}
      {ticker && <rect x={PANEL_LEFT} y={RULE_Y} width={PANEL_W} height={1} fill={colors.border ?? colors.muted} />}
      {ticker}
      {kpis && !ticker && <g data-dropped={1} data-dropped-kind="component" />}
    </>
  )
}

export const layoutDef = {
  // cover-stat-cover.tsx: ledger's market-screen cover. A kicker in the
  // accent, the title, the subtitle, and the first kpi_cards as a ticker row.
  id: "stat-cover",
  kind: "standard",
  story: {
    name: "Ledger Figure",
    story: "A small line in the signal colour names the occasion, the title states the question in a serif, and a ticker row of headline figures runs under a hairline, each with its label, its unit and which way it moved.",
    positioning: "Opens a deck that argues from numbers. Choose it when the first page should already show the few figures the whole deck is about.",
    audience: "A committee that wants the numbers before the argument.",
    notFor: "Covers with nothing to quote, which belong on a quieter title page.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "strip", accepts: ["kpi_cards"], capacity: 1, itemMinimum: TICKER_ITEMS.min, itemCapacity: TICKER_ITEMS.max, declines: tickerLeftOut },
  ],
  pageFields: ["kicker"],
  headingFit: {
    maxWidth: PANEL_W,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    bold: false,
  },
} satisfies LayoutDefinition
