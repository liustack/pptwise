import type React from "react"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import type { EmphasisHeadingLayout } from "../../render/emphasis"
import type { ContentsEntry } from "./contents"
import { fitFixed, paintLines } from "./type"
import { CONSOLE_SPEC, baselineIn, consoleInks, consoleText, monoWidth } from "./console"

/*
 * contents, console setting: what a chapter holds, as a directory listing.
 * terminal's 2026-10 board, its chapter pages (p03, p10). Each content page of
 * the chapter is a row 38px apart: a tree branch and its page number in 15px
 * mono in the mark, 「├─ 04」, and its heading at 17px in the bright ink beside
 * it, whole, as the page states it. A heading that needs two lines takes two, and
 * the rows stand further apart. The list is drawn whole or not at all, like
 * every contents list.
 *
 * Reads: the console inks (`./console.tsx`), `fonts.body`, `fonts.mono`.
 */

const ROW = { top: 6, pitch: 38, box: 26, branch: 15, title: 17, lineHeight: 26, maxLines: 2, gap: 16 } as const
const BRANCH = "├─ "

export function drawContentsConsole({ entries, ctx, rect }: { entries: readonly ContentsEntry[]; ctx: ComponentCtx; rect: ContentRect }): React.ReactElement | null {
  if (entries.length === 0) return null
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const numberW = Math.max(...entries.map((e) => monoWidth(`${BRANCH}${String(e.page).padStart(2, "0")}`, ROW.branch)))
  const titleX = rect.x + Math.max(76, Math.ceil(numberW + ROW.gap))
  const titleW = rect.x + rect.w - titleX
  const rows: { entry: ContentsEntry; title: EmphasisHeadingLayout }[] = []
  for (const entry of entries) {
    if (!entry.heading) return null
    const title = fitFixed(entry.heading, { width: titleW, size: ROW.title, lineHeight: ROW.lineHeight, maxLines: ROW.maxLines, fontFamily: ctx.fonts.body, bold: false })
    if (!title) return null
    rows.push({ entry, title })
  }
  const extra = (row: { title: EmphasisHeadingLayout }) => (row.title.lines.length - 1) * ROW.lineHeight
  const height = ROW.top + rows.reduce((sum, row) => sum + ROW.pitch + extra(row), 0)
  if (height > rect.h) return null
  let top = rect.y + ROW.top
  return (
    <g data-chapter-contents={entries.length}>
      {rows.map(({ entry, title }) => {
        const y = top
        top += ROW.pitch + extra({ title })
        return (
          <g key={entry.page}>
            <text {...CONSOLE_SPEC} x={rect.x} y={baselineIn(y, ROW.box, ROW.branch)} fontFamily={ctx.fonts.mono} fontSize={ROW.branch} fill={consoleText(inks.mark, ground, ROW.branch)} dominantBaseline="alphabetic" xmlSpace="preserve">
              {`${BRANCH}${String(entry.page).padStart(2, "0")}`}
            </text>
            {paintLines(title, { ctx, x: titleX, y: baselineIn(y, ROW.box, ROW.title), fill: consoleText(inks.bright, ground, ROW.title), fontFamily: ctx.fonts.body, fontWeight: "400" })}
          </g>
        )
      })}
    </g>
  )
}
