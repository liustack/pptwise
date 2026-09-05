/**
 * Where a three-level tree puts its nodes, decided by arithmetic and nothing
 * else.
 *
 * The bottom row is laid on a fixed pitch, every branch sits over the middle
 * of the run of bottom nodes belonging to it, and the root sits over the
 * middle of the branches. Siblings are contiguous and ordered, so that
 * midpoint rule is already the tidy answer for this depth — there is no
 * subtree to shift out of another's way, and so no iteration, no random
 * seed, and no dependence on the order the caller happens to walk the tree.
 * The same input gives the same picture on every render, which is what lets
 * the gallery hash a page and a reviewer trust that a moved box means
 * somebody changed the content.
 *
 * A branch with nothing under it still takes one slot on the bottom pitch:
 * it *is* its own bottom node, and giving it a narrower slot than its
 * siblings would make the row read as two different rows.
 */

export interface TidyTree {
  /** Centre x of every bottom node, flattened in branch order. */
  readonly leaves: readonly number[]
  /** Centre x of every branch. */
  readonly branches: readonly number[]
  /** Centre x of the root. */
  readonly root: number
  /** First bottom-node index owned by each branch. */
  readonly firstLeaf: readonly number[]
  /** Total width the bottom row occupies. */
  readonly span: number
}

/**
 * @param leafCounts how many bottom nodes each branch owns, one entry per
 * branch. A childless branch counts as 1 — itself.
 * @param pitch centre-to-centre distance between two bottom nodes.
 */
export function tidyTree(leafCounts: readonly number[], pitch: number): TidyTree {
  const leaves: number[] = []
  const branches: number[] = []
  const firstLeaf: number[] = []
  let slot = 0
  for (const count of leafCounts) {
    const n = Math.max(1, count)
    firstLeaf.push(slot)
    for (let i = 0; i < n; i += 1) leaves.push((slot + i + 0.5) * pitch)
    branches.push((slot + n / 2) * pitch)
    slot += n
  }
  const root = branches.length === 0 ? 0 : (branches[0]! + branches[branches.length - 1]!) / 2
  return { leaves, branches, root, firstLeaf, span: slot * pitch }
}

/**
 * The orthogonal connector from one parent down to its children: a stem, a
 * horizontal bar across the children it feeds, and a drop into each of them.
 * Returned as path data so a caller paints one stroke per segment and the
 * corners stay square.
 */
export function orthogonalConnector(
  parentX: number,
  parentBottomY: number,
  childTopY: number,
  childXs: readonly number[],
): string[] {
  if (childXs.length === 0) return []
  const midY = (parentBottomY + childTopY) / 2
  const paths = [`M ${round(parentX)} ${round(parentBottomY)} L ${round(parentX)} ${round(midY)}`]
  const left = Math.min(parentX, ...childXs)
  const right = Math.max(parentX, ...childXs)
  if (right - left > 0.5) paths.push(`M ${round(left)} ${round(midY)} L ${round(right)} ${round(midY)}`)
  for (const x of childXs) paths.push(`M ${round(x)} ${round(midY)} L ${round(x)} ${round(childTopY)}`)
  return paths
}

/**
 * The same connector turned on its side, for a tree that grows rightwards:
 * a stem out of the parent's right edge, a vertical bar across the children
 * it feeds, and a run into each of them.
 */
export function orthogonalConnectorRight(
  parentRightX: number,
  parentY: number,
  childLeftX: number,
  childYs: readonly number[],
): string[] {
  if (childYs.length === 0) return []
  const midX = (parentRightX + childLeftX) / 2
  const paths = [`M ${round(parentRightX)} ${round(parentY)} L ${round(midX)} ${round(parentY)}`]
  const top = Math.min(parentY, ...childYs)
  const bottom = Math.max(parentY, ...childYs)
  if (bottom - top > 0.5) paths.push(`M ${round(midX)} ${round(top)} L ${round(midX)} ${round(bottom)}`)
  for (const y of childYs) paths.push(`M ${round(midX)} ${round(y)} L ${round(childLeftX)} ${round(y)}`)
  return paths
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
