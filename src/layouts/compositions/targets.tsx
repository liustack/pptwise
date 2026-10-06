import type React from "react"
import type { Component } from "@/ir"
import { joinUnit } from "../../lib/quantity-format"
import { measureTextUnits } from "../../lib/svg-text-layout"
import { paintTag, tagWidth } from "../../components/tag"
import { SEAL_HEADER_RULE, SEAL_SPEC, SEAL_TYPE, sealInks, sealSmall, sealTagInks, sealTagSpec, sealText } from "./seal"
import { blockTag, compositionTag, ruleInk, type Composition } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"

type InsightPanel = Extract<Component, { type: "insight_panel" }>
type FromTo = Extract<Component, { type: "from_to" }>

/*
 * targets: a plan's targets beside the one thing it says instead of a figure,
 * vermilion's 2026-10 plan page (p07). On the left a block reversed out of
 * the mark: the panel's title small, its one row's label as the statement at
 * 34px bold, the row's text (the plan's own words) at 18px, and the panel's
 * footnote small at its foot. On the right an open table of the measures:
 * 15px headers over a 2px rule in the mark, 64px rows on hairlines, each
 * measure's name, its starting value muted, an arrow in the accent, its
 * target bold at 24px, and its tag at the right edge. The measure the author
 * marks sits on the mark's pale tint, its name and target in the mark and its
 * tag filled.
 *
 * The statement is display type: one that takes more than half the block's
 * measure on a line is set on two even lines, so the block reads as a
 * headline and not as a caption that happens to be large. The plan's words
 * stand 42px under it, and the footnote keeps 42px off the block's foot.
 * The table's value columns and its tag column are 110px each, a column
 * wider only for a longer value or tag, and the names take what is left. The
 * from_to's `label_column` heads the names.
 *
 * Takes: `[insight_panel, from_to]` where the panel has one row, and the
 * from_to three to six rows with no `kicker`, `span`, `change`, `icon` or `note`. The seal
 * setting only.
 *
 * Declines: a statement past two lines of the block at 34px, the plan's
 * words past four lines at 18px, a footnote past three lines, a measure's name
 * past one line of what the values leave it, and a page taller than the band.
 */

const BLOCK = { w: 340, padX: 28, padTop: 28, padFoot: 42 }
const BLOCK_TITLE = { size: 15, lineHeight: 22 }
const STATEMENT = { size: 34, lineHeight: 46, gap: 10, maxLines: 2 }
const WORDS = { size: 18, lineHeight: 28, gap: 42, maxLines: 4 }
const FOOT = { size: 15, lineHeight: 22, maxLines: 3 }
const TABLE_GAP = 40
const HEADER = { box: 24, rule: 28 }
const ROW_H = 64
const NAME = { size: 18, lineHeight: 28, inset: 16 }
const FROM = { size: 19, w: 110 }
const ARROW = { w: 30 }
const TO = { size: 24, w: 110 }
const TAG = { w: 110, gap: 20 }
/** Room a value keeps off the arrow beside it. */
const VALUE_AIR = 12

function targetsShape(components: readonly Component[]): { panel: InsightPanel; plan: FromTo } | null {
  const [panel, plan, ...rest] = components
  if (panel?.type !== "insight_panel" || plan?.type !== "from_to" || rest.length > 0) return null
  if (panel.rows.length !== 1 || panel.icon) return null
  if (plan.from.kicker?.trim() || plan.to.kicker?.trim() || plan.span?.trim()) return null
  if (plan.rows.some((row) => row.change?.trim() || row.icon || row.note)) return null
  return { panel, plan }
}

/**
 * The statement at 34px bold in the block's measure. One line wider than half
 * the measure is set again on two even lines, display type in a block.
 */
function fitStatement(text: string, width: number, fontFamily: string) {
  const spec = { size: STATEMENT.size, lineHeight: STATEMENT.lineHeight, maxLines: STATEMENT.maxLines, fontFamily, bold: true, balance: true }
  const fit = fitFixed(text, { ...spec, width })
  if (!fit || fit.lines.length > 1) return fit
  const oneLine = measureTextUnits(text.trim(), { fontFamily, bold: true }) * STATEMENT.size
  if (oneLine <= width / 2) return fit
  // The narrowest measure that holds it on two lines splits it most evenly.
  for (let w = Math.ceil(oneLine / 2); w <= width; w += 2) {
    const two = fitFixed(text, { ...spec, width: w })
    if (two && two.lines.length === 2) return two
  }
  return fit
}

export const targetsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "seal") return null
  const shape = targetsShape(components)
  if (!shape) return null
  const { panel, plan } = shape
  const body = ctx.fonts.body
  const inks = sealInks(ctx)

  // The block.
  const blockTextW = BLOCK.w - BLOCK.padX * 2
  const row = panel.rows[0]!
  const blockTitle = fitFixed(panel.title, { width: blockTextW, size: BLOCK_TITLE.size, lineHeight: BLOCK_TITLE.lineHeight, maxLines: 1, fontFamily: body, bold: false })
  const statement = fitStatement(row.label, blockTextW, body)
  const words = fitFixed(row.text, { width: blockTextW, size: WORDS.size, lineHeight: WORDS.lineHeight, maxLines: WORDS.maxLines, fontFamily: body, bold: false })
  const foot = panel.footnote?.trim()
    ? fitFixed(panel.footnote, { width: blockTextW, size: FOOT.size, lineHeight: FOOT.lineHeight, maxLines: FOOT.maxLines, fontFamily: body, bold: false })
    : undefined
  if (!blockTitle || !statement || !words || foot === null) return null
  const blockTop = BLOCK.padTop + BLOCK_TITLE.lineHeight + STATEMENT.gap
  const blockUsed = blockTop + statement.lines.length * STATEMENT.lineHeight + WORDS.gap + words.lines.length * WORDS.lineHeight
  const footH = foot ? foot.lines.length * FOOT.lineHeight : 0

  // The table.
  const tableX = rect.x + BLOCK.w + TABLE_GAP
  const right = rect.x + rect.w
  const tagSpec = sealTagSpec(ctx)
  const tagged = plan.rows.some((r) => r.tag)
  const tagColW = tagged ? Math.max(TAG.w, ...plan.rows.map((r) => (r.tag ? tagWidth(r.tag.text, tagSpec) : 0))) : 0
  const toRight = right - (tagged ? tagColW + TAG.gap : 0)
  const value = (text: string, unit: string | undefined) => joinUnit(text.trim(), unit?.trim() || undefined, " ")
  // A value column is 110px, or its widest value and 12px of air off the arrow.
  const fromW = Math.max(FROM.w, ...plan.rows.map((r) => measureTextUnits(value(r.from, r.unit), { fontFamily: body }) * FROM.size + VALUE_AIR))
  const toW = Math.max(TO.w, ...plan.rows.map((r) => measureTextUnits(value(r.to, r.unit), { fontFamily: body, bold: true }) * TO.size + VALUE_AIR))
  const arrowX = toRight - toW - ARROW.w
  const fromRight = arrowX
  const nameW = fromRight - fromW - tableX - NAME.inset - 12
  const labelHeader = plan.label_column?.trim()
    ? fitFixed(plan.label_column, { width: nameW, size: SEAL_TYPE.label, lineHeight: HEADER.box, maxLines: 1, fontFamily: body, bold: false })
    : undefined
  if (labelHeader === null) return null
  const rows = []
  for (const r of plan.rows) {
    const marked = r.emphasis === true
    const name = fitFixed(r.label, { width: nameW, size: NAME.size, lineHeight: NAME.lineHeight, maxLines: 1, fontFamily: body, bold: marked })
    const from = value(r.from, r.unit)
    const to = value(r.to, r.unit)
    if (!name) return null
    rows.push({ r, marked, name, from, to })
  }
  const tableH = HEADER.rule + SEAL_HEADER_RULE + rows.length * (ROW_H + 1)
  const h = Math.max(tableH, blockUsed + footH + BLOCK.padFoot + 24)
  if (h > rect.h) return null
  const blockH = Math.max(tableH, blockUsed + footH + BLOCK.padFoot + 24)

  const rule = ruleInk(ctx)
  const headerBaseline = centredBaseline(rect.y, HEADER.box, SEAL_TYPE.label)
  const small = (text: string, x: number, anchor: "start" | "end", bold = false, ink = inks.muted) => (
    <text
      {...SEAL_SPEC}
      x={x}
      y={headerBaseline}
      textAnchor={anchor === "end" ? "end" : undefined}
      fontFamily={body}
      fontSize={SEAL_TYPE.label}
      fontWeight={bold ? "700" : undefined}
      fill={sealText(ink, inks.ground, SEAL_TYPE.label)}
      dominantBaseline="alphabetic"
    >
      {text}
    </text>
  )
  const rowsTop = rect.y + HEADER.rule + SEAL_HEADER_RULE
  const blockInk = inks.onMarkQuiet
  return (
    <g {...compositionTag("targets")}>
      <g {...blockTag(ctx, panel)} data-seal-statement="">
        <rect x={rect.x} y={rect.y} width={BLOCK.w} height={blockH} fill={inks.mark} />
        {paintLines(blockTitle, {
          ctx,
          x: rect.x + BLOCK.padX,
          y: centredBaseline(rect.y + BLOCK.padTop, BLOCK_TITLE.lineHeight, BLOCK_TITLE.size),
          fill: blockInk,
          fontFamily: body,
          fontWeight: "400",
          bg: inks.mark,
          attrs: sealSmall(BLOCK_TITLE.size),
        })}
        {paintLines(statement, {
          ctx,
          x: rect.x + BLOCK.padX,
          y: centredBaseline(rect.y + blockTop, STATEMENT.lineHeight, STATEMENT.size),
          fill: inks.onMark,
          fontFamily: body,
          fontWeight: "700",
          bg: inks.mark,
        })}
        {paintLines(words, {
          ctx,
          x: rect.x + BLOCK.padX,
          y: centredBaseline(rect.y + blockTop + statement.lines.length * STATEMENT.lineHeight + WORDS.gap, WORDS.lineHeight, WORDS.size),
          fill: blockInk,
          fontFamily: body,
          fontWeight: "400",
          bg: inks.mark,
        })}
        {foot &&
          paintLines(foot, {
            ctx,
            x: rect.x + BLOCK.padX,
            y: centredBaseline(rect.y + blockH - BLOCK.padFoot - footH, FOOT.lineHeight, FOOT.size),
            fill: blockInk,
            fontFamily: body,
            fontWeight: "400",
            bg: inks.mark,
            attrs: sealSmall(FOOT.size),
          })}
      </g>
      <g {...blockTag(ctx, plan)}>
        {labelHeader &&
          paintLines(labelHeader, {
            ctx,
            x: tableX + NAME.inset,
            y: headerBaseline,
            fill: sealText(inks.muted, inks.ground, SEAL_TYPE.label),
            fontFamily: body,
            fontWeight: "400",
            attrs: sealSmall(SEAL_TYPE.label),
          })}
        {small(plan.from.title, fromRight, "end")}
        {small(plan.to.title, toRight, "end", true, inks.mark)}
        <rect x={tableX} y={rect.y + HEADER.rule} width={right - tableX} height={SEAL_HEADER_RULE} fill={inks.mark} />
        {rows.map((r, i) => {
          const top = rowsTop + i * (ROW_H + 1)
          const ground = r.marked ? inks.tint : inks.ground
          const baseline = (size: number, box: number) => centredBaseline(top + (ROW_H - box) / 2, box, size)
          return (
            <g key={i} data-row-marked={r.marked ? "1" : undefined}>
              {r.marked && <rect x={tableX} y={top} width={right - tableX} height={ROW_H} fill={inks.tint} />}
              <rect x={tableX} y={top + ROW_H} width={right - tableX} height={1} fill={rule} />
              {paintLines(r.name, {
                ctx,
                x: tableX + NAME.inset,
                y: baseline(NAME.size, NAME.lineHeight),
                fill: sealText(r.marked ? inks.mark : inks.ink, ground, NAME.size),
                fontFamily: body,
                fontWeight: r.marked ? "700" : "400",
                bg: ground,
              })}
              <text x={fromRight} y={baseline(FROM.size, 28)} textAnchor="end" fontFamily={body} fontSize={FROM.size} fill={sealText(inks.muted, ground, FROM.size)} dominantBaseline="alphabetic">
                {r.from}
              </text>
              {/* The arrow is a shape in the accent: it reads "to", and the accent never carries words. */}
              <path
                d={`M ${arrowX + 8} ${top + ROW_H / 2} H ${arrowX + ARROW.w - 9} M ${arrowX + ARROW.w - 14} ${top + ROW_H / 2 - 5} L ${arrowX + ARROW.w - 8} ${top + ROW_H / 2} L ${arrowX + ARROW.w - 14} ${top + ROW_H / 2 + 5}`}
                fill="none"
                stroke={inks.accent}
                strokeWidth={2}
              />
              <text x={toRight} y={baseline(TO.size, 34)} textAnchor="end" fontFamily={body} fontSize={TO.size} fontWeight="700" fill={sealText(r.marked ? inks.mark : inks.ink, ground, TO.size)} dominantBaseline="alphabetic">
                {r.to}
              </text>
              {r.r.tag &&
                paintTag({
                  tag: r.r.tag,
                  x: right - tagWidth(r.r.tag.text, tagSpec),
                  y: Math.round(top + (ROW_H - tagSpec.height) / 2),
                  spec: tagSpec,
                  inks: sealTagInks(ctx, r.r.tag, r.marked, ground),
                  attrs: sealSmall(SEAL_TYPE.tag),
                })}
            </g>
          )
        })}
      </g>
    </g>
  )
}
