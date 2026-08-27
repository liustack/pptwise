/**
 * Data-label anti-collision. Adjacent value labels whose ink boxes
 * intersect get staggered, then indented, then one is dropped. Dropping
 * paints nothing (validate forbids an ellipsis).
 */
import { measureTextUnits } from "../lib/svg-text-layout"
import { boxesIntersect, type DepthBox } from "../render/depth-contract/geometry"

export const VALUE_LABEL_ATTR = "data-value-label"

export interface ValueLabelSpec {
  readonly id: string
  readonly text: string
  readonly x: number
  readonly y: number
  readonly anchor: "start" | "middle" | "end"
  readonly fontSize: number
  readonly fontFamily?: string
  /** Higher kept when a pair must hide one. */
  readonly priority: number
  /** Stagger that would leave this band is skipped, then indent, then hide. */
  readonly yMin?: number
  readonly yMax?: number
}

export interface PlacedValueLabel extends ValueLabelSpec {
  readonly hidden: boolean
}

export function valueLabelBox(
  label: Pick<ValueLabelSpec, "text" | "x" | "y" | "anchor" | "fontSize" | "fontFamily">,
): DepthBox {
  const width = Math.max(
    1,
    measureTextUnits(label.text, { fontFamily: label.fontFamily, bold: true }) * label.fontSize,
  )
  const left =
    label.anchor === "end" ? label.x - width : label.anchor === "middle" ? label.x - width / 2 : label.x
  const ascent = label.fontSize * 0.75
  const descent = label.fontSize * 0.15
  return { x: left, y: label.y - ascent, w: width, h: ascent + descent }
}

const AIR = 2
const INDENT_EM = 0.8

function minBaselineGap(a: ValueLabelSpec, b: ValueLabelSpec): number {
  return Math.max(a.fontSize, b.fontSize) * 0.95 + AIR
}

export function resolveValueLabelCollisions(labels: readonly ValueLabelSpec[]): PlacedValueLabel[] {
  const placed: PlacedValueLabel[] = labels.map((label) => ({ ...label, hidden: false }))
  let dirty = true
  let guard = 0
  while (dirty && guard < 8) {
    dirty = false
    guard += 1
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i]!
        const b = placed[j]!
        if (a.hidden || b.hidden) continue
        if (!boxesIntersect(valueLabelBox(a), valueLabelBox(b))) continue
        const moverIdx = a.priority <= b.priority ? i : j
        const keeperIdx = moverIdx === i ? j : i
        const mover = placed[moverIdx]!
        const keeper = placed[keeperIdx]!
        const gap = minBaselineGap(mover, keeper)
        const dir = mover.y >= keeper.y ? 1 : -1
        const staggeredY = keeper.y + dir * gap
        const inBand =
          (mover.yMin == null || staggeredY >= mover.yMin) &&
          (mover.yMax == null || staggeredY <= mover.yMax)
        const staggered: PlacedValueLabel = { ...mover, y: staggeredY }
        if (inBand && !boxesIntersect(valueLabelBox(keeper), valueLabelBox(staggered))) {
          placed[moverIdx] = staggered
          dirty = true
          continue
        }
        const indent = Math.round(mover.fontSize * INDENT_EM)
        const sign = mover.x >= keeper.x ? 1 : -1
        const indentBase = inBand ? staggered : mover
        const indented: PlacedValueLabel = { ...indentBase, x: mover.x + sign * indent }
        if (!boxesIntersect(valueLabelBox(keeper), valueLabelBox(indented))) {
          placed[moverIdx] = indented
          dirty = true
          continue
        }
        placed[moverIdx] = { ...mover, hidden: true }
        dirty = true
      }
    }
  }
  return placed
}
