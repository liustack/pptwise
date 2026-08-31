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

/**
 * Vertical room one label needs before it reads as its own line: a normal
 * text line plus the hairline of air above it. The one source of truth for
 * "far enough apart", shared by the pairwise resolver below and by
 * {@link stackLabelColumn}.
 */
export function labelLinePitch(fontSize: number): number {
  return fontSize * LINE_EM + AIR
}

function minBaselineGap(a: ValueLabelSpec, b: ValueLabelSpec): number {
  return labelLinePitch(Math.max(a.fontSize, b.fontSize))
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

/**
 * One label competing for room in a vertical label column — the gutter
 * beside a pie, where every label wants the y its own slice points at and
 * several slices can point at nearly the same one.
 */
export interface ColumnLabelSpec {
  readonly id: string
  /** Where this label's ink wants to be centered. */
  readonly y: number
  /** Vertical room it needs — see {@link labelLinePitch}. */
  readonly pitch: number
  /** Higher survives when the column cannot hold every label. */
  readonly priority: number
}

export interface StackedColumnLabel {
  readonly id: string
  readonly y: number
  readonly hidden: boolean
}

/**
 * Stack one column of labels so no two of them overlap.
 *
 * `resolveValueLabelCollisions` above settles collisions pair by pair, which
 * suits labels that are already spread across a plot and only occasionally
 * bump. A pie's labels are the opposite case: every one of them is pinned to
 * the same narrow gutter by construction, and three thin slices in a row all
 * want the same 20px of it. So this one solves the column as a whole —
 *
 *  1. **Room first.** A column can hold `(bottom - top) / pitch` labels and
 *     no more. Anything past that is dropped outright, largest slice first
 *     (`priority`), because a label squeezed into space that does not exist
 *     is an ink blot, not a label. Dropping paints nothing — validate forbids
 *     an ellipsis, and the same last resort ends the pairwise resolver above.
 *  2. **Sweep down**, pushing each label at least one pitch below the one
 *     above it, so labels keep their by-angle order rather than crossing
 *     their own leader lines.
 *  3. **Sweep back up**, so the last label ends inside the column. Step 1
 *     guarantees the kept labels' pitches fit between `top` and `bottom`, so
 *     this pass can never push the first one back out through the top.
 */
export function stackLabelColumn(
  labels: readonly ColumnLabelSpec[],
  bounds: { readonly top: number; readonly bottom: number },
): StackedColumnLabel[] {
  if (labels.length === 0) return []
  const height = bounds.bottom - bounds.top

  const kept = new Set<string>()
  let used = 0
  for (const { label } of labels
    .map((label, index) => ({ label, index }))
    .sort((a, b) => b.label.priority - a.label.priority || a.index - b.index)) {
    if (used + label.pitch > height) continue
    used += label.pitch
    kept.add(label.id)
  }

  const placed = labels
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => kept.has(label.id))
    .sort((a, b) => a.label.y - b.label.y || a.index - b.index)
    .map(({ label }) => ({ id: label.id, y: label.y, pitch: label.pitch }))

  for (let i = 0; i < placed.length; i++) {
    const self = placed[i]!
    const above = placed[i - 1]
    const floor = above ? above.y + (above.pitch + self.pitch) / 2 : bounds.top + self.pitch / 2
    if (self.y < floor) self.y = floor
  }
  for (let i = placed.length - 1; i >= 0; i--) {
    const self = placed[i]!
    const below = placed[i + 1]
    const ceiling = below
      ? below.y - (below.pitch + self.pitch) / 2
      : bounds.bottom - self.pitch / 2
    if (self.y > ceiling) self.y = ceiling
  }

  const finalY = new Map(placed.map((p) => [p.id, p.y]))
  return labels.map((label) => ({
    id: label.id,
    y: finalY.get(label.id) ?? label.y,
    hidden: !finalY.has(label.id),
  }))
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
