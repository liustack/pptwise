import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { deckWritesChinese } from "../lib/conf-labels"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { MEMO_SPEC, memoBaseline, memoInks, memoMeta, memoText, memoWidth, paintTracked } from "../layouts/compositions/memo"

/**
 * memo-motif —— 打字机备忘录的页眉与页脚，memo 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-05-memo/`）。旧的 y26/32 红双线和 16px 眉字退役。
 *
 * 页眉（封面以外每一页）：左上一行拉开 6px 字距的等宽 MEMORANDUM，12px，
 * 印章红。下面一道红双线，2px 在 y48、1px 在 y53，x64→1216。内容页右上角
 * 还有一行等宽小字：deck 的 `footer.label`（「四天工作制试点 · 决定」），
 * 这份备忘录的事由，打在页眉上。
 *
 * 页脚（内容页，deck 要页脚时）：左边等宽 12px 的发文部门
 * （`meta.organization`，接着 `footer.notice`），右边「第 N 页 共 M 页」，
 * 英文 deck 写 "Page N of M"，前面是草稿和保密标记。N 是 PowerPoint 的页码
 * 字段，挪页时自己会变，M 是导出时的总页数。本 motif 在 `footer-roles.ts`
 * 里记为 `"row"`：页脚这一行（连同 `label`）由它来印，共享页脚让位。页码
 * 和其余标记只上内容页，跟全 deck 的页脚规矩一致，所以章节页和结尾页只有
 * MEMORANDUM 和双线。
 *
 * 双线和眉字是页面骨架（`structure`），原色满画。小字是定稿的 12px，带
 * `memo-spec` 豁免。零 theme id、零 hex，颜色只来自 ctx。
 */

const LEFT = 64
const RIGHT = 1216
const EYEBROW = { top: 26, lineHeight: 18, size: 12, tracking: 6, text: "MEMORANDUM" } as const
const RULES = { thick: { y: 48, h: 2 }, thin: { y: 53, h: 1 } } as const
const FOLIO = { top: 686, lineHeight: 18, size: 12, groupGap: 24 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function MemoMotif(props: DecorProps) {
  const { ir, slide, ctx, page } = props
  // The cover sets its own MEMORANDUM and double rule (`memo-cover`).
  if (slide.type === "cover") return null
  const inks = memoInks(ctx)
  const row = drawsRow(props)
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  const meta = memoMeta(inks.muted, inks.ground)
  const headY = memoBaseline(EYEBROW.top, EYEBROW.lineHeight, EYEBROW.size, "mono")
  return (
    <>
      <DecorPiece id="masthead" role="structure">
        {paintTracked({ ctx, text: EYEBROW.text, x: LEFT, y: headY, size: EYEBROW.size, face: "mono", tracking: EYEBROW.tracking, fill: memoText(inks.mark, inks.ground, EYEBROW.size), bold: true })}
        {row && footer.label ? (
          <text {...MEMO_SPEC} data-memo-running-head="" x={RIGHT} y={headY} textAnchor="end" fontFamily={ctx.fonts.mono} fontSize={EYEBROW.size} fill={meta} dominantBaseline="alphabetic">
            {footer.label}
          </text>
        ) : null}
        <rect x={LEFT} y={RULES.thick.y} width={RIGHT - LEFT} height={RULES.thick.h} fill={inks.mark} />
        <rect x={LEFT} y={RULES.thin.y} width={RIGHT - LEFT} height={RULES.thin.h} fill={inks.mark} />
      </DecorPiece>
      {row ? (
        <DecorPiece id="folio" role="structure">
          <MemoFolio {...props} footer={footer} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The folio: the issuing office at the left, 「第 N 页 共 M 页」 at the right, N a slide-number field. */
function MemoFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = memoInks(ctx)
  const meta = memoMeta(inks.muted, inks.ground)
  const y = memoBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size, "mono")
  const text = (content: string, x: number, anchor: "start" | "end", extra: Record<string, string> = {}) => (
    <text {...MEMO_SPEC} {...extra} x={x} y={y} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.mono} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const left = [footer.organization, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const chinese = deckWritesChinese(ir)
  const [before, after] = chinese ? ["第", `页 共 ${ir.slides.length} 页`] : ["Page", `of ${ir.slides.length}`]
  const space = memoWidth(" ", FOLIO.size, "mono", ctx)
  const number = String(pageIndex + 1)
  const afterX = RIGHT - memoWidth(after, FOLIO.size, "mono", ctx)
  const numberRight = afterX - space
  const beforeRight = numberRight - memoWidth(number, FOLIO.size, "mono", ctx) - space
  const folioLeft = beforeRight - memoWidth(before, FOLIO.size, "mono", ctx)
  return (
    <g data-footer="row">
      {left ? text(left, LEFT, "start") : null}
      {right ? text(right, footer.pageNumber ? folioLeft - FOLIO.groupGap : RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-memo-folio="">
          {text(before, beforeRight, "end")}
          {text(number, numberRight, "end", { "data-field": SLIDE_NUMBER_FIELD })}
          {text(after, afterX, "start")}
        </g>
      ) : null}
    </g>
  )
}
