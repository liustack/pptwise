import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { BINDER_SPEC, binderBaseline, binderInks, binderMeta, binderWidth } from "../layouts/compositions/binder"
import { BinderLabelLine } from "../layouts/binder-shared"

/**
 * proposal-motif —— 提案书的页眉标签与页码，proposal 2026-10 定稿（设计源
 * `design/rounds/2026-10-06-proposal/`）。
 *
 * 页眉（内容页，deck 要页脚时）：左上一行 deck 的标签（`footer.label`，
 * 「屋顶光伏与储能方案 · 呈 贵司管理层」），12px 粗体、字距 1px，第一个
 * 「 · 」之前石油蓝，之后灰。
 *
 * 页脚（内容页）：右下角页码，13px 灰色粗体，右对齐在 x1196（右缘留给活页夹
 * 的索引签），前面是草稿和保密标记；左下是发文单位（`meta.organization`）和
 * `footer.notice`。页码是 PowerPoint 的页码字段，挪页时自己会变。本 motif 在
 * `footer-roles.ts` 里记为 `"row"`：页脚这一行（连同 `label`）由它来印，共享
 * 页脚让位。页码和其余标记只上内容页，跟全 deck 的页脚规矩一致。
 *
 * 封面、章节页和结尾页的脸自己画全，不要 motif。小字带 `binder-spec` 豁免。
 * 零 theme id、零 hex。
 */

const LEFT = 64
const RIGHT = 1196
const FOLIO = { top: 678, lineHeight: 20, size: 13, groupGap: 24, quiet: 12 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function ProposalMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  return (
    <>
      {footer.label ? (
        <DecorPiece id="label" role="structure">
          <BinderLabelLine text={footer.label} ctx={ctx} />
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
  const y = binderBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)
  const quietY = binderBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.quiet)
  const text = (content: string, x: number, anchor: "start" | "end", size: number, baseline: number, bold: boolean, extra: Record<string, string> = {}) => (
    <text {...BINDER_SPEC} {...extra} x={x} y={baseline} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={bold ? ctx.fonts.heading : ctx.fonts.body} fontSize={size} fontWeight={bold ? "700" : undefined} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const leftText = [footer.organization, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const rightText = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const number = String(pageIndex + 1)
  const numberLeft = RIGHT - binderWidth(number, FOLIO.size, ctx, true)
  return (
    <g data-footer="row">
      {leftText ? text(leftText, LEFT, "start", FOLIO.quiet, quietY, false) : null}
      {rightText ? text(rightText, footer.pageNumber ? numberLeft - FOLIO.groupGap : RIGHT, "end", FOLIO.quiet, quietY, false) : null}
      {footer.pageNumber ? <g data-binder-folio="">{text(number, RIGHT, "end", FOLIO.size, y, true, { "data-field": SLIDE_NUMBER_FIELD })}</g> : null}
    </g>
  )
}
