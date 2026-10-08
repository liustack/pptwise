import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { PlacardFoot, PlacardHall, placardLabel } from "../layouts/placard-shared"

/**
 * museum-motif：展厅灯灭之后的墙面，museum 2026-10 定稿（设计源
 * `design/rounds/2026-10-08-museum/`）。
 *
 * 内容页左上是这一页所在的展厅（页面的 `kicker`，「第一展厅 · 月球正面的
 * 土」），11px 铜色、字距 4px，下面一根展柜接缝色的细线横过整页，在 y58。
 * 左下是讲座自己的标签（页脚的 `organization` 接 `label`），10px 暗纸色、
 * 字距 2px，草稿和保密标记接在后面。右下是展厅门牌：60×28 的细框里一个
 * 衬线页码，PowerPoint 的页码字段。本 motif 在 `footer-roles.ts` 里记为
 * `"row"`：页脚这一行的标记由它印，共享页脚让位。
 *
 * 与 2026-08 的裁决（museum 无 motif，四角针点与角标 tick 都已撤）的关系：
 * 那两次撤掉的是装饰。厅名、门牌和标签是展厅的结构，只有字、一根线和一个
 * 细框，标为 `structure`。封面、章节页和结尾页的脸自己画厅名，本 motif 只
 * 上内容页。
 *
 * 小字带 `placard-spec` 豁免，标签和页码按 meta 档（3:1）验。零 theme id、零 hex。
 */

/** Whether this page carries the footer's marks: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function MuseumMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index } = props
  if (slide.type !== "content") return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const row = drawsRow(props)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const marks = row ? [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ") : ""
  return (
    <DecorPiece id="hall" role="structure">
      <PlacardHall ctx={ctx} hall={slide.kicker} />
      <g data-footer={row ? "row" : undefined}>
        <PlacardFoot ctx={ctx} label={row ? placardLabel(footer) : null} folio={row && footer.pageNumber ? pageIndex + 1 : null} marks={marks || null} />
      </g>
    </DecorPiece>
  )
}
