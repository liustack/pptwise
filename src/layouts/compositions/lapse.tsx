import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitInvitation,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationMeta,
  invitationText,
  invitationTrackedWidth,
  invitationWidth,
  paintInvitation,
  paintInvitationLine,
  paintInvitationTracked,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
  INVITATION_META,
} from "./invitation"

type Timeline = Extract<Component, { type: "timeline" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * lapse: a rule's dates on one gold hairline, the long quiet years cut
 * short, luxe's 2026-10 board (p12). The claim centred over the page. The
 * milestones stand evenly along the line, each a gold dot with its date
 * small and tracked, its title in the ivory serif and its line under it,
 * above and below the line in turn, a hairline joining each to its dot. A
 * stretch far longer than the others (more than three times the middle
 * stretch and three years at least) is cut by two slanting strokes where it
 * runs dashed. A milestone still to come (`status: "pending"`) is a hollow
 * dot, its date in gold and its title in the gold lifted toward the ivory,
 * and so is one the author marks (`highlight`). Under a hairline across the
 * page what to do now (a `callout`): its title small and tracked in gold,
 * its words centred in ivory.
 *
 * Takes, in the invitation setting: one `timeline` across the page of three
 * to seven milestones with no icon, tone, tag, source or lane, and no
 * periods. Then optionally a `callout` with no icon or tag.
 *
 * Declines: a date, title or line wider than its place, a callout past two
 * lines.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body faces.
 */

const AXIS = { y: 380, from: 100, to: 1120, first: 120, last: 1080, w: 1.2 } as const
const DOT = { r: 6, open: 7, ring: 1.6 } as const
const LABEL = { w: 200, up: 270, down: 410, stemUp: 60, stemDown: -6, nodeGap: 10 } as const
const DATE = { size: 12, lineHeight: 20, tracking: 1 } as const
const TITLE = { dy: 20, size: 15, lineHeight: 24 } as const
const DESC = { dy: 44, size: 11, lineHeight: 18 } as const
const BREAK = { dash: "2 4", half: 26, gap: 6, slash: 6, rise: 8 } as const
const NOW = { rule: 518, left: 240, right: 1040, title: 530, size: 12, lineHeight: 20, tracking: 4, text: 554, textSize: 14, textLineHeight: 24, maxLines: 2 } as const

/** A milestone's date as a fraction of years, or `null` when it is not a year or a year and a month. */
function when(date: string): number | null {
  const m = /^(\d{4})(?:[-./年](\d{1,2}))?/u.exec(date.trim())
  if (!m) return null
  return Number(m[1]) + (m[2] ? (Number(m[2]) - 1) / 12 : 0)
}

export const lapseComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [line, callout, ...rest] = components
  if (line?.type !== "timeline" || rest.length > 0) return null
  if (callout && (callout.type !== "callout" || (callout as Callout).icon || (callout as Callout).tag)) return null
  const t = line as Timeline
  if (t.layout === "vertical" || t.lanes || t.periods || t.title) return null
  const ms = t.milestones
  if (ms.length < 3 || ms.length > 7 || ms.some((m) => m.icon || m.tone || m.tag || m.source || m.lane)) return null
  for (const m of ms) {
    if (invitationTrackedWidth(stripEmphasis(m.date).trim(), DATE.size, DATE.tracking, ctx) > LABEL.w) return null
    if (invitationWidth(stripEmphasis(m.title).trim(), TITLE.size, ctx, { serif: true, bold: true }) > LABEL.w) return null
    if (m.desc && invitationWidth(stripEmphasis(m.desc).trim(), DESC.size, ctx) > LABEL.w) return null
  }
  const pitch = (AXIS.last - AXIS.first) / (ms.length - 1)
  // Same-side labels stand two places apart, so each has twice the pitch to itself.
  if (pitch * 2 < LABEL.w + 8) return null
  const now = callout ? fitInvitation((callout as Callout).text, { width: NOW.right - NOW.left, size: NOW.textSize, lineHeight: NOW.textLineHeight, maxLines: NOW.maxLines }, ctx) : undefined
  if (now === null) return null
  const nowTitle = callout && (callout as Callout).title?.trim() ? stripEmphasis((callout as Callout).title!).trim() : ""
  if (nowTitle && invitationTrackedWidth(nowTitle, NOW.size, NOW.tracking, ctx) > NOW.right - NOW.left) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 630 })
  if (foot === false) return null

  // The stretch cut short: far longer than the middle one.
  const times = ms.map((m) => when(m.date))
  const gaps = times.slice(1).map((v, i) => (v !== null && times[i] !== null ? v - times[i]! : null))
  let cut = -1
  if (gaps.every((g) => g !== null && g >= 0)) {
    const sorted = [...(gaps as number[])].sort((a, b) => a - b)
    const middle = sorted[Math.floor(sorted.length / 2)]!
    const longest = Math.max(...(gaps as number[]))
    if (longest >= 3 && longest > middle * 3) cut = (gaps as number[]).indexOf(longest)
  }
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationMark(inks.gold, ground)
  const y = rect.y + AXIS.y
  const xOf = (i: number) => rect.x + AXIS.first + i * pitch
  const segments: [number, number, boolean][] = []
  if (cut >= 0) {
    const mid = (xOf(cut) + xOf(cut + 1)) / 2
    segments.push([rect.x + AXIS.from, mid - BREAK.half, false], [mid - BREAK.half, mid - BREAK.gap, true], [mid + BREAK.gap + 6, rect.x + AXIS.to, false])
  } else {
    segments.push([rect.x + AXIS.from, rect.x + AXIS.to, false])
  }
  const mid = cut >= 0 ? (xOf(cut) + xOf(cut + 1)) / 2 : 0
  return (
    <g {...compositionTag("lapse")}>
      {head}
      <g {...blockTag(ctx, line)}>
        {segments.map(([a, b, dashed], k) => (dashed ? <line key={k} x1={a} y1={y} x2={b} y2={y} stroke={gold} strokeWidth={AXIS.w} strokeDasharray={BREAK.dash} /> : <g key={k}>{paintRule(a, b, y, gold, AXIS.w)}</g>))}
        {cut >= 0 ? (
          <g data-invitation-break="">
            {[0, 10].map((dx) => (
              <line key={dx} x1={mid + dx} y1={y - BREAK.rise} x2={mid + dx - 12} y2={y + BREAK.rise} stroke={invitationMark(inks.muted, ground)} strokeWidth={1} />
            ))}
          </g>
        ) : null}
        {ms.map((m, i) => {
          const x = xOf(i)
          const up = i % 2 === 0
          const top = rect.y + (up ? LABEL.up : LABEL.down)
          const lit = m.status === "pending" || m.highlight === true
          const stem = up ? [y - LABEL.nodeGap, top + LABEL.stemUp] : [y + LABEL.nodeGap, top + LABEL.stemDown]
          return (
            <g key={i} data-invitation-milestone={stripEmphasis(m.date).trim()} {...(lit ? { "data-invitation-lead": "milestone" } : {})}>
              <rect x={x - 0.5} y={Math.min(stem[0]!, stem[1]!)} width={1} height={Math.abs(stem[1]! - stem[0]!)} fill={inks.line} />
              {m.status === "pending" ? <circle cx={x} cy={y} r={DOT.open} fill={ground} stroke={gold} strokeWidth={DOT.ring} /> : <circle cx={x} cy={y} r={DOT.r} fill={gold} />}
              {paintInvitationTracked({ ctx, text: stripEmphasis(m.date).trim(), x, y: invitationBaseline(top, DATE.lineHeight, DATE.size), size: DATE.size, tracking: DATE.tracking, anchor: "middle", fill: invitationText(lit ? inks.gold : inks.muted, ground, DATE.size) })}
              {paintInvitationLine(m.title, { ctx, x, baseline: invitationBaseline(top + TITLE.dy, TITLE.lineHeight, TITLE.size, true), size: TITLE.size, serif: true, bold: true, anchor: "middle", fill: invitationText(lit ? inks.goldLight : inks.ivory, ground, TITLE.size) })}
              {m.desc ? paintInvitationLine(m.desc, { ctx, x, baseline: invitationBaseline(top + DESC.dy, DESC.lineHeight, DESC.size), size: DESC.size, anchor: "middle", fill: invitationMeta(inks.dim, ground), attrs: { ...INVITATION_META } }) : null}
            </g>
          )
        })}
      </g>
      {callout && now ? (
        <g {...blockTag(ctx, callout)} data-invitation-now="">
          {paintRule(rect.x + NOW.left, rect.x + NOW.right, rect.y + NOW.rule, inks.line, 0.8)}
          {nowTitle ? paintInvitationTracked({ ctx, text: nowTitle, x: rect.x + (NOW.left + NOW.right) / 2, y: invitationBaseline(rect.y + NOW.title, NOW.lineHeight, NOW.size), size: NOW.size, tracking: NOW.tracking, anchor: "middle", fill: invitationText(inks.gold, ground, NOW.size) }) : null}
          {paintInvitation(now, { ctx, x: rect.x + (NOW.left + NOW.right) / 2, top: rect.y + NOW.text, anchor: "middle", fill: invitationText(inks.ivory, ground, NOW.textSize) })}
        </g>
      ) : null}
      {foot}
    </g>
  )
}
