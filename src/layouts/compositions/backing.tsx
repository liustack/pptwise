import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CrayonLine,
  CrayonPhoto,
  DrawnBox,
  PhotoNote,
  boardY,
  crayonInks,
  crayonMark,
  crayonText,
  crayonTint,
  fitCrayon,
  fitPhotoNote,
  paintCrayon,
  paintCrayonIcon,
  placeCrayonClaim,
  placeCrayonSource,
} from "./crayonbox"

type Image = Extract<Component, { type: "image" }>
type IconCards = Extract<Component, { type: "icon_cards" }>
type Callout = Extract<Component, { type: "callout" }>
type Paragraph = Extract<Component, { type: "paragraph" }>
type Bullets = Extract<Component, { type: "bullets" }>

/*
 * backing: what the studies found, beside what to do about it, crayon's
 * 2026-10 board (p15). A photograph in a sky-blue crayon frame with its note
 * under it; beside it a purple card drawn by hand a study, its symbol and
 * who was studied, what was found, and where it was published in the grey,
 * and under the cards a caution in the grey. At the right what to do: its
 * lead line (the `paragraph` before the list) with a stroke of the section's
 * crayon under it, then a hand-drawn box a thing, ticked in the leaf green.
 *
 * Takes, in the crayonbox setting: an `image`, an untitled `icon_cards` of
 * one or two studies, every card with a symbol and a tag with words alone,
 * optionally a `callout` with words alone, then a one-line `paragraph` and a
 * checklist `bullets` of two to five.
 *
 * Declines: a card with a tone, a study, a caution, a lead or a thing past
 * its room, a bullets of another style.
 *
 * Reads: the crayonbox inks (`./crayonbox.tsx`).
 */

const PHOTO = { top: 186, w: 420, h: 300, r: 26, note: 496 } as const
const STUDY = { x: 456, top: 186, w: 330, h: 154, pitch: 170, icon: { x: 22, y: 20, size: 22 }, who: { x: 54, top: 16, w: 260, size: 16, lineHeight: 30 }, what: { x: 22, top: 54, w: 290, size: 14, lineHeight: 23, maxLines: 3 }, where: { x: 22, top: 126, size: 11, lineHeight: 20 } } as const
const CAUTION = { top: 530, size: 13, lineHeight: 21, maxLines: 2 } as const
const TODO = { x: 822, w: 330, lead: { top: 186, size: 20, lineHeight: 40 }, line: { y: 232, w: 154, stroke: 6 }, top: 252, pitch: 84, box: { size: 30, r: 7, stroke: 3 }, tick: 4, text: { x: 44, dy: -2, size: 16, lineHeight: 26, maxLines: 2 } } as const

export const backingComposition: Composition = ({ components, ctx, rect, setting, claim, source, inks: given }) => {
  if (setting !== "crayonbox") return null
  const [image, cards, ...more] = components
  if (image?.type !== "image" || cards?.type !== "icon_cards") return null
  const callout = more[0]?.type === "callout" ? (more[0] as Callout) : undefined
  const [lead, list, ...rest] = callout ? more.slice(1) : more
  if (lead?.type !== "paragraph" || list?.type !== "bullets" || rest.length > 0) return null
  if (callout && (callout.title || callout.icon || callout.tag)) return null
  const studies = (cards as IconCards).items
  if ((cards as IconCards).title?.trim() || studies.length < 1 || studies.length > 2) return null
  if (studies.some((it) => it.tone || !it.tag?.text?.trim() || it.tag.evidence || it.tag.tone || it.tag.basis || it.tag.quiet || it.tag.settled)) return null
  const b = list as Bullets
  if (b.style !== "checklist" || b.items.length < 2 || b.items.length > 5) return null
  const who = studies.map((it) => fitCrayon(it.title, { width: STUDY.who.w, size: STUDY.who.size, lineHeight: STUDY.who.lineHeight, maxLines: 1, weight: 900 }, ctx))
  const what = studies.map((it) => fitCrayon(it.text, { width: STUDY.what.w, size: STUDY.what.size, lineHeight: STUDY.what.lineHeight, maxLines: STUDY.what.maxLines, weight: 600 }, ctx))
  const where = studies.map((it) => fitCrayon(it.tag!.text, { width: STUDY.what.w, size: STUDY.where.size, lineHeight: STUDY.where.lineHeight, maxLines: 1, weight: 600 }, ctx))
  if ([...who, ...what, ...where].some((x) => !x)) return null
  const caution = callout ? fitCrayon(callout.text, { width: STUDY.w, size: CAUTION.size, lineHeight: CAUTION.lineHeight, maxLines: CAUTION.maxLines, weight: 600 }, ctx) : undefined
  if (caution === null) return null
  const heading = fitCrayon((lead as Paragraph).text, { width: TODO.w, size: TODO.lead.size, lineHeight: TODO.lead.lineHeight, maxLines: 1, weight: 900 }, ctx)
  if (!heading) return null
  const pitch = Math.min(TODO.pitch, (BOTTOM - TODO.top) / b.items.length)
  const things = b.items.map((t) => fitCrayon(t, { width: TODO.w - TODO.text.x, size: TODO.text.size, lineHeight: TODO.text.lineHeight, maxLines: TODO.text.maxLines, weight: 700 }, ctx))
  if (things.some((x) => !x)) return null
  const note = fitPhotoNote((image as Image).caption, PHOTO.w, ctx)
  if (note === null) return null
  const head = placeCrayonClaim(claim, { x: rect.x, w: 1080 })
  if (head === false) return null
  const foot = placeCrayonSource(source, { x: rect.x, w: rect.w - 52 })
  if (foot === false) return null
  const inks = crayonInks(ctx)
  const ground = inks.ground
  const section = given?.section ?? inks.orange
  const studyFill = crayonTint(inks.purple, inks)
  const todoX = rect.x + TODO.x
  const boxInk = crayonMark(section, inks.card)
  const tickInk = crayonMark(inks.leaf, inks.card)
  return (
    <g {...compositionTag("backing")}>
      {head}
      <g {...blockTag(ctx, image)}>
        <CrayonPhoto assetId={(image as Image).asset_id} box={{ x: rect.x, y: boardY(rect, PHOTO.top), w: PHOTO.w, h: PHOTO.h }} ctx={ctx} r={PHOTO.r} frame={inks.sky} />
        {note ? <PhotoNote layout={note} x={rect.x} top={boardY(rect, PHOTO.note)} ctx={ctx} /> : null}
      </g>
      <g {...blockTag(ctx, cards)}>
        {studies.map((it, i) => {
          const x = rect.x + STUDY.x
          const y = boardY(rect, STUDY.top + i * STUDY.pitch)
          return (
            <g key={i} data-crayon-study={stripEmphasis(it.title).trim()}>
              <DrawnBox box={{ x, y, w: STUDY.w, h: STUDY.h }} color={inks.purple} fill={studyFill} />
              {paintCrayonIcon(it.icon, x + STUDY.icon.x, y + STUDY.icon.y, STUDY.icon.size, inks.ink, studyFill)}
              {paintCrayon(who[i]!, { ctx, x: x + STUDY.who.x, top: y + STUDY.who.top, weight: 900, heading: true, fill: crayonText(inks.ink, studyFill, STUDY.who.size), ground: studyFill })}
              {paintCrayon(what[i]!, { ctx, x: x + STUDY.what.x, top: y + STUDY.what.top, weight: 600, fill: crayonText(inks.ink, studyFill, STUDY.what.size), ground: studyFill })}
              {paintCrayon(where[i]!, { ctx, x: x + STUDY.what.x, top: y + STUDY.where.top, weight: 600, fill: crayonText(inks.muted, studyFill, STUDY.where.size), ground: studyFill })}
            </g>
          )
        })}
      </g>
      {caution && callout ? <g {...blockTag(ctx, callout)} data-crayon-caution="">{paintCrayon(caution, { ctx, x: rect.x + STUDY.x, top: boardY(rect, CAUTION.top), weight: 600, fill: crayonText(inks.muted, ground, CAUTION.size) })}</g> : null}
      <g {...blockTag(ctx, lead)} data-crayon-todo-lead="">
        {paintCrayon(heading, { ctx, x: todoX, top: boardY(rect, TODO.lead.top), weight: 900, heading: true, fill: crayonText(inks.ink, ground, TODO.lead.size) })}
        <g data-decor-piece="crayon-todo-line">
          <CrayonLine x1={todoX} x2={todoX + TODO.line.w} y={boardY(rect, TODO.line.y)} color={section} width={TODO.line.stroke} />
        </g>
      </g>
      <g {...blockTag(ctx, list)}>
        {b.items.map((t, i) => {
          const y = boardY(rect, TODO.top) + i * pitch
          const s = TODO.box.size
          return (
            <g key={i} data-crayon-check={stripEmphasis(t).trim()}>
              <rect x={todoX} y={y} width={s} height={s} rx={TODO.box.r} fill={inks.card} stroke={boxInk} strokeWidth={TODO.box.stroke} />
              <path d={`M ${todoX + 6} ${y + 15} L ${todoX + 13} ${y + 22} L ${todoX + 25} ${y + 7}`} fill="none" stroke={tickInk} strokeWidth={TODO.tick} strokeLinecap="round" strokeLinejoin="round" />
              {paintCrayon(things[i]!, { ctx, x: todoX + TODO.text.x, top: y + TODO.text.dy, weight: 700, fill: crayonText(inks.ink, ground, TODO.text.size) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}

/** Where the list must end: the band's foot on the board. */
const BOTTOM = 630
