/**
 * The files a benchmark harness writes into a question's result directory
 * beside the model's own artifact. `run-agentic.mts` writes them,
 * `score.mts` skips them when it scans the directory for a bare IR `*.json`
 * — one list, shared, so a new harness-written file can never again be read
 * as a second IR candidate (codex review R2: `transcript.json` landing next
 * to `deck.json` turned every clean bare-IR run into an "ambiguous
 * artifact" fail).
 */
export const META_FILENAME = "meta.json"
export const TRANSCRIPT_FILENAME = "transcript.json"
export const HARNESS_FILES: ReadonlySet<string> = new Set([META_FILENAME, TRANSCRIPT_FILENAME])

/**
 * A theme file by the CLI's own naming (`resolveThemeByName`,
 * `src/cli/theme-resolve.ts`): the deck-local `theme.json`, or a named
 * `<id>.theme.json` beside the deck or under `themes/`. Used only to keep
 * such a file out of the bare-IR candidate pool — the runner never picks
 * one as the IR, and the scorer skips them when it scans the result
 * directory. Which theme file travels with an artifact is not decided by
 * name: `placeArtifact` (`run-agentic.mts`) resolves the bound name the way
 * the CLI did and carries that one hit. A loose `<id>.json` theme is
 * indistinguishable from an IR by name and is not covered here.
 */
export function isThemeFileName(name: string): boolean {
  return name === "theme.json" || name.endsWith(".theme.json")
}
