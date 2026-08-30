import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { chapterNumberFor } from "../lib/derive"
import { fitHeadingLines } from "../render/heading-fit"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk, metaInk } from "../render/ink"
import { stripEmphasis } from "../render/emphasis"

/**
 * day-bill-chapter（第八波 pinOnly）：荧光黄上的演出日导视。kicker 是
 * `DAY n`，有 `meta.date` 则拼 `DAY n · date`。巨号标题是嗓门，特粗黑字
 * 就是全部。构图抄 `.issues/design-boards/wave8/b4/Playbill.dc.html` 章节：
 * kicker y250 / 30px / 700，标题 y440 / 130px / 700，副题 y540 / 24px。
 *
 * 进共享池。零 theme id、零 baked hex。不要角饰，不要日期贴片（motif
 * 章节退让）。空 heading 不编造演出名。CJK 不加 letter-spacing。展示级
 * 巨号 130px 不要乘 typeScale。渲染不画省略号。
 */

const KICKER_X = 96
const KICKER_Y = 250
const KICKER_SIZE = 30
const KICKER_MAX_W = 1088
const KICKER_MIN_PT = 16

const TITLE_X = 96
const TITLE_Y = 440
const TITLE_SIZE = 130
const TITLE_MIN_PT = 56
const TITLE_MAX_LINES = 1
const TITLE_MAX_W = 1088

const SUB_X = 96
const SUB_Y = 540
const SUB_SIZE = 24
const SUB_MAX_W = 1088
const SUB_MIN_PT = 16

function dropOverflowMark(text: string): string {
  return text.replace(/(?:\u2026|\.{3})+$/u, "")
}

function dayKicker(n: number, date: string | undefined): string {
  const day = `DAY ${Math.max(1, n)}`
  const stamp = date?.trim()
  return stamp ? `${day} · ${stamp}` : day
}

export function DayBillChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const { colors, fonts } = ctx
  const pageBg = ctx.defaultBg ?? colors.bg
  const chNum = chapterNumberFor(ir.slides, index)
  const kickerLabel = dayKicker(chNum, ir.meta.date)
  const headingSource = stripEmphasis(slide.heading ?? "")
  const showTitle = headingSource.trim().length > 0
  const subSource = stripEmphasis(slide.subheading ?? "").trim()

  const kicker = fitSvgLine(kickerLabel, {
    maxWidth: KICKER_MAX_W,
    fontSize: KICKER_SIZE,
    minFontSize: KICKER_MIN_PT,
    fontFamily: fonts.heading,
    bold: true,
  })
  const kickerPainted = dropOverflowMark(kicker.text)

  // 130px 是展示级巨号。不要乘 typeScale，装得下就用板上字号。
  const heading = fitHeadingLines(headingSource, {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
    fontFamily: fonts.heading,
  })

  const subheading = subSource
    ? fitSvgLine(subSource, {
        maxWidth: SUB_MAX_W,
        fontSize: SUB_SIZE,
        minFontSize: SUB_MIN_PT,
        fontFamily: fonts.body,
      })
    : null
  const subPainted = subheading ? dropOverflowMark(subheading.text) : ""

  return (
    <>
      {kickerPainted && (
        <text
          data-truncated={kicker.truncated ? "1" : undefined}
          x={KICKER_X}
          y={KICKER_Y}
          fontFamily={fonts.heading}
          fontSize={kicker.fontSize}
          fontWeight="700"
          fill={accessibleInk(colors.text, pageBg, kicker.fontSize)}
          dominantBaseline="alphabetic"
        >
          {kickerPainted}
        </text>
      )}

      {showTitle &&
        heading.lines.map((line, i) => {
          const painted = dropOverflowMark(line)
          if (!painted) return null
          return (
            <text
              key={i}
              data-truncated={heading.truncated && i === heading.lines.length - 1 ? "1" : undefined}
              x={TITLE_X}
              y={TITLE_Y + i * heading.lineHeight}
              fontFamily={fonts.heading}
              fontSize={heading.fontSize}
              fontWeight="700"
              fill={accessibleInk(colors.text, pageBg, heading.fontSize)}
              dominantBaseline="alphabetic"
            >
              {painted}
            </text>
          )
        })}

      {subheading && subPainted && (
        <text
          data-contrast-tier="meta"
          data-truncated={subheading.truncated ? "1" : undefined}
          x={SUB_X}
          y={SUB_Y}
          fontFamily={fonts.body}
          fontSize={subheading.fontSize}
          fill={metaInk(colors.muted, pageBg)}
          dominantBaseline="alphabetic"
        >
          {subPainted}
        </text>
      )}
    </>
  )
}

export const layoutDef = {
  branding: "none",
  // chapter-day-bill-chapter.tsx: day bill. DAY n kicker, display
  // title at 130px unscaled, muted sub. No chip, no corner mark. Empty
  // heading invents no show name.
  id: "day-bill-chapter",
  kind: "standard",
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  headingFit: {
    maxWidth: TITLE_MAX_W,
    fontSize: TITLE_SIZE,
    maxLines: TITLE_MAX_LINES,
    minPt: TITLE_MIN_PT,
  },
} satisfies LayoutDefinition
