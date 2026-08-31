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
/**
 * Baseline-to-baseline distance two stacked value labels need before they
 * read as two lines instead of one blob. The ink box is only 0.9em tall, so
 * the old 0.95em target left under 1px of air: two line-chart endpoints
 * converging on 90 and 87 came out with their digits touching (author
 * screenshot, 2026-08). A normal text line is 1.2em, and that is what a
 * pair of numbers needs here too.
 */
const LINE_EM = 1.2

function minBaselineGap(a: ValueLabelSpec, b: ValueLabelSpec): number {
  return Math.max(a.fontSize, b.fontSize) * LINE_EM + AIR
}

const GAP_EPSILON = 1e-6

function xExtentsOverlap(a: ValueLabelSpec, b: ValueLabelSpec): boolean {
  const boxA = valueLabelBox(a)
  const boxB = valueLabelBox(b)
  return boxA.x < boxB.x + boxB.w && boxA.x + boxA.w > boxB.x
}

/**
 * Two labels collide when they share horizontal room and sit closer than one
 * line apart — not merely when their ink boxes overlap. Ink overlap alone
 * misses the band between "boxes just clear" and "a readable line apart",
 * which is exactly where converging endpoints land.
 */
function labelsCollide(a: ValueLabelSpec, b: ValueLabelSpec): boolean {
  if (!xExtentsOverlap(a, b)) return false
  return Math.abs(a.y - b.y) < minBaselineGap(a, b) - GAP_EPSILON
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
        if (!labelsCollide(a, b)) continue
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
        if (inBand && !labelsCollide(keeper, staggered)) {
          placed[moverIdx] = staggered
          dirty = true
          continue
        }
        const indent = Math.round(mover.fontSize * INDENT_EM)
        const sign = mover.x >= keeper.x ? 1 : -1
        const indentBase = inBand ? staggered : mover
        const indented: PlacedValueLabel = { ...indentBase, x: mover.x + sign * indent }
        // The indent path is judged on ink separation alone: side by side,
        // two numbers read apart without a full line between their baselines.
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
