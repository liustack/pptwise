import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { PERIODICAL_SPEC, periodicalBaseline, periodicalInks, periodicalMeta, periodicalWidth } from "../layouts/compositions/periodical"
import { MastheadColumn, MastheadIssue, PERIODICAL_LEFT, PERIODICAL_RIGHT } from "../layouts/periodical-shared"

/**
 * corner-ornament-motif v3 —— 期刊刊头上的栏目名与期号、页脚居中的页码，
 * journal 2026-10 定稿重画（设计源 `design/rounds/2026-10-07-journal/`）。
 *
 * **id 没改，画的东西整个换了**（同 v2 的做法：id 是注册表键，改名牵动
 * schema 与测试）。v2 的「顶缘文武双线 + 底缘单线 + 线上中点期号『№』」
 * 随定稿退役：刊头的一粗一细两条通栏线归内容页的脸画（y50、y55，和中间
 * 的分栏名同一行刊头），底缘那条线和「№」整件拿掉——「№」后面空着，读者
 * 读出来是缺了期号。
 *
 * 刊头（内容页，deck 要页脚时）：左上是栏目名，取页脚的 `organization`
 * （deck 的 `meta.organization`，「致读者」），13px 衬线粗体、字距 6px；右上是
 * 期号，取页脚的 `label`（「二〇二六年秋 · 年度长信」），11px 灰字、字距
 * 2px。中间的分栏名（页面的 `kicker`）和下面两条线是脸画的。
 *
 * 页脚（内容页）：页码居中在底部，13px 衬线灰字，前后各一个间隔点，读作
 * 「· 3 ·」。页码是 PowerPoint 的页码字段，挪页时自己会变，所以两个点是
 * 两段自己的文字，按页码当前的宽度摆在两边。左下是 `footer.notice`，右下
 * 是草稿和保密标记，11px 灰。本 motif 在 `footer-roles.ts` 里记为
 * `"row"`：页脚这一行（连同 `organization` 和 `label`）由它来印，共享页脚
 * 让位。页码和其余标记只上内容页，跟全 deck 的页脚规矩一致。
 *
 * 封面、章节页和结尾页的脸自己画全，不要 motif。小字带 `periodical-spec`
 * 豁免。零 theme id、零 hex。
 */

const FOLIO = { top: 684, lineHeight: 20, size: 13, quiet: 11, center: 640, dot: "·", air: 13.5 } as const

/** Whether this page carries the masthead's words and the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function CornerOrnamentMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  return (
    <>
      {footer.organization || footer.label ? (
        <DecorPiece id="masthead" role="structure">
          <MastheadColumn text={footer.organization} ctx={ctx} />
          <MastheadIssue text={footer.label} ctx={ctx} />
        </DecorPiece>
      ) : null}
      <DecorPiece id="folio" role="structure">
        <PeriodicalFolio {...props} footer={footer} />
      </DecorPiece>
    </>
  )
}

/** The folio: 「· 3 ·」 centred at the foot, the notice at the left, the draft and confidentiality marks at the right. */
function PeriodicalFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = periodicalInks(ctx)
  const meta = periodicalMeta(inks.muted, inks.ground)
  const quietY = periodicalBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.quiet)
  const rightText = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const number = String(pageIndex + 1)
  const y = periodicalBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size, true)
  const reach = periodicalWidth(number, FOLIO.size, ctx, { serif: true }) / 2 + FOLIO.air
  const quiet = (content: string, x: number, anchor: "start" | "end") => (
    <text {...PERIODICAL_SPEC} x={x} y={quietY} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.quiet} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const dot = (x: number) => (
    <text {...PERIODICAL_SPEC} x={x} y={y} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {FOLIO.dot}
    </text>
  )
  return (
    <g data-footer="row">
      {footer.notice ? quiet(footer.notice, PERIODICAL_LEFT, "start") : null}
      {rightText ? quiet(rightText, PERIODICAL_RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-periodical-folio="">
          {dot(FOLIO.center - reach)}
          <text {...PERIODICAL_SPEC} data-field={SLIDE_NUMBER_FIELD} x={FOLIO.center} y={y} textAnchor="middle" fontFamily={ctx.fonts.heading} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
            {number}
          </text>
          {dot(FOLIO.center + reach)}
        </g>
      ) : null}
    </g>
  )
}
