import type { Component } from "@/ir"
import { DroppedContentMarker } from "../render/drop-marker"
import { contrastRatio, readableOn, relativeLuminance, requiredContrastRatio } from "../render/ink"
import { mixHex } from "./color-mix"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine, layoutFormBody } from "./legibility"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type PyramidComponent = Extract<Component, { type: "pyramid" }>

/**
 * 金字塔：自上而下逐层加宽的梯形带，顶层最窄。作者写了说明时，右边跟一列
 * 图例卡，色块和它对应的那一层同色——色块在这里是索引，不是装饰。
 *
 * 层名只印在带子上，图例里不再重复一遍：图例行和它对应的那一层等高对齐，
 * 又带同色索引，名字写第二次只是把同一句话说两遍。
 *
 * 层色是单一色相的渐隐：primary 向页面底色退，退到最下面一层。不借
 * chartPalette 的次序，因为这几层不是几个并列的系列，是同一件事的深浅。
 */

const LAYER_H = 96
const LAYER_GAP = 2
const APEX_RATIO = 0.36
const LABEL_PX = 20
const LEGEND_NOTE_PX = FORM_BODY_FLOOR
const LEGEND_GAP = 20
const LEGEND_ROW_GAP = 12
const NOTE_LINE_RATIO = 1.35
const LEGEND_PAD = 20
const SWATCH = 12
const TWO_COLUMN_MIN_W = 780
const PYRAMID_MIN_W = 320
const LEGEND_MIN_W = 300

function hasNotes(component: PyramidComponent): boolean {
  return component.layers.some((layer) => layer.note !== undefined && layer.note.trim() !== "")
}

/**
 * The ramp's own middle is the problem: a band whose fill lands near
 * mid-luminance has no legible ink at all — neither white nor near-black
 * clears 4.5:1 on it, and `readableOn` picking the better of two failures is
 * still a failure. So a band that lands there is pushed further the way its
 * own ink already points, in small steps, until the ink it will actually be
 * painted with clears the floor for its own type size.
 *
 * Deterministic and theme-agnostic: same tokens in, same hexes out, and a
 * theme whose ramp never crosses the middle is untouched.
 */
function legibleBand(fill: string, fontSizePx: number): string {
  let current = fill
  for (let step = 0; step < 16; step += 1) {
    const ink = readableOn(current)
    if (contrastRatio(ink, current) >= requiredContrastRatio(fontSizePx)) return current
    current = mixHex(current, ink === "#FFFFFF" ? "#000000" : "#FFFFFF", 0.08)
  }
  return current
}

/**
 * Where the ramp ends.
 *
 * A level below the apex is a step toward the page, and on paper that reads
 * exactly right: `primary` is dark, the page is light, and four levels walk
 * the whole distance. On a dark theme `primary` and the page are neighbours,
 * so the same walk covers almost no ground and the pyramid arrives as one
 * flat slab with hairlines across it. When the two are that close, the ramp
 * turns around and walks toward the page's own readable ink instead — still
 * away from the apex, still the theme's hue, and now a distance a reader can
 * see.
 */
const RAMP_MIN_SPREAD = 0.28

function rampEnd(ctx: ComponentCtx): string {
  const spread = Math.abs(relativeLuminance(ctx.colors.primary) - relativeLuminance(ctx.colors.bg))
  return spread >= RAMP_MIN_SPREAD ? ctx.colors.bg : mixHex(readableOn(ctx.colors.bg), ctx.colors.primary, 0.45)
}

function layerFill(ctx: ComponentCtx, i: number, n: number): string {
  const t = n <= 1 ? 0 : (i / (n - 1)) * 0.78
  return legibleBand(mixHex(ctx.colors.primary, rampEnd(ctx), t), LABEL_PX)
}

export const pyramid: SvgComponent<PyramidComponent> = {
  measure(component) {
    return component.layers.length * LAYER_H
  },

  render(component, box, ctx) {
    const n = component.layers.length
    const h = box.h ?? n * LAYER_H
    const legend = hasNotes(component)
    const twoColumn = legend && box.w >= TWO_COLUMN_MIN_W

    // A legend the box has no column for is content with nowhere to go, and
    // a pyramid under 320px wide has an apex band narrower than one glyph.
    if ((legend && !twoColumn) || (twoColumn ? box.w * 0.5 : box.w) < PYRAMID_MIN_W) {
      return <DroppedContentMarker count={n} kind="item" />
    }

    const drawW = twoColumn ? Math.min(box.w * 0.52 - LEGEND_GAP, 620) : Math.min(box.w, 620)
    const drawX = twoColumn ? 0 : (box.w - drawW) / 2
    const legendX = drawX + drawW + LEGEND_GAP
    const legendW = box.w - legendX
    if (twoColumn && legendW < LEGEND_MIN_W) return <DroppedContentMarker count={n} kind="item" />

    const bandH = h / n
    const apexHalf = (drawW * APEX_RATIO) / 2
    const baseHalf = drawW / 2
    const cx = drawX + drawW / 2
    const halfAt = (row: number) => apexHalf + ((baseHalf - apexHalf) * row) / n
    const radius = ctx.shape?.radius ?? 2
    const rule = ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
    const surface = ctx.colors.surface
    const legendCardH = twoColumn ? (h - (n - 1) * LEGEND_ROW_GAP) / n : 0

    // Every band label and every legend note is fitted before anything is
    // painted, and each is checked against the room it will actually get.
    // The legend used to lay a note out at three lines regardless of the card
    // it lands in: on a short box the card was 32px tall, the note still ran
    // two 20px lines, and the first line started above the component's own
    // top edge — the SVG clipped it, and nothing on the page said so.
    const bands = component.layers.map((layer, i) =>
      fitFormLine(layer.label, {
        maxWidth: halfAt(i) * 2 - 24,
        fontSize: LABEL_PX,
        floor: FORM_BODY_FLOOR,
        bold: true,
        fontFamily: ctx.fonts.body,
      }),
    )
    const noteLines = twoColumn
      ? Math.floor((legendCardH - LEGEND_PAD * 2) / (LEGEND_NOTE_PX * NOTE_LINE_RATIO))
      : 0
    const notes = twoColumn
      ? component.layers.map((layer) =>
          layer.note
            ? layoutFormBody(layer.note, {
                maxWidth: legendW - LEGEND_PAD * 2 - SWATCH - 12,
                fontSize: LEGEND_NOTE_PX,
                maxLines: Math.max(1, noteLines),
                fontFamily: ctx.fonts.body,
              })
            : null,
        )
      : component.layers.map(() => null)

    if (
      anyCut([...bands, ...notes]) ||
      Math.max(...bands.map((b) => b.fontSize)) * NOTE_LINE_RATIO > bandH - LAYER_GAP ||
      (twoColumn && noteLines < 1) ||
      notes.some(
        (note) => note !== null && note.lines.length * note.lineHeight + LEGEND_PAD * 2 > legendCardH,
      )
    ) {
      return <DroppedContentMarker count={n} kind="item" />
    }

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {component.layers.map((layer, i) => {
          const top = i * bandH
          const bottom = top + bandH - LAYER_GAP
          const ht = halfAt(i)
          const hb = halfAt(i + 1)
          const fill = layerFill(ctx, i, n)
          const ink = readableOn(fill)
          const label = bands[i]!
          return (
            <g key={`p${i}`}>
              <polygon
                points={`${cx - ht},${top} ${cx + ht},${top} ${cx + hb},${bottom} ${cx - hb},${bottom}`}
                fill={fill}
              />
              <text
                x={cx}
                y={top + (bottom - top) / 2 + label.fontSize * 0.35}
                textAnchor="middle"
                fontSize={label.fontSize}
                fontWeight="bold"
                fill={ink}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
            </g>
          )
        })}

        {twoColumn
          ? component.layers.map((_layer, i) => {
              const y = i * (legendCardH + LEGEND_ROW_GAP)
              const note = notes[i]!
              const firstY = y + legendCardH / 2 - ((note?.lines.length ?? 1) - 1) * (note?.lineHeight ?? 0) / 2
              return (
                <g key={`g${i}`}>
                  <rect
                    x={legendX}
                    y={y}
                    width={legendW}
                    height={legendCardH}
                    rx={radius}
                    fill={surface}
                    stroke={rule}
                    strokeWidth={1}
                  />
                  <rect
                    x={legendX + LEGEND_PAD}
                    y={y + legendCardH / 2 - SWATCH / 2}
                    width={SWATCH}
                    height={SWATCH}
                    fill={layerFill(ctx, i, n)}
                  />
                  {note?.lines.map((line, k) => (
                    <text
                      key={`n${k}`}
                      x={legendX + LEGEND_PAD + SWATCH + 12}
                      y={firstY + k * note.lineHeight + note.fontSize * 0.35}
                      fontSize={note.fontSize}
                      fill={ctx.colors.text}
                      fontFamily={ctx.fonts.body}
                      dominantBaseline="alphabetic"
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })
          : null}
      </g>
    )
  },
}

export const renderDef: RenderDef<PyramidComponent> = {
  type: "pyramid",
  measure: pyramid.measure,
  render: pyramid.render,
}
