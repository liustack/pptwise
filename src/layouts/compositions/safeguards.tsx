import type { Component } from "@/ir"
import { stripEmphasis } from "../../render/emphasis"
import { blockTag, compositionTag, type Composition } from "./shared"
import { binderInks, binderText, binderTrackedWidth, fitBinder, paintBinder, paintBinderIcon, paintBinderTracked, paintBinderLine, splitName, splitSentence, binderBaseline } from "./binder"
import type { Recipe } from "./recipe"

type IconCards = Extract<Component, { type: "icon_cards" }>
type Panel = Extract<Component, { type: "insight_panel" }>

/*
 * safeguards: what a risk is held to, what went wrong before and who answers
 * for it, proposal's 2026-10 print board (p14). Three columns, each under its
 * title in small tracked grey and a 2px ink rule. The first column's items,
 * parted by a hairline: the rule's icon in petrol, its name bold, the tag
 * that settles it (`settled`) in small bold petrol, what it asks. The second
 * column's items, each a lesson: its icon in the danger ink (`tone:
 * "danger"`), its name bold, what happened in grey, and what is done about
 * it, its lead in bold petrol (「我们的做法：」). At the right, the panel: its
 * icon and title in petrol over a 2px petrol rule, a row a party under a
 * hairline (who, in small grey, over what they answer for, bold), its
 * footnote at its foot.
 *
 * A lesson's text is written "what happened。lead：what is done" (「电池包
 * 测试时热失控后闪爆，1 人死亡。我们的做法：储能柜远离车间和通道…」).
 *
 * Takes, in the binder setting: an `icon_cards` of two with a title, tags
 * allowed only settled; an `icon_cards` of two with a title; an
 * `insight_panel` of two to four rows.
 *
 * Declines: a title past its column, an item's name past one line or its
 * text past three, a lesson not written that way, a panel row or footnote
 * past its column.
 *
 * Reads: the binder inks (`./binder.tsx`).
 */

const COL = { w: 344, gap: 36, head: { top: 2, size: 13, lineHeight: 20, tracking: 1 }, rule: 28, card: { top: 44, h: 176, step: 192 }, icon: { dy: 3, size: 22 }, name: { dx: 32, dy: 0, size: 16, lineHeight: 28 }, chip: { dy: 32, size: 13, lineHeight: 20 }, text: { size: 14, lineHeight: 22, maxLines: 3, plain: 34, under: 58 }, lesson: { what: 34, doing: 68 } } as const
const PANEL = { x: 760, top: 0, h: 408, icon: { dy: 0, size: 22 }, title: { dx: 32, dy: 0, size: 18, lineHeight: 26 }, rows: { top: 44, step: 84, label: { dy: 12, size: 13, lineHeight: 20 }, value: { dy: 34, size: 18, lineHeight: 28 } }, foot: { dy: 384, size: 13, lineHeight: 18 } } as const

/** What an author writes to get this drawing (`./recipe.ts`). */
export const safeguardsRecipe: Recipe = {
  look: "What a risk is held to, what went wrong before and who answers for it",
  kinds: ["list"],
  shapes: [{ parts: [{ type: "icon_cards", count: [2, 2], needs: ["title"] }, { type: "icon_cards", count: [2, 2], needs: ["title", "items[*].text~colon"] }, { type: "insight_panel", count: [2, 4] }] }],
}

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
  const inner = COL.w
  const pw = rect.w - PANEL.x
  const headOk = (t: string) => binderTrackedWidth(t, COL.head.size, COL.head.tracking, ctx, true) <= COL.w
  if (!headOk(a.title) || !headOk(b.title)) return null

  const ruleCards = a.items.map((it) => {
    const name = fitBinder(it.title, { width: COL.w - COL.name.dx, size: COL.name.size, lineHeight: COL.name.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = fitBinder(it.text, { width: inner, size: COL.text.size, lineHeight: COL.text.lineHeight, maxLines: COL.text.maxLines }, ctx)
    return name && text ? { it, name, text } : null
  })
  const lessonCards = b.items.map((it) => {
    const name = fitBinder(it.title, { width: COL.w - COL.name.dx, size: COL.name.size, lineHeight: COL.name.lineHeight, maxLines: 1, bold: true }, ctx)
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

  const pTitle = fitBinder(p.title, { width: pw - PANEL.title.dx, size: PANEL.title.size, lineHeight: PANEL.title.lineHeight, maxLines: 1, bold: true }, ctx)
  const pRows = p.rows.map((r) => ({
    label: fitBinder(r.label, { width: pw, size: PANEL.rows.label.size, lineHeight: PANEL.rows.label.lineHeight, maxLines: 1, bold: true }, ctx),
    value: fitBinder(r.text, { width: pw, size: PANEL.rows.value.size, lineHeight: PANEL.rows.value.lineHeight, maxLines: 1, bold: true }, ctx),
  }))
  const pFoot = p.footnote?.trim() ? fitBinder(p.footnote, { width: pw, size: PANEL.foot.size, lineHeight: PANEL.foot.lineHeight, maxLines: 1 }, ctx) : null
  if (!pTitle || pRows.some((r) => !r.label || !r.value) || (p.footnote?.trim() && !pFoot)) return null
  if (PANEL.rows.top + (p.rows.length - 1) * PANEL.rows.step + PANEL.rows.value.dy + PANEL.rows.value.lineHeight > PANEL.foot.dy) return null

  const colX = (i: number) => rect.x + i * (COL.w + COL.gap)
  const head = (title: string, i: number) =>
    paintBinderTracked({ ctx, text: title.trim(), x: colX(i), y: binderBaseline(rect.y + COL.head.top, COL.head.lineHeight, COL.head.size), size: COL.head.size, tracking: COL.head.tracking, bold: true, fill: binderText(inks.muted, inks.ground, COL.head.size) })

  const rowRule = (x: number, k: number) => (k > 0 ? <rect x={x} y={rect.y + COL.card.top + k * COL.card.step - (COL.card.step - COL.card.h) / 2 - 8} width={COL.w} height={1} fill={inks.line} /> : null)

  return (
    <g {...compositionTag("safeguards")}>
      <g {...blockTag(ctx, a)} data-binder-rules="">
        {head(a.title, 0)}
        <rect x={colX(0)} y={rect.y + COL.rule} width={COL.w} height={2} fill={inks.ink} />
        {ruleCards.map((c, k) => {
          const { it, name, text } = c!
          const x = colX(0)
          const y = rect.y + COL.card.top + k * COL.card.step
          return (
            <g key={k} data-binder-rule={stripEmphasis(it.title)}>
              {rowRule(x, k)}
              {paintBinderIcon(it.icon, x, y + COL.icon.dy, COL.icon.size, inks.deep, inks.ground)}
              {paintBinder(name, { ctx, x: x + COL.name.dx, top: y + COL.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, COL.name.size) })}
              {it.tag ? (
                <g data-binder-settled="">{paintBinderLine(it.tag.text, { ctx, x, top: y + COL.chip.dy, lineHeight: COL.chip.lineHeight, size: COL.chip.size, bold: true, fill: binderText(inks.deep, inks.ground, COL.chip.size) })}</g>
              ) : null}
              {paintBinder(text, { ctx, x, top: y + (it.tag ? COL.text.under : COL.text.plain), fill: binderText(inks.ink, inks.ground, COL.text.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, b)} data-binder-lessons="">
        {head(b.title, 1)}
        <rect x={colX(1)} y={rect.y + COL.rule} width={COL.w} height={2} fill={inks.ink} />
        {lessonCards.map((c, k) => {
          const { it, name, what, done, doingTop } = c!
          const x = colX(1)
          const y = rect.y + COL.card.top + k * COL.card.step
          const tone = (it as { tone?: string }).tone
          return (
            <g key={k} data-binder-lesson={stripEmphasis(it.title)}>
              {rowRule(x, k)}
              {paintBinderIcon(it.icon, x, y + COL.icon.dy, COL.icon.size, tone === "danger" ? inks.danger : inks.deep, inks.ground)}
              {paintBinder(name, { ctx, x: x + COL.name.dx, top: y + COL.name.dy, bold: true, fill: binderText(inks.ink, inks.ground, COL.name.size) })}
              {paintBinder(what, { ctx, x, top: y + COL.lesson.what, fill: binderText(inks.muted, inks.ground, COL.text.size) })}
              {paintBinder(done, { ctx, x, top: y + doingTop, fill: binderText(inks.ink, inks.ground, COL.text.size), runInk: binderText(inks.deep, inks.ground, COL.text.size) })}
            </g>
          )
        })}
      </g>
      <g {...blockTag(ctx, p)} data-binder-panel="">
        {p.icon ? paintBinderIcon(p.icon, rect.x + PANEL.x, rect.y + PANEL.top + PANEL.icon.dy, PANEL.icon.size, inks.deep, inks.ground) : null}
        {paintBinder(pTitle, { ctx, x: rect.x + PANEL.x + (p.icon ? PANEL.title.dx : 0), top: rect.y + PANEL.top + PANEL.title.dy, bold: true, fill: binderText(inks.deep, inks.ground, PANEL.title.size) })}
        <rect x={rect.x + PANEL.x} y={rect.y + COL.rule} width={pw} height={2} fill={inks.deep} />
        {pRows.map((r, k) => {
          const y = rect.y + PANEL.top + PANEL.rows.top + k * PANEL.rows.step
          return (
            <g key={k}>
              {k > 0 ? <rect x={rect.x + PANEL.x} y={y} width={pw} height={1} fill={inks.line} /> : null}
              {paintBinder(r.label!, { ctx, x: rect.x + PANEL.x, top: y + PANEL.rows.label.dy, bold: true, fill: binderText(inks.muted, inks.ground, PANEL.rows.label.size) })}
              {paintBinder(r.value!, { ctx, x: rect.x + PANEL.x, top: y + PANEL.rows.value.dy, bold: true, fill: binderText(inks.ink, inks.ground, PANEL.rows.value.size) })}
            </g>
          )
        })}
        {pFoot ? paintBinder(pFoot, { ctx, x: rect.x + PANEL.x, top: rect.y + PANEL.top + PANEL.foot.dy, fill: binderText(inks.muted, inks.ground, PANEL.foot.size) }) : null}
      </g>
    </g>
  )
}
