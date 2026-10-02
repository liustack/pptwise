import { FooterRow } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter } from "../render/footer-marks"
import { clearsFaceFurniture } from "./keep-out"
import { DecorPiece } from "./decor-piece"
import type { DecorProps } from "./types"

export { DARK_RULE_MIX, DARK_TEXT_MIX, footerInks as folioInks } from "../render/footer"

/**
 * folio-motif：咨询报告的页脚。brief 定稿（2026-10-02 样例重做）用它替换
 * gauge-motif 的左上取景框：y664 一条 1px 细线（x96→1184），线下一行 16px
 * 次级字。brief 的内容版式都声明 `branding: "none"`，页脚这一行就由本
 * motif 来画（`footer-roles.ts` 记为 `"row"`），共享页脚在这些页上让位。
 *
 * 画什么，和所有主题的共享页脚是同一件东西：同一个 `FooterRow`、同一套
 * 几何与墨色（`render/footer.tsx`），只印 deck 的 `footer` 要的标记（未写
 * `footer` 时 `branding: "full"` 读作机构名加保密标识）。没写就不画，线也
 * 不画。页码只在内容页。
 *
 * 按页型：只画内容页。封面、章节、结尾页不印页脚（2026-10-02 页脚裁决：
 * 页码不上这几种页，页脚的其余标记跟着页码走，全 deck 一个规矩）。
 *
 * 线、字同属一件 `structure`：页脚是页面骨架，不是可退底的背景纹样。分区
 * 把它抬进前景，原色满画，不受内容页 3:1 装饰天花板约束（浅底 border 本来
 * 也只有 1.27:1）。
 *
 * 零 theme id、零 hex，颜色只来自 ctx 和 `readableOn`。
 */

/** 这件页脚占的范围，供 face 的 decorKeepOut 判断。 */
const FOLIO_BOX = { x: 96, y: 664, w: 1088, h: 36 } as const

/**
 * Page decision first (`page.footerRow`, which already weighs the menu, the
 * page type and the marks). Rendered on its own, without a page context,
 * the motif falls back to the deck's own marks on a content page.
 */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function FolioMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index } = props
  if (!drawsRow(props)) return null
  if (!clearsFaceFurniture(page, FOLIO_BOX)) return null
  return (
    <DecorPiece id="folio" role="structure">
      <FooterRow
        footer={page?.footer ?? resolveDeckFooter(ir)}
        index={index ?? Math.max(0, ir.slides.indexOf(slide))}
        pageCount={ir.slides.length}
        ctx={ctx}
        rule
      />
    </DecorPiece>
  )
}
