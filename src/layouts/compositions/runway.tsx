import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, pitchInks, pitchText, pitchWidth } from "./pitch"

type Roadmap = Extract<Component, { type: "roadmap" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * runway: what a round's money buys, phase by phase, with the gate that can
 * stop it, ember's 2026-10 board (the milestones page, p14). Across the top
 * the whole run to scale, ticked and named every few units (「第 3 个月」,
 * "3 months"), each phase a stretch of the bar as long as it lasts, the
 * phase the page is about in the ivory and the rest in the palette's
 * quietest ink; where a phase ends on a check (`checkpoint`) a diamond of the
 * fire stands on the bar with the check named under it. Under the bar a card
 * a phase: a band of the hairline across its top (the ivory on the phase the
 * page is about), its icon and its period small and grey, its title bold and
 * what it covers as short lines. Under the cards, when the page has one, the
 * gate's rule in an outline of the fire with its icon.
 *
 * Takes, in the pitch setting: a `roadmap` of two to four phases that all
 * carry a duration, with no rows, at most one checkpoint; then optionally a
 * `callout` with no title or tag.
 *
 * Declines: a tick's name wider than its share of the bar, a period or a
 * title past one line, a point past two lines or more points than the card
 * holds, the check's name wider than the bar's room under it, and the rule
 * past one line.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const AXIS = { label: { top: 10, size: 12, lineHeight: 0 }, tick: { top: 18, h: 14 }, track: { top: 32, h: 6 }, gem: { top: 22, half: 13 }, check: { top: 56, h: 24, size: 13 } } as const
const CARD = { top: 100, h: 250, gap: 20, pad: 20, edge: 3, icon: { top: 20, size: 22 }, period: { x: 52, top: 18, size: 13, lineHeight: 24 }, title: { top: 54, size: 20, lineHeight: 32 }, points: { top: 100, pitch: 44, size: 14, lineHeight: 20, maxLines: 2, dot: 10 } } as const
const GATE = { top: 370, h: 60, padX: 64, icon: { x: 22, size: 22 }, size: 18, lineHeight: 28 } as const

/** A tick's name: 「起点」 and 「第 3 个月」 in a Chinese deck, "Start" and "3 months" in any other. */
function tickName(at: number, unit: string, chinese: boolean): string {
  if (at === 0) return chinese ? "起点" : "Start"
  return chinese ? `第 ${at} ${unit}` : `${at} ${unit}`
}

/** The tick step: the smallest of the usual steps that cuts the run into at most six whole parts. */
function tickStep(total: number): number {
  const steps = [1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 25, 30, 50, 60, 100]
  return steps.find((s) => total % s === 0 && total / s <= 6) ?? steps.find((s) => total / s <= 6) ?? total
}

function gateRule(component: Component | undefined): component is Callout {
  return component?.type === "callout" && component.title === undefined && component.tag === undefined
}

export const runwayComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [road, rule, ...rest] = components
  if (road?.type !== "roadmap" || rest.length > 0) return null
  if (rule !== undefined && !gateRule(rule)) return null
  const r = road as Roadmap
  const n = r.items.length
  if (n < 2 || n > 4 || r.items.some((item) => item.duration === undefined || (item.rows?.length ?? 0) > 0)) return null
  if (r.items.filter((item) => item.checkpoint?.trim()).length > 1 || !r.duration_unit) return null
  if (rect.h < (rule ? GATE.top + GATE.h : CARD.top + CARD.h)) return null
  const inks = pitchInks(ctx)
  const chinese = ctx.figures?.chinese ?? false
  const unit = r.duration_unit.trim()
  const total = r.items.reduce((sum, item) => sum + item.duration!, 0)
  const step = tickStep(total)
  const mx = (m: number) => rect.x + (m / total) * rect.w
  const ticks: { at: number; name: string }[] = []
  for (let m = 0; m <= total; m += step) ticks.push({ at: m, name: tickName(m, unit, chinese) })
  const tickRoom = (step / total) * rect.w - 8
  if (ticks.some((t) => pitchWidth(t.name, AXIS.label.size, ctx) > tickRoom)) return null

  const cardW = (rect.w - (n - 1) * CARD.gap) / n
  const inner = cardW - CARD.pad * 2
  let cum = 0
  const phases = r.items.map((item, i) => {
    const from = cum
    cum += item.duration!
    const points = item.points ?? []
    return {
      item,
      i,
      from,
      to: cum,
      period: item.period?.trim() ? fitPitch(item.period, { width: inner - (item.icon ? CARD.period.x - CARD.pad : 0), size: CARD.period.size, lineHeight: CARD.period.lineHeight, maxLines: 1, bold: true }, ctx) : null,
      title: fitPitch(item.title, { width: inner, size: CARD.title.size, lineHeight: CARD.title.lineHeight, maxLines: 1, bold: true }, ctx),
      points: points.map((point) => fitPitch(point, { width: inner - CARD.points.dot, size: CARD.points.size, lineHeight: CARD.points.lineHeight, maxLines: CARD.points.maxLines }, ctx)),
    }
  })
  if (phases.some((p) => !p.title || (p.item.period?.trim() && !p.period) || p.points.some((pt) => !pt) || CARD.points.top + p.points.length * CARD.points.pitch > CARD.h + 4)) return null
  const gated = phases.find((p) => p.item.checkpoint?.trim())
  const checkName = gated?.item.checkpoint?.trim() ?? ""
  if (gated && pitchWidth(checkName, AXIS.check.size, ctx, true) > 240) return null
  const ruleText = rule && gateRule(rule) ? fitPitch(rule.text, { width: rect.w - GATE.padX - 24, size: GATE.size, lineHeight: GATE.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (rule && !ruleText) return null

  const gemX = gated ? mx(gated.to) : 0
  const y = rect.y
  return (
    <g {...compositionTag("runway")}>
      <g {...blockTag(ctx, r)}>
        <g data-pitch-axis="">
          {ticks.map((t, k) => (
            <g key={k}>
              <line x1={mx(t.at)} y1={y + AXIS.tick.top} x2={mx(t.at)} y2={y + AXIS.tick.top + AXIS.tick.h} stroke={inks.muted} strokeWidth={1} />
              {paintPitchLine(t.name, { ctx, x: mx(t.at), baseline: y + AXIS.label.top, size: AXIS.label.size, anchor: k === 0 ? "start" : k === ticks.length - 1 ? "end" : "middle", fill: pitchText(inks.muted, inks.ground, AXIS.label.size) })}
            </g>
          ))}
          <rect x={rect.x} y={y + AXIS.track.top} width={rect.w} height={AXIS.track.h} rx={AXIS.track.h / 2} fill={inks.dim} />
          {phases.map((p) => (
            <rect key={p.i} x={mx(p.from) + 2} y={y + AXIS.track.top} width={mx(p.to) - mx(p.from) - 4} height={AXIS.track.h} rx={AXIS.track.h / 2} fill={p.item.emphasis ? inks.ink : inks.quiet} />
          ))}
        </g>
        {phases.map((p) => {
          const x = rect.x + p.i * (cardW + CARD.gap)
          const top = y + CARD.top
          return (
            <g key={p.i} data-pitch-phase={p.item.emphasis ? "lit" : ""}>
              {paintPitchCard({ x, y: top, w: cardW, h: CARD.h }, inks)}
              <rect x={x} y={top} width={cardW} height={CARD.edge} fill={p.item.emphasis ? inks.ink : inks.line} />
              {p.item.icon ? paintPitchIcon(p.item.icon, x + CARD.pad, top + CARD.icon.top, CARD.icon.size, inks.muted, inks.card) : null}
              {p.period ? paintPitch(p.period, { ctx, x: x + (p.item.icon ? CARD.period.x : CARD.pad), top: top + CARD.period.top, bold: true, fill: pitchText(inks.muted, inks.card, CARD.period.size), ground: inks.card }) : null}
              {paintPitch(p.title!, { ctx, x: x + CARD.pad, top: top + CARD.title.top, bold: true, fill: pitchText(inks.ink, inks.card, CARD.title.size), ground: inks.card })}
              {p.points.map((pt, j) => (
                <g key={j} data-pitch-point="">
                  {paintPitchLine("·", { ctx, x: x + CARD.pad, top: top + CARD.points.top + j * CARD.points.pitch, lineHeight: CARD.points.lineHeight, size: CARD.points.size, fill: pitchText(inks.ink, inks.card, CARD.points.size) })}
                  {paintPitch(pt!, { ctx, x: x + CARD.pad + CARD.points.dot, top: top + CARD.points.top + j * CARD.points.pitch, fill: pitchText(inks.ink, inks.card, CARD.points.size), ground: inks.card })}
                </g>
              ))}
            </g>
          )
        })}
        {gated ? (
          <Fire id="gate">
            <polygon points={`${gemX},${y + AXIS.gem.top} ${gemX + AXIS.gem.half},${y + AXIS.gem.top + AXIS.gem.half} ${gemX},${y + AXIS.gem.top + AXIS.gem.half * 2} ${gemX - AXIS.gem.half},${y + AXIS.gem.top + AXIS.gem.half}`} fill={inks.fire} />
            {paintPitchLine(checkName, { ctx, x: gemX, top: y + AXIS.check.top, lineHeight: AXIS.check.h, size: AXIS.check.size, bold: true, anchor: "middle", fill: pitchText(inks.fire, inks.ground, AXIS.check.size) })}
            {rule && ruleText ? (
              <g {...blockTag(ctx, rule)} data-pitch-gate-rule="">
                <rect x={rect.x + 0.75} y={y + GATE.top + 0.75} width={rect.w - 1.5} height={GATE.h - 1.5} rx={4} fill="none" stroke={inks.fire} strokeWidth={1.5} />
                {rule.icon ? paintPitchIcon(rule.icon, rect.x + GATE.icon.x, y + GATE.top + (GATE.h - GATE.icon.size) / 2, GATE.icon.size, inks.fire, inks.ground) : null}
                {paintPitch(ruleText, { ctx, x: rect.x + GATE.padX, top: y + GATE.top + (GATE.h - GATE.lineHeight) / 2, bold: true, fill: pitchText(inks.ink, inks.ground, GATE.size), ground: inks.ground })}
              </g>
            ) : null}
          </Fire>
        ) : null}
      </g>
      {!gated && rule && ruleText ? (
        <g {...blockTag(ctx, rule)} data-pitch-gate-rule="">
          <rect x={rect.x + 0.75} y={y + GATE.top + 0.75} width={rect.w - 1.5} height={GATE.h - 1.5} rx={4} fill="none" stroke={inks.line} strokeWidth={1.5} />
          {rule.icon ? paintPitchIcon(rule.icon, rect.x + GATE.icon.x, y + GATE.top + (GATE.h - GATE.icon.size) / 2, GATE.icon.size, inks.muted, inks.ground) : null}
          {paintPitch(ruleText, { ctx, x: rect.x + GATE.padX, top: y + GATE.top + (GATE.h - GATE.lineHeight) / 2, bold: true, fill: pitchText(inks.ink, inks.ground, GATE.size), ground: inks.ground })}
        </g>
      ) : null}
    </g>
  )
}
