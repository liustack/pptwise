import type { Component } from "@/ir"
import { parseEmphasis, stripEmphasis } from "../../render/emphasis"
import { blendOver } from "../../render/ink"
import { blockTag, compositionTag, type Composition } from "./shared"
import { glossBreak } from "./manuscript"
import {
  invitationBaseline,
  invitationInks,
  invitationSmall,
  invitationText,
  invitationTrackedWidth,
  invitationWidth,
  paintInvitationPhoto,
  paintInvitationTracked,
  paintOutline,
  placeInvitationClaim,
  placeInvitationSource,
  wholeCanvas,
} from "./invitation"

type Grid = Extract<Component, { type: "image_grid" }>

/*
 * triptych: two to four pieces of a range shown as a catalogue spread, luxe's
 * 2026-10 board (p14). The claim centred over the page. Each piece is a
 * photograph standing taller than wide in a fine gold rule, its name under
 * it in the gold serif tracked wide, and one line on what it is centred
 * under the name in ivory, a figure the author marks in it (`**…**`) set in
 * the serif in the gold lifted toward the ivory, a little larger.
 *
 * Takes, in the invitation setting: one `image_grid` of two to four
 * photographs, each with a caption written "name：line" (or "name: line"),
 * the colon declared on the name (`data-gloss-break`) rather than printed,
 * no icon and no tag, and no emphasis on the grid.
 *
 * Declines: a caption without its name, a name or a line wider than its
 * photograph.
 *
 * Reads: the invitation inks (`./invitation.tsx`), the heading and body
 * faces, the deck's images (`ctx.images`).
 */

const SPREAD = { left: 96, right: 1184, gap: 28, top: 192, h: 286 } as const
const FRAME = { w: 0.8, mix: 0.6 } as const
const NAME = { top: 494, size: 22, lineHeight: 32, tracking: 6 } as const
const LINE = { top: 528, size: 13, lineHeight: 22, lit: 16 } as const

/** A caption's name and its line: 「古法金：手工厚重……」, "Heritage gold: heavy, handmade…". */
function splitCaption(caption: string): { name: string; sep: string; line: string } | null {
  const m = /^([^：:]+?)\s*(：|:\s)\s*(.+)$/u.exec(caption.trim())
  return m ? { name: m[1]!.trim(), sep: m[2]!, line: m[3]!.trim() } : null
}

export const triptychComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "invitation" || !wholeCanvas(rect)) return null
  const [grid, ...rest] = components
  if (grid?.type !== "image_grid" || rest.length > 0) return null
  const g = grid as Grid
  if ((g.emphasis && g.emphasis !== "none") || g.items.length < 2 || g.items.length > 4 || g.items.some((it) => it.icon || it.tag || !it.caption?.trim())) return null
  const pieces = g.items.map((it) => splitCaption(it.caption!))
  if (pieces.some((p) => !p)) return null
  const w = (SPREAD.right - SPREAD.left - SPREAD.gap * (g.items.length - 1)) / g.items.length
  const lineWidth = (line: string) =>
    parseEmphasis(line).reduce((sum, seg) => sum + (seg.emphasized ? invitationWidth(seg.text, LINE.lit, ctx, { serif: true, bold: true }) : invitationWidth(seg.text, LINE.size, ctx)), 0)
  if (pieces.some((p) => invitationTrackedWidth(stripEmphasis(p!.name), NAME.size, NAME.tracking, ctx, { serif: true, bold: true }) > w || lineWidth(p!.line) > w)) return null
  const head = placeInvitationClaim(claim, { x: rect.x + 120, w: 1040 })
  if (head === false) return null
  const foot = placeInvitationSource(source, { x: rect.x + 64, w: 1100, top: rect.y + 620 })
  if (foot === false) return null
  const inks = invitationInks(ctx)
  const ground = inks.ground
  const plain = invitationText(inks.ivory, ground, LINE.size)
  const lit = invitationText(inks.goldLight, ground, LINE.lit)
  return (
    <g {...compositionTag("triptych")}>
      {head}
      <g {...blockTag(ctx, grid)}>
        {g.items.map((it, i) => {
          const x = rect.x + SPREAD.left + i * (w + SPREAD.gap)
          const box = { x, y: rect.y + SPREAD.top, w, h: SPREAD.h }
          const piece = pieces[i]!
          const cx = x + w / 2
          return (
            <g key={i} data-invitation-piece={stripEmphasis(piece.name)}>
              {paintInvitationPhoto(it.asset_id, box, ctx)}
              {paintOutline({ x: x + 0.5, y: box.y + 0.5, w: w - 1, h: SPREAD.h - 1 }, blendOver(inks.gold, ground, FRAME.mix), FRAME.w)}
              {paintInvitationTracked({ ctx, text: stripEmphasis(piece.name), x: cx, y: invitationBaseline(rect.y + NAME.top, NAME.lineHeight, NAME.size, true), size: NAME.size, tracking: NAME.tracking, serif: true, bold: true, anchor: "middle", fill: invitationText(inks.gold, ground, NAME.size), attrs: glossBreak(piece.sep) })}
              <text {...invitationSmall(LINE.size)} x={cx} y={invitationBaseline(rect.y + LINE.top, LINE.lineHeight, LINE.size)} textAnchor="middle" fontFamily={ctx.fonts.body} fontSize={LINE.size} fill={plain} dominantBaseline="alphabetic" xmlSpace="preserve">
                {parseEmphasis(piece.line).map((seg, k) =>
                  seg.emphasized ? (
                    <tspan key={k} fontFamily={ctx.fonts.heading} fontSize={LINE.lit} fontWeight="700" fill={lit}>
                      {seg.text}
                    </tspan>
                  ) : (
                    <tspan key={k}>{seg.text}</tspan>
                  ),
                )}
              </text>
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
