import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { compose } from "./compositions"
import {
  LINEUP_META,
  LineupWash,
  fitLineup,
  lineupBaseline,
  lineupChinese,
  lineupInks,
  lineupMeta,
  lineupNumeral,
  lineupText,
  lineupTrackedWidth,
  lineupWidth,
  paintLineup,
  paintLineupPhoto,
  paintLineupTracked,
} from "./compositions/lineup"
import { LineupMasthead, mastheadLabel } from "./lineup-shared"
import { PARADE_LOOKS, paradeLeftOut } from "./compositions/parade"
import type { HeadingCtx } from "./heading-set"

type Image = Extract<Component, { type: "image" }>
type Grid = Extract<Component, { type: "image_grid" }>

/**
 * lineup-chapter：秀场出场单的章节页，runway 2026-10 定稿（p05、p07、p12）。
 *
 * 一种是满版照片（第一个 `image` 组件，可带 `crop`，或页面的 `background`
 * 资产）：底部压一层秀场黑由深到浅的渐隐，顶部一道淡黑托住报头，报头用米
 * 白（左边 deck 标签，右边这一部分，页面的 `kicker`，没有就按章节页在 deck
 * 里的次序写「第 N 部分」/ "Part N"），左下 240px 衬线章号「01」，右下右对齐
 * 的章题 48px 衬线和副题 15px，右下角图注（`footnote`）。
 *
 * 另一种是出场队列（一个 `image_grid`）：米白底，黑报头，左上 150px 章号，
 * 右边章题 40px 和副题，下面一排竖窗交给 `parade` 构图（每张图用 `crop`
 * 从合影里取一个人），左下图注。
 *
 * 没有照片也没有队列时，就是秀场黑上的章号与章题。零 theme id、零 hex。
 */

const STAGE_TOP = [
  { offset: "0%", opacity: 0.55 },
  { offset: "100%", opacity: 0 },
] as const
const STAGE_FOOT = [
  { offset: "0%", opacity: 0.15 },
  { offset: "45%", opacity: 0.15 },
  { offset: "100%", opacity: 0.78 },
] as const
const PHOTO = {
  numeral: { x: 56, top: 360, size: 240, lineHeight: 240, tracking: -6 },
  title: { right: 1220, top: 470, size: 48, min: 36, lineHeight: 60, w: 660 },
  sub: { right: 1220, top: 540, size: 15, lineHeight: 26, w: 660 },
  note: { right: 1216, top: 682, size: 10, lineHeight: 16, tracking: 0.5, w: 600 },
} as const
const ROW = {
  numeral: { x: 64, top: 76, size: 150, lineHeight: 160, tracking: -4 },
  title: { x: 480, top: 112, size: 40, min: 30, lineHeight: 48, w: 736 },
  sub: { x: 480, top: 168, size: 15, lineHeight: 26, w: 736 },
  band: { x: 64, y: 262, w: 1152, h: 392 },
  note: { x: 64, top: 680, size: 10, lineHeight: 16, tracking: 0.5, w: 1152 },
} as const

/** The part's numeral is the page's foreground, not a ghost behind it: the depth contract fades a large chapter numeral unless told. */
const FOREGROUND = { "data-depth": "fg" } as const

/** The largest size from `size` down to `min` that sets `text` on one line in the serif across `w`, or `null`. */
function oneLine(text: string, size: number, min: number, w: number, ctx: HeadingCtx): number | null {
  for (let s = size; s >= min; s -= 1) if (lineupWidth(text, s, ctx, { serif: true }) <= w) return s
  return null
}

/** The masthead's section on a chapter page: the page's own kicker, or the part's number in the deck's language. */
function partName(kicker: string | undefined, n: number, chinese: boolean): string {
  const own = stripEmphasis(kicker ?? "").trim()
  if (own) return own
  return chinese ? `第 ${n} 部分` : `Part ${n}`
}

export function LineupChapter({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = lineupInks(ctx)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const chapterIndex = ir.slides.slice(0, pageIndex).filter((s) => s.type === "chapter").length
  const numeral = lineupNumeral(chapterIndex)
  const footer = resolveDeckFooter(ir)
  const label = mastheadLabel(footer)
  const chinese = lineupChinese(ctx, [slide.heading ?? "", slide.subheading ?? ""])
  const section = partName(slide.kicker, chapterIndex + 1, chinese)
  const grid = slide.components.find((c) => c.type === "image_grid") as Grid | undefined
  if (grid) return <ChapterRow {...{ slide, ctx, numeral, label, section, grid }} />
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const stage = inks.stage
  const title = stripEmphasis(slide.heading ?? "").trim()
  const titleSize = title ? oneLine(title, PHOTO.title.size, PHOTO.title.min, PHOTO.title.w, ctx) : null
  const titleFits = !title || titleSize !== null
  const sub = slide.subheading?.trim() ? fitLineup(slide.subheading, { width: PHOTO.sub.w, size: PHOTO.sub.size, lineHeight: PHOTO.sub.lineHeight, maxLines: 1 }, ctx) : undefined
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const noteFits = !note || lineupTrackedWidth(note, PHOTO.note.size, PHOTO.note.tracking, ctx) <= PHOTO.note.w
  return (
    <>
      <rect data-lineup-stage="" x={0} y={0} width={1280} height={720} fill={stage} />
      {asset ? (
        <g data-lineup-chapter-photo="">
          {paintLineupPhoto(asset, { x: 0, y: 0, w: 1280, h: 720 }, ctx, { crop: image?.crop })}
          <LineupWash id={`lineup-chapter-foot-${pageIndex}`} box={{ x: 0, y: 0, w: 1280, h: 720 }} ink={stage} axis="y" stops={STAGE_FOOT} />
          <LineupWash id={`lineup-chapter-top-${pageIndex}`} box={{ x: 0, y: 0, w: 1280, h: 110 }} ink={stage} axis="y" stops={STAGE_TOP} />
        </g>
      ) : null}
      <LineupMasthead ctx={ctx} label={label} section={section} dark />
      <g data-lineup-chapter-numeral={numeral}>{paintLineupTracked({ ctx, text: numeral, x: PHOTO.numeral.x, y: lineupBaseline(PHOTO.numeral.top, PHOTO.numeral.lineHeight, PHOTO.numeral.size, true), size: PHOTO.numeral.size, tracking: PHOTO.numeral.tracking, serif: true, fill: lineupText(inks.light, stage, PHOTO.numeral.size), attrs: FOREGROUND })}</g>
      {title && titleSize !== null ? <g data-lineup-chapter-title="">{paintLineupTracked({ ctx, text: title, x: PHOTO.title.right, y: lineupBaseline(PHOTO.title.top, PHOTO.title.lineHeight, titleSize, true), size: titleSize, tracking: 0, serif: true, anchor: "end", fill: lineupText(inks.light, stage, titleSize) })}</g> : null}
      {sub ? <g data-lineup-chapter-sub="">{paintLineup(sub, { ctx, x: PHOTO.sub.right, top: PHOTO.sub.top, anchor: "end", fill: lineupText(inks.lightQuiet, stage, PHOTO.sub.size), ground: stage })}</g> : null}
      {note && noteFits ? <g data-lineup-chapter-note="">{paintLineupTracked({ ctx, text: note, x: PHOTO.note.right, y: lineupBaseline(PHOTO.note.top, PHOTO.note.lineHeight, PHOTO.note.size), size: PHOTO.note.size, tracking: PHOTO.note.tracking, anchor: "end", fill: lineupMeta(inks.lightQuiet, stage), attrs: { ...LINEUP_META } })}</g> : null}
      {(title && !titleFits) || (slide.subheading?.trim() && !sub) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

/** The chapter that opens on the looks in a row: paper, the numeral and title at the top, the row of windows under them. */
function ChapterRow({ slide, ctx, numeral, label, section, grid }: Pick<SvgTemplateProps, "slide" | "ctx"> & { numeral: string; label: string; section: string; grid: Grid }) {
  const inks = lineupInks(ctx)
  const ground = inks.ground
  const title = stripEmphasis(slide.heading ?? "").trim()
  const titleSize = title ? oneLine(title, ROW.title.size, ROW.title.min, ROW.title.w, ctx) : null
  const titleFits = !title || titleSize !== null
  const sub = slide.subheading?.trim() ? fitLineup(slide.subheading, { width: ROW.sub.w, size: ROW.sub.size, lineHeight: ROW.sub.lineHeight, maxLines: 1 }, ctx) : undefined
  const note = stripEmphasis(slide.footnote ?? "").trim()
  const noteFits = !note || lineupTrackedWidth(note, ROW.note.size, ROW.note.tracking, ctx) <= ROW.note.w
  const row = compose({ components: [grid], ctx, rect: ROW.band, setting: "lineup" }, ["parade"])
  return (
    <>
      <rect data-lineup-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      <LineupMasthead ctx={ctx} label={label} section={section} />
      <g data-lineup-chapter-numeral={numeral}>{paintLineupTracked({ ctx, text: numeral, x: ROW.numeral.x, y: lineupBaseline(ROW.numeral.top, ROW.numeral.lineHeight, ROW.numeral.size, true), size: ROW.numeral.size, tracking: ROW.numeral.tracking, serif: true, fill: lineupText(inks.ink, ground, ROW.numeral.size), attrs: FOREGROUND })}</g>
      {title && titleSize !== null ? <g data-lineup-chapter-title="">{paintLineupTracked({ ctx, text: title, x: ROW.title.x, y: lineupBaseline(ROW.title.top, ROW.title.lineHeight, titleSize, true), size: titleSize, tracking: 0, serif: true, fill: lineupText(inks.ink, ground, titleSize) })}</g> : null}
      {sub ? <g data-lineup-chapter-sub="">{paintLineup(sub, { ctx, x: ROW.sub.x, top: ROW.sub.top, fill: lineupText(inks.muted, ground, ROW.sub.size) })}</g> : null}
      {row ?? <g data-dropped={grid.items.length} data-dropped-kind="component" />}
      {note && noteFits ? <g data-lineup-chapter-note="">{paintLineupTracked({ ctx, text: note, x: ROW.note.x, y: lineupBaseline(ROW.note.top, ROW.note.lineHeight, ROW.note.size), size: ROW.note.size, tracking: ROW.note.tracking, fill: lineupMeta(inks.muted, ground), attrs: { ...LINEUP_META } })}</g> : null}
      {(title && !titleFits) || (slide.subheading?.trim() && !sub) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {note && !noteFits ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-lineup-chapter.tsx: runway's chapter page. A part opens over a
  // full-page photograph with its numeral set huge at the bottom left and its
  // title right-aligned, or over the looks in a row under its numeral.
  id: "lineup-chapter",
  kind: "standard",
  story: {
    name: "Lineup Chapter",
    story: "A part of the show begins: a photograph across the page darkening to the floor, the part's number set huge in a serif and its title at the right, or the part's looks standing in a row of tall windows under its number.",
    positioning: "Opens a part of a collection, a lookbook or a portfolio review. Choose it when each part should open on a picture of the work, or on the line-up of the looks it brings out.",
    audience: "An audience that came to see the work and needs a picture and a breath between its parts.",
    notFor: "A working session's section break, where a full-page photograph slows the room down.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "image", accepts: ["image", "image_grid"], capacity: 1, selection: "first", itemMinimum: PARADE_LOOKS.min, itemCapacity: PARADE_LOOKS.max, declines: paradeLeftOut },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  branding: "none",
  headingFit: { maxWidth: PHOTO.title.w, fontSize: PHOTO.title.size, maxLines: 1, minPt: PHOTO.title.min, bold: false, lineHeightRatio: PHOTO.title.lineHeight / PHOTO.title.size },
  headingSet: ({ slide, ctx }) => {
    const title = stripEmphasis(slide.heading ?? "").trim()
    // The row of looks sets the title in its own column, the photograph in another.
    const box = slide.components.some((c) => c.type === "image_grid") ? ROW.title : PHOTO.title
    return title && oneLine(title, box.size, box.min, box.w, ctx) === null ? "declined" : "whole"
  },
} satisfies LayoutDefinition
