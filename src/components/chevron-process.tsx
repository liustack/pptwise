import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../render/ink"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  fitFormLine,
  formHighlightFill,
  layoutFormTitle,
  formLineHeight,
  formTextClipMarker,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type ChevronProcessComponent = Extract<Component, { type: "chevron_process" }>

/**
 * 首尾咬合的箭头带：每一环是一个 polygon，右端出尖、左端（除第一环外）
 * 内凹，尖与凹刚好互补，所以整条带子读作一条通道而不是几个方块。序号和
 * 环节名画在箭头里，说明行画在箭头下方的页面底色上。终点环整块反色填满、
 * 字反白（填色见 formHighlightFill）——突出一环只有这一种做法。全部
 * polygon/text 原语，导出安全。
 */

/** Notch depth: how far the point juts out, and how far the next one bites in. */
const NOTCH = 26
/** Seam between two chevrons, so the interlock reads as a joint. */
const SEAM = 3
const BAND_H = 118
const NOTE_GAP = 18

interface Chevron {
  i: number
  x0: number
  x1: number
  notch: number
  textLeft: number
  textRight: number
}

interface Geometry {
  band: number
  chevrons: Chevron[]
  indexSize: number
  titleSize: number
  noteSize: number
  h: number
}

function resolve(component: ChevronProcessComponent, w: number): Geometry {
  const n = component.items.length
  const notch = Math.min(NOTCH, Math.max(12, w / (n * 8)))
  const advance = (w - notch) / n
  const chevrons: Chevron[] = component.items.map((_, i) => {
    const x0 = i * advance
    const x1 = x0 + advance + notch - SEAM
    return {
      i,
      x0,
      x1,
      notch,
      textLeft: x0 + (i === 0 ? 16 : notch + 12),
      textRight: x1 - notch - 12,
    }
  })
  const inner = Math.max(24, advance - notch - 28)
  const titleSize = Math.max(FORM_TITLE_FLOOR, Math.min(24, Math.round(inner * 0.2)))
  const hasNote = component.items.some((item) => (item.text ?? "").trim() !== "")
  const band = BAND_H
  return {
    band,
    chevrons,
    indexSize: FORM_BODY_FLOOR,
    titleSize,
    noteSize: FORM_BODY_FLOOR,
    h: band + (hasNote ? NOTE_GAP + formLineHeight(FORM_BODY_FLOOR) : 0),
  }
}

/** Right-pointing chevron; the left side is flat on the first one and notched after it. */
function chevronPoints(c: Chevron, band: number): string {
  const mid = band / 2
  const outline = [
    `${c.x0},0`,
    `${c.x1 - c.notch},0`,
    `${c.x1},${mid}`,
    `${c.x1 - c.notch},${band}`,
    `${c.x0},${band}`,
  ]
  // Only a chevron with a predecessor bites in; the first one's tail is flat.
  if (c.i > 0) outline.push(`${c.x0 + c.notch},${mid}`)
  return outline.join(" ")
}

export const chevronProcess: SvgComponent<ChevronProcessComponent> = {
  measure(component, w) {
    return resolve(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolve(component, box.w)
    // A note prints on the page under the band, so it may run under the next
    // chevron's notch — it stops where the next note starts, not where this
    // chevron's own point begins.
    const noteWidth = (i: number): number =>
      (i === g.chevrons.length - 1 ? box.w : g.chevrons[i + 1]!.textLeft - 12) - g.chevrons[i]!.textLeft
    const border = ctx.colors.border ?? ctx.colors.muted
    const last = component.items.length - 1
    const highlight = formHighlightFill(ctx.colors)

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {g.chevrons.map((c) => {
          const item = component.items[c.i]!
          const filled = c.i === last
          const fill = filled ? highlight : ctx.colors.surface
          const textW = Math.max(24, c.textRight - c.textLeft)
          const index = String(c.i + 1).padStart(2, "0")
          const indexInk = accessibleInk(filled ? ctx.colors.surface : ctx.colors.muted, fill, g.indexSize)
          const titleLayout = layoutFormTitle(item.title, {
            maxWidth: textW,
            fontSize: g.titleSize,
            maxLines: 2,
            fontFamily: ctx.fonts.heading,
          })
          const titleInk = accessibleInk(filled ? ctx.colors.surface : ctx.colors.primary, fill, titleLayout.fontSize)
          const blockH = formLineHeight(g.indexSize) + titleLayout.lines.length * titleLayout.lineHeight
          const top = g.band / 2 - blockH / 2
          const note = (item.text ?? "").trim()
          const noteFit = note
            ? fitFormLine(note, {
                maxWidth: Math.max(24, noteWidth(c.i)),
                fontSize: g.noteSize,
                fontFamily: ctx.fonts.body,
              })
            : null
          return (
            <g key={`chevron-${c.i}`}>
              <polygon
                points={chevronPoints(c, g.band)}
                fill={fill}
                stroke={filled ? highlight : border}
                strokeWidth={1}
              />
              <text
                x={c.textLeft}
                y={top + g.indexSize * 0.9}
                fontFamily={ctx.fonts.body}
                fontSize={g.indexSize}
                letterSpacing={1}
                fill={indexInk}
              >
                {index}
              </text>
              {titleLayout.lines.map((line, li) => (
                <text
                  key={`title-${li}`}
                  data-truncated={formTextClipMarker(titleLayout, li)}
                  x={c.textLeft}
                  y={top + formLineHeight(g.indexSize) + li * titleLayout.lineHeight + titleLayout.fontSize * 0.9}
                  fontFamily={ctx.fonts.heading}
                  fontSize={titleLayout.fontSize}
                  fontWeight="700"
                  fill={titleInk}
                >
                  {line}
                </text>
              ))}
              {noteFit ? (
                <text
                  data-truncated={noteFit.truncated ? "1" : undefined}
                  x={c.textLeft}
                  y={g.band + NOTE_GAP + noteFit.fontSize * 0.9}
                  fontFamily={ctx.fonts.body}
                  fontSize={noteFit.fontSize}
                  fill={accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, noteFit.fontSize)}
                >
                  {noteFit.text}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<ChevronProcessComponent> = {
  type: "chevron_process",
  measure: chevronProcess.measure,
  render: chevronProcess.render,
}
