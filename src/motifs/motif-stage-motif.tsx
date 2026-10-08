import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { stripEmphasis } from "../render/emphasis"
import { KEYNOTE_META, keynoteBaseline, keynoteInks, keynoteMeta, keynoteTrackedWidth, paintKeynoteTracked } from "../layouts/compositions/keynote"
import { KICKER, KEYNOTE_RIGHT, KeynoteClicker } from "../layouts/keynote-shared"

/**
 * stage-motif：演讲遥控器的进度线，stage 2026-10 定稿（设计源
 * `design/rounds/2026-10-08-stage/`）。
 *
 * 每个内容页底部 y676 一根 2px 的轨道，从 x64 到 x1096，已经讲过的那段（这
 * 一页在全 deck 里的位置除以总页数）是哑银，轨道末端是「5 / 18」：前一个数
 * 是 PowerPoint 的页码字段，挪页时自己会变，后面是导出时的总页数，deck 要
 * 页码时才印。deck 要的其他页脚标记（`organization`、`label`、`notice`、草
 * 稿和保密标记）印在右上角，和左上的章名同一行高、同样小，暗砂色。本 motif
 * 在 `footer-roles.ts` 里记为 `"row"`：页脚这一行由它来印，共享页脚让位。
 *
 * 与 2026-08 的裁决（stage 无 motif，「无框就是身份」）的关系：那条裁决不
 * 要的是框和装饰。进度线是讲台上的结构，只有一根线和一个页码，标为
 * `structure`，不画任何框。封面、章节页和结尾页的脸自己画进度线，本 motif
 * 只上内容页，图片页也在。
 *
 * 小字带 `keynote-spec` 豁免，页码和标记按 meta 档（3:1）验。零 theme id、
 * 零 hex。
 */

/** Whether this page carries the footer's marks: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

/** The marks the deck asks for besides the page number, joined by a middle dot. */
export function stageMarks(footer: DeckFooter): string {
  return [footer.organization, footer.label, footer.notice, footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null]
    .map((part) => (part ? stripEmphasis(part).trim() : ""))
    .filter(Boolean)
    .join(" · ")
}

export function StageMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index } = props
  if (slide.type !== "content") return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const row = drawsRow(props)
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const marks = row ? stageMarks(footer) : ""
  const inks = keynoteInks(ctx)
  const fits = !marks || keynoteTrackedWidth(marks, KICKER.size, 2, ctx) <= 560
  return (
    <DecorPiece id="clicker" role="structure">
      <g data-footer={row ? "row" : undefined}>
        <KeynoteClicker ctx={ctx} place={pageIndex + 1} total={ir.slides.length} count={row && footer.pageNumber} />
        {marks && fits ? (
          <g data-keynote-marks={marks}>{paintKeynoteTracked({ ctx, text: marks, x: KEYNOTE_RIGHT, y: keynoteBaseline(KICKER.top, KICKER.lineHeight, KICKER.size), size: KICKER.size, tracking: 2, anchor: "end", fill: keynoteMeta(inks.dim, inks.ground), attrs: { ...KEYNOTE_META } })}</g>
        ) : null}
        {marks && !fits ? <g data-dropped={1} data-dropped-kind="label" /> : null}
      </g>
    </DecorPiece>
  )
}
