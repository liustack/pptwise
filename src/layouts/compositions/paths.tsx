import type { Component } from "@/ir"
import { blockTag, compositionTag, type Composition } from "./shared"
import { fitFixed, paintLines } from "./type"
import { baselineIn, consoleInks, consoleText, fitMono, paintCard, paintIcon, paintMono, paintPanel } from "./console"

type IssueTree = Extract<Component, { type: "issue_tree" }>

/*
 * paths: an issue tree read as failure points and what each one takes, the
 * console setting's way of pairing a risk with its fix. terminal's 2026-10
 * board, its dependency page (p13): entry, identity, config and data, each a
 * single point that drags down every region, each beside the independent path
 * it needs.
 *
 * Two columns under two mono headers: the tree's question at the left after
 * a ✕ in the danger ink, its `children_column` at the right after a ✓ in the
 * mark. Each branch is a row: at the left a card with the branch's icon, its
 * label bold at 19px and its note at 14px in the muted ink; an arrow; at the
 * right a card with the branch's sub-points at 19px, one a line. The branch the
 * author marks has its card edged and its icon in the danger ink, the arrow in
 * the mark, and its fix on the mark's tint inside an edge of the mark, bold in
 * the mark.
 *
 * Takes, in the console setting: one `issue_tree` with a `children_column`,
 * two to five branches, and one or two sub-points under every branch.
 *
 * Declines: any other shape, a label, note or sub-point past its line, and a
 * band too short for the rows.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.heading`, `fonts.body`,
 * `fonts.mono`.
 */

const HEAD = { box: 20, size: 13, icon: 12, gap: 6 } as const
const ROWS = { top: 32, h: 96, gap: 14, minH: 72 } as const
const ARROW = { zone: 52, size: 24 } as const
const LEFT = { pad: 20, icon: 26, iconTop: 20, textX: 62, label: { top: 16, box: 28, size: 19 }, note: { top: 50, box: 24, size: 14 } } as const
const RIGHT = { pad: 24, size: 19, lineHeight: 30 } as const

export const pathsComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "console" || components.length !== 1) return null
  const tree = components[0]!
  if (tree.type !== "issue_tree") return null
  return drawPaths(tree, { ctx, rect })
}

function drawPaths(tree: IssueTree, { ctx, rect }: Pick<Parameters<Composition>[0], "ctx" | "rect">) {
  const n = tree.branches.length
  const fixesTitle = tree.children_column?.trim()
  if (!fixesTitle || n < 2 || n > 5) return null
  if (tree.branches.some((b) => (b.children?.length ?? 0) < 1 || (b.children?.length ?? 0) > 2)) return null
  const leftW = (rect.w - ARROW.zone) / 2 + 10
  const rightX = rect.x + leftW + ARROW.zone
  const rightW = rect.x + rect.w - rightX
  const pitch = Math.min(ROWS.h + ROWS.gap, Math.floor((rect.h - ROWS.top + ROWS.gap) / n))
  const rowH = pitch - ROWS.gap
  if (rowH < ROWS.minH) return null
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const question = fitMono(tree.question, { width: leftW - HEAD.icon - HEAD.gap, size: HEAD.size, lineHeight: HEAD.box, maxLines: 1 })
  const fixes = fitMono(fixesTitle, { width: rightW - RIGHT.pad - HEAD.icon - HEAD.gap, size: HEAD.size, lineHeight: HEAD.box, maxLines: 1 })
  if (!question || !fixes) return null
  const rows = tree.branches.map((branch) => {
    const textX = branch.icon ? LEFT.textX : LEFT.pad
    const width = leftW - textX - LEFT.pad
    const label = fitFixed(branch.label, { width, size: LEFT.label.size, lineHeight: LEFT.label.box, maxLines: 1, fontFamily: ctx.fonts.heading, bold: true })
    const note = branch.note?.trim() ? fitFixed(branch.note, { width, size: LEFT.note.size, lineHeight: LEFT.note.box, maxLines: 1, fontFamily: ctx.fonts.body, bold: false }) : null
    const marked = branch.emphasis === true
    const children = (branch.children ?? []).map((child) =>
      fitFixed(child.label, { width: rightW - RIGHT.pad * 2, size: RIGHT.size, lineHeight: RIGHT.lineHeight, maxLines: 1, fontFamily: ctx.fonts.body, bold: marked }),
    )
    return { branch, textX, label, note, marked, children, fits: label !== null && (!branch.note?.trim() || note !== null) && children.every((c) => c !== null) }
  })
  if (rows.some((r) => !r.fits)) return null
  if (rows.some((r) => r.children.length * RIGHT.lineHeight > rowH - 24)) return null
  const headY = baselineIn(rect.y, HEAD.box, HEAD.size)
  return (
    <g {...compositionTag("paths")} {...blockTag(ctx, tree)}>
      {paintIcon("x", rect.x, rect.y + (HEAD.box - HEAD.icon) / 2, HEAD.icon, inks.danger, ground)}
      {paintMono(question, { ctx, x: rect.x + HEAD.icon + HEAD.gap, y: headY, fill: consoleText(inks.danger, ground, HEAD.size), ground })}
      {paintIcon("check", rightX + RIGHT.pad, rect.y + (HEAD.box - HEAD.icon) / 2, HEAD.icon, inks.mark, ground)}
      {paintMono(fixes, { ctx, x: rightX + RIGHT.pad + HEAD.icon + HEAD.gap, y: headY, fill: consoleText(inks.mark, ground, HEAD.size), ground })}
      {rows.map(({ branch, textX, label, note, marked, children }, i) => {
        const y = rect.y + ROWS.top + i * pitch
        const left = { x: rect.x, y, w: leftW, h: rowH }
        const right = { x: rightX, y, w: rightW, h: rowH }
        const fixGround = marked ? inks.tint : inks.surface
        const textTop = note ? y + LEFT.label.top : y + (rowH - LEFT.label.box) / 2
        const firstChild = Math.round(y + rowH / 2 - ((children.length - 1) * RIGHT.lineHeight) / 2 + RIGHT.size * 0.385)
        return (
          <g key={i} data-path={marked ? "marked" : ""}>
            {paintPanel(left, inks.surface, marked ? inks.danger : inks.edge)}
            {branch.icon ? paintIcon(branch.icon, rect.x + LEFT.pad, y + LEFT.iconTop, LEFT.icon, marked ? inks.danger : inks.muted, inks.surface) : null}
            {paintLines(label!, {
              ctx,
              x: rect.x + textX,
              y: baselineIn(textTop, LEFT.label.box, LEFT.label.size),
              fill: consoleText(inks.text, inks.surface, LEFT.label.size),
              fontFamily: ctx.fonts.heading,
              fontWeight: "700",
              bg: inks.surface,
            })}
            {note
              ? paintLines(note, {
                  ctx,
                  x: rect.x + textX,
                  y: baselineIn(y + LEFT.note.top, LEFT.note.box, LEFT.note.size),
                  fill: consoleText(inks.muted, inks.surface, LEFT.note.size),
                  fontFamily: ctx.fonts.body,
                  fontWeight: "400",
                  bg: inks.surface,
                  attrs: { "data-font-floor-exempt": "console-spec" },
                })
              : null}
            {paintIcon("arrow-right", rect.x + leftW + (ARROW.zone - ARROW.size) / 2, y + (rowH - ARROW.size) / 2, ARROW.size, marked ? inks.mark : inks.dim, ground, undefined, !marked)}
            {paintCard(right, inks, marked)}
            {children.map((child, c) =>
              paintLines(child!, {
                ctx,
                x: rightX + RIGHT.pad,
                y: firstChild + c * RIGHT.lineHeight,
                fill: consoleText(marked ? inks.mark : inks.text, fixGround, RIGHT.size),
                fontFamily: ctx.fonts.body,
                fontWeight: marked ? "700" : "400",
                bg: fixGround,
              }),
            )}
          </g>
        )
      })}
    </g>
  )
}
