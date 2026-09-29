import type { ReactElement } from "react"
import type { Component } from "@/ir"
import { accessibleInk } from "../render/ink"
import { DroppedContentMarker } from "../render/drop-marker"
import {
  FORM_BODY_FLOOR,
  FORM_TITLE_FLOOR,
  capFormBody,
  fitFormTitleLine,
  formTextClipMarker,
  layoutFormBody,
  layoutFormTitle,
} from "./legibility"
import { endsInCjkOrphan, measureTextUnits } from "../lib/svg-text-layout"
import type { RenderDef, SvgComponent } from "./types"

type CycleComponent = Extract<Component, { type: "cycle" }>

/**
 * 闭环：阶段节点等角分布在一个虚线圆环上，首个节点放大并用 accent 描边标出
 * 读起点，说明文字沿各节点向外排。标题居中压在环上方。
 *
 * A node is a circle while its label fits inside one. A label that does not
 * (one English word wider than the circle, a name that needs a third line)
 * stretches its node sideways into a capsule of the same height, so the
 * word stays whole and the first node stays the tallest.
 */

/** 12 o'clock, clockwise. */
function nodeAngle(i: number, n: number): number {
  return -Math.PI / 2 + (i * 2 * Math.PI) / n
}

const CURRENT_R = 40
const OTHER_RADII = [31, 36, 30, 33, 30, 34, 30]
const NODE_GAP = 22
const MIN_RING_R = 110
const GAP_NODE_DESC = 14
const DESC_W = 176
const DESC_MAX_LINES = 3
const DESC_FONT = 16
const DESC_LINE_RATIO = 1.3
const TITLE_FONT = 20
const TITLE_MIN = FORM_TITLE_FLOOR
const TITLE_BAND = 36
const TITLE_PAD = 6
const NODE_TEXT_RATIO = 0.42
const MAX_H = 480
const MAX_UPSCALE = 1
/**
 * The widest a capsule's text may run. Enough for a long English word or
 * ten Chinese characters a line; a label that needs more than two lines of
 * this is no longer a stage name, and is cut and declared like any other.
 */
const CAPSULE_TEXT_MAX = 160

function nodeRadius(i: number): number {
  if (i === 0) return CURRENT_R
  return OTHER_RADII[(i - 1) % OTHER_RADII.length]!
}

function ringRadius(n: number, radii: number[]): number {
  let maxChord = 0
  for (let i = 0; i < n; i++) {
    maxChord = Math.max(maxChord, radii[i]! + radii[(i + 1) % n]! + NODE_GAP)
  }
  return Math.max(MIN_RING_R, maxChord / (2 * Math.sin(Math.PI / n)))
}

/**
 * How far two neighbouring capsules may reach, together, before they touch,
 * in the drawing's own units. Kept apart along the line joining their
 * centres, a capsule reaches out by its radius plus its half-length times
 * that line's horizontal share, so the room left over in the chord is
 * divided by that share.
 */
function pairSlack(i: number, j: number, n: number, ringR: number, radii: number[]): number {
  const chordPerR = 2 * Math.sin(Math.PI / n)
  const across = Math.abs(Math.cos(nodeAngle(j, n)) - Math.cos(nodeAngle(i, n))) / chordPerR
  const room = ringR * chordPerR - radii[i]! - radii[j]! - NODE_GAP
  return across > 1e-9 ? Math.max(0, room / across) : Number.POSITIVE_INFINITY
}

interface NodeLabel {
  lines: string[]
  fontSize: number
  lineHeight: number
  truncated: boolean
  /** How far a capsule's flat part must reach either side, in page px. */
  halfLen: number
}

interface LoopGeom {
  n: number
  scale: number
  ox: number
  oy: number
  ringR: number
  radii: number[]
  /** Capsule half-lengths in the drawing's own units, before `scale`. */
  halfLens: number[]
  labels: NodeLabel[]
  hasTitle: boolean
  h: number
  halfW: number
}

/** True when a line break lands inside a run of Latin letters or digits. */
function splitsAWord(text: string, lines: string[]): boolean {
  const flat = text.replace(/\s+/g, " ")
  for (let k = 0; k + 1 < lines.length; k++) {
    const a = lines[k]!
    const b = lines[k + 1]!
    if (/[\p{Script=Latin}\p{Nd}]$/u.test(a) && /^[\p{Script=Latin}\p{Nd}]/u.test(b) && flat.includes(a + b)) return true
  }
  return false
}

/**
 * A node's label at the node's drawn radius `nr`. Inside the circle first;
 * when that cuts the label, breaks a word, or leaves one CJK character alone
 * on the second line (「试运」+「行」), the text area widens until it holds
 * the label whole, and the node becomes a capsule that wide.
 */
function nodeLabel(label: string, nr: number, fontFamily: string, textMax = CAPSULE_TEXT_MAX): NodeLabel {
  const fontSize = Math.max(FORM_BODY_FLOOR, Math.min(FORM_TITLE_FLOOR, Math.round(nr * NODE_TEXT_RATIO)))
  const inCircle = 2 * nr * 0.72
  const at = (maxWidth: number) =>
    layoutFormTitle(label, { maxWidth, fontSize, floor: FORM_BODY_FLOOR, maxLines: 2, fontFamily })
  const clean = (fit: ReturnType<typeof at>) =>
    !fit.truncated && !splitsAWord(label, fit.lines) && !endsInCjkOrphan(fit.lines)
  const first = at(inCircle)
  if (clean(first)) return { ...first, halfLen: 0 }
  const widestAllowed = Math.max(inCircle, textMax)
  const oneLine = Math.min(widestAllowed, measureTextUnits(label.trim(), { bold: true, fontFamily }) * first.fontSize + 1)
  // No width narrower than the longest Latin word can hold it whole, so the
  // search starts there rather than creeping up to it.
  const longestWord = Math.max(
    0,
    ...label
      .split(/\s+/)
      .filter((word) => /^[\p{Script=Latin}\p{Nd}\p{P}]+$/u.test(word))
      .map((word) => measureTextUnits(word, { bold: true, fontFamily }) * first.fontSize + 1),
  )
  let fit = first
  for (let width = Math.min(oneLine, Math.max(inCircle + 2, longestWord)); width < oneLine; width += 2) {
    fit = at(width)
    if (clean(fit)) break
  }
  if (!clean(fit)) fit = at(oneLine)
  const widest = Math.max(...fit.lines.map((line) => measureTextUnits(line, { bold: true, fontFamily }) * fit.fontSize))
  return { ...fit, halfLen: Math.max(0, (widest - inCircle) / 2) }
}

function resolveLoop(component: CycleComponent, w: number, fontFamily: string, boxH?: number): LoopGeom {
  const n = component.items.length
  const radii = component.items.map((_, i) => nodeRadius(i))
  const ringR = ringRadius(n, radii)
  const maxR = Math.max(...radii)
  const hasTitle = !!component.title?.trim()
  const hasDesc = component.items.some((it) => !!it.description?.trim())
  const descBlockH = DESC_MAX_LINES * Math.round(DESC_FONT * DESC_LINE_RATIO)
  const ringHalfW = ringR + maxR + (hasDesc ? GAP_NODE_DESC + DESC_W : 10)
  const halfH = ringR + maxR + (hasDesc ? GAP_NODE_DESC + descBlockH : 10)
  const titleBand = hasTitle ? TITLE_BAND : 0
  const localW = 2 * ringHalfW
  const localH = 2 * halfH + titleBand
  const widthScale = w / Math.max(localW, 1)
  const heightBudget = boxH != null && boxH > 0 ? boxH : MAX_H
  const heightScale = heightBudget / Math.max(localH, 1)
  const scale = Math.min(widthScale, heightScale, MAX_UPSCALE)

  // The ring and its scale are set by the circles alone, so a capsule never
  // shrinks the drawing it sits in. A capsule takes what its label needs out
  // of the room its neighbours leave on the ring and the box leaves at the
  // sides: an even share of each gap first, then whatever a neighbour left
  // unused. A label wider than that is cut and marked.
  const wanted = component.items.map((item, i) => nodeLabel(item.label, radii[i]! * scale, fontFamily))
  const need = wanted.map((label) => label.halfLen / scale)
  const sideRoom = Math.max(0, w / (2 * scale) - ringHalfW)
  const slack = radii.map((_, i) => pairSlack(i, (i + 1) % n, n, ringR, radii))
  const prev = (i: number) => (i + n - 1) % n
  const allowed = need.map((len, i) => Math.max(0, Math.min(len, sideRoom, slack[prev(i)]! / 2, slack[i]! / 2)))
  for (let i = 0; i < n; i++) {
    allowed[i] = Math.max(
      0,
      Math.min(need[i]!, sideRoom, slack[prev(i)]! - allowed[prev(i)]!, slack[i]! - allowed[(i + 1) % n]!),
    )
  }
  const labels = wanted.map((label, i) => {
    if (label.halfLen <= allowed[i]! * scale + 0.01) return label
    const nr = radii[i]! * scale
    return nodeLabel(component.items[i]!.label, nr, fontFamily, 2 * nr * 0.72 + 2 * allowed[i]! * scale)
  })
  const halfLens = labels.map((label) => label.halfLen / scale)
  return {
    n,
    scale,
    ox: w / 2,
    oy: (halfH + titleBand) * scale,
    ringR,
    radii,
    halfLens,
    labels,
    hasTitle,
    h: localH * scale,
    halfW: ringHalfW + Math.max(...halfLens),
  }
}

/** Dashed so the ring reads as a path around the stages, not a drawn shape. */
const RING_DASH = "8 8"

export const cycle: SvgComponent<CycleComponent> = {
  measure(component, w, ctx) {
    return resolveLoop(component, w, ctx.fonts.body).h
  },

  render(component, box, ctx): ReactElement {
  const g = resolveLoop(component, box.w, ctx.fonts.body, box.h)
  const { n, scale, ox, oy, ringR, radii, halfLens, hasTitle } = g
  const r = ringR * scale
  const ringStroke = ctx.colors.accent
  const border = ctx.colors.border ?? ctx.colors.muted

  const ringD = `M ${ox} ${oy - r} A ${r} ${r} 0 0 1 ${ox} ${oy + r} A ${r} ${r} 0 0 1 ${ox} ${oy - r}`

  const descAt = (maxLines: number) =>
    component.items.map((item, i) => {
      if (!item.description?.trim()) return null
      const a = nodeAngle(i, n)
      const outward = { x: Math.cos(a), y: Math.sin(a) }
      const nr = radii[i]!
      // A capsule reaches further out along its own flat side.
      const anchorR = (ringR + nr + halfLens[i]! * Math.abs(outward.x) + GAP_NODE_DESC) * scale
      const ax = ox + outward.x * anchorR
      const ay = oy + outward.y * anchorR
      const maxWidth = DESC_W * scale
      const nodeFont = Math.max(
        FORM_BODY_FLOOR,
        Math.min(FORM_TITLE_FLOOR, Math.round(nr * scale * NODE_TEXT_RATIO)),
      )
      const wrapped = layoutFormBody(item.description, {
        maxWidth,
        fontSize: capFormBody(nodeFont, Math.round(DESC_FONT * scale)),
        titleSize: nodeFont,
        maxLines,
        lineHeightRatio: DESC_LINE_RATIO,
        fontFamily: ctx.fonts.body,
      })
      const textAnchor: "start" | "end" | "middle" = outward.x > 0.3 ? "start" : outward.x < -0.3 ? "end" : "middle"
      const stackUp = outward.y < 0
      const totalH = wrapped.lines.length * wrapped.lineHeight
      const topY = stackUp ? ay - totalH : ay
      return { i, ax, topY, textAnchor, wrapped }
    })
  // The ring shrinks into a short box but description type stops at its
  // floor, so a small enough drawing has more description than room around
  // it. Descriptions then give lines back, cut and marked; if one line each
  // still reaches past the box, the loop declines it.
  const budget = box.h ?? g.h
  const spills = (ds: ReturnType<typeof descAt>) =>
    ds.some(
      (d) =>
        d !== null &&
        d.wrapped.lines.length > 0 &&
        (d.topY + d.wrapped.fontSize * 0.2 < -1 ||
          d.topY + (d.wrapped.lines.length - 1) * d.wrapped.lineHeight + d.wrapped.fontSize * 1.25 > budget + 1),
    )
  let descLines = DESC_MAX_LINES
  let descs = descAt(descLines)
  while (descLines > 1 && spills(descs)) {
    descLines -= 1
    descs = descAt(descLines)
  }
  if (spills(descs)) {
    return (
      <g transform={`translate(${box.x},${box.y})`}>
        <DroppedContentMarker count={1} kind="component" />
      </g>
    )
  }

  return (
    <g transform={`translate(${box.x},${box.y})`}>
      <path
        d={ringD}
        fill="none"
        stroke={ringStroke}
        strokeWidth={1.5}
        strokeDasharray={RING_DASH}
      />
      {component.items.map((item, i) => {
        const a = nodeAngle(i, n)
        const nr = radii[i]! * scale
        const cx = ox + Math.cos(a) * ringR * scale
        const cy = oy + Math.sin(a) * ringR * scale
        const half = halfLens[i]! * scale
        const current = i === 0
        const fill = ctx.colors.surface
        const stroke = current ? ctx.colors.accent : border
        const fit = g.labels[i]!
        const preferred = current ? ctx.colors.accent : ctx.colors.muted
        const ink = accessibleInk(preferred, fill, fit.fontSize)
        const totalH = fit.lines.length * fit.lineHeight
        const top = cy - totalH / 2
        return (
          <g key={`node-${i}`} data-audit-box={`${cx - nr - half},${cy - nr},${2 * (nr + half)}`}>
            {half > 0 ? (
              <rect
                x={cx - nr - half}
                y={cy - nr}
                width={2 * (nr + half)}
                height={2 * nr}
                rx={nr}
                fill={fill}
                stroke={stroke}
                strokeWidth={current ? 2 : 1.25}
              />
            ) : (
              <circle
                cx={cx}
                cy={cy}
                r={nr}
                fill={fill}
                stroke={stroke}
                strokeWidth={current ? 2 : 1.25}
              />
            )}
            {fit.lines.map((line, li) => (
              <text
                key={li}
                data-truncated={fit.truncated && li === fit.lines.length - 1 ? "1" : undefined}
                x={cx}
                y={top + li * fit.lineHeight + fit.fontSize * 0.85}
                textAnchor="middle"
                fontFamily={ctx.fonts.body}
                fontSize={fit.fontSize}
                fontWeight={current ? "700" : "600"}
                fill={ink}
              >
                {line}
              </text>
            ))}
          </g>
        )
      })}
      {descs.map((d) =>
        d ? (
          <g key={`desc-${d.i}`}>
            {d.wrapped.lines.map((line, li) => (
              <text
                key={li}
                data-truncated={formTextClipMarker(d.wrapped, li)}
                x={d.ax}
                y={d.topY + li * d.wrapped.lineHeight + d.wrapped.fontSize}
                textAnchor={d.textAnchor}
                fontFamily={ctx.fonts.body}
                fontSize={d.wrapped.fontSize}
                fill={accessibleInk(ctx.colors.muted, ctx.defaultBg ?? ctx.colors.bg, d.wrapped.fontSize)}
              >
                {line}
              </text>
            ))}
          </g>
        ) : null,
      )}
      {hasTitle &&
        (() => {
          const title = fitFormTitleLine(component.title!, {
            maxWidth: 2 * g.halfW * scale * 0.9,
            fontSize: Math.max(TITLE_MIN, Math.round(TITLE_FONT * scale)),
            fontFamily: ctx.fonts.heading,
          })
          return (
            <text
              data-truncated={title.truncated ? "1" : undefined}
              x={ox}
              y={TITLE_PAD * scale + title.fontSize}
              textAnchor="middle"
              fontFamily={ctx.fonts.heading}
              fontSize={title.fontSize}
              fontWeight="700"
              fill={ctx.colors.text}
            >
              {title.text}
            </text>
          )
        })()}
    </g>
  )
  },
}

export const renderDef: RenderDef<CycleComponent> = { type: "cycle", measure: cycle.measure, render: cycle.render }
