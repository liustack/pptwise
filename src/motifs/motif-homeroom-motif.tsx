import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { LESSON_SPEC, lessonBaseline, lessonInks, lessonMeta, lessonWidth } from "../layouts/compositions/lesson"

/**
 * homeroom-motif —— 一堂课的页脚，homeroom 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-06-homeroom/`）。横线簿格线 v3 退役：格线如今是横线
 * 纸题卡和作业纸自己的，画在 `layouts/compositions/lesson.tsx`。
 *
 * 页眉不归 motif：左上的环节标签和右上的课程进度条都是脸画的（页面的
 * `kicker` 与 `stage`）。
 *
 * 页脚（内容页，deck 要页脚时）：左边 12px 灰字的部门和课程（`meta.organization`，
 * 接着 `footer.label`、`footer.notice`，「培训部 · 全员培训 · 在工作中用好生
 * 成式 AI」），右边「N / M」，前面是草稿和保密标记。N 是 PowerPoint 的页码
 * 字段，挪页时自己会变，M 是导出时的总页数。本 motif 在 `footer-roles.ts` 里
 * 记为 `"row"`：页脚这一行由它来印，共享页脚让位。页码和其余标记只上内容页，
 * 跟全 deck 的页脚规矩一致。
 *
 * 封面、环节页和结尾页的脸自己画全，不要 motif。小字是定稿的 12px，带
 * `lesson-spec` 豁免。零 theme id、零 hex，颜色只来自 ctx。
 */

const LEFT = 64
const RIGHT = 1216
const FOLIO = { top: 686, lineHeight: 18, size: 12, groupGap: 24 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function HomeroomMotif(props: DecorProps) {
  const { ir, slide, page } = props
  if (slide.type !== "content" || !drawsRow(props)) return null
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  return (
    <DecorPiece id="folio" role="structure">
      <HomeroomFolio {...props} footer={footer} />
    </DecorPiece>
  )
}

/** The folio: the office and the course at the left, 「N / M」 at the right, N a slide-number field. */
function HomeroomFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = lessonInks(ctx)
  const meta = lessonMeta(inks.muted, inks.ground)
  const y = lessonBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)
  const text = (content: string, x: number, anchor: "start" | "end", extra: Record<string, string> = {}) => (
    <text {...LESSON_SPEC} {...extra} x={x} y={y} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const left = [footer.organization, footer.label, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const total = `/ ${ir.slides.length}`
  const space = lessonWidth(" ", FOLIO.size, ctx)
  const totalX = RIGHT - lessonWidth(total, FOLIO.size, ctx)
  const numberRight = totalX - space
  const folioLeft = numberRight - lessonWidth(String(pageIndex + 1), FOLIO.size, ctx)
  return (
    <g data-footer="row">
      {left ? text(left, LEFT, "start") : null}
      {right ? text(right, footer.pageNumber ? folioLeft - FOLIO.groupGap : RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-lesson-folio="">
          {text(String(pageIndex + 1), numberRight, "end", { "data-field": SLIDE_NUMBER_FIELD })}
          {text(total, totalX, "start")}
        </g>
      ) : null}
    </g>
  )
}
