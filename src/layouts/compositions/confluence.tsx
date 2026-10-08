import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  ChalkBox,
  SOURCE_AT,
  chalkMark,
  chalkText,
  chalkboardInks,
  fitChalk,
  fitChalkBroken,
  fitChalkCaption,
  paintChalk,
  paintChalkCaption,
  paintChalkPhoto,
  placeChalkClaim,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Image = Extract<Component, { type: "image" }>
type Equation = Extract<Component, { type: "concept_equation" }>

/*
 * confluence: two paths that meet in one result, lecture's 2026-10 board
 * (p03). A photograph at the left with its caption under it. Beside it two
 * boxes of the board, one over the other, each a path's name in the serif
 * and a line or two on how it goes. A line of chalk curves out of each box
 * and the two meet in an arrow at a box of yellow chalk, the result, its
 * name in yellow and what it does in a short column of chalk white.
 *
 * Takes, in the chalkboard setting: an `image`, then a `concept_equation` of
 * two terms and its result, each a label and a note.
 *
 * Declines: a term or result with a value or an icon, a struck exclusion, a
 * name past one line, a path's note past two lines, the result's note past
 * three lines (the author's breaks kept), a caption past one line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const PHOTO = { x: 64, y: 180, w: 400, h: 300, caption: 488 } as const
const PATH = { x: 510, w: 380, h: 110, tops: [196, 340], pad: 20 } as const
const NAME = { dy: 16, size: 22, lineHeight: 30 } as const
const NOTE = { dy: 52, size: 14, lineHeight: 22, maxLines: 2 } as const
const MEET = { x: 970, y: 323 } as const
const RESULT = { x: 980, y: 250, w: 236, h: 150, pad: 20 } as const
const RESULT_NAME = { top: 268, size: 26, lineHeight: 36 } as const
const RESULT_NOTE = { top: 312, size: 15, lineHeight: 25, maxLines: 3 } as const

export const confluenceComposition: Composition = ({ components, ctx, setting, rect, claim, source }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [picture, equation, ...rest] = components
  if (picture?.type !== "image" || equation?.type !== "concept_equation" || rest.length > 0) return null
  const image = picture as Image
  const eq = equation as Equation
  if (eq.operands.length !== 2 || eq.excluded) return null
  const terms = [...eq.operands, eq.result]
  if (terms.some((t) => t.value?.trim() || t.icon || !t.note?.trim())) return null
  const inner = PATH.w - PATH.pad * 2
  const names = eq.operands.map((t) => fitChalk(t.label, { width: inner, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const notes = eq.operands.map((t) => fitChalkBroken(t.note, { width: inner, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: NOTE.maxLines }, ctx))
  const resultInner = RESULT.w - RESULT.pad * 2
  const resultName = fitChalk(eq.result.label, { width: resultInner, size: RESULT_NAME.size, lineHeight: RESULT_NAME.lineHeight, maxLines: 1, serif: true }, ctx)
  const resultNote = fitChalkBroken(eq.result.note, { width: resultInner, size: RESULT_NOTE.size, lineHeight: RESULT_NOTE.lineHeight, maxLines: RESULT_NOTE.maxLines }, ctx)
  if (names.some((l) => !l) || notes.some((l) => !l) || !resultName || !resultNote) return null
  const caption = image.caption?.trim() ? fitChalkCaption(image.caption, PHOTO.w, ctx) : undefined
  if (caption === null) return null
  const head = placeChalkClaim(claim, CLAIM_AT)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  const stroke = chalkMark(inks.chalk, ground)
  const yellow = chalkMark(inks.yellow, ground)
  return (
    <g {...compositionTag("confluence")}>
      {head}
      <g {...blockTag(ctx, image)} data-chalk-confluence-photo="">
        {paintChalkPhoto(image.asset_id, PHOTO, ctx, { crop: image.crop })}
        {caption ? paintChalkCaption(caption, { ctx, x: PHOTO.x, top: PHOTO.caption }) : null}
      </g>
      <g {...blockTag(ctx, eq)} data-chalk-confluence="">
        {eq.operands.map((term, i) => {
          const y = PATH.tops[i]!
          const mid = y + 55
          return (
            <g key={i} data-chalk-path={term.label}>
              <rect x={PATH.x} y={y} width={PATH.w} height={PATH.h} fill={inks.panel} stroke={chalkMark(inks.muted, inks.panel)} strokeWidth={1.5} />
              {paintChalk(names[i]!, { ctx, x: PATH.x + PATH.pad, top: y + NAME.dy, serif: true, ground: inks.panel, fill: chalkText(inks.chalk, inks.panel, NAME.size) })}
              {paintChalk(notes[i]!, { ctx, x: PATH.x + PATH.pad, top: y + NOTE.dy, ground: inks.panel, fill: chalkText(inks.muted, inks.panel, NOTE.size) })}
              <path d={`M ${PATH.x + PATH.w} ${mid} C ${PATH.x + PATH.w + 40} ${mid}, ${MEET.x - 40} ${MEET.y}, ${MEET.x} ${MEET.y}`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
            </g>
          )
        })}
        <path d={`M ${MEET.x - 8} ${MEET.y - 7} L ${MEET.x + 2} ${MEET.y} L ${MEET.x - 8} ${MEET.y + 7}`} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
        <g data-chalk-result={eq.result.label}>
          <ChalkBox x={RESULT.x} y={RESULT.y} w={RESULT.w} h={RESULT.h} ink={yellow} width={2.6} />
          {paintChalk(resultName, { ctx, x: RESULT.x + RESULT.pad, top: RESULT_NAME.top, serif: true, fill: chalkText(inks.yellow, ground, RESULT_NAME.size) })}
          {paintChalk(resultNote, { ctx, x: RESULT.x + RESULT.pad, top: RESULT_NOTE.top, fill: chalkText(inks.chalk, ground, RESULT_NOTE.size) })}
        </g>
      </g>
      {foot}
    </g>
  )
}
