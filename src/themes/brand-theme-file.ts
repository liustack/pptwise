/**
 * Parse and register user-authored v2 self-contained theme files. File I/O
 * stays in the CLI. File loading uses `installThemeFile` so a freeze copy
 * can shadow a builtin and a failed reload cannot drop a previous definition.
 */
import { PptwiseError } from "../errors"
import { installThemeFile } from "./definitions"
import { ThemeFileSchema, type ThemeFile } from "./schema"

/** Kept as the existing exported symbol, now pointing at the unified v2 contract. */
export const BrandThemeFileSchema = ThemeFileSchema
export { ThemeFileSchema }

function hasRetiredThemeShape(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return false
  const value = raw as Record<string, unknown>
  return value.version === 1 || Object.hasOwn(value, "base") || Object.hasOwn(value, "faces")
}

/** Parse already decoded JSON as a public v2 theme file. */
export function parseBrandThemeFile(raw: unknown, source: string): ThemeFile {
  if (hasRetiredThemeShape(raw)) {
    throw new PptwiseError(
      `invalid theme file ${source}: current theme format is version 2 and every file is self-contained. Declare style and menu with cover, chapter, a non-empty content kind subset, and ending entries. The base, faces, tendencies, sparse, and top-level motif fields were removed. No migration tool is provided.`,
    )
  }

  const result = ThemeFileSchema.safeParse(raw)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")
    throw new PptwiseError(`invalid theme file ${source}:\n${detail}`)
  }
  return result.data as ThemeFile
}

/**
 * Register one parsed v2 file through the replace channel. A builtin id is
 * a freeze/shadow. Re-reading a custom id replaces the previous definition
 * only after every gate passes.
 */
export function registerBrandThemeFile(file: ThemeFile): string {
  installThemeFile(file)
  return file.id
}
