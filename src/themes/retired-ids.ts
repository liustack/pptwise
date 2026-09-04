import { PptwiseError } from "../errors"

/**
 * The theme ids the naming rename retired, and the name each one became.
 *
 * A theme id is a public interface, so the nine renamed built-ins do not go
 * quietly: the old id is not a theme any more, it is not an alias, and it is
 * not a name anybody may take. The charter is zero compatibility — there is
 * deliberately no map from an old id to a new theme, because a silent
 * rewrite would render a deck under a name its author never asked for and
 * would keep the old vocabulary alive in decks written after the rename.
 *
 * Retiring a name is more than removing a built-in. A workspace theme, a
 * copied preset, or a colour fork that took the freed id back would reissue
 * the exact word the rename removed, and every deck naming it would read as
 * valid again while meaning something else. So the id is refused at the one
 * public boundary every named theme passes — the theme-file contract — and
 * at the two id assertions that run before it: the CLI's own id check and
 * the preset copy's target. Lookup rejects the name before it searches for
 * a file, so a `consulting.theme.json` sitting in a workspace cannot answer
 * to it either.
 *
 * What the old id gets instead is the treatment retired fields already get
 * (`ir/rename-hints.ts`): a hard error that says what the name is now, so a
 * human or a model can fix the deck in one edit.
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
 * The one sentence every boundary says about a retired id: what it was, what
 * it is now, and that the freed name is not available. `undefined` for an id
 * that was never a theme, so a caller can fall through to its own message.
 */
export function retiredThemeIdMessage(id: string): string | undefined {
  const current = RETIRED_THEME_IDS[id]
  if (current === undefined) return undefined
  return `theme id "${id}" was renamed to "${current}" — a retired id cannot be reused, so name it "${current}" or pick a new name`
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

/** Refuse a retired id at an id boundary that throws rather than collects. */
export function assertNotRetiredThemeId(id: string): void {
  const message = retiredThemeIdMessage(id)
  if (message !== undefined) throw new PptwiseError(message)
}

/**
 * The motif ids the same batch retired. A motif id is public too: copying a
 * preset writes it into the copy's own `menu.*.decor.id`, so a theme file a
 * user edits would otherwise still say `campaign-motif` under a theme called
 * rally. Renamed with their themes, and refused by name for the same reason
 * a retired theme id is.
 */
export const RETIRED_MOTIF_IDS: Readonly<Record<string, string>> = {
  "campaign-motif": "rally-motif",
  "classroom-motif": "homeroom-motif",
  "enterprise-motif": "bulletin-motif",
  "pulse-motif": "clinic-motif",
  "terra-motif": "almanac-motif",
}

/** What a retired motif id became, said the way a theme id says it. */
export function retiredMotifIdMessage(id: string): string | undefined {
  const current = RETIRED_MOTIF_IDS[id]
  if (current === undefined) return undefined
  return `motif id "${id}" was renamed to "${current}" — a retired id cannot be reused, so name it "${current}"`
}
