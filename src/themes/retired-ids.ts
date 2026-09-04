/**
 * The theme ids the naming rename retired, and the name each one became.
 *
 * A theme id is a public interface, so the nine renamed built-ins do not go
 * quietly: the old id is not a theme any more, and it is not an alias either.
 * The charter is zero compatibility — there is deliberately no map from an
 * old id to a new theme, because a silent rewrite would render a deck under
 * a name its author never asked for and would keep the old vocabulary alive
 * in decks written after the rename.
 *
 * What the old id gets instead is the treatment retired fields already get
 * (`ir/rename-hints.ts`): a hard error that says what the name is now, so a
 * human or a model can fix the deck in one edit. This module is a leaf — it
 * imports nothing — so every layer that rejects an unknown theme id can
 * append the hint.
 */
export const RETIRED_THEME_IDS: Readonly<Record<string, string>> = {
  consulting: "brief",
  academic: "thesis",
  insight: "ledger",
  tech: "terminal",
  enterprise: "bulletin",
  classroom: "homeroom",
  campaign: "rally",
  pulse: "clinic",
  terra: "almanac",
}

/**
 * ` — renamed to "<new>"` for a retired id, empty for every other name.
 * Already carries its own separator, so a caller appends it to an "unknown
 * theme" message without testing for it first.
 */
export function retiredThemeHint(id: string): string {
  const current = RETIRED_THEME_IDS[id]
  return current === undefined ? "" : ` — renamed to "${current}"`
}
