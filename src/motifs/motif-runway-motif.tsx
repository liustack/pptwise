import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { LINEUP_LEFT, LineupMasthead, mastheadLabel } from "../layouts/lineup-shared"

/**
 * runway-motif：秀场出场单的报头，runway 2026-10 定稿（设计源
 * `design/rounds/2026-10-08-runway/`）。
 *
 * 内容页顶部一行：左边 deck 的标签（页脚的 `organization` 接 `label`，
 * 「毕业设计 · 再穿一次」），10px 粗体、字距 4px，右边这一页的分区（页面的
 * `kicker`），10px 石灰色、字距 4px，最右是页码，13px 衬线，PowerPoint 的
 * 页码字段，下面一根 1px 的黑细线，在 y54。照片从页面左缘铺进来时（脸在画
 * 里写 `data-frame-left`，由 `frameLeft` 传进来），整行从那里起。草稿和保密
 * 标记接在分区前面，`notice` 接在标签后面。本 motif 在 `footer-roles.ts` 里
 * 记为 `"row"`：页脚这一行的标记由它印在报头里，共享页脚让位。
 *
 * 与 2026-08 的裁决（runway decor=none，「视觉事件全部由排印落差制造」）的
 * 关系：那条裁决撤掉的是装饰。报头不是装饰，是出场单的结构，只有字和一根
 * 线，标为 `structure`，不画任何图形。封面、章节页和结尾页的脸自己画报头，
 * 本 motif 只上内容页。
 *
 * 小字带 `lineup-spec` 豁免，页码和分区按 meta 档（3:1）验。零 theme id、零 hex。
 */

/** Whether this page carries the footer's marks: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function RunwayMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index, frameLeft } = props
  if (slide.type !== "content") return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const row = drawsRow(props)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const marks = row ? [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ") : ""
  return (
    <DecorPiece id="masthead" role="structure">
      <g data-footer={row ? "row" : undefined}>
        <LineupMasthead ctx={ctx} label={row ? mastheadLabel(footer) : null} section={slide.kicker} folio={row && footer.pageNumber ? pageIndex + 1 : null} marks={marks || null} left={frameLeft ?? LINEUP_LEFT} />
      </g>
    </DecorPiece>
  )
}
