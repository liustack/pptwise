import { CONF_LABEL } from "../lib/conf-labels"
import { fitSvgLine } from "../lib/svg-text-layout"
import { FOOTER_DIVIDER_Y } from "../render/branding-geometry"
import { showsDocumentMeta } from "../render/document-meta"
import { blendOver, metaInk, readableOn } from "../render/ink"
import { DecorPiece } from "./decor-piece"
import { clearsFaceFurniture } from "./keep-out"
import type { DecorProps } from "./types"

/**
 * folio-motif：咨询报告的页脚。y664 一条 1px 通栏细线（x96→1184），线下
 * 一行 16px 次级字：左机构名，右保密级别。brief 定稿（2026-10-02 样例重做）
 * 用它替换 gauge-motif 的左上取景框。
 *
 * 不印页码。2026-07-09 裁决「页码区块完全多此一举」，定稿 footer() 右侧那个
 * 数字一并不画。
 *
 * 按页型：
 *   - **cover**：返回 null。封面自己画页脚（作者与日期），motif 再画一行就
 *     是同一位置印两遍。
 *   - **chapter / content / ending**：画。墨色不按页型分叉，按本页实际底色
 *     分：浅底线走 `border`、字走 `metaInk(muted)`；深底（brief 的 chapter
 *     是整版 primary）线和字都取「底色混可读墨」，即藏青底上的混白。
 *
 * 文字来源：
 *   - 机构名取 `meta.organization`。与 ink-motif 的落款列同一先例，不看
 *     deck branding 姿态（菜单 `brand: "none"` 时 FullSlideSvg 已经把 meta
 *     清空，这里自然不画）。
 *   - 保密标签取 `meta.confidentiality` 经 `CONF_LABEL` 映射，和所有封面、
 *     tone-adaptive-content 一样只在 `showsDocumentMeta` 为真（deck 声明
 *     `branding: "full"`）时出场。IR 契约写明其余姿态下 confidentiality 不上
 *     画布，motif 不另开口子。
 *
 * 线、字同属一件 `structure`：页脚是页面骨架，不是可退底的背景纹样。分区
 * 把它抬进前景，原色满画，不受内容页 3:1 装饰天花板约束（浅底 border 本来
 * 也只有 1.27:1）。
 *
 * 零 theme id、零 hex，颜色只来自 ctx 和 `readableOn`。
 */

/** 页脚细线。与 Branding 的分隔线同一条 y，主题开着 folio 时应设 `brand.suppressFooterRule`。 */
const RULE_Y = FOOTER_DIVIDER_Y
const RULE_X1 = 96
const RULE_X2 = 1184
const RULE_STROKE = 1

/**
 * 定稿文本框 y676、高 24、16px。16px 字在 24px 行盒里半行距约 3px，衬线
 * 字体升部约 0.92em（14.7px），基线落在 676 + 3 + 14.7 ≈ 694。
 */
const TEXT_BASELINE = 694
const TEXT_SIZE = 16
/** 定稿两个文本框：左框 x96 起，右框右缘 x1184、左缘 x784。左文最宽到右框左缘。 */
const ORG_MAX_W = 784 - RULE_X1
const CONF_MAX_W = RULE_X2 - 784

/** 这件页脚占的范围，供 face 的 decorKeepOut 判断。 */
const FOLIO_BOX = { x: RULE_X1, y: RULE_Y, w: RULE_X2 - RULE_X1, h: TEXT_BASELINE + 6 - RULE_Y } as const

/**
 * 深底上细线混入可读墨的比例。定稿藏青底上的线 `#3A4666` 正是白压藏青约
 * 0.13 的混色（1.51:1）。0.14 让它不比浅底 border 压纸白（brief 1.27:1）更淡。
 */
export const DARK_RULE_MIX = 0.14

/**
 * 深底上次级字混入可读墨的比例。定稿 `#AEB4C2` 是白压藏青约 0.65 的混色
 * （6.8:1）。这是起点，`metaInk` 仍负责兜住 3:1。
 */
export const DARK_TEXT_MIX = 0.65

/** 本页底色上的线色与字色。深浅由底色本身决定，不看页型。 */
export function folioInks(ctx: DecorProps["ctx"]): { rule: string; text: string } {
  const ground = ctx.defaultBg ?? ctx.colors.bg
  const ink = readableOn(ground)
  if (ink === "#FFFFFF") {
    return {
      rule: blendOver(ink, ground, DARK_RULE_MIX),
      text: metaInk(blendOver(ink, ground, DARK_TEXT_MIX), ground),
    }
  }
  return {
    rule: ctx.colors.border ?? ctx.colors.muted,
    text: metaInk(ctx.colors.muted, ground),
  }
}

export function FolioMotif({ ir, slide, ctx, page }: DecorProps) {
  if (slide.type === "cover") return null
  if (!clearsFaceFurniture(page, FOLIO_BOX)) return null

  const { rule, text } = folioInks(ctx)
  const font = ctx.fonts.body

  const orgSource = ir.meta.organization?.trim() ?? ""
  const conf = showsDocumentMeta(page, ir, slide) ? ir.meta.confidentiality : undefined
  const confSource = conf ? CONF_LABEL[conf] : ""

  const org = orgSource
    ? fitSvgLine(orgSource, { maxWidth: ORG_MAX_W, fontSize: TEXT_SIZE, minFontSize: TEXT_SIZE, fontFamily: font })
    : null
  const label = confSource
    ? fitSvgLine(confSource, { maxWidth: CONF_MAX_W, fontSize: TEXT_SIZE, minFontSize: TEXT_SIZE, fontFamily: font })
    : null

  return (
    <DecorPiece id="folio" role="structure">
      <line x1={RULE_X1} y1={RULE_Y} x2={RULE_X2} y2={RULE_Y} stroke={rule} strokeWidth={RULE_STROKE} />
      {org && (
        <text
          data-contrast-tier="meta"
          data-truncated={org.truncated ? "1" : undefined}
          x={RULE_X1}
          y={TEXT_BASELINE}
          fontFamily={font}
          fontSize={org.fontSize}
          fill={text}
          dominantBaseline="alphabetic"
        >
          {org.text}
        </text>
      )}
      {label && (
        <text
          data-contrast-tier="meta"
          data-truncated={label.truncated ? "1" : undefined}
          x={RULE_X2}
          y={TEXT_BASELINE}
          textAnchor="end"
          fontFamily={font}
          fontSize={label.fontSize}
          fill={text}
          dominantBaseline="alphabetic"
        >
          {label.text}
        </text>
      )}
    </DecorPiece>
  )
}
