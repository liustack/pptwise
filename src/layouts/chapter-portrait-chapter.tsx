import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { fitPortrait, paintPortrait, paintPortraitPhoto, portraitInks, portraitText, PortraitSection, sectionWidth } from "./compositions/portrait"
import { PortraitFooter, portraitFooterLabel, portraitSectionText, portraitSpeaker } from "./portrait-shared"
import { fitEmphasisHeading } from "../render/emphasis"
import type { HeadingCtx } from "./heading-set"

/**
 * portrait-chapter：人物专访的分节页，profile 2026-10 的语法（画布没有画
 * 分节页，照内容页的章节小字和封面的半版人像推出来）。
 *
 * 白纸。页面有 `background` 资产时右半版（x640 起）满高放这张照片，文字留
 * 在左栏（宽 500）。左栏 y260 起：章节小字（短色线加 deck `course` 里这一
 * 段的序号和名字，或页面的 `kicker`），14px 之下是这一节的题目（`heading`）
 * 衬线 56/72 粗体，一行放不下在逗号处折，至多三行（三行放不下时逐级缩到 48px，再放不下末行截断并标出），再下面是 `subheading`
 * 18px 灰。页脚和内容页同一行：标签在左，讲者的名字和页码在右。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const LEFT = 80
const PHOTO = { x: 640, y: 0, w: 640, h: 720 } as const
const SECTION_TOP = 260
const TITLE = { gap: 14, size: 56, lineHeight: 72, maxLines: 3, minPt: 48 } as const
const SUB = { gap: 16, size: 18, lineHeight: 28, maxLines: 2 } as const
const FULL_W = 1120
const COLUMN_W = 500

/** The title at 56px over up to three lines, broken at a comma where one falls, or smaller down to 48px when three lines do not hold it. */
function fitTitle(heading: string, ctx: HeadingCtx, w: number) {
  return fitEmphasisHeading(heading, { maxWidth: w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, lineHeightRatio: TITLE.lineHeight / TITLE.size, fontFamily: ctx.fonts.heading, bold: true })
}

export function PortraitChapter({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : undefined
  const w = photo ? COLUMN_W : FULL_W
  const section = portraitSectionText(ir, slide, ctx)
  const sectionFits = !section || sectionWidth(section, ctx) <= w
  const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx, w) : null
  const titleTop = SECTION_TOP + 24 + TITLE.gap
  const sub = slide.subheading?.trim() ? fitPortrait(slide.subheading, { width: w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const subTop = titleTop + (title ? title.lines.length * title.lineHeight : 0) + SUB.gap
  const footer = resolveDeckFooter(ir)
  return (
    <>
      <rect data-portrait-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? paintPortraitPhoto(photo, PHOTO, ctx, { focus: [0.5, 0.3] }) : null}
      {section && sectionFits ? <PortraitSection text={section} ctx={ctx} x={LEFT} top={SECTION_TOP} /> : null}
      {title ? <g data-portrait-chapter-title="">{paintPortrait(title, { ctx, x: LEFT, top: titleTop, serif: true, bold: true, fill: portraitText(inks.ink, ground, title.fontSize), lastAttrs: title.truncated ? { "data-truncated": "1" } : undefined })}</g> : null}
      {sub ? <g data-portrait-chapter-sub="">{paintPortrait(sub, { ctx, x: LEFT, top: subTop, fill: portraitText(inks.muted, ground, SUB.size) })}</g> : null}
      <PortraitFooter ctx={ctx} label={portraitFooterLabel(footer) || null} name={portraitSpeaker(ir)} folio={footer.pageNumber ? index + 1 : null} x1={LEFT} x2={LEFT + w} />
      {!sectionFits || (slide.subheading?.trim() && !sub) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-portrait-chapter.tsx: profile's section page. The section line
  // and the section's title large in the serif on white paper, a photograph
  // down the right half when the page has one.
  id: "portrait-chapter",
  kind: "standard",
  story: {
    name: "Portrait Chapter",
    story: "A turn of the page in a magazine profile: the short rule and the part of the talk now beginning, its title large in the serif on white paper, a photograph down the right half when there is one.",
    positioning: "Opens each part of a candidacy or a career plan. Choose it when the panel should hear that the talk has moved on, from who the speaker is to what they have done or will do.",
    audience: "A panel following one candidate through a short talk in parts.",
    notFor: "A long report with many sections, where a page this quiet between every part slows the reading.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker", "stage"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  headingFit: { maxWidth: FULL_W, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
