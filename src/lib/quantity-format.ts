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
 * A written figure with its whole part grouped in threes by commas, the way
 * each language prints a figure on a chart: "2,778" and "10,575" in English,
 * 「8490」 and 「10,575」 in Chinese.
 *
 * English groups from four digits up, as the Chicago Manual of Style and AP
 * style both do. Chinese leaves a whole part of four digits alone and groups
 * from five: GB/T 15835-2011 (出版物上数字用法) lets an integer of four digits
 * or fewer go ungrouped, and Chinese statistical releases print 8490 beside
 * 10,575. The sign before the digits, the decimals after them and any unit
 * are kept as written. Only the first run of digits is the whole part, so a
 * decimal part is never grouped.
 */
export function groupDigits(figure: string, chinese: boolean): string {
  const from = chinese ? 5 : 4
  return figure.replace(/^(\D*?)(\d+)/u, (_all, lead: string, digits: string) =>
    digits.length < from ? `${lead}${digits}` : `${lead}${digits.replace(/\B(?=(\d{3})+$)/gu, ",")}`,
  )
}

/**
 * `number` with `unit` attached as a reader expects it: a currency sign
 * before the digits and after any `+` or `-` (`+$0.48`, `-$2`), a percent sign
 * or a Latin magnitude glued after them (`12%`, `2m`), and any other unit
 * after `gap`.
 */
export function joinUnit(number: string, unit?: string, gap: "" | " " = " "): string {
  if (!unit) return number
  if (PERCENT.has(unit) || MAGNITUDE.has(unit)) return `${number}${unit}`
  const currency = CURRENCY_LEAD.exec(unit)
  if (currency) {
    const sign = /^[+\-−]/.test(number) ? number[0] : ""
    return `${sign}${currency[1]}${number.slice(sign.length)}${currency[2]}`
  }
  return `${number}${gap}${unit}`
}
