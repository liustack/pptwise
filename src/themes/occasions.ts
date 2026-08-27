/**
 * TODO-merge: B-stream owns this file (occasion vocabulary + 24 builtin
 * occasion/identity rows). This C-stream placeholder exports an empty table
 * so CLI/discovery compiles. Prefer the B-stream version on merge.
 */
export type IdentityStrength = "low" | "medium" | "high"

export interface ThemeOccasionMeta {
  occasions: readonly string[]
  identity: IdentityStrength
  label?: string
}

/** Builtin theme id → occasion/identity metadata. Empty until B-stream lands. */
export const THEME_OCCASIONS: Record<string, ThemeOccasionMeta> = {}
