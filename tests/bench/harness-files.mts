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
export const PLACEMENT_FILENAME = "placement.json"
export const HARNESS_FILES: ReadonlySet<string> = new Set([META_FILENAME, TRANSCRIPT_FILENAME, PLACEMENT_FILENAME])

/** Which step of the CLI's own theme lookup refused the artifact's binding:
 *  `resolve` is `resolveThemeByName` (no theme of that name, or a theme file
 *  it found but could not load), `rebind` is `assertThemeRebind` (the deck's
 *  bound `theme.json` and the named theme carry different menus). */
export type PlacementStage = "resolve" | "rebind"

/**
 * `placement.json`: the runner's record of a theme lookup the CLI refused,
 * written by `placeArtifact` (`run-agentic.mts`) only when the artifact's
 * bound theme did not resolve the way the CLI resolves it — a clean
 * placement writes no such file. `score.mts` reads it before it resolves
 * anything and treats `themeError` as the validate failure, so the scorer
 * can never re-resolve the name from the result directory, land on a
 * built-in of the same name, and pass an artifact the CLI rejected (codex
 * review R9: a broken `<id>.theme.json`, `<id>.json`, or `themes/` entry
 * never travelled, so only the CLI ever saw it fail).
 */
export interface PlacementRecord {
  /** The name the artifact binds (`ir.theme.id`, or a deck project's `spec.theme`). */
  themeName: string
  stage: PlacementStage
  /** The CLI's own error message, verbatim. */
  themeError: string
}

const PLACEMENT_STAGES: ReadonlySet<string> = new Set<PlacementStage>(["resolve", "rebind"])

/** Parses a `placement.json` body, throwing on anything but the exact
 *  {@link PlacementRecord} shape: the file is a contract between two files
 *  in this directory, so a wrong shape is a harness bug to surface, not a
 *  record to guess at. */
export function parsePlacementRecord(text: string): PlacementRecord {
  const raw = JSON.parse(text) as unknown
  if (typeof raw !== "object" || raw === null) throw new Error("placement record is not an object")
  const { themeName, stage, themeError } = raw as Record<string, unknown>
  if (typeof themeName !== "string") throw new Error("placement record has no string themeName")
  if (typeof stage !== "string" || !PLACEMENT_STAGES.has(stage)) throw new Error("placement record has no stage of resolve | rebind")
  if (typeof themeError !== "string") throw new Error("placement record has no string themeError")
  return { themeName, stage: stage as PlacementStage, themeError }
}

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
