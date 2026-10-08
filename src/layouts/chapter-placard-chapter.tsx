import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { LineupWash } from "./compositions/lineup"
import { fitLineupClaim } from "./lineup-shared"
import {
  PLACARD_META,
  PlacardGlow,
  paintPlacard,
  paintPlacardPhoto,
  paintPlacardRule,
  paintPlacardTracked,
  placardBaseline,
  placardInks,
  placardMark,
  placardMeta,
  placardText,
  placardTrackedWidth,
} from "./compositions/placard"
import { PlacardFoot, PlacardHall } from "./placard-shared"

type Image = Extract<Component, { type: "image" }>

/**
 * placard-chapter：走进下一个展厅，museum 2026-10 定稿（p05、p09、p13）。
 * 厅堂色底，右侧一圈暖光，左上是这个展厅的厅名（页面的 `kicker`，「第一
 * 展厅」）和 y58 的接缝，正中偏左再写一遍厅名，14px 铜色、字距 10px，下面
 * 是厅题（`heading`）68px 衬线常规字重，一道 120px 的铜色短线，副题
 * （`subheading`）16px 旧纸色、字距 2px，右下是门牌页码。
 *
 * 有照片（第一个 `image` 组件或页面的 `background` 资产）时照片铺满整版，
 * 压一层厅堂色，暖光、厅名、厅题和副题都照旧，厅名不会因为放了图就丢。图
 * 注（`footnote`）在右下门牌左边。
 *
 * 不画 motif，页脚的页码由本脸画在门牌里。零 theme id、零 hex。
 */

const LIGHT = { cx: 900, cy: 380, r: 360, strength: 0.16 } as const
const VEIL = [
  { offset: "0%", opacity: 0.92 },
  { offset: "55%", opacity: 0.72 },
  { offset: "100%", opacity: 0.45 },
] as const
const HALL = { x: 64, top: 250, size: 14, lineHeight: 24, tracking: 10, w: 1000 } as const
const TITLE = { x: 64, top: 290, size: 68, lineHeight: 96, minPt: 52, w: 1100 } as const
const RULE = { y: 416, w: 120, stroke: 1.4 } as const
const SUB = { x: 64, top: 436, size: 16, lineHeight: 28, tracking: 2, w: 1000 } as const
const NOTE = { right: 1136, top: 678, size: 10, lineHeight: 16, tracking: 0.5, w: 700 } as const

export function PlacardChapter({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = placardInks(ctx)
  const ground = inks.ground
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const footer = resolveDeckFooter(ir)
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const hall = stripEmphasis(slide.kicker ?? "").trim()
  const hallFits = !hall || placardTrackedWidth(hall, HALL.size, HALL.tracking, ctx) <= HALL.w
  const titleText = stripEmphasis(slide.heading ?? "").trim()
  // One line whenever it fits, a few points smaller to stay there, else two lines broken at a comma or a colon, the last on the board's line.
  const fitted = titleText ? fitLineupClaim(slide.heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight, 2) : null
  const title = fitted && !fitted.truncated && fitted.lines.length <= 2 && fitted.fontSize >= TITLE.minPt ? fitted : undefined
  const rise = title ? (title.lines.length - 1) * TITLE.lineHeight : 0
  const sub = stripEmphasis(slide.subheading ?? "").trim()
  const subFits = !sub || placardTrackedWidth(sub, SUB.size, SUB.tracking, ctx) <= SUB.w
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const noteFits = !note || placardTrackedWidth(note, NOTE.size, NOTE.tracking, ctx) <= NOTE.w
  return (
    <>
      <rect data-placard-hall="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? (
        <g data-placard-chapter-photo="">
          {paintPlacardPhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <LineupWash id={`placard-chapter-veil-${pageIndex}`} box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={ground} axis="x" stops={VEIL} />
        </g>
      ) : null}
      <PlacardGlow id={`placard-chapter-light-${pageIndex}`} cx={LIGHT.cx} cy={LIGHT.cy} r={LIGHT.r} strength={LIGHT.strength} ctx={ctx} />
      <PlacardHall ctx={ctx} hall={hall} />
      {hall && hallFits ? <g data-placard-chapter-hall={hall}>{paintPlacardTracked({ ctx, text: hall, x: HALL.x, y: placardBaseline(HALL.top - rise, HALL.lineHeight, HALL.size), size: HALL.size, tracking: HALL.tracking, fill: placardText(inks.copper, ground, HALL.size) })}</g> : null}
      {title ? <g data-placard-chapter-title="">{paintPlacard(title, { ctx, x: TITLE.x, top: TITLE.top - rise, fill: placardText(inks.ink, ground, title.fontSize), serif: true })}</g> : null}
      {paintPlacardRule(TITLE.x, TITLE.x + RULE.w, RULE.y, placardMark(inks.copper, ground), RULE.stroke)}
      {sub && subFits ? <g data-placard-chapter-sub="">{paintPlacardTracked({ ctx, text: sub, x: SUB.x, y: placardBaseline(SUB.top, SUB.lineHeight, SUB.size), size: SUB.size, tracking: SUB.tracking, fill: placardText(inks.muted, ground, SUB.size) })}</g> : null}
      {note && noteFits ? <g data-placard-chapter-note="">{paintPlacardTracked({ ctx, text: note, x: NOTE.right, y: placardBaseline(NOTE.top, NOTE.lineHeight, NOTE.size), size: NOTE.size, tracking: NOTE.tracking, anchor: "end", fill: placardMeta(inks.dim, ground), attrs: { ...PLACARD_META } })}</g> : null}
      <PlacardFoot ctx={ctx} folio={footer.pageNumber ? pageIndex + 1 : null} />
      {(hall && !hallFits) || (titleText && !title) || (sub && !subFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-placard-chapter.tsx: museum's chapter page. The next hall of the
  // gallery: a pool of warm light at the right, the hall's name small in
  // copper and tracked wide over its title in the serif, a short copper rule
  // and a tracked line under it, over the page's photograph when it has one.
  id: "placard-chapter",
  kind: "standard",
  story: {
    name: "Placard Chapter",
    story: "The doorway to the next hall: the room dark but for a pool of warm light, the hall's name small in copper over its title in a quiet serif, a short copper rule and a line saying what is inside, and the hall's number on the door plate.",
    positioning: "Opens a part of an exhibition talk, a curator's tour or a science lecture. Choose it when each part is a room the audience walks into.",
    audience: "Visitors moving from one hall to the next, who need a breath and a name before the next exhibits.",
    notFor: "A working session's section break, where a darkened doorway slows the room down.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: false, lineHeightRatio: TITLE.lineHeight / TITLE.size },
} satisfies LayoutDefinition
