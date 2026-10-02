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
