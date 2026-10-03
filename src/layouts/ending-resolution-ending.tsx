import type { SvgTemplateProps } from "./types"
import { boundaryBulletItems } from "./boundary-content"
import type { LayoutDefinition } from "./registry"
import { accessibleInk } from "../render/ink"
import { emphasisRunInk, fitEmphasisHeading, fitEmphasisText, stripEmphasis } from "../render/emphasis"
import { splitRow } from "./compositions/rows"
import { centredBaseline } from "./compositions/type"
import { FittedLines } from "./grid-shared"

/**
 * resolution-ending：瑞士制度腔收口页。2026-10 swiss 样例改版
 * （`design/rounds/2026-10-03-swiss/`）重画：
 *
 *   - 顶部一行 16px muted（`subheading`，这一页要说明的事），下面一根 1px
 *     黑细线，x80 到 1200，y104。英文也不加字距：小写字母拉开字距难看，导出也
 *     不映射 letter-spacing。
 *   - 标题 64/76 粗体黑字，整行宽 1120，最多两行，以最后一行为基准，末行
 *     行框底在 y290。
 *   - 2px 黑线 y330。
 *   - 线下最多三列，列距 376：红色 72px 粗体编号「01」（主题强调墨），30px
 *     粗体标签，20/30 说明。条目取第一个 bullets：写成「标签：说明」时拆成
 *     标签和说明（`splitRow`）。冒号是两行之间的分界，不再印，标签末行用
 *     `data-gloss-break` 声明它，内容审计照样读得到。没有冒号时整条做标签。
 *   - 顶边红条归 motif，本版式不画。不致谢，不画落款。
 *
 * 零 theme id、零 baked hex。标签放不下两行、说明放不下三行时缩到下限，再
 * 放不下就截断并标 `data-truncated`。
 */

const LEFT = 80
const RIGHT = 1200
const KICKER = { top: 72, box: 24, size: 16 }
const KICKER_RULE = { y: 104, h: 1 }
const TITLE = { size: 64, lineHeight: 76, foot: 290, maxLines: 2, minPt: 44 }
const RULE = { y: 330, h: 2 }
const COLUMN = { pitch: 376, w: 340 }
const NUMBER = { top: 360, size: 72, box: 80 }
const LABEL = { top: 452, size: 30, lineHeight: 40, maxLines: 2, minPt: 24 }
/** The description's first line box starts 8px under the label's last. */
const DESC = { gap: 8, size: 20, lineHeight: 30, maxLines: 3, minPt: 18, w: 320 }

/** Items of the accepted `bullets` block this face has room to draw. */
const ITEM_MAX = 3

const TITLE_FIT = {
  maxWidth: RIGHT - LEFT,
  fontSize: TITLE.size,
  maxLines: TITLE.maxLines,
  minPt: TITLE.minPt,
  lineHeightRatio: TITLE.lineHeight / TITLE.size,
} as const

export function ResolutionEnding({ slide, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const bg = ctx.defaultBg ?? colors.bg
  const kicker = fitEmphasisText(slide.subheading, {
    maxWidth: RIGHT - LEFT,
    fontSize: KICKER.size,
    minPt: KICKER.size,
    maxLines: 1,
    lineHeightRatio: KICKER.box / KICKER.size,
    fontFamily: fonts.body,
    bold: false,
  })
  const title = fitEmphasisHeading(slide.heading, { ...TITLE_FIT, fontFamily: fonts.heading, typeScale: ctx.shape?.typeScale })
  const showTitle = stripEmphasis(slide.heading ?? "").trim().length > 0
  const lastBaseline = centredBaseline(TITLE.foot - TITLE.lineHeight, TITLE.lineHeight, title.fontSize)
  const firstBaseline = lastBaseline - Math.max(0, title.lines.length - 1) * title.lineHeight

  const columns = boundaryBulletItems(slide, ITEM_MAX).map((item, i) => {
    const { label, gloss } = splitRow(item)
    // The colon between label and gloss becomes the break between the two
    // lines, declared on the label so the content audit can read it back.
    const glossBreak = label ? item.trim().slice(label.length, item.trim().length - gloss.length).trim() : undefined
    const head = fitEmphasisText(label ?? gloss, {
      maxWidth: COLUMN.w,
      fontSize: LABEL.size,
      minPt: LABEL.minPt,
      maxLines: LABEL.maxLines,
      lineHeightRatio: LABEL.lineHeight / LABEL.size,
      fontFamily: fonts.heading,
      bold: true,
    })
    const desc = label
      ? fitEmphasisText(gloss, {
          maxWidth: DESC.w,
          fontSize: DESC.size,
          minPt: DESC.minPt,
          maxLines: DESC.maxLines,
          lineHeightRatio: DESC.lineHeight / DESC.size,
          fontFamily: fonts.body,
          bold: false,
        })
      : null
    return { x: LEFT + i * COLUMN.pitch, number: String(i + 1).padStart(2, "0"), head, desc, glossBreak }
  })

  const ink = (size: number) => accessibleInk(colors.text, bg, size)
  return (
    <>
      {kicker.lines.length > 0 && (
        <FittedLines
          layout={{ ...kicker, lineHeight: KICKER.box }}
          ctx={ctx}
          x={LEFT}
          y={centredBaseline(KICKER.top, KICKER.box, kicker.fontSize)}
          fill={accessibleInk(colors.muted, bg, kicker.fontSize)}
        />
      )}
      <rect x={LEFT} y={KICKER_RULE.y} width={RIGHT - LEFT} height={KICKER_RULE.h} fill={ink(KICKER.size)} />
      {showTitle && <FittedLines layout={title} ctx={ctx} x={LEFT} y={firstBaseline} fill={ink(title.fontSize)} bold />}
      <rect x={LEFT} y={RULE.y} width={RIGHT - LEFT} height={RULE.h} fill={ink(TITLE.size)} />
      {columns.map((column, i) => {
        const headBaseline = centredBaseline(LABEL.top, LABEL.lineHeight, column.head.fontSize)
        const headFoot = LABEL.top + column.head.lines.length * column.head.lineHeight
        return (
          <g key={i} data-resolution-item={i + 1}>
            <text
              x={column.x}
              y={centredBaseline(NUMBER.top, NUMBER.box, NUMBER.size)}
              fontFamily={fonts.heading}
              fontSize={NUMBER.size}
              fontWeight="700"
              fill={accessibleInk(emphasisRunInk(colors), bg, NUMBER.size)}
              dominantBaseline="alphabetic"
            >
              {column.number}
            </text>
            <FittedLines layout={column.head} ctx={ctx} x={column.x} y={headBaseline} fill={ink(column.head.fontSize)} bold glossBreak={column.glossBreak} />
            {column.desc && column.desc.lines.length > 0 && (
              <FittedLines
                layout={column.desc}
                ctx={ctx}
                x={column.x}
                y={centredBaseline(headFoot + DESC.gap, DESC.lineHeight, column.desc.fontSize)}
                fill={ink(column.desc.fontSize)}
              />
            )}
          </g>
        )
      })}
    </>
  )
}

export const layoutDef: LayoutDefinition = {
  branding: "none",
  // ending-resolution-ending.tsx: an institutional report's closing page.
  // What the page settles in a small line over a hairline, the closing title
  // large and bold, a black rule, then up to three numbered columns, each a
  // label and what it means. No thanks and no sign-off.
  id: "resolution-ending",
  kind: "standard",
  story: {
    name: "Numbered Resolution",
    story: "A small line over a hairline says what the page settles. The closing title sits large and bold on a heavy black rule, and under it up to three numbered columns, each a short label and a line on what it means.",
    positioning: "The closing page for up to three things the reader is asked to watch, decide or keep. Not a thank-you page.",
    audience: "Board meetings and review panels where the closing items are projected on a wall screen.",
    notFor: "Closings that list informal next steps, which belong in Next Steps Pad as a casual to-do list.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEM_MAX },
    { name: "rule", accepts: [] },
  ],
  headingFit: TITLE_FIT,
}
