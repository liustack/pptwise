// @vitest-environment node
import { DEBOUNCE_GRACE_MS, PATH_THROUGH_A_FILE_IS_ENOTDIR, VALID_IR, fsGate, get, makeDir, pollUntil, settledRevision, sleep, startServe, untilWatchersLive } from "./__fixtures__/serve-harness"
import { spawn } from "node:child_process"
import { renameSync, writeFileSync } from "node:fs"
import { mkdir, realpath, rm, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { pathToFileURL } from "node:url"
import { describe, expect, it } from "vitest"
import { THEME_FILENAME } from "./deck-dir"
import { THEME_POLL_MS, watchTree } from "./serve"
import { themeFileFromPreset } from "./theme-resolve"
import type { ServeBuildStatus, ServeHandle } from "./serve"

describe.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("pptwise serve — the CLI process", () => {
  // The factory tests above run with vitest's own unhandled-rejection
  // handling in place. Only a real `pptwise serve` process shows whether
  // a rejection escapes the build loop: Node exits with code 1 on one.

  const REPO_ROOT = join(import.meta.dirname, "..", "..")
  const TSX = join(REPO_ROOT, "node_modules", "tsx", "dist", "cli.mjs")
  const CLI = join(REPO_ROOT, "src", "cli.ts")
  /** tsx reads the tsconfig from the cwd, and the child runs inside the
   *  fixture directory: the repo's own config carries the `@/` alias. */
  const TSCONFIG = join(REPO_ROOT, "tsconfig.json")

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  async function getJson<T>(url: string): Promise<T> {
    const res = await fetch(url)
    return (await res.json()) as T
  }

  interface CliServe {
    url: string
    exitCode: () => number | null
    stderr: () => string
    stop: () => Promise<void>
  }

  /** A real `pptwise serve` on `irPath`, started from `dir`, up and
   *  serving. `env` is laid over the test's own environment. */
  async function startCli(dir: string, irPath: string, env: NodeJS.ProcessEnv = {}): Promise<CliServe> {
    const child = spawn(process.execPath, [TSX, "--tsconfig", TSCONFIG, CLI, "serve", irPath, "--port", "0", "--no-open"], {
      cwd: dir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
    })
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()))
    child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()))
    const exited = new Promise<void>((resolvePromise) => child.on("exit", () => resolvePromise()))
    const stop = async () => {
      if (child.exitCode === null) child.kill("SIGTERM")
      await exited
    }
    try {
      const url = await pollUntil(async () => {
        if (child.exitCode !== null) throw new Error(`pptwise serve exited during startup: ${stderr}`)
        return stdout.match(/http:\/\/127\.0\.0\.1:\d+/)?.[0]
      }, 30_000)
      return { url, exitCode: () => child.exitCode, stderr: () => stderr, stop }
    } catch (e) {
      await stop()
      throw e
    }
  }

  /** Polls `probe` while the process is still up, and fails at once with
   *  the process's stderr when it has exited. */
  function pollWhileUp<T>(cli: CliServe, probe: () => Promise<T | undefined>): Promise<T> {
    return pollUntil(async () => {
      if (cli.exitCode() !== null) throw new Error(`pptwise serve exited: ${cli.stderr()}`)
      return probe()
    }, THEME_POLL_MS + 3000)
  }

  it("stays up when a plain file named themes/ appears in the deck, and recovers once it is gone", async () => {
    const dir = await makeDir("pptwise-serve-cli-enotdir-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))

    const cli = await startCli(dir, irPath)
    try {
      expect((await (await fetch(cli.url)).text()).toUpperCase()).toContain("0A3D91")
      await sleep(DEBOUNCE_GRACE_MS)

      await writeFile(join(dir, "themes"), "not a directory\n")
      const failed = await pollWhileUp(cli, async () => {
        const status = await getJson<ServeBuildStatus>(`${cli.url}/status`)
        return status.latestOk ? undefined : status
      })
      expect(failed.error).toMatch(/ENOTDIR/)
      expect(cli.exitCode()).toBeNull()

      await rm(join(dir, "themes"))
      await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" }, slides: [{ type: "cover", heading: "Recovered heading" }] }))
      await pollWhileUp(cli, async () => ((await (await fetch(cli.url)).text()).includes("Recovered heading") ? true : undefined))
      expect(await getJson<ServeBuildStatus>(`${cli.url}/status`)).toMatchObject({ latestOk: true })
      expect(cli.exitCode()).toBeNull()
    } finally {
      await cli.stop()
    }
  })

  it("stays up when a watcher event's handling throws, and recovers once the file is gone", async () => {
    // The same swap the embedded test above makes inside the callback,
    // made here by a preload that wraps `fs.watch` in the real process:
    // the moment the `themes/` watcher reports `brief` appearing, and
    // before serve's own callback runs, `themes/` becomes a plain file.
    const dir = await makeDir("pptwise-serve-cli-event-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const themes = join(dir, "themes")
    await mkdir(themes)
    const hookPath = join(dir, "watch-event-hook.mjs")
    await writeFile(
      hookPath,
      [
        'import fs from "node:fs"',
        'import { syncBuiltinESMExports } from "node:module"',
        'import { basename } from "node:path"',
        "const target = process.env.PPTWISE_TEST_EVENT_PARENT",
        "const original = fs.watch",
        "let rotated = false",
        "fs.watch = (path, ...args) => {",
        "  const callback = args.at(-1)",
        '  if (typeof callback === "function") {',
        "    args[args.length - 1] = (event, filename) => {",
        '      if (String(path) === target && basename(String(filename)) === "brief" && !rotated) {',
        "        rotated = true",
        '        fs.renameSync(target, target + "-moved")',
        '        fs.writeFileSync(target, "not a directory\\n")',
        "      }",
        "      return callback(event, filename)",
        "    }",
        "  }",
        "  return original(path, ...args)",
        "}",
        "syncBuiltinESMExports()",
        "",
      ].join("\n"),
    )

    // The process resolves the workspace `themes/` under its own `cwd`,
    // which is the physical path even when the temp directory is reached
    // through a symlink (`/var` on macOS), so the hook compares that.
    const cli = await startCli(dir, irPath, {
      NODE_OPTIONS: `--import=${pathToFileURL(hookPath).href}`,
      PPTWISE_TEST_EVENT_PARENT: await realpath(themes),
    })
    try {
      expect((await (await fetch(cli.url)).text()).toUpperCase()).toContain("0A3D91")
      await sleep(DEBOUNCE_GRACE_MS)

      await mkdir(join(themes, "brief"))
      const failed = await pollWhileUp(cli, async () => {
        const status = await getJson<ServeBuildStatus>(`${cli.url}/status`)
        return status.latestOk ? undefined : status
      })
      expect(failed.error).toMatch(/ENOTDIR/)
      expect(cli.exitCode()).toBeNull()
      expect((await (await fetch(cli.url)).text()).toUpperCase()).toContain("0A3D91")

      await rm(themes)
      await pollWhileUp(cli, async () => {
        const status = await getJson<ServeBuildStatus>(`${cli.url}/status`)
        return status.latestOk ? status : undefined
      })
      expect(cli.exitCode()).toBeNull()
    } finally {
      await cli.stop()
    }
  })
})

describe.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("createServeServer — a watcher event whose handling throws", () => {
  // `fs.watch` hands an event to the tree, and the tree stats the entry
  // the event names to decide whether a child watcher must be replaced.
  // That stat can throw: the directory swapped for a plain file between
  // the event and the stat gives ENOTDIR. A throw out of an `fs.watch`
  // callback is an uncaught exception, and the process went down on it.
  // The tree now hands such a failure to its owner, and serve records it
  // and rebuilds, the same path a failed watcher update already took.

  function briefWithPrimary(id: string, primary: string): string {
    const file = themeFileFromPreset("brief", { id })
    file.style.colors.primary = primary
    return JSON.stringify(file, null, 2) + "\n"
  }

  function statusWhere(handle: ServeHandle, accept: (status: ServeBuildStatus) => boolean): Promise<ServeBuildStatus> {
    return pollUntil(async () => {
      const current = handle.status()
      return accept(current) ? current : undefined
    }, THEME_POLL_MS + 3000)
  }

  /** Swaps `themes` for a plain file the moment its watcher reports
   *  `brief` appearing, before serve's callback runs. */
  function swapThemesOnBriefEvent(themes: string): () => boolean {
    let rotated = false
    fsGate.beforeEvent = (path, _event, filename) => {
      if (path !== themes || rotated || filename === null || basename(filename.toString()) !== "brief") return
      rotated = true
      renameSync(themes, `${themes}-moved`)
      writeFileSync(themes, "not a directory\n")
    }
    return () => rotated
  }

  it("records the failure, keeps serving, and recovers once the file is gone", async () => {
    const dir = await makeDir("pptwise-serve-event-throw-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const themes = join(dir, "themes")
    await mkdir(themes)
    const handle = await startServe(irPath, { cwd: dir })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    await settledRevision(handle)

    const rotated = swapThemesOnBriefEvent(themes)
    await mkdir(join(themes, "brief"))
    const failed = await statusWhere(handle, (status) => !status.latestOk)
    expect(rotated()).toBe(true)
    expect(failed.error).toMatch(/ENOTDIR/)
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")

    await rm(themes)
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered.servedRevision).toBe(recovered.latestRevision)
  })

  it("recovers when the file is removed only after the rebuild's own watcher update has failed too", async () => {
    // The rebuild the event failure schedules ends with a watcher update,
    // and that update fails on the same plain file. The tree used to keep
    // the old `themes` watcher, on a directory no longer at that path,
    // and the deck directory's own watcher had never been told to report
    // `themes`, since it existed at startup. The file going away was then
    // an event nobody acted on, and the failure stood until a rebuild by
    // hand. The tree now checks every watcher it keeps against the path
    // on each update, and a watched directory always reports the watched
    // directories under it, present or not.
    const dir = await makeDir("pptwise-serve-event-throw-late-")
    await writeFile(join(dir, THEME_FILENAME), briefWithPrimary("brief", "#0A3D91"))
    const irPath = join(dir, "deck.json")
    await writeFile(irPath, JSON.stringify({ ...VALID_IR, theme: { id: "brief" } }))
    const themes = join(dir, "themes")
    await mkdir(themes)
    const handle = await startServe(irPath, { cwd: dir })
    expect((await get(handle.port, "/")).body.toUpperCase()).toContain("0A3D91")
    const settled = await settledRevision(handle)
    let watchCalls = 0
    fsGate.afterWatch = () => watchCalls++

    const rotated = swapThemesOnBriefEvent(themes)
    await mkdir(join(themes, "brief"))
    // First the event's own failure, then the rebuild it scheduled, whose
    // update fails on the same file.
    const failed = await statusWhere(handle, (status) => !status.latestOk && status.latestRevision === settled + 1)
    expect(rotated()).toBe(true)
    expect(failed.error).toMatch(/ENOTDIR/)
    expect(failed.servedRevision).toBe(settled + 1)
    // Nothing changes while the file stays: no rebuild, no watcher churn.
    await sleep(2 * THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: false, latestRevision: settled + 1 })
    const watchCallsWhileBroken = watchCalls

    await rm(themes)
    const recovered = await statusWhere(handle, (status) => status.latestOk)
    expect(recovered).toMatchObject({ latestRevision: settled + 2, servedRevision: settled + 2 })
    expect(watchCalls - watchCallsWhileBroken).toBeLessThanOrEqual(12)
    await sleep(THEME_POLL_MS + DEBOUNCE_GRACE_MS)
    expect(handle.status()).toMatchObject({ latestOk: true, latestRevision: settled + 2 })
  })

  it("watchTree hands the error to onError instead of throwing out of the callback", async () => {
    const dir = await makeDir("pptwise-serve-tree-event-throw-")
    const themes = join(dir, "themes")
    await mkdir(themes)
    const errors: unknown[] = []
    let changes = 0
    const tree = watchTree(
      [{ path: join(themes, "brief", THEME_FILENAME), kind: "file" }],
      () => changes++,
      (e) => errors.push(e),
    )
    try {
      await untilWatchersLive()
      const rotated = swapThemesOnBriefEvent(themes)
      await mkdir(join(themes, "brief"))
      await pollUntil(async () => (errors.length > 0 ? true : undefined))
      expect(rotated()).toBe(true)
      expect(errors[0]).toMatchObject({ code: "ENOTDIR" })
    } finally {
      tree.close()
    }
  })
})

describe.skipIf(!PATH_THROUGH_A_FILE_IS_ENOTDIR)("watchTree — a watcher opened, then failed before it was registered", () => {
  it("closes the watcher when the stat after fs.watch throws, so nothing outlives the rejected tree", async () => {
    // `attach` opens the watcher, then stats the directory for its inode,
    // then registers it. A directory swapped for a plain file between the
    // first two steps makes the stat throw ENOTDIR with the watcher open
    // and in no map, where `close()` could not reach it.
    const dir = await makeDir("pptwise-serve-post-open-")
    const themes = join(dir, "themes")
    const target = join(themes, "brief")
    await mkdir(target, { recursive: true })
    const count = () => process.getActiveResourcesInfo().filter((name) => name === "FSEventWrap").length
    const before = count()

    let rotated = false
    fsGate.afterWatch = (path) => {
      if (path !== target || rotated) return
      rotated = true
      renameSync(themes, `${themes}-moved`)
      writeFileSync(themes, "not a directory\n")
    }
    expect(() => watchTree([{ path: join(target, THEME_FILENAME), kind: "file" }], () => {}, () => {})).toThrow(/ENOTDIR/)
    expect(rotated).toBe(true)
    // A closed FSEvents handle is released a tick later, not on `close()`.
    await pollUntil(async () => (count() <= before ? true : undefined))
  })
})
