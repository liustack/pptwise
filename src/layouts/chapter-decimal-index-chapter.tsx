import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import { emphasisRunInk, fitEmphasisHeading, fitEmphasisText, stripEmphasis } from "../render/emphasis"
import { centredBaseline } from "./compositions/type"
import { chapterContents, drawContents } from "./compositions/contents"
import { FittedLines } from "./grid-shared"

/**
 * decimal-index-chapter：瑞士制度腔章节页。2026-10 swiss 样例改版
 * （`design/rounds/2026-10-03-swiss/`）重画：
 *
 *   - 左边 240px 红色粗体章号「01」，两位数，行框 x80 y72 起。强调色取主题
 *     的强调墨（`emphasisRunInk`，瑞士红）。
 *   - 右栏 x560 起、宽 640：章名 48/58 粗体，以最后一行为基准，末行行框底
 *     在 y220，两行时第一行往上长。说明（subheading）20/30 muted，y228 起
 *     一行。2px 黑线 y300。
 *   - 线下列出本章各页：从这一页到下一个章节页之间的内容页，页码两位红色
 *     粗体 17px，标题 19/28 黑字，最多两行，每行一根细线
 *     （`compositions/contents.tsx`）。作者不用写。页数多到放不下、或某个
 *     标题要折第三行时，整张清单不画，章节页只留章号、章名和说明，不画半张
 *     清单。
 *   - 顶边红条归 motif，本版式不画。
 *
 * 零 theme id、零 baked hex。空 heading 仍画章号与线，不编造章名。
 */

const NUMBER = { x: 80, top: 72, size: 240, box: 260, minPt: 120, maxW: 440 }
const COLUMN = { x: 560, w: 640 }
const TITLE = { size: 48, lineHeight: 58, foot: 220, maxLines: 2, minPt: 32 }
const SUB = { top: 228, size: 20, lineHeight: 30, maxLines: 1 }
const RULE = { y: 300, h: 2 }
/** The list's band: from the rule down to the foot of the type area. */
const LIST = { top: 300, bottom: 656 }

const TITLE_FIT = {
  maxWidth: COLUMN.w,
  fontSize: TITLE.size,
  maxLines: TITLE.maxLines,
  minPt: TITLE.minPt,
  lineHeightRatio: TITLE.lineHeight / TITLE.size,
} as const

export function DecimalIndexChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const chNum = Math.max(1, chapterNumberFor(ir.slides, index))
  const numeral = fitSvgLine(String(chNum).padStart(2, "0"), {
    maxWidth: NUMBER.maxW,
    fontSize: NUMBER.size,
    minFontSize: NUMBER.minPt,
    fontFamily: fonts.heading,
    bold: true,
  })
  const title = fitEmphasisHeading(slide.heading, { ...TITLE_FIT, fontFamily: fonts.heading, typeScale: ctx.shape?.typeScale })
  const showTitle = stripEmphasis(slide.heading ?? "").trim().length > 0
  const lastBaseline = centredBaseline(TITLE.foot - TITLE.lineHeight, TITLE.lineHeight, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight
  const sub = fitEmphasisText(slide.subheading, {
    maxWidth: COLUMN.w,
    fontSize: SUB.size,
    minPt: SUB.size,
    maxLines: SUB.maxLines,
    lineHeightRatio: SUB.lineHeight / SUB.size,
    fontFamily: fonts.body,
    bold: false,
  })
  const contents = drawContents({
    entries: chapterContents(ir, index),
    ctx,
    rect: { x: COLUMN.x, y: LIST.top, w: COLUMN.w, h: LIST.bottom - LIST.top },
    setting: "grid",
  })

  return (
    <>
      {/* The number is the page's foreground, in full red: a chapter numeral this
          large reads as a recessed ghost unless it says otherwise. */}
      <text
        data-depth="fg"
        data-truncated={numeral.truncated ? "1" : undefined}
        x={NUMBER.x}
        y={centredBaseline(NUMBER.top, NUMBER.box, numeral.fontSize)}
        fontFamily={fonts.heading}
        fontSize={numeral.fontSize}
        fontWeight="700"
        fill={accessibleInk(emphasisRunInk(colors), bg, numeral.fontSize)}
        dominantBaseline="alphabetic"
      >
        {numeral.text}
      </text>
      {showTitle && <FittedLines layout={title} ctx={ctx} x={COLUMN.x} y={firstBaseline} fill={accessibleInk(colors.text, bg, title.fontSize)} bold />}
      {sub.lines.length > 0 && (
        <FittedLines
          layout={{ ...sub, lineHeight: SUB.lineHeight }}
          ctx={ctx}
          x={COLUMN.x}
          y={centredBaseline(SUB.top, SUB.lineHeight, sub.fontSize)}
          fill={accessibleInk(colors.muted, bg, sub.fontSize)}
        />
      )}
      <rect x={COLUMN.x} y={RULE.y} width={COLUMN.w} height={RULE.h} fill={accessibleInk(colors.text, bg, TITLE.size)} />
      {contents}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-decimal-index-chapter.tsx: an institutional report's chapter
  // page. The chapter number very large in the accent on the left, the
  // chapter's name, its subheading and a black rule on the right, and under
  // the rule the pages the chapter holds, read off the deck.
  id: "decimal-index-chapter",
  kind: "standard",
  story: {
    name: "Decimal Index",
    story: "The chapter number stands very large in the signal colour on the left. On the right, the chapter's name and what it covers sit on a heavy black rule, and under the rule the chapter's pages are listed by number and heading.",
    positioning: "A report's chapter break that doubles as the chapter's contents, so a reader sees where each page sits before turning to it.",
    audience: "Readers of a report who quote page numbers back when they want to point at a finding.",
    notFor: "Decks that need a warm or dramatic entrance, which suit Color Block or Stage Word.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  headingFit: TITLE_FIT,
} satisfies LayoutDefinition
