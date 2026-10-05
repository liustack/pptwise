import type React from "react"
import type { PptxIR } from "@/ir"
import type { ComponentCtx } from "../../components/types"
import { stripEmphasis } from "../../render/emphasis"
import { accessibleInk } from "../../render/ink"
import { CONSOLE_SPEC, consoleInks, monoWidth } from "./console"

/*
 * crumb: where a page sits in its deck, as one mono line in the top left
 * corner, the way a console prints its path. A dot in the mark, the section's
 * number and name in the mark, then a quiet dot and the page's own number:
 * 「● 01 / 复盘 · P04」. terminal's 2026-10 board puts it on every page.
 *
 * The author writes nothing for it: the line is read off the deck.
 *
 * - A content page names its chapter: its number counted from the deck's
 *   first chapter page (00 before it), and the chapter heading's lead, the
 *   words before its first colon (「复盘：13 起中断说了什么」 → 「复盘」). Before
 *   the first chapter the page names itself the same way.
 * - The cover's section is 00, named by the deck's organization, with the
 *   deck's date where the page number would stand.
 * - A chapter page names its number and the word for a chapter in the deck's
 *   language, and says DIR: the page lists its chapter's pages.
 * - The ending's section is EOF, named by the last chapter, with the date.
 *
 * A heading without a colon has no lead, and the line then carries the
 * section's number alone. Its type is 13px mono, under the 16px floor at the
 * board's size, with the `console-spec` exemption.
 *
 * Reads: the mark (`emphasisInk` or `accent`), `muted`, `border` (the quiet
 * dot), `fonts.mono`, and the deck through the face that calls it.
 */

export interface Crumb {
  /** The section's number, or EOF on the ending. */
  section: string
  /** What the section is called, or `null` when the deck gives it no name. */
  name: string | null
  /** The page's number, or what stands in its place. */
  tail: string | null
}

/** A heading's lead: the words before its first colon, when there are a few of them. */
export function headingLead(heading: string | undefined): string | null {
  const text = stripEmphasis(heading ?? "").trim()
  const match = /^([^：:]{1,24}?)\s*[：:]/u.exec(text)
  return match ? match[1]!.trim() : null
}

const pad2 = (n: number) => String(n).padStart(2, "0")

/** The chapter pages at or before `index`, and the last of them. */
function chapterAt(ir: Pick<PptxIR, "slides">, index: number): { count: number; heading: string | undefined } {
  let count = 0
  let heading: string | undefined
  for (let i = 0; i <= index && i < ir.slides.length; i++) {
    const slide = ir.slides[i]!
    if (slide.type !== "chapter") continue
    count++
    heading = slide.heading
  }
  return { count, heading }
}

/**
 * The crumb for page `index`. `chinese` picks the word a chapter page calls
 * itself, `pageNumber` whether the page prints its own number (a deck whose
 * footer row prints it does not need it twice).
 */
export function crumbFor(ir: Pick<PptxIR, "slides" | "meta">, index: number, opts: { chinese: boolean; pageNumber: boolean }): Crumb {
  const slide = ir.slides[index]!
  const chapter = chapterAt(ir, index)
  const date = ir.meta.date?.trim() || null
  switch (slide.type) {
    case "cover":
      return { section: "00", name: ir.meta.organization?.trim() || null, tail: date }
    case "chapter":
      return { section: pad2(chapter.count), name: opts.chinese ? "章节" : "Chapter", tail: "DIR" }
    case "ending":
      return { section: "EOF", name: headingLead(chapter.heading), tail: date }
    default:
      return {
        section: pad2(chapter.count),
        name: headingLead(chapter.count > 0 ? chapter.heading : slide.heading),
        tail: opts.pageNumber ? `P${pad2(index + 1)}` : null,
      }
  }
}

/** The crumb's type and marks, from terminal's board. */
export const CRUMB = { size: 13, dotR: 5, dotGap: 10, sepR: 1.5, gap: "  " } as const

/**
 * Paints `crumb` with its dot centred at `(x + 5, baseline - 3)` and its words
 * from `x + 20` on `baseline`: the section and its name in the mark, then,
 * past a quiet dot, the tail in the muted ink. The quiet dot is a shape, not
 * a word, so it stays as quiet as the board drew it.
 */
export function paintCrumb({ crumb, ctx, x, baseline }: { crumb: Crumb; ctx: ComponentCtx; x: number; baseline: number }): React.ReactElement {
  const inks = consoleInks(ctx)
  const ground = inks.ground
  const head = crumb.name ? `${crumb.section} / ${crumb.name}` : crumb.section
  const textX = x + CRUMB.dotR * 2 + CRUMB.dotGap
  const lead = `${head}${CRUMB.gap}`
  const sepX = textX + monoWidth(lead, CRUMB.size) + monoWidth(" ", CRUMB.size) / 2
  const tail = crumb.tail ? `${lead} ${CRUMB.gap}` : null
  return (
    <g data-crumb={head}>
      <circle cx={x + CRUMB.dotR} cy={baseline - 3} r={CRUMB.dotR} fill={inks.mark} />
      <text
        {...CONSOLE_SPEC}
        x={textX}
        y={baseline}
        fontFamily={ctx.fonts.mono}
        fontSize={CRUMB.size}
        fill={accessibleInk(inks.mark, ground, CRUMB.size)}
        dominantBaseline="alphabetic"
        xmlSpace="preserve"
      >
        {tail ? lead : head}
        {crumb.tail ? <tspan fill={accessibleInk(inks.muted, ground, CRUMB.size)}>{` ${CRUMB.gap}${crumb.tail}`}</tspan> : null}
      </text>
      {tail ? <circle data-crumb-sep="" cx={sepX} cy={baseline - 4} r={CRUMB.sepR} fill={inks.dim} /> : null}
    </g>
  )
}
