import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { blockTag } from "./compositions/shared"
import { graphicInk } from "../render/ink"
import { Lead, binderInks, binderText, binderWidth, binderBaseline, fitBinder, paintBinder, paintBinderLine, paintCheckbox } from "./compositions/binder"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { BINDER_HEAD_FIT, BinderLabelLine, BinderRunningHead, BinderTitle, RUNNING_HEAD, binderStageLine, binderStageWidth } from "./binder-shared"
import { dossierTitleSet } from "./dossier-shared"

type NumberedCards = Extract<Component, { type: "numbered_cards" }>
type Paragraph = Extract<Component, { type: "paragraph" }>

/**
 * binder-ending：提案书的结尾，请客户定的事，proposal 2026-10 印刷版定稿（p19）。
 *
 * 顶上和内容页同一行书眉：左端是页面的 `kicker`（deck 的标签，13px 灰），右端
 * 是这一页所在的段落（页面的 `stage` 在 `course` 里的名字，「决定」，不带序号，石油蓝粗体），下面一条细线。
 * 标题和内容页的论断同一写法：30px 粗体石油蓝，一行放得下就一行。下面是要客户
 * 定的事（页面的 `numbered_cards`，两到四件），一件一行：上面一条 2px 墨线，
 * 行间发丝线，每行左边砖红两位编号（「01」，28px 粗体），中间这件事 20px 粗体
 * 墨和一行 14px 灰色说明，右边印空方框选项（页面 `ballot` 的 `choices`，某一件
 * 另有选项时取 `ballot.item_choices` 里它那一组），方框 18px、1.5px 墨线，选项字
 * 16px。最下是一行纸面填空（页面的 `paragraph`）：第一段空格线之前的字是 18px
 * 石油蓝粗体标签，作者写的空格线（两个以上「＿」或「_」，「约踏勘时间 ＿＿＿ 年
 * ＿＿ 月 ＿＿ 日」）画成下划线，线间的字是 16px 墨；作者没写空格线时，标签后面
 * 画一条下划线。再下面一行 14px 灰字（页面的 `subheading`）。作者没写这段文字
 * 时不画填空。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const W = 1152
const ROWS = { top: 180, rule: 2, h: 96, number: { size: 28, lineHeight: 36 }, text: { x: 80, title: { size: 20, lineHeight: 28 }, gap: 4, note: { size: 14, lineHeight: 20, maxLines: 2 } }, choices: { w: 360, box: 18, gap: 8, after: 28, size: 16 }, max: 4 } as const
const FILL = { gap: 38, label: { size: 18, lineHeight: 26 }, after: 24, between: 8, size: 16, line: 1.5, blank: { unit: 40, less: 24, min: 40, bare: 200 } } as const
const LINE = { gap: 22, size: 14, lineHeight: 20 } as const
const BLANK = /(_{2,}|\uFF3F{2,})/u

/** Why the close cannot set `block` as its decisions, or undefined when it can: each is its number, its title and a line of text beside the ballot's boxes. */
function cardsLeftOut(block: Component): string | undefined {
  return block.type === "numbered_cards" ? fieldsLeftOut(block, "the close sets each decision as its number, its title and a line of text beside the ballot's boxes", { items: ["sub", "icon", "emphasis"] }) : undefined
}

/** A fill-in written as a label and the blanks after it: the label, then each blank's width or the words between them. */
export function readFillIn(text: string): { label: string; parts: ({ blank: number } | { words: string })[] } | null {
  const pieces = text.trim().split(BLANK)
  const label = pieces[0]!.trim()
  if (!label) return null
  if (pieces.length === 1) return { label, parts: [{ blank: FILL.blank.bare }] }
  const parts: ({ blank: number } | { words: string })[] = []
  pieces.slice(1).forEach((piece, i) => {
    if (i % 2 === 0) parts.push({ blank: Math.max(FILL.blank.min, Array.from(piece).length * FILL.blank.unit - FILL.blank.less) })
    else if (piece.trim()) parts.push({ words: piece.trim() })
  })
  return { label, parts }
}

export function BinderEnding({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = binderInks(ctx)
  const stage = binderStageLine(ir, slide)
  const stageW = binderStageWidth(stage, ctx)
  const cards = boundarySlotBlock(slide, ["numbered_cards"]) as NumberedCards | undefined
  const ballot = slide.ballot
  const overrides = new Map((ballot?.item_choices ?? []).map((o) => [o.item, o.choices]))
  const n = cards?.items.length ?? 0
  const textX = LEFT + ROWS.text.x
  const choicesX = LEFT + W - ROWS.choices.w
  const textW = choicesX - 16 - textX
  const laid = (cards?.items ?? []).map((it, i) => {
    const title = fitBinder(it.title, { width: textW, size: ROWS.text.title.size, lineHeight: ROWS.text.title.lineHeight, maxLines: 1, bold: true }, ctx)
    const text = it.text?.trim() ? fitBinder(it.text, { width: textW, size: ROWS.text.note.size, lineHeight: ROWS.text.note.lineHeight, maxLines: ROWS.text.note.maxLines }, ctx) : null
    const choices = (overrides.get(i + 1) ?? ballot?.choices ?? []).map((c) => c.trim())
    const boxesW = choices.reduce((sum, c) => sum + ROWS.choices.box + ROWS.choices.gap + binderWidth(c, ROWS.choices.size, ctx) + ROWS.choices.after, 0) - ROWS.choices.after
    const whole = title && (!it.text?.trim() || text) && boxesW <= ROWS.choices.w
    return whole ? { it, title, text, choices } : null
  })
  const cardsFit = cards !== undefined && cardsLeftOut(cards) === undefined && n >= 2 && n <= ROWS.max && laid.every(Boolean) && [...overrides.keys()].every((k) => k >= 1 && k <= n) && !ballot?.signature
  const rowsBottom = ROWS.top + ROWS.rule + n * ROWS.h
  const fillTop = (cards ? rowsBottom : ROWS.top) + FILL.gap
  const ask = boundarySlotBlock(slide, ["paragraph"]) as Paragraph | undefined
  const fill = ask ? readFillIn(stripEmphasis(ask.text)) : null
  const fillW = fill
    ? binderWidth(fill.label, FILL.label.size, ctx, true) + FILL.after + fill.parts.reduce((sum, p) => sum + ("blank" in p ? p.blank : binderWidth(p.words, FILL.size, ctx)), 0) + Math.max(0, fill.parts.length - 1) * FILL.between
    : 0
  const fillFits = fill !== null && fillW <= W
  const lineTop = ask ? fillTop + FILL.label.lineHeight + LINE.gap : fillTop
  const line = slide.subheading?.trim() ? fitBinder(slide.subheading, { width: W, size: LINE.size, lineHeight: LINE.lineHeight, maxLines: 1 }, ctx) : null
  const fillBase = binderBaseline(fillTop, FILL.label.lineHeight, FILL.label.size)
  let fx = LEFT + (fill ? binderWidth(fill.label, FILL.label.size, ctx, true) + FILL.after : 0)
  return (
    <>
      <BinderRunningHead stage={stage} ctx={ctx} />
      {slide.kicker?.trim() ? <BinderLabelLine text={slide.kicker} ctx={ctx} right={LEFT + W - (stageW > 0 ? stageW + RUNNING_HEAD.gap : 0)} /> : null}
      <BinderTitle heading={slide.heading} ctx={ctx} />
      {cards ? (
        cardsFit ? (
          <g {...blockTag(ctx, cards)} data-binder-decisions="">
            <rect x={LEFT} y={ROWS.top} width={W} height={ROWS.rule} fill={inks.ink} />
            {laid.map((card, i) => {
              const { title, text, choices } = card!
              const y = ROWS.top + ROWS.rule + i * ROWS.h
              const blockH = ROWS.text.title.lineHeight + (text ? ROWS.text.gap + text.lines.length * ROWS.text.note.lineHeight : 0)
              const textTop = y + (ROWS.h - blockH) / 2
              const mid = y + ROWS.h / 2
              let ox = choicesX
              return (
                <g key={i} data-binder-decision={i + 1}>
                  <Lead id="decision">
                    {paintBinderLine(String(i + 1).padStart(2, "0"), {
                      ctx,
                      x: LEFT,
                      top: mid - ROWS.number.lineHeight / 2,
                      lineHeight: ROWS.number.lineHeight,
                      size: ROWS.number.size,
                      bold: true,
                      fill: binderText(inks.fireText, inks.ground, ROWS.number.size),
                    })}
                  </Lead>
                  {paintBinder(title, { ctx, x: textX, top: textTop, bold: true, fill: binderText(inks.ink, inks.ground, ROWS.text.title.size) })}
                  {text ? paintBinder(text, { ctx, x: textX, top: textTop + ROWS.text.title.lineHeight + ROWS.text.gap, fill: binderText(inks.muted, inks.ground, ROWS.text.note.size) }) : null}
                  {choices.map((c, j) => {
                    const bx = ox
                    ox += ROWS.choices.box + ROWS.choices.gap + binderWidth(c, ROWS.choices.size, ctx) + ROWS.choices.after
                    return (
                      <g key={j} data-ballot-choice={c}>
                        {paintCheckbox(bx, mid - ROWS.choices.box / 2, ROWS.choices.box, graphicInk(inks.ink, inks.ground))}
                        {paintBinderLine(c, { ctx, x: bx + ROWS.choices.box + ROWS.choices.gap, top: mid - 12, lineHeight: 24, size: ROWS.choices.size, fill: binderText(inks.ink, inks.ground, ROWS.choices.size) })}
                      </g>
                    )
                  })}
                  <rect x={LEFT} y={y + ROWS.h - 1} width={W} height={1} fill={inks.line} />
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={cards.items.length} data-dropped-kind="item" />
        )
      ) : null}
      {ballot && !cards ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {ask && fill ? (
        fillFits ? (
          <g {...blockTag(ctx, ask)} data-binder-fill-in="">
            {paintBinderLine(fill.label, { ctx, x: LEFT, baseline: fillBase, size: FILL.label.size, bold: true, fill: binderText(inks.deep, inks.ground, FILL.label.size) })}
            {fill.parts.map((part, j) => {
              const x = fx
              fx += ("blank" in part ? part.blank : binderWidth(part.words, FILL.size, ctx)) + FILL.between
              return "blank" in part ? (
                <rect key={j} data-binder-blank="" x={x} y={fillBase + 3} width={part.blank} height={FILL.line} fill={graphicInk(inks.ink, inks.ground)} />
              ) : (
                <g key={j}>{paintBinderLine(part.words, { ctx, x, baseline: fillBase, size: FILL.size, fill: binderText(inks.ink, inks.ground, FILL.size) })}</g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      {ask && !fill && stripEmphasis(ask.text).trim() ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {line ? <g data-binder-ending-line="">{paintBinder(line, { ctx, x: LEFT, top: lineTop, fill: binderText(inks.muted, inks.ground, LINE.size) })}</g> : null}
      {slide.subheading?.trim() && !line ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // ending-binder-ending.tsx: proposal's close. The running head with the
  // deck's label and the part it closes, the closing line in petrol, a ruled
  // row for each thing the client is asked to decide with an empty box for
  // each choice, and a line to fill in with the author's own words.
  id: "binder-ending",
  kind: "standard",
  story: {
    name: "Binder Close",
    story: "The things the client is asked to decide, each on a ruled row with a brick-red number and an empty box to tick for every choice, under the closing line in petrol, and a line to fill in for the next step, such as the date of a site survey.",
    positioning: "Closes a proposal on what the client decides. Choose it when the last page should leave a client's management a short list to tick and a clear next step.",
    audience: "A client's management at the end of a proposal, deciding what to sign off.",
    notFor: "A thank-you page or a contact sheet, which want a quieter close.",
  },
  slideTypes: ["ending"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["numbered_cards", "paragraph"], capacity: 2, itemCapacity: ROWS.max, declines: cardsLeftOut },
  ],
  pageFields: ["kicker", "stage", "ballot"],
  suppressMotif: true,
  headingFit: BINDER_HEAD_FIT,
  headingSet: dossierTitleSet(BINDER_HEAD_FIT.fontSize, BINDER_HEAD_FIT.fontSize * BINDER_HEAD_FIT.lineHeightRatio, BINDER_HEAD_FIT.minPt, BINDER_HEAD_FIT.maxWidth),
} satisfies LayoutDefinition
