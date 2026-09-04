/**
 * The names that predate the naming rule.
 *
 * The rule is that a name names a voice or a genre, never a vertical, a
 * function, an audience, or an organization type. Thirteen built-ins were
 * named before it, and a theme id is a public interface, so they are renamed
 * once, together, in their own release rather than piecemeal.
 *
 * Until then this is their only licence. It is a **frozen baseline**: it may
 * lose entries and it may never gain one. Nothing new is allowed in, because
 * the moment a new name can be waved through by appending a line, the rule
 * stops being a rule. `naming-rule.test.ts` asserts both directions — a
 * broken name outside this list fails, and a name in this list that has been
 * fixed fails until its line goes.
 *
 * Both halves are listed because both are copied forward. `theme new --from
 * consulting` carries the old label onto a freshly named theme, and the
 * public theme-file contract would otherwise refuse the copy it just made.
 */
export interface LegacyThemeName {
  readonly id: string
  readonly label: string
}

export const LEGACY_THEME_NAMES: readonly LegacyThemeName[] = [
  { id: "academic", label: "Academic" },
  { id: "arena", label: "Esports & Entertainment" },
  { id: "campaign", label: "Marketing Campaign" },
  { id: "classroom", label: "Classroom" },
  { id: "consulting", label: "Business Consulting" },
  { id: "crayon", label: "Kids Education" },
  { id: "ember", label: "Startup Pitch" },
  { id: "enterprise", label: "Enterprise" },
  { id: "insight", label: "Financial Insight" },
  { id: "pulse", label: "Health & Life Science" },
  { id: "runway", label: "Fashion Runway" },
  { id: "tech", label: "Tech" },
  { id: "terra", label: "Sustainability & ESG" },
]

const LEGACY_TEXT: ReadonlySet<string> = new Set(
  LEGACY_THEME_NAMES.flatMap((name) => [name.id, name.label]).map((text) => text.toLowerCase()),
)

/**
 * Whether a piece of text is one of the names the rule is still waiting on.
 *
 * Exact match, never a substring: `Fashion Runway` is licenced, `Fashion
 * Weekly` is a new name and gets no cover from it.
 */
export function isLegacyThemeName(text: string): boolean {
  return LEGACY_TEXT.has(text.trim().toLowerCase())
}
