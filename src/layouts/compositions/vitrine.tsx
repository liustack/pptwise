import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  InvitationWash,
  fitInvitation,
  invitationBaseline,
  invitationInks,
  invitationMark,
  invitationText,
  invitationWidth,
  paintInvitation,
  paintInvitationIcon,
  paintInvitationLine,
  paintInvitationPhoto,
  paintRule,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Image = Extract<Component, { type: "image" }>
type Cards = Extract<Component, { type: "icon_cards" }>

/*
 * vitrine: a photograph down the left half of the page beside what the page
 * asks, luxe's 2026-10 board (p16). The photograph runs from the page's left
 * edge to x560, top to bottom, fading into the stock at its right. The card
 * stock's frame and the occasion at the foot move to the right half (the
 * group says so with `data-frame-left`, which the motif reads). In that
 * half, from the left: the chapter small and tracked, the claim in the gold
 * serif at 28px, its last line on y172, a gold diamond under it with one
 * rule after it, then each item: its symbol in gold inside a gold ring, its
 * name in the ivory serif, a line or two on it in old gold, a hairline
 * between items. The source stands under the items.
 *
 * Takes, in the invitation setting: an `image` with no caption, then an
 * `icon_cards` of two or three items with no title, tag or tone.
 *
 * Declines: a name past one line, a line past two, a claim that does not fit
 * the half page.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's images (`ctx.images`).
 */

const PHOTO = { w: 560, fade: 180 } as const
/** Where the stock's frame starts in this page, read by the motif. */
export const VITRINE_FRAME_LEFT = 584
const COLUMN = { x: 608, w: 620 } as const
const CLAIM = { size: 28, lineHeight: 40, foot: 172, markGap: 20 } as const
const ITEM = { top: 232, pitch: 120, rule: 100, ruleRight: 1200 } as const
const RING = { cx: 636, dy: 24, r: 22, icon: 24 } as const
const NAME = { x: 680, size: 20, lineHeight: 30, w: 520 } as const
const LINE = { dy: 34, size: 14, lineHeight: 24, w: 520, maxLines: 2 } as const
const SOURCE = { top: 600 } as const

export const vitrineComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [image, cards, ...rest] = components
  if (image?.type !== "image" || cards?.type !== "icon_cards" || rest.length > 0) return null
  const img = image as Image
  if (img.caption?.trim()) return null
  const c = cards as Cards
  if (c.title?.trim() || c.items.length < 2 || c.items.length > 3 || c.items.some((it) => it.tag || it.tone)) return null
  if (c.items.some((it) => invitationWidth(stripEmphasis(it.title).trim(), NAME.size, ctx, { serif: true, bold: true }) > NAME.w)) return null
  const lines = c.items.map((it) => fitInvitation(it.text, { width: LINE.w, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: LINE.maxLines }, ctx))
  if (lines.some((l) => !l)) return null
  const head = placeInvitationClaim(claim, { x: rect.x + COLUMN.x, w: COLUMN.w, size: CLAIM.size, lineHeight: CLAIM.lineHeight, foot: rect.y + CLAIM.foot, align: "start", mark: "start", markGap: CLAIM.markGap })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + COLUMN.x, w: COLUMN.w, top: rect.y + SOURCE.top })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  return (
    <g {...compositionTag("vitrine")} data-frame-left={rect.x + VITRINE_FRAME_LEFT}>
      <g {...blockTag(ctx, image)} data-invitation-vitrine-photo="">
        {paintInvitationPhoto(img.asset_id, { x: rect.x, y: rect.y, w: PHOTO.w, h: rect.h }, ctx)}
        <InvitationWash id="invitation-vitrine-fade" box={{ x: rect.x + PHOTO.w - PHOTO.fade, y: rect.y, w: PHOTO.fade, h: rect.h }} ink={ground} axis="x" stops={[{ offset: "0%", opacity: 0 }, { offset: "100%", opacity: 1 }]} />
      </g>
      {head}
      <g {...blockTag(ctx, cards)}>
        {c.items.map((it, i) => {
          const y = rect.y + ITEM.top + i * ITEM.pitch
          return (
            <g key={i} data-invitation-item={stripEmphasis(it.title).trim()}>
              <circle cx={rect.x + RING.cx} cy={y + RING.dy} r={RING.r} fill="none" stroke={invitationMark(inks.gold, ground)} strokeWidth={1} />
              {paintInvitationIcon(it.icon, rect.x + RING.cx - RING.icon / 2, y + RING.dy - RING.icon / 2, RING.icon, inks.gold, ground)}
              {paintInvitationLine(it.title, { ctx, x: rect.x + NAME.x, baseline: invitationBaseline(y, NAME.lineHeight, NAME.size, true), size: NAME.size, serif: true, bold: true, fill: invitationText(inks.ivory, ground, NAME.size) })}
              {paintInvitation(lines[i]!, { ctx, x: rect.x + NAME.x, top: y + LINE.dy, fill: invitationText(inks.muted, ground, LINE.size) })}
              {i < c.items.length - 1 ? paintRule(rect.x + NAME.x, rect.x + ITEM.ruleRight, y + ITEM.rule, inks.line, 0.6) : null}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
