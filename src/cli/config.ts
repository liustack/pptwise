import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { z } from "zod"
import { PptwiseError } from "../errors"
import { userConfigPath } from "./home"
import { ImagesConfigSchema } from "./image-config"

/**
 * Project-level settings. The file also marks the project root: the
 * nearest `pptwise.config.json` above the cwd is where `.pptwise/` and
 * `themes/` go (`../cli/workspace.ts`).
 *
 * `outDir` (workspace-artifacts wave): where `render`/`preview` write when
 * the caller passes no `-o`. Default `.pptwise` under this config file's own
 * directory (`../cli/workspace.ts`'s `WORKSPACE_DIRNAME`); a relative value
 * here resolves against that same directory, an absolute one passes through.
 * Setting it at all is also the opt-out from the automatic git-exclude line
 * — a project that names its own artifact directory has already decided how
 * that directory is tracked (`prepareWorkspaceDir`). Project layer only, on
 * purpose: an artifact root is a property of *this project's* working tree,
 * not of the user's identity, so it deliberately has no counterpart in
 * {@link UserConfigSchema} below — a user-level `outDir` would collapse every
 * project's artifacts into one directory.
 */
const ConfigSchema = z
  .object({
    outDir: z.string().optional(),
  })
  .strict()

export type PptwiseConfig = z.infer<typeof ConfigSchema>

/**
 * User-level config schema: optional `images` (Pexels/Pixabay keys and
 * Openverse OAuth for stock-photo search, image generators). `outDir` is
 * deliberately absent — an artifact root belongs to this working tree, not
 * to the user's identity (see {@link ConfigSchema}'s own `outDir` comment).
 * `images` is user-layer only: project {@link ConfigSchema} rejects it so a
 * repo file cannot carry API keys. Decks live in the project, never under
 * the user's home, so there is no deck root setting on either layer.
 */
const UserConfigSchema = z
  .object({
    images: ImagesConfigSchema.optional(),
  })
  .strict()

export type UserPptwiseConfig = z.infer<typeof UserConfigSchema>

export const CONFIG_FILENAME = "pptwise.config.json"
export const LEGACY_CONFIG_FILENAMES = ["pptpress.config.json", "pptfast.config.json"] as const

/**
 * Shared read, parse, and validation body for both config layers. A missing
 * file is `null`. Invalid JSON or a failed schema parse is a hard
 * {@link PptwiseError} naming `path`.
 */
async function readConfigFile<T>(
  path: string,
  schema: z.ZodType<T>,
): Promise<{ path: string; config: T } | null> {
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch {
    return null // no config at this level
  }
  let raw: unknown
  try {
    raw = JSON.parse(text) as unknown
  } catch (e) {
    throw new PptwiseError(`${path} is not valid JSON: ${(e as Error).message}`)
  }
  const r = schema.safeParse(raw)
  if (!r.success) {
    const detail = r.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("\n")
    throw new PptwiseError(`invalid ${path}:\n${detail}`)
  }
  return { path, config: r.data }
}

/** Walk from startDir up to the filesystem root looking for pptwise.config.json,
 *  then pptpress.config.json, then pptfast.config.json in the same directory.
 *  New name wins when more than one exists. Invalid config is a hard error
 *  (with the file path in the message), never silently ignored. */
export async function findConfig(
  startDir: string,
): Promise<{ path: string; config: PptwiseConfig } | null> {
  let dir = resolve(startDir)
  for (;;) {
    const hit = await readConfigFile(join(dir, CONFIG_FILENAME), ConfigSchema)
    if (hit) return hit
    for (const name of LEGACY_CONFIG_FILENAMES) {
      const legacy = await readConfigFile(join(dir, name), ConfigSchema)
      if (legacy) return legacy
    }
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/**
 * User-level config (spec §7's four-layer chain, the layer below project
 * config): a single fixed path (`userConfigPath()`, `./home.ts` —
 * `$PPTWISE_HOME` or `~/.pptwise`), no cwd walk-up — there is exactly one
 * user config, unlike project config which can live at any ancestor of cwd.
 * Same missing/invalid posture as {@link findConfig}: missing file is fine
 * (`null`), invalid JSON or schema is a hard {@link PptwiseError} with the
 * path.
 */
export async function findUserConfig(): Promise<{ path: string; config: UserPptwiseConfig } | null> {
  return readConfigFile(userConfigPath(), UserConfigSchema)
}
