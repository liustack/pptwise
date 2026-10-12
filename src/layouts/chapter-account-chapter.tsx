import type { Component } from "@/ir"
import type { LayoutDefinition } from "./registry"
import type { SvgTemplateProps } from "./types"
import { resolveDeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { stageIndex } from "../render/course-marks"
import { blockTag } from "./compositions/shared"
import { boundarySlotBlock, fieldsLeftOut } from "./boundary-content"
import { paintPortraitPhoto, splitFigure } from "./compositions/portrait"
import {
  accountBaseline,
  accountFigureWidth,
  accountInks,
  accountMarkWidth,
  accountText,
  accountTrackedWidth,
  figureBaseline,
  figureValueWidth,
  fitAccount,
  isFigure,
  markOfRow,
  paintAccount,
  paintAccountFigure,
  paintAccountMark,
  paintAccountRule,
  paintAccountTracked,
  SECTION,
} from "./compositions/account"
import { AccountFooter, accountFooterLabel } from "./account-shared"
import type { HeadingCtx } from "./heading-set"
import { fitKeynoteClaim } from "./keynote-shared"

type Rows = Extract<Component, { type: "row_cards" }>

/**
 * account-chapter：述职的分节页，recap 2026-10 定稿（p05、p12）。
 *
 * 右边 x700 起满高一张照片（页面的 `background` 资产），没有照片时左栏放宽
 * 到整版。左栏 x80 起、宽 560：y72 起这一节的序号，两位数，主题数字字体
 * 120px 门面色（deck `course` 里这一段的位置，没有 course 时按分节页的先后
 * 数），数字右边同一基线是这一段在 course 里的名字，14px 灰、字距 0.14em
 * （和内容页的分节行一个口气），下面是这一节的题目（`heading`）44px 特粗，再下面一行 `subheading`
 * 18px 灰。y420 一根 2px 墨线下是这一节要讲的几件事（页面的 `row_cards`），
 * 每行 62px：序号、标题 17px 粗体。每件的 `text` 都是一个数时数字靠右排在
 * 数字字体里，`sub` 作图例小字排在标题下；否则 `text` 跟在 80px 的标题栏
 * 后面，`sub` 作图例靠右。图例的样子由 `highlight`（自己牵头的，实心门面色
 * 方块）和 `tone`（warning 待批是空心方框、danger 失误是红叉、success 完成
 * 是对勾）决定，都没有时是空心灰方块。页脚在左栏：deck 的标签和页码。
 *
 * 不画 motif。零 theme id、零 hex。
 */

const LEFT = 80
const PHOTO = { x: 700, y: 0, w: 580, h: 720, focus: [0.45, 0.5] as const }
const COLUMN_W = 560
const FULL_W = 1120
const NUMBER = { top: 72, size: 120, lineHeight: 108, stageGap: 20 } as const
const TITLE = { gap: 28, size: 44, lineHeight: 57, maxLines: 2, minPt: 40 } as const
const SUB = { gap: 10, size: 18, lineHeight: 28, maxLines: 2 } as const
const LIST = { top: 420, rule: 2, row: 62, max: 4, numW: 34, labelW: 80, figureW: 120, figureMax: 200, num: 18, title: 17, text: 16, chip: { size: 12, gap: 2 }, figure: { size: 24, unit: 13, gap: 3 } } as const

/** Why the chapter cannot set `block` as its list, or undefined when it can. */
function rowsLeftOut(block: Component): string | undefined {
  return block.type === "row_cards" ? fieldsLeftOut(block, "the chapter sets each row as its number, its title, its text or figure and a legend mark from its sub", { items: ["icon"] }) : undefined
}

/** The title heavy at 44px, broken at a comma or a colon when it does not fit one line. */
function fitTitle(heading: string, ctx: HeadingCtx, w: number) {
  return fitKeynoteClaim(heading, ctx, w, TITLE.size, TITLE.lineHeight, TITLE.maxLines, TITLE.minPt)
}

/** The chapter's number: the place of its stage in the deck's course, else its place among the chapters. */
export function chapterNumber(ir: SvgTemplateProps["ir"], slide: SvgTemplateProps["slide"]): string {
  const at = ir.course && slide.stage ? stageIndex(ir.course, slide.stage) : -1
  const n = at >= 0 ? at + 1 : ir.slides.filter((s) => s.type === "chapter").findIndex((s) => s === slide) + 1
  return String(Math.max(1, n)).padStart(2, "0")
}

export function AccountChapter({ ir, slide, ctx, index }: SvgTemplateProps) {
  const inks = accountInks(ctx)
  const ground = inks.ground
  const photo = slide.background?.kind === "asset" ? slide.background.asset_id : undefined
  const w = photo ? COLUMN_W : FULL_W
  const number = chapterNumber(ir, slide)
  // The part's name from the course, beside its number on the number's
  // baseline in the content pages' section-line voice.
  const at = ir.course && slide.stage ? stageIndex(ir.course, slide.stage) : -1
  const stage = at >= 0 ? stripEmphasis(ir.course!.stages[at]!.label).trim() : ""
  const stageX = LEFT + figureValueWidth(number, NUMBER.size, ctx) + NUMBER.stageGap
  const stageFits = !stage || stageX + accountTrackedWidth(stage, SECTION.size, SECTION.tracking, ctx) <= LEFT + w
  const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx, w) : null
  const titleFits = !title || (!title.truncated && title.lines.length <= TITLE.maxLines)
  const titleTop = NUMBER.top + NUMBER.lineHeight + TITLE.gap
  const sub = slide.subheading?.trim() ? fitAccount(slide.subheading, { width: w, size: SUB.size, lineHeight: SUB.lineHeight, maxLines: SUB.maxLines }, ctx) : null
  const subTop = titleTop + (title && titleFits ? title.lines.length * TITLE.lineHeight : 0) + SUB.gap
  const rows = boundarySlotBlock(slide, ["row_cards"]) as Rows | undefined
  const items = rows?.items ?? []
  const figures = items.length > 0 && items.every((it) => it.text?.trim() && isFigure(it.text))
  // The figures' column: as wide as the widest figure, 120px at least.
  const figureW = figures ? Math.max(LIST.figureW, ...items.map((it) => { const f = splitFigure(it.text!); return Math.ceil(accountFigureWidth(f.value, f.unit, LIST.figure, ctx)) })) : LIST.figureW
  const laid = items.map((it) => {
    const kind = markOfRow(it)
    const chip = it.sub?.trim() ? { text: stripEmphasis(it.sub).trim(), kind } : null
    if (figures) {
      const figure = splitFigure(it.text!)
      const titleW = w - LIST.numW - figureW - 12
      const t = fitAccount(it.title, { width: titleW, size: LIST.title, lineHeight: 22, maxLines: 1, bold: true }, ctx)
      const fits = t !== null && figureW <= LIST.figureMax && (!chip || accountMarkWidth(chip.text, kind, LIST.chip.size, ctx) <= titleW)
      return { it, chip, figure, title: t, text: null, fits }
    }
    const chipW = chip ? accountMarkWidth(chip.text, kind, 13, ctx) + 16 : 0
    const t = fitAccount(it.title, { width: LIST.labelW - 8, size: LIST.title, lineHeight: 22, maxLines: 1, bold: true }, ctx)
    const text = it.text?.trim() ? fitAccount(it.text, { width: w - LIST.numW - LIST.labelW - chipW, size: LIST.text, lineHeight: 22, maxLines: 1 }, ctx) : null
    const fits = t !== null && (!it.text?.trim() || text !== null)
    return { it, chip, figure: null, title: t, text, fits }
  })
  const listBottom = LIST.top + LIST.rule + items.length * LIST.row
  const listFits = rows !== undefined && items.length <= LIST.max && laid.every((r) => r.fits) && rowsLeftOut(rows) === undefined && subTop + (sub ? sub.lines.length * SUB.lineHeight : 0) <= LIST.top - 16 && listBottom <= 660
  const footer = resolveDeckFooter(ir)
  return (
    <>
      <rect data-account-paper="" x={0} y={0} width={1280} height={720} fill={ground} />
      {photo ? paintPortraitPhoto(photo, PHOTO, ctx, { focus: PHOTO.focus }) : null}
      <text data-account-chapter-number={number} x={LEFT} y={figureBaseline(NUMBER.top, NUMBER.lineHeight, NUMBER.size)} fontFamily={ctx.fonts.figure} fontSize={NUMBER.size} fontWeight="700" fill={accountText(inks.lead, ground, NUMBER.size)} dominantBaseline="alphabetic">
        {number}
      </text>
      {stage && stageFits ? <g data-account-chapter-stage={stage}>{paintAccountTracked({ ctx, text: stage, x: stageX, y: figureBaseline(NUMBER.top, NUMBER.lineHeight, NUMBER.size), size: SECTION.size, tracking: SECTION.tracking, fill: accountText(inks.muted, ground, SECTION.size) })}</g> : null}
      {title && titleFits ? <g data-account-chapter-title="">{paintAccount(title, { ctx, x: LEFT, top: titleTop, serif: true, bold: true, fill: accountText(inks.ink, ground, title.fontSize), lit: inks.ink })}</g> : null}
      {sub ? <g data-account-chapter-sub="">{paintAccount(sub, { ctx, x: LEFT, top: subTop, fill: accountText(inks.muted, ground, SUB.size) })}</g> : null}
      {rows ? (
        listFits ? (
          <g {...blockTag(ctx, rows)} data-account-chapter-list="">
            {paintAccountRule(LEFT, LEFT + w, LIST.top + LIST.rule / 2, inks.ink, LIST.rule)}
            {laid.map((r, i) => {
              const top = LIST.top + LIST.rule + i * LIST.row
              const mid = top + LIST.row / 2
              const numBase = figureBaseline(mid - 11, 22, LIST.num)
              const titleX = LEFT + LIST.numW
              return (
                <g key={i} data-account-chapter-row={stripEmphasis(r.it.title)}>
                  <text x={LEFT} y={numBase} fontFamily={ctx.fonts.figure} fontSize={LIST.num} fontWeight="700" fill={accountText(inks.muted, ground, LIST.num)} dominantBaseline="alphabetic">
                    {String(i + 1)}
                  </text>
                  {r.figure ? (
                    <>
                      {paintAccount(r.title!, { ctx, x: titleX, top: r.chip ? mid - 20 : mid - 11, bold: true, fill: accountText(inks.ink, ground, LIST.title) })}
                      {r.chip ? paintAccountMark({ ctx, kind: r.chip.kind, text: r.chip.text, x: titleX, baseline: accountBaseline(mid + 2, 18, LIST.chip.size), size: LIST.chip.size }) : null}
                      {paintAccountFigure({ ctx, value: r.figure.value, unit: r.figure.unit, x: LEFT + w, anchor: "end", baseline: figureBaseline(mid - 12, 24, LIST.figure.size), spec: LIST.figure, fill: accountText(inks.ink, ground, LIST.figure.unit) })}
                    </>
                  ) : (
                    <>
                      {paintAccount(r.title!, { ctx, x: titleX, top: mid - 11, bold: true, fill: accountText(inks.ink, ground, LIST.title) })}
                      {r.text ? paintAccount(r.text, { ctx, x: titleX + LIST.labelW, top: mid - 11, fill: accountText(inks.ink, ground, LIST.text) }) : null}
                      {r.chip ? paintAccountMark({ ctx, kind: r.chip.kind, text: r.chip.text, x: LEFT + w, anchor: "end", baseline: accountBaseline(mid - 10, 20, 13), size: 13 }) : null}
                    </>
                  )}
                  {paintAccountRule(LEFT, LEFT + w, top + LIST.row - 0.5, inks.line, 1)}
                </g>
              )
            })}
          </g>
        ) : (
          <g data-dropped={items.length} data-dropped-kind="item" />
        )
      ) : null}
      <AccountFooter ctx={ctx} label={accountFooterLabel(footer) || null} speaker={null} folio={footer.pageNumber ? index + 1 : null} x1={LEFT} x2={LEFT + w} />
      {!titleFits || !stageFits || (slide.subheading?.trim() && !sub) ? <g data-dropped={1} data-dropped-kind="label" /> : null}
    </>
  )
}

export const layoutDef = {
  // chapter-account-chapter.tsx: recap's section page. The part's number
  // large in the accent, its title heavy, a line under it, and under a black
  // rule the few things the part will cover, a photograph down the right.
  id: "account-chapter",
  kind: "standard",
  story: {
    name: "Account Chapter",
    story: "A divider in a year's account: the part's number large in the theme colour, its title in one heavy line, and under a black rule the two or three things the part will cover, each with its figure or its state, beside a photograph of the work.",
    positioning: "Opens each part of a year-end review. Choose it when the reviewers should know what is coming and how much rides on it before the detail.",
    audience: "A review panel following one person's account part by part.",
    notFor: "A long report with many short sections, where a divider this full between every part slows the reading.",
  },
  slideTypes: ["chapter"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: ["row_cards"], capacity: 1, itemCapacity: LIST.max, declines: rowsLeftOut },
  ],
  pageFields: ["stage"],
  drawsPhoto: true,
  suppressMotif: true,
  paintsOwnBackground: true,
  headingFit: { maxWidth: COLUMN_W, fontSize: TITLE.size, maxLines: TITLE.maxLines, minPt: TITLE.minPt, bold: true, lineHeightRatio: TITLE.lineHeight / TITLE.size },
  // The column widens to the whole measure when the page has no photograph.
  headingSet: ({ slide, ctx }) => {
    const w = slide.background?.kind === "asset" ? COLUMN_W : FULL_W
    const title = slide.heading?.trim() ? fitTitle(slide.heading, ctx, w) : null
    return !title || (!title.truncated && title.lines.length <= TITLE.maxLines) ? "whole" : "declined"
  },
} satisfies LayoutDefinition
