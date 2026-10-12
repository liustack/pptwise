import { homedir as osHomedir } from "node:os"
import { join, resolve } from "node:path"
import { resolveProductEnv } from "./product-env"

export const HOME_DIRNAME = ".pptwise"

export interface PptwiseHomeOpts {
  /** Injectable so tests never touch the real `~/.pptwise` or leftover homes. */
  homedir?: () => string
  env?: NodeJS.ProcessEnv
}

/**
 * Root directory for pptwise's user-level state — deck project defaults
 * (`decksRoot`) and the user config file (`userConfigPath`), spec §7's
 * storage-policy decision. `PPTWISE_HOME` overrides it wholesale (CI /
 * containers). `PPTPRESS_HOME` and `PPTFAST_HOME` remain legacy aliases
 * (warn once when one actually supplies the value). Empty string counts as
 * unset.
 *
 * Otherwise a single predictable dotdir under the user's home, the same
 * posture as `.ssh`/`.npmrc`/`.aws`/`~/.claude` — deliberately *not* the
 * per-OS XDG/AppData split an `env-paths`-style helper would give: deck
 * project directories are large working files an agent produces, not
 * roaming-synced app config, and this tool's users (developers and agents)
 * benefit more from one predictable path than from OS-idiomatic placement.
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

/**
 * Default parent directory for bare-name deck resolution
 * (`$PPTWISE_HOME/decks/<name>/`, `./deck-dir.ts`'s `resolveDeckTarget`).
 * `config` is deliberately a minimal structural shape (`{ decksDir?: string
 * }`), not `UserPptwiseConfig` itself — `./config.ts` already imports
 * `userConfigPath` from this module, so importing its type back here would
 * be circular. Redirecting `decksDir` is a user-identity concern (spec §7:
 * user-identity-class config belongs to the user layer) — a team that wants
 * deck projects tracked inside a repo instead reaches for project-level
 * `pptwise.config.json`, a separate, unrelated mechanism.
 *
 * A relative `decksDir` resolves against `pptwiseHome()` itself — the only
 * directory a user config file can ever live in (see `userConfigPath`
 * below) — never the CLI's cwd. An absolute value passes through unchanged
 * (`path.resolve`'s own semantics handle both in one call, no separate
 * `isAbsolute` branch needed). No tilde expansion: a literal `~/decks` is
 * one relative path segment, not shorthand for the home directory — see
 * `./config.ts`'s `UserConfigSchema` doc comment.
 */
export function decksRoot(config?: { decksDir?: string }, opts?: PptwiseHomeOpts): string {
  return resolve(pptwiseHome(opts), config?.decksDir ?? "decks")
}

/** Path to the user-level config file for `decksDir` and image-provider settings. */
export function userConfigPath(opts?: PptwiseHomeOpts): string {
  return join(pptwiseHome(opts), "config.json")
}
