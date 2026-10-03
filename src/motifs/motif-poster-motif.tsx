import { CANVAS_W_PX } from "../constants"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { footerOrganization, showsDocumentMeta } from "../render/document-meta"
import { accessibleInk, blendOver, readableOn } from "../render/ink"
import { DecorPiece } from "./decor-piece"
import type { DecorProps } from "./types"

/**
 * poster-motif：ledger 的行情屏状态栏。2026-10 ledger 样例改版
 * （`design/rounds/2026-10-04-ledger/`）重画：底缘暗线退役，换成每一页顶部
 * 一条 32px 的状态栏，像行情终端的标题行。
 *
 *   - 栏底：比页底更深一档（页底向「正文墨的反色」压 75%，ledger 上是
 *     `#0B0F15`，板上 `#0B0E12`，肉眼无差），下边一条 1px 的 border 线。
 *   - 左边一枚 6px 的强调色小圆点，跟着机构名，12px 青灰字。右边日期，
 *     12px 青灰字，右对齐到 x1216。不放页码：页码是页脚的事。
 *   - 字是页面信息，不是装饰（2026-10-02 页脚裁决）。机构名：封面和结尾页
 *     照印 `meta.organization`（封面文案），章节页和内容页在 deck 要印机构名
 *     时才印（`footerOrganization`，`footer-roles.ts` 记为
 *     `"organization"`，共享页脚那一行就不再印它）。日期和封面、结尾页的
 *     日期同一个开关（`showsDocumentMeta`）。都没有就只画空栏，小圆点也不画。
 *
 * 栏、线、字同属一件 `structure`：状态栏是页面骨架，原色满画。12px 是板上
 * 的字号，带 `panel-spec` 豁免，L1 认得。
 *
 * 安全区：整条在 y0 到 32，标题区从 y46 开始。照片页的照片从 y32 往下铺。
 *
 * 位置全部写死，不读内容、不随 seed 变。零 theme id、零 hex，颜色只来自
 * ctx。
 */

const BAR_H = 32
const DOT = { cx: 67, cy: 16, r: 3 }
const TEXT = { left: 78, right: 1216, top: 8, box: 16, size: 12 }
/** The bar is the page ground pressed this far toward the ink that reads on the text colour. */
const BAR_DEPTH = 0.75
/** Air kept between the organization and the date when both run long. */
const GAP = 40

/** The status bar's fill: the page ground one step deeper. */
export function statusBarFill(ctx: DecorProps["ctx"]): string {
  return blendOver(readableOn(ctx.colors.text), ctx.colors.bg, BAR_DEPTH)
}

export function PosterMotif({ ir, slide, ctx, page }: DecorProps) {
  const { colors, fonts } = ctx
  const fill = statusBarFill(ctx)
  const border = colors.border ?? colors.muted
  const boundary = slide.type === "cover" || slide.type === "ending"
  const org = (boundary ? ir.meta.organization?.trim() : footerOrganization(page, ir)) || null
  const date = showsDocumentMeta(page, ir, slide) ? ir.meta.date?.trim() || null : null
  const ink = accessibleInk(colors.muted, fill, TEXT.size)
  const baseline = Math.round(TEXT.top + TEXT.box / 2 + TEXT.size * 0.385)
  const dateW = date ? measureTextUnits(date, { fontFamily: fonts.body }) * TEXT.size : 0
  const orgFit = org
    ? fitSvgLine(org, { maxWidth: TEXT.right - TEXT.left - (dateW > 0 ? dateW + GAP : 0), fontSize: TEXT.size, minFontSize: TEXT.size, fontFamily: fonts.body })
    : null
  return (
    <DecorPiece id="status-bar" role="structure">
      <rect x={0} y={0} width={CANVAS_W_PX} height={BAR_H - 1} fill={fill} />
      <rect x={0} y={BAR_H - 1} width={CANVAS_W_PX} height={1} fill={border} />
      {orgFit && <circle cx={DOT.cx} cy={DOT.cy} r={DOT.r} fill={colors.accent} />}
      {orgFit && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="panel-spec"
          data-truncated={orgFit.truncated ? "1" : undefined}
          x={TEXT.left}
          y={baseline}
          fontFamily={fonts.body}
          fontSize={TEXT.size}
          fill={ink}
          dominantBaseline="alphabetic"
        >
          {orgFit.text}
        </text>
      )}
      {date && (
        <text
          data-contrast-tier="meta"
          data-font-floor-exempt="panel-spec"
          x={TEXT.right}
          y={baseline}
          textAnchor="end"
          fontFamily={fonts.body}
          fontSize={TEXT.size}
          fill={ink}
          dominantBaseline="alphabetic"
        >
          {date}
        </text>
      )}
    </DecorPiece>
  )
}
