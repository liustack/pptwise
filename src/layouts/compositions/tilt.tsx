import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import {
  CLAIM_AT,
  KICKER_AT,
  SOURCE_AT,
  keynoteCeiling,
  keynoteInks,
  keynoteMark,
  keynoteText,
  keynoteWidth,
  keynoteWithUnit,
  paintKeynoteLine,
  paintKeynoteRule,
  placeKeynoteClaim,
  placeKeynoteKicker,
  placeKeynoteSource,
  wholePage,
} from "./keynote"

type FromTo = Extract<Component, { type: "from_to" }>

/*
 * tilt: a slope chart, stage's 2026-10 board (p07). Two upright axes, the
 * earlier time at the left and the later at the right, each named over its
 * axis, and one line a row from its earlier value to its later. A row that
 * moved (by a twentieth of where it started or more) is drawn thick in the
 * paper white, a row that held thin in the sand, and the row the author
 * marks thick in silver. Each row is named with its earlier value at the
 * left end, its later value at the right, labels that would touch moved
 * apart. The source under it.
 *
 * Takes, in the keynote setting: a `from_to` of three to six rows with a
 * `from` and a `to` title, every row's from and to a number, at most one row
 * marked.
 *
 * Declines: a row with an icon, a note, a change or a tag, a measures
 * column title, a span, a kicker over either time, a value that is not a
 * number, a label too wide for its side.
 *
 * Reads: the keynote inks (`./keynote.tsx`), the heading and body faces.
 */

const AXIS = { left: 420, right: 860, top: 180, bottom: 600, base: 590, span: 400 } as const
const HEAD = { baseline: 168, size: 14 } as const
const LABEL = { gap: 20, size: 18, lit: 22, rise: 6, apart: 28 } as const
const MOVED = 0.05

/** `ys` moved apart so no two are closer than `gap`, each kept as near its own place as the others allow. */
export function spread(ys: readonly number[], gap: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y)
  // Clusters of labels that touch move together, centred on where they want to be.
  const groups: { ids: number[]; want: number[] }[] = []
  for (const { y, i } of order) {
    groups.push({ ids: [i], want: [y] })
    for (;;) {
      const last = groups[groups.length - 1]!
      const prev = groups[groups.length - 2]
      if (!prev) break
      const top = (g: { ids: number[]; want: number[] }) => g.want.reduce((a, b) => a + b, 0) / g.want.length - ((g.ids.length - 1) * gap) / 2
      if (top(prev) + prev.ids.length * gap <= top(last)) break
      groups.splice(groups.length - 2, 2, { ids: [...prev.ids, ...last.ids], want: [...prev.want, ...last.want] })
    }
  }
  const out: number[] = new Array(ys.length)
  for (const g of groups) {
    const start = g.want.reduce((a, b) => a + b, 0) / g.want.length - ((g.ids.length - 1) * gap) / 2
    g.ids.forEach((id, k) => (out[id] = start + k * gap))
  }
  return out
}

export const tiltComposition: Composition = ({ components, ctx, setting, rect, claim, source, kicker }) => {
  if (setting !== "keynote" || !wholePage(rect)) return null
  const [ft, ...rest] = components
  if (ft?.type !== "from_to" || rest.length > 0) return null
  const f = ft as FromTo
  if (f.rows.length < 2 || f.rows.length > 6 || f.label_column || f.span) return null
  const fromTitle = stripEmphasis(f.from.title ?? "").trim()
  const toTitle = stripEmphasis(f.to.title ?? "").trim()
  if (!fromTitle || !toTitle || f.from.kicker || f.to.kicker) return null
  if (f.rows.some((r) => r.icon || r.note || r.tag || r.change)) return null
  const rows = f.rows.map((r) => ({ label: stripEmphasis(r.label).trim(), from: stripEmphasis(r.from).trim(), to: stripEmphasis(r.to).trim(), unit: r.unit, a: Number(stripEmphasis(r.from).replace(/,/g, "")), b: Number(stripEmphasis(r.to).replace(/,/g, "")), marked: r.emphasis === true }))
  if (rows.some((r) => !r.label || !Number.isFinite(r.a) || !Number.isFinite(r.b) || r.a < 0 || r.b < 0)) return null
  if (rows.filter((r) => r.marked).length > 1) return null
  const head = placeKeynoteClaim(claim, CLAIM_AT)
  if (head === false) return null
  const chapter = placeKeynoteKicker(kicker, KICKER_AT)
  if (chapter === false) return null
  const foot = placeKeynoteSource(source, { ...SOURCE_AT, top: 636 })
  if (foot === false) return null
  const inks = keynoteInks(ctx)
  const ground = inks.ground
  const max = keynoteCeiling(Math.max(...rows.flatMap((r) => [r.a, r.b])), 0.1, 5)
  const y = (v: number) => AXIS.base - (v / max) * AXIS.span
  const kinds = rows.map((r) => (r.marked ? "lit" : Math.abs(r.b - r.a) >= MOVED * Math.max(r.a, 1e-9) ? "moved" : "held"))
  const leftText = rows.map((r) => `${r.label}\u3000${keynoteWithUnit(r.from, r.unit)}`)
  const rightText = rows.map((r) => keynoteWithUnit(r.to, r.unit))
  const sizeOf = (k: string) => (k === "lit" ? LABEL.lit : LABEL.size)
  if (leftText.some((t, i) => keynoteWidth(t, LABEL.size, ctx, { bold: kinds[i] !== "held" }) > AXIS.left - LABEL.gap - 64)) return null
  if (rightText.some((t, i) => keynoteWidth(t, sizeOf(kinds[i]!), ctx, { bold: kinds[i] !== "held" }) > 1216 - AXIS.right - LABEL.gap)) return null
  const leftY = spread(rows.map((r) => y(r.a) + LABEL.rise), LABEL.apart)
  const rightY = spread(rows.map((r) => y(r.b) + LABEL.rise), LABEL.apart)
  if ([...leftY, ...rightY].some((v) => v < AXIS.top + 10 || v > AXIS.bottom + 20)) return null
  const ink = (k: string) => (k === "lit" ? inks.silver : k === "moved" ? inks.ink : inks.muted)
  // The thin rows first, so the thick ones are drawn over them.
  const order = rows.map((_, i) => i).sort((a, b) => (kinds[a] === "held" ? 0 : 1) - (kinds[b] === "held" ? 0 : 1))
  return (
    <g {...compositionTag("tilt")}>
      {chapter}
      {head}
      <g {...blockTag(ctx, ft)} data-keynote-tilt="">
        {paintKeynoteRule(AXIS.left, AXIS.left + 1, (AXIS.top + AXIS.bottom) / 2, inks.track, AXIS.bottom - AXIS.top)}
        {paintKeynoteRule(AXIS.right, AXIS.right + 1, (AXIS.top + AXIS.bottom) / 2, inks.track, AXIS.bottom - AXIS.top)}
        {paintKeynoteLine(fromTitle, { ctx, x: AXIS.left, anchor: "middle", baseline: HEAD.baseline, size: HEAD.size, fill: keynoteText(inks.muted, ground, HEAD.size) })}
        {paintKeynoteLine(toTitle, { ctx, x: AXIS.right, anchor: "middle", baseline: HEAD.baseline, size: HEAD.size, fill: keynoteText(inks.muted, ground, HEAD.size) })}
        {order.map((i) => {
          const k = kinds[i]!
          const r = rows[i]!
          const color = keynoteMark(ink(k), ground)
          return (
            <g key={i} data-keynote-row={r.label} data-keynote-kind={k}>
              <line x1={AXIS.left} y1={y(r.a)} x2={AXIS.right} y2={y(r.b)} stroke={color} strokeWidth={k === "held" ? 2 : 4} />
              <circle cx={AXIS.left} cy={y(r.a)} r={6} fill={color} />
              <circle cx={AXIS.right} cy={y(r.b)} r={7} fill={color} />
              {paintKeynoteLine(leftText[i]!, { ctx, x: AXIS.left - LABEL.gap, anchor: "end", baseline: leftY[i]!, size: LABEL.size, bold: k !== "held", fill: keynoteText(ink(k), ground, LABEL.size) })}
              {paintKeynoteLine(rightText[i]!, { ctx, x: AXIS.right + LABEL.gap, baseline: rightY[i]!, size: sizeOf(k), bold: k !== "held", fill: keynoteText(ink(k), ground, sizeOf(k)) })}
            </g>
          )
        })}
      </g>
      {foot}
    </g>
  )
}
