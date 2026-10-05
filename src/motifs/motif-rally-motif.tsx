import type { DecorProps } from "./types"
import { DecorPiece } from "./decor-piece"
import { clearsFaceFurniture } from "./keep-out"
import { SLIDE_NUMBER_FIELD } from "../render/footer"
import { footerRowItems, footerRowWanted, resolveDeckFooter, type DeckFooter } from "../render/footer-marks"
import { CONFETTI_PILE, Confetti, MARQUEE_SPEC, marqueeBaseline, marqueeInks, marqueeMeta, marqueeWidth, type Box } from "../layouts/compositions/marquee"

/**
 * rally-motif v8 —— 活动策划案的纸屑与页脚，rally 2026-10 定稿重画（设计源
 * `design/rounds/2026-10-06-rally/`）。v7 的右上三枚斜方片退役。
 *
 * 纸屑（内容页）：右上一小撮七枚，落在 (1100,14) 起 160×44 的框里，洋红、
 * 鎏金、天青、荧绿四色轮换（主题的 chartPalette，图表同源），每枚一条带
 * 1.5px 圆角的小纸条，随机转角，90% 不透明。撒法按页号定种子
 * （`confettiPieces`，复刻定稿生成器的 Python `random.Random(页号)`），所以
 * 每页撒得不同，同一份 deck 每次渲染一样。这是本 motif 唯一读页序的地方。
 * 落在脸声明的家具上（`decorKeepOut`，一句话页自己撒满两带）或右上 logo 盒
 * 上的纸屑不画。整撮是一枚 `identity` 件：纸屑的颜色就是主题。
 *
 * 页脚（内容页，deck 要页脚时）：右下「N / M」，12px 幕影紫灰，N 是
 * PowerPoint 的页码字段，挪页时自己会变，M 是导出时的总页数；左边是发文
 * 单位和 `footer.label`、`footer.notice`。本 motif 在 `footer-roles.ts` 里记为
 * `"row"`：页脚这一行由它来印，共享页脚让位。定稿印「02 / 18」，页码字段
 * 不能补零，故印「2 / 18」。
 *
 * 封面、章节页和结尾页的脸自己画全（自己的纸屑和票根），不要 motif。小字是
 * 定稿的 12px，带 `marquee-spec` 豁免。零 theme id、零 hex。
 */

const LEFT = 64
const RIGHT = 1216
const FOLIO = { top: 686, lineHeight: 18, size: 12, groupGap: 24 } as const
/** The logo box when a deck sets it at the top right (`render/branding.tsx`). */
const LOGO_TR: Box = { x: 1120, y: 48, w: 96, h: 40 }

/** Whether this page carries the folio: the page decision first, the deck's own marks when rendered alone. */
function drawsRow({ ir, slide, page }: DecorProps): boolean {
  if (page) return page.footerRow === "motif"
  return slide.type === "content" && footerRowWanted(footerRowItems(resolveDeckFooter(ir)))
}

/** Whether the deck's logo stands at the top right of this page. */
function logoTopRight({ ir, slide, page }: DecorProps): boolean {
  const posture = page?.branding ?? ir.branding ?? "cover-only"
  if (posture === "none" || (posture === "cover-only" && slide.type === "content")) return false
  return Boolean(ir.brand?.logo_asset_id) && ir.brand?.position === "tr"
}

export function RallyMotif(props: DecorProps) {
  const { ir, slide, ctx, page, index } = props
  if (slide.type !== "content") return null
  const inks = marqueeInks(ctx)
  const pageNo = (index ?? Math.max(0, ir.slides.indexOf(slide))) + 1
  const pileOpen = clearsFaceFurniture(page, CONFETTI_PILE.region, 0)
  const keepOff = logoTopRight(props) ? [LOGO_TR] : []
  const footer: DeckFooter = page?.footer ?? resolveDeckFooter(ir)
  return (
    <>
      {pileOpen ? (
        <DecorPiece id="confetti" role="identity">
          <Confetti throws={[{ seed: pageNo, region: CONFETTI_PILE.region, count: CONFETTI_PILE.count }]} colors={inks.confetti} keepOff={keepOff} />
        </DecorPiece>
      ) : null}
      {drawsRow(props) ? (
        <DecorPiece id="folio" role="structure">
          <RallyFolio {...props} footer={footer} />
        </DecorPiece>
      ) : null}
    </>
  )
}

/** The folio: the office and the label at the left, 「N / M」 at the right, N a slide-number field. */
function RallyFolio({ ir, slide, ctx, index, footer }: DecorProps & { footer: DeckFooter }) {
  const inks = marqueeInks(ctx)
  const meta = marqueeMeta(inks.muted, inks.ground)
  const y = marqueeBaseline(FOLIO.top, FOLIO.lineHeight, FOLIO.size)
  const text = (content: string, x: number, anchor: "start" | "end", extra: Record<string, string> = {}) => (
    <text {...MARQUEE_SPEC} {...extra} x={x} y={y} textAnchor={anchor === "end" ? "end" : undefined} fontFamily={ctx.fonts.body} fontSize={FOLIO.size} fill={meta} dominantBaseline="alphabetic">
      {content}
    </text>
  )
  const left = [footer.organization, footer.label, footer.notice].filter((part): part is string => Boolean(part)).join(" · ")
  const right = [footer.draft, footer.confidentiality?.placement === "footer" ? footer.confidentiality.text : null].filter((part): part is string => Boolean(part)).join(" · ")
  const pageIndex = index ?? Math.max(0, ir.slides.indexOf(slide))
  const total = `/ ${ir.slides.length}`
  const space = marqueeWidth(" ", FOLIO.size, ctx)
  const totalX = RIGHT - marqueeWidth(total, FOLIO.size, ctx)
  const numberRight = totalX - space
  const folioLeft = numberRight - marqueeWidth(String(pageIndex + 1), FOLIO.size, ctx)
  return (
    <g data-footer="row">
      {left ? text(left, LEFT, "start") : null}
      {right ? text(right, footer.pageNumber ? folioLeft - FOLIO.groupGap : RIGHT, "end") : null}
      {footer.pageNumber ? (
        <g data-marquee-folio="">
          {text(String(pageIndex + 1), numberRight, "end", { "data-field": SLIDE_NUMBER_FIELD })}
          {text(total, totalX, "start")}
        </g>
      ) : null}
    </g>
  )
}
