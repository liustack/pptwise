import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { Star, Sun, crayonInks, crayonSectionColor } from "../layouts/compositions/crayonbox"
import { CRAYON_LEFT, FolioDisc, FolioLine } from "../layouts/crayonbox-frame"

/**
 * crayonbox-motif v2 —— 一盒蜡笔内容页的太阳、星贴纸和页脚，crayon 2026-10
 * 定稿重画（设计源 `design/rounds/2026-10-08-crayon/`）。
 *
 * **id 没改，画的东西换了**（同 ink-motif v2 的做法：id 是注册表键）。v1 的
 * 太阳与两颗字形星缩在 x1220 以右，星是文字「★」，颜色是写死的糖果粉与紫。
 *
 * 内容页右上（铺了照片背景的页不画，角落让给照片）：阳光黄的蜡笔太阳（圆心 x1210 y64，半径 14，八道短光线），左下一颗
 * 橘色星（x1172 y112）、右下一颗紫色星（x1222 y118），都是多边形，颜色来自主题。
 * deck 要页脚时，左下 y684 一行 12px 灰字是机构名、`label` 和 `notice`（「全园新
 * 学期家长会 · 2026 年秋季学期」），草稿与保密标记接在后面；右下一个 36px 的淡色
 * 圆里是页码（PowerPoint 的页码字段），圆的底色是这一页所在分区的蜡笔色的浅色。
 * 本 motif 在 `footer-roles.ts` 里记为 `"row"`：页脚这一行由它来印，共享页脚让位。
 *
 * 封面、章节页和结尾的脸自己画全，不要 motif。小字带 `crayonbox-spec` 豁免。
 * 零 theme id、零 hex。
 */

/** Whether this page carries the footer row: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function CrayonboxMotif(props: DecorProps) {
  const { ir, slide, page, ctx } = props
  if (slide.type !== "content") return null
  const inks = crayonInks(ctx)
  const row = drawsRow(props)
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  // A page laid over a photograph leaves the corner to the picture.
  const doodles = slide.background?.kind !== "asset"
  return (
    <>
      {doodles ? (
        <DecorPiece id="crayonbox-sun" role="identity">
          <Sun cx={1210} cy={64} r={14} color={inks.yellow} />
        </DecorPiece>
      ) : null}
      {doodles ? (
        <DecorPiece id="crayonbox-stars" role="identity">
          <Star cx={1172} cy={112} r={7} color={inks.orange} />
          <Star cx={1222} cy={118} r={5} color={inks.purple} />
        </DecorPiece>
      ) : null}
      {row ? (
        <DecorPiece id="folio" role="structure">
          <CrayonFolio {...props} footer={footer} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The footer row: the deck's name, its term and its notice at the left, the draft and confidentiality after them, the page number in its disc. */
function CrayonFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = crayonInks(ctx)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const items = footerRowItems(footer)
  const left = [items.left, items.right].filter((part): part is string => Boolean(part)).join(" · ")
  return (
    <g data-footer="row">
      {left ? <FolioLine text={left} ctx={ctx} x={CRAYON_LEFT} /> : null}
      {footer.pageNumber ? <FolioDisc n={pageIndex + 1} color={crayonSectionColor(ir.slides, pageIndex, inks)} ctx={ctx} /> : null}
    </g>
  )
}

