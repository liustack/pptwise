/**
 * The names that predate the naming rule.
 *
 * The rule is that a name names a voice or a genre, never a vertical, a
 * function, an audience, or an organization type. Thirteen built-ins were
 * named before it, and a theme id is a public interface, so they were
 * renamed once, together, in their own release rather than piecemeal.
 *
 * That release has landed, so the list is empty and nothing is licenced any
 * more. It is a **frozen baseline**: it may lose entries and it may never
 * gain one. Nothing new is allowed in, because the moment a new name can be
 * waved through by appending a line, the rule stops being a rule.
 * `naming-rule.test.ts` asserts both directions — a broken name outside this
 * list fails, and a name in this list that has been fixed fails until its
 * line goes. Empty, the ratchet is closed for good.
 */
export interface LegacyThemeName {
  readonly id: string
  readonly label: string
}

export const LEGACY_THEME_NAMES: readonly LegacyThemeName[] = []

const LEGACY_TEXT: ReadonlySet<string> = new Set(
  LEGACY_THEME_NAMES.flatMap((name) => [name.id, name.label]).map((text) => text.toLowerCase()),
)

/**
 * Whether a piece of text is one of the names the rule is still waiting on.
 *
 * Exact match, never a substring: while the list held `Fashion Runway`, that
 * exact label was licenced and `Fashion Weekly` got no cover from it. The
 * list is empty now, so every name answers to the rule.
 */
export function isLegacyThemeName(text: string): boolean {
  return LEGACY_TEXT.has(text.trim().toLowerCase())
}
