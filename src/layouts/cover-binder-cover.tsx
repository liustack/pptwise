import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { blockTag } from "./compositions/shared"
import { binderInks, binderMeta, binderText, binderTrackedWidth, binderBaseline, fitBinder, paintBinder, paintBinderTracked } from "./compositions/binder"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { fitDossierTitle, dossierTitleSet } from "./dossier-shared"
import { headingEmphasisPaint, renderEmphasisHeading } from "../render/emphasis"

type Kpis = Extract<Component, { type: "kpi_cards" }>

/**
 * binder-cover：提案书的封面，proposal 2026-10 定稿（p01）。
 *
 * 左边一张白纸的提案页：左上日期（`meta.date`，14px 灰粗），中段一枚砖红
 * 胶囊写呈给谁（页面的 `kicker`，「呈 贵司管理层」，白字），标题 50px 特粗
 * 石油蓝，一行放得下就一行；下面 20px 灰色副题；一条发丝线；线下一排三个
 * 关键数（页面的 `kpi_cards`，每项数值 26px 石油蓝粗，名字和注各一行 13px
 * 灰）；左下角是页面的 `footnote`（「图为 AI 生成的示意图」）。右边 560 宽
 * 满高一张照片（页面自己的 `background` 资产），左页盖住照片的其余部分。
 *
 * 不画 motif，不画页脚（共享页脚只上内容页），不画索引签。零 theme id、零 hex。
 */

const LEFT = 64
const PAGE_W = 720
const DATE = { top: 64, size: 14, lineHeight: 20 } as const
const KICKER = { top: 228, h: 34, size: 15, tracking: 2, pad: 21 } as const
const TITLE = { top: 282, size: 50, lineHeight: 66, minPt: 36, w: 640 } as const
const SUB = { top: 360, size: 20, lineHeight: 30, maxLines: 1, w: 620 } as const
const RULE = { y: 440, w: 600 } as const
const FACTS = { pitch: 208, value: { top: 466, size: 26, lineHeight: 36, w: 200 }, label: { top: 508, size: 13, lineHeight: 20, w: 200 }, max: 3 } as const
const CAPTION = { top: 640, size: 12, lineHeight: 20, w: 600 } as const

/** Why the cover cannot set `block` as its facts, or undefined when it can: it sets each as its figure and its label, the note under it. */
function factsLeftOut(block: Component): string | undefined {
  return block.type === "kpi_cards" ? fieldsLeftOut(block, "the cover sets each fact as its figure and its label, with its note under it", { items: ["icon", "delta", "tag", "tone", "source"] }) : undefined
}

export function BinderCover({ ir, slide, ctx }: SvgTemplateProps) {
  const inks = binderInks(ctx)
  const photo = slide.background?.kind === "asset" ? ctx.images?.[slide.background.asset_id] : undefined
  const date = ir.meta.date?.trim() ? fitBinder(ir.meta.date, { width: PAGE_W - LEFT * 2, size: DATE.size, lineHeight: DATE.lineHeight, maxLines: 1, bold: true }, ctx) : null
  const kicker = slide.kicker?.trim() ? stripEmphasis(slide.kicker).trim() : ""
  const kickerW = kicker ? Math.round(binderTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx, true) + KICKER.tracking + KICKER.pad * 2) : 0
  const title = fitDossierTitle(slide.heading, ctx, TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w)
  const titleInk = binderText(inks.deep, inks.ground, title.fontSize)
  // The title's first line stands where the board set its one line; a second runs on under it.
  const titleBase = binderBaseline(TITLE.top, TITLE.lineHeight, title.fontSize)
  const drop = Math.max(0, title.lines.length - 1) * TITLE.lineHeight
  const sub = slide.subheading?.trim() ? fitBinder(slide.subheading, { width: SUB.w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const facts = boundarySlotBlock(slide, ["kpi_cards"]) as Kpis | undefined
  const factItems = (facts?.items ?? []).map((it) => ({
    value: fitBinder(stripEmphasis(it.value) + (it.unit ? ` ${it.unit}` : ""), { width: FACTS.value.w, size: FACTS.value.size, lineHeight: FACTS.value.lineHeight, maxLines: 1, bold: true }, ctx),
    label: fitBinder(it.note?.trim() ? `${it.label.trim()}\n${it.note.trim()}` : it.label, { width: FACTS.label.w, size: FACTS.label.size, lineHeight: FACTS.label.lineHeight, maxLines: 2 }, ctx),
    it,
  }))
  const factsFit = facts !== undefined && factItems.length <= FACTS.max && factItems.every((f) => f.value && f.label) && factsLeftOut(facts) === undefined
  const caption = slide.footnote?.trim() ? fitBinder(slide.footnote, { width: CAPTION.w, size: CAPTION.size, lineHeight: CAPTION.lineHeight, maxLines: 1 }, ctx) : null
  return (
    <>
      <rect data-binder-paper="" x={0} y={0} width={1280} height={720} fill={inks.ground} />
      {photo?.src ? (
        <image data-binder-cover-photo="" href={photo.src} x={PAGE_W} y={0} width={1280 - PAGE_W} height={720} preserveAspectRatio="xMidYMid slice" aria-label={photo.alt || undefined} />
      ) : null}
      {date ? <g data-binder-date="">{paintBinder(date, { ctx, x: LEFT, top: DATE.top, bold: true, fill: binderText(inks.muted, inks.ground, DATE.size) })}</g> : null}
      {ir.meta.date?.trim() && !date ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      {kicker ? (
        <g data-binder-lead="kicker">
          <rect x={LEFT} y={KICKER.top} width={kickerW} height={KICKER.h} rx={KICKER.h / 2} fill={inks.fire} />
          {paintBinderTracked({ ctx, text: kicker, x: LEFT + kickerW / 2 + KICKER.tracking / 2, y: binderBaseline(KICKER.top, KICKER.h, KICKER.size), size: KICKER.size, tracking: KICKER.tracking, bold: true, anchor: "middle", fill: binderText(inks.onFire, inks.fire, KICKER.size) })}
        </g>
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
      {sub ? <g data-binder-cover-sub="">{paintBinder(sub, { ctx, x: LEFT, top: SUB.top + drop, fill: binderText(inks.muted, inks.ground, SUB.size) })}</g> : null}
      {slide.subheading?.trim() && !sub ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      <rect x={LEFT} y={RULE.y + drop} width={RULE.w} height={1} fill={inks.line} />
      {facts ? (
        factsFit ? (
          <g {...blockTag(ctx, facts)} data-binder-facts="">
            {factItems.map((f, i) => {
              const x = LEFT + i * FACTS.pitch
              return (
                <g key={i}>
                  {paintBinder(f.value!, { ctx, x, top: FACTS.value.top + drop, bold: true, fill: binderText(inks.deep, inks.ground, FACTS.value.size) })}
                  {paintBinder(f.label!, { ctx, x, top: FACTS.label.top + drop, fill: binderText(inks.muted, inks.ground, FACTS.label.size) })}
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
  // left with the date, a brick-red chip naming who it is for, the title, the
  // line under it and three figures under a hairline; the page's photograph
  // down the right 560px.
  id: "binder-cover",
  kind: "standard",
  story: {
    name: "Binder Cover",
    story: "A white proposal page beside a photograph of the client's own kind of site: the date, a chip saying who the proposal is for, the title in petrol, its line, and the three figures the proposal stands on.",
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
  // Over the date, in the page's left column.
  coverMark: { x: LEFT, y: 40 },
  headingFit: { maxWidth: TITLE.w, fontSize: TITLE.size, maxLines: 2, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: dossierTitleSet(TITLE.size, TITLE.lineHeight, TITLE.minPt, TITLE.w),
} satisfies LayoutDefinition
