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
 * `number` with `unit` attached as a reader expects it: a currency sign
 * before the digits and after any `+` or `-` (`+$0.48`, `-$2`), a percent sign
 * glued after them, and any other unit after `gap`.
 */
export function joinUnit(number: string, unit?: string, gap: "" | " " = " "): string {
  if (!unit) return number
  if (PERCENT.has(unit)) return `${number}${unit}`
  const currency = CURRENCY_LEAD.exec(unit)
  if (currency) {
    const sign = /^[+\-−]/.test(number) ? number[0] : ""
    return `${sign}${currency[1]}${number.slice(sign.length)}${currency[2]}`
  }
  return `${number}${gap}${unit}`
}
