import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { chapterNumberFor } from "../lib/derive"
import { CrayonLine, CrayonPhoto, PhotoNote, Star, Sun, crayonBaseline, crayonInks, crayonSectionColor, crayonText, fitCrayon, fitPhotoNote, inkOn, paintCrayon } from "./compositions/crayonbox"
import { CrayonClaimText, fitCrayonClaim, crayonClaimSet, CLAIM } from "./crayonbox-frame"

/**
 * crayonbox-chapter：一盒蜡笔的章节页，crayon 2026-10 定稿（p06、p10）。
 *
 * 左边一块歪着的圆角色块（200×170，圆角 34，转 -4°），颜色是这一章所在分区的
 * 蜡笔色（分区按出现顺序取天蓝、草绿、橘、红、紫），上面是章节号「01」，110px
 * 粗体，墨色（紫色上是白）。色块下面一道同色蜡笔线，再下面是 46/64 的章名，
 * 再下面是灰色副题（`subheading`，20/30 两行以内）。右边是页面自己的
 * `background` 照片，520×380 圆角 30，外描 5px 同色蜡笔框，照片下面一行小字是
 * 页面的 `footnote`（图的说明，比如「示意图：搭积木（AI 生成）」）。右上一个太阳，
 * 散着两颗星。不画页码：页码只上内容页。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const TILE = { x: 80, y: 220, w: 200, h: 170, r: 34, turn: -4, size: 110 } as const
const UNDERLINE = { x1: 90, x2: 270, y: 420, stroke: 9 } as const
const TITLE = { x: 80, top: 450, w: 560, size: 46, lineHeight: 64 } as const
const SUB = { gap: 6, w: 560, size: 20, lineHeight: 30, maxLines: 2 } as const
const PHOTO = { x: 680, y: 170, w: 520, h: 380, r: 30, note: 14 } as const

export function CrayonboxChapter({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const color = crayonSectionColor(ir.slides, index, inks)
  const n = String(Math.max(1, chapterNumberFor(ir.slides, index))).padStart(2, "0")
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : null
  const title = fitCrayonClaim(slide.heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight)
  const foot = TITLE.top + title.lines.length * TITLE.lineHeight
  const sub = slide.subheading?.trim() ? fitCrayon(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines, weight: 600 }, ctx) : undefined
  const cx = TILE.x + TILE.w / 2
  const cy = TILE.y + TILE.h / 2
  const note = fitPhotoNote(slide.footnote, PHOTO.w, ctx)
  return (
    <>
      <rect data-crayon-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      <g data-decor-piece="sun">
        <Sun cx={1140} cy={120} r={40} color={inks.yellow} />
      </g>
      <g data-decor-piece="stars">
        <Star cx={620} cy={140} r={12} color={inks.purple} />
        <Star cx={580} cy={600} r={9} color={inks.sky} />
      </g>
      <g data-crayon-number={n} transform={`rotate(${TILE.turn} ${cx} ${cy})`}>
        <rect x={TILE.x} y={TILE.y} width={TILE.w} height={TILE.h} rx={TILE.r} fill={color} />
        <text x={cx} y={crayonBaseline(TILE.y, TILE.h, TILE.size)} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={TILE.size} fontWeight="900" fill={inkOn(color, inks, TILE.size)} dominantBaseline="alphabetic">
          {n}
        </text>
      </g>
      <g data-decor-piece="crayon-underline">
        <CrayonLine x1={UNDERLINE.x1} x2={UNDERLINE.x2} y={UNDERLINE.y} color={color} width={UNDERLINE.stroke} />
      </g>
      {slide.heading?.trim() ? <g data-crayon-title=""><CrayonClaimText layout={title} ctx={ctx} x={TITLE.x} foot={foot} /></g> : null}
      {sub ? <g data-crayon-subtitle="">{paintCrayon(sub, { ctx, x: TITLE.x, top: foot + SUB.gap, weight: 600, fill: crayonText(inks.muted, ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {photo ? <CrayonPhoto assetId={photo} box={{ x: PHOTO.x, y: PHOTO.y, w: PHOTO.w, h: PHOTO.h }} ctx={ctx} r={PHOTO.r} frame={color} /> : null}
      {note ? <PhotoNote layout={note} x={PHOTO.x} top={PHOTO.y + PHOTO.h + PHOTO.note} ctx={ctx} /> : null}
      {note === null ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-crayonbox-chapter.tsx: crayon's chapter page. The chapter's
  // number on a tilted block of its section's crayon, a stroke of the same
  // crayon, the name and the subtitle, the page's photograph in a frame of
  // that crayon, a sun and two stars.
  id: "crayonbox-chapter",
  kind: "standard",
  story: {
    name: "Crayonbox Chapter",
    story: "A part of the meeting opens on a tilted block of crayon with its number, a stroke of the same colour under it, the part's name in a heavy rounded hand, and a picture framed in that colour.",
    positioning: "Opens each part of a parents' meeting or a family talk. Choose it when every part should carry its own crayon, so the pages that follow are easy to place.",
    audience: "Parents who look up between parts and want to know where the talk has got to.",
    notFor: "A formal report, where a tilted sticker of a number would read as play.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
  ],
  pageFields: ["footnote"],
  drawsPhoto: true,
  // The paper is laid edge to edge first: the page's photograph sits in its frame, not under the page.
  paintsOwnBackground: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: CLAIM.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: crayonClaimSet(TITLE.w, TITLE.size, TITLE.lineHeight),
} satisfies LayoutDefinition
