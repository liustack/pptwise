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
 * The theme ids a merge retired, and the built-in each one now renders as.
 *
 * arena and playbill were folded into rally, and heritage into luxe. Drawn
 * side by side on the same content, rally and arena were hard to tell apart
 * (a deep purple field with one bright colour each), playbill answered the
 * rooms rally already answers, and heritage spoke in luxe's register.
 *
 * A fold is not a rename, and it is not silent. A deck that names a folded
 * id keeps working: IR and spec validation read the id as the theme that
 * absorbed it and say so in a warning, and a name lookup resolves it there.
 * What a fold shares with a rename is that the freed word is not free. A
 * theme file, a registration, an install, a preset copy or a colour fork
 * that took it back would give one name two meanings, so every boundary
 * that names a theme refuses it ({@link retiredThemeIdMessage}).
 *
 * Every target is a current built-in, never another retired id, so a
 * folded id resolves in one step.
 */
export const FOLDED_THEME_IDS: Readonly<Record<string, string>> = {
  arena: "rally",
  playbill: "rally",
  heritage: "luxe",
}

/** The built-in a folded id now renders as, `undefined` for every other name. */
export function foldedThemeTarget(id: string): string | undefined {
  return Object.hasOwn(FOLDED_THEME_IDS, id) ? FOLDED_THEME_IDS[id] : undefined
}

/**
 * The warning a deck gets for binding a folded id: which theme it renders
 * as, and the one edit that makes the warning go away. `undefined` for every
 * other name.
 */
export function foldedThemeWarning(id: string): string | undefined {
  const target = foldedThemeTarget(id)
  if (target === undefined) return undefined
  return `theme id "${id}" was folded into "${target}", so this deck renders as "${target}". Bind it to "${target}" (see \`pptwise themes\`)`
}

/**
 * The one sentence every naming boundary says about a retired id, renamed or
 * folded: what it was, what it is now, and that the freed name is not
 * available. `undefined` for an id that was never a theme, so a caller can
 * fall through to its own message.
 */
export function retiredThemeIdMessage(id: string): string | undefined {
  const current = RETIRED_THEME_IDS[id]
  if (current !== undefined) {
    return `theme id "${id}" was renamed to "${current}" — a retired id cannot be reused, so name it "${current}" or pick a new name`
  }
  const target = foldedThemeTarget(id)
  if (target !== undefined) {
    return `theme id "${id}" was folded into "${target}". A folded id cannot be reused, so name it "${target}" or pick a new name`
  }
  return undefined
}

/**
 * ` — renamed to "<new>"` for a renamed id, ` (folded into "<target>")` for
 * a folded one, empty for every other name. Already carries its own
 * separator, so a caller appends it to an "unknown theme" message without
 * testing for it first.
 */
export function retiredThemeHint(id: string): string {
  const current = RETIRED_THEME_IDS[id]
  if (current !== undefined) return ` — renamed to "${current}"`
  const target = foldedThemeTarget(id)
  return target === undefined ? "" : ` (folded into "${target}")`
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

/**
 * The motifs and faces only a folded theme drew, and the theme each one left
 * with. They were deleted with their themes, not renamed, so there is no new
 * id to point at. A theme file copied from one of those presets still names
 * them, and is refused by name with the theme that absorbed its source
 * rather than with a bare "unknown id".
 */
export const FOLDED_MOTIF_IDS: Readonly<Record<string, string>> = {
  "arena-motif": "arena",
  "playbill-motif": "playbill",
  "heritage-motif": "heritage",
}

export const FOLDED_FACE_IDS: Readonly<Record<string, string>> = {
  "cut-panel-cover": "arena",
  "round-mark-chapter": "arena",
  "seat-cta-ending": "arena",
  "bill-head": "playbill",
  "day-bill-chapter": "playbill",
  "mono-bleed": "playbill",
  "ticket-cta-ending": "playbill",
  "double-frame-cover": "heritage",
  "mirror-volume-chapter": "heritage",
  "invite-field-ending": "heritage",
}

function leftWith(kind: "motif" | "face", id: string, theme: string): string {
  const target = foldedThemeTarget(theme)!
  return `${kind} "${id}" was deleted with the ${theme} theme, which was folded into "${target}". Name a current ${kind}, or copy the theme again from "${target}" (\`pptwise theme new --from ${target}\`)`
}

/** What happened to a motif only a folded theme drew. */
export function foldedMotifIdMessage(id: string): string | undefined {
  return Object.hasOwn(FOLDED_MOTIF_IDS, id) ? leftWith("motif", id, FOLDED_MOTIF_IDS[id]!) : undefined
}

/** What happened to a face only a folded theme drew. */
export function foldedFaceIdMessage(id: string): string | undefined {
  return Object.hasOwn(FOLDED_FACE_IDS, id) ? leftWith("face", id, FOLDED_FACE_IDS[id]!) : undefined
}
