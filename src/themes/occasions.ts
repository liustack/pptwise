/**
 * Public occasion vocabulary for theme files. The reachability stream owns
 * the built-in theme assignments that will consume these values. Keep this
 * tuple as the schema source of truth so files fail early on misspellings.
 */
export const OCCASION_VOCAB = [
  "business",
  "institutional",
  "education",
  "research",
  "finance",
  "technology",
  "healthcare",
  "sustainability",
  "government",
  "marketing",
  "culture",
  "event",
  "entertainment",
  "fashion",
] as const

export type Occasion = (typeof OCCASION_VOCAB)[number]
