import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitInvitation,
  formalNumeral,
  invitationBaseline,
  invitationChinese,
  invitationInks,
  invitationText,
  invitationTrackedWidth,
  invitationWidth,
  paintInvitation,
  paintInvitationLine,
  paintInvitationTracked,
  paintLeader,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Numbered = Extract<Component, { type: "numbered_cards" }>

/*
 * programme: the order of the day set like a gala's programme, luxe's
 * 2026-10 board (p02). The claim centred over the page; under it each item
 * on a line of its own: its numeral large in the heading serif in gold (壹
 * 贰 叁 肆 in a Chinese deck, I II III IV in any other), its name in the
 * serif, a dotted leader running from the name to the page it opens on (the
 * item's `sub`) at the right, and under the name what it covers in old gold.
 * A hairline between items. The item the author marks (`emphasis`) has its
 * name and its page in gold.
 *
 * Takes, in the invitation setting: one `numbered_cards` of three to five
 * items with no icon, each with a name, a line of what it covers or none,
 * and its page or none.
 *
 * Declines: a name, a line or a page past its room, more than five items.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body faces.
 */

const ROW = { top: 210, pitch: 98, tight: 84, rule: 82 } as const
const NUMERAL = { x: 250, size: 40, lineHeight: 60 } as const
const NAME = { x: 330, dy: 4, size: 24, lineHeight: 32, tracking: 2, w: 300 } as const
const LINE = { dy: 38, size: 14, lineHeight: 22, w: 560 } as const
const PAGE = { right: 1030, dy: 4, size: 18, lineHeight: 32, w: 70 } as const
const LEADER = { gap: 24, end: 950, dy: 24 } as const
const RULE = { from: 250, to: 1030, w: 0.8 } as const

export const programmeComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [cards, ...rest] = components
  if (cards?.type !== "numbered_cards" || rest.length > 0) return null
  const items = (cards as Numbered).items
  if (items.length < 3 || items.length > 5 || items.some((it) => it.icon)) return null
  const chinese = invitationChinese(ctx, items.map((it) => it.title))
  const names = items.map((it) => stripEmphasis(it.title).trim())
  if (names.some((n) => !n || invitationTrackedWidth(n, NAME.size, NAME.tracking, ctx, { serif: true, bold: true }) > NAME.w)) return null
  const lines = items.map((it) => (it.text?.trim() ? fitInvitation(it.text, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: 1 }, ctx) : undefined))
  if (lines.some((l) => l === null)) return null
  const pages = items.map((it) => it.sub?.trim() ?? "")
  if (pages.some((p) => p && invitationWidth(p, PAGE.size, ctx, { serif: true }) > PAGE.w)) return null
  const pitch = items.length <= 4 ? ROW.pitch : ROW.tight
  const top = rect.y + ROW.top
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const gold = invitationText(inks.gold, ground, NAME.size)
  return (
    <g {...compositionTag("programme")}>
      {head}
      <g {...blockTag(ctx, cards)}>
        {items.map((it, i) => {
          const y = top + i * pitch
          const lit = it.emphasis === true
          const nameW = invitationTrackedWidth(names[i]!, NAME.size, NAME.tracking, ctx, { serif: true, bold: true })
          return (
            <g key={i} data-invitation-item={names[i]} {...(lit ? { "data-invitation-lead": "item" } : {})}>
              {paintInvitationLine(formalNumeral(i, chinese), { ctx, x: rect.x + NUMERAL.x, baseline: invitationBaseline(y, NUMERAL.lineHeight, NUMERAL.size, true), size: NUMERAL.size, serif: true, bold: true, fill: invitationText(inks.gold, ground, NUMERAL.size) })}
              {paintInvitationTracked({ ctx, text: names[i]!, x: rect.x + NAME.x, y: invitationBaseline(y + NAME.dy, NAME.lineHeight, NAME.size, true), size: NAME.size, tracking: NAME.tracking, serif: true, bold: true, fill: lit ? gold : invitationText(inks.ivory, ground, NAME.size) })}
              {lines[i] ? paintInvitation(lines[i]!, { ctx, x: rect.x + NAME.x, top: y + LINE.dy, fill: invitationText(inks.muted, ground, LINE.size) }) : null}
              {pages[i] ? paintLeader(rect.x + NAME.x + nameW + LEADER.gap, rect.x + LEADER.end, y + LEADER.dy, inks.line) : null}
              {pages[i] ? paintInvitationLine(pages[i]!, { ctx, x: rect.x + PAGE.right, baseline: invitationBaseline(y + PAGE.dy, PAGE.lineHeight, PAGE.size, true), size: PAGE.size, serif: true, anchor: "end", fill: invitationText(lit ? inks.gold : inks.muted, ground, PAGE.size) }) : null}
              {i < items.length - 1 ? paintRule(rect.x + RULE.from, rect.x + RULE.to, y + ROW.rule, inks.line, RULE.w) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
