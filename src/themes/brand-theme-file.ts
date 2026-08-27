/**
 * Parse and register user-authored v1 theme files. File I/O stays in the CLI.
 * Both partial and complete declarations enter the engine through
 * `registerTheme`, which owns compilation and every runtime quality gate.
 */
import { PptwiseError } from "../errors"
import { getInstalledThemeIds, registerTheme } from "./definitions"
import { CANONICAL_THEME_IDS } from "./index"
import { ThemeFileSchema, type ThemeFile } from "./schema"

/** Kept as the existing exported symbol, now pointing at the unified v1
 * contract. It does not accept the legacy BrandThemeFile shape. */
export const BrandThemeFileSchema = ThemeFileSchema
export { ThemeFileSchema }

function looksLikeLegacyBrandThemeFile(raw: unknown): boolean {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return false
  const value = raw as Record<string, unknown>
  return !Object.hasOwn(value, "version") && Object.hasOwn(value, "id") && Object.hasOwn(value, "style")
}

/** Parse already decoded JSON as a public v1 theme file. */
export function parseBrandThemeFile(raw: unknown, source: string): ThemeFile {
  if (looksLikeLegacyBrandThemeFile(raw)) {
    throw new PptwiseError(
      `invalid theme file ${source}: legacy BrandThemeFile is not supported. Add "version": 1. For a partial theme add "base" and keep only style and brand overrides. For a complete theme omit "base" and declare all four "faces" pools. See docs/brand-extraction.md`,
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
 * Register one parsed v1 file. Built-in ids can never be shadowed. Re-reading
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
