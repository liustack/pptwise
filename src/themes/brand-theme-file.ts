/**
 * Parse user-authored v2 self-contained theme files. File I/O stays in the
 * CLI, which compiles a resolved file with `compileThemeDefinition` and
 * passes the definition down by value. `registerBrandThemeFile` below is
 * the process-level SDK seam for an embedder that wants an extracted theme
 * installed next to the factory presets.
 */
import { PptwiseError } from "../errors"
import { registerTheme } from "./definitions"
import { ThemeFileSchema, type ThemeFile } from "./schema"

/** Kept as the existing exported symbol, now pointing at the unified v2 contract. */
export const BrandThemeFileSchema = ThemeFileSchema
export { ThemeFileSchema }

/** Parse already decoded JSON as a public v2 theme file. */
export function parseBrandThemeFile(raw: unknown, source: string): ThemeFile {
  const result = ThemeFileSchema.safeParse(raw)
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n")
    throw new PptwiseError(
      `invalid theme file ${source}: current theme format is version 2 and every file is self-contained.\n${detail}`,
    )
  }
  return result.data as ThemeFile
}

/**
 * Install one parsed v2 file for the life of the process through
 * `registerTheme`: same gates, same refusal of an id that is already a
 * factory preset or already registered. A theme that belongs to one deck or
 * one request is not registered; the CLI compiles it and passes it by value.
 */
export function registerBrandThemeFile(file: ThemeFile): string {
  registerTheme(file)
  return file.id
}
