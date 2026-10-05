import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { exhibitCaptionLayout, paintExhibit, type ExhibitSpec } from "./compositions/exhibit"
import { fitMemoTitle, memoBaseline, memoChinese, memoInks, memoMeta, memoText, paintMemo, paintMemoLine, paintTracked } from "./compositions/memo"
import { fitStamp, paintStamp } from "./compositions/stamp"
import { blockTag } from "./compositions/shared"
import { exhibitNumberAt } from "./memo-shared"

/**
 * memo-cover：打字机备忘录的封面，memo 2026-10 定稿（p01）重画。
 *
 * 左上一行拉开字距的等宽 MEMORANDUM（印章红），下面一道红双线（2px 加
 * 1px，x64→1216）。双线下是公文抬头：页面的 `fields` 一行一栏，等宽灰字
 * 的「致：」「发：」「日期：」「事由：」，后面是正文字的值，最多四栏，下面
 * 一条细线。标题是宋体粗体 60/80，左栏 720 宽，放得下就一行，放不下折两
 * 行，中文在逗号处断，底对齐在 y490。标题下 64×3 一段红色短条，再下面是
 * 副题（`subheading`）20px 灰字。
 *
 * 右边是贴在纸上的附图 1：页面的 `image` 组件，白边、微微右倾、带投影，
 * 下边打字机写着「附图 1 · 说明」（`compositions/exhibit.tsx`）。附图下方
 * 盖一枚印章：页面的 `stamp`，红框宋体「已决定」，下面一行等宽日期，左倾
 * 八度，半透明（`compositions/stamp.tsx`）。
 *
 * 没有附图时右边留白，没有抬头时双线下直接是标题区。不画 motif：封面自己
 * 带公文头。零 theme id、零 hex。
 */

const EYEBROW = { top: 64, size: 14, lineHeight: 22, tracking: 8 } as const
const RULES = { thick: { y: 92, h: 2 }, thin: { y: 97, h: 1 } } as const
const LEFT = 64
const RIGHT = 1216
const FIELDS = { top: 124, pitch: 34, label: { size: 15, lineHeight: 26 }, valueX: 150, value: { w: 560, size: 17, lineHeight: 26 }, rule: { gap: 10, w: 680 } } as const
const TITLE = { foot: 490, size: 60, lineHeight: 80, minPt: 44, maxLines: 2, w: 720 } as const
const BAR = { y: 510, w: 64, h: 3 } as const
const SUB = { top: 530, size: 20, lineHeight: 30, maxLines: 2, w: 680 } as const
const EXHIBIT = { x: 800, y: 150, w: 400, h: 330 } as const
const STAMP = { x: 830, y: 520, angle: -8, maxW: 380 } as const

export function MemoCover({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = memoInks(ctx)
  const chinese = memoChinese(ctx)
  const colon = chinese ? "：" : ":"
  const fields = slide.fields ?? []
  // A value too long for its line shrinks toward 16px and is then cut with
  // `data-truncated`, the way a heading is.
  const values = fields.map((field) =>
    fitEmphasisText(field.note?.trim() ? `${field.value}\u3000${field.note}` : field.value, {
      maxWidth: FIELDS.value.w,
      fontSize: FIELDS.value.size,
      minPt: 16,
      maxLines: 1,
      lineHeightRatio: FIELDS.value.lineHeight / FIELDS.value.size,
      fontFamily: ctx.fonts.body,
      bold: false,
    }),
  )
  const title = fitMemoTitle(slide.heading, { maxWidth: TITLE.w, fontSize: TITLE.size, minPt: TITLE.minPt, lineHeight: TITLE.lineHeight, fontFamily: ctx.fonts.heading })
  const titleInk = memoText(inks.ink, inks.ground, title.fontSize)
  const last = memoBaseline(TITLE.foot - title.lineHeight, title.lineHeight, title.fontSize, "song")
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const sub = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, {
        maxWidth: SUB.w,
        fontSize: SUB.size,
        minPt: SUB.size,
        maxLines: SUB.maxLines,
        lineHeightRatio: SUB.lineHeight / SUB.size,
        fontFamily: ctx.fonts.body,
        bold: false,
      })
    : null
  const subInk = memoText(inks.muted, inks.ground, SUB.size)
  const image = slide.components.find((component) => component.type === "image")
  const exhibit: ExhibitSpec | null =
    image?.type === "image"
      ? { box: EXHIBIT, number: exhibitNumberAt(ir, index), caption: image.caption, src: ctx.images?.[image.asset_id]?.src, alt: ctx.images?.[image.asset_id]?.alt, fit: image.fit }
      : null
  const caption = exhibit ? exhibitCaptionLayout(exhibit, ctx, { cut: true }) : null
  const stamp = slide.stamp ? fitStamp(slide.stamp, STAMP.maxW, ctx) : null
  return (
    <>
      {paintTracked({
        ctx,
        text: "MEMORANDUM",
        x: LEFT,
        y: memoBaseline(EYEBROW.top, EYEBROW.lineHeight, EYEBROW.size, "mono"),
        size: EYEBROW.size,
        face: "mono",
        tracking: EYEBROW.tracking,
        fill: memoText(inks.mark, inks.ground, EYEBROW.size),
        bold: true,
      })}
      <rect x={LEFT} y={RULES.thick.y} width={RIGHT - LEFT} height={RULES.thick.h} fill={inks.mark} />
      <rect x={LEFT} y={RULES.thin.y} width={RIGHT - LEFT} height={RULES.thin.h} fill={inks.mark} />
      {fields.length > 0 ? (
        <g data-memo-fields="">
          {fields.map((field, i) => {
            const top = FIELDS.top + i * FIELDS.pitch
            const value = values[i]
            return (
              <g key={i}>
                {paintMemoLine(`${field.label}${colon}`, { ctx, x: LEFT, top, lineHeight: FIELDS.label.lineHeight, size: FIELDS.label.size, face: "mono", fill: memoMeta(inks.muted, inks.ground) })}
                {paintMemo(value!, {
                  ctx,
                  x: FIELDS.valueX,
                  top,
                  face: "body",
                  fill: memoText(inks.ink, inks.ground, FIELDS.value.size),
                  ...(value!.truncated ? { lastAttrs: { "data-truncated": "1" } } : {}),
                })}
              </g>
            )
          })}
          <rect x={LEFT} y={FIELDS.top + fields.length * FIELDS.pitch + FIELDS.rule.gap} width={FIELDS.rule.w} height={1} fill={inks.line} />
        </g>
      ) : null}
      {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true }), (_line, i) => (
        <text
          key={i}
          data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
          x={LEFT}
          y={first + i * title.lineHeight}
          fontFamily={ctx.fonts.heading}
          fontSize={title.fontSize}
          fontWeight="700"
          fill={titleInk}
          dominantBaseline="alphabetic"
        />
      ))}
      <rect x={LEFT} y={BAR.y} width={BAR.w} height={BAR.h} fill={inks.mark} />
      {sub
        ? renderEmphasisHeading(sub, headingEmphasisPaint(ctx, sub, { baseFill: subInk, fontWeight: "700", fontFamily: ctx.fonts.body, bold: false }), (_line, i) => (
            <text
              key={i}
              data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
              x={LEFT}
              y={memoBaseline(SUB.top + i * SUB.lineHeight, SUB.lineHeight, sub.fontSize, "body")}
              fontFamily={ctx.fonts.body}
              fontSize={sub.fontSize}
              fill={subInk}
              dominantBaseline="alphabetic"
            />
          ))
        : null}
      {exhibit && caption && image ? <g {...blockTag(ctx, image)}>{paintExhibit(exhibit, caption, ctx)}</g> : null}
      {stamp ? paintStamp(stamp, STAMP.x, STAMP.y, STAMP.angle, ctx) : slide.stamp ? <g data-dropped={1} data-dropped-kind="stamp" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-memo-cover.tsx: memo's typed cover. MEMORANDUM over a red double
  // rule, the header lines (To, From, Date, Re), the title in a serif, a red
  // bar and the subtitle, a photograph pasted in as exhibit 1, a stamp.
  id: "memo-cover",
  kind: "standard",
  story: {
    name: "Memo Cover",
    story:
      "A spaced MEMORANDUM heads the page over a red double rule, the header lines say who it is to, from, when and about what, and the title stands in a serif. A photograph is pasted in like an attachment, and a stamp says it is settled.",
    positioning: "Opens a deck that is a decision written down. Choose it when the reader should know at a glance who decided what, for whom, and that it is decided.",
    audience: "Staff and managers who receive the memo and read it on their own.",
    notFor: "Openings that should build up to a reveal, or carry a full-bleed picture, which want a stage rather than a document.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["fields", "stamp"],
  suppressMotif: true,
  coverMark: { x: LEFT, y: 50 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
