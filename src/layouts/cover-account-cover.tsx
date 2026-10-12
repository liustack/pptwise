import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { stripEmphasis } from "../render/emphasis"
import { coverConfidentialityText, resolveDeckFooter } from "../render/footer-marks"
import { blockTag } from "./compositions/shared"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { paintPortraitPhoto, splitFigure } from "./compositions/portrait"
import {
  ACCOUNT_META,
  ACCOUNT_SPEC,
  accountBaseline,
  accountFigureWidth,
  accountInks,
  accountMarkWidth,
  accountMeta,
  accountText,
  accountTrackedWidth,
  accountWidth,
  fitAccount,
  figureBaseline,
  markOfTag,
  paintAccount,
  paintAccountFigure,
  paintAccountLine,
  paintAccountMark,
  paintAccountRule,
  paintAccountTracked,
  wholeLit,
} from "./compositions/account"
import { FOOTER, accountFooterLabel } from "./account-shared"
import type { HeadingCtx } from "./heading-set"
import { fitKeynoteClaim } from "./keynote-shared"

type Image = Extract<Component, { type: "image" }>
type Kpis = Extract<Component, { type: "kpi_cards" }>

/**
 * account-cover：述职的封面，recap 2026-10 定稿（p01）。
 *
 * 顶上 280px 满宽一条照片（页面的 `background` 资产或第一个 `image`，可带
 * `crop`）。封面要印左上角的密级或保密标记时，照片从 y72 起，上面留一条纸色
 * 给标记（基线 y44）。照片下 y316 一行：左边是场合（页面的 `kicker`，15px 粗体、字距
 * 0.18em、深门面色），右边是日期（`meta.date`，14px 灰）。y346 起是一句话
 * 的结论（`heading`）44px 特粗，一行放不下在逗号处折成两行，有 `subheading`
 * 时结论下一行 18px 灰（一行放不下就整句不画并标出）。再下一根 2px
 * 墨线，线下左栏是述职人的几行信息（页面的 `fields`，标签 13px 灰占 88px，
 * 值 16px，第一行加粗），右栏三格关键数（页面的 `kpi_cards`，数字用主题的
 * 数字字体 56px，单位 16px，标签 14px 灰；作者整段标出的数是门面色，带
 * `tag` 的格在标签下印一枚图例小方块）。左下角 12px 灰是 deck 的标签。
 *
 * 不画 motif，不印页码。零 theme id、零 hex。
 */

const LEFT = 80
const W = 1120
const PHOTO = { x: 0, y: 0, w: 1280, h: 280, focus: [0.5, 0.55] as const }
const MARK = { strip: 72, x: LEFT, y: 44 } as const
const KICKER = { baseline: 333, size: 15, tracking: 2.7, dateSize: 14 } as const
const TITLE = { top: 346, size: 44, lineHeight: 57, maxLines: 2, minPt: 40 } as const
const SUB = { gap: 6, size: 18, lineHeight: 26 } as const
const RULE = { gap: 27, h: 2 } as const
const FIELDS = { gap: 20, x: LEFT, w: 500, labelW: 88, label: 13, value: 16, lineHeight: 24, rowGap: 12 } as const
const FACTS = { x: 620, w: 580, gap: 24, max: 3, value: { size: 56, unit: 16, gap: 4 }, between: 6, label: { size: 14, lineHeight: 20, maxLines: 2 }, chip: { size: 13, lineHeight: 20 } } as const

/** Why the cover cannot set `block` as its facts, or undefined when it can: each is its figure and unit, its label and a legend mark. */
function factsLeftOut(block: Component): string | undefined {
  return block.type === "kpi_cards" ? fieldsLeftOut(block, "the cover sets each fact as its figure and unit, its label and a legend mark from its tag", { items: ["icon", "delta", "source", "note"] }) : undefined
}

/** The claim heavy at 44px: on one line down to 40px, else over two broken at a comma or a colon. */
function fitTitle(heading: string, ctx: HeadingCtx) {
  const layout = fitKeynoteClaim(heading, ctx, W, TITLE.size, TITLE.lineHeight, TITLE.maxLines, TITLE.minPt)
  return { ...layout, truncated: layout.truncated || layout.lines.length > TITLE.maxLines }
}

export function AccountCover({ ir, slide, ctx, page }: SvgTemplateProps) {
  const inks = accountInks(ctx)
  const ground = inks.ground
  const image = slide.components.find((c) => c.type === "image") as Image | undefined
  const asset = image?.asset_id ?? (slide.background?.kind === "asset" ? slide.background.asset_id : undefined)
  const kicker = stripEmphasis(slide.kicker ?? "").trim()
  const date = stripEmphasis(ir.meta.date ?? "").trim()
  const kickerFits = !kicker || accountTrackedWidth(kicker, KICKER.size, KICKER.tracking, ctx, { bold: true }) + (date ? accountWidth(date, KICKER.dateSize, ctx) + 24 : 0) <= W
  const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
  const titleLines = title && !title.truncated ? title.lines.length : 1
  const sub = slide.subheading?.trim() ? fitAccount(slide.subheading, { width: W, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: 1 }, ctx) : null
  const subTop = TITLE.top + titleLines * TITLE.lineHeight + SUB.gap
  const ruleY = (sub ? subTop + SUB.lineHeight : TITLE.top + titleLines * TITLE.lineHeight) + RULE.gap
  const gridTop = ruleY + RULE.h + FIELDS.gap
  // The fields: a label in the grey and its value, the first value bold.
  const fields = (slide.fields ?? []).map((f, i) => ({
    label: stripEmphasis(f.label).trim(),
    value: fitAccount(f.note?.trim() ? `${f.value.trim()}\u3000${f.note.trim()}` : f.value, { width: FIELDS.w - FIELDS.labelW, size: FIELDS.value, lineHeight: FIELDS.lineHeight, maxLines: 1, bold: i === 0 }, ctx),
  }))
  const fieldsFit = fields.every((f) => f.value && accountWidth(f.label, FIELDS.label, ctx) <= FIELDS.labelW - 8)
  const facts = boundarySlotBlock(slide, ["kpi_cards"]) as Kpis | undefined
  const n = facts?.items.length ?? 0
  const colW = n > 0 ? (FACTS.w - FACTS.gap * (n - 1)) / n : FACTS.w
  const factItems = (facts?.items ?? []).map((it) => {
    const figure = splitFigure(it.value, it.unit)
    return {
      it,
      figure,
      lit: wholeLit(it.value),
      fits: accountFigureWidth(figure.value, figure.unit, FACTS.value, ctx) <= colW,
      label: fitAccount(it.label, { width: colW, size: FACTS.label.size, lineHeight: FACTS.label.lineHeight, maxLines: FACTS.label.maxLines }, ctx),
      chip: it.tag && accountMarkWidth(it.tag.text, markOfTag(it.tag), FACTS.chip.size, ctx) <= colW ? it.tag : undefined,
    }
  })
  const factsFit = facts !== undefined && n <= FACTS.max && factItems.every((f) => f.fits && f.label && (!f.it.tag || f.chip)) && factsLeftOut(facts) === undefined
  const footer = page?.footer ?? resolveDeckFooter(ir)
  // A cover that owes the top-left mark keeps a strip of paper above the photograph for it.
  const marked = page?.metadataOn !== false && Boolean(footer.classification ?? coverConfidentialityText(footer))
  const photoTop = marked ? MARK.strip : PHOTO.y
  // The cover's mark prints the confidentiality line wherever the deck places it, so the label leaves it out.
  const label = [accountFooterLabel(footer, { confidentiality: false }), stripEmphasis(slide.footnote ?? "").trim()].filter(Boolean).join("　")
  const labelFits = !label || accountWidth(label, FOOTER.size, ctx) <= W
  const fieldsBottom = gridTop + fields.length * (FIELDS.lineHeight + FIELDS.rowGap) - FIELDS.rowGap
  const factsBottom = gridTop + FACTS.value.size + FACTS.between + Math.max(1, ...factItems.map((f) => f.label?.lines.length ?? 1)) * FACTS.label.lineHeight + (factItems.some((f) => f.chip) ? FACTS.chip.lineHeight : 0)
  const room = Math.max(fieldsBottom, factsBottom) <= FOOTER.baseline - 30
  return (
    <>
      <rect data-account-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {asset ? paintPortraitPhoto(asset, { ...PHOTO, y: photoTop, h: PHOTO.h - photoTop }, ctx, { crop: image?.crop, focus: PHOTO.focus }) : null}
      {kicker && kickerFits ? (
        <g data-account-occasion={kicker}>{paintAccountTracked({ ctx, text: kicker, x: LEFT, y: KICKER.baseline, size: KICKER.size, tracking: KICKER.tracking, bold: true, fill: accountText(inks.deep, ground, KICKER.size) })}</g>
      ) : null}
      {date && kickerFits ? (
        <g data-account-date={date}>{paintAccountLine(date, { ctx, x: LEFT + W, anchor: "end", baseline: KICKER.baseline, size: KICKER.dateSize, fill: accountText(inks.muted, ground, KICKER.dateSize) })}</g>
      ) : null}
      {title && !title.truncated ? <g data-account-title="">{paintAccount(title, { ctx, x: LEFT, top: TITLE.top, serif: true, bold: true, fill: accountText(inks.ink, ground, title.fontSize), lit: inks.ink })}</g> : null}
      {sub ? <g data-account-cover-sub="">{paintAccount(sub, { ctx, x: LEFT, top: subTop, fill: accountText(inks.muted, ground, SUB.size) })}</g> : null}
      {paintAccountRule(LEFT, LEFT + W, ruleY + RULE.h / 2, inks.ink, RULE.h)}
      {fieldsFit && room ? (
        <g data-account-fields="">
          {fields.map((f, i) => {
            const top = gridTop + i * (FIELDS.lineHeight + FIELDS.rowGap)
            return (
              <g key={i} data-account-field={f.label}>
                <text {...ACCOUNT_SPEC} x={FIELDS.x} y={accountBaseline(top, FIELDS.lineHeight, FIELDS.label) + 1} fontFamily={ctx.fonts.body} fontSize={FIELDS.label} fill={accountText(inks.muted, ground, FIELDS.label)} dominantBaseline="alphabetic">
                  {f.label}
                </text>
                {paintAccount(f.value!, { ctx, x: FIELDS.x + FIELDS.labelW, top, bold: i === 0, fill: accountText(inks.ink, ground, FIELDS.value) })}
              </g>
            )
          })}
        </g>
      ) : fields.length ? (
        <g data-dropped={fields.length} data-dropped-kind="label" />
      ) : null}
      {facts ? (
        factsFit && room ? (
          <g {...blockTag(ctx, facts)} data-account-facts="">
            {factItems.map((f, i) => {
              const x = FACTS.x + i * (colW + FACTS.gap)
              const labelTop = gridTop + FACTS.value.size + FACTS.between
              const labelLines = f.label!.lines.length
              return (
                <g key={i} data-account-fact={stripEmphasis(f.it.label)} data-lit={f.lit ? "" : undefined}>
                  {paintAccountFigure({ ctx, value: f.figure.value, unit: f.figure.unit, x, baseline: figureBaseline(gridTop, FACTS.value.size, FACTS.value.size), spec: FACTS.value, fill: accountText(f.lit ? inks.lead : inks.ink, ground, FACTS.value.unit) })}
                  {paintAccount(f.label!, { ctx, x, top: labelTop, fill: accountText(inks.muted, ground, FACTS.label.size) })}
                  {f.chip ? paintAccountMark({ ctx, kind: markOfTag(f.chip), text: f.chip.text, x, baseline: accountBaseline(labelTop + labelLines * FACTS.label.lineHeight, FACTS.chip.lineHeight, FACTS.chip.size), size: FACTS.chip.size }) : null}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={facts.items.length} data-dropped-kind="item" />
        )
      ) : null}
      {label && labelFits ? (
        <text {...ACCOUNT_SPEC} {...ACCOUNT_META} data-account-label="" x={LEFT} y={FOOTER.baseline} fontFamily={ctx.fonts.body} fontSize={FOOTER.size} fill={accountMeta(inks.muted, ground)} dominantBaseline="alphabetic">
          {label}
        </text>
      ) : null}
      {(kicker && !kickerFits) || (title && title.truncated) || (slide.subheading?.trim() && !sub) || (label && !labelFits) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // cover-account-cover.tsx: recap's cover. A photograph across the top, the
  // occasion and the date, the year's conclusion in one heavy line over a
  // black rule, the speaker's particulars at the left and three figures at
  // the right.
  id: "account-cover",
  kind: "standard",
  story: {
    name: "Account Cover",
    story: "The front sheet of a year's account: a photograph of the patch across the top, the occasion and the date, the year's conclusion in one heavy line, who is reporting to whom, and the three figures the year comes down to.",
    positioning: "Opens a year-end review, a probation review or a promotion defence. Choose it when the reviewers should know the verdict and the three numbers behind it before the first page.",
    audience: "A manager, a review panel or an HR partner about to hear one person account for their year.",
    notFor: "A company's annual report or a product launch, where a single person's particulars on the cover put the wrong subject first.",
  },
  slideTypes: ["cover"],
  slots: [
    { name: "kicker", accepts: [] },
    { name: "heading", accepts: [] },
    { name: "meta", accepts: [] },
    { name: "image", accepts: ["image"], capacity: 1, selection: "first" },
    { name: "body", accepts: ["kpi_cards"], capacity: 1, itemCapacity: FACTS.max, declines: factsLeftOut },
  ],
  pageFields: ["kicker", "fields", "footnote"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  // In the strip of paper the photograph leaves above it when the cover owes the mark.
  coverMark: { x: MARK.x, y: MARK.y },
  coverMarkGround: (ctx) => accountInks(ctx).ground,
  headingFit: { maxWidth: W, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  headingSet: ({ slide, ctx }) => {
    const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx) : null
    return title && title.truncated ? "declined" : "whole"
  },
} satisfies LayoutDefinition
