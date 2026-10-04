/*
 * Item numbers in the deck's own numerals.
 *
 * A Chinese report numbers its points 一、二、三, its tasks 一 to 十, and
 * a reader says 「第三条」, not "item three". A composition that numbers
 * items in a Chinese deck counts in Chinese numerals, and in Arabic numerals
 * in any other deck. Which deck it is comes from the deck's headings
 * (`ctx.figures.chinese`, `deckFigureStyle`), the same answer every chart and
 * the footer already use.
 */

const DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"] as const

/**
 * `n` (1 to 99) in Chinese numerals as a list counts: 一 … 十, 十一 … 十九,
 * 二十, 二十一 … 九十九. Outside that range, the Arabic figure.
 */
export function chineseNumeral(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 99) return String(n)
  if (n < 10) return DIGITS[n]!
  const tens = Math.floor(n / 10)
  const ones = n % 10
  return `${tens === 1 ? "" : DIGITS[tens]}十${ones === 0 ? "" : DIGITS[ones]}`
}

/** The `index`-th item's number (from 0) in the deck's numerals. */
export function itemNumeral(index: number, chinese: boolean): string {
  return chinese ? chineseNumeral(index + 1) : String(index + 1)
}
