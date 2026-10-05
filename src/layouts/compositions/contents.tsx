import type React from "react"
import type { PptxIR } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import type { ContentRect } from "../../render/layout"
import { stripEmphasis, type EmphasisHeadingLayout } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { markInk } from "./grid"
import { ruleInk, type CompositionSetting } from "./shared"
import { centredBaseline, fitFixed, paintLines } from "./type"
import { drawContentsConsole } from "./contents-console"

/*
 * contents: what a chapter holds, listed on its chapter page. Each content
 * page between this chapter page and the next one (or the deck's end) gets
 * a row: its page number, two digits, bold in the mark colour, and its
 * heading, as the page states it, in ink, with a hairline under each row.
 * The author writes nothing for it: the rows are read off the deck.
 * swiss's 2026-10 chapter pages (p03, p07, p11).
 *
 * The rows are the deck's own words, so the list is drawn whole or not at
 * all: a row whose heading needs a third line, or a chapter with more pages
 * than the band holds, leaves the chapter page without its list rather than
 * with part of one. Rows stand 72px apart, or 52px when every heading is one
 * line and the roomier pitch does not hold them all.
 *
 * Unlike the content compositions in `./index.ts`, this one reads the deck
 * rather than a page's components, so `compose` never offers it: a chapter
 * face calls it with `chapterContents` and its own band.
 *
 * Reads: the mark colour of the face's setting (`markInk`), `text`, `border`
 * or `muted` (the hairlines), `bg` or `defaultBg`, `fonts.body`.
 */

/** One row: a page's number and its heading. */
export interface ContentsEntry {
  /** The page's number in the deck, from 1. */
  page: number
  heading: string
}

/** The content pages a chapter page at `index` opens: up to the next chapter page, or the deck's end. */
export function chapterContents(ir: Pick<PptxIR, "slides">, index: number): ContentsEntry[] {
  const entries: ContentsEntry[] = []
  for (let i = index + 1; i < ir.slides.length; i++) {
    const slide = ir.slides[i]!
    if (slide.type === "chapter") break
    if (slide.type !== "content") continue
    entries.push({ page: i + 1, heading: stripEmphasis(slide.heading ?? "").trim() })
  }
  return entries
}

const NUMBER = { size: 17, box: 28, w: 64 }
const TITLE = { size: 19, lineHeight: 28, maxLines: 2 }
/** The first row's box starts 18px under the band's top (y318 under the rule at y300). */
const FIRST = 18
const PITCH = 72
const TIGHT_PITCH = 52
/** The hairline under a row sits this far over the next row's top. */
const RULE_ABOVE = 12

/**
 * The chapter's rows drawn in `rect`, or `null` when there are none or they
 * do not all fit whole.
 */
export function drawContents({
  entries,
  ctx,
  rect,
  setting,
}: {
  entries: readonly ContentsEntry[]
  ctx: ComponentCtx
  rect: ContentRect
  setting?: CompositionSetting
}): React.ReactElement | null {
  if (setting === "console") return drawContentsConsole({ entries, ctx, rect })
  if (entries.length === 0) return null
  const { colors, fonts } = ctx
  const body = fonts.body
  const titleX = rect.x + NUMBER.w
  const titleW = rect.w - NUMBER.w
  const rows: { entry: ContentsEntry; title: EmphasisHeadingLayout }[] = []
  for (const entry of entries) {
    if (!entry.heading) return null
    const title = fitFixed(entry.heading, { width: titleW, size: TITLE.size, lineHeight: TITLE.lineHeight, maxLines: TITLE.maxLines, fontFamily: body, bold: false })
    if (title === null) return null
    rows.push({ entry, title })
  }
  const oneLine = rows.every((row) => row.title.lines.length === 1)
  // Each row closes on its hairline, the last one included.
  const fits = (pitch: number) =>
    rows.every((row) => row.title.lines.length * TITLE.lineHeight <= pitch - RULE_ABOVE - 4) && FIRST + rows.length * pitch - RULE_ABOVE <= rect.h
  const pitch = fits(PITCH) ? PITCH : oneLine && fits(TIGHT_PITCH) ? TIGHT_PITCH : null
  if (pitch === null) return null

  const bg = ctx.defaultBg ?? colors.bg
  const numberInk = accessibleInk(markInk(ctx, setting), bg, NUMBER.size)
  const titleInk = accessibleInk(colors.text, bg, TITLE.size)
  const rule = ruleInk(ctx)
  return (
    <g data-chapter-contents={entries.length}>
      {rows.map(({ entry, title }, i) => {
        const top = rect.y + FIRST + i * pitch
        return (
          <g key={entry.page}>
            <text
              x={rect.x}
              y={centredBaseline(top, NUMBER.box, NUMBER.size)}
              fontFamily={body}
              fontSize={NUMBER.size}
              fontWeight="700"
              fill={numberInk}
              dominantBaseline="alphabetic"
            >
              {String(entry.page).padStart(2, "0")}
            </text>
            {paintLines(title, { ctx, x: titleX, y: centredBaseline(top, TITLE.lineHeight, TITLE.size), fill: titleInk, fontFamily: body, fontWeight: "400" })}
            <line x1={rect.x} y1={top + pitch - RULE_ABOVE} x2={rect.x + rect.w} y2={top + pitch - RULE_ABOVE} stroke={rule} strokeWidth={1} />
          </g>
        )
      })}
    </g>
  )
}
