import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { boundaryBulletItems } from "./boundary-content"
import { fitMemoTitle, memoBaseline, memoChinese, memoInks, memoMeta, memoNumeral, memoText, paintMemo, paintMemoLine } from "./compositions/memo"
import { fitStamp, paintStamp } from "./compositions/stamp"
import { blockTag } from "./compositions/shared"
import { MEMO_LEFT, MEMO_W, MemoMargin } from "./memo-shared"

/**
 * memo-ending：打字机备忘录的签发页，memo 2026-10 定稿（p16）重画。
 *
 * 页眉的 MEMORANDUM 和红双线归 motif。左边页边栏写页面的 `kicker`（「决
 * 定」），右边从 x240 起是决定本身：宋体粗体 40/56，放得下就一行，放不下
 * 折两行，中文在逗号处断，底对齐在 y200，下面一条 1px 墨线。墨线下是第一
 * 组 `bullets` 的条目，每条前面一个红色宋体的「一、」「二、」，正文宋体
 * 26/40，最多三条。再下面是签发栏：页面的 `fields`，等宽灰字的「签发：」
 * 「拟稿：」「抄送：」，后面是宋体的值，值后面跟着等宽的注（签发的日期）。
 * 签发栏右边盖一枚印章（页面的 `stamp`），左倾六度。
 *
 * 有 `subheading` 时，它作一行灰字站在墨线下，条目跟着下移。零 theme id、
 * 零 hex。
 */

const TITLE = { foot: 200, size: 40, lineHeight: 56, minPt: 28, maxLines: 2 } as const
const RULE_Y = 216
const SUB = { top: 228, size: 18, lineHeight: 28, maxLines: 2, gap: 12 } as const
const ITEMS = { top: 244, pitch: 70, numeral: { size: 34, lineHeight: 50 }, textX: 90, text: { top: 6, size: 26, lineHeight: 40, maxLines: 2, minPt: 20 }, max: 3 } as const
const SIGN = { gap: 66, rule: { lead: 14, w: 560 }, pitch: 44, label: { size: 16, lineHeight: 30 }, valueX: 90, value: { size: 19, w: 330 }, noteX: 420, note: { size: 15 } } as const
const STAMP = { x: 900, gap: 10, angle: -6, maxW: 300 } as const

export function MemoEnding({ slide, ctx }: SvgTemplateProps) {
  const inks = memoInks(ctx)
  const chinese = memoChinese(ctx)
  const colon = chinese ? "：" : ":"
  const title = fitMemoTitle(slide.heading, { maxWidth: MEMO_W, fontSize: TITLE.size, minPt: TITLE.minPt, lineHeight: TITLE.lineHeight, fontFamily: ctx.fonts.heading })
  const titleInk = memoText(inks.ink, inks.ground, title.fontSize)
  const last = memoBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize, "song")
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const sub = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, {
        maxWidth: MEMO_W,
        fontSize: SUB.size,
        minPt: SUB.size,
        maxLines: SUB.maxLines,
        lineHeightRatio: SUB.lineHeight / SUB.size,
        fontFamily: ctx.fonts.body,
        bold: false,
      })
    : null
  const shift = sub ? sub.lines.length * SUB.lineHeight + SUB.gap : 0
  const bullets = slide.components.find((component) => component.type === "bullets")
  const items = boundaryBulletItems(slide, ITEMS.max)
  const fitted = items.map((item) =>
    fitEmphasisText(item, {
      maxWidth: MEMO_W - ITEMS.textX,
      fontSize: ITEMS.text.size,
      minPt: ITEMS.text.minPt,
      maxLines: ITEMS.text.maxLines,
      lineHeightRatio: ITEMS.text.lineHeight / ITEMS.text.size,
      fontFamily: ctx.fonts.heading,
      bold: false,
    }),
  )
  const tops: number[] = []
  let at = ITEMS.top + shift
  for (const item of fitted) {
    tops.push(at)
    at += ITEMS.pitch + Math.max(0, item.lines.length - 1) * ITEMS.text.lineHeight
  }
  const itemsEnd = fitted.length > 0 ? at - ITEMS.pitch + ITEMS.numeral.lineHeight : RULE_Y + shift
  const fields = slide.fields ?? []
  const signTop = itemsEnd + SIGN.gap
  const values = fields.map((field) =>
    fitEmphasisText(field.value, {
      maxWidth: SIGN.value.w,
      fontSize: SIGN.value.size,
      minPt: 16,
      maxLines: 1,
      lineHeightRatio: SIGN.label.lineHeight / SIGN.value.size,
      fontFamily: ctx.fonts.heading,
      bold: false,
    }),
  )
  const stamp = slide.stamp ? fitStamp(slide.stamp, STAMP.maxW, ctx) : null
  return (
    <>
      <MemoMargin slide={slide} ctx={ctx} />
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={MEMO_LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={MEMO_LEFT} y={RULE_Y} width={MEMO_W} height={1} fill={inks.ink} />
      {sub
        ? paintMemo(sub, { ctx, x: MEMO_LEFT, top: SUB.top, face: "body", fill: memoText(inks.muted, inks.ground, SUB.size), ...(sub.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}) })
        : null}
      {bullets ? (
        <g data-memo-decisions="" {...blockTag(ctx, bullets)}>
          {fitted.map((item, i) => (
            <g key={i}>
              {paintMemoLine(memoNumeral(i, chinese), {
                ctx,
                x: MEMO_LEFT,
                top: tops[i]!,
                lineHeight: ITEMS.numeral.lineHeight,
                size: ITEMS.numeral.size,
                face: "song",
                bold: true,
                fill: memoText(inks.mark, inks.ground, ITEMS.numeral.size),
              })}
              {paintMemo(item, {
                ctx,
                x: MEMO_LEFT + ITEMS.textX,
                top: tops[i]! + ITEMS.text.top,
                face: "song",
                fill: memoText(inks.ink, inks.ground, item.fontSize),
                ...(item.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
              })}
            </g>
          ))}
        </g>
      ) : null}
      {fields.length > 0 ? (
        <g data-memo-sign="">
          <rect x={MEMO_LEFT} y={signTop - SIGN.rule.lead} width={SIGN.rule.w} height={1} fill={inks.line} />
          {fields.map((field, i) => {
            const top = signTop + i * SIGN.pitch
            const value = values[i]!
            return (
              <g key={i}>
                {paintMemoLine(`${field.label}${colon}`, { ctx, x: MEMO_LEFT, top, lineHeight: SIGN.label.lineHeight, size: SIGN.label.size, face: "mono", fill: memoMeta(inks.muted, inks.ground) })}
                {paintMemo(value, {
                  ctx,
                  x: MEMO_LEFT + SIGN.valueX,
                  top,
                  face: "song",
                  fill: memoText(inks.ink, inks.ground, SIGN.value.size),
                  ...(value.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
                })}
                {field.note?.trim()
                  ? paintMemoLine(field.note.trim(), {
                      ctx,
                      x: MEMO_LEFT + SIGN.noteX,
                      top,
                      lineHeight: SIGN.label.lineHeight,
                      size: SIGN.note.size,
                      face: "mono",
                      fill: memoMeta(inks.muted, inks.ground),
                    })
                  : null}
              </g>
            )
          })}
        </g>
      ) : null}
      {stamp ? paintStamp(stamp, STAMP.x, signTop + STAMP.gap, STAMP.angle, ctx) : slide.stamp ? <g data-dropped={1} data-dropped-kind="stamp" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-memo-ending.tsx: memo's sign-off. The section in the margin, the
  // decision over a rule of ink, its clauses numbered in the deck's numerals,
  // the sign-off lines (signed, drafted, copied to) and a stamp.
  id: "memo-ending",
  kind: "standard",
  story: {
    name: "Memo Sign-off",
    story:
      "The decision stands in a serif over a rule of ink, its clauses numbered in red underneath, and the page closes the way a typed memo does: who signed it and when, who drafted it, who it is copied to, and a stamp beside the signature.",
    positioning: "Closes a deck that records a decision. Choose it when the last page should restate what was decided and who stands behind it.",
    audience: "Staff and managers who need to know the decision is final and who to ask.",
    notFor: "Closings that thank the room or ask for discussion, which are not decisions yet.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
    { name: "body", accepts: ["bullets"], capacity: 1, itemCapacity: ITEMS.max },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker", "fields", "stamp"],
  headingFit: { maxWidth: MEMO_W, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
