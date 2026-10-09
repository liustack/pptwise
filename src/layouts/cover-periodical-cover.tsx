import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { fitMemoTitle } from "./compositions/memo"
import {
  cjkOnly,
  fitPeriodical,
  paintPeriodical,
  paintPeriodicalTracked,
  periodicalBaseline,
  periodicalInks,
  periodicalMeta,
  periodicalText,
  periodicalTrackedWidth,
} from "./compositions/periodical"
import { PERIODICAL_LEFT } from "./periodical-shared"
import { cutOrWhole, type HeadingCtx } from "./heading-set"

/**
 * periodical-cover：期刊的封面，journal 2026-10 定稿（p01）。
 *
 * 左边是一本小刊物的封面：顶上一粗一细两条线（y64、y70，到 x576），下面是
 * 刊头，取 deck 的 `meta.organization`（「致读者」），96px 衬线特粗、字距
 * 8px，放不下就缩到放下为止；刊头下一行 13px 灰字是期号（页面的 `kicker`，
 * 「二〇二六年秋 · 一封写给订阅读者的年度长信」，作者写），再一条细线
 * （y236）。封面故事是页面的标题，50px 衬线特粗赭红，一行放不下先缩、再在
 * 逗号或冒号处折成两行；下面一行 17px 衬线是导语（`subheading`）。再往下是
 * 封面要目（页面的 `fields`，最多四条）：每条左边 22px 衬线赭红的页码（字段
 * 名，作者写，「03」），右边 16px 衬线的要目（字段值），条下一条发丝线。左下
 * 角是页面的 `footnote`（「封面图为 AI 生成的示意图」）。右边 660 宽满高一张
 * 照片（页面自己的 `background` 资产）。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const RULES = { heavy: { y: 64, w: 2.4 }, hair: { y: 70, w: 0.6 }, under: { y: 236, w: 0.6 }, right: 576 } as const
const MAST = { top: 84, lineHeight: 110, size: 96, minSize: 28, tracking: { cjk: 8, latin: 2 } } as const
const ISSUE = { top: 198, lineHeight: 22, size: 13, tracking: { cjk: 3, latin: 1 } } as const
const STORY = { top: 272, w: 540, size: 50, minSize: 40, lineHeight: 64, twoLineHeight: 52 } as const
const DEK = { gap: 4, w: 520, size: 17, lineHeight: 26, maxLines: 2 } as const
const LINES = { top: 410, after: 44, pitch: 46, rule: 38, label: { dy: 4, w: 60, size: 22, h: 30 }, value: { x: 124, dy: 6, w: 452, size: 16, h: 28 }, bottom: 640, max: 4 } as const
const NOTE = { top: 648, size: 11, lineHeight: 20, w: 520 } as const
const PHOTO = { x: 620 } as const

/** The masthead's size: 96px, or smaller until the name fits the cover's column. */
function mastheadSize(width: number, measure: (size: number) => number): number {
  for (let size: number = MAST.size; size >= MAST.minSize; size -= 2) if (measure(size) <= width) return size
  return 0
}

/** The cover story on one line, smaller, then broken at a comma or a colon over two. */
function fitStory(heading: string | undefined, ctx: HeadingCtx): EmphasisHeadingLayout {
  const one = fitMemoTitle(heading, { maxWidth: STORY.w, fontSize: STORY.size, minPt: STORY.minSize, lineHeight: STORY.lineHeight, fontFamily: ctx.fonts.heading })
  return one.lines.length <= 1 ? one : { ...fitMemoTitle(heading, { maxWidth: STORY.w, fontSize: STORY.minSize, minPt: STORY.minSize, lineHeight: STORY.twoLineHeight, fontFamily: ctx.fonts.heading }) }
}

export function PeriodicalCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  const width = RULES.right - PERIODICAL_LEFT
  // The masthead: the deck's own name, as large as the column lets it be.
  const name = stripEmphasis(ir.meta.organization ?? "").trim()
  const nameTracking = cjkOnly(name) ? MAST.tracking.cjk : MAST.tracking.latin
  const nameSize = name ? mastheadSize(width, (size) => periodicalTrackedWidth(name, size, nameTracking, ctx, { serif: true, bold: true })) : 0
  const issue = slide.kicker ? stripEmphasis(slide.kicker).trim() : ""
  const issueTracking = cjkOnly(issue) ? ISSUE.tracking.cjk : ISSUE.tracking.latin
  const issueFits = !issue || periodicalTrackedWidth(issue, ISSUE.size, issueTracking, ctx) <= width
  const story = fitStory(slide.heading, ctx)
  const storyBottom = STORY.top + story.lines.length * story.lineHeight
  const dek = slide.subheading?.trim() ? fitPeriodical(slide.subheading, { width: DEK.w, size: DEK.size, lineHeight: DEK.lineHeight, maxLines: DEK.maxLines, serif: true }, ctx) : null
  const dekTop = storyBottom + DEK.gap
  const dekBottom = dek ? dekTop + dek.lines.length * DEK.lineHeight : storyBottom
  // The cover lines: as many as stand over the foot, the rest declared.
  const linesTop = Math.max(LINES.top, dekBottom + LINES.after)
  const room = Math.max(0, Math.floor((LINES.bottom - linesTop + (LINES.pitch - LINES.rule)) / LINES.pitch))
  const fields = (slide.fields ?? []).slice(0, Math.min(LINES.max, room))
  const lines = fields.map((f) => ({
    label: fitPeriodical(f.label, { width: LINES.label.w, size: LINES.label.size, lineHeight: LINES.label.h, maxLines: 1, serif: true, bold: true }, ctx),
    value: fitPeriodical(f.note?.trim() ? `${f.value.trim()} ${f.note.trim()}` : f.value, { width: LINES.value.w, size: LINES.value.size, lineHeight: LINES.value.h, maxLines: 1, serif: true }, ctx),
  }))
  const droppedLines = (slide.fields?.length ?? 0) - fields.length + lines.filter((l) => !l.label || !l.value).length
  const note = slide.footnote?.trim() ? fitPeriodical(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  const storyInk = periodicalText(inks.brick, ground, story.fontSize)
  return (
    <>
      <rect data-periodical-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo?.src ? <image data-periodical-cover-photo="" href={photo.src} x={PHOTO.x} y={0} width={1280 - PHOTO.x} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} /> : null}
      <rect x={PERIODICAL_LEFT} y={RULES.heavy.y - RULES.heavy.w / 2} width={width} height={RULES.heavy.w} fill={inks.lead} />
      <rect x={PERIODICAL_LEFT} y={RULES.hair.y - RULES.hair.w / 2} width={width} height={RULES.hair.w} fill={inks.lead} />
      {name ? (
        nameSize > 0 ? (
          <g data-periodical-masthead="">
            {paintPeriodicalTracked({ ctx, text: name, x: PERIODICAL_LEFT, y: periodicalBaseline(MAST.top, MAST.lineHeight, nameSize, true), size: nameSize, tracking: nameTracking, serif: true, bold: true, weight: "800", fill: periodicalText(inks.lead, ground, nameSize) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {issue ? (
        issueFits ? (
          <g data-periodical-issue="">
            {paintPeriodicalTracked({ ctx, text: issue, x: PERIODICAL_LEFT, y: periodicalBaseline(ISSUE.top, ISSUE.lineHeight, ISSUE.size), size: ISSUE.size, tracking: issueTracking, fill: periodicalText(inks.muted, ground, ISSUE.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <rect x={PERIODICAL_LEFT} y={RULES.under.y - RULES.under.w / 2} width={width} height={RULES.under.w} fill={inks.lead} />
      <g data-periodical-story="">
        {story.lines.map((line, i) => (
          <text
            key={i}
            data-truncated={story.truncated && i === story.lines.length - 1 ? "1" : undefined}
            x={PERIODICAL_LEFT}
            y={periodicalBaseline(STORY.top + i * story.lineHeight, story.lineHeight, story.fontSize, true)}
            fontFamily={ctx.fonts.heading}
            fontSize={story.fontSize}
            fontWeight="800"
            fill={storyInk}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}
      </g>
      {dek ? <g data-periodical-dek="">{paintPeriodical(dek, { ctx, x: PERIODICAL_LEFT, top: dekTop, serif: true, fill: periodicalText(inks.ink, ground, DEK.size) })}</g> : null}
      {slide.subheading?.trim() && !dek ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {lines.length > 0 ? (
        <g data-periodical-cover-lines="">
          {lines.map((line, i) => {
            const top = linesTop + i * LINES.pitch
            return (
              <g key={i} data-periodical-cover-line={fields[i]!.label}>
                <rect x={PERIODICAL_LEFT} y={top + LINES.rule - 0.5} width={width} height={1} fill={inks.line} />
                {line.label ? paintPeriodical(line.label, { ctx, x: PERIODICAL_LEFT, top: top + LINES.label.dy, serif: true, bold: true, fill: periodicalText(inks.brick, ground, LINES.label.size) }) : null}
                {line.value ? paintPeriodical(line.value, { ctx, x: LINES.value.x, top: top + LINES.value.dy, serif: true, fill: periodicalText(inks.ink, ground, LINES.value.size) }) : null}
              </g>
            )
          })}
        </g>
      ) : null}
      {droppedLines > 0 ? <g data-dropped={droppedLines} data-dropped-kind="label" /> : null}
      {note ? <g data-periodical-cover-note="">{paintPeriodical(note, { ctx, x: PERIODICAL_LEFT, top: NOTE.top, fill: periodicalMeta(inks.muted, ground) })}</g> : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-periodical-cover.tsx: journal's cover. A small magazine's cover at
  // the left, the masthead over its issue line, the cover story in the
  // accent, the cover lines with their pages, the page's photograph down the
  // right 660px.
  id: "periodical-cover",
  kind: "standard",
  story: {
    name: "Periodical Cover",
    story: "A small magazine's cover beside a photograph: the masthead set large under a heavy rule and a hairline, the issue under it, the cover story in red, and the cover lines with the pages they point to.",
    positioning: "Opens a letter to subscribers, an annual issue or a long read. Choose it when the first page should read as the cover of the publication speaking.",
    audience: "Readers who know the publication and open it to see what this issue holds.",
    notFor: "A board report or a pitch, where a masthead and cover lines would read as a costume.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker", "fields", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  // Over the masthead's rules, in the cover's left column.
  coverMark: { x: PERIODICAL_LEFT, y: 44 },
  headingFit: { maxWidth: STORY.w, fontSize: STORY.size, maxLines: 2, minPt: STORY.minSize, bold: true, lineHeightRatio: STORY.lineHeight / STORY.size },
  headingSet: ({ slide, ctx }) => cutOrWhole(fitStory(slide.heading, ctx)),
} satisfies LayoutDefinition
