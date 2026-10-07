import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../render/ink"
import { DroppedContentMarker } from "../render/drop-marker"
import { anyCut } from "./declared-fit"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  capFormBody,
  formTextClipMarker,
  formTextOmissionMarker,
  layoutFormBody,
  layoutFormTitle,
} from "./legibility"
import type { RenderDef, SvgComponent } from "./types"

type HubSpokeComponent = Extract<Component, { type: "hub_spoke" }>

/**
 * 中心概念 + 3-6 个并列要素：中心画空心圆（surface 填充、accent 描边），
 * 每个要素是一枚胶囊，胶囊内左/右侧一个序号徽标，标签粗体、说明一行。
 * 辐条从中心圆缘连到胶囊最近的边缘。全部 circle/rect/line/text 原语，
 * 导出安全。
 *
 * A box narrow enough to scale the drawing past what its words need (a hub
 * set beside a second component in half the page) used to cut the labels and
 * descriptions down to a few characters and mark them truncated. Every fit
 * is now made before anything is painted, and a drawing that would cut any
 * of them declines whole (`declared-fit.ts`), so the page steps aside to a
 * rendering with room or the loss is declared.
 */

function nodeAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n
}

const MAX_H = 400
const MAX_UPSCALE = 1.12
const PAD = 8

interface Capsule {
  i: number
  x: number
  y: number
  w: number
  h: number
  badge: "left" | "right"
}

function sizes(n: number): { capW: number; capH: number; hubR: number; spoke: number } {
  if (n <= 3) return { capW: 300, capH: 88, hubR: 92, spoke: 36 }
  if (n === 4) return { capW: 300, capH: 88, hubR: 92, spoke: 32 }
  return { capW: 230, capH: 76, hubR: 72, spoke: 24 }
}

function placeCapsules(n: number, capW: number, capH: number, hubR: number, spoke: number): Capsule[] {
  if (n === 3) {
    return [
      { i: 0, x: -capW / 2, y: -(hubR + spoke + capH), w: capW, h: capH, badge: "left" },
      { i: 1, x: hubR + spoke, y: -capH / 2, w: capW, h: capH, badge: "right" },
      { i: 2, x: -(hubR + spoke + capW), y: -capH / 2, w: capW, h: capH, badge: "left" },
    ]
  }
  if (n === 4) {
    const dx = hubR + spoke
    const dy = hubR * 0.58
    return [
      { i: 0, x: -dx - capW, y: -dy - capH / 2, w: capW, h: capH, badge: "left" },
      { i: 1, x: dx, y: -dy - capH / 2, w: capW, h: capH, badge: "right" },
      { i: 2, x: -dx - capW, y: dy - capH / 2, w: capW, h: capH, badge: "left" },
      { i: 3, x: dx, y: dy - capH / 2, w: capW, h: capH, badge: "right" },
    ]
  }
  if (n === 5) {
    const dx = hubR + spoke
    const dy = hubR * 0.62
    return [
      { i: 0, x: -capW / 2, y: -(hubR + spoke + capH), w: capW, h: capH, badge: "left" },
      { i: 1, x: dx, y: -dy - capH / 2, w: capW, h: capH, badge: "right" },
      { i: 2, x: dx, y: dy - capH / 2, w: capW, h: capH, badge: "right" },
      { i: 3, x: -dx - capW, y: dy - capH / 2, w: capW, h: capH, badge: "left" },
      { i: 4, x: -dx - capW, y: -dy - capH / 2, w: capW, h: capH, badge: "left" },
    ]
  }
  return Array.from({ length: n }, (_, i) => {
    const a = nodeAngle(i, n)
    const cos = Math.cos(a)
    const sin = Math.sin(a)
    const ix = cos * (hubR + spoke)
    const iy = sin * (hubR + spoke)
    if (cos >= 0.3) {
      return { i, x: ix, y: iy - capH / 2, w: capW, h: capH, badge: "right" as const }
    }
    if (cos <= -0.3) {
      return { i, x: ix - capW, y: iy - capH / 2, w: capW, h: capH, badge: "left" as const }
    }
    if (sin < 0) {
      return { i, x: ix - capW / 2, y: iy - capH, w: capW, h: capH, badge: "left" as const }
    }
    return { i, x: ix - capW / 2, y: iy, w: capW, h: capH, badge: "left" as const }
  })
}

interface HubGeom {
  scale: number
  ox: number
  oy: number
  hubR: number
  caps: Capsule[]
  h: number
}

function resolveHub(component: HubSpokeComponent, w: number, boxH?: number): HubGeom {
  const n = component.items.length
  const { capW, capH, hubR, spoke } = sizes(n)
  const caps = placeCapsules(n, capW, capH, hubR, spoke)
  let minX = -hubR
  let minY = -hubR
  let maxX = hubR
  let maxY = hubR
  for (const c of caps) {
    minX = Math.min(minX, c.x)
    minY = Math.min(minY, c.y)
    maxX = Math.max(maxX, c.x + c.w)
    maxY = Math.max(maxY, c.y + c.h)
  }
  minX -= PAD
  minY -= PAD
  maxX += PAD
  maxY += PAD
  const bboxW = maxX - minX
  const bboxH = maxY - minY
  // A face may hand over less height than the drawing's own ceiling; the
  // drawing then scales into it rather than running past its bottom edge,
  // and a capsule too small for its words cuts them and says so.
  const heightBudget = boxH !== undefined && boxH > 0 ? Math.min(MAX_H, boxH) : MAX_H
  const scale = Math.min(w / bboxW, heightBudget / bboxH, MAX_UPSCALE)
  const drawnW = bboxW * scale
  const ox = (w - drawnW) / 2 + (0 - minX) * scale
  const oy = (0 - minY) * scale
  return {
    scale,
    ox,
    oy,
    hubR,
    caps: caps.map((c) => ({
      ...c,
      x: ox + c.x * scale,
      y: oy + c.y * scale,
      w: c.w * scale,
      h: c.h * scale,
    })),
    h: bboxH * scale,
  }
}

function spokeEnd(ox: number, oy: number, cap: Capsule): { x: number; y: number } {
  const r = cap.h / 2
  const x0 = cap.x + r
  const x1 = cap.x + cap.w - r
  const cy = cap.y + r
  if (ox >= x0 && ox <= x1) {
    const top = cap.y
    const bot = cap.y + cap.h
    return { x: ox, y: Math.abs(oy - top) < Math.abs(oy - bot) ? top : bot }
  }
  const ccx = ox < x0 ? x0 : x1
  const vx = ox - ccx
  const vy = oy - cy
  const len = Math.hypot(vx, vy) || 1
  return { x: ccx + (vx / len) * r, y: cy + (vy / len) * r }
}

export const hubSpoke: SvgComponent<HubSpokeComponent> = {
  measure(component, w) {
    return resolveHub(component, w).h
  },

  render(component, box, ctx): ReactElement {
    const g = resolveHub(component, box.w, box.h)
    const { ox, oy, caps, scale } = g
    const hubR = g.hubR * scale
    const hubLayout = layoutFormTitle(component.center, {
      maxWidth: hubR * 1.55,
      fontSize: Math.max(FORM_TITLE_FLOOR, Math.round(22 * scale)),
      maxLines: 2,
      fontFamily: ctx.fonts.heading,
    })
    // The drawing scales into a short box but its type stops at the 20px
    // floor, so below some size the words no longer fit their shapes: a
    // label's ink reaches 0.65em either side of its capsule's middle, and the
    // centre's lines need the hub's full height. The smallest drawing that
    // still holds them is the smallest one this component draws; a box that
    // cannot give it that much height gets the whole component declined.
    const labelSize = Math.max(FORM_TITLE_FLOOR, Math.round(16 * scale))
    const holdsWords =
      caps.every((cap) => cap.h >= 1.3 * labelSize + 2) &&
      2 * hubR >= hubLayout.lines.length * hubLayout.lineHeight
    if (!holdsWords) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }
    const capFits = caps.map((cap) => {
      const item = component.items[cap.i]!
      const badgeR = cap.h * 0.36
      const inset = cap.h * 0.14
      const badgeCx = cap.badge === "left" ? cap.x + inset + badgeR : cap.x + cap.w - inset - badgeR
      const textLeft = cap.badge === "left" ? badgeCx + badgeR + 8 : cap.x + 12
      const textRight = cap.badge === "left" ? cap.x + cap.w - 12 : badgeCx - badgeR - 8
      const textW = Math.max(24, textRight - textLeft)
      const labelFit = layoutFormTitle(item.label, {
        maxWidth: textW,
        fontSize: Math.max(FORM_TITLE_FLOOR, Math.round(16 * scale)),
        maxLines: 1,
        fontFamily: ctx.fonts.body,
      })
      const desc = item.description?.trim()
      const descBudget = cap.h - labelFit.lineHeight - 8
      const descSize = capFormBody(labelFit.fontSize, Math.round(13 * scale))
      // The capsule is tall enough for a second line under the label; a
      // description that runs past one line takes it rather than being cut.
      const descMaxLines = descBudget >= 2 * Math.round(descSize * 1.25) ? 2 : 1
      const descLayout =
        desc && descBudget >= FORM_BODY_FLOOR
          ? layoutFormBody(desc, {
              maxWidth: textW,
              fontSize: descSize,
              titleSize: labelFit.fontSize,
              maxLines: descMaxLines,
              lineHeightRatio: 1.25,
              fontFamily: ctx.fonts.body,
            })
          : null
      // A description with no line of room is cut as surely as one cut short.
      const descLost = Boolean(desc) && (descLayout === null || descLayout.lines.length === 0)
      return { cap, badgeR, badgeCx, textLeft, textRight, labelFit, desc, descLayout, descLost }
    })
    if (anyCut([hubLayout, ...capFits.flatMap((fit) => [fit.labelFit, fit.descLayout])]) || capFits.some((fit) => fit.descLost)) {
      return (
        <g transform={`translate(${box.x},${box.y})`}>
          <DroppedContentMarker count={1} kind="component" />
        </g>
      )
    }
    const border = ctx.colors.border ?? ctx.colors.muted
    const hubFill = ctx.colors.surface

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {caps.map((cap) => {
          const end = spokeEnd(ox, oy, cap)
          const dx = end.x - ox
          const dy = end.y - oy
          const len = Math.hypot(dx, dy) || 1
          const x1 = ox + (dx / len) * hubR
          const y1 = oy + (dy / len) * hubR
          return (
            <line
              key={`spoke-${cap.i}`}
              x1={x1}
              y1={y1}
              x2={end.x}
              y2={end.y}
              stroke={border}
              strokeWidth={1.5}
            />
          )
        })}
        <circle cx={ox} cy={oy} r={hubR} fill={hubFill} stroke={ctx.colors.accent} strokeWidth={1.5} />
        {(() => {
          const layout = hubLayout
          const lines = layout.lines
          const totalH = lines.length * layout.lineHeight
          const top = oy - totalH / 2
          const ink = accessibleInk(ctx.colors.accent, hubFill, layout.fontSize)
          return lines.map((line, li) => (
            <text
              key={`hub-${li}`}
              data-truncated={formTextClipMarker(layout, li)}
              x={ox}
              y={top + li * layout.lineHeight + layout.fontSize * 0.92}
              textAnchor="middle"
              fontFamily={ctx.fonts.heading}
              fontSize={layout.fontSize}
              fontWeight="700"
              fill={ink}
            >
              {line}
            </text>
          ))
        })()}
        {capFits.map(({ cap, badgeR, badgeCx, textLeft, textRight, labelFit, desc, descLayout }) => {
          const badgeCy = cap.y + cap.h / 2
          const badgeFill = ctx.colors.accent
          const glyph = String(cap.i + 1)
          const glyphSize = Math.max(FORM_BODY_FLOOR, Math.round(16 * scale))
          const glyphInk = accessibleInk(ctx.colors.surface, badgeFill, glyphSize)
          const anchor = cap.badge === "left" ? "start" : "end"
          const tx = cap.badge === "left" ? textLeft : textRight
          const descLines = descLayout?.lines ?? []
          const descInk = accessibleInk(ctx.colors.muted, ctx.colors.surface, descLayout?.fontSize ?? 12)
          const blockH = labelFit.fontSize + (descLines.length > 0 ? descLines.length * descLayout!.lineHeight : 0)
          const labelY = cap.y + cap.h / 2 - blockH / 2 + labelFit.fontSize * 0.9
          const descY = labelY + (descLayout ? descLayout.lineHeight : 0)
          return (
            <g
              key={`cap-${cap.i}`}
              data-truncated={formTextOmissionMarker(desc ?? "", descLayout ?? { lines: [] })}
            >
              <rect
                x={cap.x}
                y={cap.y}
                width={cap.w}
                height={cap.h}
                rx={cap.h / 2}
                fill={ctx.colors.surface}
                stroke={border}
                strokeWidth={1.25}
              />
              <circle cx={badgeCx} cy={badgeCy} r={badgeR} fill={badgeFill} />
              {/* The badge number states its baseline, 0.35 em below the
                  disc's center. `dominant-baseline="middle"` centered it in
                  the preview only: the export lands the baseline on `y`, so
                  in the deck the number rose a third of an em in its disc. */}
              <text
                x={badgeCx}
                y={badgeCy + glyphSize * 0.35}
                textAnchor="middle"
                dominantBaseline="alphabetic"
                fontFamily={ctx.fonts.heading}
                fontSize={glyphSize}
                fontWeight="700"
                fill={glyphInk}
              >
                {glyph}
              </text>
              <text
                data-truncated={labelFit.truncated ? "1" : undefined}
                x={tx}
                y={labelY}
                textAnchor={anchor}
                fontFamily={ctx.fonts.body}
                fontSize={labelFit.fontSize}
                fontWeight="700"
                fill={ctx.colors.text}
              >
                {labelFit.lines[0] ?? ""}
              </text>
              {descLines.map((line, li) =>
                line ? (
                  <text
                    key={`desc-${li}`}
                    data-truncated={formTextClipMarker(descLayout!, li)}
                    x={tx}
                    y={descY + li * descLayout!.lineHeight}
                    textAnchor={anchor}
                    fontFamily={ctx.fonts.body}
                    fontSize={descLayout!.fontSize}
                    fill={descInk}
                  >
                    {line}
                  </text>
                ) : null,
              )}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<HubSpokeComponent> = {
  type: "hub_spoke",
  measure: hubSpoke.measure,
  render: hubSpoke.render,
}
