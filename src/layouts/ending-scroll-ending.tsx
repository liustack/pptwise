import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import {
  SCROLL_META,
  fitColumnLabel,
  fitScroll,
  fitVertical,
  joinColumnLabels,
  paintColumnLabel,
  paintScroll,
  paintScrollPhoto,
  paintSeal,
  sealOf,
  paintVertical,
  scrollInks,
  scrollMeta,
  scrollText,
  uprightText,
} from "./compositions/scroll"
import type { HeadingCtx } from "./heading-set"

/**
 * scroll-ending：讲座的落款页，ink 2026-10 定稿（p18）。
 *
 * 满版照片（页面自己的 `background` 资产）上压一层 82% 的宣纸色。右半边是
 * 竖排的结语（`heading`），54px 楷书、字距 6px，一句一列：作者写的逗号、
 * 句号处换列，一列放不下才在列长处折，标点按竖排写法。结语左边一道竖的
 * 发丝线（x600），线左两列竖排落款：机构名接页面的 `kicker`（「文化讲堂」「公众
 * 讲座」）、deck 页脚的 `label`（「二〇二六年十月」，作者写的年月），20px
 * 楷书；落款下一方 44px 朱砂印，印文取页面的 `stamp.text`，没写就取机构名
 * 的首字。印只刻一个字：多于一个字或带日期行的 `stamp` 刻不下，印照样取机构名
 * 的首字，并声明丢弃（`data-dropped`），不刻半个印文（`sealOf`）。左下是页面的 `subheading`（「文化和自然遗产日」换行「每年 6 月
 * 第二个星期六」，作者写的换行），最下角是 `footnote`（「背景为 AI 生成的
 * 示意图」）。
 *
 * 拉丁文的结语不逐字母竖排：在右半边横排，一句一行；落款的两列转九十度
 * 从上往下读。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const VEIL = 0.82
const VERSE = { first: 875, top: 90, size: 54, tracking: 6, pitch: 120, length: 580, maxColumns: 4 } as const
const VERSE_ACROSS = { x: 650, top: 150, w: 520, size: 46, lineHeight: 64, maxLines: 6 } as const
const DIVIDER = { x: 600, top: 110, bottom: 630 } as const
const LABELS = { top: 110, length: 400, size: 20, tracking: 6, lineHeight: 40, hall: 560, date: 510, latinTracking: 1 } as const
const SEAL = { x: 470, y: 530, size: 44 } as const
const SIGN = { x: 110, top: 600, w: 340, size: 13, lineHeight: 20, maxLines: 3 } as const
const NOTE = { x: 24, top: 680, size: 11, lineHeight: 20, w: 560 } as const

/** Latin closing words a sentence a line, each wrapped to the measure when it runs long, or `null` past six lines. */
function fitSentences(text: string, ctx: HeadingCtx) {
  const parts = text
    .trim()
    .split(/\n+|(?<=[.!?])\s+/u)
    .map((part) => part.trim())
    .filter(Boolean)
  const fitted = parts.map((part) => fitScroll(part, { width: VERSE_ACROSS.w, size: VERSE_ACROSS.size, lineHeight: VERSE_ACROSS.lineHeight, maxLines: VERSE_ACROSS.maxLines, serif: true }, ctx))
  if (fitted.length === 0 || fitted.some((f) => !f)) return null
  const lines = fitted.flatMap((f) => f!.lines)
  if (lines.length > VERSE_ACROSS.maxLines) return null
  return { ...fitted[0]!, lines, segments: fitted.flatMap((f) => f!.segments) }
}

/** The closing words a sentence a column: a break after each comma, full stop or colon the author wrote. */
function clauses(text: string): string {
  return text.trim().replace(/([，。；：！？])(?=[^\n])/gu, "$1\n")
}

/** The closing words upright a clause a column when they can stand upright, otherwise across a sentence a line. `verseDropped` when neither holds them whole. */
function setVerse(heading: string | undefined, ctx: HeadingCtx) {
  const verse = stripEmphasis(heading ?? "").trim()
  const upright = verse !== "" && uprightText(verse)
  const capacity = Math.floor((VERSE.length - VERSE.size) / (VERSE.size + VERSE.tracking)) + 1
  const columns = upright ? fitVertical(clauses(heading ?? ""), { size: VERSE.size, tracking: VERSE.tracking, capacity, pitch: VERSE.pitch, maxColumns: VERSE.maxColumns }) : null
  const across = !upright && verse ? fitSentences(heading ?? "", ctx) : null
  const verseDropped = verse !== "" && !columns && !across
  return { columns, across, verseDropped }
}

export function ScrollEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  const { columns, across, verseDropped } = setVerse(slide.heading, ctx)
  const footer = resolveDeckFooter(ir)
  const hall = joinColumnLabels([ir.meta.organization, slide.kicker])
  const date = footer.label
  const labelSpec = { size: LABELS.size, tracking: LABELS.tracking, length: LABELS.length, lineHeight: LABELS.lineHeight, maxColumns: 1, latinTracking: LABELS.latinTracking }
  const hallLabel = hall ? fitColumnLabel(hall, labelSpec, ctx) : null
  const dateLabel = date ? fitColumnLabel(date, labelSpec, ctx) : null
  const seal = sealOf(slide.stamp, ir.meta.organization)
  const sign = slide.subheading?.trim() ? fitScroll(slide.subheading, { width: SIGN.w, size: SIGN.size, lineHeight: SIGN.lineHeight, maxLines: SIGN.maxLines }, ctx) : null
  const note = slide.footnote?.trim() ? fitScroll(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  const labelInk = scrollText(inks.ink2, ground, LABELS.size)
  return (
    <>
      {photo ? (
        <g data-scroll-ending-photo="">
          {paintScrollPhoto(photo, { x: 0, y: 0, w: 1280, h: 720 }, ctx)}
          <rect data-scroll-veil="" x={0} y={0} width={1280} height={720} fill={ground} fillOpacity={VEIL} />
        </g>
      ) : null}
      {columns ? <g data-scroll-verse="">{paintVertical(columns, { ctx, x: VERSE.first, top: VERSE.top, spec: VERSE, fill: scrollText(inks.ink, ground, VERSE.size) })}</g> : null}
      {across ? <g data-scroll-verse="">{paintScroll(across, { ctx, x: VERSE_ACROSS.x, top: VERSE_ACROSS.top, serif: true, fill: scrollText(inks.ink, ground, VERSE_ACROSS.size) })}</g> : null}
      {verseDropped ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <rect x={DIVIDER.x - 0.5} y={DIVIDER.top} width={1} height={DIVIDER.bottom - DIVIDER.top} fill={inks.line} />
      {hallLabel ? <g data-scroll-hall={hall}>{paintColumnLabel(hallLabel, { ctx, right: LABELS.hall, top: LABELS.top, fill: labelInk })}</g> : hall ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {dateLabel ? <g data-scroll-date={date}>{paintColumnLabel(dateLabel, { ctx, right: LABELS.date, top: LABELS.top, fill: labelInk })}</g> : date ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {paintSeal(SEAL.x, SEAL.y, SEAL.size, seal.glyph, ctx)}
      {seal.dropped ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {sign ? <g data-scroll-sign="">{paintScroll(sign, { ctx, x: SIGN.x, top: SIGN.top, fill: scrollText(inks.muted, ground, SIGN.size) })}</g> : null}
      {slide.subheading?.trim() && !sign ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note ? <g data-scroll-ending-note="">{paintScroll(note, { ctx, x: NOTE.x, top: NOTE.top, fill: scrollMeta(inks.muted, ground), attrs: { ...SCROLL_META } })}</g> : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-scroll-ending.tsx: ink's colophon. The page's photograph under a
  // veil of paper, the closing words upright a clause a column, the hall
  // and the date beside them over a cinnabar seal.
  id: "scroll-ending",
  kind: "standard",
  story: {
    name: "Scroll Colophon",
    story: "The scroll signed off: the closing words standing upright a clause a column, the hall and the date beside them in a quieter column, and a cinnabar seal under the signature, over a picture veiled in paper.",
    positioning: "Closes a lecture, an exhibition talk or a cultural evening. Choose it when the last page should be a line the room reads in silence before the questions.",
    audience: "A hall that has listened to the end and stays for questions.",
    notFor: "A pitch's ask or a review's next steps, which need a list rather than a colophon.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker", "stamp", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: VERSE_ACROSS.w, fontSize: VERSE_ACROSS.size, maxLines: VERSE_ACROSS.maxLines, minPt: VERSE_ACROSS.size, bold: false, lineHeightRatio: VERSE_ACROSS.lineHeight / VERSE_ACROSS.size },
  headingSet: ({ slide, ctx }) => (setVerse(slide.heading, ctx).verseDropped ? "declined" : "whole"),
} satisfies LayoutDefinition
