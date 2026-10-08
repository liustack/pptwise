// @vitest-environment node
import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"
import {
  OWNER_FILE,
  ORPHAN_AFTER_MS,
  RUN_ROOT_ENV,
  RUN_ROOT_PREFIX,
  STALE_AFTER_MS,
  openRunRoot,
  processAlive,
  runRootParent,
  sweepStaleRunRoots,
  tsxSocketPathLength,
} from "./test-run-root"

const DEAD = 1_000_001
const LIVE = 1_000_002
const alive = (pid: number) => pid === LIVE

function scratch(): string {
  return mkdtempSync(join(tmpdir(), "sweep-"))
}

/** A run root as a run would leave it, last touched `idleMs` before `now`. */
function plantRoot(parent: string, name: string, owner: number | null, now: number, idleMs: number): string {
  const root = join(parent, `${RUN_ROOT_PREFIX}${name}`)
  mkdirSync(root)
  writeFileSync(join(root, "leftover.txt"), "x")
  if (owner !== null) writeFileSync(join(root, OWNER_FILE), `${owner}\n`)
  const at = (now - idleMs) / 1000
  utimesSync(root, at, at)
  return root
}

describe("test run root", () => {
  it("is where this worker's temp directory points", () => {
    // The whole cleanup rests on workers inheriting the root from the main
    // process. If a vitest upgrade stopped passing the environment through,
    // this fails before any temp directory escapes the run.
    const root = process.env[RUN_ROOT_ENV]
    expect(root).toBeDefined()
    expect(tmpdir()).toBe(root)
    expect(basename(root!).startsWith(RUN_ROOT_PREFIX)).toBe(true)
    const owner = Number(readFileSync(join(root!, OWNER_FILE), "utf8"))
    expect(processAlive(owner)).toBe(true)
  })

  it("points every temp variable at a fresh root and takes it all back on teardown", () => {
    const parent = scratch()
    const before = { TMPDIR: process.env.TMPDIR, TEMP: process.env.TEMP, TMP: process.env.TMP, root: process.env[RUN_ROOT_ENV] }
    const exitHooks = process.listenerCount("exit")
    const run = openRunRoot(parent)
    try {
      expect(run.root.startsWith(join(parent, RUN_ROOT_PREFIX))).toBe(true)
      expect(tmpdir()).toBe(run.root)
      expect(process.env.TEMP).toBe(run.root)
      expect(process.env.TMP).toBe(run.root)
      expect(process.env[RUN_ROOT_ENV]).toBe(run.root)
      expect(readFileSync(join(run.root, OWNER_FILE), "utf8").trim()).toBe(String(process.pid))
      mkdirSync(join(mkdtempSync(join(tmpdir(), "pptwise-nested-")), "deeper"))
      expect(process.listenerCount("exit")).toBe(exitHooks + 1)
    } finally {
      run.teardown()
    }
    run.teardown()
    expect(existsSync(run.root)).toBe(false)
    expect(process.listenerCount("exit")).toBe(exitHooks)
    expect({ TMPDIR: process.env.TMPDIR, TEMP: process.env.TEMP, TMP: process.env.TMP, root: process.env[RUN_ROOT_ENV] }).toEqual(before)
    expect(readdirSync(parent)).toEqual([])
  })

  it("removes the root when the process dies of an uncaught error before its teardown", () => {
    // The e2e script holds its root the same way, and a failing leg ends it
    // with a throw, never a teardown call.
    const parent = scratch()
    const tsx = join(import.meta.dirname, "..", "node_modules", "tsx", "dist", "cli.mjs")
    const module = pathToFileURL(join(import.meta.dirname, "test-run-root.ts")).href
    const script = `import { openRunRoot } from ${JSON.stringify(module)}
const run = openRunRoot(${JSON.stringify(parent)})
console.log(run.root)
throw new Error("leg failed")`
    const child = spawnSync(process.execPath, [tsx, "--eval", script], { encoding: "utf8" })
    expect(child.status).not.toBe(0)
    expect(child.stderr).toContain("leg failed")
    expect(child.stdout.trim().startsWith(join(parent, RUN_ROOT_PREFIX))).toBe(true)
    expect(readdirSync(parent)).toEqual([])
  })

  it("sweeps a root whose owner is gone once it has gone quiet", () => {
    const parent = scratch()
    const now = Date.now()
    const dead = plantRoot(parent, "dead", DEAD, now, STALE_AFTER_MS)
    expect(sweepStaleRunRoots(parent, { now, alive })).toEqual([dead])
    expect(existsSync(dead)).toBe(false)
  })

  it("keeps a root whose owner is still running, however long it has been quiet", () => {
    // A watch-mode run can sit idle for hours. Its root is still in use.
    const parent = scratch()
    const now = Date.now()
    const live = plantRoot(parent, "live", LIVE, now, ORPHAN_AFTER_MS * 2)
    expect(sweepStaleRunRoots(parent, { now, alive })).toEqual([])
    expect(existsSync(live)).toBe(true)
  })

  it("keeps a dead owner's root while it was touched recently", () => {
    const parent = scratch()
    const now = Date.now()
    const recent = plantRoot(parent, "recent", DEAD, now, STALE_AFTER_MS - 60_000)
    expect(sweepStaleRunRoots(parent, { now, alive })).toEqual([])
    expect(existsSync(recent)).toBe(true)
  })

  it("gives a root with no owner file a day, since its run may be writing it right now", () => {
    const parent = scratch()
    const now = Date.now()
    const fresh = plantRoot(parent, "fresh", null, now, STALE_AFTER_MS * 3)
    const orphan = plantRoot(parent, "orphan", null, now, ORPHAN_AFTER_MS)
    expect(sweepStaleRunRoots(parent, { now, alive })).toEqual([orphan])
    expect(existsSync(fresh)).toBe(true)
  })

  it("leaves everything that is not a run root alone", () => {
    const parent = scratch()
    const now = Date.now()
    const other = join(parent, "pptwise-deck-abc123")
    mkdirSync(other)
    utimesSync(other, 0, 0)
    writeFileSync(join(parent, `${RUN_ROOT_PREFIX}file`), "not a directory")
    expect(sweepStaleRunRoots(parent, { now, alive })).toEqual([])
    expect(readdirSync(parent).sort()).toEqual(["pptwise-deck-abc123", `${RUN_ROOT_PREFIX}file`])
  })

  it("knows this process is alive", () => {
    expect(processAlive(process.pid)).toBe(true)
  })
})

describe("runRootParent", () => {
  it("keeps the tsx socket a run opens well under macOS's cap", () => {
    const macosTemp = "/var/folders/p8/vpkbx_ss5j7c4yfn4p0jvqlm0000gn/T"
    // Rooted in macOS's own temp directory the socket ran to about 91 bytes of 103.
    expect(tsxSocketPathLength(macosTemp)).toBeGreaterThan(103 - 24)
    const parent = runRootParent(macosTemp, "darwin")
    expect(parent).toBe("/tmp")
    expect(tsxSocketPathLength(parent)).toBeLessThanOrEqual(103 - 24)
  })

  it("keeps the leak check's short private directory, where that check looks for the root", () => {
    const leakCheck = "/tmp/pptwise-leak-check-AbC123"
    expect(runRootParent(leakCheck, "darwin")).toBe(leakCheck)
  })

  it("leaves Windows on its own temp directory", () => {
    expect(runRootParent("C:\\Users\\someone\\AppData\\Local\\Temp\\a\\very\\long\\path\\indeed", "win32")).toContain("AppData")
  })
})
