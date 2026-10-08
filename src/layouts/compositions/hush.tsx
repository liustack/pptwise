import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { CLAIM_HUSH, KICKER_AT, KeynoteSpot, SOURCE_CENTRED, fitKeynote, keynoteInks, keynoteMark, keynoteText, paintKeynote, paintKeynoteRule, placeKeynoteClaim, placeKeynoteKicker, placeKeynoteSource, wholePage } from "./keynote"

type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * hush: one sentence and the room goes quiet, stage's 2026-10 board (p02).
 * The page holds a single claim set huge and bold in the middle of the black,
 * centred, at most two lines (the author breaks it where the voice would
 * pause), its marked words in silver, in a faint follow spot. Under it a
 * short silver rule, the one line that backs it in the sand, and the source
 * small and dim, centred at the foot.
 *
 * Takes, in the keynote setting: a page with a claim and nothing else, or a
 * claim with one `paragraph` of up to two lines. A `statement` page.
 *
 * Declines: a claim past two lines at 72px (it stays a whole sentence or it
 * goes to the ordinary page), a paragraph past two lines.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const SPOT = { cx: 640, cy: 330, r: 420, strength: 0.08 } as const
const RULE = { gap: 30, w: 80, stroke: 2 } as const
const LINE = { gap: 54, size: 16, lineHeight: 26, w: 1152, maxLines: 2 } as const

export const hushComposition: Composition = ({ components, ctx, rect, setting, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect) || !claim) return null
  if (components.length > 1) return null
  const paragraph = components[0] as Paragraph | undefined
  if (paragraph && paragraph.type !== "paragraph") return null
  // Two lines from y230, or one line set where the middle of two would be.
  let head = placeKeynoteClaim(claim, { ...CLAIM_HUSH, maxLines: 1, top: CLAIM_HUSH.top + CLAIM_HUSH.lineHeight / 2 })
  let lines = 1
  if (head === false) {
    head = placeKeynoteClaim(claim, { ...CLAIM_HUSH, maxLines: 2 })
    lines = 2
  }
  if (head === false) return null
  const bottom = lines === 2 ? CLAIM_HUSH.top + 2 * CLAIM_HUSH.lineHeight : CLAIM_HUSH.top + 1.5 * CLAIM_HUSH.lineHeight
  const line = paragraph ? fitKeynote(paragraph.text, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx) : undefined
  if (line === null) return null
  const foot = placeKeynoteSource(source, SOURCE_CENTRED)
  if (foot === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const mid = 640
  return (
    <g {...compositionTag("hush")}>
      <KeynoteSpot id="keynote-hush-spot" cx={SPOT.cx} cy={SPOT.cy} r={SPOT.r} strength={SPOT.strength} ctx={ctx} />
      {chapter}
      {head}
      <g data-keynote-hush-rule="">{paintKeynoteRule(mid - RULE.w / 2, mid + RULE.w / 2, bottom + RULE.gap, keynoteMark(inks.silver, ground), RULE.stroke)}</g>
      {line && paragraph ? (
        <g {...blockTag(ctx, paragraph)} data-keynote-hush-line="">
          {paintKeynote(line, { ctx, x: mid, anchor: "middle", top: bottom + LINE.gap, fill: keynoteText(inks.muted, ground, LINE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
