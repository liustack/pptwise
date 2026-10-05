/**
 * A currency sign, alone or leading a magnitude like "$M" or "¥万". It is
 * printed in front of the number, the way the amount is written by hand.
 */
const CURRENCY_LEAD = /^(US\$|HK\$|NT\$|A\$|C\$|S\$|R\$|[$€£¥￥₩₹₽₺₪฿])(.*)$/

const PERCENT = new Set(["%", "％"])

/** Whether `unit` is a percent sign, half-width or full-width. */
export function isPercentUnit(unit: string | undefined): boolean {
  return unit !== undefined && PERCENT.has(unit.trim())
}

/** Whether `unit` is a currency sign, alone or leading a magnitude like "$M", which a reader writes before the number. */
export function isCurrencyUnit(unit: string | undefined): boolean {
  return unit !== undefined && CURRENCY_LEAD.test(unit.trim())
}

/**
 * A Latin magnitude written as a unit: thousands, millions, billions,
 * trillions. Glued to the figure it scales ("2m", "3.4bn", "12K"), the way a
 * business reader writes it: "2 m" reads as two metres.
 */
const MAGNITUDE = new Set(["k", "K", "m", "M", "mn", "bn", "B", "tn", "T"])

/** Whether `unit` is a Latin magnitude abbreviation, glued to its figure. */
export function isMagnitudeUnit(unit: string | undefined): boolean {
  return unit !== undefined && MAGNITUDE.has(unit.trim())
}

/**
 * A multiplication sign written as a unit: "199×", "3.2x". It is part of how
 * the figure is written, glued to it like a percent sign, and its glyph is
 * small: set as a suffix at under half the figure's size it reads as a speck.
 */
const MULTIPLIER = new Set(["×", "x"])

/** Whether `unit` is a multiplication sign, glued to its figure. */
export function isMultiplierUnit(unit: string | undefined): boolean {
  return unit !== undefined && MULTIPLIER.has(unit.trim())
}

/**
 * How a deck prints the figures the engine writes for it: chart values, axis
 * ticks, totals, bridge steps. `chinese` picks the words around a figure
 * (「个百分点」 or "pts") and `groupFour` says whether a whole part of four
 * digits is grouped ("1,650") or left whole (「1650」).
 *
 * English groups from four digits up, as the Chicago Manual of Style and AP
 * style both do, so an English style always has `groupFour`. Chinese may go
 * either way: GB/T 15835-2011 §5.1.1 groups a whole part of five digits and
 * up and lets one of four or fewer stand ungrouped (「四位以内的整数可以不
 * 分节」, its own example sets 1256 beside 624,000). Which of the two a deck
 * follows is its author's choice, read off the deck (`deckFigureStyle`).
 */
export interface FigureStyle {
  readonly chinese: boolean
  readonly groupFour: boolean
  /**
   * The decimals a whole value prints with on one chart: its other values'
   * (`wholeValueDecimals`), so 5 beside 5.4 and 4.8 prints "5.0". JSON keeps
   * no trailing zero, so an author's 5.0 reaches the chart as 5. A deck's
   * style carries none: each chart sets it from its own values.
   */
  readonly wholeDecimals?: number
}

/** The decimal places a value was written with, read from its shortest form. */
export function writtenDecimals(v: number): number {
  const text = String(Number(v.toPrecision(12)))
  const dot = text.indexOf(".")
  return dot < 0 || /e/i.test(text) ? 0 : text.length - dot - 1
}

/**
 * The decimals a whole value among `values` prints with: the fewest that any
 * value with a fraction carries, so the 5.0 an author wrote beside 5.4 and
 * 4.8 prints "5.0" and not "5", and a whole value beside 5.66 and 4.4 prints
 * one decimal, not two. Every value with a fraction keeps its own. 0 when no
 * value has one.
 */
export function wholeValueDecimals(values: readonly number[]): number {
  const fractional = values.filter((v) => Number.isFinite(v)).map(writtenDecimals).filter((d) => d > 0)
  return fractional.length > 0 ? Math.min(4, ...fractional) : 0
}

/** `v` as written, a whole value printed with `wholeDecimals` decimals. */
export function writtenFigure(v: number, wholeDecimals = 0): string {
  return Number.isInteger(v) && wholeDecimals > 0 ? v.toFixed(wholeDecimals) : String(v)
}

/** English figures: grouped from four digits. */
export const ENGLISH_FIGURES: FigureStyle = { chinese: false, groupFour: true }

/** Chinese figures as GB/T 15835 sets them by default: grouped from five digits, a four-digit whole part left whole. */
export const CHINESE_FIGURES: FigureStyle = { chinese: true, groupFour: false }

/** The style of a text judged on its own words, for a renderer that has no deck to ask. */
export function figureStyleOf(chinese: boolean): FigureStyle {
  return chinese ? CHINESE_FIGURES : ENGLISH_FIGURES
}

/**
 * A written figure with its whole part grouped in threes by commas, the way
 * a deck prints a figure: "2,778" and "10,575" in English, 「8490」 and
 * 「10,575」 in a Chinese deck that leaves four digits whole, 「8,490」 in one
 * whose author groups them (`FigureStyle`). A bare boolean is the language
 * alone, with its default grouping. The sign before the digits, the
 * decimals after them and any unit are kept as written. Only the first run
 * of digits is the whole part, so a decimal part is never grouped.
 */
export function groupDigits(figure: string, style: FigureStyle | boolean): string {
  const resolved = typeof style === "boolean" ? figureStyleOf(style) : style
  const from = resolved.groupFour ? 4 : 5
  return figure.replace(/^(\D*?)(\d+)/u, (_all, lead: string, digits: string) =>
    digits.length < from ? `${lead}${digits}` : `${lead}${digits.replace(/\B(?=(\d{3})+$)/gu, ",")}`,
  )
}

/**
 * `number` with `unit` attached as a reader expects it: a currency sign
 * before the digits and after any `+` or `-` (`+$0.48`, `-$2`), a percent sign,
 * a Latin magnitude or a multiplication sign glued after them (`12%`, `2m`,
 * `199×`), and any other unit
 * after `gap`.
 */
export function joinUnit(number: string, unit?: string, gap: "" | " " = " "): string {
  if (!unit) return number
  if (PERCENT.has(unit) || MAGNITUDE.has(unit) || MULTIPLIER.has(unit)) return `${number}${unit}`
  const currency = CURRENCY_LEAD.exec(unit)
  if (currency) {
    const sign = /^[+\-−]/.test(number) ? number[0] : ""
    return `${sign}${currency[1]}${number.slice(sign.length)}${currency[2]}`
  }
  return `${number}${gap}${unit}`
}
