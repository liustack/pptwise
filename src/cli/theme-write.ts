import { link, mkdir, rename, rm, writeFile } from "node:fs/promises"
import { basename, dirname, join } from "node:path"
import { randomBytes } from "node:crypto"
import { PptwiseError } from "../errors"
import type { ThemeFile } from "../themes/schema"

/** Test-only seam: runs after the complete temp file exists and before the
 * single publish step (link or rename). Production callers never pass it. */
export interface ThemeWriteHooks {
  beforePublish?: (tmpPath: string, targetPath: string) => Promise<void>
}

export async function writeThemeFile(
  path: string,
  file: ThemeFile,
  force = false,
  hooks?: ThemeWriteHooks,
): Promise<void> {
  const dir = dirname(path)
  await mkdir(dir, { recursive: true })

  // Atomic in both senses (charter ruling on theme assets): the target path
  // only ever holds a complete file (publish is a single link/rename), and a
  // no-force writer publishes exclusively (link fails EEXIST when anyone
  // else got there first — there is no reserve step that could strand an
  // empty target, only a private temp file to sweep on failure). --force is
  // an atomic replace of whatever is published at that instant, which is
  // the linearizable overwrite semantics the flag promises.
  const tmp = join(dir, `.${basename(path)}.${randomBytes(8).toString("hex")}.tmp`)
  try {
    await writeFile(tmp, JSON.stringify(file, null, 2) + "\n")
    await hooks?.beforePublish?.(tmp, path)
    if (force) {
      await rename(tmp, path)
      return
    }
    try {
      await link(tmp, path)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        throw new PptwiseError(`theme file already exists: ${path}. Pass --force to overwrite.`)
      }
      throw error
    }
    await rm(tmp, { force: true })
  } catch (error) {
    await rm(tmp, { force: true })
    throw error
  }
}
