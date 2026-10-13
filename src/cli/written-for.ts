/**
 * The theme a deck project's pages were written for, kept in the deck's
 * workspace folder (`.pptwise/<deck>/written-for.json`).
 *
 * A deck's pages are written against one theme's faces. A build under
 * another theme draws them with what those faces cannot take left off, and
 * says so (`validateIr`'s `writtenFor`), instead of refusing them. The
 * record is how the build knows which theme the pages were written for: the
 * theme of the last build that drew every page whole. A build that left
 * something off keeps the record as it was, so switching back draws the
 * pages whole again, and a deck rewritten to fit its new theme moves the
 * record with its first whole build.
 *
 * No record (a deck never built whole, a fresh checkout: the workspace
 * folder is not committed) means the pages are taken as written for the
 * theme the deck binds, with every gate as strict as for a new deck.
 */
import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"

export const WRITTEN_FOR_FILENAME = "written-for.json"

/** The theme id the record names, or undefined when there is no record or it cannot be read. */
export async function readWrittenFor(workspaceDir: string): Promise<string | undefined> {
  let raw: string
  try {
    raw = await readFile(join(workspaceDir, WRITTEN_FOR_FILENAME), "utf8")
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw e
  }
  // A record this version cannot read is no record: the pages are taken as
  // written for the theme the deck binds, which is the strict reading.
  try {
    const value = JSON.parse(raw) as { theme?: unknown }
    return typeof value.theme === "string" && value.theme !== "" ? value.theme : undefined
  } catch {
    return undefined
  }
}

/** Record that the deck's pages are written for `theme`. The folder exists: the build just wrote into it. */
export async function writeWrittenFor(workspaceDir: string, theme: string): Promise<void> {
  await writeFile(join(workspaceDir, WRITTEN_FOR_FILENAME), `${JSON.stringify({ theme }, null, 2)}\n`)
}
