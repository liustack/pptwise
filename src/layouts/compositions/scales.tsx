import type { Component } from "@/ir"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import { paintIcon } from "./console"
import { fitMemo, memoInks, memoOn, memoText, paintMemo } from "./memo"
import { blockTag, compositionTag, type Composition } from "./shared"

type ProsCons = Extract<Component, { type: "pros_cons" }>

/*
 * scales: a proposal weighed in two columns, memo's 2026-10 board (the
 * weighing page, p08). The case for under a mono header in the success ink,
 * each point after a check; the case against under one in the mark, each
 * point after a cross. A point is a bold line and the evidence under it in
 * the muted ink, on a hairline. The verdict closes the page in a banner of
 * ink across the foot, in the heading face, bold, lettered in the paper.
 *
 * Takes, in the memo setting: one `pros_cons`.
 *
 * Declines: a point or its evidence past one line of its column, more points
 * than the band holds over the banner, a verdict past two lines.
 *
 * Reads: the memo inks (`./memo.tsx`), the body, mono and heading faces.
 */

const COLUMN_GAP = 36
const HEAD = { size: 15, lineHeight: 24 } as const
const ITEMS = { top: 34, pitch: 86, icon: { x: 2, top: 16, size: 22 }, textX: 36, label: { top: 12, size: 18, lineHeight: 28 }, note: { top: 42, size: 14, lineHeight: 22 } } as const
const BANNER = { h: 60, foot: 4, pad: 24, size: 19, lineHeight: 28, maxLines: 2, gap: 12 } as const

export const scalesComposition: Composition = ({ components, ctx, rect, setting }) => {
  if (setting !== "memo") return null
  const [weighing, ...rest] = components
  if (weighing?.type !== "pros_cons" || rest.length > 0) return null
  const pc = weighing as ProsCons
  const inks = memoInks(ctx)
  const colW = (rect.w - COLUMN_GAP) / 2
  const textW = colW - ITEMS.textX - 4
  const verdict = fitMemo(pc.verdict, { width: rect.w - BANNER.pad * 2, size: BANNER.size, lineHeight: BANNER.lineHeight, maxLines: BANNER.maxLines, face: "song", bold: true }, ctx)
  if (!verdict) return null
  const bannerH = Math.max(BANNER.h, verdict.lines.length * BANNER.lineHeight + 16)
  const bannerTop = rect.y + rect.h - BANNER.foot - bannerH
  const sides = [
    { side: pc.pros, icon: "check", ink: inks.good },
    { side: pc.cons, icon: "x", ink: inks.bad },
  ].map(({ side, icon, ink }) => {
    const title = fitMemo(side.title, { width: colW, size: HEAD.size, lineHeight: HEAD.lineHeight, maxLines: 1, face: "mono", bold: true }, ctx)
    const items = side.items.map((item) => ({
      label: fitMemo(item.label, { width: textW, size: ITEMS.label.size, lineHeight: ITEMS.label.lineHeight, maxLines: 1, face: "body", bold: true }, ctx),
      note: item.note?.trim() ? fitMemo(item.note, { width: textW, size: ITEMS.note.size, lineHeight: ITEMS.note.lineHeight, maxLines: 1, face: "body" }, ctx) : null,
      hasNote: Boolean(item.note?.trim()),
    }))
    return { title, items, icon, ink }
  })
  if (sides.some((s) => !s.title || s.items.some((it) => !it.label || (it.hasNote && !it.note)))) return null
  const most = Math.max(...sides.map((s) => s.items.length))
  if (rect.y + ITEMS.top + most * ITEMS.pitch > bannerTop - BANNER.gap) return null
  const bannerInk = memoOn(inks.ink, inks.paper, BANNER.size)
  return (
    <g {...compositionTag("scales")} {...blockTag(ctx, weighing)}>
      {sides.map(({ title, items, icon, ink }, s) => {
        const x = rect.x + s * (colW + COLUMN_GAP)
        return (
          <g key={s} data-memo-side={s === 0 ? "for" : "against"}>
            {paintMemo(title!, { ctx, x, top: rect.y, face: "mono", bold: true, fill: memoText(ink, inks.ground, HEAD.size) })}
            {items.map(({ label, note }, i) => {
              const top = rect.y + ITEMS.top + i * ITEMS.pitch
              return (
                <g key={i}>
                  <rect x={x} y={top} width={colW} height={1} fill={inks.line} />
                  {paintIcon(icon, x + ITEMS.icon.x, top + ITEMS.icon.top, ITEMS.icon.size, ink, inks.ground)}
                  {paintMemo(label as EmphasisHeadingLayout, {
                    ctx,
                    x: x + ITEMS.textX,
                    top: top + ITEMS.label.top,
                    face: "body",
                    bold: true,
                    fill: memoText(inks.ink, inks.ground, ITEMS.label.size),
                  })}
                  {note ? paintMemo(note, { ctx, x: x + ITEMS.textX, top: top + ITEMS.note.top, face: "body", fill: memoText(inks.muted, inks.ground, ITEMS.note.size) }) : null}
                </g>
              )
            })}
          </g>
        )
      })}
      <g data-memo-verdict="">
        <rect x={rect.x} y={bannerTop} width={rect.w} height={bannerH} fill={inks.ink} />
        {paintMemo(verdict, { ctx, x: rect.x + BANNER.pad, top: bannerTop + (bannerH - verdict.lines.length * BANNER.lineHeight) / 2, face: "song", bold: true, fill: bannerInk, ground: inks.ink })}
      </g>
    </g>
  )
}
