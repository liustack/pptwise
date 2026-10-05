import type React from "react"
import type { Component } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { kpiFigure } from "../../components/kpi"
import { joinUnit } from "../../lib/quantity-format"
import { SvgContent } from "../../render/svg-content"
import { bodySlotDropsContent } from "../../render/step-aside"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { paintIcon } from "./console"
import { exhibitCaptionLayout, paintExhibit, type ExhibitSpec } from "./exhibit"
import { fitMemo, memoInks, memoMeta, memoStepped, memoText, memoWidth, paintMemo, paintMemoLine, type MemoInks } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type Image = Extract<Component, { type: "image" }>
type KpiCards = Extract<Component, { type: "kpi_cards" }>
type Callout = Extract<Component, { type: "callout" }>

/*
 * annex: a page's body beside a column that holds an exhibit, memo's 2026-10
 * board. The photograph is pasted in at the top of a column at the right of
 * the body (`./exhibit.tsx`), and under it what goes with it:
 *
 * - a remark (a `callout`): a line or two in the heading face, bold, in the
 *   mark, under a 2px rule of the mark (the reasons page, p03, pointing on to
 *   what the page leaves out);
 * - evidence (a `kpi_cards` whose every item has an icon): one row a figure,
 *   its icon, its label in bold and its `note` (where it comes from) in small
 *   mono, its figure at the right in the heading face (the rota page, p10);
 * - two or three figures in a panel (a `kpi_cards` with no icons): the note
 *   every figure shares typed over them as the panel's label, each figure set
 *   large in the heading face over its label, the marked one in the mark and
 *   the others stepping back (the process page, p12).
 *
 * Everything before the picture is the page's body, drawn left of the column
 * by the face's other compositions (`handOn`) or, when none takes it, by the
 * ordinary component renderer.
 *
 * Takes, in the memo setting: one or more components, then an `image`, then
 * optionally one `callout` with no icon or one `kpi_cards`.
 *
 * Declines: a picture first or last with nothing before it, a second picture,
 * a follower it has no form for, a caption too long for its print, figures
 * wider than the column, and a body its band cannot hold.
 *
 * Reads: the memo inks (`./memo.tsx`), the images the face hands in, the
 * heading, body and mono faces.
 */

const GAP = 40
const MIN_EXHIBIT_H = 160

type FollowerKind = "none" | "remark" | "evidence" | "figures"

/** The column's width and how the exhibit and its follower stack in it, by what follows the picture. */
const COLUMN: Record<FollowerKind, { w: number; top: number; gap: number; foot: number }> = {
  none: { w: 376, top: 0, gap: 0, foot: 20 },
  remark: { w: 336, top: 10, gap: 34, foot: 20 },
  evidence: { w: 396, top: 0, gap: 22, foot: 4 },
  figures: { w: 376, top: 0, gap: 24, foot: 20 },
}

const REMARK = { rule: 2, pad: 12, size: 17, lineHeight: 26, maxLines: 3, minH: 90 } as const
const EVIDENCE = {
  pitch: 68,
  rule: 60,
  icon: { top: 18, size: 20 },
  textX: 30,
  label: { top: 6, size: 14, lineHeight: 22 },
  note: { top: 30, size: 12, lineHeight: 20 },
  figure: { top: 8, size: 30, lineHeight: 44, gap: 12 },
} as const
const PANEL = {
  h: 180,
  pad: 22,
  label: { top: 16, size: 13, lineHeight: 22 },
  figure: { top: 50, size: 52, lineHeight: 60 },
  name: { top: 114, size: 14, lineHeight: 22, maxLines: 2 },
  step: 178,
} as const

function followerKind(follower: Component | undefined): FollowerKind | null {
  if (follower === undefined) return "none"
  if (follower.type === "callout") return follower.icon ? null : "remark"
  if (follower.type !== "kpi_cards") return null
  const items = follower.items
  if (items.length >= 2 && items.length <= 4 && items.every((item) => item.icon)) return "evidence"
  if (items.length >= 2 && items.length <= 3 && items.every((item) => !item.icon)) return "figures"
  return null
}

/** How many exhibits a list of components pastes in before the annex's own. */
function exhibitsIn(components: readonly Component[]): number {
  return components.reduce((n, c) => n + (c.type === "image" ? 1 : c.type === "image_grid" ? c.items.length : 0), 0)
}

export const annexComposition: Composition = ({ components, ctx, rect, setting, handOn, exhibitNumber }) => {
  if (setting !== "memo") return null
  const at = components.findIndex((c) => c.type === "image")
  if (at <= 0 || components.slice(at + 1).some((c) => c.type === "image")) return null
  const body = components.slice(0, at)
  const image = components[at] as Image
  const after = components.slice(at + 1)
  if (after.length > 1) return null
  const kind = followerKind(after[0])
  if (!kind) return null
  const spec = COLUMN[kind]
  const column = { x: rect.x + rect.w - spec.w, y: rect.y, w: spec.w, h: rect.h }
  const left = { x: rect.x, y: rect.y, w: rect.w - spec.w - GAP, h: rect.h }
  const inks = memoInks(ctx)

  const follower = after[0]
  const drawnFollower = follower ? fitFollower(kind, follower, column.w, ctx, inks) : null
  if (follower && !drawnFollower) return null
  const followerH = drawnFollower?.h ?? 0
  const exhibitTop = column.y + spec.top
  const exhibitH = column.y + column.h - spec.foot - followerH - (follower ? spec.gap : 0) - exhibitTop
  if (exhibitH < MIN_EXHIBIT_H) return null
  const number = (exhibitNumber ?? 1) + exhibitsIn(body)
  const exhibit: ExhibitSpec = {
    box: { x: column.x, y: exhibitTop, w: column.w, h: exhibitH },
    number,
    caption: image.caption,
    src: ctx.images?.[image.asset_id]?.src,
    alt: ctx.images?.[image.asset_id]?.alt,
    fit: image.fit,
  }
  const caption = exhibitCaptionLayout(exhibit, ctx)
  if (!caption) return null

  let main = handOn?.(body, left) ?? null
  if (!main) {
    if (bodySlotDropsContent(body, left, ctx)) return null
    main = <SvgContent components={[...body]} rect={left} ctx={ctx} />
  }
  const followerTop = exhibitTop + exhibitH + spec.gap
  return (
    <g {...compositionTag("annex")}>
      {main}
      <g {...blockTag(ctx, image)}>{paintExhibit(exhibit, caption, ctx)}</g>
      {follower && drawnFollower ? <g {...blockTag(ctx, follower)}>{drawnFollower.paint(column.x, followerTop, column.w)}</g> : null}
    </g>
  )
}

interface FittedFollower {
  h: number
  paint: (x: number, y: number, w: number) => React.ReactNode
}

function fitFollower(kind: FollowerKind, follower: Component, w: number, ctx: ComponentCtx, inks: MemoInks): FittedFollower | null {
  if (kind === "remark") return fitRemark(follower as Callout, w, ctx, inks)
  if (kind === "evidence") return fitEvidence(follower as KpiCards, w, ctx, inks)
  if (kind === "figures") return fitFigures(follower as KpiCards, w, ctx, inks)
  return null
}

/** A remark under a 2px rule of the mark, bold in the heading face in the mark. */
function fitRemark(callout: Callout, w: number, ctx: ComponentCtx, inks: MemoInks): FittedFollower | null {
  const text = fitMemo(callout.text, { width: w, size: REMARK.size, lineHeight: REMARK.lineHeight, maxLines: REMARK.maxLines, face: "song", bold: true }, ctx)
  if (!text) return null
  const h = Math.max(REMARK.minH, REMARK.rule + REMARK.pad + text.lines.length * REMARK.lineHeight)
  return {
    h,
    paint: (x, y, width) => (
      <g data-memo-remark="">
        <rect x={x} y={y} width={width} height={REMARK.rule} fill={inks.mark} />
        {paintMemo(text, { ctx, x, top: y + REMARK.rule + REMARK.pad, face: "song", bold: true, fill: memoText(inks.mark, inks.ground, REMARK.size) })}
      </g>
    ),
  }
}

/** A figure's words as the board sets them: the figure and its unit, `**…**` marking it. */
function figureText(item: KpiCards["items"][number]): { value: string; marked: boolean } {
  const { text, marked, unit } = kpiFigure(item.value, item.unit)
  return { value: joinUnit(text, unit?.trim() || undefined), marked }
}

/** One row a figure: icon, bold label, mono note, the figure at the right. */
function fitEvidence(kpis: KpiCards, w: number, ctx: ComponentCtx, inks: MemoInks): FittedFollower | null {
  if (kpis.items.some((item) => item.delta || item.tag || item.source?.trim())) return null
  const rows: { item: KpiCards["items"][number]; value: string; marked: boolean; label: EmphasisHeadingLayout; note: EmphasisHeadingLayout | null }[] = []
  for (const item of kpis.items) {
    const { value, marked } = figureText(item)
    const figureW = memoWidth(value, EVIDENCE.figure.size, "song", ctx, true)
    const textW = w - EVIDENCE.textX - figureW - EVIDENCE.figure.gap
    if (textW < 80) return null
    const label = fitMemo(item.label, { width: textW, size: EVIDENCE.label.size, lineHeight: EVIDENCE.label.lineHeight, maxLines: 1, face: "body", bold: true }, ctx)
    const note = item.note?.trim() ? fitMemo(item.note, { width: textW, size: EVIDENCE.note.size, lineHeight: EVIDENCE.note.lineHeight, maxLines: 1, face: "mono" }, ctx) : null
    if (!label || (item.note?.trim() && !note)) return null
    rows.push({ item, value, marked, label, note })
  }
  return {
    h: (rows.length - 1) * EVIDENCE.pitch + EVIDENCE.rule,
    paint: (x, y, width) => (
      <g data-memo-evidence="">
        {rows.map(({ item, value, marked, label, note }, i) => {
          const top = y + i * EVIDENCE.pitch
          return (
            <g key={i}>
              <rect x={x} y={top + EVIDENCE.rule} width={width} height={1} fill={inks.line} />
              {paintIcon(item.icon!, x, top + EVIDENCE.icon.top, EVIDENCE.icon.size, inks.mark, inks.ground)}
              {paintMemo(label, { ctx, x: x + EVIDENCE.textX, top: top + EVIDENCE.label.top, face: "body", bold: true, fill: memoText(inks.ink, inks.ground, EVIDENCE.label.size) })}
              {note ? paintMemo(note, { ctx, x: x + EVIDENCE.textX, top: top + EVIDENCE.note.top, face: "mono", fill: memoMeta(inks.muted, inks.ground) }) : null}
              {paintMemoLine(value, {
                ctx,
                x: x + width,
                top: top + EVIDENCE.figure.top,
                lineHeight: EVIDENCE.figure.lineHeight,
                size: EVIDENCE.figure.size,
                face: "song",
                fill: memoText(marked ? inks.mark : inks.ink, inks.ground, EVIDENCE.figure.size),
                bold: true,
                anchor: "end",
              })}
            </g>
          )
        })}
      </g>
    ),
  }
}

/**
 * Two or three figures in a panel. The note they all share is the panel's
 * label. The figure the author marks takes the mark and the others step back
 * to the quiet grey, their labels muted.
 */
function fitFigures(kpis: KpiCards, w: number, ctx: ComponentCtx, inks: MemoInks): FittedFollower | null {
  const items = kpis.items
  if (items.some((item) => item.delta || item.tag || item.source?.trim())) return null
  const notes = [...new Set(items.map((item) => item.note?.trim() ?? ""))]
  if (notes.length > 1) return null
  const inner = w - PANEL.pad * 2
  const label = notes[0] ? fitMemo(notes[0], { width: inner, size: PANEL.label.size, lineHeight: PANEL.label.lineHeight, maxLines: 1, face: "mono" }, ctx) : null
  if (notes[0] && !label) return null
  const step = Math.min(PANEL.step, inner / items.length)
  const cellW = step - 18
  const figures = items.map((item) => figureText(item))
  if (figures.some(({ value }) => memoWidth(value, PANEL.figure.size, "song", ctx, true) > cellW)) return null
  const names = items.map((item) => fitMemo(item.label, { width: cellW, size: PANEL.name.size, lineHeight: PANEL.name.lineHeight, maxLines: PANEL.name.maxLines, face: "body" }, ctx))
  if (names.some((name) => !name)) return null
  const anyMarked = figures.some((f) => f.marked)
  return {
    h: PANEL.h,
    paint: (x, y, width) => (
      <g data-memo-figures="">
        <rect x={x + 0.5} y={y + 0.5} width={width - 1} height={PANEL.h - 1} fill={inks.paper} stroke={inks.line} strokeWidth={1} />
        {label ? paintMemo(label, { ctx, x: x + PANEL.pad, top: y + PANEL.label.top, face: "mono", fill: memoMeta(inks.muted, inks.paper) }) : null}
        {figures.map(({ value, marked }, i) => {
          const fx = x + PANEL.pad + i * step
          const stepsBack = anyMarked && !marked
          return (
            <g key={i} data-memo-figure={marked ? "marked" : ""}>
              {paintMemoLine(value, {
                ctx,
                x: fx,
                top: y + PANEL.figure.top,
                lineHeight: PANEL.figure.lineHeight,
                size: PANEL.figure.size,
                face: "song",
                fill: stepsBack ? memoStepped(inks.quiet, inks.ink, inks.paper, PANEL.figure.size) : memoText(marked ? inks.mark : inks.ink, inks.paper, PANEL.figure.size),
                bold: true,
              })}
              {paintMemo(names[i]!, { ctx, x: fx, top: y + PANEL.name.top, face: "body", fill: memoText(stepsBack ? inks.muted : inks.ink, inks.paper, PANEL.name.size) })}
            </g>
          )
        })}
      </g>
    ),
  }
}
