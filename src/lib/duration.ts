/*
 * A length of time written as a console prints it: 「2h52m」, 「14h32m」,
 * 「22h 06m」, 「45m」, 「3d 4h」. terminal sets durations this way
 * (`docs/design-terminal.md`), its `span` drawing scales them, and the
 * recipes that ask for one say so (`../layouts/compositions/recipe.ts`).
 */

const UNIT_MINUTES: Record<string, number> = { d: 1440, h: 60, m: 1, s: 1 / 60 }

/** A length of time written as a console prints it ("2h52m", "22h 06m"), in minutes, or `null`. */
export function parseDuration(text: string): number | null {
  const plain = text.trim()
  if (!/^(\d+(\.\d+)?\s*[dhms]\s*)+$/u.test(plain)) return null
  let minutes = 0
  for (const match of plain.matchAll(/(\d+(?:\.\d+)?)\s*([dhms])/gu)) minutes += Number(match[1]) * UNIT_MINUTES[match[2]!]!
  return minutes > 0 ? minutes : null
}
