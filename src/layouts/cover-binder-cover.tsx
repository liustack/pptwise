import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { blockTag } from "./compositions/shared"
import { resolveDeckFooter } from "../render/footer-marks"
import { Lead, binderInks, binderMeta, binderText, binderTrackedWidth, binderBaseline, binderWidth, fitBinder, paintBinder, paintBinderLine, paintBinderTracked, splitDot, wholeMark } from "./compositions/binder"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"
import { headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"

type Kpis = Extract<Component, { type: "kpi_cards" }>

/**
 * binder-cover：提案书的封面，proposal 2026-10 印刷版定稿（p01）。
 *
 * 左边一张白纸的提案页。顶上一行书眉：左端是 deck 标签「 · 」之前的方案名
 * （`footer.label`，14px 石油蓝粗体），右端是日期（`meta.date`，14px 灰），
 * 下面一条墨色细线。中段：呈给谁（页面的 `kicker`，「呈 贵司管理层」）是标题
 * 上方一行 16px 灰色、字距拉开的小字；标题 46px 粗体石油蓝，一行放得下就一行；
 * 标题下一条 56px 长的砖红短线；再下面 18px 墨色副题。下段一条发丝线，线下
 * 三栏关键数（页面的 `kpi_cards`），栏间用竖向发丝线隔开：数值 28px 粗体石油
 * 蓝（有一个放不下时三个一起降到 26 或 24px）（作者用 `**…**` 整个标出的那一个是砖红），名字 14px 墨，注 12px 灰。左下
 * 角是页面的 `footnote`（「图为 AI 生成的示意图」）。右边 560 宽满高一张照片
 * （页面自己的 `background` 资产），左页盖住照片的其余部分。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页）。零 theme id、零 hex。
 */

const LEFT = 64
const PAGE_W = 720
const COL_W = 592
const HEADER = { top: 56, size: 14, lineHeight: 20, rule: 90 } as const
const KICKER = { top: 196, size: 16, lineHeight: 24, tracking: 3, gap: 18 } as const
const TITLE = { size: 46, lineHeight: 60, minPt: 36 } as const
const MARK = { gap: 18, w: 56, h: 3 } as const
const SUB = { gap: 18, size: 18, lineHeight: 26, maxLines: 2 } as const
const FACTS = { top: 500, pad: 20, value: { dy: 20, sizes: [28, 26, 24], lineHeight: 40 }, label: { gap: 6, size: 14, lineHeight: 20, maxLines: 2 }, note: { gap: 6, size: 12, lineHeight: 17, maxLines: 2 }, max: 3 } as const
const CAPTION = { top: 671, size: 12, lineHeight: 17 } as const

/** Why the cover cannot set `block` as its facts, or undefined when it can: it sets each as its figure and its label, the note under it. */
function factsLeftOut(block: Component): string | undefined {
  return block.type === "kpi_cards" ? fieldsLeftOut(block, "the cover sets each fact as its figure and its label, with its note under it", { items: ["icon", "delta", "tag", "tone", "source"] }) : undefined
}

export function BinderCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = binderInks(ctx)
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  const deckLabel = resolveDeckFooter(ir).label
  const name = deckLabel ? (splitDot(deckLabel)?.name ?? deckLabel) : ""
  const nameW = name ? binderWidth(name, HEADER.size, ctx, true) : 0
  const dateText = ir.meta.date?.trim() ?? ""
  const dateW = dateText ? binderWidth(dateText, HEADER.size, ctx) : 0
  // The name and the date share the head's line: a name that would run into the date is declared lost.
  const nameFits = !name || nameW + (dateText ? dateW + 24 : 0) <= COL_W
  const dateFits = !dateText || dateW <= COL_W
  const kicker = slide.kicker?.trim() ? stripEmphasis(slide.kicker).trim() : ""
  const kickerFits = !kicker || binderTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx) <= COL_W
  const titleTop = KICKER.top + (kicker ? KICKER.lineHeight + KICKER.gap : 0)
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, COL_W)
  const titleInk = binderText(inks.deep, inks.ground, title.fontSize)
  const titleBase = binderBaseline(titleTop, TITLE.lineHeight, title.fontSize)
  const markTop = titleTop + title.lines.length * TITLE.lineHeight + MARK.gap
  const subTop = markTop + MARK.h + SUB.gap
  const sub = slide.subheading?.trim() ? fitBinder(slide.subheading, { width: COL_W, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const facts = boundarySlotBlock(slide, ["kpi_cards"]) as Kpis | undefined
  const n = facts?.items.length ?? 0
  const colW = n > 0 ? COL_W / n : 0
  // The first column runs from the page's left, the rest start a pad past their hairline.
  const colInner = (i: number) => colW - (i === 0 ? 0 : FACTS.pad) - (i === n - 1 ? 0 : FACTS.pad)
  // The figures share one size, the board's 28px or a step under it when one of them needs it.
  const valueText = (it: Kpis["items"][number]) => stripEmphasis(it.value) + (it.unit ? ` ${it.unit}` : "")
  const valueSize = FACTS.value.sizes.find((size) => (facts?.items ?? []).every((it, i) => binderWidth(valueText(it), size, ctx, true) <= colInner(i))) ?? FACTS.value.sizes[0]
  const factItems = (facts?.items ?? []).map((it, i) => ({
    value: fitBinder(valueText(it), { width: colInner(i), size: valueSize, lineHeight: FACTS.value.lineHeight, maxLines: 1, bold: true }, ctx),
    label: fitBinder(it.label, { width: colInner(i), size: FACTS.label.size, lineHeight: FACTS.label.lineHeight, maxLines: FACTS.label.maxLines }, ctx),
    note: it.note?.trim() ? fitBinder(it.note, { width: colInner(i), size: FACTS.note.size, lineHeight: FACTS.note.lineHeight, maxLines: FACTS.note.maxLines }, ctx) : null,
    lit: wholeMark(it.value),
    it,
  }))
  const lits = factItems.filter((f) => f.lit).length
  const factsFit = facts !== undefined && n <= FACTS.max && lits <= 1 && factItems.every((f) => f.value && f.label && (!f.it.note?.trim() || f.note) && (!f.it.value.includes("**") || f.lit)) && factsLeftOut(facts) === undefined
  const factH = Math.max(
    0,
    ...factItems.map((f) => FACTS.value.dy + FACTS.value.lineHeight + FACTS.label.gap + (f.label?.lines.length ?? 1) * FACTS.label.lineHeight + (f.note ? FACTS.note.gap + f.note.lines.length * FACTS.note.lineHeight : 0)),
  )
  const caption = slide.footnote?.trim() ? fitBinder(slide.footnote, { width: COL_W, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  return (
    <>
      <rect data-binder-paper="" x={0} y={0} width={1280} height={720} fill={inks.ground} />
      {photo?.src ? <image data-binder-cover-photo="" href={photo.src} x={PAGE_W} y={0} width={1280 - PAGE_W} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} /> : null}
      {name || dateText ? (
        <g data-binder-cover-head="">
          {name && nameFits ? (
            <g data-binder-cover-name="">{paintBinderLine(name, { ctx, x: LEFT, top: HEADER.top, lineHeight: HEADER.lineHeight, size: HEADER.size, bold: true, fill: binderText(inks.deep, inks.ground, HEADER.size) })}</g>
          ) : null}
          {name && !nameFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
          {dateText && dateFits ? (
            <g data-binder-date="">{paintBinderLine(dateText, { ctx, x: LEFT + COL_W, top: HEADER.top, lineHeight: HEADER.lineHeight, size: HEADER.size, anchor: "end", fill: binderText(inks.muted, inks.ground, HEADER.size) })}</g>
          ) : null}
          {dateText && !dateFits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
          <rect x={LEFT} y={HEADER.rule} width={COL_W} height={1} fill={inks.ink} />
        </g>
      ) : null}
      {kicker ? (
        kickerFits ? (
          <g data-binder-kicker="">
            {paintBinderTracked({ ctx, text: kicker, x: LEFT, y: binderBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, fill: binderText(inks.muted, inks.ground, KICKER.size) })}
          </g>
        ) : (
          <g data-dropped={1} data-dropped-kind="label" />
        )
      ) : null}
      <g data-binder-title="">
        {renderEmphasisHeading(title, headingEmphasisPaint(ctx, title, { baseFill: titleInk, fontWeight: "700", fontFamily: ctx.fonts.heading, bold: true, bg: inks.ground }), (_line, i) => (
          <text
            key={i}
            data-truncated={title.truncated && i === title.lines.length - 1 ? "1" : undefined}
            x={LEFT}
            y={titleBase + i * TITLE.lineHeight}
            fontFamily={ctx.fonts.heading}
            fontSize={title.fontSize}
            fontWeight="700"
            fill={titleInk}
            dominantBaseline="alphabetic"
          />
        ))}
      </g>
      <Lead id="mark">
        <rect data-binder-cover-mark="" x={LEFT} y={markTop} width={MARK.w} height={MARK.h} fill={inks.fire} />
      </Lead>
      {sub ? <g data-binder-cover-sub="">{paintBinder(sub, { ctx, x: LEFT, top: subTop, fill: binderText(inks.ink, inks.ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {facts ? (
        factsFit ? (
          <g {...blockTag(ctx, facts)} data-binder-facts="">
            <rect x={LEFT} y={FACTS.top} width={COL_W} height={1} fill={inks.line} />
            {factItems.map((f, i) => {
              const x = LEFT + i * colW + (i === 0 ? 0 : FACTS.pad)
              const value = paintBinder(f.value!, { ctx, x, top: FACTS.top + FACTS.value.dy, bold: true, fill: binderText(f.lit ? inks.fire : inks.deep, inks.ground, valueSize) })
              const labelTop = FACTS.top + FACTS.value.dy + FACTS.value.lineHeight + FACTS.label.gap
              const noteTop = labelTop + f.label!.lines.length * FACTS.label.lineHeight + FACTS.note.gap
              return (
                <g key={i} data-binder-fact={i}>
                  {i > 0 ? <rect x={LEFT + i * colW} y={FACTS.top} width={1} height={factH} fill={inks.line} /> : null}
                  {f.lit ? <Lead id="fact">{value}</Lead> : value}
                  {paintBinder(f.label!, { ctx, x, top: labelTop, fill: binderText(inks.ink, inks.ground, FACTS.label.size) })}
                  {f.note ? paintBinder(f.note, { ctx, x, top: noteTop, fill: binderText(inks.muted, inks.ground, FACTS.note.size) }) : null}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={facts.items.length} data-dropped-kind="item" />
        )
      ) : null}
      {caption ? <g data-binder-caption="">{paintBinder(caption, { ctx, x: LEFT, top: CAPTION.top, fill: binderMeta(inks.muted, inks.ground) })}</g> : null}
      {slide.footnote?.trim() && !caption ? <g data-dropped={1} data-dropped-kind="footnote" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-binder-cover.tsx: proposal's cover. A white proposal page at the
  // left under a running head with the proposal's name and the date, who it
  // is for in small spaced grey over the title, a short brick-red rule under
  // it, the line under that and three figures in columns ruled apart; the
  // page's photograph down the right 560px.
  id: "binder-cover",
  kind: "standard",
  story: {
    name: "Binder Cover",
    story: "A white proposal page beside a photograph of the client's own kind of site: who it is for in small spaced type, the title in petrol over a short brick-red rule, its line, and the three figures the proposal stands on.",
    positioning: "Opens a proposal handed to a client's management. Choose it when the first page should already say who it is for and what the client stands to gain, in figures.",
    audience: "A client's management opening a proposal addressed to them.",
    notFor: "An internal report or a keynote, where a cover addressed to a client reads as a sales piece.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "body", accepts: ["kpi_cards"], capacity: 1, itemCapacity: FACTS.max, declines: factsLeftOut },
  ],
  pageFields: ["kicker", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  // Over the running head, in the page's left column.
  coverMark: { x: LEFT, y: 40 },
  headingFit: { maxWidth: COL_W, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, COL_W),
} satisfies LayoutDefinition
