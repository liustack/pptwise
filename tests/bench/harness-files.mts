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
