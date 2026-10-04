import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import type { Slide } from "@/ir"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { boundarySlotBlock, drawableItems } from "./boundary-content"
import { consoleInks } from "./compositions/console"
import { drawChecklist, type ChecklistItem } from "./compositions/checklist"
import { splitRow } from "./compositions/rows"
import { centredBaseline } from "./compositions/type"
import { CONSOLE_LEFT, CONSOLE_W, ConsoleCrumb } from "./console-shared"

/**
 * console-ending：事故控制台的收尾页，terminal 2026-10 定稿（p16）重画。
 *
 * 左上角面包屑「EOF / 决定 · 2026-10」。要定的事（`heading`）48/64 粗体，
 * `**…**` 那段走强调色，一行放得下就一行，底对齐在 y276。下面一根细线，
 * 左端一段 32×3 的强调色。副题有就 18px 灰排在线下。再下面是待办清单
 * （`drawChecklist`）：每项一张卡，「[ ]」等宽强调色、何时（等宽灰）、
 * 做什么（22px 粗体）、要做到什么（17px）。条目来自第一个 `timeline`
 * （日期、标题、说明）或第一个 `bullets`（写成「标签：说明」的在冒号处
 * 拆开，冒号不再印，用 `data-gloss-break` 声明），最多四项。
 *
 * 不画 motif：面包屑就是这一页的家具。零 theme id、零 hex。
 */

const TITLE = { size: 48, lineHeight: 64, foot: 290, minPt: 36, maxLines: 2 } as const
const RULE = { y: 316, segW: 32, segH: 3 } as const
const SUB = { top: 330, size: 18, lineHeight: 26, maxLines: 2, gap: 14 } as const
const LIST = { top: 350, foot: 650 } as const
/** Items of the accepted block this face has room to draw. */
const ITEM_MAX = 4

/** The items the checklist draws: a timeline's milestones, or a bullets block's lines split at their colon. */
function checklistItems(slide: Slide): ChecklistItem[] {
  const block = boundarySlotBlock(slide, ["timeline", "bullets"])
  if (block?.type === "timeline") return block.milestones.slice(0, ITEM_MAX).map((m) => ({ due: m.date, title: m.title, gloss: m.desc }))
  if (block?.type !== "bullets") return []
  return drawableItems(block.items)
    .slice(0, ITEM_MAX)
    .map((item) => {
      const { label, gloss } = splitRow(item)
      if (!label) return { title: gloss }
      const glossBreak = item.trim().slice(label.length, item.trim().length - gloss.length).trim()
      return { title: label, gloss, glossBreak }
    })
}

export function ConsoleEnding({ ir, slide, index, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: CONSOLE_W,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    bold: true,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
    fontFamily: fonts.heading,
  })
  const last = centredBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const titleInk = accessibleInk(colors.text, ground, title.fontSize)
  const sub = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: CONSOLE_W, fontSize: SUB.size, minPt: SUB.size, maxLines: SUB.maxLines, lineHeightRatio: SUB.lineHeight / SUB.size, fontFamily: fonts.body, bold: false })
    : null
  const subInk = accessibleInk(colors.muted, ground, SUB.size)
  const listTop = sub ? SUB.top + sub.lines.length * SUB.lineHeight + SUB.gap : LIST.top
  const items = checklistItems(slide)
  const checklist = items.length > 0 ? drawChecklist({ items, ctx, rect: { x: CONSOLE_LEFT, y: listTop, w: CONSOLE_W, h: LIST.foot - listTop } }) : null
  return (
    <>
      <ConsoleCrumb ir={ir} index={index} ctx={ctx} page={page} />
      {renderEmphasisHeading(
        title,
        headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: fonts.heading, bold: true }),
        (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={CONSOLE_LEFT}
            y={first + i * title.lineHeight}
            fontFamily={fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ),
      )}
      <rect x={CONSOLE_LEFT} y={RULE.y} width={CONSOLE_W} height={1} fill={inks.edge} />
      <rect x={CONSOLE_LEFT} y={RULE.y - 1} width={RULE.segW} height={RULE.segH} fill={inks.mark} />
      {sub
        ? renderEmphasisHeading(
            sub,
            headingEmphasisPaint(ctx, sub, { baseFill: subInk, fontWeight: "700", fontFamily: fonts.body, bold: false }),
            (_line, i) => (
              <text
                key={i}
                data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
                x={CONSOLE_LEFT}
                y={centredBaseline(SUB.top, SUB.lineHeight, SUB.size) + i * SUB.lineHeight}
                fontFamily={fonts.body}
                fontSize={sub.fontSize}
                fill={subInk}
                dominantBaseline="alphabetic"
              />
            ),
          )
        : null}
      {checklist ?? (items.length > 0 ? <g data-dropped={items.length} data-dropped-kind="item" /> : null)}
    </>
  )
}

export const layoutDef = {
  // ending-console-ending.tsx: terminal's close. The crumb at EOF, the
  // decision large with its marked words in the signal colour, a hairline,
  // and the work it commits to as an unticked checklist.
  id: "console-ending",
  kind: "standard",
  story: {
    name: "Console Checklist",
    story: "The page prints EOF where the review ends, states the decision large with its key words in the signal colour, and lists the work it commits to as boxes still to tick, each with when it is due, what it is and what it takes.",
    positioning: "The close of a technical review that ends in a decision and a short plan. Choose it when the room should leave with the next steps and their dates.",
    audience: "Engineering leads signing off on what gets built next.",
    notFor: "Closings that thank the room or hand over contacts, which belong on a quieter page.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: ["timeline", "bullets"], capacity: 1, itemCapacity: ITEM_MAX },
  ],
  suppressMotif: true,
  headingFit: { maxWidth: CONSOLE_W, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
