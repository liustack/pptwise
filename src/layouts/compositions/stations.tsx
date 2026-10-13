import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitFigure,
  paintPortraitLine,
  paintPortraitPhoto,
  paintPortraitRule,
  placePortraitHead,
  placePortraitSource,
  portraitBodyBottom,
  portraitBaseline,
  portraitFigureWidth,
  portraitInks,
  portraitMark,
  portraitMeta,
  portraitText,
  portraitWidth,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Image = Extract<Component, { type: "image" }>
type Timeline = Extract<Component, { type: "timeline" }>
type Milestone = Timeline["milestones"][number]

/*
 * stations: a career told as a few dated posts, each with the one result it
 * left, profile's 2026-10 board (p03). A photograph runs across the top of
 * the page, 210px tall. Under it the section line and the claim from y246,
 * and the posts in equal columns from x80 to x1200, 32px apart, each under a
 * hairline of the ink: the date in the heading serif at 16px in the grey,
 * the post bold in the serif at 22px, the result as a figure bold at 48px
 * with its unit after it at 18px, and the milestone's words at 15/24 under
 * it. The post the speaker holds now (the highlighted milestone) hangs from
 * a 3px rule of the accent, its figure in the accent and its tag (「现在」)
 * bold in the accent at the right of its date.
 *
 * The figure is the last number in the milestone's words with its unit
 * (「积分投诉归成 5 类」 sets 「5」 and 「类」), the words then set under it.
 *
 * Takes, in the portrait setting: an `image` and a horizontal `timeline` of
 * two to five milestones, every one with a title and words holding a
 * number, at most one highlighted, and only the highlighted one tagged.
 *
 * Declines: a timeline title, lanes, periods, a status, a milestone's
 * source, words past three lines, a figure wider than its column, a caption.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces,
 * the image's crop or its centre.
 */

const PHOTO = { x: 0, y: 0, w: 1280, h: 210 } as const
const HEAD = { x: 80, top: 246, w: 1120 } as const
const POSTS = {
  x: 80,
  w: 1120,
  gap: 32,
  below: 54,
  pad: 16,
  date: { size: 16, lineHeight: 23 },
  tag: { size: 15 },
  between: 6,
  title: { size: 22, lineHeight: 32 },
  figureGap: 18,
  figure: { size: 48, lineHeight: 55, unit: 18, gap: 6 },
  text: { size: 15, lineHeight: 24, maxLines: 3 },
  lit: 3,
  bottom: 650,
} as const

/**
 * The milestone's figure: the last number in its words, with the word after
 * it as its unit when that word closes the clause (「降到 380 件」 sets 「380」
 * and 「件」, "into 5 types" sets "5" and "types", "380 a month" sets "380"
 * alone). `null` when the words hold no number.
 */
export function stationFigure(desc: string | undefined): { value: string; unit?: string; words: string } | null {
  const words = stripEmphasis(desc ?? "").trim()
  const numbers = [...words.matchAll(/\d[\d,]*(?:\.\d+)?%?/gu)]
  const last = numbers.at(-1)
  if (!last) return null
  const after = words.slice(last.index + last[0].length)
  const unit = /^\s?(\p{Script=Han}{1,2}|[A-Za-z]+)(?=$|[\s]*[，。、；：,.;:!?！？])/u.exec(after)?.[1]
  return { value: last[0], ...(unit ? { unit } : {}), words }
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const stationsRecipe: Recipe = {
  look: "A career told as a few dated posts, each with the one result it left",
  kinds: ["process"],
  shapes: [{ parts: [{ type: "image" }, { type: "timeline", count: [2, 5], needs: ["milestones[*].desc", "milestones[].highlight", "milestones[*].desc~figure"] }] }],
}

export const stationsComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length !== 2) return null
  const image = components.find((c): c is Image => c.type === "image")
  const timeline = components.find((c): c is Timeline => c.type === "timeline")
  if (!image || !timeline || image.caption?.trim() || timeline.title?.trim() || timeline.layout === "vertical" || timeline.lanes || timeline.periods) return null
  const posts = timeline.milestones
  if (posts.length < 2 || posts.length > 5) return null
  if (posts.filter((m) => m.highlight).length > 1) return null
  if (posts.some((m: Milestone) => m.status || m.source || m.lane || (m.tag && !m.highlight) || !m.title.trim())) return null
  const colW = (POSTS.w - POSTS.gap * (posts.length - 1)) / posts.length
  const cells = posts.map((m) => {
    const figure = stationFigure(m.desc)
    return {
      m,
      figure,
      title: fitPortrait(m.title, { width: colW, size: POSTS.title.size, lineHeight: POSTS.title.lineHeight, maxLines: 1, serif: true, bold: true }, ctx),
      words: figure ? fitPortrait(figure.words, { width: colW, size: POSTS.text.size, lineHeight: POSTS.text.lineHeight, maxLines: POSTS.text.maxLines }, ctx) : null,
    }
  })
  if (cells.some((c) => !c.figure || !c.title || !c.words)) return null
  if (cells.some((c) => portraitFigureWidth(c.figure!.value, c.figure!.unit, POSTS.figure, ctx) > colW)) return null
  const dateRoom = (m: Milestone) => colW - (m.tag ? portraitWidth(m.tag.text, POSTS.tag.size, ctx, { serif: true, bold: true }) + 12 : 0)
  if (cells.some((c) => portraitWidth(c.m.date, POSTS.date.size, ctx, { serif: true }) > dateRoom(c.m))) return null
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head) return null
  const top = head.bottom + POSTS.below
  const figureTop = top + 1 + POSTS.pad + POSTS.date.lineHeight + POSTS.between + POSTS.title.lineHeight + POSTS.between + POSTS.figureGap
  const wordsTop = figureTop + POSTS.figure.lineHeight + POSTS.between
  const credit = placePortraitSource(source, { x: POSTS.x, w: POSTS.w, footer: true })
  if (credit === false) return null
  if (wordsTop + Math.max(...cells.map((c) => c.words!.lines.length)) * POSTS.text.lineHeight > portraitBodyBottom(credit, POSTS.bottom)) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("stations")}>
      {paintPortraitPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop, focus: [0.5, 0.5] })}
      {head.node}
      <g {...blockTag(ctx, timeline)} data-portrait-posts="">
        {cells.map((c, i) => {
          const x = POSTS.x + i * (colW + POSTS.gap)
          const lit = c.m.highlight === true
          const dateTop = top + 1 + POSTS.pad
          const titleTop = dateTop + POSTS.date.lineHeight + POSTS.between
          return (
            <g key={i} data-portrait-post={stripEmphasis(c.m.title)} data-lit={lit ? "" : undefined}>
              {lit ? paintPortraitRule(x, x + colW, top + POSTS.lit / 2, portraitMark(inks.lead, ground), POSTS.lit) : paintPortraitRule(x, x + colW, top + 0.5, inks.ink, 1)}
              {paintPortraitLine(c.m.date, { ctx, x, top: dateTop, lineHeight: POSTS.date.lineHeight, size: POSTS.date.size, serif: true, fill: portraitMeta(inks.muted, ground) })}
              {c.m.tag ? paintPortraitLine(c.m.tag.text, { ctx, x: x + colW, anchor: "end", baseline: portraitBaseline(dateTop, POSTS.date.lineHeight, POSTS.date.size, true), size: POSTS.tag.size, serif: true, bold: true, fill: portraitText(inks.lead, ground, POSTS.tag.size), attrs: { "data-portrait-tag": "" } }) : null}
              {paintPortrait(c.title!, { ctx, x, top: titleTop, fill: portraitText(inks.ink, ground, POSTS.title.size), serif: true, bold: true })}
              {paintPortraitFigure({ ctx, value: c.figure!.value, unit: c.figure!.unit, x, baseline: portraitBaseline(figureTop, POSTS.figure.lineHeight, POSTS.figure.size, true), spec: POSTS.figure, fill: portraitText(lit ? inks.lead : inks.ink, ground, POSTS.figure.unit) })}
              {paintPortrait(c.words!, { ctx, x, top: wordsTop, fill: portraitText(inks.body, ground, POSTS.text.size) })}
            </g>
          )
        })}
      </g>
      {credit}
    </g>
  )
}
