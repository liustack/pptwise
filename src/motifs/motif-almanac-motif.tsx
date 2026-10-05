import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { Sprout, YEARBOOK_SPEC, yearbookBaseline, yearbookInks, yearbookMeta, yearbookWidth } from "../layouts/compositions/yearbook"

/**
 * almanac-motif —— 长期年鉴的页眉与页脚，almanac 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-05-almanac/`）。旧的左上三条等高线退役：等高线如今
 * 是 `yearbook-cover` 自己的，铺在封面左栏下半。
 *
 * 页眉（内容页）：左上一枚 18px 的 sprout，橄榄色，后面是页面的章节标签，
 * 那是脸画的（`kicker`），右上的年份刻度也是脸画的（页面的 `years`）。
 *
 * 页脚（内容页，deck 要页脚时）：左边 12px 灰字的汇报部门
 * （`meta.organization`，接着 `footer.label`、`footer.notice`），右边「N /
 * M」，前面是草稿和保密标记。N 是 PowerPoint 的页码字段，挪页时自己会变，M
 * 是导出时的总页数。本 motif 在 `footer-roles.ts` 里记为 `"row"`：页脚这一
 * 行由它来印，共享页脚让位。页码和其余标记只上内容页，跟全 deck 的页脚规矩
 * 一致。
 *
 * 封面和结尾页的脸自己画 sprout 或等高线，不要 motif。章节页是整版橄榄底，
 * 橄榄色的 sprout 画上去看不见，也不画。小字是定稿的 12px，带
 * `yearbook-spec` 豁免。零 theme id、零 hex，颜色只来自 ctx。
 */

const LEFT = 64
const RIGHT = 1216
const SPROUT = { x: 64, y: 24, size: 18 } as const
const FOLIO = { top: 686, lineHeight: 18, size: 12, groupGap: 24 } as const

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

export function AlmanacMotif(props: DecorProps) {
  const { ir, slide, ctx, page } = props
  if (slide.type !== "content") return null
  const row = drawsRow(props)
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  return (
    <>
      <DecorPiece id="sprout" role="structure">
        <Sprout ctx={ctx} x={SPROUT.x} y={SPROUT.y} size={SPROUT.size} />
      </DecorPiece>
      {row ? (
        <DecorPiece id="folio" role="structure">
          <AlmanacFolio {...props} footer={footer} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The folio: the reporting office at the left, 「N / M」 at the right, N a slide-number field. */
function AlmanacFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = yearbookInks(ctx)
  const meta = yearbookMeta(inks.muted, inks.ground)
  const y = yearbookBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)
  const text = (content: string, x: number, anchor: "start" | "end", extra: Record<string, string> = {}) => (
    <text {...YEARBOOK_SPEC} {...extra} x={x} y={y} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const left = [footer.organization, footer.label, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const total = `/ ${ir.slides.length}`
  const space = yearbookWidth(" ", FOLIO.size, ctx)
  const totalX = RIGHT - yearbookWidth(total, FOLIO.size, ctx)
  const numberRight = totalX - space
  const folioLeft = numberRight - yearbookWidth(String(pageIndex + 1), FOLIO.size, ctx)
  return (
    <g data-footer="row">
      {left ? text(left, LEFT, "start") : null}
      {right ? text(right, footer.pageNumber ? folioLeft - FOLIO.groupGap : RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-yearbook-folio="">
          {text(String(pageIndex + 1), numberRight, "end", { "data-field": SLIDE_NUMBER_FIELD })}
          {text(total, totalX, "start")}
        </g>
      ) : null}
    </g>
  )
}
