/**
 * Parse and register user-authored v2 self-contained theme files. File I/O
 * stays in the CLI. Every declaration enters the engine through
 * `registerTheme`, which owns every runtime quality gate.
 */
import { PptwiseError } from "../errors"
import { getInstalledThemeIds, registerTheme } from "./definitions"
import { CANONICAL_THEME_IDS } from "./index"
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
 * Register one parsed v2 file. Built-in ids can never be shadowed. Re-reading
 * an already registered custom id is a no-op for the existing serve rebuild
 * loop.
 */
export function registerBrandThemeFile(file: ThemeFile): string {
  if ((CANONICAL_THEME_IDS as readonly string[]).includes(file.id)) {
    throw new PptwiseError(
      `theme file id "${file.id}" collides with a built-in pptwise theme. Pick a different id with \`pptwise brand extract --id <id>\` or edit the theme file's "id" field`,
    )
  }
  if (!getInstalledThemeIds().includes(file.id)) registerTheme(file)
  return file.id
}
