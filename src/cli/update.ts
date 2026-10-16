// Ported from markpress src/update.ts (same author), minus its playwright
// post-install step — pptwise has no browser dependency to refresh.
import { join } from "node:path"
import { runChild } from "./child"

export const PACKAGE_NAME = "@liustack/pptwise"

export interface UpdateInfo {
  packageName: string
  currentVersion: string
  latestVersion: string | null
  updateAvailable: boolean
  checked: boolean
  error?: string
}

export interface SelfUpdateResult extends UpdateInfo {
  updated: boolean
}

export type CommandRunner = (command: string, args: string[]) => Promise<string>

function normalizeVersion(version: string): string {
  const normalized = version.trim().replace(/^v/i, "").split("-")[0]
  if (!normalized) throw new Error(`invalid version: ${version}`)
  return normalized
}

function parseVersion(version: string): number[] {
  return normalizeVersion(version)
    .split(".")
    .map((segment) => {
      const value = Number.parseInt(segment, 10)
      if (!Number.isFinite(value)) throw new Error(`invalid version segment: ${segment}`)
      return value
    })
}

export function compareVersions(left: string, right: string): number {
  const l = parseVersion(left)
  const r = parseVersion(right)
  for (let i = 0; i < Math.max(l.length, r.length); i++) {
    const a = l[i] ?? 0
    const b = r[i] ?? 0
    if (a !== b) return a < b ? -1 : 1
  }
  return 0
}

export const runCommand: CommandRunner = async (command, args) => {
  const { code, stdout, stderr } = await runChild(command, args)
  if (code !== 0) throw new Error(stderr.trim() || `exited ${code}`)
  return stdout.trim()
}

export interface CheckForUpdateOptions {
  currentVersion: string
  packageName?: string
  run?: CommandRunner
}

/** Never throws — an unreachable registry reports { checked: false, error }. */
export async function checkForUpdate({
  currentVersion,
  packageName = PACKAGE_NAME,
  run = runCommand,
}: CheckForUpdateOptions): Promise<UpdateInfo> {
  const current = normalizeVersion(currentVersion)
  try {
    const latest = normalizeVersion(await run("npm", ["view", packageName, "version"]))
    return {
      packageName,
      currentVersion: current,
      latestVersion: latest,
      updateAvailable: compareVersions(current, latest) < 0,
      checked: true,
    }
  } catch (error) {
    return {
      packageName,
      currentVersion: current,
      latestVersion: null,
      updateAvailable: false,
      checked: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function createSelfUpdater(run: CommandRunner = runCommand) {
  return async ({
    currentVersion,
    packageName = PACKAGE_NAME,
  }: {
    currentVersion: string
    packageName?: string
  }): Promise<SelfUpdateResult> => {
    const info = await checkForUpdate({ currentVersion, packageName, run })
    if (!info.checked) throw new Error(`unable to check for updates: ${info.error ?? "unknown error"}`)
    if (!info.updateAvailable) return { ...info, updated: false }
    await run("npm", ["install", "-g", `${packageName}@latest`])
    return { ...info, updated: true }
  }
}

/** Runs a command and hands back its exit code and output, failing or not. */
export type ChildRunner = (command: string, args: string[]) => Promise<{ code: number; stdout: string; stderr: string }>

export type PostUpdateSync = { ran: false } | { ran: true; ok: boolean; output: string }

export interface SyncAfterUpdateOptions {
  /** Whether a license is configured. A license file that cannot be read
   *  throws, and that is reported as a sync that did not run cleanly. */
  licenseConfigured: () => Promise<boolean>
  packageName?: string
  run?: CommandRunner
  runCli?: ChildRunner
  /** The runtime that starts the new CLI. Default this process's. */
  execPath?: string
}

const runCliChild: ChildRunner = (command, args) => runChild(command, args)

/**
 * After `self-update` has installed a new version, sync content packs with
 * that version, so packs that need it arrive in the same step. This process
 * still runs the old code, so the sync runs in the CLI npm just installed,
 * found under `npm root -g`. Without a license nothing runs. Never throws:
 * a sync that fails is reported, and the update stands.
 */
export async function syncAfterUpdate({
  licenseConfigured,
  packageName = PACKAGE_NAME,
  run = runCommand,
  runCli = runCliChild,
  execPath = process.execPath,
}: SyncAfterUpdateOptions): Promise<PostUpdateSync> {
  try {
    if (!(await licenseConfigured())) return { ran: false }
    const root = await run("npm", ["root", "-g"])
    const cli = join(root, ...packageName.split("/"), "dist", "cli.js")
    const { code, stdout, stderr } = await runCli(execPath, [cli, "sync"])
    return { ran: true, ok: code === 0, output: [stdout.trim(), stderr.trim()].filter((s) => s !== "").join("\n") }
  } catch (error) {
    return { ran: true, ok: false, output: error instanceof Error ? error.message : String(error) }
  }
}
