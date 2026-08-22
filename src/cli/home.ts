import { cpSync, existsSync, realpathSync, renameSync, rmSync } from "node:fs"
import { homedir as osHomedir } from "node:os"
import { join, resolve } from "node:path"
import { resolveProductEnv } from "./product-env"

export const HOME_DIRNAME = ".pptpress"
export const LEGACY_HOME_DIRNAME = ".pptfast"

export interface PptpressHomeOpts {
  /** Injectable so tests never touch the real `~/.pptfast`. */
  homedir?: () => string
  env?: NodeJS.ProcessEnv
}

/**
 * Root directory for pptpress's user-level state — deck project defaults
 * (`decksRoot`) and the user config file (`userConfigPath`), spec §7's
 * storage-policy decision. `PPTPRESS_HOME` overrides it wholesale (CI /
 * containers). `PPTFAST_HOME` remains a legacy alias (warn once when it
 * actually supplies the value). Empty string counts as unset.
 *
 * Otherwise a single predictable dotdir under the user's home, the same
 * posture as `.ssh`/`.npmrc`/`.aws`/`~/.claude` — deliberately *not* the
 * per-OS XDG/AppData split an `env-paths`-style helper would give: deck
 * project directories are large working files an agent produces, not
 * roaming-synced app config, and this tool's users (developers and agents)
 * benefit more from one predictable path than from OS-idiomatic placement.
 * Read fresh on every call (never cached) — `PPTPRESS_HOME` is meant to be
 * redirectable per-process (tests set it via `process.env` before calling).
 *
 * When neither env is set, the default is `~/.pptpress`. If that directory
 * does not exist and `~/.pptfast` does, copy recursively into the new name
 * via a temp sibling then `rename`, and leave the old directory in place.
 * The DSH plugin resolves its own preview root by the same two rules
 * (`previewRoot`, dsh/preview-tool.js). Keep those copies in sync.
 */
export function pptpressHome(opts: PptpressHomeOpts = {}): string {
  const env = opts.env ?? process.env
  const fromEnv = resolveProductEnv("HOME", env)
  if (fromEnv !== undefined) return fromEnv
  const home = (opts.homedir ?? osHomedir)()
  const next = join(home, HOME_DIRNAME)
  const legacy = join(home, LEGACY_HOME_DIRNAME)
  migrateLegacyHome(legacy, next)
  return next
}

function migrateLegacyHome(legacyDir: string, nextDir: string): void {
  if (existsSync(nextDir) || !existsSync(legacyDir)) return
  // realpath so a directory symlink is copied as a real tree. Default
  // `cpSync` would copy the link itself, and the two homes would share one
  // payload. Leave the old path (symlink or dir) in place.
  const source = realpathSync(legacyDir)
  const tmpDir = `${nextDir}.migrating`
  rmSync(tmpDir, { recursive: true, force: true })
  try {
    cpSync(source, tmpDir, { recursive: true })
    renameSync(tmpDir, nextDir)
  } catch (error) {
    try {
      rmSync(tmpDir, { recursive: true, force: true })
    } catch {
      // still throw the original copy/rename failure
    }
    throw error
  }
}

/**
 * Default parent directory for bare-name deck resolution
 * (`$PPTPRESS_HOME/decks/<name>/`, `./deck-dir.ts`'s `resolveDeckTarget`).
 * `config` is deliberately a minimal structural shape (`{ decksDir?: string
 * }`), not `UserPptpressConfig` itself — `./config.ts` already imports
 * `userConfigPath` from this module, so importing its type back here would
 * be circular. Redirecting `decksDir` is a user-identity concern (spec §7:
 * user-identity-class config belongs to the user layer) — a team that wants
 * deck projects tracked inside a repo instead reaches for project-level
 * `pptpress.config.json`, a separate, unrelated mechanism.
 *
 * A relative `decksDir` resolves against `pptpressHome()` itself — the only
 * directory a user config file can ever live in (see `userConfigPath`
 * below) — never the CLI's cwd. An absolute value passes through unchanged
 * (`path.resolve`'s own semantics handle both in one call, no separate
 * `isAbsolute` branch needed). No tilde expansion: a literal `~/decks` is
 * one relative path segment, not shorthand for the home directory — see
 * `./config.ts`'s `UserConfigSchema` doc comment.
 */
export function decksRoot(config?: { decksDir?: string }, opts?: PptpressHomeOpts): string {
  return resolve(pptpressHome(opts), config?.decksDir ?? "decks")
}

/** Path to the user-level config file (theme/style defaults + `decksDir` redirect, spec §7's four-layer chain). */
export function userConfigPath(opts?: PptpressHomeOpts): string {
  return join(pptpressHome(opts), "config.json")
}
