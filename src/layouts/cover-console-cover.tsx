import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { fitEmphasisHeading, fitEmphasisText, headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"
import { accessibleInk } from "../render/ink"
import { consoleInks, fitMono, paintMono } from "./compositions/console"
import { centredBaseline } from "./compositions/type"
import { CONSOLE_LEFT, CRUMB_BASELINE, ConsoleCrumb } from "./console-shared"
import { PhotoScrim, onPhoto } from "./console-photo"

/**
 * console-cover：事故控制台的封面，terminal 2026-10 定稿（p01）重画。
 *
 * 一张满版照片（页面自己的 `background` 资产）铺在底下，从左往右压一层
 * 页面底色的渐暗（`PhotoScrim`，94% → 78% → 15%），字都站在左边暗的那半。
 * 左上角一行面包屑：章节号 00、机构名，日期站在页码的位置。标题 60/76
 * 粗体，一行放得下就一行，放不下折两行，底对齐在 y445。下面 64×3 一段
 * 强调色短条，再下面副题 21px 灰，左下角一行等宽的状态（页面的 `kicker`，
 * 如「13 起事故 · 2025-06 → 2026-09」），前面一个强调色小圆点。
 *
 * 没有照片时字照样站在原处，底就是页面颜色。不画 motif：面包屑就是这一
 * 页的家具。零 theme id、零 hex。
 */

const TITLE = { size: 60, lineHeight: 76, foot: 460, minPt: 44, maxLines: 2, w: 900 } as const
const BAR = { y: 478, w: 64, h: 3 } as const
const SUB = { top: 500, size: 21, lineHeight: 30, maxLines: 2 } as const
const KICKER = { top: 640, box: 22, size: 14, dot: 4, gap: 8 } as const

export function ConsoleCover({ ir, slide, index, ctx, page }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const title = fitEmphasisHeading(slide.heading, {
    maxWidth: TITLE.w,
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
    ? fitEmphasisText(slide.subheading, { maxWidth: TITLE.w, fontSize: SUB.size, minPt: SUB.size, maxLines: SUB.maxLines, lineHeightRatio: SUB.lineHeight / SUB.size, fontFamily: fonts.body, bold: false })
    : null
  const subInk = accessibleInk(colors.muted, ground, SUB.size)
  const kickerX = CONSOLE_LEFT + KICKER.dot * 2 + KICKER.gap
  const kicker = slide.kicker?.trim()
    ? (fitMono(slide.kicker, { width: 1152 - (kickerX - CONSOLE_LEFT), size: KICKER.size, lineHeight: KICKER.box, maxLines: 1 }) ??
      fitMono(slide.kicker, { width: 1152 - (kickerX - CONSOLE_LEFT), size: KICKER.size, lineHeight: KICKER.box, maxLines: 2 }))
    : null
  const kickerY = centredBaseline(KICKER.top, KICKER.box, KICKER.size) - (kicker ? (kicker.lines.length - 1) * KICKER.box : 0)
  return (
    <>
      {onPhoto(slide) ? <PhotoScrim id={`console-cover-scrim-${index}`} ink={ground} /> : null}
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
      <rect x={CONSOLE_LEFT} y={BAR.y} width={BAR.w} height={BAR.h} fill={inks.mark} />
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
      {kicker ? (
        <g data-cover-kicker="">
          <circle cx={CONSOLE_LEFT + KICKER.dot} cy={kickerY - 5} r={KICKER.dot} fill={inks.mark} />
          {paintMono(kicker, { ctx, x: kickerX, y: kickerY, fill: accessibleInk(inks.mark, ground, KICKER.size), ground })}
        </g>
      ) : null}
    </>
  )
}

/** The shared confidentiality mark, when the deck carries one, stands a line under the crumb. */
const COVER_MARK_Y = CRUMB_BASELINE + 34

export const layoutDef = {
  // cover-console-cover.tsx: terminal's incident console cover. A photograph
  // darkened from the left, the crumb, the title, a bar, the subtitle and a
  // mono status line.
  id: "console-cover",
  kind: "standard",
  story: {
    name: "Console Cover",
    story: "A photograph darkens toward the left, where a mono line names the team and the date, the title stands bold over a short bar in the signal colour, and a status line at the foot says what the review covers.",
    positioning: "Opens a technical review that starts from evidence. Choose it when the first page should already say how much was looked at and over what span.",
    audience: "Engineers and their leads who want the scope before the argument.",
    notFor: "Warm or celebratory openings, which want colour rather than a console.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker"],
  drawsPhoto: true,
  suppressMotif: true,
  coverMark: { x: CONSOLE_LEFT, y: COVER_MARK_Y },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
