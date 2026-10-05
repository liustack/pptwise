import type { Component } from "@/ir"
import { kpiFigure } from "../../components/kpi"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Fire, fitPitch, paintPitch, paintPitchCard, paintPitchIcon, paintPitchLine, paintPitchTracked, pitchBaseline, pitchInks, pitchText, pitchTrackedWidth, pitchWidth } from "./pitch"

type KpiCards = Extract<Component, { type: "kpi_cards" }>
type KpiItem = KpiCards["items"][number]
type Verdict = Extract<Component, { type: "verdict_banner" }>

/*
 * divide: two sets of figures that cannot be set against each other, ember's
 * 2026-10 board (the unit cost page, p11). The figures fall into two groups
 * by what each one is (the tag they share, 「骑手侧 · 有绝对额」), each group
 * named small and grey over its cards, a dashed line down between the two
 * groups. A card is a figure large with its unit small and grey after it and
 * what it measures under it. Under the cards the conclusion as a bar of the
 * fire, its icon and its words in the dark ink.
 *
 * Takes, in the pitch setting: a `kpi_cards` of two to six items in two runs
 * of one to three, every item in a run carrying the same tag (no basis or
 * evidence on it) and no delta, tone, icon, note or source, no figure
 * marked; then optionally a `verdict_banner` of neutral tone.
 *
 * Every figure is set at the board's 46px, or at 40 or 36px all together
 * when one of them is wider than its card at 46.
 *
 * Declines: a group's name wider than its group, a figure wider than its
 * card even at 36px, what it measures past three lines, and a conclusion
 * past one line.
 *
 * Reads: the pitch inks (`./pitch.tsx`), the body and heading faces.
 */

const GROUP = { gap: 72, head: { size: 14, lineHeight: 22, tracking: 2 }, card: { top: 36, h: 270, gap: 12, pad: 22 }, figure: { top: 28, sizes: [46, 40, 36] as const, lineHeight: 66, unit: 16, unitGap: 6 }, label: { top: 114, size: 14, lineHeight: 22, maxLines: 3 } } as const
const DIVIDER = { top: 36, h: 270, dash: "6 5" } as const
const BAR = { top: 344, h: 76, padX: 70, icon: { x: 26, size: 28 }, size: 22, lineHeight: 32 } as const

function plainFigure(item: KpiItem): boolean {
  return item.delta === undefined && item.tone === undefined && item.icon === undefined && item.note === undefined && item.source === undefined && item.tag !== undefined && item.tag.basis === undefined && item.tag.evidence === undefined
}

/** The items cut into runs that share a tag's words, in order. */
function runs(items: readonly KpiItem[]): KpiItem[][] {
  const out: KpiItem[][] = []
  for (const item of items) {
    const last = out[out.length - 1]
    if (last && last[0]!.tag!.text.trim() === item.tag!.text.trim()) last.push(item)
    else out.push([item])
  }
  return out
}

export const divideComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "pitch") return null
  const [figures, verdict, ...rest] = components
  if (figures?.type !== "kpi_cards" || rest.length > 0) return null
  if (verdict !== undefined && (verdict.type !== "verdict_banner" || verdict.tone !== "neutral")) return null
  const k = figures as KpiCards
  if (k.items.length < 2 || k.items.length > 6 || !k.items.every(plainFigure)) return null
  const groups = runs(k.items)
  if (groups.length !== 2 || groups.some((g) => g.length > 3)) return null
  if (rect.h < (verdict ? BAR.top + BAR.h : GROUP.card.top + GROUP.card.h)) return null
  const inks = pitchInks(ctx)
  const groupW = (rect.w - GROUP.gap) / 2
  const figureW = (fig: ReturnType<typeof kpiFigure>, size: number) => pitchWidth(fig.text, size, ctx, true) + (fig.unit ? GROUP.figure.unitGap + pitchWidth(fig.unit, GROUP.figure.unit, ctx) : 0)
  const cardWOf = (n: number) => (groupW - (n - 1) * GROUP.card.gap) / n
  const figSize = GROUP.figure.sizes.find((size) => groups.every((items) => items.every((item) => figureW(kpiFigure(item.value, item.unit), size) <= cardWOf(items.length) - GROUP.card.pad)))
  if (figSize === undefined) return null
  const laid = groups.map((items, gi) => {
    const x = rect.x + gi * (groupW + GROUP.gap)
    const name = items[0]!.tag!.text.trim()
    const cardW = (groupW - (items.length - 1) * GROUP.card.gap) / items.length
    const inner = cardW - GROUP.card.pad * 2
    const cards = items.map((item) => {
      const fig = kpiFigure(item.value, item.unit)
      return { item, fig, fits: !fig.marked, label: fitPitch(item.label, { width: inner, size: GROUP.label.size, lineHeight: GROUP.label.lineHeight, maxLines: GROUP.label.maxLines }, ctx) }
    })
    return { x, name, cardW, cards, nameFits: pitchTrackedWidth(name, GROUP.head.size, GROUP.head.tracking, ctx, true) <= groupW }
  })
  if (laid.some((g) => !g.nameFits || g.cards.some((c) => !c.fits || !c.label))) return null
  const v = verdict as Verdict | undefined
  const barText = v ? fitPitch(v.text, { width: rect.w - BAR.padX - 28, size: BAR.size, lineHeight: BAR.lineHeight, maxLines: 1, bold: true }, ctx) : null
  if (v && !barText) return null

  const dividerX = rect.x + groupW + GROUP.gap / 2
  return (
    <g {...compositionTag("divide")}>
      <g {...blockTag(ctx, k)}>
        {laid.map((g, gi) => (
          <g key={gi} data-pitch-group={gi}>
            {paintPitchTracked({ ctx, text: g.name, x: g.x, y: pitchBaseline(rect.y, GROUP.head.lineHeight, GROUP.head.size), size: GROUP.head.size, tracking: GROUP.head.tracking, bold: true, fill: pitchText(inks.muted, inks.ground, GROUP.head.size) })}
            {g.cards.map((c, ci) => {
              const x = g.x + ci * (g.cardW + GROUP.card.gap)
              const top = rect.y + GROUP.card.top
              const baseline = pitchBaseline(top + GROUP.figure.top, GROUP.figure.lineHeight, GROUP.figure.sizes[0])
              return (
                <g key={ci}>
                  {paintPitchCard({ x, y: top, w: g.cardW, h: GROUP.card.h }, inks)}
                  {paintPitchLine(c.fig.text, { ctx, x: x + GROUP.card.pad, baseline, size: figSize, bold: true, fill: pitchText(inks.ink, inks.card, figSize) })}
                  {c.fig.unit ? paintPitchLine(c.fig.unit, { ctx, x: x + GROUP.card.pad + pitchWidth(c.fig.text, figSize, ctx, true) + GROUP.figure.unitGap, baseline, size: GROUP.figure.unit, fill: pitchText(inks.muted, inks.card, GROUP.figure.unit) }) : null}
                  {paintPitch(c.label!, { ctx, x: x + GROUP.card.pad, top: top + GROUP.label.top, fill: pitchText(inks.muted, inks.card, GROUP.label.size), ground: inks.card })}
                </g>
              )
            })}
          </g>
        ))}
        <line x1={dividerX} y1={rect.y + DIVIDER.top} x2={dividerX} y2={rect.y + DIVIDER.top + DIVIDER.h} stroke={inks.line} strokeWidth={1} strokeDasharray={DIVIDER.dash} />
      </g>
      {v && barText ? (
        <g {...blockTag(ctx, v)}>
          <Fire id="verdict">
            {paintPitchCard({ x: rect.x, y: rect.y + BAR.top, w: rect.w, h: BAR.h }, inks, { fill: inks.fire })}
            {v.icon ? paintPitchIcon(v.icon, rect.x + BAR.icon.x, rect.y + BAR.top + (BAR.h - BAR.icon.size) / 2, BAR.icon.size, inks.onFire, inks.fire) : null}
            {paintPitch(barText, { ctx, x: rect.x + BAR.padX, top: rect.y + BAR.top + (BAR.h - BAR.lineHeight) / 2, bold: true, fill: pitchText(inks.onFire, inks.fire, BAR.size), ground: inks.fire })}
          </Fire>
        </g>
      ) : null}
    </g>
  )
}
