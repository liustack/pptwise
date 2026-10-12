import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { AccountFooter, FOOTER, accountFooterLabel, accountSpeakerLine } from "../layouts/account-shared"

/**
 * recap-motif：述职账本的页脚，recap 2026-10 定稿（设计源
 * `design/rounds/2026-10-13-recap/`）。
 *
 * 每个内容页底部 y688 一行：左边是 deck 的标签（`organization`、`label`、
 * `notice`、草稿和保密标记，12px 灰），右边是述职人和场合（deck 的第一位
 * 作者 `meta.authors[0].name` 和封面的 `kicker`，「周启航 · 2026 年度述职」，
 * 12px 灰）和页码（PowerPoint 页码字段，主题数字字体 14px 墨色）。没有线、
 * 没有框。本 motif 在 `footer-roles.ts` 里记为 `"row"`：页脚这一行由它来印，
 * 共享页脚让位。
 *
 * 页面一侧是出血照片时，脸在画里写 `data-frame-left` 或 `data-frame-right`
 * （照片在左或在右），页脚只占剩下那一栏。照片的出处由脸印在标签后面
 * （`accountSourceIn`）。封面、分节页和结尾页的脸自己印页脚，本 motif 只上
 * 内容页。
 *
 * 小字带 `account-spec` 豁免，按 meta 档（3:1）验。零 theme id、零 hex。
 */

/** Whether this page carries the footer's marks: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function RecapMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index, frameLeft, frameRight, footerPack } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  return (
    <DecorPiece id="footer" role="structure">
      <g data-footer="row">
        <AccountFooter
          ctx={ctx}
          label={accountFooterLabel(footer) || null}
          speaker={accountSpeakerLine(ir)}
          folio={footer.pageNumber ? pageIndex + 1 : null}
          x1={frameLeft ?? FOOTER.x1}
          x2={frameRight ?? FOOTER.x2}
          pack={footerPack}
        />
      </g>
    </DecorPiece>
  )
}
