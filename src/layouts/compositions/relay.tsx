import type React from "react"
import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  ACCOUNT_LEFT,
  ACCOUNT_RIGHT,
  ACCOUNT_W,
  accountBaseline,
  accountBodyBottom,
  accountChinese,
  accountInks,
  accountMark,
  accountText,
  accountWidth,
  claimDrop,
  figureNumber,
  figureValueWidth,
  fitAccount,
  markGap,
  markInk,
  paintAccount,
  paintAccountFigure,
  paintAccountLine,
  paintAccountRule,
  paintMarkGlyph,
  placeAccountHead,
  placeAccountSource,
  wholePage,
} from "./account"
import type { Recipe } from "./recipe"

type Timeline = Extract<Component, { type: "timeline" }>
type Milestone = Timeline["milestones"][number]
type Callout = Extract<Component, { type: "callout" }>

/*
 * relay: a year of work handed between the speaker and the team on one
 * month axis, recap's 2026-10 board (p07). A 2px axis of the ink from x200 to
 * x1200 on y400, divided into the twelve months under it, each a tick and
 * its number at 13px in the figure face (the last with its unit: 「12 月」).
 * The first lane stands above the axis and is the speaker's: its name at the
 * left after the filled square, each milestone a solid node on the axis, a
 * stem up to its date, title and note. The milestone the author lit sits on a
 * pale wash of the accent, its stem 2px and its node larger in the accent,
 * its words in the deep accent. The second lane hangs under the axis and is
 * the team's: its name after the hollow grey square, each milestone a hollow
 * node and a short stem down to its words. When the team's titles count up
 * to one figure (60, 150, 210), each carries a bar under it filled to its
 * share of the last. A milestone's words start at its stem, or end at the
 * measure when they would run past it. The callout closes the page under a
 * hairline on y612, at 16px in the body ink.
 *
 * Takes, in the account setting: a horizontal `timeline` of two lanes whose
 * every date names a month of one year (「2 月」, "Feb"), at most one milestone
 * lit, and a `callout` of one line without a title, an icon or a tag.
 *
 * Declines: a date that names no month, a milestone with an icon, a tone, a
 * status, a tag or a source, periods, two milestones whose words would
 * collide, a title or note wider than its room, a callout past one line.
 *
 * Reads: the account inks (`./account.tsx`), the body and figure faces.
 */

const AXIS = { x: 200, w: 1000, y: 400, h: 2, tick: { top: 406, h: 16, size: 13, pad: 4 } } as const
const LANE = { mark: 12, size: 16, upper: 262, lower: 500, lineHeight: 24 } as const
const STONE = { pad: 12, date: 15, title: 16, desc: 13, dateH: 20, titleH: 24, descH: 19, gap: 2, maxW: 260 } as const
const UPPER = { top: 186, stemTop: 268, node: 9, lit: { top: 282, minW: 250, padX: 12, padY: 10, node: 11, stem: 2 } } as const
const LOWER = { stemTop: 428, stemBottom: 458, top: 462, node: 9, bar: { gap: 6, h: 6, wide: 180, narrow: 140 } } as const
const CLOSE = { top: 612, pad: 14, size: 16, lineHeight: 24 } as const

const EN_MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"] as const

/** The month a date names, 1 to 12: 「2 月」, 「2月」, "Feb", "February". `null` when it names none. */
export function monthOf(date: string): number | null {
  const d = stripEmphasis(date).trim()
  const zh = /^(\d{1,2})\s*月$/u.exec(d)
  if (zh) {
    const m = Number(zh[1])
    return m >= 1 && m <= 12 ? m : null
  }
  const en = /^([A-Za-z]{3})[a-z]*\.?$/u.exec(d)
  if (en) {
    const i = EN_MONTHS.indexOf(en[1]!.toLowerCase() as (typeof EN_MONTHS)[number])
    return i >= 0 ? i + 1 : null
  }
  return null
}

/** The month ticks' words: 1 to 11 and 「12 月」 in Chinese, the months' short names otherwise. */
export function monthTicks(chinese: boolean): string[] {
  return chinese ? Array.from({ length: 12 }, (_, i) => (i === 11 ? "12 月" : String(i + 1))) : EN_MONTHS.map((m) => m[0]!.toUpperCase() + m.slice(1))
}

/** Each milestone's share of the last when the titles count up to it (60, 150, 210 of 210), or `null`. */
export function countUp(titles: readonly string[]): number[] | null {
  if (titles.length < 2) return null
  const n = titles.map((t) => figureNumber(t))
  if (n.some((v) => v === null || v <= 0)) return null
  const v = n as number[]
  if (v.some((x, i) => i > 0 && x <= v[i - 1]!)) return null
  const last = v[v.length - 1]!
  return v.map((x) => x / last)
}

interface Stone {
  m: Milestone
  x: number
  upper: boolean
  lit: boolean
  date: string
  title: string
  desc: string | null
  w: number
  /** Where the words start: at the stem, or ending at the measure. */
  left: number
  right: number
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const relayRecipe: Recipe = {
  look: "A year of work handed between the speaker and the team on one month axis",
  kinds: ["process"],
  shapes: [{ parts: [{ type: "timeline", count: [3, 6], needs: ["lanes", "milestones[*].lane", "milestones[].highlight", "milestones[*].date~figure"] }, { type: "callout" }] }],
}

export const relayComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "account" || !wholePage(rect) || components.length !== 2) return null
  const line = components.find((c): c is Timeline => c.type === "timeline")
  const note = components.find((c): c is Callout => c.type === "callout")
  if (!line || !note || note.title || note.icon || note.tag || line.periods?.length || (line.layout && line.layout !== "horizontal")) return null
  const lanes = line.lanes
  if (!lanes || lanes.length !== 2) return null
  const ms = line.milestones
  if (ms.length < 3 || ms.length > 8 || ms.filter((m) => m.highlight).length > 1) return null
  if (ms.some((m) => m.icon || m.tone || m.status || m.tag || m.source || !m.lane || !lanes.includes(m.lane) || monthOf(m.date) === null)) return null
  const head = placeAccountHead(kicker, claim, { x: ACCOUNT_LEFT, w: ACCOUNT_W, maxLines: 2 })
  if (!head) return null
  const dy = claimDrop(head)
  const inks = accountInks(ctx)
  const ground = inks.ground
  const chinese = accountChinese(ctx, ms.map((m) => m.title))
  const step = AXIS.w / 12
  const stones: Stone[] = ms.map((m) => {
    const x = Math.round(AXIS.x + (monthOf(m.date)! - 1) * step)
    const upper = m.lane === lanes[0]
    const lit = upper && m.highlight === true
    const date = stripEmphasis(m.date).trim()
    const title = stripEmphasis(m.title).trim()
    const desc = m.desc?.trim() ? stripEmphasis(m.desc).trim() : null
    const words = Math.max(figureValueWidth(date, STONE.date, ctx), accountWidth(title, STONE.title, ctx, { bold: true }), desc ? accountWidth(desc, STONE.desc, ctx) : 0)
    // The lit wash is the board's 250px at least.
    const w = lit ? Math.max(UPPER.lit.minW, words + UPPER.lit.padX * 2) : words + STONE.pad
    const left = x + w > ACCOUNT_RIGHT ? ACCOUNT_RIGHT - w : x
    return { m, x, upper, lit, date, title, desc, w, left, right: left + w }
  })
  if (stones.some((s) => s.w > STONE.maxW + (s.lit ? UPPER.lit.padX * 2 : STONE.pad))) return null
  // Words at one level must not meet; a stem must not run through the lit wash.
  const levels = [stones.filter((s) => s.upper && !s.lit), stones.filter((s) => s.upper && s.lit), stones.filter((s) => !s.upper)]
  for (const level of levels) {
    const sorted = [...level].sort((a, b) => a.left - b.left)
    if (sorted.some((s, i) => i > 0 && s.left < sorted[i - 1]!.right + 8)) return null
  }
  const litStone = stones.find((s) => s.lit)
  if (litStone && stones.some((s) => s.upper && !s.lit && s.x > litStone.left - 4 && s.x < litStone.right + 4)) return null
  if (litStone && stones.some((s) => s.upper && !s.lit && s.left < litStone.right && s.right > litStone.left && UPPER.top + STONE.dateH + STONE.titleH + STONE.descH + STONE.gap * 2 > UPPER.lit.top)) return null
  const team = stones.filter((s) => !s.upper)
  const shares = countUp(team.map((s) => s.title))
  const closing = fitAccount(note.text, { width: ACCOUNT_W, size: CLOSE.size, lineHeight: CLOSE.lineHeight, maxLines: 1 }, ctx)
  if (!closing) return null
  const credit = placeAccountSource(source, { x: ACCOUNT_LEFT, w: ACCOUNT_W, footer: true })
  if (credit === false) return null
  if (CLOSE.top + CLOSE.pad + CLOSE.lineHeight > accountBodyBottom(credit, 660)) return null
  const teamBottom = LOWER.top + dy + STONE.dateH + STONE.titleH + STONE.descH + (shares ? LOWER.bar.gap + LOWER.bar.h : 0) + 8
  if (teamBottom > CLOSE.top) return null
  const ticks = monthTicks(chinese)
  const axisY = AXIS.y + dy
  const laneMarks: { name: string; kind: "lead" | "quiet"; top: number }[] = [
    { name: stripEmphasis(lanes[0]!).trim(), kind: "lead", top: LANE.upper + dy },
    { name: stripEmphasis(lanes[1]!).trim(), kind: "quiet", top: LANE.lower + dy },
  ]
  if (laneMarks.some((l) => LANE.mark + markGap(LANE.size) + accountWidth(l.name, LANE.size, ctx, { bold: l.kind === "lead" }) > AXIS.x - ACCOUNT_LEFT - 12)) return null
  const words = (s: Stone, top: number, ink: { date: string; title: string; desc: string }, x: number, anchorEnd: boolean): React.ReactNode => {
    const anchor = anchorEnd ? "end" : "start"
    const dateBase = accountBaseline(top, STONE.dateH, STONE.date)
    const titleBase = accountBaseline(top + STONE.dateH + STONE.gap, STONE.titleH, STONE.title)
    const descBase = accountBaseline(top + STONE.dateH + STONE.titleH + STONE.gap * 2, STONE.descH, STONE.desc)
    return (
      <>
        {paintAccountFigure({ ctx, value: s.date, x, anchor, baseline: dateBase, spec: { size: STONE.date, unit: STONE.date, gap: 0, weight: 700 }, fill: ink.date })}
        {paintAccountLine(s.title, { ctx, x, anchor, baseline: titleBase, size: STONE.title, bold: true, fill: ink.title })}
        {s.desc ? paintAccountLine(s.desc, { ctx, x, anchor, baseline: descBase, size: STONE.desc, fill: ink.desc }) : null}
      </>
    )
  }
  const plain = { date: accountText(inks.ink, ground, STONE.date), title: accountText(inks.ink, ground, STONE.title), desc: accountText(inks.muted, ground, STONE.desc) }
  return (
    <g {...compositionTag("relay")}>
      {head.node}
      <g {...blockTag(ctx, line)} data-account-relay="">
        {laneMarks.map((l, i) => {
          const ink = markInk(l.kind, inks, ground, LANE.size)
          const mid = l.top + LANE.lineHeight / 2
          return (
            <g key={i} data-account-lane={l.name}>
              {paintMarkGlyph(l.kind, ACCOUNT_LEFT, mid - LANE.mark / 2, LANE.mark, ink)}
              {paintAccountLine(l.name, { ctx, x: ACCOUNT_LEFT + LANE.mark + markGap(LANE.size) - 1, baseline: mid + LANE.size * 0.35, size: LANE.size, bold: l.kind === "lead", fill: ink.word })}
            </g>
          )
        })}
        <rect x={AXIS.x} y={axisY} width={AXIS.w} height={AXIS.h} fill={inks.ink} />
        {ticks.map((t, i) => {
          const x = AXIS.x + i * step
          return (
            <g key={i} data-account-tick={t}>
              <rect x={x} y={axisY + AXIS.tick.top - AXIS.y} width={1} height={AXIS.tick.h} fill={inks.bar} />
              {paintAccountFigure({ ctx, value: t, x: x + AXIS.tick.pad, baseline: axisY + AXIS.tick.top - AXIS.y + 13, spec: { size: AXIS.tick.size, unit: AXIS.tick.size, gap: 0 }, fill: accountText(inks.muted, ground, AXIS.tick.size) })}
            </g>
          )
        })}
        {stones.map((s, i) => {
          const atEnd = s.left !== s.x
          if (s.upper && s.lit) {
            const boxTop = UPPER.lit.top + dy
            const boxH = UPPER.lit.padY * 2 + STONE.dateH + STONE.titleH + STONE.descH + STONE.gap * 2
            return (
              <g key={i} data-account-stone={s.title} data-lit="">
                <rect data-account-wash="" x={s.left} y={boxTop} width={s.w} height={boxH} fill={inks.tint} />
                <rect x={s.x - UPPER.lit.stem / 2} y={boxTop + boxH} width={UPPER.lit.stem} height={axisY - boxTop - boxH} fill={accountMark(inks.lead, ground)} />
                <circle cx={s.x} cy={axisY + 1} r={UPPER.lit.node / 2} fill={accountMark(inks.lead, ground)} />
                {words(s, boxTop + UPPER.lit.padY, { date: accountText(inks.deep, inks.tint, STONE.date), title: accountText(inks.deep, inks.tint, STONE.title), desc: accountText(inks.body, inks.tint, STONE.desc) }, atEnd ? s.right - UPPER.lit.padX : s.left + UPPER.lit.padX, atEnd)}
              </g>
            )
          }
          if (s.upper) {
            return (
              <g key={i} data-account-stone={s.title}>
                <rect x={s.x - 0.5} y={UPPER.stemTop + dy} width={1} height={axisY - UPPER.stemTop - dy} fill={inks.ink} />
                <circle cx={s.x} cy={axisY + 1} r={UPPER.node / 2} fill={inks.ink} />
                {words(s, UPPER.top + dy, plain, atEnd ? s.right : s.left + STONE.pad, atEnd)}
              </g>
            )
          }
          const k = team.indexOf(s)
          const share = shares?.[k]
          const next = team[k + 1]
          const barW = next && next.x - s.x >= 240 ? LOWER.bar.wide : LOWER.bar.narrow
          const barX = atEnd ? s.right - barW : s.left + STONE.pad
          const barTop = LOWER.top + dy + STONE.dateH + STONE.titleH + STONE.descH + STONE.gap * 2 + LOWER.bar.gap
          const graphite = accountMark(inks.muted, ground)
          return (
            <g key={i} data-account-stone={s.title}>
              <rect x={s.x - 0.5} y={LOWER.stemTop + dy} width={1} height={LOWER.stemBottom - LOWER.stemTop} fill={graphite} />
              <circle cx={s.x} cy={axisY + 1} r={LOWER.node / 2 - 1} fill={ground} stroke={graphite} strokeWidth={2} />
              {words(s, LOWER.top + dy, plain, atEnd ? s.right : s.left + STONE.pad, atEnd)}
              {share !== undefined ? (
                <g data-account-progress={Math.round(share * 100)}>
                  {share < 1 ? <rect x={barX} y={barTop} width={barW} height={LOWER.bar.h} fill={inks.pale} /> : null}
                  <rect x={barX} y={barTop} width={Math.round(barW * share)} height={LOWER.bar.h} fill={graphite} />
                </g>
              ) : null}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, note)} data-account-close="">
        {paintAccountRule(ACCOUNT_LEFT, ACCOUNT_LEFT + ACCOUNT_W, CLOSE.top + 0.5, inks.line, 1)}
        {paintAccount(closing, { ctx, x: ACCOUNT_LEFT, top: CLOSE.top + CLOSE.pad, fill: accountText(inks.body, ground, CLOSE.size) })}
      </g>
      {credit}
    </g>
  )
}
