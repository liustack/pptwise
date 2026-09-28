import type { Component } from "@/ir"
import { fitSvgLine, layoutSvgText, measureTextUnits } from "../lib/svg-text-layout"
import { DroppedContentMarker } from "../render/drop-marker"
import { accessibleInk } from "../render/ink"
import { anyCut } from "./declared-fit"
import type { RenderDef, SvgComponent } from "./types"

type RingsComponent = Extract<Component, { type: "rings" }>

/**
 * 分层同心圆环（洋葱模型，2026-07-11 用户借鉴 CMT 体系页）：items 从内核
 * 到外层。圆环组靠左（内核实心 primary、外环递淡 fill + 细描边），每层
 * 从环缘拉引线到右侧标注列（label 粗体 + desc muted）。全部 circle/path/
 * text 原语，导出安全。
 */
const H_PER_RING: Record<number, number> = { 2: 300, 3: 340, 4: 380 }
const PAD = 10
const LABEL_GAP = 40
const DESC_SIZE = 16
const LABEL_SIZE = 17
const LABEL_FLOOR = 16
const CORE_SIZE = 18
const DESC_LINE_RATIO = 1.35
/** 首行标注基线距顶；末行标注基线距底至少同样多。 */
const ROW_EDGE = PAD + 28
/** 标注基线到 desc 第一行的额外间距：desc 第 j 行基线 = rowY + DESC_GAP + (j+1)·lh。 */
const DESC_GAP = 8
/** How far a line's glyph box reaches below its baseline, as a share of its size. */
const GLYPH_DEPTH = 0.25
/** Air between one row's last line and the next row's label. */
const ROW_CLEAR = 8
/**
 * The share of the box width the rings may take, widest first; the label
 * column keeps the rest.
 *
 * The rings used to be sized by the box height alone, and the label column
 * took whatever width was left. In a full-width box that is 700px of text; in
 * the 424px panel beside a lead column it was 54px, and every label and
 * description was cut to three characters ("席位开", "Onboardin"). Capping
 * the drawing at half the width changes nothing in a wide box, where the
 * rings already take about a third. When the descriptions still need more
 * height than the box has at half, the rings give up a little more width so
 * the lines get longer and fewer.
 */
const FIGURE_SHARES = [0.5, 0.45, 0.4] as const
/** A drawing smaller than this has no rings left to read. */
const MIN_OUTER_R = 40
/** The core label fits inside this multiple of the core radius. */
const CORE_TEXT_SPAN = 1.7
/** The thinnest band a ring keeps when the core grows to hold its name. */
const MIN_BAND = 14
/** A description wraps as far as the height allows; the height check, not a line cap, decides. */
const DESC_MAX_LINES = 64

type LineFit = ReturnType<typeof fitSvgLine>
type Desc = ReturnType<typeof layoutSvgText>

/**
 * Everything the drawing needs, fitted before anything is painted.
 *
 * The rows are the layout, not decoration beside it: a description wraps in
 * the column it is given, and the rows spread down the box as far as their
 * own text needs. When the box is too short for that, or a label cannot keep
 * its whole name on one line at the floor, `fits` is false and the component
 * declines, so the page steps aside to a rendering with the room. Nothing is
 * cut and nothing is left off the bottom: the last row's description used to
 * stop at the component's own edge, and a second line past it was simply not
 * drawn.
 */
function geometry(component: RingsComponent, w: number, headingFont: string | undefined, maxH?: number) {
  const naturalH = H_PER_RING[component.items.length] ?? 340
  const baseH = Math.min(naturalH, maxH ?? Number.POSITIVE_INFINITY)
  const tries = FIGURE_SHARES.map((share) => layoutAt(component, w, share, headingFont, maxH))
  // The widest drawing whose rows fit the natural height, or else the one
  // whose rows need the least extra height. `measure` makes the same choice
  // with no cap, so a box sized by it gets the layout it was sized for.
  const settled = tries.find((g) => g.needH <= baseH && g.fits)
  if (settled) return settled
  const fitting = tries.filter((g) => g.fits)
  if (fitting.length === 0) return tries[0]!
  return fitting.reduce((best, g) => (g.needH < best.needH ? g : best))
}

function layoutAt(
  component: RingsComponent,
  w: number,
  share: number,
  headingFont: string | undefined,
  maxH?: number,
) {
  const n = component.items.length
  const naturalH = H_PER_RING[n] ?? 340
  const cap = maxH ?? Number.POSITIVE_INFINITY
  const maxR = Math.min(Math.min(naturalH, cap) / 2 - PAD, (w * share - PAD - LABEL_GAP) / 2)
  const cx = maxR + PAD
  const textX = cx + maxR + LABEL_GAP
  const textW = Math.max(1, w - textX)
  const weight = { bold: true, fontFamily: headingFont }

  // The core prints its own name, the same name its row prints. It grows to
  // hold that name when a third of the drawing is too small for it, as long
  // as every ring keeps a band a reader can see. Past that it stays a solid
  // core, and the row with the leader line into it still names it.
  const core = component.items[0]!
  const fitCore = (r: number): LineFit =>
    fitSvgLine(core.label, {
      maxWidth: r * CORE_TEXT_SPAN,
      fontSize: CORE_SIZE,
      minFontSize: LABEL_FLOOR,
      ...weight,
    })
  let coreR = maxR * 0.36
  let coreFit = fitCore(coreR)
  if (coreFit.truncated) {
    const grown = (measureTextUnits(core.label, weight) * LABEL_FLOOR + 1) / CORE_TEXT_SPAN
    if ((maxR - grown) / Math.max(1, n - 1) >= MIN_BAND) {
      coreR = grown
      coreFit = fitCore(grown)
    }
  }
  const coreLabel = coreFit.truncated ? null : coreFit
  const ringStep = n > 1 ? (maxR - coreR) / (n - 1) : 0
  const radii = component.items.map((_, i) => coreR + i * ringStep)

  const rows = component.items.map((item) => {
    const label = fitSvgLine(item.label, {
      maxWidth: textW,
      fontSize: LABEL_SIZE,
      minFontSize: LABEL_FLOOR,
      ...weight,
    })
    const desc: Desc | null = item.desc
      ? layoutSvgText(item.desc, {
          maxWidth: textW,
          fontSize: DESC_SIZE,
          maxLines: DESC_MAX_LINES,
          lineHeightRatio: DESC_LINE_RATIO,
        })
      : null
    // Baseline of the row's label to baseline of its last description line.
    const below = desc && desc.lines.length > 0 ? DESC_GAP + desc.lines.length * desc.lineHeight : 0
    return { label, desc, below }
  })

  // 标注行从上往下 = 外层环到内核：第 k 行是 items[n-1-k]。
  const inOrder = [...rows].reverse()
  const last = inOrder[n - 1]!
  // From the last label's baseline to the bottom edge: the old fixed margin,
  // or the core row's own description when that runs longer.
  const tail = Math.max(ROW_EDGE, last.below > 0 ? last.below + DESC_SIZE * GLYPH_DEPTH : 0)
  // What each row above the last needs from its label's baseline to the next
  // label's: its description, that line's glyph box, the air, and the next
  // label's own height.
  const pitches = inOrder
    .slice(0, -1)
    .map((r) => r.below + (r.below > 0 ? DESC_SIZE : LABEL_SIZE) * GLYPH_DEPTH + ROW_CLEAR + LABEL_SIZE)
  const pitchSum = pitches.reduce((s, p) => s + p, 0)
  const meanPitch = n > 1 ? pitchSum / (n - 1) : 0
  const needH = ROW_EDGE + pitchSum + tail
  const baseH = Math.min(naturalH, cap)
  const h = needH <= baseH ? baseH : needH
  // Written as the pre-fix `(h - 2 * PAD - 56) / (n - 1)` when the tail is the
  // fixed margin, so a box whose rows always fitted lays them out identically.
  const rowStep = n > 1 ? (h - 2 * PAD - 56 - (tail - ROW_EDGE)) / (n - 1) : 0
  // Labels sit on that even step, each nudged by how much taller or shorter
  // the rows above it run than the average, so the air between one row's
  // last line and the next label is the same all the way down. Rows of equal
  // height get no nudge at all and land where they always did.
  const rowYs = inOrder.map((_, k) => {
    const above = pitches.slice(0, k).reduce((s, p) => s + p, 0)
    return ROW_EDGE + k * rowStep + (above - k * meanPitch)
  })

  const fits =
    maxR >= MIN_OUTER_R &&
    h <= cap + 0.5 &&
    !anyCut([...rows.map((r) => r.label), ...rows.map((r) => r.desc)])

  return { n, h, needH, maxR, cx, cy: h / 2, radii, textX, textW, rows, rowYs, coreLabel, fits }
}

export const rings: SvgComponent<RingsComponent> = {
  measure(component, w, ctx) {
    return geometry(component, w, ctx.fonts.heading).h
  },
  render(component, box, ctx) {
    const { n, cx, cy, radii, textX, rows, rowYs, coreLabel, fits } = geometry(
      component,
      box.w,
      ctx.fonts.heading,
      box.h,
    )
    if (!fits) return <DroppedContentMarker count={n} kind="item" />
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {/* 外层环先画（从外到内叠放，内核最后盖顶） */}
        {[...component.items.keys()].reverse().map((idx) => {
          const r = radii[idx]
          if (idx === 0) {
            return <circle key={idx} cx={cx} cy={cy} r={r} fill={ctx.colors.primary} />
          }
          return (
            <circle
              key={idx}
              cx={cx}
              cy={cy}
              r={r}
              fill={ctx.colors.primary}
              fillOpacity={idx === 1 ? 0.14 : idx === 2 ? 0.08 : 0.05}
              stroke={ctx.colors.border ?? ctx.colors.muted}
              strokeWidth={1}
            />
          )
        })}
        {/* 内核 label 圆心居中。
            Bench-driven fix round, defect A reclassification (Task 3
            handoff): this component paints no card shell of its own, so a
            bare `fill={ctx.colors.surface}` on the self-painted primary
            circle used to fall through to the ambient page background for
            contrast purposes (never the circle it's actually rendered on)
            — full-matrix scanning (post defect-A fix) found
            rally/ledger/homeroom measure ~1.0-1.2:1 there.
            `accessibleInk` keeps `colors.surface` when it already clears
            the ratio against the circle's own `colors.primary` fill
            (every other theme, byte-identical), falls back to
            `readableOn`'s neutral ink otherwise.
            `bold`/`fontFamily` (bold-metrics fix, round 2, 2026-07-24):
            this label renders `fontWeight="bold"` in `ctx.fonts.heading`,
            so its fit (in `geometry`) is bold-aware. */}
        {coreLabel ? (
          <text
            x={cx}
            y={cy + coreLabel.fontSize * 0.35}
            textAnchor="middle"
            fontSize={coreLabel.fontSize}
            fontWeight="bold"
            fill={accessibleInk(ctx.colors.surface, ctx.colors.primary, coreLabel.fontSize)}
            fontFamily={ctx.fonts.heading}
            dominantBaseline="alphabetic"
          >
            {coreLabel.text}
          </text>
        ) : null}
        {/* 引线 + 右侧标注列：行序 = 外层在上、内核在下 */}
        {component.items.map((_, idx) => {
          const rowIdx = n - 1 - idx
          const rowY = rowYs[rowIdx]!
          const r = radii[idx]
          // 引线起点：环缘上朝各自标注行方向的点（行在圆上方 → 起点取
          // 环右上缘，行在下方 → 右下缘），线最短且互不交叉
          const angle = Math.atan2(rowY - 5 - cy, textX - 18 - cx)
          const sx = cx + r * Math.cos(angle)
          const sy = cy + r * Math.sin(angle)
          const { label, desc } = rows[idx]!
          return (
            <g key={idx}>
              <path
                d={`M ${sx.toFixed(1)} ${sy.toFixed(1)} L ${textX - 18} ${rowY - 5} H ${textX - 8}`}
                fill="none"
                stroke={ctx.colors.muted}
                strokeWidth={1}
                opacity={0.6}
              />
              <circle cx={sx} cy={sy} r={3} fill={idx === 0 ? ctx.colors.primary : ctx.colors.accent} />
              <text
                x={textX}
                y={rowY}
                fontSize={label.fontSize}
                fontWeight="bold"
                fill={ctx.colors.text}
                fontFamily={ctx.fonts.heading}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
              {desc
                ? desc.lines.map((line, li) => (
                    <text
                      key={li}
                      x={textX}
                      y={rowY + DESC_GAP + (li + 1) * desc.lineHeight}
                      fontSize={desc.fontSize}
                      fill={ctx.colors.muted}
                      fontFamily={ctx.fonts.body}
                      dominantBaseline="alphabetic"
                    >
                      {line}
                    </text>
                  ))
                : null}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<RingsComponent> = { type: "rings", measure: rings.measure, render: rings.render }
