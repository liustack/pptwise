import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ChalkStamp,
  ChalkUnder,
  SOURCE_AT,
  STAMP_TOP_RIGHT,
  chalkLit,
  chalkStampWidth,
  chalkText,
  chalkWidth,
  chalkboardInks,
  fitChalk,
  paintChalk,
  paintChalkLine,
  placeChalkClaimBesideStamp,
  placeChalkSource,
  wholePage,
} from "./chalkboard"

type Bullets = Extract<Component, { type: "bullets" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * derivation: a sum worked down the board line by line, its equals signs in
 * one column, lecture's 2026-10 board (p11). Each line numbered in the grey,
 * what it works out right-aligned against the first equals sign, the working
 * after it and the result after the second, all in the serif. The result the
 * author marks is larger, in yellow, with one stroke of yellow chalk under
 * it. A line in the grey under the working says where its inputs came from,
 * then the source. The example's stamp stands at the top right.
 *
 * Takes, in the chalkboard setting: a `bullets` of two to six lines, each
 * written `what = working = result` (with 「＝」 or 「=」 and a space either
 * side), at most one result marked, then optionally a `paragraph`. The
 * page's stamp when it has one.
 *
 * Declines: a line with more or fewer than two equals signs, a part too wide
 * for its column, a closing line past one line, a stamp with a date line.
 *
 * Reads: the chalkboard inks (`./chalkboard.tsx`), the heading and body faces.
 */

const ROWS = { top: 190, step: 72, span: 360, lineHeight: 50 } as const
const NUMBER = { x: 64, size: 26 } as const
const WHAT = { right: 340, w: 230, size: 30 } as const
const EQ1 = { centre: 372 } as const
const WORK = { x: 400, w: 470, size: 30 } as const
const EQ2 = { centre: 890 } as const
const RESULT = { x: 920, w: 296, size: 30, litSize: 36 } as const
const CLOSE = { gap: 16, size: 14, lineHeight: 24 } as const

/** A worked line's three parts, or `null` when it is not written `what = working = result`. */
export function workedLine(item: string): { what: string; work: string; result: string; signs: [string, string] } | null {
  const parts = item.split(/\s+([=＝])\s+/u).map((p) => p.trim())
  if (parts.length !== 5 || [parts[0], parts[2], parts[4]].some((p) => !stripEmphasis(p ?? "").trim())) return null
  return { what: parts[0]!, work: parts[2]!, result: parts[4]!, signs: [parts[1]!, parts[3]!] }
}

export const derivationComposition: Composition = ({ components, ctx, setting, rect, claim, source, stamp }) => {
  if (setting !== "chalkboard" || !wholePage(rect)) return null
  const [bullets, close, ...rest] = components
  if (bullets?.type !== "bullets" || rest.length > 0) return null
  if (close !== undefined && close.type !== "paragraph") return null
  const items = (bullets as Bullets).items
  if (items.length < 2 || items.length > 6) return null
  const lines = items.map(workedLine)
  if (lines.some((l) => !l)) return null
  if (lines.filter((l) => chalkLit(l!.result)).length > 1) return null
  if (lines.some((l) => chalkLit(l!.what) || chalkLit(l!.work))) return null
  for (const l of lines) {
    const lit = chalkLit(l!.result)
    if (chalkWidth(l!.what, WHAT.size, ctx, { serif: true }) > WHAT.w) return null
    if (chalkWidth(l!.work, WORK.size, ctx, { serif: true }) > WORK.w) return null
    if (chalkWidth(l!.result, lit ? RESULT.litSize : RESULT.size, ctx, { serif: true }) > RESULT.w) return null
  }
  const step = Math.min(ROWS.step, ROWS.span / lines.length)
  const closeTop = ROWS.top + lines.length * step + CLOSE.gap
  const closing = close ? fitChalk((close as Paragraph).text, { width: 1152, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx) : undefined
  if (closing === null) return null
  if (stamp?.date?.trim()) return null
  const stampW = stamp ? chalkStampWidth(stamp.text, ctx) : 0
  const head = placeChalkClaimBesideStamp(claim, stampW)
  if (head === false) return null
  const foot = placeChalkSource(source, SOURCE_AT)
  if (foot === false) return null
  const inks = chalkboardInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("derivation")}>
      {head}
      {stamp ? <ChalkStamp ctx={ctx} text={stamp.text} x={STAMP_TOP_RIGHT.x} y={STAMP_TOP_RIGHT.y} anchor="end" /> : null}
      <g {...blockTag(ctx, bullets)} data-chalk-derivation="">
        {lines.map((l, i) => {
          const y = ROWS.top + i * step
          const lit = chalkLit(l!.result)
          const size = lit ? RESULT.litSize : RESULT.size
          const resultW = chalkWidth(l!.result, size, ctx, { serif: true })
          const line = (text: string, x: number, s: number, ink: string, anchor?: "middle" | "end") => paintChalkLine(text, { ctx, x, anchor, top: y, lineHeight: ROWS.lineHeight, size: s, serif: true, fill: chalkText(ink, ground, s) })
          return (
            <g key={i} data-chalk-worked={stripEmphasis(l!.what)} data-chalk-lit={lit ? "" : undefined}>
              {line(`${i + 1}.`, NUMBER.x, NUMBER.size, inks.muted)}
              {line(l!.what, WHAT.right, WHAT.size, inks.chalk, "end")}
              {line(l!.signs[0], EQ1.centre, WHAT.size, inks.muted, "middle")}
              {line(l!.work, WORK.x, WORK.size, inks.chalk)}
              {line(l!.signs[1], EQ2.centre, WORK.size, inks.muted, "middle")}
              {paintChalkLine(stripEmphasis(l!.result), { ctx, x: RESULT.x, top: y, lineHeight: ROWS.lineHeight, size, serif: true, fill: chalkText(lit ? inks.yellow : inks.chalk, ground, size) })}
              {lit ? <ChalkUnder x1={RESULT.x} x2={RESULT.x + Math.min(RESULT.w, Math.max(resultW + 40, 120))} y={y + ROWS.lineHeight} ink={inks.yellow} width={6} /> : null}
            </g>
          )
        })}
      </g>
      {closing && close ? (
        <g {...blockTag(ctx, close)} data-chalk-close="">
          {paintChalk(closing, { ctx, x: 64, top: closeTop, fill: chalkText(inks.muted, ground, CLOSE.size) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
