/**
 * A currency sign, alone or leading a magnitude like "$M" or "¥万". It is
 * printed in front of the number, the way the amount is written by hand.
 */
const CURRENCY_LEAD = /^(US\$|HK\$|NT\$|A\$|C\$|S\$|R\$|[$€£¥￥₩₹₽₺₪฿])(.*)$/

const PERCENT = new Set(["%", "％"])

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
