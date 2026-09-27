/**
 * The `pack.json` at the root of every pack archive, and the path rule
 * every name inside a pack follows. Fields a version 1 client does not
 * know (`examples`, `assets`, anything later) are dropped on parse, not
 * refused.
 */
import { z } from "zod"
import { PptwiseError } from "../../errors"

export const PACK_MANIFEST_FILENAME = "pack.json"

/** A pack id names a directory and a URL segment: lowercase letters,
 *  digits, and inner hyphens. */
export const PACK_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/

/** A pack version is compared for equality only, and names a URL segment
 *  (`/api/packs/<id>/<version>.zip`): dot- or hyphen-separated runs of
 *  letters and digits, such as `2026.1.0`. */
export const PACK_VERSION_PATTERN = /^[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*$/

export const PackManifestSchema = z.object({
  pack: z.literal(1),
  id: z.string().regex(PACK_ID_PATTERN),
  version: z.string().regex(PACK_VERSION_PATTERN),
  title: z.string().min(1),
  engine: z.string().min(1),
  themes: z.array(z.string().min(1)),
})

export type PackManifest = z.infer<typeof PackManifestSchema>

export function parsePackManifest(raw: unknown, source: string): PackManifest {
  const result = PackManifestSchema.safeParse(raw)
  if (!result.success) {
    const detail = result.error.issues.map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join(". ")
    throw new PptwiseError(`invalid ${source}: ${detail}`)
  }
  return result.data
}

/**
 * Why `name` may not be a path inside a pack, or `undefined` when it may.
 * Only relative forward-slash paths are allowed: no `..` segment, no
 * leading `/`, no drive letter, no backslash, no NUL.
 */
export function unsafePackPathReason(name: string): string | undefined {
  if (name.length === 0) return "is empty"
  if (name.includes("\0")) return "contains a NUL byte"
  if (name.includes("\\")) return "contains a backslash"
  if (name.startsWith("/") || /^[A-Za-z]:/.test(name)) return "is absolute, and only relative paths are allowed"
  if (name.split("/").includes("..")) return "climbs out of the pack with .."
  return undefined
}
