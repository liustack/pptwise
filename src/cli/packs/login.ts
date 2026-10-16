/**
 * `pptwise login [key]` and `pptwise logout`: the one-step way in and out
 * for content packs. Login checks the key's shape, asks the pack server's
 * catalog whether it knows the key, saves it the way `license set` does,
 * and installs the packs from that same catalog answer the way `packs
 * sync` does. A key the server refuses is never saved. Logout removes the
 * key and leaves installed packs where they are.
 */
import { PptwiseError } from "../../errors"
import { readSecret, type SecretInputIo } from "../secret-input"
import { clearLicenseKey, licenseKeyPrefix, licensePath, parseLicenseKey, saveLicenseKey } from "./license"
import {
  describeError,
  formatPackSyncReport,
  packsServerUrl,
  requestCatalog,
  ServerRefusal,
  syncFromCatalog,
  type PackSyncOptions,
  type PackSyncReport,
} from "./sync"

/**
 * What the server made of the key. `accepted`: 200, the key is saved and
 * the packs synced (see `sync`). `held`: 423, the key is saved and its
 * purchase is being reviewed, so nothing was synced. `unknown` (401),
 * `revoked` (403), and `failed` (no answer, or any other status) save
 * nothing.
 */
export type LoginOutcome = "accepted" | "held" | "unknown" | "revoked" | "failed"

export interface LoginReport {
  outcome: LoginOutcome
  /** `false` for a refused key, a failed request, or a sync with a failure. */
  ok: boolean
  /** Whether the key was written to the license file. */
  saved: boolean
  server: string
  /** The HTTP status of a refusal. */
  status?: number
  /** The server's own sentence, or why the request failed. */
  message?: string
  /** The sync that followed an accepted key. */
  sync?: PackSyncReport
}

export interface LoginOptions extends PackSyncOptions {
  json?: boolean
  /** Where a key is asked for when none is given. Default the process's. */
  io?: SecretInputIo
  /** Reads the key at a hidden prompt. Default `readSecret`. */
  readSecret?: (prompt: string, io?: SecretInputIo) => Promise<string>
}

const USAGE = "pptwise login <key>"
const SYNC_LATER = "Run `pptwise packs sync` later to finish installing."
const OFFLINE_SAVE = "Try again in a moment, or save the key now with `pptwise license set <key>` and run `pptwise packs sync` later."

async function askForKey(opts: LoginOptions): Promise<string> {
  const io = opts.io ?? { stdin: process.stdin, stderr: process.stderr }
  if (!(io.stdin as NodeJS.ReadStream).isTTY) {
    throw new PptwiseError(`no license key given, and there is no terminal to ask for one. Usage: ${USAGE}`)
  }
  const read = opts.readSecret ?? ((prompt: string, readIo?: SecretInputIo) => readSecret(prompt, readIo, "License key"))
  return read("License key (input hidden): ", io)
}

/** Ask the server about `key`, save it unless the server refused it, and
 *  sync when the server took it. */
export async function login(key: string, opts: PackSyncOptions = {}): Promise<LoginReport> {
  const server = packsServerUrl(opts.env ?? process.env)
  let res: Response
  try {
    res = await requestCatalog(server, key)
  } catch (e) {
    if (!(e instanceof ServerRefusal)) {
      const message = `could not reach the pack server at ${new URL(server).host}: ${describeError(e)}`
      return { outcome: "failed", ok: false, saved: false, server, message }
    }
    const refusal = e.said === undefined ? { server, status: e.status } : { server, status: e.status, message: e.said }
    switch (e.status) {
      case 401:
        return { outcome: "unknown", ok: false, saved: false, ...refusal }
      case 403:
        return { outcome: "revoked", ok: false, saved: false, ...refusal }
      case 423:
        await saveLicenseKey(key)
        return { outcome: "held", ok: true, saved: true, ...refusal }
      default:
        return { outcome: "failed", ok: false, saved: false, ...refusal }
    }
  }
  await saveLicenseKey(key)
  const sync = await syncFromCatalog(server, key, res, opts)
  return { outcome: "accepted", ok: sync.ok, saved: true, server, sync }
}

function formatLogin(key: string, path: string, report: LoginReport): string {
  const saved = `Logged in. Saved license ${licenseKeyPrefix(key)} to ${path}.`
  const said = report.message === undefined ? `HTTP ${report.status}` : `HTTP ${report.status}: ${report.message}`
  switch (report.outcome) {
    case "held": {
      const quote = report.message === undefined ? "" : ` It says: ${report.message}`
      return [
        saved,
        `The pack server is holding this key while its purchase is reviewed.${quote}`,
        "Run `pptwise packs sync` once the review clears to install your packs.",
      ].join("\n")
    }
    case "accepted": {
      const sync = report.sync!
      if (sync.error !== undefined) return [saved, `The packs could not be installed: ${sync.error}`, SYNC_LATER].join("\n")
      const lines = [saved, formatPackSyncReport(sync)]
      if (!sync.ok) lines.push(`The license is saved. ${SYNC_LATER}`)
      return lines.join("\n")
    }
    case "unknown":
      throw new PptwiseError(
        `the pack server does not recognize this license key (${said}). Nothing was saved. Check that you copied the whole key, then run \`${USAGE}\` again.`,
      )
    case "revoked":
      throw new PptwiseError(`this license key has been revoked (${said}). Nothing was saved.`)
    case "failed": {
      const why = report.status === undefined ? `: ${report.message}.` : ` (${said}).`
      throw new PptwiseError(`could not check the license key${why} Nothing was saved. ${OFFLINE_SAVE}`)
    }
  }
}

/**
 * `pptwise login [key] [--json]`. Without a key it asks a terminal at a
 * hidden prompt, and refuses when stdin is not one. A malformed key or a
 * bad `PPTWISE_PACKS_URL` is an error before any request. A refused key is
 * an error in text mode and a report with `ok: false` under `--json`.
 */
export async function runLogin(value: string | undefined, opts: LoginOptions = {}): Promise<{ output: string; failed: boolean }> {
  const key = parseLicenseKey(value ?? (await askForKey(opts)))
  const report = await login(key, opts)
  if (opts.json) return { output: JSON.stringify(report, null, 2), failed: !report.ok }
  return { output: formatLogin(key, licensePath(), report), failed: !report.ok }
}

/** `pptwise logout` */
export async function runLogout(): Promise<string> {
  const path = await clearLicenseKey()
  if (path === undefined) return "No license configured, so there was nothing to log out of. Installed packs stay in place."
  return `Logged out. Removed ${path}. Installed packs stay installed and their themes keep working. Run \`${USAGE}\` again to get pack updates.`
}
