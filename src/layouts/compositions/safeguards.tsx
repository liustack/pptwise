import type { Component } from "@/ir"
import { blendOver } from "../../render/ink"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { Lead, binderInks, binderText, binderTrackedWidth, fitBinder, paintBinder, paintBinderCard, paintBinderIcon, paintBinderTracked, paintChip, splitName, splitSentence, binderBaseline } from "./binder"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Panel = Extract<Component, { type: "insight_panel" }>

/*
 * safeguards: what a risk is held to, what went wrong before and who answers
 * for it, proposal's 2026-10 board (p14). Three columns. Under its title in
 * small tracked grey, the first column's cards: the rule's icon in petrol,
 * its name bold, the tag that settles it (`settled`) as a chip of the
 * tangerine, what it asks. Under its title, the second column's cards, each
 * a lesson: its icon in the danger ink (`tone: "danger"`), its name bold,
 * what happened in grey, and what is done about it, its lead in bold petrol
 * (「我们的做法：」). At the right, the panel as a block of petrol: its icon
 * and title in the paper's white, a row a party under a faint rule (who, in
 * a quiet white, over what they answer for, bold), its footnote at its foot.
 *
 * A lesson's text is written "what happened。lead：what is done" (「电池包
 * 测试时热失控后闪爆，1 人死亡。我们的做法：储能柜远离车间和通道…」).
 *
 * Takes, in the binder setting: an `icon_cards` of two with a title, tags
 * allowed only settled; an `icon_cards` of two with a title; an
 * `insight_panel` of two to four rows.
 *
 * Declines: a title past its column, a card's name past one line or its text
 * past three, a lesson not written that way, a panel row or footnote past its
 * block.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const COL = { w: 336, gap: 16, head: { top: 2, size: 13, lineHeight: 20, tracking: 1 }, card: { top: 30, h: 184, step: 196, pad: 20 }, icon: { dy: 20, size: 22 }, name: { dx: 52, dy: 16, size: 16, lineHeight: 28 }, chip: { dy: 54, h: 24, size: 12 }, text: { size: 14, lineHeight: 22, maxLines: 3, plain: 58, under: 88 }, lesson: { what: 50, doing: 80 } } as const
const PANEL = { x: 704, w: 428, top: 2, h: 408, pad: 24, icon: { dy: 22, size: 24 }, title: { dx: 58, dy: 18, size: 20, lineHeight: 32 }, rows: { top: 78, step: 92, label: { dy: 12, size: 13, lineHeight: 20 }, value: { dy: 34, size: 18, lineHeight: 28 } }, foot: { dy: 366, size: 13, lineHeight: 18 }, quiet: 0.7, faint: 0.22 } as const

export const safeguardsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "binder") return null
  const [rules, lessons, panel, ...rest] = components
  if (rules?.type !== "icon_cards" || lessons?.type !== "icon_cards" || panel?.type !== "insight_panel" || rest.length > 0) return null
  const a = rules as IconCards & { title?: string }
  const b = lessons as IconCards & { title?: string }
  const p = panel as Panel
  if (!a.title?.trim() || !b.title?.trim() || a.items.length !== 2 || b.items.length !== 2) return null
  if (a.items.some((it) => (it.tag && !it.tag.settled) || (it as { tone?: string }).tone) || b.items.some((it) => it.tag)) return null
  if (p.rows.length < 2 || p.rows.length > 4 || rect.w < 1132 || rect.h < PANEL.top + PANEL.h) return null
  const inks = binderInks(ctx)
  const inner = COL.w - COL.card.pad * 2
  const headOk = (t: string) => binderTrackedWidth(t, COL.head.size, COL.head.tracking, ctx, true) <= COL.w
  if (!headOk(a.title) || !headOk(b.title)) return null

  const ruleCards = a.items.map((it) => {
    const name = fitBinder(it.title, { width: COL.w - COL.name.dx - 12, size: COL.name.size, lineHeight: COL.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(it.text, { width: inner, size: COL.text.size, lineHeight: COL.text.lineHeight, maxLines: COL.text.maxLines }, ctx)
    return name && text ? { it, name, text } : null
  })
  const lessonCards = b.items.map((it) => {
    const name = fitBinder(it.title, { width: COL.w - COL.name.dx - 12, size: COL.name.size, lineHeight: COL.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const sentence = splitSentence(it.text)
    const doing = sentence ? splitName(sentence.rest) : null
    if (!name || !sentence || !doing) return null
    const what = fitBinder(`${sentence.lead}${sentence.sep.trim()}`, { width: inner, size: COL.text.size, lineHeight: COL.text.lineHeight, maxLines: 2 }, ctx)
    // The lead keeps the colon the author wrote, and the space after it in a Latin text.
    const done = fitBinder(`**${doing.name}${doing.sep.trim()}**${doing.sep.endsWith(" ") ? " " : ""}${doing.rest}`, { width: inner, size: COL.text.size, lineHeight: COL.text.lineHeight, maxLines: COL.text.maxLines }, ctx)
    // What is done starts a line under what happened, however many lines that took.
    const doingTop = COL.lesson.doing + ((what?.lines.length ?? 1) - 1) * COL.text.lineHeight
    if (!what || !done || doingTop + done.lines.length * COL.text.lineHeight > COL.card.h - 8) return null
    return { it, name, what, done, doingTop }
  })
  if ([...ruleCards, ...lessonCards].some((c) => !c)) return null

  const onDeep = (alpha: number) => blendOver(inks.onDeep, inks.deep, alpha)
  const pTitle = fitBinder(p.title, { width: PANEL.w - PANEL.title.dx - PANEL.pad, size: PANEL.title.size, lineHeight: PANEL.title.lineHeight, maxLines: 1, bold: true }, ctx)
  const pRows = p.rows.map((r) => ({
    label: fitBinder(r.label, { width: PANEL.w - PANEL.pad * 2, size: PANEL.rows.label.size, lineHeight: PANEL.rows.label.lineHeight, maxLines: 1, bold: true }, ctx),
    value: fitBinder(r.text, { width: PANEL.w - PANEL.pad * 2, size: PANEL.rows.value.size, lineHeight: PANEL.rows.value.lineHeight, maxLines: 1, bold: true }, ctx),
  }))
  const pFoot = p.footnote?.trim() ? fitBinder(p.footnote, { width: PANEL.w - PANEL.pad * 2, size: PANEL.foot.size, lineHeight: PANEL.foot.lineHeight, maxLines: 1 }, ctx) : null
  if (!pTitle || pRows.some((r) => !r.label || !r.value) || (p.footnote?.trim() && !pFoot)) return null
  if (PANEL.rows.top + (p.rows.length - 1) * PANEL.rows.step + PANEL.rows.value.dy + PANEL.rows.value.lineHeight > PANEL.foot.dy) return null

  const colX = (i: number) => rect.x + i * (COL.w + COL.gap)
  const head = (title: string, i: number) =>
    paintBinderTracked({ ctx, text: title.trim(), x: colX(i), y: binderBaseline(rect.y + COL.head.top, COL.head.lineHeight, COL.head.size), size: COL.head.size, tracking: COL.head.tracking, bold: true, fill: binderText(inks.muted, inks.ground, COL.head.size) })

  return (
    <g {...compositionTag("safeguards")}>
      <g {...blockTag(ctx, a)} data-binder-rules="">
        {head(a.title, 0)}
        {ruleCards.map((c, k) => {
          const { it, name, text } = c!
          const x = colX(0)
          const y = rect.y + COL.card.top + k * COL.card.step
          return (
            <g key={k} data-binder-rule={stripEmphasis(it.title)}>
              {paintBinderCard({ x, y, w: COL.w, h: COL.card.h }, inks)}
              {paintBinderIcon(it.icon, x + COL.card.pad, y + COL.icon.dy, COL.icon.size, inks.deep, inks.card)}
              {paintBinder(name, { ctx, x: x + COL.name.dx, top: y + COL.name.dy, bold: true, fill: binderText(inks.ink, inks.card, COL.name.size), ground: inks.card })}
              {it.tag ? <Lead id="rule">{paintChip(it.tag.text, x + COL.card.pad, y + COL.chip.dy, { size: COL.chip.size, h: COL.chip.h, fg: inks.onFire, bg: inks.fire }, ctx, inks).node}</Lead> : null}
              {paintBinder(text, { ctx, x: x + COL.card.pad, top: y + (it.tag ? COL.text.under : COL.text.plain), fill: binderText(inks.ink, inks.card, COL.text.size), ground: inks.card })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, b)} data-binder-lessons="">
        {head(b.title, 1)}
        {lessonCards.map((c, k) => {
          const { it, name, what, done, doingTop } = c!
          const x = colX(1)
          const y = rect.y + COL.card.top + k * COL.card.step
          const tone = (it as { tone?: string }).tone
          return (
            <g key={k} data-binder-lesson={stripEmphasis(it.title)}>
              {paintBinderCard({ x, y, w: COL.w, h: COL.card.h }, inks)}
              {paintBinderIcon(it.icon, x + COL.card.pad, y + COL.icon.dy, COL.icon.size, tone === "danger" ? inks.danger : inks.deep, inks.card)}
              {paintBinder(name, { ctx, x: x + COL.name.dx, top: y + COL.name.dy, bold: true, fill: binderText(inks.ink, inks.card, COL.name.size), ground: inks.card })}
              {paintBinder(what, { ctx, x: x + COL.card.pad, top: y + COL.lesson.what, fill: binderText(inks.muted, inks.card, COL.text.size), ground: inks.card })}
              {paintBinder(done, { ctx, x: x + COL.card.pad, top: y + doingTop, fill: binderText(inks.ink, inks.card, COL.text.size), ground: inks.card, runInk: binderText(inks.deep, inks.card, COL.text.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, p)} data-binder-panel="">
        <rect x={rect.x + PANEL.x} y={rect.y + PANEL.top} width={PANEL.w} height={PANEL.h} rx={12} fill={inks.deep} />
        {p.icon ? paintBinderIcon(p.icon, rect.x + PANEL.x + PANEL.pad, rect.y + PANEL.top + PANEL.icon.dy, PANEL.icon.size, inks.onDeep, inks.deep) : null}
        {paintBinder(pTitle, { ctx, x: rect.x + PANEL.x + PANEL.title.dx, top: rect.y + PANEL.top + PANEL.title.dy, bold: true, fill: binderText(inks.onDeep, inks.deep, PANEL.title.size), ground: inks.deep })}
        {pRows.map((r, k) => {
          const y = rect.y + PANEL.top + PANEL.rows.top + k * PANEL.rows.step
          return (
            <g key={k}>
              <rect x={rect.x + PANEL.x + PANEL.pad} y={y} width={PANEL.w - PANEL.pad * 2} height={1} fill={onDeep(PANEL.faint)} />
              {paintBinder(r.label!, { ctx, x: rect.x + PANEL.x + PANEL.pad, top: y + PANEL.rows.label.dy, bold: true, fill: binderText(onDeep(PANEL.quiet), inks.deep, PANEL.rows.label.size), ground: inks.deep })}
              {paintBinder(r.value!, { ctx, x: rect.x + PANEL.x + PANEL.pad, top: y + PANEL.rows.value.dy, bold: true, fill: binderText(inks.onDeep, inks.deep, PANEL.rows.value.size), ground: inks.deep })}
            </g>
          )
        })}
        {pFoot ? paintBinder(pFoot, { ctx, x: rect.x + PANEL.x + PANEL.pad, top: rect.y + PANEL.top + PANEL.foot.dy, fill: binderText(onDeep(PANEL.quiet), inks.deep, PANEL.foot.size), ground: inks.deep }) : null}
      </g>
    </g>
  )
}
