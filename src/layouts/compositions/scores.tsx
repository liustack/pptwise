import type React from "react"
import type { Component } from "@/ir"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { paintTag, type TagInks } from "../../components/tag"
import { resolveSemanticColor } from "../../render/ink"
import { SEAL_HEADER_RULE, SEAL_TYPE, sealInks, sealSmall, sealTagSpec, sealText } from "./seal"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"
import { inkToward } from "../../components/tag"

type Scorecard = Extract<Component, { type: "scorecard" }>
type ScoreRow = Scorecard["rows"][number]

/*
 * scores: a scorecard as an open table, vermilion's 2026-10 review page (p03).
 * 15px headers over a 2px rule in the mark, 64px rows on hairlines: the goal
 * bold at 19px, the target muted at 18px, what was reached bold at 24px, the
 * gap at 18px, and the verdict as a tag at the right edge. A row off track is
 * the page's mark: it sits on the mark's pale tint with its goal, figure and
 * gap in the mark and its verdict filled. A row on track is outlined in the
 * success ink, one to watch in the accent. The card's note is a line under
 * the table.
 *
 * Takes: one `scorecard` of three to six rows. The seal setting only.
 *
 * Declines: a goal, target, figure or gap past one line of its column, a
 * verdict wider than the column it stands in, and a table taller than the
 * band. The ordinary scorecard then sets it, wrapping its columns.
 *
 * Band: the board's 1120px, or any width the columns' shares hold.
 */

const MAX_ROWS = 6
const HEADER = { box: 24, rule: 28 }
const ROW_H = 64
/** Column starts and widths as shares of the band, from the board's 1120px. */
const COLUMNS = { name: [20, 220], target: [240, 220], actual: [460, 220], gap: [680, 280] } as const
const BOARD_W = 1120
const NAME = { size: 19, lineHeight: 28 }
const TARGET = { size: 18, lineHeight: 28 }
const ACTUAL = { size: 24, lineHeight: 34 }
const GAP = { size: 18, lineHeight: 28 }
const VERDICT_MIN_W = 80
const NOTE = { size: 17, lineHeight: 28, gap: 16 }

const WORDS = {
  zh: { metric: "指标", target: "目标", actual: "实际", gap: "差距", status: "判断", on_track: "完成", watch: "观察", off_track: "未完成" },
  en: { metric: "Goal", target: "Target", actual: "Actual", gap: "Gap", status: "Verdict", on_track: "Met", watch: "Watch", off_track: "Missed" },
} as const

function readsChinese(card: Scorecard): boolean {
  return /[㐀-鿿]/.test(card.rows.map((row) => row.label + row.target + row.actual + row.gap).join(""))
}

export const scoresComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "seal") return null
  const [card, ...rest] = components
  if (card?.type !== "scorecard" || rest.length > 0) return null
  if (card.rows.length > MAX_ROWS) return null
  const body = ctx.fonts.body
  const inks = sealInks(ctx)
  const words = WORDS[readsChinese(card) ? "zh" : "en"]
  const scale = rect.w / BOARD_W
  const col = (key: keyof typeof COLUMNS) => ({ x: rect.x + COLUMNS[key][0] * scale, w: COLUMNS[key][1] * scale - 20 })
  const right = rect.x + rect.w
  const verdictRoom = rect.w - (COLUMNS.gap[0] + COLUMNS.gap[1]) * scale
  const tagSpec = sealTagSpec(ctx)

  const header = (key: keyof typeof words & ("metric" | "target" | "actual" | "gap" | "status")) => card.labels?.[key]?.trim() || words[key]
  const headers = (["metric", "target", "actual", "gap"] as const).map((key) => {
    const c = col(key === "metric" ? "name" : key)
    return { key, x: c.x, fit: fitFixed(header(key), { width: c.w, size: SEAL_TYPE.label, lineHeight: HEADER.box, maxLines: 1, fontFamily: body, bold: false }) }
  })
  if (headers.some((h) => h.fit === null)) return null

  const rows = []
  for (const row of card.rows) {
    const missed = row.status === "off_track"
    const fit = (text: string, key: keyof typeof COLUMNS, spec: { size: number; lineHeight: number }, bold: boolean) =>
      fitFixed(text, { width: col(key).w, size: spec.size, lineHeight: spec.lineHeight, maxLines: 1, fontFamily: key === "actual" ? ctx.fonts.heading : body, bold })
    const name = fit(row.label, "name", NAME, true)
    const target = fit(row.target, "target", TARGET, false)
    const actual = fit(row.actual, "actual", ACTUAL, true)
    const gap = fit(row.gap, "gap", GAP, false)
    if (!name || !target || !actual || !gap) return null
    const verdict = row.status_label?.trim() || words[row.status]
    const verdictW = Math.max(VERDICT_MIN_W, Math.ceil(measureTextUnits(verdict, { bold: true, fontFamily: body }) * tagSpec.size) + tagSpec.padX * 2)
    if (verdictW > verdictRoom) return null
    rows.push({ row, missed, name, target, actual, gap, verdict, verdictW })
  }
  const note = card.note?.trim()
    ? fitFixed(card.note, { width: rect.w, size: NOTE.size, lineHeight: NOTE.lineHeight, maxLines: 2, fontFamily: body, bold: false })
    : undefined
  if (note === null) return null
  const tableH = HEADER.rule + SEAL_HEADER_RULE + rows.length * (ROW_H + 1)
  if (tableH + (note ? NOTE.gap + note.lines.length * NOTE.lineHeight : 0) > rect.h) return null

  const rule = ruleInk(ctx)
  const headerBaseline = centredBaseline(rect.y, HEADER.box, SEAL_TYPE.label)
  const verdictInks = (row: ScoreRow, ground: string): TagInks => {
    if (row.status === "off_track") return { fill: inks.mark, stroke: inks.mark, text: inks.onMark }
    const line = row.status === "on_track" ? resolveSemanticColor("success", ctx.colors) : inks.accent
    return { fill: null, stroke: line, text: inkToward(line, inks.ink, ground, SEAL_TYPE.tag) }
  }
  const rowsTop = rect.y + HEADER.rule + SEAL_HEADER_RULE
  return (
    <g {...compositionTag("scores")}>
      <g {...blockTag(ctx, card)}>
        {headers.map((h) =>
          paintLines(h.fit!, {
            ctx,
            x: h.x,
            y: headerBaseline,
            fill: sealText(inks.muted, inks.ground, SEAL_TYPE.label),
            fontFamily: body,
            fontWeight: "400",
            attrs: sealSmall(SEAL_TYPE.label),
          }),
        )}
        <text
          {...sealSmall(SEAL_TYPE.label)}
          x={right}
          y={headerBaseline}
          textAnchor="end"
          fontFamily={body}
          fontSize={SEAL_TYPE.label}
          fill={sealText(inks.muted, inks.ground, SEAL_TYPE.label)}
          dominantBaseline="alphabetic"
        >
          {header("status")}
        </text>
        <rect x={rect.x} y={rect.y + HEADER.rule} width={rect.w} height={SEAL_HEADER_RULE} fill={inks.mark} />
        {rows.map((r, i) => {
          const top = rowsTop + i * (ROW_H + 1)
          const ground = r.missed ? inks.tint : inks.ground
          const baseline = (spec: { size: number; lineHeight: number }) => centredBaseline(top + (ROW_H - spec.lineHeight) / 2, spec.lineHeight, spec.size)
          const markOr = (ink: string) => (r.missed ? inks.mark : ink)
          return (
            <g key={i} data-row-marked={r.missed ? "1" : undefined}>
              {r.missed && <rect x={rect.x} y={top} width={rect.w} height={ROW_H} fill={inks.tint} />}
              <rect x={rect.x} y={top + ROW_H} width={rect.w} height={1} fill={rule} />
              {paintLines(r.name, { ctx, x: col("name").x, y: baseline(NAME), fill: sealText(markOr(inks.ink), ground, NAME.size), fontFamily: body, fontWeight: "700", bg: ground })}
              {paintLines(r.target, { ctx, x: col("target").x, y: baseline(TARGET), fill: sealText(inks.muted, ground, TARGET.size), fontFamily: body, fontWeight: "400", bg: ground })}
              {paintLines(r.actual, {
                ctx,
                x: col("actual").x,
                y: baseline(ACTUAL),
                fill: sealText(markOr(inks.ink), ground, ACTUAL.size),
                fontFamily: ctx.fonts.heading,
                fontWeight: "700",
                bg: ground,
              })}
              {paintLines(r.gap, { ctx, x: col("gap").x, y: baseline(GAP), fill: sealText(markOr(inks.muted), ground, GAP.size), fontFamily: body, fontWeight: "400", bg: ground })}
              {paintTag({
                tag: { text: r.verdict },
                x: right - r.verdictW,
                y: Math.round(top + (ROW_H - tagSpec.height) / 2),
                spec: tagSpec,
                width: r.verdictW,
                inks: verdictInks(r.row, ground),
                attrs: sealSmall(SEAL_TYPE.tag),
              })}
            </g>
          )
        })}
      </g>
      {note &&
        paintLines(note, {
          ctx,
          x: rect.x,
          y: centredBaseline(rowsTop + rows.length * (ROW_H + 1) + NOTE.gap, NOTE.lineHeight, NOTE.size),
          fill: sealText(inks.muted, inks.ground, NOTE.size),
          fontFamily: body,
          fontWeight: "400",
        })}
    </g>
  )
}
