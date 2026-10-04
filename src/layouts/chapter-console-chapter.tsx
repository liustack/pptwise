import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { consoleInks } from "./compositions/console"
import { chapterContents, drawContents } from "./compositions/contents"
import { centredBaseline } from "./compositions/type"
import { CONSOLE_LEFT, ConsoleCrumb } from "./console-shared"
import { PhotoScrim, onPhoto } from "./console-photo"

/**
 * console-chapter：事故控制台的章节页，terminal 2026-10 定稿（p03、p10）重画。
 *
 * 满版照片从左往右压暗（`PhotoScrim`），左上角面包屑「01 / 章节 · DIR」。
 * 章节号两位数 110px 等宽粗体强调色，下面标题 44/56 粗体，一行放得下就一行，
 * 底对齐在 y369。副题有就 18px 灰排在标题下。一根 620 宽的细线，下面是这一章
 * 的目录：每个内容页一行，「├─ 04」等宽强调色，后面是那一页的标题（读自
 * deck，作者不用写），整张目录要么全画，要么不画。
 *
 * 不画 motif：面包屑就是这一页的家具。零 theme id、零 hex。
 */

const NUMBER = { top: 140, box: 120, size: 110 } as const
const TITLE = { size: 44, lineHeight: 56, foot: 380, minPt: 34, maxLines: 2, w: 700 } as const
const SUB = { gap: 8, size: 18, lineHeight: 26, maxLines: 2 } as const
const RULE = { y: 402, w: 620 } as const
const LIST = { gap: 8, w: 760, foot: 704 } as const

export function ConsoleChapter({ ir, slide, index, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const inks = consoleInks(ctx)
  const ground = inks.ground
  let chapterNo = 0
  for (let i = 0; i <= index && i < ir.slides.length; i++) if (ir.slides[i]!.type === "chapter") chapterNo++
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: TITLE.w,
    fontSize: TITLE.size,
    maxLines: TITLE.maxLines,
    minPt: TITLE.minPt,
    bold: true,
    lineHeightRatio: TITLE.lineHeight / TITLE.size,
    fontFamily: fonts.heading,
  })
  const sub = slide.subheading?.trim()
    ? fitEmphasisText(slide.subheading, { maxWidth: TITLE.w, fontSize: SUB.size, minPt: SUB.size, maxLines: SUB.maxLines, lineHeightRatio: SUB.lineHeight / SUB.size, fontFamily: fonts.body, bold: false })
    : null
  // A subheading lifts the title by its own lines, so the rule stays put.
  const lift = sub ? SUB.gap + sub.lines.length * SUB.lineHeight : 0
  const last = centredBaseline(TITLE.foot - lift - title.lineHeight, title.lineHeight, title.fontSize)
  const first = last - Math.max(0, title.lines.length - 1) * title.lineHeight
  const titleInk = accessibleInk(colors.text, ground, title.fontSize)
  const subInk = accessibleInk(colors.muted, ground, SUB.size)
  const listTop = RULE.y + LIST.gap
  const contents = drawContents({
    entries: chapterContents(ir, index),
    ctx,
    rect: { x: CONSOLE_LEFT, y: listTop, w: LIST.w, h: LIST.foot - listTop },
    setting: "console",
  })
  return (
    <>
      {onPhoto(slide) ? <PhotoScrim id={`console-chapter-scrim-${index}`} ink={ground} /> : null}
      <ConsoleCrumb ir={ir} index={index} ctx={ctx} page={page} />
      <text
        x={CONSOLE_LEFT}
        y={centredBaseline(NUMBER.top - lift, NUMBER.box, NUMBER.size)}
        fontFamily={fonts.mono}
        fontSize={NUMBER.size}
        fontWeight="700"
        fill={accessibleInk(inks.mark, ground, NUMBER.size)}
        dominantBaseline="alphabetic"
      >
        {String(Math.max(1, chapterNo)).padStart(2, "0")}
      </text>
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
      {sub
        ? renderEmphasisHeading(
            sub,
            headingEmphasisPaint(ctx, sub, { baseFill: subInk, fontWeight: "700", fontFamily: fonts.body, bold: false }),
            (_line, i) => (
              <text
                key={i}
                data-truncated={sub.truncated && i === sub.lines.length - 1 ? "1" : undefined}
                x={CONSOLE_LEFT}
                y={centredBaseline(TITLE.foot - lift + SUB.gap, SUB.lineHeight, SUB.size) + i * SUB.lineHeight}
                fontFamily={fonts.body}
                fontSize={sub.fontSize}
                fill={subInk}
                dominantBaseline="alphabetic"
              />
            ),
          )
        : null}
      <rect x={CONSOLE_LEFT} y={RULE.y} width={RULE.w} height={1} fill={inks.edge} />
      {contents}
    </>
  )
}

export const layoutDef = {
  // chapter-console-chapter.tsx: terminal's chapter page. A photograph
  // darkened from the left, the crumb, the chapter number large in mono, the
  // title, and the chapter's pages listed as a directory.
  id: "console-chapter",
  kind: "standard",
  story: {
    name: "Console Directory",
    story: "A photograph darkens toward the left, where the chapter's number stands large in mono over its title, and under a hairline the chapter's pages are listed as a console lists a directory, each number on a tree branch.",
    positioning: "Opens a section of a technical review by saying what it will cover. Choose it when the room should see the section's claims before the evidence.",
    audience: "Engineers who navigate a long review by its sections.",
    notFor: "Short decks whose chapters hold one page each.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "watermark", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
