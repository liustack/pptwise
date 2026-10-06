import type React from "react"
import type { Component } from "@/ir"
import { fitSvgLine } from "../lib/svg-text-layout"
import { accessibleInk } from "../render/ink"
import type { ComponentBox, ComponentCtx, RenderDef, SvgComponent } from "./types"

/**
 * A block's own title: one line naming a table, an options comparison, a
 * timeline, a set of cards or a chart ("自由现金流", "2026 年外部融资和长期
 * 承诺"), set over it at 16px bold in the text ink, the block drawn in the
 * rest of its box. A face that sets the block in a panel prints the title
 * in the panel's title bar instead (`layouts/compositions/panel.tsx`), and a
 * composition with no place for a title declines the block, so the ordinary
 * renderer draws it here.
 *
 * Wraps a component's `measure` and `render`: a block with no title is
 * measured and drawn exactly as before.
 */

/** The title's line box: a 16px line on a 20px baseline, 12px of air under it. */
export const BLOCK_TITLE = { size: 16, baseline: 20, band: 32 } as const

type Titled = Extract<Component, { type: "data_table" | "comparison" | "timeline" | "icon_cards" | "chart" }>

function titleOf(component: Titled): string | undefined {
  return component.title?.trim() || undefined
}

export function withBlockTitle<T extends Titled>(def: RenderDef<T>): RenderDef<T> {
  const measure: SvgComponent<T>["measure"] = (component, w, ctx) =>
    (titleOf(component) ? BLOCK_TITLE.band : 0) + def.measure(component, w, ctx)
  const render: SvgComponent<T>["render"] = (component, box, ctx) => {
    const title = titleOf(component)
    if (!title) return def.render(component, box, ctx)
    const inner: ComponentBox = {
      x: box.x,
      y: box.y + BLOCK_TITLE.band,
      w: box.w,
      ...(box.h !== undefined ? { h: Math.max(0, box.h - BLOCK_TITLE.band) } : {}),
    }
    return (
      <g data-block-title="">
        <BlockTitle title={title} box={box} ctx={ctx} />
        {def.render(component, inner, ctx)}
      </g>
    )
  }
  const minHeight: SvgComponent<T>["measure"] | undefined = def.minHeight
    ? (component, w, ctx) => (titleOf(component) ? BLOCK_TITLE.band : 0) + def.minHeight!(component, w, ctx)
    : undefined
  return { type: def.type, measure, render, ...(minHeight ? { minHeight } : {}) }
}

function BlockTitle({ title, box, ctx }: { title: string; box: ComponentBox; ctx: ComponentCtx }): React.ReactElement {
  const fit = fitSvgLine(title, {
    maxWidth: box.w,
    fontSize: BLOCK_TITLE.size,
    minFontSize: BLOCK_TITLE.size,
    bold: true,
    fontFamily: ctx.fonts.body,
  })
  return (
    <text
      data-truncated={fit.truncated ? "1" : undefined}
      x={box.x}
      y={box.y + BLOCK_TITLE.baseline}
      fontFamily={ctx.fonts.body}
      fontSize={fit.fontSize}
      fontWeight="bold"
      fill={accessibleInk(ctx.colors.text, ctx.defaultBg ?? ctx.colors.bg, fit.fontSize)}
      dominantBaseline="alphabetic"
    >
      {fit.text}
    </text>
  )
}
