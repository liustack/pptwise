import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { FOOTER, PortraitFooter, portraitFooterLabel, portraitSpeaker } from "../layouts/portrait-shared"

/**
 * profile-motif：人物专访的页脚，profile 2026-10 定稿（设计源
 * `design/rounds/2026-10-12-profile/`）。
 *
 * 每个内容页底部 y685 一行：左边是 deck 的标签（`organization`、`label`、
 * `notice`、草稿和保密标记，12px 灰），右边是讲者的名字（deck 的第一位作者
 * `meta.authors[0].name`，12px 灰）和页码（PowerPoint 页码字段，衬线 14px
 * 墨色）。没有线、没有框。本 motif 在 `footer-roles.ts` 里记为 `"row"`：页
 * 脚这一行由它来印，共享页脚让位。
 *
 * 页面一侧是出血照片时，脸在画里写 `data-frame-left` 或 `data-frame-right`
 * （照片在左或在右），页脚只占剩下那一栏。脸在左下角放了自己的东西（雷达
 * 图的图例）时写 `data-footer-pack="end"`，标签挪到右边、名字之前。照片的
 * 出处由脸印在标签后面（`portraitSourceIn`）。封面和结尾页的脸自己印页脚，
 * 本 motif 只上内容页。
 *
 * 小字带 `portrait-spec` 豁免，按 meta 档（3:1）验。零 theme id、零 hex。
 */

/** Whether this page carries the footer's marks: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function ProfileMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index, frameLeft, frameRight, footerPack } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  return (
    <DecorPiece id="footer" role="structure">
      <g data-footer="row">
        <PortraitFooter
          ctx={ctx}
          label={portraitFooterLabel(footer) || null}
          name={portraitSpeaker(ir)}
          folio={footer.pageNumber ? pageIndex + 1 : null}
          x1={frameLeft ?? FOOTER.x1}
          x2={frameRight ?? FOOTER.x2}
          pack={footerPack}
        />
      </g>
    </DecorPiece>
  )
}
