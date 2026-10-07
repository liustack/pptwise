import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { CrayonLine, CrayonPhoto, PHOTO_NOTE, PhotoNote, Star, Sun, crayonInks, crayonText, fitCrayon, fitPhotoNote, paintCrayon } from "./compositions/crayonbox"
import { CrayonClaimText, SectionCapsule, fitCrayonClaim } from "./crayonbox-frame"

/**
 * crayonbox-cover：一盒蜡笔的封面，crayon 2026-10 定稿（p01）。
 *
 * 左上一个天蓝圆角胶囊，写页面的 `kicker`（没写就用机构名，「全园新学期家长会」），
 * 字居中 16px 粗体。下面是 64/86 的粗圆体大标题，作者断行就按作者的断，最多两行，
 * 末行下面一道橘色蜡笔线（三道错开的笔触）。再下面是灰色副题（`subheading`，
 * 20/30 两行以内），再下面是 deck 的 `meta.date`（「2026 年秋季学期」），22px
 * 粗体，主题的蓝。右边是页面自己的 `background` 照片，500×360 圆角 30，外描
 * 5px 橘色蜡笔框，照片下面一行小字是页面的 `footnote`（「示意图：户外活动（AI
 * 生成）」）。右上一个阳光黄的太阳，页面上散着三颗星贴纸。没有照片时右边空着，
 * 只有星星和太阳。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const CAPSULE = { x: 64, y: 80, h: 38, size: 16 } as const
const TITLE = { x: 64, top: 160, w: 620, size: 64, lineHeight: 86 } as const
const UNDERLINE = { gap: 20, w: 356, stroke: 10 } as const
const SUB = { gap: 46, w: 560, size: 20, lineHeight: 30, maxLines: 2 } as const
const DATE = { dy: 88, w: 600, size: 22, lineHeight: 34 } as const
const PHOTO = { x: 700, y: 170, w: 500, h: 360, r: 30 } as const
const NOTE = { gap: 14, w: 480 } as const

export function CrayonboxCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  const label = stripEmphasis(slide.kicker ?? ir.meta.organization ?? "").trim()
  const title = fitCrayonClaim(slide.heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight)
  const foot = TITLE.top + title.lines.length * TITLE.lineHeight
  const sub = slide.subheading?.trim() ? fitCrayon(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, weight: 600 }, ctx) : undefined
  const subTop = foot + SUB.gap
  const date = ir.meta.date?.trim() ? fitCrayon(ir.meta.date, { width: DATE.w, size: DATE.size, lineHeight: DATE.lineHeight, maxLines: 1, weight: 900 }, ctx) : undefined
  const note = fitPhotoNote(slide.footnote, NOTE.w, ctx)
  return (
    <>
      <rect data-crayon-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      <g data-decor-piece="sun">
        <Sun cx={1150} cy={110} r={36} color={inks.yellow} />
      </g>
      <g data-decor-piece="stars">
        <Star cx={640} cy={200} r={12} color={inks.orange} />
        <Star cx={640} cy={610} r={9} color={inks.sky} />
        <Star cx={90} cy={600} r={8} color={inks.green} />
      </g>
      {label ? <SectionCapsule name={label} color={inks.sky} ctx={ctx} x={CAPSULE.x} y={CAPSULE.y} h={CAPSULE.h} size={CAPSULE.size} centred maxW={600} /> : null}
      {slide.heading?.trim() ? (
        <g data-crayon-title="">
          <CrayonClaimText layout={title} ctx={ctx} x={TITLE.x} foot={foot} />
          <g data-decor-piece="crayon-underline">
            <CrayonLine x1={TITLE.x} x2={TITLE.x + UNDERLINE.w} y={foot + UNDERLINE.gap} color={inks.orange} width={UNDERLINE.stroke} />
          </g>
        </g>
      ) : null}
      {sub ? <g data-crayon-subtitle="">{paintCrayon(sub, { ctx, x: TITLE.x, top: subTop, weight: 600, fill: crayonText(inks.muted, ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {date ? <g data-crayon-date="">{paintCrayon(date, { ctx, x: TITLE.x, top: subTop + DATE.dy, weight: 900, heading: true, fill: crayonText(inks.blue, ground, DATE.size) })}</g> : null}
      {photo ? <CrayonPhoto assetId={photo} box={{ x: PHOTO.x, y: PHOTO.y, w: PHOTO.w, h: PHOTO.h }} ctx={ctx} r={PHOTO.r} frame={inks.orange} /> : null}
      {note ? <PhotoNote layout={note} x={PHOTO.x} top={PHOTO.y + PHOTO.h + NOTE.gap} ctx={ctx} /> : null}
      {note === null ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

/** The note's size, for the tests. */
export const COVER_NOTE = PHOTO_NOTE

export const layoutDef = {
  // cover-crayonbox-cover.tsx: crayon's cover. A welcome sign on drawing
  // paper: the occasion in a sky capsule, the title large with a stroke of
  // tangerine crayon under it, the subtitle and the term, the page's
  // photograph in a crayon frame at the right, a sun and three stars.
  id: "crayonbox-cover",
  kind: "standard",
  story: {
    name: "Crayonbox Cover",
    story: "A welcome sign drawn on warm paper: the occasion in a rounded sky capsule, the title large in a heavy rounded hand with a stroke of tangerine crayon under it, and a picture in a crayon frame beside it under a doodled sun.",
    positioning: "Opens a kindergarten parents' meeting, a family open day or a picture-book evening. Choose it when the first page should feel like a classroom door decorated for the day.",
    audience: "Parents and families settling into small chairs, reading the cover before the teacher starts.",
    notFor: "A board meeting or a formal report, where crayon and stickers would read as a joke.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  // The paper is laid edge to edge first: the page's photograph sits in its frame, not under the page.
  paintsOwnBackground: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: 40, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
