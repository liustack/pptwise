import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  fitPortrait,
  paintPortrait,
  paintPortraitLine,
  paintPortraitRule,
  paintPortraitTracked,
  placePortraitHead,
  placePortraitSource,
  portraitBaseline,
  portraitChinese,
  portraitInks,
  portraitMark,
  portraitText,
  portraitTrackedWidth,
  portraitWidth,
  wholePage,
} from "./portrait"
import type { Recipe } from "./recipe"

type Harvey = Extract<Component, { type: "harvey_balls" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/*
 * appraisal: a self-assessment against what a role asks, drawn as a radar
 * beside a table of dots, profile's 2026-10 board (p08). The `harvey_balls`
 * scores are read as levels, a quarter a level: 25 is one, 100 is four.
 *
 * At the left, a radar of the criteria on a 190px radius centred on
 * (360, 426), an axis a criterion clockwise from the top, pale rings at the
 * levels no option holds on every axis (a ring that would lie under an
 * option drawn as a constant line is left out), the criteria named at 16px
 * past the ends of the axes. The first option (what the role asks) a line of
 * the ink, the option the page argues for (the highlighted one, the
 * speaker now) filled with the accent at 18% inside a line of the accent,
 * and any other (a target) a dashed line of the accent. A key under it at
 * 13px from x120 on y646, and the footer's words pack to the right
 * (`data-footer-pack`).
 *
 * At the right, from x720 to x1200, an open table under a 2px rule of the
 * ink: a row a criterion, its name bold in the heading serif at 18px, the
 * highlighted option's level as four dots (filled in the ink to its level,
 * hollow in the pale grey after), and the verdict against the first option
 * in levels (「高一档」, 「达标」, 「差一档」, "1 above", "Meets", "2 short"),
 * the furthest short bold in the accent. A paragraph, when the page has
 * one, under the table at 15/25.5.
 *
 * Takes, in the portrait setting: a `harvey_balls` of three to five
 * criteria and two or three options, one highlighted and not the first, and
 * optionally one `paragraph`.
 *
 * Declines: a total, a criterion name too wide for its column or its side
 * of the radar, a paragraph past four lines.
 *
 * Reads: the portrait inks (`./portrait.tsx`), the heading and body faces.
 */

const HEAD = { x: 80, top: 64, w: 1120 } as const
const RADAR = { cx: 360, cy: 426, r: 190, levels: 4, label: { size: 16, reach: 18, rise: 2, drop: 13.5 }, fill: 0.18, strokes: { base: 1.5, lit: 2.2, other: 1.8 }, dash: "6 5" } as const
const KEY = { x: 120, top: 646, size: 13, lineHeight: 19, swatch: 24, swatchH: 12, gap: 8, between: 28 } as const
const TABLE = { x: 720, w: 480, top: 210, gap: 16, dots: 130, verdict: 90, header: { size: 13, lineHeight: 19, tracking: 1.56, pad: 10, rule: 2 }, row: 62, name: 18, dot: 14, dotGap: 10, verdictSize: 15, para: { gap: 22, size: 15, lineHeight: 25.5, maxLines: 4 } } as const
const BOTTOM = 650

/** The verdict of `level` against `base`, in levels, in the deck's language. */
export function appraisalVerdict(level: number, base: number, chinese: boolean): string {
  const d = level - base
  const zh = ["", "一", "两", "三", "四"]
  if (d === 0) return chinese ? "达标" : "Meets"
  if (chinese) return d > 0 ? `高${zh[d]}档` : `差${zh[-d]}档`
  return d > 0 ? `${d} above` : `${-d} short`
}

/** The point at `level` (0 to 4) on the axis `i` of `n`, clockwise from the top. */
function at(i: number, n: number, level: number): [number, number] {
  const a = -Math.PI / 2 + (2 * Math.PI * i) / n
  const r = (RADAR.r * level) / RADAR.levels
  return [Math.round((RADAR.cx + r * Math.cos(a)) * 10) / 10, Math.round((RADAR.cy + r * Math.sin(a)) * 10) / 10]
}

function polygon(levels: readonly number[]): string {
  return levels.map((l, i) => at(i, levels.length, l).join(",")).join(" ")
}

/** What an author writes to get this drawing (`./recipe.ts`). */
export const appraisalRecipe: Recipe = {
  look: "A self-assessment against what a role asks, drawn as a radar beside a table of dots",
  kinds: ["data"],
  shapes: [{ parts: [{ type: "harvey_balls", count: [3, 5], needs: ["options[].highlight"] }, { type: "paragraph", optional: true }] }],
}

export const appraisalComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "portrait" || !wholePage(rect) || components.length < 1 || components.length > 2) return null
  const grid = components.find((c): c is Harvey => c.type === "harvey_balls")
  const para = components.find((c): c is Paragraph => c.type === "paragraph")
  if (!grid || (components.length === 2 && !para)) return null
  const options = grid.options
  const lit = options.findIndex((o) => o.highlight)
  if (options.length < 2 || options.length > 3 || lit < 1 || options.some((o) => o.total !== undefined)) return null
  const n = grid.criteria.length
  if (n < 3 || n > 5) return null
  const levels = options.map((o) => o.scores.map((s) => s / 25))
  const base = levels[0]!
  const now = levels[lit]!
  const chinese = portraitChinese(ctx, [...grid.criteria, ...options.map((o) => o.label)])
  const verdicts = now.map((l, i) => appraisalVerdict(l, base[i]!, chinese))
  const gaps = now.map((l, i) => base[i]! - l)
  const worst = Math.max(...gaps)
  // The criteria named past the ends of the axes, inside the radar's side of the page.
  const names = grid.criteria.map((c, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n
    const ux = Math.cos(a)
    const uy = Math.sin(a)
    const [x, y] = at(i, n, RADAR.levels)
    const px = x + ux * RADAR.label.reach
    const py = y + uy * RADAR.label.reach + (uy < -0.5 ? -RADAR.label.rise : uy > 0.5 ? RADAR.label.drop : 0)
    const anchor: "start" | "middle" | "end" = Math.abs(ux) < 0.2 ? "middle" : ux > 0 ? "start" : "end"
    const w = portraitWidth(c, RADAR.label.size, ctx)
    const left = anchor === "start" ? px : anchor === "end" ? px - w : px - w / 2
    return { text: stripEmphasis(c).trim(), x: px, y: py, anchor, left, right: left + w }
  })
  if (names.some((l) => l.left < 40 || l.right > TABLE.x - 24)) return null
  // A ring at every level no option holds on every axis.
  const rings = [1, 2, 3, 4].filter((lv) => lv === RADAR.levels || !levels.some((ls) => ls.every((l) => l === lv)))
  const nameW = TABLE.w - TABLE.dots - TABLE.verdict - TABLE.gap * 2
  const dotsX = TABLE.x + nameW + TABLE.gap
  const verdictX = dotsX + TABLE.dots + TABLE.gap
  if (grid.criteria.some((c) => portraitWidth(c, TABLE.name, ctx, { serif: true, bold: true }) > nameW)) return null
  if (verdicts.some((v) => portraitWidth(v, TABLE.verdictSize, ctx, { bold: true }) > TABLE.verdict)) return null
  const headers = [chinese ? "能力" : "Skill", stripEmphasis(options[lit]!.label).trim(), `${chinese ? "对" : "vs "}${stripEmphasis(options[0]!.label).trim()}`]
  const headerXs = [TABLE.x, dotsX, verdictX]
  const headerWs = [nameW, TABLE.dots, TABLE.verdict + 40]
  if (headers.some((h, i) => portraitTrackedWidth(h, TABLE.header.size, TABLE.header.tracking, ctx) > headerWs[i]!)) return null
  const text = para ? fitPortrait(para.text, { width: TABLE.w, size: TABLE.para.size, lineHeight: TABLE.para.lineHeight, maxLines: TABLE.para.maxLines }, ctx) : undefined
  if (text === null) return null
  const keyItems = options.map((o, i) => ({ label: stripEmphasis(o.label).trim(), kind: i === 0 ? "base" : i === lit ? "lit" : "other" }))
  const keyW = keyItems.reduce((w, k) => w + KEY.swatch + KEY.gap + portraitWidth(k.label, KEY.size, ctx), 0) + KEY.between * (keyItems.length - 1)
  if (KEY.x + keyW > TABLE.x) return null
  const head = placePortraitHead(kicker, claim, HEAD)
  if (!head || head.bottom > 170) return null
  const headRule = TABLE.top + TABLE.header.lineHeight + TABLE.header.pad
  const first = headRule + TABLE.header.rule
  const tableEnd = first + n * (TABLE.row + 1)
  if (tableEnd + (text ? TABLE.para.gap + text.lines.length * TABLE.para.lineHeight : 0) > BOTTOM) return null
  const foot = placePortraitSource(source, { x: TABLE.x, w: TABLE.w })
  if (foot === false) return null
  const inks = portraitInks(ctx)
  const ground = inks.ground
  const leadLine = portraitMark(inks.lead, ground)
  const keyMid = KEY.top + KEY.lineHeight / 2
  let keyX = KEY.x
  return (
    <g {...compositionTag("appraisal")} data-footer-pack="end">
      {head.node}
      <g {...blockTag(ctx, grid)} data-portrait-appraisal="">
        <g data-portrait-radar="">
          {rings.map((lv) => (
            <polygon key={`r${lv}`} points={polygon(Array.from({ length: n }, () => lv))} fill="none" stroke={inks.line} strokeWidth={1} />
          ))}
          {grid.criteria.map((_, i) => {
            const [x, y] = at(i, n, RADAR.levels)
            return <line key={`a${i}`} x1={RADAR.cx} y1={RADAR.cy} x2={x} y2={y} stroke={inks.line} strokeWidth={1} />
          })}
          <polygon data-portrait-option={keyItems[0]!.label} points={polygon(base)} fill="none" stroke={portraitMark(inks.ink, ground)} strokeWidth={RADAR.strokes.base} />
          {options.map((o, i) =>
            i === 0 || i === lit ? null : <polygon key={`o${i}`} data-portrait-option={keyItems[i]!.label} points={polygon(levels[i]!)} fill="none" stroke={leadLine} strokeWidth={RADAR.strokes.other} strokeDasharray={RADAR.dash} />,
          )}
          <polygon data-portrait-option={keyItems[lit]!.label} data-lit="" points={polygon(now)} fill={inks.lead} fillOpacity={RADAR.fill} stroke={leadLine} strokeWidth={RADAR.strokes.lit} />
          {names.map((l, i) => (
            <g key={`n${i}`}>{paintPortraitLine(l.text, { ctx, x: l.x, anchor: l.anchor, baseline: l.y, size: RADAR.label.size, fill: portraitText(inks.ink, ground, RADAR.label.size) })}</g>
          ))}
        </g>
        <g data-portrait-key="">
          {keyItems.map((k, i) => {
            const x = keyX
            keyX += KEY.swatch + KEY.gap + portraitWidth(k.label, KEY.size, ctx) + KEY.between
            return (
              <g key={i}>
                {k.kind === "base" ? <rect x={x} y={keyMid - 0.75} width={KEY.swatch} height={1.5} fill={portraitMark(inks.ink, ground)} /> : null}
                {k.kind === "lit" ? (
                  <>
                    <rect x={x} y={keyMid - KEY.swatchH / 2} width={KEY.swatch} height={KEY.swatchH} fill={inks.lead} fillOpacity={0.35} />
                    <rect x={x} y={keyMid - KEY.swatchH / 2} width={KEY.swatch} height={2} fill={leadLine} />
                  </>
                ) : null}
                {k.kind === "other" ? <line x1={x} y1={keyMid} x2={x + KEY.swatch} y2={keyMid} stroke={leadLine} strokeWidth={2} strokeDasharray="4 3" /> : null}
                {paintPortraitLine(k.label, { ctx, x: x + KEY.swatch + KEY.gap, top: KEY.top, lineHeight: KEY.lineHeight, size: KEY.size, fill: portraitText(inks.body, ground, KEY.size) })}
              </g>
            )
          })}
        </g>
        <g data-portrait-levels="">
          {headers.map((h, i) => (
            <g key={`h${i}`}>{paintPortraitTracked({ ctx, text: h, x: headerXs[i]!, y: portraitBaseline(TABLE.top, TABLE.header.lineHeight, TABLE.header.size), size: TABLE.header.size, tracking: TABLE.header.tracking, fill: portraitText(inks.muted, ground, TABLE.header.size) })}</g>
          ))}
          {paintPortraitRule(TABLE.x, TABLE.x + TABLE.w, headRule + TABLE.header.rule / 2, inks.ink, TABLE.header.rule)}
          {grid.criteria.map((c, i) => {
            const y = first + i * (TABLE.row + 1)
            const mid = y + TABLE.row / 2
            const short = worst > 0 && gaps[i] === worst
            return (
              <g key={i} data-portrait-level={stripEmphasis(c)} data-lit={short ? "" : undefined}>
                {paintPortraitLine(c, { ctx, x: TABLE.x, baseline: portraitBaseline(mid - 13, 26, TABLE.name, true), size: TABLE.name, serif: true, bold: true, fill: portraitText(inks.ink, ground, TABLE.name) })}
                {Array.from({ length: RADAR.levels }, (_, d) => {
                  const cx = dotsX + d * (TABLE.dot + TABLE.dotGap) + TABLE.dot / 2
                  return d < now[i]! ? (
                    <circle key={d} cx={cx} cy={mid} r={TABLE.dot / 2} fill={portraitMark(inks.ink, ground)} />
                  ) : (
                    <circle key={d} cx={cx} cy={mid} r={TABLE.dot / 2 - 0.5} fill="none" stroke={inks.bar} strokeWidth={1} />
                  )
                })}
                {paintPortraitLine(verdicts[i]!, { ctx, x: verdictX, baseline: portraitBaseline(mid - 11, 22, TABLE.verdictSize), size: TABLE.verdictSize, bold: short, fill: portraitText(short ? inks.lead : inks.ink, ground, TABLE.verdictSize) })}
                {paintPortraitRule(TABLE.x, TABLE.x + TABLE.w, y + TABLE.row + 0.5, inks.line, 1)}
              </g>
            )
          })}
        </g>
      </g>
      {para && text ? <g {...blockTag(ctx, para)} data-portrait-reading="">{paintPortrait(text, { ctx, x: TABLE.x, top: tableEnd + TABLE.para.gap, fill: portraitText(inks.body, ground, TABLE.para.size) })}</g> : null}
      {foot}
    </g>
  )
}
