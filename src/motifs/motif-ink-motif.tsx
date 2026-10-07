import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { SCROLL_META, SCROLL_SPEC, joinColumnLabels, scrollBaseline, scrollInks, scrollMeta } from "../layouts/compositions/scroll"
import { EDGES, ScrollHall, SCROLL_LEFT } from "../layouts/scroll-shared"

/**
 * ink-motif v2 —— 挂起来的卷轴的边、右缘竖排的讲堂与年月、右下的页码，
 * ink 2026-10 定稿重画（设计源 `design/rounds/2026-10-07-ink/`）。
 *
 * **id 没改，画的东西整个换了**（同 corner-ornament-motif v3 的做法：id 是
 * 注册表键，改名牵动 schema 与测试）。v1 的「封面左下半山 + 内容页右缘落款
 * 列 + 列底小印」随定稿退役：半山与小印都是没人读的装饰，落款列里的年月是
 * 从 `meta.date` 换算的汉字，英文 deck 也印成「二〇二六年十月」，机构名逐
 * 字母竖排。
 *
 * 内容页：页面两侧各一道发丝线（x70、x1210，y40 到 y680），卷轴的边，总在。
 * 右缘竖排 deck 的机构名接页脚的 `label`（作者写的年月，「文化讲堂」「二〇二六
 * 年十月」），13px 灰褐、字距 6px，从 y48 起；拉丁文转九十度从上往下读，
 * 不逐字母竖排。左缘竖排的卷名是页面的 `kicker`，归脸画。页码在右下，贴着
 * 右边那道边（x1210 右对齐，y680 那一行），12px 楷书灰褐，是 PowerPoint 的
 * 页码字段。左下是 `footer.notice`，页码左边是草稿和保密标记，11px 灰。本
 * motif 在 `footer-roles.ts` 里记为 `"row"`：页脚这一行（连同 `organization`
 * 和 `label`）由它来印，共享页脚让位。
 *
 * 封面、章节页和结尾页的脸自己画全，不要 motif。小字带 `scroll-spec` 豁免。
 * 零 theme id、零 hex。
 */

const FOLIO = { right: EDGES.right, top: 680, lineHeight: 20, size: 12, quiet: 11, gap: 16 } as const

/** Whether this page carries the margin's words and the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function InkMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content") return null
  const inks = scrollInks(ctx)
  const row = drawsRow(props)
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const hall = row ? joinColumnLabels([footer.organization, footer.label]) : ""
  return (
    <>
      <DecorPiece id="edges" role="structure">
        <rect x={EDGES.left - EDGES.w / 2} y={EDGES.top} width={EDGES.w} height={EDGES.bottom - EDGES.top} fill={inks.line} />
        <rect x={EDGES.right - EDGES.w / 2} y={EDGES.top} width={EDGES.w} height={EDGES.bottom - EDGES.top} fill={inks.line} />
      </DecorPiece>
      {hall ? (
        <DecorPiece id="hall" role="structure">
          <ScrollHall text={hall} ctx={ctx} />
        </DecorPiece>
      ) : null}
      {row ? (
        <DecorPiece id="folio" role="structure">
          <ScrollFolio {...props} footer={footer} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The folio: the page number against the right edge, the notice at the left, the draft and confidentiality marks before the number. */
function ScrollFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = scrollInks(ctx)
  const meta = scrollMeta(inks.taupe, inks.ground)
  const quiet = scrollMeta(inks.muted, inks.ground)
  const quietY = scrollBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.quiet)
  const y = scrollBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size, true)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const rightText = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const quietText = (content: string, x: number, anchor: "start" | "end") => (
    <text {...SCROLL_SPEC} {...SCROLL_META} x={x} y={quietY} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.quiet} fill={quiet} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  return (
    <g data-footer="row">
      {footer.notice ? quietText(footer.notice, SCROLL_LEFT, "start") : null}
      {rightText ? quietText(rightText, FOLIO.right - (footer.pageNumber ? 40 : 0) - (footer.pageNumber ? FOLIO.gap : 0), "end") : null}
      {footer.pageNumber ? (
        <text {...SCROLL_SPEC} {...SCROLL_META} data-field={SLIDE_NUMBER_FIELD} x={FOLIO.right} y={y} textAnchor="end" fontFamily={ctx.fonts.heading} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
          {String(pageIndex + 1)}
        </text>
      ) : null}
    </g>
  )
}
