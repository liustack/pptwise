import { homedir as osHomedir } from "node:os"
import { join } from "node:path"
import { resolveProductEnv } from "./product-env"

export const HOME_DIRNAME = ".pptwise"

export interface PptwiseHomeOpts {
  /** Injectable so tests never touch the real `~/.pptwise` or leftover homes. */
  homedir?: () => string
  env?: NodeJS.ProcessEnv
}

/**
 * Root directory for pptwise's user-level state: the user config file
 * (`userConfigPath`), the license, and installed content packs.
 * `PPTWISE_HOME` overrides it wholesale (CI / containers). `PPTPRESS_HOME` and `PPTFAST_HOME` remain legacy aliases
 * (warn once when one actually supplies the value). Empty string counts as
 * unset.
 *
 * Otherwise a single predictable dotdir under the user's home, the same
 * posture as `.ssh`/`.npmrc`/`.aws`/`~/.claude` — deliberately *not* the
 * per-OS XDG/AppData split an `env-paths`-style helper would give: this
 * tool's users (developers and agents) benefit more from one predictable
 * path than from OS-idiomatic placement. Decks never live here, they live
 * in the project.
 * Read fresh on every call (never cached) — `PPTWISE_HOME` is meant to be
 * redirectable per-process (tests set it via `process.env` before calling).
 *
 * When no env is set, the default is `~/.pptwise`. Resolving it never
 * touches the disk: many agent sandboxes leave the home directory read-only,
 * and every deck command reads this path, so finding it must not write.
 * Only the commands a user runs to install or set something up (`config
 * set`, `license set/clear`, `packs sync`) write under it.
 */
export function pptwiseHome(opts: PptwiseHomeOpts = {}): string {
  const env = opts.env ?? process.env
  const fromEnv = resolveProductEnv("HOME", env)
  if (fromEnv !== undefined) return fromEnv
  return join((opts.homedir ?? osHomedir)(), HOME_DIRNAME)
}

/** Path to the user-level config file for image-provider settings. */
export function userConfigPath(opts?: PptwiseHomeOpts): string {
  return join(pptwiseHome(opts), "config.json")
}
