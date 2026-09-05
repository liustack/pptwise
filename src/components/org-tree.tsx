import type { Component } from "@/ir"
import { accessibleInk, readableOn } from "../render/ink"
import { DroppedContentMarker } from "../render/drop-marker"
import { mixHex } from "./color-mix"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine } from "./legibility"
import { orthogonalConnector, tidyTree } from "./tree-layout"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type OrgTreeComponent = Extract<Component, { type: "org_tree" }>

/**
 * 汇报树：根节点一格、直属分支一行、末端节点一行，连线全部走直角。
 * 位置由 `tree-layout.ts` 的算术决定，同一份 IR 每次画在同一处。
 *
 * 高亮只有一种形态：根节点整块填 primary、字反白。分支和末端是纸面上的
 * 白卡加一根发丝边，没有色条、没有装饰方块。
 *
 * 名字与职务都不截断：任何一处放不下就整块拒绘（`declared-fit.ts`），
 * 让页面换一个装得下的画法。
 */

const NODE_H = 64
const NODE_H_TIGHT = 52
const GAP_V = 96
const GAP_V_TIGHT = 44
const GAP_H = 16
const NODE_W_MAX = 260
const NODE_W_MIN = 104
const ROOT_W_SHARE = 0.32
const ROOT_W_MAX = 348
const NAME_PX = 17
const ROLE_PX = FORM_BODY_FLOOR
const PAD_X = 14
const LINE_RATIO = 1.28
/** Air above and below the name/role stack inside a node. */
const NODE_PAD_Y = 10

function branchLeafCounts(component: OrgTreeComponent): number[] {
  return component.children.map((child) => child.children?.length ?? 1)
}

function rowCount(component: OrgTreeComponent): 2 | 3 {
  return component.children.some((child) => (child.children?.length ?? 0) > 0) ? 3 : 2
}

function naturalHeight(rows: number): number {
  return rows * NODE_H + (rows - 1) * GAP_V
}

/** Node height and row gap that fit `h`, or `null` when even the tight pair does not. */
function fitRows(rows: number, h: number): { nodeH: number; gapV: number } | null {
  const gapAt = (nodeH: number) => (h - rows * nodeH) / (rows - 1)
  for (const nodeH of [NODE_H, NODE_H_TIGHT]) {
    const gap = gapAt(nodeH)
    if (gap >= GAP_V_TIGHT) return { nodeH, gapV: Math.min(gap, GAP_V * 1.6) }
  }
  return null
}

function hairline(ctx: ComponentCtx): string {
  return ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
}

interface PlacedNode {
  readonly key: string
  readonly cx: number
  readonly y: number
  readonly w: number
  readonly filled: boolean
  readonly name: ReturnType<typeof fitFormLine>
  readonly role: ReturnType<typeof fitFormLine> | null
}

export const orgTree: SvgComponent<OrgTreeComponent> = {
  measure(component) {
    return naturalHeight(rowCount(component))
  },

  render(component, box, ctx) {
    const rows = rowCount(component)
    const counts = branchLeafCounts(component)
    const leafTotal = counts.reduce((n, c) => n + c, 0)
    const pitch = box.w / leafTotal
    const leafW = Math.min(NODE_W_MAX, pitch - GAP_H)
    // A branch box may be as wide as the run of bottom nodes it sits over,
    // less one gutter — that is the widest it can be without touching the
    // branch beside it, whatever the shape of the tree.
    const branchW = Math.min(NODE_W_MAX, Math.min(...counts) * pitch - GAP_H)
    // The root has no neighbour on its row, so it is not held to a branch's
    // width — an organisation's own name is routinely longer than a person's.
    const rootW = Math.max(branchW, Math.min(box.w * ROOT_W_SHARE, ROOT_W_MAX))
    const rowFit = fitRows(rows, box.h ?? naturalHeight(rows))
    const decline = () => (
      <DroppedContentMarker count={leafTotal + component.children.length + 1} kind="item" />
    )

    // Under-allocated box: a node narrower than its own name, or rows that
    // cannot be spaced apart, is not this drawing shrunk — it is a different,
    // unreadable picture. Declare the loss so the face steps aside.
    if (rowFit === null || leafW < NODE_W_MIN || branchW < NODE_W_MIN) return decline()

    const { nodeH, gapV } = rowFit
    const tree = tidyTree(counts, pitch)
    const rootY = 0
    const branchY = nodeH + gapV
    const leafY = branchY + nodeH + gapV

    const place = (
      key: string,
      cx: number,
      y: number,
      w: number,
      name: string,
      role: string | undefined,
      filled: boolean,
    ): PlacedNode => {
      const inner = w - PAD_X * 2
      return {
        key,
        cx,
        y,
        w,
        filled,
        name: fitFormLine(name, {
          maxWidth: inner,
          fontSize: NAME_PX,
          floor: FORM_BODY_FLOOR,
          bold: true,
          fontFamily: ctx.fonts.body,
        }),
        role: role
          ? fitFormLine(role, {
              maxWidth: inner,
              fontSize: ROLE_PX,
              floor: FORM_BODY_FLOOR,
              fontFamily: ctx.fonts.body,
            })
          : null,
      }
    }

    const nodes: PlacedNode[] = [
      place("root", tree.root, rootY, rootW, component.root.name, component.root.role, true),
      ...component.children.map((child, i) =>
        place(`b${i}`, tree.branches[i]!, branchY, branchW, child.name, child.role, false),
      ),
      ...component.children.flatMap((child, i) => {
        const kids = child.children
        if (!kids || kids.length === 0) return []
        const from = tree.firstLeaf[i]!
        return kids.map((leaf, k) =>
          place(`l${i}-${k}`, tree.leaves[from + k]!, leafY, leafW, leaf.name, leaf.role, false),
        )
      }),
    ]

    // No name and no role is ever cut, and the two-line stack has to sit
    // inside the node with air left over.
    const tallest = Math.max(
      ...nodes.map((n) => n.name.fontSize * LINE_RATIO + (n.role ? n.role.fontSize * LINE_RATIO : 0)),
    )
    if (anyCut(nodes.flatMap((n) => [n.name, n.role])) || tallest + NODE_PAD_Y * 2 > nodeH) return decline()

    const rule = hairline(ctx)
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const surface = ctx.colors.surface
    const rootInk = readableOn(ctx.colors.primary)
    const radius = ctx.shape?.radius ?? 2
    const connectorInk = accessibleInk(ctx.colors.muted, pageBg, NODE_H)

    const connectors: string[] = [
      ...orthogonalConnector(tree.root, rootY + nodeH, branchY, tree.branches),
    ]
    component.children.forEach((child, i) => {
      const kids = child.children
      if (!kids || kids.length === 0) return
      const from = tree.firstLeaf[i]!
      const xs = kids.map((_, k) => tree.leaves[from + k]!)
      connectors.push(...orthogonalConnector(tree.branches[i]!, branchY + nodeH, leafY, xs))
    })

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {connectors.map((d, i) => (
          <path key={`c${i}`} d={d} fill="none" stroke={connectorInk} strokeWidth={1.5} />
        ))}
        {nodes.map((node) => {
          const x = node.cx - node.w / 2
          const nameInk = node.filled ? rootInk : ctx.colors.text
          // A dimmed reverse ink on the filled node, checked against the fill
          // it lands on rather than assumed: `readableOn` guarantees the
          // full-strength ink, not a blend of it, and a light `primary` moves
          // the blend the wrong way.
          const roleInk = node.filled
            ? accessibleInk(mixHex(rootInk, ctx.colors.primary, 0.28), ctx.colors.primary, ROLE_PX)
            : accessibleInk(ctx.colors.muted, surface, ROLE_PX)
          const nameY = node.role ? node.y + nodeH / 2 - 3 : node.y + nodeH / 2 + node.name.fontSize * 0.35
          return (
            <g key={node.key}>
              <rect
                x={x}
                y={node.y}
                width={node.w}
                height={nodeH}
                rx={radius}
                fill={node.filled ? ctx.colors.primary : surface}
                stroke={node.filled ? "none" : rule}
                strokeWidth={node.filled ? 0 : 1}
              />
              <text
                x={x + PAD_X}
                y={nameY}
                fontSize={node.name.fontSize}
                fontWeight="bold"
                fill={nameInk}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {node.name.text}
              </text>
              {node.role ? (
                <text
                  x={x + PAD_X}
                  y={node.y + nodeH / 2 + node.role.fontSize + 1}
                  fontSize={node.role.fontSize}
                  fill={roleInk}
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {node.role.text}
                </text>
              ) : null}
            </g>
          )
        })}
      </g>
    )
  },
}

export const renderDef: RenderDef<OrgTreeComponent> = {
  type: "org_tree",
  measure: orgTree.measure,
  render: orgTree.render,
}
