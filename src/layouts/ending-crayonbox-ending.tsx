import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { boundarySlotBlock, drawableItems } from "./boundary-content"
import { splitLabel } from "./compositions/manuscript"
import { CRAYON_META, CRAYON_SPEC, CrayonLine, DrawnBox, Star, Sun, crayonBaseline, crayonInks, crayonMeta, crayonSectionColor, crayonText, crayonWidth, fitCrayon, inkOn, paintCrayon, paintCrayonIcon, paintCrayonLine } from "./compositions/crayonbox"
import { CrayonClaimText, SectionCapsule, fitCrayonClaim, crayonClaimSet, CLAIM } from "./crayonbox-frame"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Bullets = Extract<Component, { type: "bullets" }>

/**
 * crayonbox-ending：一盒蜡笔的结尾，crayon 2026-10 定稿（p18）。
 *
 * 页面自己的 `background` 照片铺满整页（`drawsPhoto`），从左往右压一层纸色：
 * 左缘 97%，55% 处 90%，右缘 40%，字都站在左边的纸上。左上一个圆角胶囊写页面的
 * `kicker`（「下次见」），颜色是 deck 最后一个分区的蜡笔色。下面是 58/80 的粗圆体
 * 标题，标题下一道天蓝蜡笔线。再下面是联系卡：页面的 `icon_cards`（或一组
 * `bullets`，每条按「名字：说明」拆开），一张一行，白底手画描两遍边，左边一个
 * 同色圆里放图标（列表没有图标就放序号），右边是名字和一行灰字；三张以内一列，
 * 四到六张排两列。最下面一枚橘色胶囊写页面的 `subheading`（「有事随时找老师」）。
 * 右上一个太阳和一颗星。左下角一行小字是页面的 `footnote`（背景图的说明）。
 * 不画页码：页码只上内容页。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const VEIL = [
  { offset: "0%", opacity: 0.97 },
  { offset: "55%", opacity: 0.9 },
  { offset: "100%", opacity: 0.4 },
] as const
const CAPSULE = { x: 64, y: 80, h: 38, size: 16 } as const
const TITLE = { x: 64, top: 150, w: 800, size: 58, lineHeight: 80 } as const
const UNDERLINE = { x2: 420, gap: 16, stroke: 10 } as const
const CARDS = { gap: 60, w: 640, h: 80, pitch: 96, r: 20, between: 24, twoUp: 520 } as const
const CARD = { disc: { x: 46, r: 24, icon: 24 }, name: { x: 86, top: 10, size: 22, lineHeight: 30 }, line: { x: 86, top: 42, size: 15, lineHeight: 26 } } as const
const PILL = { y: 600, h: 54, pad: 40, size: 20 } as const
const NOTE = { top: 684, size: 11, lineHeight: 20, w: 900 } as const
const MAX_CARDS = 6

export function CrayonboxEnding({ ir, slide, index, ctx }: SvgTemplateProps) {
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const section = crayonSectionColor(ir.slides, index, inks)
  const photo = slide.background?.kind === "asset"
  const title = fitCrayonClaim(slide.heading, ctx, TITLE.w, TITLE.size, TITLE.lineHeight)
  const foot = TITLE.top + title.lines.length * TITLE.lineHeight
  const found = boundarySlotBlock(slide, ["icon_cards", "bullets"]) as IconCards | Bullets | undefined
  // A contact card a way to reach the school: an icon card's symbol, name and line, or a list item's name before its colon and the rest.
  // A set title, a card's tag or tone has no place on a contact card: the block is declared dropped.
  const plain = found !== undefined && (found.type === "bullets" || (!found.title?.trim() && found.items.every((it) => !it.tag && !it.tone)))
  const block = found
  const cards: { icon?: string; name: string; sep?: string; line?: string }[] = !plain
    ? []
    : found.type === "icon_cards"
      ? found.items.map((it) => ({ icon: it.icon, name: it.title, line: it.text }))
      : drawableItems(found.items).map((item) => {
          const split = splitLabel(item)
          return split ? { name: split.name, sep: split.sep, line: split.rest } : { name: item }
        })
  const items = cards
  const twoUp = items.length > 3
  const cardW = twoUp ? CARDS.twoUp : CARDS.w
  const words = items.map((it) => ({
    name: fitCrayon(it.name, { width: cardW - CARD.name.x - 20, size: CARD.name.size, lineHeight: CARD.name.lineHeight, maxLines: 1, weight: 900 }, ctx),
    line: it.line ? fitCrayon(it.line, { width: cardW - CARD.line.x - 20, size: CARD.line.size, lineHeight: CARD.line.lineHeight, maxLines: 1, weight: 600 }, ctx) : undefined,
  }))
  const cardsTop = foot + CARDS.gap
  const rows = twoUp ? Math.ceil(items.length / 2) : items.length
  // The cards stand clear of the pill at the foot.
  const cardsFit = words.every((w) => w.name && w.line !== null) && cardsTop + (rows - 1) * CARDS.pitch + CARDS.h <= PILL.y - 16
  const pill = slide.subheading?.trim() ? fitCrayon(slide.subheading, { width: 760, size: PILL.size, lineHeight: PILL.h, maxLines: 1, weight: 900 }, ctx) : undefined
  const pillW = pill ? Math.round(Math.max(300, crayonWidth(pill.lines[0] ?? "", PILL.size, ctx, { weight: 900 }) + PILL.pad * 2)) : 0
  const note = slide.footnote?.trim() ? fitCrayon(slide.footnote, { width: NOTE.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 1, weight: 600 }, ctx) : undefined
  const label = slide.kicker ? stripEmphasis(slide.kicker).trim() : ""
  return (
    <>
      {photo ? (
        <g data-crayon-veil="">
          <defs>
            <linearGradient id={`crayon-ending-veil-${index}`} x1={0} y1={0} x2={1} y2={0}>
              {VEIL.map((stop) => (
                <stop key={stop.offset} offset={stop.offset} stopColor={ground} stopOpacity={stop.opacity} />
              ))}
            </linearGradient>
          </defs>
          <rect x={0} y={0} width={1280} height={720} fill={`url(#crayon-ending-veil-${index})`} />
        </g>
      ) : null}
      <g data-decor-piece="sun">
        <Sun cx={1150} cy={110} r={36} color={inks.yellow} />
      </g>
      <g data-decor-piece="stars">
        <Star cx={700} cy={120} r={12} color={inks.orange} />
      </g>
      {label ? <SectionCapsule name={label} color={section} ctx={ctx} x={CAPSULE.x} y={CAPSULE.y} h={CAPSULE.h} size={CAPSULE.size} centred maxW={600} /> : null}
      {slide.heading?.trim() ? (
        <g data-crayon-title="">
          <CrayonClaimText layout={title} ctx={ctx} x={TITLE.x} foot={foot} />
          <g data-decor-piece="crayon-underline">
            <CrayonLine x1={TITLE.x} x2={UNDERLINE.x2} y={foot + UNDERLINE.gap} color={inks.sky} width={UNDERLINE.stroke} />
          </g>
        </g>
      ) : null}
      {block && plain && items.length <= MAX_CARDS && cardsFit ? (
        <g data-crayon-contacts="">
          {items.map((it, i) => {
            const color = inks.box[i % inks.box.length]!
            const col = twoUp ? Math.floor(i / Math.ceil(items.length / 2)) : 0
            const row = twoUp ? i % Math.ceil(items.length / 2) : i
            const x = TITLE.x + col * (cardW + CARDS.between)
            const y = cardsTop + row * CARDS.pitch
            const w = words[i]!
            return (
              <g key={i} data-crayon-contact={stripEmphasis(it.name).trim()}>
                <DrawnBox box={{ x, y, w: cardW, h: CARDS.h }} color={color} fill={inks.card} r={CARDS.r} />
                <circle cx={x + CARD.disc.x} cy={y + CARDS.h / 2} r={CARD.disc.r} fill={color} />
                {it.icon ? (
                  paintCrayonIcon(it.icon, x + CARD.disc.x - CARD.disc.icon / 2, y + CARDS.h / 2 - CARD.disc.icon / 2, CARD.disc.icon, inkOn(color, inks, 16), color)
                ) : (
                  paintCrayonLine(String(i + 1), { ctx, x: x + CARD.disc.x, baseline: crayonBaseline(y + CARDS.h / 2 - 15, 30, 20), size: 20, weight: 900, heading: true, anchor: "middle", fill: inkOn(color, inks, 20), ground: color })
                )}
                {paintCrayon(w.name!, { ctx, x: x + CARD.name.x, top: w.line ? y + CARD.name.top : y + (CARDS.h - CARD.name.lineHeight) / 2, weight: 900, heading: true, fill: crayonText(inks.ink, inks.card, CARD.name.size), ground: inks.card, lastAttrs: it.sep ? { "data-gloss-break": it.sep } : undefined })}
                {w.line ? paintCrayon(w.line, { ctx, x: x + CARD.line.x, top: y + CARD.line.top, weight: 600, fill: crayonText(inks.muted, inks.card, CARD.line.size), ground: inks.card }) : null}
              </g>
            )
          })}
        </g>
      ) : block ? (
        <g data-dropped={1} data-dropped-kind="component" />
      ) : null}
      {pill ? (
        <g data-crayon-pill="">
          <rect x={TITLE.x} y={PILL.y} width={pillW} height={PILL.h} rx={PILL.h / 2} fill={inks.orange} />
          {paintCrayonLine(pill.lines[0]!, { ctx, x: TITLE.x + pillW / 2, top: PILL.y, lineHeight: PILL.h, size: PILL.size, weight: 900, anchor: "middle", fill: inkOn(inks.orange, inks, PILL.size), ground: inks.orange })}
        </g>
      ) : slide.subheading?.trim() ? (
        <g data-dropped={1} data-dropped-kind="label" />
      ) : null}
      {note ? (
        <text {...CRAYON_SPEC} {...CRAYON_META} data-crayon-note="" x={TITLE.x} y={crayonBaseline(NOTE.top, NOTE.lineHeight, NOTE.size)} fontFamily={ctx.fonts.body} fontSize={NOTE.size} fontWeight="600" fill={crayonMeta(inks.muted, ground)} dominantBaseline="alphabetic">
          {note.lines[0]}
        </text>
      ) : slide.footnote?.trim() ? (
        <g data-dropped={1} data-dropped-kind="footnote" />
      ) : null}
    </>
  )
}

export const layoutDef = {
  // ending-crayonbox-ending.tsx: crayon's close. The page's photograph under
  // a veil of paper from the left, the next meeting in a capsule of the last
  // section's crayon, the title with a stroke of sky crayon, a contact card
  // a way to reach the school, and the one line to remember on a tangerine
  // pill.
  id: "crayonbox-ending",
  kind: "standard",
  story: {
    name: "Crayonbox Ending",
    story: "The close drawn over a picture veiled with paper: when we meet next in a capsule of crayon, the title with a stroke of sky blue under it, a card traced by hand for each way to reach the school, and one line to remember on a tangerine pill.",
    positioning: "Closes a parents' meeting, a family evening or an open day. Choose it when the last page should tell families how to stay in touch.",
    audience: "Parents gathering their things, who want the next date and who to ask.",
    notFor: "A report that closes on a decision or a sign-off.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["icon_cards", "bullets"], capacity: 1, itemCapacity: MAX_CARDS },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: CLAIM.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: crayonClaimSet(TITLE.w, TITLE.size, TITLE.lineHeight),
} satisfies LayoutDefinition
