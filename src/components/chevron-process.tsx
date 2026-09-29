import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../render/ink"
import {
  boxTooShort,
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  formHighlightFill,
  layoutFormBody,
  layoutFormTitle,
  formLineHeight,
  formTextClipMarker,
} from "./legibility"
import { SIBLING_AIR_PX } from "../render/spacing"
import { DroppedContentMarker } from "../render/drop-marker"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

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
/**
 * A note is a short line, but a common English phrase at the body floor is
 * wider than a quarter of the page: it wraps to a second line under its own
 * chevron rather than losing its tail.
 */
const NOTE_MAX_LINES = 2

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
  notes: (ReturnType<typeof layoutFormBody> | null)[]
  h: number
}

function resolve(component: ChevronProcessComponent, w: number, ctx: ComponentCtx, noteCap = NOTE_MAX_LINES): Geometry {
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
  // A note prints on the page under the band, so it may run under the next
  // chevron's notch — it stops a sibling's air short of where the next note
  // starts, not where this chevron's own point begins. Two notes share a
  // baseline, and 12px between them read as one run-on line.
  const noteWidth = (i: number): number =>
    (i === chevrons.length - 1 ? w : chevrons[i + 1]!.textLeft - SIBLING_AIR_PX) - chevrons[i]!.textLeft
  const notes = component.items.map((item, i) => {
    const note = (item.text ?? "").trim()
    return note
      ? layoutFormBody(note, {
          maxWidth: Math.max(24, noteWidth(i)),
          fontSize: FORM_BODY_FLOOR,
          maxLines: noteCap,
          fontFamily: ctx.fonts.body,
        })
      : null
  })
  const noteLines = Math.max(0, ...notes.map((n) => n?.lines.length ?? 0))
  const band = BAND_H
  return {
    band,
    chevrons,
    indexSize: FORM_BODY_FLOOR,
    titleSize,
    noteSize: FORM_BODY_FLOOR,
    notes,
    h: band + (noteLines > 0 ? NOTE_GAP + noteLines * formLineHeight(FORM_BODY_FLOOR) : 0),
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
  measure(component, w, ctx) {
    return resolve(component, w, ctx).h
  },

  render(component, box, ctx): ReactElement {
    // A box shorter than the band and its wrapped notes gives the notes'
    // second line back: each note keeps its first line, cut and marked, as
    // it always did, rather than running past the bottom of the box.
    const wrapped = resolve(component, box.w, ctx)
    const g = box.h !== undefined && box.h > 0 && wrapped.h > box.h ? resolve(component, box.w, ctx, 1) : wrapped
    // With one line of note the band is as short as it gets. A box shorter
    // still cannot hold it, so the band declines the box.
    if (boxTooShort(g.h, box.h)) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }
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
          const noteFit = g.notes[c.i]
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
              {noteFit?.lines.map((line, li) => (
                <text
                  key={`note-${li}`}
                  data-truncated={formTextClipMarker(noteFit, li)}
                  x={c.textLeft}
                  y={g.band + NOTE_GAP + li * noteFit.lineHeight + noteFit.fontSize * 0.9}
                  fontFamily={ctx.fonts.body}
                  fontSize={noteFit.fontSize}
                  fill={accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, noteFit.fontSize)}
                >
                  {line}
                </text>
              ))}
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
