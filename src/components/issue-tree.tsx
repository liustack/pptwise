import type { Component } from "@/ir"
import { accessibleInk, readableOn } from "../render/ink"
import { DroppedContentMarker } from "../render/drop-marker"
import { mixHex } from "./color-mix"
import { anyCut } from "./declared-fit"
import { FORM_BODY_FLOOR, fitFormLine, layoutFormBody } from "./legibility"
import { orthogonalConnectorRight, tidyTree } from "./tree-layout"
import type { ComponentCtx, RenderDef, SvgComponent } from "./types"

type IssueTreeComponent = Extract<Component, { type: "issue_tree" }>

/**
 * 问题树：左边一个待答问题，中间是拆出来的假设，右边是每条假设下的检验点，
 * 连线走直角。竖向位置由末端条目的等距节拍决定，假设块落在自己那段的中点上，
 * 和 `org_tree` 共用同一套算术，只是把树放倒。
 *
 * 作者可以给一条假设标 `emphasis`：整块填 primary、字反白。除此之外没有第二
 * 种强调手段。
 *
 * 三个盒子都有自己的高度下限，字也不截断：任何一处装不下就整块拒绘。末端盒
 * 尤其要盯——节拍是由末端条目数除出来的，条目一多，盒子会先于列宽塌掉。
 */

const GUTTER = 44
const ROOT_COL = 0.21
const BRANCH_COL = 0.38
const LEAF_ROW_H = 68
const LEAF_BOX_H = 56
/** A leaf box shorter than this has less height than the line inside it. */
const LEAF_BOX_MIN = 40
const LEAF_GAP = 12
const BRANCH_BAND_PAD = 12
const BRANCH_BOX_H = 104
const ROOT_BOX_H = 120
const PAD_X = 18
const QUESTION_PX = 21
const BRANCH_PX = 20
const LEAF_PX = 17
const NOTE_PX = FORM_BODY_FLOOR
const MIN_COL_W = 120
const LINE_RATIO = 1.28
/** Air above and below a stack of lines inside a box. */
const BOX_PAD_Y = 10

function leafCounts(component: IssueTreeComponent): number[] {
  return component.branches.map((b) => b.children?.length ?? 1)
}

/**
 * The shortest a hypothesis box may be, decided by what this instance
 * actually writes into one. A branch carrying a note needs a second line;
 * one that carries none does not, and asking every drawing for the taller
 * box would send pages to the step-aside that had room all along. Measured
 * at the declared sizes, which the fits only ever shrink below.
 */
function branchBoxFloor(component: IssueTreeComponent): number {
  const noted = component.branches.some((b) => b.note !== undefined && b.note.trim() !== "")
  return BRANCH_PX * LINE_RATIO + (noted ? NOTE_PX * LINE_RATIO : 0) + BOX_PAD_Y * 2
}

/**
 * Tall enough for three separate things: one row per end point, a leaf box
 * that can hold its own line, and a band per hypothesis wide enough to hold
 * its box. The last is what the thinnest branch decides — a hypothesis with a
 * single end point under it gets one pitch of room, so the whole drawing has
 * to be `leaves / thinnest` pitches tall before that one box has anywhere to
 * sit. Getting this wrong is not a cramped drawing but no drawing at all:
 * `render` declares a decline the moment a box is too short, and the page
 * goes to the step-aside.
 */
function naturalHeight(component: IssueTreeComponent): number {
  const counts = leafCounts(component)
  const leaves = counts.reduce((n, c) => n + c, 0)
  const thinnest = Math.min(...counts)
  return Math.max(
    leaves * LEAF_ROW_H,
    (leaves * (branchBoxFloor(component) + BRANCH_BAND_PAD)) / thinnest,
    ROOT_BOX_H,
  )
}

function hairline(ctx: ComponentCtx): string {
  return ctx.colors.border ?? mixHex(ctx.colors.muted, ctx.colors.bg, 0.45)
}

export const issueTree: SvgComponent<IssueTreeComponent> = {
  measure(component) {
    return naturalHeight(component)
  },

  render(component, box, ctx) {
    const counts = leafCounts(component)
    const leafTotal = counts.reduce((n, c) => n + c, 0)
    const h = box.h ?? naturalHeight(component)
    const rootW = box.w * ROOT_COL
    const branchW = box.w * BRANCH_COL
    const leafW = box.w - rootW - branchW - GUTTER * 2
    const pitch = h / leafTotal
    // A hypothesis box may be as tall as the shortest run of end points under
    // any one branch, less a gutter; a leaf box gets one pitch less a gutter.
    const branchBoxH = Math.min(BRANCH_BOX_H, pitch * Math.min(...counts) - BRANCH_BAND_PAD)
    const leafBoxH = Math.min(LEAF_BOX_H, pitch - LEAF_GAP)
    const decline = () => (
      <DroppedContentMarker count={leafTotal + component.branches.length + 1} kind="item" />
    )

    if (
      leafW < MIN_COL_W ||
      rootW < MIN_COL_W ||
      branchBoxH < branchBoxFloor(component) ||
      leafBoxH < LEAF_BOX_MIN
    ) {
      return decline()
    }

    const tree = tidyTree(counts, pitch)
    const rootCy = h / 2

    const rootFit = layoutFormBody(component.question, {
      maxWidth: rootW - PAD_X * 2,
      fontSize: QUESTION_PX,
      maxLines: 3,
      bold: true,
      fontFamily: ctx.fonts.body,
    })
    const rootBoxH = Math.max(ROOT_BOX_H, rootFit.lines.length * rootFit.lineHeight + 40)

    const branches = component.branches.map((branch) => {
      const inner = branchW - PAD_X * 2
      return {
        branch,
        label: fitFormLine(branch.label, {
          maxWidth: inner,
          fontSize: BRANCH_PX,
          floor: FORM_BODY_FLOOR,
          bold: true,
          fontFamily: ctx.fonts.body,
        }),
        note: branch.note
          ? fitFormLine(branch.note, {
              maxWidth: inner,
              fontSize: NOTE_PX,
              floor: FORM_BODY_FLOOR,
              fontFamily: ctx.fonts.body,
            })
          : null,
      }
    })

    const leaves = component.branches.flatMap((branch, i) => {
      const kids = branch.children
      if (!kids || kids.length === 0) return []
      const from = tree.firstLeaf[i]!
      return kids.map((leaf, k) => ({
        key: `l${i}-${k}`,
        cy: tree.leaves[from + k]!,
        fit: fitFormLine(leaf.label, {
          maxWidth: leafW - PAD_X * 2,
          fontSize: LEAF_PX,
          floor: FORM_BODY_FLOOR,
          fontFamily: ctx.fonts.body,
        }),
      }))
    })

    // Nothing is cut, the question fits the box its own line count asked for,
    // and each hypothesis box holds its label and note with air left over.
    const leafStack = Math.max(0, ...leaves.map((l) => l.fit.fontSize * LINE_RATIO))
    if (
      anyCut([...branches.flatMap((b) => [b.label, b.note]), ...leaves.map((l) => l.fit), rootFit]) ||
      rootBoxH > h ||
      leafStack + BOX_PAD_Y > leafBoxH
    ) {
      return decline()
    }

    const rule = hairline(ctx)
    const pageBg = ctx.defaultBg ?? ctx.colors.bg
    const surface = ctx.colors.surface
    const filledInk = readableOn(ctx.colors.primary)
    const radius = ctx.shape?.radius ?? 2
    const connectorInk = accessibleInk(ctx.colors.muted, pageBg, 64)
    const rootX = 0
    const branchX = rootW + GUTTER
    const leafX = branchX + branchW + GUTTER

    const connectors = orthogonalConnectorRight(rootW, rootCy, branchX, tree.branches)
    component.branches.forEach((branch, i) => {
      const kids = branch.children
      if (!kids || kids.length === 0) return
      const from = tree.firstLeaf[i]!
      const ys = kids.map((_, k) => tree.leaves[from + k]!)
      connectors.push(...orthogonalConnectorRight(branchX + branchW, tree.branches[i]!, leafX, ys))
    })

    return (
      <g transform={`translate(${box.x},${box.y})`}>
        {connectors.map((d, i) => (
          <path key={`c${i}`} d={d} fill="none" stroke={connectorInk} strokeWidth={1.5} />
        ))}

        <rect
          x={rootX}
          y={rootCy - rootBoxH / 2}
          width={rootW}
          height={rootBoxH}
          rx={radius}
          fill={ctx.colors.primary}
        />
        {rootFit.lines.map((line, i) => (
          <text
            key={`q${i}`}
            x={rootX + PAD_X}
            y={
              rootCy -
              (rootFit.lines.length * rootFit.lineHeight) / 2 +
              i * rootFit.lineHeight +
              rootFit.fontSize
            }
            fontSize={rootFit.fontSize}
            fontWeight="bold"
            fill={filledInk}
            fontFamily={ctx.fonts.body}
            dominantBaseline="alphabetic"
          >
            {line}
          </text>
        ))}

        {branches.map(({ branch, label, note }, i) => {
          const cy = tree.branches[i]!
          const filled = branch.emphasis === true
          const labelY = note ? cy - 2 : cy + label.fontSize * 0.35
          return (
            <g key={`b${i}`}>
              <rect
                x={branchX}
                y={cy - branchBoxH / 2}
                width={branchW}
                height={branchBoxH}
                rx={radius}
                fill={filled ? ctx.colors.primary : surface}
                stroke={filled ? "none" : rule}
                strokeWidth={filled ? 0 : 1}
              />
              <text
                x={branchX + PAD_X}
                y={labelY}
                fontSize={label.fontSize}
                fontWeight="bold"
                fill={filled ? filledInk : accessibleInk(ctx.colors.primary, surface, label.fontSize)}
                fontFamily={ctx.fonts.body}
                dominantBaseline="alphabetic"
              >
                {label.text}
              </text>
              {note ? (
                <text
                  x={branchX + PAD_X}
                  y={cy + note.fontSize + 6}
                  fontSize={note.fontSize}
                  fill={
                    filled
                      ? accessibleInk(
                          mixHex(filledInk, ctx.colors.primary, 0.28),
                          ctx.colors.primary,
                          note.fontSize,
                        )
                      : accessibleInk(ctx.colors.muted, surface, note.fontSize)
                  }
                  fontFamily={ctx.fonts.body}
                  dominantBaseline="alphabetic"
                >
                  {note.text}
                </text>
              ) : null}
            </g>
          )
        })}

        {leaves.map(({ key, cy, fit }) => (
          <g key={key}>
            <rect
              x={leafX}
              y={cy - leafBoxH / 2}
              width={leafW}
              height={leafBoxH}
              rx={radius}
              fill={surface}
              stroke={rule}
              strokeWidth={1}
            />
            <text
              x={leafX + PAD_X}
              y={cy + fit.fontSize * 0.35}
              fontSize={fit.fontSize}
              fill={ctx.colors.text}
              fontFamily={ctx.fonts.body}
              dominantBaseline="alphabetic"
            >
              {fit.text}
            </text>
          </g>
        ))}
      </g>
    )
  },
}

export const renderDef: RenderDef<IssueTreeComponent> = {
  type: "issue_tree",
  measure: issueTree.measure,
  render: issueTree.render,
}
