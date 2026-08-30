import type { SvgTemplateProps } from "./types"
import type { LayoutDefinition } from "./registry"
import { sparseFace } from "./sparse/registry"
import { GenericMonoBleedContent, MONO_BLEED_HEADING_FIT } from "./generic-mono-bleed"

export { GenericMonoBleedContent }

/**
 * 未注册的 (themeId, layoutId) 与自定义主题仍走此脸。
 *
 * mono-bleed 通用脸：满版品牌色，字当图。`paintsOwnBackground` 让整页 fill
 * 使用 `colors.primary`，字色走 `readableOn`。需要字就写 heading，容量 0。
 * 菜单可用 silent 同时关掉 motif 与页级品牌。
 *
 * 纪律：本文件禁 theme id、禁颜色 hex 字面量（readableOn 中性黑白豁免），
 * 颜色全部来自 ctx。
 */

export function MonoBleedContent(props: SvgTemplateProps) {
  const Face = sparseFace("mono-bleed", props.ir.theme.id)
  if (Face) return Face(props)
  return GenericMonoBleedContent(props)
}

export const layoutDef = {
  branding: "none",
  // content-mono-bleed.tsx: a pinOnly full-bleed primary field with inverted
  // type. Capacity 0 (write the words in heading). paintsOwnBackground so
  // FullSlideSvg does not paint the theme bg underneath. Page decor and
  // branding posture belong to the menu entry.
  id: "mono-bleed",
  kind: "archetype",
  pinOnly: true,
  paintsOwnBackground: true,
  slideTypes: ["content"],
  slots: [
    { name: "heading", accepts: [] },
    { name: "subheading", accepts: [] },
    { name: "body", accepts: [], capacity: 0 },
  ],
  arrangements: ["single"],
  headingFit: MONO_BLEED_HEADING_FIT,
} satisfies LayoutDefinition
