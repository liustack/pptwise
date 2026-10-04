import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { boundaryBulletItems } from "./boundary-content"
import { accessibleInk } from "../render/ink"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading, type EmphasisHeadingLayout } from "../render/emphasis"
import { splitRow } from "./compositions/rows"
import { paintNumeral, sealInks, sealText } from "./compositions/seal"
import { centredBaseline, fitFixed, paintLines } from "./compositions/type"

/**
 * deliberation-ending：公文收尾页，vermilion 2026-10 定稿（p15）重画。
 *
 * 版心居中排：顶上一行小字是这一页要对方做什么（`subheading`，如「请管理层
 * 确认分工」，18px 档案灰），下面是要决定的事（`heading`）52px 正红粗体，
 * 再下一段 64×2 的金色短线。下面两到四张并排的卡：卡是面板色加一像素
 * 案卷线，卡上居中一个 60px 的编号方块（甲方数字，中文 deck 写一二三），
 * 下面是标签 28px 粗体、说明 18px 档案灰。条目来自第一个 `bullets`，写成
 * 「标签：说明」的在冒号处拆开，冒号不再印，标签末行用 `data-gloss-break`
 * 声明它，内容审计照样读得到。没有冒号时整条做标签，一行放不下就整条
 * 作说明句排在编号下面。
 *
 * 顶缘、底缘的金双线是主题 motif（`vermilion-motif`），不归本版式。
 *
 * 进共享池，零 theme id、零 baked hex。旧版把短 heading 当成拉开字距的
 * 小标签排在顶上，英文就成了「T h r e e  s t e p s」，heading 也不是这一页
 * 最大的字，本轮按定稿改成大标题。
 */

const CENTRE = 640
const LEFT = 80
const MEASURE = 1120
const ASK = { size: 18, lineHeight: 30, foot: 140 } as const
const TITLE = { size: 52, lineHeight: 70, foot: 220, minPt: 40, maxLines: 2 } as const
const BAR = { w: 64, h: 2, y: 240 } as const
const CARDS = { top: 290, h: 290, gap: 24 } as const
const SQUARE = { size: 60, top: 30 } as const
const LABEL = { size: 28, lineHeight: 40, top: 114 } as const
const GLOSS = { size: 18, lineHeight: 28, top: 168, padX: 30, maxLines: 3 } as const

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 4

interface Card {
  label: EmphasisHeadingLayout | null
  gloss: EmphasisHeadingLayout | null
  glossBreak: string | undefined
}

function fitCards(items: string[], cardW: number, fontFamily: string): Card[] | null {
  const cards: Card[] = []
  const fitGloss = (text: string) =>
    fitFixed(text, { width: cardW - GLOSS.padX * 2, size: GLOSS.size, lineHeight: GLOSS.lineHeight, maxLines: GLOSS.maxLines, fontFamily, bold: false })
  for (const item of items) {
    const { label, gloss } = splitRow(item)
    const head = fitFixed(label ?? gloss, { width: cardW - 24, size: LABEL.size, lineHeight: LABEL.lineHeight, maxLines: 1, fontFamily, bold: true })
    if (!label) {
      // An item with no label of its own is the label when it fits one line,
      // and otherwise the card's sentence, under the number.
      const sentence = head ? null : fitGloss(gloss)
      if (!head && !sentence) return null
      cards.push({ label: head, gloss: sentence, glossBreak: undefined })
      continue
    }
    const desc = fitGloss(gloss)
    if (head === null || desc === null) return null
    const glossBreak = item.trim().slice(label.length, item.trim().length - gloss.length).trim()
    cards.push({ label: head, gloss: desc, glossBreak })
  }
  return cards
}

export function DeliberationEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const inks = sealInks(ctx)
  const items = boundaryBulletItems(slide, ITEM_MAX)
  const cardW = items.length > 0 ? (MEASURE - CARDS.gap * (items.length - 1)) / items.length : MEASURE
  const cards = items.length > 0 ? fitCards(items, cardW, fonts.body) : []

  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: MEASURE,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
    fontFamily: fonts.heading,
    bold: true,
  })
  const titleInk = accessibleInk(colors.primary, bg, title.fontSize)
  const titleLast = centredBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const titleFirst = titleLast - Math.max(0, title.lines.length - 1) * title.lineHeight
  // The ask stands a line over the title, and moves up with a two-line title.
  const askFoot = ASK.foot - Math.max(0, title.lines.length - 1) * title.lineHeight
  const ask = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: MEASURE, fontSize: ASK.size, minPt: 16, maxLines: 1, lineHeightRatio: ASK.lineHeight / ASK.size, fontFamily: fonts.body, bold: false })
    : null
  const askInk = accessibleInk(colors.muted, bg, ASK.size)

  return (
    <>
      {ask &&
        renderEmphasisHeading(
          ask,
          headingEmphasisPaint(ctx, ask, { baseFill: askInk, fontWeight: "700", fontFamily: fonts.body, bold: false }),
          (_line, i) => (
            <text
              key={`ask-${i}`}
              data-truncated={ask.truncated ? "1" : undefined}
              x={CENTRE}
              y={centredBaseline(askFoot - ASK.lineHeight, ASK.lineHeight, ask.fontSize)}
              textAnchor="middle"
              fontFamily={fonts.body}
              fontSize={ask.fontSize}
              fill={askInk}
              dominantBaseline="alphabetic"
            />
          ),
        )}
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: fonts.heading, bold: true }),
        (_line, i) => (
          <text
            key={`title-${i}`}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={CENTRE}
            y={titleFirst + i * title.lineHeight}
            textAnchor="middle"
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={CENTRE - BAR.w / 2} y={BAR.y} width={BAR.w} height={BAR.h} fill={colors.accent} />
      {cards === null ? (
        <g data-dropped={items.length} data-dropped-kind="item" />
      ) : (
        cards.map((card, i) => {
          const x = LEFT + i * (cardW + CARDS.gap)
          const cx = x + cardW / 2
          return (
            <g key={`card-${i}`} data-ending-card={i + 1}>
              <rect x={x + 0.5} y={CARDS.top + 0.5} width={cardW - 1} height={CARDS.h - 1} fill={inks.panel} stroke={inks.rule} strokeWidth={1} />
              {paintNumeral({ ctx, index: i, x: cx - SQUARE.size / 2, y: CARDS.top + SQUARE.top, size: SQUARE.size })}
              {card.label &&
                paintLines(card.label, {
                  ctx,
                  x: cx,
                  y: centredBaseline(CARDS.top + LABEL.top, LABEL.lineHeight, LABEL.size),
                  fill: sealText(inks.ink, inks.panel, LABEL.size),
                  fontFamily: fonts.body,
                  fontWeight: "700",
                  anchor: "middle",
                  bg: inks.panel,
                  ...(card.glossBreak ? { lastAttrs: { "data-gloss-break": card.glossBreak } } : {}),
                })}
              {card.gloss &&
                paintLines(card.gloss, {
                  ctx,
                  x: cx,
                  y: centredBaseline(CARDS.top + (card.label ? GLOSS.top : LABEL.top), GLOSS.lineHeight, GLOSS.size),
                  fill: sealText(inks.muted, inks.panel, GLOSS.size),
                  fontFamily: fonts.body,
                  fontWeight: "400",
                  anchor: "middle",
                  bg: inks.panel,
                })}
            </g>
          )
        })
      )}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-deliberation-ending.tsx: the formal close. What the page asks of
  // the room in small type, the decision at 52px in primary, a short accent
  // bar, and two to four numbered cards of label and gloss from the first
  // bullets, an item written "label: gloss" split at its colon.
  id: "deliberation-ending",
  kind: "standard",
  story: {
    name: "Arranged Close",
    story: "What the room is asked to do stands in a small line at the top, the decision set large and centred in the brand colour under it, and the next steps as two to four numbered cards across the page, each a label and the work it means.",
    positioning: "The closing page of a formal report that ends by asking for a decision on a few named steps.",
    audience: "Committee rooms and review panels reading the arrangements projected on a wall screen.",
    notFor: "Closings that carry informal reminders, which belong in Bare Checklist as a plain undecorated list.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
    { name: "rule", accepts: [] },
  ],
}
