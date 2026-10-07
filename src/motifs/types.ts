import type React from "react"
import type { PptxIR, Slide } from "@/ir"
import type { ComponentCtx } from "../components/types"
import type { PageRenderContext } from "../render/page-context"

/**
 * Props for a motif（原 templates/types.ts 的 DecorProps）。装饰几何是
 * (theme, slide.type) 的纯函数，不读页序。
 */
export interface DecorProps {
  ir: PptxIR
  slide: Slide
  ctx: ComponentCtx
  page?: PageRenderContext
  /**
   * This page's 0-based position in the deck. Only a motif that paints the
   * footer row reads it (`footer-roles.ts`), for the page number: the one
   * mark that depends on where the page sits. Decoration never does.
   */
  index?: number
}

/** Motif（原 per-theme Decor）：签名对齐 templates/types.ts 的 DecorProps，可为 null。 */
export type Motif = (p: DecorProps) => React.ReactElement | null

// Wave 3（motif，随 content 任务迁移）
export type MotifId =
  | "banner-motif" | "rail-motif" | "poster-motif"
  | "constellation-motif" | "corner-ornament-motif" | "tone-adaptive-motif"
  | "rally-motif" // 2026-07-13：多彩笔刷涂鸦（rally 专属，memphis 拆分 A）
  | "homeroom-motif" // 2026-07-13：第 13 主题 homeroom 专属；2026-08-20 柔和组重设计为「拍纸簿」（装订孔排+铅笔虚线+回形针）。水彩兄弟 motif 已删除
  | "ink-motif" // 2026-07-10：古籍版框+印章+远山（ink 专属新表达）
  | "luxe-motif" // 2026-07-10 全覆盖：烫金细线（luxe 专属）
  | "bulletin-motif" // 2026-07-10 全覆盖：IKB 方块秩序（bulletin 专属）
  | "clinic-motif" // 2026-07-28 themes-16 wave T1：细脉搏线+胶囊/细胞圆点簇（clinic 专属，第 14 主题）
  | "almanac-motif" // 2026-07-28 themes-16 wave T2：等高线+叶脉/种子点簇（almanac 专属，第 15 主题）
  | "ember-motif" // 2026-07-28 themes-16 wave T3：上升火花（渐隐圆点粒子沿弧线上升，ember 专属，第 16 主题）
  | "vermilion-motif" // 2026-08-06 gov-theme wave：旗帜感绸带弧线 + 金色光芒细线（vermilion 专属，第 17 主题；刻意不用政治符号）
  | "crayon-motif" // 2026-08-21：蜡笔描边（顶缘涂边 + 太阳涂鸦 + 底带彩虹划，crayon 专属，单锚不借用）
  | "lecture-motif" // 2026-08-21：粉笔槽细框（lecture 专属，单锚。26px 内缩 1px 走 border，黄粉笔弧不进 motif）
  | "swiss-motif" // 2026-08-21 wave7：顶边 12px 红条 + 右缘三格灰刻度（swiss 专属，单锚不借用。板上整高裸格线不进 motif）
  | "memo-motif" // 2026-08-21：顶部红双线 + Latin 等宽眉字 MEMORANDUM（memo 专属，单锚不借用。红只成线与字）
  | "gauge-motif" // 2026-08-25：brief 量规定位角标，左上两条直线构成 ⌐
  | "crayonbox-motif" // 2026-08-25：一盒蜡笔右上角阳光黄太阳与星贴纸组
  | "folio-motif" // 2026-10-02：brief 定稿页脚，y664 细线 + 左机构名右保密级别，不印页码
  | "proposal-motif" // 2026-10-06：proposal 提案书页眉标签与页码（左上 deck 标签，右下页码字段）
