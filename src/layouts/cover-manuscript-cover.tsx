import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import {
  fitManuscript,
  manuscriptBaseline,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  manuscriptTrackedWidth,
  manuscriptWidth,
  paintManuscript,
  paintManuscriptTracked,
} from "./compositions/manuscript"
import { fitManuscriptTitle, MANUSCRIPT_LEFT } from "./manuscript-shared"
import { cutOrWhole, type HeadingCtx } from "./heading-set"

/**
 * manuscript-cover：开题报告的题名页，thesis 2026-10 定稿（p01）。
 *
 * 左边是一张题名页：左上一行 deck 的标签（`footer.label`，「硕士学位论文开题
 * 报告」），13px 灰色粗体、字距 4px，下面一条学者金细线到 x760。题目 40/60
 * 衬线粗体祖母绿，从 y190 起，作者在标题里写的换行就是折行处（「渐进式延迟
 * 法定退休年龄」换行「对 50 至 60 岁……」），没写换行时一行放得下就一行、放不
 * 下在逗号或冒号处断。题目下一条 60px 宽、3px 粗的金线（y352）。页面有
 * `subheading` 时，副题排在题目下、金线上方，用字段值那一级的 17/30 衬线粗体
 * 墨色，最多两行，金线和 fields 按需整体下移，副题下到金线至少留出两行题目下
 * 的 42px。下移后 fields 压到页脚说明上方的底线，就少排一行副题，一行也放不下
 * 就声明丢弃（`data-dropped`），不截半句。再下面是页面的 `fields`，最多四行：字段名 15/30 灰色粗体、字距 2px，中文字段名按最长
 * 的一个分散对齐（「日  期」），字段值 17/30 衬线粗体墨色，值下一条发丝线。
 * 左下角是页面的 `footnote`（「图为 AI 生成的示意图」）。右边 460 宽满高一张
 * 照片（页面自己的 `background` 资产）。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LABEL = { top: 64, lineHeight: 20, size: 13, tracking: 4 } as const
const TOP_RULE = { y: 96, right: 760 } as const
const TITLE = { top: 190, size: 40, lineHeight: 60, minPt: 30, w: 720, maxLines: 3 } as const
const SHORT_RULE = { y: 352, w: 60, h: 3 } as const
const FIELDS = { top: 400, pitch: 46, h: 30, label: { size: 15, tracking: 2, w: 120 }, value: { x: 196, size: 17, w: 404 }, rule: { dy: 34, right: 600 }, max: 4 } as const
const CAPTION = { top: 640, size: 11, lineHeight: 20, w: 600 } as const
/**
 * The subtitle under the title, in the fields' value type. `gap` is the air
 * under the title's last line box, `ruleGap` the room a two-line title
 * leaves over the gold rule (352 under 310), kept under the subtitle.
 */
const SUBTITLE = { gap: 8, size: 17, lineHeight: 30, maxLines: 2, ruleGap: 42 } as const
/** The lowest a field's hairline may sit once the subtitle moves the fields down: 24px over the caption's box. */
const FIELDS_FLOOR = CAPTION.top - 24
const PHOTO = { x: 820 } as const

/**
 * The subtitle set whole under the title, and how far it moves the gold rule
 * and the fields down: two lines, or one, whichever keeps the last field's
 * hairline over `FIELDS_FLOOR`. `null` when neither does.
 */
function placeSubtitle(text: string, titleBottom: number, rows: number, ctx: SvgTemplateProps["ctx"]) {
  const top = titleBottom + SUBTITLE.gap
  const lastRule = rows > 0 ? FIELDS.top + (rows - 1) * FIELDS.pitch + FIELDS.rule.dy : null
  for (let lines = SUBTITLE.maxLines; lines >= 1; lines--) {
    const layout = fitManuscript(text, { width: TITLE.w, size: SUBTITLE.size, lineHeight: SUBTITLE.lineHeight, maxLines: lines, serif: true, bold: true }, ctx)
    if (!layout) continue
    const shift = Math.max(0, top + layout.lines.length * SUBTITLE.lineHeight + SUBTITLE.ruleGap - SHORT_RULE.y)
    if (lastRule === null || lastRule + shift <= FIELDS_FLOOR) return { layout, top, shift }
  }
  return null
}

/** Whether a label is all Chinese, so it can be spread to the width of the longest. */
function cjkLabel(text: string): boolean {
  return /^[㐀-鿿豈-﫿]+$/u.test(text)
}

/** The title: the author's own line breaks first, up to three lines; a line too long for the measure is then set as one fitted title over two. */
function fitTitle(heading: string | undefined, ctx: HeadingCtx): { lines: string[]; fontSize: number; lineHeight: number; truncated: boolean } {
  const plain = stripEmphasis(heading ?? "").trim()
  const authored = plain.split(/\n+/).map((line) => line.trim()).filter(Boolean)
  const authoredFit = authored.length > 1 && authored.length <= TITLE.maxLines && authored.every((line) => manuscriptWidth(line, TITLE.size, ctx, { serif: true, bold: true }) <= TITLE.w)
  return authoredFit ? { lines: authored, fontSize: TITLE.size, lineHeight: TITLE.lineHeight, truncated: false } : fitManuscriptTitle(authored.join(""), ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
}

export function ManuscriptCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  const label = resolveDeckFooter(ir).label
  const labelFits = label !== null && manuscriptTrackedWidth(label, LABEL.size, LABEL.tracking, ctx, { bold: true }) <= TOP_RULE.right - MANUSCRIPT_LEFT
  const title = fitTitle(slide.heading, ctx)
  const titleInk = manuscriptText(inks.deep, ground, title.fontSize)
  const fields = (slide.fields ?? []).slice(0, FIELDS.max)
  const subtitleText = slide.subheading?.trim() ? slide.subheading : null
  const subtitle = subtitleText ? placeSubtitle(subtitleText, TITLE.top + title.lines.length * title.lineHeight, fields.length, ctx) : null
  const shift = subtitle?.shift ?? 0
  const labelWidths = fields.map((f) => manuscriptTrackedWidth(f.label.trim(), FIELDS.label.size, FIELDS.label.tracking, ctx, { bold: true }))
  const spread = Math.max(0, ...labelWidths)
  const allCjk = fields.length > 0 && fields.every((f) => cjkLabel(f.label.trim()))
  const values = fields.map((f) => fitManuscript(f.note?.trim() ? `${f.value.trim()} ${f.note.trim()}` : f.value, { width: FIELDS.value.w, size: FIELDS.value.size, lineHeight: FIELDS.h, maxLines: 1, serif: true, bold: true }, ctx))
  const caption = slide.footnote?.trim() ? fitManuscript(slide.footnote, { width: CAPTION.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  return (
    <>
      <rect data-manuscript-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo?.src ? <image data-manuscript-cover-photo="" href={photo.src} x={PHOTO.x} y={0} width={1280 - PHOTO.x} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} /> : null}
      {label ? (
        labelFits ? (
          <g data-manuscript-label="">
            {paintManuscriptTracked({ ctx, text: label, x: MANUSCRIPT_LEFT, y: manuscriptBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: manuscriptText(inks.muted, ground, LABEL.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <rect data-manuscript-rule="" x={MANUSCRIPT_LEFT} y={TOP_RULE.y} width={TOP_RULE.right - MANUSCRIPT_LEFT} height={1} fill={inks.gold} />
      <g data-manuscript-title="">
        {title.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={MANUSCRIPT_LEFT}
            y={manuscriptBaseline(TITLE.top + i * title.lineHeight, title.lineHeight, title.fontSize, true)}
            fontFamily={ctx.fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
      </g>
      {subtitle ? <g data-manuscript-subtitle="">{paintManuscript(subtitle.layout, { ctx, x: MANUSCRIPT_LEFT, top: subtitle.top, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, SUBTITLE.size) })}</g> : null}
      {subtitleText && !subtitle ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <rect data-manuscript-gold="" x={MANUSCRIPT_LEFT} y={SHORT_RULE.y + shift - SHORT_RULE.h / 2} width={SHORT_RULE.w} height={SHORT_RULE.h} fill={inks.gold} />
      {fields.length > 0 ? (
        <g data-manuscript-fields="">
          {fields.map((f, i) => {
            const top = FIELDS.top + shift + i * FIELDS.pitch
            const name = f.label.trim()
            const chars = Array.from(name).length
            // A shorter Chinese name is spread to the longest one's width, as a form sets 「日  期」.
            const tracking = allCjk && chars > 1 ? (spread - manuscriptWidth(name, FIELDS.label.size, ctx, { bold: true })) / (chars - 1) : FIELDS.label.tracking
            const value = values[i]
            return (
              <g key={i} data-manuscript-field={name}>
                {paintManuscriptTracked({ ctx, text: name, x: MANUSCRIPT_LEFT, y: manuscriptBaseline(top, FIELDS.h, FIELDS.label.size), size: FIELDS.label.size, tracking, bold: true, fill: manuscriptText(inks.muted, ground, FIELDS.label.size) })}
                {value ? paintManuscript(value, { ctx, x: FIELDS.value.x, top, serif: true, bold: true, fill: manuscriptText(inks.ink, ground, FIELDS.value.size) }) : <g data-dropped={1} data-dropped-kind="label" />}
                <rect x={FIELDS.value.x} y={top + FIELDS.rule.dy} width={FIELDS.rule.right - FIELDS.value.x} height={1} fill={inks.line} />
              </g>
            )
          })}
          {(slide.fields?.length ?? 0) > FIELDS.max ? <g data-dropped={(slide.fields?.length ?? 0) - FIELDS.max} data-dropped-kind="label" /> : null}
        </g>
      ) : null}
      {caption ? <g data-manuscript-caption="">{paintManuscript(caption, { ctx, x: MANUSCRIPT_LEFT, top: CAPTION.top, fill: manuscriptMeta(inks.muted, ground) })}</g> : null}
      {slide.footnote?.trim() && !caption ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-manuscript-cover.tsx: thesis's cover. A title page at the left,
  // the deck's label over a gold rule, the title in emerald as the author
  // broke it, a short gold rule and the report's fields, with the page's
  // photograph down the right 460px.
  id: "manuscript-cover",
  kind: "standard",
  story: {
    name: "Manuscript Cover",
    story: "A thesis title page beside a photograph: the deck's label over a gold rule, the title in emerald broken where the author broke it, a short gold rule, and the report's fields on ruled lines.",
    positioning: "Opens a thesis proposal, a defense or a research report. Choose it when the first page should read as the title page of a paper.",
    audience: "A committee or a room of peers opening a piece of research.",
    notFor: "A pitch or a client proposal, where a title page of ruled fields reads as paperwork.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["fields", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  // Over the deck's label, in the page's left column.
  coverMark: { x: MANUSCRIPT_LEFT, y: 44 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => cutOrWhole(fitTitle(slide.heading, ctx)),
} satisfies LayoutDefinition
