import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortraitLines,
  paintPortrait,
  paintPortraitIcon,
  paintPortraitLine,
  paintPortraitRule,
  placePortraitHead,
  placePortraitSource,
  portraitBaseline,
  portraitBlock,
  portraitChinese,
  portraitInks,
  portraitMeta,
  portraitText,
  portraitWidth,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Roadmap = Extract<Component, { type: "roadmap" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * tenure: the first days in a new post as phases on a ruler, profile's
 * 2026-10 board (p10). Under the section line and the claim, a ruler across
 * the measure: a hairline of the ink with a tick where each phase starts and
 * at its end, each start named in the grey at 13px (「第 1 天」, 「第 31
 * 天」, "Day 31"), the last day bold in the accent at the right end. Under
 * it the phases in equal blocks 24px apart, each inside a pale outline: its
 * title set huge in the heading serif (「听」, 「定」, 「交」) with its period
 * small and grey after it (under it in every block when a title is a word
 * too wide to share the line, "Listen"), its points at 16/28.8, and at its foot over a
 * pale hairline its one row, the label small and grey (「交付」) and the
 * value bold in the serif at 18px. The phase the page is about (`emphasis`)
 * is filled whole with the accent, its words white or the ink, whichever
 * reads (`portraitBlock`). Under the blocks the callout as one closing line:
 * its icon at 20px, its title bold in the serif and its words a step
 * quieter, at 15px.
 *
 * Takes, in the portrait setting: a `roadmap` of two to four phases, every
 * one with a duration, points and exactly one row, the roadmap counting its
 * durations in days, weeks or months, and optionally one `callout` with a
 * title whose title and words fit one line.
 *
 * Declines: a checkpoint, a row's basis, an icon only some phases have, a
 * title wider than its block, points past five lines, a callout past one
 * line.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces.
 */

const HEAD = { x: 80, top: 64, w: 1120 } as const
const RULER = { below: 46, h: 30, line: 22, tickTop: 16, tick: 13, label: { size: 13, lineHeight: 19, top: -4, dx: 9, endInset: 8 } } as const
const BLOCKS = { below: 18, h: 350, gap: 24, padTop: 24, padX: 24, padBottom: 22, title: { size: 72, lineHeight: 72 }, period: { size: 14, gap: 14, lineHeight: 20, under: 6 }, points: { size: 16, lineHeight: 28.8, maxLines: 5, gap: 16 }, row: { pad: 14, label: { size: 13, lineHeight: 19 }, between: 2, value: { size: 18, lineHeight: 26 } } } as const
const CLOSE = { gap: 22, icon: 20, stroke: 1.7, between: 12, size: 15, lineHeight: 22 } as const
const BOTTOM = 650

/** What a day, a week or a month is called on the ruler: 「第 31 天」, "Day 31". `null` for a unit the ruler cannot name. */
export function tenureMark(n: number, unit: string, chinese: boolean): string | null {
  const u = unit.trim()
  if (!u) return null
  if (chinese) return `第 ${n} ${u}`
  if (/^days?$/iu.test(u)) return `Day ${n}`
  if (/^weeks?$/iu.test(u)) return `Week ${n}`
  if (/^months?$/iu.test(u)) return `Month ${n}`
  return null
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const tenureRecipe: Recipe = {
  look: "The first days in a new post as phases on a ruler",
  kinds: ["process"],
  shapes: [{ parts: [{ type: "roadmap", count: [2, 4], needs: ["items[*].rows", "items[*].duration", "items[*].points", "duration_unit"] }, { type: "callout", needs: ["title"], optional: true }] }],
}

export const tenureComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length < 1 || components.length > 2) return null
  const map = components.find((c): c is Roadmap => c.type === "roadmap")
  const close = components.find((c): c is Callout => c.type === "callout")
  if (!map || (components.length === 2 && !close) || (close && (!close.title?.trim() || close.tag))) return null
  const phases = map.items
  if (phases.length < 2 || phases.length > 4 || !map.duration_unit?.trim()) return null
  if (phases.some((p) => p.duration === undefined || p.checkpoint || !p.points?.length || p.rows?.length !== 1 || p.rows[0]!.basis !== undefined)) return null
  if (phases.filter((p) => p.emphasis).length > 1) return null
  const chinese = portraitChinese(ctx, phases.map((p) => p.title))
  const total = phases.reduce((s, p) => s + (p.duration ?? 0), 0)
  if (total <= 0) return null
  const starts: number[] = []
  phases.reduce((at, p) => (starts.push(at), at + (p.duration ?? 0)), 0)
  const marks = starts.map((s) => tenureMark(s + 1, map.duration_unit!, chinese))
  const end = tenureMark(total, map.duration_unit, chinese)
  if (!end || marks.some((m) => !m)) return null
  const w = (HEAD.w - BLOCKS.gap * (phases.length - 1)) / phases.length
  const inner = w - BLOCKS.padX * 2
  const blocks = phases.map((p) => ({
    p,
    titleW: portraitWidth(p.title, BLOCKS.title.size, ctx, { serif: true, bold: true }),
    periodW: p.period?.trim() ? portraitWidth(p.period, BLOCKS.period.size, ctx) : 0,
    points: fitPortraitLines(p.points ?? [], { width: inner, size: BLOCKS.points.size, lineHeight: BLOCKS.points.lineHeight, maxLines: BLOCKS.points.maxLines }, ctx),
    row: p.rows![0]!,
  }))
  // The period follows the title on its baseline, or every period goes under its title when one does not fit beside it.
  const stacked = blocks.some((b) => b.titleW + (b.periodW ? BLOCKS.period.gap + b.periodW : 0) > inner)
  if (blocks.some((b) => b.titleW > inner || b.periodW > inner || !b.points)) return null
  const titleH = BLOCKS.title.lineHeight + (stacked ? BLOCKS.period.under + BLOCKS.period.lineHeight : 0)
  if (blocks.some((b) => portraitWidth(b.row.value, BLOCKS.row.value.size, ctx, { serif: true, bold: true }) > inner || portraitWidth(b.row.label, BLOCKS.row.label.size, ctx) > inner)) return null
  const pointsEnd = (b: (typeof blocks)[number]) => BLOCKS.padTop + titleH + BLOCKS.points.gap + b.points!.lines.length * BLOCKS.points.lineHeight
  const rowH = 1 + BLOCKS.row.pad + BLOCKS.row.label.lineHeight + BLOCKS.row.between + BLOCKS.row.value.lineHeight
  if (blocks.some((b) => pointsEnd(b) + 12 + rowH + BLOCKS.padBottom > BLOCKS.h)) return null
  const closeTitle = close ? stripEmphasis(close.title ?? "").trim() : ""
  const closeText = close ? stripEmphasis(close.text ?? "").trim() : ""
  const closeW = close ? CLOSE.icon + CLOSE.between + portraitWidth(closeTitle, CLOSE.size, ctx, { serif: true, bold: true }) + (closeText ? CLOSE.between + portraitWidth(closeText, CLOSE.size, ctx) : 0) : 0
  if (closeW > HEAD.w) return null
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head) return null
  const rulerTop = head.bottom + RULER.below
  const blocksTop = rulerTop + RULER.h + BLOCKS.below
  const closeTop = blocksTop + BLOCKS.h + CLOSE.gap
  if ((close ? closeTop + CLOSE.lineHeight : blocksTop + BLOCKS.h) > BOTTOM) return null
  const foot = placePortraitSource(source, { x: HEAD.x, w: HEAD.w })
  if (foot === false) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const ticks = [...starts.map((s) => HEAD.x + (HEAD.w * s) / total), HEAD.x + HEAD.w]
  const labelBase = portraitBaseline(rulerTop + RULER.label.top, RULER.label.lineHeight, RULER.label.size)
  const lit = portraitBlock(ctx, BLOCKS.points.size)
  return (
    <g {...compositionTag("tenure")}>
      {head.node}
      <g {...blockTag(ctx, map)} data-portrait-tenure="">
        <g data-portrait-ruler="">
          {paintPortraitRule(HEAD.x, HEAD.x + HEAD.w, rulerTop + RULER.line + 0.5, inks.ink, 1)}
          {ticks.map((x, i) => (
            <rect key={`t${i}`} x={Math.min(x, HEAD.x + HEAD.w - 1)} y={rulerTop + RULER.tickTop} width={1} height={RULER.tick} fill={inks.ink} />
          ))}
          {marks.map((m, i) => (
            <g key={`m${i}`}>{paintPortraitLine(m!, { ctx, x: ticks[i]! + (i === 0 ? 0 : RULER.label.dx), baseline: labelBase, size: RULER.label.size, fill: portraitMeta(inks.muted, ground) })}</g>
          ))}
          {paintPortraitLine(end, { ctx, x: HEAD.x + HEAD.w - RULER.label.endInset, anchor: "end", baseline: labelBase, size: RULER.label.size, bold: true, fill: portraitText(inks.lead, ground, RULER.label.size), attrs: { "data-portrait-end": "" } })}
        </g>
        {blocks.map((b, i) => {
          const x = HEAD.x + i * (w + BLOCKS.gap)
          const filled = b.p.emphasis === true
          const on = filled ? lit.fill : ground
          const ink = filled ? lit.ink : inks.ink
          const quiet = filled ? lit.ink : inks.muted
          const titleBase = portraitBaseline(blocksTop + BLOCKS.padTop, BLOCKS.title.lineHeight, BLOCKS.title.size, true)
          const rowTop = blocksTop + BLOCKS.h - BLOCKS.padBottom - rowH
          return (
            <g key={i} data-portrait-phase={stripEmphasis(b.p.title)} data-lit={filled ? "" : undefined}>
              {filled ? <rect x={x} y={blocksTop} width={w} height={BLOCKS.h} fill={on} /> : <rect x={x + 0.5} y={blocksTop + 0.5} width={w - 1} height={BLOCKS.h - 1} fill="none" stroke={inks.line} strokeWidth={1} />}
              {paintPortraitLine(b.p.title, { ctx, x: x + BLOCKS.padX, baseline: titleBase, size: BLOCKS.title.size, serif: true, bold: true, fill: portraitText(ink, on, BLOCKS.title.size), ground: on })}
              {b.p.period?.trim() ? paintPortraitLine(b.p.period, { ctx, ...(stacked ? { x: x + BLOCKS.padX, top: blocksTop + BLOCKS.padTop + BLOCKS.title.lineHeight + BLOCKS.period.under, lineHeight: BLOCKS.period.lineHeight } : { x: x + BLOCKS.padX + b.titleW + BLOCKS.period.gap, baseline: titleBase }), size: BLOCKS.period.size, fill: portraitText(quiet, on, BLOCKS.period.size), ground: on }) : null}
              {paintPortrait(b.points!, { ctx, x: x + BLOCKS.padX, top: blocksTop + BLOCKS.padTop + titleH + BLOCKS.points.gap, fill: portraitText(ink, on, BLOCKS.points.size), ground: on })}
              {paintPortraitRule(x + BLOCKS.padX, x + w - BLOCKS.padX, rowTop + 0.5, filled ? lit.quiet : inks.line, 1)}
              {paintPortraitLine(b.row.label, { ctx, x: x + BLOCKS.padX, top: rowTop + 1 + BLOCKS.row.pad, lineHeight: BLOCKS.row.label.lineHeight, size: BLOCKS.row.label.size, fill: portraitText(quiet, on, BLOCKS.row.label.size), ground: on })}
              {paintPortraitLine(b.row.value, { ctx, x: x + BLOCKS.padX, top: rowTop + 1 + BLOCKS.row.pad + BLOCKS.row.label.lineHeight + BLOCKS.row.between, lineHeight: BLOCKS.row.value.lineHeight, size: BLOCKS.row.value.size, serif: true, bold: true, fill: portraitText(ink, on, BLOCKS.row.value.size), ground: on })}
            </g>
          )
        })}
      </g>
      {close ? (
        <g {...blockTag(ctx, close)} data-portrait-close-line="">
          {close.icon ? paintPortraitIcon(close.icon, HEAD.x, closeTop + (CLOSE.lineHeight - CLOSE.icon) / 2, CLOSE.icon, inks.ink, ground, { stroke: CLOSE.stroke }) : null}
          {paintPortraitLine(closeTitle, { ctx, x: HEAD.x + (close.icon ? CLOSE.icon + CLOSE.between : 0), top: closeTop, lineHeight: CLOSE.lineHeight, size: CLOSE.size, serif: true, bold: true, fill: portraitText(inks.ink, ground, CLOSE.size) })}
          {closeText ? paintPortraitLine(closeText, { ctx, x: HEAD.x + (close.icon ? CLOSE.icon + CLOSE.between : 0) + portraitWidth(closeTitle, CLOSE.size, ctx, { serif: true, bold: true }) + CLOSE.between, top: closeTop, lineHeight: CLOSE.lineHeight, size: CLOSE.size, fill: portraitText(inks.body, ground, CLOSE.size) }) : null}
        </g>
      ) : null}
      {foot}
    </g>
  )
}

