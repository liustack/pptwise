import type { PptxIR } from "@/ir"
import { deckWritesChinese } from "./conf-labels"
import { ENGLISH_FIGURES, type FigureStyle } from "./quantity-format"

/**
 * The figure style of a whole deck (`FigureStyle`), so every chart in it
 * prints its figures one way.
 *
 * A chart used to judge its language on its own words, its series names and
 * category labels. A Chinese deck's chart of quarters ("24Q1" to "26Q2") or
 * fiscal periods read as English and grouped 「1,650」, while the next chart,
 * labelled with company names, read as Chinese and printed 「3291」. The deck
 * decides instead: its language is its headings' (`deckWritesChinese`), the
 * same answer the confidentiality mark and the footer already use.
 *
 * A Chinese deck groups a four-digit figure the way its author does.
 * GB/T 15835-2011 §5.1.1 allows both 「1650」 and 「1,650」 for a whole part
 * of four digits or fewer, and a deck whose author writes 「7,325 亿美元」 in
 * its own text should not print 「3291」 in its charts. So the engine follows
 * the deck: once the author writes any four-digit figure grouped ("7,325",
 * "1,050"), the deck's charts group four digits too, and otherwise they keep
 * the standard's default and leave them whole. A run of five digits or more
 * is grouped either way. Only grouped figures are evidence: an ungrouped
 * four-digit run is as likely a year ("2026 年") as a figure.
 *
 * The rule is the deck's, not a chart's, so one chart never mixes the two:
 * in a deck that leaves four digits whole, 「8490」 stands beside 「10,575」,
 * as the standard's own example sets 1256 beside 624,000.
 */
export function deckFigureStyle(ir: Pick<PptxIR, "slides">): FigureStyle {
  const known = CACHE.get(ir.slides)
  if (known) return known
  const style = deckWritesChinese(ir) ? { chinese: true, groupFour: authorGroupsFourDigits(ir) } : ENGLISH_FIGURES
  CACHE.set(ir.slides, style)
  return style
}

/** Every page of a deck asks the same question, so the answer is kept per slide list. */
const CACHE = new WeakMap<readonly unknown[], FigureStyle>()

/** A whole part of exactly four digits written with its comma, "7,325" or "1,050.5", not part of a longer number. */
const GROUPED_FOUR = /(?<![\d,.])\d,\d{3}(?![\d,])/u

function authorGroupsFourDigits(ir: Pick<PptxIR, "slides">): boolean {
  for (const slide of ir.slides) {
    for (const text of [slide.heading, slide.subheading, slide.footnote]) if (text && GROUPED_FOUR.test(text)) return true
    if (anyString(slide.components, (text) => GROUPED_FOUR.test(text))) return true
  }
  return false
}

function anyString(value: unknown, test: (text: string) => boolean): boolean {
  if (typeof value === "string") return test(value)
  if (Array.isArray(value)) return value.some((item) => anyString(item, test))
  if (value !== null && typeof value === "object") return Object.values(value).some((item) => anyString(item, test))
  return false
}
