import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPlacard,
  fitPlacardSentence,
  paintPlacard,
  paintPlacardIcon,
  paintPlacardLine,
  placardInks,
  placardMark,
  placardText,
  placePlacardClaim,
  placePlacardSource,
  wholePage,
} from "./placard"

type Roadmap = Extract<Component, { type: "roadmap" }>

/*
 * floorplan: the visit drawn as a gallery's floor plan, museum's 2026-10
 * board (p02). The claim over the page. The halls side by side as rooms,
 * each a lifted board with a seam round it and a doorway left open in the
 * middle of its lower wall: its name in the serif and what it holds in old
 * paper, then its exhibits one under another, each a copper disc with its
 * number in the dark of the hall and its name beside it. The exhibits are
 * numbered across the whole visit. A dotted copper walk runs from the first
 * room through every exhibit in order. A room with no exhibits shows its
 * symbol where they would stand. The source, a word on what the walk is,
 * small under the plan.
 *
 * Takes, in the placard setting: a `roadmap` of two to four items, each a
 * room: its title, what it holds as its `period`, its exhibits as `points`
 * (up to three a room) and an optional `icon`, with no rows, duration,
 * checkpoint or marked room.
 *
 * Declines: a room name past one line, what a room holds past two lines, an
 * exhibit's name past one line.
 *
 * Reads: the placard inks (`./placard.tsx`), the heading and body faces.
 */

const PLAN = { x: 64, y: 200, w: 1152, h: 380, gap: 16, rich: 300, door: 40, wall: 4 } as const
const NAME = { dx: 22, dy: 20, size: 22, lineHeight: 30 } as const
const HOLDS = { dx: 22, dy: 54, size: 12, lineHeight: 20, maxLines: 2 } as const
const EXHIBIT = { dx: 40, dy: 130, pitch: 80, r: 16, size: 14, label: { dx: 66, size: 14, lineHeight: 22 } } as const
const SYMBOL = { dx: 22, dy: 118, size: 28, gap: 12 } as const
const WALK = { dash: "2 5", width: 1.4, opacity: 0.8 } as const
const SOURCE = { top: 606 } as const

/** The rooms' widths: a room of two exhibits or more 300px, the others sharing what is left, or all alike when that leaves them too narrow. */
export function roomWidths(counts: readonly number[]): number[] {
  const room = PLAN.w - (counts.length - 1) * PLAN.gap
  const rich = counts.filter((n) => n >= 2).length
  const plain = counts.length - rich
  const left = plain > 0 ? (room - rich * PLAN.rich) / plain : 0
  if (rich === 0 || plain === 0 || left < 200) return counts.map(() => room / counts.length)
  return counts.map((n) => (n >= 2 ? PLAN.rich : left))
}

export const floorplanComposition: Composition = ({ components, ctx, rect, setting, claim, source }) => {
  if (setting !== "placard" || !wholePage(rect) || components.length !== 1) return null
  const plan = components[0]!
  if (plan.type !== "roadmap") return null
  const rooms = (plan as Roadmap).items
  if (rooms.length < 2 || rooms.length > 4) return null
  if (rooms.some((r) => r.rows?.length || r.duration !== undefined || r.checkpoint || r.emphasis)) return null
  if ((plan as Roadmap).duration_unit) return null
  const widths = roomWidths(rooms.map((r) => r.points?.length ?? 0))
  const names = rooms.map((r, i) => fitPlacard(r.title, { width: widths[i]! - NAME.dx * 2, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, serif: true }, ctx))
  const holds = rooms.map((r, i) => (r.period?.trim() ? fitPlacardSentence(r.period, { width: widths[i]! - HOLDS.dx * 2, size: HOLDS.size, lineHeight: HOLDS.lineHeight, maxLines: HOLDS.maxLines }, ctx) : undefined))
  const exhibits = rooms.map((r, i) => (r.points ?? []).map((p) => fitPlacard(p, { width: widths[i]! - EXHIBIT.label.dx - 20, size: EXHIBIT.label.size, lineHeight: EXHIBIT.label.lineHeight, maxLines: 1 }, ctx)))
  if (names.some((n) => !n) || holds.some((h) => h === null) || exhibits.some((list) => list.some((e) => !e))) return null
  const head = placePlacardClaim(claim, { x: rect.x + 64, w: 1152 })
  if (head === false) return null
  const foot = placePlacardSource(source, { x: rect.x + 64, w: 1100, top: rect.y + SOURCE.top })
  if (foot === false) return null
  const inks = placardInks(ctx)
  const ground = inks.ground
  const board = inks.board
  const copper = placardMark(inks.copper, board)
  const lefts = widths.map((_, i) => rect.x + PLAN.x + widths.slice(0, i).reduce((s, w) => s + w + PLAN.gap, 0))
  const top = rect.y + PLAN.y
  // The walk: from the first room's middle at the height of the first row of exhibits, through every exhibit in order.
  const stops: [number, number][] = []
  let n = 0
  rooms.forEach((r, i) => (r.points ?? []).forEach((_, j) => stops.push([lefts[i]! + EXHIBIT.dx, top + EXHIBIT.dy + j * EXHIBIT.pitch])))
  const startsEmpty = (rooms[0]!.points?.length ?? 0) === 0 && stops.length > 0
  const walk = stops.length > 1 || startsEmpty
    ? [startsEmpty ? `M ${lefts[0]! + widths[0]! / 2} ${stops[0]![1]} L ${stops[0]![0] - EXHIBIT.r} ${stops[0]![1]}` : `M ${stops[0]![0]} ${stops[0]![1]}`, ...stops.slice(startsEmpty ? 0 : 1).map(([x, y]) => `L ${x} ${y}`)].join(" ")
    : null
  return (
    <g {...compositionTag("floorplan")}>
      {head}
      <g {...blockTag(ctx, plan)} data-placard-floorplan="">
        {rooms.map((r, i) => (
          <g key={`room-${i}`} data-placard-room={r.title}>
            <rect x={lefts[i]! + 0.5} y={top + 0.5} width={widths[i]!} height={PLAN.h} fill={board} stroke={inks.line} strokeWidth={1} />
            <rect data-placard-door="" x={lefts[i]! + widths[i]! / 2 - PLAN.door / 2} y={top + PLAN.h - PLAN.wall / 2} width={PLAN.door} height={PLAN.wall} fill={ground} />
          </g>
        ))}
        {walk ? <path data-placard-walk="" d={walk} fill="none" stroke={placardMark(inks.copper, board)} strokeWidth={WALK.width} strokeDasharray={WALK.dash} strokeOpacity={WALK.opacity} /> : null}
        {rooms.map((r, i) => {
          const x = lefts[i]!
          return (
            <g key={`words-${i}`}>
              {paintPlacard(names[i]!, { ctx, x: x + NAME.dx, top: top + NAME.dy, fill: placardText(inks.ink, board, NAME.size), serif: true, ground: board })}
              {holds[i] ? paintPlacard(holds[i]!, { ctx, x: x + HOLDS.dx, top: top + HOLDS.dy, fill: placardText(inks.muted, board, HOLDS.size), ground: board }) : null}
              {(r.points ?? []).length === 0 && r.icon ? paintPlacardIcon(r.icon, x + SYMBOL.dx, top + SYMBOL.dy, SYMBOL.size, inks.copper, board, { stroke: 1.4 }) : null}
              {(r.points ?? []).length > 0 && r.icon ? paintPlacardIcon(r.icon, x + widths[i]! - NAME.dx - 24, top + NAME.dy + 3, 24, inks.copper, board, { stroke: 1.4 }) : null}
              {exhibits[i]!.map((e, j) => {
                n += 1
                const cy = top + EXHIBIT.dy + j * EXHIBIT.pitch
                return (
                  <g key={j} data-placard-exhibit={n}>
                    <circle cx={x + EXHIBIT.dx} cy={cy} r={EXHIBIT.r} fill={copper} />
                    {paintPlacardLine(String(n), { ctx, x: x + EXHIBIT.dx, baseline: cy + 5, size: EXHIBIT.size, serif: true, bold: true, anchor: "middle", fill: placardText(ground, copper, EXHIBIT.size), ground: copper })}
                    {paintPlacard(e!, { ctx, x: x + EXHIBIT.label.dx, top: cy - 11, fill: placardText(inks.ink, board, EXHIBIT.label.size), ground: board })}
                  </g>
                )
              })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
