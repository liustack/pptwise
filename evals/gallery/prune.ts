/**
 * After a successful gallery write, keep only `keepNames` at one directory
 * level. Files not in the keep set are deleted. Directories not in the keep
 * set are left alone: this helper does not recursively wipe nested trees it
 * does not understand.
 *
 * `--only=layout` (or any other table) into a dir that already has other
 * tables' pages is the intended case. This run's keep list is the source of
 * truth, so leftover files from tables this run did not render go away.
 */

import { existsSync, readdirSync, unlinkSync } from "node:fs"
import { join } from "node:path"

export function pruneGalleryDir(dir: string, keepNames: ReadonlySet<string>): void {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (keepNames.has(entry.name)) continue
    if (entry.isDirectory()) continue
    unlinkSync(join(dir, entry.name))
  }
}
