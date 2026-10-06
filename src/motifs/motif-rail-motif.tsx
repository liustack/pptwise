import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { MANUSCRIPT_SPEC, manuscriptBaseline, manuscriptInks, manuscriptMeta, manuscriptTrackedWidth, paintManuscriptTracked } from "../layouts/compositions/manuscript"
import { MANUSCRIPT_LEFT, MANUSCRIPT_RIGHT, MANUSCRIPT_W } from "../layouts/manuscript-shared"

/**
 * rail-motif v4 —— 论文书页的页眉标签与页码，thesis 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-06-thesis/`）。v3 只在封面画一条开卷金线，随定稿
 * 退役：题名页的金线归封面版式自己画。
 *
 * 页眉（内容页，deck 要页脚时）：左上一行 deck 的标签（`footer.label`，
 * 「硕士学位论文开题报告」），12px 灰色粗体、字距 3px，跟右上的分节号（脸画
 * 的，页面的 `stage`）和下面的金线（脸画的）是同一行书眉。
 *
 * 页脚（内容页）：页码居中在底部，13px 衬线灰色，像书页的页码；左下是发文
 * 单位（`meta.organization`）和 `footer.notice`，右下是草稿和保密标记，11px
 * 灰。页码是 PowerPoint 的页码字段，挪页时自己会变。本 motif 在
 * `footer-roles.ts` 里记为 `"row"`：页脚这一行（连同 `label`）由它来印，共享
 * 页脚让位。页码和其余标记只上内容页，跟全 deck 的页脚规矩一致。
 *
 * 封面、章节页和结尾页的脸自己画全，不要 motif。小字带 `manuscript-spec`
 * 豁免。零 theme id、零 hex。
 */

const LABEL = { top: 26, lineHeight: 18, size: 12, tracking: 3 } as const
const FOLIO = { top: 684, lineHeight: 20, size: 13, quiet: 11, center: 640 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function RailMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const inks = manuscriptInks(ctx)
  // The label keeps to the left half: the section stands at the right of the same line.
  const labelFits = footer.label !== null && manuscriptTrackedWidth(footer.label, LABEL.size, LABEL.tracking, ctx, { bold: true }) <= MANUSCRIPT_W / 2 - 24
  return (
    <>
      {footer.label ? (
        <DecorPiece id="label" role="structure">
          {labelFits ? (
            <g data-manuscript-running-label="">
              {paintManuscriptTracked({ ctx, text: footer.label, x: MANUSCRIPT_LEFT, y: manuscriptBaseline(LABEL.top, LABEL.lineHeight, LABEL.size), size: LABEL.size, tracking: LABEL.tracking, bold: true, fill: manuscriptMeta(inks.muted, inks.ground) })}
            </g>
          ) : (
            <g data-dropped={1} data-dropped-kind="label" />
          )}
        </DecorPiece>
      ) : null}
      <DecorPiece id="folio" role="structure">
        <RailFolio {...props} footer={footer} />
      </DecorPiece>
    </>
  )
}

/** The folio: the page number centred at the foot, the organization and notice at the left, the draft and confidentiality marks at the right. */
function RailFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = manuscriptInks(ctx)
  const meta = manuscriptMeta(inks.muted, inks.ground)
  const quietY = manuscriptBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.quiet)
  const leftText = [footer.organization, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const rightText = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const quiet = (content: string, x: number, anchor: "start" | "end") => (
    <text {...MANUSCRIPT_SPEC} x={x} y={quietY} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.quiet} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  return (
    <g data-footer="row">
      {leftText ? quiet(leftText, MANUSCRIPT_LEFT, "start") : null}
      {rightText ? quiet(rightText, MANUSCRIPT_RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-manuscript-folio="">
          <text
            {...MANUSCRIPT_SPEC}
            data-field={SLIDE_NUMBER_FIELD}
            x={FOLIO.center}
            y={manuscriptBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size, true)}
            textAnchor="middle"
            fontFamily={ctx.fonts.heading}
            fontSize={FOLIO.size}
            fill={meta}
            dominantBaseline="alphabetic"
          >
            {String(pageIndex + 1)}
          </text>
        </g>
      ) : null}
    </g>
  )
}
