import type { Component } from "@/ir"
import { fitSvgLine, measureTextUnits } from "../lib/svg-text-layout"
import { mixHex } from "./color-mix"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type ArchitectureComponent = Extract<Component, { type: "architecture" }>

const LAYER_H = 64
const INDEX_X = 16
const TITLE_X = 72
const TITLE_COL = 280
const TITLE_FONT_SIZE = 16
const ITEMS_FONT_SIZE = 16
const INDEX_FONT_SIZE = 16
const TITLE_BASELINE_Y = 38
const ITEMS_BASELINE_Y = 38
const INDEX_BASELINE_Y = 38
const SEPARATOR = " · "
const PAD = 16
const MIN_FONT_SIZE = 16
const HAIRLINE_W = 1

/**
 * 分层栈：IR 本来就是 layers，一层一条带，层间一根细线。层内左侧编号、
 * 中间层名、右侧该层的构件串。没有哪一层被默认点亮——IR 没说哪层是重点，
 * 渲染器就不替作者选。
 */
function layerFill(ctx: ComponentCtx): string {
  return ctx.colors.panel ?? ctx.colors.surface
}

function hairlineColor(ctx: ComponentCtx): string {
  return ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
}

interface ItemRun {
  readonly text: string
  /** This run is a cut piece of the author's item, not the whole of it. */
  readonly truncated: boolean
}

/**
 * The layer's構件串, run by run rather than as one joined string.
 *
 * Joining the items and fitting the result made the cut unattributable: a
 * line reading "网关 · 鉴权 · 限…" carries one `data-truncated`, and nothing
 * downstream can tell which of the author's items survived whole, which one
 * was cut, and which never made it. Every item after the cut looked exactly
 * like an item that was never authored.
 *
 * Measuring run by run keeps that answer on the page: an item that fits is
 * painted whole and is findable verbatim, the one the width runs out on is
 * cut and says so on its own element, and anything past it is reported as
 * `dropped` for the caller to mark.
 */
function fitItemRuns(
  items: readonly string[],
  opts: { maxWidth: number; fontSize: number; fontFamily?: string },
): { runs: ItemRun[]; dropped: number } {
  const width = (text: string) => measureTextUnits(text, { fontFamily: opts.fontFamily }) * opts.fontSize
  const runs: ItemRun[] = []
  let used = 0
  for (const [i, item] of items.entries()) {
    const lead = i === 0 ? "" : SEPARATOR
    const remaining = opts.maxWidth - used - width(lead)
    if (remaining <= 0) return { runs, dropped: items.length - i }
    if (width(item) <= remaining) {
      if (lead) runs.push({ text: lead, truncated: false })
      runs.push({ text: item, truncated: false })
      used += width(lead) + width(item)
      continue
    }
    const cut = fitSvgLine(item, {
      maxWidth: remaining,
      fontSize: opts.fontSize,
      minFontSize: opts.fontSize,
      fontFamily: opts.fontFamily,
    })
    // A cut down to a character or less communicates nothing about the item
    // it came from — a lone 西 is not "西南产区" partly shown, it is the item
    // gone with a stray glyph left behind. Report it as a drop so the marker
    // speaks for it instead of a fragment that reads like a different word.
    if (Array.from(cut.text.trim()).length < 2) return { runs, dropped: items.length - i }
    if (lead) runs.push({ text: lead, truncated: false })
    runs.push({ text: cut.text, truncated: true })
    return { runs, dropped: items.length - i - 1 }
  }
  return { runs, dropped: 0 }
}

export const architecture: SvgComponent<ArchitectureComponent> = {
  measure(component) {
    return component.layers.length * LAYER_H
  },
  render(rawComponent, box, ctx) {
    const bottomUp = rawComponent.direction === "bottom_up"
    const count = rawComponent.layers.length
    const titleMax = Math.max(80, Math.min(TITLE_COL, box.w * 0.34) - 8)
    const itemsX = TITLE_X + titleMax + 12
    const itemsMax = Math.max(40, box.w - itemsX - PAD)
    const rule = hairlineColor(ctx)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {rawComponent.layers.map((layer, i) => {
          const slot = bottomUp ? count - 1 - i : i
          const layerY = slot * LAYER_H
          const fill = layerFill(ctx)
          const titleInk = ctx.colors.primary
          const bodyInk = ctx.colors.text
          const indexInk = ctx.colors.muted
          const title = fitSvgLine(layer.title, {
            maxWidth: titleMax,
            fontSize: TITLE_FONT_SIZE,
            minFontSize: MIN_FONT_SIZE,
          })
          const items = fitItemRuns(layer.items, {
            maxWidth: itemsMax,
            fontSize: ITEMS_FONT_SIZE,
            fontFamily: ctx.fonts.body,
          })
          const index = `L${i + 1}`
          return (
            <g key={i}>
              <rect x={0} y={layerY} width={box.w} height={LAYER_H} rx={0} fill={fill} />
              <text
                x={INDEX_X}
                y={layerY + INDEX_BASELINE_Y}
                fontSize={INDEX_FONT_SIZE}
                fontFamily={ctx.fonts.mono}
                fill={indexInk}
                dominantBaseline="alphabetic"
              >
                {index}
              </text>
              <text
                data-truncated={title.truncated ? "1" : undefined}
                x={TITLE_X}
                y={layerY + TITLE_BASELINE_Y}
                fontSize={title.fontSize}
                fontWeight="bold"
                fontFamily={ctx.fonts.heading}
                fill={titleInk}
                dominantBaseline="alphabetic"
              >
                {title.text}
              </text>
              <text
                x={itemsX}
                y={layerY + ITEMS_BASELINE_Y}
                fontSize={ITEMS_FONT_SIZE}
                fontFamily={ctx.fonts.body}
                fill={bodyInk}
                dominantBaseline="alphabetic"
              >
                {items.runs.map((run, k) => (
                  <tspan key={k} data-truncated={run.truncated ? "1" : undefined}>
                    {run.text}
                  </tspan>
                ))}
              </text>
              {/* Same bare marker `bullets.tsx` stamps for its own cut items:
                  `deck-audit` reports it as `content-dropped`, so a layer
                  whose 構件串 outran its column says so somewhere a machine
                  can find. */}
              {items.dropped > 0 && <g data-dropped={items.dropped} data-dropped-kind="item" />}
            </g>
          )
        })}
        {Array.from({ length: Math.max(0, count - 1) }, (_, s) => (
          <line
            key={`rule-${s}`}
            x1={0}
            y1={(s + 1) * LAYER_H}
            x2={box.w}
            y2={(s + 1) * LAYER_H}
            stroke={rule}
            strokeWidth={HAIRLINE_W}
          />
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<ArchitectureComponent> = {
  type: "architecture",
  measure: architecture.measure,
  render: architecture.render,
}
