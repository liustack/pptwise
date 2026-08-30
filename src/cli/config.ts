import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { z } from "zod"
import { PptwiseError } from "../errors"
import { userConfigPath } from "./home"
import { ImagesConfigSchema } from "./image-config"

/**
 * Project-level filesystem defaults.
 *
 * `decksDir` (W5 task 6, spec §7: a team that wants deck project
 * directories checked into the repo instead of living under
 * `~/.pptwise/decks` declares it here): a relative value resolves against
 * *this config file's own directory* (wherever `findConfig`'s cwd walk-up
 * found it) — never the CLI's cwd, and never `pptwiseHome()`. Wins over the
 * user config's own `decksDir` (`UserConfigSchema` below) when both are
 * set. The two
 * layers resolve against different bases, so this schema alone can't
 * express the final answer — `commands.ts`'s `resolveDecksDirSource`
 * computes the already-resolved absolute path before handing it down to
 * `./deck-dir.ts`'s `resolveDeckTarget` / `./home.ts`'s `decksRoot`, neither
 * of which knows there are two possible bases, only the final one.
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
    decksDir: z.string().optional(),
    outDir: z.string().optional(),
  })
  .strict()

export type PptwiseConfig = z.infer<typeof ConfigSchema>

/**
 * User-level config schema. It supports `decksDir` plus optional
 * `images` (Pexels/Pixabay keys and Openverse OAuth for stock-photo search). `outDir` is
 * deliberately absent — an artifact root belongs to this working tree, not
 * to the user's identity (see {@link ConfigSchema}'s own `outDir` comment).
 * `images` is user-layer only: project {@link ConfigSchema} rejects it so a
 * repo file cannot carry API keys.
 * `decksDir` is no longer project-config-free as of W5 task 6 (see
 * {@link ConfigSchema}'s own doc comment on that field), but the two layers
 * still resolve it against different bases: this user layer always resolves
 * against `pptwiseHome()` (`./home.ts`'s `decksRoot`, this layer's one fixed
 * location), the project layer against the project config file's own
 * directory. Declared as its own flat object literal rather than
 * `ConfigSchema.extend(...)` — a shape this small is not worth taking on
 * zod's extend-then-restrict chaining, and it keeps both schemas readable
 * independently.
 *
 * `decksDir`: a relative value resolves against this config file's own
 * directory (`./home.ts`'s `pptwiseHome()` — the only directory a user
 * config can ever live in, see `decksRoot`), never the CLI's cwd. No tilde
 * expansion — a literal `~/decks` is the literal relative path segment
 * `~/decks` under that base, not the home directory. The resulting (almost
 * certainly missing) directory surfaces through whatever downstream error
 * reads it, same as any other bad path.
 */
const UserConfigSchema = z
  .object({
    decksDir: z.string().optional(),
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
