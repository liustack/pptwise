import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { boundaryBulletItems } from "./boundary-content"
import {
  fitEmphasisHeading,
  fitEmphasisText,
  headingEmphasisPaint,
  renderEmphasisHeading,
  type EmphasisHeadingLayout,
} from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { splitRow } from "./compositions/rows"
import { PANEL, paintPanel, panelInks, serifBaseline } from "./compositions/panel"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"
import { PANEL_LEFT, PANEL_W, PanelSource, fitPanelSource } from "./panel-shared"

/**
 * close-word-ending：行情屏收口页。2026-10 ledger 样例改版
 * （`design/rounds/2026-10-04-ledger/`）重画：
 *
 *   - 顶部状态栏是 motif（`poster-motif`）。
 *   - 一行 15px 强调色小标签：页面的 `kicker`，如「请投委会定」，y120 起。
 *   - 标题 52/70，标题字体常规字重，最多两行，以最后一行为基准落在 y302
 *     的盒底：要拍板的那一件事。`**…**` 那段走强调色（琥珀）。
 *   - y340 一根 border 细线，线下一行 14px 青灰的引语（`subheading`，如
 *     「接下来盯三个信号」）。
 *   - 第一个 bullets 的条目排成等宽面板，两到四个：强调色 14px 编号、30px
 *     标题字体的标签、17/26 的说明。条目写成「标签：说明」时在冒号处拆开，
 *     冒号不再印，标签末行用 `data-gloss-break` 声明它。没有冒号时整条做
 *     标签。
 *   - 页面的 `footnote` 印在页脚，13px 青灰，如免责句（`pageFields`）。
 *
 * 不致谢，不兜底 Thank you。heading 空就不画标题。零 theme id、零 hex。
 */

const KICKER = { top: 120, box: 22, size: 15 } as const
const TITLE = { foot: 302, size: 52, lineHeight: 70, minPt: 36, maxLines: 2 } as const
const RULE_Y = 340
const LEAD = { top: 362, box: 20, size: 14 } as const
const PANELS = { top: 396, h: 176, maxItems: 4, pad: 22 } as const
const NUMBER = { top: 22, box: 20, size: 14 } as const
const LABEL = { top: 50, size: 30, lineHeight: 40, maxLines: 1 } as const
const TEXT = { top: 100, size: 17, lineHeight: 26, maxLines: 2 } as const

interface Item {
  number: string
  label: EmphasisHeadingLayout
  text: EmphasisHeadingLayout | null
  glossBreak?: string
}

export function CloseWordEnding({ slide, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const inks = panelInks(ctx)

  const kicker = slide.kicker?.trim()
    ? fitEmphasisText(slide.kicker, { maxWidth: PANEL_W, fontSize: KICKER.size, minPt: KICKER.size, maxLines: 1, lineHeightRatio: KICKER.box / KICKER.size, fontFamily: fonts.body, bold: false })
    : null
  const title = fitEmphasisHeading(slide.heading ?? "", {
    maxWidth: PANEL_W,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
    fontFamily: fonts.heading,
    bold: false,
  })
  const titleInk = accessibleInk(colors.text, bg, title.fontSize)
  const lastBaseline = serifBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight
  const lead = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: PANEL_W, fontSize: LEAD.size, minPt: LEAD.size, maxLines: 1, lineHeightRatio: LEAD.box / LEAD.size, fontFamily: fonts.body, bold: false })
    : null
  const source = fitPanelSource(slide, ctx, page)

  const raw = boundaryBulletItems(slide, PANELS.maxItems)
  // Three panels on the board's 384px pitch, 16px apart: a short row keeps
  // that pitch and ends short of the measure, the way the board's does.
  const pitch = raw.length > 0 ? PANEL_W / Math.max(3, raw.length) : 0
  const w = pitch - PANEL.gap
  const inner = w - PANELS.pad * 2
  const items: Item[] = []
  let lost = 0
  for (const [i, item] of raw.entries()) {
    const { label, gloss } = splitRow(item)
    const glossBreak = label ? item.trim().slice(label.length, item.trim().length - gloss.length).trim() : undefined
    const head = fitFixed(label ?? gloss, { width: inner, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: LABEL.maxLines, fontFamily: fonts.heading, bold: false })
    const text = label ? fitFixed(gloss, { width: inner, size: TEXT.size, lineHeight: TEXT.lineHeight, maxLines: TEXT.maxLines, fontFamily: fonts.body, bold: false }) : null
    if (!head || (label && !text)) {
      lost += 1
      continue
    }
    items.push({ number: String(i + 1).padStart(2, "0"), label: head, text, glossBreak })
  }

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
            y={firstBaseline + i * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={PANEL_LEFT} y={RULE_Y} width={PANEL_W} height={1} fill={colors.border ?? colors.muted} />
      {lead &&
        renderEmphasisHeading(
          lead,
          headingEmphasisPaint(ctx, lead, { baseFill: accessibleInk(colors.muted, bg, LEAD.size), fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, i) => (
            <text
              key={i}
              data-font-floor-exempt="panel-spec"
              data-truncated={lead.truncated ? "1" : undefined}
              x={PANEL_LEFT}
              y={centredBaseline(LEAD.top, LEAD.box, LEAD.size)}
              fontFamily={fonts.body}
              fontSize={lead.fontSize}
              fill={accessibleInk(colors.muted, bg, LEAD.size)}
              dominantBaseline="alphabetic"
            />
          ),
        )}
      {items.map((item, i) => {
        const x = PANEL_LEFT + i * pitch
        const y = PANELS.top
        return (
          <g key={i} data-next-step={i + 1}>
            {paintPanel({ x, y, w, h: PANELS.h }, ctx)}
            <text
              data-font-floor-exempt="panel-spec"
              x={x + PANELS.pad}
              y={centredBaseline(y + NUMBER.top, NUMBER.box, NUMBER.size)}
              fontFamily={fonts.body}
              fontSize={NUMBER.size}
              fill={accessibleInk(inks.mark, inks.surface, NUMBER.size)}
              dominantBaseline="alphabetic"
            >
              {item.number}
            </text>
            {paintLines(item.label, {
              ctx,
              x: x + PANELS.pad,
              y: serifBaseline(y + LABEL.top, LABEL.lineHeight, LABEL.size),
              fill: accessibleInk(colors.text, inks.surface, LABEL.size),
              fontFamily: fonts.heading,
              fontWeight: "400",
              bg: inks.surface,
              ...(item.glossBreak ? { lastAttrs: { "data-gloss-break": item.glossBreak } } : {}),
            })}
            {item.text &&
              paintLines(item.text, {
                ctx,
                x: x + PANELS.pad,
                y: centredBaseline(y + TEXT.top, TEXT.lineHeight, TEXT.size),
                fill: accessibleInk(inks.body, inks.surface, TEXT.size),
                fontFamily: fonts.body,
                fontWeight: "400",
                bg: inks.surface,
              })}
          </g>
        )
      })}
      {lost > 0 && <g data-dropped={lost} data-dropped-kind="item" />}
      <PanelSource source={source} ctx={ctx} />
    </>
  )
}

export const layoutDef = {
  // ending-close-word-ending.tsx: ledger's market-screen close. A kicker in
  // the accent, the decision, a hairline, a lead-in, up to four next steps
  // in panels, and the page's footnote at the foot.
  id: "close-word-ending",
  kind: "standard",
  story: {
    name: "Close Word",
    story: "A small line in the signal colour says what the page asks for, the decision follows in a serif with its key words in that colour, and under a hairline the signals to watch stand in dark panels, each a word and a line.",
    positioning: "Closes a deck that ends on a call and the conditions that would change it. Choose it when the last page must say what to decide and what to watch.",
    audience: "A committee leaving the room with one decision and a short watch list.",
    notFor: "A thank-you page or a contact sheet.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: PANELS.maxItems },
  ],
  pageFields: ["kicker", "footnote"],
  headingFit: {
    maxWidth: PANEL_W,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    bold: false,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
  },
} satisfies LayoutDefinition
