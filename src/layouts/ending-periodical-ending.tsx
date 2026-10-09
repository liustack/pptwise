import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import {
  cjkOnly,
  fitPeriodical,
  paintPeriodical,
  paintPeriodicalTracked,
  periodicalBaseline,
  periodicalInks,
  periodicalText,
  periodicalTrackedWidth,
} from "./compositions/periodical"
import { MastheadColumn, MastheadIssue, MastheadRules, MastheadSection, PERIODICAL_LEFT, PERIODICAL_RIGHT, PERIODICAL_W } from "./periodical-shared"
import type { HeadingCtx } from "./heading-set"

/**
 * periodical-ending：期刊的后记页，journal 2026-10 定稿（p18）。
 *
 * 顶上是和内容页同一个刊头：左边栏目名（deck 页脚要印 `organization` 时，
 * 「致读者」），中间赭红的分栏名（页面的 `kicker`，「后记」，作者写，不写死
 * 英文），右边期号（页脚的 `label`），下面一粗一细两条通栏线。y200 起是后记
 * 正文（页面标题），44/74 衬线粗体，作者在标题里写的换行就是折行处，没写换
 * 行就按行宽折，最多两行。右下角是落款：一条细线（y470，从 x900 到右边界），
 * 线下右对齐两行，取页面的 `subheading`，作者写几行就印几行（最多两行）：
 * 第一行 26px 衬线粗体、字距加大（「主编」），第二行 15px 灰字（「二〇二六年
 * 十月」）。作者写什么印什么，不写死署名、不写死日期。
 *
 * 不画 motif，不画页码（页码字段只上内容页）。零 theme id、零 hex。
 */

const TEXT = { top: 200, size: 44, minSize: 34, lineHeight: 74, maxLines: 2 } as const
const SIGN = { rule: { y: 470, x: 900, w: 0.8 }, name: { top: 484, lineHeight: 40, size: 26, tracking: { cjk: 6, latin: 1 } }, date: { top: 528, lineHeight: 26, size: 15, tracking: { cjk: 3, latin: 0.5 } }, maxW: PERIODICAL_W } as const

/** The closing words as the author broke them, each line fitted to the measure at one size. */
function fitClosing(heading: string, ctx: HeadingCtx) {
  const parts = stripEmphasis(heading)
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
  for (let size: number = TEXT.size; size >= TEXT.minSize; size -= 2) {
    const lineHeight = Math.round((size * TEXT.lineHeight) / TEXT.size)
    const fitted = parts.map((part) => fitPeriodical(part, { width: PERIODICAL_W, size, lineHeight, maxLines: TEXT.maxLines, serif: true, bold: true }, ctx))
    if (fitted.every((f) => f) && fitted.reduce((n, f) => n + f!.lines.length, 0) <= TEXT.maxLines) {
      return { ...fitted[0]!, lines: fitted.flatMap((f) => f!.lines), segments: fitted.flatMap((f) => f!.segments) }
    }
  }
  return null
}

export function PeriodicalEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = periodicalInks(ctx)
  const ground = inks.ground
  const footer = resolveDeckFooter(ir)
  const closing = slide.heading?.trim() ? fitClosing(slide.heading, ctx) : null
  const sign = (slide.subheading ?? "")
    .split(/\n+/)
    .map((line) => stripEmphasis(line).trim())
    .filter(Boolean)
  const [name, date, ...extra] = sign
  const nameTracking = name && cjkOnly(name) ? SIGN.name.tracking.cjk : SIGN.name.tracking.latin
  const dateTracking = date && cjkOnly(date) ? SIGN.date.tracking.cjk : SIGN.date.tracking.latin
  const nameW = name ? periodicalTrackedWidth(name, SIGN.name.size, nameTracking, ctx, { serif: true, bold: true }) : 0
  const dateW = date ? periodicalTrackedWidth(date, SIGN.date.size, dateTracking, ctx, { serif: true }) : 0
  const signW = Math.max(PERIODICAL_RIGHT - SIGN.rule.x, nameW, dateW)
  const signFits = signW <= SIGN.maxW
  return (
    <>
      <MastheadColumn text={footer.organization} ctx={ctx} />
      <MastheadSection text={slide.kicker} ctx={ctx} />
      <MastheadIssue text={footer.label} ctx={ctx} />
      <MastheadRules ctx={ctx} />
      {closing ? (
        <g data-periodical-closing="">{paintPeriodical(closing, { ctx, x: PERIODICAL_LEFT, top: TEXT.top, serif: true, bold: true, fill: periodicalText(inks.ink, ground, closing.fontSize) })}</g>
      ) : slide.heading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="heading" />
      ) : null}
      {name ? (
        signFits ? (
          <g data-periodical-signoff="">
            <rect x={PERIODICAL_RIGHT - signW} y={SIGN.rule.y - SIGN.rule.w / 2} width={signW} height={SIGN.rule.w} fill={inks.lead} />
            {paintPeriodicalTracked({ ctx, text: name, x: PERIODICAL_RIGHT - nameW, y: periodicalBaseline(SIGN.name.top, SIGN.name.lineHeight, SIGN.name.size, true), size: SIGN.name.size, tracking: nameTracking, serif: true, bold: true, fill: periodicalText(inks.ink, ground, SIGN.name.size) })}
            {date ? paintPeriodicalTracked({ ctx, text: date, x: PERIODICAL_RIGHT - dateW, y: periodicalBaseline(SIGN.date.top, SIGN.date.lineHeight, SIGN.date.size, true), size: SIGN.date.size, tracking: dateTracking, serif: true, fill: periodicalText(inks.muted, ground, SIGN.date.size) }) : null}
          </g>
        ) : (
          <g data-dropped={sign.length} data-dropped-kind="label" />
        )
      ) : null}
      {extra.length > 0 ? <g data-dropped={extra.length} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-periodical-ending.tsx: journal's close. The masthead with the
  // page's own section, the closing words as the author broke them, and the
  // sign-off the author wrote, right-aligned under a rule.
  id: "periodical-ending",
  kind: "standard",
  story: {
    name: "Periodical Ending",
    story: "A magazine's afterword: the masthead with its own section, the closing words set large in a bookish serif as the author broke them, and the editor's sign-off right-aligned under a short rule.",
    positioning: "Closes a letter to readers, an annual issue or a long read. Choose it when the last page should be signed rather than summarised.",
    audience: "Readers who have read the whole letter and expect it to end in its author's voice.",
    notFor: "A meeting that ends in a decision or an ask, which needs its next steps on the page.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "rule", accepts: [] },
  ],
  pageFields: ["kicker"],
  suppressMotif: true,
  headingFit: { maxWidth: PERIODICAL_W, fontSize: TEXT.size, maxLines: TEXT.maxLines, minPt: TEXT.minSize, bold: true, lineHeightRatio: TEXT.lineHeight / TEXT.size },
  headingSet: ({ slide, ctx }) => (slide.heading?.trim() && fitClosing(slide.heading, ctx) === null ? "declined" : "whole"),
} satisfies LayoutDefinition
