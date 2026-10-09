import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis, type EmphasisHeadingLayout } from "../render/emphasis"
import { fitMemoTitle } from "./compositions/memo"
import {
  SCROLL_META,
  fitColumnLabel,
  fitScroll,
  joinColumnLabels,
  paintColumnLabel,
  paintScroll,
  paintScrollPhoto,
  scrollInks,
  scrollMeta,
  scrollText,
} from "./compositions/scroll"
import type { HeadingCtx } from "./heading-set"

/**
 * scroll-chapter：讲座分卷的卷首页，ink 2026-10 定稿（p05、p10）。
 *
 * 右边一幅竖长的画芯（页面自己的 `background` 资产，x760、340 宽、600 高），
 * 四周 10px 面板纸色的裱边，裱边里一道发丝线。画芯右边竖排 deck 的机构名接
 * 页脚的 `label`（「文化讲堂」「二〇二六年十月」，14px 灰褐）。画芯左边竖排卷号
 * （页面的 `kicker`，「卷之一」，72px 楷书朱砂、字距 12px）。左边卷名
 * （`heading`）52px 楷书墨色，下面副题（`subheading`）20px 楷书灰，再下面一
 * 笔 150px 的墨线。左下角是页面的 `footnote`（「画芯为 AI 生成的示意图」）。
 * 拉丁文的卷号转九十度从上往下读，卷名放不下一行就两行。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const PANEL = { x: 760, y: 60, w: 340, h: 600, mount: 10 } as const
const HALL = { right: 1180, top: 60, length: 600, size: 14, tracking: 6, lineHeight: 50, latinTracking: 1 } as const
const VOLUME = { right: 650, top: 120, length: 480, size: 72, tracking: 12, lineHeight: 90, latinTracking: 2 } as const
const TITLE = { x: 110, top: 300, w: 430, size: 52, minPt: 40, lineHeight: 70, maxLines: 2 } as const
const SUB = { gap: 14, size: 20, lineHeight: 30, maxLines: 2 } as const
const RULE = { gap: 26, w: 150 } as const
const NOTE = { x: 110, top: 680, size: 11, lineHeight: 20, w: 600 } as const

/** The volume's title in the serif, on one line or broken at a comma over two, from 52 down to 40. */
function fitTitle(heading: string, ctx: HeadingCtx): EmphasisHeadingLayout {
  return fitMemoTitle(heading, { maxWidth: TITLE.w, fontSize: TITLE.size, minPt: TITLE.minPt, lineHeight: TITLE.lineHeight, fontFamily: ctx.fonts.heading, bold: false })
}

export function ScrollChapter({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = scrollInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  const hall = joinColumnLabels([resolveDeckFooter(ir).organization ?? ir.meta.organization, resolveDeckFooter(ir).label])
  const hallLabel = hall ? fitColumnLabel(hall, { size: HALL.size, tracking: HALL.tracking, length: HALL.length, lineHeight: HALL.lineHeight, maxColumns: 1, latinTracking: HALL.latinTracking, serif: false }, ctx) : null
  const volume = stripEmphasis(slide.kicker ?? "").trim()
  const volumeLabel = volume ? fitColumnLabel(volume, { size: VOLUME.size, tracking: VOLUME.tracking, length: VOLUME.length, lineHeight: VOLUME.lineHeight, maxColumns: 1, latinTracking: VOLUME.latinTracking }, ctx) : null
  // On one line when it fits, otherwise broken at its last comma or colon, as the claim is.
  const fitted = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
  const title = fitted && !fitted.truncated && fitted.lines.length <= TITLE.maxLines ? { ...fitted, lineHeight: TITLE.lineHeight } : null
  const titleBottom = TITLE.top + (title?.lines.length ?? 1) * TITLE.lineHeight
  const sub = slide.subheading?.trim() ? fitScroll(slide.subheading, { width: TITLE.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, serif: true }, ctx) : null
  const subTop = titleBottom + SUB.gap
  const ruleY = (sub ? subTop + sub.lines.length * SUB.lineHeight : titleBottom) + RULE.gap
  const note = slide.footnote?.trim() ? fitScroll(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1 }, ctx) : null
  const inner = { x: PANEL.x + PANEL.mount, y: PANEL.y + PANEL.mount, w: PANEL.w - PANEL.mount * 2, h: PANEL.h - PANEL.mount * 2 }
  return (
    <>
      <rect data-scroll-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? (
        <g data-scroll-painting="">
          <rect x={PANEL.x} y={PANEL.y} width={PANEL.w} height={PANEL.h} fill={inks.card} />
          {paintScrollPhoto(photo, inner, ctx)}
          <rect x={inner.x + 0.5} y={inner.y + 0.5} width={inner.w - 1} height={inner.h - 1} fill="none" stroke={inks.line} strokeWidth={1} />
        </g>
      ) : null}
      {hallLabel ? <g data-scroll-hall={hall}>{paintColumnLabel(hallLabel, { ctx, right: HALL.right, top: HALL.top, fill: scrollMeta(inks.taupe, ground), attrs: { ...SCROLL_META } })}</g> : hall ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {volumeLabel ? <g data-scroll-volume-number={volume}>{paintColumnLabel(volumeLabel, { ctx, right: VOLUME.right, top: VOLUME.top, fill: scrollText(inks.cinnabar, ground, VOLUME.size) })}</g> : volume ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {title ? (
        <g data-scroll-chapter-title="">{paintScroll(title, { ctx, x: TITLE.x, top: TITLE.top, serif: true, fill: scrollText(inks.ink, ground, TITLE.size) })}</g>
      ) : slide.heading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      {sub ? <g data-scroll-chapter-sub="">{paintScroll(sub, { ctx, x: TITLE.x, top: subTop, serif: true, fill: scrollText(inks.muted, ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <rect x={TITLE.x} y={ruleY - 0.5} width={RULE.w} height={1} fill={inks.lead} />
      {note ? <g data-scroll-chapter-note="">{paintScroll(note, { ctx, x: NOTE.x, top: NOTE.top, fill: scrollMeta(inks.muted, ground), attrs: { ...SCROLL_META } })}</g> : null}
      {slide.footnote?.trim() && !note ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-scroll-chapter.tsx: ink's chapter page. A tall painting in its
  // mount at the right, the volume number upright in cinnabar beside it, the
  // volume's name and its line at the left over a stroke of ink.
  id: "scroll-chapter",
  kind: "standard",
  story: {
    name: "Scroll Chapter",
    story: "A volume of the scroll opens: a tall painting in its mount, the volume number standing upright in cinnabar beside it, and the volume's name in kaishu over a single stroke of ink.",
    positioning: "Opens a part of a lecture or a cultural talk. Choose it when each part should feel like the next roll of a hanging scroll.",
    audience: "Listeners who need a breath and a picture before the next part begins.",
    notFor: "A pitch's act or a report's section, where a mounted painting slows the page down.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  branding: "none",
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: false, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => {
    const fitted = fitTitle(slide.heading ?? "", ctx)
    return fitted.truncated || fitted.lines.length > TITLE.maxLines ? "declined" : "whole"
  },
} satisfies LayoutDefinition
