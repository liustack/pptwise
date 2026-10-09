import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { blockTag } from "./compositions/shared"
import { Lead, binderInks, binderText, binderWidth, binderBaseline, fitBinder, paintBinder, paintBinderCard, paintBinderLine, paintBinderTracked, paintCheckbox } from "./compositions/binder"
import { boundarySlotBlock } from "./boundary-content"
import { BinderLabelLine, BinderTabsFor, BinderTitle } from "./binder-shared"
import { dossierTitleSet } from "./dossier-shared"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/**
 * binder-ending：提案书的结尾，请客户定的事，proposal 2026-10 定稿（p19）。
 *
 * 左上一行 deck 的标签（页面的 `kicker`，与内容页左上同一写法，「·」之前
 * 石油蓝），右缘索引签亮着最后一签（页面的 `stage`）。标题 44px 特粗石油蓝，
 * 一行放得下就一行。下面一排卡（页面的 `numbered_cards`，两到四件事），每张
 * 卡：编号 15px 砖红粗（「01」），这件事 21px 特粗两行内，说明 14px 灰两行内，
 * 一条发丝线，线下每个选项一个勾选框加 15px 粗体字。选项是页面 `ballot` 的
 * `choices`，某一件事另有选项时取 `ballot.item_choices` 里它那一组。最下一枚
 * 砖红按钮，钮上的字是作者写的（页面的 `paragraph`，「约踏勘时间」），白色
 * 粗体；按钮右边一行 16px 灰字（页面的 `subheading`）。钮的字作者没写就不画钮。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const W = 1132
const TITLE = { foot: 156, size: 44, lineHeight: 60, minPt: 32 } as const
const CARDS = { top: 206, gap: 14, h: 268, pad: 28, number: { top: 20, size: 15, lineHeight: 22, tracking: 1 }, title: { top: 50, size: 21, lineHeight: 32, maxLines: 2 }, text: { top: 120, size: 14, lineHeight: 22, maxLines: 2 }, rule: 190, box: { top: 212, size: 22, r: 4, label: { dx: 30, size: 15, baseline: 17 }, after: 26 }, max: 4 } as const
const BUTTON = { top: 512, h: 56, minW: 220, pad: 40, size: 19, line: { gap: 22, size: 16 } } as const

export function BinderEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = binderInks(ctx)
  const cards = boundarySlotBlock(slide, ["numbered_cards"]) as NumberedCards | undefined
  const ballot = slide.ballot
  const overrides = new Map((ballot?.item_choices ?? []).map((o) => [o.item, o.choices]))
  const n = cards?.items.length ?? 0
  const w = n > 0 ? (W - CARDS.gap * (n - 1)) / n : 0
  const inner = w - CARDS.pad * 2
  const laid = (cards?.items ?? []).map((it, i) => {
    const title = fitBinder(it.title, { width: inner, size: CARDS.title.size, lineHeight: CARDS.title.lineHeight, maxLines: CARDS.title.maxLines, bold: true }, ctx)
    const text = it.text?.trim() ? fitBinder(it.text, { width: inner, size: CARDS.text.size, lineHeight: CARDS.text.lineHeight, maxLines: CARDS.text.maxLines }, ctx) : null
    const choices = (overrides.get(i + 1) ?? ballot?.choices ?? []).map((c) => c.trim())
    const boxesW = choices.reduce((sum, c) => sum + CARDS.box.label.dx + binderWidth(c, CARDS.box.label.size, ctx, true) + CARDS.box.after, 0) - CARDS.box.after
    const whole = title && (!it.text?.trim() || text) && !it.sub?.trim() && !it.icon && !it.emphasis && boxesW <= inner + 12
    return whole ? { it, title, text, choices } : null
  })
  const cardsFit = cards !== undefined && n >= 2 && n <= CARDS.max && laid.every(Boolean) && [...overrides.keys()].every((k) => k >= 1 && k <= n) && !ballot?.signature
  const ask = boundarySlotBlock(slide, ["paragraph"]) as Paragraph | undefined
  const askText = ask ? stripEmphasis(ask.text).trim() : ""
  const askW = Math.max(BUTTON.minW, Math.ceil(binderWidth(askText, BUTTON.size, ctx, true)) + BUTTON.pad * 2)
  // The button holds its words on one line across the measure at most. Words
  // past that ran the pill off the page with nothing to say so: they are
  // declared lost instead, the way marquee-ending's and pitch-ending's
  // buttons declare theirs.
  const askFits = askW <= W
  // A button too long to draw leaves the line the room it has with none.
  const line = slide.subheading?.trim() ? fitBinder(slide.subheading, { width: W - (askFits ? askW : BUTTON.minW) - BUTTON.line.gap, size: BUTTON.line.size, lineHeight: BUTTON.h, maxLines: 1 }, ctx) : null
  const lineX = LEFT + (askText && askFits ? askW + BUTTON.line.gap : 0)
  return (
    <>
      <BinderTabsFor ir={ir} slide={slide} ctx={ctx} />
      {slide.kicker?.trim() ? <BinderLabelLine text={slide.kicker} ctx={ctx} /> : null}
      <BinderTitle heading={slide.heading} ctx={ctx} size={TITLE.size} lineHeight={TITLE.lineHeight} minPt={TITLE.minPt} foot={TITLE.foot} />
      {cards ? (
        cardsFit ? (
          <g {...blockTag(ctx, cards)} data-binder-decisions="">
            {laid.map((card, i) => {
              const { title, text, choices } = card!
              const x = LEFT + i * (w + CARDS.gap)
              const y = CARDS.top
              let ox = x + CARDS.pad
              return (
                <g key={i} data-binder-decision={i + 1}>
                  {paintBinderCard({ x, y, w, h: CARDS.h }, inks)}
                  {paintBinderTracked({ ctx, text: String(i + 1).padStart(2, "0"), x: x + CARDS.pad, y: binderBaseline(y + CARDS.number.top, CARDS.number.lineHeight, CARDS.number.size), size: CARDS.number.size, tracking: CARDS.number.tracking, bold: true, fill: binderText(inks.fireText, inks.card, CARDS.number.size) })}
                  {paintBinder(title, { ctx, x: x + CARDS.pad, top: y + CARDS.title.top, bold: true, fill: binderText(inks.ink, inks.card, CARDS.title.size), ground: inks.card })}
                  {text ? paintBinder(text, { ctx, x: x + CARDS.pad, top: y + CARDS.text.top, fill: binderText(inks.muted, inks.card, CARDS.text.size), ground: inks.card }) : null}
                  <rect x={x + CARDS.pad} y={y + CARDS.rule} width={w - CARDS.pad * 2} height={1} fill={inks.line} />
                  {choices.map((c, j) => {
                    const bx = ox
                    ox += CARDS.box.label.dx + binderWidth(c, CARDS.box.label.size, ctx, true) + CARDS.box.after
                    return (
                      <g key={j} data-ballot-choice={c}>
                        {paintCheckbox(bx, y + CARDS.box.top, CARDS.box.size, inks.deep, inks.ground, { r: CARDS.box.r })}
                        {paintBinderLine(c, { ctx, x: bx + CARDS.box.label.dx, baseline: y + CARDS.box.top + CARDS.box.label.baseline, size: CARDS.box.label.size, bold: true, fill: binderText(inks.ink, inks.card, CARDS.box.label.size) })}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={cards.items.length} data-dropped-kind="item" />
        )
      ) : null}
      {ballot && !cards ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {ask && askText ? (
        askFits ? (
          <g {...blockTag(ctx, ask)}>
            <Lead id="ask">
              <rect x={LEFT} y={BUTTON.top} width={askW} height={BUTTON.h} rx={BUTTON.h / 2} fill={inks.fire} />
              {paintBinderLine(askText, { ctx, x: LEFT + askW / 2, top: BUTTON.top, lineHeight: BUTTON.h, size: BUTTON.size, bold: true, anchor: "middle", fill: binderText(inks.onFire, inks.fire, BUTTON.size) })}
            </Lead>
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {line ? <g data-binder-ending-line="">{paintBinder(line, { ctx, x: lineX, top: BUTTON.top, fill: binderText(inks.muted, inks.ground, BUTTON.line.size) })}</g> : null}
      {slide.subheading?.trim() && !line ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-binder-ending.tsx: proposal's close. The deck's label, the binder
  // tabs with the last lit, the closing line in petrol, a card for each thing
  // the client is asked to decide with a box for each choice, and a button of
  // the brick red with the author's own words beside a grey line.
  id: "binder-ending",
  kind: "standard",
  story: {
    name: "Binder Close",
    story: "The things the client is asked to decide, each on a card with a box to tick for every choice, under the closing line in petrol, and one brick-red button with the author's own words for the next step.",
    positioning: "Closes a proposal on what the client decides. Choose it when the last page should leave a client's management a short list to tick and a clear next step.",
    audience: "A client's management at the end of a proposal, deciding what to sign off.",
    notFor: "A thank-you page or a contact sheet, which want a quieter close.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["numbered_cards", "paragraph"], capacity: 2, itemCapacity: CARDS.max },
  ],
  pageFields: ["kicker", "stage", "ballot"],
  suppressMotif: true,
  headingFit: { maxWidth: W, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, W),
} satisfies LayoutDefinition
