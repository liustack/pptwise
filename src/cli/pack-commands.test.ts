// @vitest-environment node
import { spawnSync } from "node:child_process"
import { mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const CLI = join(ROOT, "src", "cli.ts")

/** The real CLI with an empty pptwise home, so no license is configured and
 *  no command below reaches a server. */
function run(args: string[]) {
  const env: NodeJS.ProcessEnv = { ...process.env, PPTWISE_HOME: mkdtempSync(join(tmpdir(), "pptwise-pack-cmds-")) }
  delete env.NODE_OPTIONS
  return spawnSync(process.execPath, ["--import", "tsx", CLI, ...args], { encoding: "utf8", cwd: ROOT, env })
}

/** The command names the top-level help lists. */
function listedCommands(help: string): string[] {
  const block = help.slice(help.indexOf("Commands:"))
  return [...block.matchAll(/^ {2}([a-z][a-z-]*)/gm)].map((m) => m[1]!)
}

describe("content pack commands", () => {
  it("lists login, sync, and logout in the help, and keeps the older spellings out of it", () => {
    const help = run(["--help"])
    expect(help.status).toBe(0)
    const commands = listedCommands(help.stdout)
    expect(commands).toEqual(expect.arrayContaining(["login", "sync", "logout"]))
    expect(commands).not.toContain("license")
    expect(commands).not.toContain("packs")
  })

  it("runs sync the way packs sync runs it, --json included", () => {
    const sync = run(["sync"])
    expect(sync.status).toBe(0)
    expect(sync.stdout).toContain("pptwise login <key>")
    const json = run(["sync", "--json"])
    const older = run(["packs", "sync", "--json"])
    expect(json.status).toBe(0)
    expect(JSON.parse(json.stdout)).toEqual({ license: false, ok: true, packs: [] })
    expect(older.stdout).toBe(json.stdout)
    expect(older.status).toBe(json.status)
  })

  it("keeps the older spellings working", () => {
    const status = run(["license", "status"])
    expect(status.status).toBe(0)
    expect(status.stdout).toMatch(/no license configured/i)
    expect(run(["packs", "list"]).status).toBe(0)
    expect(run(["license", "clear"]).status).toBe(0)
  })
})
