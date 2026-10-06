import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { PitchScrim } from "./compositions/pitch"
import {
  fitManuscript,
  manuscriptBaseline,
  manuscriptChinese,
  manuscriptInks,
  manuscriptMeta,
  manuscriptText,
  manuscriptTrackedWidth,
  paintManuscript,
  paintManuscriptLine,
  paintManuscriptTracked,
} from "./compositions/manuscript"
import { MANUSCRIPT_LEFT, ManuscriptTitle, fitManuscriptTitle, manuscriptSection, sectionPages } from "./manuscript-shared"

/**
 * manuscript-chapter：开题报告的章节页，thesis 2026-10 定稿（p07）。
 *
 * 满版照片（页面自己的 `background` 资产），从左往右压一层象牙纸色的渐变
 * （97% → 48% 处 93% → 78% 处 35% → 右缘 5%）。左上一行 deck 的标签
 * （`footer.label`），13px 灰色粗体、字距 4px。下面 120px 衬线祖母绿的分节号
 * 「§2」（页面的 `stage` 在 deck 的 `course` 里排第几，没有 course 时按章节页
 * 出现的次序数），标题 44/60 衬线粗体墨色，一行放得下就一行，副题 18/30 灰
 * （页面的 `subheading`）。再下面一条学者金细线和全片目录：`course` 的每一段
 * 一行，分节号和段名 17/30 衬线，右边 13px 写这一段内容页的页码范围（「第
 * 8-11 页」），当前这一段祖母绿、段名加粗，左边一根 4px 宽的金色小条，其余
 * 几段灰色。左下角是页面的 `footnote`（「图为 AI 生成的示意图」）。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LABEL = { top: 64, lineHeight: 20, size: 13, tracking: 4 } as const
const NUMBER = { top: 150, size: 120, lineHeight: 130 } as const
const TITLE = { top: 296, size: 44, lineHeight: 60, minPt: 32, w: 760 } as const
const SUB = { top: 360, size: 18, lineHeight: 30, w: 700 } as const
const TOC = { rule: { y: 430, right: 640 }, top: 442, pitch: 40, h: 30, number: { w: 60, size: 17 }, name: { x: 124, size: 17, w: 400 }, pages: { right: 640, size: 13 }, mark: { x: 50, dy: 6, w: 4, h: 18 }, floor: 630 } as const
const CAPTION = { top: 640, size: 11, lineHeight: 20, w: 600 } as const
const SCRIM = [
  { offset: "0%", opacity: 0.97 },
  { offset: "48%", opacity: 0.93 },
  { offset: "78%", opacity: 0.35 },
  { offset: "100%", opacity: 0.05 },
] as const

/** The chapter's number: its stage's place in the course, or how many chapter pages run up to this one. */
function chapterNumber(ir: SvgTemplateProps["ir"], slide: SvgTemplateProps["slide"], index: number): number {
  const section = manuscriptSection(ir, slide)
  if (section) return section.n
  return Math.max(1, ir.slides.slice(0, index + 1).filter((s) => s.type === "chapter").length)
}

/**
 * The section mark as the heading serif sets it: the board's Songti drew 「§」
 * a full em wide, so the number stands a thin space after the narrower Latin
 * mark the export's Times New Roman draws.
 */
function sectionMark(n: number): string {
  return `§\u2009${n}`
}

/** The pages a section runs over, as the contents print them: 「第 8-11 页」 or "pp. 8-11". */
function pageWords(range: { first: number; last: number }, chinese: boolean): string {
  const span = range.first === range.last ? `${range.first}` : `${range.first}-${range.last}`
  if (chinese) return `第 ${span} 页`
  return range.first === range.last ? `p. ${span}` : `pp. ${span}`
}

export function ManuscriptChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = manuscriptInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset"
  const label = resolveDeckFooter(ir).label
  const labelFits = label !== null && manuscriptTrackedWidth(label, LABEL.size, LABEL.tracking, ctx, { bold: true }) <= TITLE.w
  const chinese = manuscriptChinese(ctx, [slide.heading ?? ""])
  const n = chapterNumber(ir, slide, index)
  const title = fitManuscriptTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  // A title on two lines keeps its first line where a one-line title stands and moves what follows down a line.
  const drop = Math.max(0, title.lines.length - 1) * TITLE.lineHeight
  const sub = slide.subheading?.trim() ? fitManuscript(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: 1 }, ctx) : null
  const section = manuscriptSection(ir, slide)
  const stages = ir.course?.stages ?? []
  const room = Math.max(0, Math.floor((TOC.floor - TOC.top - drop - TOC.h) / TOC.pitch) + 1)
  const rows = stages.slice(0, room)
  const caption = slide.footnote?.trim() ? fitManuscript(slide.footnote, { width: CAPTION.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  return (
    <>
      {photo ? <PitchScrim id={`manuscript-chapter-scrim-${index}`} ink={ground} axis="x" stops={SCRIM} /> : null}
      {label ? (
        labelFits ? (
          <g data-manuscript-label="">
            {paintManuscriptTracked({ ctx, text: label, x: MANUSCRIPT_LEFT, y: manuscriptBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: manuscriptText(inks.muted, ground, LABEL.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <g data-manuscript-section={n}>
        {paintManuscriptLine(sectionMark(n), { ctx, x: MANUSCRIPT_LEFT, top: NUMBER.top, lineHeight: NUMBER.lineHeight, size: NUMBER.size, serif: true, bold: true, fill: manuscriptText(inks.deep, ground, NUMBER.size) })}
      </g>
      <ManuscriptTitle heading={slide.heading} ctx={ctx} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} width={TITLE.w} top={TITLE.top} />
      {sub ? <g data-manuscript-chapter-sub="">{paintManuscript(sub, { ctx, x: MANUSCRIPT_LEFT, top: SUB.top + drop, fill: manuscriptText(inks.muted, ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {rows.length > 0 ? (
        <g data-manuscript-contents="">
          <rect x={MANUSCRIPT_LEFT} y={TOC.rule.y + drop} width={TOC.rule.right - MANUSCRIPT_LEFT} height={1} fill={inks.gold} />
          {rows.map((stage, i) => {
            const top = TOC.top + drop + i * TOC.pitch
            const current = section !== null && section.n === i + 1
            const range = sectionPages(ir, stage.label)
            const tone = current ? inks.deep : inks.muted
            const name = fitManuscript(stage.label, { width: TOC.name.w, size: TOC.name.size, lineHeight: TOC.h, maxLines: 1, serif: true, bold: current }, ctx)
            return (
              <g key={i} data-manuscript-contents-row={stage.label.trim()} data-current={current ? "1" : undefined}>
                {current ? <rect data-manuscript-gold="" x={TOC.mark.x} y={top + TOC.mark.dy} width={TOC.mark.w} height={TOC.mark.h} fill={inks.gold} /> : null}
                {paintManuscriptLine(sectionMark(i + 1), { ctx, x: MANUSCRIPT_LEFT, top, lineHeight: TOC.h, size: TOC.number.size, serif: true, bold: true, fill: manuscriptText(tone, ground, TOC.number.size) })}
                {name ? paintManuscript(name, { ctx, x: TOC.name.x, top, serif: true, bold: current, fill: manuscriptText(current ? inks.ink : inks.muted, ground, TOC.name.size) }) : <g data-dropped={1} data-dropped-kind="label" />}
                {range ? paintManuscriptLine(pageWords(range, chinese), { ctx, x: TOC.pages.right, top, lineHeight: TOC.h, size: TOC.pages.size, anchor: "end", fill: manuscriptText(tone, ground, TOC.pages.size) }) : null}
              </g>
            )
          })}
          {stages.length > rows.length ? <g data-dropped={stages.length - rows.length} data-dropped-kind="label" /> : null}
        </g>
      ) : null}
      {caption ? <g data-manuscript-caption="">{paintManuscript(caption, { ctx, x: MANUSCRIPT_LEFT, top: CAPTION.top, fill: manuscriptMeta(inks.muted, ground) })}</g> : null}
      {slide.footnote?.trim() && !caption ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-manuscript-chapter.tsx: thesis's chapter page. The page's
  // photograph under ivory from the left, the section's number huge in
  // emerald, the title, the line under it and the deck's contents with the
  // section lit and each section's pages.
  id: "manuscript-chapter",
  kind: "standard",
  story: {
    name: "Manuscript Chapter",
    story: "A section of a thesis over the page's photograph, ivory paper laid over it from the left: the section's number huge in emerald, its title, and the contents of the whole talk with this section lit and the pages each one runs over.",
    positioning: "Opens a section of a proposal, a defense or a long report. Choose it when the room should see where the talk stands as a whole before the next part begins.",
    audience: "A committee following a long argument part by part.",
    notFor: "A pitch's act or a campaign's section, where a table of contents slows the page down.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["stage", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
