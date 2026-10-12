import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { BINDER_SPEC, binderInks, binderMeta, binderText, binderWidth } from "../layouts/compositions/binder"
import { BINDER_FOOT, BINDER_LEFT, BINDER_RIGHT, BinderLabelLine, RUNNING_HEAD, binderFolioParts, binderStageLine, binderStageWidth } from "../layouts/binder-shared"

/**
 * proposal-motif —— 提案书的书眉标签与页码，proposal 2026-10 印刷版定稿（设计源
 * `design/rounds/2026-10-06-proposal/`）。
 *
 * 书眉左端（内容页，deck 要页脚时）：一行 deck 的标签（`footer.label`，
 * 「屋顶光伏与储能方案 · 呈 贵司管理层」），13px 灰色常规体，右边给书眉右端
 * 的段落名（脸画的「算账」）留出 24px。书眉下的细线也是脸画的。
 *
 * 页脚（内容页）：右下角页码，13px 墨色粗体，右对齐在 x1216，前面是草稿和保密
 * 标记；左下是发文单位（`meta.organization`）和 `footer.notice`，11px 灰。页码是
 * PowerPoint 的页码字段，挪页时自己会变。本 motif 在 `footer-roles.ts` 里记为
 * `"row"`：页脚这一行（连同 `label`）由它来印，共享页脚让位。页码和其余标记
 * 只上内容页，跟全 deck 的页脚规矩一致。来源是脸画的，落在这一行的左端，有
 * 发文单位时落在它上面一行。
 *
 * 封面、章节页和结尾页的脸自己画全，不要 motif。小字带 `binder-spec` 豁免。
 * 零 theme id、零 hex。
 */

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function ProposalMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const stageW = binderStageWidth(binderStageLine(ir, slide), ctx)
  return (
    <>
      {footer.label ? (
        <DecorPiece id="label" role="structure">
          <BinderLabelLine text={footer.label} ctx={ctx} right={BINDER_RIGHT - (stageW > 0 ? stageW + RUNNING_HEAD.gap : 0)} />
        </DecorPiece>
      ) : null}
      <DecorPiece id="folio" role="structure">
        <ProposalFolio {...props} footer={footer} />
      </DecorPiece>
    </>
  )
}

/** The folio: the organization and the notice at the left, the page number at the right, a slide-number field. */
function ProposalFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = binderInks(ctx)
  const meta = binderMeta(inks.muted, inks.ground)
  const y = BINDER_FOOT.baseline
  const text = (content: string, x: number, anchor: "start" | "end", size: number, bold: boolean, fill: string, extra: Record<string, string> = {}) => (
    <text
      {...BINDER_SPEC}
      {...extra}
      x={x}
      y={y}
      textAnchor={anchor === "end" ? "end" : undefined}
      fontFamily={bold ? ctx.fonts.heading : ctx.fonts.body}
      fontSize={size}
      fontWeight={bold ? "700" : undefined}
      fill={fill}
      dominantBaseline="alphabetic"
    >
      {content}
    </text>
  )
  const { left, right } = binderFolioParts(footer)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const number = String(pageIndex + 1)
  const numberLeft = BINDER_RIGHT - binderWidth(number, BINDER_FOOT.folio, ctx, true)
  return (
    <g data-footer="row">
      {left ? text(left, BINDER_LEFT, "start", BINDER_FOOT.size, false, meta) : null}
      {right ? text(right, footer.pageNumber ? numberLeft - BINDER_FOOT.gap : BINDER_RIGHT, "end", BINDER_FOOT.size, false, meta) : null}
      {footer.pageNumber ? <g data-binder-folio="">{text(number, BINDER_RIGHT, "end", BINDER_FOOT.folio, true, binderText(inks.ink, inks.ground, BINDER_FOOT.folio), { "data-field": SLIDE_NUMBER_FIELD })}</g> : null}
    </g>
  )
}
